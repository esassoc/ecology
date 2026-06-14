---
name: component-first
description: MANDATORY before building ANY UI in this @esa/ecology spoke — components, forms, dialogs, drawers, dropzones, file uploads, buttons, cards, badges, pills, chips, empty states, tooltips, AND page layout/composition (layouts.css primitives, type-roles, page-header/stat/app-shell, filter bars, omniboxes). Triggers on editing .astro/.css/.scss, and on "make a component", "style this", "lay out this page", "add a modal/drawer/dropzone/file upload". Enforces the Ecology → Beacon → bcn- lookup order. NEVER hand-roll a UI primitive OR bespoke flex/grid CSS that an esa-* lego or layout primitive already provides.
---

# Component-First (Legos, Never Reinvent)

## Purpose
This repo is an **Astro spoke of `@esa/ecology`**. Its entire job is to *compose existing `esa-*` web components*, not to hand-roll bespoke CSS/HTML primitives. Every reinvented control is a bug — it drifts from the design system, duplicates tested behavior, and rots.

A **PreToolUse hook** (`.claude/hooks/check-component-first`) blocks Write/Edit/MultiEdit that introduces bespoke UI primitives. This skill is how you stay ahead of it.

## The Non-Negotiable Lookup Order

When ANY UI is needed, walk these tiers **in order**. Stop at the first hit.

### 1. Check Ecology FIRST — the `esa-*` legos
The components live at `node_modules/@esa/ecology/src/components/` (a `file:` symlink to the sibling `ecology` checkout, so this is always the live source).

**List the current catalog — the source of truth, it grows:**
```bash
ls node_modules/@esa/ecology/src/components/
```

Import depends on the file extension you saw in the `ls`:
- **`.astro` component** → import in frontmatter: `import EsaCard from '@esa/ecology/esa-card.astro';`
- **`.ts` web component** → register it in a client `<script>`: `import '@esa/ecology/esa-dialog';` then use the `<esa-dialog>` custom element in markup.

**Ecology is more than atoms — reach for the COMPOSITION layer before writing CSS:**
- **Layout primitives** (`@esa/tokens/layouts.css`): `.stack` `.cluster` `.repel` `.grid`
  `.sidebar` `.switcher` `.frame` `.reel` — composable utility classes, gap via
  `data-gap="xs|sm|md|lg|xl"`, per-primitive knobs like `--grid-min`. Use these instead of
  bespoke flex/grid CSS.
- **Typography roles** (`@esa/tokens/type-roles.css`): `.type-page-title` `.type-card-title`
  `.type-body` `.type-label` … — style text with role classes, **never** raw `--type-size-*`
  in pages.
- **Mid-tier legos**: `esa-page-header` (title/lede/actions), `esa-stat` (value/label/sub/
  accent), `esa-app-shell` (the canonical neutral chrome).
- **Pattern catalog** — composed patterns (filter bars, omniboxes) already solved in spoke
  prototype pages. Find them before rebuilding. See [lego-lookup.md](lego-lookup.md). A page
  should read like a **manifest of legos + utilities**, not 250+ lines of bespoke `<style>`.

### 2. Check esassoc/Beacon NEXT — the prod app (optional tier — requires the Beacon repo cloned)
If no `esa-*` fits, the production app may already have the pattern. Port it faithfully (tokens, structure). Skip this tier if `~/Dev/Beacon` isn't on your machine:
```bash
ls ~/Dev/Beacon/Beacon.Web/src/app/shared/ui/components/   # Angular ui-* components
grep -rn "PATTERN" ~/Dev/Beacon/Beacon.Web/src/scss/        # SCSS / tokens
```
Beacon's `ui-*` components map closely to `esa-*` — find the one you need there for behavior/markup reference, then build it with the `esa-*` lego or as a `bcn-` component.

### 3. ONLY THEN build a `bcn-` component
If — and only if — nothing exists in either tier, create a **real, reusable, documented** component with a `bcn-` class prefix. Not a one-off page blob. See [bcn-authoring.md](bcn-authoring.md).

## The esa-* Catalog (run the `ls` for the live list)

```
esa-alert-box      esa-app-bar        esa-avatar         esa-badge
esa-breadcrumbs    esa-button-group   esa-button-toggle  esa-button
esa-card           esa-checkbox-group esa-checkbox       esa-chip-group
esa-color-picker   esa-combobox       esa-command-palette esa-confirm-dialog
esa-container      esa-danger-zone    esa-date-picker    esa-dialog
esa-dropdown-menu  esa-empty-state    esa-entity-search  esa-field-error
esa-file-upload    esa-filter-clear-button esa-filter-container esa-filter-dropdown
esa-filter-pills   esa-form-field     esa-header-nav     esa-icon-button
esa-icon-link      esa-icon           esa-input-tag      esa-kbd
esa-link-column    esa-loading-overlay esa-loading-spinner esa-nav-dropdown
esa-pagination     esa-pill           esa-pillbox        esa-popover
esa-progress-bar   esa-radio-group    esa-range-slider   esa-search-panel
esa-select         esa-side-dialog    esa-sidebar-nav    esa-snackbar-container
esa-snackbar-item  esa-switch-toggle  esa-tab-layout     esa-text-field
esa-textarea       esa-tooltip
```

## Reinvented → Use the Lego (cautionary table)

These are illustrative anti-patterns — bespoke primitives that an `esa-*` lego already provides. Do NOT hand-roll the left column; reach for the right.

| Reinvented (bespoke) | Use the lego instead |
|----------------------|----------------------|
| raw `<input>` / `<select>` / styled `<button class>` | **esa-text-field** / **esa-select** / **esa-button** |
| a `.foo-modal` / `.foo-sidedrawer` CSS block | **esa-dialog** / **esa-side-dialog** |
| a `.foo-dropzone` + uploaded-file rows | **esa-file-upload** |
| a `.foo-icon-btn` styled icon button | **esa-icon-button** |
| a `.foo-card` / `.foo-tag` / `.foo-count` badge | **esa-card** / **esa-pill** / **esa-badge** |
| a `.foo-empty` empty state | **esa-empty-state** |

## The Escape Hatch — `bcn-lego-checked:`

The hook is a **hard block**. To legitimately proceed past it (because you genuinely walked Ecology → Beacon and nothing fits), assert that in the content via a token comment:

```html
<!-- bcn-lego-checked: no esa- component supports a draggable kanban column; checked Beacon (none); bcn-kanban-column is the reusable home -->
```

The token is a **claim that you did the lookup**. Its presence anywhere in the new content allows the write. Use it honestly: name what you searched and why nothing fit. A bare token with a fake reason defeats the entire discipline.

CSS-only files use the same token as a CSS comment: `/* bcn-lego-checked: ... */`.

## Documentation
- [Authoring a bcn- component (naming, structure, when justified)](bcn-authoring.md)
- [Reinvented → lego mapping & per-tier search recipes](lego-lookup.md)

> **Publishing note:** edits to this skill only reach spokes after the plugin is republished —
> bump `plugins/spoke-kit/.claude-plugin/plugin.json` (currently `1.3.1`), push the hub, then
> `claude plugin marketplace update ecology`. Local hub edits are inert until then (spokes run
> the cached marketplace copy).
