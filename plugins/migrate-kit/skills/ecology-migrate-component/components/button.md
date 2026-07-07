# Component reference: button → esa-button

Loaded by `ecology-migrate-component` when the target is **button**. `SKILL.md` holds the general workflow + generalizable rules; this file holds the button-specific playbook. (First per-component reference; siblings — `form-field.md`, `select.md`, `dialog.md`, … — follow the same shape.)

## Target
- Lego: **`esa-button`** — an Angular attribute directive `button[esa-button], a[esa-button]` (the native element stays the host → `type`/form/focus/a11y come free). Primary Angular reference: **Noria `esa-button`** (`shared/components/esa/button/`) — already this exact directive shape (signal inputs, computed host-class, composes `esa-icon`); **Beacon `ui-button`** = fallback + variant-superset signal; token contract: hub `esa-button.astro`.
- Variants: `color` (primary/secondary/danger/success/warning/info/ai/ghost) × `appearance` (fill/outline/dashed) × `size` (xs/sm/md/lg), + `active`/`loading`/`icon` (leading Lucide glyph).
- **Icon-only buttons are NOT esa-button** → use **`esa-icon-button`** (composing `esa-icon`).

## Native-element absorption (see SKILL Notes)
The button migration absorbs **every native `<button>`**, not just an existing wrapper. Inventory (`grep '<button>'`), batch by area, gate per batch, **retire the legacy stylesheet last**.

## Legacy classes → variants
Find the app's legacy global button stylesheet (a `.btn`/`_btn.scss`-style sheet) and map its classes. A typical Bootstrap-ish sheet maps like:

| legacy class | esa-button |
|---|---|
| `btn-primary` | `color="primary"` (fill) |
| `btn-secondary` | `color="secondary"` |
| `btn-success` / `btn-danger` / `btn-orange` | `color="success"` / `"danger"` / `"warning"` |
| `btn-*-outline` | `appearance="outline"` + that color |
| `btn-link` / `btn-text` / `btn-muted` | `color="ghost"` |
| `btn-sm` → `size="sm"` · `btn-lg` → `size="lg"` | |
| `btn-icon` (icon-only) | → **`esa-icon-button`** |

Drop the `.btn`/`.btn-*` tokens in the same edit (preserve other utility classes). An **explicit** variant class wins over the cancel default — **except for chrome/toolbar icon buttons:** an icon-only control in a toolbar/chrome (a grid CSV/fullscreen/clear button, an app-bar action) → `esa-icon-button` **default ghost** (transparent, currentColor) so the toolbar's icons read as one set; do NOT carry a legacy `btn-*-outline`/branded class onto a chrome icon button — match its sibling chrome icons, not its old class.

## Legacy state hooks → native inputs
- `[class.disabled]="x"` (cosmetic-only class) → native `[disabled]="x"`.
- `[buttonLoading]="x"` (a directive injecting a spinner) → the lego's `[loading]="x"` (remove the directive import).
- On an `<a esa-button>` (an anchor can't take native `disabled`), map disabled state to `[attr.aria-disabled]="true"` — the lego styles `[aria-disabled="true"]`.

## Icons inside buttons
A glyph may be FontAwesome (`<i class="fa fa-download">`) **or** the app's own icon component (`<icon icon="CircleX">`). Both → a Lucide name in `esa/icon/lucide-icons.ts` (add if missing). Leading → esa-button `icon=`; trailing → project `<esa-icon>` into content. A glyph may also be a **literal text character** in the label (`+ Create`, `Save →`, `×`) — treat it as a glyph: leading char → `icon=`, trailing char → projected `<esa-icon>`, dropping the literal. A projected (trailing) `<esa-icon>` has no auto-sizing → set `size="sm"` (matches an md button's leading glyph). An existing native `[disabled]`/`[type]` binding is kept as-is. **Keep the app's icon component in imports** if a non-button `<icon>` (header/title glyph) remains in the template.
Map each legacy glyph — an icon-font class (`fa-download`) or the app's own icon-component name (`CircleX`) — to its Lucide-registry equivalent (common: arrows → `arrow-left`/`arrow-right`, chevron → `chevron-down`, check → `circle-check`, download → `download`, literal `+` → `plus`).

## Leave alone (not standard buttons)
Bespoke chrome triggers that have their **own** class system and **no `.btn`** (a sidebar/account menu toggle styled entirely by component scss), anchors without a button role, dropdown menu items, and config *strings* that merely name a class (a confirm-service `buttonClassYes: "btn-danger"`, a grid action-def `CssClasses: "btn btn-primary btn-sm"` or `ActionIcon: "fas fa-…"`). Those grid-config `.btn` strings are **grid-rendered buttons** — migrated with the grid surface (the ag-grid batch), not as template `<button>`s. **A `.btn-*`-styled button that *also* carries `[dropdownToggle]` (or another behavior directive) is NOT in this leave-alone list — migrate it** (`<button esa-button color=… [dropdownToggle]=…>`; esa-button is an attribute directive on the native button, so it coexists). The directive isn't a reason to leave it; only an own-class-system-with-no-`.btn` is. And **bare clickable `<icon (click)>` / `<a (click)>` actions** (edit/delete icons, link-styled actions) are *not* native `<button>`s and carry no `.btn` — they're out of native-button absorption scope (a separate clickable-icon/a11y pass; ideally they become `<button esa-icon-button>`, but that's a behavior change, not a `.btn` swap). Leave + flag them.

## Retire the legacy stylesheet (final batch)
Once nothing references `.btn`, delete the legacy `_btn.scss` (+ its `.btn .fa`/`.btn-icon` helpers). **Grep for `.btn` everywhere first — by variant name / word-boundary** (`\bbtn-primary\b`…), NOT `class="btn` (which misses mid-list classes like `class="feature__link btn btn-primary"`). Beyond template `<button>`s it also hides in **class-name config strings** (a grid action-def `CssClasses: "btn …"`, a confirm-service `buttonClassYes`/`buttonClassNo`) and in **`class="btn {{ configVar }}"` template hybrids** where the markup hardcodes the `.btn` base and interpolates the variant from a runtime config. **The button slice owns these too — true them up here** (don't defer them to other slices, or the slice stays perpetually "almost done" with `.btn` lingering and the CSS un-deletable). Give the consumer (the grid action-def / `button-renderer`, the confirm service/dialog) a **variant/`color` input**, map the legacy class strings to it, and **update their call sites** — so the slice can delete the legacy stylesheet and be marked done. (A legacy token may also appear *without* `.btn` as a component-scoped layout hook — e.g. `.tab-nav .btn-sm` — a grep false positive that needs a local selector rename, not a `.btn` removal.) **Closing the slice = (1) all template + config-driven `.btn` consumers on the lego, (2) delete `_btn.scss` + its `.btn .fa`/`.btn-icon` helpers, (3) `grep '.btn'` comes back clean (modulo intentional renamed layout hooks), (4) build green.** A **mixed look** (legacy gradient buttons next to flat esa-buttons) is expected mid-migration.

## Inventory & progress (per app — track in the APP's docs, not here)
Build the native-button inventory from the grep, batch it by feature area, and track the burndown **in the app's own migration docs / commit log** — this file is the reusable playbook, not a per-app tracker. Expect the work to span: feature pages + modals, shared components, grid/toolbar surfaces, and the config-driven consumers (confirm dialog, grid action-defs), ending with the `_btn.scss` retirement.
