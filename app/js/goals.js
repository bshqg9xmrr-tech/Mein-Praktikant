// goals.js — ziel-hierarchie: jahr -> quartal -> monat -> woche, und von
// dort über verlinkte tasks/habits bis ins tagesgeschäft.
// das ist die kernfunktion, die im ersten mockup gefehlt hat: hier wird
// tatsächlich abgeleitet (nicht nur angezeigt) — ein ziel speist sich aus
// seinen verlinkten tasks/habits bzw. (rekursiv) aus seinen unterzielen
// (architecture.md §2.2/§4.1: todos UND habits zählen auf ziele ein).

import { Goals, Tasks, Habits, HabitLogs, uid, todayISO, isoWeekOf } from "./storage.js";

// gewichtung, wenn ein ziel sowohl direkt verlinkte tasks als auch direkt
// verlinkte habits hat (default 1:1 — architecture.md §4.1).
const TASK_HABIT_WEIGHT = 0.5;
// gewichtung, wenn ein ziel sowohl unterziele als auch eigene, direkt
// verlinkte tasks/habits hat: unterziel-durchschnitt vs. eigene ebene.
const SUBGOALS_OWN_WEIGHT = 0.5;

export const LEVELS = ["year", "quarter", "month", "week"];
export const LEVEL_LABEL = { year: "jahr", quarter: "quartal", month: "monat", week: "woche" };
export const PARENT_LEVEL = { quarter: "year", month: "quarter", week: "month" };

export function levelIndex(level) {
  return LEVELS.indexOf(level);
}

export function childrenOf(goalId) {
  return Goals.all().filter((g) => g.parentId === goalId);
}

export function tasksOf(goalId) {
  return Tasks.all().filter((t) => t.goalId === goalId);
}

export function habitsOf(goalId) {
  return Habits.all().filter((h) => h.goalId === goalId);
}

// datumsspanne (inklusive start/ende, UTC-mitternacht) für den zeitraum
// eines ziels — grundlage für die habit-konsistenz-berechnung unten.
// inverse zu isoWeekOf()/currentPeriodFor() in storage.js.
function periodRange(goal) {
  const p = goal.period || {};
  switch (goal.level) {
    case "year":
      return { start: new Date(Date.UTC(p.year, 0, 1)), end: new Date(Date.UTC(p.year, 11, 31)) };
    case "quarter": {
      const startMonth = (p.quarter - 1) * 3;
      return { start: new Date(Date.UTC(p.year, startMonth, 1)), end: new Date(Date.UTC(p.year, startMonth + 3, 0)) };
    }
    case "month":
      return { start: new Date(Date.UTC(p.year, p.month - 1, 1)), end: new Date(Date.UTC(p.year, p.month, 0)) };
    case "week": {
      // montag der iso-woche p.week finden: erst montag von woche 1
      // bestimmen (die woche, die den 4. januar enthält), dann (week-1)*7
      // tage weiterzählen.
      const jan4 = new Date(Date.UTC(p.year, 0, 4));
      const jan4DayNum = (jan4.getUTCDay() + 6) % 7; // 0 = montag
      const week1Monday = new Date(jan4);
      week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum);
      const start = new Date(week1Monday);
      start.setUTCDate(week1Monday.getUTCDate() + (p.week - 1) * 7);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      return { start, end };
    }
    default:
      return null;
  }
}

// konsistenz eines habits im zeitraum eines ziels: anteil der tage mit
// einem erledigten HabitLog, gemessen an den tagen, die im zeitraum
// bereits VERGANGEN sind (nicht an der vollen zeitraum-länge) — sonst
// stünde ein habit am 1. tag eines monats automatisch bei 0%, obwohl
// noch gar keine gelegenheit zum verfehlen bestand.
function habitConsistency(habit, goal) {
  const range = periodRange(goal);
  if (!range) return 0;
  const today = new Date(todayISO() + "T00:00:00Z");
  if (today < range.start) return 0; // zeitraum hat noch nicht begonnen
  const lastCountedDay = today < range.end ? today : range.end;
  const elapsedDays = Math.round((lastCountedDay - range.start) / 86400000) + 1;
  const doneDays = HabitLogs.all().filter((l) => {
    if (l.habitId !== habit.id || !l.done) return false;
    const d = new Date(l.date + "T00:00:00Z");
    return d >= range.start && d <= lastCountedDay;
  }).length;
  return Math.round((doneDays / elapsedDays) * 100);
}

// fortschritt aus den direkt an ein ziel verlinkten tasks/habits (nicht
// aus unterzielen) — anteil erledigter tasks, gewichtetes mittel mit der
// durchschnittlichen habit-konsistenz, falls beides vorhanden ist.
// gibt null zurück, wenn weder tasks noch habits verlinkt sind.
function ownLinkedProgress(goal) {
  const linkedTasks = tasksOf(goal.id);
  const linkedHabits = habitsOf(goal.id);
  if (linkedTasks.length === 0 && linkedHabits.length === 0) return null;

  const taskProgress = linkedTasks.length
    ? (linkedTasks.filter((t) => t.done).length / linkedTasks.length) * 100
    : null;
  const habitProgress = linkedHabits.length
    ? linkedHabits.reduce((acc, h) => acc + habitConsistency(h, goal), 0) / linkedHabits.length
    : null;

  if (taskProgress !== null && habitProgress !== null) {
    return taskProgress * TASK_HABIT_WEIGHT + habitProgress * (1 - TASK_HABIT_WEIGHT);
  }
  return taskProgress !== null ? taskProgress : habitProgress;
}

// kernalgorithmus: effektiver fortschritt eines ziels.
// - hat es unterziele, ist eine komponente der durchschnitt der
//   unterziele (rekursiv) — das ist die eigentliche ableitung.
// - zusätzlich (nicht anstelle davon) fließen eigene, direkt an dieses
//   ziel verlinkte tasks/habits als zweite komponente ein, falls
//   vorhanden — gewichtetes mittel aus beiden komponenten.
// - hat das ziel keine unterziele, sind die eigenen verlinkten
//   tasks/habits die alleinige datengrundlage.
// - hat es weder unterziele noch verlinkte tasks/habits, zählt der
//   manuell gesetzte fortschritt.
export function effectiveProgress(goal, seen = new Set()) {
  if (!goal) return 0;
  if (seen.has(goal.id)) return goal.manualProgress ?? 0; // schutz vor zirkulären referenzen
  seen.add(goal.id);

  const children = childrenOf(goal.id);
  const own = ownLinkedProgress(goal);

  if (children.length > 0) {
    const subgoalAvg = children.reduce((acc, c) => acc + effectiveProgress(c, seen), 0) / children.length;
    if (own !== null) {
      return Math.round(subgoalAvg * SUBGOALS_OWN_WEIGHT + own * (1 - SUBGOALS_OWN_WEIGHT));
    }
    return Math.round(subgoalAvg);
  }

  if (own !== null) return Math.round(own);

  return goal.manualProgress ?? 0;
}

export function isDerived(goal) {
  if (childrenOf(goal.id).length > 0) return true;
  if (ownLinkedProgress(goal) !== null) return true;
  return false;
}

export function periodLabel(goal) {
  const p = goal.period || {};
  switch (goal.level) {
    case "year":
      return `${p.year}`;
    case "quarter":
      return `Q${p.quarter} ${p.year}`;
    case "month": {
      const names = ["jan", "feb", "mär", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "dez"];
      return `${names[(p.month || 1) - 1]} ${p.year}`;
    }
    case "week":
      return `KW ${p.week} · ${p.year}`;
    default:
      return "";
  }
}

export function currentPeriodFor(level, refDateISO = todayISO()) {
  const d = new Date(refDateISO + "T00:00:00");
  const year = d.getFullYear();
  switch (level) {
    case "year":
      return { year };
    case "quarter":
      return { year, quarter: Math.ceil((d.getMonth() + 1) / 3) };
    case "month":
      return { year, month: d.getMonth() + 1 };
    case "week": {
      const { isoYear, week } = isoWeekOf(refDateISO);
      return { year: isoYear, week };
    }
    default:
      return {};
  }
}

export function goalsForLevel(level, areaId = null) {
  return Goals.all()
    .filter((g) => g.level === level && (!areaId || g.areaId === areaId))
    .sort((a, b) => (a.period.year - b.period.year) || ((a.period.quarter || a.period.month || a.period.week || 0) - (b.period.quarter || b.period.month || b.period.week || 0)));
}

export function possibleParents(level, areaId) {
  const parentLevel = PARENT_LEVEL[level];
  if (!parentLevel) return [];
  return goalsForLevel(parentLevel, areaId);
}

// weiche validierung (kein hard-block, siehe architecture.md §4.1):
// warnt, wenn für den zeitraum schon die konfigurierte anzahl aktiver
// wochen-/monatsziele im bereich erreicht ist.
export function softLimitWarning(level, areaId, period, settings) {
  if (level !== "week" && level !== "month") return null;
  const limit = level === "week" ? settings.weeklyGoalCount : settings.monthlyGoalCount;
  const existing = Goals.all().filter(
    (g) =>
      g.level === level &&
      g.areaId === areaId &&
      JSON.stringify(g.period) === JSON.stringify(period)
  );
  if (existing.length >= limit) {
    return `hinweis: für diesen zeitraum/bereich sind bereits ${existing.length} von ${limit} ${LEVEL_LABEL[level]}zielen angelegt. du kannst trotzdem weitermachen.`;
  }
  return null;
}

export function createGoal({ areaId, level, title, period, parentId }) {
  const goal = {
    id: uid("goal"),
    areaId,
    level,
    period,
    parentId: parentId || null,
    title: title.trim(),
    manualProgress: 0,
    // im web-prototyp legt markus ziele bisher immer selbst an — es gibt
    // noch keinen ki-vorschlags-flow (architecture.md §4.1 "ki entwirft
    // ebenen unter dem jahresziel" ist noch nicht angebunden).
    origin: "user_defined",
    createdAt: todayISO(),
  };
  return Goals.add(goal);
}

export function deleteGoalCascade(goalId) {
  // unterziele hängen aus (werden nicht mitgelöscht, aber "verwaisen"
  // sichtbar) — verlinkte tasks/habits verlieren die verknüpfung, bleiben aber.
  for (const child of childrenOf(goalId)) {
    Goals.update(child.id, { parentId: null });
  }
  for (const t of tasksOf(goalId)) {
    Tasks.update(t.id, { goalId: null });
  }
  for (const h of habitsOf(goalId)) {
    Habits.update(h.id, { goalId: null });
  }
  Goals.remove(goalId);
}
