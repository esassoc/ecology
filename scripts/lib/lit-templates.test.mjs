// Regression tests for the broken-Lit-template detector.
//
// The fixtures are not invented: each one is the shape of a defect that actually
// shipped in this repo. The `.sidebar` case is the one that mattered most — it
// sat in HEAD, built green, passed `npm run a11y`, and killed esa-sidebar-nav on
// every page. See scripts/lib/lit-templates.mjs for why a grep cannot find it.
//
// The final test is the RATCHET: it sweeps the real component kit. It swept 35
// components at 0 findings when it was added, so a failure here is a new defect,
// not a backlog.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { findBrokenTemplates, scanComponents } from './lit-templates.mjs';

const COMPONENTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../packages/ecology/src/components',
);

test('EVEN backticks in a css comment — builds green, throws at load', () => {
  // css`A`.sidebar`B` → tagged template, member access, tagged template.
  const src = [
    'class X {',
    '  static styles = css`',
    '    :host {',
    '      /* the name collided with the `.sidebar` primitive */',
    '      color: red;',
    '    }',
    '  `;',
    '}',
  ].join('\n');
  const f = findBrokenTemplates(src);
  assert.equal(f.length, 1);
  assert.equal(f[0].kind, 'early-close');
  assert.equal(f[0].tag, 'css');
  assert.equal(f[0].line, 4);
});

test('ODD backtick in a css comment is caught too', () => {
  const src = 'const s = css`\n  /* set to `normal here */\n  color: red;\n`;';
  const f = findBrokenTemplates(src);
  assert.equal(f.length, 1);
  assert.equal(f[0].kind, 'early-close');
});

test('${...} inside a css comment — interpolated, not commented out', () => {
  const src = 'const s = css`\n  /* an inline background:${option.color} with no label */\n  color: red;\n`;';
  const f = findBrokenTemplates(src);
  assert.equal(f.length, 1);
  assert.equal(f[0].kind, 'interpolation');
  assert.match(f[0].detail, /option\.color/);
});

test('${...} inside an <!-- --> comment in an html template', () => {
  const src = 'const t = html`\n  <!-- reads ${this._open} to decide -->\n  <div></div>\n`;';
  const f = findBrokenTemplates(src);
  assert.equal(f.length, 1);
  assert.equal(f[0].kind, 'interpolation');
});

test('a REAL interpolation outside a comment is not flagged', () => {
  const src = 'const t = html`<div class=${this.cls}>${this.label}</div>`;';
  assert.deepEqual(findBrokenTemplates(src), []);
});

test('nested html`` inside ${...} does not confuse the scanner', () => {
  // The shape that defeats backtick-counting: the count comes out even either way.
  const src = [
    'render() {',
    '  return html`<ul>',
    '    ${this.items.map((i) => html`<li class="row">${i.name}</li>`)}',
    '    ${this.empty ? html`<p>none</p>` : null}',
    '  </ul>`;',
    '}',
  ].join('\n');
  assert.deepEqual(findBrokenTemplates(src), []);
});

test('a css comment that quotes nothing is fine', () => {
  const src = 'const s = css`\n  /* the name collided with the .sidebar primitive */\n  color: red;\n`;';
  assert.deepEqual(findBrokenTemplates(src), []);
});

test('JSDoc backticks OUTSIDE any template are fine — the trap is interior-only', () => {
  const src = [
    '/**',
    ' * Set `files` as a property. Emits `remove` with detail `{ file, index }`.',
    ' */',
    'const s = css`\n  color: red;\n`;',
  ].join('\n');
  assert.deepEqual(findBrokenTemplates(src), []);
});

test('an untagged template continuing into a method call is NOT flagged', () => {
  // Would be a false positive if the scanner judged every tag; that is what would
  // get the gate switched off.
  const src = 'const parts = `a,b,c`.split(",");';
  assert.deepEqual(findBrokenTemplates(src), []);
});

test('a backtick inside a normal quoted string does not open a template', () => {
  const src = 'const tick = "`"; const s = css`\n  color: red;\n`;';
  assert.deepEqual(findBrokenTemplates(src), []);
});

test('RATCHET: no component in the kit has a broken css`` or html`` template', () => {
  const { files, findings } = scanComponents(COMPONENTS, readdirSync, readFileSync);
  assert.ok(files.length >= 30, `expected the Lit kit, found ${files.length} .ts files`);
  assert.deepEqual(
    findings,
    [],
    'Broken Lit template(s) — the module will throw at load and the element will never upgrade:\n' +
      findings.map((f) => `  ${f.file}:${f.line}  ${f.detail}`).join('\n'),
  );
});
