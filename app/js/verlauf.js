// verlauf.js — platzhalter für den neu gedachten "verlauf"-bereich
// (ersetzt die bisherigen, getrennten screens "übersicht" + tagebuch-liste
// + habit-historie, siehe architecture.md §2.2). WICHTIG: dies ist noch
// KEINE funktionale umsetzung — nur ein minimaler platzhalter, damit die
// neue 3-tab-navigation (strom/kompass/verlauf) vollständig funktioniert,
// ohne main.js zu brechen. die eigentliche befüllung (eine gemeinsame
// zeitachse aus erledigten todos, habit-konsistenz, tagebuch-stimmung und
// ziel-fortschritt) folgt als eigener, nächster umsetzungsschritt.
//
// die bisherige, voll funktionierende logik (echte, lokal berechnete
// kennzahlen) ist dafür unverändert vorhanden und dient als grundlage:
// overview.js (dashboard-kennzahlen), habits.js (streak-berechnung),
// journal.js (tagebuch-einträge) bleiben unangetastet bestehen.

import { ICONS } from "./ui.js";

export function render() {
  const el = document.getElementById("view-verlauf");
  el.innerHTML = `
    <h1>verlauf</h1>
    <p class="subtitle">eine gemeinsame zeitachse statt getrennter dashboards</p>

    <div class="card" style="display:flex; gap:14px; align-items:flex-start;">
      <div style="width:36px; height:36px; border-radius:12px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        ${ICONS.sparkle}
      </div>
      <div>
        <div style="font-weight:700; font-size:13.5px;">kommt als nächstes</div>
        <div style="font-size:12.5px; color:var(--text-soft); margin-top:4px; line-height:1.5;">
          hier entsteht ein gemeinsamer zeitstrahl aus erledigten todos, habit-konsistenz, tagebuch-stimmung und
          ziel-fortschritt statt der bisherigen getrennten übersicht-/tagebuch-/habit-screens (architecture.md §2.2).
          noch nicht umgesetzt — dieser bereich ist bewusst nur ein platzhalter, damit die neue navigation schon
          vollständig funktioniert.
        </div>
      </div>
    </div>
  `;
}
