// view-profil.js — persönliche vorlieben (energie, arbeitszeit, erholung,
// wetter, themen), verbindungen und daten.

import { db, save, ENERGY_MODES, ENERGY_PRESETS, replaceAll, resetAll } from "./db.js";
import { h, toast, seg } from "./ui.js";
import { todayISO, WEEKDAYS_SHORT } from "./dates.js";
import { makePlan, loadWeather } from "./core.js";
import { geocode } from "./weather.js";
import { loadDemo, clearDemo } from "./demo.js";
import { download } from "./ics.js";

const ORDER = ["fokus", "kreativ", "routine", "erholung"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export function renderProfil(main, ctx) {
  const p = db().profile;
  const upd = (patch) => {
    Object.assign(p, patch);
    save();
    makePlan(todayISO());
    ctx.rerender();
  };

  main.append(h("div", {}, h("h1", {}, "profil & vorlieben"), h("p", { class: "sub" }, "danach plant der praktikant deinen tag. jede änderung baut den heutigen plan neu.")));

  // name
  main.append(h("div", { class: "card" }, h("label", { class: "field" }, "dein name (für antwort-vorlagen & WhatsApp-export)", h("input", { type: "text", value: p.name, onchange: (e) => { p.name = e.target.value; save(); } }))));

  // energie
  main.append(h("div", { class: "label" }, "energie-profil"));
  main.append(
    h("div", { class: "card stack" },
      h("div", { class: "muted" }, "tippe eine stunde an, um zu wechseln: fokus → kreativ → routine → erholung."),
      h("div", { class: "energy-grid" },
        HOURS.map((hr) => {
          const m = p.energyHours[hr] || "erholung";
          return h("button", { style: { background: ENERGY_MODES[m].color }, title: ENERGY_MODES[m].label, onclick: () => { p.energyHours[hr] = ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]; upd({}); } }, `${hr}`);
        })
      ),
      h("div", { class: "energy-legend" }, ORDER.map((m) => h("span", { style: { "--c": ENERGY_MODES[m].color } }, `${m} — ${ENERGY_MODES[m].hint}`))),
      h("div", { class: "row wrap" }, h("span", { class: "faint" }, "vorlage:"), Object.entries(ENERGY_PRESETS).map(([k, v]) => h("button", { class: "chip", onclick: () => upd({ energyHours: { ...v.hours } }) }, v.label)))
    )
  );

  // arbeitszeit
  main.append(h("div", { class: "label" }, "arbeit & tagesrahmen"));
  main.append(
    h("div", { class: "card" },
      h("div", { class: "setrow" }, h("span", {}, "arbeitstage"), h("div", { class: "seg seg-s" }, [1, 2, 3, 4, 5, 6, 0].map((d) => h("button", { class: "seg-btn" + (p.workDays.includes(d) ? " on" : ""), onclick: () => upd({ workDays: p.workDays.includes(d) ? p.workDays.filter((x) => x !== d) : [...p.workDays, d] }) }, WEEKDAYS_SHORT[d])))),
      timeRow("kernzeit (geschäftlich) ab", p.workStart, (v) => upd({ workStart: v })),
      timeRow("kernzeit bis", p.workEnd, (v) => upd({ workEnd: v })),
      timeRow("frühester slot", p.dayStart, (v) => upd({ dayStart: v })),
      timeRow("spätester slot (feierabend)", p.dayEnd, (v) => upd({ dayEnd: v })),
      h("div", { class: "setrow" }, h("span", {}, "max. haupt-slots pro tag"), seg([[2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"]], Number(p.maxMainSlots), (v) => upd({ maxMainSlots: v }), { small: true }))
    )
  );

  // erholung
  main.append(h("div", { class: "label" }, "erholung"));
  main.append(
    h("div", { class: "card" },
      timeRow("mittagspause ab", p.lunchStart, (v) => upd({ lunchStart: v })),
      h("div", { class: "setrow" }, h("span", {}, "mittagspause"), seg([[0, "keine"], [30, "30"], [45, "45"], [60, "60 min"]], Number(p.lunchMinutes), (v) => upd({ lunchMinutes: v }), { small: true })),
      h("div", { class: "setrow" }, h("span", {}, "fokus-block max."), seg([[45, "45"], [60, "60"], [90, "90"], [120, "120 min"]], Number(p.focusMaxMinutes), (v) => upd({ focusMaxMinutes: v }), { small: true })),
      h("div", { class: "setrow" }, h("span", {}, "pause nach fokus"), seg([[0, "keine"], [10, "10"], [15, "15"], [20, "20 min"]], Number(p.breakAfterFocus), (v) => upd({ breakAfterFocus: v }), { small: true })),
      h("div", { class: "setrow" }, h("span", {}, "puffer um termine"), seg([[0, "0"], [10, "10"], [15, "15"], [30, "30 min"]], Number(p.bufferMinutes), (v) => upd({ bufferMinutes: v }), { small: true }))
    )
  );

  // themen
  main.append(h("div", { class: "label" }, "wochentags-themen"));
  main.append(
    h("div", { class: "card" },
      h("div", { class: "muted", style: { marginBottom: "6px" } }, "passende aufgaben werden an diesem tag bevorzugt (z.b. „orga“ → admin & kleinkram)."),
      [1, 2, 3, 4, 5, 6, 0].map((d) => h("div", { class: "setrow" }, h("span", {}, WEEKDAYS_SHORT[d]), h("input", { type: "text", value: p.themes?.[d] || "", placeholder: "kein thema", onchange: (e) => { p.themes = { ...p.themes, [d]: e.target.value.trim() }; upd({}); } })))
    )
  );

  // wetter
  main.append(h("div", { class: "label" }, "wetter & bewegung"));
  const placeIn = h("input", { type: "text", value: p.weather.place, placeholder: "ort, z.b. essen" });
  main.append(
    h("div", { class: "card" },
      h("div", { class: "setrow" }, h("span", {}, "wetter berücksichtigen"), seg([[true, "an"], [false, "aus"]], !!p.weather.enabled, (v) => { p.weather.enabled = v; upd({}); }, { small: true })),
      h("div", { class: "setrow" }, placeIn, h("button", { class: "btn btn-s btn-soft", onclick: async () => {
        try {
          const r = await geocode(placeIn.value.trim());
          Object.assign(p.weather, r, { enabled: true });
          save();
          await loadWeather(true);
          makePlan(todayISO());
          toast(`wetter für ${r.place} aktiv`);
          ctx.rerender();
        } catch {
          toast("ort nicht gefunden oder offline");
        }
      } }, "übernehmen")),
      h("div", { class: "faint" }, p.weather.lat != null ? `aktiv: ${p.weather.place} · quelle: Open-Meteo (kostenlos, ohne konto)` : "noch kein ort — ohne ort plant der praktikant ohne wetter."),
      h("div", { class: "setrow" }, h("span", {}, "sportziel pro woche"), seg([[2, "2×"], [3, "3×"], [4, "4×"], [5, "5×"]], Number(p.sportTargetPerWeek), (v) => upd({ sportTargetPerWeek: v }), { small: true }))
    )
  );

  // abend
  main.append(h("div", { class: "label" }, "abend-check-in"));
  main.append(
    h("div", { class: "card" },
      timeRow("uhrzeit", p.checkinTime, (v) => upd({ checkinTime: v })),
      h("div", { class: "setrow" }, h("span", {}, "mitteilung (wenn die app offen ist)"), h("button", { class: "btn btn-s btn-soft", onclick: async () => {
        if (!("Notification" in window)) return toast("dieser browser kann keine mitteilungen");
        const r = await Notification.requestPermission();
        p.notify = r === "granted";
        save();
        toast(p.notify ? "mitteilungen an" : "mitteilungen nicht erlaubt");
        ctx.rerender();
      } }, p.notify ? "an ✓" : "erlauben")),
      h("div", { class: "faint" }, "zuverlässige erinnerungen bei geschlossener app kommen mit der nativen mac/iphone-app.")
    )
  );

  // verbindungen
  main.append(h("div", { class: "label" }, "verbindungen"));
  const conns = [
    ["🎙️ diktat", "mikrofon im eingang (Web Speech). sonst: macOS-diktat (2× fn).", "funktioniert"],
    ["💬 WhatsApp", "chat exportieren (.txt) → im eingang ablegen. unbeantwortetes wird erkannt.", "import"],
    ["💼 WhatsApp Business", "export wie WhatsApp; dateiname mit „business“ → geschäftlich.", "import"],
    ["✉️ mail", ".eml ablegen oder mail-text einfügen. newsletter werden erkannt.", "import"],
    ["👥 Teams", "nachricht kopieren → eingang, quelle „Teams“.", "einfügen"],
    ["📅 kalender", ".ics importieren; plan als .ics zurück in deinen kalender.", "import/export"],
  ];
  main.append(
    h("div", { class: "conn" }, conns.map(([t, d, s]) => h("div", { class: "c" }, h("b", {}, t), h("div", { class: "muted" }, d), h("span", { class: "chip ok", style: { marginTop: "6px" } }, s)))),
    h("div", { class: "faint" }, "live-anbindung (automatisch alle neuen nachrichten holen) braucht ein backend bzw. die native app: WhatsApp Business API, Microsoft Graph (Teams/Outlook), IMAP/Gmail, EventKit. ist geplant — siehe anforderungen-v2.md. die app sendet und bezahlt nie selbst.")
  );

  // daten
  main.append(h("div", { class: "label" }, "daten"));
  const importIn = h("input", { type: "file", accept: "application/json,.json", class: "hidden", onchange: async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      replaceAll(JSON.parse(await f.text()));
      toast("daten importiert");
      ctx.rerender();
    } catch {
      toast("datei konnte nicht gelesen werden");
    }
  } });
  main.append(
    h("div", { class: "row wrap" },
      h("button", { class: "btn btn-line btn-s", onclick: () => download(`mein-praktikant-${todayISO()}.json`, JSON.stringify(db(), null, 2), "application/json") }, "backup exportieren"),
      h("label", { class: "btn btn-line btn-s" }, "backup importieren", importIn),
      db().demo
        ? h("button", { class: "btn btn-line btn-s", onclick: () => { if (confirm("beispieldaten löschen? (profil bleibt)")) { clearDemo(); makePlan(todayISO()); toast("beispieldaten entfernt"); ctx.go("heute"); } } }, "beispieldaten löschen")
        : h("button", { class: "btn btn-line btn-s", onclick: () => { loadDemo(); makePlan(todayISO()); toast("beispieldaten geladen"); ctx.go("heute"); } }, "beispieldaten laden"),
      h("button", { class: "btn btn-danger btn-s", onclick: () => { if (confirm("wirklich alles löschen und neu starten?")) { resetAll(); ctx.go("heute"); } } }, "alles zurücksetzen")
    ),
    h("div", { class: "faint" }, "alles liegt lokal in diesem browser. die v0.4-beta (strom/kompass/verlauf) bleibt unberührt.")
  );
}

function timeRow(label, value, onChange) {
  return h("div", { class: "setrow" }, h("span", {}, label), h("input", { type: "time", value, onchange: (e) => e.target.value && onChange(e.target.value) }));
}
