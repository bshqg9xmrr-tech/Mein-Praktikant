// kompass.js — der "kompass"-bereich: die ziel-hierarchie als ein sich
// verjüngender pfad von oben (jahr) nach unten (woche), pro bereich
// (architecture.md §2.2/§4.1, ersetzt die bisherige, eigenständige
// "ziele"-ansicht aus goals-view.js). goals.js (datenmodell/
// effectiveProgress) bleibt unverändert die business-logik-grundlage,
// goals-view.js diente als vorlage/referenz für diese neue UI.

import { Areas, Goals, Habits, uid, todayISO } from "./storage.js";
import {
  LEVEL_LABEL,
  childrenOf,
  tasksOf,
  habitsOf,
  effectiveProgress,
  periodLabel,
  currentPeriodFor,
  createGoal,
  goalsForLevel,
} from "./goals.js";
import { esc, toast, openModal, closeModal, ICONS } from "./ui.js";

let selectedAreaId = null;

// default: der erste bereich mit einem jahresziel, sonst der erste
// bereich überhaupt (aufgabenstellung teil 4.1).
function ensureSelectedArea() {
  const areas = Areas.all();
  if (selectedAreaId && areas.find((a) => a.id === selectedAreaId)) return;
  const withYearGoal = areas.find((a) => Goals.all().some((g) => g.areaId === a.id && g.level === "year"));
  selectedAreaId = (withYearGoal || areas[0])?.id || null;
}

const ORIGIN_BADGE = {
  user_defined: { label: "von dir", cls: "pill-neutral" },
  ai_proposed: { label: "ki-vorschlag · offen", cls: "pill-badge-ai" },
  user_confirmed: { label: "ki-entwurf · bestätigt", cls: "pill-badge-confirmed" },
};

// ---------------------------------------------------------------------
// teil 2 der aufgabe: ein ganz einfacher, rein lokaler "ki-entwurf"-
// mechanismus. WICHTIG, wie überall im projekt klar zu kennzeichnen
// (siehe strom.js#classify() für dieselbe ehrlichkeits-konvention):
// das ist KEINE echte ki — kein sprachmodell, kein lernen, keine
// "intelligenz". es ist ein simpler, für jeden nachvollziehbarer
// textbaustein, der den titel des übergeordneten ziels übernimmt und
// leicht umformuliert. echtes "ki entwirft ziele" kommt erst mit der
// ki-schicht aus architecture.md §2.1 (BreakdownGoalUseCase) — bis
// dahin ist dies nur ein platzhalter, der zeigt, wie sich der
// bestätigen/ändern-flow schon heute anfühlen kann.
//
// pragmatische vereinfachung (bewusst, siehe CHANGELOG.md): die quartals-
// ebene wird von diesem entwurfs-mechanismus übersprungen — ein
// jahresziel ohne unterziele bekommt direkt einen monatsziel-vorschlag
// vorgeschlagen (kein automatischer quartalsziel-zwischenschritt). wer
// eine quartalsebene möchte, kann sie weiterhin manuell anlegen (die
// zugrundeliegende goals.js-logik unterstützt sie unverändert, siehe die
// bestehende tecis-kette in den seed-daten) — der einfache entwurfs-
// mechanismus selbst bildet nur "jahr → monat → woche" nach, um diesen
// ersten schritt bewusst klein zu halten (dasselbe prinzip wie das
// weglassen der `day`-ebene, siehe architecture.md §5).
const NEXT_PROPOSABLE_LEVEL = { year: "month", quarter: "month", month: "week" };

// review-korrektur (siehe CHANGELOG.md "review-korrekturen"): `LEVEL_LABEL`
// liefert nur das nomen selbst ("woche"/"monat") — für das zusammengesetzte
// "-ziel"-wort braucht "woche" ein zusätzliches "n" ("wochenziel"), eine
// simple konkatenation `${LEVEL_LABEL[level]}sziel` ergab für "week" das
// falsche "wochesziel". eigene, kleine map statt eines allgemeinen,
// fehleranfälligen suffix-regel-mechanismus für nur zwei werte.
const LEVEL_GOAL_LABEL = { month: "monatsziel", week: "wochenziel" };

function proposeSubGoal(parentGoal, level) {
  const suffix = level === "month" ? "schritt für diesen monat" : "schritt für diese woche";
  return Goals.add({
    id: uid("goal"),
    areaId: parentGoal.areaId,
    level,
    period: currentPeriodFor(level),
    parentId: parentGoal.id,
    title: `„${parentGoal.title}“ — ${suffix}`,
    manualProgress: 0,
    origin: "ai_proposed",
    createdAt: todayISO(),
  });
}

function handlePropose(goalId, level) {
  const parent = Goals.get(goalId);
  if (!parent) return;
  proposeSubGoal(parent, level);
  toast(`${LEVEL_GOAL_LABEL[level]} vorgeschlagen — lokaler entwurf, bitte prüfen.`);
  render();
}

function confirmDraft(goalId) {
  Goals.update(goalId, { origin: "user_confirmed" });
  toast("übernommen.");
  render();
}

function openEditDraftModal(goalId) {
  const goal = Goals.get(goalId);
  if (!goal) return;
  const html = `
    <h2>entwurf anpassen</h2>
    <p style="font-size:12.5px; color:var(--text-soft); margin:-4px 0 6px 0; line-height:1.5;">
      lokaler, einfacher entwurf — keine echte ki (siehe architecture.md §2.1). titel anpassen und übernehmen.
    </p>
    <label class="field">titel<input type="text" id="f-title" value="${esc(goal.title)}"></label>
    <div style="display:flex; gap:10px; margin-top:6px;">
      <button class="btn btn-secondary btn-block" id="modal-cancel">abbrechen</button>
      <button class="btn btn-primary btn-block" id="modal-save">übernehmen</button>
    </div>
  `;
  openModal(html, {
    onMount: (root) => {
      root.querySelector("#modal-cancel").addEventListener("click", closeModal);
      root.querySelector("#modal-save").addEventListener("click", () => {
        const title = root.querySelector("#f-title").value.trim();
        if (!title) {
          toast("bitte einen titel eintragen.");
          return;
        }
        Goals.update(goalId, { title, origin: "user_confirmed" });
        closeModal();
        toast("übernommen.");
        render();
      });
    },
  });
}

// ---------------------------------------------------------------------
// teil 3 der aufgabe: habit-verknüpfung sichtbar machen + zuweisen.

function openLinkHabitModal(goalId) {
  const goal = Goals.get(goalId);
  const habits = Habits.all();
  if (!goal) return;
  if (!habits.length) {
    toast("noch keine habits angelegt — leg zuerst eins in „verlauf“ an.");
    return;
  }
  const html = `
    <h2>habit verknüpfen</h2>
    <p style="font-size:12.5px; color:var(--text-soft); margin:-4px 0 6px 0; line-height:1.5;">
      verknüpft ein bestehendes habit mit „${esc(goal.title)}“ — seine konsistenz im zeitraum zählt danach mit in den fortschritt ein (architecture.md §4.6).
    </p>
    <label class="field">habit
      <select id="f-habit">
        ${habits
          .map((h) => {
            const already = h.goalId === goalId;
            const elsewhere = h.goalId && h.goalId !== goalId ? Goals.get(h.goalId) : null;
            return `<option value="${h.id}" ${already ? "selected" : ""}>${esc(h.name)}${elsewhere ? ` (aktuell: „${esc(elsewhere.title)}“)` : ""}</option>`;
          })
          .join("")}
      </select>
    </label>
    <div style="display:flex; gap:10px; margin-top:6px;">
      <button class="btn btn-secondary btn-block" id="modal-cancel">abbrechen</button>
      <button class="btn btn-primary btn-block" id="modal-save">verknüpfen</button>
    </div>
  `;
  openModal(html, {
    onMount: (root) => {
      root.querySelector("#modal-cancel").addEventListener("click", closeModal);
      root.querySelector("#modal-save").addEventListener("click", () => {
        const habitId = root.querySelector("#f-habit").value;
        Habits.update(habitId, { goalId });
        closeModal();
        toast("habit verknüpft.");
        render();
      });
    },
  });
}

function unlinkHabit(habitId) {
  if (!confirm("diese verknüpfung lösen? das habit selbst bleibt bestehen.")) return;
  Habits.update(habitId, { goalId: null });
  render();
}

function linkedItemsHtml(goal) {
  const tasks = tasksOf(goal.id);
  const habits = habitsOf(goal.id);
  const summary = `${tasks.length} todo${tasks.length === 1 ? "" : "s"} · ${habits.length} habit${habits.length === 1 ? "" : "s"} verlinkt`;
  const taskPills = tasks
    .map(
      (t) =>
        `<span class="pill pill-neutral" style="${t.done ? "opacity:.6; text-decoration:line-through;" : ""}">${esc(t.title)}</span>`
    )
    .join("");
  const habitPills = habits
    .map(
      (h) =>
        `<button class="pill pill-neutral" data-action="unlink-habit" data-habit="${h.id}" title="verknüpfung lösen">${esc(h.name)} &times;</button>`
    )
    .join("");
  return `
    <div style="margin-top:11px; border-top:1px solid var(--border); padding-top:10px;">
      <div class="section-label">${summary}</div>
      ${tasks.length || habits.length ? `<div class="chip-row" style="margin-top:7px; flex-wrap:wrap;">${taskPills}${habitPills}</div>` : ""}
      <button class="btn-ghost" data-action="link-habit" data-id="${goal.id}" style="padding-left:0; margin-top:6px;">+ habit verknüpfen</button>
    </div>`;
}

// ---------------------------------------------------------------------
// teil 1 der aufgabe: die pfad-darstellung selbst.

// bereichsfarbiger, sich verjüngender verbindungs-strich links (dicke
// nimmt mit der tiefe ab) — verbindet eine ebene visuell mit ihren
// kindern, ohne eine neue design-sprache zu erfinden (bestehende
// liquid-glass-variablen, siehe styles.css).
function connectorStyle(depth, area) {
  const width = Math.max(1, 4 - depth);
  const color = area ? area.color : "var(--border)";
  return `margin-left:${10 + depth * 4}px; padding-left:16px; border-left:${width}px solid ${color}; display:flex; flex-direction:column; gap:12px; margin-top:12px;`;
}

function goalCardHtml(goal, area, depth) {
  const badge = ORIGIN_BADGE[goal.origin] || ORIGIN_BADGE.user_defined;
  const isDraft = goal.origin === "ai_proposed";
  const progress = effectiveProgress(goal);
  const kids = childrenOf(goal.id).sort((a, b) => JSON.stringify(a.period).localeCompare(JSON.stringify(b.period)));
  const isLeaf = kids.length === 0;
  const nextLevel = NEXT_PROPOSABLE_LEVEL[goal.level];

  // die karten werden mit der tiefe kleiner ("verjüngender pfad", siehe
  // mockup) — jahr ist die größte karte, woche die kleinste.
  const pad = Math.max(12, 18 - depth * 2);
  const titleSize = Math.max(13, 19 - depth * 2);

  const childrenHtml = kids.length
    ? `<div style="${connectorStyle(depth, area)}">${kids.map((k) => goalCardHtml(k, area, depth + 1)).join("")}</div>`
    : "";

  // ui_guidelines.md §5: fortschrittsanzeigen sollen der prozentzahl eine
  // kurze text-entsprechung zur seite stellen, wo sich das natürlich
  // ergibt. bei einem blatt-ziel mit direkt verlinkten todos gibt es eine
  // konkrete "von X"-größe ("3 von 5 todos") — bei einem rein unterziel-
  // basierten fortschritt (kein blatt, oder ein blatt ganz ohne verlinkte
  // todos) fehlt diese größe, dort bleibt die prozentzahl allein sinnvoll
  // (review-korrektur, siehe CHANGELOG.md).
  const linkedTasksForProgress = isLeaf && !isDraft ? tasksOf(goal.id) : [];
  const doneLinkedTasksCount = linkedTasksForProgress.filter((t) => t.done).length;

  return `
    <div class="card ${isDraft ? "card-ai-draft" : ""}" data-goal-id="${goal.id}" style="padding:${pad}px;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
        <div style="min-width:0;">
          <div class="section-label">${LEVEL_LABEL[goal.level]} · ${esc(periodLabel(goal))}</div>
          <div style="font-weight:800; font-size:${titleSize}px; margin-top:3px; line-height:1.3;">${esc(goal.title)}</div>
        </div>
        <span class="pill ${badge.cls}" style="flex-shrink:0;">${badge.label}</span>
      </div>

      <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
        <div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${progress}%; background:${area ? area.color : "var(--accent)"};"></div></div>
        <div style="font-size:13px; font-weight:800; flex-shrink:0;">${progress}%</div>
      </div>
      ${
        linkedTasksForProgress.length
          ? `<div style="font-size:11px; color:var(--text-soft); margin-top:4px;">${doneLinkedTasksCount} von ${linkedTasksForProgress.length} todo${linkedTasksForProgress.length === 1 ? "" : "s"} erledigt</div>`
          : ""
      }

      ${
        isDraft
          ? `
        <div style="display:flex; gap:8px; margin-top:11px;">
          <button class="btn btn-secondary" data-action="edit-draft" data-id="${goal.id}" style="flex:1;">ändern</button>
          <button class="btn btn-primary" data-action="confirm-draft" data-id="${goal.id}" style="flex:1;">bestätigen</button>
        </div>
        <div class="ai-note" style="margin-top:7px;">lokaler entwurf · keine echte ki (architecture.md §2.1)</div>`
          : ""
      }

      ${!isDraft && isLeaf ? linkedItemsHtml(goal) : ""}
      ${
        !isDraft && isLeaf && nextLevel
          ? `<button class="btn-ghost" data-action="propose" data-id="${goal.id}" data-level="${nextLevel}" style="margin-top:8px; padding-left:0;">${ICONS.sparkle} ${LEVEL_GOAL_LABEL[nextLevel]} vorschlagen lassen</button>`
          : ""
      }
    </div>
    ${childrenHtml}
  `;
}

function openCreateYearGoalModal() {
  const area = Areas.all().find((a) => a.id === selectedAreaId);
  const html = `
    <h2>jahresziel für „${esc(area?.name || "")}“</h2>
    <label class="field">titel<input type="text" id="f-title" placeholder="z. b. neukunden-portfolio ausbauen"></label>
    <div style="display:flex; gap:10px; margin-top:6px;">
      <button class="btn btn-secondary btn-block" id="modal-cancel">abbrechen</button>
      <button class="btn btn-primary btn-block" id="modal-save">ziel anlegen</button>
    </div>
  `;
  openModal(html, {
    onMount: (root) => {
      root.querySelector("#modal-cancel").addEventListener("click", closeModal);
      root.querySelector("#modal-save").addEventListener("click", () => {
        const title = root.querySelector("#f-title").value.trim();
        if (!title) {
          toast("bitte einen titel eintragen.");
          return;
        }
        createGoal({ areaId: selectedAreaId, level: "year", title, period: currentPeriodFor("year"), parentId: null });
        closeModal();
        toast("jahresziel angelegt.");
        render();
      });
    },
  });
}

export function render() {
  ensureSelectedArea();
  const el = document.getElementById("view-kompass");
  const areas = Areas.all();
  const area = areas.find((a) => a.id === selectedAreaId) || null;
  const yearGoals = goalsForLevel("year", selectedAreaId).sort((a, b) => b.period.year - a.period.year);
  const yearGoal = yearGoals[0] || null;

  el.innerHTML = `
    <h1>kompass</h1>
    <p class="subtitle">jahresziel → ... → wochenziel — du setzt das jahresziel, alles darunter entwirft dir künftig ein einfacher vorschlag zum bestätigen/ändern</p>

    <div class="chip-row">
      ${areas
        .map(
          (a) => `<button class="pill ${a.id === selectedAreaId ? "pill-active" : "pill-neutral"}" data-area="${a.id}">
            ${a.id !== selectedAreaId ? `<span class="dot" style="background:${a.color}"></span>` : ""}${esc(a.name)}
          </button>`
        )
        .join("")}
    </div>

    <div id="kompass-path">
      ${
        yearGoal
          ? goalCardHtml(yearGoal, area, 0)
          : `
        <div class="card" style="display:flex; flex-direction:column; gap:10px; text-align:center; align-items:center; padding:26px 18px;">
          <div style="width:38px; height:38px; border-radius:13px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center;">${ICONS.sparkle}</div>
          <div style="font-weight:700; font-size:14px;">noch kein jahresziel im bereich „${esc(area?.name || "")}“</div>
          <div style="font-size:12.5px; color:var(--text-soft); line-height:1.5; max-width:340px;">leg dein jahresziel fest — alles darunter (monat, woche) kannst du dir danach als einfachen entwurf vorschlagen lassen.</div>
          <button class="btn btn-primary" id="create-year-goal-btn">${ICONS.plus} jahresziel für „${esc(area?.name || "diesen bereich")}“ festlegen</button>
        </div>`
      }
    </div>
  `;

  el.querySelectorAll("[data-area]").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedAreaId = btn.dataset.area;
      render();
    })
  );
  el.querySelector("#create-year-goal-btn")?.addEventListener("click", openCreateYearGoalModal);

  el.querySelectorAll('[data-action="confirm-draft"]').forEach((btn) =>
    btn.addEventListener("click", () => confirmDraft(btn.dataset.id))
  );
  el.querySelectorAll('[data-action="edit-draft"]').forEach((btn) =>
    btn.addEventListener("click", () => openEditDraftModal(btn.dataset.id))
  );
  el.querySelectorAll('[data-action="propose"]').forEach((btn) =>
    btn.addEventListener("click", () => handlePropose(btn.dataset.id, btn.dataset.level))
  );
  el.querySelectorAll('[data-action="link-habit"]').forEach((btn) =>
    btn.addEventListener("click", () => openLinkHabitModal(btn.dataset.id))
  );
  el.querySelectorAll('[data-action="unlink-habit"]').forEach((btn) =>
    btn.addEventListener("click", () => unlinkHabit(btn.dataset.habit))
  );
}
