// areas-ui.js — geteilte ui-bausteine für die bereiche-verwaltung.
// wird sowohl in den einstellungen (settings.js) als auch im onboarding
// (onboarding.js, architecture.md §4.12) genutzt, statt die
// hinzufügen/löschen-logik doppelt zu bauen.

import { Areas, Goals, Tasks, uid } from "./storage.js";
import { toast, openModal, closeModal } from "./ui.js";
import { AREA_COLOR_CHOICES } from "./colors.js";

// öffnet das "bereich hinzufügen"-modal. onAdded() wird nach dem
// erfolgreichen anlegen aufgerufen (z. b. um die aufrufende ansicht neu zu
// zeichnen) — der aufrufer entscheidet, was "neu zeichnen" bedeutet.
export function openAddAreaModal(onAdded) {
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
        onAdded();
      });
    },
  });
}

// löscht einen bereich (sofern er nirgends mehr referenziert wird).
// onDone() wird nur bei tatsächlicher löschung aufgerufen.
export function deleteArea(id, onDone) {
  const inUse = Goals.all().some((g) => g.areaId === id) || Tasks.all().some((t) => t.areaId === id);
  if (inUse) {
    toast("dieser bereich wird noch von zielen oder aufgaben genutzt — erst dort entfernen.");
    return;
  }
  Areas.remove(id);
  onDone();
}

// benennt einen bereich um — leere namen werden stillschweigend ignoriert
// (adhs-freundlich: kein blockierender fehlerdialog für so eine kleinigkeit).
export function renameArea(id, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  Areas.update(id, { name: trimmed });
}
