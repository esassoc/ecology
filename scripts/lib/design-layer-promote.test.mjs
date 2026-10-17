// Save to Source (packages/design-layer/src/promote.mjs): where each scope's
// edit lands. A throwaway spoke for the write path; the hub only as a dry plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planPromotion } from '../../packages/design-layer/src/promote.mjs';

const HUB = join(dirname(fileURLToPath(import.meta.url)), '../..');

function spoke(css) {
  const root = mkdtempSync(join(tmpdir(), 'dl-promote-'));
  mkdirSync(join(root, 'src/styles'), { recursive: true });
  writeFileSync(join(root, 'src/styles/theme-acme.css'), css);
  return root;
}

const THEME = `[data-theme="acme"] {
  --acme-h2: 18px; /* a note that stays */
  --color-background-default: var(--color-gray-1);
}
html[data-scheme="dark"][data-theme="acme"] {
  --color-content-default: #eee;
}
`;

test('a declared value is edited in place, and a light edit keeps dark where it was', () => {
  const root = spoke(THEME);
  try {
    const { plan, apply } = planPromotion(root, {}, {
      instances: 1,
      entries: [
        { scope: 'token', name: 'Root', mode: 'shared', cssVar: '--acme-h2', value: '20px' },
        { scope: 'token', name: 'Root', mode: 'light', cssVar: '--color-background-default', value: 'var(--color-gray-2)', darkBase: 'var(--color-gray-dark-1)' },
      ],
    });
    assert.equal(plan.context, 'spoke');
    assert.deepEqual(plan.keys, ['token||shared|--acme-h2', 'token||light|--color-background-default']);
    apply();
    const css = readFileSync(join(root, 'src/styles/theme-acme.css'), 'utf8');
    assert.match(css, /--acme-h2: 20px; \/\* a note that stays \*\//);
    assert.match(css, /--color-background-default: var\(--color-gray-2\);/);
    // Restated inside the existing dark block, not a new rule.
    assert.match(css, /--color-content-default: #eee;\s*--color-background-default: var\(--color-gray-dark-1\);\s*\n\}/);
    assert.ok(!css.includes('design-layer:start'));
  } finally { rmSync(root, { recursive: true }); }
});

test('component scope goes to the managed block, merged on a second save', () => {
  const root = spoke(THEME);
  try {
    const card = { scope: 'component', selector: '.esa-card', name: 'esa-card' };
    planPromotion(root, {}, { instances: 0, entries: [{ ...card, mode: 'light', cssVar: '--card-bg', value: '#fafafa' }] }).apply();
    planPromotion(root, {}, { instances: 0, entries: [{ ...card, mode: 'light', cssVar: '--card-border-color', value: '#ddd' }] }).apply();
    const css = readFileSync(join(root, 'src/styles/theme-acme.css'), 'utf8');
    assert.equal(css.split('design-layer:start').length, 2, 'one block');
    assert.match(css, /html:not\(\[data-scheme="dark"\]\)\[data-theme="acme"\] \.esa-card \{\n  --card-bg: #fafafa;\n  --card-border-color: #ddd;\n\}/);
  } finally { rmSync(root, { recursive: true }); }
});

test('a dev-only selector and an instance never reach source', () => {
  const root = spoke(THEME);
  try {
    const { plan } = planPromotion(root, {}, {
      instances: 3,
      entries: [{ scope: 'component', selector: '[data-dl-component="Card"]', name: 'Card', mode: 'light', cssVar: '--x', value: '1' }],
    });
    assert.equal(plan.keys.length, 0);
    assert.equal(plan.skipped.length, 1);
    assert.equal(plan.instances, 3);
  } finally { rmSync(root, { recursive: true }); }
});

test('the hub: token scope plans the DTCG json, primitives and untiered component edits are refused', () => {
  const { plan } = planPromotion(join(HUB, 'apps/site'), {}, {
    instances: 0,
    entries: [
      { scope: 'token', name: 'Root', mode: 'light', cssVar: '--color-background-default', value: 'var(--color-gray-2)' },
      { scope: 'token', name: 'Root', mode: 'light', cssVar: '--color-gray-3', value: '#eee' },
      { scope: 'component', selector: '.esa-card', name: 'esa-card', mode: 'light', cssVar: '--card-bg', value: '#fafafa' },
      { scope: 'component', selector: '.esa-card', name: 'esa-card', mode: 'light', cssVar: '--color-background-elevation-raised', value: '#fafafa' },
    ],
  });
  assert.equal(plan.context, 'hub');
  const json = plan.files.find((f) => f.path.endsWith('semantic/color.json'));
  assert.equal(json.changes[0].to, '{color.gray.2}');
  assert.ok(plan.files.some((f) => f.path.endsWith('component-tokens.css')));
  assert.deepEqual(plan.skipped.map((s) => s.cssVar).sort(), ['--color-background-elevation-raised', '--color-gray-3']);
});
