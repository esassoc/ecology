---
name: ecology-migrate-page
description: Execute the Ecology migration of ONE app page/screen — rebuild it to match the design spoke's prototype, section by section per the spoke's handoff spec (intent/decisions/gotchas as the build spec, acceptance as the gate), composing migrated esa-* primitives + bespoke page shells. The page/screen axis of the migration pattern, distinct from ecology-migrate-component (the reusable-component library axis). Use when a spoke prototype + handoff exist for a screen.
allowed-tools: [Agent, Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion, Skill]
---

The **page/screen axis** of the Ecology migration. Where `ecology-migrate-component` migrates a *reusable primitive* (library-wide, bottom-up), this rebuilds **one app screen** to match its design-spoke **prototype**, **section by section per the spoke's handoff** (top-down). The handoff is the designer's authored, canonical *first-implementation* reference — read it, follow it, don't diverge.

**Two axes, one suite:** components supply the legos; pages assemble screens from them per the design. They're independent — a page can be assembled from `esa-*` legos + already-migrated primitives *before* the whole component library is swapped.

## What the handoff is (the driver)

A spoke prototype ships a handoff spec — `<spoke>/src/data/handoff/<slug>.mjs` — declaring the screen's **sections** (top bar, side nav, page header, filters, grid, map, …). Each section carries:
- **`selector`** — the region it slices out, **`intent`** — what it is / why,
- **`decisions`** — the key build choices ("each filter is `esa-select`, NOT `esa-filter-dropdown`, because…"),
- **`gotchas`** — traps to avoid ("the card needs a stacking context above the map or dropdowns render behind Leaflet"),
- **`acceptance`** — the "done when…" checks.

`decisions`+`gotchas` are the **build spec**; `acceptance` is the **verify gate**; the sections are the **units of work**.

## Arguments

`$ARGUMENTS`:
- **`--screen <app page/route|component>`** — the app screen to rebuild (e.g. a data-tool or list screen). Required.
- **`--prototype <slug>`** — the spoke prototype to match (default: resolve by name from the spoke's `prototypes.ts`).
- **`--spoke`/`--app`/`--ecology`/`--beacon`** — repo roots (defaults: `../<app>-design`; current; `../ecology`; `../Beacon`).
- **`--dry-run`** — produce the section-by-section assembly plan, change nothing.

## Workflow

### Phase 0 — Resolve the screen + its spoke counterpart
Find the target **app screen** and its spoke **prototype** (`<spoke>/src/pages/prototypes/<slug>.astro` + the `<spoke>/src/components/<spoke>/*` parts it composes) and its **handoff** (`<spoke>/src/data/handoff/<slug>.mjs`). **If no handoff exists, stop** — page migration is handoff-driven; without one, either ask the designer to author it (a spoke `/new-prototype` + handoff task) or fall back to `ecology-verify --design <prototype>` only.

### Phase 1 — Read the handoff; split chrome from content
Each handoff **section** is a unit. Map each to the app region that renders it. **Chrome sections (top bar, side nav) belong to `ecology-migrate-shell`** — note and defer them (the shell is built once, app-wide); this skill owns the screen's **content** sections (page header, filters, grid, map, …). **Mapping isn't always 1:1** — a section may span *multiple* app regions (e.g. a handoff *Filters* card whose search + view-toggle the app keeps in a separate grid-toolbar component), or several sections may collapse into one. Map every region a section touches.

### Phase 2 — Plan the assembly
Order the content sections (layout shells before the leaves they contain). For each, identify what it composes: which **primitives** + which **bespoke page shell** (the prototype's `<spoke>-*` component is the reference composition — e.g. a filter-controls card = a layout wrapper around `esa-select`×3 + `esa-button-toggle`). **If the component axis hasn't run (the `esa-*` legos aren't present in the app), substitute the app's existing equivalent** for each — its current Select, button, icon, grid/map wrapper — and flag the dependency; don't block. (Use the `esa-*` lego directly only when it's actually installed.)

### Phase 3 — Execute, section by section
For each content section, rebuild the app's markup to match the prototype, **following the handoff `decisions` and avoiding the `gotchas` verbatim** — they're the designer's authored spec and outrank inference from the prototype markup. **Compose** legos + migrated primitives + a bespoke page shell; read tokens (no hardcoded brand values *except* the exceptions the handoff names, e.g. Leaflet `circleMarker` literals the canvas can't read from CSS). A page shell that only *lays out* legos is fine (it's the spoke's own pattern); a bespoke UI **primitive** is a bug — that's the component axis. **Already-conformant sections are a no-op:** if the app already renders a section to the handoff's intent + `acceptance` (e.g. an existing grid/map that already matches), record it **already-conformant** and move on — not every section is a rebuild.

### Phase 4 — Verify each section
Hand each rebuilt section to **`ecology-verify`** (Skill tool) with the handoff **`acceptance`** as the pass criteria (its "done when…" checks) and the prototype section as the design target. Build the app.

### Phase 5 — Checkpoint + report
Per section: what was rebuilt, which `decisions`/`gotchas` were applied, the `acceptance` verdict, and the deferred items (chrome → `ecology-migrate-shell`; any unmigrated-primitive dependencies). The conductor checkpoints between screens; this skill does not commit.

## Notes
- **Handoff-driven.** The handoff is the canonical reference; `decisions`/`gotchas` are the spec, `acceptance` is the gate. Don't diverge from authored guidance.
- **Two axes.** Page/screen here; reusable components in `ecology-migrate-component`; the app frame in `ecology-migrate-shell` (which owns the handoff's chrome sections).
- **Compose, don't reinvent.** Mirror the spoke's `<spoke>-*` page components — assemble legos; never hand-roll a primitive a lego provides.
- **App-specific content stays app-owned.** Leaflet maps / Vega charts keep their engines, themed to tokens per the handoff, composed inside the `esa-map`/`esa-grid` token frames.
- **Skill-only / human-gated.** One screen at a time; iterate via reset → refine the skill → re-run.
