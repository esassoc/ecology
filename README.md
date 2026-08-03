# Ecology

The design system ESA's Data Technology team prototypes with. Ecology is the
**hub**: it owns the design standard (tokens + specs), a reference implementation
of 60-plus components in Astro, and the Claude intelligence layer that makes the
whole thing drivable by people who don't code. Each project gets a **spoke** — a
small prototype site that re-skins the hub and composes its parts into real
screens.

**Live site:** [esassoc.github.io/ecology](https://esassoc.github.io/ecology/) —
component library, token reference, and specs.

## Start here

| If you're… | Go to |
|---|---|
| New, and here to build prototypes | **[ONBOARDING.md](./ONBOARDING.md)** — soup-to-nuts setup from a fresh machine. No coding background needed, ~45 minutes. |
| Trying to understand how the system works | [How it works](https://esassoc.github.io/ecology/guide/) — hub and spokes, tokens, the two distribution channels. |
| Looking for a component | [Component library](https://esassoc.github.io/ecology/components/esa-button) |
| Wondering what the Claude commands do | [Claude toolkit](https://esassoc.github.io/ecology/guide/toolkit) — generated from the shipped plugin, so it can't drift. |
| Working on the hub itself | [Architecture](#architecture), below. |

---

## Run the hub locally

You need **Node 20 or newer** ([nodejs.org](https://nodejs.org), LTS) and
**Git**. Nothing else — no global CLIs, no Docker, no database.

```bash
git clone https://github.com/esassoc/ecology.git
cd ecology
npm install
npm run dev
```

`npm run dev` compiles the tokens and then serves the specimen site at
**http://localhost:4321**. It watches for changes; leave it running. `Ctrl` + `C`
stops it.

The other scripts:

```bash
npm run build:tokens   # just compile tokens → packages/tokens/dist/
npm run build          # tokens + static site build
npm run preview        # serve the built output
npm run deploy         # build + publish to GitHub Pages
npm test               # node --test over scripts/**/*.test.mjs
node scripts/doctor.mjs # verify this machine's setup
```

**If you're setting up to work on a spoke rather than the hub**, don't stop
here — the spoke needs this repo cloned as a sibling and its tokens built.
[ONBOARDING.md](./ONBOARDING.md) covers the whole sequence.

---

## Architecture

Ecology is **two products wearing one coat**:

1. **A portable standard** — tokens (`@esa/tokens`) + specs + Astro specimens.
   Crosses every framework boundary.
2. **A reference implementation** — the Astro components (`@esa/ecology`) the UX
   team prototypes with.

Components travel as **code** inside the UX prototyping world (hub → Astro
spokes), and as **spec** at the production handoff (spoke → a dev team's real
codebase, interpreted with Claude).

This repo is **Astro + plain web tech, not Angular.** The original Angular
library + Storybook were the starting point and now live, archived, in
`../ecology-angular`.

### Repo layout

```
packages/
  tokens/          @esa/tokens — DTCG source → dist/tokens.css (+ tokens.js)
                   author tokens in tokens/{primitive,semantic}/*.json
                   plus authored partials: component-tokens.css, type-roles.css, layouts.css
  ecology/         @esa/ecology — the components (.astro presentational, .ts Lit interactive)
  docs/            @esa/docs — themeable documentation shell shared by hub + spokes
  handoff/         @esa/handoff — dev-handoff exporter: rendered URL → de-scoped bundle
  spoke-template/  scaffold source for new spokes (never hand-copied — see /spoke-init)
apps/
  site/            the browsable specimen + spec site (dogfoods every package)
                   includes the live theme switcher (default / beacon / qanat)
plugins/
  spoke-kit/       the Claude plugin — skills, guardrail hooks, workflow commands
scripts/           doctor, create-spoke, and the design-adherence checkers
docs/              governance, promotion path, gap analysis, improvement ledger
```

### Token tiers

1. **Primitive** — raw values (`tokens/primitive/*.json`) → `--color-teal-900`, `--spacing-400`
2. **Semantic** — intent, references primitives (`tokens/semantic/*.json`) → `--color-primary`
3. **Component** — per-component theming surface → `--form-border-color`, `--sidenav-bg`

Theming = override the semantic and/or component layer under a `[data-theme="x"]`
scope. Primitives never move; component internals are never touched. Every
component exposes a tier-3 surface, rendered as a "Theming surface" table on its
doc page.

The full contract — naming, when a property earns a tier-3 hook, the
zero-regression splice mechanic — is **[packages/tokens/SPEC.md](./packages/tokens/SPEC.md)**.

### Component buckets

- **Presentational → `.astro`.** Golden pattern: `packages/ecology/src/components/esa-badge.astro`.
- **Interactive → Lit Web Component (`.ts`).** Golden pattern: `esa-switch-toggle.ts`.
  Decorator-free Lit; form controls are form-associated. Web Components work in
  ANY stack — they're the portable interactivity layer, and the reason a
  prototype's behavior survives the handoff.

Conventions, gotchas, and the parallelism rules for component work live in
[CLAUDE.md](./CLAUDE.md).

---

## How a spoke consumes this

A spoke is its own Astro repo, cloned **next to** this one:

```bash
# in cb-fish-design/
npm install                      # @esa/* resolve via file:../ecology/packages/*
```
```css
/* theme-cbf.css — the only required artifact */
[data-theme="cb-fish"] { --color-primary: <brand>; --radius-md: 6px; /* … */ }
```

Then compose prototypes from `@esa/ecology`. Because the dependencies are
`file:` links, a `git pull` in this repo updates every spoke on the machine —
which is also why a dirty hub checkout leaks unmerged work into a spoke's
deploy (`/ship` gates on it).

Patterns that prove broadly useful get **promoted** back up into the hub. See
[docs/promotion-path.md](./docs/promotion-path.md).

### The spoke theming contract

Two rules keep a re-skin safe and portable (both proven out by `../cb-fish-design`,
the first spoke):

1. **Primitives never move.** To change a neutral or ramp value, re-point the
   *semantic* token that consumes it (`--color-border`, `--color-text-muted`) — do
   **not** override the primitive (`--color-gray-200`). Primitives are the shared
   floor; moving them breaks the contract for every component.
2. **The type contract is a matched set.** A brand swaps two faces — `--font-sans`
   (body) and `--font-display` (headlines; defaults to sans, read by the display/
   title type-roles). Font-**weight** values are typeface-bound: the hub's
   `--font-weight-*` match DM Sans's optical weights, so a spoke that overrides
   `--font-sans` must also set `--font-weight-*` to its face's matching weights.
   (cb-fish remaps DM Sans 350/450/550/650 → IBM Plex 400/500/600.)

Brand-tinted surfaces use the `--color-primary-subtle` / `--color-primary-border`
pair (both promoted up from cb-fish's first build).

### Spoke-specific tokens (keeping the hub clean)

A spoke sometimes needs a value the hub doesn't have. Sort it into one of two cases:

- **A gap in an ecology scale** → *promote it to the hub.* If the value is a missing
  rung (e.g. a 40px gap between `--spacing-600`/`32px` and `--spacing-700`/`48px`),
  add it to ecology (`--spacing-650`). This makes the hub *more* complete and
  durable — it's not pollution. cb-fish's old `--cbf-chrome-gap` became `--spacing-650`.
- **A genuinely spoke-specific value** (a brand ramp, a one-off project dimension the
  hub should never carry) → a **namespaced spoke tier**, `--{spoke}-*`, living **only**
  in the spoke's theme file. e.g. `--cbf-blue-*`.

The rule that keeps ecology pristine:

> **Ecology components read only ecology tokens. Spoke components (`cbf-*`) may read
> ecology tokens *and* `--{spoke}-*` tokens. A spoke token never appears in a hub
> component.**

Spoke tokens come in two flavors: **re-point material** (a brand ramp whose only job
is to reassign ecology semantic tokens — components never read it directly, e.g.
`--cbf-blue-950` → `--color-surface-inverse`), and **spoke-local values** (read by
`cbf-*` components but never by `esa-*`). The hub stays unaware that CB Fish exists.

---

## The Claude layer

Not needed to build or serve the hub — but it is how the system is actually
driven. If you don't have Claude Code yet:

```powershell
irm https://claude.ai/install.ps1 | iex          # Windows PowerShell
```
```bash
curl -fsSL https://claude.ai/install.sh | bash   # macOS / Linux / WSL
```

It's self-contained (no Node needed) and auto-updates. `claude --version` to
confirm, `claude doctor` if it misbehaves. Requires a paid Claude plan.
[ONBOARDING.md](./ONBOARDING.md) has the fuller walkthrough.

This repo is also a **Claude Code plugin marketplace**
(`.claude-plugin/marketplace.json`). The **`spoke-kit`** plugin ships everything
Claude needs inside a spoke: skills (`component-first`, `design-principles`,
`accessibility`, …), PreToolUse guardrail hooks (no bespoke UI primitives, no hub
edits from a spoke session), and the non-dev workflow commands `/new-prototype`,
`/design-qa`, `/ship`, `/request-lego`, `/spoke-init`.

Spokes **never copy** these files — their checked-in `.claude/settings.json`
declares this marketplace and enables `spoke-kit@ecology`, so everyone gets the
same rules from one source.

Publishing a plugin change is a three-step trap for the unwary (`marketplace update`
alone silently leaves the old version installed). The full procedure, the frozen
identifiers, and the site's build-time generation rules are in
**[CLAUDE.md](./CLAUDE.md)** — read it before touching `plugins/spoke-kit/`.

## Open seams

- **Token output targets:** `packages/tokens/build.js` is the one seam — add SCSS / TS / Tailwind / Figma platforms there.
- **Specs as content collections:** MD/MDX pattern specs alongside specimens, so humans + dev teams + Claude read one artifact.
- **Publishing:** wire GitHub Packages so spokes install real versioned packages instead of workspace links.
