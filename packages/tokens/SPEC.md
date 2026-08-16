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
   token named for a role (`--typography-font-family-sans`, `--color-status-success`) reads as
   themeable and isn't, which is how a theme ends up re-pointing a primitive.

   Three scale conventions are in play. Which one a category uses depends on
   whether the value can name itself *and* whether the set reads better as a
   sequence:
   - **value-named** — `--font-weight-350`, `--font-family-dm-sans`. Use where
     the value is the identity and there is no meaningful ordering.
   - **Radix 1–12** — colour only, where each step carries a fixed job
     (2 = subtle surface, 9 = solid fill, 11 = text on a surface).
   - **padded ordinal** — `--spacing-400`, `--radius-100`, `--shadow-blur-200`,
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
   claimed to be it. Nobody reading
   `var(--line-height-normal)` is asking for the keyword — the `var()` says they
   want the token. (Tailwind's `leading-normal` is 1.5 for exactly this reason.)

   `--letter-spacing-normal` used to sit beside it here, at `0.01em`. It is **`0`
   as of 2026-08-14** and no longer illustrates the point: the rung now happens to
   equal the CSS keyword. That was not a retreat from the principle — it was that
   the kit's real default tracking had nowhere to live, so the one token in the
   set whose name promises a specific value was the one holding something else.
   The 0.01em moved to `--letter-spacing-default`, which every composite reads.
   A rung and a keyword agreeing is fine; being *obliged* to agree is what this
   section rejects.

   This does **not** relax the rule for value names. Where a token's value *is*
   a CSS keyword — `--text-transform-uppercase`, `--font-style-italic` — the
   name must be that keyword. The distinction is whether the last segment names
   a position on a ramp or the value itself.

   **Primitives never move** — not in the hub, not in a theme.
2. **Semantic** (`tokens/semantic/*.json` → compiled) — intent, referencing
   primitives. A spoke's brand identity lives here: re-point a semantic token
   and the intent re-skins everywhere it's used. Every category gets a layer
   here, not just colour:
   - colour — `--color-background-brand`, `--color-background-elevation-raised`, `--color-content-default-secondary`
   - shape — `--radius-{xs,sm,md,lg}`, plus `--radius-pill`.

     **This category is a documented exception to "intent, not size", and it is
     the only one.** Radius carried roles until 2026-08-16 —
     `--radius-control | -surface | -card | -overlay` — and they asserted
     distinctions they did not deliver: `--radius-200` and `--radius-300` are the
     same `0.5rem`, so `-surface` and `-card` were one number wearing two names.
     Both shipped themes re-pointed exactly one of the five, which produced a live
     defect rather than a dormant one — in qanat a dropdown sat at 10px while the
     card behind it stayed 8px, because `--radius-card` pointed at the primitive
     that did not move.

     **The precedent is spacing.** Spacing has no semantic layer at all (see the
     CORE sets below): it is a scale, consumed directly, and nobody invented
     `--spacing-card-gap`. Colour earns roles because `danger` cannot be derived
     from a number; a corner can. What radius has that spacing does not is that
     themes *do* move it and primitives never move — so radius needs a themeable
     layer. It did not need a *role* layer.

     `--radius-pill` is NOT a step and keeps its name: `full` is taken at tier 1,
     and a squared-off brand re-points pill to `--radius-sm` without touching the
     ramp. Migration: `radius-roles-to-scale`.

     **Do not read this as licence to flatten another category.** The test it
     passes is narrow — every role in the set resolved to a value already
     identified by its position on a ramp, and no theme ever used the roles to
     separate readers. Colour fails that test on the first clause.
   - size — `--chip-height-*`, and only that. `--control-height-{xs,sm,md,lg}` was
     deleted on 2026-08-14: a px height cannot grow with rem text, so it clipped.
     Inputs and buttons are now as tall as their padding plus their text, and that
     padding is `--spacing-*` read directly — so this category has no ramp for them
     at any tier. See `tokens/semantic/size.json`.
   - type — the **composites**, `--typography-<intention>[-<size>]-<property>`,
     plus the faces (`--typography-font-family-sans | -mono | -display`) and named weights they are
     assembled from. There is no separate chrome ramp. A `--font-size-ui-*` set
     existed until 2026-08-14 on the theory that interface text was a different
     kind of thing from prose; it was deleted because a size-only scale running
     parallel to the composites is what lets a component pick a size without
     adopting a composite. Controls now name the same composites everything else
     does — see `docs/typography-adoption-plan.md` D1–D3 and the control-step
     mapping in `semantic/size.json`.
   - elevation — `--elevation-1…6`
   - layout — **empty, and the emptiest category is the most instructive one.**
     It shipped seven names and has none. `--header-height`, `--footer-height`
     and the `--content-*-width` trio went on 2026-08-14 with zero readers
     between them: a dimension token nothing reads cannot be re-pointed to any
     effect, so it is a theming surface that only appears to exist.
     `--sidebar-width` and `--sidebar-width-collapsed` survived that pass on the
     claim that they were "a real agreement — the rail, the content offset and
     the collapse transition must land on the same number," sourced from a
     `$description` asserting 15 readers. Counted on 2026-08-15 the number was
     ONE COMPONENT, and there is no content offset or transition reading them at
     all; both are tier 3 now as `--sidenav-width*`
     (`migrations.json: sidebar-width-to-sidenav-width`). **Before you put a
     dimension here, count its readers — do not accept a count already written
     down.** All seven of this category's tokens were defended by a reader count
     nobody had run, and two of them additionally collided by name, at a
     different value, with a `.sidebar` layout-primitive knob in `layouts.css`.
     See `tokens/semantic/layout.json`, kept for that record.

   **Components read this tier, never a primitive — except the CORE set.** A
   component reaching past it (`border-radius: var(--radius-200)`) is the bug
   that forces a theme to move a primitive, because the semantic layer no longer
   covers the property.

   **The exception is not a loophole, it is a named set.** Two tier-1 groups are
   *universal* — shared by every theme, exportable, and meant to be consumed
   directly by components in both design and code:

   - **spacing** (`--spacing-*`) — every theme follows the same grid. Density is
     not a branding axis.
   - **the neutral palette** (`--color-gray-*`, `--color-black-a*`,
     `--color-white-a*`) — the greyscale the UI is built on.

   A theme re-points brand ramps; it never re-points these. So there is nothing
   for a semantic layer to intervene in, and inserting one would be indirection
   with no theme behind it — which is why `spacing` has **no tier-2 layer at all**
   and why `--_pill-padding-x: var(--spacing-200)` in `esa-pill` is correct rather
   than tolerated. Note where that example now lives: at the **component read**.
   This exception used to be illustrated by a tier-3 hook (`--form-padding-x-lg:
   var(--spacing-400)`), and that hook was deleted on 2026-08-14 — being allowed to
   read spacing directly was never a licence to put a passthrough in front of it.
   The set is defined in `apps/site/src/data/token-graph.ts`
   (`CORE_SETS`) and rendered as "Tier 1 · Core / universal" on `/debug/tokens`;
   that definition is the authority, not this list.

   Read the rule as: **a component reaching past tier 2 for something a theme
   would want to re-point is the bug.** Core tokens are exactly the tokens no
   theme re-points.

   Most semantic tokens alias a primitive. **Dimension roles are allowed to
   define instead** — there is no tier-1 ramp behind a control height or a
   layout width, so tier 2 is where that value legitimately lives. The debug
   page lists these separately from colour hardcodes for exactly this reason.

### Tier-2 colour naming

Colour is the largest and most-read part of this tier, so it has a fixed shape:

```
--color-<property>-<intention>-<variant>-<knockout>-<state>
            │           │          │          │         └── hover, active, focus (optional)
            │           │          │          └──────────── knockout (optional)
            │           │          └─────────────────────── info, success, warning, danger,
            │           │                                   raised, floating, sunken,
            │           │                                   backdrop, scrim, strong, heavy,
            │           │                                   subtle, muted, secondary (optional)
            │           └────────────────────────────────── brand, utility, elevation, overlay,
            │                                               accent, ai, link, disabled (optional)
            └────────────────────────────────────────────── background | content | border
```

**The property slot holds three words and only three.** It said "and `overlay`"
until 2026-08-15, when the fourth retired — see below.

Three of those intentions are **axes with named rungs**, and that is why the
variant slot carries words like `danger`, `sunken` and `backdrop` that look like
intentions themselves. `utility` holds the four feedback rungs, `elevation` the
three surface rungs, `overlay` the translucent washes. All three were separate
intentions until 2026-08-15 — eleven of them between the three — and splitting
one axis across the intention slot is what stopped anything in the system from
saying its rungs belonged together. `knockout` gets its own slot rather than
sharing `variant`, because the variant slot is frequently already occupied —
see `inverse-to-knockout` in `migrations.json`.

**`overlay` is the fourth property that stopped being one.** The washes are
applied OVER a background rather than being one, and `--color-background-hover`
would read as the hover state of the page canvas — the opaque gray-4 that
already owns that meaning — instead of a wash painted on hover. That collision
was real, and a fourth property was the wrong place to resolve it:
`--color-background-overlay-hover` says the same thing in slots the grammar
already had. Property says it paints a fill; intention says it stacks rather
than replaces. It also gave four washes their first intention — `hover`,
`strong-hover`, `heavy-hover` and `active` had named a state and nothing else,
and were the last residents of the unclassified group on `/debug/tokens`.
Now empty, which is the assertion that group exists to make. See
`overlay-property-to-intention`.

**The property is never optional.** It is the thing that makes a name guessable:
a danger border is `--color-border-utility-danger`. Not `--color-danger-border`, and not
`--color-danger` — that one is a background, and it says so.

- **`background`** — fills and surfaces. Page canvas, cards, solid button fills.
- **`content`** — text, icons and SVG strokes. Anything sitting *on* a background.
  `content` rather than `text` because icons read these too.
- **`border`** — strokes and dividers.
There is no fourth. `overlay` was one until 2026-08-15 and is an **intention**
now — see above.

**Neutral is the default intention and carries no intention word.**
`--color-background` is the page; `--color-content-default` is body text. Every
non-neutral names its intention: `--color-background-brand`.

**Two rules that exist because they were once broken:**

1. **The brand intention is `brand`, not `primary`.** `primary` meant two
   different things at once — the brand hue, and the most prominent of a set
   (`--color-text-primary`). Under property-first naming those collapse into the
   same slot and `--color-background-primary` becomes unreadable: brand fill, or
   the main page background? `brand` for the hue, `primary` only for prominence.

2. **A step-11 colour is `content-*`, never `-strong`.** The old
   `--color-danger-strong` sounded like a bolder fill and was used as one; it is
   Radix step 11, which is *text on a surface*. `--color-content-utility-danger` cannot be
   misread that way.

### Defining vs deriving — when tier 2 may point at tier 2

A tier-2 token does one of two jobs, and which one decides what it may reference:

- **Defining** a colour identity → references a **primitive**.
  `--color-background-brand: {color.grass.9}` is where "brand" becomes a value.
- **Deriving** from an identity it does not own → references **another tier-2
  token**. `--color-border-default-focus: {color.background-brand}`.

This is not a loophole in "components read tier 2, never a primitive" — it is what
makes theming work. `build.js` compiles with `outputReferences: true`, so the
reference survives into the CSS as a live `var()`:

```css
--color-border-default-focus: var(--color-background-brand);
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
   `--color-border-default-focus: {color.grass.8}` shipped: a derived token written as a
   defining one, unreachable by every theme, and it stayed green in a navy spoke
   for months without a single error.

### A token earns its slot by naming a role, not by holding a distinct value

Two tier-2 tokens with the **same default value are not redundant**. Tier 2 is the
layer whose entire job is being re-pointed, so the question is whether the *role* is
real, not whether this palette happens to distinguish it.

`--color-background-elevation-raised` and `--color-background-elevation-floating` are both gray-1. They
stay two tokens because a card and a dialog are different jobs, and a theme with an
elevation story will separate them.

This was learned the hard way. `--color-background-brand-active` and
`--color-content-default-tertiary` were briefly deleted for holding their sibling's value —
and cb-fish had already separated both, running a three-step navy press sequence and
a four-step grey ramp. Merging them would have silently overwritten two of its
colours. `scripts/migrate-tokens.mjs` now refuses to apply any rename that collapses
two declared names with different values, for exactly this reason.

The inverse is not licence to invent tokens. "Some theme might need it" would justify
almost anything. The test is whether someone can point at the role: `active` is a real
interaction state; `brand-subtle-hover-inverse` is a combination nobody has named.

**Declaring a role is not delivering it.** 34 of 35 components style `:hover` and one
styles `:active` — the pressed role exists in tokens and barely exists in the UI. A
token with no readers is a promise outstanding, not proof the role is wrong.

**Every intention that has a solid fill also declares its foreground**, as
`--color-content-on-<intention>`. This is not symmetry for its own sake: five of
them were missing, components hardcoded `#fff` in the gap, and on the bright Radix
ramps (lime, yellow, amber, sky, mint) white fails contrast on step 9.
`scripts/check-contrast.mjs` checks each of these pairs, so a spoke that re-points
a fill without re-pointing its foreground gets told.

### Composite families keep their axes separate at tier 1

Where a CSS value has more than one axis, **tier 1 holds the axes; tier 2 does the
composing.** Typography already worked this way — `--font-size-*` and
`--line-height-*` are separate primitives that tier-2 roles assemble. Motion now
matches: `--duration-*` and `--easing-*` at tier 1, combined into `--transition-*`
and `--animation-*` at tier 2.

Fusing them looks harmless and is not. Motion shipped as three composite strings
(`--transition-fast: 150ms ease`), which meant wanting the standard duration with a
different easing required leaving the token system entirely — so 42 of the 73
`transition:` declarations in components and **all 22** `@keyframes` timings
hardcoded their values. A fused token does not just fail to cover a case; it pushes
the case out of the system, where nothing can see or theme it.

It also cost the accessibility feature outright. Honouring
`prefers-reduced-motion` against composite strings means editing every declaration
by hand, so nobody did — the preference appeared in exactly one file in the repo,
the docs page guarding its own demo. With the axes split it is one override block.

`--shadow-*` was the last family still fused, and was split the same way. Tier 1 now
holds only the axes — `--shadow-offset-x`, `--shadow-offset-y-*`, `--shadow-blur-*`,
`--shadow-spread-*`, `--shadow-color-*` — and the composites that cluster them are
`--elevation-1…6` at **tier 2**. That placement is the point: choosing which
combination of axes is a resting card and which is a modal is an intent, not a
material, so the old ordinal `--shadow-050…500` composites were an intent wearing a
tier-1 name, exactly like `--transition-fast` before it. They also formed a 1:1
passthrough — six primitives, six roles, nothing reused — so collapsing them cost
nothing. The old names resolve through the aliases generated from `migrations.json`
(`shadow-composites-to-elevation`).

The motivating axis was colour: every shadow terminated in a hardcoded
`rgba(0,0,0,α)` referencing nothing, so a theme could not tint its shadows at all.
`offset-x` is a single token rather than a ramp because every shadow in the kit casts
straight down; an axis earns a ramp when it has one. The colours deliberately do
**not** alias `black-a`, which starts at 0.05 and steps by 0.05 — five of the six
shadow alphas (0.03–0.08) fall between its steps, so aliasing would have moved
rendered values to make a lineage diagram tidier.

**Compose at the tier that knows the role.** The reduced-motion override re-points
tier 2, not the duration scale, because `reduce` means remove *non-essential*
motion: `--animation-spin` and `--animation-indeterminate` keep running, since a
frozen spinner reads as a hung app. Tier 2 knows which motion is feedback and which
is decoration. Zeroing tier 1 would have taken the spinners with it, and the
exemption would have had to be written as "except steps 750 and 1500" — a fact
about the scale, not about the roles.

**Name composites for the property they land in**, the same rule colour follows.
`--transition-*` goes in `transition`, `--animation-*` goes in `animation`. These
are two sets rather than one `--motion-*` set because they are not
interchangeable — `infinite` cannot appear in a `transition`. *Motion* is the name
of the family, not a prefix; no token is prefixed `--motion-` any more than a
spacing token is prefixed `--foundations-`.

3. **Component** (`src/component-tokens.css`, authored) — the per-component
   (or per-group) theming surface, defaulting to semantic references:
   `--card-bg: var(--color-background-elevation-raised)`. A spoke uses this tier to diverge ONE
   component from the semantic default without forking it.

Inside components, **private `--_*` tokens** consume the public tiers, always
with a literal fallback: `--_field-padding-y: var(--spacing-300, 0.75rem)`.
Privates are internals — never themed, never documented as surface.

## Tier-3 naming

- **Shared group surfaces** for things that must align across components:
  `--form-border-color-focus` — one scale so inputs, selects, and buttons line up
  on a row. Prefer extending a group surface over duplicating the same knob per
  component.

  **This is the category to be most suspicious of, and the count says so.** Six
  of its members are gone. Five went on 2026-08-14: `--form-height-*`,
  `--form-padding-*` and `--form-font-size-*` for being passthroughs that added a
  name and nothing else, and `--form-bg{,-hover,-disabled}` for a different
  reason — see below.

  `--form-radius-*` was held back that day as the one member that looked like it
  was doing work: it encoded a mapping (xs/sm → the small corner, md/lg → the
  default one) that 13 components would otherwise each restate. **It went on
  2026-08-16 anyway, and how it failed is the useful part.** The 13 already
  restated the mapping, one line per size — the hook only changed the spelling.
  What it really did was hide the mapping: four names carried two values, and of
  49 read sites, thirteen carried literal fallbacks describing a 4/6/8/10 ramp
  that the tokens never produced. Seven components rendered 2px off their own
  fallback whenever `component-tokens.css` was absent, for months, unnoticed —
  by the hook that existed to make the mapping visible.

  **A hook that "documents a relationship" is the hardest case to judge, because
  the claim is unfalsifiable until you check the read sites.** Check them. If the
  readers disagree with the token about what it resolves to, the hook was
  documenting nothing. The replacement was a size axis at tier 2 (see shape,
  above) — which is where the ramp had been trying to live all along.

  **The test that separates a group surface from a mis-tiered role: does the
  namespace bound its readers?** A tier-3 hook exists so a spoke can re-skin ONE
  component. `--form-bg` was read by thirteen, five of which are not forms, and
  `_inject-styles` is not even a component. A surface that many components share
  is an INTENT, and intents belong at tier 2 — it is now
  `--color-background-field`. Fanning it out to per-component hooks instead was
  measured and rejected: 162 names, with `esa-text-field` alone carrying 18 form
  hooks, against the 5–9 guidance below.

  Applied across the file, that test leaves exactly three multi-reader sets:
  `--form-*` (12 tokens, 15 components), `--focus-ring-*` (3, read by 35) and
  `--loading-spinner-*` (2, where the second reader composes the first).

  **THIS SENTENCE USED TO END "248 of 311 tier-3 tokens are read by exactly one
  component, which is the shape to hold to." THAT WAS EXACTLY BACKWARDS**, and it
  is the single most expensive error this spec has carried. The
  bounds-its-readers test measures LEAKAGE, which is a real defect, but it says
  nothing about NECESSITY — so it endorsed 249 one-reader tokens as the target
  while flagging the three sets above as the problem. They are the three cases
  tier 3 is *for*: a category surface, a special case, and composition.

  The 2026-08-16 pass applied the necessity test instead (see "The test: WOULD
  this component diverge" above) and took the file from 306 declarations to 116.
  **Both tests are live and they catch different things** — run the leakage test
  on a namespace to see whether it bounds its readers, and the divergence test on
  each hook to see whether it should exist at all. A hook can pass the first and
  fail the second, and 168 of them did.
- **Per-component surfaces**: `--<component>-<part?>-<property>` —
  `--card-bg`, `--card-border-color`, `--dialog-width`, `--avatar-size-md`.
  Size-variant knobs take the size suffix last: `--dialog-width-sm`.
  (This list previously used `--badge-radius` and `--sidenav-item-color` as
  examples; both were demoted on 2026-08-16 for aliasing a tier-2 role, so they
  illustrated the naming shape with hooks that should not have existed.)
- The component prefix is the element name minus `esa-` (esa-side-dialog →
  `--side-dialog-*`).

### Tier-3 colour naming

Colour has a narrower shape than the rest of tier 3, the same way it does at
tier 2:

```
--<component|category|special>-<variant>-color-<property>-<state>
            │                     │            │            └── hover, focus, pressed,
            │                     │            │                disabled  (optional)
            │                     │            └─────────────── background | content | border
            │                     └──────────────────────────── primary, secondary, tertiary,
            │                                                   knockout…  (default omitted)
            └────────────────────────────────────────────────── button, link, table, form,
                                                                focus-ring
```

**We do not ship this shape. One divergence is deliberate, one is outstanding,
and two have been closed.** `/debug/tokens` measures all four slots against the
real names; the summary:

- **Component slot — matches.** Including both non-component cases: `form` is a
  category, `focus-ring` a special case.
- **Property — not qualified.** We write `--card-bg`, not
  `--card-color-background`. Tier 2 qualifies and tier 3 never followed, so one
  property is spelled `bg` and one three ways (`color`, `text`, `text-color`).
  This is the one still outstanding, and it is a legibility cost rather than a
  capability cost — see the note on rename risk below before taking it on.

  *Closed:* `border` used to be the fourth spelling and the only one that cost
  more than legibility. Three tokens were named `border` while `--sidenav-border`
  and `--topbar-border` held a plain colour and `--filter-dropdown-border` held a
  whole `1px solid …` shorthand — so a theme could re-point two of them and could
  not re-point the third's colour without restating a width and style it had no
  reason to care about. All three are now `-border-color` holding a colour, and
  the component composes the shorthand from `--border-width-default`.
- **State — placed correctly.** States trail and `default` is omitted. `active`
  is in use for *currently selected*, so the rubric's **pressed** state still has
  no name available at tier 3 — that one is real and open.

  *Closed:* `--form-border-color-error` put a validation **variant** in the
  trailing slot reserved for interaction states. It is now
  `--form-error-border-color`, which also pairs it with the existing
  `--form-error-color`: one error treatment, two properties.
- **Variant — mostly absent, and this is the substantive gap.** Seven components
  have a real colour-variant axis (button, badge, pill, alert-box,
  confirm-dialog, progress-bar, snackbar-item — measured as reading three or
  more of the four `utility` variants). **Six of them expose none of it at
  tier 3**: they read `--color-background-utility-danger` and friends directly, so their
  variants are themeable only by moving the whole kit's danger.
  `esa-snackbar-item` is the one exception, and its four hooks now put the
  variant *before* the property (`--snackbar-item-danger-bg`), matching
  `--app-bar-brand-bg` and the rubric alike.

**On `disabled`, we disagree with the rubric on purpose.** It puts disabled in
the state slot, per component. We manage it one tier up as an intention
(`--color-background-disabled`, `--color-content-disabled`,
`--color-border-disabled`) and reach for a tier-3 hook only where a component
genuinely differs — **currently nowhere**. That de-duplicates: one disabled
treatment for the kit instead of one per component. Same reasoning as the tier-2
note above, where `disabled` is a variant rather than a state.

The last exception, `--form-bg-disabled`, went on 2026-08-14 with the rest of
the form surface. It is worth knowing what that revealed: it was the ONLY
consumer of `--color-background-disabled` in the whole kit, so the intention
token existed to serve exactly one hook wrapping it. That is also why
`--color-background-disabled` could be re-pointed twice inside two days at zero
blast radius: gray-3 → gray-2 → gray-1, and then back to gray-3 with **no
consumers at all** once fields went transparent and stopped needing a disabled
fill. It never picked its own step — it was pinned one lighter than
`--color-background-field`, because a disabled field the same colour as a
resting one says nothing, so every time the field moved, it moved.

That chase is the lesson, not the values. **A role whose value is derived from
another role's value is not a role, it is a calculation.** The kit's other
disabled states never had this problem because they cue with `opacity` and
`content-disabled` rather than a fill — which is what fields do now too.

**Renaming a tier-3 token is riskier than renaming one at tier 1 or 2, and the
machinery does not say so.** `build.js` emits `--old: var(--new)` for every row
in `migrations.json`, which rescues a spoke that **reads** the old name. But
tier 3 is the surface a spoke **declares** — that is its entire job — and an
alias cannot rescue a declaration. A spoke whose theme file sets
`--sidenav-border: <its colour>` keeps setting a token nothing reads any more:
it loses the override, renders the hub default, and **nothing errors**. The
alias makes it look fine.

So a tier-3 rename is only half-done when the row lands. `/update-tokens` has to
run in every spoke, and `doctor.mjs` has to come back clean, before the rename
can be considered absorbed. The eight renames on this page are the first tier-3
rows in `migrations.json`; one of them,
`filter-dropdown-border-shorthand-to-colour`, is marked `exact: false` because
the value *shape* changed — a spoke that wrote `border: var(--filter-dropdown-border)`
now gets a bare colour where a shorthand was, which is not a valid border.

**The sharpest case of that asymmetry is `form-padding-to-spacing` (2026-08-14),
because there the hub itself invited the declaration.** `packages/spoke-template`
shipped four `__FILL__` slots for `--form-padding-y-*` under a heading that called
padding "the density lever", with defaults one spacing rung tighter than the hub's.
So a spoke could have declared those names *on the hub's own instruction* and will
now silently lose the override — and, because the template ran tighter, get
**roomier** controls rather than merely unchanged ones. The alias covers readers;
deleting the template slot and running `/update-tokens` is the only thing that
covers declarers. When a row removes something the template offered, the template
edit belongs in the same commit.

This is the reason the property-qualification divergence above stays open rather
than being tidied up: 158 colour hooks would move, and every spoke would have to
be walked through the same gate for a change that buys legibility and no new
capability.

**What the variant gap actually forecloses.** Reading tier 2 directly is legal
and keeps the surface small — the whole kit's danger moves as one, which is
usually what a spoke wants. The cost is the other direction: a spoke cannot make
its danger *button* differ from its danger *badge*, because there is no hook
between them. That is the trade to revisit if a spoke asks for it, not a defect
to fix pre-emptively — per the rule below, a hook is earned by a spoke asking,
not by a rubric having a slot.

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

### The test: WOULD this component diverge, not COULD it

**This is the canonical rationale for the 2026-08-16 demotion pass, and every
`*-hooks-removed` row in `migrations.json` refers back to here rather than
restating it.**

The audit that drove that pass measured all 306 tier-3 declarations. **249 were
read by exactly ONE component, and 240 held no value of their own — a pure alias
over a tier-2 role.** Fifteen distinct names aliased `--color-content-default`
(`--dialog-color`, `--popover-color`, `--pill-text-color`, `--kbd-color`, …);
thirteen aliased `--color-border-default`; eleven aliased
`--color-background-elevation-raised`.

A hook like that is **a role wearing a component's name.** It adds a name and no
capability. Ask of every hook:

> *Would* a theme make this component diverge from the role it points at — not
> *could* it. Every hook could.

`--card-radius` → no: a brand re-points `--radius-md` and wants the card to
follow. `--button-radius-md` → yes: pill buttons beside square fields is an
ordinary house style, and the shared token made it unreachable.

**The cost of the extra name is not neutral, which is the part that surprises
people.** A spoke re-pointing `--color-background-elevation-floating` *wants* the
dialog, popover, dropdown menu, command palette, confirm-dialog and search-panel
to move together. Six separate hooks in front of that role are six chances to
move five of them and miss one — and the miss is silent, because each hook still
resolves.

Three consequences worth stating outright:

- **A hook is earned by demonstrated divergence, not provided in anticipation of
  it.** The pass kept every hook a real spoke had actually overridden and
  demoted the rest. If a spoke later needs one back, that is a `/request-lego` —
  a cheap, visible request — not a surface carried indefinitely on the chance
  someone wants it.
- **Removal, never rename.** These rows carry `removed: true` even though the
  destination is known and value-identical. A rename row would emit
  `--card-bg: var(--color-background-elevation-raised)` into `tokens.css`,
  keeping the dead name shipped and in the baseline forever; worse,
  `migrate-tokens.mjs` rewrites *declarations* as well as reads, so it would turn
  a spoke's one-component override into a whole-role override and report success.
  The destination rides in the pair's second element as **print-only guidance**.
- **Literal micro-geometry is not in scope and must not be swept in.**
  `--dialog-width: 480px`, `--side-dialog-width-lg`, `--tab-layout-height-md`
  and the rest hold values with no tier-1 or tier-2 home. Demoting one does not
  move the capability somewhere better — it deletes it and hardcodes the number.
  The test above only applies to a hook that *has* a role to fall back to.

## Mechanics (zero-regression rule)

Adding a hook NEVER changes rendered output:

```css
/* component-tokens.css (authored default = the old semantic chain) */
--card-bg: var(--color-background-elevation-raised);

/* inside the component: hook spliced ABOVE the old chain, old fallback kept */
--_card-bg: var(--card-bg, var(--color-background-elevation-raised, #fff));
```

Spokes already shipping are untouched by construction: every new token's
default resolves to exactly what the component read before.

## Staged surfaces

A tier-3 namespace may be declared **before** the component that reads it, so
the theming contract can be reviewed before code depends on it. `--grid-*` is
staged today — no `esa-grid` component ships yet.

`--topbar-*` **was** listed here and should not have been: `esa-app-shell`
renders the bar, the sidebar toggle and the omnibox that those 12 tokens named.
The premise of staging is *"the component does not exist yet"*, and because
"staged" reads as *"arriving soon"* nobody re-checked it once that stopped
being true. It became a chrome exemption, and on **2026-08-16 it was deleted
outright** — see below.

A staged surface must:

- be listed in `STAGED_PREFIXES` in `apps/site/src/data/token-graph.ts`, which
  keeps it out of the orphan check and into its own inventory bucket;
- carry a `(STAGED)` banner comment in `component-tokens.css` saying why;
- have a component doc page describing the contract in the same names.

Removing a prefix from that list should mean **the component landed**, not that
the finding got annoying. A staged surface that no one has claimed after a
release cycle is dead surface — fold it away.

**`--grid-*` is deliberately being held past that rule**, and the exception is
recorded here so the next sweep does not delete it on this section's authority.
The 24 tokens are the theming contract an AG Grid wrapper will read, and a data
grid is one of the three cases tier 3 exists for. **Review it against the tier-3
framework by the next release cycle**: either the wrapper has landed and the
surface is wired, or the surface has to justify itself again from scratch. It is
the largest unread block in the file and the only one exempt from its own rule.

## A shipped `.css` partial is a token READER

Three of the audit's worst findings have been the same mistake: a token reported as
having no readers because nothing looked at the file reading it. `--duration-0`
(its reader was a `@media` block), `--topbar-*` (filed "staged" on a false
premise), and then all 113 `--typography-*` composites, which
`src/typography.css` reads 169 times while the graph scanned only
`packages/ecology/src/components`. That last one made 102 of 125 reported
orphans false and the health tally read 126 instead of 23.

So: **this package ships more than `dist/tokens.css`.** `src/typography.css` and
`src/layouts.css` are authored partials in the `exports` map, and they consume
tokens exactly the way a component does. Adding another one requires a
`SCAN_ROOTS` entry in `apps/site/src/data/token-graph.ts`, or a
`READ_SCAN_EXEMPT` entry stating why not. The check is derived from this
package's own `exports` map and counts toward the health total, so shipping a
partial from a location no root covers fails visibly rather than quietly
inflating the orphan list.

The general form, which is worth keeping in mind beyond tokens: **usage is a
different question from value, and it has to be asked of every surface that
ships — not of the surfaces a tool happened to open for some other reason.**

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
  hid them would be indistinguishable from having wired them;
- **assert that its declared values match what the owner actually renders, and
  re-check that.** This rule is new, and it is the one the category died of.

**`CHROME_EXEMPT` IS EMPTY AS OF 2026-08-16.** `--topbar-*` → `esa-app-shell`
was the only entry and all 12 tokens are gone (`migrations.json`:
`topbar-chrome-exempt-removed`). The category is kept, empty, because *how* it
failed is the useful part.

Every disclosure rule above was satisfied. There was an owner, there was a
stated cost, the tokens were rendered by name. And the block still rotted:
**seven of the twelve defaults drifted from what `esa-app-shell` actually
paints** — it claimed the bar sat on `background-elevation-sunken` and the
toggle on `content-secondary` while the component painted `elevation-raised`
and `content-tertiary`.

Nothing could have caught that. The tokens had no readers, so no render
depended on them, so no test, no audit and no visual diff could disagree with
them. **An unread hook is inert; an unread hook with a wrong default is a
published contract that lies** — a spoke reading it to learn the chrome learns
something false, and a spoke overriding `--topbar-bg` gets silence.

So the standing decision an exemption represents has to include re-verifying the
values, by hand, because nothing else will. Absent someone willing to own that,
**delete the surface instead**. That is what happened here.

## Themes consume the tiers like this

```css
[data-theme="cb-fish"] {
  /* tier 2 — the brand: everything 'primary' becomes navy */
  --color-background-brand: #1e5386;
  /* tier 2 — shape is a role too: flatter corners.
     Note what is NOT here: there is no size lever. This example used to read
     `--control-height-md: 36px` beside the radius; that token was deleted on
     2026-08-14 and the padding hook that briefly replaced it went the same day.
     A theme cannot make its inputs tighter — see tokens/semantic/size.json. */
  --radius-md: 4px;
  /* tier 3 — ONE component diverges from those defaults */
  --card-radius: var(--radius-sm);
}
```

Never re-point a primitive; never style `.esa-*` internals from a theme. If a
theme finds itself wanting to move `--radius-200` or `--shadow-blur-300`, the real
problem is a missing semantic role — add the role, don't move the ingredient.
