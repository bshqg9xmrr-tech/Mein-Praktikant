// view-ziele.js — jahresziele & habits, persönlich festgelegt.
// fortschritt wird berechnet (progress.js), nie von hand geschätzt.

import { db, save, goals, habits } from "./db.js";
import { h, toast, openModal, seg, progressBar, CONTEXT_LABEL } from "./ui.js";
import { todayISO, addDays, weekStart, WEEKDAYS_SHORT, weekday } from "./dates.js";
import { goalProgress, habitStreak, habitWeekCount, pct } from "./progress.js";

export function renderZiele(main, ctx) {
  const year = new Date().getFullYear();
  const today = todayISO();
  const elapsed = (Date.now() - new Date(year, 0, 1)) / (new Date(year + 1, 0, 1) - new Date(year, 0, 1));
  main.append(h("div", {}, h("h1", {}, `jahresziele ${year}`), h("p", { class: "sub" }, `das jahr ist zu ${Math.round(elapsed * 100)} % vorbei. fortschritt = erledigte zugeordnete aufgaben + habit-konstanz.`)));

  for (const g of goals.all()) {
    const pr = goalProgress(g.id, today);
    const hs = habits.all().filter((x) => x.goalId === g.id);
    main.append(
      h("div", { class: "card goal" },
        h("div", { class: "row" }, h("div", { class: "grow t" }, g.title), h("span", { class: `chip ${g.context}` }, CONTEXT_LABEL[g.context])),
        g.why ? h("div", { class: "muted" }, `warum: ${g.why}`) : null,
        progressBar(pr.value),
        h("div", { class: "faint" },
          pr.empty ? "noch nichts zugeordnet — habits unten verknüpfen oder aufgaben im eingang zuordnen." : `${pct(pr.value)} · ${pr.tasksDone} von ${g.taskTarget || 20} aufgaben · ${pr.habits} habit${pr.habits === 1 ? "" : "s"}`
        ),
        hs.length ? h("div", { class: "row wrap" }, hs.map((x) => h("span", { class: "chip neutral" }, x.title))) : null,
        h("div", { class: "row" }, h("span", { class: "grow" }), h("button", { class: "btn btn-ghost btn-s", onclick: () => goalModal(ctx, g) }, "bearbeiten"))
      )
    );
  }
  main.append(h("button", { class: "btn btn-line", onclick: () => goalModal(ctx) }, "+ jahresziel"));

  // habits
  main.append(h("div", { class: "label" }, "habits — abends per tippen abgefragt"));
  const ws = weekStart(today);
  const card = h("div", { class: "card tight" });
  if (!habits.all().length) card.append(h("div", { class: "muted" }, "noch keine habits."));
  for (const hb of habits.all()) {
    const dots = h("div", { class: "week-dots", title: "diese woche" },
      [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const dte = addDays(ws, i);
        const v = db().habitLog[dte]?.[hb.id];
        return h("i", { class: v === 1 ? "on" : v === 0.5 ? "half" : "", title: WEEKDAYS_SHORT[weekday(dte)] });
      })
    );
    const streak = habitStreak(hb.id, today);
    const goal = hb.goalId && goals.get(hb.goalId);
    card.append(
      h("div", { class: "hab" },
        h("div", { class: "grow" },
          h("div", { style: { fontWeight: 650 } }, hb.isSport ? `🏃 ${hb.title}` : hb.title),
          h("div", { class: "faint" }, `${habitWeekCount(hb.id, today)} / ${hb.perWeek} diese woche`, streak > 1 ? ` · 🔥 ${streak} tage am stück` : "", goal ? ` · → ${goal.title}` : " · ohne ziel")
        ),
        dots,
        h("button", { class: "btn btn-ghost btn-s", onclick: () => habitModal(ctx, hb) }, "⋯")
      )
    );
  }
  main.append(card, h("button", { class: "btn btn-line", onclick: () => habitModal(ctx) }, "+ habit"));
}

function goalModal(ctx, g) {
  const st = g ? { taskTarget: 20, ...g } : { title: "", context: "privat", why: "", taskTarget: 20 };
  const body = h("div", { class: "stack" });
  const draw = () => {
    body.innerHTML = "";
    body.append(
      h("input", { type: "text", placeholder: "z.b. sportliche identität aufbauen", value: st.title, oninput: (e) => (st.title = e.target.value) }),
      h("input", { type: "text", placeholder: "warum ist dir das wichtig? (optional)", value: st.why, oninput: (e) => (st.why = e.target.value) }),
      seg([["privat", "privat"], ["geschaeftlich", "geschäftlich"]], st.context, (v) => { st.context = v; draw(); }),
      h("label", { class: "field" }, "wie viele erledigte aufgaben ≈ ziel erreicht? (habits zählen zusätzlich)", seg([[10, "10"], [20, "20"], [30, "30"], [50, "50"], [100, "100"]], Number(st.taskTarget), (v) => { st.taskTarget = v; draw(); }, { small: true })),
      h("div", { class: "row" },
        h("button", { class: "btn btn-primary grow", onclick: () => {
          if (!st.title.trim()) return toast("titel fehlt noch");
          if (g) Object.assign(g, { title: st.title.trim(), why: st.why, context: st.context, taskTarget: st.taskTarget });
          else goals.add({ title: st.title.trim(), why: st.why, context: st.context, taskTarget: st.taskTarget });
          save(); close(); ctx.rerender();
        } }, "speichern"),
        g ? h("button", { class: "btn btn-danger", onclick: () => { if (confirm("ziel löschen? zugeordnete aufgaben/habits bleiben erhalten.")) { goals.remove(g.id); save(); close(); ctx.rerender(); } } }, "löschen") : null
      )
    );
  };
  draw();
  const close = openModal(g ? "jahresziel bearbeiten" : "neues jahresziel", body);
}

function habitModal(ctx, hb) {
  const st = hb ? { ...hb } : { title: "", perWeek: 7, goalId: null, isSport: false, minutes: 60 };
  const body = h("div", { class: "stack" });
  const draw = () => {
    body.innerHTML = "";
    body.append(
      h("input", { type: "text", placeholder: "z.b. kalte dusche", value: st.title, oninput: (e) => (st.title = e.target.value) }),
      h("label", { class: "field" }, "wie oft pro woche?", seg([[1, "1×"], [2, "2×"], [3, "3×"], [4, "4×"], [5, "5×"], [7, "täglich"]], st.perWeek, (v) => { st.perWeek = v; draw(); }, { small: true })),
      h("label", { class: "field" }, "zahlt ein auf", h("select", { onchange: (e) => (st.goalId = e.target.value || null) }, h("option", { value: "" }, "— kein jahresziel"), goals.all().map((g) => h("option", { value: g.id, selected: g.id === st.goalId }, g.title)))),
      h("label", { class: "row", style: { fontSize: "13px" } }, h("input", { type: "checkbox", checked: st.isSport, onchange: (e) => (st.isSport = e.target.checked) }), "das ist mein sport-habit (der planer schlägt dafür slots vor, wetter-abhängig)"),
      h("div", { class: "row" },
        h("button", { class: "btn btn-primary grow", onclick: () => {
          if (!st.title.trim()) return toast("titel fehlt noch");
          if (st.isSport) habits.all().forEach((x) => x.id !== hb?.id && (x.isSport = false));
          if (hb) Object.assign(hb, { title: st.title.trim(), perWeek: st.perWeek, goalId: st.goalId, isSport: st.isSport });
          else habits.add({ title: st.title.trim(), perWeek: st.perWeek, goalId: st.goalId, isSport: st.isSport, createdAt: todayISO() });
          if (st.isSport) db().profile.sportTargetPerWeek = st.perWeek;
          save(); close(); ctx.rerender();
        } }, "speichern"),
        hb ? h("button", { class: "btn btn-danger", onclick: () => { if (confirm("habit löschen?")) { habits.remove(hb.id); save(); close(); ctx.rerender(); } } }, "löschen") : null
      )
    );
  };
  draw();
  const close = openModal(hb ? "habit bearbeiten" : "neues habit", body);
}
