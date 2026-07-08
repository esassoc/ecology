# field-error → esa-field-error (Slice 2 — Form controls)

**Target:** `esa-field-error`. Classification: DIRECT. Lego dir: `<app>/src/app/shared/components/esa/field-error/`.

**Net-new hub component — no spoke design-system page.** The spoke ships `esa-form-field`/`esa-text-field`/`esa-select`/… but **not** `esa-field-error` (it's promoted from other spokes' demand). Expected, not a blocker: build from **Noria's `esa-field-error` lego** (`shared/components/esa/field-error/`) as the primary Angular reference — already the hub's presentational `message`+`icon` contract on Ecology tokens — (else the hub `.astro` + Beacon `ui-field-error`), and **flag the absent spoke page** in the report. There is also no handoff section for it (the parcel-discovery handoff is a map/grid screen). The spoke's theme values still flow through `--color-*`.

**The key decision — presentational (`message`) vs control-bound (`AbstractControl`) API.** The hub `esa-field-error.astro` is explicitly the **presentational half**: `message?: string` + `icon?: boolean`, renders `<p role="alert" aria-live="polite">` (leading `circle-alert` optional) or nothing. Beacon's `ui-field-error` instead binds an `AbstractControl` and resolves it through a `FieldErrorPipe`. **They diverge on API on purpose** (the `.astro` says the control plumbing is framework-specific).

Precedence rule for this shape: **when the app already resolves the domain input elsewhere, build the lego to the hub's presentational contract and let the domain wrapper keep the plumbing.** Noria's bespoke `input-errors` already owns the full `ValidationErrors`→message mapping (min/max/minLength/maxLength/required/requiredTrue/pattern with URL+Email special-casing) + the `touched` gate. So:
- **Lego** = presentational `esa-field-error` (`message` + `icon` signal inputs, `booleanAttribute` on `icon`, OnPush, host `[style.display]` collapse when empty) — mirrors the hub.
- **Domain wrapper** (`input-errors`) keeps its `@Input validateFormControl` + message resolution and **composes** `<esa-field-error [message]="error">` per message (no icon → matches hub default `icon=false`). Public API preserved → its only consumer (`form-field`) is untouched.

State the API divergence from Beacon in the report as deliberate (following the hub's presentational split).

**Visual delta to expect (intentional).** On HEAD `input-errors` rendered each error as an `<esa-alert-box variant="danger">` — a pink callout box (a Slice-1 bridge from the original `<note noteType="danger">`). The swap turns that into the hub's lightweight **inline danger line** (no box/border/fill; `--color-danger` text at `--type-size-100`, line-height 1.4, `margin-block-start` ≈ `--spacing-100`). That's the intended design-system end state, not a regression.

**Token gap:** `--form-help-gap` isn't in the app theme — use it as a hook with a `--spacing-100` fallback and flag it (dormant until the Ecology form tokens land).

**Blast radius reality-check.** The audit listed `input-errors`(9), but the current `<input-errors>` selector appears in exactly **one** template (`form-field.component.html`) — the "9" predates its consolidation into `form-field`. Verify the live blast with a selector grep before scoping; don't trust the audit count for a primitive that's since been centralized.
