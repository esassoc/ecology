// Regression tests for the check-a11y PreToolUse hook.
//
// The hook is a stdin/exit-code script rather than a module, so these drive it
// the way Claude Code does: a JSON payload on stdin, exit 0 (allow) or 2 (block).
//
// The label rule is the one worth pinning. Its whole claim is "near-zero false
// positives", and every exemption below is a mechanism that COULD supply the
// association — so each OK case is a distinct way a label can legitimately name
// something, and deleting any one of them re-introduces a false positive that
// would block real work. The nested-template pair is the subtle one: the tag
// scans read straight through `${html`…`}`, so an <input> inside it exempts and
// a <span> inside it does not.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

const HOOK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../plugins/spoke-kit/hooks/check-a11y.mjs',
);

/** Run the hook over proposed content; returns { blocked, stderr }. */
function check(file_path, content) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_input: { file_path, content } }),
    encoding: 'utf8',
  });
  return { blocked: r.status === 2, stderr: r.stderr ?? '' };
}

const ASTRO = '/tmp/specimen.astro';
const LIT = '/tmp/specimen.ts';

test('label rule: blocks a label that names nothing', () => {
  const { blocked, stderr } = check(ASTRO, '<label class="l">Email</label><input />');
  assert.equal(blocked, true);
  assert.match(stderr, /names nothing/);
  assert.match(stderr, /forms\.md/);
});

test('label rule: for= associates', () => {
  assert.equal(check(ASTRO, '<label for="e">Email</label><input id="e" />').blocked, false);
});

test('label rule: wrapping a labelable element associates', () => {
  assert.equal(check(ASTRO, '<label>Email<input /></label>').blocked, false);
  assert.equal(check(ASTRO, '<label>Notes<textarea></textarea></label>').blocked, false);
  assert.equal(check(ASTRO, '<label>County<select></select></label>').blocked, false);
});

test('label rule: id= may be an aria-labelledby target', () => {
  assert.equal(check(ASTRO, '<label id="l">Email</label><input aria-labelledby="l" />').blocked, false);
});

test('label rule: a slotted control is the caller’s to associate', () => {
  assert.equal(check(ASTRO, '<label>Email<slot /></label>').blocked, false);
});

test('label rule: form-associated custom elements are labelable', () => {
  assert.equal(check(ASTRO, '<label>Email<esa-text-field></esa-text-field></label>').blocked, false);
});

test('label rule: a call expression may return a control we cannot see', () => {
  assert.equal(check(LIT, 'html`<label>${this.renderInput()}</label>`').blocked, false);
});

test('label rule: sees through a nested template literal', () => {
  // A nested template holding only a decorative span does NOT exempt...
  assert.equal(
    check(LIT, 'html`<label>${this.label}${r ? html`<span>*</span>` : null}</label>`').blocked,
    true,
  );
  // ...but one holding a real control does.
  assert.equal(
    check(LIT, 'html`<label>${this.label}${r ? html`<input />` : null}</label>`').blocked,
    false,
  );
});

test('label rule: framework bindings and spread props exempt', () => {
  assert.equal(check(ASTRO, '<label htmlFor={id}>Email</label>').blocked, false);
  assert.equal(check(ASTRO, '<label {...rest}>Email</label>').blocked, false);
});

test('escape hatch releases the block', () => {
  const content = '<!-- a11y-checked: visual caption, control names itself --><label>Email</label>';
  assert.equal(check(ASTRO, content).blocked, false);
});

test('content with no label is untouched', () => {
  assert.equal(check(ASTRO, '<button>Save</button>').blocked, false);
});

test('the four pre-existing rules still fire', () => {
  assert.equal(check(ASTRO, '<div tabindex="3">x</div>').blocked, true);
  assert.equal(check(ASTRO, '<img src="a.png">').blocked, true);
  assert.equal(check(ASTRO, '<div role="button">Go</div>').blocked, true);
  assert.equal(check('/tmp/x.css', ':focus-visible { outline: none; }').blocked, true);
});

// ── <label> wrapping a non-labelable ARIA role ──────────────────────────────
// The shape that shipped in esa-checkbox, esa-checkbox-group and esa-radio-group:
// a <label> around <span role="checkbox">. A label associates only with a form
// control, so all three options had NO accessible name — measured against Chrome's
// accessibility tree on 2026-08-16. The synthetic case was already caught; the REAL
// files were not, because `aria-checked=${String(this.checked)}` put a `(` inside an
// interpolation and tripped the "a call may return a control" exemption.

test('label rule: a wrapped role=checkbox span is not named by the label', () => {
  const { blocked, stderr } = check(LIT, 'html`<label>Email<span class="box" role="checkbox" tabindex="0"></span></label>`');
  assert.equal(blocked, true);
  assert.match(stderr, /names nothing/);
});

test('label rule: an interpolated call does NOT excuse a wrapped ARIA role', () => {
  // The exact regression: a String() call in an aria-* attribute used to exempt the
  // whole label, which is why three shipped components went unflagged for months.
  assert.equal(
    check(LIT, 'html`<label>${this.label}<span role="checkbox" aria-checked=${String(this.checked)}></span></label>`').blocked,
    true,
  );
});

test('label rule: aria-labelledby on the role element clears it', () => {
  // This is the fix the rule asks for, so it has to be what satisfies it — a guard
  // that still fires on corrected code is a guard people learn to ignore.
  assert.equal(
    check(LIT, 'html`<label><span role="checkbox" tabindex="0" aria-labelledby="l" aria-checked=${String(x)}></span><span id="l">Email</span></label>`').blocked,
    false,
  );
  assert.equal(
    check(LIT, 'html`<label><span role="radio" tabindex="0" aria-label="Low"></span></label>`').blocked,
    false,
  );
});

test('label rule: wrapping a real control still exempts, role or not', () => {
  assert.equal(check(ASTRO, '<label>Email<input role="combobox" /></label>').blocked, false);
});

// ── Unconditional outline reset (Check 4c) ──────────────────────────────────
// The 2026-08-16 focus audit found three rings deleted in the hub — all three
// written as `.input { outline: none }`, with no `:focus` anywhere in the file.
// Check 4's original two regexes both require `:focus` in the SELECTOR, so the
// guard matched none of them. These pin the shape that actually ships, and the
// conservatism that keeps it from flagging every reset.

test('unconditional reset: blocks outline:none on a class the file puts on a button', () => {
  const { blocked, stderr } = check(LIT, 'html`<button class="go">Go</button>`; css`.go { outline: none; }`');
  assert.equal(blocked, true);
  assert.match(stderr, /EVERY state/);
});

test('a ring moved to a pseudo-element is not a suppression', () => {
  // esa-range-slider: the thumb takes the ring, the track does not — native
  // behaviour for a slider.
  assert.equal(
    check('/tmp/x.css', '.input:focus-visible { outline: none; } .input:focus-visible::-webkit-slider-thumb { outline: 2px solid red; }').blocked,
    false,
  );
  // But a pseudo-element that does NOT carry a ring must not buy the exemption.
  assert.equal(
    check('/tmp/x.css', '.input:focus-visible { outline: none; } .input::placeholder { color: grey; }').blocked,
    true,
  );
});

test('the Lauke pairing is not a suppression', () => {
  // `:focus:not(:focus-visible) { outline: none }` undoes the UA ring only where a
  // :focus-visible rule replaces it. Flagging it caught the two places in the repo
  // that get focus RIGHT — the docs shell and @esa/tokens/focus.css.
  assert.equal(
    check('/tmp/x.css', ':focus-visible { outline: 2px solid red; } :focus:not(:focus-visible) { outline: none; }').blocked,
    false,
  );
});

test('unconditional reset: blocks a bare interactive-tag or universal selector', () => {
  assert.equal(check('/tmp/x.css', '* { outline: none; }').blocked, true);
  assert.equal(check('/tmp/x.css', 'input { outline: 0; }').blocked, true);
});

test('unconditional reset: blocks it on a tab-reachable [tabindex="0"] element', () => {
  assert.equal(check(LIT, 'html`<div class="w" role="textbox" tabindex="0"></div>`; css`.w { outline: none; }`').blocked, true);
});

test('unconditional reset: tabindex="-1" is NOT enough to flag', () => {
  // Unreachable by Tab, so whether a ring should paint on programmatic focus is a
  // change-of-context judgment (esa-error-summary says yes, esa-side-dialog says
  // no) — not something provable from the source, which is this hook's whole bar.
  assert.equal(check(LIT, 'html`<div class="panel" tabindex="-1"></div>`; css`.panel { outline: none; }`').blocked, false);
});

test('unconditional reset: same-class :focus ring exempts (the ordinary substitution)', () => {
  // The ring here is an OUTLINE, not a box-shadow — a box-shadow-only ring would
  // pass this rule and then be blocked by check 9, which is correct and is not
  // what this test is pinning.
  assert.equal(
    check(LIT, 'html`<input class="input" />`; css`.input { outline: none; } .input:focus { outline: 2px solid red; }`').blocked,
    false,
  );
});

test('unconditional reset: a wrapper ring is the documented fix and must pass', () => {
  // The shape all three hub components were repaired to: the chromeless input
  // keeps outline:none, the bordered row it sits in paints the ring.
  assert.equal(
    check(
      LIT,
      'html`<div class="row"><input class="input" /></div>`; css`' +
        '.row:focus-within { outline: 2px solid red; } .input { outline: none; }`',
    ).blocked,
    false,
  );
});

test('unconditional reset: does NOT flag a non-focusable element', () => {
  assert.equal(check(LIT, 'html`<div class="card">x</div>`; css`.card { outline: none; }`').blocked, false);
});

test('unconditional reset: does NOT flag a class the file cannot pair with markup', () => {
  // A standalone stylesheet has no markup to prove the class lands on a control.
  assert.equal(check('/tmp/x.css', '.thing { outline: none; }').blocked, false);
});

test('unconditional reset: does NOT flag a pseudo-element', () => {
  assert.equal(check(LIT, 'html`<button class="b"></button>`; css`.b::-moz-focus-inner { outline: none; }`').blocked, false);
});

// ── Live-region rules ───────────────────────────────────────────────────────
// These three encode the failures the 2026-08-16 status-messages audit found
// SHIPPED in this kit, each of which read as an accessibility feature in review:
// a permanently-empty role="status" on every spinner, a role="alert" whose
// aria-live silently downgraded it, and the toast action button. All three are
// provable from the source text alone, which is what earns them a place here
// rather than in the skill.

test('empty live region: blocks a region that can never announce', () => {
  const { blocked, stderr } = check(ASTRO, '<span role="status" aria-label="Loading"></span>');
  assert.equal(blocked, true);
  assert.match(stderr, /permanently EMPTY/);
});

test('empty live region: catches aria-live and self-closing forms too', () => {
  assert.equal(check(ASTRO, '<div aria-live="polite"></div>').blocked, true);
  assert.equal(check(ASTRO, '<div role="alert" />').blocked, true);
  assert.equal(check(ASTRO, '<div role="log">   </div>').blocked, true);
});

test('empty live region: a region with content or interpolation passes', () => {
  assert.equal(check(ASTRO, '<div role="status">Saved</div>').blocked, false);
  assert.equal(check(ASTRO, '<div role="status">{message}</div>').blocked, false);
  assert.equal(check(LIT, 'html`<div role="status">${this.msg}</div>`').blocked, false);
  // Spread props may carry children — exempt, same as every other rule here.
  assert.equal(check(ASTRO, '<div role="status" {...rest}></div>').blocked, false);
});

test('empty live region: aria-live="off" is not a live region', () => {
  assert.equal(check(ASTRO, '<div aria-live="off"></div>').blocked, false);
});

test('politeness conflict: role="alert" + aria-live="polite" blocks', () => {
  const { blocked, stderr } = check(ASTRO, '<p role="alert" aria-live="polite">{msg}</p>');
  assert.equal(blocked, true);
  assert.match(stderr, /contradicts itself/);
});

test('politeness conflict: a redundant but agreeing pair passes', () => {
  assert.equal(check(ASTRO, '<p role="alert" aria-live="assertive">{m}</p>').blocked, false);
  assert.equal(check(ASTRO, '<p role="status" aria-live="polite">{m}</p>').blocked, false);
});

test('control in a live region: blocks a button inside one', () => {
  const { blocked, stderr } = check(ASTRO, '<div role="status">Saved <button>Undo</button></div>');
  assert.equal(blocked, true);
  assert.match(stderr, /inside a live region/);
});

test('control in a live region: a plain-text region passes', () => {
  assert.equal(check(ASTRO, '<div role="status">Saved. <em>3 files</em></div>').blocked, false);
});

test('interactive-role rule: options in an activedescendant listbox are exempt', () => {
  // Focus stays on the input; the options are pointed AT, not tabbed to. Giving them
  // tabindex="0" would be the actual bug.
  const managed =
    '<input role="combobox" aria-activedescendant="opt-0" />' +
    '<div role="listbox"><div role="option" id="opt-0">A</div></div>';
  assert.equal(check(ASTRO, managed).blocked, false);
});

test('interactive-role rule: the exemption is narrow', () => {
  // Same file, but a role the activedescendant model does not cover.
  const overreach =
    '<input role="combobox" aria-activedescendant="opt-0" /><div role="button">Go</div>';
  assert.equal(check(ASTRO, overreach).blocked, true);
  // And without activedescendant anywhere, a bare option is still unreachable.
  assert.equal(check(ASTRO, '<div role="option">A</div>').blocked, true);
});

// --- Check 9: a focus ring that vanishes in forced colors mode ---------------
// The rule is a RATCHET, not a cleanup: the hub had zero instances when it
// landed (2026-08-16 sweep over all 66 components — 0 flagged, 0 false
// positives), so these cases are the only proof it is not inert.

const CSS = '/tmp/specimen.css';

test('forced-colors ring: blocks a ring painted only with box-shadow', () => {
  const { blocked, stderr } = check(CSS, '.btn:focus-visible { box-shadow: 0 0 0 2px blue; }');
  assert.equal(blocked, true);
  assert.match(stderr, /box-shadow is forced to `none`/);
  assert.match(stderr, /forced-colors\.md/);
});

test('forced-colors ring: an outline on the SAME rule is the layered ring, and passes', () => {
  // outline = the floor that survives forced-colors; a box-shadow beside it is extra.
  // (This comment said "the soft halo" until 2026-08-17. The kit has no halo band — one
  // was tried and reverted — but the CHECK is about layering in general, not that band,
  // so the case is still the right one to cover.)
  const layered = '.btn:focus-visible { outline: 2px solid blue; box-shadow: 0 0 0 4px #eee; }';
  assert.equal(check(CSS, layered).blocked, false);
});

test('forced-colors ring: an outline on the same CLASS elsewhere pairs', () => {
  // The error-state override only adds a box-shadow; the base rule's outline still
  // paints. This is the shape of every *--error field rule in the kit — and note that
  // the shape is itself a known defect (the outline is never reset, so a focused invalid
  // field paints two rings in two colours). That is logged separately; what this test
  // pins is only that the GUARD does not mistake the override for a removed ring.
  const paired =
    '.input:focus { outline: 2px solid blue; box-shadow: 0 0 0 4px #eee; }\n' +
    '.field--error .input:focus { box-shadow: 0 0 0 2px red; }';
  assert.equal(check(CSS, paired).blocked, false);
});

test('forced-colors ring: a forced-colors block anywhere is the author engaging, and passes', () => {
  // HOW they handled it is judgment the hook does not adjudicate.
  const handled =
    '.btn:focus-visible { box-shadow: 0 0 0 2px blue; }\n' +
    '@media (forced-colors: active) { .btn:focus-visible { outline: 2px solid CanvasText; } }';
  assert.equal(check(CSS, handled).blocked, false);
});

test('forced-colors ring: `outline: none` does not count as a ring', () => {
  // The regression that motivated reading declarations instead of sniffing with
  // a lookahead: /outline\s*:\s*(?!none\b)/ passes on `outline: none`, because
  // \s* backtracks to zero width and the lookahead lands on " none".
  assert.equal(
    check(CSS, '.btn:focus-visible { outline: none; box-shadow: 0 0 0 2px blue; }').blocked,
    true,
  );
});

test('forced-colors ring: `outline-offset` is not a ring either', () => {
  const offsetOnly =
    '.a:focus { outline: 2px solid red; }\n' +
    '.b:focus { outline-offset: 2px; box-shadow: 0 0 0 2px blue; }';
  const { blocked, stderr } = check(CSS, offsetOnly);
  assert.equal(blocked, true);
  assert.match(stderr, /\.b:focus/);
});

test('forced-colors ring: `box-shadow: none` is a reset, not a ring', () => {
  // esa-input-tag's .container--disabled:focus-within — clearing a box-shadow on a
  // disabled field must not read as painting a ring.
  assert.equal(check(CSS, '.container--disabled:focus-within { box-shadow: none; }').blocked, false);
});

test('forced-colors ring: the escape hatch releases it', () => {
  const asserted =
    '/* a11y-checked: ring is drawn by the parent row, verified in Contrast Themes */\n' +
    '.btn:focus-visible { box-shadow: 0 0 0 2px blue; }';
  assert.equal(check(CSS, asserted).blocked, false);
});
