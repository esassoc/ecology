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
 */
function resolveFillAndForeground({ role, ramp, neutral, fillStep = 9, movable }) {
  const candidatesFor = (fillHex) =>
    [
      ['neutral step 1', step(neutral, 1)],
      ['own ramp step 12', step(ramp, 12)],
      ['neutral step 12', step(neutral, 12)],
    ].map(([label, hex]) => ({ label, hex, ratio: contrastHex(hex, fillHex) }));

  const attempts = [];
  const lastStep = movable ? 11 : fillStep;
  for (let s = fillStep; s <= lastStep; s++) {
    const fillHex = step(ramp, s);
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

/** Coloured text on its own subtle tint: step 11, dropping to 12 if 11 does not read. */
function resolveTintText({ role, ramp, tintHex }) {
  for (const s of [11, 12]) {
    const hex = step(ramp, s);
    const r = contrastHex(hex, tintHex);
    if (r >= AA_TEXT) return { hex, ratio: r, usedStep: s, warning: null };
  }
  const hex = step(ramp, 12);
  return {
    hex,
    ratio: contrastHex(hex, tintHex),
    usedStep: 12,
    warning: {
      level: 'fail',
      role,
      message: `step 12 still misses ${AA_TEXT}:1 on the subtle tint ${tintHex} (${contrastHex(hex, tintHex).toFixed(2)}:1)`,
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

    // (4) Brand. NOTE WHAT IS ABSENT: --color-content-link, --color-content-link-hover
    // and --color-border-default-focus are NOT emitted. They derive from
    // --color-background-brand at tier 2 (semantic/color.json), and that derivation is
    // load-bearing — it is what stopped cb-fish from re-pointing its brand to navy and
    // keeping Ecology-green focus rings. Emitting them here would flatten the chain and
    // re-open exactly that bug.
    const brandFill = resolveFillAndForeground({
      role: '--color-background-brand',
      ramp: brand,
      neutral,
      movable: false,
    });
    if (brandFill.warning) warnings.push({ scheme, ...brandFill.warning });

    t.set('--color-background-brand', b(9));
    t.set('--color-background-brand-hover', b(10));
    t.set('--color-background-brand-active', b(10));
    t.set('--color-background-brand-subtle', b(2));
    t.set('--color-background-brand-muted', b(3));
    t.set('--color-background-brand-muted-hover', b(4));

    const secondary = resolveFillAndForeground({
      role: '--color-background-brand-secondary',
      ramp: brand,
      neutral,
      fillStep: 8,
      movable: true,
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

    const brandText = resolveTintText({
      role: '--color-content-brand',
      ramp: brand,
      tintHex: step(brand, 2),
    });
    if (brandText.warning) warnings.push({ scheme, ...brandText.warning });
    t.set('--color-content-brand', b(brandText.usedStep));
    t.set('--color-content-brand-secondary', b(brandText.usedStep));
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
      const r = resolveFillAndForeground({ role: fillName, ramp, neutral, movable: true });
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
      t.set(fillName, step(ramp, r.fillStep));
      t.set(`${fillName}-hover`, step(ramp, Math.min(12, r.fillStep + 1)));
      t.set(onName, r.fg);
      if (subtleName) {
        const tint = step(ramp, 2);
        t.set(subtleName, tint);
        // `accent` has no -subtle and no coloured-text role in the token set, so the
        // text/border pair below is scoped to the intentions that do.
        const textName =
          key === 'ai' ? '--color-content-ai' : `--color-content-utility-${key}`;
        const text = resolveTintText({ role: textName, ramp, tintHex: tint });
        if (text.warning) warnings.push({ scheme, ...text.warning });
        t.set(textName, text.hex);
        if (key !== 'ai') t.set(`--color-border-utility-${key}`, step(ramp, 6));
      }
    }

    // (7) Body text on the brand tint — a `fail` row in check-contrast that nothing
    // else in this derivation covers.
    const bodyOnTint = contrastHex(step(neutral, 12), step(brand, 2));
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
