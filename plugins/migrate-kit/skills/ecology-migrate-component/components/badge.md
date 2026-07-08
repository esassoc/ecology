# Component reference: badge → esa-badge

Loaded by `ecology-migrate-component` when the target is **badge** (and the app's bespoke equivalent — a `name-tag` / `status-pill` / `tag` / `chip`). `SKILL.md` holds the general workflow; this file holds the badge-specific playbook.

## Target
- Lego: **`esa-badge`** — a presentational status/label pill: a rounded chip with a projected label, or a standalone status `dot`. Element selector `esa-badge`, class `EsaBadgeComponent`. Stateless; domain components map their state → a `variant` + label and project the text.
- API: `variant` (semantic color intent) · `size` (xs/sm/md/lg) · `dot` (boolean — 8px circle, no label). Label is **content-projected** (Angular idiom + matches Beacon + the app's other legos); the hub/spoke `.astro` use a `value` prop — that's the Astro idiom, project content instead.

## References + visual precedence (badge is the classic Beacon-vs-hub divergence)
- **Noria `esa-badge` lego** (`shared/components/esa/badge/`) — the **primary Angular reference**: already the solid-fill hub visual on Ecology `--color-*` tokens, with the `neutral` extension and the `warning` dark-text decision baked in. Mirror it; the bullets below are *why* it resolved the way it did (and what to re-derive if Noria lacks a variant you need).
- **Spoke page** (`design-system/components/esa-badge.astro`) — the variants the design uses (commonly the 6 colored intents: primary/secondary/success/warning/danger/info; default primary) + the target token values via its theme. Ground-truth for *what's adopted*.
- **Hub `esa-badge.astro`** — the canonical **solid-fill** badge (color bg + inverse text), the private `--_badge-*` → `--color-*` token hooks, sizes, dot mode. **Follow the hub for the visual** — it's solid, and most bespoke status pills are solid too, so it's the closest match to what you're replacing.
- **Beacon `ui-badge`** — informs the **API shape** (signal `input()` + content projection + `dot`), but its visual is a **soft/tonal** style (light bg + dark text) and its variant set differs (`neutral`/`strong`, no primary/secondary). Don't copy its soft look; do copy its API ergonomics.
- **`neutral` gap.** The solid hub/spoke set has **no neutral/gray** variant, but a muted/disabled chip often needs one (a gray "Disabled" pill maps to *no* colored intent). Pull `neutral` from Beacon as a **flagged beyond-spoke extension** (a sunken-surface fill + secondary text), and note it as a hub-promotion candidate — don't force a disabled state onto `secondary` (wrong color).

## Migrating a bespoke tag/pill consumer
- **Arbitrary `color`/`textColor` hex → nearest SEMANTIC variant by COLOR.** This is the point of the swap. Map by the hue, not by guessing intent: amber/orange → `warning`, green → `success`, red → `danger`, blue → `info`/`secondary`, gray/near-white → `neutral`. **Drop** the arbitrary color inputs. **Flag** any case where the semantic *meaning* might want a different variant than the *color* implies (e.g. an "enabled" state painted amber → mapped to `warning` by color, but the design may intend `success`) — that's an `ecology-verify` / designer call, not a silent reinterpretation.
- **Drop dead inputs.** A bespoke pill often carries a `routerLink` (clickable) path no consumer uses — if the blast-radius shows it's unused, drop it; the badge is presentational.
- **Don't carry legacy `text-transform: uppercase`.** Bespoke pills often force-uppercase via CSS; the reference badge doesn't. Set the projected label to the desired **display casing** in the consumer (e.g. `Enabled` / `Disabled`) rather than relying on CSS. Casing + color deltas are expected and adjudicated in `ecology-verify`.

## Retire
Once every consumer composes `<esa-badge>`, delete the bespoke tag/pill component (files + dir) and drop its import from each consumer's `imports` array (in the same change as the import line — a missed array entry compiles as a "Cannot find name" / "Unknown reference" error).
