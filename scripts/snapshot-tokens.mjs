#!/usr/bin/env node
/**
 * Snapshot the token names this package SHIPS, as a committed baseline.
 *
 *   node scripts/snapshot-tokens.mjs           # check (exit 1 if drifted)
 *   node scripts/snapshot-tokens.mjs --write   # accept the current set
 *
 * WHY THIS EXISTS
 *   Everything else in the migration system — the emitted aliases, the codemod,
 *   doctor's warnings — starts from a row in `migrations.json`. Nothing checked
 *   that the row was ever WRITTEN. Rename or delete a token and forget the row and
 *   the failure is total and silent: no alias is emitted, the codemod has nothing
 *   to rewrite, doctor reports nothing, and every spoke reading the old name loses
 *   the declaration outright (a bare `var(--gone)` does not fall back — it drops
 *   the property).
 *
 *   CLAUDE.md has always stated that risk. This turns it from a thing to remember
 *   into a failing test.
 *
 * WHAT COUNTS AS DRIFT
 *   Only DISAPPEARANCE. A name in the baseline that the hub no longer declares,
 *   and that no migrations row accounts for. Additions are always safe — a spoke
 *   cannot be broken by a token it has never heard of — so new names are absorbed
 *   without ceremony.
 *
 *   A name covered by a normal rename row cannot go missing: build.js emits the
 *   alias, so it is still declared. In practice the names that legitimately
 *   disappear are the `removed: true` ones, which is exactly the deliberate act
 *   this is asking someone to declare.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TOKENS = path.join(ROOT, 'packages/tokens');
const BASELINE = path.join(TOKENS, 'token-names.json');
const WRITE = process.argv.includes('--write');

/** The names the hub currently declares, aliases included — an aliased name still
 *  resolves for a spoke, so it is still "shipped" for this purpose. */
export function shippedNames() {
  const names = new Set();
  for (const f of ['dist/tokens.css', 'src/component-tokens.css']) {
    const p = path.join(TOKENS, f);
    if (!existsSync(p)) continue;
    const css = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) names.add(m[1]);
  }
  return names;
}

/** Every old name any migrations row accounts for. */
export function accountedFor() {
  const { migrations } = JSON.parse(readFileSync(path.join(TOKENS, 'migrations.json'), 'utf8'));
  const set = new Set();
  for (const m of migrations) {
    if (m.kind !== 'token') continue;
    for (const [from] of m.pairs ?? []) set.add(from);
  }
  return set;
}

/** @returns string[] names that vanished with nothing declaring the change. */
export function undeclaredRemovals(baseline, shipped, accounted) {
  return baseline.filter((n) => !shipped.has(n) && !accounted.has(n));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const shipped = shippedNames();
  if (!shipped.size) {
    console.error('✗ no tokens found — run `npm run build:tokens` first.');
    process.exit(1);
  }
  if (WRITE) {
    writeFileSync(BASELINE, `${JSON.stringify({
      $comment: [
        'The token names @esa/tokens ships. A COMMITTED BASELINE, not a build artefact —',
        'its whole job is to be compared against, so regenerating it blindly defeats it.',
        '',
        'A name that disappears from here without a migrations.json row fails `npm test`.',
        'If the removal is deliberate, add the row FIRST (that is what emits the alias or',
        'the removed note), then re-run `npm run tokens:snapshot` to accept the new set.',
      ],
      generated: 'node scripts/snapshot-tokens.mjs --write',
      count: shipped.size,
      names: [...shipped].sort(),
    }, null, 2)}\n`);
    console.log(`✓ baseline written — ${shipped.size} names → packages/tokens/token-names.json`);
    process.exit(0);
  }
  if (!existsSync(BASELINE)) {
    console.error('✗ no baseline yet. Create it: node scripts/snapshot-tokens.mjs --write');
    process.exit(1);
  }
  const { names: baseline } = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const gone = undeclaredRemovals(baseline, shipped, accountedFor());
  if (gone.length) {
    console.error(`\n✗ ${gone.length} token name(s) disappeared with no migrations.json row:\n`);
    for (const n of gone) console.error(`      ${n}`);
    console.error('\n  A spoke reading one of these loses the declaration outright — `var()` does not');
    console.error('  fall back, it drops the property, and nothing errors. Add a row to');
    console.error('  packages/tokens/migrations.json (a rename with `pairs`, or `removed: true`');
    console.error('  when there is no equivalent), then: npm run tokens:snapshot\n');
    process.exit(1);
  }
  const added = [...shipped].filter((n) => !baseline.includes(n));
  console.log(`✓ no undeclared removals (${shipped.size} names${added.length ? `, ${added.length} new` : ''})`);
}
