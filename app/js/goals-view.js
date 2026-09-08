// goals-view.js — ziele-screen: baumdarstellung jahr -> quartal -> monat
// -> woche -> (verlinkte tasks), pro bereich. das ist die direkte
// umsetzung von "langfristige ziele in kurzfristige ziele ableiten":
// jedes neue ziel wird bewusst an ein übergeordnetes ziel gehängt, und
// der fortschritt läuft automatisch von unten nach oben zusammen
// (siehe goals.js: effectiveProgress()).

import { Areas, Goals, getSettings, isoWeekOf } from "./storage.js";
import {
  LEVELS,
  LEVEL_LABEL,
  PARENT_LEVEL,
  childrenOf,
  tasksOf,
  effectiveProgress,
  isDerived,
  periodLabel,
  currentPeriodFor,
  possibleParents,
  softLimitWarning,
  createGoal,
  deleteGoalCascade,
} from "./goals.js";
import { esc, toast, openModal, closeModal, ICONS } from "./ui.js";

let selectedAreaId = null;

function ensureSelectedArea() {
  const areas = Areas.all();
  if (!selectedAreaId || !areas.find((a) => a.id === selectedAreaId)) {
    selectedAreaId = areas[0]?.id || null;
  }
}

function progressColor(area) {
  return area ? area.color : "var(--accent)";
}

function goalNodeHtml(goal, area, depth) {
  const progress = effectiveProgress(goal);
  const derived = isDerived(goal);
  const kids = childrenOf(goal.id);
  const linkedTasks = goal.level === "week" ? tasksOf(goal.id) : [];

  const childrenHtml = kids
    .sort((a, b) => JSON.stringify(a.period).localeCompare(JSON.stringify(b.period)))
    .map((k) => goalNodeHtml(k, area, depth + 1))
    .join("");

  const taskRowsHtml = linkedTasks.length
    ? `<div style="margin-top:8px; display:flex; flex-direction:column; gap:5px;">
        ${linkedTasks
          .map(
            (t) => `<div style="display:flex; align-items:center; gap:7px; font-size:11.5px; color:${t.done ? "var(--text-faint)" : "var(--text)"};">
              <span style="width:12px;height:12px;border-radius:50%;flex-shrink:0;${t.done ? `background:var(--success)` : `border:1.5px solid var(--text-faint)`}"></span>
              <span style="${t.done ? "text-decoration:line-through;" : ""}">${esc(t.title)}</span>
            </div>`
          )
          .join("")}
      </div>`
    : "";

  return `
    <div style="margin-left:${depth * 18}px; ${depth > 0 ? "border-left:2px solid var(--border); padding-left:14px;" : ""} margin-top:10px;">
      <div class="goal-row" data-goal-id="${goal.id}">
        <div class="info">
          <div class="title">${esc(goal.title)}</div>
          <div class="meta">${LEVEL_LABEL[goal.level]} · ${esc(periodLabel(goal))}${derived ? " · abgeleitet" : " · manuell gesetzt"}</div>
          <div class="progress-track" style="margin-top:7px;"><div class="progress-fill" style="width:${progress}%; background:${progressColor(area)};"></div></div>
          ${taskRowsHtml}
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:15px; font-weight:800;">${progress}%</div>
          <button class="btn-icon" data-action="delete-goal" data-id="${goal.id}" title="löschen" style="margin-top:6px;">${ICONS.trash}</button>
        </div>
      </div>
      ${childrenHtml}
    </div>`;
}

function periodFieldsHtml(level) {
  const cur = currentPeriodFor(level);
  switch (level) {
    case "year":
      return `<label class="field">jahr<input type="number" id="f-year" value="${cur.year}"></label>`;
    case "quarter":
      return `
        <label class="field">jahr<input type="number" id="f-year" value="${cur.year}"></label>
        <label class="field">quartal
          <select id="f-quarter">
            ${[1, 2, 3, 4].map((q) => `<option value="${q}" ${q === cur.quarter ? "selected" : ""}>Q${q}</option>`).join("")}
          </select>
        </label>`;
    case "month": {
      const names = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
      return `
        <label class="field">jahr<input type="number" id="f-year" value="${cur.year}"></label>
        <label class="field">monat
          <select id="f-month">
            ${names.map((n, i) => `<option value="${i + 1}" ${i + 1 === cur.month ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </label>`;
    }
    case "week":
      return `<label class="field">ein tag in der ziel-woche<input type="date" id="f-date" value="${new Date().toISOString().slice(0, 10)}"></label>`;
    default:
      return "";
  }
}

function parentSelectHtml(level, areaId) {
  const parentLevel = PARENT_LEVEL[level];
  if (!parentLevel) return `<div class="empty-hint" style="padding:6px 0;">jahresziele haben kein übergeordnetes ziel.</div>`;
  const parents = possibleParents(level, areaId);
  if (parents.length === 0) {
    return `<div class="warn-banner">noch kein ${LEVEL_LABEL[parentLevel]}sziel in diesem bereich angelegt — dieses ziel bleibt zunächst ohne übergeordnetes ziel. lege danach gern erst das ${LEVEL_LABEL[parentLevel]}sziel an.</div>
      <input type="hidden" id="f-parent" value="">`;
  }
  return `<label class="field">übergeordnetes ${LEVEL_LABEL[parentLevel]}sziel (wirkt darauf ein)
    <select id="f-parent">
      <option value="">kein übergeordnetes ziel</option>
      ${parents.map((p) => `<option value="${p.id}">${esc(p.title)} (${esc(periodLabel(p))})</option>`).join("")}
    </select>
  </label>`;
}

function openCreateGoalModal() {
  ensureSelectedArea();
  const areas = Areas.all();
  const html = `
    <h2>neues ziel</h2>
    <label class="field">bereich
      <select id="f-area">${areas.map((a) => `<option value="${a.id}" ${a.id === selectedAreaId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
    </label>
    <label class="field">ebene
      <select id="f-level">${LEVELS.map((l) => `<option value="${l}">${LEVEL_LABEL[l]}sziel</option>`).join("")}</select>
    </label>
    <div id="f-period-fields">${periodFieldsHtml("year")}</div>
    <div id="f-parent-field">${parentSelectHtml("year", selectedAreaId)}</div>
    <label class="field">titel<input type="text" id="f-title" placeholder="z. b. neukunden-portfolio ausbauen"></label>
    <div style="display:flex; gap:10px; margin-top:6px;">
      <button class="btn btn-secondary btn-block" id="modal-cancel">abbrechen</button>
      <button class="btn btn-primary btn-block" id="modal-save">ziel anlegen</button>
    </div>
  `;
  openModal(html, {
    onMount: (root) => {
      const levelSel = root.querySelector("#f-level");
      const areaSel = root.querySelector("#f-area");
      const refreshDynamic = () => {
        root.querySelector("#f-period-fields").innerHTML = periodFieldsHtml(levelSel.value);
        root.querySelector("#f-parent-field").innerHTML = parentSelectHtml(levelSel.value, areaSel.value);
      };
      levelSel.addEventListener("change", refreshDynamic);
      areaSel.addEventListener("change", refreshDynamic);
      root.querySelector("#modal-cancel").addEventListener("click", closeModal);
      root.querySelector("#modal-save").addEventListener("click", () => {
        const level = levelSel.value;
        const areaId = areaSel.value;
        const title = root.querySelector("#f-title").value.trim();
        if (!title) {
          toast("bitte einen titel eintragen.");
          return;
        }
        let period;
        if (level === "year") {
          period = { year: Number(root.querySelector("#f-year").value) };
        } else if (level === "quarter") {
          period = { year: Number(root.querySelector("#f-year").value), quarter: Number(root.querySelector("#f-quarter").value) };
        } else if (level === "month") {
          period = { year: Number(root.querySelector("#f-year").value), month: Number(root.querySelector("#f-month").value) };
        } else {
          const dateVal = root.querySelector("#f-date").value;
          const { isoYear, week } = isoWeekOf(dateVal);
          period = { year: isoYear, week };
        }
        const parentId = root.querySelector("#f-parent")?.value || null;

        const warning = softLimitWarning(level, areaId, period, getSettings());
        if (warning) toast(warning);

        createGoal({ areaId, level, title, period, parentId });
        closeModal();
        selectedAreaId = areaId;
        toast("ziel angelegt.");
        render();
      });
    },
  });
}

export function render() {
  ensureSelectedArea();
  const el = document.getElementById("view-goals");
  const areas = Areas.all();
  const area = areas.find((a) => a.id === selectedAreaId) || null;
  const roots = Goals.all().filter((g) => g.level === "year" && g.areaId === selectedAreaId);

  el.innerHTML = `
    <h1>ziele</h1>
    <p class="subtitle">jahresziel → quartal → monat → woche — jedes ziel wirkt auf das darüber ein</p>

    <div class="chip-row">
      ${areas
        .map(
          (a) => `<button class="pill ${a.id === selectedAreaId ? "pill-active" : "pill-neutral"}" data-area="${a.id}">
            ${a.id !== selectedAreaId ? `<span class="dot" style="background:${a.color}"></span>` : ""}${esc(a.name)}
          </button>`
        )
        .join("")}
    </div>

    <button class="btn btn-primary" id="new-goal-btn">${ICONS.plus} neues ziel</button>

    <div id="goal-tree">
      ${
        roots.length
          ? roots
              .sort((a, b) => b.period.year - a.period.year)
              .map((g) => goalNodeHtml(g, area, 0))
              .join("")
          : `<div class="empty-hint">noch kein jahresziel im bereich „${esc(area?.name || "")}“ — leg eins an, alles weitere leitest du daraus ab.</div>`
      }
    </div>
  `;

  el.querySelectorAll("[data-area]").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedAreaId = btn.dataset.area;
      render();
    })
  );
  el.querySelector("#new-goal-btn").addEventListener("click", openCreateGoalModal);
  el.querySelectorAll('[data-action="delete-goal"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      if (confirm("dieses ziel löschen? unterziele bleiben erhalten, verlieren aber die verknüpfung.")) {
        deleteGoalCascade(btn.dataset.id);
        render();
      }
    })
  );
}
