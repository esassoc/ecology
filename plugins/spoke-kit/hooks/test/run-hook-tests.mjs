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

rmSync(root, { recursive: true, force: true });
console.log(`\n${failures ? `${failures} case(s) failed` : 'all cases passed'}`);
process.exit(failures ? 1 : 0);
