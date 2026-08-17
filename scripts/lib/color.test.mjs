import test from 'node:test';
import assert from 'node:assert/strict';

import {
  contrastHex,
  contrastRatio,
  hueDistance,
  luminance,
  oklchToHex,
  parseHex,
  srgbToOklch,
  toHex,
} from './color.mjs';

test('parseHex reads the three forms check-contrast accepts', () => {
  assert.deepEqual(parseHex('#abc'), [0xaa, 0xbb, 0xcc]);
  assert.deepEqual(parseHex('#aabbcc'), [0xaa, 0xbb, 0xcc]);
  assert.deepEqual(parseHex('#AABBCC'), [0xaa, 0xbb, 0xcc]);
  // An 8-digit hex keeps its RGB; alpha is somebody else's problem (check-contrast
  // treats alpha as unresolvable, and this function is not where that call is made).
  assert.deepEqual(parseHex('#aabbccff'), [0xaa, 0xbb, 0xcc]);
  assert.equal(parseHex('rgb(1,2,3)'), null);
  assert.equal(parseHex('teal'), null);
  assert.equal(parseHex(''), null);
});

test('toHex is lowercase, six digits, and clamps', () => {
  assert.equal(toHex([0, 0, 0]), '#000000');
  assert.equal(toHex([255, 255, 255]), '#ffffff');
  assert.equal(toHex([-20, 300, 127.6]), '#00ff80');
});

test('sRGB → OKLCH → sRGB round-trips inside a quantisation step', () => {
  const samples = [
    '#000000', '#ffffff', '#808080', '#1f7a6d', '#1769aa',
    '#e5484d', '#ffc53d', '#bdee63', '#0090ff', '#a18072',
  ];
  for (const hex of samples) {
    const back = oklchToHex(srgbToOklch(parseHex(hex)));
    const [a, b] = [parseHex(hex), parseHex(back)];
    for (let i = 0; i < 3; i++) {
      assert.ok(
        Math.abs(a[i] - b[i]) <= 1,
        `${hex} round-tripped to ${back} — channel ${i} moved by ${Math.abs(a[i] - b[i])}`,
      );
    }
  }
});

test('a neutral gets hue 0 rather than an unstable one', () => {
  // Two greys must not compare as 180° apart when picking a reference ramp.
  assert.equal(srgbToOklch([128, 128, 128]).h, 0);
  assert.equal(srgbToOklch([0, 0, 0]).h, 0);
  assert.ok(srgbToOklch([128, 128, 128]).c < 1e-4);
});

test('out-of-gamut colours give up CHROMA, not hue', () => {
  // A wildly over-saturated blue. Per-channel clipping would walk it toward cyan;
  // reducing chroma must hold the hue within a degree or so.
  const wanted = { l: 0.5, c: 0.4, h: 264 };
  const got = srgbToOklch(parseHex(oklchToHex(wanted)));
  assert.ok(got.c < wanted.c, `expected chroma to be reduced, got ${got.c}`);
  assert.ok(
    hueDistance(got.h, wanted.h) < 2,
    `hue drifted from ${wanted.h} to ${got.h} — that is the failure this guards`,
  );
  assert.ok(Math.abs(got.l - wanted.l) < 0.02, `lightness drifted to ${got.l}`);
});

test('hueDistance wraps the short way round', () => {
  assert.equal(hueDistance(10, 350), 20);
  assert.equal(hueDistance(350, 10), 20);
  assert.equal(hueDistance(0, 180), 180);
  assert.equal(hueDistance(90, 90), 0);
});

test('WCAG luminance and ratio match the known anchors', () => {
  assert.equal(luminance([255, 255, 255]), 1);
  assert.equal(luminance([0, 0, 0]), 0);
  assert.equal(contrastRatio([255, 255, 255], [0, 0, 0]), 21);
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]), 21, 'ratio is order-independent');
  assert.equal(contrastRatio([120, 120, 120], [120, 120, 120]), 1);
});

test('contrastHex reproduces check-contrast.mjs numbers to 2dp', () => {
  // Straight off a VERBOSE=1 `npm run contrast` run against the hub defaults. If this
  // drifts, the page's live grading has stopped agreeing with the gate.
  assert.equal(contrastHex('#ffffff', '#000000').toFixed(2), '21.00');
  // --color-content-on-utility-success (lime-12) on --color-background-utility-success
  // (lime-9): reported as 8.14:1.
  assert.equal(contrastHex('#37401c', '#bdee63').toFixed(2), '8.14');
  // --color-content-on-utility-warning (yellow-12) on yellow-9: reported as 7.21:1.
  assert.equal(contrastHex('#4f3422', '#ffc53d').toFixed(2), '7.21');
});

test('contrastHex refuses a non-hex rather than guessing', () => {
  assert.throws(() => contrastHex('rebeccapurple', '#ffffff'), /not a hex colour/);
});
