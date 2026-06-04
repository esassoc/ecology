# Beacon → Ecology Gap Analysis

Comparing Beacon's frontier UI kit (`esassoc/Beacon`, `develop`, `Beacon.Web/src/app/shared/ui` — 29 `ui-*` primitives) against Ecology's 45 components. Beacon's `shared/ui` is the clean, recent, deliberately-designed system (note the `UiSize` doc comment on non-breaking widening, the multi-axis button model). Goal: align Ecology to it.

> Scope: focused on Beacon's `shared/ui` design-system kit + its variant types. The older `shared/components` layer (ag-grid, badge, alert-box, breadcrumbs, command-palette, beacon-select/filter) overlaps with Ecology and is noted where relevant.

---

## 1. The variant model — the biggest gap (touches everything)

Beacon uses a **multi-axis** model; Ecology uses single-axis `variant`. This is the highest-leverage alignment.

### Size scale
| | Beacon | Ecology |
|---|---|---|
| Tokens | `xs · sm · md · lg` (`UiSize`; icons add `xl`) | `small · medium · large` |
| Default | `md` | `medium` |
| Notes | One scale shared across button/input/icon-button so they line up on a row | No `xs`; full words |

**DECIDED:** Ecology **adopts Beacon's `xs/sm/md/lg`** (default `md`) and adds `xs`. This reverses the old "full words" rule — the project convention (CLAUDE.md) is updated to match. All components, the icon size map, and the docs migrate from `small/medium/large`.

### Button = `color` × `appearance` × `size` × `active`
Beacon decomposes the button into independent axes:
- **color** (8): `primary · secondary · danger · success · warning · info · ai · ghost`
- **appearance** (3): `fill · outline · dashed`
- **active**: `aria-pressed` toggle state
- Slots: `[slot=leading]` / `[slot=trailing]`; applied as an attribute to native `button`/`a`.

Ecology's `esa-button` has a **single** `variant` (`primary · secondary · outline · ghost`) that conflates color and appearance — so it **cannot express** danger-outline, success-fill, the `ai`/copper variant, dashed, or a pressed/toggle state.

**Recommendation:** refactor `esa-button` to `color × appearance (+ active)`. Unlocks 24 combinations and the semantic-color buttons Beacon relies on. `ai` maps directly to Ecology's existing copper tokens.

### `appearance` is a recurring axis
- **Tabs**: `underline · segmented`
- **Popover**: `default · inverse`
- **Chip tone**: `neutral · neutral-strong · teal · amber`

Ecology lacks all three. Worth adopting `appearance`/`tone` as first-class, reusable axes.

---

## 2. Missing components (Beacon has, Ecology lacks)

| Beacon component | What it is | Ecology status | Priority |
|---|---|---|---|
| **ui-side-dialog** (+ `-header/-body/-footer`) | Slide-in **drawer / side sheet**, composable | **None** | **High** |
| **Composable dialog** (`ui-dialog` + `-header/-body/-footer`) | Dialog built from slotted parts | `esa-dialog` is monolithic | Medium |
| **ui-input-tag** | Tag/token multiselect input (`UiFormControlBase`) | None | Medium |
| **ui-chip-group** | **Selectable** chips, single value, per-chip `tone` | `esa-pill`/`esa-pillbox` are display-only | Medium |
| **ui-button-toggle** | Segmented toggle bound to a value (form control) | `esa-button-group` is single-select display | Medium |
| **ui-danger-zone** | Destructive-action settings section (heading + description + slotted actions) | None | Medium |
| **ui-icon-button** | Dedicated icon button, `color × appearance × size × active` | Folded into `esa-button` `iconOnly` | Low (decide) |
| **ui-field-error** | Binds to a **form control**, renders its validation errors | `esa-form-field` shows static error text | Medium |
| **ui-month-day-picker** | Month+day, **no year** (recurring/annual dates) | None | Low (domain) |

---

## 3. Architecture divergences (same goal, different shape)

- **Form model.** Beacon bakes `label` + `hint` into *every* input, pairs them with a control-bound `ui-field-error`, and shares a `UiFormControlBase<T>` base class. Ecology uses a separate `esa-form-field` wrapper + per-input `ElementInternals`. → Pick one unified form-field model before adding more inputs.
- **Toast/snackbar.** Beacon's `ui-toast` is driven by an `AlertContext` enum (Primary + semantic contexts) with a context→icon map + `actions[]`. Align Ecology's `esa-snackbar` context/severity set to the same enum.
- **Button as attribute** (`button[ui-button]`) is an Angular idiom; Ecology stays framework-agnostic (Web Component), but should adopt the *variant model*, not the selector style.

---

## 4. Where Ecology is ahead / divergent

Ecology has primitives Beacon's `ui-*` kit doesn't: `esa-avatar`, `esa-color-picker`, `esa-range-slider`, `esa-file-upload`, `esa-progress-bar`, `esa-empty-state`, `esa-pagination`, `esa-sidebar-nav`, `esa-header-nav`. (Some Beacon equivalents live in its older `shared/components`: `ag-grid`, `command-palette`, `back-to-top`, `breadcrumbs`, `badge`, `alert-box`, `beacon-select`, `beacon-filter`.) So a few "gaps" are really *layer* differences, not true absences.

---

## 5. Alignment roadmap — STATUS

1. ✅ **Size scale** — adopted `xs/sm/md/lg` (default `md`) + new `xs` across all components, docs, icon map, `--form-*` token scale, CLAUDE.md.
2. ✅ **Button variant model** — `esa-button` refactored to `color (8, incl. ai→copper) × appearance (fill/outline/dashed) × active`.
3. ✅ **Drawer / side-dialog** — new `esa-side-dialog` (slide-in, backdrop, focus trap, Esc, composable).
4. ✅ **Composable dialog** — added `slot="header"` to `esa-dialog` + `esa-side-dialog` (header/body/footer all slottable).
5. ✅ **New form controls** — `esa-input-tag`, `esa-chip-group` (with tones), `esa-button-toggle` (all form-associated WCs).
6. 🟡 **Form model** — added presentational `esa-field-error`. *Deferred:* the deeper control-bound binding + unifying every input onto one form-field base (Beacon's `UiFormControlBase`) — Ecology's inputs already self-manage via `ElementInternals`, so this is an architecture call, not a blocker.
7. ✅ **`danger-zone`** (`esa-danger-zone`), **tabs** `appearance` (underline/segmented), **popover** `appearance` (default/inverse).

**Still open (low priority, from §2):** dedicated `icon-button` (Ecology folds into `esa-button` `iconOnly`); `month-day-picker` (domain-specific). Both deliberately deferred.

---

*Source clone retained at `/tmp/beacon-frontier` for building these out next.*
