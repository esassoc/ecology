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

const p3Block = `\n@media (color-gamut: p3) {\n  :root {\n${lines.join('\n')}\n  }\n}\n`;
fs.appendFileSync('dist/tokens.css', p3Block);

/*
 * DEPRECATED token aliases.
 *
 * Spokes consume this package through a `file:` symlink, so a rename here lands
 * in every spoke on their next dev-server tick — there is no publish step to
 * absorb it. `--type-size-*` was renamed to `--font-size-*`; cb-fish-design
 * alone had 84 BARE `var(--type-size-N)` reads across 27 files, and a bare read
 * of an undeclared token drops the whole declaration. Silent, not loud.
 *
 * Emitted here rather than in tokens/primitive/ deliberately: a primitive whose
 * value is a reference is exactly the defect the tier-1 audit exists to catch,
 * and these would light it up. They are compatibility shims, not tokens.
 *
 * Remove once the spokes are migrated — `grep -rn -- '--type-size-' <spoke>/src`
 * returning nothing is the signal.
 */
const DEPRECATED_ALIASES = [
  ['--type-size-', '--font-size-', ['050', '100', '150', '200', '250', '300', '400', '500', '600', '700', '800', '900', '1000']],
];

const shims = [];
for (const [oldPrefix, newPrefix, steps] of DEPRECATED_ALIASES) {
  for (const step of steps) shims.push(`  ${oldPrefix}${step}: var(${newPrefix}${step});`);
}
fs.appendFileSync(
  'dist/tokens.css',
  `\n/* DEPRECATED — renamed tokens, kept so spoke source keeps resolving. See build.js. */\n:root {\n${shims.join('\n')}\n}\n`,
);

console.log('✓ tokens built → dist/tokens.css, dist/tokens.js');
console.log(`✓ P3 block appended (${lines.length} vars across ${P3_SCALES.length} scales)`);
console.log(`✓ ${shims.length} deprecated aliases appended`);
