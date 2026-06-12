---
name: design-principles
description: The canonical aesthetic and interaction rules for ESA Ecology prototypes — load before styling, reviewing, or building ANY UI in a hub or spoke repo, and during /design-qa and /ship reviews. Covers banned visual patterns (colored left-border status indicators, ornamental micro-labels, sub-16px body text), token-first styling discipline, and mock-data rules. Single source of truth: other skills reference these rules, never restate them.
---

# Design Principles (canonical)

These rules encode the design direction for every Ecology prototype. They are
not suggestions — /design-qa flags violations and the pre-commit review treats
the "banned patterns" as Must-fix.

## Banned visual patterns

1. **No colored left borders as status/category indicators.** Never
   `border-left: Npx solid <color>` on cards, rows, or containers to convey
   state. Use **esa-badge**, **esa-pill**, a status dot, an icon, or a
   background tint inline with the content instead.
2. **No ornamental section labels.** Do not style headings/labels as
   uppercase + micro-size (<14px) + letter-spaced + light-gray. Labels are
   content, not decoration: normal case, minimum 14px (prefer 16px), primary
   or secondary text color, regular or semibold weight.
3. **16px body minimum.** No `font-size` below 16px for body text. Sub-16px is
   allowed ONLY for genuine meta (timestamps, footnotes, captions) — and never
   below 13px.
4. **No Tailwind, no utility-class frameworks.** Custom CSS reading design
   tokens. (The component-first skill covers the never-hand-roll-a-primitive
   rule; this skill covers how the styling you ARE allowed to write looks.)

## Token-first styling

A styling change in a spoke is a **token re-point until proven otherwise**:

1. Want a different color/radius/spacing on a component? Re-point the
   **semantic** or **component** token in `src/styles/theme-<slug>.css`
   (`[data-theme="<slug>"]` block). Primitives never move; component internals
   are never edited.
2. No component token exists for what you need to change? That is a **missing
   theming hook**, not permission to hand-style — run **/request-lego** to file
   it on the hub.
3. Raw values (`#hex`, magic `px`) belong only in the theme file's primitive
   ramp (`--<prefix>-*`). Everywhere else reads a token. The pre-commit greps
   enforce this.

## Mock data

- **Invented, never derived.** Mock content is realistic but fictional — never
  copied or lightly sanitized from client documents, `docs/private/`, or real
  correspondence. These repos and their deployed sites are PUBLIC.
- **Deterministic.** Same inputs, same outputs, every demo run. No `Math.random()`
  in anything a client will watch.
- **Domain-credible.** Real place names, plausible quantities, correct units
  and terminology for the domain (see biochar-design's parcels/soils for the
  gold standard). No lorem ipsum, no "Test Item 1".

## Reserved: mined direction (do not edit by hand)

<!-- TRANSCRIPT-MINED RULES land here: a follow-up pass mines ~180 design
     sessions across beacon/cb-fish/ecology for recurring feedback and
     direction, distilled into rules with the same severity framing.
     Until then, this section is intentionally empty. -->
