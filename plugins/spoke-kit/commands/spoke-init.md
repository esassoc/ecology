Scaffold a new ESA Ecology design-system **spoke** — a small Astro app that
re-skins the `@esa/ecology` hub via a `[data-theme]` block and documents it —
from the hub's `packages/spoke-template/`.

**Your #1 job is GUARANTEEING the full contract, not cleverness.** The failures
this command prevents: a hand-spun spoke that installed only 2 of the 4 hub
packages and hand-rolled its own foundations; and a hand-copied scaffold that
silently dropped the `.claude/` dot-directory, so Claude worked with no
component-first enforcement and hand-rolled UI that cost a page rewrite.
Completeness beats shortcuts. The deterministic steps are a SCRIPT — never
hand-copy the template.

$ARGUMENTS

## Guard: run from the hub root

Check `package.json` in the current directory. If its `name` is not
`ecology-hub`, STOP — tell the user to run /spoke-init from the ecology hub
checkout root (the new spoke is created as a sibling of the hub). Do not
scaffold from inside a spoke or any other directory.

## Load reference detail first

Read the **`spoke-init`** skill — it ships in this plugin alongside this
command and holds the heavy detail:
- `SKILL.md` — contract + placeholder legend
- `brand-extraction.md` — source tokens → ecology re-points
- `catalog-mapping.md` — source ui-* → esa-* + page porting
- `definition-of-done.md` — the checklist you MUST enforce (including the
  intelligence-layer checks: plugin declaration, hook smoke test)

Worked example to pattern-match against: `../beacon-design/` (freshest, most
faithful spoke; its `theme-beacon.css` is the gold-standard theme).

## Procedure

### 1. Gather inputs (interview if missing)
Ask for anything not supplied in `$ARGUMENTS`:
- Spoke **display name** (e.g. `Beacon`)
- **slug** (lowercase, e.g. `beacon`) and raw token prefix (default = slug;
  Beacon abbreviates to `bcn` — confirm)
- **repo dir** (e.g. `beacon-design`) — created as a sibling of the hub
- **npm scope** (e.g. `beacon` → `@beacon/design`; default = slug)
- **source app repo path** (OPTIONAL — the real product the spoke mirrors,
  e.g. `~/Dev/Beacon`). Drives brand extraction + catalog mirroring.
- brand mark text, font `<link>` tags, tagline
- **the theme seeds** — see below. Ask for these even when a source repo is
  given; extraction fills them in, it does not replace them.

**The theme seeds.** A complete theme is generated from six answers, so ask for
the six rather than for fifty declarations:

| Seed | Ask | Default |
|---|---|---|
| `brand` | the brand's primary hex — the one someone points at and says "that is our colour" | required |
| `neutral` | is the grey `warm`, `cool` or `pure`? | `pure` |
| `corners` | `flat`, `soft` or `round`? | `soft` (= hub) |
| `fontSans` / `fontMono` | the stacks matching the `<link>` tags above | hub defaults |
| `accent` / `ai` / `info` / `success` / `warning` / `danger` | only if the brand has its own | `derive` |

Everything else — two twelve-step ramps, the whole neutral chain, both schemes,
and **all eight `--color-content-on-*` foregrounds** — is derived and
contrast-checked. Do not ask for them and do not hand-fill them.

If the user would rather choose visually, point them at **`/guide/theme-maker`**
on the hub site and take the recipe JSON it downloads.

Confirm the resolved values back to the user before touching the filesystem.

### 2. Scaffold — run the script (deterministic step; do NOT do this by hand)

Write the seeds to a recipe first — it is the artifact the theme regenerates
from, so it is worth having on disk before the scaffold exists:

```jsonc
// theme-<slug>.json
{
  "slug": "<slug>",
  "seeds": { "brand": "#1769aa", "neutral": "cool", "corners": "soft" }
}
```

```bash
node scripts/create-spoke.mjs --name "<Name>" --slug <slug> --dir <dir> \
  --scope <scope> --mark "<mark>" --tagline "<tagline>" [--fonts '<link ... />'] \
  --theme theme-<slug>.json
```

`--theme` writes the real `theme-<slug>.css` (both schemes) plus the recipe
beside it, instead of the `__FILL__` stub. **Read the notes it prints** — a
`note` line means the generator moved a fill to make its foreground readable, and
a `FAIL` line means it could not, which is a fact about the brand that someone
needs to hear. Omit `--theme` only when there is genuinely no brand colour yet.

The script copies the template **including dotfiles** (`.claude/settings.json`
carries the spoke-kit plugin declaration), renames the templated files,
substitutes every placeholder, **fails loudly** if any placeholder survives,
verifies the intelligence layer made the trip, and runs `git init`. If it
exits non-zero, fix the cause — do not work around it with manual copying.

### 3. Brand extraction (step zero of the judgment work — the part that's always skipped)
If a source repo was given, follow `brand-extraction.md`: READ its design tokens,
DRAFT the `theme-<slug>.css` re-points, and **SURFACE them as a table for human
review — never silently apply.** Address the divergent primitive ramp, the
feedback/AI re-points, the form radius/height deltas, and `--button-on-warning`.
Flag each value sourced vs guessed. If no source repo, leave the `/* __FILL__ */`
skeleton and tell the user the theme needs a human pass.

### 4. Catalog
Follow `catalog-mapping.md`: if the source has its own UI catalog, MIRROR its
sections — map each `ui-*` to its `esa-*` equivalent, populate `src/data/ds-nav.ts`,
and port the matching dogfood pages from the hub's
`apps/site/src/pages/components/<slug>.astro` (fix the import-path depth, change
category/name). Otherwise curate a subset. Wire the source logo into the
brand-mark slot if available. Pass the spoke's primitive ramp(s) into
`color.astro` via `ramps`.

### 5. Install + build + verify
Run `npm install` then `npm run build` in the new repo. **Confirm with the user
before running these** (they hit the network / write `node_modules`). Then run the
definition-of-done checklist.

### 6. Definition of Done
Work through `definition-of-done.md` and report each item pass/fail. Do NOT claim
the spoke is ready until every box is checked: all four `@esa/*` packages, full
page tree, token-driven foundations, `DocsShell`-wrapped layout, reviewed theme,
green build + clean `tsc` + no undefined tokens, **and the intelligence layer:
plugin declared in `.claude/settings.json`, spoke-kit installed, hook smoke test
passing**.

## Output
A pass/fail DoD table, the path to the new spoke, a summary of which theme values
were sourced vs guessed (flag anything needing a human decision), a reminder to
open the spoke in Claude Code and accept the spoke-kit plugin install prompt, and
a pointer to the **`spoke-precommit-review`** skill for ongoing diffs.

Do not run any external or irreversible action (install, build, network)
without confirming with the user first.
