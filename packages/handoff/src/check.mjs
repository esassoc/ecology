// `handoff check`: every prototype ships with authored guidance and a bundle.
//
//   handoff check                         # every route
//   handoff check --changed               # only routes touched since origin/main
//   handoff check --changed --base <ref>  # …since <ref> (CI: the push's `before`)
//
// A prototype with no spec does not fail at capture, it DEGRADES: derived section
// labels and no intent / decisions / gotchas / acceptance. This gate asks for them.
// Scoped to the routes a change touched, because checking every route made one
// unspecced prototype fail everyone's deploy (Beacon ledger, 2026-08-24), which is
// how its baseline grew to 39. A route is touched when its page, its spec or any
// local file either imports changed, or when it is new to the registry.
//
// Escape hatch: HANDOFF_SKIP_GUIDANCE=1.
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readRegistry, parseRegistry, bundleSlug } from './registry.mjs';
import { routeFiles } from './route-deps.mjs';
import { specPathFor } from './pipeline.mjs';

const git = (root, args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
};

/** Files changed since `base` (committed, staged, unstaged and untracked), repo-relative to root. */
export function changedFiles(root, base) {
  const top = git(root, ['rev-parse', '--show-toplevel'])?.trim();
  if (!top) return null;
  const mergeBase = git(root, ['merge-base', base, 'HEAD'])?.trim();
  if (!mergeBase) return null;
  const lists = [
    git(root, ['diff', '--name-only', mergeBase, 'HEAD']),
    git(root, ['diff', '--name-only', 'HEAD']),
    git(root, ['ls-files', '--others', '--exclude-standard']),
  ];
  const fromTop = (f) => relative(root, join(top, f));
  const out = new Set();
  lists[0]?.split('\n').filter(Boolean).forEach((f) => out.add(fromTop(f)));
  lists[1]?.split('\n').filter(Boolean).forEach((f) => out.add(fromTop(f)));
  lists[2]?.split('\n').filter(Boolean).forEach((f) => out.add(f)); // already cwd-relative
  return { files: out, mergeBase, top };
}

/** Which registry targets a set of changed files touches. */
export function touchedTargets(cfg, targets, changed, baseRegistrySlugs) {
  return targets.filter((t) => {
    if (baseRegistrySlugs && !baseRegistrySlugs.has(t.slug)) return true;
    const spec = specPathFor(cfg, t.slug);
    if (changed.has(relative(cfg.root, spec))) return true;
    return routeFiles(cfg.root, { route: t.route, specPath: spec }).some((f) => changed.has(relative(cfg.root, f)));
  });
}

const DATA_KEYS = new Set(['fixture', 'store', 'fields', 'enums', 'notes']);
function dataProblem(data) {
  if (data == null || typeof data === 'string') return null;
  if (typeof data !== 'object') return 'must be a fixture path or an object';
  const extra = Object.keys(data).filter((k) => !DATA_KEYS.has(k));
  return extra.length ? `has unknown key(s) ${extra.join(', ')} (allowed: ${[...DATA_KEYS].join(', ')})` : null;
}

/** @param {import('./config.mjs').HandoffConfig} cfg */
export async function runCheck(cfg, argv) {
  if (process.env.HANDOFF_SKIP_GUIDANCE) {
    console.warn('handoff check — SKIPPED via HANDOFF_SKIP_GUIDANCE. Guidance gaps are shipping.');
    return 0;
  }
  const all = readRegistry(cfg);
  let targets = all;
  let scope = `${all.length} route(s)`;

  if (argv.includes('--changed')) {
    const i = argv.indexOf('--base');
    const base = i !== -1 ? argv[i + 1] : 'origin/main';
    const diff = changedFiles(cfg.root, base);
    if (!diff) {
      console.warn(`handoff check — cannot diff against ${base}; checking every route.`);
    } else {
      const registryAtBase = `${diff.mergeBase}:${relative(diff.top, join(cfg.root, cfg.registry))}`;
      const old = git(cfg.root, ['show', registryAtBase]);
      const baseSlugs = old ? new Set(parseRegistry(old).map((t) => t.slug)) : null;
      targets = touchedTargets(cfg, all, diff.files, baseSlugs);
      scope = `${targets.length} of ${all.length} route(s) touched since ${base}`;
    }
  }

  const specDir = join(cfg.root, cfg.specs);
  const specs = new Set(existsSync(specDir) ? readdirSync(specDir).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)) : []);
  const baseline = cfg.baseline ? (await import(pathToFileURL(join(cfg.root, cfg.baseline)).href)).default : [];
  const allowed = new Set(baseline);
  const errors = [];

  for (const t of targets) {
    if (!specs.has(t.slug)) {
      if (!allowed.has(t.slug))
        errors.push(
          `${t.slug} — no curated spec. Write ${cfg.specs}/${t.slug}.mjs (sections with selector + intent / ` +
            `decisions / gotchas / acceptance)${cfg.baseline ? `, or add the slug to ${cfg.baseline} if it is deliberately un-curated` : ''}.`
        );
    } else {
      if (allowed.has(t.slug)) errors.push(`${t.slug} — has a spec now, so remove it from ${cfg.baseline}.`);
      const spec = (await import(pathToFileURL(specPathFor(cfg, t.slug)).href)).default;
      const p = dataProblem(spec.data);
      if (p) errors.push(`${t.slug} — \`data\` ${p}.`);
      for (const s of spec.sections ?? []) {
        if (!s.intent && !s.decisions && !s.gotchas && !s.acceptance)
          errors.push(`${t.slug} — section "${s.label}" has no guidance (needs at least an intent).`);
        const q = dataProblem(s.data);
        if (q) errors.push(`${t.slug} — section "${s.label}" \`data\` ${q}.`);
      }
    }
    if (!existsSync(join(cfg.root, cfg.out, bundleSlug(t.route), 'manifest.json')))
      errors.push(`${t.slug} — no bundle at ${cfg.out}/${bundleSlug(t.route)}/. Run: npx handoff all ${t.slug}`);
  }

  const debt = all.filter((t) => allowed.has(t.slug) && !specs.has(t.slug));
  if (debt.length) console.warn(`handoff check — ${debt.length} prototype(s) still have no authored guidance: ${debt.map((t) => t.slug).join(', ')}`);

  if (errors.length) {
    console.error(`\nhandoff check — ${scope}, ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error('\nFix these, or bypass once with HANDOFF_SKIP_GUIDANCE=1.\n');
    return 1;
  }
  console.log(`handoff check — ok. ${scope}, ${specs.size} curated.`);
  return 0;
}
