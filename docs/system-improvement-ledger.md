# Ecology System-Improvement Ledger

A living record that turns **prototype/spoke reviews** into **durable hub improvements**
(legos, skills, workflow). This is the data; the *process* is: build → review → log here →
route entries through the `learning-engine` agent → land as skill/lego/workflow changes →
next build is more on-rails. Patterns that prove broadly useful get promoted up the hub
(the hub-and-spoke contract, formalized with a capture step).

Each entry: **Finding · Evidence · Action · Sink · Priority**. Sinks: `lego` (new/changed
component), `hub-fix`, `skill`, `workflow` (planner/gate defaults), `process`.

---

## Source: the focus-ring contrast pass (2026-08-17)

Closes the "contrast is UNRESOLVED" note that `component-tokens.css` and
`semantic/color.json` had both carried since 2026-08-16. Every number below was run with
`scripts/lib/color.mjs`, the repo's own WCAG maths.

- **THE MEASUREMENT THAT SHAPED IT, and one correction to the earlier pass.** A ring taken
  from the brand fill measures **2.95:1** on raised, canvas AND floating, and **2.66:1** on
  sunken. The previously published "2.88:1 canvas" is **stale** — canvas and raised have both
  been `gray-1` since the 2026-08-15 move, so they cannot differ. Scope of the live failure
  was narrower than the docs implied: **hub default, light scheme only.** beacon measured
  4.54:1, qanat 5.07:1, the spoke template 5.62:1, and every dark-scheme ring 4.93:1 or
  better. The systemic risk — a future spoke picking a light brand — was the real exposure,
  and it was ungated.

- **WHY IT COULD NOT BE FIXED BY RE-POINTING.** A Radix step 9 is engineered to clear 3:1 as
  a SOLID FILL carrying text; a ring needs 3:1 as a 2px HAIRLINE against the same surfaces.
  Same number, harder job. And a brand hex is chosen for brand reasons and lands anywhere on
  the luminance scale, so *"the ring is the brand"* and *"the ring always clears 3:1"* cannot
  both be guaranteed by one flat value. **CSS cannot express the condition either:** Color 5's
  `color-contrast()`, which tested a candidate against a target ratio, was cut down to
  `contrast-color()`, which only returns black or white against a background. So the decision
  cannot live in the cascade at all.

- **WHAT LANDED: a ramp walk at theme-generation time, gated at `fail`.** `resolveFocusRing`
  in `scripts/lib/theme-recipe.mjs` walks the brand's own ramp from step 9 up and takes the
  first step clearing 3:1 on every surface *in that scheme, against that theme's own
  neutrals*. Results: hub → **step 10** (`#3e9b4f`, 3.07:1 sunken / 3.91 elsewhere); beacon,
  qanat and the spoke template → **step 9, untouched**. Regenerating both themes added exactly
  one line per scheme block and changed no rendered colour, which is the evidence the walk is
  a no-op for a brand that works. Pathological brands are rescued with their hue intact
  (bright yellow 1.18 → 4.16 at step 11, pale pink 1.59 → 10.30 at step 12).

- **THE NEUTRAL FALLBACK IS MEASURABLY DEAD CODE, and that is the strongest result.** Swept
  216 seeds across the RGB cube in both schemes: every ramp had a usable step, worst
  best-available **9.55:1**. Structural, not luck — step 12 of a light ramp is dark and step 12
  of a dark ramp is light, so the far end of the curve is always usable. So the practical
  guarantee is stronger than "accessible": **the ring is always the brand.** The fallback stays
  as a floor (`ramp` is a parameter; not every caller is `rampFrom`), is reported at `fail`
  because a ring that is no longer brand-coloured is something a spoke must be told about, and
  is unit-tested directly since `deriveTheme` cannot reach it.

- **WHAT IT COST: the tier-2 derivation.** `--color-border-default-focus` was
  `{color.background-brand}` and is now `{color.grass.10}` — a *defining* token where a
  *derived* one used to be, which `SPEC.md` names as the shape that shipped the cb-fish
  navy-brand-with-green-rings bug. Accepted knowingly, with three replacements for what the
  chain guaranteed: the generator emits the role for **every** theme in both schemes even when
  the walk picks step 9, so a spoke can never inherit grass; `packages/spoke-template` carries
  the declaration so a hand-authored theme has it in front of it; and `check-contrast.mjs`
  grades it at `fail`. Teeth in the gate, not the cascade. **Residual risk, stated plainly:** a
  hand-authored theme that declares this token still beats the walk on source order. That is by
  design and is what the `fail` rows exist for · `lego` + `hub-fix` · **done**

- **THE GATE WAS THE REAL HOLE.** The ring had ONE row in `contrast.mjs`:
  `['--color-border-focus', '--color-background-raised', 3.0, 'warn']` — wrong three ways. It
  named a **pre-rename** token resolving only through a compatibility alias; it was `warn`, so
  it reported a Level AA failure to nobody; and it tested a single surface, never the sunken one
  the ring is worst on. Replaced with four `fail` rows (raised, default, floating, sunken) plus
  one `warn`. 29 → 33 pairs · `hub-fix` · **done**

- **A PRE-EXISTING FAILURE THE NEW ROWS EXPOSED: the knockout app bar.** A knockout surface is
  near-black in the **light** scheme and near-white in **dark**, so no brand-derived ring value
  serves it and `#fcfcfc` at once. Measured 2026-08-17: hub dark **2.99:1** (0.01 short),
  beacon dark 2.68, qanat light 2.84, qanat dark 2.78, spoke template light 2.54. Four of six
  theme×scheme combinations. The walk **improved** the hub's case (2.59 → 2.99) without fixing
  it. Carried at `warn`, not `fail`, because the remedy is not this token: a component on dark
  ground re-points the tier-3 `--focus-ring-color` locally, as `esa-button variant="chrome"`
  already does via `currentColor`. *Action:* promote to `fail` once the dark-chrome components
  do it · `lego` · **open, medium**

- **`esa-app-shell` was ringing from a FILL role, and the walk turned that from tidiness into
  a bug** · *Evidence:* lines 233 and 248 painted `2px solid var(--color-background-brand)`,
  omitting `--focus-ring-width` too. Invisible while the two tokens resolved identically — the
  focus audit page correctly reported "nothing to see on screen". The moment the ring moved to
  step 10 they diverged, leaving those two rings the only ones in the kit still at 2.66:1 on a
  sunken surface. *Action:* both moved to the house shape · `lego` · **done**

- **52 literal fallbacks encoded the failing value** · *Evidence:* `var(--focus-ring-color,
  #46a758)` across 34 components, plus 17 `var(--form-border-color-focus, #46a758)`. The
  fallback is load-bearing by convention (CLAUDE.md: "always with a literal fallback") and it
  is what paints when a consumer loads `@esa/ecology` without `@esa/tokens/tokens.css` — so all
  69 encoded a ring at 2.66:1. Retargeted to `#3e9b4f`. **The 39 `var(--color-background-brand,
  #46a758)` fallbacks were deliberately NOT touched** — the brand fill is still grass-9, and a
  blanket `sed` over the hex would have silently moved the brand · `hub-fix` · **done**

- **THE ERROR RING WAS AN OVERRIDE THAT A REFACTOR TURNED INTO AN ADDITION** · *Evidence:*
  the six value-collecting components painted a red error ring with
  `box-shadow: 0 0 0 var(--focus-ring-width) <red>`. In Andy's original (`6779655`, 2026-07-01)
  the BASE rule painted the ring with `box-shadow` too, so this was a true override — same
  property, same geometry, red replacing brand, **one ring**. The 2026-08-16 forced-colors pass
  converted the base rule to `outline` (box-shadow is force-adjusted away, so a box-shadow-only
  ring vanishes in Windows High Contrast) and did not convert the error rule. The two stopped
  sharing a property, so the override became an addition: a focused invalid field painted red
  border → red shadow flush → 2px gap → brand outline, **three bands in two colours**.
  `check-a11y` check 9 cannot see it — it asks whether a ring is PRESENT, and two rings pass
  that as easily as one. *Action:* restored as a genuine override —
  `outline-color: var(--form-error-border-color)` — in all six. Andy's intent was reinstated
  rather than deleted, which is the choice worth recording: the alternative on the table was
  dropping the red ring entirely and letting the border plus the error text carry the state,
  since SC 1.4.1/3.3.1 are already satisfied by `aria-invalid` and the visible message. Red
  was kept as a design position, and the cost of keeping it is the row below · `lego` · **done**

- **KEEPING THE RED RING PUT A SECOND COLOUR UNDER THE 3:1 GUARANTEE** · *Evidence:* the ring
  now has two colours, so grading only the brand one would leave half the indicator unmeasured.
  *Action:* four `fail` rows added for `--form-error-border-color` on the same four surfaces;
  33 → 37 pairs. Named at TIER 3 deliberately — unlike every other row in `PAIRS` — because
  tier 3 is what the components paint and it is declared in `component-tokens.css`, which the
  gate parses; it chains to `--color-background-utility-danger`, so a spoke re-pointing the
  tier-2 role is still caught. Measured: red-9 **3.43:1** worst by default, red-11 **4.57:1**
  under `[data-a11y-assurance="wcag-aa"]`. Both pass · `hub-fix` · **done**

- **THREE OF THE SIX ERROR RINGS WERE ALL BUT INVISIBLE, and this is what the new rows would
  have caught** · *Evidence:* `esa-select`, `esa-combobox` and `esa-date-picker` painted the
  error ring from `--color-border-utility-danger`, which is **red-6 — a subtle BORDER step**,
  not a fill. Measured `#fdbdbe` at **1.55:1** raised and **1.40:1** sunken, against the 3:1
  the indicator owes. The literal fallback beside it, `rgba(211, 47, 47, 0.25)`, composites to
  **1.26:1**. The other three used `--form-error-border-color` (red-9, 3.43:1), so the kit had
  two different error rings and one of them could barely be seen. Nothing measured either,
  because the ring had no gated row at all before this pass. *Action:* all six unified on
  `--form-error-border-color`, which is what `--_field-border-color` already uses in the same
  components — so the ring and the border are now the same red by construction rather than
  coincidence. `--color-border-utility-danger` keeps its one correct reader,
  `esa-error-summary`'s 1px panel border, which is exactly what a step 6 is for · `lego` · **done**

- **"SIX COMPONENTS" WAS WRONG: TEN HAVE AN ERROR STATE, AND FOUR HAD NO ERROR RING AT ALL** ·
  *Evidence:* found by opening `/components/esa-form-field` and asking why the Permit ID field —
  marked invalid — showed a brand-coloured focus ring. The six counted above were the ones that
  HAD a (broken) error ring. Four more have an error state and never had a ring: `esa-form-field`
  (colours the error text only), `esa-checkbox-group` and `esa-radio-group` (colour the group
  legend only), `esa-button-toggle` (moves the option border only). `esa-form-field` is the worst
  case, because the documented usage on its own doc page is a native `<input>` slotted into a
  `FormField` carrying `errorText` — so the combination the docs teach had no error ring, and the
  red border in that demo comes from a class in the doc page's own stylesheet, not from the kit.
  Both group components even carried a comment giving the reason: *"there is no single box to
  outline the way a text field has."* The premise was right and the conclusion was backwards —
  there is no single box, so do not outline one. *Action:* all ten now re-point the token ·
  `lego` · **done**

- **THE MECHANISM CHANGED: re-point the TOKEN, do not override the property** · *Evidence:* the
  `outline-color` override landed earlier the same day was correct for `esa-text-field`, which
  has one focusable part, and does not generalise. `esa-combobox` has FIVE things that read
  `--focus-ring-color` (autocomplete input, text trigger, field trigger, the dropdown's own
  search box, every chip remove button); `esa-select` three; `esa-input-tag` three;
  `esa-checkbox-group` N boxes; `esa-radio-group` N circles; and `esa-form-field` does not own
  its control at all. A property override is one rule per part, and a missed part keeps ringing
  brand-green inside a field that is telling the user it is invalid. *Action:* every error
  wrapper now sets `--focus-ring-color: var(--form-error-border-color)` — one declaration,
  inherited. Three things this buys beyond brevity: it reaches **slotted** content (Astro scopes
  a component's selectors to its own template, so no descendant selector in `esa-form-field`
  could ever style what it wraps); it reaches **into a shadow root**, which no stylesheet can
  cross and inherited custom properties are the only channel for in every engine; and it cannot
  fall out of step with the base rule the way the box-shadow did, because there is no second
  property. It also removed the `(0,3,0)` specificity trick the `outline-color` form needed in
  `esa-input-tag` · `lego` · **done**

- **RECORDED CONSEQUENCE: a dropdown panel inside the field inherits the red ring** ·
  *Evidence:* `esa-select` and `esa-combobox` both render their panel inside `.container`, which
  is inside `.field`, so the search box in an invalid combobox's dropdown rings red too.
  *Action:* accepted — it is all one field and it is consistent — but written into the component
  comment and the `/foundations/focus` page, because it is not predictable from reading the rule
  and would otherwise be discovered as a surprise · `lego` · **done, documented**

- **A dead reset had to move with the property** · *Evidence:* `esa-input-tag` carried
  `.container--disabled:focus-within { box-shadow: none }` to stop a disabled field wearing the
  error ring. It is **unreachable by construction** — the inner input and every chip button take
  the native `disabled` attribute, so `:focus-within` cannot match — but it still had to move to
  `outline-color`, or it would have stopped cancelling the rule it exists to cancel. *Action:*
  rewritten as an `outline-color` reset at (0,3,0) so it beats the error rule, resetting the
  COLOUR rather than removing the outline (an element that can take focus still owes SC 2.4.7 a
  ring even when inert). Kept, with its unreachability written down, because the day someone
  swaps `disabled` for `aria-disabled` it becomes load-bearing · `lego` · **done**

- **The Lit-template ratchet earned its keep on this change** · *Evidence:* the first draft of
  the six comments used backticks around property names, which is normal prose style everywhere
  else in the repo. Inside a Lit ``css` ` `` template a backtick CLOSES the literal: four
  components would have thrown at load and never upgraded. `npm test` named all four files and
  the exact opening line. *Action:* none needed — the guard did its job. Logged because it is
  the 7th occurrence, and the lesson is that the trap is in the COMMENTS, not the CSS ·
  `process` · **P3**

- **The 0.07 margin is the thing to watch** · *Evidence:* grass step 10 clears 3:1 by 0.07
  (3.07:1 on the sunken surface). The tokens also ship a P3 block whose `grass-10` is
  `color(display-p3 0.344 0.598 0.342)`, which is not the sRGB value the gate measures.
  *Action:* none taken — a bare 3:1 was the chosen rule and `AA_NON_TEXT` in
  `theme-recipe.mjs` is a one-line change. Worth noting that a 3.5 threshold would send the hub
  to step 11 (`#2a7e3b`, 4.44:1), which is the step `[data-a11y-assurance="wcag-aa"]` already picks,
  so the two mechanisms would agree — and it would clear the hub's knockout row too · `hub-fix`
  · **open, low**

---

## Source: the tier-3 reduction pass (2026-08-16)
Applied the three-tier framework's necessity test to all 306 tier-3 declarations:
**306 → 116** (16 dead deleted, 3 misfiled relocated, 168 demoted to the tier-2 roles
they aliased, 3 pre-existing rename rows repaired). Findings that were surfaced BY the
pass but are not part of it, logged rather than fixed:

- **`esa-alert-box` pins every variant to the INFO tint** · *Evidence:* the hookify
  defaults set `--alert-box-bg` → `--color-background-utility-info-subtle` and
  `--alert-box-border-color` → `--color-border-utility-info` for ALL variants, so success
  and warning alerts render blue. air-exchange-tool works around it in its own theme with
  `--alert-box-bg: initial`, with a comment naming it as a hub defect — meaning a spoke
  found this, patched locally, and it never came back up. A zero-regression-rule miss: the
  hook was spliced above a chain that was per-variant, and the default flattened it.
  *Action:* the two hooks must derive from the variant's accent context, not from `info`.
  Both survived the demotion pass (air-exchange declares them, which is demonstrated
  divergence), so the fix is a value change, not a re-add · `hub-fix` · **P1**

- **`--color-background-default-hover` is a tier-2 orphan, and three migrations rows point
  spokes AT it** · *Evidence:* its only reader was `--topbar-icon-bg-hover`, deleted with
  the topbar namespace. It was already effectively dead — its one reader was itself
  unread — so the deletion revealed the orphan rather than creating it. The sharp edge is
  that `form-bg-to-background-field` and two other rows name it as a rename DESTINATION,
  so any spoke that ran `/update-tokens` was rewritten onto a role the hub reads nowhere.
  *Action:* decide whether the role is real (wire it — a neutral hover surface is a
  plausible intent) or dead (`removed: true`, and repoint the three rows). Do NOT leave it
  declared-but-unread while rows aim at it · `hub-fix` · **P2**

- **A rename row's destination is only as durable as the token it points at** ·
  *Evidence:* the destination-resolves guard fired THREE times in one pass —
  `tier3-border-to-border-color`, `filter-dropdown-border-shorthand-to-colour` and
  `tier3-variant-before-property` all aliased onto tier-3 names being demoted. Each would
  have shipped as an alias resolving to nothing while the manifest reported success, which
  is the exact defect `form-height-to-control-height` records. *Action:* none needed — the
  guard caught all three and they are folded into the removals. Logged because the *rate*
  is the signal: any pass that deletes tier-3 names should expect to repair older rename
  rows, and the guard is the only thing that finds them · `process` · **P3**

- **`--focus-ring-halo` / `--focus-ring-halo-spread` are documented but declared nowhere** ·
  *Evidence:* both appear in `apps/site/src/pages/foundations/focus.astro` (a live doc page
  that lists them in a token table with `maps:` targets), in
  `plugins/spoke-kit/skills/design-principles/SKILL.md:57` as a token to re-point, and in
  `plugins/spoke-kit/skills/accessibility/forced-colors.md:83` inside a worked example.
  Neither is declared in `tokens.css` or `component-tokens.css`. This is the reverted
  contrast band CLAUDE.md records ("A second, non-brand contrast band was tried and reverted
  the same day"): the TOKENS were reverted, the three documents referencing them were not.
  *Impact:* the skill ships to spokes, so a spoke is being told to re-point a token that
  does not exist — and because the read sites carry fallbacks, doing so fails silently.
  *Action:* either land the halo tokens or strip all three references. Not touched by the
  tier-3 pass — surfaced by its stale-reference sweep · `hub-fix` · **RESOLVED 2026-08-17**
  — stripped, not landed. The halo will never ship: the contrast problem it existed for is
  now solved by the ramp walk (see the focus-ring contrast entry below), so all references
  were rewritten to describe that instead. Also found and fixed in the same sweep, beyond
  the three named above: three test comments in `scripts/lib/check-a11y.test.mjs` and the
  copyable house shape on `/foundations/focus`, whose fourth line
  (`box-shadow: 0 0 0 var(--focus-ring-halo-spread) var(--focus-ring-halo)`) had been
  telling every component author to write a declaration that paints nothing.

- **The computed-style probe is too noisy to prove zero-regression** · *Evidence:* built
  the Playwright probe the plan called for; it reported 48 routes differing — and the
  control (same build, two runs) reported the same 48. Hydration/animation timing makes
  per-element computed styles non-deterministic at this precision. *Action:* zero-regression
  was argued by construction instead (160 of 174 substitutions are pure layer-strips; the
  other 14 keep their own fallback with only the token name swapped). If a real visual gate
  is wanted, it needs deterministic settling — disable animations, await
  `customElements.whenDefined` per tag, and compare a stable ordering key rather than a
  positional DOM path · `workflow` · **P2**

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
- ✅ **FOR THE TIER-3 PASS — adopting a typography composite removes the component's
  typography hook** · *Closed 2026-08-16 as **option (c)**, by the tier-3 reduction pass
  (306 declarations → 116).* Of the 13 hooks listed below, 5 were already gone; of the 8
  that remained, the 4 `--grid-*` ones were KEPT (inside the staged data-grid surface —
  a data grid is one of the three cases tier 3 exists for) and the 4 one-reader ones were
  demoted: `--filter-pill-font-size`, `--link-column-heading-font-size`,
  `--link-column-item-font-size`, `--pagination-font-size`. Each was a pure alias over a
  `--typography-*` property or a `--font-size-*` rung, which is the fragmentation the
  composites exist to prevent. **This unblocks the typography migration**, which the
  entry below says was waiting on this decision. Original entry follows for the reasoning.

  ~~**FOR THE TIER-3 PASS — adopting a typography composite removes the component's
  typography hook**~~ · *Evidence:* 13 tier-3 typography hooks exist (`--grid-font-size`,
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

---

## Source: post-canvas-move audit (2026-08-16)
Measured after `background-default` moved gray-2 → gray-1 on 2026-08-15. The token's
own `$description` asked for exactly this check; the numbers are worse in the dark
scheme than that note anticipated.

- **`esa-card--elevated` has no working separation mechanism in the dark scheme** ·
  *Evidence:* the variant sets `--_card-border: transparent` and leans entirely on
  `--elevation-2` (`esa-card.astro:126-129`), which resolves to
  `0 2px 12px 0 rgba(0,0,0,0.04)` — 4% BLACK. In the light scheme that shadow lands
  at `#f2f2f2` on a `#fcfcfc` canvas: **1.091**, faint but present. In the dark
  scheme it lands at `#101010` on `#111111`: **1.008**. Black on near-black is not a
  shadow, it is nothing. The card's own value separation is `#191919` on `#111111` =
  **1.074**. So in dark mode the elevated variant separates from the page by neither
  border, nor value, nor shadow. `--shadow-color-100` has no `[data-scheme='dark']`
  override in `apps/site/src/styles/docs-dark.css`, which is why the shadow ramp
  crosses into dark unchanged. *Action:* NOT fixed — the choice between giving
  elevated a dark-scheme border, overriding the shadow ramp per scheme, or moving the
  elevated rung up the value ladder is a design decision, and contrast work is
  batched. *Sink:* `hub-fix` — pair every shadow-based affordance with a value-based
  one, or scope the shadow ramp per scheme. A shadow is a light-scheme device that
  silently no-ops on dark ground. *Priority:* high (a shipped variant that renders as
  nothing).

- **The default and outlined variants are fine, and that is why this went unnoticed** ·
  *Evidence:* both keep the 1px `--color-border-default` — `#cecece` on `#fcfcfc` =
  **1.534** light, `#3a3a3a` on `#191919` = **1.546** dark. Near-identical in both
  schemes, which is the border ramp doing its job. Only the variant that opts OUT of
  the border is exposed. *Action:* none. *Sink:* when a canvas moves, audit the
  variants that decline the default affordance first — they are the ones with nothing
  to fall back to. *Priority:* resolved.

---

## Source: the batched accessibility pass (2026-08-16)
The contrast + touch-target batch, run across all 64 components together rather than
piecemeal. Reported, not fixed — the fixes are design decisions and belong in one
deliberate pass. `scripts/check-contrast.mjs --hub` for the token pairs; source audit
for keyboard, focus and target size.

- **Seven AA text-contrast failures in the hub defaults, and six share one cause** ·
  *Evidence:* `content-link` on raised 2.95, `content-on-brand` on brand 2.95,
  `content-on-accent` 2.90, `content-on-ai` 3.50, `content-on-utility-info` 3.18,
  `content-on-utility-danger` 3.81, `content-utility-warning` on warning-subtle 4.43.
  Warnings alongside: `content-muted` on raised 3.70, `content-disabled` 2.91,
  the focus ring 2.95, brand-on-raised 2.95. *Action:* none yet. *Sink:* `hub-fix` —
  every `-on-*` failure is white text on a Radix **step 9** fill, and step 9 is
  engineered for 3:1 (UI components and large text), not 4.5:1 body text. So this is
  not seven independent bugs: it is one decision about what step a solid fill uses,
  or an admission that button labels are large text. Fixing them one at a time will
  produce seven different answers. *Priority:* high.

- **~~`esa-date-picker` has no keyboard handling of any kind~~ — WITHDRAWN 2026-08-18,
  IT WAS NEVER A FINDING** · *Original evidence:* zero `keydown` listeners, zero key
  comparisons, zero `.focus()` calls in the whole file; "the calendar popup cannot be
  opened, navigated, or dismissed from the keyboard." Filed *highest* priority and
  repeated on `/guide/assurance` as "the most serious open finding in the kit."

  **There is no calendar popup.** `esa-date-picker.ts` renders exactly one native
  `<input type="date">` (`:221-235`) behind a real `<label for>`; it has no `open`
  state, no panel, and no click handler anywhere in its 378 lines. The browser
  supplies the calendar *and its keyboard* — you type the date directly, and
  Alt+Down opens the picker. Zero `keydown` listeners is not the absence of keyboard
  handling here; **it is what a correct native wrapper looks like**, and the same
  count would be damning on a custom widget and meaningless on this one.

  The lesson worth keeping: **the evidence was true and the conclusion did not
  follow.** A grep counts what a file *does*; it cannot see what the platform is
  doing on the file's behalf. Every "zero X listeners" finding needs one more step —
  open the component and ask what element is actually there. Two documents carried
  this for two days on the strength of a count nobody re-read the source behind.
  `esa-color-picker` is the same shape (native `<input type="color">` at `:139`) and
  was never filed, which is the inconsistency that should have prompted the check.

- **~~The three true modals are complete; the nine non-modal popups return focus
  nowhere~~ — RE-MEASURED 2026-08-18; the count was wrong in both directions and the
  headline understated it** · *Original evidence:* the other nine were listed as
  dropdown-menu, command-palette, popover, combobox, date-picker, entity-search,
  filter-dropdown, nav-dropdown, tooltip.

  **A count was the wrong shape for this and went stale silently.** Four of the nine
  did not belong: `date-picker` has no popup at all (see the withdrawn entry above);
  `nav-dropdown` is a zero-JS native `<details>` that nothing closes programmatically,
  so it cannot strand focus — its gap is no Esc; `tooltip` never takes focus, so its
  gap is dismissal (SC 1.4.13), not return; and `combobox` loses focus only in
  `mode="select"`, where `.search-input` (`:659`) renders inside the dropdown that
  `closeDropdown()` unmounts. `esa-select` was never on the list and correctly so —
  its `.input` sits inside `.trigger` (`:607-608`), which never unmounts. Missing from
  the list: **`esa-search-panel`**.

  Measured, focus is stranded at `<body>` on close by: `esa-command-palette`,
  `esa-entity-search`, `esa-search-panel`, `esa-popover`, `esa-dropdown-menu`,
  `esa-filter-dropdown`, and `esa-combobox` in `mode="select"`.

  **The headline understated the real defect.** "The three true modals are complete"
  was true of everything the entry measured and still missed that **`inert` is used
  nowhere in this repo** — zero occurrences in real code, every grep hit the English
  word in a comment. So all three "complete" modals declare `aria-modal="true"` while
  nothing enforces the modality: a Tab trap constrains one key on one input device and
  does nothing for a screen reader's virtual cursor, find-in-page, or programmatic
  focus. And three components paint a full-viewport backdrop while declaring no
  modality whatsoever — `esa-command-palette`, `esa-entity-search` and
  `esa-search-panel`, the last carrying `role="search"` (a **landmark**) on an element
  covering the viewport at `--z-modal-backdrop`, which is why nothing ever flagged it.

  *Action:* **RESOLVED for the modals, 2026-08-18** — all six moved to native `<dialog>`
  + `showModal()`, which supplies inertness, focus containment, focus return against the
  real trigger node, Esc including OS-level close requests, and the top layer. The
  hand-rolled `ModalFocus`/`inert` module written for this was deleted before it shipped;
  `packages/ecology/src/overlay.ts` kept only what the platform does NOT give you and the
  non-modals still need. Still open: `esa-popover`, `esa-dropdown-menu`,
  `esa-filter-dropdown` and `esa-combobox` (`mode="select"`) strand focus on close.
  *Sink:* `lego`. *Priority:* medium.

  **GOING NATIVE MOVED ONE DEFECT RATHER THAN DELETING IT, and it was invisible.** A modal
  `<dialog>` blocks everything outside itself — from the pointer, from focus, and from the
  accessibility tree. `announcer.ts` mounts the kit's two live regions in `document.body`,
  outside every dialog, so from the moment the migration landed every `announce()` made
  from inside a modal reached nobody: `esa-entity-search`'s assertive "No results found",
  and the same call in `esa-command-palette` and `esa-search-panel`.

  Measured in all three engines, because none of it is visible from the DOM: a body-level
  element cannot take focus while a modal is open, and Chromium's real accessibility tree
  (CDP `Accessibility.getFullAXTree`) no longer contains the region's text — but
  **`region.inert` reads `false` in Chromium, Firefox AND WebKit**, because the IDL
  attribute reflects the `inert` content attribute and not modal blocking. There is no
  property to assert, no attribute to grep, and axe has no rule for it. `npm run a11y:live`
  cannot see it either: it audits pages at rest and never opens a dialog.

  A `[popover]` region promoted to the top layer was tried and **measured not to work** —
  Chromium drops it from the a11y tree too, because the dialog blocks everything outside
  *itself* regardless of top-layer membership. So `announcer.ts` re-homes its regions into
  the open modal and back to `<body>` on close, which knowingly bends the "no live region
  inside a shadow root" invariant: one root deep, inside the surface the user is currently
  focused in, against the alternative of guaranteed silence. Guarded by
  `scripts/lib/overlay.test.mjs`.

- **Two focus rings suppressed with no alternative** · *Evidence:* `.input` in
  `esa-search-panel` and `.esa-entity-search__input` both declare `outline: none`
  with no `box-shadow` ring and no `:focus-within` on a wrapper. The other 18 files
  containing `outline: none` are all legitimate — `esa-textarea`, `esa-text-field`
  and `esa-date-picker` substitute a box-shadow ring, and `esa-side-dialog:171` puts
  it on the programmatically-focused panel, which is correct. *Action:* none yet.
  *Sink:* `hub-fix` — note that `check-a11y.mjs` BLOCKS exactly this, but only fires
  on Write/Edit, so code written before the hook existed was never scanned. A
  one-shot sweep is what finds these; the hook only holds the line. *Priority:* high.

- **`esa-pill__remove` is a 16x16 tap target** · *Evidence:* explicit
  `width: 16px; height: 16px; padding: 0`. WCAG 2.5.8 (AA) sets the floor at 24x24.
  `esa-filter-pills` has the same shape — `padding: 0` on the button with a 16x16
  icon inside. `esa-tab-layout`'s 20x20 is a count badge, not interactive, and is
  not a finding. *Action:* none yet. *Sink:* `lego`. *Priority:* medium.

- **Two things came back clean, which is worth recording so they are not re-audited** ·
  *Evidence:* zero positive `tabindex` anywhere in the 64, and zero `<img>` without
  an `alt` attribute. *Action:* none. *Sink:* these are the two `check-a11y.mjs`
  rules with no judgment component, and the hook has evidently been holding them.
  *Priority:* resolved.

## Source: the form validation pass (2026-08-16)
Third topic in the batched accessibility review, after contrast + touch targets. Scope was
narrow on purpose: how the kit tells a user a field is required, what format it wants, that
they got it wrong, which field is wrong, and how to fix it. Unlike the contrast batch this
one was FIXED, not just reported — the findings were mostly wiring, and wiring has one right
answer. 11 findings, all resolved except the two noted at the end.

- **The kit rendered error messages that assistive tech never read** · *Evidence:* only
  **2 of 16** form-associated controls wired `aria-describedby` to their message node
  (`esa-button-toggle`, `esa-input-tag`). The other five that HAD an `errorText` prop
  rendered a red line with no `id` on it and no reference to it, so the message was visible,
  correct, and invisible at the exact moment it was needed — when the user arrives at the
  field to fix it. *Action:* all nine controls that collect a value now emit
  `aria-describedby`, `aria-invalid` and (where the role allows) `aria-required`. Counts are
  now describedby 9, invalid 9, required 8 · `lego` · **resolved 2026-08-16**

- **`grep -l aria-required` returned 7 files when 2 set it, and that is a MEASUREMENT trap
  worth naming** · *Evidence:* five files carried a shared comment reading "`required` has to
  actually BLOCK submission, not just draw an asterisk and set `aria-required`". The phrase is
  accurate prose about `setValidity`; it is also five false positives for any grep of the bare
  name. Same shape as the `--form-*` miscount already in CLAUDE.md. *Action:* count
  `aria-required=` **with the equals sign**. The comments are correct and were left alone —
  the first instinct was to delete them as "misleading", which would have destroyed accurate
  documentation to fix a bad query · `process` · **resolved 2026-08-16**

- **The canonical form pattern instructed authors to produce unnamed controls** ·
  *Evidence:* `patterns/form-section.astro` said "leave the control's own `label` unset so the
  field isn't labeled twice" and demoed it six times, while `esa-form-field` renders a
  `<label>` with no `for`, beside the slot rather than around it. A light-DOM label cannot
  reach an input inside a shadow root, so following the documented pattern gave every control
  no accessible name at all — SC 3.3.2 and 4.1.2, both Level A, failed before validation was
  even reached. *Action:* prose corrected (in a parallel pass) and the specimens rewritten to
  carry their own `label`. The wrapper is now documented as decorative · `docs` ·
  **resolved 2026-08-16**

- **`<esa-text-field type="email" value="not-an-email" required>` reported VALID and
  submitted** · *Evidence:* `syncValidity()` hand-rolled `valueMissing` and carried a comment
  saying format checking was "the inner native input's job". It is not — the inner input is in
  the shadow root and is not a control of the outer form, so the form sees only what
  `setValidity` reports. `checkValidity()` returned `true` on malformed input. *Action:*
  validity is MIRRORED from the inner control in text-field, textarea and date-picker, which
  picks up `typeMismatch`/`patternMismatch`/`tooShort`/`rangeOverflow` for free.
  **This is a behaviour change** — spoke forms that silently accepted bad input will now
  refuse to submit. No `migrations.json` row: nothing is renamed, so there is nothing to
  rewrite · `lego` · **resolved 2026-08-16**

- **Three defects have now landed on the same method, and the tell was identical each time** ·
  *Evidence:* `syncValidity`/`setFormValue` previously produced "required was cosmetic in all 7
  controls" (2026-08-14) and "a scripted value never reached the form in 8 of 12" (2026-08-14).
  All three were a COMMENT describing a delegation that did not happen, which is why none was
  caught by review — the comment reads as a design note, not as an unimplemented branch.
  *Action:* none beyond the fixes. *Sink:* `process` — when a comment says another layer
  handles something, check that the other layer can SEE the thing. Shadow boundaries are where
  this assumption dies · **resolved 2026-08-16**

- **The same defect immediately recurred in brand-new code** · *Evidence:* `esa-error-summary`
  shipped with a comment stating "the form components each override `focus()` to forward to
  their own inner control". None of them did, and none set `delegatesFocus`, so `.focus()` on
  a form-associated custom element was a silent no-op — every summary link would scroll to its
  field and leave focus on the link. *Action:* `focus()` overrides added to all 8 controls,
  which makes the comment true. *Sink:* `process` — the interval between writing the lesson
  above and re-committing it was under one hour · **resolved 2026-08-16**

- **Error and help text were distinguished by COLOUR ALONE** · *Evidence:* every control
  rendered `hasError ? <p class="error"> : <p class="help">` — same tag, same type role, same
  slot, different custom property. SC 1.4.1 (Use of Color, Level A), as the kit-wide default.
  `esa-field-error` was the only component with a non-colour indicator, its `icon` was OFF by
  default, and it was instantiated **once** in the whole repo. *Action:* the error line now
  carries an icon AND a visually-hidden "Error:" prefix in all nine; `esa-field-error`'s `icon`
  defaults ON · `lego` · **resolved 2026-08-16**

- **There was no `visually-hidden` utility, so the standard fix was not expressible** ·
  *Evidence:* `grep -rn "visually-hidden\|sr-only"` over tokens, ecology and the site returned
  nothing. *Action:* new `packages/tokens/src/a11y.css` + a `packages/ecology/src/a11y.ts` Lit
  bridge, generated from the same source by `build.js` exactly as `typography` is — the clip
  rect is fiddly enough that two hand-kept copies would drift, and the drift mode is someone
  "simplifying" it to `display: none`, which hides it from the screen readers it exists for.
  *Sink:* `hub-fix` — this was a prerequisite, not a nicety · **resolved 2026-08-16**

- **A live region cannot announce content it was created with** · *Evidence:* `esa-field-error`
  declared `role="alert"` AND `aria-live="polite"` — contradictory, since `alert` already
  implies assertive — on an element that only exists when it has a message. A region has to
  pre-exist its content for the mutation to be observed. It is also an `.astro` component
  rendered at build time, so it can never be populated later; its doc page nonetheless claimed
  the message "is announced when it appears". *Action:* the nine controls keep a PERSISTENT
  empty message node (`.visually-hidden` when empty, so it stays in the accessibility tree
  rather than `display: none`), gated behind a new `live-error` prop. `esa-field-error` drops
  both attributes and is documented as server-rendered-errors-only · `lego` ·
  **resolved 2026-08-16**

- **`live-error` defaults OFF, which is the non-obvious half of the decision** · *Evidence:*
  the house pattern is validate-on-submit with `<esa-error-summary>` taking focus. A live
  region per field under that pattern fires an assertive announcement for EVERY invalid field
  at once; assertive updates can clear each other's queue, so the user hears an arbitrary
  subset in no guaranteed order while their focus is elsewhere. Pairing a live region with
  `aria-describedby` on the same node also double-announces in JAWS. *Action:* off by default,
  opt in per field for genuinely inline (on-blur) validation · `lego` · **resolved 2026-08-16**

- **Option groups had no error channel at all, and their `role`s were the weak ones** ·
  *Evidence:* `esa-radio-group` and `esa-checkbox-group` had no `required`, `errorText`,
  `aria-required` or `aria-invalid`, and both put `aria-label={label}` on a `<div>` while ALSO
  rendering the label visibly — a duplicated name that silently vanishes when `label` is empty.
  *Action:* both now use a real `<fieldset>`/`<legend>` (measured to name correctly inside a
  shadow root) with the full error channel. Radio group overrides to `role="radiogroup"`
  because ARIA forbids `aria-required` on `group`; the checkbox group cannot, so its
  requirement goes in the accessible name as "(select at least one)" — WCAG technique H90 ·
  `lego` · **resolved 2026-08-16**

- **Error no longer REPLACES help text** · *Evidence:* the kit's precedence deleted a field's
  format instructions at the exact keystroke the format was got wrong. *Action:* both nodes
  render; `aria-describedby="error help"` announces the error first, then the hint · `lego` ·
  **resolved 2026-08-16**

- **`autocomplete` was absent from every control, and it is a named AA criterion** ·
  *Evidence:* SC 1.3.5 Identify Input Purpose can only be satisfied by `autocomplete`;
  `type="email"` says what KIND of data, `autocomplete="email"` says WHOSE. It is also the
  largest single error-PREVENTION affordance available, and matters disproportionately for
  motor impairments. *Action:* `autocomplete`, `inputmode`, `pattern`, `minlength`, `maxlength`
  forwarded to the inner control, and `name` with them — a `name` consumed only by
  `ElementInternals` never reaches the DOM input, which is the quiet reason autofill "doesn't
  work" on custom form controls · `lego` · **resolved 2026-08-16**

- **`esa-date-picker` bound a `placeholder` browsers ignore, and an `aria-label` that beat its
  own visible label** · *Evidence:* `<input type="date">` ignores `placeholder` outright, so
  the prop appeared in the generated API table and did nothing. Separately,
  `aria-label=${label || 'Date'}` was set unconditionally, and a measured test shows
  `aria-label` on a date input BEATS an associated `<label for>` — so the visible label was
  being silently discarded. *Action:* `aria-label` only when there is no visible label, a real
  `<label for>` otherwise; `placeholder` kept (removing it is breaking) but now warns, per the
  house shim pattern · `lego` · **resolved 2026-08-16**

- **The axe audit is flaky on 13 pages, which matters because CLAUDE.md already warns it is
  weak** · *Evidence:* a run reported `document-title` and `html-has-lang` failing on 13
  `/foundations/*` pages. The built HTML for those pages contains both `lang="en"` and a
  `<title>`; a prior run of the same build reported neither rule. *Action:* none.
  *Sink:* `hub-fix` — the existing warning is that GREEN means little; flaky RED is the other
  half, because it trains people to ignore the report. Probably an audit-before-ready race in
  `scripts/a11y-audit.mjs`. *Priority:* medium.

- **Two findings deliberately NOT fixed, so they are not mistaken for oversights** ·
  *Evidence:* (1) neither option group does roving tabindex — every option is a tab stop, so a
  10-option radio group is 10 of them, and APG wants arrow-key navigation. That is a keyboard
  behaviour change, not validation wiring, and belongs with the deferred keyboard work
  alongside `esa-date-picker`'s missing keyboard handling. (2) `esa-select` and `esa-combobox`
  still lack `aria-controls` and `aria-activedescendant`, so their arrow-key highlight is
  announced to nobody — the listbox APG gap named in the accessibility skill's §6, which is a
  separate pass from this one. *Action:* none yet · `lego` · *Priority:* high for (2).

- **Recorded decisions, so nobody "upgrades" them later** · `aria-errormessage` stays unused —
  `aria-describedby` is the more robustly supported of the two today, per Roselli's testing.
  Client-side validation LOGIC stays out of the hub; spokes bring it, and this pass is what
  makes that contract real rather than nominal. Timing guidance is now house rule: validate on
  blur at the earliest, always also on submit, and never on keypress — JAWS and VoiceOver do
  not announce keypress-driven updates. No `optional` affordance exists; forms here are
  all-required. Nothing warns against `disabled` on a submit button, which it should.

## Source: the focus indicator pass (2026-08-16)

Fifth topic in the batched accessibility review, after contrast, touch targets, status messages
and form validation. Measured against the four criteria that govern focus indicators —
SC 2.4.7 (Focus Visible), 1.4.11 (Non-Text Contrast), 2.4.13 (Focus Appearance) and
2.4.11/2.4.12 (Focus Not Obscured). Every number below was run, not recalled.

- **Four components had DELETED the focus ring outright** · *Evidence:* `esa-entity-search`,
  `esa-search-panel`, `esa-command-palette` and `esa-combobox` each carried
  `.<input> { border: none; outline: none; }` on a BASE class — unconditional, so the ring was
  gone in every state. `grep -c ':focus'` was 0 in two of the four files. All four are Lit, so
  the shadow boundary stopped any page-level rule from reaching them, and all four are the
  SEARCH INPUT — the first thing a keyboard user lands on. A hard SC 2.4.7 failure.
  *Action:* the ring moved to the bordered row each chromeless input sits in, via
  `:focus-within` (matching the `esa-text-field` precedent for text entry) with an inset offset
  because the rows are full-bleed inside `overflow: hidden` panels · `lego` · *Priority:* done.

- **The guard could not see the shape the kit actually had** · *Evidence:* check-a11y's Check 4
  had two regexes and BOTH required `:focus` in the selector, so a reset on a base class matched
  neither. Verified by running the hook's own regexes against the literal rule: `focus-visible:
  false | focus: false => flagged: false`. Four for four, the removals that existed were the
  shape the guard was not written to catch — the same lesson as the `--form-*` miscount, where
  the query decided the answer. *Action:* Check 4c added (unconditional reset on a selector the
  same file proves lands on something tab-reachable), with two exemptions derived by sweeping all
  66 components and keeping only the true positives: a `:focus-within` ring in the file (the
  repair this rule recommends — without it the rule blocks its own fix) and a ring on the same
  class in a `:focus` state. Plugin 1.17.0 → 1.18.0 · `plugin` · *Priority:* done.

- **Three false positives in the EXISTING Check 4a, all on the files that get focus right** ·
  *Evidence:* the rule matched `:focus:not(:focus-visible) { outline: none }` — the standard
  backwards-compatible pairing — and matched a `:focus-visible` mentioned in PROSE above an
  unrelated `outline: none`, because `[^{]*` runs happily from a comment into the next rule. It
  also could not see that `esa-range-slider` moves its ring to the thumb pseudo-element. All
  three fired on `@esa/tokens/focus.css`, the one file whose entire job is getting this right.
  *Action:* comments stripped before the selector regexes run, `:not(:focus-visible)` normalised
  away, and a pseudo-element exemption added. 10 new regression tests · `plugin` ·
  *Priority:* done.

- **THE SPOKE-VISIBLE CHANGE — the ring is now two bands** · *Evidence:* a brand-coloured ring
  cannot be relied on to conform. The default measured **2.95:1** against the raised surface,
  2.88:1 canvas, 2.66:1 sunken — all short of 3:1, and only 3.03:1 against pure white, which the
  kit does not use as a surface. Worse, `--color-border-default-focus`'s own `$description`
  recorded that number as a WIN ("lifts focus-ring contrast from 2.32:1 to 2.95:1"), so anyone
  reading it concluded the ring was fine. It cannot be fixed by picking a better green either:
  whatever a spoke chooses for its brand is chosen for brand reasons. Both demo themes passed
  only by luck (beacon 5.04:1, qanat 5.63:1 — they picked darker brands), and the same audit
  found they override just **3 of 26** brand-derived semantic roles, so any "spokes must also
  override this" role would be forgotten exactly the way `--color-content-brand` already is.
  *Action:* identity and contrast split onto separate bands. New tier-2
  `--color-border-default-focus-halo` ({color.gray.12}) and tier-3 `--focus-ring-halo` +
  `--focus-ring-halo-spread`; 52 call sites now paint outline-then-halo. The halo is outermost,
  so it alone carries the 3:1 obligation: 15.9 / 15.5 / 14.3:1 against the three surfaces. This
  is the guidance's universal focus indicator with the brand kept as the inner band. **A spoke
  will see its focus ring gain a dark outer band.** No rename, so no `migrations.json` row;
  `token-names.json` re-snapshotted (1227) · `lego` · *Priority:* done.

- **Every form control lost its ring in forced-colors mode** · *Evidence:* `grep -rn
  'forced-colors|-ms-high-contrast|forced-color-adjust'` across `packages/` and `apps/` returned
  **zero hits**, while 14 components painted the ring as `box-shadow` after an `outline: none` —
  text-field, textarea, select, combobox, date-picker, checkbox, checkbox-group, radio-group,
  chip-group, button-toggle, input-tag, color-picker, file-upload, range-slider. Forced-colors
  replaces box-shadows with system colours and retains outlines; that is the whole reason the
  guidance prefers outlines. *Action:* two halves. A shared `@media (forced-colors: active)`
  block in `a11y.css` (bridged into shadow roots via `a11y.ts`, `!important` because components
  list it BEFORE their own styles), and the 19 box-shadow rings converted to outline + halo so
  they survive without needing the fallback at all. Six components had to be wired to the shared
  stylesheet · `lego` · *Priority:* done.

- **`esa-filter-dropdown` had three problems in one rule** · *Evidence:* `box-shadow: 0 0 0 1px
  var(--color-background-brand)` on `:focus` — 1px is half the area Focus Appearance asks for, it
  read the raw brand token so a spoke re-pointing `--focus-ring-color` left this one field
  behind, and `:focus` fired it on mouse. *Action:* rewritten to the house shape ·
  `lego` · *Priority:* done.

- **Nothing shipped a base focus rule to spokes** · *Evidence:* `@esa/tokens` exported
  typography, layouts, component-tokens and a11y — no rule that paints the ring — and `grep -rn
  focus packages/spoke-template/src` returned nothing. The light-DOM `.astro` components render
  bare anchors (`esa-breadcrumbs.astro:37`, `esa-link-column.astro:26,31`) with no focus styling
  of their own. The repo's ONE correct page-level focus rule lived in `packages/docs/src/
  DocsShell.astro` — a docs-site file spokes never receive. *Action:* new
  `packages/tokens/src/focus.css`, exported and imported by the spoke template; DocsShell and the
  hub site now consume it instead of the shell keeping its own copy · `lego` · *Priority:* done.

- **Focus Not Obscured was unaddressed** · *Evidence:* the docs shell has a 56px sticky topbar,
  and the only `scroll-margin` in the repo was `scroll-margin-top: 76px` on an `h2` rule —
  headings, not focusable elements. Tabbing to a control the browser scrolls to the top of the
  viewport put it under the bar. *Action:* `focus.css` sets `scroll-margin-block-start` from
  `--focus-scroll-margin`, defaulting to 0 so it is inert until a layout with sticky chrome opts
  in; DocsShell sets 76px · `lego` · *Priority:* done.

- **Focus was documented nowhere, by either skill** · *Evidence:* no `/foundations/focus` page,
  and `grep -i focus` in `plugins/spoke-kit/skills/design-principles/` returned **zero hits** —
  even though `skills/accessibility/SKILL.md:179` names design-principles as the owner of
  "focus-ring visuals". Neither skill owned it. *Action:* new `/foundations/focus` (the two-band
  recipe, the five tokens, outer vs inner rings, the forced-colors rule, the light-DOM/shadow-DOM
  split, and a criterion-by-criterion table) plus a focus section in design-principles ·
  `docs` · *Priority:* done.

- **Measured and found NOT to be a problem, recorded so it is not re-opened** · *Evidence:* the
  three inner rings (`outline-offset: -2px` on the command-palette item, tab and dropdown-menu
  item) were flagged as possibly under Focus Appearance's minimum area. They are not. At
  `outline-offset: -2px` with a 2px width the outline's OUTER edge lands exactly on the border
  edge, so the ring rectangle is W×H and its area is `4W + 4H - 16` — short of the `4W + 4H`
  formula by a constant 16px², the four corner squares, which the criterion's own definition of
  perimeter ("not including shared pixels") already discounts. They meet it at any size.
  *Action:* none · *Priority:* n/a.

- **Deliberately NOT done, so they are not mistaken for oversights** · *Evidence:* (1) the ring
  stays BRAND-coloured rather than becoming the plain black-and-white universal indicator — a
  spoke's ring is part of its identity, and the halo is what makes keeping it safe. (2) No
  `:focus-visible` polyfill; there is no IE support anywhere in this repo and the
  `:focus:not(:focus-visible)` pairing in `focus.css` is the whole backwards-compat story.
  (3) `esa-dialog` and `esa-side-dialog` keep `outline: none` on their programmatically-focused
  panels, which is the OPPOSITE of the call `esa-error-summary` makes with a written rationale.
  Check 4c deliberately does not adjudicate it: `tabindex="-1"` means the element is unreachable
  by Tab, so whether a ring should paint on programmatic focus is change-of-context judgment, not
  something provable from source. Worth settling one way in a later pass · *Priority:* low.

- **Found by the new guard, outside this pass's scope** · *Evidence:* `esa-color-picker`,
  `esa-input-tag` and `esa-range-slider` each still render a `<label>` inside their shadow root
  that names nothing — no `for=`, no `id=` for an `aria-labelledby` reference, and no labelable
  control wrapped. This is the forms-pass rule (`forms.md`) firing on components that pass did
  not reach. *Action:* none taken here — it is naming work, not focus work · `lego` ·
  *Priority:* high.

- **axe is blind to all of this** · *Evidence:* `npm run a11y` reports nothing about focus
  indicators — not their presence, not their contrast, not their size. It stayed green through
  four deleted rings and a kit-wide forced-colors failure. *Action:* none possible; the note
  belongs next to CLAUDE.md's existing "treat green as evidence of nothing much" ·
  *Priority:* n/a.

---

## Source: the forced-colors audit (2026-08-16)
Windows Contrast Themes (`@media (forced-colors: active)`) — ~4% of Windows machines, the
platform's most-used inbox AT; WebAIM's Low Vision Survey puts high-contrast-mode use at
51.4% of respondents. The mode force-adjusts every colour property to a user-chosen system
palette and **deletes** `box-shadow`, `text-shadow`, and every non-`url()` `background-image`.
It reads the **HTML element, never the ARIA role**.

Baseline: `forced-colors`, `forced-color-adjust`, `-ms-high-contrast` and every CSS
system-colour keyword (`Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `ButtonFace`,
`ButtonText`, `GrayText`, `LinkText`) appear **0 times** across all 66 components, both token
packages and `apps/site`. Every finding below is therefore unmitigated.

Numbers re-measured from source for this entry, not carried over from the first sweep — the
first pass reported 15 broken focus rings by reading `outline: none` and stopping, missing the
real `outline` two declarations below it in the same rule. The true count is 0.

- **Focus rings already survive — the earlier focus pass fixed this before it was framed as a
  forced-colors problem** · *Evidence:* zero components ring focus with `box-shadow` alone. Ten
  (`esa-checkbox`, `esa-checkbox-group`, `esa-radio-group`, `esa-button-toggle`, `esa-chip-group`,
  `esa-color-picker`, `esa-combobox`, `esa-dialog`, `esa-file-upload`, `esa-range-slider`) carry a
  redundant `outline: none` immediately above a real `outline` in the same rule — dead code, no
  behavioural effect. *Action:* the redundant line could be dropped in the batched pass · `hub-fix` ·
  *Priority:* low.

- **Eleven surfaces have no boundary at all once shadows are deleted** · *Evidence:* a rule with a
  real `box-shadow` + a `background` and no real `border`: `esa-dialog` `.esa-dialog`,
  `esa-confirm-dialog`, `esa-side-dialog` `.panel`, `esa-search-panel` `.panel`, `esa-tooltip`
  (the file contains zero `border:` declarations), `esa-snackbar-item`, `esa-back-to-top` `.button`,
  `esa-switch-toggle` `.thumb`, `esa-button-toggle` `.option--selected`, `esa-sidebar-nav`
  `.link--active` (an *inset* box-shadow used as the active marker), `esa-tab-layout` pill/segmented
  `.tab--active`. Overlays merge into the page; the switch thumb disappears into its track, taking
  on/off with it. *Action:* `border: 1px solid transparent` — force-adjusted to a visible colour,
  costs nothing in normal mode · `hub-fix` · *Priority:* high.
  **NOT in this list, and worth recording:** `esa-card--elevated` sets `--_card-border: transparent`
  against a real `border: 1px solid var(--_card-border)`, so it is **already correct** — a
  transparent border is force-adjusted to a visible one. That is the fix, already shipped once.

- **The kit's only gradient is load-bearing** · *Evidence:* `esa-range-slider` paints its value fill
  with `linear-gradient(to right, brand 0 var(--fill-percent), border-default var(--fill-percent) 100%)`.
  Non-`url()` `background-image` is forced to `none`, so the slider always reads empty. The thumb
  survives (real 2px border). *Action:* a real filled child element, or expose the numeric value ·
  `lego` · *Priority:* high.

- **Eight widgets are ARIA on a non-native element, so they get no system styling** · *Evidence:*
  `<span role="checkbox">` (`esa-checkbox`, `esa-checkbox-group`), `<span role="radio">`
  (`esa-radio-group`), `<div role="button">` dropzone (`esa-file-upload`), `<div role="option">`
  (`esa-select`, `esa-combobox`, `esa-filter-dropdown`), `<div role="progressbar">`
  (`esa-progress-bar`). Plus `esa-button.astro`, which strips `href` from its `<a>` when disabled —
  an anchor with no href is not a link element, so it forfeits `LinkText` too. None of these receive
  `ButtonFace`/`ButtonText`/`GrayText`/`Highlight`. *Action:* explicit system-colour pairs under the
  media query, or move to the native element · `lego` · *Priority:* high.

- **Colour is the only channel for several states** · *Evidence:* selected `[role=option]` in
  `esa-select`/`esa-combobox` is background+colour only (the checkmark renders **only** when
  `multiple`); `esa-badge` dot mode renders no text at all — six variants are one 8×8 circle
  distinguished purely by `--_badge-bg`; `esa-progress-bar` fill vs track is background-only with no
  border on either, so every severity variant and every value look identical; `esa-pill`,
  `esa-danger-zone` and `esa-stat` differentiate by colour alone. *Action:* a second channel — glyph,
  weight, or border-width (width is not force-adjusted; colour is) · `lego` · *Priority:* high.

- **Colour that IS content is not opted out** · *Evidence:* `esa-color-picker` paints both the
  preview and every swatch with an inline `style="background-color: ${…}"` (lines 113 and 135), so in
  forced colors every swatch renders identically and no colour is selectable. This is the one case
  where `forced-color-adjust: none` is *correct* — better still, an inline `<svg>` with a `<title>`,
  which is exempt from force-adjustment and supplies an accessible name at the same time ·
  `lego` · *Priority:* medium.

- **Already right, so nobody re-does it** · *Evidence:* **64/64** inline SVGs use
  `stroke="currentColor"` with `fill="none"` and there are **zero** hardcoded icon colours in the
  component library — icons inherit the force-adjusted text colour for free. **0** `text-shadow`
  anywhere. `esa-alert-box`, `esa-snackbar-item`, `esa-field-error` and `esa-error-summary` each ship
  a distinct per-variant glyph, so severity survives when the tint does not. 10 of 19 floating panels
  already carry a border. *Action:* none · *Priority:* n/a.

- **Disabled is dimmed, not signalled** · *Evidence:* 8 components put `aria-disabled` on a non-native
  element (no `GrayText`); 16 express disabled with `opacity`. `opacity` is **not** force-adjusted, so
  the dimming does survive — but a custom grey (`--color-content-disabled`) does not, and collapses
  onto the same system colour as enabled text. *Action:* add `color: GrayText` under the query where
  the native attribute is not available · `lego` · *Priority:* medium.

- **The `prefers-reduced-motion` precedent does not transfer, and that is the architectural finding** ·
  *Evidence:* reduced motion is handled once, at the token layer, by a generated `:root` block
  (`packages/tokens/build.js`). Forced colors overrides at the **used-value** layer, downstream of every
  token — no token value can bring `box-shadow` back. All 34 Lit components render into a shadow root
  and **none** opts out (`createRenderRoot`: 0 hits repo-wide), so no global block reaches them either.
  Rules must live inside each component's own `static styles`. The consolation: ~25 of the ~40 fixes
  need no media query at all — a real `outline`, a transparent border and a persistent underline are
  simply better default CSS. *Action:* do not look for a central lever; there isn't one · `process` ·
  *Priority:* n/a.

- **Shipped in this pass** · *Evidence:* `check-a11y` gained **check 9** — a focus ring painted only
  with `box-shadow`, with no `outline` on the same rule, no outline ring on the same class elsewhere,
  and no `forced-colors` block in the file. Swept over all 66 components: **0 flagged, 0 false
  positives**, so it lands as a ratchet against regression rather than a cleanup. 8 regression tests in
  `scripts/lib/check-a11y.test.mjs`. New skill reference `forced-colors.md`, linked from SKILL.md §6 and
  `cross-stack-porting.md`. *Action:* done · `workflow` + `skill` · *Priority:* n/a.
  Implementation note worth keeping: value tests read **declarations**, never
  `/outline\s*:\s*(?!none\b)/` — `\s*` backtracks to zero width, the lookahead lands on `" none"`
  instead of `"none"`, and `outline: none` reports as a real ring. That bug made the first draft of the
  rule silently inert. The same shape exists today in check 4's `hasRingAlternative` (line ~301).

- **axe cannot see any of this** · *Evidence:* axe-core has no forced-colors rule, so `npm run a11y`
  reports clean on a page that is unusable in a contrast theme. This is the third thing it cannot do,
  after name quality and live-region liveness. *Action:* none possible; verification is a Windows VM or
  Edge DevTools ▸ Rendering ▸ *Emulate forced-colors* · *Priority:* n/a.

### Remediation — same day (2026-08-16)

**Two corrections to the entry above before the work is described.** First, the
"0 occurrences" baseline was stale by the time it was written: commit `7919570` added a
forced-colors focus fallback to `packages/tokens/src/a11y.css`, so the focus layer was
already solved. Second, the "15 components ring focus with box-shadow" figure was wrong —
it came from reading `outline: none` and stopping, missing the real `outline` two
declarations below in the same rule. The true count was 0. Re-measure before recording.

- **24 components now carry a `@media (forced-colors: active)` block** · *Evidence:*
  every fix is inside the query, because adding borders unconditionally is not layout-safe
  here — only `esa-sidebar-nav` has a `box-sizing` reset in its shadow root, `esa-back-to-top`
  is a hard 44×44 (the 2.5.5 floor), and `esa-switch-toggle`'s checked-thumb
  `left: calc(--_track-w - --_thumb - 2px)` breaks outright when the track gains a border
  (the block re-declares it at `-4px`). Normal rendering is unchanged. · `lego` ·
  *Priority:* n/a.

- **Borders where the shadow was the only edge** · dialog, confirm-dialog, side-dialog,
  search-panel, tooltip, snackbar-item, back-to-top. The tooltip's arrow is `display: none`
  in the query rather than bordered — it is a rotated 8px square, so a border renders as a
  diamond floating outside the bubble. `esa-card--elevated` needed nothing: its
  `border: 1px solid transparent` is already the canonical fix.

- **Fills where a border would shift siblings** · `esa-button-toggle .option--selected`,
  `esa-tab-layout` segmented/pill `.tab--active` (+ the underline `::after`, which is a
  background-painted box and flattens too), `esa-sidebar-nav .link--active`. All three are
  intrinsically-sized children in a row, so `Highlight`/`HighlightText` rather than an edge.

- **A normal-mode bug fixed on the way past** · *Evidence:* in `esa-select`/`esa-combobox`,
  `.option--selected` is declared after `.option--active` at equal specificity, so the
  keyboard cursor disappeared whenever it landed on the selected row — in full colour, not
  just forced colors. They now use different channels (fill vs inset outline) and compose.
  The checkmark also no longer renders only when `multiple`; single-select selection was
  background-colour-only, which was an SC 1.4.1 failure in every mode. · `lego` ·
  *Priority:* n/a.

- **Two opt-outs, both because the colour IS the content** · `esa-color-picker`'s preview
  and swatches, and `esa-filter-dropdown`'s per-option colour dot. The color-picker opt-out
  fixes selection twice over: its base `.swatch` is `border: 2px solid transparent`, and
  without the opt-out forced colors would make every swatch's border visible — the same
  border `--selected` uses to mark itself.

- **The gradient** · `esa-range-slider` opts its track pseudo-elements out and re-states the
  fill in `Highlight`/`Canvas` rather than keeping brand green, so it uses the user's own
  palette. **`forced-color-adjust: none` on a UA pseudo-element is unverified** — it needs a
  real contrast theme. Safe to ship because `showValue` defaults to true and `.value` is
  real text, so the number survives either way.

- **Deliberately NOT repaired, so it is not mistaken for an oversight** · `esa-badge` dot
  mode and `esa-progress-bar` variants both encode severity in one background colour, and
  there is no system keyword that means "warning" — painting the warning dot `Highlight`
  would announce SELECTED, a different lie from the one we started with. Instead: the badge
  gained a `label` prop rendering visually-hidden text (dot mode had no accessible name at
  all), `showValue` now defaults to `true` on the progress bar, and both are made visible.
  Same for `esa-dropdown-menu --danger`: no glyph channel exists (the `icon` string renders
  an anonymous bullet), so the item's LABEL has to carry the warning. `esa-pill`,
  `esa-danger-zone` and `esa-stat` keep real borders and literal text and were left alone.

- **Links** · the one query-free change: `text-decoration: none` → `text-decoration-color:
  transparent` in `esa-file-list`, `esa-breadcrumbs` and `esa-link-column` (×2).
  `text-decoration-color` IS force-adjusted, so the underline returns in forced colors and
  nothing moves in normal mode. `esa-link-column` was the worst case in the kit — both the
  heading and the list items use `color: inherit`, so a linked and an unlinked item were
  pixel-identical at rest in *every* mode, with a hover underline as the only tell.

- **Two orphaned `<label>`s fixed because the gate blocked the work** · *Evidence:*
  `check-a11y`'s label rule blocked edits to `esa-range-slider` and `esa-color-picker` — a
  true positive from the forms pass, not a false one. The slider now uses `for`/`id`; the
  colour picker's heading became a `<span>` with `role="group"` + `aria-labelledby`, since
  it names three controls and `<label>` was the wrong element for that. `esa-input-tag`
  still has one. · `lego` · *Priority:* high.

- **`apps/site` was missing `a11y.css`** · *Evidence:* `packages/spoke-template` has
  imported it since it was written; the hub's own BaseLayout imported only `focus.css`. So
  `.visually-hidden` and the forced-colors focus fallback reached every spoke and none of
  the specimen pages teams copy from. Fixed. · `hub-fix` · *Priority:* medium.

- **Not done: 15 Lit components still do not import `a11y`** · *Evidence:* measured, then
  judged not worth it — every one of them already paints a real `outline`, which forced
  colors force-adjusts correctly on its own. The `a11y.css` fallback only rescues a
  box-shadow-only ring, and there are none. Adding 15 copies of a rule that changes nothing
  is cost without benefit. Revisit only if a component regresses. · *Priority:* low.

## Source: accessible names, the form-validation pass's tail (2026-08-16)

Opened by a single loose end from the focus pass — three components whose `<label>` the hook
said "names nothing" — and settled by measuring instead of reading: Chrome's own accessibility
tree, via CDP `Accessibility.getPartialAXTree`, over the built site, for every form-associated
control in the kit. The measurement contradicted the static reading three times, which is the
entry's main point.

- **Two controls were named by their PLACEHOLDER, not their label** · *Evidence:*
  `esa-input-tag` showed visible label "Tags" against accessible name **"Add a tag"**;
  `esa-color-picker`'s hex field showed "Brand color" against **"#000000"**. Both had a visible
  `<label>` with no `for`, so the browser fell through to the placeholder. This is **SC 2.5.3
  Label in Name (Level A)** — a speech-control user saying "click Tags" matches nothing — and it
  is invisible to axe, whose `label` rule a placeholder satisfies. On the input-tag page axe
  flagged exactly ONE element: the disabled specimen, whose placeholder happens to be empty.
  *Action:* the `<label for>` + `id` pairing the six passing controls already use (Chrome reports
  their name source as `relatedElement`). It also makes the label clickable, which no
  `aria-label` does · `lego` · *Priority:* done.

- **Three option sets had no accessible name at all** · *Evidence:* `esa-checkbox`,
  `esa-checkbox-group` and `esa-radio-group` each render `<label>` wrapping
  `<span role="checkbox">` / `<span role="radio">`. A `<label>` associates only with a LABELABLE
  element and an ARIA role does not make a span into one, so every option measured
  `name=""` with no name source. The group was named by its legend and the choices inside it
  were not — the user is told what is being asked and not what the answers are.
  *Action:* `aria-labelledby` from each role element to its own text span, ids indexed for
  uniqueness within the root · `lego` · *Priority:* done.

- **`esa-color-picker` exposed two unnamed controls, not one** · *Evidence:* the swatch measured
  `role=ColorWell name=""`, and the group's `aria-labelledby` does not reach it — a group name
  does not name its members. *Action:* both inner controls take an `aria-label` that REPEATS the
  visible label ("Brand color color swatch" / "Brand color hex value"). Verbose beside the group
  name, and deliberate: 2.5.3 is about what the user can see and say · `lego` · *Priority:* done.

- **THE HOOK GAP, and why the synthetic test lied** · *Evidence:* a synthetic
  `<label>…<span role="checkbox">…</label>` WAS caught by check-a11y; the three real files were
  not. The exemption that let them through is "a CALL in an interpolation may return a control we
  cannot see" — and the call was `aria-checked=${String(this.checked)}`. A `String()` in an ARIA
  attribute bought a blanket pass for the whole label. *Action:* a `<label>` wrapping an element
  with a non-labelable interactive role is now decided BEFORE the content exemptions: unnamed is
  a violation no interpolation can excuse, and `aria-label`/`aria-labelledby` on that element is
  what clears it — the guard has to accept its own recommended fix or it gets ignored. Four
  regression tests · `plugin` · *Priority:* done.

- **A new check, because axe cannot ask this question** · *Evidence:* axe asks "is there a
  name?"; the 2.5.3 half needs "is it the RIGHT one?" *Action:* `scripts/a11y-names.mjs` — serves
  the build, drives Chromium, reads each control's name from the accessibility tree and compares
  it to the host's visible `label`. Reports `NO NAME` (4.1.2) and `MISMATCH` (2.5.3) separately;
  `--strict` gates. Two traps it encodes because both cost a run: the production `base` is
  `/ecology/`, so a server that does not strip it 404s every asset and the audit reports zero
  controls from a page that never hydrated; and a full 66-page sweep exceeds two minutes ·
  `docs` · *Priority:* done.

- **Two false positives I generated and had to retract** · *Evidence:* (1) `esa-file-upload`'s
  `input[type=file]` is `display: none`, so it measures `ignored=true (notRendered)` — not in the
  accessibility tree, therefore "no name" is true and meaningless. The real control is the
  `role="button"` drop zone, correctly named from its contents. The script now skips ignored
  nodes. (2) The first version compared every control to the host label, which flagged eight
  correct option sets — `esa-radio-group`'s "Low" against the group's "Priority", and the same
  for `esa-chip-group` and `esa-button-toggle`. A host with MANY controls is a group: its label
  names the group, its members carry their own text. The script now only compares when a host
  owns exactly one control. *Action:* both encoded in the script rather than remembered ·
  *Priority:* n/a.

- **Correction to the focus-pass entry above** · It records this as three components with a label
  defect and high priority. It was **six controls across five components**, split across two
  different criteria, and `esa-range-slider` was never one of them — it is named by `aria-label`
  and was a hook false positive. Final state: 28 exposed controls measured, all named, every name
  containing its visible label.

- **The component count was 66 everywhere and has always been 65** · *Evidence:*
  `ls packages/ecology/src/components | wc -l` returns 66; the 66th entry is
  `icon-registry.ts`, which is not a component and is named in `EXCLUDE` in
  `apps/site/src/data/catalog.ts` for that reason. `componentCount` — regex-matched
  `esa-*.{astro,ts}` — has rendered **65** on `/components` the whole time, so the site and
  the prose disagreed in public. "66" entered `CLAUDE.md` in `7919570` (2026-08-16), the
  same commit that added `esa-error-summary.ts` and took the FILE count from 65 to 66;
  `git ls-tree` at `7919570^` confirms 65 files / 64 components, and at `7919570` 66 files /
  65 components. Nothing was ever deleted to explain a drop — `git log --diff-filter=D` over
  `esa-*` is empty across the repo's history. CLAUDE.md also contradicted itself twice while
  it stood: it says "all 34 Lit components" and there are 31 `.astro` (34 + 31 = 65), and it
  says "every one of the 66 (+3 reference wrappers) still has a doc page" against 68 doc
  pages on disk (65 + 3). Two derived numbers went with it: "28 of 66 components own a
  namespace; the other 38" is 28 + 38 = 66, both halves back-derived from the wrong total —
  the site's own `themingSurface` (`scope === 'exclusive'`, which is what the doc pages
  render) gives **32 of 65**, the other 33. The independently-verified numerators were fine:
  55 components read a tier-3 hook, 116 tier-3 declarations, 24 carry a `forced-colors`
  block. *Action:* corrected in `CLAUDE.md` with the cause recorded inline, so the next
  reader does not re-derive 66 from `ls | wc -l`. Dated entries in this ledger and in
  `docs/typography-migration-log.md` still say 66 and were deliberately NOT rewritten —
  they record what was measured at the time, and falsifying a log to fix a number is the
  worse trade. Note some nearby 66s are a different quantity entirely (66 `--typography-*`
  composites) and are not affected · `docs` · *Priority:* done.

---

## Source: the accessibility assurance profile (2026-08-16)
> **RENAMED 2026-08-18: the attribute is `data-a11y-assurance`, not `data-assurance`.**
> Every occurrence in this file has been rewritten to the current name so a grep returns
> one answer rather than two. No `migrations.json` row exists or can: the four kinds are
> `token`, `class`, `prop` and `component`, and an HTML ATTRIBUTE is none of them. It was
> safe to rename outright because it was two days old and **no spoke had adopted it** —
> verified by grep across every spoke checked out on this machine. `doctor.mjs` reads the
> profile names out of `dist/tokens.css`, so it reports the new name automatically. The
> CLI flag stays `--assurance <profile>`; it names the axis, not the attribute.

A third document-level axis, `data-a11y-assurance`, orthogonal to `data-theme` (brand) and
`data-scheme` (light/dark), letting a project with a conformance obligation opt into
defaults that are confirmed rather than asserted. Authored in
`packages/tokens/src/assurance.css`, appended into `dist/tokens.css` by `build.js`,
inert unless the attribute is set. Contract in `SPEC.md` § "Assurance is a SEPARATE
AXIS from the theme".

- **The seven AA text-contrast failures are answered, as ONE decision** ·
  *Evidence:* the batched pass recorded seven failures and noted six shared a cause —
  near-white on a Radix step 9 fill — and that fixing them one at a time would produce
  seven answers. It is now one rule: under assurance a solid fill that carries text
  uses **step 11**. `check-contrast.mjs --hub` reports 7 failures; with
  `--assurance wcag-aa`, 0. *The alternative was measured and rejected:* keeping the
  step-9 fill and flipping the foreground dark (what grass-8/lime-9/yellow-9 already
  do) fails on every scale in the set — step 12 on step 9 is 3.99 grass, 3.91 orange,
  3.45 copper, 3.87 blue, 3.18 red. Mid fills are too light for white and too dark for
  black; only moving the fill works. Accent needs step **12**, not 11: orange-11 lands
  at 4.40:1 against gray-1, because Radix tunes step 11 against its own warm step 2 and
  pure-ish gray-1 is colder. *Sink:* `hub-fix`. *Priority:* done.

- **Re-pointing `--color-background-brand` fixed four rows at once** · *Evidence:*
  `--color-content-link`, `--color-border-default-focus` and the 3:1 brand-on-raised UI
  check all derive from it, so one declaration cleared all four. Recorded because the
  obvious implementation — four separate re-points — would have been four chances to
  move three and miss one. *Sink:* `hub-fix`. *Priority:* done.

- **`--touch-target-min` stated a constant and enforced nothing** · *Evidence:* it held
  44px and was read by **zero** components, while checkbox (14/16/20px), radio
  (14/16/20px) and switch (16/18/22px) shipped hardcoded px under the AA floor. Its own
  description called it "a role, not a ramp step" — the right instinct filed against the
  wrong mechanism; a role nothing reads is a comment with `var()` syntax. *Action:*
  removed (`touch-target-min-to-target-size-min`) and replaced by `--target-size-min`,
  declared 0px and re-pointed to 24px by the profile. Not aliased, deliberately: 44px is
  a CONSTANT and the new name is a LEVER, so aliasing would have shipped a 44px floor to
  every default build the day readers landed. *Sink:* `hub-fix`. *Priority:* done.

- **Target size went from 33 component failures to 0** · *Evidence:*
  `check-target-size.mjs --scope components --strict` measures 11,046 rendered targets
  across 88 pages; default reports 33 failures across 7 components (esa-input-tag,
  esa-checkbox, esa-chip-group, esa-checkbox-group, esa-radio-group, esa-range-slider,
  esa-file-list), and `--assurance wcag-aa` reports 0. *Two things this surfaced that
  static reading would not have:* (1) the floor belongs on the **label row**, not the
  glyph — measuring `[role="checkbox"]` reported esa-checkbox and esa-radio-group as
  failures while the row was already 24px+, i.e. reported the correct implementation as
  the defect; (2) `esa-pill__remove` was fixed by growing the real box rather than an
  `::after` overlay, because pills sit shoulder to shoulder and invisible 24px targets
  would overlap, trading one 2.5.8 failure for a worse one. *Sink:* `lego`.
  *Priority:* done.

- **axe is NOT blind to target size, and this header said it was until it was measured** ·
  *Evidence:* the belief that motivated `check-target-size.mjs` was "axe-core has no
  target-size rule". It does — axe 4.13 ships `target-size`, it is inside the `wcag22aa`
  tag `a11y-audit.mjs` already runs, and it reads shadow roots. Run directly against
  `/components/esa-pill/` and `/components/esa-input-tag/` — pages where the new tool
  reports genuine 16×16 controls — axe returns **0 violations, 0 incomplete, all passes**.
  The reason is the **spacing exception**: SC 2.5.8 passes an undersized target whose
  24px-diameter circle does not overlap a neighbour's, and axe implements it faithfully.
  Those buttons are small but well spaced, so they conform. *Action:* the script's header,
  `CLAUDE.md` and the script's own stdout now state that it measures RAW SIZE with no
  spacing exception, so a finding is a measurement and not a proven violation. The tool
  still earns its place, for a reason worth keeping: conformance *via* the spacing
  exception is a property of the LAYOUT, not the component — move a control nearer its
  neighbour, or narrow a container, and a passing page starts failing with no code change.
  A component that is 24px on its own cannot regress that way. *Sink:* `hub-fix` —
  filed as a finding because the wrong claim was written into three files first and only
  caught by running the thing. *Priority:* done.

- **107 target-size failures remain in the SITE's own chrome, and are not gated** ·
  *Evidence:* prose links in `apps/site` and `<summary>` rows on the debug pages. These
  are the hub's documentation, not the kit a spoke installs. `--scope components`
  narrows only the EXIT CODE, never the report, and the run prints both counts — a
  visible flag rather than a silent carve-out, because a gate that can never go green
  gets bypassed. *Action:* none yet. *Sink:* `docs`. *Priority:* low.

- **The profile does NOT beat a spoke's theme, and that is the design** · *Evidence:*
  `[data-theme]` and `[data-a11y-assurance]` have identical specificity (0,1,0) and a
  spoke's theme loads later, so a re-pointed brand wins. Verified in the browser:
  `data-theme="beacon" data-a11y-assurance="wcag-aa"` yields brand `#1f7a6d` (beacon's) with
  `--target-size-min: 24px` (the profile's). The gate is what catches the gap —
  `check-contrast.mjs beacon.css --assurance wcag-aa` still fails
  `content-on-brand-secondary` at 3.64:1. *Sink:* recorded, not a defect. *Priority:*
  resolved.

- **`check-contrast.mjs` silently reported hub defaults as clean for one build** ·
  *Evidence:* `parseDeclarations` swept every `--name: value;` regardless of selector,
  which was safe while `:root` was the only top-level block (P3 and reduced-motion are
  at-rules and were already stripped). The moment the assurance block was appended —
  last, so last-one-wins — `--hub` went from 7 failures to "All text pairs pass AA" with
  no code change and no warning. *Action:* the parser is scope-aware now; an assurance
  block is read only when the caller names the profile, a typo'd name is a hard error
  listing what exists, and the header prints the active profile. **This is the third
  time this script's inputs have quietly stopped describing what it reports on** — the
  @media-in-a-comment bug and the deleted-token bug were the other two. *Sink:*
  `hub-fix`. *Priority:* done.

- **`${...}` in a comment inside a Lit `css` template is an INTERPOLATION** ·
  *Evidence:* a forced-colors comment in `esa-filter-dropdown.ts` read
  `'background:${option.color}'` as illustrative text; `option` does not exist at module
  scope, so the module threw `option is not defined` at runtime, the element never
  upgraded, and `/components/esa-filter-dropdown/`, `/components/esa-filter-container/`
  and `/patterns/list-filters/` rendered nothing. **The build stayed green** — it is
  valid JavaScript. Found only because `check-target-size.mjs` inherited a11y-audit's
  hydration guard, which flagged 3 pages and voided its own numbers. This is the same
  family as the known backtick trap but a distinct trigger: a backtick ENDS the literal
  and usually breaks the build loudly, whereas `${` compiles fine and fails at runtime.
  *Action:* fixed by rewording. *Sink:* `hub-fix`. *Priority:* done — but the guard is
  the finding: without it this was invisible.

- **THE TARGET-SIZE FLOOR WAS WITHDRAWN THE DAY IT LANDED, and the reason is a design
  rule worth more than the fix** · *Evidence:* `--target-size-min` (0px default, 24px
  under `[data-a11y-assurance]`, read by 12 components as `min-block-size` on their hit area)
  cleared every technical objection — a `min-*` raises the bottom and never caps the
  top, so unlike `--control-height-*` it cannot clip rem text (1.4.4), and it was
  verified to still double at 200% root font size. It measured 33 component failures →
  0. It was withdrawn anyway: under the profile, `xs` and `sm` rendered at the SAME
  height on chip-group, checkbox-group and radio-group. **The bottom of the ramp
  silently collapsed**, `size="xs"` stopped meaning xs, and the author who wrote it was
  never told. *The rule that came out of it:* a colour role is a VALUE and re-pointing
  it is what a theme layer is for; a size step is a CONTRACT, and a profile that
  redefines one lies to every call site that chose it. **A profile moves colours and
  type rungs, never geometry.** *Action:* floor removed from all 12 components;
  `--target-size-min` deleted; `--touch-target-min` (44px, tier 2, zero readers)
  RESTORED, since the lever that justified removing it no longer exists and a dangling
  `to` in a migrations row is worse than an inert constant. Replaced by
  `scripts/check-size-usage.mjs`. *Sink:* `hub-fix`. *Priority:* done.

- **The size lint is measured, not declared — and it found what the floor would have
  hidden** · *Evidence:* `check-target-size.mjs --emit-floors` renders the specimen site
  and writes `packages/tokens/size-floors.json` (11,857 targets across 91 routes), which
  `check-size-usage.mjs` lints source against. Nothing hardcodes which steps are too
  small, so a padding or type-rung change updates the lint on re-measure. Run against
  `apps/site/src`: **68 call sites, 39 of them with NO size attribute** — every component
  defaults to `md`, so a bare `<esa-checkbox>` is a finding that `grep size="xs"` cannot
  see. *The finding that matters:* `esa-checkbox`, `esa-input-tag` and `esa-range-slider`
  are under the floor at their **default** step, so no call-site change fixes them —
  they need a size variant that clears 24px. A silent floor would have patched over that
  and left the gap invisible. *Action:* the three components need a size variant. *Sink:*
  `lego`. *Priority:* medium.

- **`check-target-size.mjs` is deliberately NOT in the `a11y:assured` gate** ·
  *Evidence:* it measures RAW size with no spacing exception, so it over-reports against
  the letter of SC 2.5.8 (axe, which implements the exception, passes the same controls).
  Gating on a tool that flags conformant markup produces a gate people bypass. The gate
  runs the actionable size LINT instead, which is derived from the same measurement.
  *Sink:* recorded. *Priority:* resolved.

- **The TYPE floor was withdrawn too, and it is the more instructive of the two** ·
  *Evidence:* after the target-size floor was pulled, the profile still re-pointed the
  eight `2xs` typography composites one rung up (`--font-size-050` → `-100`) to kill 8px
  text. It contained no geometry token at all, which is exactly why it looked safe. A
  box follows its contents: `esa-chip-group` measured `{xs:20, sm:22}` by default and
  `{xs:22, sm:22}` under the profile — the same ramp collapse — and geometry moved on 9
  of 25 routes. **"It is only typography" is not a defence.** *The generalised rule,
  now stated as absolute in three places:* the test is not which token you touched, it
  is whether any component RENDERS differently. A profile changes colour. *Action:* the
  eight declarations removed; the profile is now 13 colour roles plus
  `--focus-scroll-margin` (a scroll offset, which cannot reflow anything). *Verified:*
  geometry is byte-identical with and without `[data-a11y-assurance]` across **85 of 91**
  routes, and the other 6 are unstable frame-to-frame WITHOUT the profile too — a
  control run confirmed they carry spinners, progress bars and transitions, so the
  difference is animation, not the profile. *Sink:* `hub-fix`. *Priority:* done.

- **"Guide to the compliant option, or build one" — the two-answer rule** · *Evidence:*
  the standing temptation each time was to make an existing size step bigger. That is
  never an answer; there are exactly two. (1) A compliant option ALREADY EXISTS → guide
  to it: `esa-checkbox`, `esa-input-tag` and `esa-range-slider` fail at `xs`, `sm` AND
  their default `md`, but `lg` clears the floor, so `check-size-usage.mjs` names `lg`
  and flags every call site that omits a size (39 of 70 in the hub's own site). (2) It
  does NOT exist → build a real variant; the script reports that case in a separate
  block because no call-site edit can fix it, and it is currently EMPTY — every
  component in the floor map has at least one compliant step. *Sink:* recorded.
  *Priority:* resolved.

---

## Source: the neutral core colour (2026-08-18)

The theme maker was supposed to let a spoke choose its neutral. It offered three of six,
and the ramp it generated was called `gray` whichever one you picked.

- **THE PICKER OFFERED HALF THE OPTIONS, and nothing could see that it did.**
  `theme-maker.astro` hardcoded a three-entry `NEUTRALS` array beside the imported
  `NEUTRAL_TEMPERATURES` it should have derived from. `mauve`, `sage` and `olive` had
  curves, primitives, CLI flags and validation — they were generated, gradeable and
  completely unreachable from the editor. *Evidence:* swept all six × three brands through
  `deriveTheme` + `auditPairs`: identical shapes (114 light / 111 dark) and identical
  grades, 60/60 checked pairs in both schemes. The three "new" ones were never risky; they
  were just invisible. *Action:* the page derives its list, and a test asserts its prose
  map covers `NEUTRAL_TEMPERATURES`. *Sink:* `hub-fix`. *Priority:* resolved.

- **THE RAMP'S NAME WAS A LIE FOR FIVE OF THE SIX.** `theme-beacon.css` is a `cool` theme
  and shipped `--beacon-gray-7: #cdced6`, which is Radix **slate**-7. The only clue in the
  file was the word "cool" in a header comment. *Action:* `--<scope>-neutral-*`, a role
  name parallel to `--<scope>-brand-*`. Naming it after the resolved scale
  (`--beacon-slate-*`) was rejected: it makes a NAME a function of a SEED, so switching
  cool→warm renames every declaration and a spoke reading `var(--bcn-slate-7)` loses the
  property outright rather than getting a new value. *Sink:* `hub-fix`. *Priority:* resolved.

- **NO MIGRATIONS ROW, verified three ways rather than assumed.** `token-names.json` holds
  zero scoped names, so the snapshot guard cannot fire; `build.js` cannot emit an alias for
  a scope the hub does not know; and `token-rename.test.mjs` would FAIL such a row, because
  its destination does not resolve in the hub. Regeneration is the channel. *Sink:*
  `process`. *Priority:* recorded.

- **THE RAMP NOW POINTS AT TIER 1, and this is the hub's own pattern rather than a new
  one.** `--<scope>-neutral-7: var(--color-slate-7)`. The hub's semantic layer has always
  read `--color-background-default: var(--color-gray-1)`; generated themes were the outlier,
  interposing a literal copy of a value already on disk under its real name. The scoped name
  survives as the spoke's tuning surface — only its default moved, from a copy to a
  reference. *Bonus:* `--color-border-default-knockout` stopped being a stranded literal.
  It reads the OPPOSITE scheme's step 7, which the scoped ramp never declared; tier-1 dark
  scales are flat `:root` names, so the light block can say `var(--color-slate-dark-7)` —
  which is what the hub's own `{color.gray-dark.7}` already did. *Sink:* `hub-fix`.
  *Priority:* resolved.

- **IT IS NOT VALUE-PRESERVING, and the one change hides in the default.**
  `radix-curves.json` and `primitive/color.json` are two independent transcriptions of
  Radix. Compared all 144 neutral steps: **143 byte-identical**. The exception is `pure` /
  dark / step 12 — curve `#eeeeee` (real Radix) vs primitive `#ededef` (PRESERVEd, already
  marked "Unresolved"). Step 12 is `--color-content-default` and `pure` is the DEFAULT
  temperature. Measured on the dark canvas: **16.275:1 → 16.150:1**, Δ0.125 on a 16:1 pair.
  Both shipped themes are `cool` and did not move — all **4,040** role resolutions across
  beacon and qanat, both schemes, unchanged. *Action:* a test pins the 144-step comparison
  with that single documented exception, so it is known rather than rediscovered; resolving
  the `gray-dark` pin is a separate change that moves every hub dark surface reading
  `gray-dark-12`. *Sink:* `hub-fix`. *Priority:* **open** — the pin, not this.

- **A DERIVED THEME NO LONGER RESOLVES ON ITS OWN.** Chains end one hop outside the derived
  map — exactly as `check-contrast.mjs` has always seen it, since it loads `dist/tokens.css`
  first and overlays the theme. `theme-recipe.test.mjs`'s local resolver needed a tier-1
  fallback, read from the **committed DTCG JSON** rather than the gitignored
  `dist/tokens.css`: `token-rename.test.mjs` has to guard its equivalent with
  `if (!existsSync(dist)) return`, and a neutral-contrast test that silently skips on an
  unbuilt checkout is worth very little. *Sink:* `hub-fix`. *Priority:* resolved.

- **NO NPM SCRIPT GRADES THE TWO GENERATED THEME FILES.** `npm run contrast` is `--hub`
  only; `contrast:dark` targets `docs-dark.css`. Grading `theme-beacon.css` /
  `theme-qanat.css` in either scheme has to be run by hand, which is how a regression in a
  generated theme would reach a spoke unnoticed. Not introduced by this pass; found by it.
  *Sink:* `workflow`. *Priority:* **open**.

- **THE SPOKE TEMPLATE WAS FURTHER OUT THAN THE NAME.** Both its ramps used the
  50/100/…/1000 **web-palette** vocabulary, so the hand-fill path and `make-theme.mjs`
  disagreed on the step SCALE as well as the word — `theme-recipe.mjs` had already flagged
  those rungs as "resolving to nothing" against hub primitives. Both are 1–12 now, with the
  brand seed on step 9. *Sink:* `hub-fix`. *Priority:* resolved.

- **A STALE DEFAULT IN THE SAME FILE, fixed at the root.** The theme maker's intention
  swatches hardcoded `success: #bdee63` — lime-9 — months after `DEFAULT_INTENTION_SEEDS`
  moved to green. Reset worked (it deletes the key and the recipe falls back), so nothing
  failed; but the swatch DISPLAYED lime, and nudging it from there pinned a seed derived
  from a default that no longer existed. Same class as the three-of-six list: a hardcoded
  copy of exported data. Now derived. *Sink:* `hub-fix`. *Priority:* resolved.

---

## Source: brand-ramp tier-1 linkage and the chip corner (2026-08-18)

Two follow-ons to the neutral pass, both driven by the same question — when does a
generated value have a name already?

- **A SWATCH BRAND WAS DUPLICATING TWELVE PRIMITIVES.** `rampFrom` puts the seed on step 9
  and interpolates along that scale's curve, so a seed taken from the theme maker's swatch
  grid reproduces the Radix scale rather than approximating it. *Evidence:* measured all 25
  chromatic hues — **25/25 exact in light, 22/25 in dark**. *Action:* emit
  `var(--color-teal-7)` when the ramp IS the scale; keep literals otherwise. Both shipped
  themes are bespoke brands and regenerated to **0 changed lines**. *Sink:* `hub-fix`.
  *Priority:* resolved.

- **THE NEAR-MISS IS WHY IT IS ALL-OR-NOTHING.** A hex ONE BIT off teal-9 (`#12a595`) still
  matches **6 of 12** steps — the OKLCH round-trip quantises neighbouring seeds onto the
  same 8-bit values. A per-step rule would have emitted a half-`var()`, half-hex ramp for a
  brand that is not Radix teal: six steps that follow the palette and six that do not,
  looking identical in the file. Found by measuring before implementing, not after.
  *Sink:* `hub-fix`. *Priority:* resolved.

- **A REVERSE HEX LOOKUP CANNOT WORK HERE.** **59** primitive hexes are claimed by more than
  one name — `yellow`≡`amber` and `copper`≡`bronze` are documented aliases, and bright
  scales do not invert at step 9 so several light and dark names collide too. `#ffc53d`
  alone is claimed by four. The match therefore takes the scale the ramp was *shaped* by and
  considers only that one. *Sink:* `process`. *Priority:* recorded.

- **IT COMPARES AGAINST THE PRIMITIVE, NOT THE CURVE — and the hub's own brand proves why.**
  The emitted `var()` resolves to the primitive, and `grass-dark` / `lime-dark` /
  `yellow-dark` are PRESERVEd drift that disagrees with the curve. So a `grass` theme emits
  `var(--color-grass-9)` in light and a literal in dark. That asymmetry is the drift becoming
  *visible* rather than being silently absorbed. *Sink:* `hub-fix`. *Priority:* resolved —
  but it is the third finding this month pointing at the same unresolved `PRESERVE` pin.

- **THE COST IS BUNDLE WEIGHT, AND THE ALTERNATIVE WAS WORSE.** `ramp.mjs` imports the
  primitive JSON directly, so the whole palette ships in the theme maker's client script:
  **98.6 KB raw / 26.9 KB gzipped**, primitives ~5.5 KB of that. Passing the map in as a
  parameter would have avoided it and was rejected — an argument a caller can forget is
  exactly the `focus.css` failure mode, and the page's preview must agree with what the CLI
  writes or the tool lies. *Sink:* `hub-fix`. *Priority:* recorded.

- **A THEME'S CORNER LANGUAGE COULD NOT REACH THE CHIP FAMILY.** `esa-pill`, `esa-badge` and
  `esa-chip-group` all read `--radius-sm` for their resting corner, and `--radius-sm` is read
  by **30** components — so it could not be re-pointed. Under `corners: round` chips stayed
  squared while everything else rounded. *Action:* one new tier-2 role, `--radius-chip`,
  mapped per corner language with `round` → `--radius-pill`. *Sink:* `hub-fix`.
  *Priority:* resolved.

- **THE ROLE HAD TO EARN ITSELF AGAINST A MIGRATION THAT DELETED FOUR LIKE IT.**
  `--radius-control`, `--radius-card`, `--radius-surface` and `--radius-overlay` are all
  deprecated by `radius-roles-to-scale` — one name in front of one scale step, no decision of
  their own. `--radius-chip` passes where they failed only because it **diverges**: under
  `flat` and `soft` it holds the same primitive as `--radius-sm` (so those themes are
  byte-identical — beacon regenerated with one added line and no rendered change), and under
  `round` it becomes the capsule, which no step on the ramp can say. If it ever collapses to
  tracking `sm` everywhere it should be deleted alongside the other four; a test asserts the
  divergence. *Sink:* `process`. *Priority:* recorded.

- **ONE SHIPPED THEME CHANGES VISUALLY, DELIBERATELY.** `theme-qanat` is `corners: round`, so
  its pills, badges and chips are now capsules. `theme-beacon` is `flat` and is unchanged.
  Verified in a real browser through the shadow boundary for all three components, hub theme
  and qanat. *Sink:* `hub-fix`. *Priority:* resolved.
