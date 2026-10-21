// The design layer's source stamps: with Astro's dev toolbar off, the adapter
// writes data-astro-source-* itself. Elements get them; components, <head> and
// the frontmatter do not, and nothing else in the file moves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceStamps } from '../packages/design-layer/astro/sources.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('source stamps: elements only, offsets survive non-ASCII text', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'dl-src-')), 'Card.astro');
  const src = `---\nconst a = '<p>not markup</p>';\n---\n<html><head><title>x</title></head>\n<div class="card">é {a.length < 2 && <p>don't</p>}<Foo bar /><esa-badge>hi</esa-badge></div></html>\n`;
  writeFileSync(file, src);
  const out = await sourceStamps(ROOT).load(file);
  const tags = [...out.matchAll(/<([\w-]+) data-astro-source-file="([^"]+)" data-astro-source-loc="(\d+:\d+)"/g)].map((m) => [m[1], m[3]]);
  assert.deepEqual(tags, [['div', '5:1'], ['p', '5:38'], ['esa-badge', '5:62']]);
  assert.ok(out.includes(`const a = '<p>not markup</p>';`));
  assert.ok(out.includes('<Foo bar />') && out.includes('<title>x</title>'));
  assert.equal(out.replace(/ data-astro-source-(file|loc)="[^"]*"/g, ''), src);
});
