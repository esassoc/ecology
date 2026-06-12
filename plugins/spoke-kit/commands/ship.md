Publish this spoke's prototypes to its public GitHub Pages site. Written for
non-coders: narrate each step in one plain line, and never skip the sync steps
— **two people deploying without syncing deletes each other's work** (the
deploy replaces the whole published site with this machine's build).

$ARGUMENTS

## Guard

`package.json` here must depend on `@esa/ecology` and have a `deploy` script;
otherwise stop and explain.

## The mandatory sequence (in this order, no skipping)

1. **Sync** — `git fetch`. If this branch is behind the remote: pull (rebase).
   If there are conflicts, resolve them when the resolution is obvious (e.g.
   both added entries to `src/data/prototypes.ts` — keep both); otherwise STOP
   and explain in plain language whose changes collide and ask what to keep.
2. **Save** — commit all current work with a clear message; push to the main
   branch. (If there's nothing to commit, say so and continue.)
3. **Build** — `npm run build`. **HARD GATE: if the build fails, the ship
   stops.** Explain the failure in one sentence; fix it if unambiguous and
   rebuild, otherwise report and stop.
4. **Quick check (warn, don't block)** — if /design-qa hasn't been run since
   the last changes, run its grep checks briefly. Findings are reported as
   warnings with a yes/no: "Ship anyway?" Never hard-block a ship on style
   findings — this is a low-stakes prototype site.
5. **Deploy** — `npm run deploy`. Known failure: a stale gh-pages cache after
   someone else deployed (`fatal: ...gh-pages` git errors) → run
   `npx gh-pages-clean`, then retry the deploy ONCE.
6. **Report** — give the public URL (read `site` + the production `base` from
   `astro.config.mjs` — e.g. `https://esassoc.github.io/<dir>/`), plus the
   direct link to any prototype just shipped. Remind: **this site is public** —
   anyone with the link can see it.
