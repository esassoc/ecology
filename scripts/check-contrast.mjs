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
 * The pair table and the graph reader live in scripts/lib/contrast.mjs, so the
 * theme maker page grades a live preview with the same definitions this gate uses.
 * This file is argv, files, and printing.
 *
 * Usage:
 *   node ../ecology/scripts/check-contrast.mjs                 # auto-finds src/styles/theme-*.css in a spoke
 *   node ../ecology/scripts/check-contrast.mjs path/to/theme.css [...]
 *   node scripts/check-contrast.mjs --hub                      # hub defaults only
 *   node scripts/check-contrast.mjs theme.css --scheme dark    # audit the dark block
 *   node scripts/check-contrast.mjs --hub --assurance wcag-aa  # compose an assurance profile
 *
 * Exit 1 if any TEXT pair fails AA (4.5:1). UI pairs (3:1) and informational
 * pairs report as warnings only. Unresolvable values (alpha, gradients,
 * color-mix) are listed for manual judgment — never silently skipped.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAIRS, auditPairs, parseDeclarations } from './lib/contrast.mjs';

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- argv --------------------------------------------------------------------
//
// HAND-ROLLED, AND IT USED TO DROP THE FIRST PATH. The old filter read
// `i !== assuranceIdx + 1` to skip the profile name — but with no --assurance flag
// assuranceIdx is -1, so the condition became `i !== 0` and ate argv[0]. The single
// most-documented invocation, `check-contrast.mjs path/to/theme.css`, therefore
// discarded its argument and fell through to spoke auto-discovery, which in the hub
// finds nothing and exits 1 with "no theme file given". Passing the same path twice
// worked. This loop consumes flag values explicitly instead.
const argv = process.argv.slice(2);
const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

let hubOnly = false;
let assurance = null;
let scheme = 'light';
const argPaths = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--hub') {
    hubOnly = true;
  } else if (a === '--assurance') {
    // --assurance <profile> composes the accessibility assurance block OVER the theme,
    // which is the order the browser resolves them in and therefore the only order worth
    // auditing. Note what that order means for a spoke: `[data-theme]` and
    // `[data-a11y-assurance]` have identical specificity and the theme's stylesheet loads
    // later, so A THEME STILL WINS. The profile cannot rescue a brand colour it does not
    // know about — this run is what tells a spoke its brand needs a darker step.
    assurance = argv[++i];
    if (!assurance || assurance.startsWith('--')) die('--assurance needs a profile name, e.g. --assurance wcag-aa');
  } else if (a === '--scheme') {
    scheme = argv[++i];
    if (!scheme || scheme.startsWith('--')) die('--scheme needs a value, e.g. --scheme dark');
  } else if (a.startsWith('--')) {
    die(`unknown flag: ${a}`);
  } else {
    argPaths.push(a);
  }
}

let themeFiles = argPaths;
if (!themeFiles.length && !hubOnly) {
  const stylesDir = path.join(process.cwd(), 'src', 'styles');
  themeFiles = existsSync(stylesDir)
    ? readdirSync(stylesDir)
        .filter((f) => f.startsWith('theme-') && f.endsWith('.css'))
        .map((f) => path.join(stylesDir, f))
    : [];
  if (!themeFiles.length) {
    die('no theme file given and none found at src/styles/theme-*.css — pass a path, or --hub for hub defaults');
  }
}

const tokensCss = readFileSync(path.join(HUB, 'packages/tokens/dist/tokens.css'), 'utf8');

// Assert the profile EXISTS before reporting on it. A typo'd name would otherwise
// match no block, compose nothing, and print a clean run under a header claiming the
// profile was applied — the most expensive possible way to be wrong here.
if (assurance && !tokensCss.includes(`[data-a11y-assurance="${assurance}"]`)) {
  const found = [...tokensCss.matchAll(/\[data-a11y-assurance="([^"]+)"\]/g)].map((m) => m[1]);
  die(
    `✗ no [data-a11y-assurance="${assurance}"] block in dist/tokens.css` +
      (found.length ? ` — profiles that exist: ${[...new Set(found)].join(', ')}` : ''),
  );
}

const base = new Map();
const opts = { assurance, scheme };
parseDeclarations(tokensCss, base, opts);
parseDeclarations(readFileSync(path.join(HUB, 'packages/tokens/src/component-tokens.css'), 'utf8'), base, opts);
if (assurance) console.log(`assurance profile: ${assurance} (composed UNDER the theme, as the browser resolves it)`);
// Say which scheme is being graded whenever it is not the default, for the same reason
// the assurance line exists: an audit that stops describing what it claims to report on
// is this script's recorded failure mode.
if (scheme !== 'light') console.log(`scheme: ${scheme} ([data-scheme] blocks for other schemes are skipped)`);

const targets = hubOnly ? [['hub defaults', null]] : themeFiles.map((f) => [path.basename(f), f]);
let failures = 0;
let unresolved = false;

for (const [label, file] of targets) {
  const map = new Map(base);
  if (file) {
    if (!existsSync(file)) die(`not found: ${file}`);
    parseDeclarations(readFileSync(file, 'utf8'), map, opts);
  }
  console.log(`\n=== ${label} ===`);
  const { rows, manual, checked, failures: failed, underResolved } = auditPairs(map);
  failures += failed;
  for (const r of rows) {
    const mark = r.ok ? '  ok ' : r.level === 'fail' ? 'FAIL ' : 'warn ';
    if (!r.ok || process.env.VERBOSE) {
      console.log(`${mark} ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 (needs ${r.min}:1)`);
    }
  }
  console.log(`checked ${checked}/${PAIRS.length} pairs${manual.length ? ` — manual review needed: ${manual.length}` : ''}`);
  for (const m of manual) console.log(`  manual: ${m.text}`);
  if (underResolved) {
    console.error(
      `\n✗ only ${checked}/${PAIRS.length} pairs resolved — this audit is not reporting on your theme.\n` +
        '  Usually a renamed token, or values this parser cannot read. Fix before trusting the result.',
    );
    unresolved = true;
  }
}

if (failures) console.log(`\n${failures} AA text-contrast failure(s).`);
else if (!unresolved) console.log('\nAll text pairs pass AA.');
process.exit(failures || unresolved ? 1 : 0);
