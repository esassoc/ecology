import fs from 'node:fs';
import { deriveDataviz, DATAVIZ_LENGTHS } from './lib/dataviz.mjs';

const PRIM = 'packages/tokens/tokens/primitive/color.json';
const prim = JSON.parse(fs.readFileSync(PRIM, 'utf8')).color;

// hex -> [{scale, step}] across every primitive
const index = new Map();
for (const [scale, steps] of Object.entries(prim)) {
  for (const [step, def] of Object.entries(steps)) {
    if (step === '$description' || typeof def?.$value !== 'string') continue;
    const hex = def.$value.toLowerCase();
    if (!index.has(hex)) index.set(hex, []);
    index.get(hex).push({ scale, step });
  }
}

const surfaces = { light: ['#fcfcfc', '#f9f9f9'], dark: ['#191919', '#111111'] };
const d = deriveDataviz({ seedHex: '#46a758', neutral: 'pure', surfaces });

for (const scheme of ['light', 'dark']) {
  console.log(`\n--- ${scheme} ---`);
  for (const [scale, n] of Object.entries(DATAVIZ_LENGTHS)) {
    for (let i = 0; i < n; i++) {
      const hex = d[scheme][scale][i].toLowerCase();
      const hits = (index.get(hex) ?? []).filter((h) => (scheme === 'dark') === h.scale.endsWith('-dark'));
      const label = `${scale}-${i + 1}`.padEnd(16);
      console.log(`  ${label} ${hex}  ${hits.length ? hits.map((h) => `{color.${h.scale}.${h.step}}`).join(' | ') : '— NO PRIMITIVE'}`);
    }
  }
}
