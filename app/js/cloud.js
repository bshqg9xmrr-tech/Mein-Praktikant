// cloud.js — optionaler cloud-sync über Supabase (siehe architecture.md §6).
//
// bewusst als eigenständiges, austauschbares modul gehalten: storage.js weiß
// nichts von supabase (bleibt offline-first, funktioniert ohne dieses modul
// komplett normal). cloud.js hakt sich nur über storage.onSave()/replaceAll()
// ein. so bleibt "kein cloud-konto eingerichtet" der normale, voll
// funktionsfähige zustand (leitprinzip claude.md §3.1).
//
// sync-strategie: die *gesamte* lokale datenbank wird als ein json-dokument
// pro nutzer:in in der tabelle `app_state` gespeichert (last-write-wins nach
// `updated_at`) — siehe architecture.md §6 für die geplante v2-strategie,
// hier bereits als einfachste umsetzung vorgezogen. für einen einzelnen
// nutzer, der jeweils an einem gerät gleichzeitig arbeitet, ist das robust;
// bearbeitest du zwei geräte *exakt gleichzeitig* offline, gewinnt der
// zuletzt synchronisierte stand.

import { load, replaceAll, onSave } from "./storage.js";

const CFG_URL_KEY = "mp-cloud-url";
const CFG_ANON_KEY = "mp-cloud-anon-key";
const TABLE = "app_state";

let supabasePromise = null;
let client = null;
let pushTimer = null;
let started = false;

const statusListeners = [];
let status = { configured: false, email: null, lastSyncAt: null, lastError: null, syncing: false };

function setStatus(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach((cb) => cb(status));
}

export function onStatusChange(cb) {
  statusListeners.push(cb);
  cb(status);
}

export function getStatus() {
  return status;
}

export function getConfig() {
  return {
    url: localStorage.getItem(CFG_URL_KEY) || "",
    anonKey: localStorage.getItem(CFG_ANON_KEY) || "",
  };
}

export function isConfigured() {
  const { url, anonKey } = getConfig();
  return Boolean(url && anonKey);
}

export function setConfig(url, anonKey) {
  localStorage.setItem(CFG_URL_KEY, url.trim());
  localStorage.setItem(CFG_ANON_KEY, anonKey.trim());
  client = null; // beim nächsten getClient() neu aufbauen
  supabasePromise = null;
}

export function clearConfig() {
  localStorage.removeItem(CFG_URL_KEY);
  localStorage.removeItem(CFG_ANON_KEY);
  client = null;
  supabasePromise = null;
  setStatus({ configured: false, email: null });
}

async function loadSupabaseLib() {
  if (!supabasePromise) {
    // dynamischer import: nur laden, wenn cloud-sync tatsächlich genutzt wird.
    supabasePromise = import("https://esm.sh/@supabase/supabase-js@2");
  }
  return supabasePromise;
}

async function getClient() {
  if (client) return client;
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;
  const { createClient } = await loadSupabaseLib();
  client = createClient(url, anonKey);
  return client;
}

export async function requestMagicLink(email) {
  const c = await getClient();
  if (!c) throw new Error("cloud-sync ist noch nicht konfiguriert (url/anon-key fehlen).");
  const { error } = await c.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.href },
  });
  if (error) throw error;
}

export async function signOut() {
  const c = await getClient();
  if (c) await c.auth.signOut();
  setStatus({ email: null, lastSyncAt: null });
}

export async function getCurrentEmail() {
  const c = await getClient();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data?.user?.email || null;
}

async function pull() {
  const c = await getClient();
  if (!c) return;
  const { data: userData } = await c.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  const { data, error } = await c.from(TABLE).select("data, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) {
    setStatus({ lastError: error.message });
    return;
  }
  if (data?.data) {
    replaceAll(data.data, { silent: true });
  } else {
    // erster login auf diesem account: lokalen stand hochladen.
    await push(true);
  }
  setStatus({ lastSyncAt: new Date().toISOString(), lastError: null });
}

async function push(force = false) {
  const c = await getClient();
  if (!c) return;
  const { data: userData } = await c.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  setStatus({ syncing: true });
  const db = load();
  const { error } = await c.from(TABLE).upsert({
    user_id: user.id,
    data: db,
    updated_at: new Date().toISOString(),
  });
  setStatus({ syncing: false, lastError: error ? error.message : null, lastSyncAt: new Date().toISOString() });
  if (force && error) throw error;
}

function scheduleDebouncedPush() {
  if (!isConfigured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push().catch((e) => setStatus({ lastError: e.message })), 1200);
}

// startet den sync (einmalig aufrufen, z. b. aus main.js) — no-op, solange
// kein cloud-account konfiguriert/eingeloggt ist.
export async function start() {
  if (started) return;
  started = true;
  if (!isConfigured()) return;

  const email = await getCurrentEmail().catch(() => null);
  setStatus({ configured: true, email });
  if (!email) return;

  onSave(scheduleDebouncedPush);
  await pull().catch((e) => setStatus({ lastError: e.message }));

  // näherungsweise "realtime": periodisches nachziehen + beim zurückkehren zur app.
  setInterval(() => pull().catch(() => {}), 30_000);
  window.addEventListener("focus", () => pull().catch(() => {}));

  const c = await getClient();
  c.auth.onAuthStateChange((_event, session) => {
    setStatus({ email: session?.user?.email || null });
    if (session?.user) pull().catch(() => {});
  });
}

export async function syncNow() {
  await pull();
  await push();
}
