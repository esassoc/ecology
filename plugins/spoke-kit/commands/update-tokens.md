Move this spoke off deprecated `@esa/tokens` names after the hub has renamed
something. Plain-language output: the person running this may not code.

$ARGUMENTS

## Guard

`package.json` here must depend on `@esa/ecology`; otherwise stop and say this
runs inside a spoke repo.

## Why this exists (say it once, in the summary)

A spoke does not install a copy of the design system — it points at the hub
checkout through a `file:` symlink. So a rename in the hub reaches this spoke
immediately, with no version bump and no publish step to absorb it.

The hub keeps the old names working as **compatibility aliases**, so nothing
looks broken. That is the trap: the spoke can sit on retired names for months
and only find out when the aliases are finally deleted. This command is how the
spoke stops depending on them.

## What to run (wrap, don't restate)

1. **Check the tree is clean.** `git status --porcelain`. If it is not, stop and
   ask them to commit or stash first — this rewrites files in place.

2. **Dry run.** `node ../ecology/scripts/migrate-tokens.mjs`
   (If the hub is checked out elsewhere, resolve it from
   `node_modules/@esa/tokens` rather than guessing the path.)

   Read the output. It reports three things:
   - how many replacements, in how many files, grouped by rename;
   - any rule marked **NOT an exact alias** — those change rendering, not just
     the name. Name them explicitly in your summary. Do not bury them;
   - **tokens it cannot fix**: names this spoke reads that the hub does not
     declare and no migration covers. These are already broken — the property is
     dropping today. They are not this command's job to guess at; list them and
     say so.

   **It may refuse to run.** If it exits with a *collapse collision*, this spoke
   declares BOTH sides of a rename that merges two names into one — and gave them
   different values. The hub merged them because they were identical THERE; here
   the distinction is real. Rewriting both would emit the same property twice and
   silently drop the first value.

   Nothing is written in that state. Resolve it before anything else:
   - Show the person both declarations and their values.
   - Ask which one this spoke actually wants. Do NOT pick for them — the whole
     reason the tool stopped is that only they know.
   - Delete the losing declaration from the theme file, then re-run the dry run.

   A spoke that declares both sides with the SAME value is not a collision and
   will not stop — the merge loses nothing there.

3. **Apply** — only after the person has seen the dry run and said go:
   `node ../ecology/scripts/migrate-tokens.mjs --write`

4. **Verify.** `npm run build`. Then load the pages that changed most and look
   at them. For every rename except the inexact ones, the correct result is
   **no visible difference at all** — the alias and its replacement resolve to
   the same tokens. A visible change means something else moved; investigate
   before committing.

5. **Commit** as its own change, separate from feature work, e.g.
   `chore: migrate off deprecated @esa/tokens names`.

## The unfixable list

Whatever step 2 reported as unfixable needs a human decision, one at a time.
They are usually reads of a scale the hub retired before `migrations.json`
existed. For each: find what it was for (`grep` the declaration around it),
pick the current token that means the same thing, and change it — or, if the
spoke genuinely wants a value the system does not have, say so and use
`/request-lego` rather than inventing a literal.

Do not batch-guess these. A wrong colour that renders is worse than a missing
one that does not.

## After

Run `npm run doctor`. Its "no deprecated @esa/tokens names" check should be
clean. If it still warns, the migration missed something — report what.
