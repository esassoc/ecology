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
