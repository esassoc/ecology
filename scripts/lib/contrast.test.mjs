import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PAIRS,
  auditPairs,
  parseBlocks,
  parseColor,
  parseDeclarations,
  resolve,
  stripAtRules,
} from './contrast.mjs';

const mapOf = (css, opts) => {
  const m = new Map();
  parseDeclarations(css, m, opts);
  return m;
};

// --- @media stripping --------------------------------------------------------

test('every @media block is dropped before parsing', () => {
  // dist/tokens.css ends with an @media (color-gamut: p3) block that redeclares every
  // primitive as color(display-p3 …). Read last-wins, that made the audit check 0 pairs
  // and still exit 0 with "All text pairs pass AA".
  const css = `
    :root { --a: #ffffff; }
    @media (color-gamut: p3) { :root { --a: color(display-p3 1 1 1); } }
  `;
  assert.equal(mapOf(css).get('--a'), '#ffffff');
});

test('an @media mentioned inside a COMMENT does not eat the file', () => {
  // build.js emits each token's DTCG $description as a comment, and --duration-0
  // documents the @media (prefers-reduced-motion: reduce) block it exists for. The
  // brace-matcher went hunting for a brace belonging to unrelated CSS and swallowed
  // most of :root, dropping the audit to 0/29. Comments are stripped first.
  const css = `
    :root {
      /* set to 0 inside @media (prefers-reduced-motion: reduce) { } */
      --duration-0: 0ms;
      --kept: #123456;
    }
  `;
  assert.equal(mapOf(css).get('--kept'), '#123456');
  assert.doesNotMatch(stripAtRules(css), /prefers-reduced-motion/);
});

test('parseBlocks returns selector/body pairs', () => {
  const blocks = parseBlocks(':root { --a: 1; } [data-theme="x"] { --b: 2; }');
  assert.deepEqual(blocks.map(([s]) => s), [':root', '[data-theme="x"]']);
});

// --- scope: assurance --------------------------------------------------------

test('an assurance block is read only when the caller names that profile', () => {
  // Composing it unasked is how `--hub` once went from 7 failures to "All text pairs
  // pass AA" with no code change and no warning.
  const css = `
    :root { --x: #111111; }
    [data-assurance="wcag-aa"] { --x: #000000; }
  `;
  assert.equal(mapOf(css).get('--x'), '#111111');
  assert.equal(mapOf(css, { assurance: 'wcag-aa' }).get('--x'), '#000000');
  assert.equal(mapOf(css, { assurance: 'other' }).get('--x'), '#111111');
});

// --- scope: scheme -----------------------------------------------------------

test('a dark block is skipped unless dark is the scheme being audited', () => {
  // A generated theme file holds BOTH blocks. Swept flat, the dark one comes last and
  // wins, and the audit grades dark values under a header that says nothing about it.
  const css = `
    [data-theme="x"] { --c: #ffffff; }
    html[data-scheme="dark"][data-theme="x"] { --c: #000000; }
  `;
  assert.equal(mapOf(css).get('--c'), '#ffffff', 'default run must not see the dark block');
  assert.equal(mapOf(css, { scheme: 'dark' }).get('--c'), '#000000');
});

test('the un-scoped block is the base in every scheme', () => {
  // This is what lets a dark run resolve roles the dark block does not re-point.
  const css = `
    [data-theme="x"] { --only-light-sets-this: #abcdef; --c: #ffffff; }
    html[data-scheme="dark"][data-theme="x"] { --c: #000000; }
  `;
  const dark = mapOf(css, { scheme: 'dark' });
  assert.equal(dark.get('--only-light-sets-this'), '#abcdef');
  assert.equal(dark.get('--c'), '#000000');
});

test("the hub's single-quoted dark selector is matched too", () => {
  // docs-dark.css writes html[data-scheme='dark']; generated themes write "dark".
  const css = `html[data-scheme='dark'] { --c: #000000; }`;
  assert.equal(mapOf(css).get('--c'), undefined);
  assert.equal(mapOf(css, { scheme: 'dark' }).get('--c'), '#000000');
});

test('scheme and assurance scoping compose', () => {
  const css = `
    :root { --c: #ffffff; }
    [data-assurance="wcag-aa"] { --c: #eeeeee; }
    html[data-scheme="dark"] { --c: #000000; }
  `;
  assert.equal(mapOf(css, { scheme: 'dark', assurance: 'wcag-aa' }).get('--c'), '#000000');
  assert.equal(mapOf(css, { scheme: 'light', assurance: 'wcag-aa' }).get('--c'), '#eeeeee');
});

// --- resolve / parseColor ----------------------------------------------------

test('resolve walks a var chain to a literal', () => {
  const m = mapOf(':root { --a: var(--b); --b: var(--c); --c: #1f7a6d; }');
  assert.deepEqual(resolve('--a', m), [0x1f, 0x7a, 0x6d]);
});

test('resolve falls back to a var() default when the name is undefined', () => {
  const m = mapOf(':root { --a: var(--missing, #ffffff); }');
  assert.deepEqual(resolve('--a', m), [255, 255, 255]);
});

test('resolve gives up rather than looping forever', () => {
  const m = mapOf(':root { --a: var(--b); --b: var(--a); }');
  assert.equal(resolve('--a', m), null);
});

test('parseColor returns sentinels, never a silent pass', () => {
  assert.deepEqual(parseColor('#abc'), [0xaa, 0xbb, 0xcc]);
  assert.deepEqual(parseColor('#1f7a6d'), [0x1f, 0x7a, 0x6d]);
  assert.deepEqual(parseColor('#1f7a6dff'), [0x1f, 0x7a, 0x6d], 'fully opaque 8-digit is readable');
  assert.equal(parseColor('#1f7a6d80'), 'alpha');
  assert.deepEqual(parseColor('rgb(1, 2, 3)'), [1, 2, 3]);
  assert.equal(parseColor('rgba(1, 2, 3, 0.5)'), 'alpha');
  assert.deepEqual(parseColor('white'), [255, 255, 255]);
  assert.deepEqual(parseColor('black'), [0, 0, 0]);
  assert.equal(parseColor('oklch(0.6 0.1 200)'), 'unparseable');
  assert.equal(parseColor('color-mix(in srgb, red, blue)'), 'unparseable');
  assert.equal(parseColor('linear-gradient(red, blue)'), 'unparseable');
  assert.equal(parseColor('transparent'), 'unparseable');
  // null is reserved for a var() nested inside a function — too clever to unpick,
  // and distinct from a form this simply does not read.
  assert.equal(parseColor('color-mix(in srgb, var(--a), blue)'), null);
});

// --- auditPairs --------------------------------------------------------------

test('auditPairs separates gradeable rows from manual ones', () => {
  const m = new Map([
    ['--fg', '#000000'],
    ['--bg', '#ffffff'],
    ['--murky', 'color-mix(in srgb, red, blue)'],
  ]);
  const r = auditPairs(m, {
    pairs: [
      ['--fg', '--bg', 4.5, 'fail'],
      ['--fg', '--murky', 4.5, 'fail'],
      ['--fg', '--nope', 4.5, 'fail'],
    ],
  });
  assert.equal(r.checked, 1);
  assert.equal(r.rows[0].ratio, 21);
  assert.equal(r.rows[0].ok, true);
  assert.equal(r.failures, 0);
  assert.deepEqual(r.manual.map((x) => x.why), ['unparseable value', 'undefined token']);
});

test('an audit that resolved almost nothing reports as BROKEN, not clean', () => {
  // 0 pairs checked, exit 0, "All text pairs pass AA" is the state that hid every
  // failure in the list until @media stripping was added.
  const r = auditPairs(new Map());
  assert.equal(r.checked, 0);
  assert.equal(r.failures, 0);
  assert.equal(r.underResolved, true, 'zero coverage must never look like a pass');
});

test('the pair table still covers all eight content-on-* foregrounds', () => {
  // These are the rows the spoke template declares none of, and the reason the
  // generator picks them. If one is dropped here, that guarantee stops being checked.
  const covered = new Set(PAIRS.map(([fg]) => fg));
  for (const name of [
    '--color-content-on-brand',
    '--color-content-on-brand-secondary',
    '--color-content-on-accent',
    '--color-content-on-ai',
    '--color-content-on-utility-info',
    '--color-content-on-utility-success',
    '--color-content-on-utility-warning',
    '--color-content-on-utility-danger',
  ]) {
    assert.ok(covered.has(name), `${name} is no longer in PAIRS`);
  }
  assert.equal(PAIRS.length, 29);
});
