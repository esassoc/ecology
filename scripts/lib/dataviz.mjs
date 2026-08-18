/**
 * dataviz.mjs — derive the tier-2 `--color-background-dataviz-*` scales from a theme's seed.
 *
 * Three scales, 22 names, emitted per scheme:
 *   categorical  8   identity  — which series is this
 *   sequential   7   magnitude — how much
 *   diverging    7   polarity  — which side of a baseline
 *
 * WHY THESE ARE TIER 2. A series colour is an INTENT, not a component hook. Nothing
 * here is named for a chart; `esa-chart` reads them, a future `esa-map` choropleth
 * will read the same sequential ramp, and a spoke re-points them like any other role.
 *
 * Isomorphic — no `node:` imports. `/guide/theme-maker` bundles this through the
 * `@theme` alias, and a preview that disagrees with the file it writes is worse than
 * no preview.
 */

import CURVES from './radix-curves.json' with { type: 'json' };
import { contrastHex, parseHex, oklchToHex, srgbToOklch } from './color.mjs';
import { BAND, CHROMA_FLOOR, CVD_FLOOR, CVD_TARGET, NORMAL_FLOOR, deltaE, lightnessChroma, pairSeparation } from './cvd.mjs';
import { nearestChromaticScale, neutralRamp, rampFrom, step } from './ramp.mjs';

/** Slot counts. Fixed — see the notes on each derivation below. */
export const DATAVIZ_LENGTHS = { categorical: 8, sequential: 7, diverging: 7 };

/** Both schemes get values; a slot order has to satisfy both at once. */
const SCHEMES = ['light', 'dark'];

/**
 * The hue wheel, as Radix scale names ordered by their step-9 hue.
 *
 * Categorical slots are drawn from Radix's own hues rather than invented by rotating
 * the brand's, because these scales are already tuned against each other and against
 * a surface. What the brand decides is WHERE THE WHEEL STARTS, not what is on it.
 */
const WHEEL = ['red', 'orange', 'amber', 'yellow', 'lime', 'grass', 'jade', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'purple', 'plum', 'pink', 'crimson'];

/**
 * Candidate steps for a categorical slot, in preference order.
 *
 * Step 9 is Radix's solid-fill step — engineered to clear 3:1 as a fill — so it is
 * the first ask. Some hues do not clear the contrast bar or the lightness band there
 * (the bright ones — yellow, amber, lime — sit far too light in dark mode), so the
 * walk continues rather than shipping a slot nobody can see. Same mechanic as
 * `resolveFocusRing`: walk the ramp, take the first step that clears every bar.
 */
const CATEGORICAL_WALK = [9, 10, 11, 8, 7];

/** Minimum contrast for a mark against the surfaces it is drawn on (SC 1.4.11). */
const MARK_MIN = 3;

/**
 * The floor EVERY pair must clear, adjacent or not — see `distinct` in
 * `orderCategorical`. Deliberately far below the adjacent thresholds (8 / 15): full
 * all-pairs separation is unachievable with 8 slots, so this rules out near-duplicates
 * without demanding the impossible.
 *
 * These are the TIGHTEST values that still seat 8 slots, found by sweeping rather than
 * picked: across representative seeds, normal >= 7 fills all eight and normal >= 8
 * drops every one of them to seven. That cliff is a property of a 16-hue wheel, not of
 * a threshold anyone chose, and it is why scatter and bubble carry a series cap
 * instead of a better palette.
 */
const LADDER = [
  { name: 'strict', cvd: CVD_TARGET, normal: NORMAL_FLOOR, globalCvd: 3, globalNormal: 7 },
  { name: 'target', cvd: CVD_TARGET, normal: NORMAL_FLOOR, globalCvd: 0, globalNormal: 0 },
  { name: 'floor', cvd: CVD_FLOOR, normal: 12, globalCvd: 0, globalNormal: 0 },
  { name: 'minimum', cvd: CVD_FLOOR, normal: 8, globalCvd: 0, globalNormal: 0 },
];

/** How many steps of one hue the search may consider. See `hueVariants`. */
const VARIANTS_PER_HUE = 3;

/**
 * Sequential samples 7 of the 12 ramp steps.
 *
 * The SAME indices work in both schemes, which is the neat part: a Radix light ramp
 * runs light→dark across steps 1→12 and a dark ramp runs dark→light, so sampling
 * ascending indices always yields low-magnitude nearest the surface and
 * high-magnitude furthest from it. No reversal, no per-scheme special case.
 */
const SEQUENTIAL_SPAN = 12;

/**
 * The low end of an ordinal ramp still has to be VISIBLE — 2:1, not 3:1.
 *
 * Two different bars apply to the same ramp depending on how it is read. For
 * CONTINUOUS magnitude (a heatmap, a choropleth) the lightest step means "near zero"
 * and is allowed to recede toward the surface. For an ORDINAL ramp — which is what
 * seven discrete tokens will actually be used as, one per bin — the step nearest the
 * surface must still be distinguishable from it.
 *
 * Sampling from a fixed step 3 gave 1.09:1 on the hub's own surface: a first bin that
 * is, to a reader, blank paper. So the low end WALKS UP until it clears this, and the
 * seven samples spread from wherever it lands.
 */
const SEQUENTIAL_LOW_MIN = 2;

/** Per-arm steps for diverging, weakest (nearest the midpoint) to strongest. */
const DIVERGING_ARM = [7, 9, 11];

/** Where the neutral midpoint is sampled from the neutral ramp. */
const DIVERGING_MID = { light: 3, dark: 4 };

/**
 * DIVERGING IS DELIBERATELY NOT BRAND-DERIVED, and this is the one place the
 * "everything follows the brand" rule is wrong.
 *
 * Diverging encodes polarity, so its poles must read as opposites. Deriving one arm
 * from the brand would give a green-brand theme a GREEN↔RED diverging scale — the
 * single worst pairing for the commonest colour-vision deficiency, and the one thing
 * every accessibility guide names explicitly. Blue↔red are opposed in temperature and
 * stay separable under protanopia and deuteranopia. (Blue↔aqua was considered and
 * rejected upstream: both cool, so the midpoint stops reading as "nothing".)
 */
const DIVERGING_POLES = { cool: 'blue', warm: 'red' };

/**
 * A Radix scale's own 12 steps, at its own chroma.
 *
 * Built from the curve data rather than through `rampFrom`, because `rampFrom` scales
 * every step's chroma by `seed.c / anchor.c` — so seeding it with a grey to "get the
 * reference back" returns a GREY RAMP, silently, for all eight slots.
 */
function referenceRamp(scale, scheme) {
  const curve = CURVES.curves[scheme]?.[scale];
  if (!curve) throw new Error(`no ${scheme} curve for Radix scale "${scale}"`);
  return curve.map(({ l, c, h }) => oklchToHex({ l, c, h }));
}

/**
 * The usable colour for one hue in one scheme, or null if this hue has none.
 *
 * Three bars, all of which must clear at the same step: contrast against every
 * surface the chart is drawn on, the scheme's lightness band, and the chroma floor
 * below which a hue stops reading as a hue at all.
 */
function usableSteps(scale, scheme, surfaces, chromaRatio) {
  const ramp = hueRamp(scale, scheme, chromaRatio);
  const [lo, hi] = BAND[scheme];
  const out = [];
  for (const n of CATEGORICAL_WALK) {
    const hex = step(ramp, n);
    const { l, c } = lightnessChroma(hex);
    if (l < lo || l > hi || c < CHROMA_FLOOR) continue;
    if (!surfaces.every((s) => contrastHex(hex, s) >= MARK_MIN)) continue;
    out.push(hex);
  }
  return out;
}

/**
 * Hue variants — the search picks the STEP as well as the hue.
 *
 * Pinning each hue to its first passing step is what made this unsolvable: measured
 * across 72 brands spanning the wheel, 21 could not seat 8 slots even with the
 * all-pairs floor switched off entirely, because one fixed shade per hue leaves the
 * adjacent gate nothing to work with in BOTH schemes at once.
 *
 * Offering the darker and lighter alternates as separate candidates fixes that, and
 * for a reason worth knowing: CVD simulation preserves LIGHTNESS. Two hues that
 * collapse together under deuteranopia separate again if one is a few steps darker,
 * so varying the step is not a cosmetic fallback — it is the second axis the gate
 * actually measures. One variant per hue survives into the palette, so the result is
 * still eight distinct hues rather than shades of three.
 */
function hueVariants(scale, surfaces, chromaRatio) {
  const per = {};
  for (const scheme of SCHEMES) per[scheme] = usableSteps(scale, scheme, surfaces[scheme], chromaRatio);
  const depth = Math.min(per.light.length, per.dark.length, VARIANTS_PER_HUE);
  return Array.from({ length: depth }, (_, k) => ({ scale, light: per.light[k], dark: per.dark[k] }));
}

/**
 * SEARCH the slot order; do not choose it.
 *
 * Hue-wheel spacing does not predict CVD separation — evenly spaced hues fail
 * routinely, and the first hand-picked spacing tried here put jade beside magenta
 * (ΔE 2.4 under deuteranopia, against a target of 8). So this walks the wheel as a
 * graph: slots are hues, an edge exists when two hues stay apart under BOTH protan
 * and deutan AND for full-colour vision, in BOTH schemes, and we want a path of 8.
 *
 * Depth-first in fixed wheel order, so the result is deterministic — the same brand
 * always produces the same palette, which matters because these values are committed.
 * Slot 1 is pinned to the brand's own hue: a chart's first series wearing the brand
 * is the one piece of brand expression a categorical palette can afford.
 */
function orderCategorical(variants, startScale, want, bars) {
  const separated = (a, b) =>
    SCHEMES.every(
      (scheme) => pairSeparation(a[scheme], b[scheme]) >= bars.cvd && deltaE(a[scheme], b[scheme]) >= bars.normal,
    );

  /*
   * A WEAKER BAR THAT EVERY PAIR MUST CLEAR, not just neighbours.
   *
   * The adjacent gate is the documented one because bars, lines and stacks put slots
   * next to their neighbours. It is also blind in a way that bites: an adjacency-only
   * search happily seated violet at slot 6 and purple at slot 8 — ΔE 5.8 under
   * NORMAL vision, near-duplicates that no adjacent pair ever compares. Two slots
   * that close are indefensible wherever they land.
   *
   * Full all-pairs at the adjacent thresholds is not achievable — no ordering of 8
   * clears it, which is why scatter and bubble carry a series cap instead. This is the
   * floor below which two slots are not different colours at all.
   */
  const distinct = (a, b) =>
    SCHEMES.every(
      (scheme) =>
        pairSeparation(a[scheme], b[scheme]) >= bars.globalCvd && deltaE(a[scheme], b[scheme]) >= bars.globalNormal,
    );

  // How far apart are two candidates at their WORST, across both schemes? Used to
  // order the search, not to gate it — taking the first valid path in wheel order is
  // deterministic but clusters: it seated grass, cyan, jade and teal in one palette,
  // four cool greens that each clear the ADJACENT bar while looking like one family.
  // Trying the most-separated candidate first spreads the wheel at no cost to
  // determinism, and lifted the hub's worst adjacent pair from 8.6 to 17.1.
  const distance = (a, b) => Math.min(...SCHEMES.map((scheme) => pairSeparation(a[scheme], b[scheme])));

  const seq = [variants.find((v) => v.scale === startScale) ?? variants[0]];
  const usedScales = new Set([seq[0].scale]);
  let best = [...seq];

  const walk = () => {
    if (seq.length > best.length) best = [...seq];
    if (seq.length === want) return true;
    const from = seq[seq.length - 1];
    const next = variants
      .filter((v) => !usedScales.has(v.scale) && separated(from, v) && seq.every((placed) => distinct(placed, v)))
      // Ties broken by wheel then step order, so the result stays reproducible.
      .sort((a, b) => distance(from, b) - distance(from, a) || variants.indexOf(a) - variants.indexOf(b));
    for (const v of next) {
      seq.push(v);
      usedScales.add(v.scale);
      if (walk()) return true;
      seq.pop();
      usedScales.delete(v.scale);
    }
    return false;
  };

  // Best-effort rather than throwing: a brand whose wheel cannot seat 8 separable
  // hues should still get a working palette, with the shortfall reported by the gate
  // rather than by a crash in the middle of a theme build.
  return walk() ? seq : best;
}

/**
 * Build a hue's ramp at the reference scale's own character, then re-tint it to the
 * brand's chroma so a muted brand yields a muted palette rather than eight primaries
 * beside a grey brand.
 */
function hueRamp(scale, scheme, chromaRatio) {
  const base = referenceRamp(scale, scheme);
  if (Math.abs(chromaRatio - 1) < 0.02) return base;
  return base.map((hex) => {
    const { l, c, h } = srgbToOklch(parseHex(hex));
    return oklchToHex({ l, c: c * chromaRatio, h });
  });
}


/**
 * A purpose-built magnitude ramp, INTERPOLATED rather than sampled.
 *
 * Sampling a Radix ramp does not work and the reason is structural: a Radix light ramp
 * spends steps 1-8 on backgrounds and borders, so only about four of its twelve steps
 * are dark enough to be seen at all. Asking it for seven ordinal bins produced literal
 * duplicates — two bins painted the same colour, which reads as a data error.
 *
 * So the endpoints come from the brand ramp and everything between is interpolated in
 * OKLCH, giving evenly spaced LIGHTNESS — which is what a magnitude ramp encodes with,
 * and what keeps it readable under every kind of colour vision. The light end is walked
 * in until it clears the surface (see SEQUENTIAL_LOW_MIN).
 */
function sequentialRamp(brandRamp, surfaces, scheme) {
  const n = DATAVIZ_LENGTHS.sequential;
  const steps = brandRamp.map((hex) => srgbToOklch(parseHex(hex)));
  const near = steps[1];
  const far = steps[11];

  /*
   * Chroma comes from the brand ramp AT THAT LIGHTNESS, not interpolated between the
   * endpoints. Interpolating it produced a ramp of muddy greys: both endpoints of a
   * Radix ramp are deliberately low-chroma (step 2 is a background wash, step 12 is
   * near-black text), so a straight line between them never passes through the brand.
   * Radix already tuned a chroma curve across lightness; this reads it off.
   */
  const chromaAt = (l) => {
    let lo = steps[0];
    let hi = steps[steps.length - 1];
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i];
      const b = steps[i + 1];
      if ((l >= Math.min(a.l, b.l) && l <= Math.max(a.l, b.l)) || i === steps.length - 2) {
        lo = a;
        hi = b;
        break;
      }
    }
    const span = hi.l - lo.l;
    const t = Math.abs(span) < 1e-6 ? 0 : (l - lo.l) / span;
    return lo.c + (hi.c - lo.c) * Math.max(0, Math.min(1, t));
  };

  const mix = (t) => {
    const l = near.l + (far.l - near.l) * t;
    return oklchToHex({ l, c: chromaAt(l), h: far.h });
  };

  // Pull the near end toward the far end until it separates from the surface.
  let t0 = 0;
  while (t0 < 0.6 && !surfaces.every((sf) => contrastHex(mix(t0), sf) >= SEQUENTIAL_LOW_MIN)) t0 += 0.02;

  return Array.from({ length: n }, (_, i) => mix(t0 + ((1 - t0) * i) / (n - 1)));
}

/**
 * Derive all three scales for one scheme.
 *
 * @param {object}   input
 * @param {string}   input.seedHex     the theme's brand hex (light-scheme seed)
 * @param {string}   input.neutral     neutral temperature name
 * @param {string}   input.scheme      'light' | 'dark'
 * @param {string[]} input.surfaces    every surface a chart is drawn on, in this scheme
 * @returns {{categorical: string[], sequential: string[], diverging: string[]}}
 */
export function deriveDataviz({ seedHex, neutral = 'pure', surfaces }) {
  const brandScale = nearestChromaticScale(seedHex, 'light');

  // How saturated is this brand, relative to the reference hue it sits nearest? A
  // muted brand should yield a muted palette rather than eight primaries beside it.
  const seed = srgbToOklch(parseHex(seedHex));
  const refAnchor = srgbToOklch(parseHex(step(referenceRamp(brandScale, 'light'), 9)));
  const chromaRatio = refAnchor.c > 1e-4 ? Math.min(1.15, Math.max(0.45, seed.c / refAnchor.c)) : 1;

  // Every hue at every step that clears the bars. Hues with none drop out entirely.
  const variants = WHEEL.flatMap((scale) => hueVariants(scale, surfaces, chromaRatio));
  if (!variants.length) throw new Error('deriveDataviz: no hue clears the contrast, band and chroma bars');

  // A very light or very desaturated brand can have no usable step of its own hue.
  const start = variants.some((v) => v.scale === brandScale) ? brandScale : variants[0].scale;
  /*
   * WALK THE LADDER. One brand in two cannot seat 8 hues at the strictest bars —
   * measured across 72 seeds spanning the wheel — so a single threshold set either
   * ships short palettes or ships bad ones. Instead the bars relax in named steps and
   * the first rung that seats all 8 wins, with the rung recorded so the theme can say
   * which one it reached rather than implying the best.
   *
   * The rungs are the METHOD's own bands, not invented: `target` is CVD 8 / normal 15,
   * and `floor` drops to CVD 6, which the method calls legal ONLY with secondary
   * encoding. `esa-chart` always rotates marker shapes, so that condition is met by
   * construction — but a theme landing on `floor` is a fact worth surfacing.
   */
  let order = [];
  let tier = LADDER[LADDER.length - 1];
  for (const bars of LADDER) {
    const attempt = orderCategorical(variants, start, DATAVIZ_LENGTHS.categorical, bars);
    if (attempt.length > order.length) {
      order = attempt;
      tier = bars;
    }
    if (order.length === DATAVIZ_LENGTHS.categorical) break;
  }

  /*
   * THE TOKEN CONTRACT IS 8 NAMES, so a brand whose wheel cannot seat 8 separable hues
   * still gets 8 — measured, 8 of 72 seeds land here. Padding takes the most-separated
   * unused hues in order, ignoring the gate it could not satisfy, and marks the tier
   * `incomplete` so the shortfall is stated rather than implied. The alternative,
   * cycling earlier slots, is the one thing the method forbids outright: two series
   * wearing the same colour is worse than two that are merely hard to tell apart.
   */
  if (order.length < DATAVIZ_LENGTHS.categorical) {
    const usedScales = new Set(order.map((v) => v.scale));
    const worstAgainstOrder = (v) =>
      Math.min(...order.flatMap((o) => SCHEMES.map((sc) => pairSeparation(o[sc], v[sc]))));
    const rest = variants
      .filter((v) => !usedScales.has(v.scale))
      .sort((a, b) => worstAgainstOrder(b) - worstAgainstOrder(a));
    for (const v of rest) {
      if (order.length === DATAVIZ_LENGTHS.categorical) break;
      if (usedScales.has(v.scale)) continue;
      usedScales.add(v.scale);
      order = [...order, v];
    }
    tier = { name: 'incomplete' };
  }

  const out = {};
  for (const scheme of SCHEMES) {
    const categorical = order.map((v) => v[scheme]);

    // Sequential wears the BRAND's hue. Magnitude is the one scale where "more of our
    // colour means more of the thing" reads correctly, and a single-hue ramp stays
    // separable for every kind of colour vision because LIGHTNESS carries it, not hue.
    const brandRamp = rampFrom(seedHex, { scheme, scale: brandScale });
    const sequential = sequentialRamp(brandRamp, surfaces[scheme], scheme);

    const cool = hueRamp(DIVERGING_POLES.cool, scheme, 1);
    const warm = hueRamp(DIVERGING_POLES.warm, scheme, 1);
    const diverging = [
      ...[...DIVERGING_ARM].reverse().map((n) => step(cool, n)),
      step(neutralRamp(neutral, scheme), DIVERGING_MID[scheme]),
      ...DIVERGING_ARM.map((n) => step(warm, n)),
    ];

    out[scheme] = { categorical, sequential, diverging };
  }
  out.hues = order.map((v) => v.scale);
  out.tier = tier.name;
  return out;
}

/** Flat `{ tokenName: hex }` for one scheme, ready to emit. */
export function datavizDeclarations(scales) {
  const out = {};
  for (const [name, list] of Object.entries(scales)) {
    list.forEach((hex, i) => {
      out[`--color-background-dataviz-${name}-${i + 1}`] = hex;
    });
  }
  return out;
}
