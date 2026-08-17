import test from 'node:test';
import assert from 'node:assert/strict';

import { contrastHex, parseHex, srgbToOklch } from './color.mjs';
import { CORNERS, deriveTheme, emitCss, validateRecipe } from './theme-recipe.mjs';

const recipe = ({ seeds, ...over } = {}) => ({
  slug: 'testbrand',
  ...over,
  seeds: { brand: '#1f7a6d', ...(seeds || {}) },
});

/**
 * Resolve a var() chain inside one derived scheme, the way check-contrast.mjs does.
 *
 * Deliberately a local re-implementation rather than an import: it double-checks that
 * the emitted chains are well-formed and terminate in a literal, which is the property
 * the real gate depends on and cannot verify for itself.
 */
function resolve(map, name, depth = 0) {
  assert.ok(depth < 12, `var() chain too deep at ${name}`);
  const raw = map.get(name);
  assert.ok(raw !== undefined, `${name} is not declared`);
  const m = /^var\((--[a-zA-Z0-9-_]+)\)$/.exec(raw);
  return m ? resolve(map, m[1], depth + 1) : raw;
}

// --- validation --------------------------------------------------------------

test('validateRecipe refuses what it cannot act on', () => {
  assert.throws(() => validateRecipe(null), /not an object/);
  assert.throws(() => validateRecipe({ seeds: { brand: '#fff' } }), /slug must match/);
  assert.throws(() => validateRecipe({ slug: 'Bad Slug', seeds: { brand: '#fff' } }), /slug must match/);
  assert.throws(() => validateRecipe({ slug: 'ok' }), /seeds\.brand must be a hex/);
  assert.throws(() => validateRecipe(recipe({ seeds: { neutral: 'lukewarm' } })), /seeds\.neutral/);
  assert.throws(() => validateRecipe(recipe({ seeds: { corners: 'spiky' } })), /seeds\.corners/);
  assert.throws(() => validateRecipe(recipe({ pinned: { 'color-x': '#fff' } })), /custom property name/);
  assert.throws(() => validateRecipe(recipe({ seeds: { danger: 'reddish' } })), /must be "derive" or a hex/);
});

test('validateRecipe fills in the defaults and expands the utility shorthand', () => {
  const r = validateRecipe(recipe({ seeds: { utility: { info: '#228be6' } } }));
  assert.equal(r.seeds.neutral, 'pure');
  assert.equal(r.seeds.corners, 'soft');
  assert.equal(r.scope, 'testbrand', 'scope defaults to the slug');
  assert.equal(r.seeds.info, '#228be6');
  assert.equal(r.seeds.danger, 'derive', 'an unspecified utility still derives');
  assert.equal(r.seeds.utility, undefined, 'the shorthand is consumed, not carried');
});

// --- THE REGRESSION ----------------------------------------------------------

test('every content-on-* foreground clears AA, for brands chosen to be hostile', () => {
  // This is the whole reason the tool exists. The spoke template declares NONE of these
  // eight, so the hand-fill path ships a brand fill audited against a foreground nobody
  // chose — which is why beacon has been failing content-on-brand-secondary at 3.64:1
  // and why the hub's own defaults fail seven pairs today.
  const PAIRS = [
    ['--color-content-on-brand', '--color-background-brand'],
    ['--color-content-on-brand-secondary', '--color-background-brand-secondary'],
    ['--color-content-on-accent', '--color-background-accent'],
    ['--color-content-on-ai', '--color-background-ai'],
    ['--color-content-on-utility-info', '--color-background-utility-info'],
    ['--color-content-on-utility-success', '--color-background-utility-success'],
    ['--color-content-on-utility-warning', '--color-background-utility-warning'],
    ['--color-content-on-utility-danger', '--color-background-utility-danger'],
  ];
  const brands = {
    'beacon (the 3.64:1 case)': '#1f7a6d',
    'qanat': '#1769aa',
    'a bright highlighter yellow': '#ffe629',
    'a near-black brand': '#101418',
    'a pale mint': '#c8f0e2',
    'a hot magenta': '#e5399f',
    'a desaturated navy': '#3d5a75',
  };

  for (const [label, brand] of Object.entries(brands)) {
    const d = deriveTheme(recipe({ seeds: { brand } }));
    for (const scheme of ['light', 'dark']) {
      for (const [fg, bg] of PAIRS) {
        const r = contrastHex(resolve(d[scheme], fg), resolve(d[scheme], bg));
        const brandFillIsTheSeed = bg === '--color-background-brand' && scheme === 'light';
        if (r < 4.5) {
          // The ONE fill that is allowed to fail is the brand's exact hex in light,
          // because it is not ours to move. It must be reported, never silently kept.
          assert.ok(
            brandFillIsTheSeed,
            `${label} [${scheme}] ${fg} on ${bg}: ${r.toFixed(2)}:1`,
          );
          assert.ok(
            d.warnings.some((w) => w.level === 'fail' && w.scheme === scheme && w.role === bg),
            `${label} [${scheme}]: ${bg} fails at ${r.toFixed(2)}:1 with no warning raised`,
          );
        }
      }
    }
  }
});

test('coloured text clears AA on its own subtle tint', () => {
  const d = deriveTheme(recipe({ seeds: { brand: '#1f7a6d' } }));
  for (const scheme of ['light', 'dark']) {
    const pairs = [
      ['--color-content-brand', '--color-background-brand-subtle'],
      ['--color-content-ai', '--color-background-ai-subtle'],
      ['--color-content-utility-info', '--color-background-utility-info-subtle'],
      ['--color-content-utility-success', '--color-background-utility-success-subtle'],
      ['--color-content-utility-warning', '--color-background-utility-warning-subtle'],
      ['--color-content-utility-danger', '--color-background-utility-danger-subtle'],
    ];
    for (const [fg, bg] of pairs) {
      const r = contrastHex(resolve(d[scheme], fg), resolve(d[scheme], bg));
      assert.ok(r >= 4.5, `[${scheme}] ${fg} on ${bg}: ${r.toFixed(2)}:1`);
    }
  }
});

test('the neutral text chain clears AA on every surface it lands on', () => {
  for (const neutral of ['pure', 'cool', 'warm']) {
    const d = deriveTheme(recipe({ seeds: { neutral } }));
    for (const scheme of ['light', 'dark']) {
      for (const bg of [
        '--color-background-default',
        '--color-background-elevation-raised',
        '--color-background-elevation-sunken',
        '--color-background-elevation-floating',
      ]) {
        for (const fg of ['--color-content-default', '--color-content-default-secondary']) {
          const r = contrastHex(resolve(d[scheme], fg), resolve(d[scheme], bg));
          assert.ok(r >= 4.5, `${neutral} [${scheme}] ${fg} on ${bg}: ${r.toFixed(2)}:1`);
        }
      }
      // Knockout is the mirror: its content must read on its own surface too.
      const k = contrastHex(
        resolve(d[scheme], '--color-content-default-knockout'),
        resolve(d[scheme], '--color-background-default-knockout'),
      );
      assert.ok(k >= 4.5, `${neutral} [${scheme}] knockout text: ${k.toFixed(2)}:1`);
    }
  }
});

test('the elevation axis is flat in light and stepped in dark, as the hub has it', () => {
  // color.json keeps canvas/raised/floating as three tokens while giving them one value
  // in light, and calls the dark scheme's separation "the proof the roles are real".
  // Flattening dark would erase the proof; stepping light would contradict the palette.
  const d = deriveTheme(recipe());
  const surfaces = (m) =>
    [
      '--color-background-default',
      '--color-background-elevation-raised',
      '--color-background-elevation-floating',
    ].map((n) => resolve(m, n));

  assert.equal(new Set(surfaces(d.light)).size, 1, 'light: one value across the three');
  assert.equal(new Set(surfaces(d.dark)).size, 3, 'dark: three distinct rungs');
});

test('the dark sunken well sits BELOW the canvas', () => {
  // A 12-step ramp has no room under step 1, which is why the hub hardcoded #0d0d0f —
  // the only literal colour in docs-dark.css. This derives the same relationship, so a
  // warm-neutral theme gets a warm well instead of a grey one.
  const d = deriveTheme(recipe({ seeds: { neutral: 'cool' } }));
  const canvas = srgbToOklch(parseHex(resolve(d.dark, '--color-background-default'))).l;
  const sunken = srgbToOklch(parseHex(resolve(d.dark, '--color-background-elevation-sunken'))).l;
  assert.ok(sunken < canvas, `sunken ${sunken} must sit below canvas ${canvas}`);
  // Fed the hub's own neutral, it reproduces the hub's own literal.
  assert.equal(resolve(d.dark, '--color-background-elevation-sunken'), '#0d0d0f');
  // …and it follows the neutral, rather than staying grey.
  const warm = deriveTheme(recipe({ seeds: { neutral: 'warm' } }));
  assert.notEqual(resolve(warm.dark, '--color-background-elevation-sunken'), '#0d0d0f');
});

test('a disabled fill breaks from every surface it can land on', () => {
  // The hub leaves --color-background-disabled at the LIGHT gray-3 in dark mode, because
  // docs-dark.css never re-points it — so a disabled field renders near-white on a
  // near-black page. A generated theme sets it per scheme.
  for (const scheme of ['light', 'dark']) {
    const d = deriveTheme(recipe());
    const disabled = resolve(d[scheme], '--color-background-disabled');
    for (const surface of [
      '--color-background-default',
      '--color-background-elevation-raised',
      '--color-background-elevation-floating',
    ]) {
      assert.notEqual(
        disabled,
        resolve(d[scheme], surface),
        `[${scheme}] a disabled field is invisible on ${surface}`,
      );
    }
  }
});

// --- what must NOT be emitted ------------------------------------------------

test('the three derived brand roles are left alone', () => {
  // --color-content-link, -link-hover and --color-border-default-focus derive from
  // --color-background-brand at tier 2. Emitting them here would flatten that chain and
  // re-open the cb-fish bug: a navy brand with Ecology-green focus rings.
  const d = deriveTheme(recipe());
  for (const scheme of ['light', 'dark']) {
    for (const name of [
      '--color-content-link',
      '--color-content-link-hover',
      '--color-border-default-focus',
    ]) {
      assert.ok(!d[scheme].has(name), `${name} must not be declared by a generated theme`);
    }
  }
});

test('no deleted or core token is ever emitted', () => {
  const d = deriveTheme(recipe());
  const banned = [
    /^--form-padding-/, // deleted 2026-08-14, inert
    /^--control-height-/, // deleted 2026-08-14, no successor
    /^--form-height-/,
    /^--spacing-/, // a core set — re-pointing moves every gap in the kit
    /^--radius-(050|100|200|300|400|500|full)$/, // primitives, not roles
    /^--color-(gray|teal|grass|blue|red|orange|yellow|lime|gold|copper)-/, // primitives
  ];
  for (const scheme of ['light', 'dark']) {
    for (const name of d[scheme].keys()) {
      for (const re of banned) {
        assert.ok(!re.test(name), `[${scheme}] generated a forbidden token: ${name}`);
      }
    }
  }
});

// --- shape, type, pins -------------------------------------------------------

test('corners: soft reproduces the hub defaults exactly', () => {
  // A recipe that says nothing about shape must change nothing about shape.
  assert.deepEqual(CORNERS.soft, {
    xs: 'var(--radius-050)',
    sm: 'var(--radius-100)',
    md: 'var(--radius-200)',
    lg: 'var(--radius-400)',
  });
  const d = deriveTheme(recipe({ seeds: { corners: 'flat' } }));
  assert.equal(d.light.get('--radius-md'), 'var(--radius-100)');
  assert.ok(!d.light.has('--radius-pill'), 'pill would be a dead alias over --radius-full');
});

test('shape and type live only in the light block', () => {
  const d = deriveTheme(recipe({ seeds: { corners: 'round', fontSans: "'DM Sans', sans-serif" } }));
  assert.ok(d.light.has('--radius-md'));
  assert.ok(!d.dark.has('--radius-md'), 'one decision, one place to edit it');
  assert.equal(d.light.get('--typography-font-family-sans'), "'DM Sans', sans-serif");
  assert.ok(!d.dark.has('--typography-font-family-sans'));
});

test('a font the recipe does not name is left at the hub default', () => {
  const d = deriveTheme(recipe());
  assert.ok(!d.light.has('--typography-font-family-sans'));
  assert.ok(!d.light.has('--typography-font-family-mono'));
});

test('pins are applied last and survive regeneration', () => {
  const d = deriveTheme(
    recipe({
      pinned: { '--color-background-utility-info': '#228be6', '--radius-md': '3px' },
      pinnedDark: { '--color-background-utility-info': '#3b9eff' },
    }),
  );
  assert.equal(d.light.get('--color-background-utility-info'), '#228be6');
  assert.equal(d.light.get('--radius-md'), '3px');
  assert.equal(d.dark.get('--color-background-utility-info'), '#3b9eff');
  assert.equal(d.meta.pinnedCount, 3);
});

test('the seed is reachable as a literal through the emitted var chain', () => {
  const d = deriveTheme(recipe({ seeds: { brand: '#1769aa' } }));
  assert.equal(resolve(d.light, '--color-background-brand'), '#1769aa');
  assert.equal(d.light.get('--color-background-brand'), 'var(--testbrand-brand-9)');
  assert.equal(d.meta.brandScale, 'blue');
});

test('a custom scope renames the spoke tier without touching the semantics', () => {
  const d = deriveTheme(recipe({ slug: 'beacon-two', scope: 'bcn' }));
  assert.ok(d.light.has('--bcn-brand-9'));
  assert.ok(!d.light.has('--beacon-two-brand-9'));
  assert.equal(d.light.get('--color-background-brand'), 'var(--bcn-brand-9)');
});

// --- emission ----------------------------------------------------------------

test('the dark selector outranks the hub dark block', () => {
  // html[data-scheme='dark'] is (0,1,1). A plain [data-theme=x][data-scheme=dark] is
  // (0,2,0) and LOSES. The element selector is what makes it (0,2,1).
  const css = emitCss(deriveTheme(recipe({ slug: 'qanat' })));
  assert.match(css, /^\[data-theme="qanat"\] \{$/m);
  assert.match(css, /^html\[data-scheme="dark"\]\[data-theme="qanat"\] \{$/m);
});

test('every emitted value is a hex or a var chain — never oklch or color-mix', () => {
  // check-contrast.mjs's parseColor reads #rgb/#rrggbb/rgb()/white/black and nothing
  // else. An oklch() here makes those pairs unauditable, and that script's own history
  // records the cost: it once checked 0 pairs and exited 0 with "All text pairs pass AA".
  const d = deriveTheme(recipe());
  for (const scheme of ['light', 'dark']) {
    for (const [name, value] of d[scheme]) {
      if (name.startsWith('--radius') || name.startsWith('--typography')) continue;
      assert.match(
        value,
        /^(#[0-9a-f]{6}|var\(--[a-zA-Z0-9-_]+\))$/,
        `[${scheme}] ${name} = ${value}`,
      );
    }
  }
});

test('everything the generator OWNS resolves, whatever the brand seed', () => {
  // The only role allowed to end up unresolved is --color-background-brand, and only
  // because it is the client's exact hex and is deliberately not moved. Every fill the
  // generator picked for itself — brand-secondary, accent, ai, the four utilities — must
  // come out readable no matter how hostile the seed.
  const seeds = [
    '#1f7a6d', '#1769aa', '#ffe629', '#101418', '#c8f0e2', '#e5399f', '#3d5a75',
    '#767676', '#808080', '#ffffff', '#000000', '#7a5cff', '#00ff00', '#5c3d1f',
  ];
  for (const brand of seeds) {
    const d = deriveTheme(recipe({ seeds: { brand } }));
    const notOurs = d.warnings
      .filter((w) => w.level === 'fail' && w.role !== '--color-background-brand')
      .map((w) => `[${w.scheme}] ${w.role}: ${w.message}`);
    assert.deepEqual(notOurs, [], `brand ${brand} left a generator-owned fill unresolved`);
  }
});

test('a brand hex that cannot carry text is reported, never quietly moved', () => {
  // Hot magenta, luminance ~0.20. Neither the neutral's near-white (#fcfcfd) nor its
  // near-black (#1c2024) reaches 4.5:1 on it — best is 4.20:1. Pure #fff/#000 would
  // squeak past, which is precisely why they are NOT in the candidate list: a theme's
  // foreground comes from its own ramps, and papering over this with a stray #000 would
  // hide a real fact about the brand.
  const d = deriveTheme(recipe({ seeds: { brand: '#e5399f' } }));
  const failing = d.warnings.filter((w) => w.level === 'fail');
  assert.equal(failing.length, 1);
  assert.equal(failing[0].role, '--color-background-brand');
  assert.equal(failing[0].scheme, 'light');
  assert.match(failing[0].message, /not moved automatically/);
  // The fill is still the seed, untouched.
  assert.equal(resolve(d.light, '--color-background-brand'), '#e5399f');
  // …and the best available foreground is still emitted, so the theme is usable.
  assert.ok(d.light.get('--color-content-on-brand').startsWith('#'));
});

test('a fail warning that does happen is written into the file, not just returned', () => {
  // A warning nobody reads is not a warning. Driven from a synthetic derivation because
  // the real generator no longer produces one (see the test above) — the rendering still
  // has to work the day something changes and it does.
  const d = deriveTheme(recipe());
  d.warnings.push({
    level: 'fail',
    scheme: 'light',
    role: '--color-background-brand',
    message: 'synthetic — best is 3.10:1',
  });
  const css = emitCss(d);
  assert.match(css, /1 CONTRAST ISSUE\(S\) THE GENERATOR COULD NOT RESOLVE/);
  assert.match(css, /\[light\] --color-background-brand — synthetic — best is 3\.10:1/);
});

test('emitCss can be asked for one scheme', () => {
  const css = emitCss(deriveTheme(recipe()), { schemes: ['light'] });
  assert.match(css, /\[data-theme="testbrand"\]/);
  assert.doesNotMatch(css, /data-scheme/);
});

test('derivation is deterministic', () => {
  const a = emitCss(deriveTheme(recipe({ seeds: { brand: '#1769aa', neutral: 'warm' } })));
  const b = emitCss(deriveTheme(recipe({ seeds: { brand: '#1769aa', neutral: 'warm' } })));
  assert.equal(a, b);
});
