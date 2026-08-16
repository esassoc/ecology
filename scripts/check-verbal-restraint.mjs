#!/usr/bin/env node
/*
 * check-verbal-restraint.mjs — the verbal half of the design-QA grounded gate.
 *
 * design-principles § Verbal restraint bans text ABOUT the page — editorial
 * captions, provenance strings, chips restating the table beneath them. That
 * rule has had no deterministic check; this is it, and it is the same check the
 * global design-gate hook runs, reading the same corpus. One corpus, two
 * surfaces: Andy's hook catches it at write time on his machine, /design-qa
 * catches it in review.
 *
 * Sibling to check-adherence.mjs — same JSON-then-exit contract, same severity
 * discipline.
 *
 * The corpus and the check modules live in Andy's global Claude config, NOT in
 * this repo. That is deliberate — the corpus is his tunable hates-list and has
 * one home. A machine without it (any devrig, CI) gets a clean skip, never a
 * failure: a missing personal config must never fail someone else's build.
 *
 * Usage (from a spoke repo, sibling of the `ecology` checkout):
 *   node ../ecology/scripts/check-verbal-restraint.mjs            # src/pages, src/components, src/layouts
 *                                                                # (and the same three under each package, in the hub)
 *   node ../ecology/scripts/check-verbal-restraint.mjs [file ...] # checks the named files only
 * Output: a JSON report to stdout. Exit 1 if any ERROR, else 0.
 *
 * Scope note: this greps RENDERED strings. It cannot see a component declaring
 * a prose-shaped prop — that is check-prose-props.mjs, the author-time half.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const GATE = process.env.DESIGN_GATE_HOME || path.join(os.homedir(), '.claude', 'hooks', 'design-gate');
const SCAN_DIRS = ['src/pages', 'src/components', 'src/layouts'];

/** A spoke keeps these at the root; the hub keeps them under packages/. */
function scanRoots() {
  const roots = SCAN_DIRS.map((d) => path.join(ROOT, d));
  let packages;
  try {
    packages = readdirSync(path.join(ROOT, 'packages'));
  } catch {
    return roots;
  }
  for (const pkg of packages) {
    if (pkg.startsWith('.')) continue;
    roots.push(...SCAN_DIRS.map((d) => path.join(ROOT, 'packages', pkg, d)));
  }
  return roots;
}
const EXTS = /\.(astro|html)$/i;

function skip(reason) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        skipped: true,
        reason,
        note: 'Verbal restraint was NOT checked. The rule still applies — read design-principles § Verbal restraint and sweep the strings by hand.',
      },
      null,
      2
    )
  );
  process.exit(0);
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.test(name)) out.push(full);
  }
  return out;
}

if (!existsSync(GATE)) {
  skip(`design-gate not installed at ${GATE}`);
}

let extractStrings;
let corpusGrep;
let config;
try {
  ({ extractStrings } = await import(pathToFileURL(path.join(GATE, 'lib', 'extract-text.mjs')).href));
  corpusGrep = await import(pathToFileURL(path.join(GATE, 'checks', 'corpus-grep.mjs')).href);
  config = JSON.parse(readFileSync(path.join(GATE, 'config.json'), 'utf8'));
} catch (err) {
  skip(`design-gate present but unreadable: ${err.message}`);
}

const corpusPath = config?.checks?.corpusGrep?.corpusPath ?? '';
const resolvedCorpus = corpusPath.startsWith('~/')
  ? path.join(os.homedir(), corpusPath.slice(2))
  : corpusPath;
if (!existsSync(resolvedCorpus)) skip(`corpus not found at ${resolvedCorpus}`);

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = args.length
  ? args.map((a) => path.resolve(ROOT, a)).filter((f) => existsSync(f) && EXTS.test(f))
  : scanRoots().flatMap((d) => walk(d));

const errors = [];
for (const file of targets) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const strings = extractStrings(source, file);
  for (const f of corpusGrep.run({ strings, config })) {
    errors.push({
      level: 'error',
      rule: f.rule,
      file: path.relative(ROOT, f.file),
      line: f.line,
      excerpt: f.excerpt,
      message: `${f.reason} This string is ABOUT the page — remove it, or replace it with data that earns a place in the structure.`,
    });
  }
}

console.log(
  JSON.stringify(
    {
      ok: errors.length === 0,
      skipped: false,
      filesScanned: targets.length,
      corpus: resolvedCorpus,
      errorCount: errors.length,
      warningCount: 0,
      errors,
      warnings: [],
      note: 'Corpus patterns only. The classes a regex cannot express — editorial captions, taglines, synthesis — are a judgment call; apply the rubric at ~/.claude/hooks/design-gate/rubric.md to the strings this did not flag.',
    },
    null,
    2
  )
);
process.exit(errors.length ? 1 : 0);
