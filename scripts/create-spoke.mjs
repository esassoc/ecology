#!/usr/bin/env node
/**
 * create-spoke.mjs — deterministic scaffold for a new Ecology spoke.
 *
 * The mechanical half of /spoke-init. Copies packages/spoke-template/ to a
 * sibling of the hub checkout — INCLUDING dotfiles like .claude/ (a hand-run
 * `cp` glob once silently dropped it; that miss cost a full page rewrite) —
 * renames the templated files, substitutes every placeholder, and fails
 * loudly if any placeholder survives. Judgment work (brand extraction,
 * catalog mapping) stays with /spoke-init; this script does only the part
 * that must never depend on anyone remembering it.
 *
 * Usage (from anywhere; paths resolve relative to this script):
 *   node scripts/create-spoke.mjs --name "Biochar Atlas" --slug biochar \
 *     --dir biochar-design [--scope biochar] [--mark B] [--tagline "..."] \
 *     [--fonts '<link ... />']
 *
 * No network, no npm, no commit — git init only.
 */

import { cpSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';

const HUB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(HUB_ROOT, 'packages', 'spoke-template');

const { values: args } = parseArgs({
  options: {
    name:    { type: 'string' },
    slug:    { type: 'string' },
    dir:     { type: 'string' },
    scope:   { type: 'string' },
    mark:    { type: 'string' },
    tagline: { type: 'string' },
    fonts:   { type: 'string' },
  },
});

const fail = (msg) => { console.error(`\ncreate-spoke: ${msg}`); process.exit(1); };
// For failures after the copy landed: remove the partial scaffold — a
// half-instantiated spoke on disk is exactly the hazard this script exists
// to prevent. Safe because this run created DEST (existsSync guard above).
const failAfterCopy = (msg) => {
  rmSync(DEST, { recursive: true, force: true });
  fail(`${msg}\n(removed the partial scaffold at ${DEST})`);
};

// --- Validate inputs -------------------------------------------------------
if (!args.name || !args.slug || !args.dir) {
  fail('required: --name "Display Name" --slug <slug> --dir <repo-dir>\n' +
       'optional: --scope <npm-scope, default slug> --mark <brand mark> --tagline "..." --fonts \'<link ... />\'');
}
if (!/^[a-z][a-z0-9-]*$/.test(args.slug)) fail(`--slug must be lowercase kebab (got "${args.slug}")`);
if (!/^[a-z][a-z0-9-]*$/.test(args.dir))  fail(`--dir must be lowercase kebab (got "${args.dir}")`);
if (!existsSync(TEMPLATE)) fail(`template not found at ${TEMPLATE}`);

const DEST = resolve(HUB_ROOT, '..', args.dir);
if (existsSync(DEST)) fail(`${DEST} already exists — refusing to overwrite`);

const substitutions = {
  __SPOKE_NAME__:    args.name,
  __SPOKE_SLUG__:    args.slug,
  __SPOKE_DIR__:     args.dir,
  __SCOPE__:         args.scope ?? args.slug,
  __BRAND_MARK__:    args.mark ?? args.name.trim()[0].toUpperCase(),
  __SPOKE_TAGLINE__: args.tagline ?? `Design system and prototypes for ${args.name}`,
  __FONT_LINKS__:    args.fonts ?? '<!-- TODO(spoke-init): add the brand\'s Google Fonts <link> tags -->',
};

// --- 1. Copy — recursive cpSync includes dotfiles (.claude/ etc.) ----------
cpSync(TEMPLATE, DEST, {
  recursive: true,
  filter: (src) => !src.endsWith('.DS_Store'),
});
console.log(`copied  ${relative(process.cwd(), TEMPLATE) || TEMPLATE} -> ${DEST}`);

// --- 2. Rename templated filenames -----------------------------------------
renameSync(join(DEST, 'package.json.tmpl'), join(DEST, 'package.json'));
renameSync(
  join(DEST, 'src', 'styles', 'theme-__SPOKE_SLUG__.css'),
  join(DEST, 'src', 'styles', `theme-${args.slug}.css`),
);
console.log(`renamed package.json.tmpl, theme-${args.slug}.css`);

// --- 3. Substitute placeholders in every file ------------------------------
const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  const p = join(dir, entry);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

let substituted = 0;
for (const file of walk(DEST)) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [token, value] of Object.entries(substitutions)) {
    after = after.replaceAll(token, value);
  }
  if (after !== before) { writeFileSync(file, after); substituted++; }
}
console.log(`substituted placeholders in ${substituted} files`);

// --- 4. Fail loudly on any surviving placeholder ---------------------------
// META_TOKENS are allowed to survive: __FILL__ marks values brand-extraction
// fills by hand, and __PLACEHOLDER__ appears in README prose ABOUT the token
// scheme. Anything else matching __X__ means the template grew a token this
// script's map doesn't know.
const META_TOKENS = new Set(['__FILL__', '__PLACEHOLDER__']);
const leftovers = [];
for (const file of walk(DEST)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const hits = line.match(/__[A-Z][A-Z_]+__/g);
    for (const hit of hits ?? []) {
      if (!META_TOKENS.has(hit)) leftovers.push(`${relative(DEST, file)}:${i + 1}  ${hit}`);
    }
  });
}
if (leftovers.length) {
  failAfterCopy(`unsubstituted placeholders remain — add them to this script's map:\n  ${leftovers.join('\n  ')}`);
}

// --- 5. Sanity: the intelligence layer made the trip -----------------------
if (!existsSync(join(DEST, '.claude', 'settings.json'))) {
  failAfterCopy('.claude/settings.json missing from the scaffold — the spoke would run without the spoke-kit plugin declaration');
}

// --- 6. git init (no commit — review first) --------------------------------
execFileSync('git', ['init', '-b', 'main'], { cwd: DEST, stdio: 'ignore' });
console.log('git init -b main');

// --- 7. Register in the hub site's spoke directory --------------------------
// apps/site/src/data/spokes.ts drives the /guide spoke directory; appending
// here (instead of remembering to) is what keeps that page honest. The hub's
// CI deploy publishes it on the next hub push.
const SPOKES_TS = join(HUB_ROOT, 'apps', 'site', 'src', 'data', 'spokes.ts');
if (!existsSync(SPOKES_TS)) {
  console.warn('warn    apps/site/src/data/spokes.ts not found — add the spoke to the /guide directory by hand');
} else if (readFileSync(SPOKES_TS, 'utf8').includes(`slug: '${args.slug}'`)) {
  console.log(`spokes.ts already lists '${args.slug}' — left as is`);
} else {
  const entry = [
    '  {',
    `    name: '${args.name.replace(/'/g, "\\'")}',`,
    `    slug: '${args.slug}',`,
    `    purpose: '${substitutions.__SPOKE_TAGLINE__.replace(/'/g, "\\'")}',`,
    `    repo: 'https://github.com/esassoc/${args.dir}',`,
    `    site: 'https://esassoc.github.io/${args.dir}/',`,
    '  },',
  ].join('\n');
  const src = readFileSync(SPOKES_TS, 'utf8');
  const updated = src.replace(/\n\];\s*$/, `\n${entry}\n];\n`);
  if (updated === src) {
    console.warn('warn    could not find the closing ]; in spokes.ts — add the entry by hand');
  } else {
    writeFileSync(SPOKES_TS, updated);
    console.log(`registered '${args.slug}' in apps/site/src/data/spokes.ts — commit + push the hub to publish the /guide directory`);
  }
}

console.log(`
spoke scaffolded at ${DEST}

Next steps (the /spoke-init command walks these):
  1. cd ${DEST} && npm install        # resolves file:../ecology deps
  2. Open Claude Code there — accept the spoke-kit plugin install prompt
  3. Brand extraction: fill theme-${args.slug}.css (human-reviewed table)
  4. Catalog: populate src/data/ds-nav.ts + design-system/components/ pages
  5. Run the definition-of-done checklist (spoke-init skill) before first commit
`);
