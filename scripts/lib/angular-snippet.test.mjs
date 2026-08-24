/*
 * Tests for the Astro/HTML → Angular sample transform (run: `npm test`).
 * Zero deps — node:test + node:assert.
 *
 * The fixture API below is hand-built rather than read off a real component, so
 * each case states exactly one rule. The companion corpus test runs the same
 * transform over all ~213 REAL samples against the REAL parsed API; between them,
 * this file says what the rules are and that one says they survive contact.
 *
 * The rules worth restating, because each one is a bug someone would "fix":
 *   - an attribute is copied VERBATIM, including `="false"` and JSON-in-a-string;
 *   - `[prop]` binding is only for props with no attribute, or ones a script sets;
 *   - an event name is never re-cased — `(pageChange)` does not fire;
 *   - anything uncertain returns ok:false rather than guessing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toAngular, parseFragment, classifyAttr, scriptToMembers } from './angular-snippet.mjs';

const API = {
  'esa-demo': {
    props: [
      { name: 'label', type: 'string', required: false, litType: 'String' },
      { name: 'size', type: "'sm' | 'md'", required: false, litType: 'String' },
      { name: 'checked', type: 'boolean', required: false, litType: 'Boolean' },
      { name: 'collapsible', type: 'boolean', required: false, litType: 'Boolean' },
      { name: 'label-position', propertyName: 'labelPosition', type: "'before' | 'after'", required: false, litType: 'String' },
      { name: 'center', type: 'number[]', required: false, litType: 'Array' },
      { name: 'options', type: 'string[]', required: false, litType: 'Array' },
      { name: 'rows', propertyOnly: true, type: 'object[]', required: false, litType: 'Object' },
    ],
    eventNames: ['change', 'pagechange'],
    passthrough: false,
  },
};
const CTX = { api: API, elements: new Set(['esa-demo']), slug: 'esa-demo' };

const ok = (code, ctx = CTX) => {
  const r = toAngular(code, ctx);
  assert.equal(r.ok, true, `expected ok, got: ${r.ok === false ? r.reason : ''}`);
  return r.code;
};
const skip = (code, ctx = CTX) => {
  const r = toAngular(code, ctx);
  assert.equal(r.ok, false, 'expected a refusal');
  return r.reason;
};

// ── Attributes copy through verbatim ───────────────────────────────────────

test('a plain attribute and a bare boolean are copied verbatim', () => {
  const out = ok('<esa-demo label="Hi" size="sm" checked></esa-demo>');
  assert.match(out, /<esa-demo label="Hi" size="sm" checked><\/esa-demo>/);
});

test('a kebab attribute stays kebab — it is what the consumer writes', () => {
  const out = ok('<esa-demo label-position="before"></esa-demo>');
  assert.match(out, /label-position="before"/);
  assert.doesNotMatch(out, /labelPosition/, 'the property spelling is not an attribute');
});

test('an Array prop that HAS an attribute keeps the attribute — Lit parses the JSON', () => {
  // Rewriting this to [center] would make the Angular tab disagree with the HTML
  // tab beside it, which is the failure this transform exists to prevent.
  const out = ok('<esa-demo center="[-122.35, 37.78]"></esa-demo>');
  assert.match(out, /center="\[-122\.35, 37\.78\]"/);
  assert.doesNotMatch(out, /\[center\]/);
});

test('="false" is carried, NOT silently corrected', () => {
  // Lit's default Boolean converter is `value !== null`, so this really is true.
  // The transform's job is to mirror the HTML tab, not to paper over a bug in it —
  // the corpus test is what flags the underlying mistake.
  const out = ok('<esa-demo collapsible="false"></esa-demo>');
  assert.match(out, /collapsible="false"/);
  assert.doesNotMatch(out, /\[collapsible\]/);
});

test('attributes outside the API pass through as plain HTML', () => {
  const out = ok('<esa-demo id="x" class="y" aria-label="z" data-k="v"></esa-demo>');
  for (const a of ['id="x"', 'class="y"', 'aria-label="z"', 'data-k="v"']) assert.match(out, new RegExp(a.replace(/[[\]]/g, '\\$&')));
});

test('attribute:false becomes a property binding — there is no attribute to write', () => {
  const out = ok('<esa-demo rows="ignored"></esa-demo>');
  assert.match(out, /\[rows\]="ignored"/);
});

// ── Structure ──────────────────────────────────────────────────────────────

test('sibling roots stay siblings — Angular templates allow multiple roots', () => {
  const out = ok('<esa-demo label="a"></esa-demo>\n<esa-demo label="b"></esa-demo>');
  assert.match(out, /label="a"[\s\S]*label="b"/);
  assert.doesNotMatch(out, /<div>/, 'no wrapper is invented');
});

test('nesting and non-component markup survive', () => {
  const out = ok('<form>\n  <esa-demo label="x"></esa-demo>\n  <button type="submit">Submit</button>\n</form>');
  assert.match(out, /<form>/);
  assert.match(out, /<button type="submit">Submit<\/button>/, 'a lone text child stays inline');
});

test('the emitted component carries the schema and a side-effect import', () => {
  const out = ok('<esa-demo></esa-demo>');
  assert.match(out, /import \{ Component, CUSTOM_ELEMENTS_SCHEMA \} from '@angular\/core';/);
  assert.match(out, /import '@esa\/ecology\/esa-demo';/);
  assert.match(out, /schemas: \[CUSTOM_ELEMENTS_SCHEMA\]/);
  assert.match(out, /export class DemoDemo \{\}/);
});

// ── Script sidecars ────────────────────────────────────────────────────────

test('a script-assigned array becomes a class field plus a property binding', () => {
  const out = ok(
    '<esa-demo></esa-demo>\n<script>\n  const d = document.querySelector(\'esa-demo\');\n  d.options = [1, 2, 3];\n</script>',
  );
  assert.match(out, /\[options\]="options"/);
  assert.match(out, /^ {2}options = \[1, 2, 3\];$/m);
});

test('an event name is preserved BYTE-FOR-BYTE, and $event is a CustomEvent', () => {
  const out = ok(
    '<esa-demo></esa-demo>\n<script>\n  const d = document.querySelector(\'esa-demo\');\n  d.addEventListener(\'pagechange\', (e) => console.log(e.detail));\n</script>',
  );
  assert.match(out, /\(pagechange\)="onPagechange\(\$event\)"/);
  assert.doesNotMatch(out, /pageChange/, 'camel-casing the event name means it never fires');
  assert.match(out, /const e = event as CustomEvent;/);
  assert.match(out, /console\.log\(e\.detail\);/);
});

test('a block-bodied listener keeps its body', () => {
  const out = ok(
    '<esa-demo></esa-demo>\n<script>\n  const d = document.querySelector(\'esa-demo\');\n  d.addEventListener(\'change\', (e) => {\n    console.log(e.detail.checked);\n  });\n</script>',
  );
  assert.match(out, /console\.log\(e\.detail\.checked\);/);
});

test('an implicit handle binds to the sample\'s sole custom element', () => {
  // Real samples write `el.options = […]` / `chart.data = […]` — a stand-in for
  // "your element" that resolves to nothing. One custom element means one answer.
  const out = ok('<esa-demo></esa-demo>\n<script>\n  el.options = [1, 2];\n</script>');
  assert.match(out, /\[options\]="options"/);
  assert.match(out, /^ {2}options = \[1, 2\];$/m);
});

test('querySelector can be chained directly, with no alias variable', () => {
  const out = ok(
    '<esa-demo></esa-demo>\n<script>\n  document.querySelector(\'esa-demo\').options = [1];\n</script>',
  );
  assert.match(out, /\[options\]="options"/);
});

test('an implicit handle is refused when the sample has more than one element', () => {
  assert.equal(
    skip('<esa-demo></esa-demo>\n<esa-demo></esa-demo>\n<script>\n  el.options = [1];\n</script>'),
    'script-grammar',
  );
});

test('an ambiguous selector is a refusal, not a coin flip', () => {
  const reason = skip(
    '<esa-demo></esa-demo>\n<esa-demo></esa-demo>\n<script>\n  const d = document.querySelector(\'esa-demo\');\n  d.options = [1];\n</script>',
  );
  assert.equal(reason, 'script-grammar');
});

test('script we cannot translate faithfully is refused outright', () => {
  const reason = skip(
    '<esa-demo></esa-demo>\n<script>\n  customElements.whenDefined(\'esa-demo\').then(() => doThing());\n</script>',
  );
  assert.equal(reason, 'script-grammar');
});

// ── Refusals ───────────────────────────────────────────────────────────────

test('a Pascal-cased tag is an Astro component — nothing for Angular to instantiate', () => {
  assert.match(skip('<EsaBadge value="x" />'), /^astro-component-tag/);
});

test('an esa-* tag with no custom element behind it is refused', () => {
  // esa-badge is .astro: writing the tag in HTML renders literally nothing.
  assert.match(skip('<esa-badge></esa-badge>'), /^not-a-custom-element/);
});

test('a sample with no custom element at all has no Angular story', () => {
  assert.equal(skip('<p>Just prose.</p>'), 'no-custom-element');
});

test('malformed markup is refused, not half-rendered', () => {
  assert.match(skip('<esa-demo><span></esa-demo>'), /^parse-failed/);
});

test('an inline on* handler is refused rather than guessed at', () => {
  assert.match(skip('<esa-demo onclick="go()"></esa-demo>'), /^inline-handler/);
});

test('a backtick or ${ in the markup would break the template literal', () => {
  assert.equal(skip('<esa-demo label="a `b` c"></esa-demo>'), 'backtick-in-template');
  assert.equal(skip('<esa-demo label="${x}"></esa-demo>'), 'interpolation-in-template');
});

// ── The pieces, directly ───────────────────────────────────────────────────

test('parseFragment: elements, attrs, text, comments, raw script', () => {
  const nodes = parseFragment('<!-- hi --><a href="#" hidden>T</a><script>x = 1;</script>');
  assert.equal(nodes[0].kind, 'comment');
  assert.equal(nodes[1].tag, 'a');
  assert.deepEqual(nodes[1].attrs.map((a) => [a.name, a.value]), [['href', '#'], ['hidden', null]]);
  assert.equal(nodes[1].children[0].text, 'T');
  assert.equal(nodes[2].kind, 'script');
  assert.equal(nodes[2].text, 'x = 1;');
});

test('parseFragment: void elements need no closing tag', () => {
  const nodes = parseFragment('<img src="a.png"><br>');
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].selfClosing, true);
});

test('classifyAttr: the four answers', () => {
  const api = API['esa-demo'];
  assert.equal(classifyAttr('esa-demo', 'label', api), 'attribute');
  assert.equal(classifyAttr('esa-demo', 'rows', api), 'property');
  assert.equal(classifyAttr('esa-demo', 'onclick', api), 'event');
  assert.equal(classifyAttr('esa-demo', 'id', api), 'passthrough');
});

test('scriptToMembers: comments are skipped, unknown statements stop it', () => {
  const node = { tag: 'esa-demo' };
  const resolve = () => node;
  assert.ok(scriptToMembers("// a note\nconst d = document.querySelector('esa-demo');\nd.options = [1];", resolve));
  assert.equal(scriptToMembers('window.location.reload();', resolve), null);
});
