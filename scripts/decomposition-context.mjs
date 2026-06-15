#!/usr/bin/env node
/*
 * decomposition-context.mjs — GROUNDING for the decomposition-quality evaluator.
 *
 * The form gates (check-manifest, check-component-first, check-adherence) prove a page
 * is a manifest of components. They cannot judge whether the decomposition is GOOD —
 * right boundaries, right granularity, right reuse. That is model judgment. But an
 * ungrounded judge degrades (the repo's standing finding — see check-adherence.mjs's
 * header). So before any judgment runs, this script hands the judge the real artifacts:
 *
 *   - SCOPE        — the changed page/component files under review (git working tree, or
 *                    explicit args), plus a bounded diff of them.
 *   - changedPages — each changed page with its parsed manifest (section NAMES + resolvers
 *                    + layout spine) — the raw material for manifest-fidelity judgment.
 *   - changedComponents — each new/changed <spoke>-* component as { name, purpose, props }
 *                    — the prime suspects for missed-reuse and promotion-signal.
 *   - hubInventory / spokeInventory — EVERY esa-* lego and every existing spoke component
 *                    as { name, purpose, props }. This is what "does it already exist?" is
 *                    judged against — by purpose + props, not name.
 *   - reuseHints   — prop-overlap hints pairing each changed component with the catalog
 *                    entries it most resembles. A HINT to compare, never itself a finding.
 *
 * This script GATHERS; it does not judge. The rubric + the findings live in the
 * decomposition-review skill, which runs this first. Sibling to check-adherence.mjs /
 * check-contrast.mjs — same hub-resolved layout, same JSON-to-stdout contract.
 *
 * Usage (from a spoke repo, sibling of the `ecology` checkout):
 *   node ../ecology/scripts/decomposition-context.mjs            # scope = git working-tree changes
 *   node ../ecology/scripts/decomposition-context.mjs [file ...] # scope = the named files
 * Output: a JSON context bundle to stdout. Always exit 0 — grounding never gates.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { inventoryEntry, propOverlap } from './lib/component-inventory.mjs';

const ROOT = process.cwd();
// Resolve the hub from THIS script's location (it lives in <hub>/scripts/), so the
// grounding works invoked as `node ../ecology/scripts/decomposition-context.mjs`.
const HUB = join(dirname(fileURLToPath(import.meta.url)), '..');
const HUB_COMPONENTS = join(HUB, 'packages/ecology/src/components');
const SPOKE_COMPONENTS = join(ROOT, 'src/components');

const rel = (f) => relative(ROOT, f).split('\\').join('/');
const isComponentFile = (f) => /\.(astro|ts)$/i.test(f) && !/\.(test|d)\.ts$/i.test(f);

// ---- git helpers (fail soft — grounding must never throw) -----------------
function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** Changed/added/untracked files in the working tree, scoped to authored UI source. */
function workingTreeScope() {
  const out = git(['status', '--porcelain', '--', 'src/pages', 'src/components']);
  const files = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    let p = line.slice(3).trim().replace(/^"|"$/g, '');
    if (p.includes(' -> ')) p = p.split(' -> ').pop().trim(); // rename: take the new path
    if (isComponentFile(p) && existsSync(join(ROOT, p))) files.push(p);
  }
  return [...new Set(files)];
}

// ---- manifest parse (keeps section NAMES, which the form gate's parser drops) ----
function parseManifest(src) {
  const lines = src.split('\n');
  const start = lines.findIndex((l) => /^\s*sections\s*:/i.test(l));
  if (start === -1) return { found: false, layout: null, sections: [] };
  let layout = null;
  for (let i = Math.max(0, start - 6); i < start; i++) {
    const lm = lines[i].match(/^\s*layout\s*:\s*(.+?)\s*$/i);
    if (lm) layout = lm[1].replace(/#.*$/, '').trim();
  }
  const sections = [];
  for (let i = start + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*(?:-->|---)/.test(raw)) break;
    if (/^\s*-\s+\S/.test(raw)) {
      const arrow = raw.match(/-\s*(.*?)\s*(?:->|→)\s*([^\s(#[]+)/);
      if (arrow) sections.push({ name: arrow[1].trim(), resolver: arrow[2].toLowerCase().replace(/[(),.[\]]/g, '') });
      else sections.push({ name: raw.replace(/^\s*-\s*/, '').trim(), resolver: null });
      continue;
    }
    if (/^\s*$/.test(raw)) continue;
    break;
  }
  return { found: true, layout, sections };
}

// ---- inventory ------------------------------------------------------------
// Inventory purposes are capped: across ~65 legos the scannable signal is the
// `name — one-liner` lead + the first chunk of detail. A judge that needs the full
// doc reads the component file. Changed components (the focus) keep their FULL purpose.
const CAP = 240;
const cap = (s) => (s && s.length > CAP ? s.slice(0, CAP).replace(/\s+\S*$/, '') + '…' : s || '');

function inventoryDir(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => isComponentFile(f))
    .map((f) => {
      const { name, purpose, props } = inventoryEntry(join(dir, f), readFileSync(join(dir, f), 'utf8'));
      return { name, purpose: cap(purpose), props };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---- resolve scope --------------------------------------------------------
const args = process.argv.slice(2).filter((f) => existsSync(f));
const scopeFiles = args.length ? args.map(rel).filter(isComponentFile) : workingTreeScope();
const scopeSource = args.length ? 'args' : 'git-working-tree';

// ---- build the bundle -----------------------------------------------------
const hubInventory = inventoryDir(HUB_COMPONENTS);
const spokeInventory = inventoryDir(SPOKE_COMPONENTS);
const catalog = [
  ...hubInventory.map((e) => ({ ...e, source: 'hub' })),
  ...spokeInventory.map((e) => ({ ...e, source: 'spoke' })),
];

const changedPages = [];
const changedComponents = [];
for (const f of scopeFiles) {
  const abs = join(ROOT, f);
  if (!existsSync(abs)) continue;
  const src = readFileSync(abs, 'utf8');
  if (f.startsWith('src/pages/')) {
    changedPages.push({ file: f, manifest: parseManifest(src) });
  } else if (f.startsWith('src/components/')) {
    const { name, purpose, props } = inventoryEntry(abs, src);
    changedComponents.push({ name, file: f, purpose, props });
  }
}

// reuseHints: for each changed component, the catalog entries it most resembles by
// prop-overlap (self excluded). Sorted desc; top 5; >=0.34 jaccard or >=3 shared props.
const reuseHints = changedComponents.map((c) => {
  const candidates = catalog
    .filter((e) => e.name !== c.name)
    .map((e) => {
      const { shared, jaccard } = propOverlap(c, e);
      return { name: e.name, source: e.source, purpose: e.purpose, sharedProps: shared, jaccard: Number(jaccard.toFixed(2)) };
    })
    .filter((e) => e.jaccard >= 0.34 || e.sharedProps.length >= 3)
    .sort((a, b) => b.jaccard - a.jaccard)
    .slice(0, 5);
  return { component: c.name, candidates };
});

const diffRaw = git(['diff', '--no-color', 'HEAD', '--', ...scopeFiles]);
const DIFF_CAP = 24000;
const diff = diffRaw.length > DIFF_CAP ? diffRaw.slice(0, DIFF_CAP) + '\n…(diff truncated)…' : diffRaw;

const bundle = {
  grounding: 'decomposition-context',
  note: 'GATHERED artifacts for the decomposition-review judge. This script does not judge — it grounds. Findings are emitted by the decomposition-review skill.',
  scope: { source: scopeSource, files: scopeFiles },
  counts: {
    changedPages: changedPages.length,
    changedComponents: changedComponents.length,
    hubInventory: hubInventory.length,
    spokeInventory: spokeInventory.length,
  },
  changedPages,
  changedComponents,
  reuseHints,
  hubInventory,
  spokeInventory,
  diff,
};
console.log(JSON.stringify(bundle, null, 2));
process.exit(0);
