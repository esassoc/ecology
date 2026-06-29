---
name: ecology-migrate-component
description: Execute the Ecology migration of ONE reusable Angular primitive — swap it to its esa-* target (reimplemented in Angular against the Beacon ui-* reference + Ecology token contract), reconcile its API, update consumers, and verify the build. The per-component execute stage of the Ecology migration pattern. Use after ecology-audit has produced the plan.
allowed-tools: [Agent, Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
---

Execute the migration of **one** reusable primitive from an `ecology-audit` plan to its Ecology target. The audit said *what* and *in what order*; this skill does the *swap* for a single component: reimplement it in Angular faithful to the Ecology spec, reconcile its public API, update its consumers, and verify. Operate on one component (or one slice) per run.

## Consumption model (read first — it determines HOW you swap)

`@esa/ecology` is currently **unpublished** (v0.1.0, workspace-linked, exports raw `.astro`/`.ts`). An external Angular app therefore **cannot `npm install` it**, so:

- **Presentational target (`.astro` in the hub)** → **reimplement in Angular.** The hub `.astro` is the **token + structure contract**; **Beacon's `ui-*` component is the Angular reference implementation** (the `.astro` is literally a "faithful translation" of it). Build a token-driven Angular component; import nothing from Ecology.
- **Interactive target (Lit `.ts` in the hub)** → until `@esa/ecology` is published, **reimplement following Beacon's `ui-*`** (proven Angular impl) reading tokens. (Vendoring the Lit web component + adding `lit` is a future option; note it, don't do it silently.)
- **COEXIST (ag-Grid surface)** → no swap; theme via `--grid-*` tokens only.

## Arguments

`$ARGUMENTS`:
- **`--component <path|name>`** — the primitive to migrate (required). Resolve against the audit's primitive list.
- **`--app <path>`** / **`--ecology <path>`** / **`--beacon <path>`** — app, Ecology hub, and Beacon repo roots. Defaults: current repo; `../ecology`; `../Beacon`.
- **`--target <esa-*>`** — the Ecology target; default from `component-audit.md`.
- **`--dry-run`** — produce the reimplementation + consumer-change plan, modify nothing.

## Workflow

### Phase 0 — Resolve inputs
From the audit artifacts (`docs/ecology-migration/`): the component's **classification + target** and its slice. Then locate the **Beacon `ui-*` reference** (the analogue under `<beacon>/Beacon.Web/src/app/shared/ui/components/`) and the **hub `.astro`/`.ts` spec**. Confirm the app's token bridge exists (the Ecology semantic aliases in the theme file). If the target is COEXIST, stop and emit token-theming guidance instead of a swap.

**Target tie-break.** If the audit lists more than one candidate target and `--target` wasn't passed, **prefer the one that has a Beacon `ui-*` reference** — you must be able to translate against a real Angular implementation (per the consumption model). If none has a Beacon analogue, pick the closest by role and **state in the report that you worked from the `.astro` spec alone** (higher risk).

### Phase 1 — Capture the current contract (before touching anything)
Record the component's **selector, `@Input()`/`@Output()` (and signal `input()`/`output()`), content projection, and behavior**, and enumerate its **consumers** (every template/TS that uses its selector or imports its class — this is the blast-radius you must keep working). **Exclude generated artifacts** when enumerating consumers — `shared/generated/**`, compodoc `documentation.json`, and build output produce false hits that inflate the blast-radius. This contract is what you preserve or deliberately migrate.

### Phase 2 — Build the Ecology-faithful Angular implementation
Mirror the reference; do **not** invent a different API or visual. From the Beacon `ui-*` + the hub `.astro`:
- **Structure:** standalone component, `OnPush`, host-class variant pattern (`class="x x--{variant}"`), content projection via `<ng-content>`, inputs per the app's convention (signal `input()` or `@Input()` — match the app).
- **Styling:** SCSS using **component-tier CSS-custom-property hooks that default to the app's Ecology-aliased semantic tokens** (e.g. `--badge-bg: var(--badge-bg-success, var(--color-success))`). **Translate** Beacon Sass vars / hub token names → the app's `var(--…)` names. **Flag** any token rung the app lacks (e.g. `--spacing-150`) rather than hardcoding — add it to the theme's alias bridge or note it for the token gap.
- **No hardcoded brand values** — read tokens so the design spoke's final values flow through.

**Mirror-vs-match split (they don't conflict).** *Mirror the reference* for **structure, variants, and visual** — the things that make the swap faithful. *Follow the app* for **API-surface style** — `@Input()` vs signal `input()`, file layout, naming. Faithfulness is about behavior and appearance, not decorator syntax; so an app that is uniformly `@Input()`-based stays `@Input()` even if the Beacon reference uses `input()`.

**Reimplement in place by default.** For a same-role swap, reimplement *inside the existing component* — reuse its file path, selector, and class name — so every consumer's `import` and tag stay valid and only the *template usage* (the new variant API) changes. Create a new component + delete the old one only when you're genuinely replacing it with a differently-named primitive. In-place overwrite *is* the Phase 4 disposal — there's nothing separate to delete.

**Beacon-vs-hub precedence.** When the Beacon `ui-*` reference and the hub `.astro` diverge (variant names, sizes), **Beacon wins for API / variants / structure** — it's the proven Angular implementation. Use the hub `.astro` for the **token contract** and for any variants/sizes Beacon lacks that the app actually needs — and say when you pulled from the hub.

### Phase 3 — Reconcile the API
Compare the old contract (Phase 1) to the target's variant model. For each gap pick one, and **say which in the report**:
- **Preserve** the old selector + inputs (lowest blast) and map old values to the new model internally (e.g. legacy arbitrary `color` → nearest semantic `variant`; keep a deprecated `@Input` with a console-deprecation note).
- **Migrate** the API (cleaner) and update every consumer in Phase 4.
- **Drop** an input that has no representable mapping in the target's model **and** that no consumer relies on for an off-palette/custom value (e.g. an arbitrary `color` hex where every consumer's value maps cleanly to a semantic variant). Removing it is then the *point* of the swap — say so and list the value→variant mapping you applied.
Default to **preserve** for low-blast/leaf primitives unless the old API is the thing being removed.

### Phase 4 — Update consumers
For each consumer from Phase 1, update its template/TS to the (possibly new) API. If Phase 3 preserved the API, this is a no-op — say so. Never leave a consumer half-migrated. **Dispose of the old primitive:** once every consumer is migrated and nothing else references it, **delete** the old component (files + directory). If any consumer can't migrate yet, instead leave the old component as a thin **deprecated shim** that forwards to the new one — and say which you did.

### Phase 5 — Verify
Run the app's **documented** production build **from the Angular project root** and confirm success — e.g. `npm --prefix <web-dir> run build`, or `cd <web-dir> && ng build`. Do **not** assume `npx ng build` works from the repo root: when the Angular project lives in a subdirectory it won't find `angular.json`. Then hand visual fidelity to **`ecology-verify`** (style-guide render + before/after screenshots) — "build passed" is necessary, not sufficient. Note: a reference-faithful reimplementation may intentionally change a *legacy* visual (e.g. the old component force-uppercased its text and the reference doesn't); that's expected — appearance deltas are adjudicated in `ecology-verify`, not reverted here.

### Phase 6 — Report
State: the component, target, consumption mode (reimplement/vendor/coexist), the API decision (preserve vs migrate) + any deprecations, consumers touched, tokens read + any missing rungs flagged, libs retired, and what `ecology-verify` still needs to confirm. End with the reminder that this swap is skill-produced — to change it, reset → refine this skill → re-run.

## Notes
- **One component per run.** A slice is run component-by-component, low-blast first (per `migration-plan.md`).
- **Mirror the reference faithfully.** Beacon `ui-*` + the hub `.astro` define the API, variants, and structure — don't diverge silently; divergence is a bug.
- **Preserve public API by default.** Consumers shouldn't break unless API migration is the point of the swap.
- **Skill-only production / idempotent.** The swap is produced by this skill; iterate by resetting the working tree, refining the skill, and re-running. Re-running on an already-migrated component is a no-op.
- **Defer the risky forks.** Final brand/theme values (design spoke), and consuming published Lit web components (pending `@esa/ecology` publishing), are out of scope.
