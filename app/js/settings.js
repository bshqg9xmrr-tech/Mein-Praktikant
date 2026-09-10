// settings.js — siehe context.md §3.8. alles hier ist echt verdrahtet
// (kein platzhalter): bereiche, ziel-parameter, planungs-defaults,
// beta-feedback (mailto), datenexport/-import.

import { Areas, Goals, Tasks, getSettings, updateSettings, uid, resetAll, replaceAll } from "./storage.js";
import { esc, toast, openModal, closeModal, ICONS } from "./ui.js";
import * as cloud from "./cloud.js";

let cloudListenerAttached = false;

const AREA_COLOR_CHOICES = ["#f2895f", "#2fa8a0", "#8b6fe8", "#8891a8", "#5fb587", "#e0964f", "#c98bd8", "#4e9ee0"];

function toggleHtml(id, on) {
  return `<button class="toggle ${on ? "on" : "off"}" data-toggle="${id}"><div class="knob"></div></button>`;
}

function stepper(id, value, min = 1, max = 9) {
  return `
    <div class="stepper">
      <button data-step="${id}" data-dir="-1" ${value <= min ? "disabled" : ""}>−</button>
      <span class="val">${value}</span>
      <button data-step="${id}" data-dir="1" ${value >= max ? "disabled" : ""}>+</button>
    </div>`;
}

function openAddAreaModal() {
  const html = `
    <h2>bereich hinzufügen</h2>
    <label class="field">name<input type="text" id="area-name" placeholder="z. b. familie"></label>
    <label class="field">farbe
      <div class="chip-row">
        ${AREA_COLOR_CHOICES.map((c, i) => `<button data-color="${c}" class="btn-icon" style="background:${c}; border:2px solid ${i === 0 ? "var(--text)" : "transparent"};"></button>`).join("")}
      </div>
    </label>
    <div style="display:flex; gap:10px; margin-top:6px;">
      <button class="btn btn-secondary btn-block" id="cancel">abbrechen</button>
      <button class="btn btn-primary btn-block" id="save">hinzufügen</button>
    </div>`;
  let color = AREA_COLOR_CHOICES[0];
  openModal(html, {
    onMount: (root) => {
      root.querySelectorAll("[data-color]").forEach((btn) =>
        btn.addEventListener("click", () => {
          color = btn.dataset.color;
          root.querySelectorAll("[data-color]").forEach((b) => (b.style.border = "2px solid transparent"));
          btn.style.border = "2px solid var(--text)";
        })
      );
      root.querySelector("#cancel").addEventListener("click", closeModal);
      root.querySelector("#save").addEventListener("click", () => {
        const name = root.querySelector("#area-name").value.trim();
        if (!name) return toast("bitte einen namen eintragen.");
        Areas.add({ id: uid("area"), name, color, order: Areas.all().length });
        closeModal();
        render();
      });
    },
  });
}

function deleteArea(id) {
  const inUse = Goals.all().some((g) => g.areaId === id) || Tasks.all().some((t) => t.areaId === id);
  if (inUse) {
    toast("dieser bereich wird noch von zielen oder aufgaben genutzt — erst dort entfernen.");
    return;
  }
  Areas.remove(id);
  render();
}

function exportData() {
  const raw = localStorage.getItem("mein-praktikant-db-v1");
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mein-praktikant-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      replaceAll(parsed);
      toast("daten importiert.");
      onDone();
    } catch (e) {
      toast("konnte die datei nicht lesen — ist es ein gültiger export?");
    }
  };
  reader.readAsText(file);
}

function cloudSyncCardHtml() {
  const cfg = cloud.getConfig();
  const st = cloud.getStatus();
  const configured = cloud.isConfigured();

  if (!configured) {
    return `
    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">cloud-sync (mac ⇄ iphone ⇄ web)</div>
      <div style="font-size:12px; color:var(--text-soft); line-height:1.5; margin-bottom:10px;">
        ohne cloud-sync bleiben deine daten nur auf diesem gerät. um dieselben daten auf mehreren geräten zu sehen,
        ein kostenloses <a href="https://supabase.com" target="_blank" rel="noopener">supabase</a>-projekt anlegen
        (siehe <code>app/CLOUD_SETUP.md</code> im repo) und hier url + anon-key eintragen.
      </div>
      <label class="field">supabase-projekt-url<input type="text" id="cloud-url" placeholder="https://xxxx.supabase.co" value="${esc(cfg.url)}"></label>
      <label class="field">anon-key<input type="text" id="cloud-key" placeholder="eyJ..." value="${esc(cfg.anonKey)}"></label>
      <button class="btn btn-primary btn-block" id="cloud-save-config" style="margin-top:8px;">speichern</button>
    </div>`;
  }

  if (!st.email) {
    return `
    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">cloud-sync (mac ⇄ iphone ⇄ web)</div>
      <div style="font-size:12px; color:var(--text-soft); line-height:1.5; margin-bottom:10px;">
        eingerichtet, aber noch nicht angemeldet. e-mail eintragen und den login-link öffnen, der dir zugeschickt wird —
        auf jedem gerät mit derselben e-mail-adresse, dann sehen alle geräte dieselben daten.
      </div>
      <label class="field">e-mail<input type="email" id="cloud-email" placeholder="du@beispiel.de"></label>
      <button class="btn btn-primary btn-block" id="cloud-send-link" style="margin-top:8px;">login-link senden</button>
      <button class="btn-ghost" id="cloud-forget-config" style="margin-top:8px;">projekt-daten entfernen</button>
    </div>`;
  }

  const lastSync = st.lastSyncAt ? new Date(st.lastSyncAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "noch nie";
  return `
    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">cloud-sync (mac ⇄ iphone ⇄ web)</div>
      <div class="settings-row"><span class="label">angemeldet als</span><span style="font-weight:700;">${esc(st.email)}</span></div>
      <div class="settings-row"><span class="label">${st.syncing ? "synchronisiert…" : "zuletzt synchronisiert"}</span><span>${st.syncing ? "" : lastSync}</span></div>
      ${st.lastError ? `<div style="font-size:11.5px; color:var(--danger-text); margin-top:4px;">fehler: ${esc(st.lastError)}</div>` : ""}
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-secondary btn-block" id="cloud-sync-now">jetzt synchronisieren</button>
        <button class="btn-ghost" id="cloud-sign-out">abmelden</button>
      </div>
    </div>`;
}

export function render() {
  const el = document.getElementById("view-settings");
  const s = getSettings();
  const areas = Areas.all();

  el.innerHTML = `
    <h1>einstellungen</h1>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">bereiche</div>
      ${areas
        .map(
          (a) => `<div class="settings-row">
            <span class="label" style="display:flex; align-items:center; gap:8px;"><span class="dot" style="background:${a.color}"></span>${esc(a.name)}</span>
            <button class="btn-icon" data-del-area="${a.id}">${ICONS.trash}</button>
          </div>`
        )
        .join("")}
      <button class="btn-ghost" id="add-area" style="margin-top:8px;">${ICONS.plus} bereich hinzufügen</button>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">ziele</div>
      <div class="settings-row"><span class="label">wochenziele pro woche</span>${stepper("weeklyGoalCount", s.weeklyGoalCount, 1, 6)}</div>
      <div class="settings-row"><span class="label">hauptziele pro monat</span>${stepper("monthlyGoalCount", s.monthlyGoalCount, 1, 8)}</div>
      <div class="settings-row">
        <span class="label">wochenstart</span>
        <div style="display:flex; gap:6px;">
          <button class="pill ${s.weekStart === "mon" ? "pill-active" : "pill-neutral"}" data-week-start="mon">montag</button>
          <button class="pill ${s.weekStart === "sun" ? "pill-active" : "pill-neutral"}" data-week-start="sun">sonntag</button>
        </div>
      </div>
      <div style="font-size:10.5px; color:var(--text-faint); margin-top:8px;">hinweis: die kalenderwochen-berechnung selbst folgt dem iso-standard (immer montag) — die einstellung hier steuert bisher nur die anzeige.</div>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">planung &amp; kalender</div>
      <div class="settings-row"><span class="label">tagesstart für automatische planung</span><span style="font-weight:700;">${s.dayStartHour}:00</span></div>
      <div class="settings-row"><span class="label">standard-dauer je aufgabe</span><span style="font-weight:700;">${s.defaultTaskMinutes} min</span></div>
      <div class="settings-row"><span class="label">pausenlänge nach 2 aufgaben</span><span style="font-weight:700;">${s.breakMinutes} min</span></div>
      <div class="settings-row">
        <div><span class="label">automatischer kalender-export</span><div class="sub">.ics direkt nach der planung herunterladen</div></div>
        ${toggleHtml("calendarAutoExport", s.calendarAutoExport)}
      </div>
    </div>

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">diktat &amp; ki</div>
      <div style="font-size:12px; color:var(--text-soft); line-height:1.5;">
        Wispr Flow, automatische ziel-/aufgaben-vorschläge und der ki-coach im tagebuch sind noch nicht angebunden — offene punkte dazu stehen in <code>context.md</code> §7 im repo.
      </div>
    </div>

    ${cloudSyncCardHtml()}

    <div class="card">
      <div class="section-label" style="margin-bottom:10px;">daten</div>
      <div class="settings-row"><span class="label">daten exportieren</span><button class="btn-ghost" id="export-data">herunterladen</button></div>
      <div class="settings-row">
        <span class="label">daten importieren</span>
        <label class="btn-ghost" style="cursor:pointer;">datei wählen<input type="file" id="import-data" accept="application/json" style="display:none;"></label>
      </div>
      <div class="settings-row"><span class="label" style="color:var(--danger-text);">alle daten zurücksetzen</span><button class="btn-danger" id="reset-data">zurücksetzen</button></div>
    </div>

    <div class="card" style="background:linear-gradient(155deg, rgba(82,96,242,0.14), rgba(82,96,242,0.04)); border-color: rgba(82,96,242,0.22); display:flex; align-items:center; gap:14px;">
      <div style="width:42px; height:42px; border-radius:14px; background:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff;">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      </div>
      <div style="flex:1;">
        <div style="font-weight:700; font-size:13.5px;">du nutzt die beta-version</div>
        <div style="font-size:11.5px; color:var(--text-soft); margin-top:2px;">fehler, ideen oder was dich stört — immer willkommen.</div>
      </div>
      <a class="btn btn-primary" id="feedback-link" href="#">feedback</a>
    </div>
  `;

  el.querySelector("#feedback-link").href =
    `mailto:${s.feedbackEmail}?subject=${encodeURIComponent("Feedback: Mein Praktikant (Beta)")}&body=${encodeURIComponent("Hi,\n\nmir ist folgendes aufgefallen:\n\n")}`;

  el.querySelector("#add-area").addEventListener("click", openAddAreaModal);
  el.querySelectorAll("[data-del-area]").forEach((btn) => btn.addEventListener("click", () => deleteArea(btn.dataset.delArea)));

  el.querySelectorAll("[data-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggle;
      updateSettings({ [key]: !getSettings()[key] });
      render();
    })
  );
  el.querySelectorAll("[data-step]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const key = btn.dataset.step;
      const dir = Number(btn.dataset.dir);
      updateSettings({ [key]: Math.max(1, (getSettings()[key] || 0) + dir) });
      render();
    })
  );
  el.querySelectorAll("[data-week-start]").forEach((btn) =>
    btn.addEventListener("click", () => {
      updateSettings({ weekStart: btn.dataset.weekStart });
      render();
    })
  );

  el.querySelector("#export-data").addEventListener("click", exportData);
  el.querySelector("#import-data").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importData(file, render);
  });
  el.querySelector("#reset-data").addEventListener("click", () => {
    if (confirm("wirklich alle daten löschen und auf die beispieldaten zurücksetzen?")) {
      resetAll();
      render();
    }
  });

  const saveConfigBtn = el.querySelector("#cloud-save-config");
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener("click", () => {
      const url = el.querySelector("#cloud-url").value.trim();
      const key = el.querySelector("#cloud-key").value.trim();
      if (!url || !key) return toast("bitte url und anon-key eintragen.");
      cloud.setConfig(url, key);
      cloud.start();
      toast("gespeichert.");
      render();
    });
  }
  const forgetBtn = el.querySelector("#cloud-forget-config");
  if (forgetBtn) {
    forgetBtn.addEventListener("click", () => {
      cloud.clearConfig();
      render();
    });
  }
  const sendLinkBtn = el.querySelector("#cloud-send-link");
  if (sendLinkBtn) {
    sendLinkBtn.addEventListener("click", async () => {
      const email = el.querySelector("#cloud-email").value.trim();
      if (!email) return toast("bitte e-mail-adresse eintragen.");
      try {
        await cloud.requestMagicLink(email);
        toast(`login-link an ${email} geschickt — dort öffnen.`);
      } catch (e) {
        toast(`fehler: ${e.message}`);
      }
    });
  }
  const syncNowBtn = el.querySelector("#cloud-sync-now");
  if (syncNowBtn) {
    syncNowBtn.addEventListener("click", async () => {
      try {
        await cloud.syncNow();
        toast("synchronisiert.");
        render();
      } catch (e) {
        toast(`fehler: ${e.message}`);
      }
    });
  }
  const signOutBtn = el.querySelector("#cloud-sign-out");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await cloud.signOut();
      render();
    });
  }

  if (!cloudListenerAttached) {
    cloudListenerAttached = true;
    cloud.onStatusChange(() => {
      if (!document.getElementById("view-settings").classList.contains("hidden")) render();
    });
  }
}
