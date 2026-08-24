/*
 * Ratchet: a default-TRUE boolean attribute must declare a converter (run: `npm test`).
 *
 * Lit's default Boolean converter is `value !== null` — presence-based, and correct
 * for a prop defaulting to FALSE. `disabled` is off until you write `disabled`.
 *
 * For a prop defaulting to TRUE it has no off switch at all:
 *
 *   <esa-sidebar-nav collapsible="false">   → true  (the attribute is present)
 *   <esa-sidebar-nav>                       → true  (the constructor default)
 *
 * There is no third form. The capability exists only from JavaScript while the
 * attribute sits in the markup looking like it works, and NOTHING else in this repo
 * notices: the build passes, the types are right, and axe cannot see an attribute
 * that quietly does nothing. Five doc pages documented exactly that for months.
 *
 * `packages/ecology/src/boolish.ts` is the fix — it reads "false"/"0"/"off"/"no" as
 * false while keeping presence semantics for the bare attribute.
 *
 * WHY A SOURCE SWEEP RATHER THAN THE SAMPLE CHECK in angular-snippet.corpus.test.mjs:
 * that one only sees props a doc sample happens to write as `="false"`. It found six.
 * Sweeping the source found NINE MORE with the identical defect that no sample
 * exercised. A guard that depends on someone having written the bug down already is
 * not a guard.
 *
 * This does NOT apply to default-false props: `<esa-x disabled="false">` reading as
 * "enabled" would be its own surprise, and `disabled` is the form everyone writes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLit } from './component-api.mjs';

const COMPONENTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..',
  'packages', 'ecology', 'src', 'components',
);

function litComponents() {
  const out = [];
  for (const file of readdirSync(COMPONENTS)) {
    const m = file.match(/^(esa-[a-z0-9-]+)\.ts$/);
    if (!m) continue;
    const src = readFileSync(path.join(COMPONENTS, file), 'utf8');
    if (/extends LitElement/.test(src)) out.push({ slug: m[1], api: parseLit(src) });
  }
  return out;
}

const COMPONENTS_PARSED = litComponents();

test('the sweep actually found the kit — a silent zero would pass vacuously', () => {
  assert.ok(COMPONENTS_PARSED.length > 30, `found ${COMPONENTS_PARSED.length} Lit components`);
});

test('every default-true boolean ATTRIBUTE declares converter: boolish', () => {
  const offenders = [];
  for (const { slug, api } of COMPONENTS_PARSED) {
    for (const p of api.props) {
      if (p.litType !== 'Boolean') continue;
      if (p.default !== 'true') continue;
      if (p.propertyOnly) continue;          // no attribute, so no attribute bug
      if (p.hasConverter) continue;
      offenders.push(`${slug}: ${p.name}`);
    }
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    'These default to true and use Lit\'s presence converter, so NO markup turns them ' +
      "off — `x=\"false\"` and omitting it both read true. Add `converter: boolish` " +
      '(packages/ecology/src/boolish.ts):\n  ' + offenders.join('\n  '),
  );
});

test('boolish is not applied to a default-FALSE prop, where presence is correct', () => {
  const misapplied = [];
  for (const { slug, api } of COMPONENTS_PARSED) {
    for (const p of api.props) {
      if (p.litType !== 'Boolean' || !p.hasConverter) continue;
      if (p.default === 'true') continue;
      misapplied.push(`${slug}: ${p.name} (default ${p.default ?? 'unset'})`);
    }
  }
  assert.deepEqual(
    misapplied.sort(),
    [],
    'A default-false boolean should keep Lit\'s presence semantics — `disabled="false"` ' +
      'reading as "enabled" is its own surprise:\n  ' + misapplied.join('\n  '),
  );
});
