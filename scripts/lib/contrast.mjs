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
// `--color-background-raised`, `--color-border-focus`). They resolve only because
// dist/tokens.css still ships compatibility aliases for them. That is a real coupling:
// drop those aliases and these rows silently stop covering anything. They are left
// as-is here because changing them is a separate, reviewable decision from moving the
// code — but it is the first thing to fix if a `manual:` line ever names one.
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
  ['--color-border-focus', '--color-background-raised', 3.0, 'warn'],
  ['--color-background-brand', '--color-background-raised', 3.0, 'warn'], // as a UI/graphic color
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
/**
 * @returns {{ schemeBlocks: number }} how many [data-scheme] blocks matched the
 * requested scheme. The caller needs this to tell "graded the dark values" apart
 * from "found no dark values and graded the light ones under a dark header" —
 * the two are otherwise indistinguishable in the output.
 */
export function parseDeclarations(css, map, { assurance = null, scheme = 'light' } = {}) {
  let schemeBlocks = 0;
  for (const [selector, body] of parseBlocks(css)) {
    if (ASSURANCE_SCOPE.test(selector)) {
      if (!assurance || !selector.includes(`[data-assurance="${assurance}"]`)) continue;
    }
    const sm = SCHEME_SCOPE.exec(selector);
    if (sm && sm[1] !== scheme) continue;
    if (sm) schemeBlocks++;
    // last one wins — source order
    for (const m of body.matchAll(/(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g)) {
      map.set(m[1], m[2].trim());
    }
  }
  return { schemeBlocks };
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
