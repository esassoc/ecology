# Ecology — Framework-Agnostic Design System Hub

## What this is
Ecology is the **hub** of a hub-and-spoke design system for ESA's Data Technology
team. It owns the design **standard** (tokens + specs) and a **reference
implementation** in Astro. Project "spoke" repos pull `@esa/tokens` + `@esa/ecology`,
re-skin via the semantic/component token layers, and hand off to dev teams (on any
stack) who interpret the standard — increasingly with Claude's help.

This repo is **Astro + plain web tech, not Angular.** The original Angular library +
Storybook were the starting point and now live, archived, in `../ecology-angular`.

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
3. **Component** — per-component theming surface → `--form-border-color`, `--sidenav-bg`

**Theming = override the semantic and/or component layer** under a `[data-theme="x"]`
scope. Primitives never move; component internals are never touched.
The full contract — naming, when a property earns a tier-3 hook, the
zero-regression splice mechanic — is **`packages/tokens/SPEC.md`**. As of
2026-08-14 all 64 components expose a tier-3 surface and all 64 (+3 reference
wrappers) have a doc page rendering its generated "Theming surface" table. The
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
```

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
rules, `spoke-init`, `spoke-precommit-review`), Node PreToolUse hooks
(`check-component-first` — no bespoke UI primitives; `guard-hub-writes` — spoke
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
