---
name: ecology-verify
description: Visual-fidelity gate for an Ecology migration. Renders before/after using the real theme tokens — reusable primitives in an isolated harness (no app/auth), pages & shells in the live authenticated app (reusing the project's e2e auth harness, else a saved storageState) — emits a self-contained side-by-side comparison HTML + a navigable index, screenshots with Playwright, and adjudicates deltas (and a handoff section's acceptance checks when present). The verify stage of the Ecology migration pattern; migrate-component/page/shell hand off here.
allowed-tools: [Agent, Read, Glob, Grep, Write, Edit, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_resize, mcp__playwright__browser_snapshot]
---

Confirm a component swap (from `ecology-migrate-component`) preserves the **intended** appearance: render the **before** and **after** side by side, let a human eyeball it, and emit a PASS/FLAG verdict that separates *intentional* reference-faithful changes from *regressions*.

## Two render modes — pick by what's being verified

**A) Isolated harness — reusable primitives (the default).** A primitive is **just HTML + CSS**, so render it **standalone**: a static harness loading the app's **theme tokens** + the component's **own styles** + **representative markup**. No app server, auth, or DB → fast, reproducible, deterministic. The comparison HTML is the deliverable.

Render **three** columns, not two: **BEFORE** (legacy), **AFTER** (the new lego), and a **DESIGN REFERENCE** rendered from the **hub component itself** — its `.astro` markup/styles, or for an interactive (Lit) target the component's `static styles` + template — compiled against the **app's theme tokens** so it shows the **spoke's** resolution (not the hub's generic defaults). This third column is the **design truth**: the gate must catch *divergence from the spoke's intended look*, not only *regression from the legacy component*. A before/after-only check **passes a lego that faithfully replaces the old component yet looks nothing like the design** — which is exactly the miss this column exists to prevent.
- Presentational primitives (badge, pill, card, breadcrumb, stat, …): isolation renders them faithfully.
- Interactive primitives (selects, dialogs, toggles): isolation covers their *static* appearance.

**B) Live full-page render — pages & shells (`ecology-migrate-page` / `ecology-migrate-shell`).** A screen or app frame can't be faithfully isolated (routing, data, the whole layout), so render the **real app, authenticated**, navigate to the screen, and screenshot it against the spoke prototype. **Precondition — target the project's RUNNING dev server (don't start a fresh one).** Discover its URL from project config — the Playwright config `baseURL` / `webServer`, or the Angular `serve` host+port (often a custom host/port, not `localhost:4200`) — and point Playwright at **that**, not a guessed port. **Prefer an already-running server:** dev servers hot-reload, so the migration's file edits are already live in it — there's no need to rebuild or restart. Do **not** blindly `npm start` a fresh instance: its `prestart` may hang on interactive prompts (nvm, cert-trust), and a second instance just fights the port. (The backend — API/DB — must be reachable for the e2e auth to bootstrap the user; if truly nothing is serving and you can't start cleanly, fall back to #3.) Then, to get past the login wall, obtain an authenticated Playwright session **in priority order — don't assume any one mechanism exists:**
  1. **Reuse the app's own e2e auth harness if it has one** (discover it under `e2e-tests/`/`e2e/`/`tests/`). *Common pattern:* a fixture sets a `localStorage` token/flag the app reads on bootstrap to bypass the real IdP and attach a test-user header — reuse that fixture + a test user, then `goto('/<route>')`.
  2. **Else authenticate generically** — a saved Playwright `storageState`, or scripting the app's UI login once. Whatever the app documents for test auth.
  3. **Else** (no auth path) fall back to build-pass + comparing the rendered markup against the prototype, and **say so**.

## Theme-inversion — the sharpest token-cleanliness check

A brand-hue swap is a *weak* test of "does the app read only semantic tokens?" — a new brand keeps light
surfaces, so anything that hardcodes `#fff`/`#000`/a raw ramp step or assumes a light background still
*looks* right and sails past a before/after (and past a `var(--raw)` grep, which can't see hardcoded
literals at all). To actually prove token-cleanliness, **invert the theme**: add a throwaway
`:root[data-theme="dark"]` override of the *semantic layer only* (dark surfaces, light text, dark borders,
`--color-primary` lifted for contrast), inject it in-browser (devtools `<style>` + set the attr on
`<html>` — zero disk changes, reverts on reload), and screenshot the running app. **Every spot that
doesn't flip is a stray literal or a non-semantic read** — the exact tail the other checks miss. Adjudicate:
- **brand-swap-safe ≠ theme-safe.** A token derived from the brand ramp (e.g. a nav-active bg reading
  `--<brand>-blue-100`) re-skins for a new *brand* but NOT for an inverted theme — only `--color-*`
  semantic reads are truly theme-following. A brand-ramp read used for a *role* (surface/border/text) is a
  FLAG; a chosen brand *shade* (a chart series) is fine.
- Two classes stay light **correctly** and are NOT failures: **genuinely-fixed literals** (white text on a
  brand fill, black shadows, an icon on a photo, data-viz series) and the **JS-painted surfaces** (grid/map
  resolve tokens at load — they re-theme on *reload*, not on a live toggle, and only if their theme builder
  resolves the full surface/text/border set, not just the brand accent — see `ecology-migrate-component`).
- This doubles as the completeness gate + punch-list generator for the consumption-discipline sweep that
  `ecology-audit` scopes: the inversion *is* what surfaces the remaining hardcodes to fix.

## Arguments

`$ARGUMENTS`:
- **`--component <path|name>`** — the swapped primitive (required).
- **`--before <ref>`** — git ref/state for the pre-swap version (default: `HEAD`, i.e. the committed component before the working-tree swap).
- **`--after <ref|worktree>`** — post-swap version (default: the working tree).
- **`--app`/`--ecology`/`--beacon`** — repo roots (defaults: current; `../ecology`; `../Beacon`).
- **`--out-root <dir>`** — root output dir (default: `.playwright-mcp/ecology-verify/`, gitignored). Each component's artifacts go in `<out-root>/<component>/`; the navigable index lives at `<out-root>/index.html`.
- **`--handoff <spec#section>`** — *(page/screen migrations)* the spoke handoff section whose **`acceptance`** checks gate this verify (auto-resolved from the prototype + section when invoked by `ecology-migrate-page`). Verify is granularity-agnostic: it checks a reusable-component swap *or* a page/screen section.

## Workflow

### Phase 0 — Resolve before/after
Identify the swapped component and obtain **both** versions of its template + styles:
- **AFTER** = the working tree (post-swap).
- **BEFORE** = the component at `--before` — read it with `git show <ref>:<path>` (don't rely on a dirty tree). If the swap was reimplemented in place, BEFORE and AFTER share a path; `git show HEAD:` gives the original.

Pick **representative instances** to render — cover every variant/state the audit + the component's inputs imply (e.g. each `variant`, `dot` on/off, with/without link). Use the same instance set for both sides so the comparison is apples-to-apples.

### Phase 1 — Gather render inputs
- **Theme tokens:** the app's `:root` custom-property block (the Ecology alias bridge, e.g. `src/scss/base/_theme.scss`). Its `:root` is plain CSS — include it verbatim (drop any `@import`/`@use` lines).
- **Component CSS (each side):** compile the component's SCSS to CSS. If it only uses `var(--…)` + literals (typical for token-driven primitives), strip the `@use`/`@import` lines and inline it. If it uses Sass nesting/mixins, compile with `npx sass --style=expanded --load-path=<app>/src <file>`. Scope BEFORE styles under `.ev-before` and AFTER under `.ev-after` so both can coexist on one page without collisions. **Drop the `:host` rule** when scoping — in isolation there's no Angular host element, and mapping `:host` onto the column wrapper breaks layout (it sets `display` on the column, laying instances out in a row); wrap each instance directly instead.
- **BEFORE must be the true legacy rendering.** Reproduce the old component's markup faithfully — including any inline `style` bindings it used (e.g. arbitrary `color`/`textColor` applied inline) — so the left column shows what shipped, not an idealization.
- **DESIGN REFERENCE (the hub component):** read the hub component's source — the `.astro` `<style>`, or for a Lit target the component's `static styles` + render template — and reproduce it scoped under `.ev-design`, compiled against the **same app theme tokens** as the other columns. Keep its `var(--…)` reads (so the spoke's theme resolves them) and its literal fallbacks. This column is what the **spoke** renders — the design truth AFTER must match.

### Phase 2 — Build the side-by-side comparison HTML (the deliverable)
Write a **self-contained** `<out-root>/<component>/index.html`:
- `<style>` = theme `:root` tokens + scoped before/after component CSS.
- A header: component, `esa-*` target, before/after refs, generation note, and a **`← Verify index`** link (to `../index.html`).
- **Escape HTML in the ref/note strings.** They're inserted into the head as text, so a raw `<style>`/`<script>` (or any raw-text tag) in a ref/note **opens a real element and swallows the rest of the page** — the columns silently render blank. Write `&lt;style&gt;`, `&lt;esa-foo&gt;`, etc. (Harden the harness too: have `page3`/`page` defensively neutralize a stray raw `<style>`/`<script>` in those fields — but escape at the source.)
- **Three-column side-by-side layout** — `BEFORE` (legacy) · `AFTER` (the esa-* lego) · `DESIGN` (the hub component on the app's theme) — each rendering the representative instances with labels, aligned row-for-row so a reviewer can scan AFTER against **both** the legacy and the design truth. (Plain static columns — no overlay/wipe slider.)
- A **deltas panel** listing each expected/intentional change.
Keep markup/IDs stable so re-runs diff cleanly.

### Phase 3 — Screenshot with Playwright
**(Mode A — primitives):** Open `file://<out-root>/<component>/index.html`, set a fixed viewport (e.g. 1280×800), and capture: the full page, the `BEFORE` column, the `AFTER` column, and the `DESIGN` column → `<out-root>/<component>/{page,before,after,design}.png`. Prefer the app's installed Playwright (a tiny generated script) for reproducibility; the Playwright MCP browser is an acceptable alternative.

**(Mode B — pages/shells):** skip the `file://` harness. Start the app's dev server, get an **authenticated** session (per *Two render modes* B), `goto` the screen's route, wait for it to settle, and screenshot the **live render** (`after.png`) at the same viewport. Capture `before.png` from the pre-migration screen (`git stash` the swap, or the route at `--before`) and put the **spoke prototype** alongside as the design target. Same `<out-root>/<screen>/` layout + index. **Windows/ESM gotcha:** load Playwright via CommonJS `require('playwright')` (use `createRequire(import.meta.url)` if the script is `.mjs`, or just name it `.cjs`) — importing `chromium` from an absolute `node_modules` path in an ESM module fails on Windows with `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Running through `npx playwright test` also avoids this. If you instead use the Playwright **MCP** browser, two more gotchas: it **blocks the `file:` protocol** (serve `<out-root>` over `http://localhost` first), and it writes screenshots relative to the **repo root** (prefix filenames with `.playwright-mcp/`). The scripted CLI Playwright avoids both.

### Phase 4 — Adjudicate
Compare before vs after and classify each visible delta:
- **INTENTIONAL** — matches the esa-* reference (e.g. casing change, radius, palette shifting to tokens, spacing to the scale). Seed this list from the `ecology-migrate-component` report's stated deltas.
- **REGRESSION** — unintended (clipped/overflowing text, wrong color, broken alignment, lost state).

**When a handoff section drives this (a page/screen migration via `ecology-migrate-page`), its `acceptance` checks are the authoritative gate.** Check each "done when…" against the AFTER render and record pass/fail per check, citing the handoff section — these are the designer's criteria, so they outrank inferred deltas for the PASS decision.

**Also compare AFTER against the DESIGN-REFERENCE column.** Any delta there is a **divergence from the spoke** (the lego doesn't match the hub component resolved on the app's theme) — **FLAG it**, even when AFTER doesn't "regress" from the legacy BEFORE. Allow only documented token-resolution differences (a token the app's theme doesn't ship yet, falling back). This is the check that would have caught a lego built to the wrong reference's *look*.

**A `flag` is a real divergence, not a place for "it matches" prose.** A divergence/regression delta (`kind: "regression"`, rendered FLAG) means a REAL AFTER-vs-DESIGN mismatch, a visual regression, or a failed acceptance check — and it **forces `verdict: "FLAG"`**. It is NOT a slot to record adjudication notes. So:
- When AFTER **matches** DESIGN, that IS the PASS condition — record the confirmation in the harness `note`, **never as a delta** (a "delta" whose text concludes "…no divergence / AFTER MATCHES DESIGN" is a contradiction — it belongs in the note).
- A **documented, PASS-allowed token gap** (a token the theme doesn't ship yet, falling back identically on both columns) is likewise a `note`, **not** a flag.
- Therefore a **PASS result carries ZERO flag/regression deltas** — only `intentional` ones (the expected BEFORE→AFTER changes). If a component has a genuine flag, the verdict is FLAG, full stop; "PASS + flags" is never valid.

Verdict = **PASS** only if AFTER **matches the design reference** (modulo documented token gaps) **and** shows only intentional deltas from BEFORE **and** (when a handoff applies) every `acceptance` check holds; **FLAG** otherwise (list the design divergences, regressions, and/or failed acceptance checks).

### Phase 5 — Persist the result, (re)generate the navigable index, and report
1. **Write `<out-root>/<component>/result.json`** — `{ component, target, slice, verdict, deltas: [{ kind: "intentional"|"regression", note }] }` — so the index can aggregate without re-running each component. `deltas` hold the **intentional** BEFORE→AFTER changes plus any **regression**/divergence; a `regression` (or an unresolved AFTER-vs-DESIGN divergence) forces `verdict: "FLAG"`, so a `"PASS"` result lists **only `intentional` deltas** — the AFTER-matches-DESIGN confirmation and any documented token gap go in the harness `note`, not in `deltas`. Use the **full plan heading** for `slice` (e.g. `"Slice 1 — Leaf DIRECT primitives"`) so the index can both **group** and **order** by the leading number.
2. **(Re)generate `<out-root>/index.html`** — a navigable gallery built by scanning **every** `<out-root>/*/result.json` (not just this run's), so it always reflects all components verified so far:
   - a **left sidebar** listing each component, **grouped by migration-plan slice ordered by the slice's leading number** (ascending; components alphabetical within a slice), each entry showing its `esa-*` target and a **PASS / FLAG** badge;
   - a **main pane** that loads the selected component's `<component>/index.html` in an `<iframe>` — clicking a sidebar entry swaps it; deep-linkable via `#<component>`; on first load with no hash, default to the **first component in slice order**;
   - a header with overall counts (verified / passing / flagged).
   Self-contained, vanilla JS, stable markup so re-runs diff cleanly.
3. **Report:** the verdict, the **index path** and this component's side-by-side path (tell the user to open the index), the screenshot paths, and the deltas table (intentional vs regression). Reminder: skill-produced — to change it, reset → refine the skill → re-run.

## Notes
- **Isolation-first, auth-free.** Don't stand up the full app for a presentational check; render against the real tokens standalone.
- **`git show` for BEFORE.** Read the pre-swap version from git, not a stashed tree, so the comparison is reproducible.
- **Output is a gitignored review artifact** (`.playwright-mcp/…`) — not committed source.
- **Skill-only / idempotent.** Re-running regenerates the HTML + screenshots in place.
- **Keep the generator scripts** (harness builder, screenshot runner) in `<out-root>/<component>/` for reproducibility, and write a tiny **`serve.cjs`** static file server at `<out-root>/` so the index opens over http (`node .playwright-mcp/ecology-verify/serve.cjs`) — needed because the Playwright MCP browser blocks the `file:` protocol. The whole `<out-root>` is gitignored, so these cost nothing and document how the artifacts were produced.
- **Doesn't revert anything.** Verify only *reports* fidelity; intentional legacy-appearance changes (flagged by migrate) are expected, not bugs to undo.
