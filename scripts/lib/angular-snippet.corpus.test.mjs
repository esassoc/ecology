/*
 * The Angular transform against the REAL corpus (run: `npm test`).
 *
 * angular-snippet.test.mjs states the rules on hand-built fixtures. This one runs
 * the same transform over every code sample on every web-component doc page,
 * parsed from the real component sources — the only way to know the rules survive
 * contact with markup nobody wrote for a test.
 *
 * THE COVERAGE FLOOR IS A RATCHET, not a target. Same shape as the token-name
 * guard: coverage may go up freely and may not quietly go down. Without it, a
 * refactor that made the transform decline twenty more samples would look exactly
 * like a passing build — the tab would just be missing, and nothing renders an
 * error for a tab that is not there.
 *
 * It also carries a check that has nothing to do with Angular and no other home:
 * a boolean prop written `="false"`, which is TRUE under Lit's default converter.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAstro, parseLit } from './component-api.mjs';
import { toAngular } from './angular-snippet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');
const PAGES = path.join(ROOT, 'apps', 'site', 'src', 'pages', 'components');

/** Every sample the transform must cope with, with its page and parsed API. */
function loadCorpus() {
  const api = {};
  const elements = new Set();
  for (const file of readdirSync(COMPONENTS)) {
    const m = file.match(/^(esa-[a-z0-9-]+)\.(astro|ts)$/);
    if (!m) continue;
    const src = readFileSync(path.join(COMPONENTS, file), 'utf8');
    api[m[1]] = m[2] === 'ts' ? parseLit(src) : parseAstro(src);
    if (m[2] === 'ts' && /customElements\.define\(/.test(src)) elements.add(m[1]);
  }

  const samples = [];
  for (const file of readdirSync(PAGES)) {
    if (!file.endsWith('.astro') || file === 'index.astro') continue;
    const src = readFileSync(path.join(PAGES, file), 'utf8');
    // Only web-component pages are wired to the Angular tab.
    if (src.match(/type="(wc|\.astro|reference)"/)?.[1] !== 'wc') continue;
    const slug = file.replace(/\.astro$/, '');
    for (const m of src.matchAll(/code=\{`([\s\S]*?)`\}/g)) samples.push({ slug, code: m[1] });
  }
  return { api, elements, samples };
}

const { api, elements, samples } = loadCorpus();

/**
 * Raise this when coverage improves; never lower it to make a change pass.
 * 96/106 at the time of writing — it was 101/113 until the map components moved to
 * the `map-work` branch, which took 7 samples out of the corpus. Lowering it is
 * legitimate ONLY when the corpus itself shrinks; a drop at a constant sample count
 * is the regression this guard exists to catch.
 */
const FLOOR = 96;

/** Refusal reasons we have deliberately accepted. A NEW one is a review prompt. */
const KNOWN_REASONS = new Set([
  'no-custom-element',      // the sample is pure JS, or has no esa-* tag
  'not-a-custom-element',   // an esa-* tag that is .astro, so nothing to instantiate
  'astro-component-tag',    // a Pascal-cased Astro component
  'script-grammar',         // imperative demo JS with no faithful Angular form
  'unknown-tag',
  'unknown-property',
  'parse-failed',
  'inline-handler',
  'empty-template',
  'backtick-in-template',
  'interpolation-in-template',
]);

test('the corpus is actually loaded — a silent zero would make every test below vacuous', () => {
  assert.ok(samples.length > 90, `expected the real corpus, found ${samples.length} samples`);
  assert.ok(elements.size > 30, `expected the real elements, found ${elements.size}`);
});

test('the transform never throws on a real sample', () => {
  for (const { slug, code } of samples) {
    assert.doesNotThrow(
      () => toAngular(code, { api, elements, slug }),
      `threw on ${slug}: ${code.slice(0, 80)}`,
    );
  }
});

test('every refusal carries a reason we have already considered', () => {
  for (const { slug, code } of samples) {
    const r = toAngular(code, { api, elements, slug });
    if (r.ok) continue;
    const kind = r.reason.split(':')[0];
    assert.ok(
      KNOWN_REASONS.has(kind),
      `${slug}: new refusal reason "${kind}" — decide whether to handle it or accept it, ` +
        `then add it to KNOWN_REASONS. Sample: ${code.slice(0, 80)}`,
    );
  }
});

test(`RATCHET: at least ${FLOOR} of ${samples.length} samples still generate`, () => {
  const covered = samples.filter(({ slug, code }) => toAngular(code, { api, elements, slug }).ok);
  assert.ok(
    covered.length >= FLOOR,
    `coverage fell to ${covered.length}/${samples.length} (floor ${FLOOR}). ` +
      `A missing Angular tab renders no error, so this counter is the only thing that notices.`,
  );
});

test('generated output is well-formed: balanced template literal, no stray interpolation', () => {
  for (const { slug, code } of samples) {
    const r = toAngular(code, { api, elements, slug });
    if (!r.ok) continue;
    // Exactly two backticks — the ones opening and closing `template:`.
    const ticks = (r.code.match(/`/g) ?? []).length;
    assert.equal(ticks, 2, `${slug}: ${ticks} backticks in the emitted component, expected 2`);
    assert.match(r.code, /schemas: \[CUSTOM_ELEMENTS_SCHEMA\]/, `${slug}: missing the schema`);
    assert.match(r.code, /import '@esa\/ecology\//, `${slug}: missing the element import`);
  }
});

test('every element a generated snippet imports really is a custom element', () => {
  for (const { slug, code } of samples) {
    const r = toAngular(code, { api, elements, slug });
    if (!r.ok) continue;
    for (const tag of r.uses) {
      assert.ok(elements.has(tag), `${slug}: imports <${tag}>, which registers no custom element`);
    }
  }
});

/*
 * Not an Angular concern — it just has nowhere better to live, and this is the one
 * place that already parses every sample against every component's real types.
 *
 * Lit's DEFAULT Boolean converter is `value !== null`, so `collapsible="false"`
 * sets it to TRUE. For a prop that also defaults to `true`, removing the attribute
 * does not help either — there is then no markup at all that turns it off, and the
 * attribute sits there looking like it works. Six props were in exactly that state
 * and five doc pages documented markup that did nothing.
 *
 * They now declare `converter: boolish` (packages/ecology/src/boolish.ts), which
 * reads "false"/"0"/"off"/"no" as false — so `="false"` on THOSE is correct, and
 * this check skips any prop with a declared converter. It stays live for the rest
 * of the kit, where the default converter is still in force.
 *
 * Nothing else in the repo notices this class of bug: the build passes, the types
 * are right, and axe cannot see an attribute that quietly does nothing.
 */
test('no sample writes a default-converter boolean prop as ="false", which silently means true', () => {
  const offenders = [];
  for (const { slug, code } of samples) {
    for (const m of code.matchAll(/([a-z][a-z0-9-]*)="false"/g)) {
      const prop = api[slug]?.props?.find((p) => p.name === m[1]);
      if (prop?.litType !== 'Boolean') continue;
      // A declared converter opts the prop out of Lit's presence semantics.
      if (prop.hasConverter) continue;
      offenders.push(`${slug}: ${m[1]}="false"`);
    }
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    'Lit reads `="false"` as true under its default converter, so this documents ' +
      'behaviour the component does not have. Either drop the attribute (if the prop ' +
      'defaults to false) or give it `converter: boolish` (if it defaults to true):\n  ' +
      offenders.join('\n  '),
  );
});
