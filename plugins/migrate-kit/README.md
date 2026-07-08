# Ecology Migration Toolkit

A reusable Claude Code **skill suite** for migrating an existing **Angular** app onto ESA's **Ecology** design system, **driven by the app's design spoke**. Packaged as Ecology's `migrate-kit` plugin (a sibling to `spoke-kit` in the ecology marketplace) so any Angular app can run it (`migrate-kit:ecology-*`). *First dogfooded on a water-banking Angular app.*

## The pipeline

```
/ecology-migrate [--spoke <path>]   ← conductor (front door, human-gated)
   │
   ├─ /ecology-audit     assess + plan → TWO tracks in migration-plan.md:
   │                        • component track (reusable primitives → esa-*)
   │                        • screens track   (one per spoke prototype + handoff)
   │
   ├─ SHELL (once):   /ecology-migrate-shell     header nav → spoke sidebar  (Slice 0b)
   │
   ├─ COMPONENT axis (library-wide, bottom-up):
   │     per primitive:  /ecology-migrate-component → /ecology-verify
   │
   └─ PAGE axis (per screen, top-down, handoff-driven):
         per prototype:  /ecology-migrate-page      → /ecology-verify
                         (handoff decisions/gotchas = build spec; acceptance = gate)
   ↳ human review gate between units
```

**Two axes + a shell:** *components* supply the legos (reusable-primitive library); *pages* assemble screens from them per the spoke's prototype + handoff; the *shell* is the app frame, built once. Verify is shared across all three.

## The skills (invoked as `migrate-kit:ecology-*`)

| Skill | Stage | What it does |
|---|---|---|
| **`ecology-migrate`** | conductor | Front door. Ensures the audit/plan exist, then walks it unit-by-unit (migrate → verify) with a **human checkpoint between each** — never the whole app unattended. Point it at the spoke with `--spoke`. |
| **`ecology-audit`** | assess + plan | Inventories the app's reusable UI, maps each to the **live** Ecology catalog (DIRECT/PARTIAL/COEXIST/GAP — reference contracts like `esa-map`/`esa-grid` are COEXIST, not DIRECT), analyzes token + library gaps (vs the spoke's target values when `--spoke`), and emits a **two-track plan** (component slices + a screens track). Deterministic / cold-reproducible. |
| **`ecology-migrate-component`** | execute · **component axis** | Swaps one **reusable primitive** to its `esa-*` target: reimplements it in Angular against the **Angular reference** (a prior migration's `esa-*` legos — default Noria — else **Beacon `ui-*`**) + the hub token contract, reconciles the API (preserve/migrate/drop), updates consumers, verifies the build. |
| **`ecology-migrate-page`** | execute · **page axis** | Rebuilds one **app screen** to match its spoke **prototype**, section by section per the **handoff** (`decisions`/`gotchas` = build spec, `acceptance` = gate), composing migrated primitives + bespoke page shells. |
| **`ecology-migrate-shell`** | execute · **shell** | One-time app-frame restructure (a header nav → the spoke's sidebar `modern-layout`); Angular reference = a prior migrated app's shell (default Noria) else Beacon `modern-layout`; re-houses nav + preserves gating; owns the handoff's chrome sections (top bar / side nav). |
| **`ecology-verify`** | verify *(shared)* | Granularity-agnostic. **Mode A** (primitives): an **isolated harness** — real tokens, no app/auth/DB. **Mode B** (pages/shells): a live **authenticated** render of the real app. Emits a side-by-side page + a **navigable index** → PASS/FLAG; uses a handoff section's **`acceptance`** as the gate when one applies. |

## How to run

- **Guided (recommended):** `/ecology-migrate --spoke <path>` — the conductor drives the whole pipeline with review gates.
- **Stage by stage:** `/ecology-audit` → `/ecology-migrate-shell` / `/ecology-migrate-component --component <X>` / `/ecology-migrate-page --screen <X>` → `/ecology-verify`.

## Artifacts

- **Regenerated, not committed:** the audit + plan under `docs/ecology-migration/*.md` — outputs of `ecology-audit`, refreshed by re-running it. Treat them as a working snapshot, not hand-maintained source; the conductor's Phase 0 regenerates them at kickoff.
- **Committed:** the additive Ecology token aliases in the app's theme file (e.g. `src/scss/**/_theme.scss`) — a safe, value-for-value change that can't alter appearance.
- **Gitignored review gallery:** `.playwright-mcp/ecology-verify/index.html` — open via `node .playwright-mcp/ecology-verify/serve.cjs`.

## Principles baked into the suite

- **Skill-only production** — artifacts/swaps are produced *by the skills*, never hand-edited; iterate via reset → refine the skill → re-run. (Each skill is hardened this way through cold-room runs.)
- **Spoke-driven** — the suite *consumes* the design spoke (theme values + catalog + prototypes + handoff) as the target; it does the structure, sequencing, and execution — the spoke owns the look. Target hierarchy: **spoke → a prior migration's `esa-*` legos (default Noria; Beacon `ui-*` fallback + variant-superset signal) → hub (token contract)**.
- **Live hub is the source of truth** for the `esa-*` catalog + tokens; **reference contracts** (`esa-map`/`esa-grid`) are COEXIST-toward-tokens (keep the lib, theme it), not shippable swaps.
- **Two axes + a shell** — components (library, bottom-up), pages (per-screen, top-down, handoff-driven), shell (frame, once). The handoff's `decisions`/`gotchas` are the build spec; its `acceptance` is the verify gate.
- **Human-gated** — one unit at a time with review between; a slice (component track) or a screen (page track) is the shippable unit. The conductor never migrates the whole app unattended.

## How the spoke drives it

A spoke (an Astro spoke of `@esa/ecology`) supplies the migration's target:

- its **theme** (`theme-<slug>.css`) = the target token *values* the app converges to;
- its **catalog** (`src/data/ds-nav.ts` + the component doc pages) = which `esa-*` the design actually uses;
- its **prototypes** (`src/pages/prototypes/*` + `src/components/<spoke>/*`) = the target screens;
- its **handoff** (`src/data/handoff/<slug>.mjs`) = per-section `intent`/`decisions`/`gotchas` (build spec) + `acceptance` (verify gate);
- its **`AppShell`** = the target frame (e.g. a sidebar) for `ecology-migrate-shell`.

The suite stays **design-independent in its mechanics** (structure, sequencing, execution) and reads the spoke for the look — so the same skills migrate any app to its own spoke.

## Maturity

All six skills are built. The **assess** (audit), **component**, and **verify** stages are cold-validated for reproducibility; the **page** + **shell** stages and verify's **live authenticated mode** were validated end-to-end on the first dogfood app (a header-nav → sidebar shell restructure + a prototype screen rebuilt section-by-section from its handoff, builds green). Applying a spoke's final theme **values** and shipping the production swaps to a given app is that app's own follow-up; formal cross-app packaging is the **`migrate-kit`** plugin — a sibling to `spoke-kit` in the ecology marketplace (committed on the hub's `migrate-kit-plugin` branch; publishing it is a hub-side merge).
