# Promotion path — spoke → hub

How a component that started life in a spoke (a `<spoke>-*` component) graduates
into the hub as an `esa-*` lego that every spoke shares. This is the hub-side
counterpart to the spoke-side `/request-lego` command: `/request-lego` files the
*need*; this doc is how the hub *fulfils* it.

> Promotion is a hub change, so it lands on every spoke at once. Always do it on
> a branch, build green, and re-point the originating spoke in the same PR.

## When to promote — the three criteria

A `<spoke>-*` component is ready to come up **only when all three hold**:

1. **Brand-agnostic.** It composes *only* tokens + existing legos + slots/props.
   No spoke data, no spoke-specific naming, no hard-coded brand values. If it
   reads a brand color directly instead of a semantic/component token, it isn't
   ready — generalize it first.
2. **Proven.** It's in real use in **at least one** spoke, and ideally there's a
   genuine **second** need for it (another spoke, or a hub pattern page). One
   speculative component is a liability; two real uses is a pattern.
3. **Earns its theming surface.** If the component can visually diverge between
   brands, it must expose a **tier-3 component-token surface** (`--<name>-*`
   private `--_*` tokens reading public tokens with literal fallbacks — see
   `packages/tokens/SPEC.md`). If it never diverges, it doesn't need one.

If a candidate misses #1, the work is *generalization*, not promotion. If it
misses #2, wait — file or note the second need first.

## The mechanism — six steps

1. **Branch.** `git checkout -b promote-<name>`.
2. **Move + rename.** `<spoke>-x.astro` → `packages/ecology/src/components/esa-x.astro`.
   Follow the golden patterns: `esa-badge.astro` (presentational `.astro`) or
   `esa-switch-toggle.ts` (interactive Lit). Add the doc-comment header in the
   house format — `// esa-x — <one-liner> (.astro).` — the catalog parser reads
   its first line.
3. **Generalize.** Replace any spoke specifics with props/slots. Use *only*
   ecology semantic/component tokens (every token name must exist in
   `packages/tokens/dist/tokens.css` + `component-tokens.css`). Add a tier-3
   surface if criterion #3 applies.
4. **Document.** Add a doc page at `apps/site/src/pages/components/esa-x.astro`
   (mirror `esa-card.astro`), and add the slug to the right group in
   `apps/site/src/data/catalog.ts`. The catalog + nav pick it up automatically;
   the build's drift guard fails loudly if you forget the catalog entry.
5. **Re-point + delete.** Switch the spoke's imports to `@esa/ecology/esa-x.astro`,
   delete the spoke copy, and `npm run build` the spoke to confirm parity.
6. **Publish.** Build the hub green, open the PR. If the change touches a
   `spoke-kit` skill/hook, bump `plugins/spoke-kit/.claude-plugin/plugin.json`
   and remember spokes only see it after the marketplace is updated.

## Worked examples

These two opened the loop (2026-06-15):

- **`esa-button` gains `href`.** `laureate-button-link` existed *only* because
  `esa-button` rendered a `<button>`, never an `<a>`. Rather than promote the
  wrapper, the capability was folded into `esa-button`: an optional `href` makes
  it render an identical-looking `<a>` (disabled links drop `href` + set
  `aria-disabled`). Then `laureate-button-link` was deleted and its uses
  re-pointed. *Lesson: sometimes the right promotion is a prop on an existing
  lego, not a new component — exactly what `/request-lego` should weigh first.*
- **`laureate-page-header` → `esa-page-header`.** The hub already had an
  `esa-page-header` (breadcrumbs + page-title-role title). Laureate's was a
  different shape (eyebrow + leading icon + oversized display title). Promotion
  here was *reconciliation*: the existing lego grew `eyebrow`, `icon`, and a
  `prominence="display"` option so one component serves both forms, plus the
  doc page + catalog entry it had been missing. *Lesson: check whether the hub
  already has the lego — promotion is often merging into it, not adding beside
  it.*
