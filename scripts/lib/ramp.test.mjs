import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHex, srgbToOklch } from './color.mjs';
import {
  CHROMATIC_SCALES,
  NEUTRAL_TEMPERATURES,
  nearestChromaticScale,
  neutralRamp,
  rampFrom,
  step,
} from './ramp.mjs';

const HEX = /^#[0-9a-f]{6}$/;

test('the seed lands EXACTLY on step 9, byte for byte', () => {
  // This is the promise the whole tool rests on: the hex a client pointed at is the
  // hex that ships. A round-trip through OKLCH is allowed to move it by a bit, so the
  // seed is copied through rather than recomputed.
  for (const seed of ['#1f7a6d', '#1769aa', '#e5484d', '#bdee63', '#000000', '#ffffff']) {
    assert.equal(step(rampFrom(seed), 9), seed, `seed ${seed} did not survive to step 9`);
  }
  assert.equal(step(rampFrom('#1F7A6D'), 9), '#1f7a6d', 'case is normalised');
  assert.equal(step(rampFrom('#abc'), 9), '#aabbcc', 'short hex is expanded');
});

test('a ramp is 12 well-formed hexes', () => {
  const r = rampFrom('#1769aa');
  assert.equal(r.length, 12);
  for (const hex of r) assert.match(hex, HEX);
});

test('lightness runs dark-ward within each half of the ramp', () => {
  // Checked as 1-8 and 9-12, NOT 1-12, because the 8→9 boundary legitimately inverts
  // on Radix's five bright scales — see the next test.
  const monotone = (ls, from, to, seed) => {
    for (let i = from + 1; i <= to; i++) {
      assert.ok(
        ls[i - 1] <= ls[i - 2] + 1e-3,
        `${seed}: step ${i} (${ls[i - 1].toFixed(3)}) is lighter than step ${i - 1} (${ls[i - 2].toFixed(3)})`,
      );
    }
  };
  for (const seed of ['#1f7a6d', '#1769aa', '#ffc53d', '#3a0f5c', '#bdee63']) {
    const ls = rampFrom(seed).map((h) => srgbToOklch(parseHex(h)).l);
    monotone(ls, 1, 8, seed);
    monotone(ls, 9, 12, seed);
  }
});

test('a bright seed keeps the bright-scale inversion at step 9', () => {
  // Radix's yellow, amber, lime, mint and sky put a LIGHTER value at step 9 than at
  // step 8 — that is what makes them "bright scales" and why their step-9 fills need
  // dark foregrounds. Flattening that here would quietly turn a client's highlighter
  // yellow into a mustard, so the curve is inherited as-is and the foreground picker
  // in theme-recipe.mjs deals with the consequence.
  const l = (hex) => srgbToOklch(parseHex(hex)).l;
  const yellow = rampFrom('#ffc53d');
  assert.ok(
    l(step(yellow, 9)) > l(step(yellow, 8)),
    'a bright seed lost its step-9 lift',
  );
  // A non-bright seed must NOT gain one.
  const teal = rampFrom('#1f7a6d');
  assert.ok(l(step(teal, 9)) < l(step(teal, 8)));
});

test('the endpoints stay put when the seed is unusually light or dark', () => {
  // Piecewise remapping exists so a dark brand does not drag step 1 grey — steps 1-2
  // are the page and the subtle wash, where the brand is not supposed to be visible.
  const veryDark = rampFrom('#0a1f1c');
  assert.ok(
    srgbToOklch(parseHex(step(veryDark, 1))).l > 0.97,
    `step 1 went to ${step(veryDark, 1)} — the near-white end must hold`,
  );
  const veryLight = rampFrom('#dff5f0');
  assert.ok(
    srgbToOklch(parseHex(step(veryLight, 12))).l < 0.45,
    `step 12 went to ${step(veryLight, 12)} — the near-black end must hold`,
  );
});

test('a muted seed yields a muted ramp', () => {
  const vivid = rampFrom('#12a594');
  const muted = rampFrom('#5c7f79');
  const chromaAt = (r, n) => srgbToOklch(parseHex(step(r, n))).c;
  for (const n of [3, 6, 11]) {
    assert.ok(
      chromaAt(muted, n) < chromaAt(vivid, n),
      `step ${n}: muted chroma ${chromaAt(muted, n)} should sit below vivid ${chromaAt(vivid, n)}`,
    );
  }
});

test('the dark ramp is deliberately NOT anchored on the seed', () => {
  // Pinning a light-scheme brand hex into a Radix dark ramp gives a fill that glares
  // against a near-black page. Dark takes the reference lightness and wears the brand's
  // hue and chroma instead. If someone "fixes" this, this test is the explanation.
  const seed = '#1f7a6d';
  assert.notEqual(step(rampFrom(seed, { scheme: 'dark' }), 9), seed);
  const light = srgbToOklch(parseHex(seed));
  const dark = srgbToOklch(parseHex(step(rampFrom(seed, { scheme: 'dark' }), 9)));
  assert.ok(Math.abs(light.h - dark.h) < 12, 'the dark fill keeps the brand hue');
  assert.ok(dark.l > light.l, 'a dark-scheme fill sits lighter than its light-scheme twin');
});

test('nearestChromaticScale matches on hue and never returns a neutral', () => {
  assert.equal(nearestChromaticScale('#1f7a6d'), 'teal');
  assert.equal(nearestChromaticScale('#1769aa'), 'blue');
  assert.equal(nearestChromaticScale('#e5484d'), 'red');
  // A desaturated navy must still get blue's SHAPE, not a grey's — matching on chroma
  // too would flatten the brand across all twelve steps.
  assert.equal(nearestChromaticScale('#3d5a75'), 'blue');
  for (const seed of ['#1f7a6d', '#3d5a75', '#8b8d98']) {
    assert.ok(CHROMATIC_SCALES.includes(nearestChromaticScale(seed)));
  }
});

test('neutralRamp reproduces the Radix scale it names', () => {
  assert.deepEqual(NEUTRAL_TEMPERATURES.slice(0, 3), ['pure', 'cool', 'warm']);
  for (const temp of NEUTRAL_TEMPERATURES) {
    for (const scheme of ['light', 'dark']) {
      const r = neutralRamp(temp, scheme);
      assert.equal(r.length, 12);
      for (const hex of r) assert.match(hex, HEX);
    }
  }
  // Radix slate1 / sand1, straight from the package.
  assert.equal(step(neutralRamp('cool'), 1), '#fcfcfd');
  assert.equal(step(neutralRamp('warm'), 1), '#fdfdfc');
  // Dark ramps invert: step 1 is the near-black page, step 12 the near-white text.
  assert.ok(srgbToOklch(parseHex(step(neutralRamp('pure', 'dark'), 1))).l < 0.2);
  assert.ok(srgbToOklch(parseHex(step(neutralRamp('pure', 'dark'), 12))).l > 0.9);
});

test('bad input is refused, not guessed at', () => {
  assert.throws(() => rampFrom('not a colour'), /not a hex colour/);
  assert.throws(() => neutralRamp('lukewarm'), /unknown neutral temperature/);
  assert.throws(() => step(rampFrom('#1769aa'), 0), /out of range/);
  assert.throws(() => step(rampFrom('#1769aa'), 13), /out of range/);
});
