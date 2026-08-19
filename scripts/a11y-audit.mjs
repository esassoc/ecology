#!/usr/bin/env node
// a11y-audit — run axe-core over every page of the specimen site.
//
// This is the AUTOMATED FLOOR, and it is worth being precise about how low that
// floor is. axe catches roughly a third of real accessibility defects, and the
// third it catches is not the third that matters most here. It does NOT catch:
//
//   - a <label> wrapping a <span role="checkbox"> (it sees a role and a label
//     element and is satisfied; the label names nothing)
//   - anything about the keyboard — no arrow keys on a radiogroup, no roving
//     tabindex, a group unreachable because nothing is tabbable
//   - a name that is technically present but useless ("Date", "Range slider")
//   - a name that DISAPPEARS on interaction (placeholder blanked once the field
//     has content) — axe audits one static moment
//   - missing autocomplete/inputmode (SC 1.3.5 is only partly machine-checkable)
//
// So: green here is not evidence of an accessible component. It is evidence that
// you did not make one of the mistakes a machine can see. The judgment layer is
// the `accessibility` skill and its forms.md; this is the backstop under it.
//
// It also does NOT gate by default — it reports. Pass --strict to exit 1, which
// is what you want in CI once the current findings are burned down.
//
// Usage:
//   node scripts/a11y-audit.mjs                    # build output in apps/site/dist
//   node scripts/a11y-audit.mjs --url http://localhost:4321
//   node scripts/a11y-audit.mjs --filter esa-text  # only matching routes
//   node scripts/a11y-audit.mjs --json report.json --strict
//
// Note the dist caveat: debug pages return [] from getStaticPaths, so they are
// not in the build and cannot be audited this way — use --url against the dev
// server for those.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { discoverRoutes, detectBase, serve, AWAIT_UPGRADE } from './lib/site-harness.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/site/dist');
const AXE = path.join(ROOT, 'node_modules/axe-core/axe.min.js');

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? '');
};
const has = (name) => argv.includes(name);

const baseUrl = flag('--url');
const filter = flag('--filter');
const jsonOut = flag('--json');
const strict = has('--strict');
const concurrency = (() => {
  // See live-region-audit.mjs: Math.min(n, total) spawns zero workers for 0, a
  // negative, a sub-1 fraction, or NaN — and the report below prints `total`
  // (every route discovered), so an audit of nothing reads as a full clean run.
  const raw = flag('--concurrency');
  if (!raw) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`✗ --concurrency must be a positive integer (got ${JSON.stringify(raw)}).`);
    process.exit(1);
  }
  return n;
})();

// WCAG 2.2 AA, which is the conformance target. `best-practice` is deliberately
// excluded — it flags stylistic opinions and would bury the conformance failures.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/*
 * The static server, route discovery, base detection and the custom-element upgrade
 * wait all moved to ./lib/site-harness.mjs when check-target-size.mjs needed the same
 * hydration guard. One copy on purpose — see the header there.
 */

async function main() {
  if (!existsSync(AXE)) {
    console.error('axe-core not found. Run `npm install` first.');
    process.exit(1);
  }
  const { chromium } = await import('playwright');
  const axeSource = readFileSync(AXE, 'utf8');

  let origin = baseUrl;
  let server = null;
  let routes;

  if (origin) {
    routes = ['/'];
    console.log(`Auditing ${origin} (single page — pass routes via --url per page for more)`);
  } else {
    if (!existsSync(DIST)) {
      console.error(`No build at ${DIST}. Run \`npm run build\` first, or pass --url.`);
      process.exit(1);
    }
    const base = detectBase(DIST);
    const s = await serve(DIST, base);
    server = s.server;
    origin = `http://127.0.0.1:${s.port}`;
    routes = discoverRoutes(DIST);
    if (base !== '/') console.log(`Build base is ${base} — stripping it when serving.`);
  }

  if (filter) routes = routes.filter((r) => r.includes(filter));
  if (!routes.length) {
    console.error('No routes matched.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const results = [];
  let done = 0;

  // A FRESH PAGE PER ROUTE, deliberately. Reusing one page per worker and
  // re-navigating made ~a third of pages report document-title/html-has-lang
  // failures they do not have — axe was running against a page mid-navigation.
  // The extra page cost is nothing next to reporting phantom violations.
  const worker = async () => {
    for (;;) {
      const route = routes.shift();
      if (!route) break;
      const page = await browser.newPage();
      try {
        const missing = [];
        const onFailed = (req) => missing.push(req.url());
        page.on('requestfailed', onFailed);
        const resp = [];
        const onResp = (r) => { if (r.status() === 404) resp.push(r.url()); };
        page.on('response', onResp);

        await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 30_000 });
        const upgrade = await page.evaluate(AWAIT_UPGRADE);
        await page.addScriptTag({ content: axeSource });
        const r = await page.evaluate(
          (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
          TAGS,
        );
        page.off('requestfailed', onFailed);
        page.off('response', onResp);
        results.push({
          route,
          violations: r.violations,
          notUpgraded: upgrade.notUpgraded,
          notFound: [...new Set([...missing, ...resp])].length,
        });
      } catch (err) {
        results.push({ route, error: String(err?.message ?? err) });
      }
      await page.close();
      done++;
      if (process.stderr.isTTY) process.stderr.write(`\r  audited ${done} page(s)…`);
    }
  };

  const total = routes.length;
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  await browser.close();
  server?.close();
  process.stderr.write(`${process.stderr.isTTY ? '\r' : ''}  audited ${done} page(s).      \n\n`);

  // --- Report, grouped by rule. Per-page output at this scale is unreadable;
  // what you act on is "which rule, how many places, show me one."
  const byRule = new Map();
  let nodeTotal = 0;
  for (const { route, violations = [] } of results) {
    for (const v of violations) {
      const e = byRule.get(v.id) ?? { id: v.id, impact: v.impact, help: v.help, url: v.helpUrl, nodes: 0, routes: new Set(), sample: null };
      e.nodes += v.nodes.length;
      e.routes.add(route);
      e.sample ??= v.nodes[0]?.failureSummary?.split('\n').filter(Boolean).pop()?.trim() ?? v.nodes[0]?.html?.slice(0, 100);
      byRule.set(v.id, e);
      nodeTotal += v.nodes.length;
    }
  }

  const errored = results.filter((r) => r.error);
  const RANK = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const rules = [...byRule.values()].sort(
    (a, b) => (RANK[a.impact] ?? 9) - (RANK[b.impact] ?? 9) || b.nodes - a.nodes,
  );

  console.log(`axe-core ${TAGS.join(' ')} — ${total} page(s), ${nodeTotal} failing element(s), ${rules.length} distinct rule(s)\n`);
  for (const r of rules) {
    console.log(`  [${(r.impact ?? '?').toUpperCase()}] ${r.id} — ${r.nodes} element(s) across ${r.routes.size} page(s)`);
    console.log(`      ${r.help}`);
    if (r.sample) console.log(`      e.g. ${r.sample.slice(0, 140)}`);
    console.log(`      ${r.url}`);
    console.log(`      pages: ${[...r.routes].slice(0, 4).join(', ')}${r.routes.size > 4 ? `, +${r.routes.size - 4} more` : ''}\n`);
  }
  if (!rules.length) console.log('  No violations at the machine-checkable level.\n');

  // The load-bearing guard. A page whose custom elements never upgraded audits
  // as clean because the components are not in the DOM at all — a false PASS,
  // which is worse than a false failure. Shout, and fail under --strict.
  const dead = results.filter((r) => r.notUpgraded?.length);
  const missing404 = results.reduce((n, r) => n + (r.notFound ?? 0), 0);
  if (dead.length) {
    console.log(`  ⚠️  HYDRATION FAILURE on ${dead.length} page(s) — these results are NOT valid.`);
    console.log(`      Custom elements never upgraded, so the components were never audited.`);
    console.log(`      e.g. ${dead[0].route} → ${dead[0].notUpgraded.slice(0, 4).join(', ')}`);
    if (missing404) console.log(`      ${missing404} request(s) 404'd — usually the build's base path.`);
    console.log('');
  }
  if (errored.length) {
    console.log(`  ${errored.length} page(s) failed to load:`);
    for (const e of errored.slice(0, 5)) console.log(`    ${e.route} — ${e.error.split('\n')[0]}`);
    console.log('');
  }

  console.log('Reminder: axe is a floor, not a ceiling. It cannot see nameless options,');
  console.log('keyboard gaps, or names that vanish on interaction — see the accessibility');
  console.log('skill and forms.md for what it misses.\n');

  if (jsonOut) {
    writeFileSync(path.resolve(jsonOut), JSON.stringify({ tags: TAGS, pages: total, results }, null, 2));
    console.log(`JSON written to ${jsonOut}\n`);
  }

  process.exit(strict && (nodeTotal || errored.length || dead.length) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
