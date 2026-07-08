# Component reference: collapsible → esa-collapsible

Loaded by `ecology-migrate-component` when the target is **collapsible** (and the app's bespoke equivalent — a FAQ display, an accordion, an expansion panel, or any hand-rolled show/hide section). `SKILL.md` holds the general workflow; this file holds the collapsible-specific playbook.

## Target
- Lego: **`esa-collapsible`** — a single disclosure section built on native `<details>`/`<summary>` (expand/collapse, keyboard, focus, and disclosure a11y for free; no JS state machine). Element `esa-collapsible`, class `EsaCollapsibleComponent`. A right-aligned chevron (composing `esa-icon`) replaces the native marker and rotates on open.
- API (mirrors Beacon `ui-collapsible`): `expanded` model (two-way `[(expanded)]`) · `heading` (simple text) **or** a rich header projected via `[esa-collapsible-header]` · `icon` (leading Lucide name) · `count` (badge after the heading) · `size` (sm/md/lg, via `[data-size]`) · `flush` (no card chrome — hub-sourced, for stacked drawer/sidebar sections). Body = default `<ng-content>`.
- A **single** disclosure, not a single-open accordion — stack several; each opens independently (native `<details>` semantics).

## References
- **Noria `esa-collapsible` lego** (`shared/components/esa/collapsible/`) — the **primary Angular reference**: the native `<details>`/`<summary>` build with the `expanded` model, header slot, `count`, `[data-size]`, and `flush`, already on Ecology tokens. Mirror it.
- **Beacon `ui-collapsible`** — the Angular reference: native `<details>`, an `expanded` `model()`, an `onToggle` that mirrors the native open state back into the model, the header slot, count, and `[data-size]` sizing.
- **Hub `esa-collapsible.astro`** — the token contract (`--collapsible-*` hooks → `--color-*`) + the `flush` variant.
- **The spoke may not catalog it.** `esa-collapsible` is NET-NEW to the hub (promoted from Beacon/CB-Fish demand), so a given project's design-system often has **no** page for it — build from Beacon + hub and flag the absent spoke page; the spoke theme still flows through `--color-*`.

## Migrating a bespoke disclosure consumer (FAQ / accordion / expansion panel)
- **It's usually a DOMAIN component that COMPOSES the lego — not a 1:1 swap.** A FAQ display / sidebar section / detail panel renders *its own data* through a hand-rolled show/hide (a `[someExpandCollapse]` directive + an `.open` class + a custom caret). Refactor its **internals** to compose `<esa-collapsible>` and **preserve its public API** (`[faq]`, `[item]`, …) so its consumers stay untouched — **don't delete** the domain component.
- **Project header + body.** A rich header (needs a directive like `[highlight]`, or markup) → project into `[esa-collapsible-header]`; plain text → the `heading` input. Section content → the default slot. Keep domain directives (search highlight, etc.).
- **Drop the bespoke disclosure machinery.** The custom `[expandCollapse]`-style directive usage, the `.open`-toggled show/hide CSS, and the hand-rolled caret / `<icon angle-down>` all go — `esa-collapsible` owns open/close + the chevron. **Don't retire a shared directive** if another component still uses it (grep first); just stop using it here.
- **Neutralize a projected heading element.** A projected `<h3>` carries global block margins/size — reset `margin: 0; font-size/weight: inherit` in the consumer's scss so it sits inline in the summary row.
- **Expect a look change** (flag for verify): a branded bespoke header bar (e.g. a blue-tinted FAQ question) becomes the design-system's neutral card. A consumer that must keep an accent can set the per-instance `--collapsible-bg` / `--collapsible-border-color` / `--collapsible-title-color` hooks — but the faithful default is the neutral card.
