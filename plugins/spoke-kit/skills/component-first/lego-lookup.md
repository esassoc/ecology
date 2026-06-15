# Lego Lookup — per-tier search recipes

Use this when you know *what you need* but not *which lego provides it*. Walk the tiers top to bottom; stop at the first hit.

## Tier 1 — Ecology (`esa-*`)

The catalog is the source of truth. Always list it first — it grows:
```bash
ls node_modules/@esa/ecology/src/components/
```

Find by intent (grep the component dir for behavior/props):
```bash
grep -rln "drag\|drop\|upload"  node_modules/@esa/ecology/src/components/   # → esa-file-upload
grep -rln "empty\|no results"    node_modules/@esa/ecology/src/components/   # → esa-empty-state
grep -rln "slide\|drawer\|side"  node_modules/@esa/ecology/src/components/   # → esa-side-dialog
```

Read the component to learn its props/slots before using it:
```bash
cat node_modules/@esa/ecology/src/components/esa-file-upload.ts
```

### Tier 1 also covers the COMPOSITION layer — reach for it BEFORE hand-rolling CSS

A page is built by composing legos with **layout + type utilities**, not by writing bespoke
flex/grid/`<style>` blocks. Walk these *before* writing any CSS of your own:

**Layout primitives** (`@esa/tokens/layouts.css`) — composable "Every Layout" utility
classes; one class is a whole layout engine, tuned by a few custom properties. Apply to
plain `<div>`s. Use these instead of bespoke flex/grid CSS.

| Need | Class |
|------|-------|
| Vertical rhythm (stacked blocks) | `.stack` |
| Inline group that wraps (toolbars, tag rows) | `.cluster` |
| Push two ends apart (title left, actions right) | `.repel` |
| Responsive card grid | `.grid` (knob `--grid-min`) |
| Fixed rail + fluid main | `.sidebar` (knobs `--sidebar-width`, `--sidebar-content`) |
| Switch row→column under a threshold | `.switcher` (knob `--switcher-threshold`) |
| Aspect-ratio media box | `.frame` (knobs `--frame-ratio`, `--frame-fit`) |
| Horizontal scroller | `.reel` (knob `--reel-item`) |
| Center a column with a max width | `.center` (knob `--center-max`) |

Gap is declarative: `data-gap="none|xs|sm|md|lg|xl"` on the element (or override `--gap`).
```bash
cat node_modules/@esa/tokens/layouts.css   # full set + per-primitive knobs
```

**Typography roles** (`@esa/tokens/type-roles.css`) — style text with role classes, **never
raw `--type-size-*` in pages** (that's a smell — see design-principles). Roles:
`.type-display`, `.type-page-title`, `.type-section-title`, `.type-card-title`, `.type-body`,
`.type-body-large`, `.type-body-small`, `.type-label`, `.type-caption`, `.type-overline`,
`.type-code`.
```bash
cat node_modules/@esa/tokens/type-roles.css
```

**Mid-tier legos** — composed patterns above the atom level; prefer them over assembling raw parts:

| Need | Lego |
|------|------|
| Page heading band (title + lede + actions slot) | `esa-page-header` |
| A metric (value / label / sub / accent) | `esa-stat` |
| The whole app chrome (topbar toggle, sidenav logo, omnibox, user menu, neutral surfaces) | `esa-app-shell` |

## Pattern catalog — find the established pattern before rebuilding it

Some patterns are too composed for a single lego but are already solved in a spoke
**prototype page**. These pages are canonical references — read them before reinventing.
A finished page should read like a **MANIFEST of legos + layout/type utilities**, NOT
250+ lines of bespoke `<style>`. If you're writing that much CSS, the pattern probably
already exists here — or should become a lego (`/request-lego`).

| Pattern | Canonical reference |
|---------|---------------------|
| Filter bar (filter dropdowns + clear + active pills over a table) | `~/Dev/beacon-design/src/pages/prototypes/permit-tracking.astro` |
| Omnibox / global typeahead search | `~/Dev/cb-fish-design/src/components/search/` (`cbf-omni-search.astro` + `omni-search.client.ts`) — search the cb-fish-design spoke |

```bash
# Always look across spoke prototypes for an existing solve before building a new one:
grep -rln "PATTERN" ~/Dev/*-design/src/pages ~/Dev/*-design/src/components 2>/dev/null
```

## Section lookup — resolving a whole page SECTION (manifest-first)

The lookups above resolve a single *control*. A composed page is built one **section** at
a time, and **every section is a component** — never inlined page markup + page `<style>`.
A PreToolUse hook (`check-manifest`) enforces this on `src/pages/**` (excluding
`design-system/`, the landing `index.astro`, and `patterns/`): a manifest header must be
present and every section must resolve to an `esa-*` lego or a `<spoke>-*` component. Bare
primitives / words are rejected.

**Resolve each section in this order — stop at the first hit:**

1. **Reuse an `esa-*` hub lego** if one covers the whole section (`esa-page-header`,
   `esa-stat`, `esa-app-shell`, …).
2. **Reuse an existing `<spoke>-*` component** the spoke already ships.
3. **BUILD a new `<spoke>-*` component** — compose primitives + legos *inside* it. Then
   the page just references it.

A primitive (`.stack`/`.grid`/`.repel`/`.center`/…) and a type role are the page **spine**
and live **inside** components — they are *never themselves* a section resolver.

**Write the manifest FIRST**, before any code — outline the sections, resolve each, decide
reuse vs. build. The page then reads like its manifest: `AppLayout > primitive spine >
section components`.

```
<!-- manifest:
  layout: stack(2xl)                         # the page SPINE — a primitive is fine here
  sections:
    - page header -> laureate-page-header    # every SECTION is a component
    - stats       -> laureate-stat-group     #   (esa-* lego or <spoke>-* component)
    - winners     -> laureate-winners-grid
    - footer      -> laureate-footer
-->
```

A section resolver must be **hyphenated** (`esa-card`, `laureate-foo`). Bare words /
`inline` / a bare primitive are rejected. "Page CSS" is a smell — the target is **ZERO page
`<style>`**; every section owns its markup + CSS in its component.

**Worked reference**: Laureate's `src/pages/app/index.astro` is the canonical zero-CSS
manifest; its `src/components/laureate-*.astro` are the section components.

### Import by file type
| You saw in `ls`... | Import like... | Use in markup |
|--------------------|----------------|---------------|
| `esa-card.astro` | `import EsaCard from '@esa/ecology/esa-card.astro';` (frontmatter) | `<EsaCard>...</EsaCard>` |
| `esa-dialog.ts` | `import '@esa/ecology/esa-dialog';` (client `<script>`) | `<esa-dialog>...</esa-dialog>` |

`.astro` files are Astro components imported in the frontmatter fence.
`.ts` files are custom-element web components — register them once in a client `<script>` and use the custom-element tag in your markup.

## Tier 2 — Beacon prod app (`ui-*` + SCSS) — optional, requires the Beacon repo cloned

If no `esa-*` fits, the production Angular app likely has the pattern. Mine it for behavior and tokens, then build with the `esa-*` lego (or as a `bcn-` component). If `~/Dev/Beacon` isn't on your machine, skip to Tier 3 and say so in your `bcn-lego-checked:` reason.

```bash
ls ~/Dev/Beacon/Beacon.Web/src/app/shared/ui/components/     # ui-button, ui-dialog, ui-chip-group, ...
grep -rn "PATTERN" ~/Dev/Beacon/Beacon.Web/src/scss/         # tokens, mixins, variables
grep -rln "PATTERN" ~/Dev/Beacon/Beacon.Web/src/app/         # usages in the app
```

Port faithfully: keep the same token names, the same DOM structure, the same states (hover/focus/disabled/error). Do not "improve" it — fidelity to prod is the point.

## Tier 3 — `bcn-` (only if both tiers came up empty)

See [bcn-authoring.md](bcn-authoring.md). Before you write a line of bespoke CSS, you must be able to say *which* `esa-*` and *which* Beacon pattern you ruled out and why — that sentence becomes your `bcn-lego-checked:` reason.

## Reinvented → Lego quick map

| If you're about to build... | Stop. Use... |
|-----------------------------|--------------|
| A slide-in / side panel / drawer editor | esa-side-dialog |
| A modal / confirm dialog | esa-dialog / esa-confirm-dialog |
| A file dropzone + uploaded-file rows | esa-file-upload |
| An icon-only action button | esa-icon-button |
| A content card | esa-card |
| A tag / chip | esa-pill / esa-chip-group / esa-pillbox |
| A count / status badge | esa-badge |
| An empty / no-results state | esa-empty-state |
| A labeled form field + error text | esa-form-field + esa-field-error |
| A text input / select / textarea | esa-text-field / esa-select / esa-textarea |
| A tooltip / popover | esa-tooltip / esa-popover |
| An avatar | esa-avatar |
| Breadcrumbs | esa-breadcrumbs |
| A snackbar / toast | esa-snackbar-container + esa-snackbar-item |

## What is NOT a reinvention (don't over-correct)

These are legitimate page work, not primitives — build them freely:
- Page layout scaffolding: `.page-` / section wrappers — but **compose them from the layout
  primitives** (`.stack`/`.grid`/`.sidebar`/…) rather than writing bespoke flex/grid CSS
- Composing legos together with your own spacing (use `data-gap` on a layout primitive first)
- Data-shaping logic, fixtures, client scripts that wire up `esa-*` elements
