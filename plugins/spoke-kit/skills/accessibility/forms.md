# Forms: the accessible-name contract

Forms are where this design system's accessibility is thinnest, and the reason is
structural rather than careless. Every rule below is anchored to a component in
the hub that **already does it right** — so this reads as "copy that one," not
"obey me."

## Why forms specifically

A button is accessible when it has text in it. A form control needs four separate
things wired, and each one can be dropped independently without anything looking
wrong:

1. a **name** (what is this field),
2. a **description** (how do I fill it in),
3. **state** (required, invalid, disabled), and
4. **grouping** (what is this set of options *for*).

Miss the name and the field still renders. Miss the description and the hint still
appears on screen. Nothing is red, no test fails, and a screen reader announces
"edit text, blank." That silence is why forms need a written contract when buttons
don't.

**The compounding failure to watch for:** when a control has no name, a placeholder
inevitably starts doing label duty — because it is the only text left. That is how
`placeholder` becomes load-bearing. Fix the name and the placeholder problem
dissolves; darkening the placeholder to pass contrast only makes it look like
pre-filled input, which is a *worse* failure than the one you started with.

## 1. Every control has a programmatic name

Three legal mechanisms. Pick by what the control actually is.

| Mechanism | Use when | Reference |
|---|---|---|
| `<label for>` → `<input id>` | The inner control is a **labelable element** (`input`, `textarea`, `select`) and lives in the same root | `esa-text-field.ts` (label + input), `esa-textarea.ts` |
| **Label text inside the control** | The control is a `<button>` — content becomes the name for free, no ids, no boundary problem | `esa-switch-toggle.ts` (`<button role="switch">` with the label as a child) |
| `aria-labelledby` → an `id` in the **same shadow root** | The named thing is a group or a non-labelable element | `esa-button-toggle.ts` (`<span id="label">` + `aria-labelledby="label"`) |

Three things that trip people up:

- **A `<label>` around a `<span role="checkbox">` confers nothing.** `<label>` names
  *labelable elements* only — native form controls. Wrap an ARIA-role `<span>` in a
  label and you get an unnamed checkbox with a visible caption. If the control isn't
  native, use content-as-name or `aria-labelledby`.
- **Hard-coded ids are CORRECT inside a shadow root.** Ids are scoped per shadow root,
  so `id="input"` cannot collide across instances. Don't invent id generation for a
  Lit component — `esa-text-field` and `esa-button-toggle` both hard-code, deliberately.
- **A `<label>` in light DOM can never reach a shadow-DOM input.** So a presentational
  `.astro` wrapper cannot name a slotted `esa-*` control, no matter what `for` you give
  it. The name has to be produced *inside* the component. If a wrapper renders a label
  for a slotted web component, say plainly in its docs that the label is decorative and
  the control must carry its own — don't tell people to wire a `for` that cannot work.

**Never let a name fall back to `placeholder`.** A control rendered with an empty
`label` and no `aria-label` should warn at runtime, the way `esa-select.ts` already
warns for a deprecated prop. Silent namelessness is the failure mode this whole file
exists to prevent.

**Watch names that vanish mid-interaction.** Several patterns blank the placeholder
once the field has content (`placeholder=${values.length ? '' : this.placeholder}`).
If placeholder was the name, the control goes *nameless the moment the user uses it* —
exactly when they most need to re-check what they typed.

## 2. Instructions go outside the name, attached with `aria-describedby`

The accessible name should be short. Hints, format requirements, and errors are
**descriptions** — screen readers announce them after the name and role, with a pause,
which reads far better than one long name.

- Give help and error text a real `id`, and point `aria-describedby` at it.
- `aria-describedby` takes a **token list** — `aria-describedby="help error"` is legal
  and often right. If you deliberately drop help when an error is showing, that is a
  defensible choice; make it a *stated* one, not an accident of a ternary.
- A description that exists only as adjacent text is decorative. It is on screen and
  invisible to assistive tech.
- Descriptive content is flattened to a string, so structure (lists, paragraphs) does
  not survive — write it to read well as one sentence.

Reference: `esa-button-toggle.ts` and `esa-input-tag.ts` are the two components in the
hub that wire this.

## 3. Errors have to announce, and state has to be real

- **Announce**: an error appearing after a failed submit must be in a live region.
  Use `role="alert"` **or** `aria-live`, not both — `role="alert"` already implies
  assertive, so adding `aria-live="polite"` silently downgrades it. Pick one and mean it.
- **A live region only fires on mutation.** Server-rendered into the initial HTML, it
  announces nothing. It works when the message is inserted client-side.
- **`aria-invalid`** on the control whenever the error is showing.
- **Required is `aria-required` (or the native `required` attribute); the asterisk is
  `aria-hidden="true"`.** `aria-label="required"` on a bare `<span>` does **nothing** —
  `aria-label` is ignored on `role=generic`. It looks like an accessibility feature in
  a diff and is inert at runtime. `esa-button-toggle.ts` and `esa-input-tag.ts` get this
  pairing right.
- **`setValidity` is not an accessibility feature.** It blocks submission; it does not
  tell anyone the field is required before they try. You need both.
- **Disabled must be disabled.** `opacity: .5; pointer-events: none` dims the field and
  blocks the mouse — the control stays keyboard-focusable, operable, and still submits.
  Use the native `disabled` attribute (`esa-switch-toggle.ts`), or `<fieldset disabled>`
  for a group, or set it on each child (`esa-button-toggle.ts`).

## 4. Grouping: reach for `<fieldset>`/`<legend>` first

A set of radios named "Black / Purple / Green" tells you nothing about what you are
choosing a color *for*. The group needs its own name.

- **Prefer native `<fieldset>` + `<legend>`.** `<legend>` must be a **direct child** —
  wrap it in a `<div>` and the association breaks silently. `<fieldset disabled>` also
  disables every descendant for free, which is the state problem in §3 solved by markup.
- **If layout fights you**, visually hide the `<legend>` and render a styleable duplicate
  marked `aria-hidden="true"` — the legend still names the fieldset. Do this rather than
  dropping to ARIA.
- **`role="radiogroup"` is acceptable.** `role="group"` is the one to justify: support is
  poor on iOS VoiceOver and Android TalkBack, so an ARIA-only group can be invisible to
  the mobile users most likely to be filling in a form on a phone.
- **A group name must be a *reference*, not a copy.** `aria-labelledby` pointing at the
  visible heading's id keeps the two in sync forever. `aria-label=${this.label}` duplicates
  the string — and gives you a silently unnamed group the moment `label` is empty.
  `esa-button-toggle.ts` references; most of the rest duplicate.
- An **unnamed** `role="group"` is pure noise. Either name it or drop the role.

## 5. Identify input purpose — `autocomplete` and `inputmode`

Both are currently unimplemented across the kit, and both are cheap.

- **`autocomplete`** is the only way to satisfy **SC 1.3.5 Identify Input Purpose (AA)**.
  `type="email"` says what *kind* of data; `autocomplete="email"` says **whose**. It also
  enables browser autofill, which matters enormously for motor impairments. 51 fixed
  values — use the real ones. `autocomplete="one-time-code"` gets iOS to surface an SMS
  code in the QuickType bar.
- **`inputmode`** picks the mobile keyboard (`numeric`, `decimal`, `tel`, `email`,
  `url`, `search`). It is a usability win, not a conformance one, and it enforces nothing
  about validity.
- **Forward `name` to the inner control.** A `name` consumed only by `ElementInternals`
  never reaches the DOM input, so even the browser's heuristic autofill has nothing to
  match on. This is the quiet reason autofill "doesn't work" on custom form controls.
- Don't bind `placeholder` to `<input type="date">` — browsers ignore it. A prop that
  does nothing reads as available.
- Don't `aria-hidden` a prefix/suffix affix that carries meaning. "$" and "%" change what
  the field means; hiding them from assistive tech loses the unit.

## 6. Custom listboxes (select, combobox, tag input, palette, filter)

If you build a popup list rather than using a native `<select>`, you owe the whole
APG pattern. The commonest half-build: the roles are present, the *relationships* aren't.

- [ ] `role="combobox"` on the **input or trigger**, with `aria-expanded` kept in sync.
- [ ] `aria-controls` pointing at the listbox's `id` — the listbox needs an `id` at all.
- [ ] **`aria-activedescendant`** pointing at the highlighted option's `id`, and every
      option needs an `id`. Without this the arrow-key highlight is a CSS class and
      **arrow navigation is announced to nobody** — the single most common defect here.
- [ ] `role="option"` on elements that are **not** independently focusable. Putting it on
      a real `<button>` makes every option a tab stop *and* an option — two conflicting
      interaction models at once.
- [ ] A `role="listbox"` may only own options and groups. Not the search input, not
      unlabelled heading `<div>`s, not a bare "No results" `<div>`.
- [ ] `aria-selected` means **selected**, not highlighted. Highlight is `activedescendant`.
- [ ] Home/End as well as arrows, and `scrollIntoView()` on the active option — a
      highlight that leaves a max-height list is invisible to sighted keyboard users.
- [ ] **Result counts and empty states in a live region.** "Displaying 4 of 120",
      "No results found", "Searching…" all change on keystroke and are otherwise silent.
- [ ] Don't hijack Tab. Repurposing Tab inside a dialog with no focus trap is a keyboard
      trap (SC 2.1.2) no matter what the visible footer says.

## 7. Target size and the whole-row rule

Bind the click handler to the **whole row**, not the glyph. A 14–20px checkbox box is
under SC 2.5.8's 24×24 CSS px minimum (AA), and a visible label that does nothing when
clicked is a usability failure well before it's a conformance one. `esa-checkbox.ts` and
`esa-radio-group.ts` bind to the label row; that is the pattern.

## The review checklist

Run this against any component that collects a value:

- [ ] Announces a **name** that is not the placeholder, and keeps it after the user types.
- [ ] Help/error carry `id`s and are referenced by `aria-describedby`.
- [ ] `aria-invalid` while invalid; error is in a live region and inserted client-side.
- [ ] `aria-required` / native `required`; asterisk is `aria-hidden`.
- [ ] `disabled` uses the native attribute, not opacity.
- [ ] Option sets are grouped and the group is **named by reference**.
- [ ] `autocomplete` / `inputmode` exposed; `name` reaches the inner control.
- [ ] Custom listbox: `aria-controls` + `aria-activedescendant` + option ids + Home/End.
- [ ] Whole row is the target.
- [ ] Keyboard-only: reach it, operate it, see focus, get out.

## Related

- **[SKILL.md](SKILL.md)** — the general judgment layer. §3 names & alt, §4 ARIA
  correctness, §5 the contrast rule this file's placeholder discussion depends on.
- **[cross-stack-porting.md](cross-stack-porting.md)** — everything here is lost in a
  hand-port; that checklist is the backstop.
