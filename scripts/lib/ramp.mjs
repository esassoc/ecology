/**
 * ramp.mjs — build a 12-step ramp from one seed colour, shaped by a Radix curve.
 *
 * THE SEED LANDS EXACTLY ON STEP 9 AND IS NOT NEGOTIATED. Step 9 is the solid-fill
 * step (see plugins/spoke-kit/skills/spoke-init/brand-extraction.md § "hub primitive
 * ramps are Radix 1–12"), so it is the one a client points at and says "that is our
 * blue". Everything else is interpolated; that value is copied through verbatim, past
 * the OKLCH round-trip, because a brand hex that comes back one bit off is the kind of
 * thing nobody notices and everybody has to explain later.
 *
 * Isomorphic — no `node:` imports. See color.mjs.
 */

import curvesData from './radix-curves.json' with { type: 'json' };
import { hueDistance, oklchToHex, parseHex, srgbToOklch } from './color.mjs';

export const NEUTRAL_TEMPERATURES = Object.keys(curvesData.neutrals);
export const CHROMATIC_SCALES = curvesData.chromatic;

/**
 * Temperature name -> the Radix scale behind it. `cool` IS `slate`; nothing is derived.
 *
 * Exported because two callers need to say which scale a theme landed on, and both were
 * guessing before. theme-recipe.mjs emits `var(--color-slate-7)` and has to know the word
 * `slate`; the theme maker prints "Radix slate" under the swatch. Deriving that string in
 * either place would be a second copy of this table — which is exactly how the maker came
 * to offer three of the six temperatures.
 *
 * DATA ONLY. The human-facing half ("Cool", "blue-leaning") stays in the page: this file
 * is isomorphic colour maths imported by the CLI, and UI copy does not belong in it.
 */
export const NEUTRAL_SCALES = curvesData.neutrals;

const SOLID = 8; // zero-based index of step 9

function curve(scale, scheme) {
  const c = curvesData.curves[scheme]?.[scale];
  if (!c) throw new Error(`no ${scheme} curve for Radix scale "${scale}"`);
  return c;
}

/**
 * Which Radix scale's curve should shape this seed? Nearest step-9 HUE.
 *
 * Hue only, deliberately. Chroma is handled downstream by scaling the whole curve to
 * the seed's own chroma, so a desaturated navy still wants `blue`'s SHAPE — matching
 * on chroma too would hand it `slate` and flatten the brand across all twelve steps.
 * Neutral scales are excluded for the same reason.
 */
export function nearestChromaticScale(seedHex, scheme = 'light') {
  const rgb = parseHex(seedHex);
  if (!rgb) throw new Error(`nearestChromaticScale: not a hex colour — ${seedHex}`);
  const { h } = srgbToOklch(rgb);
  let best = null;
  let bestD = Infinity;
  for (const scale of CHROMATIC_SCALES) {
    const d = hueDistance(h, curve(scale, scheme)[SOLID].h);
    if (d < bestD) {
      bestD = d;
      best = scale;
    }
  }
  return best;
}

/**
 * Seed hex → 12 hex steps (index 0 = step 1).
 *
 * Lightness is remapped PIECEWISE around step 9, so the seed moves step 9 without
 * dragging the endpoints: step 1 stays the reference's near-white and step 12 its
 * near-black. A single linear shift instead would push a dark brand's step 1 grey,
 * and step 1/2 are the page and subtle-wash surfaces — the brand is not supposed to
 * be visible there.
 *
 * Chroma is scaled by one ratio across the ramp, so a muted brand yields a muted ramp.
 * Hue takes the seed's, plus the reference's own per-step DRIFT (Radix ramps rotate a
 * few degrees toward the dark end; discarding that reads as a ramp that goes flat).
 */
export function rampFrom(seedHex, { scheme = 'light', scale = null } = {}) {
  const rgb = parseHex(seedHex);
  if (!rgb) throw new Error(`rampFrom: not a hex colour — ${seedHex}`);
  const seed = srgbToOklch(rgb);
  const ref = curve(scale ?? nearestChromaticScale(seedHex, 'light'), scheme);
  const anchor = ref[SOLID];

  // Only the light ramp is anchored on the seed. In dark, step 9 is a DIFFERENT
  // colour by design — Radix's dark ramps are their own tuned surface, and pinning a
  // light-scheme brand hex into one produces a fill that glares against a near-black
  // page. Dark takes the reference's own lightness, wearing the brand's hue + chroma.
  const anchored = scheme === 'light';
  const chromaRatio = anchor.c > 1e-4 ? seed.c / anchor.c : 1;

  // The two endpoints the remap interpolates toward.
  //
  // Normally these are the reference's own step 1 and step 12 — its tuned near-white
  // and near-black — so the seed moves step 9 without dragging the ends. But a seed can
  // sit OUTSIDE that span: a near-black brand is darker than the reference's step 12,
  // and then interpolating "from the seed toward a lighter endpoint" runs the wrong way
  // and step 10 comes out lighter than step 9. When that happens the endpoint is pulled
  // past the seed instead, keeping the reference's PROPORTION — how much darker step 12
  // is than step 9, or how close step 1 sits to white — applied to the seed's lightness.
  const refLo = ref[0].l;
  const refHi = ref[11].l;
  const headroom = Math.max(1e-6, 1 - anchor.l);
  const lo = seed.l < refLo ? refLo : Math.min(1, 1 - (1 - seed.l) * ((1 - refLo) / headroom));
  const hi = seed.l > refHi ? refHi : seed.l * (refHi / Math.max(1e-6, anchor.l));

  const steps = ref.map((step, i) => {
    let l = step.l;
    if (anchored && seed.l !== anchor.l) {
      if (i < SOLID) {
        l = lo + ((step.l - lo) / (anchor.l - lo)) * (seed.l - lo);
      } else if (i > SOLID) {
        l = seed.l + ((step.l - anchor.l) / (refHi - anchor.l)) * (hi - seed.l);
      } else {
        l = seed.l;
      }
    }
    const h = (seed.h + (step.h - anchor.h) + 360) % 360;
    return oklchToHex({ l, c: step.c * chromaRatio, h });
  });

  if (anchored) steps[SOLID] = normaliseHex(seedHex);
  return steps;
}

/** A Radix neutral, by temperature name (`warm` | `cool` | `pure` | …). 12 hex steps. */
export function neutralRamp(temperature, scheme = 'light') {
  const scale = curvesData.neutrals[temperature];
  if (!scale) {
    throw new Error(
      `unknown neutral temperature "${temperature}" — one of: ${NEUTRAL_TEMPERATURES.join(', ')}`,
    );
  }
  return curve(scale, scheme).map(oklchToHex);
}

/**
 * One notch BELOW step 1 — the sunken well on a dark canvas.
 *
 * A 12-step ramp has no room under its own first step, so a surface that must sit
 * lower than the page has nowhere on-ramp to go. The hub hit this and solved it with a
 * literal (`--color-background-elevation-sunken: #0d0d0f` in docs-dark.css, the only
 * hardcoded colour in that file). This derives the same relationship instead, so it
 * moves with the neutral the recipe chose rather than staying grey under a warm theme.
 *
 * The 0.9 factor is not a taste call — it is the hub's own step: OKLCH lightness of
 * #0d0d0f over #111113 is 0.896. Feeding the hub's ramp through here reproduces
 * #0d0d0f exactly.
 */
export function belowFirstStep(rampHexes) {
  const { l, c, h } = srgbToOklch(parseHex(rampHexes[0]));
  return oklchToHex({ l: l * 0.9, c, h });
}

/** 1-based step accessor, so call sites read like the Radix docs they came from. */
export const step = (ramp, n) => {
  if (n < 1 || n > 12) throw new Error(`ramp step out of range: ${n} (ramps are 1-12)`);
  return ramp[n - 1];
};

function normaliseHex(hex) {
  const v = String(hex).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const rgb = parseHex(v);
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}
