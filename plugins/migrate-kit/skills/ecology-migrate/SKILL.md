---
name: ecology-migrate
description: Front-door conductor for the Ecology migration pattern. Drives the pipeline in order — ensures the audit + plan exist, then walks the plan component-by-component running ecology-migrate-component then ecology-verify, pausing for human review between each. Use to migrate an Angular app (or one slice) to the Ecology design system end-to-end.
allowed-tools: [Skill, AskUserQuestion, Read, Glob, Grep, Bash, Agent]
---

The single entry point to the Ecology migration suite. It **sequences** the stages and hands off between them — but it is a **guided, human-checkpointed driver**: it migrates **one component at a time with review gates**, never the whole app unattended. Auto-migrating everything would produce a huge unreviewed diff and bypass the per-component verify gate — the opposite of what this pattern is for.

**The suite it conducts:**
- **`ecology-audit`** — assess + plan: inventory → map to the live Ecology catalog → token/library gaps → ordered slice plan. Run once per app; re-run for a burndown.
- **`ecology-migrate-component`** — execute one component's swap (reimplement against the Beacon `ui-*` reference + token contract, reconcile API, update consumers).
- **`ecology-verify`** — visual-fidelity gate: isolated before/after render → side-by-side page + navigable index → PASS/FLAG verdict.
- **`ecology-migrate`** (this) — the conductor.

## Arguments

`$ARGUMENTS`: `--app <path>` (default current repo), `--slice <n>` (limit to one slice), `--component <name>` (single component), `--resume` (continue from the burndown).

## Workflow

### Phase 0 — Ensure the audit + plan exist
If `docs/ecology-migration/migration-plan.md` is missing or stale (app changed since it was generated), run **`ecology-audit`** (via the Skill tool). Read the plan and the verify index (`.playwright-mcp/ecology-verify/`) to compute the **burndown**: which components are already migrated/verified vs. remaining, per slice.

### Phase 1 — Pick the next unit
Default = the **lowest incomplete slice**, **lowest-blast-radius component first** (per the plan). Honor `--slice`/`--component` if given. Present the chosen unit to the user — component, `esa-*` target, slice, blast-radius, consumers — plus the slice's remaining count.

### Phase 2 — Checkpoint BEFORE changing code
Confirm with the user (`AskUserQuestion`) before any code change: proceed with this component / skip it / stop. Migration mutates source + consumers — never proceed unprompted.

### Phase 3 — Migrate
Run **`ecology-migrate-component`** (Skill tool) for the component; build to confirm.

### Phase 4 — Verify
Run **`ecology-verify`** (Skill tool) for the component → regenerates its side-by-side page and the parent index.

### Phase 5 — Checkpoint AFTER (the review gate)
Present the verify **verdict**, the side-by-side / index path (tell the user to open it), and the deltas. Ask the user to **review and approve**:
- **PASS + approved** → optionally commit this component (the human decides — the conductor does not commit unprompted), then continue.
- **FLAG or rejected** → stop. The human fixes via the skill-only loop (reset → refine the relevant stage skill → re-run) before moving on.
Do **not** auto-advance to the next component.

### Phase 6 — Loop or stop
On approval, return to Phase 1 for the next unit. **Stop at slice boundaries by default** — a slice is a shippable unit and a natural commit/PR point — unless the user opts to keep going. Re-running the conductor later resumes from the burndown.

### Phase 7 — Report
The burndown (migrated vs. remaining per slice), the verify index path, and the suggested next unit.

## Notes
- **Human-gated, one component at a time.** Never run the whole app unattended; the review gates are the point.
- **The conductor doesn't commit.** Commits/PRs are human decisions, ideally per slice. (If the app gates its real swaps behind a follow-up — e.g. waiting on the design spoke — run the conductor as a dry-run/demo unless told otherwise.)
- **Skill-only discipline carries through** each stage. To change a swap: reset → refine the stage skill → re-run.
- **Slices ship in order** — don't skip ahead; later slices assume the patterns earlier ones establish.
