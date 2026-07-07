---
name: ecology-audit
description: Audit an existing Angular app's reusable UI components and map them onto ESA's Ecology design system (DIRECT / PARTIAL / COEXIST / GAP, + an APP-SPECIFIC appendix), analyze the token and library gaps, and apply safe design-independent token-alias scaffolding. Reusable across any Angular app. Use when planning an Ecology design-system transition.
allowed-tools: [Agent, Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
---

Produce a complete, repeatable **Ecology transition audit** for an existing Angular application: inventory its reusable UI components, map each onto the [Ecology](https://github.com/esassoc/ecology) design-system catalog, analyze token and dependency gaps, and apply only the *safe, design-independent* token-alias scaffolding. The risky parts of a migration (final brand/theme values, component swaps, ag-Grid integration strategy) are **deferred** to the design spoke and a follow-up.

## Arguments

`$ARGUMENTS` (all optional):
- **`--app <path>`** — root of the Angular app to audit. Default: the current repo. The skill auto-detects the Angular project (looks for `angular.json` / `**/src/app`).
- **`--ecology <path>`** — path to the Ecology hub repo (token + component source of truth). Default: try `../ecology`, then `C:\git\esassoc\ecology`. If neither exists, fall back to the `@esa/tokens` package and the catalog summarized in *Reference: Ecology catalog* below.
- **`--out <dir>`** — output directory for the audit artifacts. Default: `docs/ecology-migration/`.
- **`--spoke <path>`** — *(optional)* the project's **design spoke** (an Astro spoke of `@esa/ecology`). When given, the audit goes **spoke-driven**: the spoke's theme is the target token *values*, its catalog is the prioritized target set, its prototypes are the verify targets, and its app shell drives a shell slice. Default: try a sibling `../<app>-design`; if absent, run hub-only (generic Ecology target).
- **`--no-scaffold`** — skip Phase 7 (token-alias scaffolding); produce the audit docs only.

## Workflow

### Phase 0 — Locate inputs (no assumptions about the app)

Discover, don't hardcode:
1. **Angular project root** — find `angular.json`; from it the source root and the reusable-components directory (commonly `src/app/shared/components/`, but confirm by scanning for component dirs with high reuse / shared imports).
2. **Global theme / token file** — find the SCSS that defines CSS custom properties (search for `:root` + `--` declarations, e.g. `src/scss/**/_theme.scss` or `styles.scss`). Record the file path and the token names/tiers already present.
3. **UI dependencies** — read `package.json` and note UI libraries (e.g. `ag-grid-*`, `leaflet*`, `vega*`, `@ngneat/dialog`, `@ng-select/*`, `@tinymce/*`, `@popperjs/*`, `*material*`, FontAwesome).
4. **Ecology hub** — resolve `--ecology`. Read the token tiers from `packages/tokens/` (primitive/semantic JSON + `src/component-tokens.css`) and the component catalog from `packages/ecology/src/components/` (`.astro` = presentational, `.ts` = Lit web component). If the hub repo is unavailable, use *Reference: Ecology catalog* below.
5. **Design spoke** *(if `--spoke` given)* — locate the spoke's **theme** (`src/styles/theme-*.css` — the semantic/component token *values* the app should match), **catalog** (`src/data/ds-nav.ts` + `src/pages/design-system/components/*.astro` — which `esa-*` the design actually uses), **prototypes** (`src/data/prototypes.ts` + `src/pages/prototypes/*` + `src/components/<spoke>/*` — the target screens), and **app shell** (`src/layouts/AppShell.astro` — the target frame/IA, e.g. a sidebar vs the app's header nav).

If the Angular project or theme file can't be located unambiguously, ask the user with `AskUserQuestion` rather than guessing.

### Phase 1 — Inventory the app's reusable UI (deterministic)

**Unit of inventory.** Count **one unit per `*.component.ts`** under the reusable-components root found in Phase 0 (e.g. `src/app/shared/components/**`). Line counts are **`.ts` only** (not `.html`/`.scss`). Spawn `Agent` subagents (`subagent_type: "Explore"`, read-only), parallelized by area (forms, nav/chrome, overlays, data-display), each returning structured rows.

**Primitive vs app-specific — the deciding rule (import-based, no judgment calls).** Inspect each component's `import` statements. A component is **APP-SPECIFIC** if it imports **any** of:
- something under the generated API client dir (e.g. `shared/generated/**`), or a domain DTO/model;
- a **domain/feature** module or service — one that lives in a feature area or itself imports generated/domain code. A **generic cross-cutting UI service** (notification/alert, modal, theme, breakpoint) does **not** count;
- a map or chart library (Leaflet/Esri/Geoman, Vega/vega-lite/vega-embed).

Otherwise — its imports are limited to Angular/CDK/forms/router, the design system, generic shared utilities, and other reusable primitives — it is a **reusable primitive**.

Consequences (these are what make the count reproducible):
- The **inventory + mapping (Phases 3–6) cover reusable primitives only.**
- **APP-SPECIFIC** components are **not** mapped to `esa-*`. List them in an appendix (path + one-line reason + count) so the total is transparent without polluting the plan.
- A nested helper that is itself import-clean (e.g. a grid's `full-screen-button`) **is** a primitive and is counted. A nested modal under a domain-named folder (e.g. a feature's `modals/*`) imports domain code → APP-SPECIFIC → appendix. The rule decides; folder depth does not.

For each **primitive** capture: **path**, **one-line purpose**, **`.ts` line count**, **hand-built vs thin-wrapper-over-a-3rd-party-lib**, and the **3rd-party lib** if any.

### Phase 2 — Build the Ecology reference (live hub is the source of truth)

**When `--ecology` resolves to a real repo, always read the live hub** — enumerate the actual files in `packages/ecology/src/components/` (each file = one `esa-*` component; `.astro` = presentational, `.ts` = Lit web component) and read the real token names from `packages/tokens/` + `packages/tokens/src/component-tokens.css`. Do **not** classify against memory or the in-skill catalog when the hub is present: the hub evolves (60+ components) and the *Reference* fallback drifts — it has historically missed e.g. `esa-confirm-dialog` (distinct from `esa-dialog`), `esa-page-header`, `esa-avatar`, `esa-command-palette`. Use the *Reference* catalog **only** when the hub is unavailable, and when you do, **flag in the output** that the catalog was approximate.

**When a spoke is given, it refines the target.** The spoke has already decided *which* `esa-*` legos this project uses (its catalog) and *what values* they take (its theme) — so prefer the **spoke's catalog** as the target set and the **spoke's theme** as the target token values, with the live hub as the broader menu underneath. The spoke is the project's design ground-truth; the hub is what it chose from.

### Phase 3 — Classify each reusable primitive (ordered decision tree)

Run this **ordered** test per primitive and assign the **first** class that matches (matching first removes classification drift). Match `esa-*` names against the **live hub list from Phase 2**, not memory.

1. **COEXIST** — the component **implements a 3rd-party lib's extension interface** (e.g. ag-Grid `ICellRendererAngularComp` / `ICellEditorAngularComp` / `IFilterAngularComp` / `IHeaderAngularComp`) **or hosts the lib's root view** (renders `<ag-grid-angular>`, the TinyMCE editor, or a Leaflet/Esri map). A component that merely *injects or calls* such a lib's API — e.g. a toolbar, pagination, or clear-filter control that calls `gridApi` — renders generic UI and is **not** COEXIST; classify it by its UI role via steps 2–4.
2. **DIRECT MATCH** — a single live-hub `esa-*` covers the component's role, judged by that hub component's documented *purpose* even if the name differs (e.g. a label+value / key-value display → `esa-stat`; a toast/alert view → `esa-snackbar`; a page title block → `esa-page-header`). Name it.
3. **PARTIAL** — maps to an `esa-*` but wraps a **replaceable** lib (one that HAS an `esa-*` equivalent: `@ngneat/dialog`→`esa-dialog`/`esa-confirm-dialog`, `@ng-select`→`esa-select`, `@popperjs`→`esa-popover`) or needs non-trivial adaptation. A replaceable-lib wrapper is **always PARTIAL, never COEXIST**.
4. **GAP** — **no** live-hub `esa-*` covers the role at all → recommend *build-in-app* / *propose-for-hub-promotion* / *keep-bespoke*.

(App-specific components were already separated in Phase 1 and are **not** classified here.) For counting, report COEXIST as a sub-kind of PARTIAL: "PARTIAL / COEXIST".

**Shippable vs reference target.** Before calling something **DIRECT**, confirm the hub target is a **real shippable component** (a `.ts` Lit WC or `.astro`), not a `type="reference"` doc page. A reference contract (e.g. `esa-map`, `esa-grid`) is **COEXIST toward the named contract**, never DIRECT — the lib is kept and themed, not replaced.

Also list **live-hub `esa-*` components the app has no primitive for** (candidate new adoptions).

### Phase 4 — Token gap analysis

- Map the app's existing CSS custom properties → Ecology **semantic** tokens (e.g. `--primary` → `--color-primary`, raw `--gray-200` used as a border → `--color-border`).
- Identify Ecology **component-tier** tokens the app lacks.
- **Consumption discipline is its own gap the component axis doesn't close.** Even after the legos read the semantic layer, ordinary app SCSS keeps reading the wrong tier — and it hides in TWO places, one of which a naive check misses entirely:
  - **raw ramp steps + legacy aliases** via `var(--gray-200)` / `var(--primary)` / `var(--<brand>-blue-800)` — a `var(--…)` grep finds these;
  - **hardcoded literals** — `background: #fff` / `color: #000` / `var(--white)`-as-surface / bare-hex borders — which a `var(--…)` grep **cannot see at all**. Grep the literals separately (a value starting with `#hex`, plus `var(--white)`/`--black`).

  Triage each read-site: **map to a semantic token** (a surface/text/border/status *role* → `--color-*`); **keep as a ramp read** (a genuinely-specific brand *shade* — chart series, gradients, data-viz — re-prefixed `--<brand>-*`); or **leave as a correct literal** (white-on-brand-fill text, black shadows, an icon on a photo). Beware the noise: most `#hex` hits are `var(--token, #fallback)` fallbacks (fine) — count real *bare* hardcodes, not fallbacks. Scope this as a tracked cleanup axis in `token-gap-analysis.md` (inventory → per-site mapping → chunked execution, `ng build` + a light-mode check each). **Highest-leverage single fix:** bind the global `body`/root text color to `var(--color-text-primary)` — apps often leave `body` uncolored (browser-default `#000`), so all *inherited* text can't follow a theme override; binding it is ~a no-op in light (snaps `#000` to the on-token near-black). To *find* the remaining misses, run the theme-inversion check in `ecology-verify` — it lights up every stray literal / non-semantic read.
- **When a spoke is given:** compare the app's tokens to the **spoke's target theme values** — the real *apply-the-spoke* delta (e.g. keep the brand primary, bump a secondary for AA, cap radius, swap the type stack, adopt the hub neutrals the spoke inherits). The token-gap doc then states exactly what applying the spoke changes vs. the current alias bridge.

### Phase 5 — Library disposition

For each UI dependency, record **KEEP** / **REPLACE-with-`esa-*`** / **COEXIST**, with a one-line rationale. Document how Ecology is consumed from Angular: install `@esa/tokens`; use Lit `esa-*` web components directly in templates; reimplement Astro presentational components in Angular reading the tokens. **Distinguish shippable components from `type="reference"` contracts:** `esa-map` and `esa-grid` are **reference** wrappers the hub *documents but does not ship* (a Leaflet wrapper, an AG-Grid wrapper) — so a map or grid **COEXISTs toward the named contract** (keep the lib; adopt its `--grid-*` tokens / `EsaMapConfig` shape / `esaRenderer` conventions), it is **never a DIRECT swap**. **JS-themed surface caveat:** an AG-Grid theme built in JS or a Leaflet canvas resolves token values **in JavaScript at theme-build time**, not via CSS `var()` — so (a) the theme builder must resolve the **full semantic set it paints** (surface / text / border / status), **not just the brand accent**, or the surface can't follow a *non-brand* override (it looks fine under a brand swap — surfaces stay light — then breaks under theme inversion); and (b) it resolves once at load, so it re-themes on **reload**, not on a live theme toggle (add a theme-change listener that rebuilds the theme only if live switching is a requirement). Flag this in `library-disposition.md`.

### Phase 6 — Sequence the migration plan, then write the artifacts

**Sequence first — the audit *is* the plan.** Group the classified primitives into an ordered set of **independently-shippable slices**, lowest-risk first, each establishing patterns the next depends on:

- **Slice 0 — Token foundation:** adopt `@esa/tokens` + the semantic alias bridge (Phase 7 scaffolding) + `data-theme`. Design-independent.
- **Slice 0a — Chrome leaf-legos (build before the shell):** the few leaf primitives the shell's chrome *composes* — `esa-icon` (+ the Lucide icon registry), `esa-icon-button`, `esa-badge`. Build these reusable legos first (via `ecology-migrate-component`) so Slice 0b composes them instead of inlining its own glyphs/buttons (which it would otherwise have to retro-adopt later — the first dogfood hit exactly this). A front-loaded subset of Slice 1. *(Skippable only if you accept the shell inlining + a later retrofit.)*
- **Slice 0b — App shell / IA (when the spoke restructures the frame):** if the spoke's `AppShell` differs from the app's current shell (e.g. spoke = collapsible **sidebar**, app = **header nav**), restructure the frame to match *before* the remaining component slices — everything renders inside it. **Composes the Slice-0a chrome legos** (`esa-icon`/`-icon-button`/`-badge`); if 0a was skipped, inline the prototype's glyphs and flag them for retro-adoption. A **design-led structural change** handled by `ecology-migrate-shell` (not a per-component swap); use the spoke's `AppShell` + the Angular reference (a prior migrated app's shell if present — default Noria — else any Beacon `modern-layout` reference it ports). *(Detect: the spoke ships `src/layouts/AppShell*` with a sidebar / collapsible rail — `.side-nav` / `modern-layout` BEM — while the app's current shell is a top header nav.)*
- **Slice 1 — Leaf DIRECT primitives:** the remaining stateless presentational swaps (button, breadcrumb, alert-box, page-header, stat, pagination — the chrome leaves `icon`/`icon-button`/`badge` were front-loaded in 0a). No form/state wiring → lowest risk; proves the token + web-component plumbing.
- **Slice 2 — Form controls:** the `ControlValueAccessor` ones (toggle, radio/button-toggle, field-error, and `form-field`'s text/select/textarea/date/checkbox/file). Higher risk — replaces `@ng-select` + masking; do after Slice 1 proves the wiring.
- **Slice 3 — Overlays:** dialogs/popovers (`confirm-modal`, file modals, `popper`) → retires `@ngneat/dialog` / `@popperjs`.
- **Slice 4 — Navigation/chrome:** import-clean sidebars/menus.
- **Slice 5 — Grid surface (COEXIST):** theme ag-Grid via `--grid-*` and reskin cell-renderer inner content with `esa-*`.
- **Ongoing — App-specific:** maps/charts/domain components are restyled via tokens only (never swapped); no slice gating.

Order primitives within a slice by **(risk asc, then blast-radius asc)**, and ensure each slice is shippable without the later ones.

**Blast-radius.** For each primitive, count its **consumers** — template usages of its selector (and TS imports of its class) across the app, outside its own directory. This sizes each slice's effort/risk and orders the swaps within a slice (do low-blast leaves before high-blast primitives like `button`/`icon`/`form-field`).

**When spoke-driven, the plan has TWO tracks** (different axes, different executors):

1. **Component track** — the reusable-primitive slices above (Slice 0/0b/1–5), migrated by `ecology-migrate-component` (+ `ecology-migrate-shell` for 0b). Bottom-up, library-wide; targets = the spoke catalog + live hub.
2. **Screens track** — **one entry per spoke prototype** (one per prototype screen), each decomposed into its **handoff sections** (`<spoke>/src/data/handoff/<slug>.mjs` — top bar, side nav, page header, filters, grid, map…) as the units of work, migrated by `ecology-migrate-page`. Top-down, per-screen; the handoff's `decisions`/`gotchas` are the build spec and its `acceptance` the verify gate. Chrome sections (top bar / side nav) belong to the shell (0b), not the page.

The two tracks are independent: components supply the legos; screens assemble them per the design. List both tracks in `migration-plan.md`; for each screen, enumerate its handoff sections + which prototype it targets.

**Then write to `<out>/`** (stable headings/ordering so re-runs diff cleanly):
- **`component-audit.md`** — inventory + mapping table + app-specific appendix + summary counts.
- **`token-gap-analysis.md`** — token mapping, missing component-tier tokens, hardcoded-value flags.
- **`library-disposition.md`** — dependency dispositions + Angular consumption notes.
- **`migration-plan.md`** — the ordered slices above, each listing its primitives (with blast-radius), the swap approach, the libs it retires, the risk, and what it depends on. **This is the plan: the audit's classifications, sequenced into shippable work.**

### Phase 7 — Safe, design-independent scaffolding (skip with `--no-scaffold`)

Apply only changes that **cannot alter the current appearance**:
- In the theme file, **idempotently add or replace** a generated Ecology token-alias block pointing at the app's existing values (e.g. `--color-primary: var(--primary);`, `--color-border: var(--gray-200);`). Wrap it in a clearly-marked comment block; on re-run, **replace that block in place** (matched by its marker comment) — never append a duplicate. Aliases only *add* names, never change a current value, so nothing renders differently.
- Do **not** swap any component, change brand/theme values, or touch the data-grid integration — those are deferred to the design spoke + follow-up. Note them in the audit as deferred.
- Verify no regression: run the app's production build (`npx ng build` from the Angular project, or the repo's documented build command) and confirm it succeeds. Report build output.

Under **`--no-scaffold`**: modify no files. If a generated alias block already exists in the theme file, **report its presence and contents** in the run summary; otherwise report that no scaffolding is present. (Cold/compare runs use this to stay strictly read-only.)

### Phase 8 — Report & verify

Summarize: component counts by class, the token-gap headline, the dependency dispositions, and the scaffolding applied. End with the reminder that the artifacts are skill-generated — to change them, **reset → refine this skill → re-run**, and that promotion of this skill to Ecology's `spoke-kit` plugin is a future step (out of scope here).

## Notes

- **Generic, not app-specific.** Discover the app's structure in Phase 0; never hardcode component lists or paths for one app — the app you run this on is not a special case.
- **Read-only inventory.** Phases 1–6 must not modify app source. Only Phase 7 writes, and only additive token aliases + the audit docs under `<out>/`.
- **Defer the risky forks.** Final theme values, component swaps, and data-grid/Ecology integration are explicitly out of scope — they belong to the design spoke and the follow-up card.
- **Outputs are regenerated, not hand-edited.** Each run rewrites the audit docs under `<out>/` and re-applies the additive token aliases idempotently. To refresh them, re-run the skill rather than editing the generated files by hand.
- **Re-runs are a burndown.** On a repeat run, mark primitives already migrated (the component now renders/forwards to an `esa-*`, or has been removed) as done and report remaining-vs-total per slice — so `migration-plan.md` doubles as live progress tracking, not just an initial snapshot.

## Reference: Ecology catalog (fallback when the hub repo is unavailable)

> ⚠️ **Approximate — fallback only.** When `--ecology` resolves to a real hub repo, ignore this list and read the live `packages/ecology/src/components/` + token files (Phase 2). This snapshot drifts as the hub grows; only use it when the hub is genuinely unavailable, and flag that you did.

**Token tiers** — primitive (`--color-*-NNN`, `--spacing-NNN`, `--radius-NNN`, type/effect) → semantic (`--color-primary`/`-hover`/`-active`, `--color-secondary`, `--color-surface`/`-elevated`/`-sunken`, `--color-background`, `--color-border`, `--color-text-*`, status `--color-info`/`-success`/`-warning`/`-danger`) → component (`--form-*`, `--card-*`, `--sidenav-*`, `--topbar-*`, `--breadcrumbs-*`, `--grid-*`, `--filter-*`, `--alert-box-*`, `--dialog-*`, `--side-dialog-*`, `--badge-*`, `--button-*`).

**Components** — presentational (`.astro`): app-shell, app-bar, container, header-nav, card, badge, pill, pillbox, stat, breadcrumbs, nav-dropdown, sidebar-nav, alert-box, danger-zone, empty-state, collapsible, icon, icon-link, icon-button, back-to-top, loading-spinner, loading-overlay, progress-bar, file-list, link-column, filter-container, filter-pills, filter-clear-button. Interactive (Lit web components, `.ts`): button, button-group, button-toggle, text-field, textarea, select, checkbox, checkbox-group, radio-group, switch-toggle, input-tag, chip-group, combobox, entity-search, search-panel, command-palette, file-upload, color-picker, range-slider, date-picker, dialog, side-dialog, popover, dropdown-menu, tab-layout, pagination, snackbar, tooltip, filter-dropdown, field-error.

**Note:** prefer the live hub — this fallback drifts as the hub grows. (It has since added e.g. `esa-map`, `esa-grid`, `esa-sidebar-nav`, so a map/grid/nav may now have a real `esa-*` target rather than being purely app-specific — app-specific map/chart *content* still composes inside the `esa-map`/`esa-grid` shell.)
