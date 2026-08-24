# Tier-3 token reduction — 2026-08-16

**`@esa/ecology` cut its tier-3 (component) token surface from 306 declarations to 116.**
206 names changed. This page is the complete list and what to do about each.

## Who has to act

Every spoke. The two we could audit locally (cb-fish, air-exchange) lose **two
declarations between them**, both in cb-fish — the exemption list below protected
everything else they use. **We could not audit biochar, noria or ps-info**, so those three
should grep their own `src/` against the table at the bottom.

```bash
# in your spoke, after pulling the hub:
npm run doctor                              # now FAILS (not warns) on deleted names
node ../ecology/scripts/migrate-tokens.mjs  # dry run: prints every call site + what to read instead
```

## Read this before you find-and-replace

**An alias rescues a READ; it can never rescue a DECLARATION.** Tier 3 is the surface a
spoke *declares*, so these removals land on your theme file and on any component-scoped
instance override — and they land silently. `var(--gone)` does not fall back, it drops the
property; `--gone: value` simply stops being read by anything. Nothing errors either way.

**Do not mechanically rewrite a declaration to its destination.** The table's "read
instead" column is the role the hook *aliased*, which is the right answer for a READ and
usually the wrong one for a DECLARATION:

```css
/* You wrote this to re-skin CARDS only: */
.my-panel { --card-radius: 4px; }

/* This is NOT the equivalent — it moves every rounded surface in that scope: */
.my-panel { --radius-md: 4px; }
```

If one component genuinely must diverge from a role, that is a `/request-lego`, not a
substitution. This is why every row below is `removed: true` rather than a rename — a
rename row would have had the codemod perform exactly that substitution and report success.

## Why

Tier 3 is for three things: a **heavily variable component** (buttons), a **component
category** (`--form-*` across input/textarea/select), and **special cases** (focus ring,
data grid). The audit found **240 of 306 declarations held no value at all** — each a pure
alias over a tier-2 role, read by exactly one component. Fifteen different names aliased
`--color-content-default`; thirteen aliased `--color-border-default`.

That is not just redundant. Re-pointing `--color-background-elevation-floating` should move
the dialog, popover, dropdown, palette, confirm-dialog and search-panel together — six
hooks in front of it were six chances to move five and miss one, silently.

Full rationale: `packages/tokens/SPEC.md` § *The test: WOULD this component diverge, not
COULD it*.

## What survived

| Kept | Why |
|---|---|
| `--form-*` (12) | Component category — the framework's own example |
| `--focus-ring-*` (3) | Special case, and 35 components read it |
| `--button-*` (6) | Heavily variable; buttons diverge from fields by design |
| `--grid-*` (24) | Staged data-grid contract; under review next release cycle |
| 13 named hooks | A real spoke had actually overridden them |
| 48 literals | Micro-geometry (`--dialog-width`, `--avatar-size-md`) with no tier-1/2 home |

Note the exemptions are **per-name, not per-namespace**: `--card-bg` and
`--card-border-color` survive because spokes declare them, while `--card-radius` and
`--card-padding` do not. A hook is earned by demonstrated divergence.

## Also changed

- **`--fill-percent` → `--_fill-percent`** — was never a theming token; `esa-range-slider`
  writes it from JS every render. If you were setting it, stop: you were freezing the fill.
- **`--backdrop-filter` → `--side-dialog-backdrop-filter`** — the old name shadowed the CSS
  property at `:root`, so anything writing `backdrop-filter: var(--backdrop-filter)` picked
  up this component's `none`. Aliased, so reads still work.
- **`--color-link` → `--color-content-brand`** — a tier-2 name declared at tier 3.
- **608 fallback literals corrected across the kit.** These never fire while
  `@esa/tokens/component-tokens.css` is loaded, so nothing renders differently — but they
  described the pre-Radix palette (brand fell back to a *blue* `#43608a`; `--z-modal` fell
  back to `9999` against a real value of `400`). If you drop `esa-*` components into a page
  that does NOT load the token CSS, this is the fix.

## Every name that changed

`—` in the second column means there is no destination: the value has no tier-1/2 home, or
the capability was removed rather than moved. See the row's `why` in
`packages/tokens/migrations.json` for the reasoning.

| Removed / renamed | Read instead | migrations.json row |
|---|---|---|
| `--alert-box-dismiss-bg-hover` | `--color-background-overlay-strong-hover` | `alert-box-hooks-removed` |
| `--alert-box-padding` | `--spacing-300` | `alert-box-hooks-removed` |
| `--alert-box-radius` | `--radius-md` | `alert-box-hooks-removed` |
| `--app-bar-bg` | `--color-background-elevation-raised` | `app-bar-hooks-removed` |
| `--app-bar-brand-bg` | `--color-background-brand` | `app-bar-hooks-removed` |
| `--app-bar-brand-strong-bg` | `--color-background-default-knockout` | `app-bar-hooks-removed` |
| `--app-bar-brand-strong-text` | `--color-content-default-knockout` | `app-bar-hooks-removed` |
| `--app-bar-brand-text` | `--color-content-default-knockout` | `app-bar-hooks-removed` |
| `--app-bar-gap` | `--spacing-600` | `app-bar-hooks-removed` |
| `--app-bar-pad-x` | `--spacing-600` | `app-bar-hooks-removed` |
| `--app-bar-pad-y` | `--spacing-400` | `app-bar-hooks-removed` |
| `--app-bar-text` | `--color-content-default` | `app-bar-hooks-removed` |
| `--app-shell-wordmark-font` | `--typography-font-family-display` | `app-shell-hooks-removed` |
| `--app-shell-wordmark-size` | `--font-size-300` | `app-shell-hooks-removed` |
| `--app-shell-wordmark-tracking` | `--letter-spacing-tight` | `app-shell-hooks-removed` |
| `--app-shell-wordmark-weight` | `--typography-font-weight-bold` | `app-shell-hooks-removed` |
| `--avatar-radius` | `--radius-pill` | `avatar-hooks-removed` |
| `--avatar-text-color` | `--color-content-default-knockout` | `avatar-hooks-removed` |
| `--back-to-top-bg` | `--color-background-brand` | `back-to-top-hooks-removed` |
| `--back-to-top-bottom` | `--spacing-500` | `back-to-top-hooks-removed` |
| `--back-to-top-radius` | `--radius-pill` | `back-to-top-hooks-removed` |
| `--back-to-top-right` | `--spacing-500` | `back-to-top-hooks-removed` |
| `--back-to-top-text` | `--color-content-default-knockout` | `back-to-top-hooks-removed` |
| `--backdrop-filter` | `--side-dialog-backdrop-filter` | `backdrop-filter-namespaced` |
| `--badge-radius` | `--radius-sm` | `badge-hooks-removed` |
| `--breadcrumbs-separator-color` | `--color-border-default-strong` | `breadcrumbs-hooks-removed` |
| `--breadcrumbs-text-color` | `--color-content-default` | `breadcrumbs-hooks-removed` |
| `--card-footer-bg` | `--color-background-elevation-sunken` | `card-hooks-removed` |
| `--card-header-border-color` | `--color-border-default-subtle` | `card-hooks-removed` |
| `--card-header-color` | `--color-content-default` | `card-hooks-removed` |
| `--card-padding` | `--spacing-500` | `card-hooks-removed` |
| `--card-radius` | `--radius-md` | `card-hooks-removed` |
| `--collapsible-bg` | `--color-background-elevation-raised` | `collapsible-hooks-removed` |
| `--collapsible-border-color` | `--color-border-default` | `collapsible-hooks-removed` |
| `--collapsible-padding-x` | `--spacing-400` | `collapsible-hooks-removed` |
| `--collapsible-radius` | `--radius-md` | `collapsible-hooks-removed` |
| `--collapsible-title-color` | `--color-content-default` | `collapsible-hooks-removed` |
| `--color-link` | `--color-content-brand` | `color-link-to-content-brand` |
| `--command-palette-bg` | `--color-background-elevation-floating` | `command-palette-hooks-removed` |
| `--command-palette-border-color` | `--color-border-default` | `command-palette-hooks-removed` |
| `--command-palette-item-bg-active` | `--color-background-elevation-sunken` | `command-palette-hooks-removed` |
| `--command-palette-radius` | `--radius-lg` | `command-palette-hooks-removed` |
| `--command-palette-shadow` | `--elevation-6` | `command-palette-hooks-removed` |
| `--confirm-dialog-backdrop-bg` | `--color-background-overlay-backdrop` | `confirm-dialog-hooks-removed` |
| `--confirm-dialog-bg` | `--color-background-elevation-floating` | `confirm-dialog-hooks-removed` |
| `--confirm-dialog-border-color` | `--color-border-default-subtle` | `confirm-dialog-hooks-removed` |
| `--confirm-dialog-radius` | `--radius-lg` | `confirm-dialog-hooks-removed` |
| `--container-gutter` | `--spacing-600` | `container-hooks-removed` |
| `--danger-zone-bg` | `--color-background-utility-danger-subtle` | `danger-zone-hooks-removed` |
| `--danger-zone-border-color` | `--color-border-utility-danger` | `danger-zone-hooks-removed` |
| `--danger-zone-description-color` | `--color-content-default-secondary` | `danger-zone-hooks-removed` |
| `--danger-zone-heading-color` | `--color-content-utility-danger` | `danger-zone-hooks-removed` |
| `--danger-zone-padding` | `--spacing-300` | `danger-zone-hooks-removed` |
| `--danger-zone-radius` | `--radius-md` | `danger-zone-hooks-removed` |
| `--dialog-backdrop-bg` | `--color-background-overlay-backdrop` | `dialog-hooks-removed` |
| `--dialog-bg` | `--color-background-elevation-floating` | `dialog-hooks-removed` |
| `--dialog-border-color` | `--color-border-default-subtle` | `dialog-hooks-removed` |
| `--dialog-color` | `--color-content-default` | `dialog-hooks-removed` |
| `--dialog-radius` | `--radius-lg` | `dialog-hooks-removed` |
| `--dropdown-menu-bg` | `--color-background-elevation-floating` | `dropdown-menu-hooks-removed` |
| `--dropdown-menu-border-color` | `--color-border-default` | `dropdown-menu-hooks-removed` |
| `--dropdown-menu-item-color` | `--color-content-default` | `dropdown-menu-hooks-removed` |
| `--dropdown-menu-radius` | `--radius-md` | `dropdown-menu-hooks-removed` |
| `--empty-state-description-color` | `--color-content-default-secondary` | `empty-state-hooks-removed` |
| `--empty-state-gap` | `--spacing-200` | `empty-state-hooks-removed` |
| `--empty-state-icon-color` | `--color-content-default-muted` | `empty-state-hooks-removed` |
| `--empty-state-title-color` | `--color-content-default` | `empty-state-hooks-removed` |
| `--entity-search-bg` | `--color-background-elevation-floating` | `entity-search-hooks-removed` |
| `--entity-search-border-color` | `--color-border-default` | `entity-search-hooks-removed` |
| `--entity-search-radius` | `--radius-lg` | `entity-search-hooks-removed` |
| `--entity-search-row-bg-active` | `--color-background-elevation-sunken` | `entity-search-hooks-removed` |
| `--entity-search-selected-text` | `--color-content-default-knockout` | `entity-search-hooks-removed` |
| `--entity-search-shadow` | `--elevation-6` | `entity-search-hooks-removed` |
| `--fill-percent` | — | `fill-percent-removed` |
| `--filter-clear-color` | `--color-content-default-muted` | `filter-clear-button-hooks-removed` |
| `--filter-clear-color-hover` | `--color-content-utility-danger` | `filter-clear-button-hooks-removed` |
| `--filter-container-gap` | `--spacing-200` | `filter-container-hooks-removed` |
| `--filter-dropdown-bg` | `--color-background-elevation-raised` | `filter-dropdown-hooks-removed` |
| `--filter-dropdown-border` | `--color-border-default` | `filter-dropdown-hooks-removed` |
| `--filter-dropdown-border-color` | `--color-border-default` | `filter-dropdown-hooks-removed` |
| `--filter-dropdown-radius` | `--radius-md` | `filter-dropdown-hooks-removed` |
| `--filter-dropdown-shadow` | `--elevation-4` | `filter-dropdown-hooks-removed` |
| `--filter-pill-bg` | `--color-background-brand-muted` | `filter-pills-hooks-removed` |
| `--filter-pill-bg-hover` | `--color-background-brand-muted-hover` | `filter-pills-hooks-removed` |
| `--filter-pill-font-size` | `--typography-label-xs-font-size` | `filter-pills-hooks-removed` |
| `--filter-pill-label-color` | `--color-content-default-secondary` | `filter-pills-hooks-removed` |
| `--filter-pill-radius` | `--radius-pill` | `filter-pills-hooks-removed` |
| `--filter-pill-remove-color` | `--color-content-default-secondary` | `filter-pills-hooks-removed` |
| `--filter-pill-remove-color-hover` | `--color-content-utility-danger` | `filter-pills-hooks-removed` |
| `--filter-pill-text` | `--color-content-brand` | `filter-pills-hooks-removed` |
| `--form-radius-lg` | `--radius-md` | `form-radius-to-radius-scale` |
| `--form-radius-md` | `--radius-md` | `form-radius-to-radius-scale` |
| `--form-radius-sm` | `--radius-sm` | `form-radius-to-radius-scale` |
| `--form-radius-xs` | `--radius-sm` | `form-radius-to-radius-scale` |
| `--header-nav-avatar-bg` | `--color-background-brand` | `header-nav-hooks-removed` |
| `--header-nav-avatar-text` | `--color-content-default-knockout` | `header-nav-hooks-removed` |
| `--header-nav-border-color` | `--color-border-default` | `header-nav-hooks-removed` |
| `--header-nav-menu-item-color` | `--color-content-default-secondary` | `header-nav-hooks-removed` |
| `--icon-button-bg-hover` | `--button-chrome-bg-hover` | `icon-button-bg-hover-removed` |
| `--icon-link-font-size-md` | — | `icon-link-hooks-removed` |
| `--icon-link-font-size-sm` | — | `icon-link-hooks-removed` |
| `--icon-link-gap` | — | `icon-link-hooks-removed` |
| `--kbd-bg` | `--color-background-elevation-raised` | `kbd-hooks-removed` |
| `--kbd-border-color` | `--color-border-default` | `kbd-hooks-removed` |
| `--kbd-color` | `--color-content-default-muted` | `kbd-hooks-removed` |
| `--kbd-radius` | `--radius-sm` | `kbd-hooks-removed` |
| `--link-column-heading-font-size` | `--typography-label-md-font-size` | `link-column-hooks-removed` |
| `--link-column-item-font-size` | `--font-size-150` | `link-column-hooks-removed` |
| `--loading-overlay-bg` | `--color-background-elevation-raised` | `loading-overlay-hooks-removed` |
| `--loading-overlay-bg-transparent` | `--color-background-overlay-scrim` | `loading-overlay-hooks-removed` |
| `--loading-overlay-message-color` | `--color-content-default-secondary` | `loading-overlay-hooks-removed` |
| `--nav-dropdown-panel-bg` | `--color-background-elevation-raised` | `nav-dropdown-hooks-removed` |
| `--nav-dropdown-panel-border-color` | `--color-border-default` | `nav-dropdown-hooks-removed` |
| `--nav-dropdown-panel-padding` | `--spacing-300` | `nav-dropdown-hooks-removed` |
| `--nav-dropdown-panel-radius` | `--radius-md` | `nav-dropdown-hooks-removed` |
| `--nav-dropdown-panel-shadow` | `--elevation-4` | `nav-dropdown-hooks-removed` |
| `--nav-dropdown-panel-text` | `--color-content-default` | `nav-dropdown-hooks-removed` |
| `--pagination-bg` | `--color-background-elevation-raised` | `pagination-hooks-removed` |
| `--pagination-border-color` | `--color-border-default` | `pagination-hooks-removed` |
| `--pagination-button-color` | `--color-content-default` | `pagination-hooks-removed` |
| `--pagination-font-size` | `--typography-label-md-font-size` | `pagination-hooks-removed` |
| `--pagination-padding-x` | `--spacing-400` | `pagination-hooks-removed` |
| `--pagination-padding-y` | `--spacing-200` | `pagination-hooks-removed` |
| `--pagination-text-color` | `--color-content-default-secondary` | `pagination-hooks-removed` |
| `--pill-bg` | `--color-background-elevation-sunken` | `pill-hooks-removed` |
| `--pill-border-color` | `--color-border-default-subtle` | `pill-hooks-removed` |
| `--pill-radius` | `--radius-sm` | `pill-hooks-removed` |
| `--pill-remove-bg-hover` | `--color-background-overlay-heavy-hover` | `pill-hooks-removed` |
| `--pill-text-color` | `--color-content-default` | `pill-hooks-removed` |
| `--pillbox-gap-large` | `--spacing-300` | `pillbox-hooks-removed` |
| `--pillbox-gap-medium` | `--spacing-200` | `pillbox-hooks-removed` |
| `--pillbox-gap-small` | `--spacing-100` | `pillbox-hooks-removed` |
| `--popover-bg` | `--color-background-elevation-raised` | `popover-hooks-removed` |
| `--popover-border-color` | `--color-border-default` | `popover-hooks-removed` |
| `--popover-color` | `--color-content-default` | `popover-hooks-removed` |
| `--popover-radius` | `--radius-md` | `popover-hooks-removed` |
| `--progress-bar-fill-bg` | `--color-background-brand` | `progress-bar-hooks-removed` |
| `--progress-bar-radius` | `--radius-pill` | `progress-bar-hooks-removed` |
| `--progress-bar-track-bg` | `--color-background-elevation-sunken` | `progress-bar-hooks-removed` |
| `--radius-card` | `--radius-md` | `radius-roles-to-scale` |
| `--radius-control` | `--radius-sm` | `radius-roles-to-scale` |
| `--radius-overlay` | `--radius-lg` | `radius-roles-to-scale` |
| `--radius-surface` | `--radius-md` | `radius-roles-to-scale` |
| `--search-panel-bg` | `--color-background-elevation-floating` | `search-panel-hooks-removed` |
| `--search-panel-result-bg-hover` | `--color-background-elevation-sunken` | `search-panel-hooks-removed` |
| `--side-dialog-backdrop-bg` | `--color-background-overlay-backdrop` | `side-dialog-hooks-removed` |
| `--side-dialog-bg` | `--color-background-elevation-raised` | `side-dialog-hooks-removed` |
| `--side-dialog-border-color` | `--color-border-default` | `side-dialog-hooks-removed` |
| `--side-dialog-radius` | `--radius-md` | `side-dialog-hooks-removed` |
| `--sidenav-active-border-color` | `--color-background-brand` | `sidebar-nav-hooks-removed` |
| `--sidenav-bg` | `--color-background-elevation-sunken` | `sidebar-nav-hooks-removed` |
| `--sidenav-border` | `--color-border-default-subtle` | `sidebar-nav-hooks-removed` |
| `--sidenav-border-color` | `--color-border-default-subtle` | `sidebar-nav-hooks-removed` |
| `--sidenav-icon-gap` | `--spacing-200` | `sidebar-nav-hooks-removed` |
| `--sidenav-item-padding-x` | `--spacing-300` | `sidebar-nav-hooks-removed` |
| `--sidenav-link-bg-active` | `--color-background-brand-subtle` | `sidebar-nav-hooks-removed` |
| `--sidenav-link-bg-hover` | `--color-background-elevation-sunken` | `sidebar-nav-hooks-removed` |
| `--sidenav-link-text` | `--color-content-default-secondary` | `sidebar-nav-hooks-removed` |
| `--sidenav-link-text-active` | `--color-content-brand` | `sidebar-nav-hooks-removed` |
| `--sidenav-link-text-hover` | `--sidenav-link-text` | `sidebar-nav-hooks-removed` |
| `--sidenav-link-weight-active` | `--typography-font-weight-semibold` | `sidebar-nav-hooks-removed` |
| `--sidenav-nested-indent` | `--spacing-400` | `sidebar-nav-hooks-removed` |
| `--sidenav-section-spacing` | `--spacing-300` | `sidebar-nav-hooks-removed` |
| `--sidenav-section-text` | `--color-content-default-muted` | `sidebar-nav-hooks-removed` |
| `--snackbar-item-bg-danger` | `--color-content-utility-danger` | `snackbar-item-hooks-removed` |
| `--snackbar-item-bg-info` | `--color-content-utility-info` | `snackbar-item-hooks-removed` |
| `--snackbar-item-bg-success` | `--color-content-utility-success` | `snackbar-item-hooks-removed` |
| `--snackbar-item-bg-warning` | `--color-content-utility-warning` | `snackbar-item-hooks-removed` |
| `--snackbar-item-color` | `--color-content-default-knockout` | `snackbar-item-hooks-removed` |
| `--snackbar-item-danger-bg` | `--color-content-utility-danger` | `snackbar-item-hooks-removed` |
| `--snackbar-item-info-bg` | `--color-content-utility-info` | `snackbar-item-hooks-removed` |
| `--snackbar-item-radius` | `--radius-md` | `snackbar-item-hooks-removed` |
| `--snackbar-item-success-bg` | `--color-content-utility-success` | `snackbar-item-hooks-removed` |
| `--snackbar-item-warning-bg` | `--color-content-utility-warning` | `snackbar-item-hooks-removed` |
| `--stat-gap` | `--spacing-050` | `stat-hooks-removed` |
| `--stat-label-color` | `--color-content-default-secondary` | `stat-hooks-removed` |
| `--stat-label-size` | `--font-size-200` | `stat-hooks-removed` |
| `--stat-label-weight` | `--typography-font-weight-medium` | `stat-hooks-removed` |
| `--stat-sub-color` | `--color-content-default-muted` | `stat-hooks-removed` |
| `--stat-sub-size` | `--font-size-150` | `stat-hooks-removed` |
| `--stat-value-font` | `--typography-font-family-display` | `stat-hooks-removed` |
| `--stat-value-weight` | `--typography-font-weight-bold` | `stat-hooks-removed` |
| `--switch-toggle-label-color` | `--color-content-default` | `switch-toggle-hooks-removed` |
| `--switch-toggle-thumb-bg` | `--color-background-elevation-raised` | `switch-toggle-hooks-removed` |
| `--switch-toggle-track-bg` | `--color-border-default-strong` | `switch-toggle-hooks-removed` |
| `--switch-toggle-track-bg-checked` | `--color-background-brand` | `switch-toggle-hooks-removed` |
| `--tab-layout-border-color` | `--color-border-default` | `tab-layout-hooks-removed` |
| `--tab-layout-color` | `--color-content-default-secondary` | `tab-layout-hooks-removed` |
| `--tab-layout-color-active` | `--color-background-brand` | `tab-layout-hooks-removed` |
| `--tab-layout-indicator-color` | `--color-background-brand` | `tab-layout-hooks-removed` |
| `--tooltip-bg` | `--color-background-default-knockout` | `tooltip-hooks-removed` |
| `--tooltip-color` | `--color-content-default-knockout` | `tooltip-hooks-removed` |
| `--tooltip-radius` | `--radius-sm` | `tooltip-hooks-removed` |
| `--topbar-bg` | — | `topbar-chrome-exempt-removed` |
| `--topbar-border` | — | `topbar-chrome-exempt-removed` |
| `--topbar-border-color` | — | `topbar-chrome-exempt-removed` |
| `--topbar-icon-bg` | — | `topbar-chrome-exempt-removed` |
| `--topbar-icon-bg-hover` | — | `topbar-chrome-exempt-removed` |
| `--topbar-icon-color` | — | `topbar-chrome-exempt-removed` |
| `--topbar-icon-color-hover` | — | `topbar-chrome-exempt-removed` |
| `--topbar-icon-radius` | — | `topbar-chrome-exempt-removed` |
| `--topbar-search-bg` | — | `topbar-chrome-exempt-removed` |
| `--topbar-search-bg-hover` | — | `topbar-chrome-exempt-removed` |
| `--topbar-search-radius` | — | `topbar-chrome-exempt-removed` |
| `--topbar-search-text` | — | `topbar-chrome-exempt-removed` |
| `--topbar-shadow` | — | `topbar-chrome-exempt-removed` |
