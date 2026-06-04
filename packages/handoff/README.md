# @esa/handoff

**Dev-mode handoff export for Ecology prototypes.** Point it at a rendered
prototype URL and it produces a self-contained, framework-free bundle a developer
(or an AI agent) can re-implement on any stack — plus a live "dev mode" overlay,
the way Figma's Dev Mode inspects a design.

An Astro prototype already compiles to plain HTML/CSS — the hard part of a handoff
isn't *generating* it, it's making it **legible and faithful**. This tool does the
three things the bundler throws away:

1. **De-scopes** — strips Astro's `data-astro-cid-*` from both selectors and
   markup, restoring author-intent class selectors (`.cbf-hero { … }`).
2. **Tree-shakes + flattens** — ships only the CSS rules the page actually matched
   (via Chrome DevTools Protocol coverage), and replaces the primitive→semantic
   token ramps with one flat block defining each used token at its resolved value.
3. **Re-attaches semantics** — a token contract (name → value → tier) and a
   component manifest (which `esa-*`/`cbf-*` blocks compose the page + their source).

## Usage

```bash
# 1. serve the prototype as it will ship (production output, no dev chrome)
npm run build && npm run preview        # serves on :4321

# 2. export a route
npx handoff http://localhost:4321/ --name home --out public/handoff
```

Options: `--name` (bundle subfolder), `--out` (output root), `--source` (spoke
component dir, default `./src/components`), `--public` (asset dir to copy from),
`--ecology` / `--tokens` (hub package paths, auto-resolved when run from a spoke).

> Capture from `preview`, not `dev` — the dev server injects its toolbar and
> unminified CSS, which would pollute the bundle.

## Output (`<out>/<name>/`)

| File | What |
|---|---|
| `index.html` | De-scoped, standalone page (trimmed CSS inlined, assets copied). Opens anywhere. |
| `styles.css` | Only the used rules, plain selectors, flat token block on top. |
| `tokens.md` | Token contract grouped by tier. |
| `components.md` | Component blocks + source paths, hub vs spoke. |
| `manifest.json` | Per-section data (formatted code + tier-classified tokens) for the inspector. |

## Live inspector (Astro dev toolbar)

The inspector is a first-class **Astro dev-toolbar app** — no `?dev` flag, no
injected script. Add the integration to your spoke:

```js
// astro.config.mjs
import handoff from '@esa/handoff/integration';

export default defineConfig({
  integrations: [handoff({ manifest: '/handoff/home/manifest.json' })],
});
```

A **Dev Handoff** icon then appears in Astro's dev toolbar (dev only). Toggle it,
then pick a section — by chip or by clicking the page — to inspect its
syntax-highlighted HTML, applied CSS, and tier-grouped tokens. The inspector only
reads `manifest.json`; the export engine is the single source of truth, so what you
see is exactly what a developer receives. Re-run `npm run handoff` after changing
the prototype to refresh it.

## Notes

- Build-time only. Its `playwright` + `prettier` deps never reach a spoke's runtime
  (that's why this is a separate package from `@esa/ecology`, which stays dep-free).
- The per-section CSS split and component-source resolution are best-effort
  (class-membership / filename match); BEM sub-blocks defined inside another
  component file (e.g. `cbf-stat-tile` inside `cbf-stat-grid.astro`) may show no
  source. The markup and `styles.css` are always complete and authoritative.
