// storage.js — lokale "datenbank" auf localStorage-basis.
// steht in dieser web-version für die geplante lokale SwiftData-schicht
// aus architecture.md §6 (v1 = rein lokal, single-user).

const DB_KEY = "mein-praktikant-db-v1";

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// iso-kalenderwoche (montag-basiert) — standardalgorithmus.
export function isoWeekOf(dateISO) {
  const date = new Date(dateISO + "T00:00:00");
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
  return { isoYear: d.getUTCFullYear(), week };
}

function seedData() {
  const now = todayISO();
  const areas = [
    { id: "area_privat", name: "privat", color: "#f2895f", order: 0 },
    { id: "area_plenum", name: "plenum", color: "#2fa8a0", order: 1 },
    { id: "area_tecis", name: "tecis", color: "#8b6fe8", order: 2 },
    { id: "area_sonstige", name: "sonstige", color: "#8891a8", order: 3 },
  ];

  const year = new Date().getFullYear();
  const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const month = new Date().getMonth() + 1;
  const { week } = isoWeekOf(now);

  // die kette jahr -> quartal -> monat -> woche zeigt echte ableitung:
  // jede ebene übernimmt automatisch den durchschnitt ihrer unterziele
  // (siehe js/goals.js#effectiveProgress) — nur die untersten, "blatt"-
  // ziele (bzw. deren verlinkte tasks) tragen manuell gesetzte werte.
  const gYear = { id: "goal_year_tecis", areaId: "area_tecis", level: "year", period: { year }, parentId: null, title: "neukunden-portfolio tecis ausbauen", manualProgress: 0, createdAt: now };
  const gQuarter = { id: "goal_quarter_tecis", areaId: "area_tecis", level: "quarter", period: { year, quarter }, parentId: gYear.id, title: "pipeline auf 12 aktive leads bringen", manualProgress: 0, createdAt: now };
  const gMonth = { id: "goal_month_tecis", areaId: "area_tecis", level: "month", period: { year, month }, parentId: gQuarter.id, title: "akquise-workshop halten", manualProgress: 0, createdAt: now };
  const gWeekPitch = { id: "goal_week_pitch", areaId: "area_tecis", level: "week", period: { year, week }, parentId: gMonth.id, title: "tecis-pitch fertig vorbereiten", manualProgress: 100, createdAt: now };
  const gWeekCalls = { id: "goal_week_calls", areaId: "area_tecis", level: "week", period: { year, week }, parentId: gMonth.id, title: "akquise-telefonate führen", manualProgress: 20, createdAt: now };
  const gWeek2 = { id: "goal_week_privat", areaId: "area_privat", level: "week", period: { year, week }, parentId: null, title: "3x sport diese woche schaffen", manualProgress: 60, createdAt: now };

  const goals = [gYear, gQuarter, gMonth, gWeekPitch, gWeekCalls, gWeek2];

  const tasks = [
    { id: uid("task"), title: "kundentermin vorbereiten", date: now, areaId: "area_tecis", goalId: null, scheduledTime: null, estimatedMinutes: 45, done: false, createdAt: now },
    { id: uid("task"), title: "wochenbericht schreiben", date: now, areaId: "area_plenum", goalId: null, scheduledTime: null, estimatedMinutes: 60, done: false, createdAt: now },
    { id: uid("task"), title: "rechnungen sortieren", date: now, areaId: "area_sonstige", goalId: null, scheduledTime: null, estimatedMinutes: 30, done: false, createdAt: now },
    { id: uid("task"), title: "laufen, 30 min", date: now, areaId: "area_privat", goalId: gWeek2.id, scheduledTime: "08:30", estimatedMinutes: 30, done: true, createdAt: now },
  ];

  const habits = [
    { id: "habit_dusche", name: "kalt duschen", areaId: null, createdAt: now },
    { id: "habit_meditation", name: "meditieren", areaId: null, createdAt: now },
    { id: "habit_sport", name: "sport", areaId: "area_privat", createdAt: now },
    { id: "habit_stretch", name: "stretching", areaId: null, createdAt: now },
  ];

  return {
    areas,
    goals,
    tasks,
    notes: [],
    journalEntries: [],
    habits,
    habitLogs: [],
    settings: {
      weeklyGoalCount: 2,
      monthlyGoalCount: 3,
      weekStart: "mon",
      dayStartHour: 9,
      defaultTaskMinutes: 30,
      breakMinutes: 10,
      calendarAutoExport: false,
      feedbackEmail: "feedback@example.com",
      theme: "light",
    },
  };
}

let db = null;
const saveListeners = [];
const changeListeners = [];

// wird von cloud.js aufgerufen, um über jede lokale änderung informiert zu
// werden (für den debounced cloud-sync-push) — storage.js selbst weiß nichts
// von supabase, bleibt so unabhängig nutzbar (offline-first, siehe claude.md §3.1).
export function onSave(cb) {
  saveListeners.push(cb);
}

// wird aufgerufen, wenn sich die view neu rendern soll, weil daten von
// "außen" kamen (z. b. ein cloud-pull hat replaceAll() aufgerufen).
export function onExternalChange(cb) {
  changeListeners.push(cb);
}

export function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    db = raw ? JSON.parse(raw) : seedData();
  } catch (e) {
    console.warn("mein-praktikant: konnte gespeicherte daten nicht lesen, starte neu.", e);
    db = seedData();
  }
  // rückwärtskompatibel: fehlende collections/felder ergänzen
  db.areas ??= [];
  db.goals ??= [];
  db.tasks ??= [];
  db.notes ??= [];
  db.journalEntries ??= [];
  db.habits ??= [];
  db.habitLogs ??= [];
  db.settings ??= seedData().settings;
  save();
  return db;
}

export function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  saveListeners.forEach((cb) => cb(db));
}

export function resetAll() {
  db = seedData();
  save();
  return db;
}

export function replaceAll(newDb, { silent = false } = {}) {
  db = newDb;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  if (!silent) saveListeners.forEach((cb) => cb(db));
  changeListeners.forEach((cb) => cb(db));
  return db;
}

// generische CRUD-helfer pro collection
function collection(name) {
  return {
    all: () => load()[name],
    get: (id) => load()[name].find((x) => x.id === id) || null,
    add: (item) => {
      load()[name].push(item);
      save();
      return item;
    },
    update: (id, patch) => {
      const list = load()[name];
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      save();
      return list[idx];
    },
    remove: (id) => {
      const list = load()[name];
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      save();
      return true;
    },
  };
}

export const Areas = collection("areas");
export const Goals = collection("goals");
export const Tasks = collection("tasks");
export const Notes = collection("notes");
export const JournalEntries = collection("journalEntries");
export const Habits = collection("habits");
export const HabitLogs = collection("habitLogs");

export function getSettings() {
  return load().settings;
}
export function updateSettings(patch) {
  load().settings = { ...load().settings, ...patch };
  save();
  return load().settings;
}
