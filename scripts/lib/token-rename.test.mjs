import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenPattern, classPattern, applyRenames, findCollapseCollisions, renameProp, renameComponent, importedAs, declPattern, readPattern, unresolvedChain, parseDeclarations } from './token-rename.mjs';

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
    // `component` rows are a whole-tag rename, not (from, to) pairs — nothing to
    // check for idempotence, and no `pairs` key to iterate.
    if (!Array.isArray(m.pairs)) continue;
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

/* --------------------------------- declaration vs read, and dead destinations */

const count = (src, re) => (src.match(re) ?? []).length;

test('declPattern matches a declaration and not a read', () => {
  assert.equal(count('--form-height-md: 40px;', declPattern('--form-height-md')), 1);
  assert.equal(count('height: var(--form-height-md);', declPattern('--form-height-md')), 0);
});

test('readPattern matches a read and not a declaration', () => {
  assert.equal(count('height: var(--form-height-md);', readPattern('--form-height-md')), 1);
  assert.equal(count('height: var(--form-height-md, 40px);', readPattern('--form-height-md')), 1);
  assert.equal(count('--form-height-md: 40px;', readPattern('--form-height-md')), 0);
});

test('declPattern does not read a BEM modifier + pseudo-class as a declaration', () => {
  // `.btn--color-primary:hover` ends in the token name and is followed by a colon.
  // Counting it as a declaration would report an inert override that does not exist.
  assert.equal(count('.btn--color-primary:hover { }', declPattern('--color-primary')), 0);
});

test('declPattern tolerates whitespace before the colon', () => {
  assert.equal(count('  --form-height-md : 40px;', declPattern('--form-height-md')), 1);
});

test('unresolvedChain returns null for a token that reaches a literal', () => {
  const decls = new Map([['--a', 'var(--b)'], ['--b', '12px']]);
  assert.equal(unresolvedChain('--a', decls), null);
});

test('unresolvedChain reports the chain when the destination is declared nowhere', () => {
  // The regression this pair of helpers exists for: --form-height-md is DECLARED
  // (as an alias) but points at a token that was deleted, so checking "is it
  // declared" passes and the property still drops.
  const decls = new Map([['--form-height-md', 'var(--control-height-md)']]);
  assert.deepEqual(unresolvedChain('--form-height-md', decls), [
    '--form-height-md',
    '--control-height-md',
  ]);
});

test('unresolvedChain treats an undeclared token as unresolved', () => {
  assert.deepEqual(unresolvedChain('--nope', new Map()), ['--nope']);
});

test('unresolvedChain counts a var() fallback as resolving', () => {
  // A stale fallback is still a value — the property renders, so this is not the
  // silent-drop case and must not be reported as one.
  const decls = new Map([['--a', 'var(--gone, 12px)']]);
  assert.equal(unresolvedChain('--a', decls), null);
});

test('unresolvedChain terminates on a cycle', () => {
  const decls = new Map([['--a', 'var(--b)'], ['--b', 'var(--a)']]);
  assert.ok(Array.isArray(unresolvedChain('--a', decls)));
});

test('no migrations.json row renames onto a destination the hub cannot resolve', async () => {
  // The hub-side half of the spoke guard. A row whose `to` dead-ends would rewrite
  // every spoke onto a name that resolves to nothing — and the codemod would report
  // success. Rows marked `removed` are exempt: they carry an empty destination on
  // purpose and are never rewritten.
  const { readFileSync, existsSync } = await import('node:fs');
  const dist = new URL('../../packages/tokens/dist/tokens.css', import.meta.url);
  const partial = new URL('../../packages/tokens/src/component-tokens.css', import.meta.url);
  if (!existsSync(dist)) return; // tokens not built in this environment
  const decls = new Map();
  for (const u of [dist, partial]) parseDeclarations(readFileSync(u, 'utf8'), decls);
  const url = new URL('../../packages/tokens/migrations.json', import.meta.url);
  const { migrations } = JSON.parse(readFileSync(url, 'utf8'));
  const broken = [];
  for (const m of migrations) {
    if (m.kind !== 'token' || m.removed) continue;
    for (const [, to] of m.pairs) {
      const chain = unresolvedChain(to, decls);
      if (chain) broken.push(`${m.id}: ${to} → ${chain.join(' → ')} (declared nowhere)`);
    }
  }
  assert.deepEqual(broken, []);
});

test('no migrations.json row renames onto a destination that is itself deprecated', async () => {
  // The two-hop trap. A row whose `to` is some OTHER row's `from` still resolves —
  // the alias block chains, so nothing renders wrong — which is exactly why it goes
  // unnoticed. What it costs is a spoke: /update-tokens rewrites onto the middle
  // name, reports success, and the spoke is still on a deprecated token. It needs a
  // second run nobody knows to make, and `doctor` will keep flagging it.
  //
  // This accumulated silently. Twelve chains existed when the guard was written on
  // 2026-08-15, nine of them created by the two colour renames earlier that same day
  // — the author of those rows (and of this test) did not notice either time.
  //
  // The fix is always to point `to` at the FINAL name, not the intermediate one.
  // `removed: true` rows are exempt on both sides: their destination is dead data.
  const { readFileSync } = await import('node:fs');
  const url = new URL('../../packages/tokens/migrations.json', import.meta.url);
  const { migrations } = JSON.parse(readFileSync(url, 'utf8'));

  const deprecated = new Map(); // from -> the row that deprecates it
  for (const m of migrations) {
    if (m.kind !== 'token' || m.removed) continue;
    for (const [from] of m.pairs) deprecated.set(from, m.id);
  }

  const chains = [];
  for (const m of migrations) {
    if (m.kind !== 'token' || m.removed) continue;
    for (const [from, to] of m.pairs) {
      if (deprecated.has(to)) {
        chains.push(`${m.id}: ${from} → ${to}, but ${to} is itself deprecated by ${deprecated.get(to)}`);
      }
    }
  }
  assert.deepEqual(chains, []);
});

test('parseDeclarations ignores token names quoted inside comments', () => {
  // component-tokens.css documents itself in prose that quotes token names with a
  // colon after them. Matching inside the comment gave --color-border a value made
  // of English AND swallowed the real declaration that followed it.
  const css = `
    /* Was \`--filter-dropdown-border: 1px solid …\` — a whole shorthand behind a
       single hook, which is why it was split. */
    --filter-dropdown-border-color: var(--color-border);
  `;
  const decls = parseDeclarations(css);
  assert.equal(decls.get('--filter-dropdown-border-color'), 'var(--color-border)');
  assert.equal(decls.has('--filter-dropdown-border'), false);
});


// ── renameComponent — esa-icon-button / esa-icon-link → esa-button variant="chrome"

const ICON_BUTTON = {
  from: 'esa-icon-button',
  to: 'esa-button',
  fromModule: '@esa/ecology/esa-icon-button.astro',
  toModule: '@esa/ecology/esa-button.astro',
  addProps: { variant: 'chrome', iconOnly: true },
};

test('renameComponent rewrites the custom element and adds the new props', () => {
  const src = '<esa-icon-button icon="search" label="Search"></esa-icon-button>';
  const { text, count } = renameComponent(src, ICON_BUTTON);
  assert.equal(count, 1);
  assert.equal(text, '<esa-button variant="chrome" iconOnly icon="search" label="Search"></esa-button>');
});

test('renameComponent handles a self-closing tag', () => {
  const { text } = renameComponent('<esa-icon-button icon="x" label="X" />', ICON_BUTTON);
  assert.equal(text, '<esa-button variant="chrome" iconOnly icon="x" label="X" />');
});

test('renameComponent repoints an ALIASED import and leaves the binding alone', () => {
  const src = [
    "import IconButton from '@esa/ecology/esa-icon-button.astro';",
    '<IconButton icon="search" label="Search" />',
  ].join('\n');
  const { text, count } = renameComponent(src, ICON_BUTTON);
  assert.equal(count, 1);
  // import moves...
  assert.match(text, /from '@esa\/ecology\/esa-button\.astro'/);
  // ...binding does not, but gains the props
  assert.match(text, /<IconButton variant="chrome" iconOnly icon="search"/);
});

test('renameComponent does NOT touch a spoke component that merely shares the name', () => {
  // No import of the hub module in this file, so `IconButton` is somebody else's.
  const src = '<IconButton icon="search" />';
  const { text, count } = renameComponent(src, ICON_BUTTON);
  assert.equal(count, 0);
  assert.equal(text, src);
});

test('renameComponent does not let esa-icon-button match esa-icon-button-group', () => {
  const src = '<esa-icon-button-group foo="1"></esa-icon-button-group>';
  const { text, count } = renameComponent(src, ICON_BUTTON);
  assert.equal(count, 0);
  assert.equal(text, src);
});

test('renameComponent will not double-add a prop the call site already set', () => {
  const src = '<esa-icon-button variant="chrome" icon="x" />';
  const { text } = renameComponent(src, ICON_BUTTON);
  assert.equal(text.match(/variant=/g).length, 1);
});

const ICON_LINK = {
  from: 'esa-icon-link',
  to: 'esa-button',
  fromModule: '@esa/ecology/esa-icon-link.astro',
  toModule: '@esa/ecology/esa-button.astro',
  addProps: { variant: 'chrome' },
  renameProps: { active: 'current' },
  dropProps: ['weight'],
};

test('renameComponent maps active → current (aria-pressed vs aria-current)', () => {
  const src = '<esa-icon-link active icon="map">Maps</esa-icon-link>';
  const { text } = renameComponent(src, ICON_LINK);
  assert.equal(text, '<esa-button variant="chrome" current icon="map">Maps</esa-button>');
});

test('renameComponent REPORTS a dropped prop rather than deleting it silently', () => {
  const src = '<esa-icon-link weight="semibold" icon="map">Maps</esa-icon-link>';
  const { text, dropped } = renameComponent(src, ICON_LINK);
  assert.deepEqual(dropped, [{ tag: 'esa-icon-link', prop: 'weight' }]);
  assert.match(text, /weight="semibold"/); // still there — a human decides
});

test('renameComponent does not rename a prop that merely ends with the old name', () => {
  const src = '<esa-icon-link data-active="1" icon="map">M</esa-icon-link>';
  const { text } = renameComponent(src, ICON_LINK);
  assert.match(text, /data-active="1"/);
  assert.doesNotMatch(text, /data-current/);
});
