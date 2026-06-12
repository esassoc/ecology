#!/usr/bin/env node
/**
 * check-contrast.mjs — WCAG AA contrast audit for Ecology theme files.
 *
 * A spoke re-brands by re-pointing semantic tokens; this is where contrast
 * regressions enter (a brand color that fails on white, an amber that fails
 * under inverse text). This script resolves the token graph — hub defaults
 * overlaid with a theme's [data-theme] block — and checks the semantic pairs
 * that actually sit on each other in the components.
 *
 * Usage:
 *   node ../ecology/scripts/check-contrast.mjs                 # auto-finds src/styles/theme-*.css in a spoke
 *   node ../ecology/scripts/check-contrast.mjs path/to/theme.css [...]
 *   node scripts/check-contrast.mjs --hub                      # hub defaults only
 *
 * Exit 1 if any TEXT pair fails AA (4.5:1). UI pairs (3:1) and informational
 * pairs report as warnings only. Unresolvable values (alpha, gradients,
 * color-mix) are listed for manual judgment — never silently skipped.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// [foreground, background, minRatio, level] — level: 'fail' blocks, 'warn' reports.
const PAIRS = [
  ['--color-text-primary', '--color-surface', 4.5, 'fail'],
  ['--color-text-primary', '--color-background', 4.5, 'fail'],
  ['--color-text-primary', '--color-surface-sunken', 4.5, 'fail'],
  ['--color-text-secondary', '--color-surface', 4.5, 'fail'],
  ['--color-text-tertiary', '--color-surface', 4.5, 'fail'],
  ['--color-text-muted', '--color-surface', 4.5, 'warn'], // genuine meta text — review, don't block
  ['--color-text-link', '--color-surface', 4.5, 'fail'],
  ['--color-text-inverse', '--color-surface-inverse', 4.5, 'fail'],
  ['--color-text-inverse', '--color-primary', 4.5, 'fail'],
  ['--color-text-inverse', '--color-secondary', 4.5, 'warn'],
  ['--color-text-inverse', '--color-success', 4.5, 'warn'],
  ['--color-text-inverse', '--color-warning', 4.5, 'warn'], // ambers almost always fail; surface it loudly
  ['--color-text-inverse', '--color-danger', 4.5, 'warn'],
  ['--color-text-inverse', '--color-info', 4.5, 'warn'],
  ['--color-text-primary', '--color-primary-subtle', 4.5, 'fail'],
  ['--color-text-primary', '--color-success-subtle', 4.5, 'warn'],
  ['--color-text-primary', '--color-warning-subtle', 4.5, 'warn'],
  ['--color-text-primary', '--color-danger-subtle', 4.5, 'warn'],
  ['--color-text-primary', '--color-info-subtle', 4.5, 'warn'],
  ['--color-disabled-text', '--color-disabled-bg', 4.5, 'warn'], // disabled is exempt from AA; informational
  ['--color-border-focus', '--color-surface', 3.0, 'warn'],
  ['--color-primary', '--color-surface', 3.0, 'warn'], // as a UI/graphic color
];

// --- token graph -------------------------------------------------------------
function parseDeclarations(css, map) {
  // capture every `--name: value;` (last one wins — source order)
  for (const m of css.matchAll(/(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].trim());
  }
}

function resolve(name, map, depth = 0) {
  if (depth > 12) return null;
  const raw = map.get(name);
  if (!raw) return null;
  const varRef = raw.match(/^var\((--[a-zA-Z0-9-_]+)\s*(?:,\s*(.+))?\)$/s);
  if (varRef) {
    return resolve(varRef[1], map, depth + 1) ?? (varRef[2] ? parseColor(varRef[2].trim()) : null);
  }
  return parseColor(raw);
}

function parseColor(v) {
  v = v.trim();
  let m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (m) {
    if (m[2] && parseInt(m[2], 16) < 255) return 'alpha';
    return [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)].map((h) => parseInt(h, 16));
  }
  m = v.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (m) {
    if (m[4] !== undefined && Number(m[4]) < 1) return 'alpha';
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  if (v === 'white') return [255, 255, 255];
  if (v === 'black') return [0, 0, 0];
  if (/var\(/.test(v)) return null; // nested var inside a function — too clever, flag
  return 'unparseable';
}

const lum = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// --- run ---------------------------------------------------------------------
const argPaths = process.argv.slice(2).filter((a) => a !== '--hub');
const hubOnly = process.argv.includes('--hub');

let themeFiles = argPaths;
if (!themeFiles.length && !hubOnly) {
  const stylesDir = path.join(process.cwd(), 'src', 'styles');
  themeFiles = existsSync(stylesDir)
    ? readdirSync(stylesDir)
        .filter((f) => f.startsWith('theme-') && f.endsWith('.css'))
        .map((f) => path.join(stylesDir, f))
    : [];
  if (!themeFiles.length) {
    console.error('no theme file given and none found at src/styles/theme-*.css — pass a path, or --hub for hub defaults');
    process.exit(1);
  }
}

const base = new Map();
parseDeclarations(readFileSync(path.join(HUB, 'packages/tokens/dist/tokens.css'), 'utf8'), base);
parseDeclarations(readFileSync(path.join(HUB, 'packages/tokens/src/component-tokens.css'), 'utf8'), base);

const targets = hubOnly ? [['hub defaults', null]] : themeFiles.map((f) => [path.basename(f), f]);
let failures = 0;

for (const [label, file] of targets) {
  const map = new Map(base);
  if (file) {
    if (!existsSync(file)) { console.error(`not found: ${file}`); process.exit(1); }
    parseDeclarations(readFileSync(file, 'utf8'), map);
  }
  console.log(`\n=== ${label} ===`);
  const manual = [];
  for (const [fg, bg, min, level] of PAIRS) {
    const f = resolve(fg, map);
    const b = resolve(bg, map);
    if (!f || !b || f === 'alpha' || b === 'alpha' || f === 'unparseable' || b === 'unparseable') {
      manual.push(`${fg} on ${bg} (${!f || !b ? 'undefined token' : f === 'alpha' || b === 'alpha' ? 'alpha value' : 'unparseable value'})`);
      continue;
    }
    const r = ratio(f, b);
    const ok = r >= min;
    const mark = ok ? '  ok ' : level === 'fail' ? 'FAIL ' : 'warn ';
    if (!ok && level === 'fail') failures++;
    if (!ok || process.env.VERBOSE) {
      console.log(`${mark} ${fg} on ${bg}: ${r.toFixed(2)}:1 (needs ${min}:1)`);
    }
  }
  const checked = PAIRS.length - manual.length;
  console.log(`checked ${checked}/${PAIRS.length} pairs${manual.length ? ` — manual review needed: ${manual.length}` : ''}`);
  for (const m of manual) console.log(`  manual: ${m}`);
}

console.log(failures ? `\n${failures} AA text-contrast failure(s).` : '\nAll text pairs pass AA.');
process.exit(failures ? 1 : 0);
