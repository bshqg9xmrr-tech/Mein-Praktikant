// progress.js — berechnet, wie aufgaben und habits auf die jahresziele
// einzahlen. nichts wird von hand geschätzt: fortschritt = mittelwert aus
//   (a) erledigte, dem ziel zugeordnete aufgaben im verhältnis zum zielwert und
//   (b) habit-konstanz der zugeordneten habits seit jahres- bzw. habit-beginn.

import { db } from "./db.js";
import { todayISO, addDays, diffDays, weekStart } from "./dates.js";

function habitConsistency(habit, untilISO, excludeDay) {
  const year = untilISO.slice(0, 4);
  const start = habit.createdAt > `${year}-01-01` ? habit.createdAt : `${year}-01-01`;
  const days = diffDays(start, untilISO) + 1;
  if (days <= 0) return null;
  const expected = (days * habit.perWeek) / 7;
  let sum = 0;
  for (const [date, entries] of Object.entries(db().habitLog)) {
    if (date === excludeDay) continue;
    if (date >= start && date <= untilISO && entries[habit.id] != null) sum += entries[habit.id];
  }
  return Math.min(1, expected > 0 ? sum / expected : 0);
}

/**
 * fortschritt (0..1) eines ziels zum stichtag (inkl.).
 * excludeDay: beiträge dieses tages weglassen (für "vorher/nachher" am selben
 * stichtag — so kann ein tag ohne beitrag nie wie ein rückschritt aussehen).
 */
export function goalProgress(goalId, untilISO = todayISO(), excludeDay = null) {
  const ts = db().tasks.filter((t) => t.goalId === goalId && !["dropped", "info", "idea"].includes(t.status));
  const doneBy = ts.filter((t) => t.status === "done" && (t.doneAt || "").slice(0, 10) <= untilISO && (t.doneAt || "").slice(0, 10) !== excludeDay);
  const parts = [];
  // aufgaben-anteil gegen den persönlichen zielwert ("wie viele erledigte
  // aufgaben ≈ ziel erreicht?"), nicht gegen die zufällige zahl verknüpfter
  // aufgaben — sonst wäre ein jahresziel mit 3 aufgaben nach 3 tagen "fertig"
  const target = Math.max(1, Number(db().goals.find((g) => g.id === goalId)?.taskTarget) || 20);
  if (ts.length) parts.push(Math.min(1, doneBy.length / Math.max(target, ts.length)));
  const hs = db().habits.filter((h) => h.goalId === goalId);
  for (const h of hs) {
    const c = habitConsistency(h, untilISO, excludeDay);
    if (c != null) parts.push(c);
  }
  if (!parts.length) return { value: 0, tasksDone: doneBy.length, tasksTotal: ts.length, habits: hs.length, empty: true };
  return { value: parts.reduce((a, b) => a + b, 0) / parts.length, tasksDone: doneBy.length, tasksTotal: ts.length, target, habits: hs.length, empty: false };
}

/** was hat ein tag zu jedem ziel beigetragen? */
export function dayContribution(dateISO = todayISO()) {
  const out = [];
  for (const g of db().goals) {
    const tasksDone = db().tasks.filter((t) => t.goalId === g.id && t.status === "done" && (t.doneAt || "").slice(0, 10) === dateISO);
    const habitsDone = db().habits.filter((h) => h.goalId === g.id && (db().habitLog[dateISO]?.[h.id] || 0) > 0);
    const before = goalProgress(g.id, dateISO, dateISO).value;
    const after = goalProgress(g.id, dateISO).value;
    out.push({ goal: g, tasksDone, habitsDone, before, after, delta: after - before });
  }
  return out;
}

export function habitWeekCount(habitId, dateISO = todayISO()) {
  const ws = weekStart(dateISO);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    if (d > dateISO) break;
    n += db().habitLog[d]?.[habitId] || 0;
  }
  return n;
}

export function habitStreak(habitId, dateISO = todayISO()) {
  let n = 0;
  let d = (db().habitLog[dateISO]?.[habitId] || 0) > 0 ? dateISO : addDays(dateISO, -1);
  while ((db().habitLog[d]?.[habitId] || 0) > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function pct(v) {
  return `${Math.round(v * 100)} %`;
}
