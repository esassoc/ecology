# Ecology Hub

The framework-agnostic design system **hub**. Tokens, specimens, and pattern specs
live here. Project "spoke" repos pull baseline tokens + components and re-skin via
the semantic layer.

## The model

Ecology is **two products wearing one coat**:

1. **A portable standard** — tokens (`@esa/tokens`) + specs + Astro specimens. Crosses every framework boundary.
2. **A reference implementation** — the Astro components (`@esa/ecology`) the UX team prototypes with.

Components travel as **code** inside the UX prototyping world (hub → Astro spokes),
and as **spec** at the production handoff (spoke → a dev team's real codebase, interpreted with Claude).

## Layout

```
packages/
  tokens/      @esa/tokens — DTCG source → dist/tokens.css (+ tokens.js)
               author tokens in tokens/{primitive,semantic}/*.json
  ecology/     @esa/ecology — Astro components (Button, Stack)
apps/
  site/        the browsable specimen + spec site (dogfoods both packages)
               includes the live theme switcher (default / beacon / qanat)
```

## Token tiers

1. **Primitive** — raw values (`tokens/primitive/*.json`) → `--color-blue-600`, `--space-400`
2. **Semantic** — intent, references primitives (`tokens/semantic/*.json`) → `--color-primary`
3. **Theme override** — a spoke reassigns the *semantic* layer only (`apps/site/src/styles/themes.css`)

Theming = override the semantic layer. Primitives never move; component internals are never touched.

## Run it

```bash
npm install
npm run dev          # builds tokens, then serves the site
# or
npm run build:tokens # just compile tokens → packages/tokens/dist/
npm run build        # tokens + static site build
```

## How a spoke consumes this

```bash
# in beacon-design/ (its own Astro repo)
npm install @esa/tokens @esa/ecology
```
```css
/* beacon-theme.css — the only required artifact */
[data-theme="beacon"] { --color-primary: <brand>; --radius-md: 6px; /* ... */ }
```
Then compose prototypes from `@esa/ecology` components. Patterns that prove broadly
useful get **promoted** back up into the hub.

## Next steps / open seams

- **Token output targets:** `packages/tokens/build.js` is the one seam — add SCSS / TS / Tailwind / Figma platforms there.
- **Specs as content collections:** add MD/MDX pattern specs alongside specimens so humans + dev teams + Claude read one artifact.
- **Portable interactivity:** promote a pattern to a Web Component (Lit) only when a prototype proves it needs portable behavior.
- **Publishing:** wire GitHub Packages so spokes install real versioned packages instead of workspace links.
