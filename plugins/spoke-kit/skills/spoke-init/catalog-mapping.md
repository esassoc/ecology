# Catalog — source ui-* → esa-* mapping + dogfood-page porting

The component catalog (`src/data/ds-nav.ts` + `src/pages/design-system/components/*.astro`)
is **per-spoke**. The template ships exactly one entry (Button → `esa-button`) as
the shape. Populate the rest two ways.

## If the source app has its own UI catalog

Mirror it. Beacon's `Beacon.Web/src/app/pages/ui-catalog/ui-catalog.component.ts`
has a machine-readable nav config (sections + entries). For each source `ui-*`
component:

1. Map it to its `@esa/ecology` `esa-*` equivalent (table below).
2. Add a `NavItem` to the matching `NavGroup` in `ds-nav.ts`.
3. Add a sibling page `src/pages/design-system/components/<slug>.astro`.

Mirror the source's **section structure** (Form Inputs / Actions / Navigation /
Overlays for Beacon), not the hub's grouping.

### Known ui-* → esa-* renames

| Source `ui-*` | Ecology `esa-*` | Note |
|---|---|---|
| `ui-toggle` | `esa-switch-toggle` | |
| `ui-tag` | `esa-input-tag` | |
| `ui-toast` | `esa-alert-box` | Light alert look, NOT the dark snackbar |
| `ui-dropdown` | `esa-dropdown-menu` | |
| `ui-tabs` | `esa-tab-layout` | |
| `ui-search-select` | `esa-combobox` | |

Most others are a direct `ui-x` → `esa-x` (button, text-field, textarea, checkbox,
select, button-toggle, date-picker, popover, dialog, icon-button). Confirm the slug
exists in `packages/ecology/src/components/` (or
list it from `apps/site/src/pages/components/`) before adding the page.

## If there is no source catalog

Curate a sensible subset: list the `esa-*` components this spoke actually uses,
grouped into reasonable sections. Don't document the entire hub kit — only what the
spoke composes.

## Porting dogfood pages (the clean part)

The hub's dogfood site ships a brand-neutral doc page per component at
`apps/site/src/pages/components/<slug>.astro`.
These use the same `@esa/docs` primitives (`Section`, `Preview`, `Api`,
`ComponentDoc`) the spoke uses, so porting is mechanical:

1. Copy the hub page → `src/pages/design-system/components/<slug>.astro`.
2. **Fix the import-path depth.** Hub pages live at `pages/components/`
   (`../../layouts/ComponentDoc.astro`); spoke pages live at
   `pages/design-system/components/` — one level deeper
   (`../../../layouts/ComponentDoc.astro`). Adjust every relative `../` import.
3. **Change `category=` / `name=`** to match the spoke's catalog section.
4. Leave the `@esa/*` imports untouched — they resolve identically in the spoke.

The page renders the inherited component wearing the spoke's skin automatically
(it reads the active `[data-theme]`); no per-page brand edits are needed.

## Brand mark

Wire the source's logo SVG into the DocsLayout brand-mark slot if available;
otherwise keep the lettered `__BRAND_MARK__` substitution.

## Foundations are NOT catalog pages

The five Foundations pages (color, typography, spacing, radius, iconography) ship
ready and render live from the theme via `@esa/docs` token-driven components.
**Never hand-roll them.** The only per-spoke edit: pass the spoke's primitive
ramp(s) into `color.astro` via the `ramps` prop (a `TODO(spoke-init)` comment marks
the spot) so the Color foundation shows the brand ramp defined in the theme.
