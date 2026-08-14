#!/usr/bin/env node
/**
 * Migrate a spoke off deprecated @esa/tokens names.
 *
 *   node scripts/migrate-tokens.mjs            # dry run — shows what would change
 *   node scripts/migrate-tokens.mjs --write    # apply
 *
 * Run it from a SPOKE. It resolves the hub through node_modules/@esa/tokens
 * (a `file:` symlink in every spoke), reads `migrations.json`, and rewrites the
 * spoke's own source. There is nothing to keep in sync: the hub declares a
 * rename once, and this applies it.
 *
 * WHY THIS EXISTS
 *   Spokes symlink the hub, so a rename lands in every spoke on the next dev
 *   tick with no publish step to absorb it — and a bare `var(--old-name)` does
 *   not fall back, it drops the declaration. Deprecated aliases keep the old
 *   names resolving; this is how you stop depending on them.
 *
 * WHAT IT WILL NOT DO
 *   Guess. A token the spoke reads that has no migration row and does not exist
 *   in the hub is REPORTED, not rewritten — those are usually names from a scale
 *   retired before this file existed, and each needs a human decision.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { tokenPattern, classPattern, findCollapseCollisions } from './lib/token-rename.mjs';

const WRITE = process.argv.includes('--write');
const CWD = process.cwd();

/* ------------------------------------------------------------ locate the hub */

const TOKENS_PKG = path.join(CWD, 'node_modules', '@esa', 'tokens');
if (!existsSync(TOKENS_PKG)) {
  console.error('✗ node_modules/@esa/tokens not found — run this from a spoke, after npm install.');
  process.exit(1);
}
const MANIFEST = path.join(TOKENS_PKG, 'migrations.json');
if (!existsSync(MANIFEST)) {
  console.error(`✗ ${MANIFEST} not found — the linked @esa/tokens predates migrations.json.`);
  console.error('  Update the hub checkout, then re-run.');
  process.exit(1);
}

const { migrations } = JSON.parse(readFileSync(MANIFEST, 'utf8'));

/** Every token the hub currently declares — used to spot names nothing can fix. */
const declared = new Set();
for (const f of ['dist/tokens.css', 'src/component-tokens.css']) {
  const p = path.join(TOKENS_PKG, f);
  if (!existsSync(p)) continue;
  for (const m of readFileSync(p, 'utf8').matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
}

/* ------------------------------------------------------------- the rewrites */

const tokenPairs = [];
const classPairs = [];
for (const m of migrations) {
  for (const [from, to] of m.pairs) {
    (m.kind === 'token' ? tokenPairs : classPairs).push({ from, to, id: m.id, exact: m.exact !== false });
  }
}
// Longest first: `type-body-small` must be rewritten before `type-body`, or the
// shorter rule eats its prefix and produces `typography-body-md-small`.
tokenPairs.sort((a, b) => b.from.length - a.from.length);
classPairs.sort((a, b) => b.from.length - a.from.length);

const SRC = path.join(CWD, 'src');
if (!existsSync(SRC)) {
  console.error('✗ no src/ directory here.');
  process.exit(1);
}

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (/\.(astro|ts|tsx|js|mjs|css|scss|svelte|vue|md)$/.test(e.name)) files.push(p);
  }
};
walk(SRC);

const applied = new Map();   // id -> count
const touched = new Set();
const inexact = new Set();

/* ---------------------------------------------- refuse to lose a value silently
 * Checked BEFORE anything is written. A collapse collision cannot be auto-resolved:
 * only a human knows which of the two values this spoke actually wants. Writing a
 * partial migration here would be worse than writing none, so nothing is written
 * until they are gone. */
const collisions = [];
for (const file of files) {
  const found = findCollapseCollisions(readFileSync(file, 'utf8'), tokenPairs);
  if (found.length) collisions.push({ file: path.relative(CWD, file), found });
}
if (collisions.length) {
  console.error(`\n✗ ${collisions.length} file(s) declare BOTH sides of a rename that collapses two names into one.`);
  console.error('  Rewriting them would emit the same property twice, the later one would win,');
  console.error('  and the earlier value would be gone with no error. Nothing has been changed.\n');
  for (const { file, found } of collisions) {
    console.error(`  ${file}`);
    for (const { to, froms } of found) {
      console.error(`    these collapse to ${to}:`);
      for (const f of froms) console.error(`      ${f.name}: ${f.value};`);
    }
  }
  console.error('\n  The hub merged these because they held the SAME value there. This spoke gave');
  console.error('  them different ones, so the distinction is real here and only you can settle it.');
  console.error('  Decide which value survives, delete the other declaration, then re-run.');
  process.exit(1);
}

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let out = src;

  for (const { from, to, id, exact } of tokenPairs) {
    // Both boundaries matter — see lib/token-rename.mjs for why the LEADING one is
    // the load-bearing half (BEM modifier classes end in the token name verbatim).
    out = out.replace(tokenPattern(from), () => {
      applied.set(id, (applied.get(id) ?? 0) + 1);
      if (!exact) inexact.add(id);
      return to;
    });
  }

  for (const { from, to, id, exact } of classPairs) {
    // Bare words in class="" / class:list / clsx. Same boundary rule, so `type-body`
    // never matches inside `type-body-small` or a spoke's own `cbf-type-body`.
    out = out.replace(classPattern(from), () => {
      applied.set(id, (applied.get(id) ?? 0) + 1);
      if (!exact) inexact.add(id);
      return to;
    });
  }

  if (out !== src) {
    touched.add(path.relative(CWD, file));
    if (WRITE) writeFileSync(file, out);
  }
}

/* ------------------------------------------- what this tool cannot fix alone */

const unfixable = new Map();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/var\(\s*(--[a-zA-Z][\w-]*)\s*\)/g)) {
    const t = m[1];
    if (t.startsWith('--_')) continue;                 // component private
    if (declared.has(t)) continue;                     // resolves fine
    if (tokenPairs.some((p) => p.from === t)) continue; // this run fixes it
    if (/^--(cbf|aet|bcn|smaqmd|aer)-/.test(t)) continue; // spoke's own namespace
    if (!unfixable.has(t)) unfixable.set(t, new Set());
    unfixable.get(t).add(path.relative(CWD, file));
  }
}

/* ------------------------------------------------------------------ report */

const total = [...applied.values()].reduce((a, b) => a + b, 0);
console.log(`\n${WRITE ? 'APPLIED' : 'DRY RUN'} — ${path.basename(CWD)}`);
console.log(`  ${total} replacements across ${touched.size} files\n`);
for (const m of migrations) {
  const n = applied.get(m.id);
  if (!n) continue;
  console.log(`  ${String(n).padStart(4)}  ${m.id}${m.exact === false ? '   ⚠ NOT an exact alias' : ''}`);
}
if (inexact.size) {
  console.log('\n  ⚠ One or more rules change rendering, not just the name:');
  for (const id of inexact) {
    const m = migrations.find((x) => x.id === id);
    console.log(`      ${id}: ${m.why}`);
  }
}
if (unfixable.size) {
  console.log(`\n  ${unfixable.size} token(s) read here that the hub does not declare and no`);
  console.log('  migration covers. These are already broken and need a decision:');
  for (const [t, fs_] of unfixable) console.log(`      ${t}  (${fs_.size} file${fs_.size === 1 ? '' : 's'})`);
}
if (!WRITE && total) console.log('\n  Re-run with --write to apply. Commit first — this edits in place.');
if (WRITE) console.log('\n  Done. Rebuild and eyeball the result: the rename alone should change nothing visually.');
