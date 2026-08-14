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
- ✅ **Border became a real tier-1 axis** — `--border-width-100..400` (1–4px) plus ONE tier-2
  role, `--border-width-default`, now read by the 49 hairline borders across 25 components;
  `--form-border-width` aliases the role instead of holding `1px`. Width got one role rather
  than a t-shirt scale because the audit found it has one: every other width in the kit is
  internal micro-geometry (spinner rings, the kbd keycap lip, a chevron built from two
  borders), which SPEC.md excludes from the theming surface by name. `border-style` was
  deliberately NOT tokenised — 56 of 57 borders are solid and the one dashed border is the
  file-upload dropzone affordance, so the token would alias a keyword nobody re-points.
- ✅ **`/debug/tokens` Border section re-grounded on the source taxonomy** — its note had
  drifted into asserting two defects that were already fixed (`--focus-ring-color` declared at
  two tiers; both themes re-pointing the `--radius-200` primitive), while the Health checks
  underneath it correctly read 0. Rewritten from the course material, "diverges" chip dropped
  now that both remaining departures are decisions, and tier 1 is grouped by CSS property the
  way Typography is — `border-radius` 7, `border-width` 4, `border-style` 0.
- ✅ **Motion split into real tiers** — was three composite strings (`--transition-fast:
  150ms ease`) in `primitive/effect.json`: fused axes, wearing tier-2 intent names, in the
  tier-1 file. Now `--duration-*` (11) + `--easing-*` (5) at tier 1, composing into
  `--transition-*` (`transition:`) and `--animation-*` (`animation:`) at tier 2. Two tier-2
  sets, not one `--motion-*` set, because `infinite` cannot appear in a `transition` — same
  property-first rule colour follows. Value-neutral except `--transition-slow` 350→300ms,
  which has **zero readers** anywhere (hub, cb-fish, air-exchange) outside the docs swatch
  that demonstrates it; keeping 350 would have meant an off-step in the tier-1 scale forever
  to protect a demo. No `migrations.json` row needed — nothing was renamed.
- ✅ **`prefers-reduced-motion` is honoured at the token layer** — it previously appeared in
  exactly ONE file in the repo, `foundations/motion.astro`, guarding its own hover demo; 22
  keyframe animations including three `infinite` spinners ignored the OS preference entirely.
  `build.js` now appends an override block. Applied at **tier 2**, not to the duration scale:
  `reduce` means remove *non-essential* motion, so `--animation-spin` and
  `--animation-indeterminate` keep running (a frozen spinner reads as a hung app), and only
  tier 2 knows which motion is feedback.
- ✅ **All 22 `@keyframes` call sites adopted `--animation-*`** — the tier-2 set had zero real
  readers when it shipped, which is the "declaring a role is not delivering it" rule biting
  immediately. Adoption settled three disagreements nobody had chosen: four components spun at
  **three different speeds** (`esa-button` 600ms, the two spinners 750ms, `esa-combobox`
  1000ms) because there was no token to spin at; entrances and exits shared one `ease` curve
  where `enter`/`exit` now decelerate and accelerate; and two sheets sat at 240ms beside a
  snackbar at 200ms. 16 of the 22 shifted timing by 10–250ms as a result — approved as one
  pass, on the argument that divergence nothing chose is a defect rather than a design.
- ✅ **The tier-2 "width / height" section held 107 tokens, 8 of them widths or heights** —
  `otherTokens` was `semantic.filter(t => !t.name.startsWith('--color-'))`, split into
  `--elevation-*` and *everything else*, with everything else labelled after one of its
  residents. It contained 66 typography composites, 12 font tokens, 7 z-indexes and 5 radius
  roles, all stamped with a hardcoded `no property slot` chip that is false for most of them
  (`--z-dropdown`, `--radius-card`, `--font-weight-medium` all lead with their property). A
  second table rendered the same set per-token with the middle column hardcoded to
  "region, not a category", so `--typography-body-md-font-size` was asserted to lead with a
  region. Families are now matched explicitly, the chip reads `property first | last | none`,
  the summary table makes its claim per family (the level at which it can be true), and an
  `unclassified` group renders **even when empty** so a new family announces itself.
- ✅ **Three tier-2 typography claims still described the pre-composite system** — the category
  note ("PROSE has no tier-2 tokens"), the module comment ("There are zero tier-2 typography
  TOKENS"), and the page prose ("a spoke can't re-point them by overriding a token") all
  survived the arrival of 66 `--typography-*` composites. `grammars.current` was stale in the
  same way, still publishing the pre-property-first colour shape
  `--color-<variant|surface>[-<surface|variant>]`. All four corrected; the `font` family split
  into the composites' ingredient layer (faces + weights) and `--font-size-ui-*`, which no
  composite references.
- ✅ **Two audit surfaces silently mis-filed the new tokens** — `tier2-naming.ts` buckets
  non-colour tier-2 tokens by *what is left over*, so all nine motion tokens landed under the
  heading "width / height" wearing a hardcoded `no property slot` chip, which is exactly
  backwards: they are the most property-led names in the tier. Motion now has its own group
  and the chip is conditional. Same failure mode as `familyOf`/`semanticGroupKey` last
  session — a leftover bucket cannot report that something new is in the wrong place.
- ✅ **`orphan` was lying about at-rule readers** — `token-graph` builds reverse edges from
  `defs`, which is first-wins, so any token read only inside an `@media` block appeared to
  have no readers at all. `--duration-0` was flagged ORPHAN while the entire
  `prefers-reduced-motion` block resolves to it. On that page `orphan` reads as "nothing needs
  this, delete it", so the audit was pointing at a load-bearing token and clearing it for
  removal. At-rule declarations now feed edges but still not VALUES — the graph's job is the
  default chain, and `--transition-fast` must keep resolving as 150ms, not 0ms. Scoped
  exactly: 7 new edges, all onto `--duration-0`; the P3 block adds none, its 120 declarations
  being literals.
- ✅ **A file-level `$description` collides in Style Dictionary** — it treats the root key as
  a token node, so a second tokens file carrying one silently emitted
  `Token collisions detected (1)`. Group-level descriptions are fine; noted in
  `semantic/motion.json` so the next author does not rediscover it.
- ✅ **Shadow split into axes, the last fused family** — was six opaque strings
  (`0 4px 20px -4px rgba(0, 0, 0, 0.06)`) with nothing addressable inside. Now
  `--shadow-offset-x` (one token, not a ramp — every shadow in the kit casts straight down),
  `--shadow-offset-y-*`, `--shadow-blur-*`, `--shadow-spread-*` and `--shadow-color-*` are the
  tier-1 material, and **the composites moved to tier 2 as `--elevation-1…6`** — the ordinal
  `--shadow-050…500` are gone. That placement is the substance of the change, not bookkeeping:
  clustering axes into a particular box-shadow is the act of saying *this combination is a
  resting card and that one is a modal*, which is intent, not material. Keeping ordinal-named
  composites in tier 1 was the same misfiling as `--transition-fast`, and it left a 1:1
  passthrough — six primitives, six roles, nothing reused — so collapsing them cost nothing.
  `migrations.json` row `shadow-composites-to-elevation` emits the aliases; the older
  `--shadow-50` row chains through it (`--shadow-50` → `--shadow-050` → `--elevation-1`), which
  works because custom-property resolution is order-independent. The source taxonomy calls the
  axes optional — "a lot of times we will just describe them at the tier two level" — but
  **colour was not optional**: every shadow terminated in a hardcoded `rgba(0,0,0,α)` that
  referenced nothing, so a theme could not tint its shadows at all. Six `--shadow-color-*`
  tokens now do it. Deliberately not aliased onto `black-a`: that ramp starts at 0.05 and
  steps by 0.05, and five of the six shadow alphas (0.03–0.08) fall between its steps, so
  aliasing would have moved rendered values to make the lineage diagram tidier. Value-neutral
  in CSS; `--elevation-6` gains an explicit `0` spread the old `--shadow-500` omitted, which is
  equivalent. One side effect: `dist/tokens.js`
  now emits the composites with 8-digit hex colour (`#0000000f`) instead of `rgba()`,
  because the colour axis is typed `$type: color` and the js transform group hexes it —
  nothing in this repo imports `tokens.js`, but a spoke that does will see the format change.
- ✅ **Every component re-wired to the right elevation rung, and "hover is not a rung"** —
  auditing all 20 `--elevation-*` reads against their selectors found one systematic
  mis-wiring: **six** floating surfaces (`esa-select`, `esa-combobox`, `esa-input-tag`,
  `esa-filter-dropdown`, `esa-nav-dropdown`, `esa-header-nav`) sat on rung 3 rather than 4,
  while the two components that *were* on 4 (`esa-dropdown-menu`, `esa-popover`) proved the
  rung was right. *Root cause, and the durable fix:* rung 3 was described as "Raised cards,
  **hover state**" — the only rung naming an interaction instead of a surface, so it became
  the drawer everything lifted got thrown into. Each rung now names a KIND OF SURFACE, with
  the rule that **a hover lift moves one rung up from the resting rung**. Rung 4 also now
  names its whole family ("dropdowns, popovers, menus, tooltips, toasts") rather than three
  of five. Knock-on re-points: `esa-tooltip` 2→4 (it is a popover; `--z-tooltip: 600` was
  already the top of the z-ladder while its shadow claimed "card"), `esa-back-to-top` 4→3
  resting and 5→4 on hover (a floating control, never a dropdown or a modal). Tier-3
  defaults `--filter-dropdown-shadow` and `--nav-dropdown-panel-shadow` moved too, plus every
  inline fallback, or the hooks would have re-asserted the old value. Dropdowns are now
  visibly deeper (`0 4px 20px -4px / 0.06` → `0 6px 24px -6px / 0.07`); the FAB is lighter.

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
  declaration drops. Each needs a human decision; the codemod deliberately refuses to guess.
  One is now answerable: `--easing-out` has a real hub counterpart, `--easing-enter`
  (`ease-out`) — cb-fish invented the token the hub was missing, which is the clearest signal
  yet that the fused motion tier was pushing work out of the system · `hub-fix` · **P1**
- **42 hardcoded `transition:` values in components** · *Evidence:* 42 of 73 declarations
  hold literals (80, 100, 150, 300ms and others) against a tier-2 set of three. The
  companion half is done — all 22 `@keyframes` call sites now read `--animation-*` · *Action:*
  move them onto `--transition-*`. Until they do they **ignore the reduced-motion override**,
  which is what makes that block worth having. Not a codemod: each site needs the right role
  chosen, and 80ms sites have no exact rung · `hub-fix` · **P1**
- **FOR THE TIER-3 PASS — adopting a typography composite removes the component's
  typography hook** · *Evidence:* 13 tier-3 typography hooks exist (`--grid-font-size`,
  `--grid-header-font-size`, `--grid-row-font-size`, `--grid-font-family`,
  `--form-font-size`, `--form-label-font-size`, `--form-label-font-weight`,
  `--form-line-height`, `--filter-pill-font-size`, `--icon-link-font-size`,
  `--link-column-heading-font-size`, `--link-column-item-font-size`,
  `--pagination-font-size`). A spoke re-points them today. An element that takes its
  typography from `class="typography-label-md"` stops reading them · *Action:* decide
  as part of the tier-3 pass, not per component. Three options, and the answer changes
  the migration mechanism for the WHOLE kit rather than just the hooked components, so
  the typography migration waits on it: (a) let them go — a spoke that wants different
  header type changes the composite or picks another one, and per-component font-size
  overrides are the fragmentation composites exist to prevent; (b) keep them, defaulting
  to composite tokens — preserves the surface but puts components back to per-property
  wiring, which is the thing being removed; (c) keep only the hooks a spoke plausibly
  needs (form controls, data grid) and drop the rest · `hub-fix` · **P1**
- **12 Lit components hand-roll label markup because they cannot compose `esa-form-field`**
  · *Evidence:* 14 components render their own `<label>` and the kit carries 23 separate
  `__label` style blocks. `esa-form-field` already does this job — label row, control slot,
  hint/error, size variants driving the label size — but it is an `.astro` wrapper, and 12
  of the 14 are Lit rendering into shadow DOM, where an Astro component cannot wrap their
  internals. Only `esa-text-field`, `esa-textarea` and the form-section pattern use it ·
  *Action:* do NOT build an `esa-label` — that would be the 15th label implementation. The
  fix is giving the Lit half a way to consume the existing one: a shared `CSSResult` (the
  same mechanism `packages/ecology/src/typography.ts` now uses for composites), or markup
  the component renders itself from a shared helper. Same shadow-boundary root cause as the
  typography work, so worth solving once for both · `lego` · **P1**
- **Typography is assembled from parts at 200+ call sites** · *Evidence:* the composite roles
  exist, but components read the ingredients directly far more than they read a role —
  `--font-sans` 69, `--font-mono` 60, `--font-weight-medium` 45, `--font-weight-semibold` 38 ·
  *Action:* some of this is legitimate and structural: there is a `--font-size-ui-*` ramp for
  chrome but **no matching weight role**, so a control label has nothing to reach for except a
  raw weight. Adding `--font-weight-ui-*` (or documenting chrome as a composite role of its
  own) would convert most of these. Audit which reads are chrome versus prose before moving
  any — prose reads are the ones that should have been a role · `hub-fix` · **P2**
- **5 of the 7 layout dimension tokens have no readers** · *Evidence:* `--header-height`,
  `--footer-height`, `--content-max-width`, `--content-narrow-width`, `--content-wide-width`
  are read by nothing — not a component, not `layouts.css`, not the site. Only
  `--sidebar-width` (2 files) and `--sidebar-width-collapsed` (1) are live · *Action:* either
  wire them into the shell components that clearly want them (`esa-app-shell`, page layouts
  currently sizing chrome by hand) or delete them. A dimension token nothing reads cannot be
  re-pointed to any effect, so it is a theming surface that only appears to exist ·
  `hub-fix` · **P2**
- **The `--content-*-width` trio is named three different ways** · *Evidence:*
  `--content-max-width` names the CSS property; `--content-narrow-width` and
  `--content-wide-width` put a variant where the property word sits, so a reader cannot tell
  whether they are max-widths or fixed widths (all three are max-widths) · *Action:* settle on
  one shape — `--content-max-width-{narrow,default,wide}` reads correctly and keeps the family
  together. Cheap now: nothing reads them · `hub-fix` · **P2**
- **Motion has no tier-3 surface** · *Evidence:* every other family exposes component tokens;
  motion exposes none, so `esa-sidebar-nav` invented a private `--_sidenav-transition` and a
  spoke cannot re-time anything · *Action:* decide whether motion earns hooks at all — SPEC's
  "when a property earns a hook" test may well say no, in which case record that as a decision
  rather than leaving the asymmetry unexplained · `hub-fix` · **P2**
- **`--easing-standard` is CSS `ease`, not a designed curve** · *Evidence:* kept verbatim so
  the tier split changed no rendered timing · *Action:* a real `cubic-bezier()` is a decision
  about how the system *feels*; batch it with the contrast pass rather than in a restructure ·
  `hub-fix` · **P3**
- **Deferred from the tier-1 audit** · the namespace/tier prefix straddle (a ramp step and a
  semantic role are both `--color-*`, indistinguishable in a diff), the `--radius-200`/`-300`
  duplicate, and ~1,250 fallback-literal mismatches (mostly tier-2 colour) · `hub-fix` · **P2**
- **Checkbox and radio borders went 1px → 2px in every spoke** · *Evidence:* both read
  `var(--form-border-width, 2px)`, but `--form-border-width` has always been declared in
  `component-tokens.css`, so the 2px fallback could never fire and the controls silently
  rendered 1px against their author's intent. Now on `--form-indicator-border-width` (2px),
  with `box-sizing: border-box` added so re-pointing the width thickens the edge instead of
  resizing the control. cb-fish uses these in 7+ components and overrides neither token, so it
  takes the change wholesale on its next dev tick · *Action:* tell the spoke owners before they
  meet it in a review; if that is not wanted yet, defaulting the hook to
  `var(--border-width-default)` holds at 1px and keeps the surface · `process` · **P1**
- **`migrations.json` has no row type for a behaviour change** · *Evidence:* the entry above is
  precisely what `/update-tokens` tells people not to bury ("NOT an exact alias — those change
  rendering, not just the name"), but it has no rename to hang off, so `build.js`,
  `migrate-tokens.mjs` and `doctor.mjs` are all structurally blind to it. A name that moves
  reaches spokes automatically; a VALUE that moves reaches them only through this document,
  which has to be read rather than run · *Action:* consider a `kind: "behaviour"` row so
  `doctor.mjs` can report `the hub changed how X renders since <date>` · `hub-fix` · **P2**

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
