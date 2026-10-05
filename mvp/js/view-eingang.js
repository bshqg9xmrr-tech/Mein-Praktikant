// view-eingang.js — "nachrichten-zentrale": diktat, notizen, WhatsApp,
// WhatsApp Business, mail, Teams → regelbasiert einordnen → bestätigen.

import { db, save, tasks, events } from "./db.js";
import { h, icon, toast, seg, URGENCY, ENERGY_LABEL, CONTEXT_LABEL } from "./ui.js";
import { todayISO, fmtShort, fmtDay, toHHMM, fmtDuration } from "./dates.js";
import { SOURCES, KINDS, extractFromDump, extractFromMessage } from "./extract.js";
import { looksLikeWhatsApp, parseWhatsApp, looksLikeMail, parseMail, looksLikeICS, parseICS } from "./importers.js";
import { acceptInbox, speechSupported, startDictation, makePlan } from "./core.js";
import { suggestMeetingSlots } from "./scheduler.js";

const MESSAGE_SOURCES = ["whatsapp", "whatsapp-business", "mail", "teams"];
const ui = { source: "notiz", from: "", text: "", open: null, showIdeas: false };

export function renderEingang(main, ctx) {
  if (ctx.shared) {
    ui.text = ctx.shared;
    ui.source = "notiz";
  }
  const d = db();
  main.append(h("div", {}, h("h1", {}, "eingang"), h("p", { class: "sub" }, "alles rein — ich sortiere vor, du bestätigst mit einem tippen.")));
  main.append(captureCard(ctx));
  main.append(dropZone(ctx));

  const inbox = d.tasks.filter((t) => t.status === "inbox");
  if (inbox.length) {
    main.append(
      h("div", { class: "row" },
        h("div", { class: "label grow" }, `zu prüfen (${inbox.length})`),
        h("button", { class: "btn btn-s btn-soft", onclick: () => { inbox.forEach((t) => acceptInbox(t.id)); makePlan(todayISO()); toast(`${inbox.length} übernommen — plan aktualisiert`); ctx.rerender(); } }, "alle übernehmen")
      )
    );
    for (const key of ["heute", "woche", "spaeter", "info"]) {
      const group = inbox.filter((t) => (t.urgency || "woche") === key);
      if (!group.length) continue;
      main.append(h("div", { class: "faint", style: { fontWeight: 700, marginTop: "4px" } }, `${URGENCY[key].dot} ${URGENCY[key].label}`));
      group.forEach((t) => main.append(itemCard(t, ctx)));
    }
    main.append(h("div", { class: "ai-note" }, "regelbasiert eingeordnet (stichwörter, datumsangaben) — keine echte ki. kurz prüfen lohnt sich."));
  } else {
    main.append(h("div", { class: "card tight muted" }, "eingang leer ✓ — nichts wartet auf eine entscheidung."));
  }

  const ideas = d.tasks.filter((t) => t.status === "idea");
  if (ideas.length) {
    main.append(h("button", { class: "btn btn-ghost", onclick: () => { ui.showIdeas = !ui.showIdeas; ctx.rerender(); } }, `💡 ideen-sammlung (${ideas.length}) ${ui.showIdeas ? "▲" : "▼"}`));
    if (ui.showIdeas) {
      main.append(h("div", { class: "card tight" }, ideas.map((t) => h("div", { class: "mini-task" }, h("div", { class: "grow title" }, t.title), h("button", { class: "btn btn-s btn-soft", onclick: () => { tasks.update(t.id, { status: "open", kind: "todo", acceptedAt: new Date().toISOString() }); save(); ctx.rerender(); toast("ist jetzt eine aufgabe"); } }, "→ aufgabe"), h("button", { class: "btn-danger btn", onclick: () => { tasks.update(t.id, { status: "dropped" }); save(); ctx.rerender(); } }, "✕")))));
    }
  }
}

// ---------- erfassen ----------

function captureCard(ctx) {
  const isMsg = MESSAGE_SOURCES.includes(ui.source);
  const ta = h("textarea", {
    placeholder: isMsg ? "nachricht oder mail hier einfügen …" : "einfach alles rauslassen — z.b. „morgen telekom-rechnung zahlen, außerdem präsentation für den kunden bis freitag, mama anrufen“",
    oninput: (e) => (ui.text = e.target.value),
  });
  ta.value = ui.text;
  let stop = null;
  const mic = h("button", {
    class: "mic",
    "aria-label": "diktieren",
    html: icon("mic").innerHTML,
    onclick: () => {
      if (stop) {
        stop();
        return;
      }
      if (!speechSupported()) {
        toast("diktat geht in diesem browser nicht — tipp: am mac 2× fn drücken (macOS-diktierfunktion) und ins textfeld sprechen.", { ms: 7000 });
        ta.focus();
        return;
      }
      const before = ui.text ? ui.text.trim() + "\n" : "";
      ui.source = "diktat";
      mic.classList.add("rec");
      stop = startDictation(
        (txt) => {
          ui.text = before + txt;
          ta.value = ui.text;
        },
        (err) => {
          mic.classList.remove("rec");
          stop = null;
          if (err && err !== "aborted" && err !== "no-speech") toast(`diktat gestoppt (${err}) — mikrofon-freigabe prüfen`);
        }
      );
    },
  });
  const from = h("input", { type: "text", placeholder: "von wem? (name)", value: ui.from, oninput: (e) => (ui.from = e.target.value) });

  return h("div", { class: "card capture stack" },
    seg(Object.entries(SOURCES).filter(([k]) => k !== "kalender").map(([k, v]) => [k, v.label]), ui.source, (v) => { ui.source = v; ctx.rerender(); }, { small: true }),
    isMsg ? from : null,
    h("div", { class: "row", style: { alignItems: "flex-end" } }, h("div", { class: "grow" }, ta), mic),
    h("button", { class: "btn btn-primary", onclick: () => ingestText(ui.text, ctx) }, "einordnen")
  );
}

function ingestText(text, ctx, sourceHint) {
  text = (text || "").trim();
  if (!text) return toast("noch nichts eingegeben");
  let items = [];
  let note = "";
  if (looksLikeICS(text)) return importEvents(text, ctx);
  if (looksLikeWhatsApp(text)) {
    const r = parseWhatsApp(text, db().profile.name);
    const src = sourceHint || (ui.source === "whatsapp-business" ? "whatsapp-business" : "whatsapp");
    if (!r.unanswered.length) return toast(`chat mit ${r.contact}: nichts unbeantwortetes aus den letzten 7 tagen`);
    // jede unbeantwortete nachricht einzeln einordnen (bitte + terminfrage = 2 punkte),
    // reine "ok/danke"-infos fallen weg, solange es etwas zu tun gibt
    const all = r.unanswered.map((m) => extractFromMessage(m.text, { source: src, from: r.contact }));
    const actionable = all.filter((x) => x.kind !== "info");
    items = actionable.length ? actionable : [extractFromMessage(r.unanswered.map((m) => m.text).join("\n"), { source: src, from: r.contact })];
    note = `WhatsApp-chat mit ${r.contact}: ${r.unanswered.length} unbeantwortete nachricht${r.unanswered.length > 1 ? "en" : ""}`;
    if (!r.selfDetected) note += " (dein name nicht im chat gefunden — profil-namen prüfen)";
  } else if (looksLikeMail(text)) {
    const m = parseMail(text);
    const x = extractFromMessage(`${m.subject}\n${m.body}`, { source: "mail", from: m.from });
    if (m.automated) Object.assign(x, { kind: "info", urgency: "info", status: "inbox" });
    items = [x];
    note = `mail von ${m.from}`;
  } else if (MESSAGE_SOURCES.includes(ui.source)) {
    items = [extractFromMessage(text, { source: ui.source, from: ui.from.trim() || SOURCES[ui.source].label })];
  } else {
    items = extractFromDump(text, { source: ui.source });
  }
  for (const it of items) tasks.add(it);
  save();
  ui.text = "";
  ui.from = "";
  toast(note || `${items.length} punkt${items.length === 1 ? "" : "e"} erkannt — bitte kurz prüfen`);
  ctx.rerender();
}

function importEvents(text, ctx) {
  const list = parseICS(text).filter((e) => e.date >= todayISO());
  for (const ev of list) events.add({ title: ev.title, date: ev.date, start: ev.start, end: ev.end, allDay: ev.allDay, context: "geschaeftlich", source: "ics" });
  save();
  makePlan(todayISO());
  toast(`${list.length} termin${list.length === 1 ? "" : "e"} in den kalender übernommen`);
  ctx.rerender();
}

function dropZone(ctx) {
  const input = h("input", { type: "file", accept: ".txt,.eml,.ics,.zip,text/plain,message/rfc822,text/calendar", multiple: true, class: "hidden", onchange: (e) => handleFiles(e.target.files, ctx) });
  const zone = h("label", {
    class: "drop",
    ondragover: (e) => { e.preventDefault(); zone.classList.add("over"); },
    ondragleave: () => zone.classList.remove("over"),
    ondrop: (e) => { e.preventDefault(); zone.classList.remove("over"); handleFiles(e.dataTransfer.files, ctx); },
  },
    input,
    h("div", {}, h("b", {}, "datei ablegen oder tippen: "), "WhatsApp-chat-export (.txt), mail (.eml), kalender (.ics)"),
    h("div", { class: "faint", style: { marginTop: "4px" } }, "WhatsApp: chat öffnen → name antippen → „chat exportieren“ → ohne medien. mail: in apple mail/outlook auf den schreibtisch ziehen.")
  );
  return zone;
}

async function handleFiles(files, ctx) {
  for (const f of files || []) {
    if (/\.zip$/i.test(f.name)) {
      toast("bitte die .txt aus dem zip nehmen (oder „ohne medien“ exportieren)");
      continue;
    }
    const text = await f.text();
    const src = /business/i.test(f.name) ? "whatsapp-business" : undefined;
    ingestText(text, ctx, src);
  }
}

// ---------- einzelner eintrag ----------

function itemCard(t, ctx) {
  const open = ui.open === t.id;
  const goals = db().goals;
  const card = h("div", { class: "item" });
  const set = (patch) => { tasks.update(t.id, patch); save(); ctx.rerender(); };

  card.append(
    h("div", { class: "row" },
      h("div", { class: "grow" },
        h("div", { class: "title" }, t.title),
        h("div", { class: "src" }, `${SOURCES[t.source]?.label || t.source}${t.from ? ` · ${t.from}` : ""}${t.meta?.demo ? " · beispiel" : ""}`)
      )
    ),
    h("div", { class: "props" },
      h("span", { class: "chip neutral" }, KINDS[t.kind]),
      h("span", { class: `chip ${t.context}` }, CONTEXT_LABEL[t.context]),
      t.kind !== "info" && t.kind !== "idee" ? h("span", { class: "chip neutral" }, `${ENERGY_LABEL[t.energy]} · ${fmtDuration(t.minutes)}`) : null,
      t.due ? h("span", { class: "chip warn" }, `fällig ${fmtShort(t.due)}`) : null,
      t.goalId ? h("span", { class: "chip" }, `→ ${goals.find((g) => g.id === t.goalId)?.title || "ziel"}`) : null
    )
  );

  if (t.kind === "admin" && Object.keys(t.meta || {}).some((k) => ["amount", "iban", "ref", "link"].includes(k))) {
    card.append(
      h("div", { class: "admin-box" },
        t.meta.amount ? [h("b", {}, "betrag"), h("span", {}, t.meta.amount)] : null,
        t.due ? [h("b", {}, "fällig"), h("span", {}, fmtDay(t.due))] : null,
        t.meta.iban ? [h("b", {}, "IBAN"), h("span", {}, t.meta.iban)] : null,
        t.meta.ref ? [h("b", {}, "zweck"), h("span", {}, t.meta.ref)] : null,
        t.meta.link ? [h("b", {}, "link"), h("a", { href: t.meta.link, target: "_blank", rel: "noopener" }, "öffnen")] : null,
        h("span", { class: "faint", style: { gridColumn: "1 / -1" } }, "admin-autopilot: alles vorbereitet — überweisen musst du selbst, die app zahlt nie.")
      )
    );
  }

  if (t.raw && t.raw !== t.title) card.append(h("div", { class: "raw" }, t.raw));
  if (t.reasons?.length) card.append(h("div", { class: "faint" }, "eingeordnet weil: ", t.reasons.join(" · ")));

  if (open) {
    card.append(
      h("div", { class: "stack" },
        h("input", { type: "text", value: t.title, onchange: (e) => set({ title: e.target.value }) }),
        seg(Object.entries(URGENCY).map(([k, v]) => [k, `${v.dot} ${v.label}`]), t.urgency, (v) => set({ urgency: v }), { small: true }),
        seg(Object.entries(KINDS), t.kind, (v) => set({ kind: v }), { small: true }),
        seg([["privat", "privat"], ["geschaeftlich", "geschäftlich"]], t.context, (v) => set({ context: v }), { small: true }),
        seg(Object.entries(ENERGY_LABEL), t.energy, (v) => set({ energy: v }), { small: true }),
        seg([[15, "15 min"], [30, "30"], [45, "45"], [60, "1 h"], [90, "1,5 h"], [120, "2 h"]], t.minutes, (v) => set({ minutes: v }), { small: true }),
        h("div", { class: "grid2" },
          h("label", { class: "field" }, "fällig", h("input", { type: "date", value: t.due || "", onchange: (e) => set({ due: e.target.value || null }) })),
          h("label", { class: "field" }, "zahlt ein auf", h("select", { onchange: (e) => set({ goalId: e.target.value || null }) }, h("option", { value: "" }, "— kein jahresziel"), goals.map((g) => h("option", { value: g.id, selected: g.id === t.goalId }, g.title))))
        )
      )
    );
  }

  const isMessage = MESSAGE_SOURCES.includes(t.source);
  const reply = isMessage && (t.kind === "termin" || t.kind === "todo") ? h("div", { class: "reply hidden" }) : null;

  card.append(
    h("div", { class: "actions" },
      h("button", { class: "btn btn-s btn-primary", onclick: () => { acceptInbox(t.id); makePlan(todayISO()); toast(labelAfterAccept(t)); ctx.rerender(); } }, t.kind === "info" ? "gelesen" : "übernehmen"),
      h("button", { class: "btn btn-s btn-line", onclick: () => { ui.open = open ? null : t.id; ctx.rerender(); } }, open ? "fertig" : "anpassen"),
      reply ? h("button", { class: "btn btn-s btn-soft", onclick: () => toggleReply(t, reply) }, "antwort-vorlage") : null,
      h("span", { class: "grow" }),
      h("button", { class: "btn btn-danger btn-s", "aria-label": "verwerfen", onclick: () => { const prev = t.status; set({ status: "dropped" }); toast("verworfen", { action: "rückgängig", onAction: () => set({ status: prev }) }); } }, "✕")
    )
  );
  if (reply) card.append(reply);
  return card;
}

function labelAfterAccept(t) {
  if (t.kind === "warten") return "unter „wartet auf“ vermerkt";
  if (t.kind === "idee") return "in die ideen-sammlung gelegt";
  if (t.kind === "info") return "als gelesen abgelegt";
  return "übernommen — plan aktualisiert";
}

function fmtSlot(s) {
  return `${fmtDay(s.date)} um ${toHHMM(s.start)}`;
}

function toggleReply(t, box) {
  if (!box.classList.contains("hidden")) return box.classList.add("hidden");
  const p = db().profile;
  const me = p.name ? p.name.split(" ")[0] : "";
  const first = (t.from || "").split(/[\s(]/)[0];
  // groß geschriebenes "Sie/Ihnen/Ihre" = siezen (klein geschrieben wäre "sie" = 3. person)
  const formal = /\b(Sie|Ihnen|Ihre[nmrs]?)\b/.test(t.raw || "") && t.source !== "whatsapp";
  let text;
  if (t.kind === "termin") {
    const slots = suggestMeetingSlots({ fromISO: todayISO(), profile: p, eventsByDate: (d) => events.forDay(d), context: t.context });
    const [a, b] = slots.map(fmtSlot);
    if (formal) text = `Hallo ${t.from},\n\nvielen Dank für Ihre Nachricht. Gerne – mir würde ${a || "[termin 1]"} oder ${b || "[termin 2]"} passen. Passt Ihnen einer der Termine?\n\nViele Grüße\n${p.name || "[name]"}`;
    else text = `hey ${first || ""}, gerne! wie wär's mit ${a || "[termin 1]"} oder ${b || "[termin 2]"}? lg ${me}`;
  } else {
    const when = t.due ? fmtShort(t.due) : "morgen";
    if (formal) text = `Hallo ${t.from},\n\nvielen Dank – ich kümmere mich darum und melde mich bis ${when} bei Ihnen.\n\nViele Grüße\n${p.name || "[name]"}`;
    else text = `hey ${first || ""}, danke dir! ich kümmer mich drum und melde mich bis ${when} 👍`;
  }
  box.innerHTML = "";
  box.append(
    h("div", {}, text),
    h("div", { class: "row", style: { marginTop: "8px" } },
      h("button", { class: "btn btn-s btn-primary", onclick: () => navigator.clipboard?.writeText(text).then(() => toast("kopiert — jetzt in WhatsApp/mail einfügen"), () => toast("kopieren nicht erlaubt — text bitte markieren")) }, "kopieren"),
      h("span", { class: "faint" }, "vorlage, wird nie automatisch gesendet. freie slots aus deinem kalender.")
    )
  );
  box.classList.remove("hidden");
}
