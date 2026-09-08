// main.js — bootstrap + einfaches view-routing.

import { load } from "./storage.js";
import * as today from "./today.js";
import * as goals from "./goals-view.js";
import * as notes from "./notes.js";
import * as journal from "./journal.js";
import * as habits from "./habits.js";
import * as overview from "./overview.js";
import * as settings from "./settings.js";

const views = { today, goals, notes, journal, habits, overview, settings };
const VIEW_STORAGE_KEY = "mein-praktikant-last-view";

function showView(name) {
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

  document.getElementById("feedback-shortcut").addEventListener("click", () => showView("settings"));

  let start = "today";
  try {
    const remembered = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (remembered && views[remembered]) start = remembered;
  } catch (e) {
    /* ignorieren */
  }
  showView(start);
}

document.addEventListener("DOMContentLoaded", init);
