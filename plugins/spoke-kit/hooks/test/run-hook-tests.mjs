#!/usr/bin/env node
// Hook tests. Spawns a hook with synthetic PreToolUse stdin and asserts the
// exit code — 0 passes the tool call, 2 denies it.
//
//   node plugins/spoke-kit/hooks/test/run-hook-tests.mjs
//
// Fixtures are written to a temp spoke (a package.json depending on
// @esa/ecology is what makes classifyDir say 'spoke'), so the tests never
// depend on a checkout of any particular spoke repo being present.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const root = mkdtempSync(path.join(process.env.SPOKE_KIT_TEST_TMP || tmpdir(), 'spoke-kit-test-'));
const pages = path.join(root, 'src', 'pages', 'prototypes');
mkdirSync(pages, { recursive: true });
writeFileSync(
  path.join(root, 'package.json'),
  JSON.stringify({ name: '@test/design', dependencies: { '@esa/ecology': 'file:../ecology' } }, null, 2)
);

// A page with no manifest — the state requirement-tracker.astro is in.
const NO_MANIFEST = path.join(pages, 'requirement-tracker.astro');
const EMPTY_STATE =
  '      <EsaEmptyState title="Kanban view" description="Status board of actions by tracking state. Not part of this prototype pass — Grid is the wired view.">';
writeFileSync(
  NO_MANIFEST,
  ['---', 'import EsaEmptyState from "@esa/ecology";', '---', '<main>', EMPTY_STATE, '  </EsaEmptyState>', '</main>', ''].join('\n')
);

// A page that already declares a valid manifest.
const WITH_MANIFEST = path.join(pages, 'compliant.astro');
writeFileSync(
  WITH_MANIFEST,
  [
    '<!-- manifest:',
    '  layout: stack(2xl)',
    '  sections:',
    '    - page header -> demo-page-header',
    '-->',
    '<main><DemoPageHeader /></main>',
    '',
  ].join('\n')
);

function run(hook, toolName, toolInput) {
  const res = spawnSync('node', [path.join(HOOKS, hook)], {
    input: JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: toolName,
      cwd: root,
      tool_input: toolInput,
    }),
    encoding: 'utf8',
  });
  return { code: res.status, stderr: res.stderr ?? '' };
}

let failures = 0;
function expect(label, actual, wanted, detail) {
  const ok = actual === wanted;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (exit ${actual}, wanted ${wanted})`);
  if (!ok && detail) console.log(detail.replace(/^/gm, '        '));
}

console.log('check-manifest — trigger scope\n');

// (a) remy's edit: delete a sentence inside an existing description attribute.
//     Two shapes, because an Edit may or may not span the enclosing tag.
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: NO_MANIFEST,
    old_string: 'Status board of actions by tracking state. Not part of this prototype pass — Grid is the wired view.',
    new_string: 'Status board of actions by tracking state.',
  });
  expect('(a1) text-only deletion inside an attribute value', r.code, 0, r.stderr);
}
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: NO_MANIFEST,
    old_string: EMPTY_STATE,
    new_string: EMPTY_STATE.replace(' Not part of this prototype pass — Grid is the wired view.', ''),
  });
  expect('(a2) same deletion, edit spanning the enclosing tag', r.code, 0, r.stderr);
}

// (b) adding structure to the same manifest-less page still blocks.
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: NO_MANIFEST,
    old_string: EMPTY_STATE,
    new_string: `${EMPTY_STATE}\n      <section class="notes"><p>Field notes</p></section>`,
  });
  const blocked = r.code === 2 && /BLOCKED by manifest-first/.test(r.stderr);
  expect('(b) edit adding a new <section> still blocks', blocked ? 2 : r.code, 2, r.stderr);
}

// Regressions around the narrowed trigger.
{
  const r = run('check-manifest.mjs', 'Write', {
    file_path: NO_MANIFEST,
    content: '<main>\n  <section><p>composed without a manifest</p></section>\n</main>\n',
  });
  expect('(c) whole-file Write with no manifest still blocks', r.code, 2, r.stderr);
}
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: WITH_MANIFEST,
    old_string: '<main><DemoPageHeader /></main>',
    new_string: '<main><DemoPageHeader /><DemoStatGroup /></main>',
  });
  expect('(d) structural edit on a page WITH a manifest passes', r.code, 0, r.stderr);
}
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: NO_MANIFEST,
    old_string: '<main>',
    new_string: '<main class="wide">',
  });
  expect('(e) attribute added to an existing tag passes', r.code, 0, r.stderr);
}
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: NO_MANIFEST,
    old_string: '      <section><p>a</p></section>\n      <section><p>b</p></section>',
    new_string: '      <section><p>a</p></section>',
  });
  expect('(f) deleting a whole section passes', r.code, 0, r.stderr);
}
{
  const r = run('check-manifest.mjs', 'Edit', {
    file_path: NO_MANIFEST,
    old_string: '      <EsaCard>one</EsaCard>',
    new_string: '      <EsaCard>one</EsaCard>\n      <EsaCard>two</EsaCard>',
  });
  expect('(g) duplicating an existing component counts as composition', r.code, 2, r.stderr);
}

console.log('\ncheck-prose-props — genre tier only\n');

const components = path.join(root, 'src', 'components');
mkdirSync(components, { recursive: true });

// A component that already declares a genre slot: the gate must not wall off
// later edits to it, only the moment one is introduced.
const HAS_LEDE = path.join(components, 'demo-report-intro.astro');
writeFileSync(
  HAS_LEDE,
  ['---', 'interface Props {', '  title: string;', '  lede?: string;', '}', '---', '<header><h1>{title}</h1></header>', ''].join('\n')
);

{
  const r = run('check-prose-props.mjs', 'Write', {
    file_path: path.join(components, 'demo-hero.astro'),
    content: ['---', 'interface Props {', '  title: string;', '  tagline: string;', '}', '---'].join('\n'),
  });
  const blocked = r.code === 2 && /named for a kind of PROSE/.test(r.stderr) && /`tagline`/.test(r.stderr);
  expect('(h) writing a new genre prop blocks', blocked ? 2 : r.code, 2, r.stderr);
}
{
  const r = run('check-prose-props.mjs', 'Edit', {
    file_path: HAS_LEDE,
    old_string: '  title: string;',
    new_string: '  title: string;\n  overview: string;',
  });
  expect('(i) adding a genre prop by Edit blocks', r.code, 2, r.stderr);
}
{
  const r = run('check-prose-props.mjs', 'Edit', {
    file_path: HAS_LEDE,
    old_string: '<header><h1>{title}</h1></header>',
    new_string: '<header><h1>{title}</h1><p>{lede}</p></header>',
  });
  expect('(j) editing a file that ALREADY has a genre prop passes', r.code, 0, r.stderr);
}
{
  const r = run('check-prose-props.mjs', 'Write', {
    file_path: path.join(components, 'demo-figure.astro'),
    content: ['---', 'interface Props {', '  caption: string;', '  summary: string;', '}', '---'].join('\n'),
  });
  expect('(k) the contested tier never blocks', r.code, 0, r.stderr);
}
{
  const r = run('check-prose-props.mjs', 'Write', {
    file_path: path.join(components, 'demo-items.astro'),
    content: [
      '---',
      '// prose-prop-checked: `overview` is the stored report abstract, not page copy',
      'interface RelatedItem {',
      '  overview: string;',
      '}',
      '---',
    ].join('\n'),
  });
  expect('(l) the escape hatch passes', r.code, 0, r.stderr);
}
{
  const r = run('check-prose-props.mjs', 'Write', {
    file_path: path.join(components, 'demo-related.astro'),
    content: [
      '---',
      'interface RelatedItem {',
      '  title: string;',
      '  overview: string;',
      '}',
      'interface Props {',
      '  items: RelatedItem[];',
      '}',
      '---',
    ].join('\n'),
  });
  const blocked = r.code === 2 && /on `RelatedItem`/.test(r.stderr);
  expect('(m) a genre prop one level down still blocks', blocked ? 2 : r.code, 2, r.stderr);
}
{
  const r = run('check-prose-props.mjs', 'Write', {
    file_path: path.join(root, 'notes.md'),
    content: 'interface Props {\n  tagline: string;\n}\n',
  });
  expect('(n) a non-component file is out of scope', r.code, 0, r.stderr);
}

console.log('\ncheck-component-first — the change, not the context\n');

// A page whose CSS already carries a font-family rule, put there long before
// this gate existed.
const STYLED_PAGE = path.join(pages, 'demo-out.astro');
const EXISTING_RULE = ['  .demo-out {', '    font-family: var(--font-mono);', '    color: var(--ink);', '  }'].join('\n');
writeFileSync(
  STYLED_PAGE,
  ['<main><section class="demo-out">out</section></main>', '<style>', EXISTING_RULE, '</style>', ''].join('\n')
);

// (o) remy's exact shape: the anchor quotes the existing font-family rule, the
//     change adds spacing. The gate convicted the author of the anchor, and
//     they dropped the styling rather than re-anchor around it.
{
  const r = run('check-component-first.mjs', 'Edit', {
    file_path: STYLED_PAGE,
    old_string: EXISTING_RULE,
    new_string: `${EXISTING_RULE.replace('    color: var(--ink);', '    color: var(--ink);\n    margin-block: var(--space-m);\n    padding-inline: var(--space-s);\n    gap: var(--space-2xs);')}`,
  });
  expect('(o) spacing added, font-family only quoted as the anchor', r.code, 0, r.stderr);
}

// (p) the inverse must keep its teeth.
{
  const r = run('check-component-first.mjs', 'Edit', {
    file_path: STYLED_PAGE,
    old_string: '    color: var(--ink);',
    new_string: '    color: var(--ink);\n    font-family: Georgia, serif;',
  });
  const blocked = r.code === 2 && /type role/.test(r.stderr);
  expect('(p) an edit that ADDS a font-family still blocks', blocked ? 2 : r.code, 2, r.stderr);
}

// (q) a second copy of a rule is an addition, not a repeat of the anchor.
{
  const r = run('check-component-first.mjs', 'Edit', {
    file_path: STYLED_PAGE,
    old_string: '    font-family: var(--font-mono);',
    new_string: '    font-family: var(--font-mono);\n    font-family: var(--font-sans);',
  });
  expect('(q) duplicating a banned declaration blocks', r.code, 2, r.stderr);
}

// (r) a whole-file Write is judged entire — nothing is context there.
{
  const r = run('check-component-first.mjs', 'Write', {
    file_path: STYLED_PAGE,
    content: ['<main><section class="demo-out">out</section></main>', '<style>', EXISTING_RULE, '</style>', ''].join('\n'),
  });
  expect('(r) a Write carrying font-family blocks', r.code, 2, r.stderr);
}

// (s) reindenting is not authoring.
{
  const r = run('check-component-first.mjs', 'Edit', {
    file_path: STYLED_PAGE,
    old_string: '    font-family: var(--font-mono);',
    new_string: '      font-family: var(--font-mono);',
  });
  expect('(s) reindenting an existing declaration passes', r.code, 0, r.stderr);
}

rmSync(root, { recursive: true, force: true });
console.log(`\n${failures ? `${failures} case(s) failed` : 'all cases passed'}`);
process.exit(failures ? 1 : 0);
