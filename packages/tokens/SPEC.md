# Ecology Token Spec

The rules for the three tiers — what each is for, how names are formed, and
when a component earns a tier-3 hook. This is the contract `hookify` work and
all new components follow.

## The tiers

1. **Primitive** (`tokens/primitive/*.json` → compiled) — raw values on ramps:
   `--color-teal-900`, `--spacing-400`, `--radius-100`, `--type-size-200`.
   **Primitives never move** — not in the hub, not in a theme.
2. **Semantic** (`tokens/semantic/*.json` → compiled) — intent, referencing
   primitives: `--color-primary`, `--color-surface`, `--color-text-secondary`.
   A spoke's brand identity lives here: re-point a semantic token and the
   intent re-skins everywhere it's used.
3. **Component** (`src/component-tokens.css`, authored) — the per-component
   (or per-group) theming surface, defaulting to semantic references:
   `--card-bg: var(--color-surface)`. A spoke uses this tier to diverge ONE
   component from the semantic default without forking it.

Inside components, **private `--_*` tokens** consume the public tiers by bare
reference: `--_btn-height: var(--form-height-md)`. **No literal fallback** — the
whole default theme ships in `@layer esa.defaults` (see below), so every public
token is always defined upstream. An inline literal would be dead code that
silently drifts out of sync with the real value (and can't carry a P3 color).
Privates are internals — never themed, never documented as surface. The only
fallbacks that stay are for values set at RUNTIME, not by the theme — instance
variables like `hsl(var(--_avatar-hue, 200) …)` or `var(--_offset, 8px)`.

## The cascade layer (why there are no literal fallbacks)

The entire default theme — primitives + semantic (`tokens.css`) and the tier-3
component tokens (`component-tokens.css`) — ships wrapped in one low-priority
layer:

```css
@layer esa.defaults { :root { /* … all tokens … */ } }
```

This is the single source of truth for every default, and two of its properties
are load-bearing for the rest of this spec:

- **Defaults live once, at the definition site.** A token's value is its `:root`
  declaration, which resolves down to a primitive — the only place a literal
  color lives. Components reference tokens BARE and never re-state a default
  inline. The P3/sRGB fallback is handled here too, via the
  `@media (color-gamut: p3)` block — not via `var()` syntax.
- **Any consumer override wins for free.** An UNLAYERED rule always beats a
  layered one, regardless of specificity or source order. So a spoke's
  `[data-theme]` block, a plain `:root` override, or even an inline style
  supersedes the default with no load-order juggling — adopters whose color
  setup you don't control get working defaults AND can retheme without
  coordination.

Ship the baseline with one import — `@esa/ecology/styles.css` (or the two token
files directly). Shadow-DOM web components inherit these custom properties from
the page `:root`, so they resolve the same tokens with no per-component setup.

## Tier-3 naming

- **Shared group surfaces** for things that must align across components:
  `--form-height-md`, `--form-radius-sm`, `--form-padding-x-lg` — one scale so
  inputs, selects, and buttons line up on a row. Prefer extending a group
  surface over duplicating the same knob per component.
- **Per-component surfaces**: `--<component>-<part?>-<property>` —
  `--card-bg`, `--card-border-color`, `--dialog-width`, `--badge-radius`,
  `--sidenav-item-color`. Size-variant knobs take the size suffix last:
  `--badge-height-sm`.
- The component prefix is the element name minus `esa-` (esa-side-dialog →
  `--side-dialog-*`).

## When a property earns a hook

A hook exists so a spoke can plausibly re-skin that property **independently
of the semantic layer**. That means:

- **Earns a hook**: surface/background, text color, border color + radius,
  the component's distinctive geometry (dialog width, sidenav width, avatar
  size ramp, card padding), and any value a real spoke has already asked to
  change (see git history / lego requests).
- **Does NOT earn a hook**: internal micro-geometry (a 2px nudge), state
  colors that must track the accent (hover derives from the accent), anything
  that would let a spoke break invariants (focus-visibility, hit-target
  minimums, disabled affordances).

Don't hook everything — a surface of 5–9 well-chosen tokens per component
beats 25 noisy ones. The generated "Theming surface" table on each component's
doc page is the audit: `component`-tier rows are declared surface, `ad-hoc`
rows are candidates to either promote into `component-tokens.css` or fold away.

## Mechanics (zero-regression rule)

Adding a hook NEVER changes rendered output:

```css
/* component-tokens.css (authored default = the semantic chain, in @layer) */
--card-bg: var(--color-surface);

/* inside the component: read the declared hook bare */
--_card-bg: var(--card-bg);
```

Because `--card-bg` is declared in the layer it is always defined, so the
component reads it bare. An **ad-hoc** hook that is intentionally NOT declared in
`component-tokens.css` carries its semantic default in the `var()` fallback slot
instead — still no literal:

```css
--_stat-accent: var(--stat-accent-color, var(--color-secondary-strong));
```

Spokes already shipping are untouched by construction: every hook's default
resolves to exactly what the component read before.

## Themes consume the tiers like this

```css
[data-theme="cb-fish"] {
  /* tier 2 — the brand: everything 'primary' becomes navy */
  --color-primary: #1e5386;
  /* tier 3 — one component diverges from the brand default */
  --card-radius: var(--radius-100);
}
```

Theme blocks are UNLAYERED, so they win over `@layer esa.defaults` regardless of
load order. Never re-point a primitive; never style `.esa-*` internals from a theme.
