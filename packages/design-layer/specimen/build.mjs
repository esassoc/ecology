// Builds the control kit's specimen into one self-contained page:
// node packages/design-layer/specimen/build.mjs  →  specimen/dist/index.html
import { build } from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = await build({ entryPoints: [here('./specimen.ts')], bundle: true, write: false, format: 'iife', target: 'es2022' });
const font = readFileSync(here('../assets/inter-variable.woff2')).toString('base64');
const tokens = readFileSync(here('../../tokens/dist/tokens.css'), 'utf8');
mkdirSync(here('./dist'), { recursive: true });
writeFileSync(here('./dist/index.html'), `<!doctype html><html lang="en" data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Design Layer Controls</title>
<style>@font-face{font-family:'Design Layer UI';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-style:normal}
${tokens}
html,body{margin:0;background:#111111}</style></head><body><script>${out.outputFiles[0].text}</script></body></html>`);
console.log('specimen/dist/index.html');

// The levers concept: the panel over a mock page on the hub's own tokens, face
// (DM Sans, from the artifact kit's inlined copy) and dark block.
const concept = await build({ entryPoints: [here('./concept.ts')], bundle: true, write: false, format: 'iife', target: 'es2022' });
const dmSans = readFileSync(new URL('file:///Users/andrewlovseth/Dev/esa/reference/artifact-kit/fonts.css'), 'utf8');
const dark = readFileSync(here('../../../apps/site/src/styles/docs-dark.css'), 'utf8');
writeFileSync(here('./dist/concept.html'), `<!doctype html><html lang="en" data-theme="default" data-scheme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Design Levers</title>
<style>@font-face{font-family:'Design Layer UI';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-style:normal}
${dmSans}
${tokens}
${dark}</style></head><body><script>${concept.outputFiles[0].text}</script></body></html>`);
console.log('specimen/dist/concept.html');
