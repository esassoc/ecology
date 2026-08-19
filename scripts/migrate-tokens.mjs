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
import {
  tokenPattern, classPattern, renameProp, renameComponent, findCollapseCollisions,
  declPattern, readPattern, unresolvedChain, parseDeclarations,
} from './lib/token-rename.mjs';

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

/** Every token the hub declares, with its VALUE — the value half is what lets a
 *  destination be walked to a terminal literal rather than merely counted present. */
const declValues = new Map();
for (const f of ['dist/tokens.css', 'src/component-tokens.css']) {
  const p = path.join(TOKENS_PKG, f);
  if (!existsSync(p)) continue;
  parseDeclarations(readFileSync(p, 'utf8'), declValues);
}
const declared = new Set(declValues.keys());

/* ------------------------------------------------------------- the rewrites */

const tokenPairs = [];
const classPairs = [];
const propPairs = [];
const componentRows = [];
const removedRows = [];
for (const m of migrations) {
  // A `component` row is not a (from, to) PAIR — it carries a tag rename, added
  // props, renamed props and a module repoint together, so it never enters the
  // pair loop below.
  if (m.kind === 'component') { componentRows.push(m); continue; }
  // A REMOVED token has no equivalent, so rewriting `from` → `to` would put a
  // wrong value in a spoke's source rather than migrating it. Report it for a
  // human instead of touching the file.
  if (m.removed) { removedRows.push(m); continue; }
  for (const [from, to] of m.pairs) {
    const pair = { from, to, id: m.id, exact: m.exact !== false };
    if (m.kind === 'token') tokenPairs.push(pair);
    // A prop is only meaningful on its own component, so it carries the tags it
    // applies to. Without them the rewrite would be a global find-and-replace —
    // see lib/token-rename.mjs for what that destroys.
    else if (m.kind === 'prop') propPairs.push({ ...pair, components: m.components ?? [], module: m.module });
    else classPairs.push(pair);
  }
}
// Longest first: `type-body-small` must be rewritten before `type-body`, or the
// shorter rule eats its prefix and produces `typography-body-md-small`.
tokenPairs.sort((a, b) => b.from.length - a.from.length);
classPairs.sort((a, b) => b.from.length - a.from.length);

/* ------------------------------------- refuse to rename ONTO a name that is dead
 * A row's destination can be deleted by a LATER change. `--form-height-*` renames to
 * `--control-height-*`, which was then removed the same day with no alias — so the
 * rename "succeeds" and leaves the spoke reading a name that resolves to nothing.
 * The old removed-row scan could not see this: it looks for the removed token's own
 * names, and the spoke does not use those yet — it is about to be given them.
 *
 * These pairs are DROPPED from the rewrite rather than aborting the run. Skipping one
 * loses nothing (the spoke keeps a name that is equally broken but still on the
 * migration record, so it stays visible); aborting would block the other 1,900 valid
 * rewrites behind a fault the spoke did not cause. */
const brokenDest = [];
for (let i = tokenPairs.length - 1; i >= 0; i--) {
  const chain = unresolvedChain(tokenPairs[i].to, declValues);
  if (!chain) continue;
  brokenDest.push({ ...tokenPairs[i], chain });
  tokenPairs.splice(i, 1);
}

const badProp = propPairs.find((p) => !p.components.length);
if (badProp) {
  console.error(`✗ migrations.json: prop row "${badProp.id}" has no \`components\`.`);
  console.error('  A prop rename without a component scope would rewrite every match in the spoke.');
  process.exit(1);
}

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
const droppedProps = [];
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

  for (const { from, to, id, components, module: moduleSpec } of propPairs) {
    // Scoped to the component's own tags — never a bare word. `module` adds
    // whatever local name THIS file imported the component as.
    const { text, count } = renameProp(out, { components, from, to, module: moduleSpec });
    if (count) applied.set(id, (applied.get(id) ?? 0) + count);
    out = text;
  }

  for (const m of componentRows) {
    const { text, count, dropped } = renameComponent(out, m);
    if (count) applied.set(m.id, (applied.get(m.id) ?? 0) + count);
    // A dropped prop has no destination — the codemod leaves it in place and
    // surfaces it, because deleting it would change rendering with no trace.
    for (const d of dropped) {
      droppedProps.push({ file: path.relative(CWD, file), id: m.id, ...d });
    }
    out = text;
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
/* A rename whose DESTINATION is dead. Reported before the removed rows because it is
 * the case a spoke cannot discover on its own: the name it uses today is on the
 * migration record and looks migratable, and the tool used to rewrite it onto a name
 * that resolves to nothing while reporting success. */
const dest = new Map();
for (const p of brokenDest) {
  let reads = 0, declares = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    reads += (src.match(readPattern(p.from)) ?? []).length;
    declares += (src.match(declPattern(p.from)) ?? []).length;
  }
  if (reads || declares) dest.set(p.from, { ...p, reads, declares });
}
if (dest.size) {
  console.log(`\n  ✖ NOT REWRITTEN — ${dest.size} name(s) whose replacement is itself gone.`);
  console.log('    The hub renamed these, then deleted the destination. Renaming you onto it');
  console.log('    would swap one dead name for another, so this run left them alone.');
  for (const [from, d] of dest) {
    console.log(`\n      ${from}  →  ${d.chain.join('  →  ')}  ✖ declared nowhere`);
    if (d.reads) console.log(`        ${d.reads} read${d.reads === 1 ? '' : 's'} — resolving to nothing TODAY; the property is dropping and`);
    if (d.reads) console.log('        whatever literal fallback each read carries is what you are seeing.');
    if (d.declares) console.log(`        ${d.declares} declaration${d.declares === 1 ? '' : 's'} — inert; nothing reads this name.`);
    console.log(`        (row: ${d.id})`);
  }
  console.log('\n    These need a decision, not a rename. Ask the hub what replaced the');
  console.log('    CAPABILITY — the answer is usually a different property, not a new token.');
}
// Removed tokens are never rewritten, so they never appear in `applied`. Scan for
// them separately — a spoke still using one is broken RIGHT NOW, with no alias
// catching it, which is exactly what makes this louder than a rename.
for (const m of removedRows) {
  const hits = new Map();
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const [from] of m.pairs) {
      const r = (src.match(readPattern(from)) ?? []).length;
      const d = (src.match(declPattern(from)) ?? []).length;
      if (!r && !d) continue;
      const cur = hits.get(from) ?? { reads: 0, declares: 0 };
      hits.set(from, { reads: cur.reads + r, declares: cur.declares + d });
    }
  }
  if (!hits.size) continue;
  console.log(`\n  ✖ REMOVED — ${m.id}. No alias exists:`);
  for (const [t, h] of hits) {
    const parts = [];
    if (h.reads) parts.push(`${h.reads} read${h.reads === 1 ? '' : 's'} → resolve to nothing`);
    if (h.declares) parts.push(`${h.declares} declaration${h.declares === 1 ? '' : 's'} → inert, nothing reads it`);
    console.log(`      ${t}  (${parts.join('; ')})`);
  }
  console.log(`      ${m.why}`);
  console.log('      Not rewritten automatically — the replacement is not an equivalent value.');
}
/* Deprecated names this spoke DECLARES. Separated from reads on purpose: the alias
 * rescues a reader and cannot rescue a declarer, so the reassuring "it still renders"
 * sentence is false here. An inert override is the quietest failure in the system —
 * the spoke keeps its theme file, loses its theme, and nothing reports it. */
const inertDecls = new Map();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const { from, id } of tokenPairs) {
    const n = (src.match(declPattern(from)) ?? []).length;
    if (!n) continue;
    if (!inertDecls.has(from)) inertDecls.set(from, { id, files: new Set() });
    inertDecls.get(from).files.add(path.relative(CWD, file));
  }
}
if (inertDecls.size) {
  console.log(`\n  ⚠ ${inertDecls.size} deprecated name(s) are DECLARED here, not just read:`);
  for (const [t, d] of inertDecls) console.log(`      ${t}  (${[...d.files].join(', ')})`);
  console.log('    A compatibility alias rescues a READ; it cannot rescue a DECLARATION.');
  console.log('    Nothing reads these names any more, so each override is already inert —');
  console.log('    this spoke is rendering the hub default and no error says so. Renaming the');
  console.log('    declaration (which this run does) is what makes the override count again.');
}
if (unfixable.size) {
  console.log(`\n  ${unfixable.size} token(s) read here that the hub does not declare and no`);
  console.log('  migration covers. These are already broken and need a decision:');
  for (const [t, fs_] of unfixable) console.log(`      ${t}  (${fs_.size} file${fs_.size === 1 ? '' : 's'})`);
}
if (propPairs.length) {
  console.log('\n  Prop renames are rewritten only inside their own component tags, including');
  console.log('  whatever local name each file imported the component as. A binding no import');
  console.log('  statement reveals (re-exported through a barrel, or picked at runtime) is not');
  console.log('  reached — those still render, because the component accepts the old name, and');
  console.log('  they say so in your build output. Fix whatever the build warns about after this.');
}
if (droppedProps.length) {
  console.log(`\n  ⚠ ${droppedProps.length} prop(s) had NO destination in the new component and were`);
  console.log('    LEFT IN PLACE rather than deleted — the new component ignores them, so each of');
  console.log('    these is a call site whose rendering may have changed. Decide per site:');
  for (const d of droppedProps) console.log(`      ${d.prop}  on <${d.tag}>  in ${d.file}   (row: ${d.id})`);
}

if (!WRITE && total) console.log('\n  Re-run with --write to apply. Commit first — this edits in place.');
if (WRITE) console.log('\n  Done. Rebuild and eyeball the result: the rename alone should change nothing visually.');
