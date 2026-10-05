// view-abend.js — abend-check-in (wie "pepper", aber in der app):
// aufgaben abhaken, neues erfassen, habits, stimmung, plan-passung →
// zusammenfassung + einzahlung auf die jahresziele. alles antippbar.

import { db, save, tasks, habits, events } from "./db.js";
import { h, icon, toast, seg, progressBar } from "./ui.js";
import { todayISO, addDays, fmtDay, weekday } from "./dates.js";
import { todaysPlannedTasks, setDone } from "./core.js";
import { extractFromDump } from "./extract.js";
import { dayContribution, pct } from "./progress.js";

const MOODS = [
  ["gut", "😊 gut / energiegeladen"],
  ["neutral", "😐 neutral / okay"],
  ["gestresst", "😵‍💫 gestresst / überfordert"],
  ["erschoepft", "😴 erschöpft / müde"],
];
const FIT = [["zu-voll", "zu voll"], ["passte", "passte"], ["zu-wenig", "hätte mehr gekonnt"]];

let draft = null;

export function renderAbend(main, ctx) {
  const today = todayISO();
  const done = db().checkins[today];
  if (done && !draft?.editing) return renderSummary(main, ctx, today, done);
  if (!draft || draft.date !== today) draft = initDraft(today);

  main.append(h("div", {}, h("h1", {}, "abend-check-in"), h("p", { class: "sub" }, `${fmtDay(today)} · 2 minuten, nur antippen. keine vorwürfe — es geht um überblick, nicht um kontrolle.`)));

  // A) aufgaben
  const list = todaysPlannedTasks(today);
  main.append(h("div", { class: "step-k" }, "1 · deine aufgaben heute"));
  const card = h("div", { class: "card tight" });
  if (!list.length) card.append(h("div", { class: "muted" }, "heute war nichts eingeplant."));
  for (const t of list) {
    const v = draft.tasks[t.id];
    card.append(
      h("div", { class: "mini-task" },
        h("div", { class: "grow" }, h("div", { class: "title" }, t.title), t.plannedStart ? h("div", { class: "faint" }, `geplant ${t.plannedStart}`) : h("div", { class: "faint" }, "falls-noch-zeit")),
        h("div", { class: "tri" },
          triBtn("✓", "ok", v === "done", () => { draft.tasks[t.id] = "done"; ctx.rerender(); }, "geschafft"),
          triBtn("↪", "mid", v === "move", () => { draft.tasks[t.id] = "move"; ctx.rerender(); }, "auf morgen"),
          triBtn("✕", "no", v === "drop", () => { draft.tasks[t.id] = "drop"; ctx.rerender(); }, "streichen")
        )
      )
    );
  }
  main.append(card, h("div", { class: "faint" }, "✓ geschafft · ↪ morgen wieder einplanen · ✕ war doch nicht nötig. offen gelassen = morgen."));

  // B) neues
  main.append(h("div", { class: "step-k" }, "2 · gab's heute was neues?"));
  const ta = h("textarea", { placeholder: "optional: neue todos, zusagen, ideen …", style: { minHeight: "64px" }, oninput: (e) => (draft.newText = e.target.value) });
  ta.value = draft.newText;
  main.append(ta);

  // C) habits
  const hs = habits.all();
  main.append(h("div", { class: "step-k" }, "3 · deine habits"));
  const hc = h("div", { class: "card tight" });
  if (!hs.length) hc.append(h("div", { class: "muted" }, "noch keine habits — unter „ziele“ festlegen."));
  for (const hb of hs) {
    const v = draft.habits[hb.id];
    hc.append(
      h("div", { class: "mini-task" },
        h("div", { class: "grow title" }, hb.title),
        h("div", { class: "tri" },
          triBtn("ja", "ok", v === 1, () => { draft.habits[hb.id] = 1; ctx.rerender(); }),
          triBtn("teils", "mid", v === 0.5, () => { draft.habits[hb.id] = 0.5; ctx.rerender(); }),
          triBtn("nein", "no", v === 0, () => { draft.habits[hb.id] = 0; ctx.rerender(); })
        )
      )
    );
  }
  main.append(hc);

  // D) stimmung + plan
  main.append(h("div", { class: "step-k" }, "4 · wie war der tag?"));
  main.append(h("div", { class: "mood" }, MOODS.map(([k, label]) => h("button", { class: draft.mood === k ? "on" : "", onclick: () => { draft.mood = k; ctx.rerender(); } }, label))));
  main.append(h("div", { class: "field" }, "wie hat der plan gepasst?", seg(FIT, draft.fit, (v) => { draft.fit = v; ctx.rerender(); })));

  main.append(h("button", { class: "btn btn-primary btn-block", onclick: () => finish(ctx, today) }, icon("check"), "tag abschließen"));
  main.append(h("div", { class: "faint" }, "nicht beantwortetes bleibt einfach leer („–“) — nichts wird geraten."));
}

function triBtn(label, kind, on, fn, title) {
  return h("button", { class: `${kind}${on ? " on" : ""}`, onclick: fn, title: title || label, "aria-pressed": on ? "true" : "false" }, label);
}

function initDraft(today) {
  const t = {};
  for (const x of todaysPlannedTasks(today)) if (x.status === "done") t[x.id] = "done";
  const hb = {};
  for (const x of habits.all()) {
    const v = habits.value(today, x.id);
    if (v != null) hb[x.id] = v;
  }
  return { date: today, tasks: t, habits: hb, mood: null, fit: null, newText: "", editing: false };
}

function finish(ctx, today) {
  const d = db();
  const list = todaysPlannedTasks(today);
  const moved = [];
  const doneList = [];
  for (const t of list) {
    const v = draft.tasks[t.id] || (t.status === "done" ? "done" : "move");
    if (v === "done") {
      if (t.status !== "done") setDone(t.id, true);
      doneList.push(t.id);
    } else if (v === "drop") {
      tasks.update(t.id, { status: "dropped" });
    } else {
      if (t.status === "done") setDone(t.id, false);
      tasks.update(t.id, { status: "open", plannedDate: null, plannedStart: null, carried: (t.carried || 0) + 1, carriedFrom: today });
      moved.push(t.id);
    }
  }
  for (const hb of habits.all()) if (draft.habits[hb.id] != null) habits.log(today, hb.id, draft.habits[hb.id]);
  let newCount = 0;
  if (draft.newText.trim()) {
    for (const it of extractFromDump(draft.newText, { source: "notiz" })) {
      tasks.add(it);
      newCount++;
    }
  }
  let adjust = "";
  const p = d.profile;
  if (draft.fit === "zu-voll" && p.maxMainSlots > 2) {
    p.maxMainSlots -= 1;
    adjust = `morgen plane ich nur noch ${p.maxMainSlots} haupt-slots.`;
  } else if (draft.fit === "zu-wenig" && p.maxMainSlots < 6) {
    p.maxMainSlots += 1;
    adjust = `morgen traue ich dir ${p.maxMainSlots} haupt-slots zu.`;
  }
  const sym = (v) => (v === 1 ? "✅" : v === 0.5 ? "⚠️" : v === 0 ? "❌" : "–");
  const moodLabel = MOODS.find(([k]) => k === draft.mood)?.[1].replace(/^\S+\s/, "") || "–";
  const logline = `- ${today}: ${habits.all().map((hb) => `${hb.title} ${sym(draft.habits[hb.id])}`).join(" | ")}${habits.all().length ? " | " : ""}stimmung: ${moodLabel}`;
  d.checkins[today] = { at: new Date().toISOString(), mood: draft.mood, fit: draft.fit, doneIds: doneList, movedIds: moved, total: list.length, newCount, adjust, logline };
  save();
  draft = null;
  ctx.rerender();
  window.scrollTo({ top: 0 });
}

function renderSummary(main, ctx, today, ci) {
  const d = db();
  const doneTasks = ci.doneIds.map((id) => tasks.get(id)).filter(Boolean);
  const movedTasks = ci.movedIds.map((id) => tasks.get(id)).filter(Boolean);
  const ratio = ci.total ? ci.doneIds.length / ci.total : 0;
  const headline = !ci.total ? "tag abgeschlossen." : ratio >= 0.75 ? "richtig starker tag." : ratio >= 0.4 ? "solider tag." : ci.doneIds.length ? "ein paar dinge geschafft — zählt." : "heute lief's anders als geplant. passiert.";

  main.append(
    h("div", {}, h("h1", {}, headline), h("p", { class: "sub" }, `${fmtDay(today)} · ${ci.doneIds.length} von ${ci.total} geplanten aufgaben erledigt`)),
  );

  if (movedTasks.length) {
    main.append(
      h("div", { class: "card tight" },
        h("h3", {}, "für morgen vorgemerkt"),
        movedTasks.map((t) => h("div", { class: "mini-task" }, h("div", { class: "grow title" }, t.title), t.carried > 1 ? h("span", { class: "chip warn" }, `${t.carried}× verschoben`) : null)),
        h("div", { class: "faint", style: { marginTop: "6px" } }, movedTasks.some((t) => t.carried >= 3) ? "was schon 3× gewandert ist, wird morgen hauptfokus-kandidat — mit einem winzigen ersten schritt." : "steht morgen früh wieder im plan. kein drama.")
      )
    );
  }
  if (ci.adjust) main.append(h("div", { class: "banner info" }, ci.adjust));
  if (ci.newCount) main.append(h("div", { class: "banner" }, `${ci.newCount} neue punkte liegen im eingang`, h("span", { class: "grow" }), h("button", { class: "btn btn-s btn-line", onclick: () => ctx.go("eingang") }, "ansehen")));

  // einzahlung auf jahresziele
  main.append(h("div", { class: "label" }, "so zahlt dein tag auf deine jahresziele ein"));
  const contrib = dayContribution(today);
  if (!contrib.length) {
    main.append(h("div", { class: "card tight muted" }, "noch keine jahresziele festgelegt.", h("button", { class: "btn btn-ghost", onclick: () => ctx.go("ziele") }, "jetzt festlegen")));
  } else {
    main.append(
      h("div", { class: "card" },
        contrib.map((c) =>
          h("div", { class: "contrib" },
            h("div", { class: "row" }, h("div", { class: "grow", style: { fontWeight: 700, fontSize: "13.5px" } }, c.goal.title), h("span", { class: "delta", style: c.delta <= 0.0005 ? { color: "var(--text-faint)" } : {} }, c.delta > 0.0005 ? `+${(c.delta * 100).toFixed(1)} %` : "±0")),
            progressBar(c.after),
            h("div", { class: "faint" },
              `${pct(c.before)} → ${pct(c.after)}`,
              c.tasksDone.length ? ` · ${c.tasksDone.length} aufgabe${c.tasksDone.length > 1 ? "n" : ""}` : "",
              c.habitsDone.length ? ` · ${c.habitsDone.map((x) => x.title).join(", ")}` : "",
              !c.tasksDone.length && !c.habitsDone.length ? " · heute nichts dafür — völlig okay" : ""
            )
          )
        )
      )
    );
    const unlinked = doneTasks.filter((t) => !t.goalId).length;
    if (unlinked) main.append(h("div", { class: "faint" }, `${unlinked} erledigte aufgabe${unlinked > 1 ? "n" : ""} ohne jahresziel — beim einordnen im eingang zuordnen, dann zählen sie mit.`));
  }

  // habit-tracker-zeile
  main.append(h("div", { class: "label" }, "habit-tracker"), h("div", { class: "logline" }, ci.logline));

  // blick auf morgen
  const tomorrow = addDays(today, 1);
  const theme = d.profile.themes?.[weekday(tomorrow)];
  const evs = events.forDay(tomorrow);
  main.append(
    h("div", { class: "card tight" },
      h("h3", {}, "kurzer blick auf morgen"),
      h("div", { class: "muted" }, fmtDay(tomorrow), theme ? ` · ${theme}` : ""),
      evs.length ? evs.slice(0, 4).map((e) => h("div", { class: "faint" }, `${e.allDay ? "ganztägig" : e.start} · ${e.title}`)) : h("div", { class: "faint" }, "noch keine termine."),
      h("div", { class: "faint", style: { marginTop: "6px" } }, "den plan baue ich morgen früh frisch — mit allem, was heute liegen geblieben ist.")
    )
  );

  main.append(h("button", { class: "btn btn-ghost", onclick: () => { draft = initDraft(today); Object.assign(draft, { mood: ci.mood, fit: ci.fit, editing: true }); for (const id of ci.doneIds) draft.tasks[id] = "done"; delete db().checkins[today]; save(); ctx.rerender(); } }, "check-in nochmal bearbeiten"));
}
