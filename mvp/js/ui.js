// ui.js — kleine dom-helfer, toast, modal, icons.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) sk.startsWith("--") ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const ICON = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

export function icon(name, cls = "ico") {
  return h("span", { class: cls, html: ICON[name] || "" });
}

let toastTimer = null;
export function toast(msg, { action, onAction, ms = 3800 } = {}) {
  document.querySelector(".toast")?.remove();
  clearTimeout(toastTimer);
  const el = h(
    "div",
    { class: "toast", role: "status" },
    h("span", { class: "toast-msg" }, msg),
    action ? h("button", { class: "toast-action", onclick: () => { onAction?.(); el.remove(); } }, action) : null
  );
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), ms);
}

export function openModal(title, content, { onClose } = {}) {
  const close = () => {
    back.remove();
    onClose?.();
  };
  const back = h(
    "div",
    { class: "modal-back", onclick: (e) => e.target === back && close() },
    h("div", { class: "modal", role: "dialog", "aria-label": title }, h("div", { class: "modal-head" }, h("h2", {}, title), h("button", { class: "btn-icon", "aria-label": "schließen", onclick: close, html: ICON.close })), content)
  );
  document.body.append(back);
  return close;
}

/** segment-auswahl (antippen statt tippen) */
export function seg(options, value, onPick, { small = false } = {}) {
  return h(
    "div",
    { class: "seg" + (small ? " seg-s" : "") },
    options.map(([v, label]) =>
      h("button", { class: "seg-btn" + (v === value ? " on" : ""), type: "button", onclick: () => onPick(v) }, label)
    )
  );
}

export function progressBar(value, color) {
  return h("div", { class: "bar" }, h("div", { class: "bar-fill", style: { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color || "" } }));
}

export const URGENCY = {
  heute: { label: "heute", dot: "🔴" },
  woche: { label: "diese woche", dot: "🟡" },
  spaeter: { label: "später", dot: "⚪" },
  info: { label: "zur info", dot: "🟢" },
};

export const ENERGY_LABEL = {
  fokus: "🎯 fokus",
  kreativ: "✨ kreativ",
  routine: "🧾 routine",
  kommunikation: "💬 kommunikation",
  bewegung: "🏃 bewegung",
};

export const CONTEXT_LABEL = { privat: "privat", geschaeftlich: "geschäftlich" };
