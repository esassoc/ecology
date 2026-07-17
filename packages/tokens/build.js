import StyleDictionary from 'style-dictionary';
import fs from 'fs';
import * as radix from '@radix-ui/colors';

// DTCG-format tokens ($value / $type) live in tokens/. Style Dictionary v4
// auto-detects the DTCG format and resolves {alias} references across tiers.
// This is the single seam where new output targets get added: drop another
// platform below (scss, ts, tailwind, figma) and it compiles from the same source.
const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          // outputReferences keeps semantic tokens authored as var(--primitive),
          // which makes the 3-tier resolution legible in the compiled output.
          options: { outputReferences: true }
        }
      ]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [{ destination: 'tokens.js', format: 'javascript/es6' }]
    }
  }
});

await sd.buildAllPlatforms();

// Append a @media (color-gamut: p3) block so capable displays get vivid P3 colors.
// Only primitive ramps that Radix ships with P3 variants are included; copper and
// alpha scales have no P3 equivalent and are intentionally omitted.
const P3_SCALES = [
  { jsonKey: 'gray',       radixKey: 'grayP3' },
  { jsonKey: 'blue',       radixKey: 'blueP3' },
  { jsonKey: 'teal',       radixKey: 'tealP3' },
  { jsonKey: 'green',      radixKey: 'greenP3' },
  { jsonKey: 'red',        radixKey: 'redP3' },
  { jsonKey: 'orange',     radixKey: 'orangeP3' },
  { jsonKey: 'yellow',     radixKey: 'yellowP3' },
  { jsonKey: 'grass',      radixKey: 'grassP3' },
  { jsonKey: 'lime',       radixKey: 'limeP3' },
  { jsonKey: 'gold',       radixKey: 'goldP3' },
  { jsonKey: 'gray-dark',  radixKey: 'grayDarkP3' },
  { jsonKey: 'blue-dark',  radixKey: 'blueDarkP3' },
  { jsonKey: 'green-dark', radixKey: 'greenDarkP3' },
  { jsonKey: 'grass-dark', radixKey: 'grassDarkP3' },
  { jsonKey: 'lime-dark',  radixKey: 'limeDarkP3' },
  { jsonKey: 'red-dark',   radixKey: 'redDarkP3' },
  { jsonKey: 'yellow-dark',radixKey: 'yellowDarkP3' },
];

const lines = [];
for (const { jsonKey, radixKey } of P3_SCALES) {
  const scale = radix[radixKey];
  if (!scale) continue;
  // Radix keys are like "blue1" … "blue12"; map to --color-blue-1 … --color-blue-12
  const scaleName = jsonKey; // e.g. "blue", "gray-dark"
  const radixPrefix = radixKey.replace('P3', ''); // e.g. "blue", "grayDark"
  for (let step = 1; step <= 12; step++) {
    const radixStepKey = `${radixPrefix}${step}`;
    const cssVar = `--color-${scaleName}-${step}`;
    if (scale[radixStepKey]) {
      lines.push(`  ${cssVar}: ${scale[radixStepKey]};`);
    }
  }
}

// P3 alpha ramps. Radix ships a `color(display-p3 … / a)` variant for every alpha
// scale (e.g. blueP3A, grayDarkP3A). Their step keys drop the P3 — blueP3A.blueA9 —
// and dark objects reuse the light base name (grayDarkP3A.grayA9). scaleName is the
// authored JSON key, base is the radix step prefix. Mirrors the sRGB alpha ramps in
// tokens/primitive/color.json so capable displays get vivid P3 transparency.
const ALPHA_P3_SCALES = [
  { scaleName: 'blue-a',        radixKey: 'blueP3A',      base: 'blue' },
  { scaleName: 'teal-a',        radixKey: 'tealP3A',      base: 'teal' },
  { scaleName: 'green-a',       radixKey: 'greenP3A',     base: 'green' },
  { scaleName: 'red-a',         radixKey: 'redP3A',       base: 'red' },
  { scaleName: 'orange-a',      radixKey: 'orangeP3A',    base: 'orange' },
  { scaleName: 'yellow-a',      radixKey: 'amberP3A',     base: 'amber' },
  { scaleName: 'copper-a',      radixKey: 'bronzeP3A',    base: 'bronze' },
  { scaleName: 'grass-a',       radixKey: 'grassP3A',     base: 'grass' },
  { scaleName: 'lime-a',        radixKey: 'limeP3A',      base: 'lime' },
  { scaleName: 'gold-a',        radixKey: 'goldP3A',      base: 'gold' },
  { scaleName: 'gray-a',        radixKey: 'grayP3A',      base: 'gray' },
  { scaleName: 'gray-dark-a',   radixKey: 'grayDarkP3A',  base: 'gray' },
  { scaleName: 'blue-dark-a',   radixKey: 'blueDarkP3A',  base: 'blue' },
  { scaleName: 'green-dark-a',  radixKey: 'greenDarkP3A', base: 'green' },
  { scaleName: 'grass-dark-a',  radixKey: 'grassDarkP3A', base: 'grass' },
  { scaleName: 'lime-dark-a',   radixKey: 'limeDarkP3A',  base: 'lime' },
  { scaleName: 'red-dark-a',    radixKey: 'redDarkP3A',   base: 'red' },
  { scaleName: 'yellow-dark-a', radixKey: 'amberDarkP3A', base: 'amber' },
];
for (const { scaleName, radixKey, base } of ALPHA_P3_SCALES) {
  const scale = radix[radixKey];
  if (!scale) continue;
  for (let step = 1; step <= 12; step++) {
    const radixStepKey = `${base}A${step}`;
    const cssVar = `--color-${scaleName}-${step}`;
    if (scale[radixStepKey]) {
      lines.push(`  ${cssVar}: ${scale[radixStepKey]};`);
    }
  }
}

const p3Block = `\n@media (color-gamut: p3) {\n  :root {\n${lines.join('\n')}\n  }\n}\n`;
fs.appendFileSync('dist/tokens.css', p3Block);

console.log('✓ tokens built → dist/tokens.css, dist/tokens.js');
console.log(`✓ P3 block appended (${lines.length} vars across ${P3_SCALES.length + ALPHA_P3_SCALES.length} scales)`);
