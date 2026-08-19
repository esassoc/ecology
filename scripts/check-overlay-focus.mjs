/*
 * Overlay focus audit — `npm run a11y:overlays` (needs `npm run build` first).
 *
 * THE THING THIS EXISTS FOR, stated first because it is not obvious: on 2026-08-18 the
 * kit's six modal overlays moved to native `<dialog>` + `showModal()`, and that silently
 * broke every announcement made from inside one. A modal dialog blocks everything outside
 * itself — from the pointer, from focus, AND from the accessibility tree — and
 * `announcer.ts` mounts its two live regions on `document.body`, outside every dialog.
 *
 * Nothing could see it. `region.inert` reads FALSE in Chromium, Firefox and WebKit,
 * because the IDL attribute reflects the `inert` content attribute and not modal
 * blocking, so there is no property to assert and no attribute to grep. axe has no rule.
 * `npm run a11y:live` audits pages at rest and never opens a dialog, so the regions are
 * always still on `<body>` when it looks. `npm test`'s static ratchet can only assert
 * that `announcer.ts` still contains the string `:modal` — refactor that function and the
 * test passes while the announcements go silent again.
 *
 * So this drives a real browser, opens each overlay, and asks what actually happened.
 *
 * WHAT IT DOES NOT PROVE. That a screen reader enters dialog mode; that an announcement
 * is spoken; that the focus order inside an overlay is sensible. It proves the mechanism,
 * which is the half that can be automated. The other half is NVDA/Firefox and
 * VoiceOver/Safari, by hand.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootSite, AWAIT_UPGRADE } from './lib/site-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/site/dist');

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};
const strict = argv.includes('--strict');
const filter = arg('--filter');
const url = arg('--url');

/**
 * Overlays worth opening. A LIST, NOT A HEURISTIC — "every custom element with an `open`
 * property" would sweep in `esa-collapsible` and `esa-nav-dropdown`, which are disclosures
 * and have none of these obligations.
 */
const MODAL_TAGS = [
  'esa-dialog', 'esa-confirm-dialog', 'esa-side-dialog',
  'esa-command-palette', 'esa-entity-search', 'esa-search-panel',
];
const NON_MODAL_TAGS = [
  'esa-popover', 'esa-dropdown-menu', 'esa-filter-dropdown', 'esa-combobox', 'esa-select',
];

/**
 * Opened with a synthetic probe rather than each page's own trigger.
 *
 * Doc-page triggers are all page-local and inconsistent — `#open-cmdk` here, a hotkey
 * there, nothing at all for the popover — and encoding them would go stale the first time
 * a page was edited. A probe button injected as body's first child works on every route
 * with zero page knowledge, and because it is focused at open time it doubles as a KNOWN
 * CORRECT restore target and as the canary for inertness.
 */
const PROBE = async (page, tag, isModal) =>
  page.evaluate(async ([tag, isModal]) => {
    const deep = () => {
      let e = document.activeElement;
      while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement;
      return e;
    };
    const flat = (root = document, out = []) => {
      for (const el of root.querySelectorAll('*')) {
        out.push(el);
        if (el.shadowRoot) flat(el.shadowRoot, out);
      }
      return out;
    };
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const el = document.querySelector(tag);
    if (!el) return { skip: 'not on route' };

    /*
     * REFUSE TO GUESS AT THE OPEN API.
     *
     * The first version set `el.open = true` unconditionally. On `esa-filter-dropdown`,
     * `esa-select` and `esa-combobox` — whose state is a PRIVATE `_open` — that just
     * writes a meaningless JS property, which then reads back as `true`, so the audit
     * "opened" an overlay that never opened and reported esc-does-not-close against it.
     * Nine confident findings about nothing. A check that fabricates a finding is worse
     * than no check, in the same way and for the same reason as one that fabricates an
     * all-clear.
     *
     * So: a declared reactive `open`, or a `show()` method, or nothing. What is skipped
     * is COUNTED AND PRINTED rather than quietly dropped.
     */
    const declared = el.constructor?.properties ?? {};
    if (typeof el.show !== 'function' && !('open' in declared)) {
      return { skip: 'no public open API — opens by user interaction only', uncovered: true };
    }

    let probe = document.getElementById('__esa-probe');
    if (!probe) {
      probe = document.createElement('button');
      probe.id = '__esa-probe';
      probe.textContent = 'probe';
      document.body.prepend(probe);
    }
    probe.focus();
    if (deep() !== probe) return { skip: 'probe could not take focus' };

    try {
      if (typeof el.show === 'function') el.show();
      else el.open = true;
    } catch (e) {
      return { skip: `open threw: ${e.message}` };
    }
    await frame();
    if (!el.open) return { skip: 'did not open' };

    const findings = [];
    const inOverlay = (n) => n && (el.contains(n) || el.shadowRoot?.contains(n));

    // MODALS ONLY. A non-modal overlay that grabbed focus on open would be the bug —
    // a popover annotating a field must not yank the caret out of it. Menus are the
    // exception among non-modals (they do take focus), but only when opened through
    // their trigger, which this probe deliberately does not simulate.
    if (isModal && !inOverlay(deep())) findings.push('focus-entered');

    if (isModal) {
      // The probe is background content. If it can still take focus, the dialog is not
      // modal — which is what `show()` rather than `showModal()` would give you, and it
      // looks identical on screen.
      probe.focus();
      if (deep() === probe) findings.push('background-not-blocked');

      // THE REGRESSION GUARD. Every live region must have come with the user into the
      // top layer; one left behind on <body> is one nobody will ever hear.
      // Only a region CARRYING TEXT is a finding. The regions are re-homed by
      // `announce()` itself, not on dialog open, so an empty one resting on <body>
      // between announcements is correct — it will move before its next mutation.
      // Flagging those made the check fire on a state that harms nobody.
      const stranded = flat().filter(
        (n) => n.hasAttribute?.('data-esa-announcer') && n.textContent.trim() && !inOverlay(n),
      );
      if (stranded.length) findings.push('announcer-stranded');
    }

    return { findings, opened: true, hadRegions: flat().some((n) => n.hasAttribute?.('data-esa-announcer')) };
  }, [tag, isModal]);

const main = async () => {
  const { origin, routes, server } = await bootSite({ dist: DIST, url, filter });
  const { chromium } = await import('playwright').then((m) => m.default ?? m);
  const browser = await chromium.launch();
  const ctx = await browser.newContext();

  const byRule = new Map();
  const record = (rule, where) => {
    if (!byRule.has(rule)) byRule.set(rule, []);
    byRule.get(rule).push(where);
  };
  let opened = 0;
  let hydrationFailed = 0;
  const uncovered = new Set();

  for (const route of routes) {
    const page = await ctx.newPage();
    try {
      await page.goto(origin + route, { waitUntil: 'load' });
      const up = await page.evaluate(AWAIT_UPGRADE);
      if (up.notUpgraded.length) {
        hydrationFailed++;
        record('HYDRATION FAILURE', `${route} — ${up.notUpgraded.join(', ')}`);
        continue;
      }

      for (const tag of [...MODAL_TAGS, ...NON_MODAL_TAGS]) {
        const isModal = MODAL_TAGS.includes(tag);
        const r = await PROBE(page, tag, isModal);
        if (r.uncovered) uncovered.add(tag);
        if (r.skip) continue;
        opened++;
        for (const f of r.findings) record(f, `${route} — <${tag}>`);

        // Esc must close it, and focus must come back to where it started.
        //
        // POLL, do not sleep once. `esa-side-dialog` stays mounted through a slide-out
        // and only calls the native close() when the animation ends — which is also
        // what restores focus. A fixed 120ms wait reported focus-not-restored against
        // it twice, measuring the animation rather than the behaviour.
        await page.keyboard.press('Escape');
        // Wait for FOCUS to settle, not for `open` to flip. `esa-side-dialog` sets
        // open=false immediately and stays mounted through a 200ms+ slide-out, calling
        // the native close() — which is what restores focus — only at the end. Polling
        // `open` and then sampling 80ms later measured the animation and reported
        // focus-not-restored against a component that restores focus correctly.
        await page.waitForFunction(
          (t) => {
            const el = document.querySelector(t);
            if (el?.open) return false;
            let a = document.activeElement;
            while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
            return a?.id === '__esa-probe';
          },
          tag,
          { timeout: 2000 },
        ).catch(() => {});
        const after = await page.evaluate((tag) => {
          const deep = () => {
            let e = document.activeElement;
            while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement;
            return e;
          };
          const el = document.querySelector(tag);
          const probe = document.getElementById('__esa-probe');
          return {
            stillOpen: !!el?.open,
            // <body> is the "nothing focused" resting state a headless Tab wrap lands
            // on; it is not the same as being stranded, so only a MISS on the probe
            // while something else holds focus is reported.
            //
            // THE OVERLAY'S OWN TRIGGER COUNTS AS RESTORED, and it has to. This audit
            // opens via the public `open` property, so focus was on the probe and NEVER
            // on the trigger — while a menu button correctly returns focus to its
            // trigger on close. Asserting the probe alone reported focus-not-restored
            // against esa-dropdown-menu doing exactly the right thing (verified by
            // hand: click trigger, Esc, focus lands back on "Actions ▾"). The panel is
            // unmounted by now, so "inside the component" can only mean the trigger.
            restored: deep() === probe || (!!el && !!deep() && el.contains(deep())),
            focusedTag: deep()?.id || deep()?.tagName,
          };
        }, tag);
        if (after.stillOpen) record('esc-does-not-close', `${route} — <${tag}>`);
        else if (!after.restored) {
          record('focus-not-restored', `${route} — <${tag}> → ${after.focusedTag}`);
        }
      }
    } catch (e) {
      record('error', `${route} — ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server?.close();

  console.log(
    `\noverlay focus — ${routes.length} page(s), ${opened} overlay instance(s) opened`,
  );
  if (uncovered.size) {
    // Stated out loud rather than silently narrowed: a reader who cannot see what was
    // skipped will read the finding count as coverage.
    console.log(
      `\n  NOT COVERED — ${[...uncovered].sort().join(', ')}\n` +
        '  These have no public open API (state is a private `_open`), so this tool cannot\n' +
        '  open them without simulating their trigger. Their focus behaviour is unaudited here.',
    );
  }
  if (hydrationFailed) {
    console.log(
      `\n  ${hydrationFailed} page(s) never upgraded. THE NUMBERS ABOVE ARE VOID for those —\n` +
        '  an un-upgraded custom element has no shadow root and no overlay to open.',
    );
  }
  if (opened === 0) {
    console.log('\n  No overlay was opened on any route. That is a broken audit, not a clean one.');
    process.exit(1);
  }
  for (const [rule, where] of byRule) {
    console.log(`\n${rule} — ${where.length} finding(s)`);
    for (const w of where.slice(0, 8)) console.log(`  ${w}`);
    if (where.length > 8) console.log(`  …and ${where.length - 8} more`);
  }
  const total = [...byRule.values()].reduce((n, a) => n + a.length, 0);
  console.log(`\n${total} finding(s).`);
  console.log(
    '\nProves the mechanism only: that focus lands where it should, that the background\n' +
      'is blocked, and that no live region was left outside the top layer. It cannot prove\n' +
      'a screen reader enters dialog mode or that anything is actually spoken.',
  );
  if (strict && total > 0) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
