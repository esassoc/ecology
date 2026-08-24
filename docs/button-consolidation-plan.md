# Consolidating esa-icon-button + esa-icon-link into esa-button

**Status:** phases 1–4 landed and verified. Phase 5 (deletion) BLOCKED on spokes.
**Date:** 2026-08-14

## Build status

| Phase | State | Notes |
|---|---|---|
| 1 · `variant="chrome"` on esa-button | **done** | + `current`, `label`, `tag="summary"`; 15/15 behavioural asserts |
| 2 · convert call sites | **done** | 4 components converted; site demos ride the shims |
| 3 · deprecate old components | **done** | both are forwarding shims that warn; doc pages banner-ed |
| 4 · migration machinery | **done** | new `kind: "component"` + `renameComponent()` + 10 tests |
| 5 · delete the shims | **BLOCKED** | must not land until spokes have run `/update-tokens` |

A **fifth collision** surfaced during phase 1 that §2 missed: `esa-button` hardcoded
`role="button"` on every `<a>`. Correct for "a link styled as a page action"; wrong
for chrome, whose entire purpose is nav links — it announces a real link as a button
and drops link semantics. Chrome links now omit it.

Measured deltas (browser, tokens loaded):

| | icon-button → chrome iconOnly | icon-link md → chrome md | icon-link sm → chrome sm |
|---|---|---|---|
| height | 44 → 46 | 16 → **46** | 14 → **38** |
| icon | 20 → 20 | 16 → **20** | 14 → **16** |
| font | — | 16 → 15 | 14 → **12** |

`esa-icon-button` converts essentially lossless (the 2px is button's transparent
border). `esa-icon-link` changes materially — and note those old 16px/14px nav
targets were under the 24px AA floor, where the new 46px/38px clear 44px AAA.

The gray-12 collision is no longer an argument, it is a measurement: on a
`tone="brand-strong"` bar, `ghost` computes to `rgb(23,23,23)` on `rgb(23,23,23)`
— 1:1. Chrome computes white, 17.93:1.

## Decisions (2026-08-14)

| # | Question | Decision |
|---|---|---|
| 2a | `active` ARIA collision | **Separate `current` prop.** `active` keeps `aria-pressed`; nav items use `current` → `aria-current`. |
| 2b | `tag="summary"` breaks `<details>` | **Suppress the wrapper** when `tag="summary"`; classes go on the `<summary>`. |
| 2c | `weight` vs the typography contract | **Drop it** — audit found zero usages (see below). |
| 2d | Metrics | **Inherit button's**, landed behind a visual diff on brand / brand-strong bars. |

### Audit findings that changed the estimate

- **`weight=` is passed zero times anywhere in the repo.** Its own doc page never
  demos it. Same evidence class as `iconOnly` — a prop that shipped and was never
  reached for. Dropping it is free in-repo; spokes are covered by the phase-4
  component-rename row warning on unmapped props.
- **`active` is used once**, in a single icon-link doc-page demo — not 21 times.
  The `active` → `current` conversion is one line.
- **The "21 references" figure was inflated.** Real usages: 3 inside components
  (`esa-nav-dropdown`, `esa-header-nav`, `esa-app-shell`) + 1 pattern page. The
  remainder are doc-page demos and code-sample strings, which change with their
  page rather than being independent migration sites.

## 0. The decision

The system has **three components for one idea**. `esa-button`, `esa-icon-button`,
and `esa-icon-link` are all "a clickable thing with an optional icon". They share
six props with identical names and meanings — `href`, `icon`, `iconRight`, `size`,
`active`, `type` — and each has independently been through its own prop-rename
churn (`color`→`variant` on button, `trailing`→`iconRight` on icon-link).

Consolidate to one: `esa-button` gains `variant="chrome"`, the variant that takes
its color from context instead of owning it. `iconOnly` — previously dead code with
zero call sites — becomes the load-bearing distinction between the two absorbed
components.

```astro
<!-- was esa-icon-button -->
<EsaButton variant="chrome" iconOnly icon="search" label="Search" />

<!-- was esa-icon-link -->
<EsaButton variant="chrome" icon="map" iconRight="chevron-down">Layers</EsaButton>
```

## 1. Why the CSS is the easy part

The visual difference between chrome and every existing button variant is three
declarations:

```css
color: inherit;                                                 /* not a chosen color */
background: color-mix(in srgb, currentColor 14%, transparent);  /* hover              */
outline-color: currentColor;                                    /* focus ring         */
```

The third matters independently: button currently hardcodes `--focus-ring-color`,
which has the same invisible-on-dark-chrome problem that motivated this whole
review. Chrome must derive it from context.

The work is **not** the CSS. It is six behavioural collisions (§2) and a missing
migration shape (§4).

## 2. Blocking decisions

These change what gets built. Each is a real semantic conflict, not a style
preference.

### 2a. `active` means two different things — **highest risk**

| | today | ARIA emitted |
|---|---|---|
| `esa-button` | toggle is on | `aria-pressed="true"` |
| `esa-icon-link` | this is the current page | `aria-current="true"` |

These are not interchangeable. `aria-pressed` on a nav link tells a screen reader
the link is a toggle button that is currently depressed — wrong, and worse than
silence. Merging `active` naively will regress every nav bar in the system.

**Options:**
1. `active` keeps emitting `aria-pressed`; add a separate `current` prop for the
   nav case. Two props, honest semantics. *Recommended.*
2. Infer from `href` — an `<a active>` gets `aria-current`, a `<button active>` gets
   `aria-pressed`. One prop, but the ARIA silently changes with an unrelated prop.
3. `variant="chrome"` switches the meaning. Worst of both — invisible coupling.

### 2b. `tag="summary"` breaks button's DOM

`esa-button` renders a **wrapper `<span>` plus the native element**. `esa-icon-link`
renders a single bare element. `<summary>` must be the direct first child of
`<details>` — so `<details><span class="esa-button"><summary>` is invalid HTML and
the disclosure stops working.

`esa-nav-dropdown` depends on this today
(`<EsaIconLink tag="summary" iconRight="chevron-down">`).

**Options:**
1. `tag="summary"` suppresses the wrapper and puts the classes on the `<summary>`
   itself. Means button has two DOM shapes. *Recommended — contained, and the
   wrapper only exists to carry variant classes.*
2. Leave `esa-nav-dropdown` on a private inline trigger. Avoids the fork; adds a
   fourth implementation of the thing we're consolidating.

### 2c. The typography contract has no room for `weight`

`esa-button` takes type from the composite classes (`typography-label-*`) and its
source carries an explicit prohibition:

> Nothing font-related may be declared here: Astro scopes this rule with a
> `[data-astro-cid-*]` attribute, which outranks the composite's single-class
> selector, so a leftover declaration would silently beat the composite rather
> than layering with it.

`esa-icon-link` declares `font-size` and `font-weight` directly and exposes a
`weight` prop (`regular | medium | semibold`). Those cannot coexist with the
composite in the same element without the composite losing.

**Options:**
1. Drop `weight`; nav text takes `typography-label-*` like all other button text.
   Cleanest, but `active` currently bolds to semibold — see 2d. *Recommended.*
2. Add `label-*-strong` composites as a second axis on chrome only.
3. Keep a `weight` prop that swaps the composite class rather than declaring
   `font-weight`. Preserves the API, honours the contract, most code.

### 2d. Sizes and metrics genuinely differ

| | `esa-icon-link` | `esa-button` |
|---|---|---|
| scale | `sm \| md` | `xs \| sm \| md \| lg` |
| md font | `1rem` **fixed** (`--icon-link-font-size-md`) | `--font-size-200` → `clamp(0.75rem … 0.9375rem)` **fluid** |
| padding | `0` | `--form-padding-{y,x}-*` |
| gap | `6px` (`--icon-link-gap`) | `8px` |
| hover | `text-decoration: underline` | background tint |
| active | `font-weight: 550` | background tint + `aria-pressed` |

Two consequences worth stating plainly:

- **Nav text shrinks.** 16px fixed → fluid, maxing at 15px. Visible across 21 call
  sites.
- **Nav rows re-space.** `padding: 0` → form-scale padding changes every app-bar
  layout unless chrome zeroes padding when not `iconOnly`.

**Decision needed:** does chrome inherit button's metrics (accept the visual
change, one model) or preserve icon-link's (`padding: 0`, fixed 16px, underline
hover — a metrics fork inside button)? *Recommendation: inherit button's metrics
and accept the visual delta, but land it behind a visual-diff pass (§6) so the
change is seen rather than discovered.*

## 3. Scope

**17 files** reference the two components.

Components (6): `esa-app-bar`, `esa-app-shell`, `esa-header-nav`,
`esa-nav-dropdown`, `esa-icon-button`, `esa-icon-link`
Site (8): `pages/components/` × 5, `pages/patterns/` × 2, `data/catalog.ts`,
`data/tier1-naming.ts`
Spoke surface (1): `packages/spoke-template/CLAUDE.md` — maps `.foo-icon-btn` →
`esa-icon-button`

Plus: 3 doc pages → 1; two tier-3 token surfaces (`--icon-button-bg-hover`,
`--icon-link-font-size-*` / `--icon-link-gap`) fold into `--button-chrome-*`;
`tier1-naming.ts` currently flags the `--icon-*` prefix collision, which this
resolves.

## 4. The migration machinery gap

`migrations.json` supports `kind: "prop"` (rename `pairs`, tag-scoped via
`components`) and `kind: "token"` (with `removed`). It has **no shape for a
component rename**, which is what this is:

```
esa-icon-button           → esa-button + variant="chrome" + iconOnly
esa-icon-link             → esa-button + variant="chrome"
esa-icon-link size="md"   → esa-button size="?"        (value remap)
```

Needs a new `kind: "component"` in `scripts/lib/token-rename.mjs` supporting
`from` / `to` / `addProps` / `mapValues`, plus the import-specifier rewrite
(`@esa/ecology/esa-icon-button.astro` → `esa-button.astro`). The existing
`module`-based aliased-import resolution already solves the hard half — a spoke
writing `<IconButton />` is only reachable by reading that file's own imports.

**Without this, spokes get a false all-clear from `/update-tokens` and `doctor`.**
Per CLAUDE.md that has already happened once.

## 5. Phasing

Each phase is independently shippable and leaves the tree green.

1. **`variant="chrome"` on `esa-button`** — additive, nothing else moves. Includes
   the `currentColor` focus ring, the `label` prop + build-time warning when
   `iconOnly` has no accessible name, and the 2b DOM fork if chosen. Ship, verify
   on a dark app bar.
2. **Convert call sites** — 6 components + 8 site files. `esa-nav-dropdown` is the
   risky one (2b). Old components still exist and still work.
3. **Deprecate** — `esa-icon-button` / `esa-icon-link` become thin shims that
   forward to `esa-button` and warn at build time. Zero-regression splice per
   `packages/tokens/SPEC.md`. Doc pages get deprecation banners.
4. **Migration rows** — `kind: "component"` in `token-rename.mjs` + `migrations.json`
   rows + tests (the spinner-style regression test: a spoke component also named
   `IconButton` must not be rewritten).
5. **Remove** — delete the shims, doc pages, catalog rows; fold the tier-3 tokens;
   update `spoke-template/CLAUDE.md`. Only after spokes have run `/update-tokens`.

Phases 1–3 can land now. **Phase 5 must not land until spokes have migrated** —
they are told to use `esa-icon-button` by name in their own CLAUDE.md.

## 6. Verification

- `npm test` + `npx tsc --noEmit` across all components
- Drift check across all doc pages — deleting pages must not orphan catalog rows;
  `catalog.ts` only enforces that source files are *categorised*, so a missing page
  degrades silently to an unlinked row. Check both.
- **Visual diff on dark chrome specifically** — `tone="brand"` and
  `tone="brand-strong"` app bars, which is where the gray-12-on-gray-12 collision
  lives. This is the regression class the whole change exists to prevent, so it
  must be seen, not asserted.
- Contrast + tap-target numbers reported, not fixed — per the standing batched a11y
  pass. `esa-icon-button` at `xs` currently lands ~32px, under the 44px AAA target.
- `node scripts/doctor.mjs` against a real spoke after phase 4.

## 7. What could go wrong

| Risk | Mitigation |
|---|---|
| `aria-pressed` silently replaces `aria-current` across every nav | 2a decided explicitly before phase 1 |
| `esa-nav-dropdown` disclosure breaks (invalid `<details>` child) | 2b; test the dropdown before phase 2 lands |
| Nav typography/spacing shifts at 21 call sites | Visual diff in phase 2, not after |
| Spokes break on phase 5 | Phase 5 gated on `/update-tokens` having run |
| `weight` prop silently stops working | 2c; if dropped, needs a `prop` removal row — a shape `kind: "prop"` also lacks today |

## 8. Honest cost

Bigger than the three CSS lines that motivated it. The CSS is an afternoon; the
six collisions in §2 and the migration shape in §4 are the actual work, and §2a
and §2b are correctness bugs if rushed rather than cosmetic ones.

It is still the right call. Three components, six duplicated props, two parallel
deprecation shims, and a tier-1 token-prefix collision is a recurring tax that
does not stop growing on its own.
