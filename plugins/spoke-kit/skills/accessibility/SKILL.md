---
name: accessibility
description: The judgment layer of accessibility for ESA Ecology hub and spokes — load before building, styling, or reviewing ANY UI, and during /design-qa and /ship. Covers what the check-a11y PreToolUse hook CANNOT prove statically: keyboard operability (Enter/Space/arrow wiring, escapable focus traps, focus order, visible focus), semantic-HTML-first structure (native elements, one h1, landmarks, headings, lists, tables), accessible names & meaningful alt text, ARIA-correctly-or-not-at-all, the FORMS contract (accessible names over placeholders, aria-describedby for hints, live-region errors, fieldset/legend over role=group, autocomplete/inputmode, custom-listbox activedescendant) — load it for anything that collects a value — the STATUS-MESSAGE contract (SC 4.1.3: why a live region is the LAST resort, the cue/focus/state-property order that usually replaces one, the single shared announcer, toasts and SC 2.2.1) — load it for anything that reports a result, a progress state, or an error — and, the crux, verifying color contrast the moment a team OVERRIDES a Radix step, plus the cross-stack porting checklist for cloning Ecology into a non-Astro app the hooks can't reach. Enforces PRACTICES, never prescribes patterns. Design-principles owns visual rules; component-first owns lego reuse; this owns accessibility judgment.
---

# Accessibility (the judgment layer)

Ecology *compliance* does not guarantee *accessibility* — implementation is
still on each team. This skill is the source of truth for the
accessibility calls Claude has to make while building UI. The posture:
**enforce practices, don't prescribe patterns.** There is one
right *outcome* (a keyboard user can operate everything); there are many right
*implementations*, and this skill never mandates a specific one.

## The split: hook vs. skill

A **PreToolUse hook** (`check-a11y`) blocks the accessibility failures that can
be *proven from the source text* — it is the deterministic floor. This skill
carries everything that needs judgment. Know which side you're on:

| The hook BLOCKS (deterministic) | This skill GUIDES (judgment) |
|---|---|
| positive `tabindex` (>=1) | correct focus **order** for the DOM you built |
| `<img>` with no `alt` attribute | whether the alt **text is meaningful** vs. decorative |
| `:focus-visible{outline:none}` / a suppressed `:focus` ring with no alternative | whether the focus ring is actually **visible enough** (contrast, size) |
| interactive `role` on a non-native element with no `tabindex` | whether that control actually **wires Enter/Space/arrows** |
| a live region that is permanently **empty** (announces nothing, ever) | whether a live region is the right tool at all — usually it is not |
| a `role`/`aria-live` **politeness contradiction** | whether polite or assertive is the right choice |
| an interactive **control inside a live region** | whether that message should have been a dialog |
| — | keyboard **traps**, semantic structure, ARIA correctness, contrast, cross-stack porting |

A green hook run is **not** evidence of an accessible component — it only means
you avoided the seven provable mistakes. The rest is on you, below.

## 1. Keyboard operability

Every interactive control must be fully operable with the keyboard alone.

- **Prefer native elements** — `<button>`, `<a href>`, `<input>`, `<select>`
  come with focusability, roles, and key handling for free. Reaching for
  `<div role="button">` means you now owe `tabindex="0"` **and** an Enter/Space
  handler (and Space must not scroll the page). The hook catches the missing
  `tabindex`; only you can confirm the key handler exists and fires.
- **No keyboard traps.** Focus must never get stuck somewhere the keyboard can't
  leave. This is a *skill* rule, not a hook rule, on purpose: a real trap is
  statically indistinguishable from a **legitimate** modal focus-trap. The
  difference is the escape — a modal that traps Tab is correct *if and only if*
  Esc closes it and focus returns to the trigger. Verify the exit exists.
- **Focus order follows reading order.** Tab should move in the order a person
  reads. If it doesn't, fix the **DOM order** — never patch it with a positive
  `tabindex` (the hook blocks that).
- **Focus is always visible.** Every interactive element shows a focus
  indicator when focused. Removing the ring is only OK when you replace it (a
  `:focus-visible` outline or a `box-shadow`/`border` ring). Confirm the
  replacement actually *reads* — 3:1 contrast against its background, not a
  1px hairline.
- **Skip link** for pages with long/repeated nav, so keyboard users can jump to
  `<main>`.

## 2. Semantic structure first

Native semantics are the cheapest accessibility you will ever get. **Reusing the
`esa-*` legos (component-first) is still the right first move** — hand-rolling
their markup throws away everything they *do* carry, and re-derives every mistake
below from scratch.

But "the legos are accessible, so reuse is enough" would be too strong a claim,
and a spoke that believes it will ship inaccessible forms. What actually holds
today: **overlay behavior** (focus trap, Esc, focus return), **icon-button naming**
(contextual `aria-label` throughout), and **decorative SVGs** (`aria-hidden`
throughout). What does **not** hold yet is most of the forms surface — accessible
names on option groups, `aria-describedby` for hints and errors, live regions,
and `autocomplete`/`inputmode`. Assume you own those until §3.5 says otherwise,
and read [forms.md](forms.md) before building or reviewing a form.

- One `<h1>` per page; headings descend in order (`h1 -> h2 -> h3`), never
  chosen for size — style with type roles (design-principles), not heading level.
- Landmark elements: `<header>`, `<nav>`, `<main>`, `<footer>`. One `<main>`.
- Lists are `<ul>/<ol>/<li>`; tabular data is `<table>` with `<th scope>` — not
  a grid of `<div>`s.
- Buttons *do things*, links *go places*. Don't swap them.

## 3. Accessible names & meaningful alt

- Every form control has a programmatic **label** (`<label for>`, wrapping
  `<label>`, or `aria-label`/`aria-labelledby`). Placeholder text is not a label.
- **Icon-only** controls need an accessible name — `esa-icon-button` takes a
  label; use it. A bare icon button announces nothing.
- **Alt text quality** (the hook only checks *presence*): decorative image ->
  `alt=""`; informative image -> describe the information it conveys, not the
  filename; an image inside a link -> the alt describes the link's destination.
- Buttons and links have discernible text (visible text, or an `aria-label`
  when the control is glyph-only).

## 3.5 Forms — read the contract before touching one

Forms are the one area where the general rules above are not enough, because a
form control needs **four** things wired independently — a name, a description,
state (required/invalid/disabled), and grouping — and dropping any of them leaves
the field looking perfectly fine. Nothing turns red; the field just announces
"edit text, blank."

The failure compounds in a specific way worth knowing before you start: **a
control with no name will end up labelled by its placeholder**, because that is
the only text left. Then someone darkens the placeholder to clear 4.5:1 and it
starts reading as pre-filled input, which is worse than where you began. Fix the
name and the placeholder question dissolves — placeholder goes back to being an
optional hint, and most fields don't need one at all.

The full contract — the three legal naming mechanisms and when each applies, why
a `<label>` around a `<span role="checkbox">` names nothing, `aria-describedby`
for hints, live regions for errors, `fieldset`/`legend` over `role="group"`,
`autocomplete`/`inputmode` for SC 1.3.5, and the custom-listbox checklist — is
**[forms.md](forms.md)**. Each rule there is anchored to a hub component that
already does it right.

## 4. ARIA correctly, or not at all

- **No ARIA is better than wrong ARIA.** A native `<button>` beats
  `role="button"` every time. Only add ARIA when no native element expresses it.
- Don't override native semantics (`<button role="heading">` is a bug).
- `aria-labelledby` / `aria-describedby` / `aria-controls` must reference IDs
  that **exist** on the page.
- **State attributes must stay in sync in JS.** `aria-expanded`,
  `aria-checked`, `aria-selected`, `aria-pressed` are lies if you set them once
  and never update them. Toggle them wherever you toggle the visual state.
- Use `aria-live` (polite/assertive) for content that updates without a page
  load (async results, validation, snackbars) — but sparingly.

## 5. Color contrast — the Radix-override rule

Radix color scales are engineered to hit contrast targets *on-scale*. **The
moment a team overrides a Radix step or hand-picks a value, they own verifying
contrast** — the override is exactly where Radix's on-scale guarantee stops applying.

- Text: **4.5:1** against its background (**3:1** for large text — >=24px, or
  >=19px bold).
- Non-text: **3:1** for UI component boundaries, icons that carry meaning, and
  **focus indicators**.
- This is a *skill* check, not a hook check, because it requires the rendered
  foreground/background *pair* — which the source text doesn't reveal. When you
  re-point a color token (design-principles: token-first), check the new pair.
  Don't assume "it came from Radix" if you moved off the scale.
- Never rely on color **alone** to convey state — pair it with text, an icon, or
  a shape (this also intersects the no-colored-left-border rule in
  design-principles).

## 6. Motion & preferences

- Honor `prefers-reduced-motion`: gate non-essential animation/transitions
  behind the media query. This intersects design-principles' "overlays ship
  complete / symmetric animation" rule — reduced-motion users get the state
  change without the movement.
- Don't trap users in auto-playing or infinitely-looping motion.
- Honor **forced colors mode** (Windows Contrast Themes, `@media (forced-colors:
  active)` — ~4% of Windows machines, the platform's most-used inbox AT). It
  deletes `box-shadow`, `text-shadow` and every gradient outright, and it reads
  your HTML **elements, not your ARIA**, so custom widgets get none of the system
  styling a native control gets free. The two habits that prevent most of it: a
  real `outline` in every focus ring, and a transparent `border` on anything that
  floats. Your job there is to repair what the mode removes, **not** to raise
  contrast — overriding the user's chosen colors is itself SC 1.4.8.
  **Nothing automated catches this** (axe has no forced-colors rule); the one
  deterministic slice is `check-a11y` check 9, the box-shadow-only focus ring.
  Full contract: `forced-colors.md`.

## Verify before you ship

The floor is automated; the ceiling is manual. In `/design-qa` and `/ship`:

1. **Keyboard-only pass** — unplug the mouse mentally: Tab through the whole
   surface. Can you reach and operate everything? Can you always see where you
   are? Can you get *out* of every overlay?
2. **Names pass** — does every control announce a sensible name? (Icon buttons,
   inputs, links.)
3. **Automated pass** — axe / Lighthouse as a **floor, not a ceiling**; it
   catches ~a third of issues. Green ≠ accessible.

## 5. Status messages (SC 4.1.3) — and why the answer is usually not a live region

Anything that reports the result of an action, the progress of a process, or the
existence of an error has to reach a screen reader user who never moved focus.
That is SC 4.1.3, Level AA, and ARIA live regions are currently the only way to
satisfy it directly.

They are also the tool to reach for **last**. Announcements are transient — they
cannot be replayed or reviewed, and they carry no structure, so a button inside
one is read as a bare word with no route to it. Work down this order and stop at
the first thing that fits:

1. **An instructional cue** (`aria-describedby`) — set the expectation once, and
   nothing has to interrupt afterwards. A filtered result list is this case.
2. **Moving focus** — a change of context AT already surfaces; 4.1.3 does not
   apply. A validation summary is this case.
3. **An ARIA state property** — `aria-expanded`, `aria-pressed`, `aria-checked`,
   `aria-valuenow`, `aria-busy`. A disclosure is this case.
4. **A live region** — only when none of the above fits.

When it is genuinely 4: **`import { announce } from '@esa/ecology/announcer'`**.
Never write `aria-live` into a component. The kit owns exactly two regions, in
the light DOM, mounted before anything happens — because a region created with
its content does not announce, regions interfere with each other, and observation
across a shadow boundary is unreliable.

The full contract — politeness, toasts and SC 2.2.1, the filtering pattern, the
four live-region failures that actually shipped in this kit and what each one
taught — is **[status-messages.md](status-messages.md)**.

## Cross-stack reach

Cloning Ecology into a **non-Astro** stack is where accessibility silently
regresses — the legos' built-in a11y doesn't come along in a hand-port, and the
hooks only fire where spoke-kit is installed. This is the honest limit of the
enforcement model. Run the checklist before shipping a port:
**[cross-stack-porting.md](cross-stack-porting.md).**

## Related skills

- **component-first** — reusing the `esa-*` legos is the right first move; this
  skill assumes you did that, and §2 says which parts of their a11y are
  load-bearing today and which you still own.
- **design-principles** — owns the visual rules (contrast targets live there as
  tokens, focus-ring visuals, color-not-alone); this skill owns the a11y
  *behavior* those visuals must support.

---

> **Publishing note:** edits to this skill only reach spokes after the plugin is
> republished — bump `plugins/spoke-kit/.claude-plugin/plugin.json`, push the hub,
> then on each machine run **both** `claude plugin marketplace update ecology`
> (refreshes the listing only — it reports success without installing anything)
> **and** `claude plugin update spoke-kit@ecology` (the one that actually upgrades),
> then restart Claude Code. Verify with `claude plugin list`. Local hub edits are
> inert until then (spokes run the cached marketplace copy).
