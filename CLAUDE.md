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
1. **Primitive** — raw values → `--color-teal-900`, `--spacing-400`
2. **Semantic** — intent, references primitives → `--color-primary`
3. **Component** — per-component theming surface → `--form-border-color`, `--sidenav-bg`

**Theming = override the semantic and/or component layer** under a `[data-theme="x"]`
scope. Primitives never move; component internals are never touched.

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
escape token `hub-edit-approved:` requires explicit human approval), and commands:
`/spoke-init` (scaffold a spoke), plus the non-dev workflow verbs `/new-prototype`,
`/design-qa`, `/ship`, `/request-lego`. Spokes **never copy** these files — their
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
- **Publishing**: plugin edits go live for spokes only after **push to GitHub**
  (and `claude plugin marketplace update ecology` on each machine). Local commits
  aren't enough. Bump `plugins/spoke-kit/.claude-plugin/plugin.json` version on
  behavior changes.
- **New spokes**: `/spoke-init` (run from this repo's root) interviews, then runs
  the deterministic `scripts/create-spoke.mjs`, then does the judgment work. Never
  hand-copy `packages/spoke-template/`.
- **The hook is inert in this repo** (it detects the hub via
  `.claude-plugin/marketplace.json` / the `ecology-hub` package name) — specimen
  pages here legitimately contain raw `<input>` markup. It enforces only in repos
  whose `package.json` *depends on* `@esa/ecology`.
