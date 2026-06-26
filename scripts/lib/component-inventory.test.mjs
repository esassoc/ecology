/*
 * Smoke test for the component-inventory grounding primitive (run: `npm test`).
 * Zero deps — node:test + node:assert, same ethos as manifest-crosscheck.test.mjs.
 *
 * Fixtures mirror the two real house conventions: an .astro component (frontmatter
 * `//` doc comment + `interface Props`) and a decorator-free Lit `.ts` component
 * (leading comment + `static properties`). The point is: the judge gets a faithful
 * { purpose, props } record off either shape, so "is this a duplicate?" can be judged.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPurpose, extractProps, inventoryEntry, propOverlap } from './component-inventory.mjs';

const ASTRO = `---
// demo-stat-group — a bordered surface panel wrapping a responsive grid of
// esa-stat. Composes esa-stat + the grid primitive. Data-in via \`stats\`.
import EsaStat from '@esa/ecology/esa-stat.astro';
interface Stat {
  value: string | number;
  label: string;
}
interface Props {
  stats: Stat[];
  /** Min track width for the responsive grid. */
  min?: string;
}
const { stats, min = '11rem' } = Astro.props;
---
<section class="lsg"></section>`;

const LIT = `import { LitElement, html } from 'lit';

// esa-switch-toggle — a form-associated on/off switch (Lit web component).
export class EsaSwitchToggle extends LitElement {
  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean },
    label: {},
  };
}`;

test('astro: purpose is the frontmatter doc comment, not the Stat interface', () => {
  const p = extractPurpose(ASTRO, '.astro');
  assert.match(p, /^demo-stat-group —/);
  assert.match(p, /grid of esa-stat/);
});

test('astro: props read the Props interface only (not the nested Stat interface)', () => {
  const props = extractProps(ASTRO, '.astro');
  assert.deepEqual(props.sort(), ['min', 'stats']);
  // the JSDoc comment + the union type `string | number` must not leak keys
  assert.ok(!props.includes('value') && !props.includes('label'));
});

test('lit: purpose + props come off the leading comment and static properties', () => {
  assert.match(extractPurpose(LIT, '.ts'), /form-associated on\/off switch/);
  assert.deepEqual(extractProps(LIT, '.ts').sort(), ['checked', 'disabled', 'label']);
});

test('inventoryEntry: name derives from the path', () => {
  const e = inventoryEntry('packages/ecology/src/components/esa-card.astro', '---\n// esa-card — card.\ninterface Props { title?: string; variant?: string; }\n---');
  assert.equal(e.name, 'esa-card');
  assert.deepEqual(e.props.sort(), ['title', 'variant']);
});

test('propOverlap: a near-duplicate scores high; generic-only props score 0', () => {
  const a = { props: ['title', 'subtitle', 'icon', 'variant'] };
  const b = { props: ['title', 'subtitle', 'icon', 'padding'] };
  const { shared, jaccard } = propOverlap(a, b);
  assert.deepEqual(shared.sort(), ['icon', 'subtitle', 'title']);
  assert.ok(jaccard > 0.5);
  // two components sharing only `class`/`id` are NOT flagged as overlapping
  assert.equal(propOverlap({ props: ['class'] }, { props: ['id'] }).jaccard, 0);
});
