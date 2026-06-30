# Component reference: snackbar / toast → esa-snackbar

Loaded by `ecology-migrate-component` when the target is **snackbar** (the app's bespoke equivalent — a toast, an alert-display, a notification stack). `SKILL.md` holds the general workflow; this file holds the snackbar-specific playbook.

## The host/view split (read first)
A toast system is TWO things, and only one is the reusable lego:
- **View = the single toast** → the lego **`esa-snackbar`** (one message, one semantic context, a dismiss control). Presentational + domain-free.
- **Host / container = the stack** → an **app component** (the existing `alert-display` / `toast-host`) that owns the live-region stack, positioning, enter/exit animation, auto-dismiss, and the **AlertService wiring**. It is NOT the lego — it **composes** `esa-snackbar` per active alert and stays app-owned. **Preserve its selector** so its one consumer (usually the app shell) is untouched.

So the migration = build `esa-snackbar` + refactor the host to render `<esa-snackbar>` per alert. Don't make the lego own the stack/service.

## Target
- Lego **`esa-snackbar`** — mirrors Beacon `ui-toast`: inputs `context` / `message` / `dismissable` / `actions`; outputs `(dismiss)` / `(actionClick)`; a context→Lucide icon map; composes esa-icon (leading + dismiss glyph), esa-icon-button (dismiss), esa-button (actions).
- **The hub ships snackbar as a Lit WC** (`esa-snackbar-container`/`-item`) — **no `.astro`** — so build from Beacon `ui-toast` + the spoke's theme. The spoke usually catalogs the *container* (`esa-snackbar-container`, the imperative stack); the single-item view is the lego here.

## References + visual
- **Beacon `ui-toast`** — the Angular reference: per-context **tinted surface + left accent border + colored icon**, the status hues matching `ui-button`'s palette (a success toast reads like a success button); `primary` is the **neutral** context (gray), not branded.
- Derive the tint from the semantic token with `color-mix(in srgb, var(--color-success) 8%, var(--color-surface))` — no `-50` ramp dependency.

## Migrating the host
- **Reuse the app's `AlertContext` (or equivalent) enum** for `esa-snackbar`'s `context` input (Beacon's ui-toast does the same), so `[context]="alert.context"` type-matches with no mapping.
- **Map every legacy glyph source** to the context→Lucide map: bespoke hosts often use icon-font `<i class="fa fa-check/exclamation/info/warning">` per context → `circle-check` / `circle-x` / `info` / `triangle-alert`.
- **`message` via `[innerHTML]`** if the app's alerts carry HTML (the bespoke host bound `[innerHTML]="alert.message"`) — preserve that; note Beacon renders plain text.
- **Split the CSS by ownership:** the per-toast *visual* (surface, accent, icon, body, dismiss) moves into `esa-snackbar`; the host keeps only the *stack* concerns — container flex, positioning, `pointer-events`, and the enter/exit `@keyframes` (now applied to the `<esa-snackbar>` element via a host class).
- **Expect a look change** (flag for verify): a white toast with a colored left border becomes Beacon's subtly tinted surface; FA glyphs become Lucide.
