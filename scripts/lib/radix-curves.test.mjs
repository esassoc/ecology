import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import curves from './radix-curves.json' with { type: 'json' };
import { NEUTRAL_SCALES, NEUTRAL_TEMPERATURES } from './ramp.mjs';

const HUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('the checked-in curves match the installed @radix-ui/colors', () => {
  // radix-curves.json is generated but committed, for the same reason token-names.json
  // is: a value the output depends on should be reviewable in a diff rather than
  // re-derived silently on each run. This is what stops it going quietly stale after a
  // dependency bump — a moved curve changes every theme generated from a recipe.
  try {
    execFileSync('node', [path.join(HUB, 'scripts/gen-radix-curves.mjs'), '--check'], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (e) {
    assert.fail(`${e.stderr || e.stdout || e.message}`);
  }
});

test('every scale carries 12 steps in both schemes', () => {
  const scales = Object.keys(curves.curves.light);
  assert.ok(scales.length >= 25, `expected the full Radix set, got ${scales.length}`);
  for (const scheme of ['light', 'dark']) {
    for (const scale of scales) {
      const c = curves.curves[scheme][scale];
      assert.equal(c.length, 12, `${scheme}/${scale}`);
      for (const s of c) {
        assert.ok(s.l >= 0 && s.l <= 1, `${scheme}/${scale} lightness out of range: ${s.l}`);
        assert.ok(s.c >= 0, `${scheme}/${scale} negative chroma`);
        assert.ok(s.h >= 0 && s.h < 360, `${scheme}/${scale} hue out of range: ${s.h}`);
      }
    }
  }
});

test('the six named neutral temperatures are the documented Radix scales', () => {
  // These are what the recipe's `seeds.neutral` words resolve to. There are SIX, not the
  // three this test and the theme maker both used to name — mauve, sage and olive shipped
  // curves and primitives while nothing asserted they were reachable.
  assert.deepEqual(curves.neutrals, {
    pure: 'gray',
    cool: 'slate',
    warm: 'sand',
    mauve: 'mauve',
    sage: 'sage',
    olive: 'olive',
  });
  assert.deepEqual(NEUTRAL_SCALES, curves.neutrals, 'the export must BE the table, not a copy');
  assert.deepEqual(NEUTRAL_TEMPERATURES, Object.keys(curves.neutrals));
  for (const scale of Object.values(curves.neutrals)) {
    for (const scheme of ['light', 'dark']) {
      assert.ok(curves.curves[scheme][scale], `neutral ${scale} has no ${scheme} curve`);
    }
    assert.ok(!curves.chromatic.includes(scale), `${scale} must not be offered as a brand curve`);
  }
});

test('the hexes are deliberately absent', () => {
  // If these ever appear, the file has stopped being "the shape of a Radix ramp" and
  // started being a copy of Radix — which is what the dependency is for.
  assert.doesNotMatch(JSON.stringify(curves), /#[0-9a-f]{6}/i);
});
