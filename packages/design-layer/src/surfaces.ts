// The surface recipe as code: the shell's three chrome surfaces (top bar,
// sidenav, canvas) share one hue and one saturation, and only lightness shifts,
// by a point or two (surface-recipe.md, at the package root). A Ramp is that rule's
// parameters; each palette's surfaces are a Ramp (palettes.ts); the panel's
// readout grades a Ramp against the bands below. Pure: no DOM, so the palettes can be checked from Node.

export type Mode = 'light' | 'dark';
export type SurfaceId = 'bar' | 'rail' | 'canvas';
export const SURFACE_IDS: SurfaceId[] = ['bar', 'rail', 'canvas'];

export const SURFACE_LABELS: Record<SurfaceId, string> = { bar: 'Top Bar', rail: 'Sidenav', canvas: 'Canvas' };
export const SURFACE_SHORT: Record<SurfaceId, string> = { bar: 'Bar', rail: 'Rail', canvas: 'Canvas' };

export interface HueSat { h: number; s: number }

/** One mode's chrome. HSL units: h in degrees, s and l in percent. */
export interface Ramp {
  /** The shared hue and saturation. */
  h: number;
  s: number;
  /** Base lightness: the canvas. */
  l: number;
  /** Lightness offset from the canvas, in HSL points (canvas is always 0). */
  off: { bar: number; rail: number };
  /** The escape hatch: a surface's own hue and saturation, off recipe. */
  own?: Partial<Record<SurfaceId, HueSat>>;
}

// ── colour math ────────────────────────────────────────────────────────────
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hslToHex(h: number, s: number, l: number): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l: l * 100 };
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

// ── the ramp ───────────────────────────────────────────────────────────────
export const surfaceL = (r: Ramp, id: SurfaceId) => r.l + (id === 'canvas' ? 0 : r.off[id]);
export const surfaceHueSat = (r: Ramp, id: SurfaceId): HueSat => r.own?.[id] ?? { h: r.h, s: r.s };
export function surfaceHex(r: Ramp, id: SurfaceId): string {
  const { h, s } = surfaceHueSat(r, id);
  return hslToHex(h, s, surfaceL(r, id));
}

/** Two hue/saturation pairs "match" when they render the same at a lightness to
    within one 8-bit step per channel: near white, HSL saturation swings widely
    for an invisible difference (PS Info's canvas reads S 40 against its rail's
    S 27, from one unit of rounding). */
export function sameHueSat(a: HueSat, b: HueSat, l: number): boolean {
  const x = hslToHex(a.h, a.s, l);
  const y = hslToHex(b.h, b.s, l);
  return [1, 3, 5].every((i) => Math.abs(parseInt(x.slice(i, i + 2), 16) - parseInt(y.slice(i, i + 2), 16)) <= 1);
}

/** The ramp that reproduces three measured hexes exactly. The shared hue and
    saturation come from the top bar (the most chroma, so the most exact); a
    surface keeps its own only where it differs past rounding. */
export function rampFromHexes(hex: Record<SurfaceId, string>): Ramp {
  const hsl = Object.fromEntries(SURFACE_IDS.map((id) => [id, hexToHsl(hex[id])])) as Record<SurfaceId, { h: number; s: number; l: number }>;
  const ramp: Ramp = {
    h: hsl.bar.h, s: hsl.bar.s, l: hsl.canvas.l,
    off: { bar: hsl.bar.l - hsl.canvas.l, rail: hsl.rail.l - hsl.canvas.l },
  };
  for (const id of SURFACE_IDS) {
    if (surfaceHex(ramp, id) !== hex[id]) (ramp.own ??= {})[id] = { h: hsl[id].h, s: hsl[id].s };
  }
  return ramp;
}

// ── the recipe ─────────────────────────────────────────────────────────────
/** A numeric band with a message at each edge. */
export interface Band { min: number; max: number; below: string; above: string }

export interface Recipe {
  /** Canvas lightness, HSL percent. */
  canvas: Band;
  /** Offsets from the canvas, HSL points. */
  bar: Band;
  rail: Band;
  /** The top bar sits at least this far below the sidenav. */
  barBelowRail: number;
  /** No surface may cross into mid-gray: light keeps every surface above this
      lightness, dark below it. */
  midGray: number;
  /** OKLCH chroma ceiling on any surface: the tint. The floor is 0 (Beacon is pure neutral). */
  chromaMax: number;
  /** The generator's targets inside the bands. */
  target: { l: number; bar: number; rail: number };
}

const FLAT = 'too close reads flat';
const HEAVY = 'too far reads heavy';

export const RECIPE: Record<Mode, Recipe> = {
  light: {
    canvas: { min: 96, max: 99.5, below: 'drifts toward mid-gray', above: 'reads stark white' },
    bar: { min: -6, max: -2.5, below: HEAVY, above: FLAT },
    rail: { min: -2.5, max: 0, below: HEAVY, above: 'lighter than the canvas' },
    barBelowRail: 1.5,
    midGray: 90,
    chromaMax: 0.012,
    target: { l: 98, bar: -4.5, rail: -1.5 },
  },
  dark: {
    canvas: { min: 8, max: 14, below: 'reads black', above: 'drifts toward mid-gray' },
    bar: { min: -5, max: -2, below: HEAVY, above: FLAT },
    rail: { min: -3, max: -0.5, below: HEAVY, above: FLAT },
    barBelowRail: 1,
    midGray: 22,
    chromaMax: 0.012,
    target: { l: 12, bar: -4, rail: -2 },
  },
};

/** The one generator: a hue and a light-mode saturation in, a ramp per mode out.
    HSL saturation is relative to the chroma room at a lightness (1 - |2L - 1|),
    so the same S tints far harder near black than near white. Dark's S is scaled
    so its canvas carries the tint light's top bar does (the most tinted light
    surface), which keeps the hue readable on near-black. */
export function generate(h: number, sLight: number): Record<Mode, Ramp> {
  const room = (l: number) => 1 - Math.abs(2 * (l / 100) - 1);
  const ramp = (m: Mode, s: number): Ramp => {
    const t = RECIPE[m].target;
    return { h, s, l: t.l, off: { bar: t.bar, rail: t.rail } };
  };
  const sDark = sLight * room(RECIPE.light.target.l + RECIPE.light.target.bar) / room(RECIPE.dark.target.l);
  return { light: ramp('light', sLight), dark: ramp('dark', sDark) };
}

// ── grading ────────────────────────────────────────────────────────────────
export interface Grade {
  /** Offsets as displayed: Bar, Rail, Canvas. */
  offsets: Record<SurfaceId, number>;
  /** Hue and saturation shared across all three (to the pixel). */
  matched: boolean;
  /** Plain-words flags; empty means on recipe. */
  flags: string[];
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('-', '−');
export const signed = (n: number) => (Math.abs(n) < 0.05 ? '0' : `${n > 0 ? '+' : ''}${fmt(n)}`);

export function grade(r: Ramp, m: Mode): Grade {
  const rc = RECIPE[m];
  const flags: string[] = [];
  const band = (who: string, v: number, b: Band) => {
    if (v < b.min - 0.05) flags.push(`${who} ${b.below}`);
    else if (v > b.max + 0.05) flags.push(`${who} ${b.above}`);
  };
  band('Canvas', r.l, rc.canvas);
  band('Top Bar', r.off.bar, rc.bar);
  band('Sidenav', r.off.rail, rc.rail);
  if (r.off.bar > r.off.rail - rc.barBelowRail + 0.05) flags.push(`Top Bar and Sidenav ${FLAT}`);

  const base = { h: r.h, s: r.s };
  const offRecipe = SURFACE_IDS.filter((id) => r.own?.[id] && !sameHueSat(r.own[id]!, base, surfaceL(r, id)));
  for (const id of offRecipe) flags.push(`${SURFACE_LABELS[id]} has its own hue or saturation`);

  const hexes = SURFACE_IDS.map((id) => surfaceHex(r, id));
  if (hexes.some((x) => hexToOklch(x).c > rc.chromaMax)) flags.push('Too much tint');
  const ls = SURFACE_IDS.map((id) => surfaceL(r, id));
  if (m === 'light' ? Math.min(...ls) < rc.midGray : Math.max(...ls) > rc.midGray) flags.push('Mid-gray');

  return {
    offsets: { bar: r.off.bar, rail: r.off.rail, canvas: 0 },
    matched: offRecipe.length === 0,
    flags: [...new Set(flags)],
  };
}
