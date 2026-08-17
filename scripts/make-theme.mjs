#!/usr/bin/env node
/**
 * make-theme.mjs — a recipe (or a handful of flags) → theme-<slug>.css.
 *
 * This fills the gap between create-spoke.mjs, which scaffolds a theme file full of
 * `__FILL__` markers and tells you to fill it in by hand, and check-contrast.mjs, which
 * grades whatever you filled in. Between them there was nothing but a person with a hex
 * code, and the evidence says that did not work: the one local spoke still ships the
 * template's placeholder grey ramp verbatim, and NOBODY has ever declared the eight
 * --color-content-on-* foregrounds the gate blocks on.
 *
 * Usage:
 *   node scripts/make-theme.mjs --recipe path/to/theme-acme.json
 *   node scripts/make-theme.mjs --brand '#1769aa' --slug qanat [--neutral cool] [--corners round]
 *
 *   --out <dir>       where to write (default: cwd)
 *   --scheme <s>      emit only one scheme; repeatable. Default: both.
 *   --scope <name>    prefix for the spoke-tier ramps (default: the slug)
 *   --stdout          print the CSS instead of writing anything
 *   --no-recipe       skip writing the .json alongside the .css
 *   --force           overwrite existing files
 *
 * Writes BOTH theme-<slug>.css and theme-<slug>.json. The JSON is the durable half:
 * the CSS can always be regenerated from it, and it is what records which values a
 * human pinned so regeneration does not clobber them.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CORNERS, NEUTRAL_TEMPERATURES, SCHEMES, deriveTheme, emitCss } from './lib/theme-recipe.mjs';

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

const USAGE = `usage:
  node scripts/make-theme.mjs --recipe <file.json> [--out <dir>] [--stdout] [--force]
  node scripts/make-theme.mjs --brand <#hex> --slug <slug> [--neutral ${NEUTRAL_TEMPERATURES.join('|')}]
                              [--corners ${Object.keys(CORNERS).join('|')}] [--scope <name>]
                              [--font-sans <stack>] [--font-mono <stack>] [--font-display <stack>]
                              [--accent <#hex>] [--ai <#hex>]
                              [--info <#hex>] [--success <#hex>] [--warning <#hex>] [--danger <#hex>]
                              [--scheme light|dark] [--out <dir>] [--stdout] [--no-recipe] [--force]`;

// --- argv --------------------------------------------------------------------

const VALUE_FLAGS = new Set([
  'recipe', 'out', 'slug', 'scope', 'brand', 'neutral', 'corners',
  'font-sans', 'font-mono', 'font-display',
  'accent', 'ai', 'info', 'success', 'warning', 'danger',
]);
const BOOL_FLAGS = new Set(['stdout', 'force', 'no-recipe', 'help']);

const argv = process.argv.slice(2);
const opts = {};
const schemes = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) die(`unexpected argument: ${a}\n\n${USAGE}`);
  const name = a.slice(2);
  if (name === 'scheme') {
    const v = argv[++i];
    if (!SCHEMES.includes(v)) die(`--scheme must be one of: ${SCHEMES.join(', ')}`);
    schemes.push(v);
  } else if (VALUE_FLAGS.has(name)) {
    const v = argv[++i];
    if (v === undefined || v.startsWith('--')) die(`--${name} needs a value\n\n${USAGE}`);
    opts[name] = v;
  } else if (BOOL_FLAGS.has(name)) {
    opts[name] = true;
  } else {
    die(`unknown flag: ${a}\n\n${USAGE}`);
  }
}

if (opts.help || argv.length === 0) {
  console.log(USAGE);
  process.exit(argv.length === 0 ? 1 : 0);
}

// --- recipe ------------------------------------------------------------------

let recipe;
if (opts.recipe) {
  if (!existsSync(opts.recipe)) die(`not found: ${opts.recipe}`);
  try {
    recipe = JSON.parse(readFileSync(opts.recipe, 'utf8'));
  } catch (e) {
    die(`${opts.recipe} is not valid JSON — ${e.message}`);
  }
  // Flags still win over the file, so `--recipe x.json --brand '#123456'` is a
  // one-off variation rather than an edit. The written recipe records the result.
  if (opts.slug) recipe.slug = opts.slug;
  if (opts.scope) recipe.scope = opts.scope;
} else {
  if (!opts.brand || !opts.slug) die(`--brand and --slug are required without --recipe\n\n${USAGE}`);
  recipe = { slug: opts.slug, seeds: {} };
  if (opts.scope) recipe.scope = opts.scope;
}

recipe.seeds ??= {};
const seedFlag = (flag, key) => {
  if (opts[flag] !== undefined) recipe.seeds[key] = opts[flag];
};
seedFlag('brand', 'brand');
seedFlag('neutral', 'neutral');
seedFlag('corners', 'corners');
seedFlag('font-sans', 'fontSans');
seedFlag('font-mono', 'fontMono');
seedFlag('font-display', 'fontDisplay');
for (const k of ['accent', 'ai', 'info', 'success', 'warning', 'danger']) seedFlag(k, k);

if (schemes.length) recipe.schemes = schemes;

let derived;
try {
  derived = deriveTheme(recipe);
} catch (e) {
  die(`✗ ${e.message}`);
}

const css = emitCss(derived, { schemes: recipe.schemes || SCHEMES });

// --- report ------------------------------------------------------------------
//
// The warnings go to stderr so `--stdout > theme.css` stays clean, and they are printed
// whether or not anything is written. A generator that silently moved a fill and said
// nothing would be a worse version of the hand-fill it replaces.
const byLevel = (lvl) => derived.warnings.filter((w) => w.level === lvl);
for (const w of byLevel('info')) console.error(`  note  [${w.scheme}] ${w.role}: ${w.message}`);
for (const w of byLevel('fail')) console.error(`  FAIL  [${w.scheme}] ${w.role}: ${w.message}`);

if (opts.stdout) {
  process.stdout.write(css);
  process.exit(byLevel('fail').length ? 1 : 0);
}

// --- write -------------------------------------------------------------------

const outDir = path.resolve(opts.out || process.cwd());
mkdirSync(outDir, { recursive: true });

const cssPath = path.join(outDir, `theme-${derived.meta.slug}.css`);
const jsonPath = path.join(outDir, `theme-${derived.meta.slug}.json`);

for (const p of opts['no-recipe'] ? [cssPath] : [cssPath, jsonPath]) {
  if (existsSync(p) && !opts.force) {
    die(`✗ ${path.relative(process.cwd(), p)} exists — pass --force to overwrite`);
  }
}

writeFileSync(cssPath, css);
console.log(
  `wrote ${path.relative(process.cwd(), cssPath)} — ` +
    `${derived.light.size} light + ${derived.dark.size} dark declarations`,
);

if (!opts['no-recipe']) {
  // Round-tripped through deriveTheme's normalisation, so the file on disk is the
  // recipe that actually produced this CSS rather than the shorthand someone typed.
  const normalised = {
    slug: derived.meta.slug,
    scope: derived.meta.scope,
    seeds: derived.meta.seeds,
    ...(recipe.pinned && Object.keys(recipe.pinned).length ? { pinned: recipe.pinned } : {}),
    ...(recipe.pinnedDark && Object.keys(recipe.pinnedDark).length ? { pinnedDark: recipe.pinnedDark } : {}),
    ...(recipe.schemes ? { schemes: recipe.schemes } : {}),
  };
  writeFileSync(jsonPath, JSON.stringify(normalised, null, 2) + '\n');
  console.log(`wrote ${path.relative(process.cwd(), jsonPath)} — the recipe; regenerate with --recipe`);
}

console.log(
  `\nbrand ${derived.meta.seeds.brand} sits exactly on step 9 (curve: Radix ${derived.meta.brandScale}).\n` +
    `verify:  node ${path.relative(process.cwd(), path.join(import.meta.dirname, 'check-contrast.mjs'))} ` +
    `${path.relative(process.cwd(), cssPath)}\n` +
    `         (add --scheme dark for the dark block)`,
);

process.exit(byLevel('fail').length ? 1 : 0);
