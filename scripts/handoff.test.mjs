// The browser-free half of @esa/handoff: registry parsing, deterministic rule
// selection, the spec writer's size budget, and the front-door renderers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistry, bundleSlug, routePath } from '../packages/handoff/src/registry.mjs';
import { splitRules, rulesForClasses, isTokenDefSelector } from '../packages/handoff/src/rules.mjs';
import { renderSpec, renderIndex, renderReadme, chunkLines, oneLine, normaliseData, sectionSize } from '../packages/handoff/src/spec.mjs';
import { DERIVE_SECTIONS } from '../packages/handoff/src/read-section.mjs';
import { componentsOf, blockRoot } from '../packages/handoff/src/components.mjs';
import { deployedUrl } from '../packages/handoff/src/config.mjs';

test('registry: pages pair with their own slug, groups are skipped, escapes survive', () => {
  const src = `
    export interface PrototypePage { slug: string; route: string; }
    export const GROUPS = [{
      slug: 'effort', title: 'Effort', description: 'A group.',
      pages: [
        { slug: 'actions', title: 'Actions', description:
            'Andy\\'s board.', route: '/prototypes/actions' },
        { slug: "help", title: "Help", route: "/help?aldo" },
      ],
    }];`;
  assert.deepEqual(parseRegistry(src), [
    { slug: 'actions', title: 'Actions', description: "Andy's board.", route: '/prototypes/actions' },
    { slug: 'help', title: 'Help', description: '', route: '/help?aldo' },
  ]);
  assert.equal(bundleSlug('/prototypes/setup-wizard/obligations-chain/'), 'prototypes-setup-wizard-obligations-chain');
  assert.equal(bundleSlug('/help?aldo'), 'help');
  assert.equal(routePath('/help?aldo'), 'help/?aldo');
});

test('deployed URL, never localhost', () => {
  const cfg = { site: 'https://esassoc.github.io', base: '/beacon-design/' };
  assert.equal(deployedUrl(cfg, 'prototypes/actions/'), 'https://esassoc.github.io/beacon-design/prototypes/actions/');
});

test('rules: grouping at-rules keep their wrapper, keyframes and token blocks drop', () => {
  const css = `/* a { } */ :root { --x: 1; } .a { color: red }
    @media (max-width: 600px) { .a { color: blue } .b { color: green } }
    @keyframes spin { from { opacity: 0 } to { opacity: 1 } }
    @import url(x.css);`;
  const rules = splitRules(css).filter((r) => !isTokenDefSelector(r.selector));
  assert.deepEqual(rules.map((r) => r.selector), ['.a', '.a', '.b']);
  assert.match(rules[1].text, /^@media \(max-width: 600px\) \{\n\.a \{/);
});

test('rules: a class matches on a word boundary, not as a prefix', () => {
  const rules = splitRules('.bcn-aboard { a: 1 } .bcn-aboard__col { b: 2 } .x .bcn-aboard:hover { c: 3 } .bcn-aboardx { d: 4 }');
  const hit = rulesForClasses(rules, new Set(['bcn-aboard'])).map((r) => r.selector);
  assert.deepEqual(hit, ['.bcn-aboard', '.x .bcn-aboard:hover']);
});

test('budget: a spec under budget is one file, guidance before markup', () => {
  const s = {
    label: 'Board',
    guide: { intent: 'The Kanban.', acceptance: ['Drops persist.'] },
    html: '<div class="bcn-aboard"></div>',
    css: '.bcn-aboard { display: grid }',
    tokens: [{ name: '--color-x', value: '#fff', tier: 'semantic' }],
    shots: { desktop: 'board.desktop.png', phone: 'board.phone.png' },
    components: [{ name: 'esa-badge', origin: 'hub', source: null, target: 'ui-badge' }],
    data: { fixture: 'src/data/a.ts', enums: { category: ['NotStarted', 'Completed'] } },
  };
  const files = renderSpec(s, {
    fileSlug: 'board', budget: 10_000, prototype: 'Actions', sourceUrl: 'https://x/actions/',
    urlFor: (n) => `https://x/handoff/claude/${n}`, target: { name: 'the Beacon app' },
  });
  assert.equal(files.length, 1);
  const t = files[0].text;
  assert.ok(t.indexOf('![Board, desktop](https://x/handoff/claude/board.desktop.png)') < t.indexOf('The Kanban.'));
  assert.ok(t.indexOf('## Done when') < t.indexOf('## Components'));
  assert.ok(t.indexOf('## Data') < t.indexOf('## Markup'));
  assert.match(t, /`esa-badge` \(hub\) → use `ui-badge` in the Beacon app/);
  assert.match(t, /`category`: `NotStarted` · `Completed`/);
  assert.doesNotMatch(t, /localhost/);
});

test('budget: an over-budget spec splits, and no file passes the budget', () => {
  const row = '<li class="r">' + 'x'.repeat(80) + '</li>';
  const s = { label: 'List', html: Array(2000).fill(row).join('\n'), css: '.r { a: b }', tokens: [] };
  const budget = 20_000;
  const files = renderSpec(s, { fileSlug: 'list', budget, prototype: 'P', sourceUrl: 'u', urlFor: (n) => n });
  assert.ok(files.length > 2);
  for (const f of files) assert.ok(f.text.length <= budget, `${f.name} is ${f.text.length}`);
  assert.match(files[0].text, /list\.markup-1\.md/);
  assert.ok(chunkLines('a'.repeat(50), 20).every((c) => c.length <= 20));
});

test('components: hub vs spoke, page-local classes left out, target mapped', () => {
  const index = new Map([['esa-badge', 'packages/ecology/src/components/esa-badge.astro'], ['bcn-acard', 'src/components/bcn/BcnActionCard.astro']]);
  const got = componentsOf(
    { classes: ['esa-badge', 'esa-badge--dot', 'bcn-acard__name', 'bcn-page-local'], tags: ['div', 'esa-badge'] },
    { spokePrefix: 'bcn', index, target: { map: { 'esa-badge': 'ui-badge' } } }
  );
  assert.deepEqual(got.map((c) => [c.name, c.origin, c.target]), [['bcn-acard', 'spoke', null], ['esa-badge', 'hub', 'ui-badge']]);
  assert.equal(blockRoot('esa-app-bar--brand'), 'esa-app-bar');
});

test('front door: index lists each prototype, compact when the full form passes the budget', () => {
  const bundles = [{
    dir: 'prototypes-actions', title: 'Actions', url: 'https://x/prototypes/actions/', generatedFrom: 'spec',
    sections: [{ label: 'Board', claudePath: 'claude/board.md', bytes: 12_288, specBytes: 12_288, files: 1, guide: { intent: 'The Kanban. More detail.' } }],
  }];
  const md = renderIndex('Beacon', bundles, { baseUrl: 'https://x/handoff/' });
  assert.match(md, /^# Beacon handoff\n\nLinks are relative to https:\/\/x\/handoff\//);
  assert.match(md, /\[README\]\(prototypes-actions\/README\.md\)/);
  assert.match(md, /- \[Board\]\(prototypes-actions\/claude\/board\.md\): The Kanban\. \(12 KB\)/);
  assert.match(md, /· 1 section$/m);
  const compact = renderIndex('Beacon', bundles, { baseUrl: 'https://x/handoff/', budget: 100 });
  assert.match(compact, /^Board$/m);
  assert.doesNotMatch(compact, /The Kanban/);
  assert.equal(oneLine('One. Two.'), 'One.');
  assert.deepEqual(normaliseData('src/a.ts').fixtures, ['src/a.ts']);
});

test('sizes: a split section lists its spec and part count, not the total', () => {
  assert.equal(sectionSize({ bytes: 222_000, specBytes: 19_500, files: 6 }), '19 KB, 5 parts');
  assert.equal(sectionSize({ bytes: 30_000, specBytes: 20_000, files: 2 }), '20 KB, 1 part');
  assert.equal(sectionSize({ bytes: 12_288, files: 1 }), '12 KB');
  const m = { title: 'P', url: 'u', generatedFrom: 'spec', sections: [{ label: 'List', claudePath: 'claude/list.md', bytes: 222_000, specBytes: 19_500, files: 6, shots: {} }] };
  assert.match(renderReadme(m, { urlFor: (n) => n }), /19 KB, 5 parts/);
});

test('behavior: the js files of a section are listed after Data, before the markup', () => {
  const [f] = renderSpec(
    { label: 'Rail', html: '<div></div>', css: '', tokens: [], js: ['src/search/page.client.ts'], data: 'src/data/a.ts' },
    { fileSlug: 'rail', budget: 10_000, prototype: 'P', sourceUrl: 'u', urlFor: (n) => n }
  );
  assert.match(f.text, /## Behavior\n\n- `src\/search\/page\.client\.ts`/);
  assert.ok(f.text.indexOf('## Data') < f.text.indexOf('## Behavior'));
  assert.ok(f.text.indexOf('## Behavior') < f.text.indexOf('## Markup'));
});

test('derived labels: never a bare tag', () => {
  // A tiny DOM stand-in: DERIVE_SECTIONS runs in the page, so give it one.
  const el = (localName, { text = '', kids = [], heading = null, aria = null } = {}) => {
    const node = {
      localName, id: '', children: kids, classList: [], parentElement: null,
      innerText: text, textContent: text,
      getClientRects: () => [1],
      getAttribute: (n) => (n === 'aria-label' ? aria : null),
      matches: (sel) => sel.split(',').includes(localName),
      querySelector: (sel) => (sel.startsWith('h') && heading ? { textContent: heading } : null),
      querySelectorAll: () => [],
    };
    for (const k of kids) k.parentElement = node;
    return node;
  };
  const kids = [
    el('h2', { text: 'Statement of work' }),
    el('div', { text: '\n  12  \nFunding summary\nmore' }),
    el('div', { text: '' }),
  ];
  const main = el('main', { kids });
  globalThis.document = { querySelector: (s) => (s === 'main' ? main : null), body: main, documentElement: {} };
  main.parentElement = globalThis.document.documentElement;
  try {
    assert.deepEqual(DERIVE_SECTIONS({ prefixes: ['cbf'] }).map((s) => s.label), ['Statement of work', 'Funding summary', 'Section 3']);
  } finally {
    delete globalThis.document;
  }
});
