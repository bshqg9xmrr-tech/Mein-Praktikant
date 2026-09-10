// goals.js — ziel-hierarchie: jahr -> quartal -> monat -> woche, und von
// dort über verlinkte tasks (tagesebene) bis ins tagesgeschäft.
// das ist die kernfunktion, die im ersten mockup gefehlt hat: hier wird
// tatsächlich abgeleitet (nicht nur angezeigt) — ein wochenziel speist
// sich aus seinen verlinkten tasks, ein monatsziel aus seinen
// wochenzielen, usw.

import { Goals, Tasks, uid, todayISO, isoWeekOf } from "./storage.js";

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

// kernalgorithmus: effektiver fortschritt eines ziels.
// - hat es unterziele (nächste ebene, die auf dieses ziel "einwirkt"),
//   ist sein fortschritt der durchschnitt der unterziele (rekursiv) —
//   das ist die eigentliche ableitung.
// - hat ein wochenziel keine unterziele, aber verlinkte tasks, ist sein
//   fortschritt der anteil erledigter tasks.
// - sonst zählt der manuell gesetzte fortschritt.
export function effectiveProgress(goal, seen = new Set()) {
  if (!goal) return 0;
  if (seen.has(goal.id)) return goal.manualProgress ?? 0; // schutz vor zirkulären referenzen
  seen.add(goal.id);

  const children = childrenOf(goal.id);
  if (children.length > 0) {
    const sum = children.reduce((acc, c) => acc + effectiveProgress(c, seen), 0);
    return Math.round(sum / children.length);
  }

  if (goal.level === "week") {
    const linked = tasksOf(goal.id);
    if (linked.length > 0) {
      const done = linked.filter((t) => t.done).length;
      return Math.round((done / linked.length) * 100);
    }
  }

  return goal.manualProgress ?? 0;
}

export function isDerived(goal) {
  if (childrenOf(goal.id).length > 0) return true;
  if (goal.level === "week" && tasksOf(goal.id).length > 0) return true;
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
    createdAt: todayISO(),
  };
  return Goals.add(goal);
}

export function deleteGoalCascade(goalId) {
  // unterziele hängen aus (werden nicht mitgelöscht, aber "verwaisen"
  // sichtbar) — verlinkte tasks verlieren die verknüpfung, bleiben aber.
  for (const child of childrenOf(goalId)) {
    Goals.update(child.id, { parentId: null });
  }
  for (const t of tasksOf(goalId)) {
    Tasks.update(t.id, { goalId: null });
  }
  Goals.remove(goalId);
}
