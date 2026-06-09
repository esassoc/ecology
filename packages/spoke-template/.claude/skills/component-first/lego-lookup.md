# Lego Lookup — per-tier search recipes

Use this when you know *what you need* but not *which lego provides it*. Walk the tiers top to bottom; stop at the first hit.

## Tier 1 — Ecology (`esa-*`)

The catalog is the source of truth. Always list it first — it grows:
```bash
ls ~/Dev/ecology/packages/ecology/src/components/
```

Find by intent (grep the component dir for behavior/props):
```bash
grep -rln "drag\|drop\|upload"  ~/Dev/ecology/packages/ecology/src/components/   # → esa-file-upload
grep -rln "empty\|no results"    ~/Dev/ecology/packages/ecology/src/components/   # → esa-empty-state
grep -rln "slide\|drawer\|side"  ~/Dev/ecology/packages/ecology/src/components/   # → esa-side-dialog
```

Read the component to learn its props/slots before using it:
```bash
cat ~/Dev/ecology/packages/ecology/src/components/esa-file-upload.ts
```

### Import by file type
| You saw in `ls`... | Import like... | Use in markup |
|--------------------|----------------|---------------|
| `esa-card.astro` | `import EsaCard from '@esa/ecology/esa-card.astro';` (frontmatter) | `<EsaCard>...</EsaCard>` |
| `esa-dialog.ts` | `import '@esa/ecology/esa-dialog';` (client `<script>`) | `<esa-dialog>...</esa-dialog>` |

`.astro` files are Astro components imported in the frontmatter fence.
`.ts` files are custom-element web components — register them once in a client `<script>` and use the custom-element tag in your markup.

## Tier 2 — Beacon prod app (`ui-*` + SCSS)

If no `esa-*` fits, the production Angular app likely has the pattern. Mine it for behavior and tokens, then build with the `esa-*` lego (or as a `bcn-` component).

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
- Page layout scaffolding: `.page-`, section wrappers, grid/flex *layout* containers
- Composing legos together with your own spacing
- Data-shaping logic, fixtures, client scripts that wire up `esa-*` elements
