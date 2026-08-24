import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { shippedNames, accountedFor, undeclaredRemovals } from '../snapshot-tokens.mjs';

const BASELINE = new URL('../../packages/tokens/token-names.json', import.meta.url);

/* The unit half — the rule, independent of the repo's current state. */

test('a name that vanished with no migrations row is drift', () => {
  const gone = undeclaredRemovals(['--kept', '--vanished'], new Set(['--kept']), new Set());
  assert.deepEqual(gone, ['--vanished']);
});

test('a vanished name IS allowed when a migrations row accounts for it', () => {
  // The deliberate case: `removed: true` emits no alias, so the name really is
  // gone from the CSS — but the row is the declaration that makes it intentional.
  const gone = undeclaredRemovals(['--gone'], new Set(), new Set(['--gone']));
  assert.deepEqual(gone, []);
});

test('added names are never drift', () => {
  // A spoke cannot be broken by a token it has never heard of, so growth is free.
  const gone = undeclaredRemovals(['--a'], new Set(['--a', '--brand-new']), new Set());
  assert.deepEqual(gone, []);
});

/* The integration half — this repo, right now. */

test('no shipped token name has disappeared without a migrations.json row', () => {
  if (!existsSync(BASELINE)) return;            // baseline not created yet
  const shipped = shippedNames();
  if (!shipped.size) return;                    // tokens not built in this environment
  const { names } = JSON.parse(readFileSync(BASELINE, 'utf8'));
  assert.deepEqual(
    undeclaredRemovals(names, shipped, accountedFor()),
    [],
    'Add the row to packages/tokens/migrations.json, then `npm run tokens:snapshot`.',
  );
});

test('the baseline is not stale in the other direction either', () => {
  // Not a failure, but worth asserting the file is real: a baseline of zero names
  // would make the guard above pass unconditionally and nobody would notice.
  if (!existsSync(BASELINE)) return;
  const { names, count } = JSON.parse(readFileSync(BASELINE, 'utf8'));
  assert.ok(names.length > 500, 'baseline looks truncated');
  assert.equal(names.length, count);
});
