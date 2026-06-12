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
3. **16px body default, 14px dense floor.** Body text defaults to 16px.
   Dense-context data surfaces (feeds, sidebars, data rows, tables) may use a
   **14px base — never fainter: darken as you shrink**, don't gray-out small
   text. Genuine meta (timestamps, captions) may go smaller, never below 13px.
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
4. **Deliberate hard-codes are sanctioned** — especially font sizes — *after*
   checking that no token applies. QA treats a checked hard-code as a warning
   to note, not an error to revert. Inventing a custom property that exists
   nowhere is still always a bug.

## Mock data

- **Invented, never derived.** Mock content is realistic but fictional — never
  copied or lightly sanitized from client documents, `docs/private/`, or real
  correspondence. These repos and their deployed sites are PUBLIC.
- **Deterministic.** Same inputs, same outputs, every demo run. No `Math.random()`
  in anything a client will watch.
- **Domain-credible.** Real place names, plausible quantities, correct units
  and terminology for the domain (see biochar-design's parcels/soils for the
  gold standard). No lorem ipsum, no "Test Item 1".

## Mined direction (adopted by Andy, 2026-06-12)

Distilled from 266 findings across 72 of Andy's design sessions, reviewed and
adopted rule-by-rule. Full evidence: hub `docs/private/design-direction-mining.md`.

### Visual standards

- **Chips and badges are compact and quiet**: 4px border-radius, light-gray or
  no background, mid-gray border and text, vertically centered in cells —
  never bulky rounded pills.
- **Sibling controls match exactly.** Every control sharing a row, bar, or
  group matches its siblings in rendered height, font size, and variant.
  Verify *rendered output* — different components can resolve different tokens
  and silently mismatch.
- **Sizing is asymmetric.** Form controls err one step *bigger* (undersized
  reads "weak"); icons err *smaller*, subordinate to their control and the
  surrounding text — and use semantically specific glyphs. **Default control
  size is `md`** on the shared scale.
- **Polish is subtractive.** Strip per-item icons, non-informative chips,
  taglines, helper blurbs, and editorial copy; if an element carries no
  information, cut it. Never let internal vocabulary (ticket keys, tenant
  names, data-model names) leak into user-facing copy. **Icons mark
  structure** (group/section headers), **never items**.
- **Containers stay neutral** — white cards on gray pages, white header bands,
  grayscale basemaps — color lives in content and data, and saturated brand
  color is reserved for the single primary action. The split: **product UI is
  austere; identity badges, floating map tools, and landing/showcase surfaces
  invite expressiveness.**
- **Type voices.** Never monospace for IDs, badges, headings, or document
  text. Each brand theme designates its families, including a document/serif
  voice for legal or quoted content (Beacon's is Besley) — use the theme's
  designated faces; don't hardcode a system-wide default.
- **Compress the content, stabilize the frame.** Data-dense surfaces compress
  *moderately* (the 14px dense floor above — don't overshoot into cramped);
  major work surfaces (large dialogs, drawers, full pages) hold generous
  FIXED footprints (~86vh) that never resize on interaction. **Size dialogs by
  role**: work surfaces get the big stable frame; compact confirms stay slim.
- **Overlays ship complete.** Esc to close, click-outside, a working close
  button, symmetric exit animation (a drawer that slides in slides back out),
  and a scrim covering the entire viewport — including the app header.
- **Data tables are AG Grid with the full standard chrome** — search +
  clear-filters header, download + record-count footer — only scannable
  columns, filling the table width.
- **Footer actions, Windows order.** The action group is right-aligned with
  the primary (Save) LEFT of Cancel within the group; tertiary actions sit far
  left. Each action gets exactly one affordance per surface — no duplicate
  closes, no redundant footer links.

### Working with precedent

- **Approved patterns are canon.** When a vetted precedent exists (a crafted
  modal, an established drawer pattern, a badge treatment), replicate it
  exactly — never silently diverge or "improve" it. Only Andy promotes a
  better variant, at review. The system is actively settling (mid-2026):
  check that the precedent you're copying is the current one.
