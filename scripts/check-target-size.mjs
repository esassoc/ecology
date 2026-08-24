#!/usr/bin/env node
/**
 * check-target-size.mjs — WCAG 2.2 SC 2.5.8 (AA) target size, MEASURED.
 *
 * WHAT THIS ADDS OVER axe, WHICH DOES HAVE A target-size RULE
 *
 * Say this plainly, because the obvious assumption is wrong and was written into this
 * header until it was actually measured: **axe-core 4.13 ships a `target-size` rule,
 * it is in the `wcag22aa` tag this repo already runs, and it sees into shadow roots.**
 * `npm run a11y` is not blind here.
 *
 * The difference is the SPACING EXCEPTION. SC 2.5.8 lets an undersized target pass if
 * a 24px-diameter circle centred on it does not overlap the circle of any neighbour —
 * and axe implements that faithfully. Measured on the pages where this tool reports
 * real sub-24px controls (esa-pill's 16x16 remove, esa-input-tag's 16x16 toggle), axe
 * returns 0 violations and 0 incomplete: those targets are small but well spaced, so
 * they CONFORM.
 *
 * So the two answer different questions, and both are worth asking:
 *
 *   axe:       does this conform to 2.5.8, exceptions included?
 *   this tool: how big is the target, actually?
 *
 * The assurance profile deliberately holds the stricter line. Conforming *via* the
 * spacing exception means conformance is a property of the LAYOUT, not the component:
 * move a button nearer its neighbour, or let a container get narrower, and a passing
 * page silently starts failing with no code change. A component that is 24px on its
 * own cannot regress that way. It is also the difference between "legally defensible"
 * and "comfortable to hit", which is the point of opting into a profile at all.
 *
 * Consequence to be honest about: **this tool over-reports against the letter of the
 * spec.** A finding here is a measurement, not a proven violation — the header line
 * says so, and `--scope`/`--strict` are what decide whether anyone is blocked by it.
 *
 * WHY IT CANNOT BE A STATIC CHECK
 *
 * It cannot be a source-text rule the way `check-a11y.mjs`'s nine checks are: those
 * work because the defect is visible in the text of a file, and this one is not. Since
 * the height ramps were deleted, a control's height is EMERGENT — 2 x padding-y +
 * font-size + border, where the font size is a clamp() that depends on viewport width.
 * There is no number in any file to grep for.
 *
 * So this walks the FLATTENED tree (shadow roots included, post-upgrade) of every
 * built page, finds what is actually interactive, and reads getBoundingClientRect().
 *
 * Usage:
 *   node scripts/check-target-size.mjs                       # report, exit 0
 *   node scripts/check-target-size.mjs --assurance wcag-aa   # set the attribute first
 *   node scripts/check-target-size.mjs --strict              # exit 1 on any failure
 *   node scripts/check-target-size.mjs --min 44              # audit against AAA (2.5.5)
 *   node scripts/check-target-size.mjs --url http://localhost:4322
 *
 * REPORTS BY DEFAULT, like a11y-audit. The hub has known failures; a gate that
 * blocks from day one just gets bypassed. `--strict` is what a11y:assured runs.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bootSite, AWAIT_UPGRADE } from './lib/site-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/site/dist');

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : (argv[i + 1] ?? ''); };
const strict = argv.includes('--strict');
const assurance = flag('--assurance');
const baseUrl = flag('--url');
const filter = flag('--filter');
const MIN = Number(flag('--min') || 24);
const emitFloors = flag('--emit-floors');

/*
 * --scope components  gates on the esa-* KIT only; --scope all (default) gates on
 * everything the specimen site renders.
 *
 * The split is real, not a convenience. apps/site is the hub's own documentation —
 * its prose links and the <details>/<summary> rows on the debug pages are page
 * chrome this package does not ship to anyone. A spoke installs @esa/ecology and
 * inherits the components; it does not inherit this site. Mixing the two means
 * a11y:assured can never go green on a finding no spoke will ever see, and a gate
 * that cannot go green gets bypassed.
 *
 * It is a FLAG rather than a silent carve-out so the assertion is visible in
 * package.json and in the output. Reporting always covers everything; only the
 * exit code narrows, and the run says which it used.
 */
const scope = flag('--scope') || 'all';
if (!['all', 'components'].includes(scope)) {
  console.error(`--scope must be "all" or "components" (got "${scope}")`);
  process.exit(1);
}
const isComponent = (f) => f.component.startsWith('esa-');

/*
 * THE MEASUREMENT, and the four exemptions that keep it honest.
 *
 * SC 2.5.8 exempts a target when: it is INLINE in a sentence (a link in running
 * text — its size is decided by the text, not the author); an EQUIVALENT control of
 * adequate size exists elsewhere on the page; the size is UA-DETERMINED and
 * unmodified; or the presentation is ESSENTIAL. Only the first and third are
 * decidable from the DOM, so those two are applied here and the others are not
 * guessed at — a finding this script reports is a real measurement, and a human
 * decides whether an exemption applies.
 *
 * DISABLED CONTROLS ARE SKIPPED. 2.5.8 applies to targets a user can activate; a
 * disabled button is not one, exactly as 1.4.3 exempts it from contrast.
 *
 * HIDDEN ELEMENTS ARE SKIPPED, and this matters more than it sounds: the kit is full
 * of popovers, dialogs and dropdown panels that exist in the DOM at zero size until
 * opened. Measuring those would produce a flood of 0x0 findings that are not defects
 * and would bury the real ones. A closed dropdown's items are unreported here — the
 * cost of that is real and is stated in the output, not hidden.
 */
const MEASURE = `((minSize) => {
  const SELECTOR = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]),' +
    ' [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"],' +
    ' [role="tab"], [role="menuitem"], [role="option"]';

  // Walk into shadow roots — half the kit lives there and a plain querySelectorAll
  // stops at the boundary, which would silently exempt every Lit component.
  const all = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.matches(SELECTOR)) all.push(el);
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(document);

  const findings = [];
  let skippedHidden = 0, skippedInline = 0, skippedDisabled = 0, checked = 0;

  for (const el of all) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') { skippedDisabled++; continue; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { skippedHidden++; continue; }
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') { skippedHidden++; continue; }

    // Inline exemption: an inline-level link whose parent holds real text around it.
    if (el.tagName === 'A' && cs.display.startsWith('inline')) {
      const parentText = (el.parentElement?.textContent ?? '').trim();
      const ownText = (el.textContent ?? '').trim();
      if (parentText.length > ownText.length + 12) { skippedInline++; continue; }
    }

    // MEASURE THE LABEL ROW, NOT THE GLYPH. A custom checkbox/radio/switch exposes a
    // 14-20px span as the ARIA widget, but the thing a pointer can hit is the <label>
    // wrapping it — which is the pattern forms.md requires precisely so the target is
    // bigger than the glyph. Measuring the widget reported esa-checkbox and
    // esa-radio-group as failures while the row was already 24px+, i.e. reporting the
    // correct implementation as the defect. closest() stops at the shadow boundary,
    // so this only ever finds a label in the element's own root.
    const label = el.closest?.('label');
    const target = label && label !== el ? label.getBoundingClientRect() : r;

    checked++;
    const w = Math.round(target.width * 10) / 10, h = Math.round(target.height * 10) / 10;
    if (w < minSize || h < minSize) {
      // Name it by the nearest custom element, which is what a reader has to go fix,
      // and capture that element's SIZE STEP. The step is what makes this actionable
      // rather than merely true: a finding on esa-chip-group at xs is something an
      // author can change (use sm); a finding with no size attribute is a component
      // defect they cannot route around. check-size-usage.mjs splits on exactly that.
      let host = el, tag = el.tagName.toLowerCase(), size = '';
      while (host) {
        if (host.tagName && host.tagName.includes('-')) {
          tag = host.tagName.toLowerCase();
          size = host.getAttribute('size') || '';
          break;
        }
        host = host.parentElement ?? host.getRootNode()?.host ?? null;
      }
      findings.push({
        component: tag,
        size,
        el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
        w, h,
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  return { findings, checked, skippedHidden, skippedInline, skippedDisabled };
})(${MIN})`;

async function main() {
  const { chromium } = await import('playwright');
  let boot;
  try {
    boot = await bootSite({ dist: DIST, url: baseUrl, filter });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const { origin, routes, server } = boot;
  if (!routes.length) { console.error('No routes matched.'); process.exit(1); }

  console.log(`Target size: minimum ${MIN}x${MIN} CSS px (WCAG 2.2 SC ${MIN >= 44 ? '2.5.5 AAA' : '2.5.8 AA'})`);
  console.log(`RAW SIZE, no spacing exception — a finding is a measurement, not a proven`);
  console.log(`violation. axe's target-size rule applies the exception; npm run a11y has it.`);
  if (assurance) console.log(`Assurance profile: ${assurance} — set on <html> before measuring.`);
  console.log(`${routes.length} route(s)\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const byComponent = new Map();
  let checked = 0, hidden = 0, deadPages = 0;
  const dead = [];

  for (const route of routes) {
    await page.goto(origin + route, { waitUntil: 'load' });
    // Set the attribute BEFORE waiting for layout, so the measured geometry is the
    // profile's. Setting it after would measure the default and report a pass the
    // profile did not earn.
    if (assurance) await page.evaluate((a) => document.documentElement.setAttribute('data-a11y-assurance', a), assurance);
    const up = await page.evaluate(AWAIT_UPGRADE);
    if (up.notUpgraded.length) {
      deadPages++;
      // Name the tag and the route. "3 pages failed" sends a reader hunting; the
      // cause is nearly always one module that threw at runtime, and the tag says
      // which one.
      dead.push(`${route} — ${up.notUpgraded.join(', ')}`);
    }

    const res = await page.evaluate(MEASURE);
    checked += res.checked;
    hidden += res.skippedHidden;
    for (const f of res.findings) {
      const key = `${f.component} ${f.el} ${f.w}x${f.h}`;
      if (!byComponent.has(key)) byComponent.set(key, { ...f, routes: [] });
      byComponent.get(key).routes.push(route);
    }
  }

  await browser.close();
  server?.close();

  // A page that never hydrated measured a shell, not components. Say so loudly —
  // this is the same guard a11y-audit carries, and for the same reason.
  if (deadPages) {
    console.log(`⚠️  HYDRATION FAILURE on ${deadPages} page(s) — the numbers below are NOT valid.`);
    for (const d of dead) console.log(`      ${d}`);
    console.log('');
  }

  const findings = [...byComponent.values()].sort((a, b) => a.w * a.h - b.w * b.h);
  if (!findings.length) {
    console.log(`✓ ${checked} interactive targets measured, all >= ${MIN}x${MIN}.`);
  } else {
    const grouped = new Map();
    for (const f of findings) {
      if (!grouped.has(f.component)) grouped.set(f.component, []);
      grouped.get(f.component).push(f);
    }
    for (const [component, list] of grouped) {
      console.log(`${component}  (${list.length})`);
      for (const f of list) {
        console.log(`   ${String(f.w).padStart(6)} x ${String(f.h).padEnd(6)} ${f.el}${f.label ? `  "${f.label}"` : ''}`);
        console.log(`          ${f.routes.length} page(s), e.g. ${f.routes[0]}`);
      }
    }
    const kit = findings.filter(isComponent);
    console.log(`\n${findings.length} distinct target(s) under ${MIN}x${MIN}, out of ${checked} measured.`);
    console.log(`  ${kit.length} in esa-* components · ${findings.length - kit.length} in this site's own page chrome.`);
  }

  // Never let a silent skip read as coverage.
  console.log(`\n${hidden} target(s) were skipped as zero-size or hidden — closed popovers,`);
  console.log(`dialogs and dropdown panels are NOT measured by this tool. Open them by hand.`);

  /*
   * --emit-floors writes the COMMITTED map that check-size-usage.mjs lints against.
   *
   * Why a committed artifact rather than a live measurement: a spoke has the
   * components (via node_modules) but no built copy of this specimen site, so it
   * cannot render the gallery to find out which steps are too small. The hub
   * measures once and ships the answer, exactly as token-names.json ships the
   * baseline the rename guard reads.
   *
   * Only findings that CARRY A SIZE STEP go in. A finding with no size attribute is
   * a component defect — an author cannot route around esa-pill's 16x16 remove
   * button by picking a different size, because it has none — so listing it here
   * would produce a lint nobody can act on.
   */
  if (emitFloors) {
    const map = {};
    for (const f of findings.filter(isComponent)) {
      if (!f.size) continue;
      (map[f.component] ??= new Set()).add(f.size);
    }
    const ORDER = ['xs', 'sm', 'md', 'lg'];
    const out = {
      $comment:
        'GENERATED by scripts/check-target-size.mjs --emit-floors. Component/size pairs that ' +
        'render under the profile minimum, measured in a real browser. Do not hand-edit — ' +
        're-run the measurement. Components with no size prop are deliberately absent: a size ' +
        'lint cannot help where there is no size to change.',
      $profile: assurance ?? 'none',
      $minSize: MIN,
      $measured: `${checked} targets across ${routes.length} routes`,
      components: Object.fromEntries(
        Object.entries(map)
          .sort()
          .map(([k, v]) => [k, [...v].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))]),
      ),
    };
    // Never write the committed map from a run that measured a pre-hydration
    // shell. check-size-usage.mjs reads `floors.components ?? {}`, so an empty
    // map makes it iterate nothing and report "no call sites below the floor" —
    // a green lint built on a measurement that did not happen.
    if (deadPages) {
      console.log(
        `\n✗ NOT writing ${emitFloors} — ${deadPages} page(s) never upgraded, so the ` +
          `measurement is invalid. Fix the build (usually its base path) and re-run.`,
      );
    } else {
      writeFileSync(emitFloors, JSON.stringify(out, null, 2) + '\n');
      const n = Object.keys(out.components).length;
      console.log(`\n✓ floor map written → ${emitFloors} (${n} component(s) with an unusable size step)`);
    }
  }

  const gated = scope === 'components' ? findings.filter(isComponent) : findings;
  if (strict) {
    console.log(`\nGating on --scope ${scope}: ${gated.length} blocking finding(s).`);
  }
  if (deadPages || (strict && gated.length)) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
