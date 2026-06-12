Run a design-quality pass on this spoke's current work — on demand, any time
(not just before a commit). Plain-language output: the person running this may
not code.

$ARGUMENTS

## Guard

`package.json` here must depend on `@esa/ecology`; otherwise stop and say this
runs inside a spoke repo.

## What to run (wrap, don't restate)

This command is a thin wrapper over two skills — load BOTH and follow them:

1. **`spoke-precommit-review`** — run its Review Flow and Automated Greps
   (undefined tokens, hardcoded hex/px that map to tokens, unloaded font
   weights, JS-built DOM scope issues, asset dupes) and its quality gates
   (`npx astro build`, `npx tsc --noEmit`). Scope: if there's a working diff,
   review the diff; if the user names a page (in `$ARGUMENTS`), review that
   page's files; otherwise review files changed since the last ship (`git log`).
2. **`design-principles`** — check the banned patterns (left-border status
   indicators, ornamental micro-labels, sub-16px body text), token-first
   discipline, and mock-data rules against the same scope.
3. **Contrast** — if the theme file is in scope (or on first run in a spoke),
   run `node ../ecology/scripts/check-contrast.mjs`. AA text failures are
   Must-fix; warnings get listed with the affected pair in plain words
   ("white text on the warning color is hard to read").

## Reporting

- **Apply** Must-fix and clear Should-fix items directly, then say what you
  fixed in one line each — plain words ("made the labels readable size", not
  "bumped font-size token").
- **List** judgment calls as short questions the user can answer.
- End with a one-line verdict: "Ready to /ship" or "Fix X first."
- If the build fails, explain what broke in one sentence and fix it if the fix
  is unambiguous; otherwise show the error and ask.
