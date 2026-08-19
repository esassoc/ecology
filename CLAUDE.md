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

**There is a THIRD disposition, and `esa-pill`'s category ramp is the only case.**
Promote or fold assumes the hub is the one who declares. `--category-{2,6,11}` is a
component token the **SPOKE** declares — the mechanism is the hub's, the twelve steps are
the project's vocabulary, which the hub cannot enumerate. A hub declaration would be
actively wrong rather than merely redundant: a declared value beats the inline fallback, so
every categorised pill in every project would render the hub's colour and "an unknown
category renders an ordinary pill" would be gone. So it is tier 3, classified `component`,
via `SPOKE_DECLARED` in `apps/site/src/data/theming.ts` — a named regex, because the
decision has to live somewhere a reader can find it. Do NOT read this as a general escape
from declaring: everything without a line there is still `ad-hoc`, and the ratchet below
still holds it at zero.

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
neutral temperature — one of SIX, see below — corner language, two font stacks, optional
per-intention colours)
produce ~114 light + ~111 dark declarations that pass 66/66 pairs in **both** schemes —
against a hub whose own defaults fail 7 and whose dark block fails 3. It was ~95/~92 and
"33/33" until 2026-08-18; the pair table had grown to 64 while the generator still emitted
nothing for 22 of the names it graded (see the data-viz note below). **The table is 62,
not 64** — 14 rows were grading pre-rename names that resolved only through the
compatibility aliases, and two of those turned out to be the same pair twice under two
spellings. Migrating them onto the canonical names moved no verdict in either scheme. It then went
to **66**: the four `-muted` status fills this pass adds were shipping ungraded, and in
dark they measured 1.67-1.96:1.

## THE NEUTRAL IS A SEED, AND THE RAMP IS CALLED `neutral` (2026-08-18)
`seeds.neutral` picks one of **six** Radix neutrals — `pure`→gray, `cool`→slate,
`warm`→sand, plus `mauve`, `sage`, `olive` (`radix-curves.json` § `neutrals`, exported as
`NEUTRAL_SCALES` beside `NEUTRAL_TEMPERATURES`). All six have shipped at tier 1, light and
dark, since the palette generation on 2026-08-17; all six derive identically-shaped themes
(114 light / 111 dark) and grade identically. **The theme maker offered three of them** —
a hardcoded array next to the imported list it should have been derived from — so `mauve`,
`sage` and `olive` were generated, tested and CLI-reachable while being invisible in the
editor. The page now derives its list, and a test asserts its prose map covers
`NEUTRAL_TEMPERATURES`.

**The scoped ramp was named `gray` for every temperature, and that was wrong five times
out of six.** `theme-beacon.css` is a `cool` theme, so it shipped `--beacon-gray-7:
#cdced6` — Radix **slate**-7 — under a name claiming otherwise, with the word "cool" in a
header comment as the only clue. It is `--<scope>-neutral-*` now: a ROLE name, parallel to
the `--<scope>-brand-*` beside it, and one that survives a temperature change. Moving a
spoke cool→warm re-points twelve values instead of renaming twelve properties out from
under whatever reads them — which is exactly why naming it after the resolved scale
(`--beacon-slate-*`) was rejected. **No `migrations.json` row**: these are theme-scoped
names emitted into a spoke's own file, absent from `token-names.json`, and `build.js`
cannot emit an alias for a scope the hub does not know. `token-rename.test.mjs` would in
fact FAIL such a row, because its destination does not resolve in the hub. Regeneration is
the channel.

**The ramp now POINTS AT tier 1 instead of copying hexes** — `--<scope>-neutral-7:
var(--color-slate-7)` in light, `var(--color-slate-dark-7)` in dark. `neutralRamp`
reproduces a Radix scale verbatim and the hub ships all six, so the old literal was a
second, unlabelled transcription of a value already on disk under its real name. The hub's
own semantic layer has always done it this way (`--color-background-default:
var(--color-gray-1)`); generated themes were the outlier. **The scoped name survives as the
spoke's tuning surface** — overriding `--<scope>-neutral-7` still works and still moves
every role reading it; only the default moved, from a copy to a reference.

Four consequences, and the last one is the one that bites:

- **`--color-border-default-knockout` became expressible.** It reads step 7 of the
  OPPOSITE scheme's neutral, which the scoped ramp never declared, so it was a stranded
  literal. Tier-1 dark scales are flat `:root` names rather than scheme-scoped blocks, so
  the light block can say `var(--color-slate-dark-7)` outright — which is what the hub's
  own `{color.gray-dark.7}` already did.
- **`--<scope>-neutral-0` stays a literal, and must.** `belowFirstStep()` is step 1
  darkened by an OKLCH factor — a rung that exists in no Radix scale. Dark therefore emits
  12 `var()`s and one hex.
- **A derived theme no longer resolves on its own.** Chains end one hop outside the map,
  exactly as `check-contrast.mjs` has always seen it (it loads `dist/tokens.css` first and
  overlays the theme). `theme-recipe.test.mjs`'s local resolver needed a tier-1 fallback,
  read from the **committed DTCG JSON** rather than the gitignored `dist/tokens.css` — a
  neutral-contrast test that silently skips on an unbuilt checkout is worth very little.
- **IT IS NOT VALUE-PRESERVING, and the one change hides in the default.**
  `radix-curves.json` and `primitive/color.json` are two independent transcriptions of
  Radix. 143 of 144 neutral steps are byte-identical; the exception is **`pure` / dark /
  step 12**, where the curve gives `#eeeeee` (real Radix) and the primitive ships
  `#ededef` (PRESERVEd in `gen-radix-primitives.mjs`, marked "Unresolved" below). Step 12
  is `--color-content-default` and `pure` is the DEFAULT temperature, so this lands where
  it is least likely to be noticed. Measured on the dark canvas: **16.275:1 → 16.150:1**.
  Both shipped themes are `cool` and did not move — all 4,040 role resolutions across
  beacon and qanat, both schemes, are unchanged. A test pins the 144-step comparison with
  that single row as a documented exception; when the pin is resolved, delete the row.

## A BRAND POINTS AT TIER 1 ONLY WHEN IT LITERALLY IS ONE (2026-08-18)
`rampFrom` lands the seed on step 9 and interpolates the other eleven along that scale's
curve — so a seed taken from the theme maker's **swatch grid** (a real Radix step 9)
reproduces the scale rather than approximating it. Measured across all 25 chromatic hues:
**25/25 exact in light, 22/25 in dark.** When that happens the generated ramp is a
byte-for-byte duplicate of twelve primitives already on disk, so it now emits
`var(--color-teal-7)` instead of restating the hex. **A bespoke brand still emits
literals**, which is why "a brand ramp is never a primitive" is still the general rule —
an arbitrary client hex reproduces no Radix scale at all.

`radixScaleMatch` (`ramp.mjs`) makes the call. Three things about it are load-bearing:

- **ALL TWELVE OR NOTHING.** A hex ONE BIT off teal-9 (`#12a595`) still matches **6 of 12**
  steps, because the OKLCH round-trip quantises neighbouring seeds onto the same 8-bit
  values. Per-step matching would emit a half-`var()`, half-hex ramp for a brand that is
  not Radix teal — six steps that would silently follow the palette and six that would not.
- **It checks ONE NAMED SCALE, never a reverse hex lookup.** **59** primitive hexes are
  claimed by more than one name (`yellow`≡`amber`, `copper`≡`bronze`), so "which token holds
  `#ffc53d`" has no single answer. The caller passes the scale the ramp was *shaped* by.
- **It compares against the shipped PRIMITIVE, not the curve**, because the emitted `var()`
  resolves to the primitive. Those disagree for `grass-dark`, `lime-dark` and `yellow-dark`
  — the PRESERVEd drift — so those three correctly fail in dark and keep their literals.
  **The hub's own brand is `grass`, so this is not hypothetical:** a grass theme emits
  `var(--color-grass-9)` in light and a hex in dark.

**The cost is in the theme maker's bundle.** `ramp.mjs` now imports
`packages/tokens/tokens/primitive/color.json` directly, so the whole palette ships in the
page's client script: **98.6 KB raw / 26.9 KB gzipped**, of which the primitives are ~5.5 KB
gzipped. Passing the map in as a parameter would avoid that and was rejected — an argument
a caller can forget is the `focus.css` failure mode, and the page's preview MUST agree with
what the CLI writes.

## `--radius-chip` — the one radius role that does not track the scale (2026-08-18)
A theme's corner language now reaches the chip family. `--radius-chip` is read by
**`esa-pill`, `esa-badge` and `esa-chip-group`**, and `CORNERS` maps it per language:
`flat`→`--radius-050`, `soft`→`--radius-100`, `round`→**`--radius-pill`**. So a `round`
theme renders chips as capsules without anyone setting a prop; `esa-pill shape="round"`
remains the per-instance opt-in that holds under every language.

**It is not an alias, and that is the whole justification.** `--radius-control`,
`--radius-card`, `--radius-surface` and `--radius-overlay` were all deprecated by
`radius-roles-to-scale` for being exactly that — one name in front of one scale step,
carrying no decision. This one **diverges under `round`**, which no step on the
xs/sm/md/lg ramp can express. Under `flat` and `soft` it holds the *same primitive* as
`--radius-sm`, so those themes are byte-identical to before it existed — verified:
regenerating `theme-beacon.css` (flat) added one line and changed no rendered value.
`theme-qanat.css` (round) is the only shipped theme that moves, which is the point.

**Round points at `--radius-pill`, not at the `--radius-full` primitive the other rungs
use.** `radius.json` says a squared-off brand may re-point `--radius-pill`; when it does,
chips must square off *with* the filter pills and avatars rather than staying capsules
alone.

**A role, not three component hooks** — the three are meant to agree (esa-pill's own note
says its 4px corner exists to match esa-badge), and three hooks would let them drift apart
silently, which is the failure the 2026-08-16 demotion pass removed 168 instances of.

**`npm run theme:check` grades the generated themes** (2026-08-18). `check-contrast.mjs`
takes scheme and profile as FLAGS and never iterates them, so covering one theme file
means four runs — and `npm run contrast` is `--hub` only while `contrast:dark` targets
`docs-dark.css`, so generated themes were graded by hand, which for a gate means not at
all. `scripts/check-themes.mjs` is that loop and nothing else: it discovers `theme-*.css`
(`src/styles` in a spoke, `apps/site/src/styles` here), discovers the profile names out of
`dist/tokens.css`, and prints a theme × profile × scheme matrix. It **shells out** to
`check-contrast.mjs` rather than importing the grader — re-composing the token layers is
the part that is easy to get almost right, and that script's history is a list of audits
whose inputs stopped describing what they claimed to report on.

Two things it gets right that a substring check would not:
- **A theme with no profile block is flagged, not shown as a flat column.** The test
  matches a real SELECTOR (`[data-a11y-assurance="x"] … {`) after stripping comments,
  because a generated theme names the attribute in its own header comment — a substring
  test reports every file as having a block, including one whose blocks were deleted.
- **Failing is proven, not assumed.** Verified against a hostile brand (`#e5399f`): it
  reports `standard/light ✗1` and `wcag-aa/light ok` in one grid — the profile earning
  itself — and strips to `✗` in both columns once the profile block is removed, which is
  the hub-profile-cannot-reach-a-spoke-brand result made visible.

**`packages/spoke-template` moved with it**, and it was further out than the name: both its
ramps were on the 50/100/…/1000 **web-palette** vocabulary, so the hand-fill path and
`make-theme.mjs` disagreed on the step scale as well as the word. Both are 1–12 now.

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
- **`--color-content-link` AND `--color-border-default-focus` are both emitted, and the
  second one flipped on 2026-08-17.** This line used to say the focus ring "genuinely
  wants the fill step and keeps its derivation". It does not: a step 9 is engineered to
  clear 3:1 as a SOLID FILL, and a ring needs 3:1 as a 2px HAIRLINE on the same surfaces.
  Measured, the hub's own ring came to 2.95:1 raised/canvas and **2.66:1 sunken** — a
  Level AA failure (SC 1.4.11) that shipped for months. Links fail the same way for the
  same reason (measured 3.42:1).
  So the ring now **walks the brand's own ramp** — step 9, 10, 11, 12 — and takes the
  first step clearing 3:1 on every surface in that scheme (`resolveFocusRing`). The hub
  moves one step to `grass-10`; beacon and qanat already clear it at step 9 and are
  untouched. Across 216 seeds every ramp had a usable step (worst best-available 9.55:1),
  so **the ring is always the brand**; the neutral fallback under the walk never fires.
  What this GAVE UP is the tier-2 derivation, which is what stopped cb-fish keeping
  Ecology-green rings on a navy brand — a `var()` chain cannot express "the brand, unless
  it cannot be seen", and CSS has no function that tests a colour's contrast. Three
  things replace it: this generator emits the role for **every** theme in both schemes
  even when the walk picks step 9; `packages/spoke-template` carries the declaration; and
  `check-contrast.mjs` grades it at `fail` on all four surfaces. **A spoke must not
  hand-declare `--color-border-default-focus`** — a theme file loads later at equal
  specificity, so it would override the walk.
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

## Tier 1 is the WHOLE Radix palette, generated (2026-08-17)
`npm run tokens:primitives` (`scripts/gen-radix-primitives.mjs`) writes
`tokens/primitive/color.json` from `@radix-ui/colors`: **66 scales, 792 tokens** — all
25 chromatic hues and all 6 neutral temperatures, light and dark. It grew from 21
scales / 261 tokens, and the baseline went 1,061 → **1,601 names**.

**Why the whole palette rather than the hues in use.** Tier 1 is the shared VOCABULARY
a project composes a theme from. A partial palette is not restraint, it is a vocabulary
with words missing, and the missing word is found by whichever project needs a purple.
**FIVE** of the six neutral temperatures `theme-recipe.mjs` already ACCEPTS had no
primitive behind them — the pre-generation scale list held `gray` and no
mauve/slate/sage/olive/sand at all — so this closed a live gap as well as a future one.
(This line read "Two" until 2026-08-18; the generator's own comment at
`gen-radix-primitives.mjs` L47-50 was right and this was not.)

**A brand ramp is still never a primitive**, and the model is oversold without this:
`rampFrom` lands the client's hex exactly on step 9, so no Radix ramp matches an
arbitrary brand. Themes keep generating their own `--<slug>-brand-*`. Primitives cover
everything else — neutrals, utility hues, data-viz.

Three things the generator's own guards caught, each of which would have silently
re-coloured the system:

- **Radix dark objects reuse the LIGHT key names** — `radix.grayDark` holds `gray1`…
  `gray12`, not `grayDark1`. Prefixing by export name returned null for every dark
  scale and surfaced as "would DROP 7 scales", not as an error.
- **Two scales are Radix under another name.** `copper` is `bronze`; **`yellow` is
  `AMBER`** — hub `yellow-9` is `#ffc53d` (amber-9), where real Radix yellow-9 is
  `#ffe629`. Regenerating `yellow` would have moved all 12 steps of the scale backing
  the WARNING intention. Both are in `PRESERVE`, and adding real `amber`/`bronze` means
  those values now ship under two names — honest, but a `migrations.json` row if the
  aliases are ever retired.
- **`grass-dark`, `lime-dark` and `gray-dark` disagree with Radix** (8, 7 and 1 steps)
  while their descriptions claim to BE the Radix dark scales; `blue-dark`, `red-dark`,
  `green-dark`, `yellow-dark` match exactly. That reads as transcription drift from an
  older version, not tuning. They are PINNED anyway: `grass-dark` backs the brand in
  dark mode, so re-pointing it is a visible re-colouring that deserves its own change
  and its own before/after, not a side effect of widening the palette. **Unresolved.**

Alpha scales are deliberately NOT generated. Radix ships an alpha twin of every scale;
adding them would double this file again and nothing asks for them — the hub's three
(`gray-a`, `black-a`, `white-a`) are hand-authored overlay washes and are preserved.

## Data-viz colour is GENERATED and SEARCHED, not picked (2026-08-17)
**`dataviz` is an INTENTION under the `background` property**, filed exactly like
`utility`: an intention that is an axis with named rungs. So the names are
`--color-background-dataviz-<scale>-<n>`, **22 in both schemes** — categorical 8
(identity), sequential 7 (magnitude), diverging 7 (polarity, neutral midpoint at slot
4). A series colour paints a fill, so `background` is the property; the rungs are the
scales.

They were briefly `--color-dataviz-*`, which **dropped the property slot** — the one
thing SPEC.md's grammar says is never optional, in the same breath as the example it
gives: not `--color-danger`, because that one is a background and the name should say
so. A name without a property is not guessable, and it is the reason `utility` reads
`--color-background-utility-danger` rather than `--color-utility-danger`.

Derived by `scripts/lib/dataviz.mjs` from the brand seed; the hub's own values are that
generator's output for `grass-9`, committed. **Edit the derivation, never the values.**

**THE GENERATOR DID NOT EMIT THESE UNTIL 2026-08-18, AND DARK WAS THE HALF THAT BROKE.**
`theme-recipe.mjs` contained no reference to `dataviz` at all, so a generated theme shipped
zero of these 22 names in either scheme. In light that was invisible — the theme silently
inherited the hub's grass-derived values from `dist/tokens.css`, wrong brand but legible. In
dark it was not: **`@esa/tokens` has no dark block**, and the hub's dark series palette lives
in `apps/site/src/styles/docs-dark.css`, a SITE file a spoke never installs. So a spoke in
dark mode painted its charts in the *light* series colours on a near-black page. Measured
across 8 brand seeds: three failures every time, byte-identical ratios every time
(categorical-7 2.85:1, sequential-7 1.45:1 and 1.56:1) — and that identicality across eight
different brands is what proves nothing on the path was brand-derived.

`deriveDataviz` runs **once, after the per-scheme loop**, not inside it. The slot order has
to satisfy protan, deutan and normal separation in BOTH schemes at once, so searching per
scheme could seat two different hue orders and series 3 would change identity when the user
flipped to dark.

**A near-black or pale brand used to CRASH it**, and wiring it in is what found that. The
chroma re-tint clamps to 0.45 for a brand with almost no chroma, which pushes every hue under
`CHROMA_FLOOR` — the stylistic preference ("a muted brand yields a muted palette") and the
legibility bar deadlock, and `deriveDataviz` threw. Nothing had hit it because nothing called
it with a hostile seed; once `theme-recipe.mjs` did, the throw killed generation of the
**whole theme** for brands that had generated fine before. The preference now yields: the
ratio walks back toward 1 until a palette seats, and the theme reports where it landed.
Status colours are NOT here — tier 2 already ships
`--color-{background,border,content}-utility-{info,success,warning,danger}`, and the
data-viz method reserves status hues so a series never impersonates a state.

**The slot ORDER is the accessibility mechanism, and it is searched.** Hue-wheel
spacing does not predict colour-vision separation: the first hand-picked spacing put
jade beside magenta at ΔE 2.4 under deuteranopia, against a target of 8. So
`orderCategorical` walks the wheel as a graph — an edge exists where two hues stay
apart under protan AND deutan AND full-colour vision, in BOTH schemes — and looks for
a path of 8. `scripts/lib/cvd.mjs` holds the Machado matrices and OKLab distance,
in-repo because the palette is generated for brands nobody has picked yet.

Four things that cost a cycle each:

- **One fixed step per hue makes it unsolvable.** 21 of 72 swept brands could not seat
  8 slots even with the all-pairs floor off. Letting the search choose the STEP as well
  as the hue fixes it, because **CVD simulation preserves lightness** — two hues that
  collapse under deuteranopia separate again if one is darker. Lightness is the second
  axis the gate measures, not a fallback.
- **A single threshold set cannot serve every brand**, so `LADDER` relaxes in named
  rungs and records which one a theme reached: across 72 seeds, strict 35 / target 15 /
  floor 14 / incomplete 8. `floor` is the method's own CVD 6–8 band, legal ONLY with
  secondary encoding — `esa-chart` rotates marker shapes, so that holds by construction.
- **Sequential must be INTERPOLATED, not sampled off a Radix ramp.** A Radix light ramp
  spends steps 1–8 on backgrounds and borders, so sampling 7 ordinal bins produced
  literal DUPLICATES — two bins the same colour. Endpoints come from the brand ramp and
  the middle is interpolated in OKLCH; chroma is read off the ramp *at that lightness*,
  because interpolating chroma between two deliberately low-chroma endpoints yields a
  ramp of muddy greys that never passes through the brand.
- **Diverging is deliberately NOT brand-derived.** Deriving an arm from the brand gives
  a green-brand theme green↔red — the worst pairing for the commonest deficiency. Poles
  are fixed blue↔red with a neutral grey midpoint.

**Two bars, not one, and the gate encodes both.** 26 pairs in `contrast.mjs`, graded
against the two surfaces a chart actually renders on (raised and default — charts do
not open in popovers). Categorical and the magnitude ENDPOINTS at 3:1 `fail`;
`sequential-1` at **2:1**, the ordinal bar for a bin that means "near zero" and is meant
to recede; `diverging-4` at `warn`, because a near-neutral midpoint whose job is to
disappear must not block the gate. Adding these left the hub at its historical 7 light /
5 dark failures — zero new.

**All-pairs cannot be satisfied and is not meant to be.** Eight slots clear the ADJACENT
gate (bars, lines, stacks); any-two-together — scatter, bubble, choropleth — measured a
safe cap of 2–3 series. That is a charting rule to document, not more tokens.

## SUCCESS IS GREEN, NOT LIME (2026-08-18)
`--color-background-utility-success` was `{color.lime.9}`. Lime reads as a highlighter
rather than a state, and lime-9 sits **1.31:1 against the page** — a fill whose edge you
cannot see. It is now `{color.green.9}` (3.08:1), with the whole family moved: hover 10,
subtle 2, border 6, text 11.

**The foreground could not come along, and that is the part to know.** Tier 2 had two
patterns for `content-on-utility-*`: `{color.gray.1}` (white) for `danger` and `info`,
whose step 9 is dark, and `{color.<own>.12}` for `warning`, whose step 9 is bright. **green-9
is neither** — white fails on it, and green-12 on green-9 is only **3.90:1**. It takes
`{color.gray.12}`, the neutral's darkest, at **5.16:1**. So a mid-tone fill is a third case,
and copying either existing pattern would have shipped a failure.

**THE HUB WENT 7 → 8 LIGHT FAILURES, and the new row is a Radix marginality rather than a
green one.** `--color-content-utility-success` on its own `-subtle` tint measures **4.49:1**.
Radix engineers step 11 for ~4.5:1 on step 2 and several scales land a hair under — measured:
green 4.49, jade 4.43, **yellow 4.43 — already one of the pre-existing failures** — against
blue 4.53, lime 4.56, red 4.94. Success now sits beside warning in the same known band. If it
ever has to come off the list without leaving green, `-subtle` at green-**1** gives 4.65:1.

**THE REAL COST IS THAT GREEN COLLIDES WITH THE HUB'S OWN BRAND.** grass-9 vs green-9 is
OKLab **deltaE 3.06**, and **2.99** under simulated colour-vision deficiency — below even the
6–8 floor band `dataviz.mjs` treats as the minimum for telling two hues apart. Lime was 24.51
/ 22.89 away. So on THIS site a success badge and a brand button are near enough the same
colour. That is a hub-default problem, not a system one: a spoke re-points its brand, and for
any non-green brand green is the conventional success hue. Not fixed, deliberately —
`green-11` is deltaE 11.7 from grass and takes white text at 4.60:1 if it ever needs fixing.

`green` is NOT in `dataviz.mjs`'s `WHEEL`, so no series can impersonate the new success
colour. `lime` is in the wheel and was the old one, so this closed a collision as well as
opening one.

## Assurance is a THIRD axis, orthogonal to the theme

**THE ATTRIBUTE WAS RENAMED `data-assurance` → `data-a11y-assurance` IN THIS PASS,
AND NOTHING CAN MIGRATE IT.** `migrations.json` has four kinds — `token`, `class`,
`prop`, `component` — and none of them describes an attribute on `<html>`. So there is
no alias, nothing for `/update-tokens` to rewrite, and nothing for `doctor` to warn
about. A spoke whose `BaseLayout.astro` sets the old spelling (which is what
`packages/spoke-template` shipped until this change) keeps parsing, keeps building, and
**silently stops getting the profile** — the exact shape of "our brand stopped applying",
except the thing that switches off is an accessibility conformance profile. `assurance.css`
matches the new spelling only; the old one is accepted nowhere. Grep a spoke for
`data-assurance` by hand before it takes this version.

`data-a11y-assurance="wcag-aa"` (2026-08-16) is a conformance profile, not a theme, and
composes with `data-theme` (brand) and `data-scheme` (light/dark) — a project is
entitled to be on-brand AND assured. Authored ONCE in
`packages/tokens/src/assurance.css`, appended into `dist/tokens.css` by `build.js`,
**inert unless the attribute is set**, so there is nothing for a spoke to import.
Not an opt-in import on purpose: spokes override 3 of 26 brand-derived roles, so
"you must ALSO import X" gets forgotten — `focus.css` is the standing proof. A
spoke sets the attribute and declares none of these names itself.

**THE HUB'S PROFILE DOES NOT BEAT A SPOKE'S THEME, and on a generated theme it is
INERT.** `[data-theme]` and `[data-a11y-assurance]` have identical specificity (0,1,0)
and the theme's stylesheet loads later, so a re-pointed brand wins. Measured
2026-08-18: `check-contrast.mjs theme-beacon.css` and the same run with
`--assurance wcag-aa` produce **byte-identical output**. The profile re-points 16
names and a generated theme declares 15 of them; only `--focus-scroll-margin`
survives. It could not be otherwise even if it won — the hub's block points at
`var(--color-grass-11)`, its OWN brand, which would be wrong to paint onto a spoke.
The hub cannot know a spoke's brand ramp.

**SO THE GENERATOR EMITS A PER-THEME PROFILE, and that is the half that moves a
brand (2026-08-18).** `theme-recipe.mjs` § (9.5) derives an assurance variant in the
same pass as the theme — same ramps, same surfaces — and `emitCss` writes two more
blocks: `html[data-theme="x"][data-a11y-assurance="wcag-aa"]` (0,2,1) and
`html[data-scheme="dark"][data-theme="x"][data-a11y-assurance="wcag-aa"]` (0,3,1). A spoke
sets the attribute and gets step 11 of ITS OWN ramp. Nothing to import; inert until set.

Four things that are easy to get wrong here:

- **IT MOVES ONLY WHAT FAILS, and the obvious rule is degenerate.** "Emit the darker
  fill whenever it reads BETTER than the base" sounds like the measured version and was
  written first. Contrast is **monotonic toward the ends of a ramp**, so a step-12 fill
  under white always outscores everything before it and the test reduces to "always take
  the darkest step" — run against beacon it turned `warning` (yellow `#ffc53d`) into
  `#4f3422`, a near-black brown that clears AA and is no longer a warning colour. That is
  exactly what `assurance.css` refuses by hand when it excludes `warning`. The condition
  is the base theme's own verdict instead: a fill moves iff no foreground reached AA on
  it. Radix's five bright scales then keep step 9 with no special case naming them.
- **A SMALL BLOCK IS THE CORRECT OUTPUT.** Both shipped themes emit exactly one row
  (`--color-content-default-muted` → neutral 11, the `warn`-graded muted-text rung).
  That is not a missing feature — it means the theme was already AA, which a generated
  theme is, 66/66 in both schemes. The block earns itself on a **hostile brand**: seed
  `#e5399f` fails at 4.20:1 in light (the brand hex is the one fill the base derivation
  is forbidden to move) and the profile rescues it to 4.91:1 at step 11, with an `info`
  warning saying so.
- **BOTH BLOCKS DECLARE THE SAME KEY SET, and that is a specificity fix.** The light
  assurance block is (0,2,1) — **so is the base dark block** — and it carries no
  `[data-scheme]`, so in dark mode with the profile on it matches, ties, and wins on
  source order. Any name light moves and dark does not is a hole a LIGHT colour drops
  through onto a near-black page. So a scheme with no change of its own **restates its
  base value**. `#e5399f` is the live case: light moves the brand to step 11, dark
  restates step 9.
- **No `--focus-scroll-margin` and no `--color-content-disabled`.** The hub's 76px is
  the hub app-shell's bar height; guessing a spoke's chrome height into the spoke's own
  file is worse than letting the hub's floor apply. Disabled text is exempt under WCAG
  1.4.3 and raising it makes disabled read as enabled.

`beacon`'s old `content-on-brand-secondary` failure at 3.64:1 is **gone** — the
`secondary` → `muted` merge earlier the same day removed the role. Both shipped themes
now pass 66/66 in both schemes with and without the profile. The teeth are still in the
gate rather than the cascade, and **no npm script runs it**: `npm run contrast` is
`--hub` only, so `check-contrast.mjs <theme>.css --assurance wcag-aa [--scheme dark]`
is a by-hand run. That is a gap in the gate, not a property of this change.

**A profile is a TOKEN SCOPE.** It re-points values; it cannot add behaviour,
markup, or a rule inside a shadow root — `:host-context()` is Chromium-only and
`@container style()` is not baseline, so **inherited custom properties are the only
channel that crosses a shadow boundary in every engine**. So it fixes contrast,
ring weight, min type size and the target-size floor, and fixes NONE of:
the NON-modal overlays, or anything in forced colors. The modals are fixed: on
2026-08-18 all six moved onto native `<dialog>` + `showModal()`, which supplies
inertness, focus containment, focus return against the real trigger node, Esc
(including OS close requests) and the top layer. Still open: `esa-popover`,
`esa-dropdown-menu`, `esa-filter-dropdown` and `esa-combobox` (`mode="select"`
only) strand focus at `<body>` on close, and `esa-entity-search` binds Tab to
cycling its facets, leaving its row-action buttons reachable by no key at all.

(The line here through 2026-08-17 named `esa-date-picker`'s "absent keyboard
handling (SC 2.1.1, Level A)" and "the nine popups". Both were wrong — the date
picker is a native `<input type="date">` with no popup, and the nine was
miscounted in both directions. See the struck entries under "the batched
accessibility pass" in `docs/system-improvement-ledger.md`: **a count was the
wrong shape for this and went stale in silence**, which is why the guard in
`scripts/lib/overlay.test.mjs` holds a list of names instead.) Setting the attribute is a
statement about DEFAULTS, never a certificate — `npm run a11y:assured` is what makes
it more than a promise.

**A PROFILE CHANGES COLOUR. IT NEVER CHANGES A COMPONENT.** Verified: geometry is
byte-identical with and without `[data-a11y-assurance]` across all 91 built pages. Two
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
target state, not a gap.** After the 2026-08-16 passes, **33 of 67** components own
a namespace (`--card-*`, `--dialog-*`, …); the other 34 theme entirely through
tier 2, which is what a spoke re-points anyway. 55 of 67 still READ a tier-3
hook, but mostly the two shared surfaces — `--focus-ring-*` and `--form-*`. A
component's doc page rendering an empty "Wired to this component" table is
correct output; its hooks moved into "Shared tokens it reads". Do not treat that
as a component missing its surface and re-add hooks to fill it.

**THE COMPONENT COUNT IS 66, AND IT IS NOT `ls | wc -l`.** That directory holds
67 FILES; the odd one out is `icon-registry.ts`, which is not a component and is
named in `EXCLUDE` in `catalog.ts` for exactly this reason. It read 65 (of 66
files) until 2026-08-17, when `esa-chart.ts` landed. It briefly read 70, when a
real `esa-map` host plus `esa-map-geojson`, `esa-map-marker` and `esa-map-popup`
landed on this branch; **that work now lives on the `map-work` branch** (worktree
`../ecology-map`) and is not checked out here, so `esa-map` is a
`type="reference"` wrapper again and the reference count is back to three. "66"
also stood here from 2026-08-16 for the WRONG reason — written in the same commit that added
`esa-error-summary.ts` and took the file count to 66 — and the file contradicted
itself in two places while it did: 34 Lit + 31 `.astro` was 65, and 65 (+3
reference wrappers) was the 68 doc pages on disk. So the number is right again
today by a different route, which is exactly why it is not worth trusting from
memory. Nothing was deleted to explain a drop; `git log --diff-filter=D`
over `esa-*` is empty. The authority is `componentCount` in
`apps/site/src/data/catalog.ts` (`sourceSlugs.size`, regex-matched), which the
catalog index renders — read it there rather than counting by hand. The "28 of
66" above was 28 + 38 = 66, both halves back-derived from the wrong total; the
32/33 replacing them come from the site's own generated `themingSurface`
(`scope === 'exclusive'`), which is what the doc pages render.

Every one of the 70 (+2 reference wrappers) still has a doc page rendering its
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

## The Angular tab is GENERATED from the HTML sample beside it (2026-08-17)
Every `<Preview>` on a `type="wc"` page renders a second, Angular code panel,
derived from the sample already there. **98 of 106 covered — 96 generated, 2
authored.** Most ESA apps are Angular, and none of what an Angular developer gets
wrong here is visible on a component page otherwise.

Three layers, and the split is what keeps spokes working:
`scripts/lib/angular-snippet.mjs` (the pure, isomorphic transform — tokenizer,
attribute classifier, `<script>` translator), `apps/site/src/data/angular-snippet.ts`
(the hub oracle: which tags are real elements, memoization, the coverage report),
and `apps/site/src/components/Preview.astro` (a thin wrapper). **`@esa/docs/Preview.astro`
computes NOTHING** — it takes a finished `angular?: string | null` and is inert
without it, because a spoke has no hub sources to parse. Pages opt in by swapping
one import line; **an alias silently redirecting `@esa/docs/Preview.astro` was
rejected** — an import that resolves somewhere other than where it points is
exactly the magic this repo spends paragraphs warning about.

**`ok: false` is a normal result.** Anything the transform cannot do with certainty
emits no tab plus a line in the build's coverage report. The 8 remaining refusals
are correct: 5 samples are data fragments with no markup at all, 3 are imperative
demos (`whenDefined`, a `checkValidity()` loop) with no faithful Angular form.

Four rules that look like bugs and are not:
- **Never "fix" an attribute.** A prop declared `{ type: Array }` WITH an attribute
  (`esa-pagination`'s `pageSizeOptions`, `attribute: 'page-size-options'`) is parsed
  by Lit's JSON converter straight off the attribute, so a sample writing it as one
  stays an attribute. `[prop]` would make the two tabs disagree, which is the one
  thing generating from the sample exists to prevent — it is only for
  `attribute: false`, accessors, and script-assigned props.
- **Never invent an event binding.** `(change)` appears only if the sample shows a
  listener. The general question is answered once, in the generated block under
  each events table.
- **An implicit handle binds to the sample's SOLE custom element.** Real samples
  write `el.options = […]` and `chart.data = […]`; refusing them cost a third of
  the corpus. More than one element is ambiguous and refused.
- **Only 35 of 66 components are real elements.** The rest are `.astro`, and
  `<esa-badge>` in an Angular template renders nothing with no error — so those
  pages get NO tab. Its absence is information. `/guide/angular` states that, plus
  the fact that **`@esa/ecology` is not yet installable into a stock Angular build**
  (raw `.ts` from `node_modules`, `.js`-extensioned specifiers, and a hard `astro`
  peer). That caveat is stated ONCE, not per snippet.

**`="false"` ON A BOOLEAN PROP IS `true` UNDER LIT'S DEFAULT CONVERTER, and six
props were quietly broken by it.** The default is `value !== null`, which is the
right reading for a prop defaulting to FALSE — `disabled` is off until you write
it. For a prop defaulting to TRUE it collapses: `collapsible="false"` set it to
`true`, and so did omitting the attribute, so **no markup turned it off at all**
while the attribute sat there looking like it worked. Five doc pages documented it
for months. Nothing objected — not the build, not the types, not axe, which cannot
see an attribute that does nothing.

Fixed 2026-08-18 with `packages/ecology/src/boolish.ts`, a converter reading
`false`/`0`/`off`/`no` as false, on the six: `esa-color-picker show-input`,
`esa-file-list downloadable`, `esa-pagination
show-{page-size-selector,first-last-buttons}`, `esa-range-slider show-value`,
`esa-sidebar-nav collapsible`. Verified in a real browser — `="false"` and `="0"`
turn them off, absent and bare stay on, so the default and normal presence
semantics both survive.

**Use `boolish` ONLY for a prop that defaults to `true`.** A default-false prop must
keep presence semantics; `<esa-x disabled="false">` reading as "enabled" would be its
own surprise. `toAttribute` removes the attribute for `false` rather than writing
`="false"`, so a reflected prop round-trips. Inverting the six names
(`no-collapse`, `hide-input`, …) is more idiomatic HTML and was rejected as six prop
renames, six `migrations.json` rows and six shims, to fix markup already written.
The `="false"` ratchet in `angular-snippet.corpus.test.mjs` stays live for every prop
WITHOUT a converter, and `ApiTable` generates the "write `=\"false\"` to turn it off"
note only where one is declared.

`scripts/lib/component-api.mjs` was split out of the data module so the corpus test
could run against the real parse (and so two parsers backing every API table finally
got tests). It **finds the repo root by SEARCHING for `packages/ecology/src/components`,
not by counting directories up** — vite decides whether to inline the module, and the
moment `angular-snippet.ts` imported it the pair landed one level shallower and the
build died on `apps/packages/…`, a path that never existed. Every other data module
here still counts, and is still exposed to that.

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

## `secondary` was never a second fill — it was step 8 (2026-08-18)
`--color-background-brand-secondary` sat on **Radix step 8**, which is the *hovered UI
element border* step, used as a solid fill. Measured against its own step-12 foreground
that is **3.51–5.47:1 in light and 3.82–4.67:1 in dark** — an AA failure for several
brands, and the reason `beacon` had been failing `content-on-brand-secondary` at 3.64:1
for months. `theme-recipe.mjs` was papering over it with a `movable: true` walk that
still left most brands marginal.

**Step 3 is Radix's UI-element background step** and measures 10.27–11.80:1 / 11.33–12.54:1
with the same foreground, for every brand, in both schemes, with no search and no walk.
But step 3 was ALREADY `--color-background-brand-muted`, and step 4 already
`-muted-hover`, so the two families **merged** rather than both surviving — two tier-2
names over one value is the exact aliasing the 2026-08-16 demotion pass removed 168 of.
`muted` survives; it is the surface intention. Beacon's pair is now **10.48:1 / 11.33:1**.

`--color-content-brand-secondary` needed no argument at all: it was declared
`var(--color-grass-11)` in `:root` and `var(--color-grass-dark-11)` in the dark block —
byte-identical to `--color-content-brand` in both. A pure alias with no value of its own.

Four things worth knowing:

- **This is a RENAME row, not a removal**, unlike the tier-3 demotions. Both sides are
  whole tier-2 roles at the same scope, so a spoke's `--color-background-brand-secondary: X`
  genuinely does mean `--color-background-brand-muted: X`. The tier-3 rule exists because
  demoting a one-component hook widens a narrow override into a system-wide one; nothing
  widens here.
- **A step-3 fill is 1.09–1.28:1 against the page**, so `esa-button` grew a border for this
  variant — `--_accent-border`, defaulting to `transparent` so every other variant computes
  byte-identically. It is the **neutral** `--color-border-default-strong` because no brand
  step reaches 3:1 against the page either (step 6 = 1.46–1.75, step 7 = 1.74–2.32,
  step 8 = 2.27–3.37) — measured, and `appearance="soft"` already drew exactly this border
  for exactly this reason.
- **A DOT IS NOT A FILL.** `.esa-badge--dot--secondary` read `-secondary-hover` as an 8px
  solid mark; step 4 would have made it ~1.15:1 against the page. It now reads
  `--color-background-brand` (step 9) — which is the value it already resolved to, so the
  dot is unchanged.
- **The chained-rename guard earned itself.** An older row, `color-tier2-property-first`,
  renamed `--color-secondary` onto `--color-background-brand-secondary` — a name this row
  then deprecated. A spoke running the codemod would land one migration behind and be told
  it succeeded; `token-rename.test.mjs` caught all four destinations.

`esa-card` was separately reading `--color-content-on-brand-secondary` for its
`--header-primary` subtitle — on a `--color-background-brand` header, at 3.99:1 — while its
own comment said the token should be `content-on-brand`. Fixed in the same pass.

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

## Charts — `esa-chart` wraps AG Charts, and a canvas breaks every rule above
`esa-chart.ts` (2026-08-17) is the kit's first component over a **canvas**, and
almost every mechanism this file documents stops at that boundary. `ag-charts-community`
is an **optional peer dependency** loaded by dynamic `import()`, so a spoke that never
charts pays nothing and `@esa/ecology`'s hard dependency list stays at `lit` alone.

**AG Charts was scored in a real browser, not read about**, against the five-question
rubric (SVG-or-canvas / role+name / text alternative / keyboard to data / reduced
motion). It answers: canvas **but with a synchronized proxy DOM**, pass-with-a-generic-name,
**none**, pass, **never asks**. `npm run a11y:charts`
(`scripts/check-chart-a11y.mjs`) re-scores it — an upgrade can silently undo any of
it and **axe stays green throughout**, because all of this is behaviour, not markup.

Traps found by measuring, each of which cost a cycle:

- **Probing via the UMD bundle MISLEADS.** UMD auto-registers modules; the ESM entry
  ships an empty **module registry** and `create()` throws "No modules have been
  registered". Charts render fine in a UMD probe and the real build is blank.
- **`AnimationModule` is ENTERPRISE.** Community cannot animate at all — which is
  why the reduced-motion probe found nothing to disable. So the component only ever
  asserts `animation.enabled: false`; asking for animation makes every Community
  chart log a buy-Enterprise notice. Saying "off" still matters, for the day someone
  registers the Enterprise module.
- **CSS custom properties do not reach the canvas.** The wrapper carries ~60
  `--ag-charts-*` and the library's own CSS consumes 49 — but overriding them with
  `!important` changes `getComputedStyle` while the canvas keeps painting its old
  colours. Chrome (tooltip, legend, menus) is CSS-themable; **marks are not**, so
  every mark colour is resolved in JS and re-resolved on a `MutationObserver` over
  `data-theme`/`data-scheme`. A canvas does not repaint on a cascade change.
- **AG Charts ships its own colour parser, and BOTH times that bit it was invisible
  in Chrome.** `CanvasText` throws `Invalid color string` (so the forced-colors "fix"
  was strictly worse than none, and axe has no forced-colors rule to catch it). Worse:
  **on a wide-gamut display Safari resolves `var()` chains to
  `color(display-p3 …)`** where Chrome and Firefox give `rgb(…)` — same throw, so the
  chart was an EMPTY BOX for every Safari user while looking perfect in the browser
  being tested. Hence `normalizeColor`, which every colour crossing the boundary goes
  through, and the **per-engine render smoke test** at the top of `npm run a11y:charts`.
  Note reading `fillStyle` back is NOT a conversion — WebKit accepts
  `color(display-p3 …)` and returns it unchanged, so the first fix was a no-op on the
  only engine that needed it. You have to **rasterise one pixel** and read it back;
  a 2d context is `colorSpace: 'srgb'`, which is what forces the gamut conversion.
- **The generated name `"chart, N series"` is not configurable and IS REWRITTEN on
  every render.** There is no top-level `ariaLabel` option and `title.text` does not
  feed it. Setting it once is silently reverted by the next resize or re-theme, so a
  `MutationObserver` holds it.
- **`legend.item.paddingY` IS NOT AN OPTION** — accepted and ignored. `item.padding`
  is inter-item spacing. `item.marker.size` is the only lever on item height, 1:1.
  We do not pull it: legend items render 16px, and SC 2.5.8's **spacing exception**
  passes them (axe reports zero target-size violations). Target size is REPORTED, not
  patched — but note the exception is layout-dependent.
- **A line series has no `fill`.** Setting the wrong colour option logs
  `Unknown option series[N].fill, ignoring` and leaves the series off-palette.
- **AG Charts mounts its OWN live region inside the shadow root.** It is adopted —
  demoted to a plain element, its text mirrored through `announce()` — because the
  kit's ceiling is the announcer's two regions and cross-boundary observation is
  unreliable. `npm run a11y:live` catches this if it ever comes back.

**Shadow DOM is fine, and that was measured** — the library injects its stylesheet
into the shadow root too, so `esa-chart` needs no `createRenderRoot` escape.

**Series colour comes from the tier-2 `--color-background-dataviz-*` family.** Until it lands
the component uses a built-in ramp validated through the `dataviz` skill's
`validate_palette.js` **against this system's own surfaces** (`#fcfcfc` / `#191919`),
and **warns in the console** — a fallback that works silently is how a token never
gets wired. In light mode three of its eight slots sit under 3:1, which the validator
allows only **with relief**: the paired data grid IS that relief, not a nicety.

**A chart ships WITH its data as an `esa-grid`.** AG Charts has no table view, so the
chart alone does not meet the text-alternative requirement. That is a composition,
deliberately not a prop.

## Conventions
- `esa-` prefix; sizes use the shared scale `xs | sm | md | lg` (default `md`); icons add `xl`. (Aligned to Beacon's `UiSize` — see docs/beacon-gap-analysis.md. One scale across button/input/icon so they line up on a row.)
- SCSS-style private tokens: `--_*` reading public tokens, **always with a literal fallback**.
- Use only token names that exist in `packages/tokens/dist/tokens.css` + `component-tokens.css`.
- Icons: inline Lucide SVGs (no icon dependency). When a `.ts` (Lit) component **injects** icon markup from a prop/string, use `unsafeSVG` (`lit/directives/unsafe-svg.js`) — **not** `unsafeHTML`. `unsafeHTML` parses in the XHTML namespace, so the `<path>`/`<rect>` children are created as unknown HTML elements and never paint. `unsafeHTML` is only for injecting real HTML (e.g. highlighted text into a `<span>`). Static SVG written literally in a Lit template is fine as-is.
- No Tailwind. No dependencies beyond `lit`.
- In `.astro` prose/`<code>`, never write bare `{ ... }` (Astro evaluates it). Use `{'{ ... }'}`.
- **Prose that shows markup must be passed as a JS EXPRESSION, not an HTML attribute** —
  `summary={'… <code>&lt;button&gt;</code> …'}`, never `summary="… &lt;button&gt; …"`.
  Escaping in the attribute does not survive: Astro's attribute parser decodes
  `&lt;` before the prop is read, and `ComponentDoc`/`PatternDoc` render `summary`
  with `set:html` — so the entity round-trips back into a REAL element. Found
  2026-08-16 by `npm run a11y`: `esa-switch-toggle`'s lede shipped a live,
  nameless `<button role="switch">` and `esa-nav-dropdown`'s shipped a live
  `<details>`, both looking correctly escaped in source. Inside an expression no
  decoding happens, so the entity reaches `set:html` intact and renders as text.
  Real `<a href>` links in the same string still work — they are markup either way.
  Scan the BUILD, not the source: `grep -rhoE '<code><(button|input|details)' apps/site/dist`.

## Commands
```bash
npm install
npm run dev            # build tokens, then serve the site
npm run build          # tokens + static site build
npm run build:tokens   # just compile tokens → packages/tokens/dist/
npm test               # token-name guard + hook regressions (scripts/**/*.test.mjs)
npm run a11y           # axe-core over every built page (needs `npm run build` first)
npm run a11y:live      # live-region structure audit (needs `npm run build` first)
npm run a11y:charts    # re-score AG Charts against the 5-question rubric (needs `npm run build`)
npm run contrast       # 66 pairs against the hub defaults — currently FAILS with 7
npm run contrast:dark  # the same pairs against the hub's dark block — fails with 3
npm run theme:make     # recipe (or --brand/--slug) → theme-<slug>.css + .json
npm run theme:curves   # regenerate scripts/lib/radix-curves.json from @radix-ui/colors
npm run tokens:primitives  # regenerate tier-1 colour ramps from @radix-ui/colors (dry run; --write)
```

**`npm run contrast` exits 1 on the hub's own defaults and always has** — 8 AA
failures, `content-on-brand` at 2.95:1 among them. That is not a regression to chase
on sight; `npm run a11y:assured` passes because the assurance profile moves those
fills from Radix step 9 to step 11, which is what the profile is for. A GENERATED
theme passes 66/66 in both schemes, so a spoke can be cleaner than the hub.

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
