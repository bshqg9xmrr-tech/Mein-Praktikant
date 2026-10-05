// importers.js — echte, offline funktionierende importe:
//  - WhatsApp-chat-export (.txt, iOS- und Android-format)
//  - mails als .eml bzw. eingefügter mail-text ("Von:/Betreff:")
//  - kalender als .ics (VEVENT, ohne wiederholungsregeln)
// live-anbindungen (WhatsApp Business API, Microsoft Graph, IMAP) brauchen
// ein backend bzw. die native app — siehe anforderungen-v2.md §4.

import { iso, todayISO, diffDays, toHHMM } from "./dates.js";

// ---------- WhatsApp ----------

const WA_IOS = /^‎?\[(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\]\s+([^:]+):\s?(.*)$/;
const WA_ANDROID = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})\s+-\s+([^:]+):\s?(.*)$/;

export function looksLikeWhatsApp(text) {
  const lines = text.split(/\n/).slice(0, 15);
  return lines.filter((l) => WA_IOS.test(l.trim()) || WA_ANDROID.test(l.trim())).length >= 2;
}

/**
 * parst einen chat-export und liefert die nachrichten der anderen person,
 * die nach der letzten eigenen nachricht kamen (= unbeantwortet), max. 7 tage alt.
 */
export function parseWhatsApp(text, selfName = "") {
  const msgs = [];
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/^‎/, "").trim();
    const m = line.match(WA_IOS) || line.match(WA_ANDROID);
    if (m) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      const date = iso(new Date(year, Number(m[2]) - 1, Number(m[1])));
      msgs.push({ date, time: `${m[4].padStart(2, "0")}:${m[5]}`, from: m[6].trim(), text: m[7] });
    } else if (msgs.length && line) {
      msgs[msgs.length - 1].text += "\n" + line;
    }
  }
  const real = msgs.filter((x) => !/(nachrichten und anrufe sind ende-zu-ende|messages and calls are end-to-end|bild weggelassen|image omitted|<medien ausgeschlossen>|<media omitted>)/i.test(x.text));
  const senders = [...new Set(real.map((x) => x.from))];
  const self = selfName.trim().toLowerCase();
  const isSelf = (name) => {
    const n = name.toLowerCase();
    return n === "du" || n === "you" || (self && (n === self || n.startsWith(self.split(" ")[0])));
  };
  const other = senders.find((n) => !isSelf(n)) || senders[0] || "kontakt";
  let lastSelf = -1;
  real.forEach((x, i) => isSelf(x.from) && (lastSelf = i));
  const pending = real.slice(lastSelf + 1).filter((x) => !isSelf(x.from) && diffDays(x.date, todayISO()) <= 7);
  return {
    contact: other,
    total: real.length,
    unanswered: pending,
    selfDetected: lastSelf >= 0,
  };
}

// ---------- mail ----------

function decodeQP(s) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function decodeHeader(v) {
  return v.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, cs, enc, data) => {
    try {
      if (enc.toUpperCase() === "B") return new TextDecoder(cs).decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
      const bytes = decodeQP(data.replace(/_/g, " "));
      return new TextDecoder(cs).decode(Uint8Array.from(bytes, (c) => c.charCodeAt(0)));
    } catch {
      return data;
    }
  });
}

function nameFromAddress(v) {
  const m = v.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
  if (m) return m[1].trim();
  return v.replace(/[<>]/g, "").split("@")[0].trim();
}

export function looksLikeMail(text) {
  return /^(from|von):\s/im.test(text.slice(0, 2000)) && /^(subject|betreff):\s/im.test(text.slice(0, 4000));
}

/** .eml oder eingefügter mail-text → { from, subject, body, date } */
export function parseMail(text) {
  const t = text.replace(/\r/g, "");
  const split = t.search(/\n\s*\n/);
  const head = split > 0 ? t.slice(0, split) : t;
  let body = split > 0 ? t.slice(split).trim() : "";
  const headers = {};
  head.replace(/\n[ \t]+/g, " ").split("\n").forEach((l) => {
    const m = l.match(/^([A-Za-zÄÖÜäöü-]+):\s*(.*)$/);
    if (m) headers[m[1].toLowerCase()] = decodeHeader(m[2]);
  });
  const ctype = headers["content-type"] || "";
  const boundary = ctype.match(/boundary="?([^";]+)"?/i)?.[1];
  if (boundary) {
    const parts = body.split("--" + boundary);
    const plain = parts.find((p) => /content-type:\s*text\/plain/i.test(p)) || parts.find((p) => /content-type:\s*text\/html/i.test(p)) || "";
    const sep = plain.search(/\n\s*\n/);
    const partHead = plain.slice(0, sep);
    body = plain.slice(sep).trim();
    if (/quoted-printable/i.test(partHead)) body = decodeQP(body);
    if (/base64/i.test(partHead)) {
      try {
        body = new TextDecoder("utf-8").decode(Uint8Array.from(atob(body.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
      } catch {}
    }
    if (/text\/html/i.test(partHead)) body = body.replace(/<[^>]+>/g, " ");
  } else if (/quoted-printable/i.test(headers["content-transfer-encoding"] || "")) {
    body = decodeQP(body);
  }
  // zitierte alt-mails abschneiden
  body = body.split(/\n(?:am .+ schrieb|on .+ wrote|-----\s*original|von:\s.+\n)/i)[0].replace(/\n{3,}/g, "\n\n").trim();
  const fromRaw = headers.from || headers.von || "";
  return {
    from: nameFromAddress(fromRaw),
    fromAddress: fromRaw,
    subject: headers.subject || headers.betreff || "(ohne betreff)",
    body: body.slice(0, 3000),
    automated: /no-?reply|newsletter|notification|benachrichtigung|mailer-daemon/i.test(fromRaw) || !!headers["list-unsubscribe"],
  };
}

// ---------- ics ----------

function icsDate(v) {
  const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?(Z)?/);
  if (!m) return null;
  let d;
  if (m[4] === undefined) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null };
  if (m[6]) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  else d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return { date: iso(d), time: toHHMM(d.getHours() * 60 + d.getMinutes()) };
}

export function looksLikeICS(text) {
  return /BEGIN:VCALENDAR/.test(text);
}

/** .ics → [{ title, date, start, end, allDay, recurring }] */
export function parseICS(text) {
  const unfolded = text.replace(/\r/g, "").replace(/\n[ \t]/g, "");
  const out = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (k) => body.match(new RegExp(`^${k}(?:;[^:]*)?:(.*)$`, "m"))?.[1];
    const s = icsDate(get("DTSTART") || "");
    if (!s) continue;
    const e = icsDate(get("DTEND") || "") || s;
    out.push({
      title: (get("SUMMARY") || "termin").replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\;/g, ";"),
      date: s.date,
      start: s.time || "00:00",
      end: e.time && e.date === s.date ? e.time : s.time ? toHHMM(Math.min(23 * 60 + 59, Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3)) + 60)) : "23:59",
      allDay: !s.time,
      recurring: !!get("RRULE"),
      location: (get("LOCATION") || "").replace(/\\,/g, ","),
    });
  }
  return out;
}
