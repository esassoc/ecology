#!/usr/bin/env node
/**
 * gen-radix-primitives.mjs — the tier-1 colour palette, generated from @radix-ui/colors.
 *
 * WHY THE WHOLE PALETTE AND NOT THE HUES WE HAPPEN TO USE. Tier 1 is the shared
 * VOCABULARY a project composes a theme from: a spoke re-points semantic roles at
 * these. A partial palette is not restraint, it is a vocabulary with words missing,
 * and the missing word gets discovered by whichever project needs a purple. Shipping
 * 25 hues costs bytes; shipping 10 costs someone a rebuild of the token layer.
 *
 * ONE THING THIS CANNOT COVER, and it is worth stating so the model is not oversold:
 * **a brand ramp is never a primitive.** `rampFrom` lands the client's own hex exactly
 * on step 9, and no Radix ramp matches an arbitrary brand colour. Themes still
 * generate `--<slug>-brand-*` for themselves. These cover everything else — neutrals,
 * utility hues, and the data-viz scales.
 *
 * GENERATED, not pasted, for the same reason `radix-curves.json` is: 540 hex values
 * nobody can eyeball should be reproducible from their source and reviewable in a
 * diff. Re-run on a dependency upgrade and READ THE DIFF — a changed primitive moves
 * every semantic role above it.
 *
 *   node scripts/gen-radix-primitives.mjs [--write] [--check]
 *
 * Without --write it reports what it would do and changes nothing. --check exits 1 if
 * the checked-in file is stale.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const radix = require('@radix-ui/colors');

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HUB, 'packages/tokens/tokens/primitive/color.json');

/** Every chromatic scale Radix ships. */
const CHROMATIC = [
  'amber', 'blue', 'bronze', 'brown', 'crimson', 'cyan', 'gold', 'grass', 'green',
  'indigo', 'iris', 'jade', 'lime', 'mint', 'orange', 'pink', 'plum', 'purple',
  'red', 'ruby', 'sky', 'teal', 'tomato', 'violet', 'yellow',
];

/**
 * The neutrals, and note these are CONSUMED ALREADY. `theme-recipe.mjs` seeds a
 * neutral TEMPERATURE and accepts six of them; the hub shipped only `gray`, so five
 * of six documented options had no primitive behind them. That is a gap being closed,
 * not a palette being padded.
 */
const NEUTRAL = ['gray', 'slate', 'sand', 'mauve', 'sage', 'olive'];

/**
 * Entries this generator must NOT touch.
 *
 * `copper` is Radix `bronze` under a back-compat name — it backs the `ai` intention
 * and renaming it now would break every consumer for no gain, so it stays
 * hand-authored with its own `$description` explaining the aliasing. The alpha scales
 * are overlay washes with no generated equivalent here (Radix ships an alpha twin of
 * every scale; adding all of them would double this file again, and nothing asks for
 * them yet).
 */
const PRESERVE = new Set([
  'copper',
  'yellow',
  'yellow-dark',
  'gray-a',
  'black-a',
  'white-a',
  // Held back deliberately — see "THREE DARK RAMPS DISAGREE" below.
  'grass-dark',
  'lime-dark',
  'gray-dark',
]);

/*
 * THREE DARK RAMPS DISAGREE WITH RADIX AND ARE PINNED ANYWAY, pending a decision.
 *
 * `grass-dark` (8 of 12 steps), `lime-dark` (7) and `gray-dark` (step 12 only) do not
 * match what `@radix-ui/colors` ships today, while their `$description`s claim to BE
 * the Radix dark scales. `blue-dark`, `red-dark`, `green-dark` and `yellow-dark` match
 * exactly — a partial mismatch across three scales reads as transcription drift from
 * an older version, not as deliberate tuning, which the aliased scales above document
 * when they mean it.
 *
 * They are pinned regardless, because THIS SCRIPT'S JOB IS ADDING SCALES. `grass-dark`
 * backs the brand in dark mode and `gray-dark` every dark surface; re-pointing them is
 * a visible re-colouring that deserves its own change and its own before/after, not a
 * side effect of widening the palette. Resolve separately, then drop them from here.
 */

/*
 * TWO SCALES ARE RADIX UNDER ANOTHER NAME, and both must be preserved rather than
 * regenerated. `copper` is Radix `bronze`; `yellow` is Radix `AMBER` — the hub's
 * `yellow-9` is `#ffc53d`, which is amber-9, where real Radix yellow-9 is `#ffe629`.
 * Each carries a `$description` saying so. Regenerating `yellow` from Radix yellow
 * would have moved all 12 steps of the scale that backs the WARNING intention, which
 * is exactly the silent re-colouring the change guard below exists to stop.
 *
 * A side effect worth knowing: adding real `amber` and `bronze` means those values now
 * ship under two names each. That is honest rather than duplicated — the aliases are
 * back-compat, the Radix names are canonical — but if the aliases are ever retired,
 * it is a `migrations.json` row, not a deletion.
 */

const scaleName = (base, dark) => (dark ? `${base}-dark` : base);
const exportName = (base, dark) => (dark ? `${base}Dark` : base);

/**
 * Radix objects are flat — `{ blue1: '#…', … }`. Return 12 steps in order.
 *
 * The DARK object reuses the LIGHT key names: `radix.grayDark` contains `gray1`…
 * `gray12`, not `grayDark1`. Prefixing keys with the export name silently returned
 * null for every dark scale, which surfaced as "would DROP: gray-dark, blue-dark, …"
 * rather than as an error — the guard caught it, the lookup did not.
 */
function steps(base, dark) {
  const src = radix[exportName(base, dark)];
  if (!src) return null;
  const out = {};
  for (let i = 1; i <= 12; i++) {
    const hex = src[`${base}${i}`];
    if (!hex) return null;
    out[String(i)] = { $value: hex.toLowerCase(), $type: 'color' };
  }
  return out;
}

const existing = JSON.parse(readFileSync(OUT, 'utf8'));
const before = existing.color;

const next = {};
// Preserved entries keep their position at the top, in their existing order.
for (const [k, v] of Object.entries(before)) if (PRESERVE.has(k)) next[k] = v;

const added = [];
const changed = [];
for (const base of [...NEUTRAL, ...CHROMATIC].sort()) {
  for (const dark of [false, true]) {
    const name = scaleName(base, dark);
    if (PRESERVE.has(name)) continue;
    const generated = steps(base, dark);
    if (!generated) continue;
    const prior = before[name];
    if (!prior) {
      added.push(name);
    } else {
      // Compare only the numbered steps; a `$description` is human commentary.
      for (let i = 1; i <= 12; i++) {
        const was = prior[String(i)]?.$value?.toLowerCase();
        const now = generated[String(i)].$value;
        if (was && was !== now) changed.push(`${name}.${i}: ${was} → ${now}`);
      }
      if (prior.$description) generated.$description = prior.$description;
    }
    next[name] = generated;
  }
}

const write = process.argv.includes('--write');
const check = process.argv.includes('--check');

console.log(`scales: ${Object.keys(next).length} (was ${Object.keys(before).length})`);
console.log(`tokens: ${Object.values(next).reduce((n, s) => n + Object.keys(s).filter((k) => k !== '$description').length, 0)}`);
console.log(`added : ${added.length}${added.length ? ` — ${added.join(', ')}` : ''}`);

/*
 * A CHANGED value is the dangerous outcome, not an added one. Every semantic role
 * sits on top of these, so a primitive that moves silently re-colours the system.
 * Report them individually and refuse to write, rather than folding them into a count.
 */
if (changed.length) {
  console.log(`\n⚠️  ${changed.length} EXISTING value(s) would change:`);
  for (const c of changed) console.log(`   ${c}`);
  console.log('\nThese are not additions. Re-point or accept each one deliberately before writing.');
  if (write) process.exit(1);
}

const missing = Object.keys(before).filter((k) => !next[k]);
if (missing.length) {
  console.log(`\n⚠️  would DROP: ${missing.join(', ')} — add to PRESERVE if intentional.`);
  if (write) process.exit(1);
}

if (check) {
  const stale = JSON.stringify(before) !== JSON.stringify(next);
  console.log(stale ? '\n✗ primitive colours are stale — run with --write' : '\n✓ up to date');
  process.exit(stale ? 1 : 0);
}

if (write) {
  existing.color = next;
  writeFileSync(OUT, JSON.stringify(existing, null, 2) + '\n');
  console.log(`\n✓ written → ${path.relative(HUB, OUT)}`);
} else {
  console.log('\n(dry run — pass --write to apply)');
}
