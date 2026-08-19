/**
 * theme-recipe.mjs — a handful of brand decisions → a complete two-scheme theme.
 *
 * THE RECIPE IS THE ARTIFACT. A hand-filled theme file records what someone typed;
 * a recipe records what they DECIDED, so the theme can be regenerated when a curve
 * moves, a role is added, or a foreground turns out to fail. Everything here is a
 * pure function of the recipe — same input, same bytes out.
 *
 * WHAT THIS EXISTS TO FIX, concretely. `packages/spoke-template/.../theme-*.css`
 * declares ZERO of the eight `--color-content-on-*` foregrounds, and all eight are
 * `fail`-level rows in check-contrast.mjs. So the documented hand-fill path ships a
 * brand fill audited against a foreground nobody chose — which is why `beacon` still
 * fails `content-on-brand-secondary` at 3.64:1. Picking those eight against the fills
 * it just generated is the job; the colour picker is incidental.
 *
 * Isomorphic — no `node:` imports. See color.mjs.
 */

import { contrastHex } from './color.mjs';
import {
  NEUTRAL_TEMPERATURES,
  belowFirstStep,
  nearestChromaticScale,
  neutralRamp,
  rampFrom,
  step,
} from './ramp.mjs';

export const SCHEMES = ['light', 'dark'];
export { NEUTRAL_TEMPERATURES };

/**
 * Corner languages. `soft` reproduces the hub defaults exactly (050/100/200/400), so
 * a recipe that says nothing about shape changes nothing about shape.
 *
 * These point at RADIUS PRIMITIVES, not px. --radius-300 is skipped because it holds
 * the same 0.5rem as --radius-200 and picking between them would be a coin flip.
 * --radius-pill is not emitted at all: every corner language wants it fully round, so
 * a generated `--radius-pill: var(--radius-full)` would be a dead alias over the value
 * it already has. A squared-off brand pins it.
 */
export const CORNERS = {
  flat: { xs: '0', sm: 'var(--radius-050)', md: 'var(--radius-100)', lg: 'var(--radius-200)' },
  soft: { xs: 'var(--radius-050)', sm: 'var(--radius-100)', md: 'var(--radius-200)', lg: 'var(--radius-400)' },
  round: { xs: 'var(--radius-100)', sm: 'var(--radius-200)', md: 'var(--radius-400)', lg: 'var(--radius-500)' },
};

/**
 * Seeds for the non-brand intentions when a recipe says `derive`.
 *
 * These are the HUB'S OWN step-9 values, not fresh choices — so `"utility": "derive"`
 * reproduces the semantics a reader already knows (success is lime, warning is yellow,
 * AI is copper) and the only thing that changes is that the foregrounds get picked
 * instead of inherited. A generator that quietly re-hued `danger` would be making a
 * meaning decision under the cover of a colour decision.
 *
 * Status colours are deliberately NOT derived from the brand hue. A green brand must
 * not make `danger` green.
 */
export const DEFAULT_INTENTION_SEEDS = {
  accent: '#f76b15', // orange-9
  ai: '#a18072', // copper-9 — the hub's own ramp; Radix has no `copper`
  info: '#0090ff', // blue-9
  success: '#bdee63', // lime-9  (bright: needs dark text, and the picker will find that)
  warning: '#ffc53d', // yellow-9 (bright)
  danger: '#e5484d', // red-9
};

const AA_TEXT = 4.5;

// SC 1.4.11 Non-Text Contrast — the threshold for a UI affordance rather than text.
// Only the focus ring uses it here. Named rather than inlined because it is the one
// number the ring's whole guarantee rests on: the hub's own brand clears it by 0.07
// (grass step 10 at 3.07:1), so anyone tempted to demand more margin changes it HERE
// and re-runs, rather than hand-picking a step per theme.
const AA_NON_TEXT = 3.0;

// --- validation --------------------------------------------------------------

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Throws on a malformed recipe. Returns a normalised copy with defaults filled in. */
export function validateRecipe(recipe) {
  const fail = (msg) => {
    throw new Error(`invalid recipe: ${msg}`);
  };
  if (!recipe || typeof recipe !== 'object') fail('not an object');

  const slug = recipe.slug;
  if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
    fail(`slug must match /^[a-z][a-z0-9-]*$/ — got ${JSON.stringify(slug)}`);
  }

  const seeds = { ...(recipe.seeds || {}) };
  if (!seeds.brand || !HEX.test(seeds.brand)) {
    fail(`seeds.brand must be a hex colour — got ${JSON.stringify(seeds.brand)}`);
  }
  seeds.neutral ??= 'pure';
  if (!NEUTRAL_TEMPERATURES.includes(seeds.neutral)) {
    fail(`seeds.neutral must be one of: ${NEUTRAL_TEMPERATURES.join(', ')} — got ${seeds.neutral}`);
  }
  seeds.corners ??= 'soft';
  if (!CORNERS[seeds.corners]) {
    fail(`seeds.corners must be one of: ${Object.keys(CORNERS).join(', ')} — got ${seeds.corners}`);
  }

  // Per-intention seeds: 'derive' (the string) or a hex.
  for (const key of Object.keys(DEFAULT_INTENTION_SEEDS)) {
    const v = seeds[key] ?? 'derive';
    if (v !== 'derive' && !HEX.test(v)) {
      fail(`seeds.${key} must be "derive" or a hex colour — got ${JSON.stringify(v)}`);
    }
    seeds[key] = v;
  }
  // `utility` is sugar: one word covering info/success/warning/danger.
  if (seeds.utility && seeds.utility !== 'derive') {
    if (typeof seeds.utility !== 'object') {
      fail('seeds.utility must be "derive" or an object of {info, success, warning, danger}');
    }
    for (const [k, v] of Object.entries(seeds.utility)) {
      if (!['info', 'success', 'warning', 'danger'].includes(k)) fail(`unknown seeds.utility key: ${k}`);
      if (!HEX.test(v)) fail(`seeds.utility.${k} must be a hex colour — got ${JSON.stringify(v)}`);
      seeds[k] = v;
    }
  }
  delete seeds.utility;

  for (const [key, label] of [['pinned', 'pinned'], ['pinnedDark', 'pinnedDark']]) {
    const p = recipe[key];
    if (p === undefined) continue;
    if (typeof p !== 'object' || p === null || Array.isArray(p)) fail(`${label} must be an object`);
    for (const name of Object.keys(p)) {
      if (!name.startsWith('--')) fail(`${label} key must be a custom property name — got ${name}`);
    }
  }

  return {
    slug,
    scope: recipe.scope || slug,
    seeds,
    pinned: recipe.pinned || {},
    pinnedDark: recipe.pinnedDark || {},
    schemes: recipe.schemes || SCHEMES,
  };
}

// --- the AA picker -----------------------------------------------------------

/**
 * Choose a foreground for `fill`, and if allowed, move the fill until one works.
 *
 * Candidates in order: the neutral knockout (near-white in light), then step 12 of the
 * fill's OWN ramp (dark text carrying the same hue, which is what Radix intends for a
 * bright scale), then the neutral's darkest. First one clearing 4.5:1 wins.
 *
 * `movable` is the honest half. A generated fill — brand-secondary at step 8, the
 * utility colours, accent, AI — is OUR choice, so if nothing reads on it we walk it
 * darker (9 → 10 → 11) and say so. `--color-background-brand` is NOT movable: it is
 * the exact hex a client pointed at and said "that is our blue". When that hex cannot
 * carry readable text we report it and leave it alone, because silently shifting a
 * brand colour is not a fix, it is a thing someone has to discover later.
 *
 * `pinnedFill` IS THE ONE THAT BITES. A pin on a fill wins in the emitted CSS, so a
 * foreground measured against the DERIVED fill is a foreground measured against a colour
 * that does not ship — which is this tool's own headline bug, reintroduced through the
 * escape hatch. Measured for real: pinning `--color-background-utility-info` to #228be6
 * produced a foreground chosen against a different blue, and it passed by luck. A pinned
 * fill is therefore treated exactly like the brand's: authoritative, and not movable.
 */
function resolveFillAndForeground({ role, ramp, neutral, fillStep = 9, movable, pinnedFill = null }) {
  const candidatesFor = (fillHex) =>
    [
      ['neutral step 1', step(neutral, 1)],
      ['own ramp step 12', step(ramp, 12)],
      ['neutral step 12', step(neutral, 12)],
    ].map(([label, hex]) => ({ label, hex, ratio: contrastHex(hex, fillHex) }));

  if (pinnedFill) {
    movable = false;
  }

  const attempts = [];
  const lastStep = movable ? 11 : fillStep;
  for (let s = fillStep; s <= lastStep; s++) {
    const fillHex = pinnedFill ?? step(ramp, s);
    const best = candidatesFor(fillHex).sort((a, b) => b.ratio - a.ratio)[0];
    const passing = candidatesFor(fillHex).find((c) => c.ratio >= AA_TEXT);
    attempts.push({ s, fillHex, best });
    if (passing) {
      return {
        fillStep: s,
        fill: fillHex,
        fg: passing.hex,
        ratio: passing.ratio,
        moved: s !== fillStep,
        movedFrom: s !== fillStep ? fillStep : null,
        fgLabel: passing.label,
        warning: null,
      };
    }
  }

  const { s, fillHex, best } = attempts[attempts.length - 1];
  return {
    fillStep: s,
    fill: fillHex,
    fg: best.hex,
    ratio: best.ratio,
    moved: s !== fillStep,
    movedFrom: s !== fillStep ? fillStep : null,
    fgLabel: best.label,
    warning: {
      level: 'fail',
      role,
      message:
        `no foreground reaches ${AA_TEXT}:1 on ${fillHex}` +
        (movable
          ? ` even after darkening the fill to step ${s}. Best is ${best.ratio.toFixed(2)}:1.`
          : `. Best is ${best.ratio.toFixed(2)}:1 (${best.label}). This fill is the brand's exact ` +
            'hex and is not moved automatically — either the brand needs a darker step for ' +
            'filled surfaces, or text must not sit on it.'),
    },
  };
}

/**
 * Choose the FOCUS RING's colour: the brand, at the first ramp step that can be seen.
 *
 * THE PROBLEM THIS EXISTS FOR. SC 1.4.11 asks the focus indicator to clear 3:1 against
 * adjacent colours. A brand hex is chosen for brand reasons and lands anywhere on the
 * luminance scale, so "the ring is the brand" and "the ring always clears 3:1" cannot
 * both be guaranteed by one flat value. Measured in the hub on 2026-08-16: grass step 9
 * managed 2.95 on the raised and canvas surfaces and 2.66 on the sunken one — a Level AA
 * failure that had been shipping, and reported as a win, for months.
 *
 * SO: walk the brand's OWN ramp upward from step 9 and take the first step clearing 3:1
 * on EVERY surface in this scheme. The result is still unmistakably the brand — one step
 * along its own curve, same hue, same family — which is the whole reason this is not a
 * second non-brand band. (A near-black contrast band WAS tried, on 2026-08-16, and
 * reverted the same day for reading as a heavy slab around every focused control.)
 *
 * THE NEUTRAL FALLBACK IS A FLOOR THAT MEASURABLY NEVER FIRES, and that is worth stating
 * precisely rather than leaving as a hope. Swept 216 seeds across the RGB cube in both
 * schemes: every single one had a brand step clearing 3:1, and the WORST best-available
 * ratio was 9.55:1. The reason is structural — step 12 of any light-scheme ramp is dark
 * and step 12 of any dark-scheme ramp is light, so the far end of the curve is always
 * usable. So the practical guarantee is stronger than "accessible": THE RING IS ALWAYS
 * THE BRAND. Nothing generated by rampFrom reaches the neutral.
 *
 * It stays anyway, because `ramp` is a parameter and not every caller has to be rampFrom.
 * The fallback is the neutral's step 12 — `--color-content-default`'s own value, near-black
 * in light and near-white in dark, 14:1 or better on every surface — and it is reported at
 * level `fail`, because a ring that is no longer brand-coloured is something a spoke has to
 * be told about rather than discover. Exported for that branch's test: it cannot be reached
 * through deriveTheme, so the only honest way to cover it is to call it directly.
 *
 * DIRECTION IS THE SAME IN BOTH SCHEMES — walk the step INDEX up — because a dark ramp
 * gets lighter at higher steps while a light ramp gets darker, and both directions move
 * away from their own surfaces. ONE TRAP: that is only true of a ramp built for the
 * scheme it is used in. The hub's dark scheme does not re-point the brand, so it reads
 * the LIGHT grass ramp, where walking up makes contrast worse (5.24 at step 9 down to
 * 1.31 at step 12). Taking the FIRST passing step handles that correctly — step 9 passes
 * and the walk stops immediately — but a refactor to "pick the best step" would quietly
 * break it. Do not make that change.
 */
export function resolveFocusRing({ ramp, neutral, surfaces }) {
  const worstOn = (hex) => Math.min(...surfaces.map((s) => contrastHex(hex, s)));

  for (let s = 9; s <= 12; s++) {
    const hex = step(ramp, s);
    const ratio = worstOn(hex);
    if (ratio >= AA_NON_TEXT) {
      return { step: s, hex, ratio, fellBack: false, moved: s !== 9 };
    }
  }

  const hex = step(neutral, 12);
  return { step: null, hex, ratio: worstOn(hex), fellBack: true, moved: true };
}

/**
 * Coloured text on a surface: step 11, dropping to 12 if 11 does not read.
 *
 * Step 11 is Radix's step for coloured text on a surface, which is exactly this job.
 * Used for the `-subtle` tint pairings AND for links, where the surface is the page.
 */
function resolveColouredText({ role, ramp, onHex, label = 'the subtle tint' }) {
  for (const s of [11, 12]) {
    const hex = step(ramp, s);
    const r = contrastHex(hex, onHex);
    if (r >= AA_TEXT) return { hex, ratio: r, usedStep: s, warning: null };
  }
  const hex = step(ramp, 12);
  return {
    hex,
    ratio: contrastHex(hex, onHex),
    usedStep: 12,
    warning: {
      level: 'fail',
      role,
      message: `step 12 still misses ${AA_TEXT}:1 on ${label} ${onHex} (${contrastHex(hex, onHex).toFixed(2)}:1)`,
    },
  };
}

// --- derivation --------------------------------------------------------------

/**
 * recipe → { light: Map, dark: Map, ramps, warnings, meta }.
 *
 * The Maps are ordered: emission order is the reading order of the generated file.
 */
export function deriveTheme(input) {
  const recipe = validateRecipe(input);
  const { seeds, scope } = recipe;
  const warnings = [];
  const out = {};
  const ramps = {};

  const seedFor = (key) => (seeds[key] === 'derive' ? DEFAULT_INTENTION_SEEDS[key] : seeds[key]);

  for (const scheme of SCHEMES) {
    const t = new Map();

    // Pins are APPLIED last (so a human edit always wins) but READ first (so anything
    // measured against a pinned colour is measured against what actually ships). Only
    // literal hexes are readable — a pin holding a var() chain cannot be resolved here,
    // and the derivation says so rather than measuring the wrong thing.
    const pins = { ...recipe.pinned, ...(scheme === 'dark' ? recipe.pinnedDark : {}) };
    const pinnedHex = (name) => {
      const v = pins[name];
      if (v === undefined) return null;
      if (HEX.test(v)) return v;
      warnings.push({
        level: 'info',
        scheme,
        role: name,
        message:
          `pinned to "${v}", which is not a literal hex — anything measured against it ` +
          '(its foreground, its contrast pairs) falls back to the derived value. Pin a hex to be graded.',
      });
      return null;
    };
    const neutral = neutralRamp(seeds.neutral, scheme);
    const neutralKnockout = neutralRamp(seeds.neutral, scheme === 'light' ? 'dark' : 'light');
    const brand = rampFrom(seeds.brand, { scheme });
    const R = {
      brand,
      accent: rampFrom(seedFor('accent'), { scheme }),
      ai: rampFrom(seedFor('ai'), { scheme }),
      info: rampFrom(seedFor('info'), { scheme }),
      success: rampFrom(seedFor('success'), { scheme }),
      warning: rampFrom(seedFor('warning'), { scheme }),
      danger: rampFrom(seedFor('danger'), { scheme }),
    };
    ramps[scheme] = { neutral, ...R };

    // (1) The spoke tier — raw ramps in the spoke's own namespace. Hub components
    // never read these; the semantic re-points below are the only consumers.
    //
    // STEPS ARE 1-12, matching Radix and the hub's primitives. The old template used
    // 50/100/…/900 web-palette names, which brand-extraction.md already warns "resolve
    // to nothing" against hub primitives — a spoke reading its own -500 next to the
    // hub's -9 had two step vocabularies for one idea.
    if (scheme === 'dark') t.set(`--${scope}-gray-0`, belowFirstStep(neutral));
    for (let i = 1; i <= 12; i++) t.set(`--${scope}-gray-${i}`, step(neutral, i));
    for (let i = 1; i <= 12; i++) t.set(`--${scope}-brand-${i}`, step(brand, i));

    const g = (n) => `var(--${scope}-gray-${n})`;
    const b = (n) => `var(--${scope}-brand-${n})`;

    // (2) The surface set. Radix step conventions, straight out of semantic/color.json:
    // 1 = canvas, 3 = sunken/disabled fill, 4 = hovered element, 6 = subtle border,
    // 7 = border, 8 = strong border, 9 = disabled text, 10 = muted text, 11 =
    // secondary text, 12 = body text.
    //
    // THE ELEVATION AXIS IS FLAT IN LIGHT AND STEPPED IN DARK, mirroring the hub. In
    // the light palette canvas, raised and floating are all step 1 — color.json says so
    // outright and keeps them as three tokens anyway, because "identical default values
    // do not make two tokens redundant at a layer whose whole job is being re-pointed".
    // The dark scheme is where they separate (1 / 2 / 3), and color.json calls that
    // separation "the proof the roles are real". Flattening dark would erase the proof.
    //
    // Dark's sunken well sits BELOW the canvas, and a 12-step ramp has no room under
    // its own step 1 — hence the derived gray-0. Dark also moves hover and disabled up
    // (5 and 4) because they must read against any of the three surfaces above them,
    // not just the canvas.
    const dark = scheme === 'dark';
    t.set('--color-background-default', g(1));
    t.set('--color-background-elevation-raised', g(dark ? 2 : 1));
    t.set('--color-background-elevation-floating', g(dark ? 3 : 1));
    t.set('--color-background-elevation-sunken', dark ? g(0) : g(3));
    t.set('--color-background-default-hover', g(dark ? 5 : 4));
    // The hub leaves this one at the LIGHT gray-3 in dark mode, because docs-dark.css
    // never re-points it — so a disabled field renders near-white on a near-black page.
    // Generated themes set it per scheme.
    t.set('--color-background-disabled', g(dark ? 4 : 3));
    t.set('--color-content-default', g(12));
    t.set('--color-content-default-secondary', g(11));
    t.set('--color-content-default-tertiary', g(11));
    t.set('--color-content-default-muted', g(10));
    t.set('--color-content-disabled', g(9));
    t.set('--color-border-default', g(7));
    t.set('--color-border-default-subtle', g(6));
    t.set('--color-border-default-strong', g(8));
    t.set('--color-border-disabled', g(6));

    // (3) Knockout — the reverse of whatever ground this scheme sits on.
    //
    // The surface and its text need no special-casing: step 12 of the LIGHT neutral is
    // near-black and step 12 of the DARK neutral is near-white, so "knockout = step 12"
    // is already the mirror. The hairline is the exception, because a divider inside a
    // knocked-out region sits on the opposite ground from everything around it — hence
    // the opposite ramp. That is the `-knockout` contract from color.json: the reverse
    // of this theme's ground, never "the dark value".
    t.set('--color-background-default-knockout', g(12));
    t.set('--color-background-default-knockout-hover', g(11));
    t.set('--color-content-default-knockout', g(1));
    t.set('--color-border-default-knockout', step(neutralKnockout, 7));

    // (4) Brand.
    //
    // --color-border-default-focus IS EMITTED HERE, AND THIS FILE USED TO SAY IT MUST NOT
    // BE. The old note read: "it derives from --color-background-brand at tier 2, and that
    // derivation is load-bearing — it is what stopped cb-fish from re-pointing its brand to
    // navy and keeping Ecology-green focus rings. A focus ring wants the FILL step, so there
    // is nothing to improve here and everything to break." The first half is still true and
    // is why this is emitted for EVERY theme below, even when the walk picks step 9 and the
    // value is identical. The second half is the part the measurement refuted: the fill step
    // is exactly what a focus ring cannot always have, because step 9 is engineered for a
    // 3:1 SOLID FILL and the ring needs 3:1 as a HAIRLINE against the same surfaces. The
    // hub's own grass step 9 came to 2.66:1 on the sunken surface. See resolveFocusRing.
    //
    // WHAT REPLACES THE DERIVATION, since the hub's :root now names a ramp step rather than
    // the brand role, and so no longer follows a re-skin on its own:
    //   1. this emission, which is unconditional per theme per scheme, so a generated spoke
    //      can never inherit the hub's hue;
    //   2. the declaration in packages/spoke-template, so a hand-authored theme has it in
    //      front of it rather than having to know;
    //   3. check-contrast.mjs, where the four focus rows are level `fail` — so a theme that
    //      does neither is told, in both schemes.
    // That is the "teeth in the gate, not the cascade" shape SPEC.md already states for the
    // assurance axis. It is a weaker guarantee than a var() chain and it is chosen knowingly:
    // a chain that always resolves cannot express "unless that colour cannot be seen".
    //
    // THE "DO NOT MOVE THE BRAND" RULE IS LIGHT-ONLY, and getting that wrong left a real
    // failure on the table. The rule exists because the light fill IS the client's exact
    // hex — not ours to shift. The DARK fill is not: rampFrom deliberately does not anchor
    // the seed in dark (a light-scheme brand hex glares against a near-black page), so
    // dark step 9 is the generator's own pick and is as movable as any utility colour.
    // Measured on a purple spoke: dark brand sat at 4.43:1 and was reported as
    // unresolvable, when moving one step up the dark ramp fixes it outright.
    const brandFill = resolveFillAndForeground({
      role: '--color-background-brand',
      ramp: brand,
      neutral,
      movable: dark,
      pinnedFill: pinnedHex('--color-background-brand'),
    });
    if (brandFill.moved) {
      warnings.push({
        level: 'info',
        scheme,
        role: '--color-background-brand',
        message:
          `moved from step ${brandFill.movedFrom} to step ${brandFill.fillStep} of the dark ` +
          `ramp so its foreground could reach AA (${brandFill.ratio.toFixed(2)}:1). The light ` +
          'fill is untouched — it is the brand hex.',
      });
    }
    if (brandFill.warning) warnings.push({ scheme, ...brandFill.warning });

    // The focus ring. Graded against THIS THEME'S OWN surfaces, not the hub's — a spoke
    // re-points its neutral ramp too, and a ring measured against the wrong ground is this
    // tool's recorded headline bug (see resolveFillAndForeground's note on pinnedFill).
    // Pins are read, not just applied, for the same reason.
    const focusSurfaces = [
      pinnedHex('--color-background-default') ?? step(neutral, 1),
      pinnedHex('--color-background-elevation-raised') ?? step(neutral, dark ? 2 : 1),
      pinnedHex('--color-background-elevation-floating') ?? step(neutral, dark ? 3 : 1),
      pinnedHex('--color-background-elevation-sunken') ??
        (dark ? belowFirstStep(neutral) : step(neutral, 3)),
    ];
    const focus = resolveFocusRing({ ramp: brand, neutral, surfaces: focusSurfaces });
    t.set('--color-border-default-focus', focus.fellBack ? g(12) : b(focus.step));
    if (focus.moved) {
      warnings.push({
        level: focus.fellBack ? 'fail' : 'info',
        scheme,
        role: '--color-border-default-focus',
        message: focus.fellBack
          ? `no step of the brand ramp reaches ${AA_NON_TEXT}:1 as a focus ring against this ` +
            `theme's surfaces (best would be ${focus.ratio.toFixed(2)}:1), so the ring falls back ` +
            'to the neutral (step 12) and is NOT brand-coloured in this scheme. SC 1.4.11. To get ' +
            'the brand back, the brand needs a step that can be seen as a hairline.'
          : `moved from step 9 to step ${focus.step} of the brand ramp so the focus ring clears ` +
            `${AA_NON_TEXT}:1 on every surface (${focus.ratio.toFixed(2)}:1). Still the brand — one ` +
            'step along its own curve. Step 9 is a solid-fill step and does not always survive as ' +
            'a hairline; the brand FILL is untouched.',
      });
    }

    t.set('--color-background-brand', b(brandFill.fillStep));
    t.set('--color-background-brand-hover', b(Math.min(12, brandFill.fillStep + 1)));
    t.set('--color-background-brand-active', b(Math.min(12, brandFill.fillStep + 1)));
    t.set('--color-background-brand-subtle', b(2));
    t.set('--color-background-brand-muted', b(3));
    t.set('--color-background-brand-muted-hover', b(4));

    const secondary = resolveFillAndForeground({
      role: '--color-background-brand-secondary',
      ramp: brand,
      neutral,
      fillStep: 8,
      movable: true,
      pinnedFill: pinnedHex('--color-background-brand-secondary'),
    });
    if (secondary.warning) warnings.push({ scheme, ...secondary.warning });
    if (secondary.moved) {
      warnings.push({
        level: 'info',
        scheme,
        role: '--color-background-brand-secondary',
        message:
          `moved from brand step ${secondary.movedFrom} to step ${secondary.fillStep} so its ` +
          `foreground could reach AA (${secondary.ratio.toFixed(2)}:1). This is the fill that ` +
          'beacon has been failing at 3.64:1.',
      });
    }
    t.set('--color-background-brand-secondary', b(secondary.fillStep));
    t.set('--color-background-brand-secondary-hover', b(Math.min(12, secondary.fillStep + 1)));

    const brandText = resolveColouredText({
      role: '--color-content-brand',
      ramp: brand,
      onHex: pinnedHex('--color-background-brand-subtle') ?? step(brand, 2),
    });
    if (brandText.warning) warnings.push({ scheme, ...brandText.warning });
    t.set('--color-content-brand', b(brandText.usedStep));
    t.set('--color-content-brand-secondary', b(brandText.usedStep));

    // (4b) LINKS, and this is a departure worth reading.
    //
    // `--color-content-link` derives from `--color-background-brand` at tier 2 — i.e. the
    // step-9 SOLID FILL. color.json says outright that this was inherited rather than
    // chosen ("value-neutral by design") and flags it as "a candidate to re-point", because
    // step 11 is Radix's step for coloured text on a surface. It matters: a fill step is
    // engineered for 3:1, so link text on the page fails AA for most brands. Measured on a
    // generated purple spoke: 3.42:1 in dark, a `fail` row in the gate.
    //
    // So links ARE emitted here, at the text step of the spoke's OWN brand ramp. The
    // intent of the tier-2 derivation is preserved — a link still follows the brand — it
    // just stops borrowing a colour picked to be a button. The focus ring, which genuinely
    // wants the fill step, is left on its derivation.
    const linkText = resolveColouredText({
      role: '--color-content-link',
      ramp: brand,
      onHex: pinnedHex('--color-background-elevation-raised') ?? step(neutral, dark ? 2 : 1),
      label: 'the raised surface',
    });
    if (linkText.warning) warnings.push({ scheme, ...linkText.warning });
    t.set('--color-content-link', b(linkText.usedStep));
    t.set('--color-content-link-hover', b(Math.min(12, linkText.usedStep + 1)));
    t.set('--color-border-brand', b(6));

    // (5) The eight foregrounds. Emitted as literal hexes rather than var() because
    // each one is a MEASURED answer to "what reads on that fill", not a step someone
    // picked — pointing it at a ramp step would invite editing the step and silently
    // losing the measurement.
    t.set('--color-content-on-brand', brandFill.fg);
    t.set('--color-content-on-brand-secondary', secondary.fg);

    // (6) Accent, AI, and the four utilities. Same shape each time.
    const intentions = [
      ['accent', '--color-background-accent', null],
      ['ai', '--color-background-ai', '--color-background-ai-subtle'],
      ['info', '--color-background-utility-info', '--color-background-utility-info-subtle'],
      ['success', '--color-background-utility-success', '--color-background-utility-success-subtle'],
      ['warning', '--color-background-utility-warning', '--color-background-utility-warning-subtle'],
      ['danger', '--color-background-utility-danger', '--color-background-utility-danger-subtle'],
    ];
    for (const [key, fillName, subtleName] of intentions) {
      const ramp = R[key];
      const r = resolveFillAndForeground({
        role: fillName,
        ramp,
        neutral,
        movable: true,
        pinnedFill: pinnedHex(fillName),
      });
      if (r.warning) warnings.push({ scheme, ...r.warning });
      if (r.moved) {
        warnings.push({
          level: 'info',
          scheme,
          role: fillName,
          message:
            `moved from step ${r.movedFrom} to step ${r.fillStep} so its foreground could ` +
            `reach AA (${r.ratio.toFixed(2)}:1).`,
        });
      }
      const onName = fillName.replace('--color-background-', '--color-content-on-');
      t.set(fillName, r.fill);
      t.set(`${fillName}-hover`, step(ramp, Math.min(12, r.fillStep + 1)));
      t.set(onName, r.fg);
      if (subtleName) {
        const tint = pinnedHex(subtleName) ?? step(ramp, 2);
        t.set(subtleName, step(ramp, 2));
        // `accent` has no -subtle and no coloured-text role in the token set, so the
        // text/border pair below is scoped to the intentions that do.
        const textName =
          key === 'ai' ? '--color-content-ai' : `--color-content-utility-${key}`;
        const text = resolveColouredText({ role: textName, ramp, onHex: tint });
        if (text.warning) warnings.push({ scheme, ...text.warning });
        t.set(textName, text.hex);
        if (key !== 'ai') t.set(`--color-border-utility-${key}`, step(ramp, 6));
      }
    }

    // (7) Body text on the brand tint — a `fail` row in check-contrast that nothing
    // else in this derivation covers.
    const bodyOnTint = contrastHex(
      pinnedHex('--color-content-default') ?? step(neutral, 12),
      pinnedHex('--color-background-brand-subtle') ?? step(brand, 2),
    );
    if (bodyOnTint < AA_TEXT) {
      warnings.push({
        level: 'fail',
        scheme,
        role: '--color-content-default on --color-background-brand-subtle',
        message: `body text on the brand tint is ${bodyOnTint.toFixed(2)}:1`,
      });
    }

    // (8) Shape and type — light block only. Neither changes with the scheme, and
    // repeating them in the dark block would mean two places to edit one decision.
    if (scheme === 'light') {
      const corners = CORNERS[seeds.corners];
      for (const [k, v] of Object.entries(corners)) t.set(`--radius-${k}`, v);
      if (seeds.fontSans) t.set('--typography-font-family-sans', seeds.fontSans);
      if (seeds.fontMono) t.set('--typography-font-family-mono', seeds.fontMono);
      if (seeds.fontDisplay) t.set('--typography-font-family-display', seeds.fontDisplay);
    }

    // (9) Pins last. Anything a human touched in the editor survives regeneration —
    // that is the whole point of recording them separately from the seeds.
    for (const [k, v] of Object.entries(recipe.pinned)) t.set(k, v);
    if (scheme === 'dark') for (const [k, v] of Object.entries(recipe.pinnedDark)) t.set(k, v);

    out[scheme] = t;
  }

  return {
    light: out.light,
    dark: out.dark,
    ramps,
    warnings,
    meta: {
      slug: recipe.slug,
      scope,
      seeds,
      brandScale: nearestChromaticScale(seeds.brand),
      pinnedCount: Object.keys(recipe.pinned).length + Object.keys(recipe.pinnedDark).length,
    },
  };
}

// --- emission ----------------------------------------------------------------

const pad = (name, width) => `${name}:`.padEnd(width + 2, ' ');

function block(selector, map, indent = '  ') {
  const width = Math.max(...[...map.keys()].map((k) => k.length));
  const body = [...map]
    .map(([k, v]) => `${indent}${pad(k, width)} ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/**
 * derived theme → the CSS file text.
 *
 * THE DARK SELECTOR CARRIES BOTH ATTRIBUTES AND AN ELEMENT, and that is not styling.
 * The hub's dark block is `html[data-scheme='dark']` — specificity (0,1,1) — while a
 * plain `[data-theme="x"]` is (0,1,0). A dark block written as
 * `[data-theme="x"][data-scheme="dark"]` is (0,2,0) and STILL loses to it on any token
 * both declare. `html[data-scheme="dark"][data-theme="x"]` is (0,2,1) and wins.
 *
 * EVERY VALUE IS A HEX OR A var() CHAIN ENDING IN ONE. check-contrast.mjs's parseColor
 * reads #rgb/#rrggbb/rgb()/white/black and nothing else — an `oklch()` or `color-mix()`
 * here would make those pairs unauditable, and that script's own history records what
 * that costs: it once checked 0 pairs and exited 0 with "All text pairs pass AA".
 */
export function emitCss(derived, { schemes = SCHEMES } = {}) {
  const { meta, warnings } = derived;
  const failing = warnings.filter((w) => w.level === 'fail');

  const header = [
    '/*',
    ` * ${meta.slug} theme — GENERATED from a recipe by scripts/make-theme.mjs.`,
    ' *',
    ' * Do not hand-edit: the next regeneration overwrites it. To change a value,',
    ' * change the recipe. To keep a value the generator would not choose, add it to',
    ` * the recipe's "pinned" map — pins are applied last and survive regeneration.`,
    ' *',
    ` * Brand seed ${meta.seeds.brand} (curve: Radix ${meta.brandScale}), neutral ${meta.seeds.neutral},`,
    ` * corners ${meta.seeds.corners}${meta.pinnedCount ? `, ${meta.pinnedCount} pinned value(s)` : ''}.`,
    ' *',
    ' * The brand hex sits EXACTLY on step 9 of the spoke ramp below; every other step',
    ' * is interpolated along the reference curve. Verify with:',
    ` *   node ../ecology/scripts/check-contrast.mjs src/styles/theme-${meta.slug}.css`,
    ` *   node ../ecology/scripts/check-contrast.mjs src/styles/theme-${meta.slug}.css --scheme dark`,
    ...(failing.length
      ? [
          ' *',
          ` * ⚠ ${failing.length} CONTRAST ISSUE(S) THE GENERATOR COULD NOT RESOLVE:`,
          ...failing.map((w) => ` *   [${w.scheme}] ${w.role} — ${w.message}`),
        ]
      : []),
    ' */',
  ].join('\n');

  const parts = [header];
  if (schemes.includes('light')) {
    parts.push(block(`[data-theme="${meta.slug}"]`, derived.light));
  }
  if (schemes.includes('dark')) {
    parts.push(
      [
        '/*',
        ' * Dark scheme. The selector needs the element AND both attributes to outrank the',
        " * hub's own html[data-scheme='dark'] block, which is (0,1,1) — see emitCss.",
        ' */',
        block(`html[data-scheme="dark"][data-theme="${meta.slug}"]`, derived.dark),
      ].join('\n'),
    );
  }
  return parts.join('\n\n') + '\n';
}
