/*
 * Ratchets: overlay focus, and the one thing native <dialog> takes away (run: `npm test`).
 *
 * On 2026-08-18 the kit's six modal overlays moved from hand-rolled `position: fixed`
 * panels to native `<dialog>` + `showModal()`. That deleted most of what a shared module
 * would have owned — inertness, focus containment and focus return are the platform's now
 * — and these guard the residue plus the one regression the migration introduced.
 *
 * They are all STRUCTURAL. A source sweep can assert "the mechanism lives in one place";
 * it cannot assert "the trap is correct", and that distinction is the whole reason the
 * old defects survived: a focus trap that is slightly wrong still moves focus, just
 * somewhere you did not mean, and the build, the types and axe are all silent about it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..',
  'packages', 'ecology', 'src',
);
const COMPONENTS = path.join(SRC, 'components');

/**
 * Strip comments before scanning.
 *
 * NOT a nicety. Three components carry a comment explaining that they deliberately do
 * NOT save `document.activeElement`, because it retargets across a shadow root — and a
 * ratchet that fires on those would be telling the author to delete the reasoning that
 * makes the code correct. A guard has to read the code, not the prose about it.
 *
 * Deliberately crude (it does not know about strings containing `//`), which is safe
 * here: over-stripping can only turn a finding into a miss on THIS corpus, and every
 * pattern below is also asserted to be non-vacuous.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const SOURCES = readdirSync(COMPONENTS)
  .map((file) => file.match(/^(esa-[a-z0-9-]+)\.(ts|astro)$/) && file)
  .filter(Boolean)
  .map((file) => {
    const src = readFileSync(path.join(COMPONENTS, file), 'utf8');
    return { file, slug: file.replace(/\.(ts|astro)$/, ''), src, code: stripComments(src) };
  });

const OVERLAY_SRC = readFileSync(path.join(SRC, 'overlay.ts'), 'utf8');
const ANNOUNCER_SRC = readFileSync(path.join(SRC, 'announcer.ts'), 'utf8');

const squash = (s) => s.replace(/\s+/g, '');

/** A component that opens a native modal gets Esc, focus return and inertness free. */
const isNativeModal = (src) => /showModal\s*\(/.test(src);

/*
 * Overlays that must be dismissible from the keyboard.
 *
 * A LIST, NOT A COUNT. The ledger carried "the nine non-modal popups" and it was wrong in
 * both directions — it counted `esa-date-picker`, which is a native `<input type="date">`
 * with no popup at all, and missed `esa-search-panel`. A number goes stale in silence; a
 * name fails loudly the moment the file is gone.
 */
const OVERLAYS_NEEDING_ESCAPE = [
  'esa-dialog', 'esa-confirm-dialog', 'esa-side-dialog',
  'esa-command-palette', 'esa-entity-search', 'esa-search-panel',
  'esa-popover', 'esa-dropdown-menu', 'esa-filter-dropdown',
  'esa-select', 'esa-combobox', 'esa-tooltip',
];

test('the sweep actually found the kit — a silent zero would pass vacuously', () => {
  assert.ok(SOURCES.length > 30, `found ${SOURCES.length} component sources`);
});

test('the focusable selector is declared in exactly one place', () => {
  // The distinguishing fragment, not the whole string — a copy that reorders the list or
  // drops a clause is exactly the drift this is looking for. One hand-copy had already
  // dropped :not([disabled]) from select and textarea, so a disabled control in a drawer
  // was a tab stop that the identical control in a dialog was not.
  const needle = squash('button:not([disabled]),input:not([disabled])');
  const copies = SOURCES.filter((c) => squash(c.code).includes(needle)).map((c) => c.file);
  assert.deepEqual(
    copies.sort(), [],
    'Import FOCUSABLE_SELECTOR from ../overlay.js instead:\n  ' + copies.join('\n  '),
  );
  assert.ok(squash(OVERLAY_SRC).includes(needle), 'overlay.ts no longer declares it — this test is vacuous');
});

test('nothing reads document.activeElement directly', () => {
  const offenders = SOURCES.filter((c) => /document\.activeElement/.test(c.code)).map((c) => c.file);
  assert.deepEqual(
    offenders.sort(), [],
    'document.activeElement RETARGETS to the shadow host when focus is inside a shadow ' +
      'root, so restoring to it lands on the wrapper rather than the control the user was ' +
      'in — silently, because the wrapper is usually focusable enough to look right. Use ' +
      'deepActiveElement() from ../overlay.js:\n  ' + offenders.join('\n  '),
  );
});

test('no component hand-rolls a focus trap', () => {
  const offenders = [];
  for (const { file, code } of SOURCES) {
    for (const name of ['trapFocus', 'focusFirst']) {
      if (new RegExp(`(private\\s+|function\\s+)${name}\\s*[(=]`).test(code)) offenders.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(
    offenders.sort(), [],
    'A modal gets containment from showModal(); a NON-modal must not trap at all. Three ' +
      'near-identical copies of this existed and one used a narrower selector, so a link ' +
      'in slotted content fell outside the confirm-dialog trap:\n  ' + offenders.join('\n  '),
  );
});

test('aria-modal is not hand-written on a native dialog', () => {
  const offenders = SOURCES.filter((c) => /aria-modal/.test(c.code) && isNativeModal(c.code)).map((c) => c.file);
  assert.deepEqual(
    offenders.sort(), [],
    'showModal() makes the dialog modal for real. ARIA in HTML forbids aria-modal on a ' +
      '<dialog> opened this way, and the attribute is exactly the promise the pre-2026-08-18 ' +
      'components made and could not keep:\n  ' + offenders.join('\n  '),
  );
});

test('every overlay can be dismissed from the keyboard', () => {
  const missing = [];
  for (const slug of OVERLAYS_NEEDING_ESCAPE) {
    const found = SOURCES.find((c) => c.slug === slug);
    assert.ok(found, `${slug} is listed here but has no source file`);
    // A native modal gets Esc from the platform, including OS-level close requests
    // (Android back, AT dismiss gestures) that no keydown handler would ever see.
    if (isNativeModal(found.code)) continue;
    if (!/'Escape'|"Escape"/.test(found.code)) missing.push(slug);
  }
  assert.deepEqual(
    missing.sort(), [],
    'An overlay a user cannot dismiss from the keyboard is a keyboard trap; for ' +
      'hover-triggered content it is also SC 1.4.13, which requires dismissible:\n  ' +
      missing.join('\n  '),
  );
});

test('the announcer follows the user into the top layer', () => {
  /*
   * THE REGRESSION GUARD FOR THE MIGRATION'S ONE CASUALTY.
   *
   * A modal <dialog> blocks everything outside itself — not just from the pointer, but
   * from focus and from the accessibility tree. The announcer's two live regions live in
   * document.body, outside every dialog, so from the moment the six modals moved onto
   * showModal() every announce() made from inside one of them reached nobody:
   * esa-entity-search's assertive "No results found", and the same call in
   * esa-command-palette and esa-search-panel.
   *
   * MEASURED, because none of it is visible from the DOM. In Chromium, Firefox AND
   * WebKit a body-level element cannot take focus while a modal dialog is open, and
   * Chromium's real a11y tree no longer contains the region's text — but `region.inert`
   * reads FALSE in all three, because the IDL attribute reflects only the `inert` content
   * attribute, not modal blocking. There is no property to assert and no axe rule for it.
   *
   * `npm run a11y:live` cannot catch a regression here either: it audits pages at rest
   * and never opens a dialog, so the regions are always still on <body> when it looks.
   */
  assert.match(
    ANNOUNCER_SRC, /:modal/,
    'announcer.ts must re-home its live regions into the open modal dialog. Without it ' +
      'every announcement made from inside a modal is silent, with the regions still in ' +
      'the DOM and still receiving their text.',
  );
  const callers = SOURCES.filter((c) => isNativeModal(c.code) && /\bannounce\(/.test(c.code)).map((c) => c.slug);
  assert.ok(
    callers.length > 0,
    'No component both opens a modal and announces — if that is really true, the ' +
      're-homing in announcer.ts is now dead code and this test is vacuous.',
  );
});
