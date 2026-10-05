// db.js — lokaler speicher (localStorage). eigener schlüssel, damit der
// neue prototyp die daten der v0.4-beta (app/) nicht anfasst.

const KEY = "mp2-db-v1";

export const ENERGY_MODES = {
  fokus: { label: "fokus", hint: "konzentriert abarbeiten", color: "#5260f2" },
  kreativ: { label: "kreativ", hint: "ideen, konzepte, content", color: "#c06bd8" },
  routine: { label: "routine", hint: "admin, mails, kleinkram", color: "#2fa8a0" },
  erholung: { label: "erholung", hint: "pause, nichts planen", color: "#9aa1b0" },
};

/** stündliches energie-profil 6–22 uhr, standard: morgens fokus, nachmittags kreativ */
export const ENERGY_PRESETS = {
  "morgens-fokus": {
    label: "morgens fokussiert, nachmittags kreativ",
    hours: { 6: "erholung", 7: "routine", 8: "routine", 9: "fokus", 10: "fokus", 11: "fokus", 12: "routine", 13: "erholung", 14: "routine", 15: "kreativ", 16: "kreativ", 17: "kreativ", 18: "routine", 19: "erholung", 20: "erholung", 21: "erholung" },
  },
  "morgens-kreativ": {
    label: "morgens kreativ, nachmittags abarbeiten",
    hours: { 6: "erholung", 7: "kreativ", 8: "kreativ", 9: "kreativ", 10: "fokus", 11: "fokus", 12: "routine", 13: "erholung", 14: "routine", 15: "routine", 16: "fokus", 17: "routine", 18: "erholung", 19: "erholung", 20: "erholung", 21: "erholung" },
  },
  "spaet-starter": {
    label: "spät-starter, abends am stärksten",
    hours: { 6: "erholung", 7: "erholung", 8: "routine", 9: "routine", 10: "routine", 11: "fokus", 12: "erholung", 13: "routine", 14: "fokus", 15: "fokus", 16: "kreativ", 17: "kreativ", 18: "erholung", 19: "kreativ", 20: "fokus", 21: "erholung" },
  },
};

export function defaultProfile() {
  return {
    name: "",
    workDays: [1, 2, 3, 4, 5],
    workStart: "09:00",
    workEnd: "16:00",
    dayStart: "08:00",
    dayEnd: "21:00",
    energyHours: { ...ENERGY_PRESETS["morgens-fokus"].hours },
    lunchStart: "12:30",
    lunchMinutes: 45,
    focusMaxMinutes: 90,
    breakAfterFocus: 15,
    bufferMinutes: 10,
    maxMainSlots: 4,
    themes: { 1: "orga", 3: "finanzberater-tag", 5: "social media" },
    sportTargetPerWeek: 4,
    weather: { enabled: true, place: "", lat: null, lon: null, outdoorWhenDry: true },
    checkinTime: "19:30",
    notify: false,
  };
}

function empty() {
  return {
    version: 1,
    onboarded: false,
    profile: defaultProfile(),
    tasks: [],
    events: [],
    goals: [],
    habits: [],
    habitLog: {}, // { "YYYY-MM-DD": { habitId: 1 | 0.5 | 0 } }
    checkins: {}, // { "YYYY-MM-DD": { mood, fit, summary, at } }
    plans: {}, // { "YYYY-MM-DD": { slots, focusId, laterIds, at } }
    lastOpen: null,
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    const base = empty();
    return { ...base, ...data, profile: { ...base.profile, ...(data.profile || {}) } };
  } catch {
    return empty();
  }
}

export function db() {
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("speichern fehlgeschlagen", e);
  }
  listeners.forEach((fn) => fn());
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function replaceAll(next) {
  const base = empty();
  state = { ...base, ...next, profile: { ...base.profile, ...(next.profile || {}) } };
  save();
}

export function resetAll() {
  state = empty();
  save();
}

export function uid(prefix = "x") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- kleine zugriffs-helfer ----------

export const tasks = {
  all: () => state.tasks,
  get: (id) => state.tasks.find((t) => t.id === id),
  add(t) {
    const task = {
      id: uid("t"),
      title: "",
      source: "notiz",
      from: "",
      context: "privat",
      kind: "todo",
      urgency: "woche",
      energy: "routine",
      minutes: 20,
      due: null,
      goalId: null,
      status: "inbox", // inbox | open | done | dropped | waiting | idea | info
      plannedDate: null,
      plannedStart: null,
      carried: 0,
      carriedFrom: null,
      firstStep: "",
      meta: {},
      createdAt: new Date().toISOString(),
      doneAt: null,
      ...t,
    };
    state.tasks.push(task);
    return task;
  },
  update(id, patch) {
    const t = tasks.get(id);
    if (t) Object.assign(t, patch);
    return t;
  },
  remove(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
  },
};

export const events = {
  forDay: (dateISO) => state.events.filter((e) => e.date === dateISO).sort((a, b) => a.start.localeCompare(b.start)),
  add(e) {
    const ev = { id: uid("e"), title: "", date: null, start: "09:00", end: "10:00", context: "geschaeftlich", source: "manuell", ...e };
    state.events.push(ev);
    return ev;
  },
  remove(id) {
    state.events = state.events.filter((e) => e.id !== id);
  },
};

export const goals = {
  all: () => state.goals,
  get: (id) => state.goals.find((g) => g.id === id),
  add(g) {
    const goal = { id: uid("g"), title: "", context: "privat", why: "", taskTarget: 20, year: new Date().getFullYear(), ...g };
    state.goals.push(goal);
    return goal;
  },
  remove(id) {
    state.goals = state.goals.filter((g) => g.id !== id);
    state.tasks.forEach((t) => t.goalId === id && (t.goalId = null));
    state.habits.forEach((h) => h.goalId === id && (h.goalId = null));
  },
};

export const habits = {
  all: () => state.habits,
  get: (id) => state.habits.find((h) => h.id === id),
  add(h) {
    const habit = { id: uid("h"), title: "", perWeek: 7, goalId: null, isSport: false, createdAt: new Date().toISOString().slice(0, 10), ...h };
    state.habits.push(habit);
    return habit;
  },
  remove(id) {
    state.habits = state.habits.filter((h) => h.id !== id);
  },
  log(dateISO, habitId, value) {
    state.habitLog[dateISO] = state.habitLog[dateISO] || {};
    if (value === null) delete state.habitLog[dateISO][habitId];
    else state.habitLog[dateISO][habitId] = value;
  },
  value(dateISO, habitId) {
    return state.habitLog[dateISO]?.[habitId];
  },
};
