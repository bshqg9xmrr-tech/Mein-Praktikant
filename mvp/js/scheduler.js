// scheduler.js — adhs-gerechte tagesplanung (regelbasiert, nachvollziehbar).
//
// regeln (siehe anforderungen-v2.md f3):
//  1. bestehende termine werden nie überschrieben, puffer davor/danach
//  2. feste mittagspause + pause nach jedem fokus-/kreativ-block
//  3. geschäftliches in die kernzeit, privates danach
//  4. aufgabe passt zum energie-fenster (fokus → fokus-zeit usw.)
//  5. max. n haupt-slots, rest als "falls noch zeit" ohne slot
//  6. ein hauptfokus: dringendstes bzw. am längsten aufgeschobenes
//  7. bewegung: bei offenem sportziel ein slot, draußen wenn trocken
// jeder slot trägt ein "warum", damit der plan keine black box ist.

import { toMin, toHHMM, nowMin, todayISO, diffDays, weekday } from "./dates.js";
import { isOutdoorHour } from "./weather.js";

const PREF = {
  fokus: { fokus: 0, kreativ: 20, routine: 35 },
  kreativ: { kreativ: 0, fokus: 20, routine: 35 },
  routine: { routine: 0, kreativ: 25, fokus: 30 },
  kommunikation: { routine: 0, kreativ: 20, fokus: 30 },
  bewegung: { erholung: 0, routine: 5, kreativ: 10, fokus: 25 },
};

const MODE_REASON = {
  fokus: "fokus-fenster laut deinem energieprofil",
  kreativ: "kreativ-fenster laut deinem energieprofil",
  routine: "routine-fenster — gut für kleinkram",
  erholung: "erholungs-fenster",
};

export function scoreTask(t, dateISO, profile) {
  let s = 0;
  const why = [];
  if (t.urgency === "heute") (s += 100), why.push("dringend");
  else if (t.urgency === "woche") s += 30;
  else s += 5;
  if (t.due) {
    const d = diffDays(dateISO, t.due);
    if (d < 0) (s += 90), why.push("überfällig");
    else if (d === 0) (s += 80), why.push("fällig heute");
    else if (d === 1) (s += 50), why.push("fällig morgen");
    else if (d <= 3) s += 30;
    else if (d <= 7) s += 15;
  }
  if (t.carried) (s += Math.min(60, t.carried * 20)), why.push(t.carried === 1 ? "von gestern übernommen" : `schon ${t.carried}× verschoben`);
  if (t.goalId) (s += 10), why.push("zahlt auf ein jahresziel ein");
  const theme = (profile.themes?.[weekday(dateISO)] || "").toLowerCase();
  if (theme) {
    const title = t.title.toLowerCase();
    const words = theme.split(/[\s\-\/]+/).filter((w) => w.length >= 4);
    const orga = theme.includes("orga") && (t.kind === "admin" || t.energy === "routine");
    const social = theme.includes("social") && (t.energy === "kreativ" || /content|reel|post|instagram|linkedin/.test(title));
    if (orga || social || words.some((w) => title.includes(w.replace(/-tag$/, "")))) (s += 15), why.push(`passt zum ${theme}-tag`);
  }
  if (t.kind === "admin" && t.meta?.amount) s += 5;
  return { score: s, why };
}

function freeIntervals(dateISO, profile, dayEvents) {
  let start = toMin(profile.dayStart);
  const end = toMin(profile.dayEnd);
  if (dateISO === todayISO()) start = Math.max(start, Math.ceil((nowMin() + 5) / 15) * 15);
  const blocked = [];
  const fixed = [];
  for (const e of dayEvents) {
    if (e.allDay) continue;
    const s = toMin(e.start);
    const en = Math.max(toMin(e.end), s + 15);
    blocked.push([s - profile.bufferMinutes, en + profile.bufferMinutes]);
  }
  const ls = toMin(profile.lunchStart);
  const le = ls + Number(profile.lunchMinutes || 0);
  if (profile.lunchMinutes > 0 && le > start && ls < end) {
    blocked.push([ls, le]);
    fixed.push({ kind: "lunch", start: ls, end: le, title: "mittagspause", reason: "feste erholung — nichts reinplanen" });
  }
  blocked.sort((a, b) => a[0] - b[0]);
  const free = [];
  let cur = start;
  for (const [bs, be] of blocked) {
    if (bs > cur) free.push([cur, Math.min(bs, end)]);
    cur = Math.max(cur, be);
    if (cur >= end) break;
  }
  if (cur < end) free.push([cur, end]);
  return { free: free.filter(([a, b]) => b - a >= 15), fixed };
}

function segmentsFor(free, dateISO, profile) {
  const isWorkday = profile.workDays.includes(weekday(dateISO));
  const ws = toMin(profile.workStart);
  const we = toMin(profile.workEnd);
  const segs = [];
  for (const [a, b] of free) {
    let t = a;
    while (t < b) {
      const hour = Math.floor(t / 60);
      const mode = profile.energyHours[hour] || "erholung";
      const work = isWorkday && t >= ws && t < we;
      let next = Math.min(b, (hour + 1) * 60);
      if (isWorkday && t < ws && next > ws) next = ws;
      if (isWorkday && t < we && next > we) next = we;
      const last = segs[segs.length - 1];
      if (last && last.end === t && last.mode === mode && last.work === work) last.end = next;
      else segs.push({ start: t, end: next, mode, work });
      t = next;
    }
  }
  return segs;
}

function occupy(segs, start, end) {
  const out = [];
  for (const s of segs) {
    if (end <= s.start || start >= s.end) out.push(s);
    else {
      if (s.start < start) out.push({ ...s, end: start });
      if (s.end > end) out.push({ ...s, start: end });
    }
  }
  return out.filter((s) => s.end - s.start >= 10);
}

/** findet den besten platz für eine dauer, gibt {start, seg, penalty, notes} oder null */
function findSlot(segs, task, minutes, { isWorkday, weatherDay, allowPrivateInWork }) {
  let best = null;
  const prefs = PREF[task.energy] || PREF.routine;
  // aufeinanderfolgende segmente gleichen arbeits-status zusammenfassen, damit
  // ein 60-min-block z.b. 10:30–11:30 über eine stundengrenze passt
  const runs = [];
  for (const s of [...segs].sort((a, b) => a.start - b.start)) {
    const last = runs[runs.length - 1];
    if (last && last.end === s.start && last.work === s.work) {
      last.end = s.end;
      last.parts.push(s);
    } else runs.push({ start: s.start, end: s.end, work: s.work, parts: [s] });
  }
  for (const run of runs) {
    if (run.end - run.start < minutes) continue;
    let ctxPenalty = 0;
    const notes = [];
    if (isWorkday) {
      if (task.context === "geschaeftlich" && !run.work) continue;
      if (task.context === "privat" && run.work) {
        if (task.energy === "bewegung" || !allowPrivateInWork) continue;
        ctxPenalty = 60;
        notes.push("nach feierabend ist kein platz mehr");
      }
    }
    for (let st = run.start; st + minutes <= run.end; st += 15) {
      const modes = run.parts.filter((p) => p.end > st && p.start < st + minutes).map((p) => p.mode);
      let penalty = ctxPenalty;
      let ok = true;
      for (const m of modes) {
        if (m === "erholung" && task.energy !== "bewegung") ok = false;
        else penalty += prefs[m] ?? 40;
      }
      if (!ok) continue;
      penalty = penalty / modes.length;
      if (task.energy === "bewegung" && weatherDay) {
        const outdoor = isOutdoorHour(weatherDay, Math.floor(st / 60));
        if (outdoor === false) penalty += 15;
        if (outdoor === true) penalty -= 10;
      }
      penalty += st / 600; // leichte bevorzugung früherer slots
      if (!best || penalty < best.penalty) best = { start: st, mode: modes[0], penalty, notes: [...notes] };
    }
  }
  return best;
}

/**
 * kleine kommunikations-/routine-aufgaben (≤ 20 min) werden je kontext zu
 * einem block von max. 60 min gebündelt — ein slot statt vier, damit die
 * großen dinge platz im plan behalten.
 */
function bundleSmallTasks(scored) {
  const isSmall = (x) => x.t.minutes <= 20 && ["kommunikation", "routine"].includes(x.t.energy) && x.t.meta?.time == null;
  const out = [];
  const used = new Set();
  for (const ctx of ["geschaeftlich", "privat"]) {
    const group = scored.filter((x) => isSmall(x) && x.t.context === ctx);
    if (group.length < 2) continue;
    const members = [];
    let total = 0;
    for (const x of group) {
      if (total + x.t.minutes > 60) break;
      members.push(x);
      total += x.t.minutes;
    }
    if (members.length < 2) continue;
    members.forEach((m) => used.add(m.t.id));
    const top = members[0];
    out.push({
      t: { id: `batch-${ctx}`, title: `kleinkram-block ${ctx === "privat" ? "privat" : "geschäftlich"} (${members.length} punkte)`, energy: "routine", context: ctx, minutes: Math.ceil(total / 15) * 15, urgency: top.t.urgency, meta: {} },
      score: top.score,
      why: [...new Set(members.flatMap((m) => m.why))].slice(0, 2),
      members,
    });
  }
  return [...out, ...scored.filter((x) => !used.has(x.t.id))].sort((a, b) => b.score - a.score);
}

/**
 * baut den tagesplan.
 * @returns {{slots:Array, focusId:string|null, focusWhy:string[], maybe:Array, later:Array, notes:string[]}}
 */
export function buildPlan({ dateISO, profile, dayEvents, tasks, weatherDay, sport }) {
  const isWorkday = profile.workDays.includes(weekday(dateISO));
  const { free, fixed } = freeIntervals(dateISO, profile, dayEvents);
  let segs = segmentsFor(free, dateISO, profile);
  const notes = [];
  const slots = [
    ...dayEvents.map((e) => ({ kind: "event", start: e.allDay ? 0 : toMin(e.start), end: e.allDay ? 0 : toMin(e.end), title: e.title, context: e.context, allDay: !!e.allDay, eventId: e.id, reason: "bestehender termin — bleibt, wie er ist" })),
    ...fixed,
  ];

  let scored = tasks
    .filter((t) => t.status === "open")
    .map((t) => ({ t, ...scoreTask(t, dateISO, profile) }))
    .sort((a, b) => b.score - a.score);
  scored = bundleSmallTasks(scored);

  const placed = [];
  const leftover = [];
  const maxSlots = Math.max(1, Number(profile.maxMainSlots) || 4);

  for (const item of scored) {
    const t = item.t;
    if (placed.length >= maxSlots) {
      leftover.push(item);
      continue;
    }
    const chunk = Math.min(t.minutes, profile.focusMaxMinutes);
    const parts = Math.ceil(t.minutes / profile.focusMaxMinutes);
    let slot = null;
    // feste uhrzeit aus der nachricht ("um 14 uhr") respektieren, wenn heute fällig
    if (t.meta?.time != null && (!t.due || t.due === dateISO)) {
      const st = t.meta.time;
      const fits = segs.some((s) => s.start <= st && s.end >= st + chunk);
      if (fits) slot = { start: st, mode: segs.find((s) => s.start <= st && s.end > st).mode, penalty: 0, notes: ["genannte uhrzeit"] };
    }
    if (!slot) {
      // volle länge vs. kürzerer erster teil im passenden energie-fenster:
      // lieber 60 min fokus in der fokus-zeit als 90 min fokus in der routine-zeit
      const opts = { isWorkday, weatherDay, allowPrivateInWork: t.urgency === "heute" };
      const durations = [chunk, 60, 45, 30].filter((d, i, a) => d <= chunk && a.indexOf(d) === i);
      for (const d of durations) {
        const cand = findSlot(segs, t, d, opts);
        if (!cand) continue;
        cand.minutes = d;
        cand.penalty += (chunk - d) / 3;
        if (!slot || cand.penalty < slot.penalty) slot = cand;
      }
    }
    if (!slot) {
      leftover.push({ ...item, noRoom: true });
      continue;
    }
    const minutes = slot.minutes || chunk;
    const reason = [...item.why];
    if (slot.notes.length) reason.push(...slot.notes);
    else if (slot.mode) reason.push(MODE_REASON[slot.mode]);
    if (isWorkday && t.context === "geschaeftlich") reason.push("geschäftlich → kernzeit");
    if (isWorkday && t.context === "privat" && !slot.notes.length) reason.push("privat → außerhalb der kernzeit");
    if (item.members) {
      slots.push({ kind: "batch", start: slot.start, end: slot.start + minutes, title: t.title, energy: "routine", context: t.context, items: item.members.map((m) => ({ taskId: m.t.id, title: m.t.title })), reason: ["kleinkram gebündelt statt über den tag verstreut", ...reason].join(" · ") });
    } else {
      slots.push({ kind: "task", start: slot.start, end: slot.start + minutes, title: t.title, taskId: t.id, energy: t.energy, context: t.context, part: parts > 1 || minutes < t.minutes ? `teil 1 · ${minutes} von ${t.minutes} min` : null, reason: reason.join(" · ") });
    }
    placed.push(item);
    segs = occupy(segs, slot.start - 0, slot.start + minutes);
    if ((t.energy === "fokus" || t.energy === "kreativ") && minutes >= 45 && profile.breakAfterFocus > 0) {
      const ps = slot.start + minutes;
      slots.push({ kind: "pause", start: ps, end: ps + profile.breakAfterFocus, title: "kurze pause", reason: `nach ${minutes} min ${t.energy} — kopf lüften, wasser trinken` });
      segs = occupy(segs, ps, ps + profile.breakAfterFocus);
    }
  }

  // hauptfokus: wichtigste "echte" aufgabe (kein kleinkram-block), die heute
  // auch wirklich einen slot hat — sonst die wichtigste überhaupt
  const focus = placed.find((p) => !p.members) || scored.find((p) => !p.members) || null;

  // bewegung / sportziel
  if (sport && sport.needed) {
    const pseudo = { energy: "bewegung", context: "privat", title: sport.title };
    const slot = findSlot(segs, pseudo, sport.minutes, { isWorkday, weatherDay, allowPrivateInWork: false });
    if (slot) {
      const outdoor = weatherDay ? isOutdoorHour(weatherDay, Math.floor(slot.start / 60)) : null;
      const where = outdoor === true ? "draußen (trocken)" : outdoor === false ? "drinnen (regen/kalt)" : "wetter unbekannt";
      slots.push({ kind: "sport", start: slot.start, end: slot.start + sport.minutes, title: sport.title, habitId: sport.habitId, reason: `sportziel: ${sport.done} von ${sport.target} diese woche · ${where} · vorschlag, kein muss` });
      segs = occupy(segs, slot.start, slot.start + sport.minutes);
    }
  }

  // wetter-hinweis für die mittagspause
  const lunch = slots.find((s) => s.kind === "lunch");
  if (lunch && weatherDay && isOutdoorHour(weatherDay, Math.floor(lunch.start / 60))) {
    lunch.reason = "feste erholung · trocken draußen → 15 min an die luft";
  }

  if (!scored.length) notes.push("keine offenen aufgaben — eingang leer oder alles erledigt.");
  if (leftover.some((l) => l.noRoom && l.t.urgency === "heute")) notes.push("nicht alles dringende passt heute rein — siehe 'falls noch zeit'.");

  slots.sort((a, b) => a.start - b.start);
  const flat = leftover.flatMap((l) => (l.members ? l.members : [l]));
  const maybe = flat.slice(0, 3).map((l) => l.t.id);
  const later = flat.slice(3).map((l) => l.t.id);
  return {
    slots: slots.map((s) => ({ ...s, startHM: toHHMM(s.start), endHM: toHHMM(s.end) })),
    focusId: focus ? focus.t.id : null,
    focusWhy: focus ? focus.why : [],
    maybe,
    later,
    notes,
  };
}

/** zwei freie zeitfenster für eine terminanfrage (antwort-vorlage) */
export function suggestMeetingSlots({ fromISO, profile, eventsByDate, context, minutes = 60, count = 2 }) {
  const out = [];
  for (let i = 1; i <= 10 && out.length < count; i++) {
    const d = new Date(fromISO + "T00:00:00");
    d.setDate(d.getDate() + i);
    const dateISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const wd = d.getDay();
    const isWorkday = profile.workDays.includes(wd);
    if (context === "geschaeftlich" && !isWorkday) continue;
    const dayEvents = eventsByDate(dateISO);
    let windowStart, windowEnd;
    if (context === "geschaeftlich") [windowStart, windowEnd] = [toMin(profile.workStart), toMin(profile.workEnd)];
    else if (isWorkday) [windowStart, windowEnd] = [Math.max(toMin(profile.workEnd), 16 * 60) + 30, toMin(profile.dayEnd)];
    else [windowStart, windowEnd] = [10 * 60, 19 * 60];
    const busy = dayEvents.filter((e) => !e.allDay).map((e) => [toMin(e.start) - 30, toMin(e.end) + 30]);
    const ls = toMin(profile.lunchStart);
    busy.push([ls, ls + Number(profile.lunchMinutes || 0)]);
    for (let st = Math.ceil(windowStart / 30) * 30; st + minutes <= windowEnd; st += 30) {
      if (busy.some(([a, b]) => st < b && st + minutes > a)) continue;
      // bevorzugt vormittags (geschäftlich) — mittags-slot vermeiden
      out.push({ date: dateISO, start: st });
      break;
    }
  }
  return out;
}
