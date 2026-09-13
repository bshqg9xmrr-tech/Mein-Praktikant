// kompass.js — platzhalter für den neu gedachten "kompass"-bereich
// (ersetzt die bisherige, eigenständige "ziele"-ansicht, siehe
// architecture.md §2.2). WICHTIG: dies ist noch KEINE funktionale
// umsetzung — nur ein minimaler platzhalter, damit die neue 3-tab-
// navigation (strom/kompass/verlauf) vollständig funktioniert, ohne
// main.js zu brechen. die eigentliche befüllung (ziel-hierarchie
// jahr → monat → woche, ki-entwurf für die ebenen unter dem jahresziel,
// habit-verknüpfung) folgt als eigener, nächster umsetzungsschritt.
//
// die bisherige, voll funktionierende ziele-logik/-ansicht ist dafür
// unverändert vorhanden und wird dabei weiterverwendet: goals.js
// (datenmodell/effectiveProgress) bleibt exakt wie es ist, goals-view.js
// (bisherige UI) dient als ausgangspunkt/vorlage für die neue kompass-UI.

import { ICONS } from "./ui.js";

export function render() {
  const el = document.getElementById("view-kompass");
  el.innerHTML = `
    <h1>kompass</h1>
    <p class="subtitle">deine ziel-hierarchie — jahr → monat → woche</p>

    <div class="card" style="display:flex; gap:14px; align-items:flex-start;">
      <div style="width:36px; height:36px; border-radius:12px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        ${ICONS.sparkle}
      </div>
      <div>
        <div style="font-weight:700; font-size:13.5px;">kommt als nächstes</div>
        <div style="font-size:12.5px; color:var(--text-soft); margin-top:4px; line-height:1.5;">
          hier entsteht die neue ziel-ansicht: du setzt weiterhin nur das jahresziel selbst, monats- und wochenziele
          schlägt künftig eine lokale/ki-gestützte einordnung als entwurf vor, statt dass du jede ebene von hand
          anlegst (architecture.md §2.2/§4.1). noch nicht umgesetzt — dieser bereich ist bewusst nur ein platzhalter,
          damit die neue navigation schon vollständig funktioniert.
        </div>
      </div>
    </div>
  `;
}
