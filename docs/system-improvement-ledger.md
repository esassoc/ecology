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

- ✅ **`--font-size-ui-*` deleted** — a size-only ramp running parallel to the typography
  composites, and the shortcut that let a component pick a size without adopting one. Its 9
  tier-3 consumers now point at the composite whose job matches; value-neutral, since the
  ramp was a pure passthrough. Had been logged as blocked on the tier-3 pass — wrongly. A
  hook carrying one property can point at that property's token; the open tier-3 question is
  about adopting a composite CLASS, which is different. Needed one new composite,
  `label-2xs` at font-size-050, because the control ramp descends below the prose family.
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
- ✅ **`--color-border-default-focus` derives from the brand** instead of pinning `{color.grass.8}`.
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
- ✅ **`orphan` was lying again, and much louder — the scanner only ever opened one directory**
  — the entry above fixed at-rule readers *inside the two files the module already read*. It
  never asked whether there were files it wasn't opening at all, which is the whole of this
  one. `componentUse` was built solely from `packages/ecology/src/components`, so
  `packages/tokens/src/typography.css` — an authored partial the package **exports**, reading
  113 distinct tokens across 169 `var()` sites — was invisible. **102 of the 125 reported
  orphans were `--typography-*` tokens that file reads.** `healthTotal` read 126 where the
  real number is 23. Third occurrence of the class (`--duration-0`, `--topbar-*`, this), so
  the fix is the class, not the instance: scan roots are now an explicit exported
  `SCAN_ROOTS` roster (ecology, tokens/src, docs, spoke-template) with a sibling
  `READ_SCAN_EXEMPT` carrying a written reason for each surface deliberately not scanned, and
  both are **rendered on the page** so the frontier is visible rather than assumed. Reader
  identity is split — `usedByFiles` is a new field, kept out of `usedByComponents` because
  `tier3-naming`'s `reach` counts components to tell a category namespace from an oddly-named
  component, and `component-promises` slug-matches; a path in either would corrupt both while
  still type-checking. The guard is derived from `@esa/tokens`'s own `exports` map: a `.css`
  it ships from a location no root covers becomes a health finding and turns the tally red.
  Two things caught while building it — the local-declaration filter that `layouts.css` needs
  (it bare-reads nine knobs it declares itself) must **not** apply to components, because
  `esa-range-slider` legitimately sets `--fill-percent` inline and reads it back, and
  filtering there invented a fresh orphan out of a token with two live readers; and
  `--sidebar-width` is declared at 18rem inside `layouts.css` while the semantic layer ships
  a differently-valued token of the same name (logged below).
- ✅ **`parseDefs` treated prose about a token as a declaration of it** — the value pattern
  is `[^;]+`, which spans newlines, and comments were never stripped. So a comment merely
  *mentioning* a token with a colon matched from inside the comment through to the next real
  semicolon and registered a declaration that does not exist. Found the hard way: a comment
  added in the same session explaining why `--filter-dropdown-border` had been renamed
  promptly resurrected it as a fully-fledged ORPHAN — declared, unread, "safe to delete".
  Comments are stripped first now, the way the read scan already did.
- ✅ **The three tier-3 colour defects, and the first tier-3 rows in `migrations.json`** —
  all three were recorded on the tier-3 colour page and left open; closed now, 8 renames,
  every value untouched. (1) **`border` named two different property types**:
  `--sidenav-border` and `--topbar-border` held a plain colour while
  `--filter-dropdown-border` held a whole `1px solid …` shorthand, so two of the three were
  re-pointable and the third was not — a theme could not touch its colour without restating a
  width and style it had no reason to care about. All three are `-border-color` now, matching
  the 27 border hooks that already were, with `esa-filter-dropdown` composing the shorthand
  from `--border-width-default` (value-neutral — that role is 1px, the literal the shorthand
  carried). (2) **Variant after property**: `esa-snackbar-item`'s four hooks, the only
  component in the kit that exposes its colour-variant axis at tier 3 at all, now read
  `--snackbar-item-danger-bg` like `--app-bar-brand-bg`. (3) **A variant in the state slot**:
  `--form-border-color-error` → `--form-error-border-color`, which also pairs it with the
  existing `--form-error-color`. The derived audit confirms all three: one border spelling
  (29 tokens), zero shorthands, zero inverted variants, `error` gone from the state vocabulary.

  Two things worth keeping from doing it. **The tier-3 alias is only half a rescue** —
  `build.js` emits `--old: var(--new)`, which saves a spoke that READS an old name, but tier 3
  is the surface a spoke DECLARES, and an alias cannot rescue a declaration. A spoke that
  overrode `--sidenav-border` keeps setting a token nothing reads: it loses the override,
  renders the hub default, and nothing errors. So `/update-tokens` is mandatory here in a way
  it is not for tier 1/2, and SPEC.md now says so. **And one of the eight is not a rename at
  all** — `--filter-dropdown-border` → `--filter-dropdown-border-color` changes the value
  *shape*, shorthand to colour, so a spoke writing `border: var(--filter-dropdown-border)`
  gets a bare colour where a shorthand was. Split into its own row marked `exact: false`, the
  mechanism the file already had for "changes rendering, not just the name", so
  `/update-tokens` surfaces it by name instead of burying it among the safe seven.
- ✅ **The motion adoption figure was a hardcoded claim nobody could reproduce** — the
  Animation category's `adoption` prose asserted "42 of the 73 `transition:` declarations
  still hold literals". Re-counting produced four different answers depending on the method,
  because prose cannot carry a counting rule. Now derived at build time with the rule stated
  in one place: **20 of 73** hold literals (the "73" was right; the "42" had simply gone
  stale), and all **22** `animation:` call sites are on tokens. A first pass at the
  derivation counted `@keyframes` *bodies* rather than `animation:` *call sites* and reported
  16/0 — wrong denominator, wrong question; the declaration is where a duration and easing
  get chosen, so that is the thing that can be on a token. Two more stale counts fixed the
  same way: the typography composites are 113, not the 66 recorded in `tier2-naming`, and
  `typography.css` assembles `.typography-*` classes, not the deprecated `.type-*` aliases.
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

- ✅ **The field surface was the card surface, and fields were invisible on cards** ·
  *Evidence:* `--form-bg` pointed at `--color-background-elevation-raised` — gray-1, the same value a
  card paints — so an input inside a card rendered at **contrast 1.00** against it. The
  entire affordance rested on a border that itself only reaches 1.53. `--form-bg-hover`
  pointed at the same value again, so the kit shipped a hover hook that rendered nothing,
  while `--color-background-default-hover` (step 4, "the neutral counterpart to
  `background-brand-muted-hover`") sat at tier 2 with **zero readers anywhere in the kit** ·
  *Action:* promoted to a new tier-2 role `--color-background-field`. NOT folded into
  `--color-background-elevation-sunken`: sunken is read by 24 components and 10 hooks, which would
  rebuild the coupling this removed. 29 substitutions across 13 components;
  `migrations.json: form-bg-to-background-field`, `exact: false` — the first deliberately
  non-value-neutral surface change in the file · `hub-fix` · **done**
- ✅ **The whole neutral surface stack re-seated a day later (2026-08-15)** · *Evidence:* the
  field surface first landed on gray-3 (1.11 on a card, 1.08 on the canvas). Andy's call was
  that the canvas belongs at gray-1 and the field at gray-2 · *Action:* `--color-background`
  gray-2 → **gray-1**, `--color-background-field` gray-3 → **gray-2**, and
  `--color-background-disabled` gray-2 → **gray-1** (forced — it is pinned one step lighter
  than the field, and gray-2 would have made disabled and resting identical, the exact
  collision the day before had just resolved). Net stack: canvas/raised/floating gray-1,
  field gray-2, wells gray-3, hover gray-4. The field's separation dropped 1.11 → **1.03**,
  which is what led to the entry below. **One consequence that outlived it:** the canvas now
  EQUALS `--color-background-elevation-raised`, undoing the documented deliberate inversion, so a card
  separates by its 1px border alone — `esa-card--elevated` has no border and leans entirely
  on `--elevation-2`, a 4% shadow · `hub-fix` · **done**
- ✅ **Fields have no fill at all — `--color-background-field: transparent`** · *Evidence:*
  three greys were tried in two days (`background-raised`, gray-3, gray-2) and every one
  measured between **1.00 and 1.11** against the surface it sat on, while `--color-border`
  reaches 1.53. The fill was never carrying the affordance. Worse, each fixed grey was right
  on the canvas and **inverted on a sunken surface** — a field in a filled card, a well or
  the sidenav rail rendered *lighter* than its own container. A `--color-gray-a-*` alpha wash
  was considered and rejected: it adapts, but black-alpha darkens an already-dark surface, so
  it still needs a dark-scheme counterpart · *Action:* transparent — a field is the colour of
  whatever contains it, correct in every container and both schemes with no override
  anywhere. **Every field state is now a border state:** rest `--form-border-color`, hover
  `--form-border-color-hover`, focus `--form-border-color-focus` + ring, error
  `--form-error-border-color`, disabled `opacity` + `--color-content-disabled`. This is also
  what finally spread `--form-border-color-hover` across the family — it had existed for
  exactly this and was wired into **one** component (`esa-input-tag`), logged as a defect the
  day before and fixed as a by-product. `--color-background-disabled` went back to gray-3
  with zero consumers. **The trap, worth keeping:** the declaration is *written*, not
  omitted — dropping `background` gives a native element the UA's own paint (`field` ≈ white
  on `<input>/<textarea>/<select>`, `ButtonFace` ≈ #efefef on `<button>`), and 6 of the 15
  field surfaces are native, so omitting would have rendered a transparent wrapper beside a
  white textarea beside a grey trigger, in a colour no theme can reach · `hub-fix` · **done**
- ✅ **A live dark-mode regression, found and closed by the same change** · *Evidence:*
  promoting `--form-bg` to `--color-background-field` moved fields onto a token
  `apps/site/src/styles/docs-dark.css` has never heard of, so in dark mode fields rendered
  **#f9f9f9 on a #111111 page**. The old name worked only because it pointed at
  `--color-background-elevation-raised`, which the dark theme *does* override. `--color-background-default-hover`
  (newly wired) had the same problem · *Action:* closed by transparency — a field with no
  fill needs no dark counterpart. **The guard-shaped hole is still open, though:** a new
  tier-2 surface role can be added with no dark override and every gate stays green. The
  snapshot guard checks that names do not *vanish*; nothing checks that a surface role
  declared on `:root` has a `[data-scheme='dark']` counterpart · `hub-fix` · **P1**
- ✅ **The rule that produced it: a tier-3 token maps to ONE component** · *Evidence:* applied
  mechanically across all 311 tier-3 declarations, **23 violate** and 248 are compliant. They
  fall into three sets: `--form-*` (18 tokens, 18 reader components, five of which are not
  forms and one of which — `_inject-styles` — is not a component), `--focus-ring-*` (3, read
  by 31) and `--loading-spinner-*` (2). Fanning `--form-*` out to per-component hooks was
  measured and rejected at **162 names**, against SPEC's own 5–9-per-component guidance ·
  *Action:* rule recorded in SPEC.md's tier-3 naming section as the test that separates a
  legitimate group surface from a mis-tiered role. The surface hooks are the first set moved;
  focus-ring and loading-spinner remain · `hub-fix` · **partly done**

### Still open
- **`--focus-ring-*` is the most-violating set in the file and the cheapest to fix** ·
  *Evidence:* 3 tokens read by 31 components — a system-wide accessibility affordance living
  in the per-component tier. All three are already thin aliases over tier 2
  (`--color-border-default-focus`, `--border-width-focus`) · *Action:* a **file move, not a rename** —
  same names, declared in `tokens/semantic/` instead of `component-tokens.css`. Nothing
  resolves differently, no migration row, zero spoke impact. `--focus-ring-offset: 2px` is
  the one with no tier-2 home (there is no 2px on the 4px spacing grid) · `hub-fix` · **P2**
- **`esa-loading-overlay` hand-rolls a spinner and reads `esa-loading-spinner`'s tokens** ·
  *Evidence:* `esa-loading-overlay.astro:58-63` reads `--loading-spinner-track-color` and
  `--loading-spinner-color` with a comment saying it does so "so both retint together" ·
  *Action:* the fix is composition — render `<esa-loading-spinner>` — not token surgery.
  Same shape as the accepted `--filter-pill-*` duplication, but without that one's
  justification (there is no behavioural difference here, only duplicated CSS) · `lego` · **P2**
- **`--form-affix-{bg,color,border-color}` are read but never declared** · *Evidence:*
  `esa-text-field.ts:288-299` reads all three with literal fallbacks; no file declares them ·
  *Action:* they are absent from `token-names.json`, so the snapshot guard does not cover
  them; `doctor` and the codemod cannot see them; and they never appear on the generated
  Theming surface table. A spoke can set them and they work, but nothing says they exist.
  Declare them in `component-tokens.css` or fold them into privates · `hub-fix` · **P2**
- **Two hooks promise a family treatment and deliver one component** · *Evidence:*
  `--form-border-color-hover` is read by esa-input-tag alone, out of the 13 components that
  read `--form-border-color`; `--form-bg-hover` was read by 3 of 13 before it moved ·
  *Action:* wire them across the family or drop them. A spoke that sets one today gets a
  partial result and no error · `hub-fix` · **P2**
- **`--form-error-border-color` does not track `--color-border-utility-danger`** · *Evidence:* it
  points at `--color-background-**danger**` (red-9, a fill role) rather than
  `--color-border-utility-danger` (red-6), which exists. Visually defensible — red-6 is a very faint
  error outline — but the consequence is that a spoke re-pointing its danger border, as
  air-exchange does, does not move its error borders · *Action:* decide and document, either
  way · `hub-fix` · **P2**
- **Style Dictionary reports 2 token collisions on every build** · *Evidence:* "Token
  collisions detected (2)" with no detail even under `--verbose`. Confirmed **pre-existing**
  by rebuilding against `HEAD`'s `color.json` · *Action:* find them — a collision means two
  tokens compiling to one CSS name, and whichever wins is decided by emission order rather
  than intent · `hub-fix` · **P2**
- ✅ **`layouts.css` shadowed a semantic token name at a different value — CLOSED 2026-08-15**
  by a third route neither proposed action anticipated: the SEMANTIC side moved, not the
  primitive's. `packages/tokens/src/layouts.css:83` declared `--sidebar-width: 18rem` on
  `.sidebar` as a per-primitive knob while the semantic layer shipped `--sidebar-width: 280px`
  (17.5rem) — an element-scoped knob and a layout role competing for one name, resolved by
  cascade position rather than intent. Renaming the knob (the logged suggestion,
  `--sidebar-basis`) would have broken the one spoke that declares it for a name the hub
  should never have contested; pointing it at the semantic token would have kept a tier-2
  entry that only one component read. Demoting the semantic pair to tier 3 as
  `--sidenav-width` / `--sidenav-width-collapsed` vacates the name, hands it to the primitive
  outright, and costs no spoke a single edit. `migrations.json` row
  `sidebar-width-to-sidenav-width`; the special-case in the scan-root roster
  (`token-graph.ts:309`) can come out on the next pass through that file.
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
  air-exchange 280/12; both dry-run clean. **Now upgraded from housekeeping to load-bearing:**
  the 8 tier-3 renames added this session are the first rows in `migrations.json` whose old
  names a spoke may have *declared* rather than read, and the emitted alias cannot rescue a
  declaration — such a spoke silently loses its override and renders the hub default with no
  error. One row (`filter-dropdown-border-shorthand-to-colour`) is `exact: false` and needs a
  human read. Neither spoke is checked out beside this repo, so the dry-run could not be
  re-verified here · *Action:* one commit per repo, separate from feature work; confirm
  `npm run doctor` comes back clean after. Needs authorisation — separate repos ·
  `process` · **P1**
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
- ✅ **5 of the 7 layout dimension tokens had no readers — DELETED 2026-08-14.**
  `--header-height`, `--footer-height`, `--content-max-width`, `--content-narrow-width`,
  `--content-wide-width` were read by nothing: no component, no authored partial, not the
  site, not the spoke template, not cb-fish. Deleted rather than wired, for two reasons.
  The heights: `esa-app-bar` and `esa-app-shell` set no height at all, and after Change 9
  a px height is the pattern this kit *removed* — re-adding one for chrome would re-create
  the defect. The widths: they had already lost to a hardcoded 1556px. `--sidebar-width`
  (15 readers) and `--sidebar-width-collapsed` (1) stay — those are a real agreement.
  `migrations.json` row `layout-orphans-removed`.
  **CORRECTION, 2026-08-15: the "15 readers" was wrong, and it is the only reason those two
  survived this pass.** The real count was ONE COMPONENT — `esa-sidebar-nav.ts:238-239`,
  reading both names. The number came from the token's own `$description` in
  `semantic/layout.json` and was copied into this entry without being counted; the third
  apparent reader, `layouts.css:89`, reads its own shadowing 18rem and never touched the
  semantic token. Both are tier 3 now (`sidebar-width-to-sidenav-width`), which makes this
  entry's deletion pass 7 of 7 rather than 5 of 7 and leaves `semantic/layout.json` with no
  tokens at all. The lesson generalises past these two: **an assumed reader count is what
  keeps a token at the wrong tier.** Count before you defend.
- ✅ **The `--content-*-width` trio was named three different ways — MOOT 2026-08-14.**
  Resolved by deletion rather than by renaming; the three tokens no longer exist. Recorded
  because the reasoning still applies to any future family: `--content-max-width` named the
  CSS property while `--content-narrow-width` and `--content-wide-width` put a variant where
  the property word sits, so a reader could not tell whether they were max-widths or fixed
  widths. `--content-max-width-{narrow,default,wide}` would have been the right shape.
- **There is no WIDTH scale, so every width in the kit is a bare literal** ·
  *Evidence:* the size axis has a height ramp for badges (`--chip-height-*`) and nothing for
  width. Tier 3 carries **18 width tokens, every one a hardcoded px value**: 160, 200, 240,
  280, 320, 360, 400, 420, 480, 520, 560, 600, 640. Four of those values are duplicated
  across unrelated components that never agreed on anything — 280 is both
  `--dialog-width-xs` and `--dropdown-menu-max-width`; 360 is both `--confirm-dialog-width`
  and `--dialog-width-sm`; 400 is both `--search-panel-width` and `--side-dialog-width`; 240
  is both `--nav-dropdown-panel-min-width` and `--tooltip-max-width`. Three components have
  already invented their OWN t-shirt ramp on top (`--dialog-width-{xs,sm,lg}`,
  `--side-dialog-width-{sm,lg}`), which is the shape of a scale that should exist one tier
  up. Separately, `1556px` — the kit's actual content width — is a literal in four places
  across `esa-container` and `esa-app-bar`, and matches none of the 1200/800/1440 tokens
  deleted 2026-08-14, which is exactly why those were dead ·
  *Action:* **NOT a tier-2 width scale — that was the first proposal here and it is
  withdrawn.** The stated position (2026-08-14) is that a component needing a hard ceiling
  declares `max-width` on itself when it is built; a width is a decision about one
  component's shape, not a shared agreement, and `esa-page-header` (`70ch`) and
  `esa-empty-state` (`360px`) already work that way. Change 10 is the cautionary precedent:
  `--form-padding-*` was a ramp of tier-3 tokens over values nobody ever re-pointed, and
  every argument for building it applied equally here. So the work is to **decide which of
  the 18 earn a hook at all** — a dialog width plausibly does, since SPEC.md names "dialog
  width" as earning one; a tooltip's max-width plausibly does not — then delete the rest in
  favour of a literal in the component, and give the page width one name so `esa-container`
  and `esa-app-bar` stop each spelling 1556 twice. The duplicated values are evidence of
  components not coordinating, which a scale would paper over rather than resolve. Note the
  Change 9 caveat if a ramp is ever revisited: a fixed width is safe where a fixed height was
  not — it does not clip growing text, it wraps it · `hub-fix` · **P2**
- **A chained rename whose destination was deleted gives a spoke a FALSE ALL-CLEAR** ·
  *Evidence:* `--form-height-md` renames to `--control-height-md` (row
  `form-height-to-control-height`), and `--control-height-md` was deleted the same day with
  `removed: true`, so it is declared **zero** times in `dist/tokens.css`. `migrate-tokens.mjs`
  scans `removedRows` only for the removed token's OWN names (`:208`), so a spoke reading
  `--form-height-*` triggers nothing; the row then rewrites it INTO the dead name and reports
  success. It is not caught by `unfixable` either, because a migration does cover it. Live in
  two spokes right now: cb-fish reads it 12× (already falling through to hardcoded `32px` /
  `28px` fallbacks — the exact fixed-height clipping Change 9 removed) and air-exchange
  *declares* it 4× in `theme-smaqmd.css` with `__FILL__` markers still in place ·
  *Action:* resolve every row's destination against `dist/tokens.css` before rewriting.
  If a `to` does not resolve — directly or through another alias — refuse to rewrite into it
  and report the chain. Nothing should ever rename a spoke onto a name the hub does not
  declare · `hub-fix` · **P1**
- **`doctor` tells a spoke its DECLARATIONS are safe, and they are not** · *Evidence:* the
  deprecated-names check (`doctor.mjs:~197`) counts every occurrence and reports them all as
  "they still render, via compatibility aliases the hub will eventually drop." That sentence
  is true for a read (`var(--foo)`) and **false for a declaration** (`--foo: value`), where
  the alias rescues nothing and the override is silently inert — the asymmetry SPEC.md
  states and the tooling does not implement. air-exchange's four `--form-height-*` lines are
  exactly this case: dead overrides, reported under the reassuring sentence. The most
  dangerous class is described with the wording meant for the safest one ·
  *Action:* split reads from declarations in both `doctor.mjs` and `migrate-tokens.mjs` and
  give them different sentences; a declaration of a deprecated name should outrank a read ·
  `hub-fix` · **P1**
- **cb-fish reads dead `--form-height-*` at 12 sites** · *Evidence:* deferred deliberately
  2026-08-14 rather than fixed, since the hub does not migrate spokes for them. The reads
  resolve to nothing and fall through to literal `32px`/`28px`/`24px` fallbacks, which is
  the fixed-px-height pattern Change 9 deleted from the hub. Files: `map-sow.css` (4),
  `cbf-msow-toolbar.astro` (3), `cbf-lib-cost-table.astro` (2), plus 3 singles ·
  *Action:* the spoke's own call, once the two tooling fixes above stop it getting a false
  all-clear. The hub's job is the tools, not the edit · `spoke` · **P2**
- **`theming.ts` calls every primitive read "moves the whole system", including the CORE
  sets it is safe to read** · *Evidence:* `apps/site/src/data/theming.ts` maps tier
  `primitive` → scope `system`, warning that re-pointing it moves everything. That is right
  for `--radius-200` and wrong for `--spacing-300`: SPEC.md:87-106 defines spacing and the
  neutral palette as CORE — universal, never re-pointed by a theme, *meant* to be consumed
  directly — and `token-graph.ts` (`CORE_SETS`) already encodes exactly which tokens those
  are. `theming.ts` does not import it. The badge was already wrong on the 31 components that
  read `--spacing-*` for padding; Change 10 makes it 42, and now it sits on the most visible
  geometry row of every input and button page. So the docs site tells a spoke its controls
  are un-themeable-without-consequence in the one place SPEC.md goes out of its way to say
  the opposite · *Action:* give `theming.ts` a fourth scope, `core`, driven by importing
  `CORE_SETS` rather than re-listing it — "shared by every theme; read it directly, never
  re-point it." Pre-existing, surfaced by Change 10, not caused by it · `hub-fix` · **P2**
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
- **Checkbox/radio border widths — RESOLVED, reverted** · *Evidence:* commit `67a93a4` moved
  `esa-checkbox` and `esa-radio-group` onto a new `--form-indicator-border-width` (2px),
  on the reasoning that both had asked for 2px via `var(--form-border-width, 2px)`. But
  `--form-border-width` has always been declared, so that fallback could never fire: the
  kit shipped, was reviewed and was signed off at **1px for its whole life**. The 2px was
  an intent living in dead code that nobody ever saw rendered. The sweep also missed
  `esa-checkbox-group`, leaving a checkbox-in-a-group at 1px next to a standalone one at
  2px · *Action:* DONE — all three now read `--form-border-width` → `--border-width-default`,
  and the hook is deleted. It never reached `main`, so no spoke ever saw it and no
  migration row was needed. Two things it would otherwise have cost: an `emphasis` role at
  tier 2 invented to justify a change that came from a bug, and a tier skip — the hook read
  `--border-width-200` directly, bypassing tier 2 · `hub-fix` · **resolved 2026-08-14**
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

## Source: form-control API audit (2026-08-14)
Prompted by reading `esa-button-toggle`'s generated API table the way a consumer would.
The generated tables removed *drift* — a documented prop that no longer exists — but they
check **names, not meaning**, so a prop can be real in source, rendered in the table, and
still not do what it says. Every finding below is that shape.

- **A prop can be declared, typed, defaulted, reflected, documented — and read by nothing**
  · *Evidence:* `esa-button-toggle` `size` (fixed the day before) was inert; the drift guard
  is structurally blind to it because the name resolves. *Action:* when auditing a component,
  grep each prop for a READ in `render()`/`static styles`, not just a declaration · `process`
  · **resolved 2026-08-14**
- **`hint` vs `helpText` — one concept, two spellings** · *Evidence:* five controls
  (select, text-field, textarea, combobox, date-picker) named the helper line `helpText` and
  paired it with `errorText`; `esa-button-toggle` and `esa-input-tag` called it `hint` and had
  **no error channel at all**. Both rendered the identical `typography-body-sm` span in the
  identical slot. Failure mode was silence: writing `help-text` on a button-toggle set an
  unknown attribute Lit ignores — no error, no warning, no text · *Action:* renamed to
  `helpText` + added `errorText` to both; `migrations.json: form-hint-to-help-text` with a
  runtime-warning shim · `lego` · **resolved 2026-08-14**
- **`required` was cosmetic in all 7 controls that offered it** · *Evidence:* `setValidity`
  appeared **zero** times in the entire kit. `required` drew an asterisk and set
  `aria-required`, and the form submitted empty anyway — `checkValidity()` returned `true`.
  The docs said "marks the field required", which a reader reasonably reads as "enforced"
  · *Action:* every one now reports `valueMissing` through `ElementInternals`, anchored to a
  focusable node so the browser can place its bubble · `lego` · **resolved 2026-08-14**
- **A scripted `value` never reached the form in 8 of 12 controls** · *Evidence:* found while
  verifying the row above — `el.value = 'x'` rendered correctly and submitted `""`. Only the
  *event handlers* called `setFormValue`; nothing synced on a property change. Worse after
  the validity fix, which reads `this.value` directly: the control would report VALID while
  submitting empty. Affected text-field, textarea, date-picker, radio-group, checkbox-group,
  chip-group, range-slider, color-picker · *Action:* each syncs on `changed.has('value')`
  · `lego` · **resolved 2026-08-14**
- **`name` worked everywhere and was documented nowhere** · *Evidence:* doc pages demoed
  `name="view"` (correctly — form-associated elements get it natively), but only 4 of 16
  controls declared it, so 12 API tables omitted a real part of the contract. The 4 that DID
  declare it lacked `reflect`, so `el.name = 'x'` never reached the form, which submits from
  the content attribute · *Action:* declared on all 16 with `reflect: true` · `lego`
  · **resolved 2026-08-14**
- **A codemod left three malformed CSS declarations in `esa-input-tag`** · *Evidence:* the
  typography migration stripped `font-size:` from `--_chip-font-size: …` and left the bare
  prefix `--_chip-`, which swallowed the NEXT declaration as its value — so `--_chip-bg` was
  never declared and every chip lost its tint. Silent: `--_chip-` is a valid custom-property
  name, so nothing errored · *Action:* repaired; a `grep -E '^\s*--[\w-]+\s*(/\*|\}|$)'` over
  `src` finds this class of damage and found nothing else · `hub-fix` · **resolved 2026-08-14**

### Root cause (the through-line)
**Generating the API table proves the docs match the source; it cannot prove the source does
what the name says.** Every finding here passed the drift guard. The three failure shapes worth
watching: a prop nothing reads (`size`), a prop that does *part* of its job (`required` drew the
asterisk but skipped the enforcement), and a prop that works only on the path someone happened
to test (`value` via click, never via script). Names are now mechanised; **behaviour is still
checked by reading**. The cheapest instrument found this round was a headless browser asserting
the contract from the OUTSIDE — set the value, submit the form, compare — which caught the two
findings no amount of source-reading had.

---

## Process proposal
1. **`/design-qa` emits findings here** (extend it to run the composition analysis: bespoke-
   class/style-line counts, repeated-pattern + missing-lego detection, visual review).
2. **`learning-engine` consumes this ledger** and lands entries as the right artifact
   (skill / lego / workflow), checking each off.
3. **Re-run a spoke build** to measure: fewer iterations, fewer bespoke classes, lower cost.

## Source: esa-filter-pills audit (2026-08-14)
Ran the two-layer check (is the table faithful? are the props the right ones?) on
`esa-filter-pills`. The table was faithful and the props were defensible — the
findings were all one layer below the API, in the parts nothing generates.

- **A one-shot `querySelectorAll` at load is a listener bug, not a wiring style**
  · *Evidence:* both `esa-filter-pills` and `esa-pill` wired remove buttons with
  `document.querySelectorAll(...).forEach(btn => btn.addEventListener(...))` inside a
  component `<script>`. That runs once, so only the chips in the initial HTML are live.
  Verified in-browser: a chip appended after load fired nothing. It is worst exactly
  where the component is most justified — `component-tokens.css` defends
  `esa-filter-pills` existing separately *because* its remove is CONTROLLED (emits
  `{name, value}`, parent owns state), and the very next parent render produced chips
  whose X was dead, silently. *Action:* delegate on `document`. Where the original
  called `stopPropagation()` (`esa-pill`, so removing a pill inside a clickable row
  does not activate the row), delegate in the **capture** phase — on bubble the
  ancestors have already seen the click and the call means nothing. *Sink:* fixed in all four —
  `esa-filter-pills`, `esa-pill`, `esa-alert-box`, `esa-filter-clear-button`. A repo
  sweep now finds no remaining instances (`esa-app-shell` matches the grep but wires
  page-level shell islands, which are not re-inserted). *Priority:* was high —
  `esa-alert-box` is the canonical inserted-at-runtime component and its dismiss
  button was dead on anything rendered after load.

- **A raw literal equal to a token's value is a divergence waiting to happen**
  · *Evidence:* `esa-filter-pills` hardcodes `--_pill-height: 28px` while `esa-pill`
  reads `--pill-height-md` for the identical number, and no `--filter-pill-height`
  exists. A spoke re-pointing pill height moves pills and leaves filter pills behind.
  *Action:* a `--filter-pill-height` hook was added and then **reverted on request
  (2026-08-14)** — recorded as an open observation, not a fix. *Sink:* if it is taken
  up later, note that CLAUDE.md's tier-3 rule ("a tier-3 token maps to ONE component")
  argues against pointing it at `--pill-height-md` and for the shared `--chip-height-md`
  rung. *Priority:* open — deliberately not actioned.

- **`aria-label` on a `role=generic` element is not inert, which is worse than if it were**
  · *Evidence:* the chip `<span>` carried `aria-label="${label}: ${displayValue}"`,
  a verbatim copy of its own visible text. ARIA prohibits naming `generic`, so the
  expectation was that it did nothing — but Chromium computes it (measured:
  `"Status: Open"`). So it was a duplicate accessible name that only some browsers
  expose and that is free to drift from the visible text. *Action:* removed; the
  visible text is the accessible text. *Sink:* worth a rule — an `aria-label` that
  restates visible text is a defect regardless of whether the role permits it.
  *Priority:* low.

- **Gating a delegated listener on a build-time prop reintroduces the bug it fixes**
  · *Evidence:* `esa-pill` and `esa-alert-box` wrapped their `<script>` in
  `{removable && …}` / `{dismissable && …}`. That was honest for PER-BUTTON wiring —
  no buttons on this page, nothing to wire. It is not honest for a DELEGATED listener,
  whose entire purpose is elements that do not exist yet: a page whose server-rendered
  alerts are all non-dismissable ships no listener at all, so a dismissable one
  injected later is still dead. *Action:* both scripts ungated; they are a few lines
  and inert until something matches. *Sink:* whenever a per-element handler becomes a
  delegated one, check what the emission of the script itself is conditional on.
  *Priority:* medium — a silent partial fix reads as a complete one.

- **A decision recorded in the token file is evidence, and it is not where anyone looks**
  · *Evidence:* the whole audit started from "`esa-filter-pills` duplicates
  `esa-pill` + `esa-pillbox`" — which is true, already considered, and explicitly
  accepted in a 14-line comment at `component-tokens.css:197` ("do not re-open without
  new evidence"), with reasoning that holds. It was found only by grepping the token
  surface. *Action:* none for the components. *Sink:* architectural decisions about a
  COMPONENT should be discoverable from the component, not only from its tokens — a
  pointer in the component header would have cost one line and saved the detour.
  *Priority:* medium.

## Source: spacing inventory after the height removal (2026-08-15)
Asked which components moved most when fixed heights were deleted and vertical
padding went up one rung. Eight did, all form controls; the biggest were
`esa-date-picker` (+20px at lg), then `esa-select` / `esa-combobox` / `esa-input-tag`
(+18px), because each stacks an inner control inside a bordered wrapper and pays the
new padding twice. The inventory itself was routine — the finding was what it exposed.

- **A size-keyed lookup that answers for a size the stylesheet has no block for is a
  silent hybrid, not an error** · *Evidence:* `esa-select` deliberately stops at `sm`
  (a select is a click target with a popup; below `sm` the trigger and chevron fall
  under a comfortable tap size — the reasoning is on `declare size` and it is sound).
  But `LABEL_TYPE`/`VALUE_TYPE` still carried `xs` entries. So `size="xs"` shrank the
  TEXT while the padding stayed at the `:host` default (md): 42px, **taller than the
  component's own `sm` at 41.2px**. The ramp inverted at the bottom end. Nothing
  errored — the type already said `'sm' | 'md' | 'lg'`, so the generated API table was
  honest the whole time; the runtime was the liar, and only the untyped attribute path
  (plain markup, any non-TS consumer) could reach it. *Action:* clamp out-of-range
  sizes to the floor in `willUpdate` and warn once, rather than adding an `xs` block —
  `size` reflects, so assigning it fixes the attribute selector and the typography
  lookup together, and it makes the documented floor real instead of merely stated.
  Removed the orphan `xs` keys from both maps. *Sink:* a size map and a size
  stylesheet are two halves of one contract; a key in one and not the other should be
  checkable. Swept all 13 size-aware components — `esa-select` was the only mismatch.
  *Priority:* medium.

- **Removing a fixed height does not create bugs so much as publish them**
  · *Evidence:* the inversion above existed before 2026-08-14 and was invisible, because
  a fixed `height: 40px` rendered `size="xs"` at 40px — wrong, but monotonic. Making the
  box content-driven turned a wrong constant into a visibly wrong ORDER. *Action:* none
  beyond the fix. *Sink:* when a system stops declaring a dimension and starts deriving
  it, expect a wave of pre-existing errors to become visible at once; budget for that
  rather than reading each as a regression. *Priority:* low — but it is the lens for
  the rest of the height removal.

## Source: row alignment after the height removal (2026-08-15)
Prompted by "the select sizes are still different than they were before". Two causes,
only one of them a bug — and the proposed fix (point the component at a smaller
spacing rung) was the one that had to be argued down with measurements.

- **When a box stops being a declared height and becomes content + padding, LEADING
  becomes the term that sets its height** · *Evidence:* `component-tokens.css` states
  that siblings "share a padding value and a type rung, so they resolve to the same
  height". Measured at md they did not — the spread was **14px** (button 41 …
  date-picker 55). Padding was identical (24px) across all of them; the whole
  difference was line-height: 15px on the four components that restated
  `--line-height-none`, 27px on the four that let the body-* composite's relaxed
  leading through. `typography-migration-log.md` had already written this down —
  "the load-bearing ones are the auto-height elements" — and `esa-button` had been
  fixed for it; `esa-select`, `esa-combobox`, `esa-date-picker` and `esa-input-tag`
  were missed. *Action:* restate `line-height: var(--line-height-none, 1)` on each
  field box. Spread at md 14px → **5px**; the four field components now agree exactly
  (46px). *Sink:* on a SINGLE-LINE control leading has no typographic job — there is
  one line and the space around it is invisible — so restating it costs nothing and
  is not a typography regression. `esa-textarea` is the one that must keep it.
  *Priority:* high — it was breaking the row-alignment guarantee the token file makes.

- **Do not cancel a fluid quantity with a static one** · *Evidence:* the alternative
  proposed was to give the taller components a smaller `--spacing-*` rung so the
  totals matched. Measured, the gap between select and button is **not constant**:
  12.0px at 1600px wide, 11.2 at 768, 9.8 at 375 — because leading is
  `1.8 × font-size` and font-size is `clamp()`, while a padding rung is a fixed rem.
  A static offset therefore lands correctly at exactly one viewport. Worse, a spoke
  re-pointing `--typography-body-md-line-height` (a legitimate tier-2 move) would
  break it by ~9px with nothing to say so, and the padding value would no longer mean
  padding — the same unexplainable per-control indirection `--form-padding-*` was
  deleted for the day before. *Action:* fixed the cause instead. *Sink:* the test for
  "compensate vs fix" is whether the quantity being cancelled can move independently.
  If it is fluid or themeable, compensation is a bug with a delay on it.
  *Priority:* medium — this is the reasoning, not a change.

- **Residual, NOT fixed:** a native `<input>` field lands ~5px taller than a flex
  `<button>`/`<div>` trigger on the same step (md: text-field/select/input-tag 46,
  date-picker 45, combobox 42, button 41) because an input has intrinsic content
  sizing the others do not. CLAUDE.md's "one scale across button/input/icon so they
  line up on a row" is therefore still approximate. Open.

## Source: esa-select / esa-combobox realignment (2026-08-15)
Started as "audit the next component's API props". The dead-prop vein was exhausted
(0 across all 64), so the signal used was prop OVERLAP — and it found the two
components sharing 10 identically-named props across 1,622 lines.

- **Two components can each be implementing the other one, and every check still
  passes** · *Evidence:* measured in the browser, `esa-select` default rendered
  `<input role="combobox">` (an autocomplete) and `esa-combobox` default rendered
  `<button>` (a button-triggered list). Exactly inverted against the standard
  definitions — select = list opened by a button, combobox = autocomplete input with
  suggestions. Nothing caught it: the generated API tables were faithful, no prop was
  dead, no drift warning fired, and both doc pages were internally consistent. The
  giveaways were only visible by comparing the pair — `esa-select` shipping
  `searchable = true`, `esa-combobox` shipping `mode = 'select'`, and the combobox
  specimen page demoing `mode="select"` 12 times against `autocomplete` twice.
  *Action:* flipped both defaults; select's trigger is a `<button>` with native-style
  typeahead; `searchable`, `mode` and `triggerStyle` are deprecated shims that still
  work and warn once. *Sink:* the audit lens that works on a single component (is the
  table faithful? are the props read?) cannot see this class at all. Overlap between
  SIBLINGS is a separate scan and it is the one that found this. *Priority:* high.

- **A deprecation shim protects explicit opt-ins; it does not protect a DEFAULT**
  · *Evidence:* the shims were chosen specifically to give spokes zero visual change
  on upgrade. They do not. cb-fish-design has **71** `<esa-select>` with no
  `searchable` attribute and **4** `<esa-combobox>` with no `mode` — 75 call sites
  relying on the old defaults, none of which the shim reaches, all of which change
  appearance the moment the hub's `file:` symlink serves the new default. The
  `searchable` scan confirms it from the other side: it matches **zero** files,
  because the affected sites set nothing. *Action:* surfaced before shipping, and
  the flip was kept deliberately (decided 2026-08-15): a select rendering an
  autocomplete was the defect, so the 71 sites moving to button+typeahead is the fix
  landing, not a regression — and one of the 4 combobox sites (cb-fish's locality
  picker, "hundreds of localities") is actively corrected by it. The rejected
  alternative was a two-step: warn on default-reliance now, flip in a later release.
  *Sink:* "deprecate the prop" and "change the default" are different migrations with
  different blast radii, and only the first is served by a shim. Say which one is
  happening, and state the call-site count before promising "no visual change".
  *Priority:* high.

- **Scoping a codemod is part of the design, not a formality** · *Evidence:* the first
  plan extended `renameComponent` with an attribute-value predicate so
  `<esa-combobox mode="select">` could be rewritten to `<esa-select>`. Measured across
  every spoke on the machine, that predicate would have rewritten **4 call sites in
  one repo**, for ~150 lines plus tests. *Action:* dropped; the rows carry
  `deprecatedProps` and no `pairs`, so `doctor` NAMES the affected files and a human
  decides. Verified against cb-fish: the scan finds `mode=` in exactly the 5 real
  files and correctly ignores that repo's unrelated `mode="decimal"` / `"modal"` /
  `"page"` on other components — the tag-scoping in `renameProp` doing its job.
  *Sink:* count the call sites before building the tool. *Priority:* medium.

- **A migrations row with no `pairs` is invisible unless something reads it**
  · *Evidence:* the two rows were first written with `pairs: []` and a `why`,
  described as "for discoverability". They contributed **zero** names to `doctor`,
  which builds its scan list from `pairs` — so the rows would have reported nothing,
  silently, while looking like coverage. *Action:* added a `deprecatedProps` field and
  taught `doctor.mjs` to scan it tag-scoped via `renameProp` with `to === from`, so
  the rewrite is a no-op and only the count matters. *Sink:* every new row shape needs
  a reader; check the consumer, not the manifest. *Priority:* medium.

## Source: tier-2 colour grammar + the knockout variant (2026-08-15)
Started from "why aren't we using `--color-background-disabled`" and became a pass
over the whole tier-2 colour vocabulary: the four slots
(`property > intention > variant > state`), three renames onto them, and the
`inverse` → `knockout` generalisation. **The dark-mode question this opened is
DEFERRED by decision, not dropped — it is the first item below.**

- **DEFERRED — dark mode is not in the token layer at all** · *Evidence:*
  `@esa/tokens` ships **no dark scheme whatsoever**; every dark value lives in
  `apps/site/src/styles/docs-dark.css`, which is the SITE's file. A spoke that
  installs the package gets no dark mode and no way to ask for one. Worse, that
  single hand-maintained file covers **29 of 73** tier-2 colour roles — the other
  **44 keep their light values on a `#111111` ground**, including
  `--color-background-disabled` (gray-3, a light grey), `--color-border-default-focus`,
  both link colours, all 8 `content-on-*` pairs and every brand and feedback fill.
  Nothing can catch this: `token-names.json` guards 1,094 names and **not one is a
  dark value**, so the snapshot test, `migrations.json` and `/debug/tokens` are all
  structurally blind to the dark half. The file is hand-maintained with no guard,
  which is how it came to declare `--color-content-default-secondary` twice (fixed).
  *Action:* NONE YET — deferred 2026-08-15 by decision, to be taken up as its own
  piece of work. `knockout` was built in this session and is **not** the fix: it
  handles a region rendered against the reverse of the theme's ground (a dark
  tooltip in a light app), which is orthogonal to a theme whose default IS dark.
  The open question is which model the hub commits to — a dark *scheme* the package
  ships, or dark *themes* where a dark spoke simply declares dark defaults and the
  44 becomes a completeness problem in one theme file rather than a grammar problem.
  *Blocked on a real gap either way:* **three dark primitive ramps do not exist** —
  orange, copper and teal — which is exactly why `accent` and `ai` have no dark
  values today. There was nothing to point at. *Sink:* a layer the enforcement
  apparatus cannot see is not in the system, however many files reference it; the
  1,094-name baseline looked like total coverage while covering only the light half.
  *Priority:* high.

- **An alias whose destination is itself deprecated resolves, reports success, and
  strands the spoke** · *Evidence:* found **twelve** such chains while verifying an
  unrelated rename — `--color-surface` → `--color-background-raised` → (renamed
  again the same day). They resolve, because the alias block chains, so nothing
  renders wrong and nothing complains. What it costs is a spoke: `/update-tokens`
  rewrites onto the MIDDLE name, reports success, and the spoke is still on a
  deprecated token needing a second run nobody knows to make. **Nine of the twelve
  were created by two renames earlier the same day** — by the same author, twice,
  unnoticed both times. *Action:* all twelve collapsed to their final destinations,
  and a test added (`token-rename.test.mjs`) asserting no row's `to` is any other
  row's `from`. It caught the very next rename (`inverse-to-knockout`) within the
  hour, which is the whole argument for it. *Sink:* "it resolves" is not the bar —
  a migration has to land a spoke on a LIVE name in one run. *Priority:* medium.

- **A token created from an argument rather than a call site is a theming surface
  that only appears to exist** · *Evidence:* five `-knockout` roles were added on a
  demonstrable hole (a muted label in a dark app bar fell back to `#646464` on
  `#202020`). On audit, **four had zero readers**, and the hardcodes they were meant
  to replace did not want them: `esa-snackbar-item`'s `rgba(255,255,255,0.2)` is
  CORRECT — that action button sits on five different grounds (knockout plus four
  status fills) and only an alpha lifts off all of them — and `esa-card`'s
  `rgba(255,255,255,0.8)` sits on a BRAND header, so it wanted the existing
  `--color-content-on-brand-secondary`, not a knockout variant. *Action:* the four
  were dropped before commit; `--color-border-default-knockout` survived because
  `esa-popover[appearance="inverse"]` was setting its border to its own background
  as a workaround for that token not existing. The snackbar alpha is commented so it
  is not "fixed" later. *Sink:* this repo already deleted five layout tokens for
  having zero readers; the same test has to be applied to tokens on the way IN, at
  the moment the argument feels strongest. *Priority:* medium.

- **`--color-background-default-knockout-hover` has zero readers** · *Evidence:* 0
  reads in source under that name and none under its previous name
  (`--color-background-inverse-hover`) either — the orphan predates the rename.
  *Action:* NOT deleted. It is a SHIPPED name, so removing it is a `removed: true`
  row and a different decision from renaming one; recorded in its `$description` and
  logged here for that call. *Sink:* a rename is a bad moment to also delete —
  bundling them hides which change caused which breakage. *Priority:* low.

- **~~Four tier-2 tokens still have an empty intention slot~~ — CLOSED 2026-08-15** ·
  *Evidence:* `--color-overlay-{hover, hover-strong, hover-heavy, active}` named only a
  state or an intensity with nothing in slot 2. They live in `semantic/effect.json`,
  not `color.json`, which is why the first sweep for this defect missed them and
  reported the set clean. *Action:* closed by `overlay-property-to-intention` — the
  word they needed was `overlay` itself, which had been sitting in the PROPERTY slot
  the whole time as an invented fourth alongside background/content/border. It moved
  one slot right and all four inherited it. `backdrop` and `scrim`, named here as the
  model because they DID name what they were for, moved one slot right too and are
  variants now. *Sink:* the missing word was already in the name. A token whose
  intention slot is empty is worth checking for a word doing the job from the wrong
  slot before inventing a new one. *Priority:* resolved.

- **`--color-background-elevation-sunken` is a raw `#0d0d0f` in the dark scheme**
  · *Evidence:* the only literal in `docs-dark.css`, off-palette, reachable by no
  theme and traceable to no ramp step. *Action:* left alone — changing it is a
  rendered change and belongs with the dark-mode work above. *Priority:* low.

- **UNEXPLAINED: `npm run build` failed twice with 56 Style Dictionary reference
  errors, then stopped reproducing** · *Evidence:* two consecutive failures inside
  `build.js` on the `js` platform, bracketed by successful runs before and six
  successful runs after with no relevant change. In the same window the deprecated
  alias count moved 149 → 157 (the 8 `form-padding-to-spacing` aliases began
  emitting). The two were not tied together. *Action:* none — recorded rather than
  explained, because a green build is not evidence the failure is gone. *Sink:*
  worth watching; if it returns, capture `dist/tokens.css` at the moment of failure.
  *Priority:* low.

## Source: `utility` as an intention (2026-08-15)

Four intentions (`info`, `success`, `warning`, `danger`) became four variants of
one, `utility`. 24 tokens, 310 rewrites across 51 files, value-identical. Row
`status-to-utility` in `migrations.json`. This is the third instance of the same
defect in two days — `elevation` and `knockout` were the first two — and the
findings below are mostly about what the fix keeps catching on the way past.

- **The two-hop guard earned its keep on its second day** · *Evidence:* 34 pairs
  across two LIVE rows (`status-colors-to-semantic`, 12; `color-tier2-property-first`,
  22) had the renamed names as their DESTINATION. Left alone, a spoke on
  `--color-status-info` would have been rewritten to `--color-background-info` —
  deprecated the same commit — told it succeeded, and stranded one rename behind,
  with nothing rendering wrong because aliases chain. The test added 2026-08-15
  failed on exactly this before the destinations were repointed. *Action:* done —
  all 34 repointed, both rows carry a dated note saying so. Both spokes' dry runs
  now land on the `utility` names in ONE hop (cb-fish 1,285 rewrites under
  `color-tier2-property-first`, air-exchange 232), and `status-to-utility` itself
  reports zero in both, which is the correct result and only looks like a no-op.
  *Sink:* a rename's blast radius includes `migrations.json` itself. Every row is
  a reader of the names it points at. *Priority:* resolved.

- **The hub planted the declaration it is now breaking, for the second time** ·
  *Evidence:* 15 declarations of these 24 names exist. 12 are the hub's own dark
  scheme. The other 3 are `__FILL__` slots in
  `packages/spoke-template/src/styles/theme-__SPOKE_SLUG__.css` —
  `--color-background-{info,success,warning,danger}` are scaffolded into every new
  spoke. An alias rescues a read and never a declaration, so every spoke scaffolded
  before today has three lines that go inert on upgrade: its brand's success green
  silently reverts to Ecology's. First instance was `form-padding-to-spacing`.
  *Action:* template renamed; a warning added in place explaining why the old lines
  are inert. *Sink:* the spoke template is a DECLARATION SITE the hub owns. Grep it
  on every rename, and treat a hit there as a heavier cost than any number of reads.
  *Priority:* medium — the pattern will recur until the template's declaration slots
  are audited as a set.

- **`scripts/check-contrast.mjs` is reading 15 deprecated names and passing** ·
  *Evidence:* its pair list still names `--color-content-{primary,secondary,muted,link}`,
  `--color-background-raised` and `--color-border-focus` — all renamed in earlier
  changes this week. It reports "checked 29/29 pairs" because the deprecated alias
  block resolves every one of them. It is not wrong today and it will go quietly
  wrong the day the aliases are deleted, losing pairs rather than erroring.
  *Action:* none taken — reported, not fixed, to keep this change to one rename.
  *Sink:* the token-name baseline guards `dist/tokens.css`; it does not guard the
  hub's own SCRIPTS, which read token names as data. Nothing checks those at all.
  *Priority:* medium.

- **`SPEC.md`'s grammar diagram had been stale since the `knockout` slot landed** ·
  *Evidence:* it drew four slots (`property > intention > variant > state`) a day
  after the fifth was added, and listed `info, success, warning, danger` as
  intentions. *Action:* redrawn with all five slots, and with a paragraph naming the
  two intentions that are AXES WITH RUNGS (`utility`, `elevation`) — the thing that
  explains why the variant slot legitimately holds words like `danger` and `sunken`
  that read like intentions. *Sink:* the diagram is prose and nothing derives from
  it, so it is the one part of the contract that can drift silently. *Priority:*
  resolved, but it will drift again.

- **The refusal comment was right, and paying it is different from overruling it** ·
  *Evidence:* `tier2-naming.ts` carried an explicit "NOT collapsed under an invented
  `utility` heading: no token is named `utility`, and that is the same defect as
  `neutral` was." The objection was never to the grouping — it was that a heading no
  token carries cannot be read back off a name. Renaming the tokens satisfies it.
  *Action:* the comment now records both positions and what changed between them;
  `/debug/tokens`' unclassified note says the same to a reader who never opens the
  source. *Sink:* a comment that says "we refused X" is worth keeping when X arrives,
  rewritten to say what it cost to earn. Deleting it loses the standard. *Priority:*
  resolved.

- **`--color-content-on-info` and `--color-content-on-danger` still have zero readers**
  · *Evidence:* carried through the rename unchanged; 0 reads each across the repo,
  against 45 for `--color-content-utility-danger`. *Action:* none — kept, because the
  argument for `utility` being ONE intention is that all four variants take the same
  six roles, and deleting two members of the set to save two names would break the
  regularity that justifies the grouping. *Sink:* the zero-readers standard the repo
  applies to new tokens does not straightforwardly apply to a member of a complete
  set. *Priority:* low; revisit with the other orphan decisions.

- **`danger` is the weakest fit under `utility` and it is the most-read of the four**
  · *Evidence:* `--color-background-utility-danger` is read 12 times, mostly by
  `esa-button`'s destructive variant and `esa-danger-zone` — an ACTION, not feedback.
  `--color-content-utility-danger` has 45 reads, the highest in the set, and those are
  genuinely feedback (inline validation). *Action:* none; the word was chosen knowing
  this. `feedback` would have fitted the four better and the destructive-button
  reader worse. *Sink:* a grouping word is chosen against the whole set, and the
  member it fits worst is worth naming out loud rather than discovering later.
  *Priority:* low.

## Source: `overlay` from property to intention (2026-08-15)

Six tokens, 29 rewrites across 18 files, value-identical. Row
`overlay-property-to-intention`. The property slot is back to the rubric's three
words for the whole colour set, and the unclassified group on `/debug/tokens`
reads 0 in all three property groups for the first time.

- **The missing intention was already in the name, one slot to the left** ·
  *Evidence:* four washes had an empty intention slot and were logged open above;
  the fix was not a new word but moving `overlay` out of the property slot it never
  belonged in. Two candidate new words were worked up first — `interaction` over the
  four washes, then `transparent` over all six — and both were worse than the word
  already present. *Action:* done. *Sink:* before inventing a grouping word, check
  whether one of the words in the name is doing that job from the wrong slot.
  *Priority:* resolved.

- **`transparent` was rejected, and the reason generalises** · *Evidence:*
  `transparent` names the alpha channel; `overlay` names transparency AND position,
  and every one of the six is defined by where it sits. Nesting them
  (`--color-background-transparent-overlay-hover`) states one fact twice, since an
  overlay that is not transparent is not an overlay. *Action:* recorded in the row's
  `why` so the candidate is not re-proposed. *Sink:* a name describing HOW a value is
  made loses to one describing WHERE it is used, even when both are true. Same test
  that chose `knockout` over `-dark`. *Priority:* resolved.

- **A sanctioned exception is a bug report with a long fuse** · *Evidence:* the
  fourth property carried a real justification for its whole life —
  `--color-background-hover` genuinely would have collided with the opaque gray-4
  hover. It was documented in `SPEC.md`, defended in `effect.json`, and carved out
  three separate times in `tier2-naming.ts` (`SURFACE_VOCAB`, the `isOverlay` guard,
  and an explicit `surfaceWord !== 'overlay'` in the spelling check). All three
  carve-outs are gone; the collision is resolved by a slot the grammar already had.
  *Action:* done. *Sink:* count the carve-outs an exception needs. Three is the
  signal that the model is wrong, not that the exception is special. *Priority:*
  resolved.

- **The state/variant inversion was invisible until the property moved** ·
  *Evidence:* `--color-overlay-hover-strong` and `-hover-heavy` put the STATE before
  the VARIANT, backwards against the declared order. Nothing flagged it, because
  with no intention in the name the parser could not tell `hover-strong` from a
  two-word variant. *Action:* fixed in the same pass — `-strong-hover`, `-heavy-hover`.
  *Sink:* an empty slot hides defects in the slots around it. Filling one is worth
  doing for what it reveals, not only for what it fixes. *Priority:* resolved.

- **Third two-hop catch in two days; the guard has now fired on every rename since
  it was written** · *Evidence:* `color-overlay-property-first` — the row that CREATED
  the `--color-overlay-*` names by moving the property word to the front — held all
  six as destinations. cb-fish reads `--color-active-overlay` and would have been
  written onto a name deprecated in the same commit. *Action:* all 6 repointed; the
  row carries a dated note. cb-fish's dry run now lands its 2 rewrites in one hop.
  *Sink:* the row most likely to hold a stale destination is the one that made the
  name you are renaming. Check it first. *Priority:* resolved.

- **No declarations anywhere, for once** · *Evidence:* 25 reads, 0 declarations —
  not in the hub's dark scheme, not the spoke template, not either spoke. Every
  affected site is rescued by the alias. *Action:* none needed. *Sink:* worth naming
  why: the set has no dark-scheme counterpart because black-alpha and white-alpha
  wash correctly over either ground. A role that needs no theme override is a role
  nothing can silently break. *Priority:* resolved.
