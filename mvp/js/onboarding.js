// onboarding.js — 5 kurze schritte, alles antippbar, alles später änderbar.

import { db, save, ENERGY_PRESETS, goals, habits } from "./db.js";
import { h, seg } from "./ui.js";
import { WEEKDAYS_SHORT, todayISO } from "./dates.js";
import { loadDemo } from "./demo.js";

const HABIT_SUGGESTIONS = ["sport", "spazieren gehen", "morgen-meditation", "kalte dusche", "genug wasser getrunken", "bildschirmzeit bewusst gehalten", "10 seiten lesen", "vor 23 uhr ins bett"];

export function renderOnboarding(done) {
  const p = db().profile;
  const st = { step: 0, preset: "morgens-fokus", habits: new Set(["sport", "spazieren gehen", "morgen-meditation"]), custom: "", goals: [{ title: "", context: "privat" }, { title: "", context: "geschaeftlich" }, { title: "", context: "privat" }] };
  const wrap = h("div", { class: "ob" });

  const finish = () => {
    p.energyHours = { ...ENERGY_PRESETS[st.preset].hours };
    const goalIds = [];
    for (const g of st.goals) if (g.title.trim()) goalIds.push(goals.add({ title: g.title.trim(), context: g.context }).id);
    const all = [...st.habits, ...st.custom.split(",").map((s) => s.trim()).filter(Boolean)];
    for (const title of all) {
      const isSport = title === "sport";
      habits.add({ title, perWeek: isSport ? Number(p.sportTargetPerWeek) || 4 : 7, isSport, minutes: 60, createdAt: todayISO(), goalId: isSport ? goalIds[0] || null : null });
    }
    db().onboarded = true;
    save();
    done();
  };

  const draw = () => {
    wrap.innerHTML = "";
    const dots = h("div", { class: "dots" }, [0, 1, 2, 3, 4].map((i) => h("i", { class: i <= st.step ? "on" : "" })));
    const next = (label = "weiter", fn) => h("button", { class: "btn btn-primary btn-block", onclick: fn || (() => { st.step++; draw(); }) }, label);
    const back = st.step > 0 ? h("button", { class: "btn btn-ghost", onclick: () => { st.step--; draw(); } }, "zurück") : null;

    if (st.step === 0) {
      const name = h("input", { type: "text", placeholder: "dein vorname", value: p.name, oninput: (e) => (p.name = e.target.value) });
      wrap.append(
        dots,
        h("h1", {}, "hi, ich bin dein praktikant."),
        h("p", { class: "sub" }, "ich sammle deine aufgaben aus diktat, WhatsApp, mail und Teams ein, plane sie passend zu deiner energie in den tag — und frage abends kurz nach, was geklappt hat. ohne vorwürfe."),
        h("label", { class: "field" }, "wie heißt du? (für antwort-vorlagen)", name),
        next("eigenes setup (ca. 2 min)"),
        h(
          "button",
          {
            class: "btn btn-line btn-block",
            onclick: () => {
              loadDemo();
              db().onboarded = true;
              save();
              done();
            },
          },
          "erst mal mit beispieldaten ausprobieren"
        ),
        h("p", { class: "faint" }, "alles bleibt lokal auf diesem gerät. kein konto nötig.")
      );
    } else if (st.step === 1) {
      const days = h("div", { class: "seg" }, [1, 2, 3, 4, 5, 6, 0].map((d) => h("button", { class: "seg-btn" + (p.workDays.includes(d) ? " on" : ""), onclick: () => { p.workDays = p.workDays.includes(d) ? p.workDays.filter((x) => x !== d) : [...p.workDays, d]; draw(); } }, WEEKDAYS_SHORT[d])));
      wrap.append(
        dots,
        h("h1", {}, "wann arbeitest du?"),
        h("p", { class: "sub" }, "geschäftliches plane ich in diese kernzeit, privates davor oder danach. bestehende termine fasse ich nie an."),
        h("label", { class: "field" }, "arbeitstage", days),
        h("div", { class: "grid2" },
          h("label", { class: "field" }, "kernzeit ab", h("input", { type: "time", value: p.workStart, onchange: (e) => (p.workStart = e.target.value) })),
          h("label", { class: "field" }, "kernzeit bis", h("input", { type: "time", value: p.workEnd, onchange: (e) => (p.workEnd = e.target.value) }))
        ),
        next(),
        back
      );
    } else if (st.step === 2) {
      wrap.append(
        dots,
        h("h1", {}, "wann hast du welche energie?"),
        h("p", { class: "sub" }, "fokus-aufgaben landen in deinen fokus-zeiten, kreatives in kreativ-zeiten, kleinkram in routine-zeiten. stundengenau anpassen kannst du das später im profil."),
        h("div", { class: "choice" }, Object.entries(ENERGY_PRESETS).map(([k, v]) => h("button", { class: st.preset === k ? "on" : "", onclick: () => { st.preset = k; draw(); } }, v.label))),
        next(),
        back
      );
    } else if (st.step === 3) {
      const custom = h("input", { type: "text", placeholder: "eigene, mit komma getrennt", value: st.custom, oninput: (e) => (st.custom = e.target.value) });
      wrap.append(
        dots,
        h("h1", {}, "welche habits willst du halten?"),
        h("p", { class: "sub" }, "die frage ich abends mit einem tippen ab. 2–4 reichen völlig."),
        h("div", { class: "seg" }, HABIT_SUGGESTIONS.map((x) => h("button", { class: "seg-btn" + (st.habits.has(x) ? " on" : ""), onclick: () => { st.habits.has(x) ? st.habits.delete(x) : st.habits.add(x); draw(); } }, x))),
        custom,
        h("label", { class: "field" }, "sportziel pro woche", seg([[2, "2×"], [3, "3×"], [4, "4×"], [5, "5×"]], Number(p.sportTargetPerWeek), (v) => { p.sportTargetPerWeek = v; draw(); })),
        next(),
        back
      );
    } else {
      wrap.append(
        dots,
        h("h1", {}, "deine jahresziele"),
        h("p", { class: "sub" }, "abends zeige ich dir, wie deine erledigten aufgaben und habits darauf einzahlen. 1–3 ziele, gern grob."),
        ...st.goals.map((g, i) =>
          h("div", { class: "card tight stack" },
            h("input", { type: "text", placeholder: ["z.b. sportliche identität aufbauen", "z.b. 30 neue kund:innen", "z.b. ruhiger kopf, weniger bildschirm"][i], value: g.title, oninput: (e) => (g.title = e.target.value) }),
            seg([["privat", "privat"], ["geschaeftlich", "geschäftlich"]], g.context, (v) => { g.context = v; draw(); }, { small: true })
          )
        ),
        next("los geht's", finish),
        back
      );
    }
  };
  draw();
  return wrap;
}
