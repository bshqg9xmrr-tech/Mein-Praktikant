// journal.js — abend-tagebuch: dankbarkeit, erlebnisse, gedanken,
// gefühle + automatisch übernommene erledigte todos (siehe context.md
// §3.3). der "rückblick" unten ist bewusst regelbasiert und nicht als
// ki ausgegeben — echtes ki-coaching ist noch nicht angebunden
// (context.md §7).

import { Tasks, JournalEntries, Habits, todayISO, uid } from "./storage.js";
import { currentStreak } from "./habits.js";
import { esc, toast, ICONS } from "./ui.js";

const FEELINGS = ["zufrieden", "ruhig", "erschöpft", "unruhig", "motiviert", "überfordert", "dankbar", "gereizt"];

let draft = null; // { date, gratitude:[3], events, thoughts, feelings:[] }

function blankEntry(date) {
  return { id: uid("journal"), date, gratitude: ["", "", ""], events: "", thoughts: "", feelings: [] };
}

function completedTasksOn(date) {
  return Tasks.all().filter((t) => t.date === date && t.done);
}

function reflectionText(date) {
  const today = completedTasksOn(date);
  const allToday = Tasks.all().filter((t) => t.date === date);
  const rate = allToday.length ? Math.round((today.length / allToday.length) * 100) : null;

  const streaks = Habits.all().map((h) => currentStreak(h.id)).sort((a, b) => b - a);
  const bestStreak = streaks[0] || 0;

  const lines = [];
  if (allToday.length) {
    lines.push(`du hast heute ${today.length} von ${allToday.length} aufgaben erledigt (${rate}%).`);
  }
  if (bestStreak > 0) {
    lines.push(`dein bester aktueller habit-streak liegt bei ${bestStreak} tag${bestStreak === 1 ? "" : "en"} — dranbleiben.`);
  }
  if (!lines.length) {
    lines.push("leg heute noch ein paar aufgaben oder habits an, dann kann hier mehr stehen.");
  }
  return lines;
}

function pastEntriesHtml() {
  const entries = [...JournalEntries.all()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  if (!entries.length) return "";
  return `
    <div class="section-label">frühere einträge</div>
    <div class="list">
      ${entries
        .map(
          (e) => `<div class="card" style="padding:13px;">
            <div style="font-weight:700; font-size:12.5px;">${e.date}</div>
            ${e.events ? `<div style="font-size:12px; color:var(--text-soft); margin-top:5px;">${esc(e.events)}</div>` : ""}
            ${e.feelings?.length ? `<div class="chip-row" style="margin-top:8px;">${e.feelings.map((f) => `<span class="pill pill-neutral">${esc(f)}</span>`).join("")}</div>` : ""}
          </div>`
        )
        .join("")}
    </div>`;
}

export function render() {
  const el = document.getElementById("view-journal");
  const date = todayISO();
  if (!draft || draft.date !== date) {
    draft = JournalEntries.all().find((e) => e.date === date) || blankEntry(date);
  }
  const done = completedTasksOn(date);

  el.innerHTML = `
    <h1>guten abend, markus</h1>
    <p class="subtitle">kurz reflektieren, bevor der tag zu ende geht</p>

    <div class="warm-card" style="display:flex; align-items:center; gap:14px;">
      <button class="warm-btn" id="dictate-btn">${ICONS.mic}</button>
      <div style="flex:1;">
        <div style="font-weight:700; font-size:13.5px;">deinen tag diktieren</div>
        <div style="font-size:11.5px; color:var(--text-soft); margin-top:2px;">folgt mit ki-anbindung — trägt dann automatisch in die felder unten ein.</div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="section-label">heute erledigt</div>
        <span style="font-size:10.5px; color:var(--text-faint);">automatisch aus deinen todos</span>
      </div>
      ${
        done.length
          ? `<div style="display:flex; flex-direction:column; gap:6px;">${done
              .map((t) => `<div style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600;">${ICONS.check.replace("<svg", '<svg style="width:14px;height:14px;color:var(--success)"')}${esc(t.title)}</div>`)
              .join("")}</div>`
          : `<div class="empty-hint" style="padding:8px 0;">heute noch nichts abgehakt.</div>`
      }
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">3× dankbarkeit</div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${[0, 1, 2].map((i) => `<input type="text" data-gratitude="${i}" value="${esc(draft.gratitude[i] || "")}" placeholder="wofür bist du heute dankbar?">`).join("")}
      </div>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">erlebnisse</div>
      <textarea id="f-events" placeholder="was ist heute passiert?">${esc(draft.events)}</textarea>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">gedanken &amp; erkenntnisse</div>
      <textarea id="f-thoughts" placeholder="was ist dir aufgefallen?">${esc(draft.thoughts)}</textarea>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">gefühle</div>
      <div class="chip-row" style="flex-wrap:wrap;">
        ${FEELINGS.map((f) => `<button class="pill ${draft.feelings.includes(f) ? "pill-active" : "pill-neutral"}" data-feeling="${esc(f)}">${esc(f)}</button>`).join("")}
      </div>
    </div>

    <button class="btn btn-primary btn-block" id="journal-save">${ICONS.check} eintrag speichern</button>

    <div class="coach-card">
      <div style="font-weight:700; font-size:13.5px; margin-bottom:9px;">dein rückblick</div>
      <div style="display:flex; flex-direction:column; gap:8px; font-size:12.5px; line-height:1.5;">
        ${reflectionText(date).map((l) => `<div>· ${esc(l)}</div>`).join("")}
      </div>
      <div style="font-size:10px; color:var(--text-faint); margin-top:10px;">regelbasiert berechnet — ein ki-coach folgt später (siehe context.md §7)</div>
    </div>

    ${pastEntriesHtml()}
  `;

  el.querySelector("#dictate-btn").addEventListener("click", () => {
    toast("diktierfunktion folgt mit der ki-anbindung.");
  });

  el.querySelectorAll("[data-gratitude]").forEach((input) =>
    input.addEventListener("input", (e) => {
      draft.gratitude[Number(e.target.dataset.gratitude)] = e.target.value;
    })
  );
  el.querySelector("#f-events").addEventListener("input", (e) => (draft.events = e.target.value));
  el.querySelector("#f-thoughts").addEventListener("input", (e) => (draft.thoughts = e.target.value));
  el.querySelectorAll("[data-feeling]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const f = btn.dataset.feeling;
      draft.feelings = draft.feelings.includes(f) ? draft.feelings.filter((x) => x !== f) : [...draft.feelings, f];
      render();
    })
  );

  el.querySelector("#journal-save").addEventListener("click", () => {
    const existing = JournalEntries.all().find((e) => e.date === date);
    if (existing) {
      JournalEntries.update(existing.id, draft);
    } else {
      JournalEntries.add(draft);
    }
    toast("eintrag gespeichert.");
    render();
  });
}
