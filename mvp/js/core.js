// core.js — app-weite abläufe: übernahme von gestern, plan bauen,
// eingang bestätigen, diktat, abend-erinnerung.

import { db, save, tasks, events, habits } from "./db.js";
import { todayISO, nowMin, toMin, weekday } from "./dates.js";
import { buildPlan } from "./scheduler.js";
import { habitWeekCount } from "./progress.js";
import { getWeather } from "./weather.js";

/** beim öffnen: alles, was für einen vergangenen tag geplant und offen ist, wandert nach heute */
export function rollover() {
  const today = todayISO();
  let moved = 0;
  for (const t of db().tasks) {
    if (t.status === "open" && t.plannedDate && t.plannedDate < today) {
      t.carried = (t.carried || 0) + 1;
      t.carriedFrom = t.plannedDate;
      t.plannedDate = null;
      t.plannedStart = null;
      moved++;
    }
  }
  db().lastOpen = today;
  if (moved) save();
  return moved;
}

export function sportInfo(dateISO) {
  const p = db().profile;
  const h = db().habits.find((x) => x.isSport);
  if (!h) return null;
  const done = habitWeekCount(h.id, dateISO);
  const today = db().habitLog[dateISO]?.[h.id] || 0;
  const target = Number(p.sportTargetPerWeek) || h.perWeek;
  return { habitId: h.id, title: h.title || "sport", done, target, needed: today === 0 && done < target, minutes: h.minutes || 60 };
}

let weatherCache = null;
export async function loadWeather(force = false) {
  if (weatherCache && !force) return weatherCache;
  weatherCache = await getWeather(db().profile.weather);
  return weatherCache;
}
export function cachedWeather() {
  return weatherCache;
}

/** plan für einen tag (neu) bauen und als aktiven plan übernehmen */
export function makePlan(dateISO = todayISO()) {
  const weatherDay = weatherCache?.byDate?.[dateISO] || null;
  const old = db().plans[dateISO];
  // erledigte slots des alten plans bleiben als tages-historie erhalten
  const keep = (old?.slots || []).filter((s) => (s.kind === "task" && tasks.get(s.taskId)?.status === "done") || (s.kind === "batch" && s.items.every((it) => tasks.get(it.taskId)?.status === "done")));
  // offene aufgaben dieses tages zurücksetzen, der planer verteilt neu
  for (const t of db().tasks) if (t.status === "open" && t.plannedDate === dateISO) Object.assign(t, { plannedDate: null, plannedStart: null });

  const plan = buildPlan({
    dateISO,
    profile: db().profile,
    dayEvents: events.forDay(dateISO),
    tasks: db().tasks,
    weatherDay,
    sport: sportInfo(dateISO),
  });
  for (const s of plan.slots) {
    if (s.kind === "task") tasks.update(s.taskId, { plannedDate: dateISO, plannedStart: s.startHM });
    if (s.kind === "batch") s.items.forEach((it) => tasks.update(it.taskId, { plannedDate: dateISO, plannedStart: s.startHM }));
  }
  const keptIds = new Set(plan.slots.flatMap((s) => (s.items ? s.items.map((i) => i.taskId) : [s.taskId])).filter(Boolean));
  plan.slots = [...plan.slots, ...keep.filter((s) => !(s.items ? s.items.some((i) => keptIds.has(i.taskId)) : keptIds.has(s.taskId)))].sort((a, b) => a.start - b.start);
  plan.at = new Date().toISOString();
  plan.openCountAtPlan = db().tasks.filter((t) => t.status === "open").length;
  db().plans[dateISO] = plan;
  save();
  return plan;
}

export function planIsStale(dateISO = todayISO()) {
  const plan = db().plans[dateISO];
  if (!plan) return true;
  return db().tasks.filter((t) => t.status === "open" && !t.plannedDate && t.acceptedAt && t.acceptedAt > plan.at).length;
}

/** aufgaben, die heute auf dem plan standen (für den abend-check-in) */
export function todaysPlannedTasks(dateISO = todayISO()) {
  const plan = db().plans[dateISO];
  const ids = new Set((plan?.slots || []).flatMap((s) => (s.kind === "task" ? [s.taskId] : s.kind === "batch" ? s.items.map((i) => i.taskId) : [])));
  for (const t of db().tasks) {
    if (t.plannedDate === dateISO) ids.add(t.id);
    if (t.status === "done" && (t.doneAt || "").slice(0, 10) === dateISO) ids.add(t.id);
  }
  (plan?.maybe || []).forEach((id) => ids.add(id));
  return [...ids].map((id) => tasks.get(id)).filter((t) => t && t.status !== "dropped");
}

export function acceptInbox(id, patch = {}) {
  const t = tasks.get(id);
  if (!t) return;
  Object.assign(t, patch);
  const map = { warten: "waiting", idee: "idea", info: "info" };
  t.status = map[t.kind] || "open";
  t.acceptedAt = new Date().toISOString();
  save();
}

export function setDone(id, done) {
  tasks.update(id, { status: done ? "done" : "open", doneAt: done ? new Date().toISOString() : null });
  save();
}

// ---------- diktat (Web Speech API) ----------

export function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * startet diktat; onText(text, final) wird laufend aufgerufen.
 * gibt eine stop-funktion zurück.
 */
export function startDictation(onText, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = "de-DE";
  rec.continuous = true;
  rec.interimResults = true;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript.trim() + ". ";
      else interim += r[0].transcript;
    }
    onText(finalText + interim, false);
  };
  rec.onerror = (e) => onEnd?.(e.error);
  rec.onend = () => onEnd?.(null, finalText.trim());
  rec.start();
  return () => rec.stop();
}

// ---------- abend-erinnerung ----------

export function checkinDue(dateISO = todayISO()) {
  return nowMin() >= toMin(db().profile.checkinTime) && !db().checkins[dateISO];
}

let notifiedFor = null;
export function startCheckinWatcher(onDue) {
  const tick = () => {
    const d = todayISO();
    if (checkinDue(d) && notifiedFor !== d) {
      notifiedFor = d;
      onDue();
      if (db().profile.notify && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("mein praktikant", { body: "2 minuten abend-check-in? was hat heute geklappt?", icon: "icons/icon-192.png" });
        } catch {}
      }
    }
  };
  tick();
  setInterval(tick, 60000);
}

export function isWorkday(dateISO) {
  return db().profile.workDays.includes(weekday(dateISO));
}
