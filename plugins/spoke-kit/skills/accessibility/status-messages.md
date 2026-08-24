# Status messages: the live-region contract

For anything that reports the result of an action, the progress of a process, or
the existence of an error — WCAG SC 4.1.3 Status Messages (Level AA).

Every rule below is anchored to a component in the hub that already does it, so
this reads as "copy that one," not "obey me."

## The first rule is: probably not a live region

This is the opposite of the usual advice, and it is the most important thing on
the page. Live regions are **transient** — an announcement cannot be replayed,
reviewed, or revealed later. Miss it and it is gone. They also carry **no
structure**: a `<button>` inside one is announced as a bare word with nothing to
say it is a button, and there is no mechanism to navigate to it.

So work down this list and stop at the first thing that fits:

| # | Mechanism | Use when | Reference |
|---|---|---|---|
| 1 | **An instructional cue** (`aria-describedby`) | Content updates in response to something the user is *already doing*. Tell them once, up front, and nothing has to interrupt them after. | `esa-combobox.ts` (`cueText`), `esa-filter-dropdown.ts` |
| 2 | **Moving focus** | The user needs to *get to* the new content, or it contains a control. A change of context is already surfaced by AT — 4.1.3 does not even apply. | `esa-error-summary.ts` (`focus()`), `esa-dialog.ts` |
| 3 | **An ARIA state property** | A state changed and there is an attribute that says so: `aria-expanded`, `aria-pressed`, `aria-checked`, `aria-valuenow`, `aria-busy`. | `esa-progress-bar.astro`, `esa-switch-toggle.ts` |
| 4 | **A live region** | None of the above fits, and staying silent means the user does not find out. | `announcer.ts` via `announce()` |

Most of what looks like case 4 is case 1 or 2. A filtered result list is case 1.
A validation summary is case 2. A dropdown opening is case 3.

## If you do need one, there is exactly one

**`import { announce } from '@esa/ecology/announcer'`.** Do not write
`aria-live` into a component.

```js
announce('3 files added');                        // polite
announce('No results found', { assertive: true }); // interrupts
```

`announcer.ts` owns two regions — one polite, one assertive — in the light DOM,
mounted before anything happens. That is not tidiness, it is the four things a
per-component region gets wrong:

1. **A region must pre-exist its content.** One created in the same tick as its
   text is routinely not announced at all. A singleton mounts once and is then
   only ever mutated.
2. **Regions interfere with each other.** Assertive updates may clear the polite
   queue. The accepted ceiling is about two per page. Every component that mints
   its own is degrading everyone else's.
3. **Shadow boundaries.** Live-region observation across a shadow root is
   unreliable, worst in Safari/VoiceOver and worse again two roots deep. Light
   DOM sidesteps it entirely — and needs no cross-root reference, since IDREFs
   never cross a shadow boundary in any engine.
4. **Repeat messages.** Setting `textContent` to the string it already holds is
   not a mutation, so the same message twice announces once. The announcer
   clears and re-writes; you would have to remember to.

## Politeness

`assertive` stops a screen reader **mid-sentence and does not resume**. It can
strand someone. Reserve it for when waiting costs them something.

| Assertive | Polite |
|---|---|
| a query returned nothing | a save succeeded |
| a file was rejected | a page of results changed |
| a save failed | a file was added |
| a session is about to expire | a long job is 40% done |

Roles carry implicit politeness: `alert` → assertive; `status` and `log` →
polite (`status` also implies `aria-atomic="true"`). **Never state a role and a
contradicting `aria-live` on the same element** — the attribute wins, so
`role="alert" aria-live="polite"` is an alert that does not interrupt. The hook
blocks it.

## The four failures that shipped in this kit

Each of these read as an accessibility feature in review and did nothing. All
four are now blocked by `check-a11y` or fixed in the component.

**1. The permanently empty region.**
`<span role="status" aria-label="Loading"></span>` was on every spinner. A live
region announces *changes to its contents*; that span has no contents and never
will, so it never announced anything. The `aria-label` does not rescue it — the
name is read only when the content changes. A permanent indicator is
`role="img"` with a name (`esa-loading-spinner.astro`); a real status message
goes through `announce()`.

**2. The region that is not in the DOM yet.**
`{show && <p role="alert">{msg}</p>}` creates the region and its text in the same
instant. Either keep the node present always and swap its text — which is what
the self-chromed form controls do, `.visually-hidden` when empty
(`esa-text-field.ts`) — or use the announcer.

**3. The control inside the region.**
A toast with an "Undo" button. Announced as the bare word "undo", never focused,
unreachable, and gone in five seconds. **A message with a control in it is a
dialog, not a status message.** If the action matters, use `esa-dialog`. If you
put one in anyway, the same action must also exist in the page itself.

**4. The dedupe that swallowed the event.**
`esa-snackbar-container`'s `uniqueKey` returned early on a repeat, so the second
identical toast produced no DOM change and reported nothing. Deduping the
*visual* toast is right; skipping the *announcement* is not — the user did
something and it happened again.

## Toasts specifically

Persistent is the baseline; auto-dismiss is the enhancement, not the reverse.

- **`duration` defaults to `0`** in `esa-snackbar-container`. A timer the user
  cannot adjust, extend, or turn off is **SC 2.2.1 Timing Adjustable, Level A**.
- Hover/focus pausing is a **mitigation, not a conformance argument** — it fires
  for neither a virtual cursor nor a magnifier user.
- The visual stack is **not** the live region. It carries `role="region"` with a
  name, so it is a landmark someone can navigate to. The announcement comes from
  the announcer. An announcement says a thing exists; the landmark is the route
  to it.
- Accept that toasts get missed — by a magnifier user looking elsewhere, by
  anyone who glanced away. If missing one has a consequence, it should not be a
  toast.

## Filtering and search

The pattern that gets this wrong is wrapping the results in `aria-live` so every
keystroke reads the whole list back. Instead:

1. **Describe the behaviour on the input**, via `aria-describedby` pointing at a
   `.visually-hidden` span: *"Results filter as you type. Use the up and down
   arrows to review them, Enter to choose."* Present always, re-readable, and it
   makes per-keystroke announcements unnecessary.
2. **Announce only the transition into no-results**, assertively. This is the one
   case that must interrupt: a sighted user sees the list empty out and corrects
   immediately; without it a screen reader user keeps typing into nothing. Guard
   on the *transition*, not the state, or every further keystroke re-announces.
3. **Wire `aria-activedescendant`** so arrow-key navigation is audible at all.
   Focus stays on the input, so without it the active option changes in complete
   silence. Both IDREFs must resolve inside the same shadow root.

`esa-combobox.ts`, `esa-command-palette.ts`, `esa-filter-dropdown.ts` and
`esa-select.ts` do all three. `esa-input-tag.ts` and `esa-search-panel.ts` do 1
and 2. `esa-entity-search.ts` is the last one out and is being moved onto 3.

**A note on 3, corrected 2026-08-18.** This used to say that components whose
options are real `<button>`s (`esa-entity-search`, `esa-command-palette`,
`esa-input-tag`) use "a different, also-valid keyboard model — the options are
tab stops." Two things were wrong with that. `esa-command-palette` had already
moved off it — its options are `<div role="option">` behind
`aria-activedescendant`, and the source comment at `esa-command-palette.ts:261`
says why: *"A `<button role="option">` is invalid: an option may not be an
interactive widget, and it also made every command its own tab stop."* And
`esa-entity-search` was never really on the other model either — it bound Tab to
cycling its facets, so its options were tab stops that Tab could not reach.

The warning underneath it still stands and is the reason to read this: **half of
each model is worse than either.** Non-focusable options with no
`aria-activedescendant` change in silence; focusable options with one fight each
other for where focus actually is. Pick one and wire it completely.

## Forms

Validation errors are case 2, not case 4. The house pattern is validate-on-submit
with **`esa-error-summary`**, which takes focus and links to each invalid field.

`liveError` is **off by default on every form control** and should stay that way.
Turning it on for a six-error form fires six assertive announcements at once,
racing each other and the summary the user was just sent to. Turn it on only for
a field validated inline on blur, where there is exactly one message. Note that
JAWS may then read it twice — once live, once as the description on focus — the
known cost of pairing a live region with `aria-describedby` on one node.

See **[forms.md](forms.md)** for the naming, describedby and grouping contract.

## Verifying

`npm run a11y` (axe) **cannot see any of this**. It cannot see a region that
never fires, a name that vanishes when the user types, or the keyboard at all. A
green run is evidence of nothing here.

- **NerdeRegion** (browser DevTools extension) — confirm each region exists at
  load and mutates exactly once per event. This is the tool for the job.
- Test NVDA/Firefox **and** VoiceOver/Safari; live-region behaviour differs most
  between them.
- Per component: fire the same message twice; type a query that matches nothing;
  submit an invalid form; reject a file.
