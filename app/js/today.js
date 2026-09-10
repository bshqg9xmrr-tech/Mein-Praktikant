// today.js — schritt 1 (einfache erfassung) + schritt 2 (einfache lokale
// planung) + kalender-export. siehe architecture.md §4.1 für den
// vollen (später ki-gestützten) zweistufigen flow — hier ist die
// deterministische, transparente basisversion davon: echte planung,
// echter kalender-export, aber ohne externe ki (die kommt erst mit der
// Claude-API-anbindung, siehe context.md §7).

import { Areas, Tasks, Goals, uid, todayISO, getSettings } from "./storage.js";
import { goalsForLevel, currentPeriodFor } from "./goals.js";
import { downloadICS } from "./ics.js";
import { esc, toast, ICONS } from "./ui.js";

function areasById() {
  return Object.fromEntries(Areas.all().map((a) => [a.id, a]));
}

// aufgaben, die gerade per "rückgängig"-toast gelöscht werden — sie bleiben
// bis zum ablauf der frist (oder bis der toast geschlossen wird) technisch
// noch in Tasks, werden aber hier schon aus der anzeige ausgeblendet, damit
// sie nicht mitten im wartefenster wieder auftauchen (siehe removeTaskWithUndo).
const pendingDeleteIds = new Set();

function todaysTasks() {
  return Tasks.all()
    .filter((t) => t.date === todayISO() && !pendingDeleteIds.has(t.id))
    .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));
}

function addTask(title) {
  return Tasks.add({
    id: uid("task"),
    title,
    date: todayISO(),
    areaId: null,
    goalId: null,
    scheduledTime: null,
    estimatedMinutes: null,
    done: false,
    createdAt: todayISO(),
  });
}

// löscht eine aufgabe nicht sofort endgültig, sondern zeigt zuerst einen
// toast mit "rückgängig" — erst wenn die frist abläuft oder der toast
// geschlossen wird, verschwindet die aufgabe wirklich aus Tasks.
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

export function render() {
  const el = document.getElementById("view-today");
  const tasks = todaysTasks();
  const scheduledCount = tasks.filter((t) => t.scheduledTime).length;
  const openCount = tasks.filter((t) => !t.done).length;

  el.innerHTML = `
    <h1>guten tag, markus</h1>
    <p class="subtitle">${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })} · ${tasks.length} aufgabe${tasks.length === 1 ? "" : "n"} heute</p>

    <div class="card" style="display:flex; gap:10px; align-items:center;">
      <input type="text" id="capture-input" placeholder="was steht heute an?" style="flex:1;">
      <button class="btn-icon" id="capture-mic" title="diktieren (folgt mit ki-anbindung)">${ICONS.mic}</button>
      <button class="btn-icon" id="capture-add" title="hinzufügen" style="background:var(--accent); color:#fff; border:none;">${ICONS.plus}</button>
    </div>

    ${scheduledCount > 0 ? `
    <div class="ai-banner">
      <div class="icon">${ICONS.sparkle}</div>
      <div class="body">
        <div class="title">${scheduledCount} aufgabe${scheduledCount === 1 ? "" : "n"} eingeplant</div>
        <div class="meta">einfache lokale planung · noch keine echte ki (siehe einstellungen)</div>
      </div>
      <button class="btn-ghost" id="replan-btn">neu planen</button>
    </div>` : ""}

    ${tasks.length > 0 && openCount === 0 ? `
    <div class="done-banner">
      <div class="icon">${ICONS.check}</div>
      <div class="body">
        <div class="title">heute erledigt — gut gemacht</div>
        <div class="meta">alle ${tasks.length} aufgabe${tasks.length === 1 ? "" : "n"} von heute abgehakt.</div>
      </div>
    </div>` : ""}

    <div class="list" id="task-list">
      ${tasks.length ? tasks.map(taskRowHtml).join("") : `<div class="empty-hint">noch nichts erfasst — einfach oben eintragen.</div>`}
    </div>

    <div style="display:flex; gap:10px;">
      <button class="btn btn-primary btn-block" id="plan-btn" ${openCount === 0 ? "disabled" : ""}>${ICONS.sparkle} tag planen</button>
      <button class="btn btn-secondary" id="export-btn" title="als .ics-datei exportieren">${ICONS.calendar} kalender</button>
    </div>
    <div class="ai-note">plant reihenfolge &amp; pausen lokal · kalender-export als echte .ics-datei</div>
  `;

  el.querySelector("#capture-add").addEventListener("click", addFromInput);
  el.querySelector("#capture-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addFromInput();
  });
  // wird mehrzeiliger text eingefügt (z. b. eine kopierte liste), wird jede
  // nicht-leere zeile als eigenes todo angelegt, statt alles als einen
  // einzigen, langen titel in das einzeilige feld zu quetschen.
  el.querySelector("#capture-input").addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      lines.forEach(addTask);
      render();
      toast(`${lines.length} aufgaben aus der zwischenablage angelegt.`);
    }
  });
  el.querySelector("#capture-mic").addEventListener("click", () => {
    toast("diktierfunktion folgt mit der ki-anbindung (siehe context.md §7).");
  });
  el.querySelector("#plan-btn")?.addEventListener("click", planDay);
  el.querySelector("#replan-btn")?.addEventListener("click", planDay);
  el.querySelector("#export-btn").addEventListener("click", exportToday);

  el.querySelectorAll(".task-row").forEach((row) => {
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
    const title = input.value.trim();
    if (!title) return;
    addTask(title);
    input.value = "";
    render();
  }
}
