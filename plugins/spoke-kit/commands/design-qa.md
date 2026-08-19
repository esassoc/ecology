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
      run it **twice**, once per scheme:

      ```bash
      node ../ecology/scripts/check-contrast.mjs
      node ../ecology/scripts/check-contrast.mjs src/styles/theme-<slug>.css --scheme dark
      ```

      The dark run is not optional if the theme has a dark block: without
      `--scheme dark` both blocks are swept flat, the dark one wins on
      last-one-wins, and the audit grades dark values under a header claiming
      nothing about it.

      AA text failures are Must-fix; warnings get listed with the affected pair
      in plain words ("white text on the warning color is hard to read").

      **If the theme has a `theme-<slug>.json` recipe beside it, fix the RECIPE,
      not the CSS.** The CSS is generated; an edit there is reverted by the next
      regeneration. A value the generator should not choose belongs in the
      recipe's `pinned` map — and pinning a fill re-picks its foreground, which
      hand-editing does not.
   3. **Verbal restraint** — `node ../ecology/scripts/check-verbal-restraint.mjs`
      (same args convention: no args scans the spoke, or pass the scope's files).
      Greps every human-visible string against the canonical corpus behind
      design-principles § Verbal restraint. **ERRORS are Must-fix**, same weight
      as a banned visual pattern.
      - If it reports `"skipped": true`, the corpus is not installed on this
        machine. Say so in one line and **check the strings yourself** against
        design-principles § Verbal restraint — a skip is a missing tool, never a
        pass.
      - It only catches what a regex can express. For the rest — editorial
        captions, taglines, chips restating the table beneath them, synthesis —
        sweep the surface's strings yourself and classify each OF the page or
        ABOUT it. The ABOUT count must be zero.
      - Text someone is contractually obliged to show — a vendor attribution —
        is exempted where it appears, by exact string:
        `<!-- verbal-restraint-allow: Powered by Power BI -->`. Check any you
        find: the mechanism is for required text, not for winning an argument
        with the gate.
   4. **Prose-shaped props** — `node ../ecology/scripts/check-prose-props.mjs`,
      when the scope includes any component that declares props. Everything this
      REPORT returns is a **warning and never a blocker**: it reads prop NAMES,
      and it cannot tell `caption` on a figure (correct) from `caption` on a
      stat card (a flourish slot).
      - `prose-prop-genre` — the name names a kind of prose. Worth acting on,
        and the only tier with teeth: declaring a NEW one is blocked at write
        time by the `check-prose-props` hook, escapable with a
        `prose-prop-checked: <reason>` comment. Names already in a file never
        block a later edit to it, so the report still surfaces them here.
      - `prose-prop-contested` — a real datum reading, but a measured flourish
        rate. Confirm, do not assume.
      - The usual fix is the **doc comment, not the prop**. A slot documented by
        register ("muted meta") gets data; a slot documented by type size gets
        prose. That is the whole finding of the 2026-08-16 audit, and rewriting a
        doc comment breaks nothing.

   Report findings **by severity** (Must-fix first, then Should-fix, then
   judgment calls), translating each rule into plain words.

## Decomposition quality (advisory — run LAST, after the gates are green)

The gates above enforce that a page is a well-formed *manifest of components*. They
do **not** judge whether the decomposition is *good* — right component boundaries,
right granularity, right reuse. That last pass is done by a **separate agent**:
**spawn the `decomposition-reviewer` subagent** and hand it the same scope you reviewed
above (the changed files / the named page / "the working-tree diff").

It runs on purpose in its **own fresh context** — it did not write this code, and it is
read-only, so it advises without "fixing." It grounds itself
(`node ../ecology/scripts/decomposition-context.mjs`), judges five dimensions (missed
reuse, granularity, seam quality, promotion signal, manifest fidelity), and returns a
one-line verdict + a findings JSON array. **It never blocks**: the gates decide what
ships; this decides what's *good*.

- Do not run the rubric inline yourself — delegate it, so the reviewer's judgment stays
  independent of the work. Relay its findings (see Reporting below).
- A `strong` finding is "worth reworking before you ship, but your call"; `consider` /
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
- **Decomposition (advisory):** report the `decomposition-reviewer` agent's findings
  in their own short block, clearly marked "advisory — not blockers," led by its
  one-line verdict (clean / minor / needs rework). Don't auto-apply these — they're
  seam judgments for the user to weigh; offer to act on the ones they pick.
- End with a one-line verdict: "Ready to /ship" or "Fix X first."
- If the build fails, explain what broke in one sentence and fix it if the fix
  is unambiguous; otherwise show the error and ask.
