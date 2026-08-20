/**
 * THE HUB MUST NOT READ OR DECLARE ITS OWN REMOVED TOKENS.
 *
 * Every guard for this class of bug lives in `doctor.mjs`, which is a SPOKE
 * tool: it scans a spoke's `src/` against the hub's `migrations.json`. Nothing
 * pointed it back at the hub, and `tokens:check` does not cover this — that
 * guards the BASELINE (a name disappearing from the package without a row), not
 * whether hub source still reaches for a name the hub itself deleted.
 *
 * So the hub was structurally unable to see this in itself, and did not:
 * `esa-app-shell` declared five `--app-bar-*` names nothing read, and
 * `esa-container`'s doc page shipped a live demo setting `--container-gutter: 0`
 * three days after that hook was deleted — a control that rendered identically
 * to the default beside it, on the public site, captioned as if it worked.
 *
 * Both were found by scaffolding a spoke, porting the hub's doc pages into it,
 * and running the spoke tool. That is a long way to travel to learn the hub is
 * wrong about itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { declPattern, readPattern } from './lib/token-rename.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Names retired with `removed: true` — no alias is emitted, so a read resolves to nothing. */
const removed = JSON.parse(readFileSync(path.join(ROOT, 'packages/tokens/migrations.json'), 'utf8'))
  .migrations.filter((m) => m.kind === 'token' && m.removed && Array.isArray(m.pairs))
  .flatMap((m) => m.pairs.map(([from]) => from));

/*
 * A NAME THE SHIPPED CSS STILL READS IS NOT DEAD, whatever the baseline says.
 * `--sidebar-width` is the case: the semantic token was demoted, but the name
 * also belongs to the `.sidebar` layout primitive, where `layouts.css` both
 * declares and reads it. Flagging that would demand deleting a live knob.
 */
const liveKnobs = new Set();
const tokensSrc = path.join(ROOT, 'packages/tokens/src');
for (const f of readdirSync(tokensSrc)) {
  if (!f.endsWith('.css')) continue;
  for (const m of readFileSync(path.join(tokensSrc, f), 'utf8').matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
    liveKnobs.add(m[1]);
  }
}
const dead = removed.filter((n) => !liveKnobs.has(n));

const SCAN = ['packages/ecology/src', 'packages/tokens/src', 'packages/docs/src',
              'packages/spoke-template/src', 'apps/site/src'];
const EXT = /\.(astro|ts|tsx|js|mjs|css|scss)$/;

function* files(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (EXT.test(e.name)) yield p;
  }
}

/*
 * COMMENTS ARE STRIPPED FIRST, exactly as `parseDeclarations` and
 * `overlay.test.mjs` already do, and for the reason the latter states: a guard
 * has to read the code, not the prose about it. This repo documents its own
 * removals in place — `component-tokens.css` says "Was `--filter-dropdown-border:
 * 1px solid …`" right where the hook used to be — and every one of those reads
 * as a declaration to a naive matcher. Four of the seven findings on this test's
 * first run were exactly that.
 *
 * Crude on purpose (it does not know about strings containing `//`): on this
 * corpus over-stripping can only turn a finding into a miss, and the tests below
 * are proven non-vacuous by having caught real hits before this was added.
 */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

/*
 * MATCHED STRICTLY — `var(--x)` and `--x:` only, never a bare mention. Prose
 * ABOUT a removed token is legitimate and often the most useful thing on the
 * page: `esa-container`'s rewritten section names `--container-gutter` precisely
 * to say it is gone and why. A guard that forbids explaining a removal forces
 * documentation to be silent about it.
 */
test('no hub source READS a removed token', () => {
  const hits = [];
  for (const dir of SCAN) {
    for (const file of files(path.join(ROOT, dir))) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const name of dead) {
        if (readPattern(name).test(src)) hits.push(`${path.relative(ROOT, file)} reads ${name}`);
      }
    }
  }
  assert.deepEqual(hits, [], `var() on a removed token resolves to NOTHING and the property is ` +
    `dropped with no error:\n  ${hits.join('\n  ')}`);
});

test('no hub source DECLARES a removed token', () => {
  const hits = [];
  for (const dir of SCAN) {
    for (const file of files(path.join(ROOT, dir))) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const name of dead) {
        if (declPattern(name).test(src)) hits.push(`${path.relative(ROOT, file)} declares ${name}`);
      }
    }
  }
  assert.deepEqual(hits, [], `nothing reads these, so each is inert — and in a doc page's demo ` +
    `it is a control that silently does nothing:\n  ${hits.join('\n  ')}`);
});
