/**
 * contrast.mjs — the token-graph reader and pair table behind check-contrast.mjs.
 *
 * Extracted from that script so three callers can share one definition of "which pairs
 * matter and how are they resolved": the CLI gate, the theme maker's live grading in
 * the browser, and the derivation's own tests. A live preview that grades a theme
 * differently from the gate is worse than no preview at all.
 *
 * ISOMORPHIC — no `node:` imports, no filesystem. The CLI reads the files and hands the
 * text in. The colour maths lives one level down in color.mjs.
 */

import { contrastRatio, parseHex } from './color.mjs';

export { contrastRatio as ratio };

// [foreground, background, minRatio, level] — level: 'fail' blocks, 'warn' reports.
//
// Property-first tier-2 naming makes this list read as what it is: every `content-*`
// checked against the `background-*` it actually lands on.
//
// The `content-on-*` rows used to be a single guess — `text-inverse` against each
// fill, at 'warn', because most intentions had no declared foreground and components
// hardcoded #fff. Now every intention declares one, so each row tests the real token
// at 'fail'. A spoke re-pointing a fill to a bright ramp without also re-pointing its
// foreground now BLOCKS instead of printing a warning nobody reads.
//
// SEVERAL ROWS NAME PRE-RENAME TOKENS (`--color-content-primary`, `-inverse`,
// `--color-background-raised`). They resolve only because dist/tokens.css still ships
// compatibility aliases for them. That is a real coupling: drop those aliases and these
// rows silently stop covering anything. They are left as-is here because changing them is
// a separate, reviewable decision from moving the code — but it is the first thing to fix
// if a `manual:` line ever names one.
//
// `--color-border-focus` was the fourth, and it is gone: the focus rows at the bottom of
// this list are the replacement and they name the current token. New rows do not get to
// ride on a deprecated alias.
export const PAIRS = [
  // Neutral text on neutral surfaces.
  ['--color-content-primary', '--color-background-raised', 4.5, 'fail'],
  ['--color-content-primary', '--color-background', 4.5, 'fail'],
  ['--color-content-primary', '--color-background-sunken', 4.5, 'fail'],
  ['--color-content-primary', '--color-background-floating', 4.5, 'fail'],
  ['--color-content-secondary', '--color-background-raised', 4.5, 'fail'],
  ['--color-content-muted', '--color-background-raised', 4.5, 'warn'], // genuine meta text — review, don't block
  ['--color-content-link', '--color-background-raised', 4.5, 'fail'],
  ['--color-content-inverse', '--color-background-inverse', 4.5, 'fail'],

  // Each intention's declared foreground against its own solid fill.
  ['--color-content-on-brand', '--color-background-brand', 4.5, 'fail'],
  ['--color-content-on-brand-secondary', '--color-background-brand-secondary', 4.5, 'fail'],
  ['--color-content-on-accent', '--color-background-accent', 4.5, 'fail'],
  ['--color-content-on-ai', '--color-background-ai', 4.5, 'fail'],
  ['--color-content-on-utility-info', '--color-background-utility-info', 4.5, 'fail'],
  ['--color-content-on-utility-success', '--color-background-utility-success', 4.5, 'fail'],
  ['--color-content-on-utility-warning', '--color-background-utility-warning', 4.5, 'fail'],
  ['--color-content-on-utility-danger', '--color-background-utility-danger', 4.5, 'fail'],

  // Coloured text on its own subtle tint — the alert/banner pairing.
  ['--color-content-brand', '--color-background-brand-subtle', 4.5, 'fail'],
  ['--color-content-utility-info', '--color-background-utility-info-subtle', 4.5, 'fail'],
  ['--color-content-utility-success', '--color-background-utility-success-subtle', 4.5, 'fail'],
  ['--color-content-utility-warning', '--color-background-utility-warning-subtle', 4.5, 'fail'],
  ['--color-content-utility-danger', '--color-background-utility-danger-subtle', 4.5, 'fail'],

  // Body text on the subtle tints, which is how the alert bodies are actually built.
  ['--color-content-primary', '--color-background-brand-subtle', 4.5, 'fail'],
  ['--color-content-primary', '--color-background-utility-success-subtle', 4.5, 'warn'],
  ['--color-content-primary', '--color-background-utility-warning-subtle', 4.5, 'warn'],
  ['--color-content-primary', '--color-background-utility-danger-subtle', 4.5, 'warn'],
  ['--color-content-primary', '--color-background-utility-info-subtle', 4.5, 'warn'],

  ['--color-content-disabled', '--color-background-disabled', 4.5, 'warn'], // disabled is exempt from AA; informational
  ['--color-background-brand', '--color-background-raised', 3.0, 'warn'], // as a UI/graphic color

  // ---- SC 1.4.11 · THE FOCUS RING, on every surface it can land on ----
  //
  // These five replace ONE row that was wrong three ways:
  //   ['--color-border-focus', '--color-background-raised', 3.0, 'warn']
  // It named a PRE-RENAME token that resolved only through a compatibility alias; it was
  // `warn`, so it reported a Level AA failure to nobody; and it tested a single surface,
  // never the SUNKEN one, which is the ring's worst (2.66:1 against 2.95 on raised).
  //
  // `fail`, not `warn`. SPEC.md's hook rules forbid a hook from letting a spoke break
  // focus-visibility, and this is where that is enforced, because the cascade cannot do
  // it: --color-border-default-focus names a brand RAMP STEP rather than the brand role,
  // chosen by resolveFocusRing in theme-recipe.mjs, and a theme file that re-declares it
  // wins on source order. The walk is what makes an arbitrary brand pass; THESE ROWS are
  // what prove it, per theme, per scheme.
  //
  // ONE SET OF ROWS COVERS BOTH SCHEMES — `--scheme dark` re-resolves the same pairs
  // against the dark blocks, which is the axis parseDeclarations already owns. Duplicating
  // them per scheme would be duplicating that axis.
  //
  // Current token names, deliberately, unlike the rows above: adding NEW rows on
  // deprecated aliases would be indefensible when the header calls those "the first thing
  // to fix".
  ['--color-border-default-focus', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-border-default-focus', '--color-background-default', 3.0, 'fail'],
  ['--color-border-default-focus', '--color-background-elevation-floating', 3.0, 'fail'],
  ['--color-border-default-focus', '--color-background-elevation-sunken', 3.0, 'fail'],
  // `warn`, and the exception is structural rather than a lowered bar. The knockout bar is
  // near-black IN THE LIGHT SCHEME, so a ring dark enough for near-white surfaces is too
  // dark for it, and no single brand-derived value serves #fcfcfc and #1c2024 at once.
  // Measured 2026-08-17: beacon 3.15, qanat 2.82, spoke-template 2.54 — all pre-existing
  // and none of them moved by the walk. The remedy is not this token: a component on dark
  // ground re-points the tier-3 --focus-ring-color locally, as esa-button variant="chrome"
  // already does via currentColor. Promote to `fail` once the dark-chrome components do.
  ['--color-border-default-focus', '--color-background-default-knockout', 3.0, 'warn'],

  // ---- SC 1.4.11 · THE FOCUS RING ON AN INVALID FIELD ----
  //
  // The ring turns red on a field in its error state — the same band, same width, same
  // offset, `outline-color` overridden. Six components do it (text-field, textarea, select,
  // combobox, date-picker, input-tag), so the ring has TWO colours to guarantee, not one,
  // and this is the second. Same four surfaces, same 3:1, same `fail`.
  //
  // Naming the TIER-3 token, unlike every other row in this list, because tier 3 is what
  // the components actually paint and it is declared in component-tokens.css, which this
  // script parses. It chains to --color-background-utility-danger, so a spoke re-pointing
  // the tier-2 role is still caught. Resolves to red-9 (#e5484d, 3.43:1 worst) by default
  // and red-11 (4.57:1) under [data-assurance="wcag-aa"].
  //
  // WHAT THESE ROWS WOULD HAVE CAUGHT: until 2026-08-17 three of the six painted this ring
  // from --color-border-utility-danger, which is red-6 — a SUBTLE BORDER step, 1.40:1 on a
  // sunken surface, with a literal fallback of rgba(211, 47, 47, 0.25) at 1.26:1. Three
  // components shipped an error ring that was very nearly invisible, and nothing measured
  // it, because the ring had no gated row at all.
  ['--form-error-border-color', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--form-error-border-color', '--color-background-default', 3.0, 'fail'],
  ['--form-error-border-color', '--color-background-elevation-floating', 3.0, 'fail'],
  ['--form-error-border-color', '--color-background-elevation-sunken', 3.0, 'fail'],
  // ---- SC 1.4.11 · DATA-VIZ MARKS ----
  //
  // A series colour IS a meaningful graphic — it is the only thing saying which series
  // a bar belongs to — so every slot owes 3:1 against the surfaces a chart is drawn on.
  // Two surfaces, not four: `esa-chart` paints its own card at
  // --color-background-elevation-raised, and a chart dropped straight onto the page
  // sits on --color-background-default. Charts do not render inside popovers.
  //
  // Endpoints only for the magnitude scales. A sequential ramp SPANS the lightness
  // band by design — its low end is meant to recede toward the surface — so grading
  // every step at 3:1 would fail a ramp for doing its job. The ends carry the range.
  //
  // THE LOW END OF SEQUENTIAL IS GRADED AT 2:1, NOT 3:1 — a different bar, not a
  // relaxed one. Slot 1 means "near zero" and is meant to sit close to the surface;
  // 3:1 is the bar for a mark that must be seen against it, 2:1 the bar for the
  // lightest bin of an ORDINAL ramp, which still has to be distinguishable from blank
  // paper. The derivation walks the low end up until it clears exactly this.
  //
  // THE DIVERGING MIDPOINT IS `warn`, NOT `fail`, and that is deliberate. Slot 4 is a
  // near-neutral grey meaning "no divergence"; it is SUPPOSED to sit close to the
  // surface. Grading it `fail` would block the gate on the one value in the scale whose
  // job is to disappear — the same treatment --color-content-muted already gets.
  ['--color-background-dataviz-categorical-1', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-1', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-2', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-2', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-3', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-3', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-4', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-4', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-5', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-5', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-6', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-6', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-7', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-7', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-8', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-categorical-8', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-sequential-1', '--color-background-elevation-raised', 2.0, 'fail'],
  ['--color-background-dataviz-sequential-1', '--color-background-default', 2.0, 'fail'],
  ['--color-background-dataviz-sequential-7', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-sequential-7', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-diverging-1', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-diverging-1', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-diverging-7', '--color-background-elevation-raised', 3.0, 'fail'],
  ['--color-background-dataviz-diverging-7', '--color-background-default', 3.0, 'fail'],
  ['--color-background-dataviz-diverging-4', '--color-background-elevation-raised', 3.0, 'warn'],
  ['--color-background-dataviz-diverging-4', '--color-background-default', 3.0, 'warn'],
];

// --- token graph -------------------------------------------------------------

/**
 * Drop every @media block before parsing.
 *
 * This is not cosmetic. `dist/tokens.css` ends with an `@media (color-gamut: p3)`
 * block that redeclares every primitive ramp as `color(display-p3 ...)`. Because
 * declarations are read last-wins, EVERY primitive resolved to a P3 value, which
 * parseColor cannot read — so the audit checked 0 pairs and still exited 0 with
 * "All text pairs pass AA". It had never actually run.
 *
 * Contrast is judged at the sRGB baseline: it is the fallback every display gets,
 * and WCAG's maths is defined on sRGB. The P3 block is a wider-gamut rendering of
 * the same colours, not a different palette.
 */
export function stripAtRules(css) {
  // Comments FIRST. This scanner brace-matches from the next `{` after any literal
  // `@media`, so an `@media` mentioned inside a comment sends it hunting for a brace
  // that belongs to unrelated CSS and swallows everything up to the match. That is
  // not hypothetical: build.js emits each token's DTCG $description as a comment, and
  // --duration-0 documents the `@media (prefers-reduced-motion: reduce)` block it
  // exists for — which silently ate most of :root and dropped the audit to 0/29.
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith('@media', i)) {
      const open = css.indexOf('{', i);
      if (open === -1) break;
      let depth = 0;
      let j = open;
      for (; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}' && --depth === 0) break;
      }
      i = j;
      continue;
    }
    out += css[i];
  }
  return out;
}

/*
 * Split into (selector, body) pairs. Safe as a flat regex because stripAtRules has
 * already removed every at-rule, and nothing else in these files nests.
 */
export function parseBlocks(css) {
  const blocks = [];
  for (const m of stripAtRules(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    blocks.push([m[1].trim(), m[2]]);
  }
  return blocks;
}

const ASSURANCE_SCOPE = /\[data-assurance/;
const SCHEME_SCOPE = /\[data-scheme=['"]?([a-z][a-z0-9-]*)['"]?\]/;

/*
 * THIS USED TO BE SELECTOR-BLIND, and that stopped being safe the moment
 * dist/tokens.css grew a second top-level scope.
 *
 * It swept every `--name: value;` in the file regardless of which rule it sat in,
 * which was fine while the only top-level block was `:root` (the P3 and
 * reduced-motion blocks are at-rules and were already stripped). Then the
 * accessibility assurance profile was appended as a plain `[data-assurance]`
 * block — and because it comes LAST, last-one-wins handed the audit the assured
 * colours as if they were the hub defaults. `--hub` went from 7 failures to
 * "All text pairs pass AA" with no code change and no warning.
 *
 * That is this script's own recorded failure mode a third time: an audit whose
 * inputs quietly stopped describing what it claims to report on. So scopes are now
 * explicit — an assurance block is read ONLY when the caller asks for that profile
 * by name, and the header prints which one is active so the output cannot be
 * misread.
 *
 * SCHEME IS THE SAME PROBLEM, ONE AXIS OVER, and it arrived with generated themes.
 * A generated theme file holds a light block AND a dark block. Swept flat, the dark
 * block comes last and wins, so the audit would grade dark values under a header
 * saying nothing about it — the identical failure the paragraph above describes.
 * A [data-scheme] block is therefore read only when its value is the scheme being
 * audited. Blocks with no [data-scheme] at all are the base and are always read,
 * which is what lets a dark run resolve the roles the dark block does not re-point.
 */
export function parseDeclarations(css, map, { assurance = null, scheme = 'light' } = {}) {
  for (const [selector, body] of parseBlocks(css)) {
    if (ASSURANCE_SCOPE.test(selector)) {
      if (!assurance || !selector.includes(`[data-assurance="${assurance}"]`)) continue;
    }
    const sm = SCHEME_SCOPE.exec(selector);
    if (sm && sm[1] !== scheme) continue;
    // last one wins — source order
    for (const m of body.matchAll(/(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g)) {
      map.set(m[1], m[2].trim());
    }
  }
}

export function resolve(name, map, depth = 0) {
  if (depth > 12) return null;
  const raw = map.get(name);
  if (!raw) return null;
  const varRef = raw.match(/^var\((--[a-zA-Z0-9-_]+)\s*(?:,\s*(.+))?\)$/s);
  if (varRef) {
    return resolve(varRef[1], map, depth + 1) ?? (varRef[2] ? parseColor(varRef[2].trim()) : null);
  }
  return parseColor(raw);
}

/**
 * A CSS colour value → [r, g, b], or one of three sentinels:
 *   'alpha'        — translucent; the ratio depends on what is behind it
 *   'unparseable'  — a form this reader does not handle (color-mix, oklch, a gradient)
 *   null           — undefined, or a var() nested inside a function
 *
 * None of them are ever treated as a pass. They surface as `manual:` lines, because a
 * pair this cannot read is a pair nobody has checked.
 */
export function parseColor(v) {
  v = v.trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return parseHex(v);
  const m8 = v.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/i);
  if (m8) return parseInt(m8[1], 16) < 255 ? 'alpha' : parseHex(v);
  const m = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (m) {
    if (m[4] !== undefined && Number(m[4]) < 1) return 'alpha';
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  if (v === 'white') return [255, 255, 255];
  if (v === 'black') return [0, 0, 0];
  if (/var\(/.test(v)) return null; // nested var inside a function — too clever, flag
  return 'unparseable';
}

const unreadable = (c) => !c || c === 'alpha' || c === 'unparseable';

/**
 * Grade every pair against one resolved token map.
 *
 * Returns rows in PAIRS order plus the manual list, and computes nothing about exit
 * codes or formatting — those belong to whoever is presenting the result. The browser
 * renders these as swatches; the CLI prints them.
 */
export function auditPairs(map, { pairs = PAIRS } = {}) {
  const rows = [];
  const manual = [];
  for (const [fg, bg, min, level] of pairs) {
    const f = resolve(fg, map);
    const b = resolve(bg, map);
    if (unreadable(f) || unreadable(b)) {
      const why = !f || !b ? 'undefined token' : f === 'alpha' || b === 'alpha' ? 'alpha value' : 'unparseable value';
      manual.push({ fg, bg, why, text: `${fg} on ${bg} (${why})` });
      continue;
    }
    const r = contrastRatio(f, b);
    rows.push({ fg, bg, min, level, ratio: r, ok: r >= min, fgRgb: f, bgRgb: b });
  }
  return {
    rows,
    manual,
    checked: rows.length,
    total: pairs.length,
    failures: rows.filter((r) => !r.ok && r.level === 'fail').length,
    /**
     * An audit that resolved almost nothing is BROKEN, not clean. This exact state —
     * 0 pairs checked, exit 0, "All text pairs pass AA" — hid every failure in this
     * list until the @media stripping above was added. Never report it as a pass.
     */
    underResolved: rows.length < pairs.length / 2,
  };
}
