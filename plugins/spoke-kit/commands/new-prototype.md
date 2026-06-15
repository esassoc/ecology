Build a new prototype screen (or flow) in this Ecology spoke, composed from the
`esa-*` legos. This command is written for EVERYONE — including teammates who
don't code. Speak plain language throughout: no jargon, no file paths in
questions, explain what you're doing in one line as you go.

$ARGUMENTS

## Guard: run in a spoke

Check `package.json` in the current directory: it must list `@esa/ecology` in
its dependencies. If not, STOP and say: "Run /new-prototype inside a spoke repo
(like cb-fish-design) — this folder isn't one."

## 0. Sync first (quietly)

- `git pull` in this repo, and `git -C ../ecology pull` (the design-system hub).
- If the hub pulled token changes, run `npm --prefix ../ecology run build:tokens`.
- If pulls fail (offline, conflicts), say so plainly and continue with what's local.

## 1. Interview — understand the screen before building

Ask (skip anything `$ARGUMENTS` already answers; one round of questions, not an
interrogation):

1. **Who looks at this?** (client name/role, internal team, public demo)
2. **What's the scenario?** What is the person on this screen trying to do —
   the one-sentence story. ("A biologist checks which fish passages need review.")
3. **What's on it?** Rough contents: a list? a map? a form? filters? a detail
   panel? If they have a sketch/screenshot/Figma, ask them to share it.
4. **What realistic content should it show?** Names, places, quantities. If
   they don't know, propose invented-but-credible content and confirm.

Then play back a 3–5 bullet summary and confirm before building.

## 2. Manifest first — outline the page as components (required, BEFORE any code)

**Load the `component-first` and `design-principles` skills now.** The first
artifact is NOT code — it's a **manifest** of the page. A page is a manifest of a
primitive spine carrying **section components**, never a canvas of bespoke markup +
`<style>`. (A PreToolUse hook, `check-manifest`, enforces this — get ahead of it.)

Produce the manifest and resolve **every** section before writing a line of code:

1. Pick the page **spine** — a layout primitive (`stack`/`grid`/`sidebar`/…).
2. List the page's **sections** in order (header, stats, list, detail panel, footer…).
3. **Resolve each section to a COMPONENT**, stopping at the first hit:
   - **reuse an `esa-*` hub lego** if one fits (`esa-page-header`, `esa-stat`,
     `esa-app-shell`, …), else
   - **reuse an existing spoke component** (`<spoke>-*`), else
   - **build a NEW `<spoke>-*` component** (compose primitives + legos inside it).
   A primitive (`stack`/`grid`/`center`/…) is the spine or lives *inside* a
   component — it is never itself a section. Never inline a section as page markup.

Write the manifest as the page's opening comment and confirm it with the user:

```
<!-- manifest:
  layout: stack(2xl)                         # the page SPINE — a primitive is fine here
  sections:
    - page header -> laureate-page-header    # every SECTION is a component
    - stats       -> laureate-stat-group     #   (esa-* lego or <spoke>-* component)
    - winners     -> laureate-winners-grid
    - footer      -> laureate-footer
-->
```

**Worked reference**: Laureate's `src/pages/app/index.astro` is the canonical
zero-`<style>` manifest; its `src/components/laureate-*.astro` are the sections.

## 3. Build from the manifest

- Build any NEW `<spoke>-*` section components first (each owns its own markup +
  CSS), then assemble the page by referencing them on the spine. Pattern-match the
  structure of existing pages in `src/pages/prototypes/` (read 1–2 before writing).
- **Target ZERO page `<style>`** — every section's CSS lives in its component.
  Page CSS is a smell that a section escaped into the page; pull it back into a
  `<spoke>-*` component.
- Mock data follows design-principles: **invented, deterministic,
  domain-credible** — never copied from client documents or `docs/private/`.
  Put it in `src/data/` modules, not inline.
- Create the page under `src/pages/prototypes/<slug>.astro`; register it in
  `src/data/prototypes.ts` (slug, title, one-line description, route,
  createdAt = today, status `in-progress`).

## 4. Show it

- Start the dev server if not running (`npm run dev`) and give the local URL
  to the exact page.
- Invite iteration in plain language ("tell me what to change — wording,
  layout, what's missing").
- When they're happy, suggest: **/design-qa** for a quality pass, then
  **/ship** to put it on the public site.
