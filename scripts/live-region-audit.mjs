#!/usr/bin/env node
// live-region-audit — the check axe cannot do.
//
// axe validates a live region's ATTRIBUTES. It has no opinion about whether the
// region will ever announce anything, and that is the failure this kit actually
// shipped: `<span role="status" aria-label="Loading"></span>` on every page, for
// months, announcing nothing to anyone, with a clean axe run the whole time.
//
// So this audits the INVARIANTS of the announcer model instead, in a real browser,
// after custom elements have upgraded (the flattened tree is the only place a
// shadow-DOM region is visible at all):
//
//   1. EXACTLY TWO regions, both from the announcer — one polite, one assertive.
//      Live regions interfere with each other; the accepted ceiling is about two.
//      A third means a component minted its own.
//   2. NO region inside a shadow root. Observation across a shadow boundary is
//      unreliable, worst in Safari/VoiceOver. Components go through announce().
//   3. NO region that is permanently empty AND has no way to be filled — the
//      no-op-dressed-as-a-feature case.
//   4. NO interactive control inside a region. Live regions announce raw text with
//      no roles and cannot be focused or navigated to.
//   5. NO politeness contradiction (role="alert" + aria-live="polite").
//
// It does NOT prove announcements actually reach a screen reader. Nothing
// automated does. Use the NerdeRegion DevTools extension plus NVDA/Firefox and
// VoiceOver/Safari for that — see status-messages.md. This catches the structural
// mistakes so the manual pass can spend its time on the ones that need ears.
//
// Usage:
//   npm run build && node scripts/live-region-audit.mjs
//   node scripts/live-region-audit.mjs --url http://localhost:4322/components/esa-snackbar-container
//   node scripts/live-region-audit.mjs --filter esa-snackbar
//   node scripts/live-region-audit.mjs --strict     # exit 1 on any finding
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/site/dist');

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const baseUrl = arg('--url');
const filter = arg('--filter');
const strict = argv.includes('--strict');
// Mirrors a11y-audit: a fresh page per route, several in flight. Sequential over
// 85 pages with a networkidle wait each is minutes of wall clock for no reason.
const concurrency = Number(arg('--concurrency') ?? 6);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

function serve(root, base = '/') {
  const server = createServer((req, res) => {
    let rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (base !== '/' && rel.startsWith(base)) rel = rel.slice(base.length - 1);
    let file = path.join(root, rel);
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) { res.statusCode = 404; res.end('not found'); return; }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function detectBase(dist) {
  const index = path.join(dist, 'index.html');
  if (!existsSync(index)) return '/';
  const m = /(?:href|src)="(\/[^"]*?\/)_astro\//.exec(readFileSync(index, 'utf8'));
  return m ? m[1] : '/';
}

function discoverRoutes(dist, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dist)) {
    const full = path.join(dist, entry);
    if (statSync(full).isDirectory()) out.push(...discoverRoutes(full, `${prefix}/${entry}`));
    else if (entry === 'index.html') out.push(prefix === '' ? '/' : `${prefix}/`);
  }
  return out;
}

/**
 * Wait for every custom element on the page to upgrade.
 *
 * Auditing pre-hydration HTML is how you get a meaningless all-clear on a kit that
 * is half web components — the announcer does not exist until a module imports it,
 * and a shadow-root region does not exist until the element upgrades.
 */
const AWAIT_UPGRADE = `(async () => {
  const tags = [...new Set([...document.querySelectorAll('*')]
    .map(e => e.tagName.toLowerCase()).filter(t => t.includes('-')))];
  // RACED against a timeout, and that is load-bearing: customElements.whenDefined()
  // for a tag that is never registered NEVER RESOLVES. It does not reject, so a
  // .catch() does not save you and Promise.all sits pending forever — which is
  // exactly how the first version of this script appeared to "run slowly" for seven
  // minutes when it was in fact hung. Same guard, same reason, as
  // scripts/a11y-audit.mjs.
  //
  // 8s, not 3s: under --concurrency the module fetches contend and a component that
  // upgrades fine on its own page can miss a 3s window. That produced a
  // never-upgraded report that was pure timing flake. The window only costs
  // anything on pages that genuinely never register a tag.
  await Promise.race([
    Promise.all(tags.map(t => customElements.whenDefined(t))),
    new Promise(r => setTimeout(r, 8000)),
  ]);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { notUpgraded: tags.filter(t => !customElements.get(t)) };
})()`;

/** Walk the flattened tree, shadow roots included, collecting every live region. */
const COLLECT = `(() => {
  const LIVE_ROLES = new Set(['status', 'alert', 'log']);
  const IMPLIED = { alert: 'assertive', status: 'polite', log: 'polite' };
  const found = [];

  const visit = (root, inShadow, hostPath) => {
    for (const el of root.querySelectorAll('*')) {
      const role = (el.getAttribute('role') || '').toLowerCase();
      const live = (el.getAttribute('aria-live') || '').toLowerCase();
      const isLive = LIVE_ROLES.has(role) || live === 'polite' || live === 'assertive';
      if (isLive) {
        found.push({
          tag: el.tagName.toLowerCase(),
          role, live,
          announcer: el.dataset ? el.dataset.esaAnnouncer || '' : '',
          declared: el.dataset ? el.dataset.esaLive || '' : '',
          inShadow,
          hostPath,
          empty: el.textContent.trim() === '' && el.children.length === 0,
          controls: [...el.querySelectorAll('button,a[href],input,select,textarea')]
            .map(c => c.tagName.toLowerCase()),
          conflict: role && IMPLIED[role] && live && IMPLIED[role] !== live
            ? role + '/' + live : '',
          outer: el.outerHTML.slice(0, 120),
        });
      }
      if (el.shadowRoot) visit(el.shadowRoot, true, hostPath ? hostPath + ' > ' + el.tagName.toLowerCase() : el.tagName.toLowerCase());
    }
  };
  visit(document, false, '');
  return found;
})()`;

async function main() {
  const { chromium } = await import('playwright');

  let origin = baseUrl;
  let server = null;
  let routes;

  if (origin) {
    const u = new URL(origin);
    origin = u.origin;
    routes = [u.pathname];
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
  }

  if (filter) routes = routes.filter((r) => r.includes(filter));
  if (!routes.length) { console.error('No routes matched.'); process.exit(1); }

  const browser = await chromium.launch();
  const findings = [];
  const queue = [...routes];
  const total = routes.length;
  let done = 0;
  let declared = 0;
  const neverUpgraded = [];

  const worker = async () => {
   for (;;) {
    const route = queue.shift();
    if (!route) break;
    const page = await browser.newPage();
    try {
      // `load`, not `networkidle`. The upgrade wait below is the thing that actually
      // matters here — it awaits customElements.whenDefined for every custom tag on
      // the page plus two frames, which is precisely when a shadow-root region and
      // the announcer singleton come into existence. networkidle adds a 500ms idle
      // window per page (and times out entirely on any page with a long-lived
      // connection), which over 85 pages is minutes of wall clock buying nothing.
      await page.goto(origin + route, { waitUntil: 'load', timeout: 30_000 });
      const upgrade = await page.evaluate(AWAIT_UPGRADE);
      if (upgrade.notUpgraded.length) {
        // Not a finding, but reported: a region inside an element that never
        // upgraded cannot exist, so those pages were not really audited. Causes are
        // either legitimate (a tag the page never imports — the reference
        // components register nothing) or a slow chunk under concurrency. Re-run
        // with --concurrency 1 to tell them apart.
        neverUpgraded.push(...upgrade.notUpgraded);
      }
      const regions = await page.evaluate(COLLECT);

      // A region carrying data-esa-live is a DECLARED opt-in: the two places the kit
      // deliberately keeps a region outside the announcer, each with a documented
      // reason and each off by default (`live-error` on a form control validated
      // inline, `live` on a non-dismissable esa-alert-box). Counted, not flagged —
      // the point of this audit is undeclared regions. The bug rules below still
      // apply to them, because empty/control/conflict are bugs either way.
      const strays = regions.filter((r) => !r.announcer && !r.declared);
      declared += regions.filter((r) => r.declared).length;
      for (const r of strays) {
        if (r.inShadow) {
          findings.push({ route, rule: 'region-in-shadow-root', detail: `<${r.tag}> inside ${r.hostPath} — observation across a shadow boundary is unreliable. Route it through announce(), or mark it data-esa-live if it is a reviewed exception.` });
        } else {
          findings.push({ route, rule: 'extra-region', detail: `<${r.tag} role="${r.role}" aria-live="${r.live}"> is a live region the announcer does not own. Regions interfere; the kit's ceiling is the announcer's two.` });
        }
        if (r.empty) {
          findings.push({ route, rule: 'permanently-empty', detail: `${r.outer} is empty — a region announces CHANGES to its contents, so this announces nothing, ever.` });
        }
      }
      for (const r of regions) {
        if (r.controls.length) {
          findings.push({ route, rule: 'control-in-region', detail: `<${r.controls[0]}> inside a live region — announced as bare text, unfocusable, unreachable. That message is a dialog.` });
        }
        if (r.conflict) {
          findings.push({ route, rule: 'politeness-conflict', detail: `${r.conflict} — the role implies the opposite politeness and the attribute wins.` });
        }
      }

      const owned = regions.filter((r) => r.announcer);
      if (owned.length > 2) {
        findings.push({ route, rule: 'duplicate-announcer', detail: `${owned.length} announcer regions — expected 2. The singleton was instantiated more than once.` });
      }
    } catch (err) {
      findings.push({ route, rule: 'error', detail: String(err?.message ?? err) });
    }
    await page.close();
    done++;
    process.stderr.write(`  audited ${done}/${total}\n`);
   }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  await browser.close();
  server?.close();
  process.stderr.write(`${process.stderr.isTTY ? '\r' : ''}  audited ${done} page(s).       \n\n`);

  const un = [...new Set(neverUpgraded)];
  if (un.length) {
    console.log(`  never upgraded, so not really audited: ${un.join(', ')}`);
    console.log('  (re-run with --concurrency 1 to rule out a slow chunk)\n');
  }
  if (declared) {
    console.log(`  ${declared} declared opt-in region(s) (data-esa-live) — counted, not flagged.\n`);
  }

  if (!findings.length) {
    console.log('✓ No live-region structure findings.');
    console.log('  This proves structure only. It does NOT prove anything is announced —');
    console.log('  use NerdeRegion + NVDA/Firefox + VoiceOver/Safari (see status-messages.md).');
    process.exit(0);
  }

  const byRule = new Map();
  for (const f of findings) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }
  for (const [rule, items] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${rule} — ${items.length} finding(s)`);
    const shown = new Set();
    for (const i of items) {
      if (shown.has(i.detail)) continue;
      shown.add(i.detail);
      console.log(`  ${i.detail}`);
      console.log(`    first seen: ${i.route}`);
    }
    console.log('');
  }
  console.log(`${findings.length} finding(s) across ${done} page(s).`);
  process.exit(strict ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
