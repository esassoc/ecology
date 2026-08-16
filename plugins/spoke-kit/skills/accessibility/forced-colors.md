# Forced colors mode

Windows Contrast Themes (Windows 11; "High Contrast Mode" before that) strips your
palette and forces a user-chosen one on the page. It is standardised as
`@media (forced-colors: active)` and it is the **only** display mode that overrides
your colors — dark mode does nothing unless you support it, Invert Colors inverts
what you shipped, this one replaces it.

It is not niche. ~4% of Windows machines run a contrast theme, which makes it the
most-used inbox assistive technology on the platform, and WebAIM's Low Vision Survey
found **51.4%** of respondents use some kind of high contrast mode. Users reach for it
for low vision, photosensitivity, migraine, and overstimulation — which is why
Microsoft renamed it from "High Contrast": some themes are *lower* contrast on purpose.

**Your job is not to increase contrast. It is to stay out of the way and repair only
what the mode deletes.** Overriding a user's chosen foreground/background is also an
SC 1.4.8 (Level AAA) failure in its own right.

## What the mode does to your CSS

**Force-adjusted** — your value is replaced by a system color, and this is fine, this
is the point: `color`, `background-color`, `border-color`, `outline-color`,
`text-decoration-color`, `column-rule-color`, `caret-color`, `scrollbar-color`, `fill`,
`stroke`, `flood-color`, `lighting-color`, `stop-color`. `color-scheme` is forced to
`light dark`.

**Deleted outright** — nothing you write survives, and this is what actually breaks
layouts:

| Property | Becomes |
|---|---|
| `box-shadow` | `none` |
| `text-shadow` | `none` |
| `background-image` (anything not `url()`) | `none` — every gradient |

The design consequence: **anything whose only visual boundary is a shadow or a
gradient ceases to exist.** A transparent `border`, by contrast, becomes *visible* —
`border-color` is force-adjusted whether or not you gave it a real color. That
asymmetry is the source of nearly every fix below.

## ARIA is invisible here

Forced colors reads the **HTML element**, not the accessibility tree. It does not
consult a role.

- `<button>` gets `ButtonFace` / `ButtonText`. `<button disabled>` gets `GrayText`.
- `<a href>` gets `LinkText`. An `<a>` whose `href` you removed is not a link.
- `<div role="button" aria-disabled="true">` gets **nothing**. It is styled as text,
  in both states, identically.

So every custom widget you build out of `<div>`/`<span>` + ARIA has to re-supply by
hand what the native element would have received free. Prefer the native element;
where you can't, pair the state with a system color explicitly:

```css
@media (forced-colors: active) {
  [role='option'][aria-selected='true'] { background: Highlight; color: HighlightText; }
  [role='option'][aria-disabled='true'] { color: GrayText; }
}
```

The eight usable system colors: `Canvas` / `CanvasText` (page), `LinkText`,
`GrayText` (disabled), `Highlight` / `HighlightText` (selection), `ButtonFace` /
`ButtonText`. Treat each as a variable whose value you will never know.

## The rules

### 1. Never let `box-shadow` be the only focus ring

**This one is enforced by the `check-a11y` hook (check 9), not by judgment.** A ring
built from `box-shadow` and nothing else disappears completely for exactly the users
who most need to see it.

Use `outline` as the floor. Its *color* is force-adjusted; the ring is not removed.
It has also followed `border-radius` in every engine since 2021, so the rounded ring
that made people reach for `box-shadow` in the first place is no longer a reason.
Layering is the house pattern — outline for structure, box-shadow for the soft halo:

```css
.control:focus-within {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: 0 0 0 var(--focus-ring-halo-spread) var(--focus-ring-halo); /* decorative */
}
```

If you must suppress the default ring, make it **transparent** rather than absent —
`outline-color: transparent`, never `outline: none`. Transparent gets force-adjusted
back to a real color; absent stays absent.

### 2. Give every floating surface a border

Dialogs, drawers, tooltips, toasts, popovers, menus, elevated cards. If the only thing
separating the panel from the page is `box-shadow`, the panel merges into the page.
A transparent border costs nothing and is force-adjusted to a visible one:

```css
.panel { border: 1px solid transparent; box-shadow: var(--elevation-4); }
```

The same applies to any element that leans on a background fill for its affordance —
buttons, chips, segmented controls, a switch thumb against its track.

### 3. Never encode state or meaning in color alone

Already an SC 1.4.1 (Level A) requirement; forced colors is where the bill comes due,
because *two tints that differ become one system color*. Selected vs unselected,
error vs warning vs success, active nav item vs inactive, danger menu item vs normal —
each needs a second channel:

- a **glyph** whose shape differs per meaning (not just a colored dot),
- a **weight** change via a type role,
- a **border-width** change (width is not force-adjusted; color is),
- or an explicit `Highlight` / `HighlightText` pair under the media query.

A colored dot with no text is the worst case in this family: every variant renders
identically.

### 4. Don't remove link underlines

Link color is force-adjusted to `LinkText`, which may land very close to `CanvasText`
in a user's theme. The underline is what keeps a link identifiable. If the design
wants it gone, hide it *visually* rather than removing it:

```css
a { text-decoration-color: transparent; } /* not text-decoration: none */
```

### 5. Icons inherit, they don't declare

Inline SVG with `stroke="currentColor"` / `fill="currentColor"` picks up the
force-adjusted text color automatically and always has enough contrast. A hard-coded
hex or a token reference does not — `fill` and `stroke` are force-adjusted, but only
toward the element's own resolved color, so an icon that opts out of inheritance can
land invisible. If an icon legitimately can't inherit (a multi-color logo), pin it:

```css
@media (forced-colors: active) { .logo path { fill: CanvasText; } }
```

Images with transparency have the same problem; give them an opaque fallback:

```html
<picture>
  <source srcset="logo-opaque.jpg" media="(forced-colors: active)" />
  <img src="logo.svg" alt="…" />
</picture>
```

### 6. Opt out only when the color IS the content

`forced-color-adjust: none` retains your colors on an element. It is correct for a
color swatch in a picker, a product color option, a chart legend key — cases where
losing the color loses the information. It is **not** a way to keep your brand.
Prefer expressing the swatch as an inline `<svg>` with a `<title>`: images are exempt
from force-adjustment anyway, and it gives the swatch an accessible name at the same
time.

### 7. Strip ornament the mode keeps but shouldn't

`border-image`, `list-style-image` and custom `cursor` survive force-adjustment and
can end up illegible against a theme. Revert them:

```css
@media (forced-colors: active) {
  *, ::before, ::after {
    border-image: none !important;
    list-style-image: none !important;
    cursor: revert !important;
  }
}
```

## Where the rules have to live in this kit

All 34 Lit components render into a shadow root and none opts out, so **a global
`@media (forced-colors: active)` block in `tokens.css` cannot reach inside them.**
Custom properties inherit through the boundary, but that does not help: forced colors
overrides at the *used-value* layer, downstream of every token, so no token value can
bring `box-shadow` back. This is the opposite of `prefers-reduced-motion`, which is
handled once at the token layer in `packages/tokens/build.js`.

Consequence: forced-colors rules go **inside each component's own `static styles`** (or
its `.astro` `<style>`). There is no central lever. Most fixes don't need the media
query at all — a real `outline`, a transparent border, and a persistent underline are
just better default CSS.

## Testing

Nothing automated proves this. axe-core has **no forced-colors rule**, so
`npm run a11y` will report clean on a page that is unusable in a contrast theme. The
`check-a11y` hook proves one thing only: that a focus ring exists in a form that
survives. Everything else on this page is a manual check.

- **Best:** a Windows 11 VM — Settings ▸ Accessibility ▸ Contrast themes. Try more than
  one theme; users customise them, so never design for a specific pair of colors.
  Shortcut: left `Alt` + left `Shift` + `PrtScn`.
- **Adequate:** Edge/Chrome DevTools ▸ Rendering ▸ *Emulate CSS media feature
  forced-colors: active*. It offers exactly two themes and no customisation, so it
  proves your layout survives a maximally constrained palette — it does not tell you
  what the experience is like.
- Then run the ordinary passes in that mode: is every control still visible, is every
  state still distinguishable, can you still see where focus is, can you still tell a
  link from text.

`-ms-high-contrast` and `-ms-high-contrast-adjust` are deprecated (Microsoft announced
this in April 2024 and disabled the legacy path in Edge 138). Write the standard query.
