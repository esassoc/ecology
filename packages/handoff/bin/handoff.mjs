#!/usr/bin/env node
// handoff — turn a spoke's prototypes into bundles an agent in another codebase can
// read. Run from the spoke root; settings come from its handoff.config.mjs.
//
//   handoff all [slug…] [--changed] [--skip-build]   every prototype in the registry
//   handoff check [--changed [--base <ref>]]          the guidance gate
//   handoff <url> [--name <dir>] [--out <dir>]        one already-served page, sections derived
import { loadConfig, deployedUrl } from '../src/config.mjs';
import { runAll } from '../src/pipeline.mjs';
import { runCheck } from '../src/check.mjs';
import { launchBrowser, captureSections, deriveSections } from '../src/capture.mjs';
import { buildTierIndex, classifyTokens } from '../src/tokens.mjs';
import { indexComponents, componentsOf } from '../src/components.mjs';
import { writeBundle } from '../src/bundle.mjs';
import { pkgDir } from '../src/pipeline.mjs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const [cmd, ...rest] = process.argv.slice(2);
const cfg = await loadConfig();

if (cmd === 'all') {
  const { failed } = await runAll(cfg, rest);
  process.exit(failed.length ? 1 : 0);
}
if (cmd === 'check') process.exit(await runCheck(cfg, rest));

if (!cmd || cmd.startsWith('--')) {
  console.error('usage: handoff all [slug…] [--changed] | handoff check [--changed] | handoff <url> [--name dir] [--out dir]');
  process.exit(1);
}

// Single page: the path a spoke without a registry (or an older generator) uses.
const opt = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? undefined : rest[i + 1];
};
const url = cmd;
const dir = opt('name') || new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index';
if (opt('out')) cfg.out = opt('out');

const prefixes = ['esa', cfg.spokePrefix].filter(Boolean);
const tokensDir = existsSync(join(cfg.root, 'node_modules/@esa/tokens')) ? join(cfg.root, 'node_modules/@esa/tokens') : join(pkgDir, '..', 'tokens');
const index = await indexComponents(
  [
    { dir: join(pkgDir, '..', 'ecology', 'src', 'components'), rel: join(pkgDir, '..', '..') },
    { dir: join(cfg.root, cfg.components), rel: cfg.root },
  ],
  prefixes
);
const browser = await launchBrowser();
try {
  const specSections = await deriveSections(browser, url, { prefixes, viewport: cfg.viewports.desktop });
  const { theme, sections, logs } = await captureSections(browser, url, specSections, {
    tierIndex: await buildTierIndex(tokensDir),
    classifyTokens,
    viewports: cfg.viewports,
    libraryClasses: cfg.libraryClasses,
  });
  for (const s of sections) s.components = componentsOf(s, { spokePrefix: cfg.spokePrefix, index, target: cfg.target });
  const path = new URL(url).pathname.replace(cfg.base, '');
  writeBundle(cfg, {
    slug: dir,
    dir,
    title: dir,
    url: cfg.site ? deployedUrl(cfg, path) : url,
    theme,
    generatedFrom: 'derived',
    sections,
  });
  console.log([`handoff: ${url}`, ...logs, `  wrote ${cfg.out}/${dir}/`].join('\n'));
} finally {
  await browser.close();
}
