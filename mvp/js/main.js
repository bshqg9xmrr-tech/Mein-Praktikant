// main.js — einstieg: onboarding oder app-shell mit fünf bereichen.
//   heute   — hauptfokus + energie-gerechter tagesplan (morning briefing)
//   eingang — diktat, nachrichten, importe → einordnen (nachrichten-zentrale)
//   abend   — check-in: aufgaben, habits, stimmung, einzahlung auf ziele
//   ziele   — jahresziele & habits
//   profil  — vorlieben, energieprofil, verbindungen, daten

import { db, onChange } from "./db.js";
import { h, icon } from "./ui.js";
import { rollover, startCheckinWatcher, loadWeather } from "./core.js";
import { renderOnboarding } from "./onboarding.js";
import { renderHeute } from "./view-heute.js";
import { renderEingang } from "./view-eingang.js";
import { renderAbend } from "./view-abend.js";
import { renderZiele } from "./view-ziele.js";
import { renderProfil } from "./view-profil.js";

const VIEWS = {
  heute: { label: "heute", icon: "sun", render: renderHeute },
  eingang: { label: "eingang", icon: "inbox", render: renderEingang },
  abend: { label: "abend", icon: "moon", render: renderAbend },
  ziele: { label: "ziele", icon: "target", render: renderZiele },
  profil: { label: "profil", icon: "user", render: renderProfil },
};

const root = document.getElementById("root");
let current = "heute";
let shared = null;

function go(view, opts = {}) {
  current = view;
  if (opts.shared) shared = opts.shared;
  try {
    sessionStorage.setItem("mp2-view", view);
  } catch {}
  render();
  window.scrollTo({ top: 0 });
}

function inboxCount() {
  return db().tasks.filter((t) => t.status === "inbox").length;
}

function render() {
  root.innerHTML = "";
  if (!db().onboarded) {
    root.append(renderOnboarding(() => go("heute")));
    return;
  }
  const main = h("main", { class: "view" });
  const ctx = { go, rerender: render, shared };
  shared = null;
  const shell = h(
    "div",
    { class: "shell" },
    h(
      "header",
      { class: "topbar" },
      h("div", { class: "brand" }, h("div", { class: "brand-mark" }, "mp"), h("span", {}, "mein praktikant")),
      h("span", { class: "beta" }, "mvp v2 · beta")
    ),
    main
  );
  const nav = h(
    "nav",
    { class: "nav", "aria-label": "hauptnavigation" },
    Object.entries(VIEWS).map(([key, v]) =>
      h(
        "button",
        { class: key === current ? "on" : "", onclick: () => go(key), "aria-current": key === current ? "page" : null, "data-view": key },
        icon(v.icon),
        v.label,
        key === "eingang" && inboxCount() ? h("span", { class: "badge" }, inboxCount()) : null
      )
    )
  );
  root.append(shell, nav);
  VIEWS[current].render(main, ctx);
}

function boot() {
  try {
    const v = sessionStorage.getItem("mp2-view");
    if (v && VIEWS[v]) current = v;
  } catch {}
  // teilen-menü (PWA share_target, z.b. android/chrome): text landet im eingang
  const params = new URLSearchParams(location.search);
  const text = [params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join("\n");
  if (text) {
    current = "eingang";
    shared = text;
    history.replaceState(null, "", location.pathname);
  }
  rollover();
  render();
  if (db().onboarded) {
    loadWeather().then((w) => w && current === "heute" && render());
    startCheckinWatcher(() => {
      if (current === "heute") render();
    });
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

// externe änderungen (z.b. zweiter tab) neu einlesen
window.addEventListener("storage", (e) => e.key === "mp2-db-v1" && location.reload());
onChange(() => {
  const badge = document.querySelector('[data-view="eingang"] .badge');
  const n = inboxCount();
  if (badge) badge.textContent = n || "";
  if (badge && !n) badge.remove();
});

boot();
