// ics.js — echter kalender-export (RFC 5545). die .ics-datei lässt sich in
// apple-kalender, outlook und google kalender per doppelklick übernehmen.

const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");

function stamp(dateISO, min) {
  return `${dateISO.replace(/-/g, "")}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
}

export function planToICS(dateISO, slots) {
  const now = new Date();
  const dt = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//mein praktikant//tagesplan//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const s of slots) {
    if (!["task", "sport", "batch"].includes(s.kind)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${dateISO}-${s.taskId || s.habitId || s.kind + s.start}@mein-praktikant`,
      `DTSTAMP:${dt}`,
      `DTSTART:${stamp(dateISO, s.start)}`,
      `DTEND:${stamp(dateISO, s.end)}`,
      `SUMMARY:${esc((s.kind === "sport" ? "🏃 " : "") + s.title)}`,
      `DESCRIPTION:${esc((s.items ? s.items.map((i) => "• " + i.title).join("\n") + "\n" : "") + "geplant von mein praktikant · " + (s.reason || ""))}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function download(filename, content, type = "text/calendar;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
