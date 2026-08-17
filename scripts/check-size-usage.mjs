#!/usr/bin/env node
/**
 * check-size-usage.mjs — which call sites use a size step that is too small to be
 * accessible under an assurance profile.
 *
 * WHY THIS IS A REPORT AND NOT A RENDERING CHANGE
 *
 * The obvious implementation was tried first and withdrawn: a `--target-size-min`
 * token that components read as a `min-block-size`, 0 by default and 24px under
 * `[data-assurance]`. It worked — 33 measured component failures went to 0 — and it
 * was still wrong, for a reason that is about design rather than code.
 *
 * A floor SILENTLY FLATTENS THE BOTTOM OF THE RAMP. Under the profile, `xs` and `sm`
 * rendered at the same height on chip-group, checkbox-group and radio-group. `xs`
 * stopped meaning xs, the author who wrote it was never told, and the size scale —
 * a designed object with four deliberate steps — quietly became three. A profile may
 * re-point colours, because a colour role is a value. It must not redefine what a
 * STEP means, because the ramp is the contract.
 *
 * So rendering is untouched and the author is told instead. They change `size="xs"`
 * to `size="sm"` in their own source, the ramp keeps its shape at every step, and
 * the change is visible in their diff rather than hidden in a stylesheet they never
 * opened.
 *
 * THE MAP IS MEASURED, NOT DECLARED. `packages/tokens/size-floors.json` is generated
 * by `check-target-size.mjs --emit-floors`, which renders the specimen site in a real
 * browser. Nothing here hardcodes which steps are too small, so when a component's
 * padding or type rung changes, re-running the measurement updates the lint.
 *
 * Usage:
 *   node scripts/check-size-usage.mjs                    # scan ./src, report
 *   node scripts/check-size-usage.mjs --dir apps/site/src
 *   node scripts/check-size-usage.mjs --strict           # exit 1 on any finding
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importedAs } from './lib/token-rename.mjs';

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CWD = process.cwd();

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : (argv[i + 1] ?? ''); };
const strict = argv.includes('--strict');

const ORDER = ['xs', 'sm', 'md', 'lg'];
// The step a component renders when the author writes no `size` at all. Every
// component in this kit defaults to md, which is why a bare <esa-checkbox> counts as
// a finding whenever md is in the map — the most easily missed case, and the one a
// naive `grep size="xs"` cannot see at all.
const DEFAULT_SIZE = 'md';

// The map ships from @esa/tokens so a spoke can lint without a built copy of the
// hub's specimen site. Fall back to the hub's own path when running here.
const MAP_PATHS = [
  path.join(CWD, 'node_modules', '@esa', 'tokens', 'size-floors.json'),
  path.join(HUB, 'packages', 'tokens', 'size-floors.json'),
];
const mapPath = MAP_PATHS.find(existsSync);
if (!mapPath) {
  console.error(
    'no size-floors.json found. Generate it in the hub with:\n' +
      '  npm run build && node scripts/check-target-size.mjs --assurance wcag-aa --emit-floors packages/tokens/size-floors.json',
  );
  process.exit(1);
}
const floors = JSON.parse(readFileSync(mapPath, 'utf8'));
const TOO_SMALL = floors.components ?? {};

const SCAN_EXT = new Set(['.astro', '.html', '.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.vue', '.svelte']);
const SKIP_DIR = new Set(['node_modules', 'dist', '.git', '.astro', 'build', 'coverage']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(path.extname(entry))) out.push(full);
  }
  return out;
}

const rootDir = path.resolve(flag('--dir') || path.join(CWD, 'src'));
if (!existsSync(rootDir)) {
  console.error(`no such directory: ${rootDir} — pass --dir <path>`);
  process.exit(1);
}

/**
 * Every opening tag for `component` in this file, as [index, attributeText].
 *
 * Both spellings, for the same reason renameProp handles both: a spoke writes the
 * custom element in plain markup and the Astro wrapper in .astro files, and the two
 * are the same component. The alias is resolved from the file's OWN imports, so
 * `import Chip from '@esa/ecology/esa-chip-group.astro'` rendering `<Chip size="xs">`
 * is caught — a fixed tag list cannot see that, and hard-coding `Chip` would hit any
 * unrelated component sharing the name.
 */
function findTags(src, component) {
  const names = [component, ...importedAs(src, `${component}.astro`)];
  const hits = [];
  for (const name of names) {
    const re = new RegExp(`<${name}(?![\\w-])([^>]*)>`, 'g');
    for (const m of src.matchAll(re)) hits.push([m.index, m[1]]);
  }
  return hits;
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

const findings = [];
const dynamic = [];
for (const file of walk(rootDir)) {
  const src = readFileSync(file, 'utf8');
  for (const [component, badSizes] of Object.entries(TOO_SMALL)) {
    if (!src.includes(component) && !src.includes(component.replace(/^esa-/, ''))) continue;
    for (const [index, attrs] of findTags(src, component)) {
      const m = /(?<![\w-])size\s*=\s*["'{]?\s*([a-z]+)/.exec(attrs);
      // A dynamic size (size={x}) cannot be judged from source. Skipped rather than
      // guessed — and counted, so the report never reads as full coverage.
      if (attrs.includes('size=') && !m) { dynamic.push(`${path.relative(CWD, file)}:${lineOf(src, index)} ${component}`); continue; }
      const size = m ? m[1] : DEFAULT_SIZE;
      if (!badSizes.includes(size)) continue;
      const smallestOk = ORDER.find((s) => ORDER.indexOf(s) > ORDER.indexOf(size) && !badSizes.includes(s));
      findings.push({
        file: path.relative(CWD, file),
        line: lineOf(src, index),
        component,
        size,
        implicit: !m,
        fix: smallestOk,
      });
    }
  }
}

// --- report ------------------------------------------------------------------
console.log(`size floor: profile "${floors.$profile}", minimum ${floors.$minSize}x${floors.$minSize}px`);
console.log(`map: ${path.relative(CWD, mapPath)} (${floors.$measured})`);
console.log(`scanned: ${path.relative(CWD, rootDir)}\n`);

if (!findings.length) {
  console.log('✓ no call sites use a size step below the floor.');
} else {
  const byComponent = new Map();
  for (const f of findings) {
    if (!byComponent.has(f.component)) byComponent.set(f.component, []);
    byComponent.get(f.component).push(f);
  }
  for (const [component, list] of [...byComponent].sort()) {
    const bad = TOO_SMALL[component];
    console.log(`${component} — ${bad.join(', ')} render under ${floors.$minSize}px`);
    for (const f of list) {
      const shown = f.implicit ? `no size attribute → ${f.size}` : `size="${f.size}"`;
      console.log(`   ${f.file}:${f.line}`);
      console.log(`      ${shown}${f.fix ? `  →  use size="${f.fix}"` : '  →  NO larger step passes; this is a component defect'}`);
    }
    console.log('');
  }
  const implicit = findings.filter((f) => f.implicit).length;
  console.log(`${findings.length} call site(s) to change` + (implicit ? `, ${implicit} of them with NO size attribute (the default step is itself too small)` : '') + '.');
}

if (dynamic.length) {
  console.log(`\n${dynamic.length} call site(s) pass a DYNAMIC size and were not judged:`);
  for (const d of dynamic.slice(0, 10)) console.log(`   ${d}`);
  if (dynamic.length > 10) console.log(`   …and ${dynamic.length - 10} more`);
}

/*
 * Two closing notes, and the split between them is the whole policy.
 *
 * A profile never resizes a component. So when a step is too small there are exactly
 * two outcomes: a compliant step ALREADY EXISTS and the author is guided to it, or it
 * does NOT and one has to be built. Anything reported here falls into one of those,
 * and saying which is what makes the report actionable rather than merely true.
 */
const defaultBroken = Object.entries(TOO_SMALL).filter(([, s]) => s.includes(DEFAULT_SIZE));
if (defaultBroken.length) {
  console.log(`\nNOTE — ${defaultBroken.length} component(s) are under the floor at their DEFAULT step (${DEFAULT_SIZE}),`);
  console.log(`so every call site that omits a size is a finding, not just the explicit ones:`);
  for (const [c, s] of defaultBroken) {
    const ok = ORDER.filter((x) => !s.includes(x));
    console.log(`   ${c.padEnd(20)} too small: ${s.join(', ')}   →  compliant: ${ok.join(', ') || 'NONE'}`);
  }
}

// The case the hub has to answer for: no step clears the floor, so there is nothing to
// guide anyone to. This is the "then we should make it" branch — a real size variant,
// via /request-lego. Reported separately because a spoke cannot act on it at all.
const noWayOut = Object.entries(TOO_SMALL).filter(([, s]) => ORDER.every((x) => s.includes(x)));
if (noWayOut.length) {
  console.log(`\n⚠  ${noWayOut.length} component(s) have NO compliant size step — every step is under the floor:`);
  for (const [c] of noWayOut) console.log(`   ${c}`);
  console.log('   Nothing a call site can change fixes these. They need a size variant that clears');
  console.log('   the floor — a /request-lego against the hub, not a spoke edit.');
}

if (strict && findings.length) process.exit(1);
