// dates.js — datums-/zeit-helfer. alle daten als lokales "YYYY-MM-DD",
// alle uhrzeiten intern als minuten seit mitternacht.

export const WEEKDAYS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
export const WEEKDAYS_SHORT = ["so", "mo", "di", "mi", "do", "fr", "sa"];
const MONTHS = ["jan", "feb", "mär", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "dez"];

const pad = (n) => String(n).padStart(2, "0");

export function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return iso(new Date());
}

export function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateISO, n) {
  const d = fromISO(dateISO);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function diffDays(aISO, bISO) {
  return Math.round((fromISO(bISO) - fromISO(aISO)) / 86400000);
}

export function weekday(dateISO) {
  return fromISO(dateISO).getDay();
}

/** montag der woche, in der dateISO liegt */
export function weekStart(dateISO) {
  const wd = weekday(dateISO);
  return addDays(dateISO, wd === 0 ? -6 : 1 - wd);
}

export function fmtDay(dateISO) {
  const d = fromISO(dateISO);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function fmtShort(dateISO) {
  const t = todayISO();
  if (dateISO === t) return "heute";
  if (dateISO === addDays(t, 1)) return "morgen";
  if (dateISO === addDays(t, -1)) return "gestern";
  const d = fromISO(dateISO);
  const delta = diffDays(t, dateISO);
  if (delta > 1 && delta < 7) return WEEKDAYS[d.getDay()];
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function toMin(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toHHMM(min) {
  const m = Math.max(0, Math.round(min));
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
}

export function nowMin() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function fmtDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/**
 * sucht in freiem text nach einer fälligkeit ("heute", "morgen", "bis freitag",
 * "12.10.", "nächste woche", "ende der woche"). gibt YYYY-MM-DD oder null zurück.
 */
export function parseDue(text, refISO = todayISO()) {
  const s = text.toLowerCase();
  if (/\bübermorgen\b/.test(s)) return addDays(refISO, 2);
  if (/\bmorgen\b/.test(s) && !/\bmorgen(s)?\s*(früh|meditation)\b/.test(s)) return addDays(refISO, 1);
  if (/\b(heute|asap|sofort|eilt)\b/.test(s)) return refISO;

  const dm = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);
  if (dm) {
    const ref = fromISO(refISO);
    let year = dm[3] ? Number(dm[3].length === 2 ? "20" + dm[3] : dm[3]) : ref.getFullYear();
    const cand = new Date(year, Number(dm[2]) - 1, Number(dm[1]));
    if (!dm[3] && cand < ref && diffDays(iso(cand), refISO) > 30) cand.setFullYear(year + 1);
    if (!isNaN(cand)) return iso(cand);
  }

  if (/\b(ende der woche|diese woche|bis wochenende)\b/.test(s)) {
    return addDays(weekStart(refISO), 4) >= refISO ? addDays(weekStart(refISO), 4) : addDays(refISO, 1);
  }
  if (/\bnächste[nr]? woche\b/.test(s)) return addDays(weekStart(refISO), 7);

  for (let i = 0; i < 7; i++) {
    const name = WEEKDAYS[i];
    const re = new RegExp(`\\b(bis |am |ab )?${name}\\b`);
    if (re.test(s)) {
      const cur = weekday(refISO);
      let delta = (i - cur + 7) % 7;
      if (delta === 0) delta = 7;
      return addDays(refISO, delta);
    }
  }
  return null;
}

/** "um 14 uhr", "14:30", "14.30 uhr" → minuten oder null */
export function parseTime(text) {
  const s = text.toLowerCase();
  // "14:30" oder "14.30 uhr" — aber nicht "08.10." (datum)
  let m = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/) || s.match(/\b([01]?\d|2[0-3])\.([0-5]\d)\s*uhr\b/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/\bum\s+([01]?\d|2[0-3])\s*(uhr)?\b/);
  if (m) return Number(m[1]) * 60;
  m = s.match(/\b([01]?\d|2[0-3])\s*uhr\b/);
  if (m) return Number(m[1]) * 60;
  return null;
}
