# Plan — components adopt typographic roles

**Status:** decisions taken 2026-08-13, nothing built.

## The goal

Every piece of text the component kit renders resolves to a named typographic
**role** — `body-sm`, `label`, `meta` — instead of being assembled at the call site
from a size, a weight and a line-height.

"Chrome" stops being a category the whole library falls into. It means this site's
own furniture, nothing more.

## The rule

**A component names the role once.** It says "this text is a label" — it does not
list a family, a size, a weight, a line-height and a letter-spacing.

```
  ✗   font-family: var(--typography-label-font-family);
      font-size:   var(--typography-label-font-size);
      font-weight: var(--typography-label-font-weight);
      …

  ✓   class="typography-label"
```

Referencing the five property tokens is the same assembling-at-the-call-site
problem in a better disguise: it still lets a component take four of the five and
invent the fifth, which is how the vocabulary stops meaning anything.

**No new tier-2 roles for kit-specific jobs.** A button's or an input's typographic
needs are a tier-3 hook pointing at an existing role, not a new role. Tier 2 stays
the vocabulary of the design, not a mirror of the component list.

## Decisions

| | |
|---|---|
| **D1** | `--font-size-ui-*` is **killed.** It is a size-only scale running parallel to the roles, and it is the shortcut that let components pick a size without adopting a role. Its 9 tier-3 hook consumers re-point at composite tokens. |
| **D2** | Components reference the **composite as a unit** — `typography-label` — never its five property tokens. |
| **D3** | Kit-specific typographic needs are **tier-3 hooks**, not new tier-2 roles. |
| **D4** | `esa-label` (and friends) — probably, decided after P0. |

**The mechanism D2 needs.** CSS has no composite custom property, so a composite is a
class. A global class does not cross a shadow boundary, and 33 components are Lit.
The fix is plumbing, not design: export the `.typography-*` definitions as a shared
Lit `CSSResult`, which each Lit component adds to `static styles`. Astro components
use the class as-is. Same class name on both sides, one definition, no duplication.

**Adopting a role is all-or-nothing, and that is the point.** The sizes line up
exactly; the other four properties do not always. A badge at `--font-size-100` +
`semibold` becomes `label`, which is `medium` — visibly lighter. So migration is a
design reconciliation, not a codemod. Where a role turns out to be wrong for real
use, the fix is to change the role once, not to exempt the call site.

## What is true today

The roles exist and are complete: 13 roles × 5 properties = 66 tokens, every value a
`var()`, every role setting all five properties. **No component reads any of them.**

Across 66 components:

| | declarations |
|---|---|
| read a tier-3 hook — correct | 75 |
| read a tier-1 `--font-size-<num>` — SPEC violation | 100 |
| read `--font-weight-<word>` | 62 |
| read `--font-sans` / `--font-mono` | 65 |
| read `--line-height-<word>` | 33 |
| read a composite role | **0** |

Every size in use maps to a role at an identical value:

```
--font-size-150 (30 reads) → body-sm      --font-size-050  (2) → eyebrow
--font-size-100 (27)       → label, meta  --font-size-400  (3) → title
--font-size-200 (24)       → body-md      --font-size-600+ (3) → heading-lg, display
--font-size-300  (9)       → body-lg
```

## Phases

**P0 · Inventory — no edits.** For every typography declaration in the kit: component,
the five properties as they render today, the nearest role, and the per-property
delta. Also resolves the open questions below. Output is a table we read together.

**P1 · Ship the mechanism.** The shared `CSSResult`, plus one Lit component and one
Astro component migrated end-to-end as the golden pattern. Reviewed before anything
else moves.

**P2 · Migrate, in batches grouped by role** rather than by component, so each batch
is one typographic decision reviewed once. Every batch reports its deltas — "these 4
call sites get 50 weight units lighter" — rather than claiming neutrality.

**P3 · Kill `--font-size-ui-*`.** Re-point its 9 tier-3 hooks at roles, delete the
tokens, add the `migrations.json` row so spokes get an alias rather than a silent
drop.

**P4 · Close the door.** Delete `_inject-styles.ts` (0 importers, hardcoded literals,
dead). Add an audit rule that fails when a component reads a tier-1 typography token
directly. Without this the drift returns — the 100 reads accumulated precisely
because nothing ever objected.

**P5 · `esa-label`** (D4), if P0 says the kit wants one.

## Open questions for P0

- **Which components need a tier-3 hook they do not have?** 75 declarations already go
  through one; the rest read raw. Some of those want a hook, some should read the
  composite directly. P0 says which.
- **What do the four `--form-font-size-*` hooks point at once the ui ramp is gone?**
  Their sizes map to `eyebrow / label / body-md / body-lg`. `eyebrow` is a strange
  source for an xs form control — it is an uppercase role — even though pointing at
  its *size* token drags none of that along. Worth deciding whether `xs` should exist.
- **Do `label` and `meta` stay distinct?** Both are `--font-size-100`; they differ only
  in weight (medium vs regular). That is a real distinction, but P0 should confirm the
  kit actually uses both.

## Out of scope

The docs site's own chrome. It is legitimately chrome and keeps what it uses.

## Risks

- **P3 is where things move.** Sizes are safe; weights and line-heights are not.
- **Volume.** ~260 declarations. Grouping by role keeps the number of *decisions* near
  the number of roles rather than the number of call sites.
- **P2 touches spokes.** `--font-size-ui-*` has no spoke readers today, but the removal
  still needs a `migrations.json` row so a spoke that adopts it before we delete it
  gets an alias instead of a dropped declaration.
