// auth-gate.js — entscheidet einmalig beim app-start, was der nutzer sieht,
// bevor die eigentliche app (main.js#init) initialisiert wird:
//
//   a) kein supabase konfiguriert   → setup-bildschirm (url/anon-key)
//   b) konfiguriert, nicht angemeldet → login-bildschirm (magic-link)
//   c) angemeldet, onboarding offen  → onboarding-wizard (onboarding.js)
//   d) angemeldet + onboarding fertig → normale app
//
// siehe architecture.md §2.2/§4.8/§4.12, context.md §3.10.
//
// wichtig (claude.md §3.1, architecture.md §1 "ausnahme, neu entschieden"):
// dieses gate läuft nur EINMAL beim start. ist man einmal eingeloggt, läuft
// die app danach wieder ganz normal offline-first weiter — es gibt hier
// keinen wiederkehrenden netzwerk-check, der den alltäglichen gebrauch
// blockieren könnte. `cloud.getSession()` liest dafür bewusst nur die
// lokal gespeicherte session (kein netzwerk nötig), nicht `getUser()`
// (das würde bei jedem start eine echte server-antwort abwarten).

import * as cloud from "./cloud.js";
import { getSettings } from "./storage.js";
import { esc, toast } from "./ui.js";
import * as onboarding from "./onboarding.js";

let unsubscribeAuth = null;

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
        <h1>cloud-sync einrichten, um loszulegen</h1>
        <p>mein praktikant braucht einen (kostenlosen) cloud-zugang, bevor es losgeht — damit die app weiß, wessen daten das sind (u. a. für die geplanten challenges) und deine daten optional zwischen mac, iphone und web synchron bleiben.</p>
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
    </div>`;

  el.querySelector("#gate-save-config").addEventListener("click", () => {
    const url = el.querySelector("#gate-cloud-url").value.trim();
    const key = el.querySelector("#gate-cloud-key").value.trim();
    if (!url || !key) return toast("bitte url und anon-key eintragen.");
    cloud.setConfig(url, key);
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
