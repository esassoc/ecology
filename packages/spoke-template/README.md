# Ecology Spoke Template

The canonical starting point for a new **design-system spoke** of the ESA Ecology
hub. This directory is an **inert template**: its manifest is stored as
`package.json.tmpl` (not `package.json`) so the monorepo's `packages/*` workspace
glob ignores it and `npm install` never tries to build it. Files contain
`__PLACEHOLDER__` tokens that get substituted when the template is instantiated.

The `/spoke-init` command clones this template into a new repo and fills the
placeholders automatically. You can also do it by hand (steps below).

## What a spoke is

A spoke is a child of the **`@esa/ecology` hub** — its own Astro repo that:

1. depends on the hub packages,
2. ships a thin `theme-<slug>.css` of **semantic/component token overrides**
   (the brand layer — primitives never move), and
3. dogfoods the inherited `esa-*` components + builds project-specific prototypes
   on top of them.

The hub owns the design *standard* and the reference implementation; a spoke
re-skins it and adds its own catalog + prototypes. Patterns that prove broadly
useful get promoted back up to the hub.

## The 4-package contract

A spoke depends on four packages from the sibling `../ecology` checkout:

| Package | Dep type | Role |
|---|---|---|
| `@esa/tokens` | dependency | Primitives + default semantic tokens (`tokens.css`, `component-tokens.css`). |
| `@esa/ecology` | dependency | The `esa-*` components (`.astro` + Lit web components). |
| `@esa/docs` | dependency | The shared `DocsShell` + token-driven foundation components (`ColorFoundation`, `TypeFoundation`, …). |
| `@esa/handoff` | devDependency | Dev-mode handoff export (rendered prototype → de-scoped HTML/CSS bundle). |

Plus `astro` (dependency) and `gh-pages` (devDependency, for the GitHub Pages
deploy). All four `@esa/*` deps use `file:../ecology/packages/*` links, so the
spoke must live as a sibling of the `ecology` checkout.

## Placeholder legend

Substitute every occurrence of each token across every file (including the
`theme-__SPOKE_SLUG__.css` filename itself):

| Placeholder | Meaning | Example |
|---|---|---|
| `__SPOKE_NAME__` | Display name (titles, brand chrome, prose) | `Beacon` |
| `__SPOKE_SLUG__` | Lowercase id (`data-theme`, theme filename, DocsShell `theme` prop) | `beacon` |
| `__SPOKE_DIR__` | Repo/dir name + GitHub Pages base | `beacon-design` |
| `__SCOPE__` | npm scope; package name becomes `@__SCOPE__/design`; raw token prefix `--__SCOPE__-*` | `beacon` |
| `__BRAND_MARK__` | Short text mark for the sidebar | `B` |
| `__FONT_LINKS__` | Where the brand's Google Fonts `<link>` tags go | `<link href="…DM+Sans…" rel="stylesheet" />` |
| `__SPOKE_TAGLINE__` | One-line description for the landing hero | `The brand language, patterns, and prototypes for the Beacon platform` |

## Token-driven foundations

The five **Foundations** pages (`color`, `typography`, `spacing`, `radius`,
`iconography`) are generic and ship ready to go — they render live from the
active theme via `@esa/docs` components. The only per-spoke edit is in
`color.astro`: pass this spoke's own primitive ramp(s) via the `ramps` prop (a
`TODO(spoke-init)` comment marks the spot).

## The component catalog is per-spoke

`src/data/ds-nav.ts` ships a **scaffold** `componentGroups` array with one example
entry (Button → `esa-button`), and `src/pages/design-system/components/` ships
exactly one page (`esa-button.astro`) demonstrating the `ComponentDoc` pattern.

Populate the rest per spoke:

- **If the source app has a catalog** (e.g. an Angular `ui-catalog`), mirror its
  sections and entries, mapping each `ui-*` component to its `@esa/ecology`
  `esa-*` equivalent.
- **Otherwise**, curate: list the `esa-*` components this spoke actually uses,
  grouped into sensible sections.

For each catalog entry, add a `NavItem` in `ds-nav.ts` **and** a sibling page
under `src/pages/design-system/components/<slug>.astro` (copy `esa-button.astro`
as the template).

## Instantiating by hand

1. Copy this directory to a new sibling of `../ecology`, named `__SPOKE_DIR__`
   (e.g. `../beacon-design`).
2. Rename `package.json.tmpl` → `package.json`.
3. Rename `src/styles/theme-__SPOKE_SLUG__.css` → `theme-<slug>.css`.
4. Find-and-replace every placeholder from the legend above across all files.
5. Insert the brand's Google Fonts `<link>` tags at `__FONT_LINKS__` in
   `src/layouts/BaseLayout.astro` and `src/layouts/DocsLayout.astro`.
6. Fill in `src/styles/theme-<slug>.css` — work through sections (1)–(7),
   replacing each `/* __FILL__ */` marker and placeholder value. Reference
   `../beacon-design/src/styles/theme-beacon.css` as a worked example.
7. Populate `src/data/ds-nav.ts` `componentGroups` + add the matching
   `src/pages/design-system/components/*.astro` pages (see "catalog" above).
8. Pass the spoke's primitive ramp(s) into `color.astro` via `ramps`.
9. `npm install && npm run dev` to verify, then build prototypes.

`/spoke-init` automates steps 1–6 (and scaffolds 7–8 from the source app's
catalog where one exists).

## File tree

```
__SPOKE_DIR__/
├─ package.json            (from package.json.tmpl)
├─ astro.config.mjs        base = /__SPOKE_DIR__/ in prod
├─ tsconfig.json
├─ .gitignore
├─ .nojekyll               so GitHub Pages serves _astro/
├─ README.md
└─ src/
   ├─ lib/base.ts          withBase() — base-aware path helper
   ├─ layouts/
   │  ├─ BaseLayout.astro     data-theme + fonts + global CSS
   │  ├─ DocsLayout.astro     DocsShell wrapper (sidebar/topbar/chrome)
   │  └─ ComponentDoc.astro   per-component doc page wrapper
   ├─ data/
   │  ├─ ds-nav.ts            sidebar nav (foundations + scaffold catalog)
   │  └─ prototypes.ts        prototype registry (starts empty)
   ├─ styles/
   │  └─ theme-__SPOKE_SLUG__.css   the brand theme skeleton
   └─ pages/
      ├─ index.astro                 landing (layers + prototype list)
      ├─ patterns/index.astro        pattern library (coming soon)
      └─ design-system/
         ├─ index.astro              design-system home
         ├─ foundations/             color, typography, spacing, radius, iconography
         └─ components/
            └─ esa-button.astro      the one example component page
```
