// notes.js — freie notizfunktion, siehe context.md §3.2.

import { Notes, uid, todayISO } from "./storage.js";
import { esc, ICONS } from "./ui.js";

export function render() {
  const el = document.getElementById("view-notes");
  const notes = [...Notes.all()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  el.innerHTML = `
    <h1>notizen</h1>
    <p class="subtitle">für spannende dinge, die du festhalten willst</p>

    <div class="card" style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="note-title" placeholder="titel">
      <textarea id="note-body" placeholder="text ..."></textarea>
      <button class="btn btn-primary" id="note-add">${ICONS.plus} notiz speichern</button>
    </div>

    <div class="list">
      ${notes.length ? notes.map(noteHtml).join("") : `<div class="empty-hint">noch keine notizen.</div>`}
    </div>
  `;

  el.querySelector("#note-add").addEventListener("click", () => {
    const title = el.querySelector("#note-title").value.trim();
    const body = el.querySelector("#note-body").value.trim();
    if (!title && !body) return;
    Notes.add({ id: uid("note"), title: title || "ohne titel", body, createdAt: todayISO() + "T" + new Date().toTimeString().slice(0, 5) });
    render();
  });

  el.querySelectorAll("[data-delete-note]").forEach((btn) =>
    btn.addEventListener("click", () => {
      Notes.remove(btn.dataset.deleteNote);
      render();
    })
  );
}

function noteHtml(n) {
  return `
    <div class="card" style="padding:14px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="font-weight:700; font-size:13.5px;">${esc(n.title)}</div>
        <button class="btn-icon" data-delete-note="${n.id}">${ICONS.trash}</button>
      </div>
      ${n.body ? `<div style="font-size:12.5px; color:var(--text-soft); margin-top:6px; white-space:pre-wrap;">${esc(n.body)}</div>` : ""}
    </div>`;
}
