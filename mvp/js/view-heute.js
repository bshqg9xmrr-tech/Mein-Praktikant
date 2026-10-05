// view-heute.js — das "morning briefing" als bildschirm:
// hauptfokus, energie-gerechter zeitplan, falls-noch-zeit, offene loops.

import { db, save, tasks, events, habits } from "./db.js";
import { h, icon, toast, openModal, seg, ENERGY_LABEL, CONTEXT_LABEL } from "./ui.js";
import { todayISO, fmtDay, weekday, nowMin, toMin, diffDays, fmtShort, fmtDuration } from "./dates.js";
import { makePlan, planIsStale, setDone, checkinDue, cachedWeather } from "./core.js";
import { firstStepFor } from "./extract.js";
import { planToICS, download } from "./ics.js";
import { parseICS } from "./importers.js";

function greeting(name) {
  const m = nowMin();
  const g = m < 11 * 60 ? "guten morgen" : m < 17 * 60 ? "hallo" : "guten abend";
  return name ? `${g}, ${name.split(" ")[0].toLowerCase()}` : g;
}

export function renderHeute(main, ctx) {
  const today = todayISO();
  const d = db();
  const p = d.profile;
  let plan = d.plans[today];
  if (!plan) plan = makePlan(today);
  const theme = p.themes?.[weekday(today)];
  const w = cachedWeather()?.byDate?.[today]?.summary;

  main.append(
    h("div", {},
      h("h1", {}, greeting(p.name)),
      h("p", { class: "sub" }, fmtDay(today), theme ? ` · ${theme}` : "", w ? ` · ${w.icon} ${w.max}° ${w.text}${w.rainyHours ? `, ${w.rainyHours} h regen` : ""}` : "")
    )
  );

  if (d.demo) main.append(h("div", { class: "banner info" }, h("span", { class: "grow" }, "beispieldaten aktiv — zum ausprobieren. im profil mit einem tippen löschbar.")));

  if (checkinDue(today)) {
    main.append(h("div", { class: "banner ok" }, icon("moon"), h("span", { class: "grow" }, "zeit für den abend-check-in — 2 minuten."), h("button", { class: "btn btn-s btn-primary", onclick: () => ctx.go("abend") }, "starten")));
  }

  const inboxN = d.tasks.filter((t) => t.status === "inbox").length;
  const inboxUrgent = d.tasks.filter((t) => t.status === "inbox" && t.urgency === "heute").length;
  if (inboxN) {
    main.append(h("div", { class: "banner" }, icon("inbox"), h("span", { class: "grow" }, inboxUrgent ? `🔴 ${inboxUrgent} dringend · ${inboxN} neu im eingang` : `${inboxN} neue punkte im eingang`), h("button", { class: "btn btn-s btn-line", onclick: () => ctx.go("eingang") }, "einordnen")));
  }

  const stale = planIsStale(today);
  if (stale) {
    main.append(h("div", { class: "banner info" }, h("span", { class: "grow" }, `${stale} neue aufgabe${stale > 1 ? "n" : ""} seit dem plan`), h("button", { class: "btn btn-s btn-primary", onclick: () => { makePlan(today); ctx.rerender(); toast("plan neu gebaut"); } }, "neu planen")));
  }

  // ---------- hauptfokus ----------
  const focus = plan.focusId && tasks.get(plan.focusId);
  if (focus && focus.status !== "done") {
    const slot = plan.slots.find((s) => s.taskId === focus.id);
    const goal = focus.goalId && d.goals.find((g) => g.id === focus.goalId);
    main.append(
      h("div", { class: "card focus-card" },
        h("div", { class: "k" }, "🎯 hauptfokus heute", slot ? ` · ${slot.startHM}` : " · noch kein freier slot"),
        h("div", { class: "t" }, focus.title),
        h("div", { class: "step" }, "erster kleiner schritt: ", h("b", {}, firstStepFor(focus))),
        h("div", { class: "why" }, [...plan.focusWhy, goal ? `zahlt auf „${goal.title}" ein` : null].filter(Boolean).join(" · ") || "wichtigste offene aufgabe"),
        h("div", { class: "row", style: { marginTop: "10px" } },
          h("button", { class: "btn btn-s", onclick: () => { setDone(focus.id, true); toast("stark. hauptfokus erledigt ✓", { action: "rückgängig", onAction: () => { setDone(focus.id, false); ctx.rerender(); } }); ctx.rerender(); } }, icon("check"), "erledigt")
        )
      )
    );
  } else if (focus && focus.status === "done") {
    main.append(h("div", { class: "banner ok" }, "🎯 hauptfokus erledigt: ", h("b", { class: "grow" }, focus.title), " — alles weitere ist bonus."));
  }

  // ---------- zeitplan ----------
  main.append(h("div", { class: "label" }, "dein tag"));
  const tl = h("div", { class: "timeline" });
  const now = nowMin();
  const allDay = plan.slots.filter((s) => s.allDay);
  for (const s of allDay) tl.append(h("div", { class: "faint" }, `ganztägig: ${s.title}`));
  for (const s of plan.slots.filter((x) => !x.allDay)) tl.append(slotRow(s, now, ctx));
  if (!plan.slots.filter((x) => !x.allDay).length) tl.append(h("div", { class: "muted" }, "noch nichts geplant."));
  main.append(tl);
  plan.notes?.forEach((n) => main.append(h("div", { class: "faint" }, n)));

  // ---------- falls noch zeit ----------
  const maybe = (plan.maybe || []).map((id) => tasks.get(id)).filter((t) => t && t.status !== "dropped");
  if (maybe.length) {
    main.append(h("div", { class: "label" }, "falls noch zeit & energie (ohne slot)"));
    main.append(h("div", { class: "card tight" }, maybe.map((t) => miniTask(t, ctx))));
  }
  const later = (plan.later || []).map((id) => tasks.get(id)).filter((t) => t && t.status === "open");
  if (later.length) main.append(h("div", { class: "faint" }, `${later.length} weitere offene aufgabe${later.length > 1 ? "n" : ""} warten auf einen anderen tag — bewusst nicht heute.`));

  // ---------- offene loops ----------
  const waiting = d.tasks.filter((t) => t.status === "waiting");
  if (waiting.length) {
    main.append(h("div", { class: "label" }, "wartet auf (offene loops)"));
    main.append(
      h("div", { class: "card tight" },
        waiting.map((t) => {
          const days = diffDays(t.createdAt.slice(0, 10), today);
          return h("div", { class: "mini-task" },
            h("div", { class: "grow" }, h("div", { class: "title" }, t.title), h("div", { class: "faint" }, days > 0 ? `seit ${days} tag${days > 1 ? "en" : ""}` : "seit heute", days >= 3 ? " · vielleicht kurz nachhaken?" : "")),
            h("button", { class: "btn btn-s btn-soft", onclick: () => { tasks.update(t.id, { status: "done", doneAt: new Date().toISOString() }); save(); ctx.rerender(); } }, "kam an")
          );
        })
      )
    );
  }

  // ---------- aktionen ----------
  main.append(
    h("div", { class: "row wrap" },
      h("button", { class: "btn btn-line btn-s", onclick: () => { makePlan(today); ctx.rerender(); toast("plan neu gebaut"); } }, "neu planen"),
      h("button", { class: "btn btn-line btn-s", onclick: () => { download(`tagesplan-${today}.ics`, planToICS(today, db().plans[today].slots)); toast("kalender-datei geladen — doppelklick übernimmt die slots"); } }, icon("cal"), "in meinen kalender"),
      h("button", { class: "btn btn-line btn-s", onclick: () => eventModal(ctx) }, icon("plus"), "termin"),
      h("label", { class: "btn btn-line btn-s" }, icon("upload"), "kalender importieren", h("input", { type: "file", accept: ".ics,text/calendar", class: "hidden", onchange: (e) => importICS(e, ctx) }))
    ),
    h("div", { class: "ai-note" }, "plan nach festen regeln aus deinem profil (energie, kernzeit, pausen, wetter) — keine echte ki.")
  );
}

function slotRow(s, now, ctx) {
  const t = s.taskId ? tasks.get(s.taskId) : null;
  const done = t?.status === "done" || (s.kind === "sport" && (habits.value(todayISO(), s.habitId) || 0) > 0);
  const isNow = now >= s.start && now < s.end;
  const cls = ["slot", s.kind, done ? "done" : "", isNow ? "now" : ""].join(" ");
  const bodyCls = "body " + (s.energy ? `e-${s.energy}` : s.kind === "sport" ? "e-bewegung" : "");
  if (s.kind === "pause" || s.kind === "lunch") {
    return h("div", { class: cls }, h("div", { class: "time" }, s.startHM), h("div", { class: bodyCls }, h("div", { class: "muted" }, `☕ ${s.title} · ${fmtDuration(s.end - s.start)}`), h("div", { class: "why" }, s.reason)));
  }
  if (s.kind === "batch") {
    const items = s.items.map((it) => tasks.get(it.taskId)).filter(Boolean);
    const allDone = items.length && items.every((x) => x.status === "done");
    return h("div", { class: cls + (allDone ? " done" : "") },
      h("div", { class: "time" }, s.startHM),
      h("div", { class: bodyCls },
        h("div", { class: "title" }, `📦 ${s.title}`),
        h("div", { class: "meta" }, h("span", { class: "faint" }, `bis ${s.endHM}`), h("span", { class: `chip ${s.context}` }, CONTEXT_LABEL[s.context])),
        h("div", { style: { marginTop: "6px" } },
          items.map((x) => {
            const dn = x.status === "done";
            return h("label", { class: "row", style: { fontSize: "13px", padding: "4px 0", textDecoration: dn ? "line-through" : "", opacity: dn ? 0.6 : 1 } },
              h("input", { type: "checkbox", checked: dn, onchange: () => { setDone(x.id, !dn); ctx.rerender(); } }),
              h("span", { class: "grow" }, x.title),
              h("span", { class: "faint" }, `${x.minutes} min`)
            );
          })
        ),
        h("div", { class: "why" }, "warum hier: ", s.reason)
      )
    );
  }
  let check = null;
  if (s.kind === "task" && t) {
    check = h("button", { class: "check", "aria-label": done ? "als offen markieren" : "erledigt", html: done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg>' : "", onclick: () => { setDone(t.id, !done); if (!done) toast("erledigt ✓", { action: "rückgängig", onAction: () => { setDone(t.id, false); ctx.rerender(); } }); ctx.rerender(); } });
  }
  if (s.kind === "sport") {
    check = h("button", { class: "check", "aria-label": "sport erledigt", html: done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg>' : "", onclick: () => { habits.log(todayISO(), s.habitId, done ? null : 1); save(); ctx.rerender(); } });
  }
  return h("div", { class: cls },
    h("div", { class: "time" }, s.startHM),
    h("div", { class: bodyCls },
      h("div", { class: "row" },
        h("div", { class: "grow" },
          h("div", { class: "title" }, s.kind === "sport" ? `🏃 ${s.title}` : s.title),
          h("div", { class: "meta" },
            h("span", { class: "faint" }, `bis ${s.endHM}`),
            s.context ? h("span", { class: `chip ${s.context}` }, CONTEXT_LABEL[s.context]) : null,
            s.energy ? h("span", { class: "chip neutral" }, ENERGY_LABEL[s.energy]) : null,
            s.part ? h("span", { class: "chip warn" }, s.part) : null,
            t?.carried ? h("span", { class: "chip warn" }, t.carried === 1 ? "von gestern übernommen" : `${t.carried}× verschoben`) : null
          )
        ),
        check
      ),
      h("div", { class: "why" }, "warum hier: ", s.reason)
    )
  );
}

function miniTask(t, ctx) {
  const done = t.status === "done";
  return h("div", { class: "mini-task" },
    h("button", { class: "btn-icon", "aria-label": "erledigt", style: done ? { background: "var(--success)", color: "#fff" } : {}, html: done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg>' : "", onclick: () => { setDone(t.id, !done); ctx.rerender(); } }),
    h("div", { class: "grow" }, h("div", { class: "title", style: done ? { textDecoration: "line-through", opacity: 0.6 } : {} }, t.title), h("div", { class: "faint" }, `${ENERGY_LABEL[t.energy]} · ${fmtDuration(t.minutes)}${t.due ? ` · fällig ${fmtShort(t.due)}` : ""}`))
  );
}

function eventModal(ctx) {
  const today = todayISO();
  const st = { title: "", date: today, start: "", end: "", context: "geschaeftlich" };
  const body = h("div", { class: "stack" });
  const draw = () => {
    body.innerHTML = "";
    body.append(
      h("input", { type: "text", placeholder: "titel, z.b. arzttermin", value: st.title, oninput: (e) => (st.title = e.target.value) }),
      h("div", { class: "grid2" },
        h("label", { class: "field" }, "datum", h("input", { type: "date", value: st.date, onchange: (e) => (st.date = e.target.value) })),
        h("div", { class: "grid2" },
          h("label", { class: "field" }, "von", h("input", { type: "time", value: st.start, onchange: (e) => (st.start = e.target.value) })),
          h("label", { class: "field" }, "bis", h("input", { type: "time", value: st.end, onchange: (e) => (st.end = e.target.value) }))
        )
      ),
      seg([["geschaeftlich", "geschäftlich"], ["privat", "privat"]], st.context, (v) => { st.context = v; draw(); }),
      h("button", {
        class: "btn btn-primary",
        onclick: () => {
          if (!st.title.trim() || !st.start) return toast("titel und startzeit fehlen noch");
          const end = st.end && st.end > st.start ? st.end : addHour(st.start);
          events.add({ ...st, title: st.title.trim(), end });
          save();
          if (st.date === today) makePlan(today);
          close();
          ctx.rerender();
          toast("termin eingetragen — plan angepasst");
        },
      }, "speichern")
    );
  };
  draw();
  const close = openModal("termin hinzufügen", body);
}

function addHour(hm) {
  const m = toMin(hm) + 60;
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

async function importICS(e, ctx) {
  const file = e.target.files?.[0];
  if (!file) return;
  const list = parseICS(await file.text());
  let n = 0;
  let rec = 0;
  for (const ev of list) {
    if (ev.date < todayISO()) continue;
    if (db().events.some((x) => x.date === ev.date && x.start === ev.start && x.title === ev.title)) continue;
    events.add({ title: ev.title, date: ev.date, start: ev.start, end: ev.end, allDay: ev.allDay, context: /privat|private|familie|geburtstag/i.test(ev.title) ? "privat" : "geschaeftlich", source: "ics" });
    n++;
    if (ev.recurring) rec++;
  }
  save();
  makePlan(todayISO());
  ctx.rerender();
  toast(`${n} termin${n === 1 ? "" : "e"} übernommen${rec ? ` (${rec} wiederkehrende nur 1×)` : ""}`);
}
