// main.js — bootstrap + einfaches view-routing.
// architecture.md §2.2: die navigation wurde von sieben gleichrangigen
// tabs auf drei bereiche reduziert (strom/kompass/verlauf) — einstellungen
// ist kein bottom-tab mehr, sondern über das zahnrad oben rechts erreichbar
// (technisch bleibt es ein ganz normales "view", nur der einstiegspunkt
// hat sich geändert, siehe index.html #settings-shortcut).

import { load, onExternalChange } from "./storage.js";
import * as cloud from "./cloud.js";
import * as authGate from "./auth-gate.js";
import * as strom from "./strom.js";
import * as kompass from "./kompass.js";
import * as verlauf from "./verlauf.js";
import * as settings from "./settings.js";

const views = { strom, kompass, verlauf, settings };
const VIEW_STORAGE_KEY = "mein-praktikant-last-view";
let currentView = "strom";

function showView(name) {
  currentView = name;
  Object.keys(views).forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle("hidden", v !== name);
  });
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
  views[name].render();
  try {
    sessionStorage.setItem(VIEW_STORAGE_KEY, name);
  } catch (e) {
    /* private mode o. ä. — kein problem, view-wahl ist nicht kritisch */
  }
}

function init() {
  load(); // legt beim allerersten start beispieldaten an

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  // einstellungen hat keinen eigenen bottom-tab mehr (nur noch strom/
  // kompass/verlauf) — beide topbar-buttons führen dorthin.
  document.getElementById("feedback-shortcut").addEventListener("click", () => showView("settings"));
  document.getElementById("settings-shortcut").addEventListener("click", () => showView("settings"));

  // wenn ein cloud-sync-pull daten von einem anderen gerät nachzieht,
  // die gerade sichtbare ansicht neu zeichnen.
  onExternalChange(() => views[currentView].render());

  let start = "strom";
  try {
    const remembered = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (remembered && views[remembered]) start = remembered;
  } catch (e) {
    /* ignorieren */
  }
  showView(start);

  cloud.start().catch((e) => console.warn("cloud-sync-start fehlgeschlagen", e));
}

// architecture.md §2.2/§4.8: login (+ ggf. onboarding) ist jetzt ein
// einmaliges, vorgeschaltetes gate — erst wenn es "durchgelassen" hat
// (eingeloggt, onboarding erledigt bzw. übersprungen), startet die
// eigentliche app. siehe auth-gate.js.
document.addEventListener("DOMContentLoaded", () => authGate.start(init));
