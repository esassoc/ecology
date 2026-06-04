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

### The spoke theming contract

A spoke re-skins by reassigning tokens under a `[data-theme]` scope. Two rules keep
that safe and portable (both proven out by `../cb-fish-design`, the first spoke):

1. **Primitives never move.** To change a neutral or ramp value, re-point the
   *semantic* token that consumes it (`--color-border`, `--color-text-muted`) — do
   **not** override the primitive (`--color-gray-200`). Primitives are the shared
   floor; moving them breaks the contract for every component.
2. **The type contract is a matched set.** A brand swaps two faces — `--font-sans`
   (body) and `--font-display` (headlines; defaults to sans, read by the display/
   title type-roles). Font-**weight** values are typeface-bound: the hub's
   `--font-weight-*` match DM Sans's optical weights, so a spoke that overrides
   `--font-sans` must also set `--font-weight-*` to its face's matching weights.
   (cb-fish remaps DM Sans 350/450/550/650 → IBM Plex 400/500/600.)

Brand-tinted surfaces use the `--color-primary-subtle` / `--color-primary-border`
pair (both promoted up from cb-fish's first build).

### Spoke-specific tokens (keeping the hub clean)

A spoke sometimes needs a value the hub doesn't have. Sort it into one of two cases:

- **A gap in an ecology scale** → *promote it to the hub.* If the value is a missing
  rung (e.g. a 40px gap between `--spacing-600`/`32px` and `--spacing-700`/`48px`),
  add it to ecology (`--spacing-650`). This makes the hub *more* complete and
  durable — it's not pollution. cb-fish's old `--cbf-chrome-gap` became `--spacing-650`.
- **A genuinely spoke-specific value** (a brand ramp, a one-off project dimension the
  hub should never carry) → a **namespaced spoke tier**, `--{spoke}-*`, living **only**
  in the spoke's theme file. e.g. `--cbf-blue-*`.

The rule that keeps ecology pristine:

> **Ecology components read only ecology tokens. Spoke components (`cbf-*`) may read
> ecology tokens *and* `--{spoke}-*` tokens. A spoke token never appears in a hub
> component.**

Spoke tokens come in two flavors: **re-point material** (a brand ramp whose only job
is to reassign ecology semantic tokens — components never read it directly, e.g.
`--cbf-blue-950` → `--color-surface-inverse`), and **spoke-local values** (read by
`cbf-*` components but never by `esa-*`). The hub stays unaware that CB Fish exists.

## Next steps / open seams

- **Token output targets:** `packages/tokens/build.js` is the one seam — add SCSS / TS / Tailwind / Figma platforms there.
- **Specs as content collections:** add MD/MDX pattern specs alongside specimens so humans + dev teams + Claude read one artifact.
- **Portable interactivity:** promote a pattern to a Web Component (Lit) only when a prototype proves it needs portable behavior.
- **Publishing:** wire GitHub Packages so spokes install real versioned packages instead of workspace links.
