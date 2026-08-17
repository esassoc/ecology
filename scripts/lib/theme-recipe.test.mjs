import test from 'node:test';
import assert from 'node:assert/strict';

import { contrastHex, parseHex, srgbToOklch } from './color.mjs';
import { CORNERS, deriveTheme, emitCss, resolveFocusRing, validateRecipe } from './theme-recipe.mjs';

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

// --- the focus ring ----------------------------------------------------------
//
// THIS BLOCK REPLACES A TEST THAT ASSERTED THE OPPOSITE. It read "the focus ring is left
// on its tier-2 derivation … a ring wants the FILL step, so there is nothing to improve
// by emitting it and everything to break". The fill step is exactly what a ring cannot
// always have: step 9 is engineered for 3:1 as a SOLID FILL, and the ring needs 3:1 as a
// HAIRLINE against the same surfaces. The hub's own grass step 9 came to 2.66:1 on the
// sunken surface — a Level AA failure that shipped for months. See resolveFocusRing.

/** Every surface the ring can sit on, in one scheme, as literal hexes. */
const focusSurfaces = (m) =>
  [
    '--color-background-default',
    '--color-background-elevation-raised',
    '--color-background-elevation-floating',
    '--color-background-elevation-sunken',
  ].map((n) => resolve(m, n));

test('the focus ring is emitted for every theme, in both schemes', () => {
  // Unconditional, even when the walk picks step 9 and the value is what the tier-2
  // derivation would have produced anyway. That is the point: the hub's :root now names a
  // ramp step, so an omission here would let a spoke inherit the hub's HUE — the cb-fish
  // navy-brand-with-green-rings bug, which the old derivation is what prevented.
  for (const brand of ['#1f7a6d', '#1769aa', '#46a758', '#7a3b9c', '#ffdd00']) {
    const d = deriveTheme(recipe({ seeds: { brand } }));
    for (const scheme of ['light', 'dark']) {
      assert.ok(
        d[scheme].has('--color-border-default-focus'),
        `[${scheme}] ${brand}: the ring must be emitted even when it does not move`,
      );
    }
  }
});

test('the focus ring clears 3:1 on every surface, for any brand', () => {
  // The whole guarantee, stated once. Includes brands that cannot carry a ring at step 9
  // at all (bright yellow measured 1.18:1, pale pink 1.59:1) — those are the cases the
  // walk exists for, and they must come out the other side conforming.
  for (const brand of ['#1f7a6d', '#1769aa', '#46a758', '#7a3b9c', '#ffdd00', '#a3e635', '#f9a8d4', '#101418']) {
    const d = deriveTheme(recipe({ seeds: { brand } }));
    for (const scheme of ['light', 'dark']) {
      const ring = resolve(d[scheme], '--color-border-default-focus');
      for (const surface of focusSurfaces(d[scheme])) {
        assert.ok(
          contrastHex(ring, surface) >= 3,
          `[${scheme}] ${brand}: ring ${ring} is ${contrastHex(ring, surface).toFixed(2)}:1 on ${surface}`,
        );
      }
    }
  }
});

test('a brand that can carry the ring keeps step 9 untouched', () => {
  // THE PROMISE TO A BRAND OWNER, and the reason this is a ramp walk rather than a clamp
  // or a second band: a brand that already works is not touched at all. Both real spokes
  // are in here (beacon 4.54:1, qanat 5.07:1 at step 9), so a regression that starts
  // shifting conforming brands fails here rather than in a spoke's design review.
  for (const [brand, label] of [['#1f7a6d', 'beacon'], ['#1769aa', 'qanat'], ['#43608a', 'spoke-template']]) {
    const d = deriveTheme(recipe({ seeds: { brand } }));
    for (const scheme of ['light', 'dark']) {
      assert.equal(
        d[scheme].get('--color-border-default-focus'),
        'var(--testbrand-brand-9)',
        `[${scheme}] ${label} already clears 3:1 and must not be moved`,
      );
      assert.ok(
        !d.warnings.some((w) => w.role === '--color-border-default-focus' && w.scheme === scheme),
        `[${scheme}] ${label} must not warn about a ring it did not move`,
      );
    }
  }
});

test('a brand that cannot carry the ring walks its own ramp, and says so', () => {
  // The hub's own case. grass step 9 is 2.66:1 on the sunken surface; step 10 is 3.07.
  // Asserting the STEP, not just the ratio, because "still recognisably the brand" is the
  // property being bought and one step along the brand's own curve is what buys it.
  const d = deriveTheme(recipe({ seeds: { brand: '#46a758' } }));
  assert.equal(d.light.get('--color-border-default-focus'), 'var(--testbrand-brand-10)');
  const moved = d.warnings.find(
    (w) => w.role === '--color-border-default-focus' && w.scheme === 'light',
  );
  assert.ok(moved, 'moving the ring must be reported, not silent');
  assert.equal(moved.level, 'info', 'a ring still on the brand ramp is info, not fail');
  assert.match(moved.message, /step 9 to step 10/);

  // Dark is untouched for the same brand — a dark ramp puts step 9 against a near-black
  // page, where it measures 5.24:1. The walk is per scheme, not per theme.
  assert.equal(d.dark.get('--color-border-default-focus'), 'var(--testbrand-brand-9)');
});

test('no rampFrom ramp ever needs the neutral fallback — the ring is ALWAYS the brand', () => {
  // The guarantee is stronger than "accessible", and this is what makes it so. Swept the
  // RGB cube in both schemes: every seed has a brand step clearing 3:1, because step 12 of
  // a light ramp is dark and step 12 of a dark ramp is light, so the far end of the curve
  // is always usable. Recorded here rather than in a comment because it is the claim the
  // design rests on — if rampFrom's curve ever changes, this is what says so.
  let worstBest = Infinity;
  for (let r = 0; r < 256; r += 85) {
    for (let g = 0; g < 256; g += 85) {
      for (let b = 0; b < 256; b += 85) {
        const brand = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
        const d = deriveTheme(recipe({ seeds: { brand } }));
        for (const scheme of ['light', 'dark']) {
          const raw = d[scheme].get('--color-border-default-focus');
          assert.match(
            raw,
            /^var\(--testbrand-brand-(9|10|11|12)\)$/,
            `[${scheme}] ${brand}: fell off the brand ramp to ${raw}`,
          );
          const ring = resolve(d[scheme], '--color-border-default-focus');
          worstBest = Math.min(
            worstBest,
            ...focusSurfaces(d[scheme]).map((s) => contrastHex(ring, s)),
          );
        }
      }
    }
  }
  assert.ok(worstBest >= 3, `worst ring contrast across the cube was ${worstBest.toFixed(2)}:1`);
});

test('the neutral fallback, when a ramp genuinely has no usable step', () => {
  // Unreachable through deriveTheme (see above), so it is called directly — the only
  // honest way to cover a branch that exists as a floor. A ramp of twelve near-whites has
  // no step that can be seen against a near-white surface.
  //
  // The `fail` level is the load-bearing part: it is the ONLY thing that would tell a
  // spoke its focus ring had stopped being brand-coloured.
  const allWhite = Array.from({ length: 12 }, () => '#fdfdfd');
  const neutral = Array.from({ length: 12 }, (_, i) => (i === 11 ? '#202020' : '#f4f4f4'));
  const out = resolveFocusRing({ ramp: allWhite, neutral, surfaces: ['#fcfcfc', '#f0f0f0'] });
  assert.equal(out.fellBack, true, 'a ramp with no usable step must fall back');
  assert.equal(out.step, null, 'the fallback is not a brand step');
  assert.equal(out.hex, '#202020', 'the fallback is the neutral step 12');
  assert.ok(out.ratio >= 3, 'and the fallback itself must clear 3:1');

  // …and a ramp with a usable step never reaches it, so the floor cannot fire by accident.
  const usable = [...Array(8).fill('#fdfdfd'), '#fdfdfd', '#fdfdfd', '#2a7e3b', '#203c25'];
  const ok = resolveFocusRing({ ramp: usable, neutral, surfaces: ['#fcfcfc', '#f0f0f0'] });
  assert.equal(ok.fellBack, false);
  assert.equal(ok.step, 11, 'the FIRST clearing step wins, not the best one');
});

test('the ring is graded against the theme\'s own surfaces, not the hub\'s', () => {
  // A spoke re-points its neutral ramp too. Measuring the ring against the hub's greys
  // is this tool's recorded headline bug in another costume (see resolveFillAndForeground
  // on pinnedFill), so the same brand on two different neutrals must be free to land on
  // different steps rather than being graded once against a fixed ground.
  const seen = new Set();
  for (const neutral of ['pure', 'cool', 'warm', 'mauve', 'sage', 'olive']) {
    const d = deriveTheme(recipe({ seeds: { brand: '#46a758', neutral } }));
    seen.add(d.light.get('--color-border-default-focus'));
    for (const surface of focusSurfaces(d.light)) {
      assert.ok(
        contrastHex(resolve(d.light, '--color-border-default-focus'), surface) >= 3,
        `neutral ${neutral}: the ring must clear 3:1 on this theme's own ${surface}`,
      );
    }
  }
  // Not an assertion about WHICH step each neutral picks — that would pin the ramp curve.
  // Only that the grading is live: something was resolved for every neutral.
  assert.ok(seen.size >= 1);
});

test('links are re-pointed to the text step, and clear AA on the page', () => {
  // The tier-2 default sends --color-content-link at the step-9 SOLID FILL. color.json
  // calls that inherited rather than chosen and flags it as "a candidate to re-point";
  // a fill step is engineered for 3:1, so link text fails AA for most brands. Measured
  // on a generated purple spoke before this changed: 3.42:1 in dark, a `fail` row.
  for (const brand of ['#7a3b9c', '#1f7a6d', '#1769aa', '#b3261e', '#101418']) {
    const d = deriveTheme(recipe({ seeds: { brand } }));
    for (const scheme of ['light', 'dark']) {
      assert.ok(d[scheme].has('--color-content-link'), `[${scheme}] link not emitted`);
      // Still follows the brand — it just uses the brand ramp's TEXT step.
      assert.match(d[scheme].get('--color-content-link'), /^var\(--testbrand-brand-\d+\)$/);
      for (const surface of [
        '--color-background-elevation-raised',
        '--color-background-default',
      ]) {
        const r = contrastHex(
          resolve(d[scheme], '--color-content-link'),
          resolve(d[scheme], surface),
        );
        assert.ok(r >= 4.5, `${brand} [${scheme}] link on ${surface}: ${r.toFixed(2)}:1`);
      }
    }
  }
});

test('a pinned FILL drives its own foreground', () => {
  // The escape hatch must not reintroduce the bug the tool exists to fix. A pin wins in
  // the emitted CSS, so a foreground measured against the DERIVED fill is measured
  // against a colour that does not ship. Measured: pinning utility-info to #228be6 used
  // to pick a foreground against a different blue, and passed by luck.
  const pinned = '#228be6';
  const d = deriveTheme(recipe({ pinned: { '--color-background-utility-info': pinned } }));
  assert.equal(resolve(d.light, '--color-background-utility-info'), pinned);
  const r = contrastHex(resolve(d.light, '--color-content-on-utility-info'), pinned);
  assert.ok(r >= 4.5, `foreground on the pinned fill is ${r.toFixed(2)}:1`);

  // And a pin that is not a literal hex is reported rather than silently mismeasured.
  const chained = deriveTheme(
    recipe({ pinned: { '--color-background-utility-info': 'var(--something-else)' } }),
  );
  assert.ok(
    chained.warnings.some(
      (w) => w.role === '--color-background-utility-info' && /not a literal hex/.test(w.message),
    ),
  );
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
