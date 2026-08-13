# Ecology Token Spec

The rules for the three tiers — what each is for, how names are formed, and
when a component earns a tier-3 hook. This is the contract `hookify` work and
all new components follow.

## The tiers

1. **Primitive** (`tokens/primitive/*.json` → compiled) — raw values on ramps:
   `--color-teal-900`, `--spacing-400`, `--radius-100`, `--type-size-200`.
   **Primitives never move** — not in the hub, not in a theme.
2. **Semantic** (`tokens/semantic/*.json` → compiled) — intent, referencing
   primitives. A spoke's brand identity lives here: re-point a semantic token
   and the intent re-skins everywhere it's used. Every category gets a layer
   here, not just colour:
   - colour — `--color-primary`, `--color-surface`, `--color-text-secondary`
   - shape — `--radius-control | -surface | -card | -overlay | -pill`
   - size — `--control-height-{xs,sm,md,lg}`, `--chip-height-*`
   - UI type — `--font-size-ui-{xs,sm,md,lg}` (chrome, not prose — prose uses
     the type-roles in `src/type-roles.css`)
   - elevation — `--elevation-1…6`
   - layout — `--sidebar-width`, `--header-height`, `--content-max-width`

   **Components read this tier, never a primitive.** A component reaching past
   it (`border-radius: var(--radius-200)`) is the bug that forces a theme to
   move a primitive, because the semantic layer no longer covers the property.

   Most semantic tokens alias a primitive. **Dimension roles are allowed to
   define instead** — there is no tier-1 ramp behind a control height or a
   layout width, so tier 2 is where that value legitimately lives. The debug
   page lists these separately from colour hardcodes for exactly this reason.
3. **Component** (`src/component-tokens.css`, authored) — the per-component
   (or per-group) theming surface, defaulting to semantic references:
   `--card-bg: var(--color-surface)`. A spoke uses this tier to diverge ONE
   component from the semantic default without forking it.

Inside components, **private `--_*` tokens** consume the public tiers, always
with a literal fallback: `--_btn-height: var(--form-height-md, 40px)`.
Privates are internals — never themed, never documented as surface.

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
/* component-tokens.css (authored default = the old semantic chain) */
--card-bg: var(--color-surface);

/* inside the component: hook spliced ABOVE the old chain, old fallback kept */
--_card-bg: var(--card-bg, var(--color-surface, #fff));
```

Spokes already shipping are untouched by construction: every new token's
default resolves to exactly what the component read before.

## Staged surfaces

A tier-3 namespace may be declared **before** the component that reads it, so
the theming contract can be reviewed before code depends on it. `--grid-*` and
`--topbar-*` are staged today.

A staged surface must:

- be listed in `STAGED_PREFIXES` in `apps/site/src/data/token-graph.ts`, which
  keeps it out of the orphan check and into its own inventory bucket;
- carry a `(STAGED)` banner comment in `component-tokens.css` saying why;
- have a component doc page describing the contract in the same names.

Removing a prefix from that list should mean **the component landed**, not that
the finding got annoying. A staged surface that no one has claimed after a
release cycle is dead surface — fold it away.

## Themes consume the tiers like this

```css
[data-theme="cb-fish"] {
  /* tier 2 — the brand: everything 'primary' becomes navy */
  --color-primary: #1e5386;
  /* tier 2 — shape and size are roles too: flatter corners, tighter controls */
  --radius-surface: 4px;
  --control-height-md: 36px;
  /* tier 3 — ONE component diverges from those defaults */
  --card-radius: var(--radius-control);
}
```

Never re-point a primitive; never style `.esa-*` internals from a theme. If a
theme finds itself wanting to move `--radius-200` or `--shadow-300`, the real
problem is a missing semantic role — add the role, don't move the ingredient.
