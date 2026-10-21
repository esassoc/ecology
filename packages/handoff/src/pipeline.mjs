// `handoff all`: a bundle for every prototype in the spoke's registry.
//
// A route with an authored spec (<specs>/<slug>.mjs) captures the spec's sections
// with its guidance; a route without one gets sections derived from its DOM. Both
// run through the same capture, so both get deterministic styles, collapsed
// markup and screenshots. Capture runs against the production build in dist/.
//
//   handoff all                      # every route
//   handoff all actions help         # only these slugs
//   handoff all --changed            # only routes whose inputs moved since last run
//   handoff all --skip-build         # reuse the dist/ already on disk
//   handoff all --port 4398          # capture on another port than the config's
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { cpus } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readRegistry, bundleSlug, routePath } from './registry.mjs';
import { deployedUrl } from './config.mjs';
import { launchBrowser, captureSections, deriveSections } from './capture.mjs';
import { buildTierIndex, classifyTokens } from './tokens.mjs';
import { indexComponents, componentsOf } from './components.mjs';
import { writeBundle, writeIndex, guideOf } from './bundle.mjs';
import { mergeData } from './spec.mjs';
import { routeKey, globalFingerprint } from './route-deps.mjs';
import { serveDist } from './serve.mjs';

export const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const hubRoot = join(pkgDir, '..', '..');

// On Windows `npx` is a .cmd shim, which spawn cannot start without a shell.
const WIN_SHELL = process.platform === 'win32';

const run = (cmd, args, cwd, env = {}) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: WIN_SHELL, env: { ...process.env, ...env } });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → exit ${r.status}`);
};

// Captures are independent, so they run concurrently, with headroom: saturating
// every core slows the page render, the one thing this pipeline is sensitive to.
const CONCURRENCY = Math.max(1, Math.min(6, (cpus().length || 4) - 2));

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) {
        try {
          results[i] = { ok: true, value: await worker(items[i]) };
        } catch (err) {
          results[i] = { ok: false, err }; // one bad route must not cost the others theirs
        }
      }
    })
  );
  return results;
}

export const specPathFor = (cfg, slug) => join(cfg.root, cfg.specs, `${slug}.mjs`);

/** @param {import('./config.mjs').HandoffConfig} cfg */
export async function runAll(cfg, argv) {
  let targets = readRegistry(cfg);
  if (!targets.length) throw new Error(`no prototypes found in ${cfg.registry}`);
  if (!cfg.site) console.warn('handoff — no `site` in handoff.config.mjs; spec links will be base-relative.');

  const changedOnly = argv.includes('--changed');
  const skipBuild = argv.includes('--skip-build');
  const portAt = argv.indexOf('--port');
  if (portAt !== -1) cfg.port = Number(argv[portAt + 1]);
  const only = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--port');
  if (only.length) {
    const known = new Set(targets.map((t) => t.slug));
    const unknown = only.filter((s) => !known.has(s));
    if (unknown.length) throw new Error(`unknown slug(s): ${unknown.join(', ')}`);
    targets = targets.filter((t) => only.includes(t.slug));
  }
  const all = readRegistry(cfg);

  // Change detection: keys record the inputs each bundle was last built from.
  const CACHE = join(cfg.root, 'node_modules/.cache/handoff-keys.json');
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(CACHE, 'utf8'));
  } catch {
    /* first run */
  }
  const fingerprint = globalFingerprint(cfg.root, pkgDir);
  const keyFor = (t) => routeKey(cfg.root, { route: t.route, specPath: specPathFor(cfg, t.slug) }, fingerprint);
  if (changedOnly) {
    const before = targets.length;
    targets = targets.filter(
      (t) => !existsSync(join(cfg.root, cfg.out, bundleSlug(t.route), 'manifest.json')) || cache[t.slug] !== keyFor(t)
    );
    console.log(`handoff — ${targets.length} of ${before} route(s) changed since last capture`);
    if (!targets.length) {
      writeIndex(cfg, all, bundleSlug);
      return { failed: [] };
    }
  }

  console.log(`handoff — ${targets.length} route(s): ${targets.map((t) => t.slug).join(', ')}`);
  if (!skipBuild) run('npx', ['astro', 'build'], cfg.root, { NODE_ENV: 'production' });
  const origin = `http://127.0.0.1:${cfg.port}`;
  const server = await serveDist(join(cfg.root, 'dist'), cfg.base, cfg.port).catch((err) => {
    throw err.code === 'EADDRINUSE' ? new Error(`port ${cfg.port} is already in use; pass --port <n>`) : err;
  });

  const tokensDir = existsSync(join(cfg.root, 'node_modules/@esa/tokens'))
    ? join(cfg.root, 'node_modules/@esa/tokens')
    : join(pkgDir, '..', 'tokens');
  const tierIndex = await buildTierIndex(tokensDir);
  const prefixes = ['esa', cfg.spokePrefix].filter(Boolean);
  const componentIndex = await indexComponents(
    [
      { dir: join(pkgDir, '..', 'ecology', 'src', 'components'), rel: hubRoot },
      { dir: join(cfg.root, cfg.components), rel: cfg.root },
    ],
    prefixes
  );

  const browser = await launchBrowser();
  let results;
  try {
    console.log(`handoff — capturing ${targets.length} route(s), ${CONCURRENCY} at a time\n`);
    results = await pool(targets, CONCURRENCY, async (t) => {
      const local = `${origin}${cfg.base}${routePath(t.route)}`;
      const specPath = specPathFor(cfg, t.slug);
      const spec = existsSync(specPath) ? (await import(pathToFileURL(specPath).href)).default : null;
      const specSections =
        spec?.sections ?? (await deriveSections(browser, local, { prefixes, viewport: cfg.viewports.desktop }));
      const { theme, sections, logs } = await captureSections(browser, local, specSections, {
        tierIndex,
        classifyTokens,
        viewports: cfg.viewports,
        libraryClasses: cfg.libraryClasses,
      });
      const byLabel = new Map(specSections.map((s) => [s.label, s]));
      for (const s of sections) {
        const own = byLabel.get(s.label) || {};
        s.apply = own.apply;
        s.guide = guideOf(own);
        s.data = mergeData(spec?.data, own.data) ?? undefined;
        s.components = componentsOf(s, { spokePrefix: cfg.spokePrefix, index: componentIndex, target: cfg.target });
      }
      const m = writeBundle(cfg, {
        slug: t.slug,
        dir: bundleSlug(t.route),
        title: t.title,
        description: t.description,
        url: deployedUrl(cfg, routePath(t.route)),
        theme,
        generatedFrom: spec ? 'spec' : 'derived',
        data: spec?.data,
        sections,
      });
      // Print as one block: workers interleave, so streaming would shuffle routes.
      console.log([`${t.slug} (${m.generatedFrom}) → ${local}`, ...logs, `  wrote ${m.sections.length} section(s)`].join('\n'));
      return m;
    });
  } finally {
    await browser.close();
    await server.close();
  }

  // Keys only for routes that captured; a failed one is retried by the next --changed.
  mkdirSync(dirname(CACHE), { recursive: true });
  targets.forEach((t, i) => {
    if (results[i].ok) cache[t.slug] = keyFor(t);
  });
  writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  const idx = writeIndex(cfg, all, bundleSlug);
  console.log(`\nhandoff — index.md lists ${idx.count} prototype(s).`);

  const failed = targets.filter((_, i) => !results[i].ok);
  for (const [i, t] of targets.entries()) if (!results[i].ok) console.error(`  ✗ ${t.slug}: ${results[i].err.message}`);
  return { failed, manifests: results.filter((r) => r.ok).map((r) => r.value) };
}
