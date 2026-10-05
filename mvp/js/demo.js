// demo.js — beispieldaten zum ausprobieren. klar als "beispiel" markiert
// und im profil mit einem tippen wieder entfernbar. keine echten kontakte.

import { db, save, tasks, events, goals, habits } from "./db.js";
import { todayISO, addDays, weekday } from "./dates.js";
import { extractFromMessage, extractFromDump } from "./extract.js";

export function loadDemo() {
  const d = db();
  const today = todayISO();
  d.demo = true;
  if (!d.profile.name) d.profile.name = "Markus";

  const gFit = goals.add({ title: "sportliche identität: 4× pro woche bewegung", context: "privat", why: "mehr energie, besserer schlaf" });
  const gBiz = goals.add({ title: "beratung: 30 neue kund:innen im jahr", context: "geschaeftlich", why: "zweites standbein aufbauen", taskTarget: 30 });
  const gCalm = goals.add({ title: "ruhiger kopf: weniger bildschirm, mehr fokus", context: "privat", why: "adhs-alltag entlasten" });

  const hSport = habits.add({ title: "sport", perWeek: 4, goalId: gFit.id, isSport: true, minutes: 60, createdAt: addDays(today, -20) });
  const hWalk = habits.add({ title: "spazieren gehen", perWeek: 5, goalId: gFit.id, createdAt: addDays(today, -20) });
  const hScreen = habits.add({ title: "bildschirmzeit bewusst gehalten", perWeek: 7, goalId: gCalm.id, createdAt: addDays(today, -20) });
  const hMed = habits.add({ title: "morgen-meditation", perWeek: 7, goalId: gCalm.id, createdAt: addDays(today, -20) });
  habits.add({ title: "genug wasser getrunken", perWeek: 7, goalId: null, createdAt: addDays(today, -20) });

  // die letzten 14 tage ein realistisches, lückenhaftes muster
  const pattern = [1, 0, 1, 0.5, 0, 1, 1, 0, 1, 0, 1, 0.5, 1, 0];
  for (let i = 1; i <= 14; i++) {
    const date = addDays(today, -i);
    const p = pattern[i - 1];
    habits.log(date, hSport.id, i % 2 === 0 ? 1 : 0);
    habits.log(date, hWalk.id, p);
    habits.log(date, hScreen.id, p > 0 ? 0.5 : 0);
    habits.log(date, hMed.id, i % 3 === 0 ? 0 : 1);
  }

  // termine heute & morgen (nur werktags geschäftlich)
  if ([1, 2, 3, 4, 5].includes(weekday(today))) {
    events.add({ title: "jour fixe team", date: today, start: "10:00", end: "10:45", context: "geschaeftlich" });
    events.add({ title: "kundentermin beratung (online)", date: today, start: "14:00", end: "15:00", context: "geschaeftlich" });
  }
  events.add({ title: "abendessen mit freunden", date: today, start: "19:30", end: "21:30", context: "privat" });
  events.add({ title: "zahnarzt", date: addDays(today, 1), start: "08:15", end: "09:00", context: "privat" });

  // offene, schon bestätigte aufgaben
  tasks.add({ title: "angebot für neuen beratungskunden ausarbeiten", status: "open", kind: "todo", urgency: "woche", energy: "fokus", context: "geschaeftlich", minutes: 120, goalId: gBiz.id, carried: 2, carriedFrom: addDays(today, -1), firstStep: "vorlage vom letzten angebot öffnen und kundennamen eintragen", acceptedAt: addDays(today, -3) });
  tasks.add({ title: "linkedin-post zu 'struktur trotz adhs' skizzieren", status: "open", kind: "todo", urgency: "woche", energy: "kreativ", context: "geschaeftlich", minutes: 45, goalId: gBiz.id, acceptedAt: addDays(today, -2) });
  tasks.add({ title: "geschenk für mamas geburtstag bestellen", status: "open", kind: "todo", urgency: "woche", energy: "routine", context: "privat", minutes: 20, due: addDays(today, 3), acceptedAt: addDays(today, -2) });
  tasks.add({ title: "fitnessstudio-vertrag kündigen (frist prüfen)", status: "open", kind: "admin", urgency: "woche", energy: "routine", context: "privat", minutes: 15, goalId: null, acceptedAt: addDays(today, -1) });
  const doneT = tasks.add({ title: "präsentation jour fixe vorbereitet", status: "done", kind: "todo", energy: "fokus", context: "geschaeftlich", minutes: 45, goalId: gBiz.id, doneAt: addDays(today, -1) + "T16:00:00" });
  void doneT;
  tasks.add({ title: "wartet auf Jens: unterschriebener rahmenvertrag", status: "waiting", kind: "warten", from: "Jens", context: "geschaeftlich", createdAt: addDays(today, -4) + "T09:00:00", source: "mail" });

  // eingang: echte beispiel-nachrichten, durch die regel-einordnung geschickt
  const inbox = [
    extractFromMessage("Hallo Markus, hätten Sie diese Woche Zeit für einen kurzen Call zum Beratungsangebot? Viele Grüße, Sandra Keller", { source: "mail", from: "Sandra Keller" }),
    extractFromMessage("Ihre Rechnung Oktober: Betrag 49,99 € fällig am " + fmtDE(addDays(today, 2)) + ". IBAN DE89 3704 0044 0532 0130 00, Verwendungszweck RE-2026-1043", { source: "mail", from: "Stadtwerke" }),
    extractFromMessage("Kannst du mir bis morgen die Folien vom Workshop schicken? 🙏", { source: "teams", from: "Lena (Team)" }),
    extractFromMessage("Hey! Hast du Samstag Lust auf Laufen am See? 🏃", { source: "whatsapp", from: "Tom" }),
    extractFromMessage("Kurze Info: Das Meeting am Donnerstag ist auf 11 Uhr verschoben. Keine Antwort nötig.", { source: "teams", from: "Projektteam" }),
    ...extractFromDump("steuerunterlagen für den berater zusammensuchen. idee: reel über meine morgenroutine mit adhs", { source: "diktat" }),
  ];
  for (const x of inbox) tasks.add({ ...x, meta: { ...x.meta, demo: true } });
  save();
}

function fmtDE(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function clearDemo() {
  const d = db();
  d.tasks = [];
  d.events = [];
  d.goals = [];
  d.habits = [];
  d.habitLog = {};
  d.checkins = {};
  d.plans = {};
  d.demo = false;
  save();
}
