// habits.js — tägliche routinen mit streak-tracking (lokal berechnet,
// siehe architecture.md §4.6).

import { Habits, HabitLogs, Areas, uid, todayISO } from "./storage.js";
import { esc, ICONS } from "./ui.js";

function isoDaysBack(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function currentStreak(habitId) {
  const logs = new Set(HabitLogs.all().filter((l) => l.habitId === habitId && l.done).map((l) => l.date));
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const day = isoDaysBack(i);
    if (logs.has(day)) streak++;
    else if (i === 0) continue; // heute evtl. noch nicht erledigt — bricht die serie nicht sofort
    else break;
  }
  return streak;
}

export function isDoneToday(habitId) {
  return HabitLogs.all().some((l) => l.habitId === habitId && l.date === todayISO() && l.done);
}

function toggleToday(habitId) {
  const today = todayISO();
  const existing = HabitLogs.all().find((l) => l.habitId === habitId && l.date === today);
  if (existing) {
    HabitLogs.update(existing.id, { done: !existing.done });
  } else {
    HabitLogs.add({ id: uid("hlog"), habitId, date: today, done: true });
  }
}

export function render() {
  const el = document.getElementById("view-habits");
  const habits = Habits.all();
  const areasById = Object.fromEntries(Areas.all().map((a) => [a.id, a]));

  el.innerHTML = `
    <h1>habits</h1>
    <p class="subtitle">tägliche routinen — heute abhaken, streak sehen</p>

    <div class="list">
      ${habits.length ? habits.map((h) => habitRowHtml(h, areasById)).join("") : `<div class="empty-hint">noch keine habits angelegt.</div>`}
    </div>

    <div class="card" style="display:flex; gap:10px;">
      <input type="text" id="habit-name" placeholder="neues habit, z. b. kalt duschen" style="flex:1;">
      <button class="btn btn-primary" id="habit-add">${ICONS.plus}</button>
    </div>
  `;

  el.querySelectorAll("[data-toggle-habit]").forEach((btn) =>
    btn.addEventListener("click", () => {
      toggleToday(btn.dataset.toggleHabit);
      render();
    })
  );
  el.querySelectorAll("[data-delete-habit]").forEach((btn) =>
    btn.addEventListener("click", () => {
      Habits.remove(btn.dataset.deleteHabit);
      render();
    })
  );
  el.querySelector("#habit-add").addEventListener("click", () => {
    const input = el.querySelector("#habit-name");
    const name = input.value.trim();
    if (!name) return;
    Habits.add({ id: uid("habit"), name, areaId: null, createdAt: todayISO() });
    render();
  });
}

function habitRowHtml(h, areasById) {
  const done = isDoneToday(h.id);
  const streak = currentStreak(h.id);
  const area = h.areaId ? areasById[h.areaId] : null;
  return `
    <div class="task-row ${done ? "done" : ""}" style="border-left-color:${area ? area.color : "var(--accent)"}">
      <button class="task-check" data-toggle-habit="${h.id}">${done ? ICONS.check : ""}</button>
      <div class="task-meta-row">
        <div class="task-title" style="text-decoration:none !important;">${esc(h.name)}</div>
        <div class="task-meta"><span class="pill pill-neutral">${streak} tag${streak === 1 ? "" : "e"} streak</span></div>
      </div>
      <button class="btn-icon" data-delete-habit="${h.id}">${ICONS.trash}</button>
    </div>`;
}
