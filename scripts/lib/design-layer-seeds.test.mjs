// The design layer's page levers move what the theme recipe would: their
// corner and neutral tables are held to the recipe's own, so a lever never
// previews a theme the generator cannot write.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORNERS as RECIPE_CORNERS } from './theme-recipe.mjs';
import { NEUTRAL_SCALES } from './ramp.mjs';
import { CORNERS, NEUTRAL_SEED, DENSITY, TYPE_SCALE } from '../../packages/design-layer/src/recipe-seeds.mjs';

test('the Corners lever is the recipe\'s corners table', () => {
  assert.deepEqual(CORNERS, RECIPE_CORNERS);
});

test('the Neutral lever names every neutral the recipe accepts, by its seed word', () => {
  const fromRecipe = Object.fromEntries(Object.entries(NEUTRAL_SCALES).map(([seed, scale]) => [scale, seed]));
  assert.deepEqual(NEUTRAL_SEED, fromRecipe);
});

test('Density and Type Scale have a Default rung at 1, so the lever starts on the theme as it is', () => {
  for (const rungs of [DENSITY, TYPE_SCALE]) assert.ok(rungs.some((r) => r.value === '1' && r.name === 'Default'));
});
