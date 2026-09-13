// avatars.js — feste, kleine auswahl abstrakter avatare fürs onboarding
// (architecture.md §4.12 / context.md §3.10): "kein foto-upload, kein zwang
// zu einer echten identität" — bewusst nur geometrische formen in den
// bestehenden bereichsfarben (siehe colors.js), keine gesichter/fotos.

import { AREA_COLOR_CHOICES } from "./colors.js";

function markSvg(shape) {
  const marks = {
    circle: `<circle cx="28" cy="28" r="10" fill="#fff" fill-opacity="0.92"/>`,
    ring: `<circle cx="28" cy="28" r="11" fill="none" stroke="#fff" stroke-width="4" stroke-opacity="0.92"/>`,
    triangle: `<path d="M28 17 L38 37 L18 37 Z" fill="#fff" fill-opacity="0.92"/>`,
    diamond: `<path d="M28 16 L40 28 L28 40 L16 28 Z" fill="#fff" fill-opacity="0.9"/>`,
    square: `<rect x="19" y="19" width="18" height="18" rx="5" fill="#fff" fill-opacity="0.9"/>`,
    spark: `<path d="M28 15 l3.4 9.6 L41 28 l-9.6 3.4 L28 41 l-3.4-9.6 L15 28 l9.6-3.4 Z" fill="#fff" fill-opacity="0.92"/>`,
    dots: `<circle cx="21" cy="24" r="4" fill="#fff" fill-opacity="0.9"/><circle cx="35" cy="24" r="4" fill="#fff" fill-opacity="0.9"/><circle cx="28" cy="35" r="4" fill="#fff" fill-opacity="0.9"/>`,
    wave: `<path d="M15 30c4-8 8-8 13 0s9 8 13 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-opacity="0.92"/>`,
  };
  return marks[shape] || marks.circle;
}

function avatarMarkup(shape, color) {
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="avatar">
    <rect width="56" height="56" rx="16" fill="${color}"/>
    ${markSvg(shape)}
  </svg>`;
}

const SHAPES = ["circle", "ring", "triangle", "diamond", "square", "spark", "dots", "wave"];

export const AVATARS = SHAPES.map((shape, i) => ({
  id: `avatar_${shape}`,
  svg: avatarMarkup(shape, AREA_COLOR_CHOICES[i % AREA_COLOR_CHOICES.length]),
}));

const FALLBACK_SVG = `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="kein avatar gewählt">
  <rect width="56" height="56" rx="16" fill="#e3e5f0"/>
  <circle cx="28" cy="28" r="10" fill="none" stroke="#9aa1b0" stroke-width="2.4" stroke-dasharray="3 4"/>
</svg>`;

export function avatarSvg(avatarId) {
  return AVATARS.find((a) => a.id === avatarId)?.svg || FALLBACK_SVG;
}
