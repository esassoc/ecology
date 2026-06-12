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

## 2. Build

- **Load the `component-first` and `design-principles` skills.** Compose from
  `esa-*` legos; pattern-match the structure of existing pages in
  `src/pages/prototypes/` (read 1–2 before writing).
- Mock data follows design-principles: **invented, deterministic,
  domain-credible** — never copied from client documents or `docs/private/`.
  Put it in `src/data/` modules, not inline.
- Create the page under `src/pages/prototypes/<slug>.astro`; register it in
  `src/data/prototypes.ts` (slug, title, one-line description, route,
  createdAt = today, status `in-progress`).

## 3. Show it

- Start the dev server if not running (`npm run dev`) and give the local URL
  to the exact page.
- Invite iteration in plain language ("tell me what to change — wording,
  layout, what's missing").
- When they're happy, suggest: **/design-qa** for a quality pass, then
  **/ship** to put it on the public site.
