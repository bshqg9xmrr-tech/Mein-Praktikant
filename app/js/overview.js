// overview.js — fortschritts-dashboard, siehe context.md §3.7. alle
// zahlen sind echte, lokal berechnete werte (keine platzhalter).

import { Areas, Goals, Tasks, Habits, getSettings, todayISO, isoWeekOf } from "./storage.js";
import { effectiveProgress, currentPeriodFor } from "./goals.js";
import { currentStreak } from "./habits.js";
import { esc } from "./ui.js";

function dateOffset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function completionRateForRange(days) {
  const dates = Array.from({ length: days }, (_, i) => dateOffset(-i));
  const tasks = Tasks.all().filter((t) => dates.includes(t.date));
  if (!tasks.length) return null;
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
}

function last7DaysChart() {
  const days = Array.from({ length: 7 }, (_, i) => dateOffset(-6 + i));
  const counts = days.map((d) => Tasks.all().filter((t) => t.date === d && t.done).length);
  const max = Math.max(1, ...counts);
  const labels = days.map((d) => new Date(d + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short" }));
  return { days, counts, max, labels };
}

export function render() {
  const el = document.getElementById("view-overview");
  const settings = getSettings();
  const areas = Areas.all();
  const weekPeriod = currentPeriodFor("week");
  const monthPeriod = currentPeriodFor("month");
  const yearPeriod = currentPeriodFor("year");

  const weekGoals = Goals.all().filter((g) => g.level === "week" && JSON.stringify(g.period) === JSON.stringify(weekPeriod));
  const monthGoals = Goals.all().filter((g) => g.level === "month" && JSON.stringify(g.period) === JSON.stringify(monthPeriod));
  const weekGoalsDone = weekGoals.filter((g) => effectiveProgress(g) >= 100).length;
  const monthGoalsDone = monthGoals.filter((g) => effectiveProgress(g) >= 100).length;

  const weekTasks = Tasks.all().filter((t) => {
    const { isoYear, week } = isoWeekOf(t.date);
    return isoYear === weekPeriod.year && week === weekPeriod.week;
  });
  const weekTasksDone = weekTasks.filter((t) => t.done).length;

  const todayTasks = Tasks.all().filter((t) => t.date === todayISO());
  const todayScheduled = todayTasks.filter((t) => t.scheduledTime).length;

  const chart = last7DaysChart();

  const thisWeekRate = completionRateForRange(7);
  const prevWeekRate = (() => {
    const dates = Array.from({ length: 7 }, (_, i) => dateOffset(-7 - i));
    const tasks = Tasks.all().filter((t) => dates.includes(t.date));
    if (!tasks.length) return null;
    return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  })();

  let trendText = "leg ein paar tage aufgaben und ziele an, dann siehst du hier deinen trend.";
  if (thisWeekRate !== null && prevWeekRate !== null) {
    const diff = thisWeekRate - prevWeekRate;
    if (diff > 0) trendText = `deine erledigungsquote ist diese woche um ${diff} punkte gestiegen (${prevWeekRate}% → ${thisWeekRate}%).`;
    else if (diff < 0) trendText = `deine erledigungsquote ist diese woche um ${Math.abs(diff)} punkte gesunken (${prevWeekRate}% → ${thisWeekRate}%).`;
    else trendText = `deine erledigungsquote ist stabil bei ${thisWeekRate}%.`;
  } else if (thisWeekRate !== null) {
    trendText = `diese woche hast du ${thisWeekRate}% deiner aufgaben erledigt.`;
  }

  el.innerHTML = `
    <h1>deine fortschritte</h1>
    <p class="subtitle">KW ${weekPeriod.week} · ${weekPeriod.year}</p>

    <div class="stat-grid">
      <div class="stat-tile"><div class="num">${weekGoalsDone}/${Math.max(weekGoals.length, settings.weeklyGoalCount)}</div><div class="label">wochenziele erreicht</div></div>
      <div class="stat-tile"><div class="num">${weekTasksDone}/${weekTasks.length}</div><div class="label">todos diese woche</div></div>
      <div class="stat-tile"><div class="num">${monthGoalsDone}/${Math.max(monthGoals.length, settings.monthlyGoalCount)}</div><div class="label">monatsziele</div></div>
      <div class="stat-tile"><div class="num">${todayScheduled}/${todayTasks.length}</div><div class="label">heute eingeplant</div></div>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:12px;">jahresziele je bereich</div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${areas
          .map((a) => {
            const yearGoals = Goals.all().filter((g) => g.level === "year" && g.areaId === a.id && JSON.stringify(g.period) === JSON.stringify(yearPeriod));
            const progress = yearGoals.length ? Math.round(yearGoals.reduce((s, g) => s + effectiveProgress(g), 0) / yearGoals.length) : 0;
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:600; margin-bottom:5px;">
                  <span style="display:flex; align-items:center; gap:6px;"><span class="dot" style="background:${a.color}"></span>${esc(a.name)}</span>
                  <span style="color:var(--text-soft)">${yearGoals.length ? progress + "%" : "kein jahresziel"}</span>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${progress}%; background:${a.color};"></div></div>
              </div>`;
          })
          .join("")}
      </div>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:12px;">erledigte todos · letzte 7 tage</div>
      <div style="display:flex; align-items:flex-end; gap:8px; height:70px;">
        ${chart.counts
          .map(
            (c, i) => `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;">
              <div style="width:100%; height:${Math.max(4, (c / chart.max) * 60)}px; border-radius:6px; background:${i === chart.counts.length - 1 ? "var(--accent)" : "var(--accent-soft)"};"></div>
              <span style="font-size:9.5px; color:var(--text-faint);">${chart.labels[i]}</span>
            </div>`
          )
          .join("")}
      </div>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:12px;">habit-streaks</div>
      ${
        Habits.all().length
          ? `<div style="display:flex; gap:14px; overflow-x:auto;">
              ${Habits.all()
                .map(
                  (h) => `<div style="display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0;">
                    <div style="width:44px; height:44px; border-radius:14px; background:var(--accent-soft); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--accent);">${currentStreak(h.id)}</div>
                    <span style="font-size:9.5px; color:var(--text-faint); text-align:center; max-width:60px;">${esc(h.name)}</span>
                  </div>`
                )
                .join("")}
            </div>`
          : `<div class="empty-hint" style="padding:6px 0;">noch keine habits angelegt.</div>`
      }
    </div>

    <div class="coach-card" style="background:linear-gradient(155deg, rgba(82,96,242,0.12), rgba(82,96,242,0.03)); border-color: rgba(82,96,242,0.18);">
      <div style="font-weight:700; font-size:13px; margin-bottom:8px;">dein trend</div>
      <div style="font-size:12.5px; line-height:1.5;">${esc(trendText)}</div>
    </div>
  `;
}
