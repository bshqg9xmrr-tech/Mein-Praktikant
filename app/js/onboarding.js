// onboarding.js — kurzer, überspringbarer zwei-schritte-wizard nach dem
// ersten login (architecture.md §4.12, context.md §3.10):
//   1. bereiche bestätigen/anpassen
//   2. avatar wählen
// läuft entweder als teil des login-gates (auth-gate.js, ganz am anfang)
// oder erneut, manuell aus den einstellungen heraus (settings.js) — in
// beiden fällen über dieselbe mount()-funktion in einen container gerendert.
// bewusst kurz gehalten, jederzeit überspringbar ("später"-link auf jedem
// schritt) — reibung senken, nicht erhöhen (claude.md §3.3).

import { Areas, getSettings, updateSettings } from "./storage.js";
import { esc, ICONS } from "./ui.js";
import { openAddAreaModal, deleteArea, renameArea } from "./areas-ui.js";
import { AVATARS } from "./avatars.js";

function areaRowHtml(a) {
  return `
    <div class="onboarding-area-row">
      <span class="dot" style="background:${a.color};"></span>
      <input type="text" class="onb-area-name" data-area-id="${a.id}" value="${esc(a.name)}">
      <button class="btn-icon" data-del-area="${a.id}" title="entfernen">${ICONS.trash}</button>
    </div>`;
}

function renderStep1(container, { onNext, onSkip }) {
  function draw() {
    const areas = Areas.all();
    container.innerHTML = `
      <div class="gate-wrap">
        <div class="gate-steps"><span class="dot active"></span><span class="dot"></span></div>
        <div class="gate-header">
          <div class="mark">MP</div>
          <h1>deine bereiche</h1>
          <p>so sind deine bereiche gerade benannt — passt das, oder lieber umbenennen/ergänzen? du kannst das jederzeit in den einstellungen ändern.</p>
        </div>
        <div class="card">
          <div id="onb-area-list">
            ${areas.map(areaRowHtml).join("") || `<div class="empty-hint">noch keine bereiche — leg gleich einen an.</div>`}
          </div>
          <button class="btn-ghost" id="onb-add-area" style="margin-top:8px;">${ICONS.plus} bereich hinzufügen</button>
        </div>
        <button class="btn btn-primary btn-block" id="onb-next">weiter</button>
        <button class="gate-skip" id="onb-skip" type="button">später — direkt zur app</button>
      </div>`;

    container.querySelectorAll(".onb-area-name").forEach((input) => {
      input.addEventListener("change", () => renameArea(input.dataset.areaId, input.value));
    });
    container.querySelectorAll("[data-del-area]").forEach((btn) => {
      btn.addEventListener("click", () => deleteArea(btn.dataset.delArea, draw));
    });
    container.querySelector("#onb-add-area").addEventListener("click", () => openAddAreaModal(draw));
    container.querySelector("#onb-next").addEventListener("click", onNext);
    container.querySelector("#onb-skip").addEventListener("click", onSkip);
  }
  draw();
}

function renderStep2(container, { selectedId, onSelect, onBack, onFinish, onSkip }) {
  function draw(current) {
    container.innerHTML = `
      <div class="gate-wrap">
        <div class="gate-steps"><span class="dot"></span><span class="dot active"></span></div>
        <div class="gate-header">
          <div class="mark">MP</div>
          <h1>wähl einen avatar</h1>
          <p>kein foto nötig — nur eine kleine, farbige markierung. macht dich später z. b. bei challenges wiedererkennbar.</p>
        </div>
        <div class="card">
          <div class="avatar-grid">
            ${AVATARS.map((a) => `<button type="button" class="avatar-pick ${a.id === current ? "selected" : ""}" data-avatar="${a.id}" title="diesen avatar wählen">${a.svg}</button>`).join("")}
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary btn-block" id="onb-back">zurück</button>
          <button class="btn btn-primary btn-block" id="onb-finish">fertig</button>
        </div>
        <button class="gate-skip" id="onb-skip" type="button">später — direkt zur app</button>
      </div>`;

    container.querySelectorAll("[data-avatar]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onSelect(btn.dataset.avatar);
        draw(btn.dataset.avatar);
      });
    });
    container.querySelector("#onb-back").addEventListener("click", onBack);
    container.querySelector("#onb-finish").addEventListener("click", onFinish);
    container.querySelector("#onb-skip").addEventListener("click", onSkip);
  }
  draw(selectedId);
}

// rendert den wizard in `container` (überschreibt dessen innerHTML komplett,
// wie die anderen views es auch tun). ruft onFinish() auf, sobald der
// wizard abgeschlossen oder übersprungen wurde — in beiden fällen ist
// `onboardingCompletedAt` danach gesetzt, der wizard erscheint also nicht
// automatisch erneut (siehe auth-gate.js).
export function mount(container, { onFinish }) {
  let selectedAvatarId = getSettings().avatarId || null;

  function finish() {
    updateSettings({ onboardingCompletedAt: new Date().toISOString() });
    onFinish();
  }

  function goStep1() {
    renderStep1(container, { onNext: goStep2, onSkip: finish });
  }
  function goStep2() {
    renderStep2(container, {
      selectedId: selectedAvatarId,
      onSelect: (id) => (selectedAvatarId = id),
      onBack: goStep1,
      onFinish: () => {
        updateSettings({ avatarId: selectedAvatarId });
        finish();
      },
      onSkip: finish,
    });
  }
  goStep1();
}

// öffnet den wizard "standalone" (z. b. erneut aus den einstellungen
// heraus) — blendet #app kurz aus und #gate-root ein, genau wie das
// login-gate es tut, aber ohne dass dafür ein neuer login nötig wäre.
// onClosed() wird aufgerufen, sobald der wizard fertig/übersprungen wurde
// und die normale app wieder sichtbar ist.
export function openStandalone(onClosed) {
  const appEl = document.getElementById("app");
  const gate = document.getElementById("gate-root");
  appEl.classList.add("hidden");
  gate.classList.remove("hidden");
  mount(gate, {
    onFinish: () => {
      gate.classList.add("hidden");
      gate.innerHTML = "";
      appEl.classList.remove("hidden");
      onClosed?.();
    },
  });
}
