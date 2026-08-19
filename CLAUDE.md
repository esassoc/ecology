# Ecology — Framework-Agnostic Design System Hub

## What this is
Ecology is the **hub** of a hub-and-spoke design system for ESA's Data Technology
team. It owns the design **standard** (tokens + specs) and a **reference
implementation** in Astro. Project "spoke" repos pull `@esa/tokens` + `@esa/ecology`,
re-skin via the semantic/component token layers, and hand off to dev teams (on any
stack) who interpret the standard — increasingly with Claude's help.

This repo is **Astro + plain web tech, not Angular.** The original Angular library +
Storybook were the starting point and are no longer checked out anywhere on this
machine — do not send anyone to `../ecology-angular`, which is where this line
pointed until 2026-08-16. If that archive is still wanted as prior art, it has to be
recovered from GitHub first. `../ecology-storybook` DOES exist and is unrelated: it
is this repo's own `storybook` branch in a git worktree.

## Architecture (npm workspaces monorepo)
- **packages/tokens/** → `@esa/tokens`. DTCG JSON (`tokens/{primitive,semantic}/*.json`)
  compiled by Style Dictionary (`build.js`) → `dist/tokens.css` (+ `tokens.js`).
  Plus two authored partials: `src/component-tokens.css` (tier-3 component tokens) and
  `src/type-roles.css` (typography utility classes).
- **packages/ecology/** → `@esa/ecology`. The components. Wildcard subpath exports
  (`./*.astro`, `./*`) so new files need no package.json edit.
- **apps/site/** → the browsable specimen + spec site that dogfoods both packages.
  Includes the live theme switcher (default / beacon / qanat).

## Token tiers (3-tier)
1. **Primitive** — raw values → `--color-teal-9`, `--spacing-400`
2. **Semantic** — intent, references primitives → `--color-background-brand`
3. **Component** — per-component theming surface → `--form-border-color`, `--button-radius-md`

**Tier 3 is the fallback, not a neutral option.** It exists for three cases and
nothing else: a **heavily variable component** (buttons — brands genuinely
diverge), a **component category** (`--form-*` across input/textarea/select), and
**special cases** (the focus ring, the data grid). Everything else is an intent,
and intents live at tier 2. The full argument, including the test below, is
`packages/tokens/SPEC.md` § "The test: WOULD this component diverge, not COULD
it". Read it before adding a hook.

> **Would** a theme make this component diverge from the role it points at — not
> **could** it. Every hook could.

**THE RULE HERE USED TO BE "a tier-3 token maps to ONE component", AND THAT WAS
BACKWARDS.** It measured leakage instead of necessity, so it flagged `--form-*`
(15 readers) as the system's headline violation while treating 249 one-reader
tokens as "the shape to hold to". Both readings were wrong in the same direction:
`--form-*` is the *category* case stated almost verbatim, and `--focus-ring-*` is
the *special* case by name — the two most defensible hooks in the file. Meanwhile
**240 of 306 declarations held no value at all**, each a pure alias over a tier-2
role: 15 different names for `--color-content-default`, 13 for
`--color-border-default`, 11 for `--color-background-elevation-raised`.

That is not merely redundant. A spoke re-pointing
`--color-background-elevation-floating` *wants* the dialog, popover, dropdown,
palette, confirm-dialog and search-panel to move together; six hooks in front of
that role are six chances to move five and miss one, silently, because each hook
still resolves.

**The 2026-08-16 demotion pass took tier 3 from 306 declarations to 116** (a
later pass the same day took it to 125 — see "there is no fourth tier" below) — 16 dead names
deleted, 3 misfiled ones relocated, 168 demoted to the roles they aliased. What
survives: `--form-*` (12), `--focus-ring-*` (3), `--button-*` (6), the staged
`--grid-*` (24), every hook a real spoke had actually overridden (13), and
literal micro-geometry with no tier-1/2 home (48). Each removal has a
`removed: true` row in `migrations.json` naming what to read instead.

Two rules that came out of it and are easy to get wrong:

- **Literal micro-geometry is out of scope.** `--dialog-width: 480px`,
  `--side-dialog-width-lg`, `--tab-layout-height-md` have nothing at tier 1 or 2
  to point at. Demoting one deletes the capability and hardcodes the number; the
  divergence test only applies where there IS a role to fall back to.
- **Removal, never rename.** A rename row emits `--card-bg: var(--role)` into
  `tokens.css`, keeping the dead name shipped and in the baseline forever — and
  `migrate-tokens.mjs` rewrites *declarations* as well as reads, so it would turn
  a spoke's one-component override into a whole-role override and report success.
  The destination rides in the pair's second element as print-only guidance.

Do NOT reach for "fan it out to per-component hooks" as the fix for a category
surface. That was measured for `--form-*` and comes to **162 names**, against
SPEC.md's own 5–9-per-component guidance.

**THERE IS NO FOURTH TIER, and the repo shipped one for two months.** A token a
component reads as `var(--x, <fallback>)` that no token file declares is not a
category — it is a **tier-3 token missing its declaration**. It carries a
component-scoped name, it occupies the component-theming slot, and the fallback
makes it work, so nothing ever failed. What it is missing is everything the
declaration buys: presence in `component-tokens.css` (the file a spoke author
opens), presence in `token-names.json` (so the guard cannot see it disappear),
and any record of its existence outside the component's own source.

The site labelled these tier `ad-hoc`, and four places called that legitimate
"per SPEC.md" — `component-promises.ts`, both `/debug` views, and
`component-tokens.css`'s own HOOKIFY header. SPEC.md says the opposite. Its only
mention of the word gives **two dispositions and no third**: *"`ad-hoc` rows are
candidates to either promote into `component-tokens.css` or fold away."*

The exemption came from a collision with the **zero-regression rule**: when one
name is read at several sites with DIFFERENT defaults, no single declaration
reproduces them all, so the HOOKIFY pass exempted those names from being
declared. **The divergence was the signal, not the obstacle** —
`--confirm-dialog-color` meant `--color-content-default` in one place and
`--color-content-default-secondary` in another, one name standing for two roles.
The objection only ever ruled out ONE declaration; `--avatar-size-*` already
showed the answer, which is one per rung.

**2026-08-16 resolved all 30: tier 3 went 116 → 125 declarations** (9 added
across 3 surfaces), 24 reads folded onto the roles they aliased, and `esa-file-list`
became the 33rd component to own a namespace. What earned a declaration, and why
each is the *narrow* case rather than the default:

- `--form-affix-*` (3) — extends the existing `--form-*` category surface rather
  than opening a new one; `--form-affix-border-color` points at
  `--form-border-color`, and that coupling belongs in the token file.
- `--avatar-font-size-{xs,sm,md,lg}` (4) — replaces a single undeclared umbrella
  that `esa-header-nav.astro` **actually sets**. An in-repo setter is the
  "someone asked" test passing outright.
- `--file-list-row-padding-{x,y}` (2) — added under a `hub-edit-approved:` note
  with a named human behind it (Andrew, front-end architect).

Everything else folded, **including hooks whose own comments called them
"the PUBLIC re-skin surface"** (`esa-page-header`, 13 of them). They were public
in a comment and nowhere else.

Two checks that follow from this, and the second is the one that bites:

- **`npm run tokens:snapshot` is not a formality after declaring.** It is what
  puts the name under the guard. Run it, then confirm the diff added *only* your
  names — the snapshot sweeps `dist/tokens.css` too, so any other in-flight work
  compiling into it rides along silently.
- **Grep for in-repo SETTERS (`--x:`), not just reads, before folding anything.**
  Checking spokes is not enough. `--avatar-font-size` had zero spoke references
  and one hub consumer, and folding it would have silently broken
  `esa-header-nav`'s 32px avatar.

The detector stays live at zero — `/debug/components` § "Under-promise" and
`/debug/tokens` § "Ad-hoc hooks". Both render **None.** A row in either is a
regression, not a backlog.

**Theming = override the semantic and/or component layer** under a `[data-theme="x"]`
scope. Primitives never move; component internals are never touched.
The full contract — naming, when a property earns a tier-3 hook, the
zero-regression splice mechanic — is **`packages/tokens/SPEC.md`**.

## A THEME IS GENERATED FROM A RECIPE, NOT HAND-FILLED (2026-08-16)
`scripts/create-spoke.mjs` scaffolded a theme file full of `__FILL__` markers and
`check-contrast.mjs` graded whatever came back; between them was a person with a hex
code, and the record says that did not work. **No hand-filled theme has ever declared
the eight `--color-content-on-*` foregrounds** — the template offered no slots and the
gate blocks on all eight, which is why `beacon` failed `content-on-brand-secondary` at
3.64:1 and why `cb-fish-design` still ships the template's placeholder grey ramp.

The pipeline now has a middle: **`/guide/theme-maker`** (the editor) and
**`scripts/make-theme.mjs`** (the writer), both over one pure derivation in
`scripts/lib/theme-recipe.mjs`, with `theme-<slug>.json` as the durable artifact.
`create-spoke.mjs --theme <recipe>` writes the real file. **Six seeds** (brand hex,
neutral temperature, corner language, two font stacks, optional per-intention colours)
produce ~95 light + ~91 dark declarations that pass 29/29 pairs in **both** schemes —
against a hub whose own defaults fail 7 and whose dark block fails 5.

Things that are easy to get wrong here:

- **Edit the RECIPE, never the generated CSS.** A value the generator should not
  choose goes in the recipe's `pinned` map. A pin on a FILL also re-picks that fill's
  foreground — hand-editing the CSS does not, which silently reintroduces the exact
  bug the tool exists to fix.
- **The seed lands on step 9 and is copied through verbatim.** Steps 1–8 and 10–12 are
  interpolated in OKLCH along the nearest Radix ramp's lightness/chroma curve
  (`scripts/lib/radix-curves.json`, generated + committed; `npm run theme:curves`).
  Radix's five bright scales (yellow, amber, lime, mint, sky) invert at step 9 by
  design and that inversion is inherited, not flattened.
- **"Do not move the client's hex" is LIGHT-ONLY.** `rampFrom` deliberately does not
  anchor the seed in dark — a light-scheme brand glares on a near-black page — so the
  dark fill is the generator's own pick and is as movable as any utility colour.
- **`--color-content-link` IS emitted, `--color-border-default-focus` is NOT.** The
  tier-2 default sends links at the step-9 *fill*, which `color.json` itself calls
  inherited rather than chosen and flags to re-point; a fill step is engineered for
  3:1, so link text fails AA for most brands (measured: 3.42:1). The focus ring
  genuinely wants the fill step and keeps its derivation — that chain is what stopped
  cb-fish keeping Ecology-green rings on a navy brand.
- **Emit hex only.** `parseColor` reads `#rgb`/`#rrggbb`/`rgb()`/`white`/`black` and
  nothing else; an `oklch()` or `color-mix()` makes those pairs unauditable, and that
  script's history records the cost — it once checked 0 pairs and exited 0 with "All
  text pairs pass AA".

**Dark now works per theme, and the selector is the whole fix.** The hub's dark block
is `html[data-scheme='dark']` — specificity (0,1,1) — so a plain
`[data-theme="x"][data-scheme="dark"]` (0,2,0) still LOSES. Generated dark blocks are
`html[data-scheme="dark"][data-theme="<slug>"]` (0,2,1). `check-contrast.mjs` gained
`--scheme dark` for the same reason a profile has to be named: a file holding both
blocks gets swept flat, the dark one wins on last-one-wins, and the audit grades dark
values under a header claiming nothing about it. `apps/site/src/styles/themes.css` is
now two `@import`s of generated files — **one theme per file, because the flat sweep
meant two `[data-theme]` blocks in one file only ever graded the second one.**

`scripts/lib/{color,ramp,theme-recipe,contrast}.mjs` are **isomorphic — no `node:`
imports** — because the page bundles them (aliased `@theme` in `astro.config.mjs`) and
a preview that disagrees with the file it writes is worse than no preview. Nothing
else under `scripts/` can be bundled; the rest read the filesystem at module scope.

**The theme-maker page is the documented exception to "the site ships zero client JS".**
It also has to re-declare, on its preview container, every `:root` declaration
containing a `var()` — 631 of 1,187. A custom property is substituted at
computed-value time *on the element that declares it*, so `--button-radius-md:
var(--radius-md)` resolves at `:root` and a container override of `--radius-md` cannot
reach back into it. A spoke needs none of this; its theme block IS at `:root`.

## Assurance is a THIRD axis, orthogonal to the theme
`data-assurance="wcag-aa"` (2026-08-16) is a conformance profile, not a theme, and
composes with `data-theme` (brand) and `data-scheme` (light/dark) — a project is
entitled to be on-brand AND assured. Authored ONCE in
`packages/tokens/src/assurance.css`, appended into `dist/tokens.css` by `build.js`,
**inert unless the attribute is set**, so there is nothing for a spoke to import.
Not an opt-in import on purpose: spokes override 3 of 26 brand-derived roles, so
"you must ALSO import X" gets forgotten — `focus.css` is the standing proof. A
spoke sets the attribute and declares none of these names itself.

**IT DOES NOT BEAT A SPOKE'S THEME, and that is the design.** `[data-theme]` and
`[data-assurance]` have identical specificity (0,1,0) and the theme's stylesheet
loads later, so a re-pointed brand wins. The hub cannot know a spoke's brand ramp.
The teeth are in the gate, not the cascade:
`check-contrast.mjs <theme>.css --assurance wcag-aa` composes them in the browser's
order and fails the spoke whose brand misses AA (`beacon` still fails
`content-on-brand-secondary` at 3.64:1 with the profile on — that failure is the
feature).

**A profile is a TOKEN SCOPE.** It re-points values; it cannot add behaviour,
markup, or a rule inside a shadow root — `:host-context()` is Chromium-only and
`@container style()` is not baseline, so **inherited custom properties are the only
channel that crosses a shadow boundary in every engine**. So it fixes contrast,
ring weight, min type size and the target-size floor, and fixes NONE of:
`esa-date-picker`'s absent keyboard handling (SC 2.1.1, Level A), the nine popups
that return focus nowhere, or anything in forced colors. Setting the attribute is a
statement about DEFAULTS, never a certificate — `npm run a11y:assured` is what makes
it more than a promise.

**A PROFILE CHANGES COLOUR. IT NEVER CHANGES A COMPONENT.** Verified: geometry is
byte-identical with and without `[data-assurance]` across all 91 built pages. Two
attempts to bend this were made and both were withdrawn, so the rule is absolute
rather than a preference. (1) `--target-size-min`, a 24px `min-block-size` read by 12
components — measured 33 failures → 0, and made `xs` and `sm` render at the SAME
height on chip-group, checkbox-group and radio-group. (2) A **type floor**, the eight
`2xs` composites re-pointed one rung up to kill 8px text — no geometry token in it at
all, and `esa-chip-group` still went `{xs:20, sm:22}` → `{xs:22, sm:22}` with layout
moving on 9 of 25 routes. **"It is only typography" is not a defence: a box follows
its contents.** The test is not which token you touched, it is whether any component
renders differently. A colour role is a VALUE (re-point it and every call site still
means what it meant); a size step is a CONTRACT, and redefining one lies silently to
every call site that chose it. `--touch-target-min` (44px, tier 2, read by nothing)
was removed alongside attempt 1 and RESTORED when it was withdrawn — it is the number
written down where a spoke author will look, inert on purpose.

**When an accessible option is needed there are exactly two answers**, and "quietly
make the existing one bigger" is not a third: (1) a compliant option ALREADY EXISTS →
guide the author to it; (2) it does NOT → build it as a real variant.
`check-size-usage.mjs` reports those two cases separately, because only the second is
a hub problem.

**Target size is REPORTED, not patched.** `npm run a11y:sizes`
(`scripts/check-size-usage.mjs`) lists every call site using a step that renders
under the floor; the author changes `xs` → `sm` in their own source, so the ramp keeps
its shape and the change lands in their diff. The map it lints against is MEASURED,
not declared: `npm run a11y:floors` regenerates `packages/tokens/size-floors.json`
from a real browser run, so a padding or type-rung change updates the lint. It
resolves **aliased Astro imports** via `importedAs` (a fixed tag list cannot see
`import Chip from '…/esa-chip-group.astro'`), and it flags call sites with **no
`size` attribute** — every component defaults to `md`, so a bare `<esa-checkbox>` is
a finding whenever md is in the map, which a `grep size="xs"` cannot see.

**The lint found what a floor would have hidden:** `esa-checkbox`, `esa-input-tag`
and `esa-range-slider` are under the floor at their **default** step, so no call-site
change fixes them. They need a size variant that clears 24px — a `/request-lego`
against the hub. The floor would have silently patched that and left the gap invisible.

`npm run a11y:targets` (`scripts/check-target-size.mjs`) is the measurement behind
all of it. **axe is NOT blind here** — axe-core 4.13 ships a `target-size` rule, it is
in the `wcag22aa` tag this repo already runs, and it sees into shadow roots. The
difference is the **spacing exception**: 2.5.8 passes an undersized target whose 24px
circle clears its neighbours', and axe implements that faithfully — measured, it
returns 0 violations and 0 incomplete on pages where this tool reports 16×16 controls.
So axe answers *does this conform*, and this tool answers *how big is it actually*.
**It therefore over-reports against the letter of the spec and says so in its own
output**, which is why it is NOT in the `a11y:assured` gate — the actionable size lint
is. It cannot be a source-text check either: since the height ramps went, a control's
height is EMERGENT (`2 × padding-y + font-size + border`, font size a
viewport-dependent `clamp()`), so there is no number in any file to grep.
`--scope components` narrows only the EXIT CODE to the `esa-*` kit — the site's own
prose links and debug `<summary>` rows are not what a spoke installs — and prints
both counts, a visible flag rather than a silent carve-out.

**Most components no longer have a tier-3 surface of their own, and that is the
target state, not a gap.** After the 2026-08-16 passes, **33 of 65** components own
a namespace (`--card-*`, `--dialog-*`, …); the other 32 theme entirely through
tier 2, which is what a spoke re-points anyway. 55 of 65 still READ a tier-3
hook, but mostly the two shared surfaces — `--focus-ring-*` and `--form-*`. A
component's doc page rendering an empty "Wired to this component" table is
correct output; its hooks moved into "Shared tokens it reads". Do not treat that
as a component missing its surface and re-add hooks to fill it.

**THE COMPONENT COUNT IS 65, AND IT IS NOT `ls | wc -l`.** That directory holds
66 FILES; the 66th is `icon-registry.ts`, which is not a component and is named
in `EXCLUDE` in `catalog.ts` for exactly this reason. "66" stood here from
2026-08-16 — written in the same commit that added `esa-error-summary.ts` and
took the file count to 66 — and the file contradicted itself in two places while
it did: 34 Lit + 31 `.astro` is 65, and 65 (+3 reference wrappers) is the 68 doc
pages on disk. Nothing was deleted to explain a drop; `git log --diff-filter=D`
over `esa-*` is empty. The authority is `componentCount` in
`apps/site/src/data/catalog.ts` (`sourceSlugs.size`, regex-matched), which the
catalog index renders — read it there rather than counting by hand. The "28 of
66" above was 28 + 38 = 66, both halves back-derived from the wrong total; the
32/33 replacing them come from the site's own generated `themingSurface`
(`scope === 'exclusive'`), which is what the doc pages render.

Every one of the 65 (+3 reference wrappers) still has a doc page rendering its
generated "Theming surface" table. The
"61" that stood here through 2026-06-12 was a doc-page count, not a component
count — five later-promoted components (`esa-container`, `esa-kbd`,
`esa-collapsible`, `esa-app-shell`, `esa-stat`) had catalog entries but no page.
The drift guard in `apps/site/src/data/catalog.ts` only enforces that every
source file is CATEGORISED; a missing doc page degrades silently to an unlinked
catalog row, so check both when adding a component.

## Doc pages generate their own API tables
A component page's **API table is generated from the component source**, not
authored — `apps/site/src/data/component-api.ts` reads `interface Props` +
the `Astro.props` destructuring (`.astro`) or `static properties` + `declare` +
constructor defaults + public get/set accessors (Lit), expands local `type`
aliases so unions show their real values, and `apps/site/src/components/ApiTable.astro`
renders it. Pages supply **prose only**, as `const describe = { propName: '…' }`
keyed by prop name — the *attribute* name for web components (`label-position`,
not `labelPosition`). A key matching no prop in source is a build-time
`⚠️ API drift` warning; so is a documented event the component never dispatches.
Never re-add a hand-written `props` array: through 2026-08-14 they were authored,
and `esa-button` silently shipped a 4th `appearance` (`soft`) plus `href`/
`target`/`rel` that the page never mentioned. Only the three `type="reference"`
pages (`esa-grid`, `esa-map`, `esa-rich-text-editor`) keep hand-written tables —
they wrap external libraries and have no source file here. Authored `methods`
and standalone `events` tables still use `@esa/docs/Api.astro` directly.
**Stale prose is still possible** — the guard checks names, not meaning.
Express a prop's default in the `Astro.props` destructuring (`variant = 'primary'`),
never in a fallback chain below it — the extractor reads defaults from the
destructuring, so any other form silently drops the default from the docs.

## Renaming or deleting a token — the row is enforced, not remembered
`packages/tokens/token-names.json` is a **committed baseline** of every name the
package ships (1,028). `npm test` fails when one disappears without a
`migrations.json` row. Order matters: **add the row first** — that is what emits
the alias or the removed note — then `npm run tokens:snapshot` to accept the new
set. `npm run tokens:check` runs the same guard on its own.

This closed the hole every other part of the system sat on top of. The alias, the
codemod and `doctor`'s warnings all start from the row; nothing checked the row
was written. Rename without one and no alias is emitted, the codemod has nothing
to rewrite, doctor reports nothing, and every spoke reading the old name loses the
property outright — `var(--gone)` does not fall back, it drops the declaration.

A row's **destination** is checked too: `to` must resolve to a real value through
the hub's own declarations, not merely be declared. An alias pointing at a deleted
token is itself declared and still resolves to nothing —
`form-height-to-control-height` renamed onto `--control-height-*`, which was
deleted hours later, and the codemod rewrote two spokes onto the dead name while
reporting success. `migrate-tokens.mjs` now drops such pairs rather than aborting,
so one bad row cannot block a spoke's other 1,900 valid rewrites.

**Reads and declarations are counted separately** everywhere, because an alias
rescues `var(--old)` and can never rescue `--old: value`. A spoke's theme file is
nothing but declarations, which is why "our brand stopped applying" is the shape
this failure takes. Both spokes were silently in it: cb-fish had 23 inert
declarations, air-exchange 24 including `--color-primary`.

## Renaming a component prop
`migrations.json` now has a third `kind` alongside `token` and `class`: **`prop`**,
which MUST carry `components` (the tags it applies to) and SHOULD carry `module`
(the import specifier). A prop name means nothing on its own — `color` was a
button prop, `esa-loading-spinner`'s genuine CSS-colour prop, AND the commonest
declaration in any stylesheet, so the rewrite is tag-scoped via `renameProp` in
`scripts/lib/token-rename.mjs` (tested there — the spinner case is the regression
test). `module` makes it also resolve **aliased imports** per file: `import Button
from '@esa/ecology/esa-button.astro'` renders `<Button …>`, which a fixed tag list
cannot see, and hard-coding `Button` would hit any spoke component sharing the
name. Reading the binding from the file's own imports gets both. Omit `module`
and a spoke with an aliased import gets a **false all-clear** from `/update-tokens`
AND `doctor` — the hub's own esa-page-header page was exactly that case.

A prop rename needs **both halves**:
1. the `prop` row, so `/update-tokens` rewrites spoke source; and
2. the component keeping the old name in `Props` and warning at build time.

Half 2 is not politeness. `esa-button` has an index signature, so a dropped
`color` would be swept into `...rest` and spread onto the native `<button>` as a
junk attribute — the button would render `primary` with no error anywhere. It also
covers what no static scan can reach: a binding re-exported through a barrel file
or chosen at runtime. Unlike a token row, NO alias is emitted into `tokens.css`;
`build.js` skips non-`token` kinds. A prop that was never released needs NO row and
no shim — `esa-button`'s `iconRight` shipped under that name from the start.

Done so far, both 2026-08-14: `button-color-to-variant` (every other component
already called this axis `variant`) and `icon-link-trailing-to-icon-right`.
The naming test both settled on: **what would someone type WITHOUT reading the
docs?** Nobody guesses `trailing`, and it didn't read as a pair with `icon`.
`iconRight` is physical rather than logical on purpose — there is no RTL anywhere
in this repo (no `dir`, no i18n, no locale), so `trailing` was defending a case
that doesn't exist, and if RTL ever arrives the fix is one row here plus a shim.

## Removing a component (`kind: "component"`)
The fourth `kind`, added 2026-08-14. A component rename is NOT a prop rename: it
carries a new tag name, added props, renamed props and a repointed import
specifier together, so it has **no `pairs` key**. Anything iterating `m.pairs`
must guard — `build.js` and `migrate-tokens.mjs` already skip by kind, but
`doctor.mjs` and one test in `token-rename.test.mjs` did not and threw on the
first such row. `renameComponent` in `scripts/lib/token-rename.mjs` does the
rewrite (tested there).

Two rules that are not obvious:
- **A custom element is renamed; a local binding is NOT.** `<esa-icon-button>` →
  `<esa-button>`, but `import IconButton from '…/esa-icon-button.astro'` keeps the
  name `IconButton` and gets its *import specifier* repointed. Renaming the binding
  would mean rewriting every reference in the file, and the binding is the spoke's
  word, not ours. `fromModule` is therefore REQUIRED here (it is optional on
  `prop`) — without it an aliased import is invisible and the spoke gets the same
  false all-clear this file warns about above.
- **A dropped prop is reported, never deleted.** `weight` on `esa-icon-link` had no
  destination (button takes weight from the type composite). Silently removing it
  would change rendering with no trace, so the codemod leaves it and prints the call
  site for a human.

Done so far, both 2026-08-14: `icon-button-to-button-chrome` and
`icon-link-to-button-chrome` — both folding into `esa-button variant="chrome"`, the
variant that takes its color FROM context rather than owning one. Three components
became one; see `docs/button-consolidation-plan.md` for the measured deltas and the
`aria-current` vs `aria-pressed` split that made `current` a separate prop.
**The shims must not be deleted until spokes have run `/update-tokens`.**

**A component removal has a docs half too, and it is a second edit.** The
`migrations.json` row rewrites spoke source; it does nothing to this site, where
the component keeps its old catalog group and its green "Stable" pill. Both
deprecated components sat under **Core** with `status="stable"` for two days,
directly above a summary opening `⚠ DEPRECATED` — the badge a reader scans
contradicting the prose they don't. As of 2026-08-16 they live in a trailing
**Deprecated** group: add the slug to `DEPRECATED` in
`apps/site/src/data/catalog.ts` (slug → successor), move its `CATEGORIES` entry
into the `Deprecated` group, and set `category="Deprecated" status="deprecated"
supersededBy={…}` on its doc page. **The URL does not move** — `/components/
esa-icon-link` still resolves, because six other doc pages link to it and a spoke
mid-migration is exactly who needs the page. A `deprecated` status makes
`ComponentDoc.astro` render the migration banner; the successor string is the
only thing shown in the sidebar, so write it as the call site
(`esa-button variant="chrome" iconOnly`), not the tag name.

The two facts are written in two places and a guard in `catalog.ts` warns when
they disagree, because each direction is silent alone: in `DEPRECATED` but filed
under Core renders the badge inside the group people shop from, and filed under
Deprecated but missing from `DEPRECATED` renders a green Stable pill under a
Deprecated heading. Note the pill reads `status`, NOT `type` — it read `type`
until this pass, which is why setting `status="deprecated"` had no visible
effect and nobody noticed the pages were mislabelled.

## Component buckets
- **Presentational → `.astro`.** Golden pattern: `packages/ecology/src/components/esa-badge.astro`.
- **Interactive → Lit Web Component (`.ts`).** Golden pattern: `esa-switch-toggle.ts`.
  Decorator-free Lit (`static properties` + `declare` + constructor defaults +
  self-register guard). Form controls are form-associated (`static formAssociated`,
  `attachInternals`, `setFormValue`, composed `change` event). WCs work in ANY stack —
  they're the portable interactivity layer.

## Conventions
- `esa-` prefix; sizes use the shared scale `xs | sm | md | lg` (default `md`); icons add `xl`. (Aligned to Beacon's `UiSize` — see docs/beacon-gap-analysis.md. One scale across button/input/icon so they line up on a row.)
- SCSS-style private tokens: `--_*` reading public tokens, **always with a literal fallback**.
- Use only token names that exist in `packages/tokens/dist/tokens.css` + `component-tokens.css`.
- Icons: inline Lucide SVGs (no icon dependency). When a `.ts` (Lit) component **injects** icon markup from a prop/string, use `unsafeSVG` (`lit/directives/unsafe-svg.js`) — **not** `unsafeHTML`. `unsafeHTML` parses in the XHTML namespace, so the `<path>`/`<rect>` children are created as unknown HTML elements and never paint. `unsafeHTML` is only for injecting real HTML (e.g. highlighted text into a `<span>`). Static SVG written literally in a Lit template is fine as-is.
- No Tailwind. No dependencies beyond `lit`.
- In `.astro` prose/`<code>`, never write bare `{ ... }` (Astro evaluates it). Use `{'{ ... }'}`.

## Commands
```bash
npm install
npm run dev            # build tokens, then serve the site
npm run build          # tokens + static site build
npm run build:tokens   # just compile tokens → packages/tokens/dist/
npm test               # token-name guard + hook regressions (scripts/**/*.test.mjs)
npm run a11y           # axe-core over every built page (needs `npm run build` first)
npm run a11y:live      # live-region structure audit (needs `npm run build` first)
npm run contrast       # 29 AA pairs against the hub defaults — currently FAILS with 7
npm run contrast:dark  # the same pairs against the hub's dark block — fails with 5
npm run theme:make     # recipe (or --brand/--slug) → theme-<slug>.css + .json
npm run theme:curves   # regenerate scripts/lib/radix-curves.json from @radix-ui/colors
```

**`npm run contrast` exits 1 on the hub's own defaults and always has** — 7 AA
failures, `content-on-brand` at 2.95:1 among them. That is not a regression to chase
on sight; `npm run a11y:assured` passes because the assurance profile moves those
fills from Radix step 9 to step 11, which is what the profile is for. A GENERATED
theme passes 29/29 in both schemes, so a spoke can be cleaner than the hub.

`npm run a11y` serves `apps/site/dist` on an ephemeral port, waits for custom
elements to upgrade (auditing pre-hydration HTML is how you get a meaningless
all-clear on a kit that is half web components), and reports grouped by rule. It
does NOT gate — pass `--strict` for that. `--url http://localhost:4322` audits the
dev server instead.

**`/debug/tokens` and `/debug/components` now SHIP** (2026-08-16). They used to
return `[]` from `getStaticPaths` in a production build, so the audit only saw
them via `--url`; both are now in the 88-page build and in scope for `npm run
a11y`. Two things that fell out of making them build, both easy to re-break:
- **Their data modules must stay DYNAMIC imports** in `[view].astro`. Every
  module under `apps/site/src/data/` finds the repo root by counting four levels
  up from `import.meta.url`. A static import lets vite inline `token-graph.ts`
  into the page module, which lands one directory deeper than `dist/chunks/`,
  and the build dies with `packages/tokens/dist/tokens.css is missing`.
- **`getStaticPaths` cannot read a frontmatter `const`.** Astro hoists it out of
  the component scope and calls it first, so the view list is repeated inside it
  (`VIEWS is not defined` otherwise).

The three **naming audit** sections (tier 1/2/3 names against the 6-slot rubric)
were removed from `/debug/tokens` in the same pass; `tier1-naming.ts` went with
them. `tier2-naming.ts` and `tier3-naming.ts` stay because the semantic tables
and `component-promises.ts` are built from their parsing, not their scoring.

**The hydration guard is the load-bearing part.** This tool first shipped serving
`dist` at root while the build sets `base: '/ecology/'`, so every script 404'd,
no custom element upgraded, and it cheerfully audited the pre-hydration shell —
reporting a clean bill of health for components that were never on the page. It
does not fail when that happens; it just reports nothing. If you ever see
`HYDRATION FAILURE` in the output, **the numbers above it are void.**

That guard immediately earned itself: on 2026-08-16 it flagged three pages whose
elements never upgraded, and the cause was a real production bug — a backtick
inside a comment in `esa-sidebar-nav.ts`'s `css` template closed the literal, so
the module threw at runtime and the rail rendered nothing on its own doc page.
Unlike the usual form of that mistake it still PARSED, so the build stayed green.
See [[project-no-backticks-in-lit-css]]; the grep there finds them, but run it
without `head` — the one that matters is rarely the first.

**Treat green as evidence of nothing much.** axe catches maybe a third. It DOES
catch a nameless `role="radio"` (`aria-toggle-field-name`) — once the page
actually renders. What it cannot see is the keyboard (arrow keys, roving
tabindex), a name that vanishes when the user types, and most of SC 1.3.5. The
judgment layer is `plugins/spoke-kit/skills/accessibility/` (start at `forms.md`).

`npm run a11y:live` is the second thing axe cannot do. axe validates a live
region's ATTRIBUTES and has no opinion on whether it will ever announce anything
— which is the exact failure this kit shipped: `<span role="status"
aria-label="Loading"></span>` on every spinner, for months, announcing nothing,
with a clean axe run throughout. It walks the FLATTENED tree (shadow roots
included, post-upgrade) and asserts the announcer invariants: exactly two
regions and both owned by the announcer, none inside a shadow root, none
permanently empty, no interactive control inside one, no politeness
contradiction. It proves structure only — nothing automated proves an
announcement reaches a screen reader. That needs NerdeRegion plus NVDA/Firefox
and VoiceOver/Safari.

**Forced colors is the third thing axe cannot do**, and unlike the other two there is
no script to run: axe-core has no forced-colors rule at all, so `npm run a11y` reports
clean on a page that is unusable in Windows Contrast Themes. The judgment layer is
`plugins/spoke-kit/skills/accessibility/forced-colors.md`.

Support landed in two passes on 2026-08-16. The **focus** layer is a single global rule
in `packages/tokens/src/a11y.css` — `:focus-visible { outline: 2px solid Highlight }` —
which reaches shadow roots only because `a11y.ts` bridges the file into `static styles`.
The **rest** is per-component: **24 components** now carry their own
`@media (forced-colors: active)` block. There is no central lever for those, and the
count is the point — do not go looking for one.

Two things about it that surprise people, and that no token can fix:
- **It overrides at the USED-VALUE layer, downstream of every token.** The
  `prefers-reduced-motion` trick — one generated `:root` block in `build.js` — does not
  transfer. `box-shadow` and non-`url()` `background-image` are forced to `none`
  whatever value you gave them, and all 34 Lit components are in shadow roots that no
  global block reaches. Rules go inside each component's own `static styles`.
- **It reads the HTML ELEMENT, never the ARIA role.** `<div role="button"
  aria-disabled>` gets none of the system styling `<button disabled>` gets free, which
  is a live cost for the eight `esa-*` widgets built that way.
  A transparent `border` becomes VISIBLE (border-color is force-adjusted), which is why
  most fixes need no media query at all. `esa-card--elevated` already does this.

The one deterministic slice is enforced: `check-a11y` **check 9** blocks a focus ring
painted only with `box-shadow`. It swept the 65 components at 0 flagged / 0 false
positives, so it is a ratchet, not a cleanup.

## Status messages — there is ONE announcer, and it is the last resort
`packages/ecology/src/announcer.ts` owns the kit's ONLY two ARIA live regions —
one polite, one assertive, in the LIGHT DOM, mounted before anything happens.
Components call `announce(msg, { assertive })`; **no component writes
`aria-live`.** Four reasons, each of which was a real bug here: a region created
in the same tick as its text does not announce; regions interfere with each
other (assertive can clear the polite queue), so the ceiling is ~2 per page;
observation across a shadow boundary is unreliable (worst Safari/VoiceOver, and
the toast's text was TWO roots deep); and re-setting `textContent` to the string
it already holds is not a mutation, so a repeated message announces once.

Light DOM also means **no cross-root reference is needed** — a component imports
the function and the singleton mutates its own text. That matters because IDREFs
never cross a shadow boundary in any engine.

**Reach for a live region LAST.** In order: (1) an instructional cue via
`aria-describedby` — the six filtering components use one, which is what makes
per-keystroke announcements unnecessary; (2) moving focus — a change of context
AT already surfaces, so SC 4.1.3 does not even apply, and this is what
`esa-error-summary` does; (3) an ARIA state property (`aria-expanded`,
`aria-valuenow`, `aria-busy`); (4) then `announce()`.

Two consequences that surprise people:
- **`esa-snackbar-container.duration` defaults to `0` (persistent)** as of
  2026-08-16, down from `5000`. A timer the user cannot adjust is SC 2.2.1,
  **Level A**. Auto-dismiss is opt-in per call. This is a behaviour change no
  `migrations.json` row can express — the four kinds are all RENAMES — so it
  warns once at runtime instead.
- **A message with a control in it is a dialog, not a status message.** Live
  regions announce raw text with no roles and cannot be focused or navigated to,
  so a toast "Undo" is a bare word with no route to it. `check-a11y` blocks it.

The full contract is
`plugins/spoke-kit/skills/accessibility/status-messages.md`.

## Parallelism
Component work parallelizes well (each component = independent files). Default to
subagents grouped by area; pre-load them with the golden patterns + token names.
Agents must NOT run `npm run build` concurrently (shared dist/.astro caches race) —
write files, then one consolidated build verifies.

## Spoke model
A spoke is its own Astro repo: `npm install @esa/tokens @esa/ecology`, a thin
`<project>-theme.css` of semantic/component overrides, and project-specific prototypes
composed from Ecology. Patterns that prove broadly useful get promoted back up here.

## Claude plugin (spoke-kit) — the hub-owned intelligence layer
This repo is also a **Claude Code plugin marketplace** (`.claude-plugin/marketplace.json`).
The **`spoke-kit`** plugin (`plugins/spoke-kit/`) ships everything Claude needs in a
spoke: skills (`component-first`, `design-principles` — the canonical aesthetic/token
rules, `accessibility` — the a11y judgment layer, whose `forms.md` is the naming/
describedby/grouping contract for anything that collects a value, `spoke-init`,
`spoke-precommit-review`), Node PreToolUse hooks
(`check-component-first` — no bespoke UI primitives; `check-a11y` — the five
deterministic a11y failures, and unlike the others it fires in the HUB TOO, since
these components are what teams copy; `guard-hub-writes` — spoke
sessions cannot edit this hub, even via the `node_modules/@esa/ecology` symlink;
escape token `hub-edit-approved:` requires explicit human approval), a
SessionStart hook (`check-hub-state` — warns spoke sessions when this checkout
is dirty/off-main, since the `file:` symlinks serve hub WIP live into spokes;
`/ship`'s hub gate blocks deploying it, escape `ship-wip-approved:`), and commands:
`/spoke-init` (scaffold a spoke), plus the non-dev workflow verbs `/new-prototype`,
`/design-qa`, `/ship`, `/request-lego`, `/update-tokens` (migrate a spoke off
deprecated token/class names after a hub rename — driven by
`packages/tokens/migrations.json`, which `build.js` also reads to emit the
compatibility aliases, so a rename is declared once and everything follows). Spokes **never copy** these files — their
checked-in `.claude/settings.json` declares the marketplace (github `esassoc/ecology`)
and enables `spoke-kit@ecology`; anyone opening a spoke gets the install prompt.
Teammate setup: `ONBOARDING.md` (repo root) + `scripts/doctor.mjs` (spokes run it
as `npm run doctor`).

The site's **Guide** section (`apps/site/src/pages/guide/`) is the human-facing
knowledge base. `/guide/toolkit` and `/guide/setup` are **generated at build time**
(from `plugins/spoke-kit/` + `ONBOARDING.md` via `src/data/toolkit.ts`) — never
hand-edit their content. Only the `/guide` narrative (and `src/data/spokes.ts`,
the spoke directory) needs a human edit when the architecture or spoke roster changes.

- **Frozen identifiers**: marketplace `ecology`, plugin `spoke-kit`. The key
  `"spoke-kit@ecology"` is checked into every spoke — renaming either breaks them.
- **Publishing**: plugin edits go live for spokes only after **push to GitHub**.
  Local commits aren't enough. Bump `plugins/spoke-kit/.claude-plugin/plugin.json`
  version on behavior changes, push, then **on each machine run BOTH commands**:

  ```bash
  claude plugin marketplace update ecology   # refreshes the LISTING only
  claude plugin update spoke-kit@ecology     # actually installs the new version
  ```

  The first command is **not sufficient and is actively misleading** — it prints
  "Successfully updated marketplace" while leaving the installed plugin pinned at the
  old version (the cache lives at `~/.claude/plugins/cache/ecology/spoke-kit/<version>/`;
  check which version dirs exist). Only `plugin update` moves it. Then **restart Claude
  Code** — the CLI says "Restart to apply changes" and means it; hooks and skills are
  loaded at session start.

  Verify, don't trust the success message:
  ```bash
  claude plugin list | grep -A1 spoke-kit@ecology   # must show the version you pushed
  ```
- **New spokes**: `/spoke-init` (run from this repo's root) interviews, then runs
  the deterministic `scripts/create-spoke.mjs`, then does the judgment work. Never
  hand-copy `packages/spoke-template/`.
- **The hook is inert in this repo** (it detects the hub via
  `.claude-plugin/marketplace.json` / the `ecology-hub` package name) — specimen
  pages here legitimately contain raw `<input>` markup. It enforces only in repos
  whose `package.json` *depends on* `@esa/ecology`.
