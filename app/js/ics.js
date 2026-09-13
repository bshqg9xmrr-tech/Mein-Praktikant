// ics.js — echter, funktionierender kalender-export (RFC-5545 .ics),
// kein backend nötig. macOS/iOS/Google/Outlook können .ics-dateien
// importieren bzw. per doppelklick öffnen.

function pad(n) {
  return String(n).padStart(2, "0");
}

function toICSDateTime(dateISO, timeHHMM) {
  const [h, m] = (timeHHMM || "09:00").split(":").map(Number);
  const d = new Date(dateISO + "T00:00:00");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
}

function escapeText(s) {
  return String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
}

export function buildICS(tasks, { areasById } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//mein praktikant//todo-export//DE",
    "CALSCALE:GREGORIAN",
  ];

  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  for (const t of tasks) {
    if (!t.scheduledTime) continue; // nur eingeplante aufgaben werden exportiert
    const start = toICSDateTime(t.date, t.scheduledTime);
    const minutes = t.estimatedMinutes || 30;
    const startDate = new Date(t.date + "T" + t.scheduledTime + ":00");
    const endDate = new Date(startDate.getTime() + minutes * 60000);
    const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
    const areaName = areasById?.[t.areaId]?.name;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@mein-praktikant`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(t.title)}`,
      areaName ? `CATEGORIES:${escapeText(areaName)}` : null,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export function downloadICS(tasks, areasById, filename = "mein-praktikant-heute.ics") {
  const content = buildICS(tasks, { areasById });
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
