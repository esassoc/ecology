# Component reference: button → esa-button

Loaded by `ecology-migrate-component` when the target is **button**. `SKILL.md` holds the general workflow + generalizable rules; this file holds the button-specific playbook. (First per-component reference; siblings — `form-field.md`, `select.md`, `dialog.md`, … — follow the same shape.)

## Target
- Lego: **`esa-button`** — an Angular attribute directive `button[esa-button], a[esa-button]` (the native element stays the host → `type`/form/focus/a11y come free). Reference: **Beacon `ui-button`**; token contract: hub `esa-button.astro`.
- Variants: `color` (primary/secondary/danger/success/warning/info/ai/ghost) × `appearance` (fill/outline/dashed) × `size` (xs/sm/md/lg), + `active`/`loading`/`icon` (leading Lucide glyph).
- **Icon-only buttons are NOT esa-button** → use **`esa-icon-button`** (composing `esa-icon`).

## Native-element absorption (see SKILL Notes)
The button migration absorbs **every native `<button>`**, not just an existing wrapper. Inventory (`grep '<button>'`), batch by area, gate per batch, **retire the legacy stylesheet last**.

## Legacy classes → variants
Find the app's legacy global button stylesheet (a `.btn`/`_btn.scss`-style sheet) and map its classes. First-dogfood example (a Bootstrap-ish `_btn.scss`):

| legacy class | esa-button |
|---|---|
| `btn-primary` | `color="primary"` (fill) |
| `btn-secondary` | `color="secondary"` |
| `btn-success` / `btn-danger` / `btn-orange` | `color="success"` / `"danger"` / `"warning"` |
| `btn-*-outline` | `appearance="outline"` + that color |
| `btn-link` / `btn-text` / `btn-muted` | `color="ghost"` |
| `btn-sm` → `size="sm"` · `btn-lg` → `size="lg"` | |
| `btn-icon` (icon-only) | → **`esa-icon-button`** |

Drop the `.btn`/`.btn-*` tokens in the same edit (preserve other utility classes). An **explicit** variant class wins over the cancel default.

## Legacy state hooks → native inputs
- `[class.disabled]="x"` (cosmetic-only class) → native `[disabled]="x"`.
- `[buttonLoading]="x"` (a directive injecting a spinner) → the lego's `[loading]="x"` (remove the directive import).

## Icons inside buttons
A glyph may be FontAwesome (`<i class="fa fa-download">`) **or** the app's own icon component (`<icon icon="CircleX">`). Both → a Lucide name in `esa/icon/lucide-icons.ts` (add if missing). Leading → esa-button `icon=`; trailing → project `<esa-icon>` into content. **Keep the app's icon component in imports** if a non-button `<icon>` (header/title glyph) remains in the template.
Dogfood glyph map: `CircleX`→`circle-x`, `NavArrowLeft`→`arrow-left`, `NavArrowRight`→`arrow-right`, `CircleCheckmark`→`circle-check`, `fa-download`→`download`, `fa-folder-open`→`folder-open`, `fa-file-pdf`→`file-text`.

## Leave alone (not standard buttons)
Bespoke chrome triggers (`[dropdownToggle]` menu/account triggers), anchors without a button role, dropdown menu items, and config *strings* that merely name a class (a confirm-service `buttonClassYes: "btn-danger"`, a grid `ActionIcon: "fas fa-…"`).

## Retire the legacy stylesheet (final batch)
Once nothing references `.btn`, delete the legacy `_btn.scss` (+ its `.btn .fa`/`.btn-icon` helpers). A **mixed look** (legacy gradient buttons next to flat esa-buttons) is expected mid-migration.

## Batch areas + progress (first dogfood: 171 native `<button>` / 81 files)
✅ parcel · ✅ scenario-transactions · ✅ scenario-offers/overview/report · ☐ scenario-users/index · ☐ support-ticket · ☐ faqs/resources · ☐ files/user/content-editor · ☐ supply-and-usage · ☐ configure/openet/library · ☐ shared (confirm-modal, noria-grid-header, alert-display, search-parcels, custom-rich-text, field-definition, faq-display, dashboard-menu, btn-group-radio-input) · ☐ ag-grid renderers · ☐ **retire `_btn.scss`**
