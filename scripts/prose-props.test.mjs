/*
 * Regression cases for the prose-prop lint (run: `npm test`).
 * Zero deps — node:test + node:assert, same ethos as the rest of spoke-kit.
 *
 * Every fixture below mirrors a real declaration the first parser MISSED,
 * located by remy's flourish-slot audit (docs/2026-08-16-flourish-slot-audit.md).
 * The shape that matters is the nested one: the prose slot is a field of the
 * collection-item type, one level below Props, and it is filled once per row.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../plugins/spoke-kit/hooks/prose-props.mjs';

const rules = (src) => analyze(src).map((w) => `${w.prop}:${w.rule}`);
const props = (src) => analyze(src).map((w) => w.prop);

// cbf-related-items.astro / cbf-landing-related.astro — `overview` on the item
// type, not on Props. Props itself declares nothing prose-shaped.
test('a prose slot on a collection-item interface is found', () => {
  const src = `---
interface RelatedItem {
  title: string;
  overview: string;
  href?: string;
}
interface Props {
  items: RelatedItem[];
}
---`;
  assert.deepEqual(rules(src), ['overview:prose-prop-genre']);
  assert.equal(analyze(src)[0].declaredIn, 'RelatedItem');
  assert.match(analyze(src)[0].message, /filled once per item/);
});

// cbf-pattern-gallery.astro + data/prototypes-gallery.ts — the same `Archetype`
// shape declared in a component and in a data module with no Props at all.
test('a data module with no Props is still scanned', () => {
  const src = `export type ArchetypeStatus = 'shipped' | 'new';

export interface Archetype {
  num: string;
  title: string;
  purpose: string;
}`;
  assert.deepEqual(rules(src), ['purpose:prose-prop-contested']);
});

// The union alias above must not swallow the interface that follows it: a
// `type X = 'a' | 'b';` never opens a body.
test('a union type alias does not capture the next declaration', () => {
  const src = `type Mini = 'landing' | 'report';
type Status = 'shipped' | 'new';
interface Row {
  label: string;
}`;
  assert.deepEqual(analyze(src), []);
});

// layouts/ComponentDoc.astro — a real Props.summary in a layout.
test('a plain Props field still reports, without the per-item note', () => {
  const src = `---
interface Props {
  name: string;
  summary: string;
}
---`;
  const [w] = analyze(src);
  assert.equal(w.prop, 'summary');
  assert.equal(w.declaredIn, 'Props');
  assert.doesNotMatch(w.message, /filled once per item/);
});

test('names measured at 0% flourish are not flagged', () => {
  const src = `interface Props {
  title: string;
  label: string;
  eyebrow: string;
  sub: string;
  value: number;
  status: string;
}`;
  assert.deepEqual(analyze(src), []);
});

test('fields of an inline nested object stay that shape’s business', () => {
  const src = `interface Props {
  meta: { overview: string };
  title: string;
}`;
  assert.deepEqual(analyze(src), []);
});

test('the escape hatch suppresses the whole file', () => {
  const src = `---
// prose-prop-checked: \`overview\` is the report abstract, a stored field.
interface RelatedItem {
  overview: string;
}
---`;
  assert.deepEqual(analyze(src), []);
});

test('Lit static-properties maps are still read', () => {
  const src = `class EsaThing extends LitElement {
  static properties = {
    label: { type: String },
    tagline: { type: String },
  };
}`;
  assert.deepEqual(props(src), ['tagline']);
});

test('a doc comment describing type size reads as an invitation to prose', () => {
  const src = `interface Props {
  /** body-large, secondary text */
  caption: string;
}`;
  assert.match(analyze(src)[0].message, /how the text LOOKS/);
});
