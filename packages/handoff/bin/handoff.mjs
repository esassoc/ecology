#!/usr/bin/env node
// handoff <url> [options] — turn a rendered prototype route into a self-contained
// dev handoff bundle.
//
//   --out <dir>       output root (default: ./handoff)
//   --name <name>     bundle name / subfolder (default: derived from URL path)
//   --source <dir>    spoke component source (default: ./src/components)
//   --public <dir>    asset dir(s) to copy from (default: ./dist, ./public)
//   --ecology <dir>   hub ecology package (default: resolved next to @esa/handoff)
//   --tokens <dir>    hub tokens package  (default: resolved next to @esa/handoff)
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { capture } from '../src/capture.mjs';
import { buildTierIndex, classifyTokens, synthesizeRootCss } from '../src/tokens.mjs';
import { mapComponents } from '../src/components.mjs';
import { emit } from '../src/emit.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) opts[a.slice(2)] = argv[++i];
    else opts._.push(a);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const url = opts._[0];
if (!url) {
  console.error('usage: handoff <url> [--out dir] [--name name] [--source dir] [--public dir]');
  process.exit(1);
}

const cwd = process.cwd();
const name = opts.name || new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index';
const outRoot = resolve(cwd, opts.out || 'handoff');
const outDir = join(outRoot, name);

const tokensPkgDir = opts.tokens ? resolve(cwd, opts.tokens) : join(pkgDir, '..', 'tokens');
const ecologyComponents = opts.ecology
  ? resolve(cwd, opts.ecology, 'src', 'components')
  : join(pkgDir, '..', 'ecology', 'src', 'components');
const spokeSource = resolve(cwd, opts.source || 'src/components');
const publicDirs = (opts.public ? [opts.public] : ['dist', 'public']).map((d) => resolve(cwd, d));

console.log(`handoff: capturing ${url} …`);
const cap = await capture(url);

const tierIndex = await buildTierIndex(tokensPkgDir);
const tokens = classifyTokens(cap.tokenNames, cap.tokenValues, tierIndex);
const rootCss = synthesizeRootCss(tokens.contract, cap.themeAttr);
const components = await mapComponents(cap.bodyHtml, [spokeSource, ecologyComponents]);

const { assets } = await emit({ outDir, name, capture: cap, rootCss, tokens, components, publicDirs });

console.log(`handoff: wrote ${outDir}/`);
console.log(
  `  ${cap.stats.rulesMatched} rules · ${tokens.contract.length} tokens · ` +
    `${components.length} components · ${assets.length} assets · ${cap.sections.length} sections`
);
