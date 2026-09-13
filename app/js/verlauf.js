// verlauf.js — der "verlauf"-bereich: eine gemeinsame, vertikale zeitachse
// aus erledigten todos, habit-konsistenz und tagebuch-einträgen statt der
// früheren, getrennten screens übersicht/tagebuch-liste/habit-historie
// (architecture.md §2.2, context.md §3.7/§3.11).
//
// wichtig: baut bewusst auf der bestehenden, unveränderten logik auf statt
// sie neu zu schreiben — `currentStreak`/`isDoneToday`/das render() aus
// habits.js und das komplette render() aus journal.js werden 1:1
// wiederverwendet (in einem modal eingebettet, siehe openJournalModal()/
// openHabitsModal() unten). beide module bleiben dafür unangetastet: sie
// suchen ihren container schon immer per `document.getElementById(...)`,
// wir stellen diesen container einfach innerhalb des modals bereit.

import { Tasks, Habits, HabitLogs, JournalEntries, todayISO } from "./storage.js";
import { isDoneToday } from "./habits.js";
import * as journal from "./journal.js";
import * as habitsModule from "./habits.js";
import { esc, openModal, closeModal, ICONS } from "./ui.js";

// letzte 3 wochen — genug für einen sinnvollen rückblick, ohne dass der
// zeitstrahl bei einer frisch installierten app ewig lang und meist leer
// wirkt (aufgabenstellung: "praktikabler wert, nicht zu lang").
const DAYS_BACK = 21;

const FILTERS = [
  { id: "alle", label: "alle" },
  { id: "ziele", label: "ziele" },
  { id: "habits", label: "habits" },
  { id: "stimmung", label: "stimmung" },
];
let activeFilter = "alle";

function dateOffsetISO(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------
// mood-heuristik (WICHTIG, klar zu kennzeichnen — dieselbe ehrlichkeits-
// konvention wie strom.js#classify()): es gibt aktuell KEIN eigenes
// "stimmungs"-feld im datenmodell. statt eine stimmung zu erfinden, wird
// sie — nur wenn ein JournalEntry für den tag existiert — aus dessen
// bereits vom nutzer selbst gewählten daten abgeleitet: zuerst aus den
// angekreuzten `feelings` (die feste FEELINGS-liste aus journal.js ist
// grob in "eher positiv"/"eher angespannt" einsortiert), ersatzweise aus
// einer ganz einfachen wortlisten-suche im freitext (erlebnisse/gedanken)
// — kein sprachmodell, kein "verstehen" des textes. gibt es keinen
// eindeutigen ausschlag, ist der punkt neutral-grau ("gemischt/unklar").
// gibt es gar keinen JournalEntry für den tag, aber sonst aktivität
// (todos/habits), ist der punkt ebenfalls neutral-grau, aber mit dem
// klaren label "keine angabe" — es wird nie eine stimmung vorgetäuscht.
const POSITIVE_FEELINGS = ["zufrieden", "ruhig", "motiviert", "dankbar"];
const NEGATIVE_FEELINGS = ["erschöpft", "unruhig", "überfordert", "gereizt"];
const POSITIVE_WORDS = ["gut", "super", "toll", "froh", "glücklich", "erfolg", "stolz", "schön", "gelungen", "entspannt", "zufrieden"];
const NEGATIVE_WORDS = ["schlecht", "schwer", "stress", "gestresst", "müde", "traurig", "wütend", "genervt", "frustriert", "anstrengend", "überfordert"];

function moodForEntry(entry) {
  let score = 0;
  (entry.feelings || []).forEach((f) => {
    if (POSITIVE_FEELINGS.includes(f)) score += 1;
    if (NEGATIVE_FEELINGS.includes(f)) score -= 1;
  });
  if (score === 0) {
    const text = `${entry.events || ""} ${entry.thoughts || ""}`.toLowerCase();
    POSITIVE_WORDS.forEach((w) => text.includes(w) && score++);
    NEGATIVE_WORDS.forEach((w) => text.includes(w) && score--);
  }
  if (score > 0) return { color: "var(--success)", label: "eher positiv" };
  if (score < 0) return { color: "var(--danger-text)", label: "eher angespannt" };
  return { color: "var(--text-faint)", label: "gemischt/unklar" };
}

// ---------------------------------------------------------------------
// pro tag ein kompakter datensatz für den zeitstrahl. tage ganz ohne
// jegliche aktivität werden übersprungen (aufgabenstellung) — außer dem
// heutigen tag: der bleibt immer sichtbar als fester einstiegspunkt für
// "heute reflektieren"/"habits heute abhaken", auch an einem noch ganz
// leeren tag (sonst gäbe es keinen ort mehr für diese aktionen im
// zeitstrahl selbst, siehe aufgabenstellung teil 1).
function buildDayEntry(date, isToday) {
  const tasksDone = Tasks.all().filter((t) => t.date === date && t.done);
  const habitsById = Object.fromEntries(Habits.all().map((h) => [h.id, h]));
  const habitNames = HabitLogs.all()
    .filter((l) => l.date === date && l.done)
    .map((l) => habitsById[l.habitId]?.name)
    .filter(Boolean);
  const journalEntry = JournalEntries.all().find((e) => e.date === date) || null;

  const hasActivity = tasksDone.length > 0 || habitNames.length > 0 || !!journalEntry;
  if (!isToday && !hasActivity) return null;

  let excerpt = null;
  if (journalEntry) {
    const raw = journalEntry.events || journalEntry.thoughts || (journalEntry.gratitude || []).find(Boolean) || "";
    excerpt = raw ? (raw.length > 60 ? raw.slice(0, 60).trim() + "…" : raw) : null;
  }

  return {
    date,
    isToday,
    tasksDoneCount: tasksDone.length,
    habitNames,
    journalEntry,
    excerpt,
    mood: journalEntry ? moodForEntry(journalEntry) : null,
    hasActivity,
  };
}

function passesFilter(entry) {
  if (entry.isToday) return true; // immer sichtbar, siehe buildDayEntry()
  switch (activeFilter) {
    case "ziele":
      return entry.tasksDoneCount > 0;
    case "habits":
      return entry.habitNames.length > 0;
    case "stimmung":
      return !!entry.journalEntry;
    default:
      return true;
  }
}

// ---------------------------------------------------------------------
// "aufgefallen"-karte: EINE einzelne, einfache, rein lokal berechnete
// beobachtung (keine ki, siehe app/README.md-konvention "was bewusst noch
// nicht echt ist"). reicht die datenlage nicht, gibt es keine karte —
// lieber nichts anzeigen als etwas erfinden.
//
// 1. versuch: ein habit, das länger nicht abgehakt wurde als sein sonst
//    üblicher rhythmus (durchschnittlicher abstand zwischen bisherigen
//    erledigungen) erwarten lässt — braucht mindestens 3 bisherige
//    erledigungen, sonst ist "sonst üblich" nicht aussagekräftig genug.
// 2. sonst: vergleich erledigter todos diese woche vs. letzte woche,
//    nur wenn beide wochen genug basis haben (>= 3 erledigte todos
//    letzte woche) und der unterschied deutlich ist (>= 25 prozentpunkte
//    relative veränderung) — sonst wäre die schwankung nicht der rede wert.
function computeInsight() {
  let habitInsight = null;
  let maxRatio = 1.5; // schwelle: mind. 50% länger als der übliche abstand
  Habits.all().forEach((h) => {
    const doneDates = HabitLogs.all()
      .filter((l) => l.habitId === h.id && l.done)
      .map((l) => l.date)
      .sort();
    if (doneDates.length < 3) return;
    const lastDone = doneDates[doneDates.length - 1];
    const daysSince = Math.round((new Date(todayISO()) - new Date(lastDone)) / 86400000);
    if (daysSince < 3) return;
    const gaps = [];
    for (let i = 1; i < doneDates.length; i++) {
      gaps.push((new Date(doneDates[i]) - new Date(doneDates[i - 1])) / 86400000);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length || 1;
    const ratio = daysSince / Math.max(avgGap, 1);
    if (ratio > maxRatio) {
      maxRatio = ratio;
      habitInsight = { name: h.name, daysSince };
    }
  });
  if (habitInsight) {
    return `seit ${habitInsight.daysSince} tagen kein „${habitInsight.name}“ abgehakt — länger als bei dir sonst üblich.`;
  }

  const thisWeek = Array.from({ length: 7 }, (_, i) => dateOffsetISO(i));
  const lastWeek = Array.from({ length: 7 }, (_, i) => dateOffsetISO(7 + i));
  const thisWeekDone = Tasks.all().filter((t) => thisWeek.includes(t.date) && t.done).length;
  const lastWeekDone = Tasks.all().filter((t) => lastWeek.includes(t.date) && t.done).length;
  if (lastWeekDone >= 3) {
    const diffPct = Math.round(((thisWeekDone - lastWeekDone) / lastWeekDone) * 100);
    if (Math.abs(diffPct) >= 25) {
      return diffPct < 0
        ? `diese woche ${Math.abs(diffPct)}% weniger todos erledigt als letzte woche (${thisWeekDone} statt ${lastWeekDone}).`
        : `diese woche ${diffPct}% mehr todos erledigt als letzte woche (${thisWeekDone} statt ${lastWeekDone}).`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// modals: journal.js und habits.js unverändert in einem modal-container
// gerendert (siehe modul-kommentar oben) — nach dem schließen (egal ob
// über den x-button oder klick auf den backdrop, siehe ui.js#onClose)
// wird der zeitstrahl neu gezeichnet, damit ein frischer journal-eintrag
// bzw. ein neu abgehaktes habit sofort sichtbar wird.
function openJournalModal() {
  const html = `
    <div style="display:flex; justify-content:flex-end;">
      <button class="btn-icon" id="modal-close-journal" title="schließen">&times;</button>
    </div>
    <div id="view-journal"></div>
  `;
  openModal(html, {
    onMount: (root) => {
      root.querySelector("#modal-close-journal").addEventListener("click", closeModal);
      journal.render();
    },
    onClose: () => render(),
  });
}

function openHabitsModal() {
  const html = `
    <div style="display:flex; justify-content:flex-end;">
      <button class="btn-icon" id="modal-close-habits" title="schließen">&times;</button>
    </div>
    <div id="view-habits"></div>
  `;
  openModal(html, {
    onMount: (root) => {
      root.querySelector("#modal-close-habits").addEventListener("click", closeModal);
      habitsModule.render();
    },
    onClose: () => render(),
  });
}

// ---------------------------------------------------------------------
// darstellung eines einzelnen zeitstrahl-eintrags. der farbige punkt auf
// der zeitstrahl-linie ist zugleich der "mood-punkt" aus dem mockup —
// zwei anforderungen ("punkt pro tag" + "farbiger mood-punkt pro tag"),
// eine einzige, konsistente stelle im markup.
function dayCardHtml(entry) {
  const showTasks = (activeFilter === "alle" || activeFilter === "ziele") && entry.tasksDoneCount > 0;
  const showHabits = (activeFilter === "alle" || activeFilter === "habits") && entry.habitNames.length > 0;
  const showJournal = (activeFilter === "alle" || activeFilter === "stimmung") && !!entry.journalEntry;

  const dotColor = entry.mood ? entry.mood.color : entry.hasActivity ? "var(--text-faint)" : "var(--border)";
  const moodLabel = entry.mood ? entry.mood.label : entry.hasActivity ? "keine angabe" : "";

  const dateLabel = entry.isToday
    ? "heute"
    : new Date(entry.date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

  const lines = [];
  if (showTasks) lines.push(`${entry.tasksDoneCount} todo${entry.tasksDoneCount === 1 ? "" : "s"} erledigt`);
  if (showHabits) lines.push(`${entry.habitNames.length} habit${entry.habitNames.length === 1 ? "" : "s"} abgehakt: ${entry.habitNames.map(esc).join(", ")}`);
  if (showJournal) lines.push(entry.excerpt ? `„${esc(entry.excerpt)}“` : "tagebucheintrag vorhanden");

  const journalBtnLabel = entry.journalEntry ? "heutigen eintrag bearbeiten" : "heute reflektieren";

  return `
    <div class="timeline-item ${entry.isToday ? "is-today" : ""}">
      <span class="mood-dot" style="background:${dotColor};" title="${esc(moodLabel)}"></span>
      <div class="card" style="padding:13px 15px;">
        <div class="timeline-date">${dateLabel}${moodLabel ? ` · ${esc(moodLabel)}` : ""}</div>
        ${
          lines.length
            ? `<div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">${lines.map((l) => `<div class="timeline-line-item">${l}</div>`).join("")}</div>`
            : entry.isToday
              ? `<div class="empty-hint" style="padding:6px 0 0 0; text-align:left;">heute noch nichts erfasst.</div>`
              : ""
        }
        ${entry.isToday ? `<button class="btn-ghost" id="open-journal-btn" style="padding-left:0; margin-top:8px;">${ICONS.sparkle} ${journalBtnLabel}</button>` : ""}
      </div>
    </div>`;
}

export function render() {
  const el = document.getElementById("view-verlauf");

  const days = [];
  for (let i = 0; i < DAYS_BACK; i++) {
    const entry = buildDayEntry(dateOffsetISO(i), i === 0);
    if (entry && passesFilter(entry)) days.push(entry);
  }

  const habits = Habits.all();
  const habitsDoneToday = habits.filter((h) => isDoneToday(h.id)).length;
  const insight = computeInsight();

  el.innerHTML = `
    <h1>verlauf</h1>
    <p class="subtitle">eine gemeinsame zeitachse aus todos, habits und tagebuch — statt getrennter dashboards</p>

    <div class="chip-row">
      ${FILTERS.map((f) => `<button class="pill ${f.id === activeFilter ? "pill-active" : "pill-neutral"}" data-filter="${f.id}">${f.label}</button>`).join("")}
    </div>

    <div class="card" id="open-habits-card" role="button" tabindex="0" style="display:flex; align-items:center; gap:12px; cursor:pointer;">
      <div style="width:36px; height:36px; border-radius:12px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0;">${ICONS.check}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:700; font-size:13.5px;">habits heute abhaken</div>
        <div style="font-size:11.5px; color:var(--text-soft); margin-top:2px;">${habits.length ? `${habitsDoneToday} von ${habits.length} heute erledigt` : "noch keine habits angelegt"}</div>
      </div>
      ${ICONS.chevronRight}
    </div>

    ${
      insight
        ? `<div class="ai-banner">
            <div class="icon">${ICONS.sparkle}</div>
            <div class="body">
              <div class="title">aufgefallen</div>
              <div class="meta">${esc(insight)} · lokale statistik, keine ki</div>
            </div>
          </div>`
        : ""
    }

    <div class="timeline">
      ${days.map(dayCardHtml).join("")}
    </div>
  `;

  el.querySelectorAll("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      render();
    })
  );

  const habitsCard = el.querySelector("#open-habits-card");
  habitsCard.addEventListener("click", openHabitsModal);
  habitsCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openHabitsModal();
    }
  });

  el.querySelector("#open-journal-btn")?.addEventListener("click", openJournalModal);
}
