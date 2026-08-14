# Ecology System-Improvement Ledger

A living record that turns **prototype/spoke reviews** into **durable hub improvements**
(legos, skills, workflow). This is the data; the *process* is: build → review → log here →
route entries through the `learning-engine` agent → land as skill/lego/workflow changes →
next build is more on-rails. Patterns that prove broadly useful get promoted up the hub
(the hub-and-spoke contract, formalized with a capture step).

Each entry: **Finding · Evidence · Action · Sink · Priority**. Sinks: `lego` (new/changed
component), `hub-fix`, `skill`, `workflow` (planner/gate defaults), `process`.

---

## Source: an end-to-end spoke build (2026-06-13)
A spoke built end-to-end by a planner→implementer→evaluator Workflow.
Result: 6/6 pages passed both gates, 0 adherence errors, AA contrast — but Andy's review
surfaced the gaps below. Cost: 22 agents · 1.3M tokens · ~79 min.

### Progress — session 2 (2026-06-13)
- ✅ **Layout primitives** shipped as `packages/tokens/src/layouts.css` (composable utility
  classes — stack/cluster/repel/grid/sidebar/switcher/frame/reel; `data-gap` on the
  xs–xl scale; inheritance fix via per-element defaults + `@property --gap{inherits:false}`).
  Decision: utility CSS, not components (Andy's call).
- ✅ **`type-roles.css` + `layouts.css` wired** into the spoke AND `spoke-template`
  BaseLayout — fixes the #4b root cause (roles existed but were imported nowhere).
- ✅ **New legos:** `esa-page-header`, `esa-stat` (mid-tier), `esa-app-shell` (canonical
  neutral-chrome shell with topbar toggle / sidenav logo / omnibox / user menu — BUILT,
  not yet adopted by the spoke).
- ✅ **esa-badge → 4px** fixed at the true source (`component-tokens.css` `--badge-radius`,
  not just the component fallback).
- ✅ **check-adherence.mjs** false positives fixed (var() fallbacks, hyphenated names).
- ✅ **component-first hook** suffix-match fix in hub source — but the RUNNING hook is the
  marketplace **cache** (`~/.claude/plugins/cache/ecology/spoke-kit/1.3.0/`); the fix is
  inert until: bump `plugin.json` 1.3.0→1.3.1, push hub, `claude plugin marketplace update
  ecology`. **NEW finding:** the cached-plugin model means every hook/skill fix needs a
  republish to take effect — local hub edits don't.
- ✅ **Dashboard rebuilt** as a lego manifest: `<style>` 280→27 lines, file 477→189,
  0 adherence errors/warnings. Chrome neutralized (faint brand-tinged top bar).

### Still open
- Propagate the lego+utility pattern to the other 5 pages (teams/players/stats/map/history).
- Adopt `esa-app-shell` in the spoke (delivers 2a toggle / 2b logo / 2c omnibox / 2d user menu).
- Fold house rules into skills via learning-engine (component-first → primitives + the
  Beacon/cb-fish pattern catalog; design-principles → neutral chrome + type-roles-first).
- Republish spoke-kit (version bump + push + marketplace update) so the hook fix goes live.
- Prototype polish: research the real brand identity, source real visual assets (not placeholder avatars), wire a real map lib (Leaflet).

### Root cause (the through-line)
**The hub has objective rails (tokens, components) but no _composition_ rails.** Only
`esa-sidebar-nav` and `esa-tab-layout` exist above the atom level — no layout primitives,
no PageHeader, no Stat. So every page was a from-scratch CSS layout exercise: **34–46
bespoke classes and 250–417 `<style>` lines per page, zero shared class roots across
pages** (every page reinvented page-header/stat/card-grid under its own names). This single
gap drives: (a) slow builds, (b) the visual gate having to iterate (high variance), (c) the
browser-stacking OOM, (d) high token cost. Fix the composition layer and all four ease.

---

## A. New legos (highest leverage)

- **Layout primitives** · *Evidence:* pages hand-roll fl/grid CSS everywhere · *Action:*
  build `Stack`, `Cluster`, `Grid`, `Sidebar`, `Center` (Every-Layout style, token-gap props)
  so pages compose layout instead of writing CSS · `lego` · **P0**
- **`PageHeader.astro`** · *Evidence:* every page rebuilt `.x__head/.x__title/.x__lede/.x__cta`
  · *Action:* `<PageHeader title lede>` + actions slot; breadcrumb-aware · `lego` · **P0**
- **`Stat.astro` / `MetricCard.astro`** · *Evidence:* `.stat/.stat__value/.stat__label/.stat__sub`
  reinvented on dashboard + stats + map · *Action:* `<Stat value label sub accent?>` using
  `--font-display` for the number · `lego` · **P0**
- **`esa-app-shell`** (or a canonical reference) encoding house defaults · *Evidence:* 2a/2b/2d
  + neutral-chrome all missing · *Action:* topbar with **sidebar-toggle icon-button in the
  left corner** (Beacon glyph), **logo/app-name in the sidenav header slot**, omnibox search,
  **working user/profile dropdown** (`esa-dropdown-menu`), neutral surface differentiation
  (see C) · `lego` · **P0**
- **Omnibox search** promoted from cb-fish-design · *Evidence:* our search was weak; the good
  pattern exists but is undiscoverable · *Action:* port cb-fish omnibox → `esa-omnibox` with
  live typeahead/results; make it the default shell search · `lego` · **P1**
- **`esa-map`** (Leaflet wrapper) · *Evidence:* schematic plot was a workaround for my
  "no map lib" constraint · *Action:* Leaflet-based map lego, token-themed markers,
  data-driven pins · `lego` · **P1**

## B. Hub component fixes

- **`esa-badge` radius → 4px** · *Evidence:* `esa-badge.astro:36` defaults to `--radius-full`
  (pill), contradicting design-principles ("badges quiet 4px, not pills") · *Action:* default
  `--badge-radius` → `--radius-100`; keep `esa-pill` full (it's a pill) · `hub-fix` · **P0**

## C. Skill updates (design-principles, component-first)

- **House chrome is neutral; brand never floods it** · *Evidence:* magenta topbar is "anathema";
  house style = subtle value steps (Beacon: topbar `#EEE`, sidenav/surface `#FAFAFA` with a
  hair of separation), brand as a *tint* at most · *Action:* design-principles rule + chrome
  surface tokens (`--app-bar-bg`, `--sidenav-bg`, `--app-surface-bg`) with neutral house
  defaults and an optional subtle brand-tinge variant; app-bar default tone = `surface`,
  never `brand` for chrome · `skill` · **P0**
- **Use `type-roles.css`, not raw `--type-size-*` in pages** · *Evidence:* sizes scattered
  200/250/300 ad hoc; body reads too large · *Action:* document role classes as the default
  path; define the canonical body/label/heading roles; flag raw size tokens in page CSS · `skill` · **P1**
- **Established patterns must be discoverable** · *Evidence:* the permit-tracker filter
  (`beacon-design/.../permit-tracking.astro`) and cb-fish omnibox exist but aren't in the
  Ecology→Beacon→bcn- lookup path · *Action:* add a "pattern catalog" the component-first
  skill points at (spoke prototype pages as canonical references), so filter bars / omniboxes
  / shells are found before being rebuilt · `skill` · **P0**

## D. Workflow / planner-gate upgrades

- **Visual gate cadence** · *Evidence:* screenshot-per-iteration → OOM, slow · *Action:* run
  the visual judge **once after the objective gate passes** (not every iteration); reuse a
  single browser context; cap concurrent visual judges · `workflow` · **P0**
- **Feed the design spec to the visual judge** · *Evidence:* judge dinged on-spec indigo stat
  numbers as "should be magenta" — it had the rubric but not the planner's intent · *Action:*
  pass planner spec + house-style reference into the Gate-2 prompt · `workflow` · **P1**
- **Planner defaults** · *Evidence:* my prompts caused the pink chrome / no-map-lib / generic
  look · *Action:* default to neutral chrome, real libs where appropriate (Leaflet), source
  real visual assets (e.g. country flag SVGs), and research the *actual* brand identity when a
  themed palette is requested · `workflow` · **P1**
- **Composition gate** · *Evidence:* 250–417 bespoke `<style>` lines/page went unflagged ·
  *Action:* add an objective check that flags pages exceeding N bespoke classes / style-lines
  → "you're hand-rolling; compose a lego or propose one" · `workflow` · **P1**
- **Checker tuning (done)** · `check-adherence.mjs` over-flagged `var(--token,#fallback)` and
  hyphenated class names; fixed. *Lesson:* fuzzy rules stay **warnings, not errors**, so an
  imperfect gate never blocks good code · `workflow` · ✅ done

## E. Prototype-polish (spoke-specific, lower priority)
- Source real visual assets (e.g. logos/marks) instead of placeholder initials avatars.
- Research the real brand identity for the palette and the mark, rather than inventing one.

---

## Source: the token-refinement sessions (2026-08-13)

Tier-1 and tier-2 tokens re-audited against the EightShapes naming taxonomy and the
tier-1/tier-2 typography course material, then renamed. Typography went composite
(`.typography-<intention>-<size>`); colour went property-first
(`--color-<property>-<intention>-<variant>-<state>`). Two live spokes consume this hub
through `file:` symlinks, so every rename shipped with a compatibility alias and a
codemod rather than a flag day.

### Progress
- ✅ **Migration system** — `packages/tokens/migrations.json` is the single source of
  truth. `build.js` generates the deprecated aliases from it, `scripts/migrate-tokens.mjs`
  rewrites a spoke, `scripts/doctor.mjs` warns, `/update-tokens` wraps the workflow.
  A rename is declared once and everything follows.
- ✅ **Tier-2 colour property-first** — 72 tokens, 72 declaring their property.
  `primary`→`brand` (it meant the brand hue AND "most prominent" at once);
  step-11 `-strong`→`content-*` (they read as bolder fills and were used as such).
- ✅ **`--color-border-focus` derives from the brand** instead of pinning `{color.grass.8}`.
  It could not be reached by any theme — cb-fish re-pointed to navy and kept green focus
  rings while its links went navy correctly. Same defect removed from `docs-dark.css`.
- ✅ **`DocsShell` styles `:focus-visible`** — the shell had *no* focus styling, so every
  chrome link fell back to the browser's blue ring, on the site that demonstrates the system.
- ✅ **`check-contrast.mjs` was reporting on nothing** — the P3 `@media` block redeclared
  every primitive as `color(display-p3 …)`, so it resolved 0/22 pairs and still exited 0
  with "All text pairs pass AA". Now strips at-rules, resolves 29/29, and refuses to report
  a pass when most pairs fail to resolve.
- ✅ **Codemod guards**, both found by breaking something first: a missing regex lookbehind
  rewrote BEM selectors (`.esa-button--color-primary` ends in the token name verbatim), and
  many-to-one renames silently dropped a value when a spoke declared both sides. Both now
  covered by `scripts/lib/token-rename.test.mjs`.

### Still open
- **Contrast, as ONE batched pass** · *Evidence:* `check-contrast.mjs --hub` reports 7 AA
  failures sharing a root cause — Radix step-9 fills are built for ~3:1 with white, not the
  4.5:1 body text needs, so `content-on-brand` on `background-brand` is 2.95:1 and the focus
  ring is 2.95:1 against a raised surface (WCAG 1.4.11 wants 3:1) · *Action:* decide the brand
  ramp once; fixing one in isolation means re-deciding it repeatedly. **Deliberately deferred —
  do not fix piecemeal** · `hub-fix` · **P0**
- **Selected is indistinguishable from hover in `esa-button`** · *Evidence:*
  `esa-button.astro:225-226` — `:hover` and `.esa-button--active` both resolve to
  `--_accent-hover`, so an `aria-pressed` toggle looks identical to a hovered button and
  reverts to resting-looking when the mouse leaves · *Action:* give selected its own value
  (`--color-background-brand-active` is the hook, but it defaults to grass-10, same as hover);
  audit whether other components confuse the two — dropdown/palette/entity-search already use
  `background-sunken` for selected, so this may be 1–2 components · `hub-fix` · **P1**
- **`-active` is ambiguous** · *Evidence:* this codebase uses "active" for *selected/current*
  (43 BEM modifiers, `aria-pressed`, `aria-current`) while `:active` means *pressed* · *Action:*
  if the item above is built on, rename the token `-selected`; decide before spokes adopt it ·
  `hub-fix` · **P2**
- **Press feedback barely exists** · *Evidence:* 35 components style `:hover`, one styles
  `:active` (a `scale(0.95)`, not colour) · *Action:* likely fine — many systems skip mouse-down
  feedback. Logged so it is a decision, not an oversight · `hub-fix` · **P3**
- **Republish `spoke-kit`** · *Evidence:* source 1.14.0, installed 1.8.1; spoke sessions still
  teach retired token names · *Action:* merge to `main` (the marketplace tracks the default
  branch — a feature branch publishes nothing), then on each machine run BOTH
  `claude plugin marketplace update ecology` AND `claude plugin update spoke-kit@ecology`,
  then restart · `process` · **P0**
- **Run `/update-tokens` in both spokes** · *Evidence:* cb-fish 1,706 replacements/115 files,
  air-exchange 280/12; both dry-run clean · *Action:* one commit per repo, separate from
  feature work. Needs authorisation — separate repos · `process` · **P1**
- **Tokens the spokes read that nothing declares** · *Evidence:* 7 in cb-fish
  (`--color-gold-50/900`, `--color-gray-50`, `--color-green-700`, `--spacing-50`,
  `--easing-out`, `--gap`), 6 in air-exchange · *Action:* these are **broken today** — the
  declaration drops. Each needs a human decision; the codemod deliberately refuses to guess ·
  `hub-fix` · **P1**
- **Deferred from the tier-1 audit** · the namespace/tier prefix straddle (a ramp step and a
  semantic role are both `--color-*`, indistinguishable in a diff), the `--radius-200`/`-300`
  duplicate, and ~1,250 fallback-literal mismatches (mostly tier-2 colour) · `hub-fix` · **P2**

### Root cause (the through-line)
**A rename is only half-done when the tokens move.** Every failure this session was in code
that *reads names* and kept running against the old shape — `familyOf` filed all 38
backgrounds under "neutral", `semanticGroupKey` collapsed 60 of 70 into `color-other`, and the
contrast script resolved nothing while printing a pass. None raised an error. The tokens were
the easy part; the parsers, audits and gates that consume them are where a rename actually
goes wrong, and they fail silently by default. Where it mattered these now assert instead:
`color-other` must stay empty, `inferred` must stay 0, and a contrast run that cannot resolve
its pairs exits non-zero.

---

## Process proposal
1. **`/design-qa` emits findings here** (extend it to run the composition analysis: bespoke-
   class/style-line counts, repeated-pattern + missing-lego detection, visual review).
2. **`learning-engine` consumes this ledger** and lands entries as the right artifact
   (skill / lego / workflow), checking each off.
3. **Re-run a spoke build** to measure: fewer iterations, fewer bespoke classes, lower cost.
