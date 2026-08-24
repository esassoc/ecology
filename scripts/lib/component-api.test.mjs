/*
 * Tests for the API parsers behind every generated table on the site (run: `npm test`).
 * Zero deps — node:test + node:assert, same ethos as component-inventory.test.mjs.
 *
 * These two ~100-line parsers shipped untested for their whole life while being the
 * reason the doc pages can claim they never drift. The fixtures below encode the
 * cases that actually bite: an alias that must be expanded rather than named, an
 * attribute whose spelling differs from its property, `attribute: false`, a get/set
 * pair that IS the API of every form control, and the `litType` the Angular
 * transform reads to decide attribute-vs-property.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAstro, parseLit, dispatchedEvents } from './component-api.mjs';

const ASTRO = `---
// esa-demo — presentational (.astro).
type Tone = 'brand' | 'surface';
interface Props {
  /** The visible text. */
  value?: string | number;
  tone?: Tone;
  required: string;
  [attr: string]: unknown;
}
const { value, tone = 'brand', required } = Astro.props;
---
<span></span>`;

const LIT = `import { LitElement, html } from 'lit';
type Size = 'sm' | 'md';

export class EsaDemo extends LitElement {
  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    labelPosition: { type: String, attribute: 'label-position' },
    options: { type: Array },
    rows: { type: Object, attribute: false },
    checked: { type: Boolean, reflect: true },
    _open: { state: true },
    _hidden: { type: Boolean },
  };

  declare label: string;
  declare size: Size;
  /** Which side the label sits on. */
  declare labelPosition: 'before' | 'after';
  declare options: string[];
  declare checked: boolean;

  constructor() {
    super();
    this.label = '';
    this.size = 'md';
    this.labelPosition = 'after';
    this.options = [];
    this.checked = false;
  }

  /** The submitted value. */
  get value(): string { return this._v; }
  set value(v: string | null) { this._v = v ?? ''; }

  private get _internalThing(): string { return ''; }

  _emit() {
    this.dispatchEvent(new CustomEvent('change', { detail: { checked: this.checked } }));
    this.dispatchEvent(new CustomEvent('pagechange', { detail: { page: 1 } }));
  }
}`;

test('parseAstro: props, defaults, required, and alias expansion', () => {
  const api = parseAstro(ASTRO);
  const by = Object.fromEntries(api.props.map((p) => [p.name, p]));

  assert.deepEqual(Object.keys(by), ['value', 'tone', 'required']);
  assert.equal(by.value.description, 'The visible text.');
  assert.equal(by.value.required, false);
  assert.equal(by.required.required, true, '`required: string` has no `?`');
  // The alias must be EXPANDED — printing `Tone` is the drift the table exists to kill.
  assert.equal(by.tone.type, "'brand' | 'surface'");
  assert.equal(by.tone.default, "'brand'");
  assert.equal(by.value.default, undefined);
});

test('parseAstro: an index signature is passthrough, not a row', () => {
  const api = parseAstro(ASTRO);
  assert.equal(api.passthrough, true);
  assert.ok(!api.props.some((p) => p.name === 'attr'));
});

test('parseLit: attribute name is the row name, property name rides alongside', () => {
  const by = Object.fromEntries(parseLit(LIT).props.map((p) => [p.name, p]));

  // What a consumer WRITES is the attribute.
  assert.ok(by['label-position'], 'row is keyed by the attribute name');
  assert.equal(by['label-position'].propertyName, 'labelPosition');
  assert.equal(by['label-position'].description, 'Which side the label sits on.');
  // When they agree, propertyName stays undefined rather than repeating itself.
  assert.equal(by.label.propertyName, undefined);
});

test('parseLit: state and _-prefixed entries are not public API', () => {
  const names = parseLit(LIT).props.map((p) => p.name);
  assert.ok(!names.includes('_open'), 'state: true is internal');
  assert.ok(!names.includes('_hidden'), '_-prefixed is internal even when typed');
});

test('parseLit: attribute:false is property-only', () => {
  const by = Object.fromEntries(parseLit(LIT).props.map((p) => [p.name, p]));
  assert.equal(by.rows.propertyOnly, true);
  // The row keeps the PROPERTY spelling — a reader must not be sent to write
  // `rows="…"` in HTML, where it would silently do nothing.
  assert.equal(by.rows.name, 'rows');
});

test('parseLit: litType survives, because attribute-vs-property depends on it', () => {
  const by = Object.fromEntries(parseLit(LIT).props.map((p) => [p.name, p]));
  assert.equal(by.options.litType, 'Array');
  assert.equal(by.checked.litType, 'Boolean');
  assert.equal(by.label.litType, 'String');
});

test('parseLit: a public get/set pair is API, and the SETTER type is what you may assign', () => {
  const by = Object.fromEntries(parseLit(LIT).props.map((p) => [p.name, p]));
  assert.ok(by.value, 'form controls expose value as an accessor, not a property');
  assert.equal(by.value.propertyOnly, true);
  // The getter returns `string`; the setter accepts `string | null`. A consumer
  // cares what they may hand it.
  assert.equal(by.value.type, 'string | null');
  assert.equal(by.value.description, 'The submitted value.');
  assert.ok(!by._internalThing, 'private accessors are not API');
});

test('parseLit: constructor assignments are the defaults', () => {
  const by = Object.fromEntries(parseLit(LIT).props.map((p) => [p.name, p]));
  assert.equal(by.size.default, "'md'");
  assert.equal(by.options.default, '[]');
  assert.equal(by.checked.default, 'false');
});

test('dispatchedEvents: deduped, sorted, verbatim', () => {
  assert.deepEqual(dispatchedEvents(LIT), ['change', 'pagechange']);
  // Byte-for-byte — an Angular binding that camelCases this never fires.
  assert.ok(dispatchedEvents(LIT).includes('pagechange'));
});

test('both parsers survive a component with no declared surface', () => {
  assert.deepEqual(parseAstro('---\n---\n<div></div>'), {
    props: [], eventNames: [], passthrough: false,
  });
  assert.deepEqual(parseLit('export class X extends LitElement {}'), {
    props: [], eventNames: [], passthrough: false,
  });
});
