# Ecology Governance

The operating model for the hub and its spoke fleet. This document governs how the system grows; `promotion-path.md` owns promotion mechanics, `system-improvement-ledger.md` owns the finding log, and `plugins/spoke-kit/` owns enforcement. When those documents and this one disagree, this one decides.

## The system, July 2026

Four live spokes — beacon, cb-fish, biochar, noria — created at a pace of roughly one every two weeks since early June, all consuming the hub through `file:` links, all governed by spoke-kit (v1.8.1, ~12 republishes in three weeks). One maintainer. Two purged demos (touchline, laureate). One spoke-in-waiting (ccsp, still a specimen workspace). At this growth rate the fleet doubles by fall; the governance question is not whether to add process, but which few mechanisms keep quality flat while the fleet grows.

## What the evidence says

**The composition layer is built but unadopted — and the failure is the hub's.** No live spoke uses `esa-app-shell`; all four hand-roll a local `AppShell.astro`. The one documented rejection (noria's `bcn-lego-checked` at `src/layouts/AppShell.astro:20`) is legitimate: the lego hardcodes its app-bar end slot and cannot host a topbar-right utility cluster or a QA environment badge. `esa-page-header` and `esa-stat` adoption is partial (cb-fish yes; beacon, biochar, noria barely). Biochar imports neither `layouts.css` nor `type-roles.css`.

**Bespoke CSS volume varies 13× between spokes.** Rough page-`<style>` lines per page: cb-fish ~12, noria ~11, biochar ~41, beacon ~153 (≈7,300 lines across 48 pages). The composition gate proposed in the ledger (workflow item D) was never built, so nothing measures this.

**The promotion pipeline exists on paper and stalls in practice.** `/request-lego` files GitHub issues, but real requests accumulate as prose in spoke `NEEDS.md` files instead — cb-fish alone holds eight open asks that never became issues. Promotion itself is a manual hub-side procedure.

**Distribution has one solved problem and one unsolved one.** `file:` links deliver hub changes live — that works. Plugin changes do not: they require a version bump, push, forced marketplace pull, project-scoped update, and a session restart, and the marketplace update is TTL-cached in a way that reports success without pulling.

## Principles

1. **Adoption failure is hub signal.** When zero consumers adopt a lego, the lego is wrong, not the spokes. The response is to fix its flexibility (slots, props, tokens), then migrate consumers — never to enforce adoption of a component that lost on merit. Noria's app-shell rejection is the canonical case: the fix is slots, not discipline.

2. **Rule of two.** One spoke's need is a prop, a token hook, or a documented `bcn-lego-checked` hand-roll. The second spoke's need for the same thing is an automatic promotion candidate. The worked examples in `promotion-path.md` (button `href`, page-header merge) set the bar: promotion is usually the smallest surface that satisfies both consumers, often a prop on an existing lego rather than a new component.

3. **NEEDS.md is the request queue.** The de facto behavior is now the official one: spokes record hub gaps in `NEEDS.md` with the closest existing lego, the workaround in use, and evidence. The hub sweeps the fleet; the spoke never waits on filing ceremony. `/request-lego` remains for out-of-fleet consumers.

4. **Composition is measured, not aspirational.** A page's bespoke `<style>` volume is the health metric the ledger already identified. New pages warn above 40 lines and need justification above 80; existing pages are grandfathered and burned down opportunistically. The metric exists to surface missing legos (principle 1), not to shame pages.

5. **Every spoke is in exactly one lifecycle state.** `spokes.ts` is the roster of record.
   - **Demo** — built to prove or sell something; purged when done (touchline, laureate). Never accumulates NEEDS.md debt.
   - **Incubating** — specimens or planning only, no hub dependency yet (ccsp). Graduates via `create-spoke.mjs`.
   - **Live** — registered in `spokes.ts`, spoke-kit enabled, doctor green, composition layer imported. Only live spokes may file NEEDS.md entries.
   - **Archived** — roster-removed, repo kept read-only.

6. **Adopt before add.** A new spoke starts on the *current* composition layer — app-shell, page-header, stat, layouts.css, type-roles — as scaffolded by `create-spoke.mjs` and verified by doctor. Adoption debt stops compounding at the door: the fleet's newest member is always the hub's best consumer. (Biochar's missing `layouts.css` import is the failure this prevents.)

7. **Distribution stays live until there is a second maintainer.** `file:` links are a feature at this stage — instant propagation, no version skew, one reality. GitHub Packages publishing waits for the trigger that actually needs it: a spoke maintained by someone who cannot `git pull` the sibling hub. Until then, effort goes to the real distribution pain, the plugin republish path.

## Mechanisms

Small builds, in leverage order:

| Mechanism | What it does | Where |
| --- | --- | --- |
| `esa-app-shell` slots | Add `slot="bar-end"` (utility cluster), an environment badge prop, and omnibox placement options — the union of the four hand-rolled shells. Then migrate all four spokes onto it and delete the local copies. | `packages/ecology` |
| `scripts/collect-needs.mjs` | Sweep `../*-design/NEEDS.md` into one triage table (spoke, ask, closest lego, age). Output feeds the weekly triage. | `scripts/` |
| `scripts/check-composition.mjs` | Per-page bespoke-`<style>` line count against the thresholds in principle 4; warning-only for one release cycle, then gating for new pages via `/design-qa` and `/ship`. | `scripts/`, wired into spoke-kit |
| Bundle composition CSS | Fold `layouts.css` + `type-roles.css` into the default `tokens.css` export so importing the composition layer is not a thing a spoke can forget. (cb-fish's standing ask; biochar's standing failure.) | `packages/tokens` |
| `scripts/republish.mjs` | One command on the hub side: bump `plugin.json`, commit, push, print the exact three spoke-side steps. Extend `doctor.mjs` to detect a stale plugin cache and print the same steps. | `scripts/` |
| Lifecycle field in `spokes.ts` | `state: 'demo' \| 'incubating' \| 'live' \| 'archived'` on each roster entry; doctor warns when a repo's behavior disagrees with its declared state. | `apps/site/src/data/spokes.ts` |

## Cadence

- **Weekly, ~15 minutes:** run `collect-needs.mjs`, decide each item — promote (rule of two), add a prop, add a token hook, or decline with a note back into the spoke's NEEDS.md — and log outcomes in the ledger. This replaces the aspiration that findings route themselves.
- **Per ship:** the existing gates (`check-adherence`, `check-contrast`, hooks, decomposition-reviewer) plus `check-composition` once it lands.
- **Per new spoke:** `create-spoke.mjs` + doctor green before the roster entry flips to live.

## What not to do

- Don't wire GitHub Packages now. It converts a live system into a versioned one while the API surface is still churning weekly, and it solves a problem (consumer isolation) the fleet doesn't have yet.
- Don't make the composition gate block existing pages. Beacon's ~7,300 lines are a burn-down list, not a build failure.
- Don't add spoke-side filing ceremony. The queue meets the work where it already happens (NEEDS.md); heavier intake will simply be skipped, as `/request-lego` was.
- Don't keep demo spokes on the roster or on disk past their purpose. Purge is the demo lifecycle working as designed.

## First moves

1. Fix `esa-app-shell` slots against the four hand-rolled shells; migrate noria first (its rejection is the spec), then beacon, biochar, cb-fish.
2. Bundle `layouts.css` + `type-roles.css` into the tokens default export; republish.
3. Ship `collect-needs.mjs` and run the first weekly triage on cb-fish's eight open asks and beacon's icon-button `paths` gap.
4. Ship `check-composition.mjs` warning-only; add the lifecycle field to `spokes.ts`.
5. Ship `republish.mjs` + the doctor staleness check, and retire the hand-run three-step dance.
