---
name: ecology-migrate
description: Front-door conductor for the Ecology migration pattern. Ensures the audit + plan exist (spoke-driven with --spoke), then drives the two axes + shell in order — the one-time shell restructure (ecology-migrate-shell, Slice 0b), then the component track (ecology-migrate-component) and the screens track (ecology-migrate-page), each unit gated by ecology-verify — pausing for human review between each. Use to migrate an Angular app (or one slice/screen) to the Ecology design system end-to-end.
allowed-tools: [Skill, AskUserQuestion, Read, Glob, Grep, Bash, Agent]
---

The single entry point to the Ecology migration suite. It **sequences** the stages and hands off between them — but it is a **guided, human-checkpointed driver**: it migrates **one component at a time with review gates**, never the whole app unattended. Auto-migrating everything would produce a huge unreviewed diff and bypass the per-component verify gate — the opposite of what this pattern is for.

**The suite it conducts** (a two-axis + shell model — the plan carries two tracks + a shell slice):
- **`ecology-audit`** — assess + plan: inventory → map to the live Ecology catalog → token/library gaps → an ordered, **two-track** plan (component slices + a screens track) plus a **shell slice (0b)** when the spoke restructures the frame. Run once per app; re-run for a burndown.
- **`ecology-migrate-shell`** — the one-time **shell** restructure (Slice 0b: e.g. header nav → the spoke's sidebar `modern-layout`), run **once, first**, before the per-unit slices. Skipped when the spoke keeps the app's frame.
- **`ecology-migrate-component`** — execute one **component** swap (reimplement against the Beacon `ui-*` reference + token contract, reconcile API, update consumers). *(Component axis — library-wide, bottom-up.)*
- **`ecology-migrate-page`** — rebuild one **screen** section-by-section against its spoke prototype + handoff (`decisions`/`gotchas` = build spec, `acceptance` = gate). *(Page axis — per-screen, top-down.)*
- **`ecology-verify`** — the shared visual-fidelity gate: before/after render (isolated harness for primitives; live-authenticated app for shell/pages) → side-by-side page + navigable index → PASS/FLAG verdict.
- **`ecology-migrate`** (this) — the conductor.

## Arguments

`$ARGUMENTS`: `--spoke <path>` (the design spoke — makes the run spoke-driven; default a sibling `../<app>-design`), `--app <path>` (default current repo), `--slice <n>` (limit to one component slice), `--component <name>` / `--screen <name>` (a single component or screen), `--resume` (continue from the burndown).

## Workflow

### Phase 0 — Ensure the audit + plan exist
If `docs/ecology-migration/migration-plan.md` is missing or stale, run **`ecology-audit`** (Skill tool; pass `--spoke` through so the plan is spoke-driven — the two tracks + the shell slice). Read the plan and the verify index (`.playwright-mcp/ecology-verify/`) to compute the **burndown** across all three: the shell slice (0b), each component slice, and each screen — done vs. remaining.

### Phase 1 — Shell first (once, before the per-unit slices)
If the plan carries a **Slice 0b shell restructure** (the spoke's `AppShell` differs from the app's current frame) and it isn't done yet: checkpoint (`AskUserQuestion`), then run **`ecology-migrate-shell`** (Skill tool), then **`ecology-verify`** in live full-page mode (its chrome sections gated by the handoff `acceptance`), then the AFTER review gate (Phase 6). Everything renders inside the shell, so it precedes the component/page units. Skip this phase when the spoke keeps the app's frame or the shell is already done.

### Phase 2 — Pick the next unit (either track)
Default = the **lowest incomplete component slice, lowest-blast-radius component first**, interleaving **screens** from the page track as their component dependencies land (per the plan). Honor `--slice` / `--component` / `--screen` if given. Present the chosen unit — its kind (component vs screen), `esa-*` target(s) / prototype, slice, blast-radius or handoff sections — plus the remaining count.

### Phase 3 — Checkpoint BEFORE changing code
Confirm with the user (`AskUserQuestion`) before any code change: proceed with this unit / skip it / stop. Migration mutates source + consumers — never proceed unprompted.

### Phase 4 — Migrate the unit
Run the executor for the unit's kind (Skill tool): **`ecology-migrate-component`** for a component, **`ecology-migrate-page`** for a screen; build to confirm.

### Phase 5 — Verify
Run **`ecology-verify`** (Skill tool): **mode A** isolation for a primitive; **mode B** live full-page (`--handoff <screen#section>`) for a screen or the shell → regenerates the unit's side-by-side page and the navigable index.

### Phase 6 — Checkpoint AFTER (the review gate)
Present the verify **verdict**, the side-by-side / index path (tell the user to open it), and the deltas (+ the handoff `acceptance` verdict for a screen/shell). Ask the user to **review and approve**:
- **PASS + approved** → optionally commit this unit (the human decides — the conductor does not commit unprompted), then continue.
- **FLAG or rejected** → stop. The human fixes via the skill-only loop (reset → refine the relevant stage skill → re-run) before moving on.
Do **not** auto-advance to the next unit.

### Phase 7 — Loop or stop
On approval, return to Phase 2 for the next unit. **Stop at slice / screen boundaries by default** — a component slice or a screen is a shippable unit and a natural commit/PR point — unless the user opts to keep going. Re-running the conductor later resumes from the burndown.

### Phase 8 — Report
The burndown (shell + component slices + screens, done vs. remaining), the verify index path, and the suggested next unit.

## Notes
- **Human-gated, one unit at a time.** A unit is a component *or* a screen; never run the whole app unattended — the review gates are the point.
- **Shell first, then the two tracks.** The Slice 0b shell restructure runs once, before any component/page unit (everything renders inside it); then the component track (bottom-up) and the screens track (top-down, handoff-driven) interleave per the plan. Verify gates every unit.
- **The conductor doesn't commit.** Commits/PRs are human decisions, ideally per slice/screen. (If the app gates its real swaps behind a follow-up — e.g. waiting on the design spoke — run the conductor as a dry-run/demo unless told otherwise.)
- **Skill-only discipline carries through** each stage. To change a swap: reset → refine the stage skill → re-run.
- **Slices/screens ship in order** — don't skip ahead; later slices assume the patterns earlier ones establish.
