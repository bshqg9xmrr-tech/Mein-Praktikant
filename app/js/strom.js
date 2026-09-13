// strom.js — "strom": ein einziges erfassungsfeld statt vorab-entscheidung
// zwischen todo/notiz/tagebuch (architecture.md §2.2, ersetzt inhaltlich
// die bisherigen today.js + notes.js). schritt 2 (einfache lokale
// planung) + kalender-export sind unverändert aus today.js übernommen.
//
// lokale einordnungs-heuristik (WICHTIG, klar zu kennzeichnen):
// architecture.md §2.1 sieht eine echte ki-schicht vor (AIProvider,
// on-device-modell auf mac/iphone, optional Ollama/Claude). die gibt es
// in diesem web-prototyp noch nicht. classify() unten ist NUR eine ganz
// simple, für jeden nachvollziehbare wortlisten-heuristik (kein
// sprachmodell, kein lernen aus historie) — sie liefert einen VORSCHLAG,
// den markus per klick auf das badge jederzeit korrigieren kann. im UI
// wird das an mehreren stellen ausdrücklich als "lokale einordnung, keine
// echte ki" beschriftet, damit nichts vorgetäuscht wird (siehe
// CHANGELOG.md/app/README.md-konvention für "was bewusst noch nicht echt ist").
//
// pragmatische entscheidung "gefühl"-kategorie (siehe aufgabenstellung):
// ein eigenes JournalEntry-feld pro eintrag anzulegen wäre hier unnötig
// komplex (JournalEntry ist auf EINEN eintrag pro TAG mit festen sektionen
// ausgelegt, kein append-log). "gefühl"-einträge landen daher, wie
// "gedanke"-einträge, als ganz normale Note — nur mit dem zusätzlichen
// tag "gefühl" markiert. das hält das datenmodell schlank und die notiz
// bleibt trotzdem über Notes.all() für spätere volltextsuche auffindbar.

import { Areas, Tasks, Notes, uid, todayISO, getSettings } from "./storage.js";
import { goalsForLevel, currentPeriodFor } from "./goals.js";
import { downloadICS } from "./ics.js";
import { esc, toast, openModal, closeModal, ICONS } from "./ui.js";

const REDUCED_IMPORTANT_COUNT = 3;
const RECENT_CAPTURES_COUNT = 5;

const CATEGORY_LABEL = { todo: "todo", gedanke: "gedanke", gefühl: "gefühl" };
const CATEGORY_ORDER = ["todo", "gedanke", "gefühl"];

// wortlisten für die lokale heuristik — bewusst simpel und für markus
// selbst nachvollziehbar (keine blackbox). reihenfolge der prüfung: erst
// "gedanke"-signale (frage/unsicherheit), dann "gefühl"-wörter, sonst
// "todo" als default (siehe klassenkommentar oben).
const THOUGHT_WORDS = ["vielleicht", "idee", "überlegen", "überleg"];
const FEELING_WORDS = ["fühle", "fühl mich", "genervt", "froh", "müde", "gestresst", "dankbar", "traurig", "wütend", "erschöpft", "glücklich", "ängstlich", "stolz", "unruhig", "zufrieden"];

export function classify(text) {
  const lower = text.toLowerCase();
  if (text.includes("?") || THOUGHT_WORDS.some((w) => lower.includes(w))) return "gedanke";
  if (FEELING_WORDS.some((w) => lower.includes(w))) return "gefühl";
  return "todo";
}

let showAllImportant = false;

function areasById() {
  return Object.fromEntries(Areas.all().map((a) => [a.id, a]));
}

// aufgaben, die gerade per "rückgängig"-toast gelöscht werden — siehe
// removeTaskWithUndo (1:1 aus today.js übernommen).
const pendingDeleteIds = new Set();

function todaysTasks() {
  return Tasks.all()
    .filter((t) => t.date === todayISO() && !pendingDeleteIds.has(t.id))
    .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));
}

function addTaskItem(title, createdAt = new Date().toISOString()) {
  return Tasks.add({
    id: uid("task"),
    title,
    date: todayISO(),
    areaId: null,
    goalId: null,
    scheduledTime: null,
    estimatedMinutes: null,
    done: false,
    createdAt,
  });
}

function addNoteItem(title, tags, createdAt = new Date().toISOString()) {
  return Notes.add({ id: uid("note"), title, body: "", tags, createdAt });
}

// legt einen einzelnen erfassten text gemäß seiner (vorgeschlagenen)
// kategorie in der passenden collection ab.
function captureOne(text, category = classify(text)) {
  if (category === "todo") return addTaskItem(text);
  return addNoteItem(text, category === "gefühl" ? ["gefühl"] : []);
}

// die letzten paar so eingeordneten einträge, für die "gerade
// einsortiert"-liste — zusammengeführt aus den heutigen todos und den
// heute angelegten notizen/gefühlen (es gibt keine eigene "capture-log"-
// collection, die kategorie ergibt sich direkt aus der collection/den tags).
function recentCaptures(limit = RECENT_CAPTURES_COUNT) {
  const today = todayISO();
  const todosToday = Tasks.all()
    .filter((t) => t.date === today && !pendingDeleteIds.has(t.id))
    .map((t) => ({ id: t.id, category: "todo", title: t.title, createdAt: t.createdAt || t.date }));
  const notesToday = Notes.all()
    .filter((n) => (n.createdAt || "").slice(0, 10) === today)
    .map((n) => ({ id: n.id, category: n.tags?.includes("gefühl") ? "gefühl" : "gedanke", title: n.title, createdAt: n.createdAt }));
  return [...todosToday, ...notesToday]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}

// verschiebt einen bereits einsortierten eintrag in eine andere kategorie
// — inkl. migration zwischen den collections (z. b. todo -> notiz).
function changeCategory(item, newCategory) {
  if (item.category === newCategory) {
    closeModal();
    return;
  }
  let title, createdAt;
  if (item.category === "todo") {
    const t = Tasks.get(item.id);
    if (!t) return closeModal();
    title = t.title;
    createdAt = t.createdAt;
    Tasks.remove(item.id);
  } else {
    const n = Notes.get(item.id);
    if (!n) return closeModal();
    title = n.title;
    createdAt = n.createdAt;
    Notes.remove(item.id);
  }
  if (newCategory === "todo") addTaskItem(title, createdAt);
  else addNoteItem(title, newCategory === "gefühl" ? ["gefühl"] : [], createdAt);
  closeModal();
  toast(`in „${CATEGORY_LABEL[newCategory]}“ verschoben.`);
  render();
}

function openCategoryPicker(item) {
  const html = `
    <h2>einordnung ändern</h2>
    <p style="font-size:12.5px; color:var(--text-soft); margin:-4px 0 6px 0; line-height:1.5;">
      „${esc(item.title)}“ — lokale einordnung, keine echte ki (siehe architecture.md §2.1). jederzeit korrigierbar.
    </p>
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${CATEGORY_ORDER.map(
        (cat) =>
          `<button class="btn ${cat === item.category ? "btn-primary" : "btn-secondary"} btn-block" data-pick-category="${cat}">${CATEGORY_LABEL[cat]}${cat === item.category ? " · aktuell" : ""}</button>`
      ).join("")}
    </div>
    <button class="btn-ghost" id="modal-cancel" style="margin-top:6px;">abbrechen</button>
  `;
  openModal(html, {
    onMount: (root) => {
      root.querySelector("#modal-cancel").addEventListener("click", closeModal);
      root.querySelectorAll("[data-pick-category]").forEach((btn) => {
        btn.addEventListener("click", () => changeCategory(item, btn.dataset.pickCategory));
      });
    },
  });
}

// löscht eine aufgabe nicht sofort endgültig, sondern zeigt zuerst einen
// toast mit "rückgängig" (1:1 aus today.js übernommen).
function removeTaskWithUndo(task) {
  pendingDeleteIds.add(task.id);
  render();
  toast(`"${task.title}" gelöscht.`, {
    actionLabel: "rückgängig",
    onAction: () => {
      pendingDeleteIds.delete(task.id);
      render();
    },
    onDismiss: () => {
      pendingDeleteIds.delete(task.id);
      Tasks.remove(task.id);
      render();
    },
    duration: 5000,
  });
}

function planDay() {
  const settings = getSettings();
  const tasks = todaysTasks().filter((t) => !t.done);
  if (tasks.length === 0) {
    toast("keine offenen aufgaben für heute.");
    return;
  }
  let cursorMinutes = settings.dayStartHour * 60;
  tasks.forEach((t, i) => {
    const minutes = t.estimatedMinutes || settings.defaultTaskMinutes;
    const hh = String(Math.floor(cursorMinutes / 60)).padStart(2, "0");
    const mm = String(cursorMinutes % 60).padStart(2, "0");
    Tasks.update(t.id, { scheduledTime: `${hh}:${mm}`, estimatedMinutes: minutes });
    cursorMinutes += minutes;
    if ((i + 1) % 2 === 0) cursorMinutes += settings.breakMinutes;
  });
  toast(`tag geplant: ${tasks.length} aufgaben eingeplant.`);
  if (settings.calendarAutoExport) exportToday();
  render();
}

function exportToday() {
  const scheduled = todaysTasks().filter((t) => t.scheduledTime);
  if (scheduled.length === 0) {
    toast("noch keine eingeplanten aufgaben zum exportieren.");
    return;
  }
  downloadICS(scheduled, areasById(), `mein-praktikant-${todayISO()}.ics`);
  toast(".ics-datei heruntergeladen — in deinen kalender importieren.");
}

function areaOptionsHtml(selectedId) {
  return (
    `<option value="">bereich</option>` +
    Areas.all().map((a) => `<option value="${a.id}" ${a.id === selectedId ? "selected" : ""}>${esc(a.name)}</option>`).join("")
  );
}

function weekGoalOptionsHtml(selectedId) {
  const period = currentPeriodFor("week");
  const goals = goalsForLevel("week").filter((g) => JSON.stringify(g.period) === JSON.stringify(period));
  return (
    `<option value="">kein wochenziel</option>` +
    goals.map((g) => `<option value="${g.id}" ${g.id === selectedId ? "selected" : ""}>${esc(g.title)}</option>`).join("")
  );
}

function taskRowHtml(t) {
  const area = areasById()[t.areaId];
  return `
    <div class="task-row ${t.done ? "done" : ""}" data-id="${t.id}">
      <button class="task-check" data-action="toggle" title="erledigt">${t.done ? ICONS.check : ""}</button>
      <div class="task-meta-row">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          ${t.scheduledTime ? `<span class="pill pill-neutral">${t.scheduledTime} · ${t.estimatedMinutes || "?"} min</span>` : `<span class="pill pill-neutral" style="color:var(--text-faint)">noch nicht eingeplant</span>`}
          <select data-action="area" style="width:auto; padding:5px 8px; font-size:11px;">${areaOptionsHtml(t.areaId)}</select>
          <select data-action="goal" style="width:auto; padding:5px 8px; font-size:11px;">${weekGoalOptionsHtml(t.goalId)}</select>
          ${area ? `<span class="dot" style="background:${area.color}"></span>` : ""}
        </div>
      </div>
      <button class="btn-icon" data-action="delete" title="löschen">${ICONS.trash}</button>
    </div>`;
}

function captureRowHtml(c) {
  return `
    <div class="task-row" style="border-left-color: var(--border);" data-capture-id="${c.id}">
      <div class="task-meta-row">
        <div class="task-title" style="font-weight:600;">${esc(c.title)}</div>
      </div>
      <button class="pill pill-neutral" data-badge-id="${c.id}" data-badge-category="${c.category}" title="einordnung ändern">→ ${CATEGORY_LABEL[c.category]}</button>
    </div>`;
}

export function render() {
  const el = document.getElementById("view-strom");
  const tasks = todaysTasks();
  const openTasks = tasks.filter((t) => !t.done);
  const scheduledCount = tasks.filter((t) => t.scheduledTime).length;
  const recent = recentCaptures();

  const collapsedList = openTasks.slice(0, REDUCED_IMPORTANT_COUNT);
  const visibleList = showAllImportant ? tasks : collapsedList;
  const hiddenCount = tasks.length - visibleList.length;

  el.innerHTML = `
    <h1>guten tag, markus</h1>
    <p class="subtitle">${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })} · alles an einem ort — wird automatisch einsortiert</p>

    <div class="card" style="display:flex; gap:10px; align-items:center;">
      <input type="text" id="capture-input" placeholder="was ist los? todo, gedanke oder gefühl — einfach reinschreiben" style="flex:1;">
      <button class="btn-icon" id="capture-mic" title="diktieren (folgt mit ki-anbindung)">${ICONS.mic}</button>
      <button class="btn-icon" id="capture-add" title="hinzufügen" style="background:var(--accent); color:#fff; border:none;">${ICONS.plus}</button>
    </div>

    ${recent.length ? `
    <div>
      <div class="section-label" style="margin:2px 0 8px 2px;">gerade einsortiert</div>
      <div class="list">
        ${recent.map(captureRowHtml).join("")}
      </div>
      <div class="ai-note" title="einfache lokale einordnung, keine echte ki — siehe architecture.md §2.1 für die geplante ki-schicht">lokale einordnung · keine echte ki · zum ändern auf das label tippen</div>
    </div>` : ""}

    ${scheduledCount > 0 ? `
    <div class="ai-banner">
      <div class="icon">${ICONS.sparkle}</div>
      <div class="body">
        <div class="title">${scheduledCount} aufgabe${scheduledCount === 1 ? "" : "n"} eingeplant</div>
        <div class="meta">einfache lokale planung · noch keine echte ki (siehe einstellungen)</div>
      </div>
      <button class="btn-ghost" id="replan-btn">neu planen</button>
    </div>` : ""}

    ${tasks.length > 0 && openTasks.length === 0 ? `
    <div class="done-banner">
      <div class="icon">${ICONS.check}</div>
      <div class="body">
        <div class="title">heute erledigt — gut gemacht</div>
        <div class="meta">alle ${tasks.length} aufgabe${tasks.length === 1 ? "" : "n"} von heute abgehakt.</div>
      </div>
    </div>` : ""}

    ${tasks.length > 0 ? `<div class="section-label" style="margin:4px 0 2px 2px;">jetzt wichtig</div>` : ""}
    <div class="list" id="task-list">
      ${tasks.length ? visibleList.map(taskRowHtml).join("") : `<div class="empty-hint">noch nichts erfasst — einfach oben eintragen.</div>`}
    </div>
    ${!showAllImportant && hiddenCount > 0 ? `<button class="btn-ghost" id="show-more-important">${hiddenCount} weitere anzeigen</button>` : ""}
    ${showAllImportant && tasks.length > REDUCED_IMPORTANT_COUNT ? `<button class="btn-ghost" id="show-less-important">weniger anzeigen</button>` : ""}

    <div style="display:flex; gap:10px;">
      <button class="btn btn-primary btn-block" id="plan-btn" ${openTasks.length === 0 ? "disabled" : ""}>${ICONS.sparkle} tag planen</button>
      <button class="btn btn-secondary" id="export-btn" title="als .ics-datei exportieren">${ICONS.calendar} kalender</button>
    </div>
    <div class="ai-note">plant reihenfolge &amp; pausen lokal · kalender-export als echte .ics-datei</div>
  `;

  el.querySelector("#capture-add").addEventListener("click", addFromInput);
  el.querySelector("#capture-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addFromInput();
  });
  // mehrzeiliger paste: jede nicht-leere zeile wird einzeln erfasst und
  // eigenständig eingeordnet (1:1-mechanik aus today.js, nur pro zeile
  // jetzt zusätzlich klassifiziert statt immer ein todo anzulegen).
  el.querySelector("#capture-input").addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      lines.forEach((line) => captureOne(line));
      render();
      toast(`${lines.length} einträge aus der zwischenablage erfasst und lokal eingeordnet.`);
    }
  });
  el.querySelector("#capture-mic").addEventListener("click", () => {
    toast("diktierfunktion folgt mit der ki-anbindung (siehe context.md §7).");
  });
  el.querySelector("#plan-btn")?.addEventListener("click", planDay);
  el.querySelector("#replan-btn")?.addEventListener("click", planDay);
  el.querySelector("#export-btn").addEventListener("click", exportToday);

  el.querySelector("#show-more-important")?.addEventListener("click", () => {
    showAllImportant = true;
    render();
  });
  el.querySelector("#show-less-important")?.addEventListener("click", () => {
    showAllImportant = false;
    render();
  });

  el.querySelectorAll("[data-badge-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = recent.find((c) => c.id === btn.dataset.badgeId);
      if (item) openCategoryPicker(item);
    });
  });

  el.querySelectorAll(".task-row[data-id]").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('[data-action="toggle"]').addEventListener("click", () => {
      const t = Tasks.get(id);
      Tasks.update(id, { done: !t.done });
      render();
    });
    row.querySelector('[data-action="delete"]').addEventListener("click", () => {
      const t = Tasks.get(id);
      if (t) removeTaskWithUndo(t);
    });
    row.querySelector('[data-action="area"]').addEventListener("change", (e) => {
      Tasks.update(id, { areaId: e.target.value || null });
      render();
    });
    row.querySelector('[data-action="goal"]').addEventListener("change", (e) => {
      Tasks.update(id, { goalId: e.target.value || null });
    });
  });

  function addFromInput() {
    const input = el.querySelector("#capture-input");
    const text = input.value.trim();
    if (!text) return;
    captureOne(text);
    input.value = "";
    render();
  }
}
