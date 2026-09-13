// auth-gate.js — entscheidet einmalig beim app-start, was der nutzer sieht,
// bevor die eigentliche app (main.js#init) initialisiert wird:
//
//   a) kein supabase konfiguriert   → setup-bildschirm (url/anon-key,
//                                      ODER "erstmal lokal ausprobieren")
//   b) konfiguriert, nicht angemeldet → login-bildschirm (magic-link)
//   c) angemeldet, onboarding offen  → onboarding-wizard (onboarding.js)
//   d) angemeldet + onboarding fertig → normale app
//   e) "lokal ausprobieren" gewählt  → wie (c)/(d), nur ohne cloud
//
// siehe architecture.md §2.2/§4.8/§4.12, context.md §3.10.
//
// KORREKTUR nach einer review-runde (siehe CHANGELOG.md "review-korrekturen"):
// der ursprüngliche stand dieses moduls erzwang ein vollständiges
// supabase-setup, bevor die app überhaupt nutzbar war — das widersprach
// claude.md §3.1 ("cloud/sync ist zusatz, nie voraussetzung") und
// architecture.md §1, dessen "ausnahme" sich nur auf den login selbst
// bezieht, nicht auf ein vorgeschaltetes infrastruktur-setup. der
// setup-bildschirm bietet daher jetzt zusätzlich einen "erstmal lokal
// ausprobieren"-ausweg (siehe `renderSetup`/`isLocalOnly` unten) — cloud/
// login bleiben der empfohlene, geplante normalfall (u. a. für challenges,
// architecture.md §4.13), sind aber kein hartes muss mehr, um die app zu
// öffnen. cloud lässt sich jederzeit später über die cloud-sync-karte in
// den einstellungen (settings.js) nachholen.
//
// wichtig (claude.md §3.1, architecture.md §1 "ausnahme, neu entschieden"):
// dieses gate läuft nur EINMAL beim start. ist man einmal eingeloggt (oder
// hat "lokal ausprobieren" gewählt), läuft die app danach wieder ganz
// normal offline-first weiter — es gibt hier keinen wiederkehrenden
// netzwerk-check, der den alltäglichen gebrauch blockieren könnte.
// `cloud.getSession()` liest dafür bewusst nur die lokal gespeicherte
// session (kein netzwerk nötig), nicht `getUser()` (das würde bei jedem
// start eine echte server-antwort abwarten).

import * as cloud from "./cloud.js";
import { getSettings } from "./storage.js";
import { esc, toast } from "./ui.js";
import * as onboarding from "./onboarding.js";

let unsubscribeAuth = null;

// "erstmal lokal ausprobieren"-flag (siehe modul-kommentar oben) — sobald
// gesetzt, überspringt resolveStep() cloud/login dauerhaft und behandelt
// die app als lokal-only (genau wie vor der login-gate-einführung). ein
// späteres, echtes cloud-login über die einstellungen bleibt davon
// unberührt möglich (settings.js prüft cloud.isConfigured()/getStatus()
// unabhängig von diesem flag).
const LOCAL_ONLY_KEY = "mp-local-only";
function isLocalOnly() {
  return localStorage.getItem(LOCAL_ONLY_KEY) === "1";
}
function setLocalOnly() {
  localStorage.setItem(LOCAL_ONLY_KEY, "1");
}

function gateEl() {
  return document.getElementById("gate-root");
}
function appEl() {
  return document.getElementById("app");
}

function showGate() {
  appEl().classList.add("hidden");
  gateEl().classList.remove("hidden");
}
function hideGate() {
  gateEl().classList.add("hidden");
  gateEl().innerHTML = "";
  appEl().classList.remove("hidden");
}

// test-hook, ausschließlich für lokale/automatisierte tests ohne echtes
// supabase-projekt (kein echtes postfach in dieser umgebung verfügbar):
// setzt man in der konsole `window.__mpDebugSession = { email: "..." }`,
// überspringt das gate den echten `cloud.getSession()`-aufruf. wird von der
// eigentlichen app nie selbst gesetzt — reine test-schnittstelle, die reale
// magic-link-prüfung bleibt unverändert.
async function currentSession() {
  if (window.__mpDebugSession) return window.__mpDebugSession;
  return cloud.getSession();
}

async function resolveStep() {
  if (isLocalOnly()) {
    if (!getSettings().onboardingCompletedAt) return "onboarding";
    return "app";
  }
  if (!cloud.isConfigured()) return "setup";
  const session = await currentSession().catch(() => null);
  if (!session) return "login";
  if (!getSettings().onboardingCompletedAt) return "onboarding";
  return "app";
}

export async function start(onReady) {
  const step = await resolveStep();
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }
  if (step === "app") {
    hideGate();
    onReady();
    return;
  }
  showGate();
  if (step === "setup") renderSetup(onReady);
  else if (step === "login") renderLogin(onReady);
  else if (step === "onboarding") renderOnboardingStep(onReady);
}

function renderSetup(onReady) {
  const cfg = cloud.getConfig();
  const el = gateEl();
  el.innerHTML = `
    <div class="gate-wrap">
      <div class="gate-header">
        <div class="mark">MP</div>
        <h1>cloud-sync einrichten (empfohlen)</h1>
        <p>mit einem (kostenlosen) cloud-zugang weiß die app, wessen daten das sind (u. a. für die geplanten challenges), und deine daten bleiben optional zwischen mac, iphone und web synchron. das dauert ein paar minuten — wer das jetzt nicht einrichten will/kann, kann die app trotzdem sofort ausprobieren (siehe unten).</p>
      </div>
      <div class="card">
        <div class="section-label" style="margin-bottom:8px;">kurzanleitung</div>
        <ol style="margin:0; padding-left:18px; font-size:12.5px; color:var(--text-soft); line-height:1.7;">
          <li>kostenloses <a href="https://supabase.com" target="_blank" rel="noopener">supabase</a>-projekt anlegen</li>
          <li>tabelle per sql-snippet einrichten — <a href="CLOUD_SETUP.md" target="_blank" rel="noopener">ausführliche anleitung öffnen</a></li>
          <li>projekt-url + anon-key unten eintragen</li>
        </ol>
      </div>
      <div class="card">
        <label class="field">supabase-projekt-url<input type="text" id="gate-cloud-url" placeholder="https://xxxx.supabase.co" value="${esc(cfg.url)}"></label>
        <label class="field" style="margin-top:10px;">anon-key<input type="text" id="gate-cloud-key" placeholder="eyJ..." value="${esc(cfg.anonKey)}"></label>
        <button class="btn btn-primary btn-block" id="gate-save-config" style="margin-top:12px;">speichern &amp; weiter</button>
      </div>
      <button class="gate-skip" id="gate-try-local" type="button">erstmal lokal ausprobieren — ohne cloud, ohne login</button>
      <div style="font-size:11px; color:var(--text-faint); text-align:center; margin-top:-6px;">deine daten bleiben dann nur auf diesem gerät — cloud-sync lässt sich jederzeit später in den einstellungen nachholen.</div>
    </div>`;

  el.querySelector("#gate-save-config").addEventListener("click", () => {
    const url = el.querySelector("#gate-cloud-url").value.trim();
    const key = el.querySelector("#gate-cloud-key").value.trim();
    if (!url || !key) return toast("bitte url und anon-key eintragen.");
    cloud.setConfig(url, key);
    start(onReady);
  });
  el.querySelector("#gate-try-local").addEventListener("click", () => {
    setLocalOnly();
    start(onReady);
  });
}

function renderLogin(onReady) {
  const el = gateEl();
  el.innerHTML = `
    <div class="gate-wrap">
      <div class="gate-header">
        <div class="mark">MP</div>
        <h1>anmelden</h1>
        <p>passwortlos, per magic-link: e-mail eintragen, link abschicken lassen und den link aus der mail auf <strong>diesem gerät</strong> öffnen — kein passwort zum merken/tippen.</p>
      </div>
      <div class="card">
        <label class="field">e-mail<input type="email" id="gate-email" placeholder="du@beispiel.de"></label>
        <button class="btn btn-primary btn-block" id="gate-send-link" style="margin-top:12px;">login-link senden</button>
        <div id="gate-login-hint" style="font-size:11.5px; color:var(--text-soft); margin-top:10px; text-align:center;"></div>
      </div>
      <button class="gate-skip" id="gate-change-project" type="button">anderes cloud-projekt verwenden</button>
    </div>`;

  el.querySelector("#gate-send-link").addEventListener("click", async (e) => {
    const email = el.querySelector("#gate-email").value.trim();
    if (!email) return toast("bitte e-mail-adresse eintragen.");
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await cloud.requestMagicLink(email);
      el.querySelector("#gate-login-hint").textContent = `link an ${email} geschickt — öffne ihn auf diesem gerät.`;
    } catch (err) {
      toast(`fehler: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });
  el.querySelector("#gate-change-project").addEventListener("click", () => {
    cloud.clearConfig();
    start(onReady);
  });

  // falls der magic-link im selben tab geöffnet wird (oder die session
  // anderweitig eintrifft), automatisch weiterspringen statt auf einen
  // manuellen reload zu warten.
  cloud.onAuthChange((event, session) => {
    if (session) start(onReady);
  }).then((unsub) => (unsubscribeAuth = unsub));
}

function renderOnboardingStep(onReady) {
  onboarding.mount(gateEl(), {
    onFinish: () => start(onReady),
  });
}
