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

**The 2026-08-16 pass took tier 3 from 306 declarations to 116** — 16 dead names
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

**Theming = override the semantic and/or component layer** under a `[data-theme="x"]`
scope. Primitives never move; component internals are never touched.
The full contract — naming, when a property earns a tier-3 hook, the
zero-regression splice mechanic — is **`packages/tokens/SPEC.md`**.

**Most components no longer have a tier-3 surface of their own, and that is the
target state, not a gap.** After the 2026-08-16 pass, **28 of 66** components own
a namespace (`--card-*`, `--dialog-*`, …); the other 38 theme entirely through
tier 2, which is what a spoke re-points anyway. 55 of 66 still READ a tier-3
hook, but mostly the two shared surfaces — `--focus-ring-*` and `--form-*`. A
component's doc page rendering an empty "Wired to this component" table is
correct output; its hooks moved into "Shared tokens it reads". Do not treat that
as a component missing its surface and re-add hooks to fill it.

Every one of the 66 (+3 reference wrappers) still has a doc page rendering its
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
```

`npm run a11y` serves `apps/site/dist` on an ephemeral port, waits for custom
elements to upgrade (auditing pre-hydration HTML is how you get a meaningless
all-clear on a kit that is half web components), and reports grouped by rule. It
does NOT gate — pass `--strict` for that. `--url http://localhost:4322` audits the
dev server instead, which is the only way to reach debug pages (they return `[]`
from `getStaticPaths`, so the build contains none of them).

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
clean on a page that is unusable in Windows Contrast Themes. As of the 2026-08-16 audit
the kit has **zero** forced-colors support — `forced-colors`, `forced-color-adjust` and
every system-colour keyword appear 0 times across all 66 components and both token
packages. The findings are logged in `docs/system-improvement-ledger.md` and deferred to
the batched accessibility pass; the judgment layer is
`plugins/spoke-kit/skills/accessibility/forced-colors.md`.

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
painted only with `box-shadow`. It swept the 66 components at 0 flagged / 0 false
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
