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
3. **Grounded gate (run the hub scripts — these are deterministic, run them
   FIRST so the human-judgment passes above are anchored to real findings):**
   1. **Adherence** — `node ../ecology/scripts/check-adherence.mjs` (no args
      scans the spoke's authored pages/layouts/components; pass file paths to
      narrow to the scope above). It returns JSON with `errors` and `warnings`.
      - **ERRORS** (undefined token w/o fallback, banned `border-left` status,
        sub-13px type, hand-rolled `<input>/<select>/<textarea>`) are **Must-fix**.
      - **WARNINGS** (hardcoded color, missing `--_` fallback, unloaded font
        weight, Tailwind-looking class, a page hand-rolling too much CSS) are
        Should-fix / judgment calls — never blockers.
   2. **Contrast** — if the theme file is in scope (or on first run in a spoke),
      run `node ../ecology/scripts/check-contrast.mjs`. AA text failures are
      Must-fix; warnings get listed with the affected pair in plain words
      ("white text on the warning color is hard to read").

   Report findings **by severity** (Must-fix first, then Should-fix, then
   judgment calls), translating each rule into plain words.

## Decomposition quality (advisory — run LAST, after the gates are green)

The gates above enforce that a page is a well-formed *manifest of components*. They
do **not** judge whether the decomposition is *good* — right component boundaries,
right granularity, right reuse. That last pass is **`decomposition-review`** — load it
and follow it. It is **advisory and never blocks**: the gates decide what ships; this
decides what's *good*.

- It grounds itself first (`node ../ecology/scripts/decomposition-context.mjs` over the
  same scope), then judges five dimensions: missed reuse, granularity, seam quality,
  promotion signal, and manifest fidelity.
- Translate its findings into plain words for the report (see Reporting below). A
  `strong` finding is "worth reworking before you ship, but your call"; `consider` /
  `suggestion` are lighter. **None is a blocker** — never present one as Must-fix.
- A clean decomposition gets one line ("Components are well cut — nothing to change").

## Capturing system gaps (the improvement loop)

A warning that turns out to be the *system's* fault — a missing token, a lego
that should exist, a foundation gap the spoke had to work around — is not a spoke
bug. When you confirm one, append it to **`docs/system-improvement-ledger.md`**
in the spoke (create the file if absent) as a one-line entry: what was missing,
where it bit, and the proposed hub fix. That ledger is how spoke friction flows
back up to the hub; surface it to the user so it gets promoted.

## Reporting

- **Apply** Must-fix and clear Should-fix items directly, then say what you
  fixed in one line each — plain words ("made the labels readable size", not
  "bumped font-size token").
- **List** judgment calls as short questions the user can answer.
- **Decomposition (advisory):** report `decomposition-review`'s findings in their
  own short block, clearly marked "advisory — not blockers," led by its one-line
  verdict (clean / minor / needs rework). Don't auto-apply these — they're seam
  judgments for the user to weigh; offer to act on the ones they pick.
- End with a one-line verdict: "Ready to /ship" or "Fix X first."
- If the build fails, explain what broke in one sentence and fix it if the fix
  is unambiguous; otherwise show the error and ask.
