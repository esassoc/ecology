import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenPattern, classPattern, applyRenames, findCollapseCollisions, renameProp, importedAs } from './token-rename.mjs';

const rename = (src, from, to) => src.replace(tokenPattern(from), to);

test('rewrites a token inside var()', () => {
  assert.equal(
    rename('color: var(--color-primary, #46a758);', '--color-primary', '--color-background-brand'),
    'color: var(--color-background-brand, #46a758);',
  );
});

test('rewrites a token declaration', () => {
  assert.equal(
    rename('  --color-primary: #46a758;', '--color-primary', '--color-background-brand'),
    '  --color-background-brand: #46a758;',
  );
});

test('leaves a BEM modifier class alone', () => {
  // The regression this file exists for. `.esa-button--color-primary` ends in the
  // exact token name; rewriting it desynchronises the selector from the class the
  // component emits, and every coloured button silently loses its colour.
  const src = '.esa-button--color-primary { --_accent: var(--color-primary); }';
  assert.equal(
    rename(src, '--color-primary', '--color-background-brand'),
    '.esa-button--color-primary { --_accent: var(--color-background-brand); }',
  );
});

test('does not match a longer token that starts with the same name', () => {
  const src = 'var(--color-primary-subtle)';
  assert.equal(rename(src, '--color-primary', '--color-background-brand'), src);
});

test('does not match a token that ends with the same name', () => {
  // `--color-text-primary` must survive a `--color-primary` rename untouched.
  const src = 'var(--color-text-primary)';
  assert.equal(rename(src, '--color-primary', '--color-background-brand'), src);
});

test('matches at the very start of a file', () => {
  assert.equal(rename('--color-primary: red;', '--color-primary', '--x'), '--x: red;');
});

test('class pattern respects both boundaries', () => {
  const src = 'class="type-body type-body-small cbf-type-body"';
  assert.equal(
    src.replace(classPattern('type-body'), 'typography-body-md'),
    'class="typography-body-md type-body-small cbf-type-body"',
  );
});

test('applyRenames orders longest-first so prefixes are not eaten', () => {
  const pairs = [
    { from: 'type-body', to: 'typography-body-md' },
    { from: 'type-body-small', to: 'typography-body-sm' },
  ];
  const { text } = applyRenames('type-body-small and type-body', pairs, classPattern);
  assert.equal(text, 'typography-body-sm and typography-body-md');
});

test('applyRenames counts hits per pair', () => {
  const pairs = [{ id: 'brand', from: '--color-primary', to: '--color-background-brand' }];
  const { counts } = applyRenames('var(--color-primary) var(--color-primary)', pairs);
  assert.equal(counts.get('brand'), 2);
});

test('every pair in migrations.json survives a round of its own rename', async () => {
  // Guards against a manifest entry whose `to` contains its own `from` — that would
  // make the rename non-idempotent and corrupt on a second run.
  const { readFileSync } = await import('node:fs');
  const url = new URL('../../packages/tokens/migrations.json', import.meta.url);
  const { migrations } = JSON.parse(readFileSync(url, 'utf8'));
  for (const m of migrations) {
    for (const [from, to] of m.pairs) {
      assert.ok(!tokenPattern(from).test(to), `${m.id}: "${to}" still contains "${from}"`);
    }
  }
});

test('findCollapseCollisions flags a spoke that split a collapsed pair', () => {
  // cb-fish gave these two DIFFERENT values; the hub merged them because they were
  // identical there. Rewriting both would emit --color-content-secondary twice.
  const css = `[data-theme="x"] {
    --color-text-secondary: var(--cbf-gray-700);
    --color-text-tertiary:  var(--cbf-gray-600);
  }`;
  const pairs = [
    { from: '--color-text-secondary', to: '--color-content-secondary' },
    { from: '--color-text-tertiary', to: '--color-content-secondary' },
  ];
  const hits = findCollapseCollisions(css, pairs);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].to, '--color-content-secondary');
  assert.deepEqual(hits[0].froms.map((f) => f.value), ['var(--cbf-gray-700)', 'var(--cbf-gray-600)']);
});

test('findCollapseCollisions ignores READS, only declarations collide', () => {
  // Two reads rewriting to the same name is the alias working as intended.
  const css = 'a { color: var(--color-text-secondary); border-color: var(--color-text-tertiary); }';
  const pairs = [
    { from: '--color-text-secondary', to: '--color-content-secondary' },
    { from: '--color-text-tertiary', to: '--color-content-secondary' },
  ];
  assert.deepEqual(findCollapseCollisions(css, pairs), []);
});

test('findCollapseCollisions is quiet when only one side is declared', () => {
  const css = ':root { --color-text-secondary: #666; }';
  const pairs = [
    { from: '--color-text-secondary', to: '--color-content-secondary' },
    { from: '--color-text-tertiary', to: '--color-content-secondary' },
  ];
  assert.deepEqual(findCollapseCollisions(css, pairs), []);
});

test('findCollapseCollisions sees a declaration with NO trailing semicolon', () => {
  // CSS routinely omits the `;` on the last declaration in a block. A guard that
  // cannot see it lets the codemod emit the same property twice — later-wins —
  // and the earlier value is gone with no error. That is the one outcome this
  // whole function exists to prevent, so the edge case is not optional.
  const src = ':root {\n  --color-text-secondary: #525252;\n  --color-text-tertiary: #737373\n}';
  const found = findCollapseCollisions(src, [
    { from: '--color-text-secondary', to: '--color-content-secondary' },
    { from: '--color-text-tertiary', to: '--color-content-secondary' },
  ]);
  assert.equal(found.length, 1);
  assert.deepEqual(
    found[0].froms.map((f) => f.value).sort(),
    ['#525252', '#737373'],
  );
});

test('findCollapseCollisions ignores a commented-out declaration', () => {
  // A comment emits nothing, so it cannot collide. Counting it aborts the whole
  // spoke's migration and tells the author to delete a declaration that is prose.
  const src = [
    ':root {',
    '  /* was --color-text-tertiary: #737373; retired 2026-08 */',
    '  --color-text-secondary: #525252;',
    '}',
  ].join('\n');
  assert.deepEqual(
    findCollapseCollisions(src, [
      { from: '--color-text-secondary', to: '--color-content-secondary' },
      { from: '--color-text-tertiary', to: '--color-content-secondary' },
    ]),
    [],
  );
});

test('findCollapseCollisions allows a collapse when both values match', () => {
  // air-exchange-tool declares both sides identically — the hub's merge reasoning
  // still holds there, so blocking would be friction with nothing gained.
  const css = `[data-theme="x"] {
    --color-text-secondary: var(--smaqmd-gray-11);
    --color-text-tertiary:  var(--smaqmd-gray-11);
  }`;
  const pairs = [
    { from: '--color-text-secondary', to: '--color-content-secondary' },
    { from: '--color-text-tertiary', to: '--color-content-secondary' },
  ];
  assert.deepEqual(findCollapseCollisions(css, pairs), []);
});

// --- renameProp ---------------------------------------------------------------
// A prop name is only meaningful relative to its component, so every one of these
// asserts the SCOPE holds. The `color` rename is the worst case in the system:
// the same word is a button prop, a real CSS-colour prop on the spinner, and the
// commonest declaration in any stylesheet.

const BUTTON = { components: ['EsaButton', 'esa-button'], from: 'color', to: 'variant' };
const prop = (src, spec = BUTTON) => renameProp(src, spec).text;

test('renameProp rewrites the prop on the Astro wrapper', () => {
  assert.equal(
    prop('<EsaButton color="danger" appearance="soft">Delete</EsaButton>'),
    '<EsaButton variant="danger" appearance="soft">Delete</EsaButton>',
  );
});

test('renameProp rewrites the prop on the custom element', () => {
  assert.equal(prop('<esa-button color="ai"></esa-button>'), '<esa-button variant="ai"></esa-button>');
});

test('renameProp leaves another component’s genuine color prop alone', () => {
  // The regression this scoping exists for. esa-loading-spinner.color is a real
  // CSS colour value; a global rename would rewrite it to a prop that does not
  // exist and the spinner would silently fall back to its default.
  const src = '<LoadingSpinner color="var(--color-background-brand)" />';
  assert.equal(prop(src), src);
});

test('renameProp leaves CSS color declarations alone', () => {
  const src = '.esa-button { color: var(--color-content-primary); background-color: red; }';
  assert.equal(prop(src), src);
});

test('renameProp does not match a sibling component with a longer name', () => {
  const src = '<esa-button-group color="primary"></esa-button-group>';
  assert.equal(prop(src), src);
});

test('renameProp does not match a hyphenated attribute ending in the prop name', () => {
  assert.equal(
    prop('<EsaButton data-color="x" color="primary" />'),
    '<EsaButton data-color="x" variant="primary" />',
  );
});

test('renameProp handles self-closing tags and expression values', () => {
  assert.equal(
    prop('<EsaButton color={tone} iconOnly icon="plus" />'),
    '<EsaButton variant={tone} iconOnly icon="plus" />',
  );
});

test('renameProp rewrites code samples printed in template literals', () => {
  // Doc pages show the markup a reader copies. Leaving those stale would teach
  // the deprecated name to everyone who visits the page.
  assert.equal(
    prop('<Preview code={`<EsaButton color="danger">Danger</EsaButton>`}>'),
    '<Preview code={`<EsaButton variant="danger">Danger</EsaButton>`}>',
  );
});

test('renameProp counts what it changed', () => {
  const { count } = renameProp('<EsaButton color="a" /><EsaButton color="b" /><div color="c" />', BUTTON);
  assert.equal(count, 2);
});

// --- renameProp: aliased imports ----------------------------------------------
// A fixed tag list cannot see `<Button>`. Resolving the alias out of the FILE'S
// OWN imports is what makes the rewrite reach it without hard-coding a name that
// a spoke may legitimately use for something else.

const ALIASED = { ...BUTTON, module: '@esa/ecology/esa-button.astro' };

test('renameProp resolves a default-import alias', () => {
  const src = `import Button from '@esa/ecology/esa-button.astro';
<Button color="danger">Delete</Button>`;
  assert.match(renameProp(src, ALIASED).text, /<Button variant="danger">/);
});

test('renameProp resolves an alias imported by relative path', () => {
  const src = `import Btn from '../../components/esa-button.astro';
<Btn color="ai" />`;
  assert.match(renameProp(src, ALIASED).text, /<Btn variant="ai" \/>/);
});

test('renameProp leaves a spoke’s OWN same-named component alone', () => {
  // The reason this resolves per file instead of hard-coding `Button`. This file
  // never bound `Button` to esa-button, so its `color` is not ours to rename.
  const src = `import Button from '../ui/cbf-button.astro';
<Button color="brand">Go</Button>`;
  assert.equal(renameProp(src, ALIASED).text, src);
});

test('renameProp does not treat a longer basename as the module', () => {
  const src = `import Button from '../ui/my-esa-button.astro';
<Button color="brand">Go</Button>`;
  assert.equal(renameProp(src, ALIASED).text, src);
});

test('renameProp handles an alias alongside the canonical name in one file', () => {
  const src = `import Button from '@esa/ecology/esa-button.astro';
<Button color="a" /><esa-button color="b"></esa-button>`;
  const { text, count } = renameProp(src, ALIASED);
  assert.equal(count, 2);
  assert.match(text, /<Button variant="a" \/><esa-button variant="b">/);
});

test('importedAs finds every local binding of the module', () => {
  const src = `import EsaButton from '@esa/ecology/esa-button.astro';
import Button from './esa-button.astro';
import Card from '@esa/ecology/esa-card.astro';`;
  assert.deepEqual(importedAs(src, '@esa/ecology/esa-button.astro'), ['EsaButton', 'Button']);
});

test('renameProp without a module still works on the fixed tag list', () => {
  // doctor/migrate must not depend on the manifest carrying `module`.
  assert.match(renameProp('<EsaButton color="x" />', BUTTON).text, /variant="x"/);
});
