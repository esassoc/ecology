# Ecology Token Spec

The rules for the three tiers — what each is for, how names are formed, and
when a component earns a tier-3 hook. This is the contract `hookify` work and
all new components follow.

## The tiers

1. **Primitive** (`tokens/primitive/*.json` → compiled) — raw values on ramps:
   `--color-teal-9`, `--spacing-400`, `--radius-100`, `--font-size-200`.

   **Tier-1 names describe the value, not a job.** `--font-family-dm-sans`
   names the face; `--font-weight-350` names the weight. The uncomfortable
   literalness is the point — nothing consumes these directly, so a name that
   says exactly what the value *is* makes the tier-2 mapping legible. A tier-1
   token named for a role (`--font-sans`, `--color-status-success`) reads as
   themeable and isn't, which is how a theme ends up re-pointing a primitive.

   Three scale conventions are in play. Which one a category uses depends on
   whether the value can name itself *and* whether the set reads better as a
   sequence:
   - **value-named** — `--font-weight-350`, `--font-family-dm-sans`. Use where
     the value is the identity and there is no meaningful ordering.
   - **Radix 1–12** — colour only, where each step carries a fixed job
     (2 = subtle surface, 9 = solid fill, 11 = text on a surface).
   - **padded ordinal** — `--spacing-400`, `--radius-100`, `--shadow-050`,
     `--font-size-200`. Use where the set is a *scale* a designer picks a rung
     from. Spacing was converted to value-names (`--spacing-16`) and converted
     back: the ramp is the thing being chosen from, the ordinal keeps the rungs
     evenly spaced in the name regardless of the values behind them, and it
     leaves room to insert a step without renumbering everything after it.

   **A scale-position name is ours, not CSS's.** In a named ramp — `none`,
   `tight`, `normal`, `relaxed` — the words name *rungs*, and the middle rung is
   called `normal` because it is this system's default, not because CSS has a
   keyword spelled the same way. `--line-height-normal` is **1.6 by definition**;
   CSS `line-height: normal` (~1.2) is a different thing and the token has never
   claimed to be it. Same for `--letter-spacing-normal: 0.01em`. Nobody reading
   `var(--line-height-normal)` is asking for the keyword — the `var()` says they
   want the token. (Tailwind's `leading-normal` is 1.5 for exactly this reason.)

   This does **not** relax the rule for value names. Where a token's value *is*
   a CSS keyword — `--text-transform-uppercase`, `--font-style-italic` — the
   name must be that keyword. The distinction is whether the last segment names
   a position on a ramp or the value itself.

   **Primitives never move** — not in the hub, not in a theme.
2. **Semantic** (`tokens/semantic/*.json` → compiled) — intent, referencing
   primitives. A spoke's brand identity lives here: re-point a semantic token
   and the intent re-skins everywhere it's used. Every category gets a layer
   here, not just colour:
   - colour — `--color-background-brand`, `--color-background-raised`, `--color-content-secondary`
   - shape — `--radius-control | -surface | -card | -overlay | -pill`
   - size — `--control-height-{xs,sm,md,lg}`, `--chip-height-*`
   - UI type — `--font-size-ui-{xs,sm,md,lg}` (chrome, not prose — prose uses
     the typography composites in `src/typography.css`)
   - elevation — `--elevation-1…6`
   - layout — `--sidebar-width`, `--header-height`, `--content-max-width`

   **Components read this tier, never a primitive.** A component reaching past
   it (`border-radius: var(--radius-200)`) is the bug that forces a theme to
   move a primitive, because the semantic layer no longer covers the property.

   Most semantic tokens alias a primitive. **Dimension roles are allowed to
   define instead** — there is no tier-1 ramp behind a control height or a
   layout width, so tier 2 is where that value legitimately lives. The debug
   page lists these separately from colour hardcodes for exactly this reason.

### Tier-2 colour naming

Colour is the largest and most-read part of this tier, so it has a fixed shape:

```
--color-<property>-<intention>-<variant>-<state>
            │           │          │        └── hover, active, focus  (optional)
            │           │          └─────────── subtle, muted, strong, secondary (optional)
            │           └────────────────────── brand, info, success, warning,
            │                                   danger, accent, ai, disabled (optional)
            └────────────────────────────────── background | content | border
```

**The property is never optional.** It is the thing that makes a name guessable:
a danger border is `--color-border-danger`. Not `--color-danger-border`, and not
`--color-danger` — that one is a background, and it says so.

- **`background`** — fills and surfaces. Page canvas, cards, solid button fills.
- **`content`** — text, icons and SVG strokes. Anything sitting *on* a background.
  `content` rather than `text` because icons read these too.
- **`border`** — strokes and dividers.
- **`overlay`** is a deliberate fourth property for the translucent washes
  (`--color-overlay-hover`, `--color-overlay-backdrop`). They sit *over* a
  background rather than being one, and naming them `background-*` would collide
  with the opaque neutrals already holding those names.

**Neutral is the default intention and carries no intention word.**
`--color-background` is the page; `--color-content-primary` is body text. Every
non-neutral names its intention: `--color-background-brand`.

**Two rules that exist because they were once broken:**

1. **The brand intention is `brand`, not `primary`.** `primary` meant two
   different things at once — the brand hue, and the most prominent of a set
   (`--color-text-primary`). Under property-first naming those collapse into the
   same slot and `--color-background-primary` becomes unreadable: brand fill, or
   the main page background? `brand` for the hue, `primary` only for prominence.

2. **A step-11 colour is `content-*`, never `-strong`.** The old
   `--color-danger-strong` sounded like a bolder fill and was used as one; it is
   Radix step 11, which is *text on a surface*. `--color-content-danger` cannot be
   misread that way.

### Defining vs deriving — when tier 2 may point at tier 2

A tier-2 token does one of two jobs, and which one decides what it may reference:

- **Defining** a colour identity → references a **primitive**.
  `--color-background-brand: {color.grass.9}` is where "brand" becomes a value.
- **Deriving** from an identity it does not own → references **another tier-2
  token**. `--color-border-focus: {color.background-brand}`.

This is not a loophole in "components read tier 2, never a primitive" — it is what
makes theming work. `build.js` compiles with `outputReferences: true`, so the
reference survives into the CSS as a live `var()`:

```css
--color-border-focus: var(--color-background-brand);
```

A spoke overriding `--color-background-brand` in its `[data-theme]` block moves the
focus ring **at runtime**. Flattened to a hex, it could not.

**Two rules keep this from sprawling:**

1. **Depth 1.** A derived token points at a *defining* token, never at another
   derived one. Chains make a spoke's one-line override travel somewhere nobody
   can trace back.
2. **Ask whose identity it is.** A focus ring has no colour of its own — it *is*
   the brand, so it derives. A danger border is not the brand; it defines danger,
   so it references a primitive. Getting this backwards is how
   `--color-border-focus: {color.grass.8}` shipped: a derived token written as a
   defining one, unreachable by every theme, and it stayed green in a navy spoke
   for months without a single error.

**Every intention that has a solid fill also declares its foreground**, as
`--color-content-on-<intention>`. This is not symmetry for its own sake: five of
them were missing, components hardcoded `#fff` in the gap, and on the bright Radix
ramps (lime, yellow, amber, sky, mint) white fails contrast on step 9.
`scripts/check-contrast.mjs` checks each of these pairs, so a spoke that re-points
a fill without re-pointing its foreground gets told.
3. **Component** (`src/component-tokens.css`, authored) — the per-component
   (or per-group) theming surface, defaulting to semantic references:
   `--card-bg: var(--color-background-raised)`. A spoke uses this tier to diverge ONE
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
--card-bg: var(--color-background-raised);

/* inside the component: hook spliced ABOVE the old chain, old fallback kept */
--_card-bg: var(--card-bg, var(--color-background-raised, #fff));
```

Spokes already shipping are untouched by construction: every new token's
default resolves to exactly what the component read before.

## Staged surfaces

A tier-3 namespace may be declared **before** the component that reads it, so
the theming contract can be reviewed before code depends on it. `--grid-*` is
staged today — no `esa-grid` component ships yet.

`--topbar-*` **was** listed here and should not have been: `esa-app-shell`
renders the bar, the sidebar toggle and the omnibox that those 12 tokens name.
The premise of staging is *"the component does not exist yet"*, and because
"staged" reads as *"arriving soon"* nobody re-checked it once that stopped
being true. It is now a **chrome exemption** — see below.

A staged surface must:

- be listed in `STAGED_PREFIXES` in `apps/site/src/data/token-graph.ts`, which
  keeps it out of the orphan check and into its own inventory bucket;
- carry a `(STAGED)` banner comment in `component-tokens.css` saying why;
- have a component doc page describing the contract in the same names.

Removing a prefix from that list should mean **the component landed**, not that
the finding got annoying. A staged surface that no one has claimed after a
release cycle is dead surface — fold it away.

## Chrome exemptions

Distinct from staged, and the distinction is the point: here the component
**exists** and could read the tokens, and we are choosing not to wire it.
Staged is a prediction that can come true; an exemption is a standing decision,
so it carries a heavier disclosure burden.

A chrome exemption must:

- be listed in `CHROME_EXEMPT` in `apps/site/src/data/token-graph.ts` with an
  `owner` (the component that renders the surface) and a `cost` sentence
  stating in plain terms what a spoke gives up;
- keep every token rendered by name on `/debug/components` — an exemption that
  hid them would be indistinguishable from having wired them.

`--topbar-*` → `esa-app-shell` is the only entry. The cost: a spoke overriding
`--topbar-bg`, `--topbar-icon-bg-hover` or `--topbar-search-*` gets nothing;
the chrome re-skins only through the semantic layer the component reads
directly.

## Themes consume the tiers like this

```css
[data-theme="cb-fish"] {
  /* tier 2 — the brand: everything 'primary' becomes navy */
  --color-background-brand: #1e5386;
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
