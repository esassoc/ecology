# @esa/design-layer

A panel in a spoke's dev toolbar for tuning its tokens live and leaving
comments on the page. It runs only under `npm run dev`; a build never loads it.
What you tune lands in an override file beside the spoke, never in its token
files.

## Turn it on

A spoke made by `/spoke-init` already has it. For an older spoke:

```bash
npm install --save-dev ../ecology/packages/design-layer
```

```js
// astro.config.mjs
import designLayer from '@esa/design-layer/astro';
export default defineConfig({ integrations: [designLayer()] });
```

Open it with **Control+Option+D**, the **Design** pill at the bottom right, or
the palette icon in Astro's dev toolbar.

## What the panel does

**Tune**, per light and dark mode:

- **Palette**: 16 whole themes in three groups (Ecology Directions, References,
  Tech-Forward). Each sets the chrome surfaces, card and sunken fills, hover,
  three border strengths, two inks and the brand roles. The three chrome
  surfaces (top bar, sidenav, canvas) then tune as one ramp: a shared hue and
  saturation, the canvas lightness, and each surface's offset from it, graded
  live against the surface recipe ([surface-recipe.md](surface-recipe.md)).
- **Colors**: text, secondary text and accent, with contrast against each surface.
- **Fonts**: base and headline faces. Google faces load on pick.
- **Sizes**: each type role's size and weight. A weight is any whole number on
  the face's own axis; 350 is refused (regular is 400).
- **Components**: lengths such as row padding and radius.

Sizes and Components show the reference spoke's value (Beacon by default) as a
tick on each slider, a note where you depart from it, and a button that applies
all of it.

**Comments**: turn on Comment Mode, click an element, write a note. Each note
records the page, a selector, the element's text, its Astro source file and
line, and its computed colour, background and font.

## Where things land

In `design/` at the spoke root (or the config's `dataDir`):

| File | What |
|---|---|
| `tweaks.json` | The overrides: `light`, `dark`, `shared`, the palette per mode, and `departures` (every value that differs from the reference). |
| `tweaks.css` | The same overrides as CSS, loaded on every dev page so they survive a reload. |
| `feedback.jsonl` | One comment per line, `open` or `resolved`. |

## Save to Source

The override file is a proposal. **More → Save to Source…** lists every
component- and token-scope edit by the file it will change (old → new) and
writes them on Save; what it wrote leaves the tweaks. Instance edits stay as
overrides.

| Edit | Lands in |
|---|---|
| A value already declared in a hand-authored theme file | That declaration, edited in place. A light edit in a block both schemes read restates dark's current value. |
| A spoke's token-scope colour, with a recipe (`theme-<slug>.json`) | The recipe's `pinned` / `pinnedDark`, then `make-theme.mjs` regenerates the CSS. The generated file is never edited. |
| Anything else in a spoke | One block between `design-layer:start` and `design-layer:end` at the end of the theme file (`theme-app.css`, else `theme-<slug>.css`), merged on each save. |
| The hub's token scope | The DTCG json (`var(--x)` becomes `{x}`), then the token build. Dark goes to `docs-dark.css` where it is declared. |
| The hub's component scope | `component-tokens.css`, for declared tier-3 names only. A tier-2 value on one component is refused: that is a new hook, a SPEC.md decision. |

Primitives are refused at token scope. A component selector that only exists
in dev (`[data-dl-component]`) is refused. A spoke's save never writes outside
the spoke. `sourceFiles` in the config overrides any of the files it finds.
A hex edit replacing an `rgb()` or `hsl()` declaration is written in that format.

### Picks are stored as intent

The variable picker lists concepts, one row per meaning: **Label Strong**
stands for its five `--typography-label-<size>-strong-*` tokens and shows the
value of the one that fits here (the rung whose value the field already holds,
then the selection's `size`, then `md`). Semantic colours, spacing, radius and
elevation are on the main list. Primitives and component aliases are under
**Show All Variables** at the foot (remembered).

A pick records what it meant, in `tweaks.json` beside the value:

```ts
interface Intent {
  key: string;          // the edit: scope|selector|mode|var
  concept: string;      // "Typography / Label Strong · font-size"
  chosen: string;       // the token the value is bound to
  value: string;        // what it resolved to when picked
  candidates: string[]; // every token it could mean here
  context: { mode: 'light' | 'dark' | 'shared'; size: string | null; scope: 'component' | 'token' | 'instance' | 'variant'; selection: string | null };
}
```

One candidate (a concept with no size axis, or a rung the field's own value
picked on an edit that cannot span sizes) and Save to Source writes the token.
More than one and it writes no token: the edit is listed under **Needs a Coding
Pass** and a line goes into the design-layer block, replaced on a later save:

```css
/* design-layer:todo [data-theme="x"] .esa-button --button-font-size: wants Typography / Label · font-size (picked --typography-label-md-font-size); candidates --typography-label-sm-font-size | --typography-label-md-font-size */
```

The edit stays live until a developer maps it. Typing a value forgets the intent.

### Colour fields

Six hex digits, uppercase, no `#`, with opacity in its own percent field. The
swatch opens the colour picker; its format menu (Hex, RGB, HSL) is remembered.
A stored value keeps the format its source token is written in.

## Config

Optional. Without one, the panel edits the hub's own tier-2 and tier-3 names
(`src/defaults.mjs`). To change which variables it edits, add
`design-layer.config.mjs` at the spoke root. Every key is optional; a list you
give replaces the default list, and `roles` and `reference.values` merge per key.
Editing the file restarts the dev server.

```js
// design-layer.config.mjs
import { defineConfig } from '@esa/design-layer/defaults';

export default defineConfig({
  dataDir: 'design',
  // Palette role → the variables it writes, merged over the hub's.
  roles: { bar: ['--app-topbar-bg'] },
  colors: [{ id: 'text', label: 'Text', cssVar: '--color-content-default' }],
  inks: ['text'],
  fonts: [{ id: 'base', label: 'Base', cssVar: '--typography-font-family-sans' }],
  sizes: [
    { id: 'h1', label: 'H1', cssVar: '--typography-heading-lg-font-size',
      weightVar: '--typography-heading-lg-font-weight', min: 18, max: 48, font: 'base' },
  ],
  lengths: [
    { id: 'radius', label: 'Radius', cssVar: '--radius-md', min: 0, max: 16, step: 1 },
    // group: 'sizes' shows a length under Sizes instead of Components.
    { id: 'icon-nav', label: 'Nav Icon', cssVar: '--sidenav-icon-size', min: 12, max: 32, step: 1, group: 'sizes' },
  ],
  // Ticks and the preset button. null turns them off; replace: true drops Beacon's values.
  reference: { name: 'Beacon', values: { h1: { size: 24, weight: 650 }, radius: 4 } },
  // A variable renamed since tweaks.json was saved: old → the variables it now sets.
  legacy: { '--old-card-pad': ['--card-pad-y', '--card-pad-x'] },
});
```

The palette roles are `bar`, `rail`, `canvas`, `raised`, `sunken`, `hover`,
`border`, `borderSubtle`, `borderStrong`, `text`, `textSecondary`, `primary`,
`primaryHover`, `onPrimary`, `accentMuted`, `accentText` and `focus`. By
default the chrome follows the house rule: canvas is
`--color-background-default`, the top bar `--color-background-elevation-raised`,
the sidenav `--color-background-elevation-sunken`, and a palette's card fill
goes to `--card-bg`.

## Layout

- `src/`: the core, in plain TypeScript with no framework imports. It holds
  the panel (`panel.ts`, mounted with `mountPanel(shadowRoot, host, config)`),
  the controls and stylesheet writer, palettes, the surface recipe, colour math,
  the comment-mode helpers, the config defaults (`defaults.mjs`) and the
  file store (`store.mjs`, Node).
- `astro/`: the Astro adapter. It holds the dev-toolbar app, the integration,
  the tweaks route and the channel to the store. Another framework's dev server
  needs only its own version of this folder.
