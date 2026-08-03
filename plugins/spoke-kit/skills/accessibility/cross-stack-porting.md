# Cross-stack porting checklist

Cloning Ecology into a **non-Astro** stack (a React app, an Angular app, a
plain-HTML microsite) is where accessibility regresses silently,
because of two facts about how the enforcement travels.

## Why porting drops accessibility on the floor

1. **The legos' built-in a11y doesn't come along in a hand-port.** When you
   *use* `esa-dialog`, you inherit its focus trap, its Esc handling, its
   `role="dialog"` + `aria-modal`, its focus-return-on-close — all tested. When
   you **re-implement** that dialog as a `<div>` in another framework because
   "we can't use the web component here," you inherit *none* of it. The visual
   copy looks identical and is a fraction as accessible.

2. **The hooks only fire where spoke-kit is installed.** `check-a11y` is a
   PreToolUse gate that ships *with the plugin*. A non-Astro clone that never
   installs spoke-kit gets **zero** enforcement — no positive-tabindex block, no
   missing-alt block, nothing. This is the honest limit of the model: hooks
   enforce practices, but only in repos that opted into the plugin. **State this
   plainly to the team doing the port** — don't let them assume the guardrails
   came with the CSS.

## The two honest paths

| Path | When | What you get |
|---|---|---|
| **Use the Lit web components** | The stack can register custom elements (React, Vue, vanilla, most SPA frameworks can) | The real `esa-*` behavior — a11y included. This is the preferred port. `import '@esa/ecology/esa-dialog'` then use `<esa-dialog>` in any HTML string. |
| **Re-implement the markup** | The stack genuinely can't run the components (rare) | You own **all** of the accessibility the lego was providing. Run the full checklist below against every re-implemented component — you are rebuilding tested behavior from scratch. |

Reach for the first path. Re-implementation is the last resort, and it is where
the manual checklist below stops being optional.

## The checklist (run before shipping a port)

The hooks can't reach this repo, so **you are the gate.** For every ported
screen and every re-implemented component:

### Keyboard
- [ ] Tab reaches every interactive element, in reading order.
- [ ] No positive `tabindex` anywhere (grep for `tabindex="1"`+).
- [ ] Every custom control (anything that isn't a native `<button>`/`<a>`/input)
      is focusable (`tabindex="0"`) **and** responds to Enter/Space (and arrows
      where the role implies them — tabs, radios, menus, sliders).
- [ ] Every overlay (dialog, drawer, menu) is escapable: Esc closes it, focus
      returns to the trigger, and Tab does not leak to the page behind it.
- [ ] No keyboard trap — you can always Tab/Esc your way back out.

### Focus visibility
- [ ] Every interactive element shows a visible focus indicator.
- [ ] No `:focus{outline:none}` / `:focus-visible{outline:none}` without a
      replacement ring (grep the ported CSS).
- [ ] The focus ring clears 3:1 contrast against its background.

### Names & semantics
- [ ] Every `<img>` has an `alt` (empty for decorative, meaningful otherwise).
- [ ] Every form control has a programmatic label.
- [ ] Icon-only buttons have an accessible name.
- [ ] Native semantics preserved in the port: headings in order, one `<h1>`,
      `<main>/<nav>/<header>/<footer>` landmarks, lists as lists, tables as
      tables with `<th scope>`.
- [ ] ARIA references (`aria-labelledby`/`-describedby`/`-controls`) point to IDs
      that exist; state attributes (`aria-expanded`/`-checked`/`-selected`) are
      updated in the port's JS, not set once.

### Color
- [ ] Contrast re-verified against the *ported* theme — a port often re-picks
      colors, which takes you off the Radix scale (see SKILL.md §5). Text 4.5:1,
      large text 3:1, non-text/UI 3:1.
- [ ] State is never conveyed by color alone.

### Verify
- [ ] Keyboard-only walkthrough of every screen.
- [ ] axe / Lighthouse pass as a floor (catches ~a third; green ≠ done).

## Recommend closing the gap

If a clone is going to live on, the durable fix is to **install spoke-kit in the
clone** so `check-a11y` and the rest of the discipline start firing there too —
the plugin is stack-agnostic (the hooks read source text, not Astro internals).
Raise that with the team rather than relying on this checklist being run by hand
forever.
