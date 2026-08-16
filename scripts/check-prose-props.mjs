#!/usr/bin/env node
/*
 * check-prose-props.mjs — the AUTHOR-TIME half of verbal restraint.
 *
 * check-verbal-restraint.mjs greps strings that reached a page. It structurally
 * cannot see the thing upstream of them: a component DECLARING somewhere to put
 * a sentence. `lede?: string` is an invitation, and the flourish arrives later,
 * on a page that check never sees until it is written.
 *
 * This is the report over a whole repo, both tiers, all advisory — a prop name
 * is a judgment call about a component's API and a person decides. The `genre`
 * tier alone has teeth at write time, in the spoke-kit PreToolUse hook; the
 * lists and the parser both live in
 * plugins/spoke-kit/hooks/prose-props.mjs so the two can never disagree.
 *
 * Usage (from a spoke repo, sibling of the `ecology` checkout):
 *   node ../ecology/scripts/check-prose-props.mjs            # src/components, src/layouts, src/data
 *   node ../ecology/scripts/check-prose-props.mjs [file ...] # checks the named files only
 *
 * In the hub the same three directories are read under each package. It walks
 * the working tree, not `git ls-files` — in-flight components are exactly where
 * a new prose slot is being invented.
 *
 * Output: a JSON report to stdout. Always exits 0 — warnings never gate.
 *
 * Escape hatch, same shape as bcn-lego-checked: a `prose-prop-checked: <reason>`
 * comment anywhere in the file suppresses its findings.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { analyze } from '../plugins/spoke-kit/hooks/prose-props.mjs';

const ROOT = process.cwd();
// Layouts and data modules declare prose slots too: ComponentDoc.astro has a
// real `Props.summary`, and prototypes-gallery.ts declares one in a file with no
// Props at all. Scanning components only missed both.
const SUB_DIRS = ['src/components', 'src/layouts', 'src/data'];
const EXTS = /\.(astro|ts)$/i;

/** A spoke keeps these at the root; the hub keeps them under packages/. */
function scanRoots() {
  const roots = SUB_DIRS.map((d) => path.join(ROOT, d));
  let packages;
  try {
    packages = readdirSync(path.join(ROOT, 'packages'));
  } catch {
    return roots;
  }
  for (const pkg of packages) {
    if (pkg.startsWith('.')) continue;
    roots.push(...SUB_DIRS.map((d) => path.join(ROOT, 'packages', pkg, d)));
  }
  return roots;
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

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = args.length
  ? args.map((a) => path.resolve(ROOT, a)).filter((f) => existsSync(f) && EXTS.test(f))
  : scanRoots().flatMap((d) => walk(d));

const warnings = [];
for (const file of targets) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  warnings.push(...analyze(source, path.relative(ROOT, file)));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      filesScanned: targets.length,
      errorCount: 0,
      warningCount: warnings.length,
      errors: [],
      warnings,
      note: 'All findings are advisory and never block. The cheapest fix is usually the doc comment, not the prop: a slot documented by register gets data, a slot documented by type size gets prose.',
    },
    null,
    2
  )
);
process.exit(0);
