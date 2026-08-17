/**
 * color.mjs — the repo's colour maths. sRGB ↔ OKLCH, plus WCAG luminance/ratio.
 *
 * ISOMORPHIC ON PURPOSE: no `node:` imports, no filesystem, no globals beyond
 * Math. The theme maker page bundles this file into the browser and the CLIs
 * import it in node, and they MUST agree — a live preview that disagrees with
 * the file it writes is worse than no preview.
 *
 * The luminance/ratio pair below is the third copy of that maths to exist here
 * (check-contrast.mjs and a11y-audit.mjs each had one) and is meant to be the
 * last. The 0.03928 threshold is WCAG 2.x's, NOT the 0.04045 used by the sRGB
 * transfer function further down — they differ in the 5th decimal and both are
 * correct for their own job. Do not "fix" one to match the other.
 */

// --- sRGB <-> hex ------------------------------------------------------------

/** '#abc' | '#aabbcc' | '#aabbccff' → [r, g, b] 0-255, or null. */
export function parseHex(hex) {
  const v = String(hex).trim();
  let m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = v.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return null;
}

const clamp255 = (n) => Math.min(255, Math.max(0, Math.round(n)));

/** [r, g, b] 0-255 → '#rrggbb' (lowercase, always 6 digits). */
export function toHex(rgb) {
  return '#' + rgb.map((c) => clamp255(c).toString(16).padStart(2, '0')).join('');
}

// --- sRGB <-> OKLCH ----------------------------------------------------------
// Björn Ottosson's OKLab, https://bottosson.github.io/posts/oklab/

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** [r, g, b] 0-255 → { l, c, h }. l is 0-1, c is ~0-0.4, h is degrees 0-360. */
export function srgbToOklch([r8, g8, b8]) {
  const r = toLinear(r8 / 255);
  const g = toLinear(g8 / 255);
  const b = toLinear(b8 / 255);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(A * A + B * B);
  // Hue of a neutral is meaningless and numerically unstable; pin it to 0 so two
  // greys never compare as 180° apart when picking a reference ramp.
  const h = c < 1e-6 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** { l, c, h } → [r, g, b] as UNCLAMPED floats 0-255. Out-of-gamut goes negative or >255. */
function oklchToSrgbRaw({ l: L, c, h }) {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((v) => fromLinear(v) * 255);
}

const IN_GAMUT_EPS = 0.5 / 255; // half a step of 8-bit quantisation
const inGamut = (rgb) => rgb.every((c) => c >= -IN_GAMUT_EPS * 255 && c <= 255 + IN_GAMUT_EPS * 255);

/**
 * { l, c, h } → '#rrggbb', reducing CHROMA until the colour fits sRGB.
 *
 * Lightness and hue are held fixed and chroma gives way, because that is the axis
 * a reader is least likely to notice and the one the ramp curve cares about least.
 * Naive per-channel clamping instead SHIFTS THE HUE — clipping a blue's red channel
 * to 0 walks it toward cyan — which would silently change the brand colour on the
 * saturated steps, exactly where the brand is most visible.
 */
export function oklchToHex(lch) {
  const direct = oklchToSrgbRaw(lch);
  if (inGamut(direct)) return toHex(direct);

  let lo = 0;
  let hi = lch.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToSrgbRaw({ ...lch, c: mid }))) lo = mid;
    else hi = mid;
  }
  return toHex(oklchToSrgbRaw({ ...lch, c: lo }));
}

/** Shortest angular distance between two hues, 0-180. */
export function hueDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// --- WCAG --------------------------------------------------------------------

/** WCAG 2.x relative luminance of [r, g, b] 0-255. */
export function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two [r, g, b] triples. Order-independent, 1-21. */
export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Contrast ratio between two hex strings. Throws on an unparseable input. */
export function contrastHex(a, b) {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) throw new Error(`contrastHex: not a hex colour — ${!ra ? a : b}`);
  return contrastRatio(ra, rb);
}
