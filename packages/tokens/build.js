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
 * REDUCED MOTION. Re-points the tier-2 motion tokens at --duration-0 for users whose
 * OS asks for it. This is the reason tier 1 splits duration from easing at all: while
 * a token's value was the composite string "150ms ease", honouring this preference
 * meant editing all 73 `transition:` declarations by hand, so nobody did — before this
 * block, `prefers-reduced-motion` appeared in exactly ONE file in the whole repo, and
 * it was the docs page demonstrating its own hover swatch.
 *
 * Overridden at TIER 2, not tier 1, deliberately. `reduce` means remove NON-ESSENTIAL
 * motion, not all motion: a frozen spinner reads as a hung app, so --animation-spin and
 * --animation-indeterminate are left running. Zeroing the tier-1 duration scale instead
 * would have taken them with it, and the exemption would have had to be expressed as
 * "except steps 750 and 1500," which is a fact about the scale rather than about roles.
 * Tier 2 knows which motion is feedback and which is decoration; tier 1 cannot.
 *
 * Reaches tokenized call sites only. The 42 hardcoded `transition:` declarations and 22
 * hardcoded `@keyframes` timings in components still ignore the preference until they
 * are moved onto these tokens.
 */
const REDUCED_MOTION = [
  '--transition-fast', '--transition-base', '--transition-slow',
  '--animation-enter', '--animation-exit',
  '--animation-overlay-enter', '--animation-overlay-exit',
];
fs.appendFileSync(
  'dist/tokens.css',
  `\n/* Honours prefers-reduced-motion at the token layer. Loading indicators` +
    ` (--animation-spin,\n   --animation-indeterminate) keep moving on purpose —` +
    ` a frozen spinner reads as a crash. */\n` +
    `@media (prefers-reduced-motion: reduce) {\n  :root {\n` +
    REDUCED_MOTION.map((t) => `    ${t}: var(--duration-0);`).join('\n') +
    `\n  }\n}\n`,
);

/*
 * DEPRECATED token aliases, GENERATED from migrations.json.
 *
 * Spokes consume this package through a `file:` symlink, so a rename here lands
 * in every spoke on their next dev-server tick — there is no publish step to
 * absorb it, and a BARE `var(--old-name)` does not fall back, it drops the whole
 * declaration. Silent, not loud.
 *
 * Emitted here rather than in tokens/primitive/ deliberately: a primitive whose
 * value is a reference is exactly the defect the tier-1 audit exists to catch,
 * and these would light it up. They are compatibility shims, not tokens.
 *
 * Add a rename to migrations.json IN THE SAME COMMIT as the rename. No row, no
 * alias, and spokes break without anyone finding out.
 */
/*
 * The composite classes, as a JS string, for SHADOW DOM.
 *
 * A composite is a class because CSS has no composite custom property — and a global
 * class does not cross a shadow boundary, which is where half the component kit lives.
 * Lit components include this via `unsafeCSS` in `static styles`, so both halves of
 * the kit name the same class for the same role.
 *
 * GENERATED from src/typography.css so there is one definition, not two that drift.
 * The deprecated `.type-*` aliases are cut: they exist for spoke markup this repo does
 * not control, and shipping them into every shadow root would be dead weight.
 */
const typographyCss = fs.readFileSync('src/typography.css', 'utf8');
const liveClasses = typographyCss
  .split(/\/\* -+\n \* DEPRECATED/)[0]
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .trim();
fs.writeFileSync(
  'dist/typography-styles.js',
  `// GENERATED by build.js from src/typography.css — do not edit.\n` +
    `// The composite classes for shadow DOM. See packages/ecology/src/typography.ts.\n` +
    `export const typographyCss = ${JSON.stringify(liveClasses)};\n`,
);
console.log(`✓ typography-styles.js emitted (${liveClasses.match(/\.typography-[\w-]+\s*\{/g)?.length ?? 0} classes)`);

/*
 * The a11y utilities, same mechanism and for the same reason: `.visually-hidden`
 * is needed INSIDE shadow roots (the "Error:" prefix on a field message, the count
 * in an error summary heading) and a global class does not cross that boundary.
 *
 * GENERATED from src/a11y.css so the clip rect has one definition. Two hand-kept
 * copies of this particular technique is exactly how you end up with one that has
 * been quietly "simplified" to `display: none` and hides the text from the screen
 * readers it exists to reach.
 */
const a11yCss = fs
  .readFileSync('src/a11y.css', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .trim();
fs.writeFileSync(
  'dist/a11y-styles.js',
  `// GENERATED by build.js from src/a11y.css — do not edit.\n` +
    `// The a11y utilities for shadow DOM. See packages/ecology/src/a11y.ts.\n` +
    `export const a11yCss = ${JSON.stringify(a11yCss)};\n`,
);
console.log(`✓ a11y-styles.js emitted (${a11yCss.match(/\.visually-hidden[\w-]*[^{]*\{/g)?.length ?? 0} rules)`);

const migrations = JSON.parse(fs.readFileSync('migrations.json', 'utf8')).migrations;
const shims = [];
const removedNotes = [];
for (const m of migrations) {
  if (m.kind !== 'token') continue; // class renames live in src/typography.css
  // `removed: true` means the token is GONE, not renamed — there is no equivalent
  // value to alias to. Emitting `--old: var(--new)` here would be worse than
  // emitting nothing: --control-height-md would silently resolve to a padding
  // value, so a spoke reading it would get 12px where it expected 40px. The row
  // still exists so doctor.mjs can warn and the `to` field can point at whatever
  // replaced the CAPABILITY, which is not the same thing as replacing the value.
  if (m.removed) {
    removedNotes.push(`     ${m.pairs.map(([f]) => f).join(', ')} — removed (${m.id}); see ${m.to ?? 'migrations.json'}`);
    continue;
  }
  for (const [from, to] of m.pairs) shims.push(`  ${from}: var(${to}); /* deprecated: ${m.id} */`);
}
fs.appendFileSync(
  'dist/tokens.css',
  `\n/* DEPRECATED — renamed tokens, kept so spoke source keeps resolving.\n` +
    `   Generated from migrations.json. Run \`node scripts/migrate-tokens.mjs\` in a spoke\n` +
    `   to move off them, then delete the row here once every spoke is clean.\n` +
    (removedNotes.length
      ? `\n   NOT ALIASED — these were REMOVED, not renamed. There is no equivalent value,\n` +
        `   so no shim is emitted and a spoke still reading them gets nothing:\n${removedNotes.join('\n')}\n`
      : '') +
    `*/\n` +
    `:root {\n${shims.join('\n')}\n}\n`,
);

/*
 * THE ACCESSIBILITY ASSURANCE PROFILE, appended verbatim from src/assurance.css.
 *
 * Shipped inside tokens.css rather than exported as an opt-in import ON PURPOSE.
 * The block is inert unless [data-assurance] is on the page, so it costs a spoke
 * that never opts in nothing but bytes — and the alternative has a measured failure
 * rate. Spokes override 3 of 26 brand-derived roles; any rule of the form "a spoke
 * must ALSO import X" is forgotten. `focus.css` is the standing example: three
 * files in the world import it, and a spoke that does not gets browser-default
 * focus rings with no warning anywhere.
 *
 * Read from src/assurance.css for the same reason the typography classes are read
 * from src/typography.css — one definition, not two that drift. It is pure CSS
 * with no build-time derivation, so it is copied byte-for-byte.
 *
 * APPENDED LAST, AND THAT IS LOAD-BEARING. `:root` and `[data-assurance="x"]` have
 * IDENTICAL specificity (0,1,0) — a pseudo-class and an attribute selector weigh
 * the same — so nothing but source order decides which wins. Emitted before the
 * deprecated-alias `:root` block, a future alias for any name this profile sets
 * would silently beat it. There is no such collision today; this ordering is what
 * keeps it that way without anyone having to remember.
 *
 * WHAT THIS ORDERING DOES *NOT* DO, because it is the first thing to assume it
 * does: it does not beat a spoke's theme. A spoke's `[data-theme]` block is a
 * separate stylesheet loaded AFTER tokens.css at the same specificity, so a theme
 * that re-points --color-background-brand still wins, profile or no profile. That
 * is deliberate — the hub cannot know a spoke's brand ramp, and silently
 * overwriting a brand with hub green would be a worse failure than the one it
 * fixes. The teeth are in the gate instead: check-contrast.mjs composes theme over
 * profile and FAILS the spoke whose brand does not clear AA. See the note in
 * src/assurance.css.
 */
const assuranceCss = fs.readFileSync('src/assurance.css', 'utf8');
fs.appendFileSync('dist/tokens.css', `\n${assuranceCss}`);
const assuranceDecls = (assuranceCss.match(/^ {2}--[a-z0-9-]+:/gm) || []).length;

console.log('✓ tokens built → dist/tokens.css, dist/tokens.js');
console.log(`✓ P3 block appended (${lines.length} vars across ${P3_SCALES.length} scales)`);
console.log(`✓ ${shims.length} deprecated aliases appended (from migrations.json)`);
console.log(`✓ assurance profile appended (${assuranceDecls} declarations, [data-assurance])`);
