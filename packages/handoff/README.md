# @esa/handoff

Turns a spoke's prototypes into bundles a coding agent in another codebase can
read from one link: what each section is for, a picture of it, its markup and
styles at a size a web fetch can take, its tokens, the components to reuse, and
the data behind it.

One pipeline for every spoke. A prototype with an authored spec
(`src/data/handoff/<slug>.mjs`) is captured section by section with its guidance;
one without gets sections derived from its page structure and goes through the
same capture.

## Commands

Run from the spoke root.

```bash
npx handoff all                     # every prototype in the registry
npx handoff all actions help        # only these slugs
npx handoff all --changed           # only routes whose inputs changed since the last run
npx handoff all --skip-build        # reuse dist/ instead of running astro build
npx handoff all --port 4398         # capture on another port
npx handoff check                   # the guidance gate, every route
npx handoff check --changed --base <ref>   # only routes touched since <ref>
npx handoff <url> --name <dir>      # one page that is already being served
```

`all` builds with `NODE_ENV=production`, serves `astro preview`, and captures
in one shared Chromium, several routes at a time.

## Spoke config: `handoff.config.mjs`

```js
export default {
  name: 'Beacon',
  site: 'https://esassoc.github.io',   // every link in a spec is the deployed URL
  base: '/beacon-design/',             // the production base
  registry: 'src/data/prototypes.ts',  // slug / title / description / route rows
  specs: 'src/data/handoff',
  out: 'public/handoff',
  components: 'src/components',
  baseline: 'scripts/handoff-guidance-baseline.mjs', // slugs excused from the gate
  port: 4399,
  spokePrefix: 'bcn',                  // the spoke's own component classes
  viewports: { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } },
  budget: 48000,                       // bytes per spec file before it splits
  target: {                            // optional: what the receiving app already has
    name: 'the Beacon app',
    map: { 'esa-badge': 'ui-badge', 'esa-button': 'ui-button' },
  },
};
```

## Authored spec: `src/data/handoff/<slug>.mjs`

```js
export default {
  data: {                                  // optional, printed as a Data section
    fixture: 'src/data/action-tracking.ts',
    store: 'src/lib/action-board.ts',
    fields: { dueDate: 'ISO, or null when unscheduled' },
    enums: { category: ['NotStarted', 'InProgress', 'Completed'] },
    notes: ['category is prod’s ActionImplementationStatusDtoEnum.'],
  },
  sections: [
    {
      label: 'Board',
      selector: '.bcn-aboard',
      apply: [{ click: '[data-open]' }],  // optional recipe to reach a state
      intent: '…', decisions: ['…'], gotchas: ['…'], acceptance: ['…'],
      data: { … },                         // optional, overrides the page-level data
      js: ['src/lib/board.client.ts'],     // optional, the files behind its behaviour
    },
  ],
};
```

`apply` ops: `click`, `fill: [sel, text]`, `clear`, `clickText: [sel, name, role?]`,
`key`. The same recipe drives the live page when a section is picked in the Handoff panel.

A page behind a client-side gate takes a page-level `storage: { session: { key: value }, local: { … } }`,
seeded before the page loads, so capture runs past the gate on the flag the gate sets itself.
Never a password: `storage` is read at capture only and written into no bundle file, while an
`apply` recipe ships in the manifest.

## Output (`<out>/`)

| File | What |
|---|---|
| `index.md` | Every prototype: sections with a one-line intent, links, sizes. |
| `<route>/README.md` | One prototype: its sections, specs and screenshots. |
| `<route>/claude/<section>.md` | The section spec: picture, guidance, components, data, markup, styles, tokens. |
| `<route>/claude/<section>.{desktop,phone}.png` | The section at both widths. |
| `<route>/claude/<section>.markup[-n].md` | Markup and styles, when the spec would pass the budget. |
| `<route>/manifest.json` | What the Handoff panel reads. |

How a spec stays readable: runs of four or more like siblings keep their first
two (and each further class variant) and become one comment, `<script>` and
`<style>` inside a section are dropped with a size note, long attribute values
are cut, and whatever is still over budget splits into parts.

Styles are selected deterministically: every rule of every stylesheet, kept when
its selector names a class in the section on a word boundary, `@media` wrappers
preserved. Chrome's coverage pass is gone; it varied with paint timing.

## The Handoff panel

`HandoffInspector.astro`, mounted in a spoke's BaseLayout, puts a **Handoff**
pill at the bottom right of every route that has a bundle (Control+Option+D
also opens it). The panel lists the route's sections; picking one outlines it
on the page and replays its `apply` recipe, and a click inside a section on the
page picks it. Each section shows its guidance, components, data and tokens,
links its spec, screenshots and parts, and **Copy for Claude** copies the
prototype's README link and the section's spec link.

The pane is the design layer's (`@esa/design-layer/handoff`): under `astro dev`
with the design layer on, the same pane is its **Handoff** tab and this one
stays out of the way.

## Notes

- Build-time only. `playwright` and `prettier` never reach a spoke's runtime.
- Change detection hashes each route's page, spec and local imports, plus global
  styles, layouts, the token sheet and this package's source.
