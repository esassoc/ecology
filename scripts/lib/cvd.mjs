/**
 * cvd.mjs — colour-vision-deficiency simulation and perceptual distance.
 *
 * WHY THIS IS IN THE REPO rather than run once by hand. The data-viz palette is
 * GENERATED per theme, so the check that a palette is distinguishable has to run for
 * a brand nobody has picked yet. A validated set of hexes committed once would only
 * ever be right for the hub's own green.
 *
 * The separation gate is what makes a categorical palette a palette instead of eight
 * colours: two hues can look obviously different to full-colour vision and collapse
 * onto each other under deuteranopia, which ~1 in 12 men have. Hue-wheel spacing does
 * NOT predict this — evenly-spaced hues fail routinely, which is why the slot order
 * is searched (see `orderCategorical`) rather than chosen.
 *
 * Machado et al. (2009) severity-1.0 matrices, applied in LINEAR sRGB; distance is
 * Euclidean in OKLab ×100, matching the reference implementation this system's
 * palette is graded against.
 *
 * Isomorphic — no `node:` imports.
 */

import { parseHex } from './color.mjs';

const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Thresholds, from the data-viz method. Adjacent-pair CVD distance in OKLab ×100. */
export const CVD_TARGET = 8.0;
/** Legal only WITH secondary encoding (direct labels, gaps, texture). */
export const CVD_FLOOR = 6.0;
/** Worst unsimulated pair. Below this, full-colour readers cannot tell them apart. */
export const NORMAL_FLOOR = 15.0;
/** OKLCH lightness band per scheme, and the chroma below which a hue reads as grey. */
export const BAND = { light: [0.43, 0.77], dark: [0.48, 0.67] };
export const CHROMA_FLOOR = 0.1;

const toLinear = (hex) =>
  parseHex(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

function oklabFromLinear([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function simulate(linear, kind) {
  const M = MACHADO[kind];
  const clamp = (c) => Math.max(0, Math.min(1, c));
  return [0, 1, 2].map((i) => clamp(M[i][0] * linear[0] + M[i][1] * linear[1] + M[i][2] * linear[2]));
}

/** OKLab distance ×100 between two hexes. `kind` omitted → unsimulated vision. */
export function deltaE(hexA, hexB, kind) {
  const a = oklabFromLinear(kind ? simulate(toLinear(hexA), kind) : toLinear(hexA));
  const b = oklabFromLinear(kind ? simulate(toLinear(hexB), kind) : toLinear(hexB));
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * The separation of one adjacent pair: the WORSE of protan and deutan.
 *
 * Not the average, and tritan is excluded from the gate on purpose — tritanopia is
 * orders of magnitude rarer, and including it rules out palettes that serve the
 * common cases well. It is worth reporting, never worth failing on.
 */
export const pairSeparation = (a, b) => Math.min(deltaE(a, b, 'protan'), deltaE(a, b, 'deutan'));

/** OKLCH lightness and chroma of a hex, for the band and chroma-floor checks. */
export function lightnessChroma(hex) {
  const [L, a, b] = oklabFromLinear(toLinear(hex));
  return { l: L, c: Math.hypot(a, b) };
}

/**
 * Grade a candidate categorical palette. Returns the numbers, decides nothing —
 * callers pick their own thresholds, exactly as the surrounding tooling does.
 */
export function gradeCategorical(palette, scheme) {
  const [lo, hi] = BAND[scheme];
  const adjacency = [];
  for (let i = 0; i < palette.length - 1; i++) adjacency.push([i, i + 1]);

  const worstCvd = Math.min(...adjacency.map(([i, j]) => pairSeparation(palette[i], palette[j])));
  const worstNormal = Math.min(...adjacency.map(([i, j]) => deltaE(palette[i], palette[j])));
  const metrics = palette.map(lightnessChroma);

  return {
    worstCvd,
    worstNormal,
    outOfBand: palette.filter((_, i) => metrics[i].l < lo || metrics[i].l > hi),
    underChroma: palette.filter((_, i) => metrics[i].c < CHROMA_FLOOR),
    ok:
      worstCvd >= CVD_TARGET &&
      worstNormal >= NORMAL_FLOOR &&
      metrics.every((m) => m.l >= lo && m.l <= hi && m.c >= CHROMA_FLOOR),
  };
}
