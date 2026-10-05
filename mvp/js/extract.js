// extract.js — regelbasierte einordnung von diktat, notizen und nachrichten.
// WICHTIG: das ist bewusst KEINE ki, sondern eine nachvollziehbare
// stichwort-heuristik. die ui kennzeichnet das ("regelbasiert — keine echte ki")
// und jeder vorschlag muss bestätigt werden. später ersetzbar durch die
// hybride ki-schicht (architecture.md §2.1).

import { parseDue, parseTime, todayISO, diffDays } from "./dates.js";

export const SOURCES = {
  notiz: { label: "notiz", context: null },
  diktat: { label: "diktat", context: null },
  whatsapp: { label: "WhatsApp", context: "privat" },
  "whatsapp-business": { label: "WhatsApp Business", context: "geschaeftlich" },
  mail: { label: "mail", context: "geschaeftlich" },
  teams: { label: "Teams", context: "geschaeftlich" },
  kalender: { label: "kalender", context: null },
};

export const KINDS = {
  todo: "todo",
  termin: "terminanfrage",
  admin: "admin",
  warten: "wartet auf",
  idee: "idee",
  info: "info",
};

export const ENERGY = {
  fokus: "fokus",
  kreativ: "kreativ",
  routine: "routine",
  kommunikation: "kommunikation",
  bewegung: "bewegung",
};

// stichwort muss am wortanfang stehen ("rwe" soll nicht in "verwendungszweck" treffen)
const reCache = new Map();
const has = (s, words) =>
  words.some((w) => {
    if (!reCache.has(w)) reCache.set(w, new RegExp(`(?:^|[^a-zäöüß])${w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    return reCache.get(w).test(s);
  });

const W = {
  kreativ: ["konzept", "idee", "ideen", "content", "reel", "post ", "posting", "design", "gestalten", "brainstorm", "strategie", "entwurf", "skizze", "storyboard", "kreativ", "workshop vorbereiten"],
  fokus: ["angebot", "analyse", "kalkulation", "bericht", "auswertung", "präsentation", "ausarbeiten", "durcharbeiten", "lernen", "steuer", "auswerten", "vertrag prüfen", "recherche", "planen", "budget", "excel"],
  kommunikation: ["anrufen", "telefonieren", " call", "zurückrufen", "antworten", "rückmeldung", "nachfragen", "melden bei", "schreiben an", "mail an", "nachricht an", "absprechen", "abstimmen mit", "fragen ob"],
  admin: ["rechnung", "bezahlen", "überweis", "zahlung", "fällig", "mahnung", "iban", "kündig", "formular", "antrag", "elster", "steuerbescheid", "versicherung", "verifizier", "bestätigungslink", "lastschrift", "beitrag"],
  routine: ["bestellen", "buchen", "ablegen", "einkaufen", "aufräumen", "abholen", "drucken", "scannen", "sortieren", "putzen", "wäsche", "reservieren"],
  bewegung: ["sport", "laufen", "joggen", "gym", "training", "spazier", "yoga", "radfahren", "schwimmen", "workout", "fitness"],
  termin: ["termin", "treffen", "meeting", "call ", "zeit für", "passt dir", "passt es", "können wir uns", "wann hast du", "wann haben sie", "kurz sprechen", "besprechung", "verabreden", "kaffee trinken", "lust auf", "hast du zeit", "haben sie zeit", "bock auf", "sehen wir uns"],
  warten: ["warte auf", "wartet auf", "ich melde mich", "melde mich bis", "schicke ich dir", "schick dir", "sende ich ihnen", "kommt bis", "bekommst du bis", "erhalten sie bis"],
  idee: ["idee:", "idee für", "content-idee", "reel-idee", "könnte man mal", "wäre cool"],
  info: ["zur info", "fyi", "nur zur kenntnis", "newsletter", "abmelden", "unsubscribe", "nur kurz bescheid", "keine antwort nötig", "automatisch generiert", "noreply", "no-reply"],
  dringend: ["dringend", "asap", "sofort", "eilt", "heute noch", "bis heute", "frist heute", "letzte mahnung", "wichtig!", "notfall"],
  geschaeftlich: ["kunde", "kunden", "angebot", "projekt", "meeting", "team", "chef", "präsentation", "vertrieb", "firma", "büro", "kollege", "kollegin", "plenum", "tecis", "rwe", "auftrag", "akquise", "vertrag", "geschäft", "beratung", "mandant", "jour fixe"],
  privat: ["mama", "papa", "oma", "opa", "freund", "freundin", "krissi", "arzt", "zahnarzt", "einkaufen", "geburtstag", "wohnung", "familie", "urlaub", "party", "kino", "geschenk", "hochzeit", "stadtwerke", "miete", "telekom", "vodafone", "handyvertrag", "fitnessstudio", "rundfunk", "kfz"],
};

const FILLER = /^(also|und|ich muss|ich sollte|ich will|ich möchte|muss noch|noch|bitte|nicht vergessen[:,]?|todo[:,]?|außerdem|dann|ach ja|ah und)\s+/i;

/** zerlegt einen brain-dump in einzelne gedanken */
export function splitDump(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n|;|•|(?:^|\s)- |\.\s+(?=[a-zäöüA-ZÄÖÜ])|,?\s+(?:außerdem|und dann|und noch|ach ja|dann noch)\s+/i)
    .map((s) => s && s.trim().replace(/[.,]+$/, ""))
    .filter((s) => s && s.length > 2);
}

function cleanTitle(s) {
  let t = s.trim();
  for (let i = 0; i < 3; i++) t = t.replace(FILLER, "");
  t = t.replace(/\s+/g, " ");
  return shorten(t, 90);
}

function stripGreeting(s) {
  return s.replace(/^(hi|hey|hallo|moin|servus|guten (morgen|tag|abend)|liebe[rs]?|sehr geehrte[rs]?)\b[^,!.:]{0,40}[,!.:]\s*/i, "").trim();
}

function shorten(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ") > n * 0.6 ? cut.lastIndexOf(" ") : n).replace(/[,;:\s]+$/, "") + "…";
}

function parseMinutes(s) {
  let m = s.match(/(\d+(?:[,.]\d)?)\s*(std|stunden?|h)\b/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 60);
  m = s.match(/(\d+)\s*(min|minuten)\b/);
  if (m) return Number(m[1]);
  return null;
}

function extractAdmin(raw) {
  const meta = {};
  const amount = raw.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2})?)\s?(€|eur\b)/i) || raw.match(/(€|eur)\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i);
  if (amount) meta.amount = (amount[2] && /\d/.test(amount[2]) ? amount[2] : amount[1]) + " €";
  const iban = raw.match(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/);
  if (iban) meta.iban = iban[0].replace(/\s+/g, " ");
  const ref = raw.match(/(?:verwendungszweck|rechnungs-?nr\.?|rechnungsnummer|kundennummer)[:\s]+([A-Z0-9\-\/]+)/i);
  if (ref) meta.ref = ref[1];
  const link = raw.match(/https?:\/\/\S+/);
  if (link) meta.link = link[0];
  return meta;
}

/**
 * ordnet einen einzelnen gedanken / eine nachricht ein.
 * @param {string} raw
 * @param {{source?:string, from?:string, isMessage?:boolean, ref?:string}} opts
 */
export function classify(raw, opts = {}) {
  const ref = opts.ref || todayISO();
  const s = " " + raw.toLowerCase() + " ";
  const source = opts.source || "notiz";
  const reasons = [];

  // art
  let kind = "todo";
  if (has(s, W.info) && !has(s, W.dringend)) kind = "info";
  if (has(s, W.idee)) kind = "idee";
  if (has(s, W.admin)) kind = "admin";
  if (has(s, W.warten)) kind = "warten";
  if (kind !== "info" && has(s, W.termin) && (opts.isMessage || s.includes("?") || s.includes("termin"))) kind = kind === "admin" ? "admin" : "termin";
  if (opts.isMessage && kind === "todo" && !s.includes("?") && !/\b(kannst|könntest|bitte|brauche|schick|sende|erinner)/.test(s) && raw.length < 60) kind = "info";

  // energie
  let energy = "routine";
  if (has(s, W.bewegung)) energy = "bewegung";
  else if (has(s, W.kreativ) || kind === "idee") energy = "kreativ";
  else if (has(s, W.fokus)) energy = "fokus";
  else if (has(s, W.kommunikation) || kind === "termin" || (opts.isMessage && kind === "todo")) energy = "kommunikation";
  else if (has(s, W.admin) || has(s, W.routine)) energy = "routine";
  if (kind === "termin") energy = "kommunikation";

  // dauer
  const DEFAULT_MIN = { fokus: 60, kreativ: 45, routine: 20, kommunikation: 15, bewegung: 60 };
  const minutes = parseMinutes(s) || (kind === "admin" ? 15 : DEFAULT_MIN[energy]);

  // kontext
  let context = SOURCES[source]?.context || "privat";
  const ctxText = s + " " + (opts.from || "").toLowerCase();
  const biz = has(ctxText, W.geschaeftlich);
  const priv = has(ctxText, W.privat);
  if (biz && !priv) context = "geschaeftlich";
  else if (priv && !biz) context = "privat";
  if (biz !== priv) reasons.push(context === "geschaeftlich" ? "stichwort klingt geschäftlich" : "stichwort klingt privat");
  else if (SOURCES[source]?.context) reasons.push(`quelle ${SOURCES[source].label}`);

  // fälligkeit & dringlichkeit
  // bei terminanfragen ist das genannte datum der wunsch-termin, nicht die frist
  const due = kind === "termin" ? null : parseDue(s, ref);
  const time = parseTime(s);
  let urgency = "woche";
  if (has(s, W.dringend) || (due && diffDays(ref, due) <= 0)) {
    urgency = "heute";
    reasons.push(due ? "fällig heute" : "als dringend formuliert");
  } else if (due && diffDays(ref, due) <= 1) {
    urgency = "heute";
    reasons.push("fällig morgen — heute vorbereiten");
  } else if (kind === "termin") {
    urgency = "heute";
    reasons.push("terminanfrage — zeitnah antworten");
  } else if (kind === "info" || kind === "idee") {
    urgency = "info";
  } else if (due && diffDays(ref, due) > 7) {
    urgency = "spaeter";
  }

  let title = cleanTitle(raw.split(/\n/)[0]);
  if (opts.isMessage && opts.from) {
    const topic = shorten(stripGreeting(raw.replace(/\s+/g, " ")), 60);
    if (kind === "termin") title = `${opts.from}: terminanfrage — ${topic}`;
    else if (kind === "warten") title = `wartet auf ${opts.from}: ${topic}`;
    else if (kind === "admin") title = `${opts.from}: ${topic}`;
    else title = `${opts.from}: ${topic}`;
  }

  const meta = kind === "admin" ? extractAdmin(raw) : {};
  if (time !== null) meta.time = time;

  const status = kind === "warten" ? "waiting" : kind === "idee" ? "idea" : "inbox";

  return {
    title,
    raw: raw.trim(),
    source,
    from: opts.from || "",
    kind,
    energy,
    minutes,
    context,
    due,
    urgency,
    status,
    meta,
    reasons,
  };
}

/** brain-dump / notiz → mehrere einträge */
export function extractFromDump(text, opts = {}) {
  return splitDump(text).map((part) => classify(part, opts));
}

/** eine nachricht (mail/chat) → ein eintrag */
export function extractFromMessage(text, opts = {}) {
  return classify(text, { ...opts, isMessage: true });
}

/** einfacher, konkreter erster schritt für den hauptfokus */
export function firstStepFor(task) {
  if (task.firstStep) return task.firstStep;
  switch (task.energy) {
    case "kommunikation":
      return `nur die nachricht öffnen und den ersten satz schreiben`;
    case "fokus":
      return `10 minuten: datei öffnen und die gliederung notieren`;
    case "kreativ":
      return `5 minuten: 3 stichpunkte auf papier, ohne bewertung`;
    case "bewegung":
      return `sportsachen bereitlegen`;
    default:
      return task.kind === "admin" ? `unterlagen/link öffnen und betrag prüfen` : `die ersten 5 minuten — dann neu entscheiden`;
  }
}
