// Capture a route's sections: markup, styles, tokens and a screenshot at two widths
// per section. One path for both kinds of route: an authored spec supplies the
// sections, and a route without one gets sections derived from its DOM first
// (deriveSections), then runs through exactly the same capture.
//
// A section reaches its state through `apply`, a serializable recipe (click / fill /
// clear / clickText / key) replayed after a fresh load. The same recipe ships in the
// manifest and drives the live app from the inspector. Sections sharing a recipe
// (most often: none) share one load.
import { chromium } from 'playwright';
import prettier from 'prettier';
import { allRules, trackSheets, rulesForClasses, tokensRead } from './rules.mjs';
import { READ_SECTION, DERIVE_SECTIONS } from './read-section.mjs';

export const launchBrowser = () => chromium.launch();

const fmt = async (src, parser) => {
  try {
    return (await prettier.format(src, { parser, printWidth: 100 })).trim();
  } catch {
    return src; // a formatting hiccup must never drop the capture
  }
};

// Replay a state recipe. The SAME op shapes run client-side in the inspector
// (runApplyDom), so a state is authored once and drives both.
async function runApply(page, ops) {
  for (const op of ops || []) {
    if (op.click) await page.click(op.click);
    else if (op.fill) await page.fill(op.fill[0], op.fill[1]);
    else if (op.clear) await page.fill(op.clear, '');
    else if (op.clickText) {
      // Optional third element is the ARIA role, default button. Segmented legos
      // (esa-button-toggle) render role="radio".
      const [sel, name, role = 'button'] = op.clickText;
      await page.locator(sel).getByRole(role, { name }).first().click();
    } else if (op.key) await page.keyboard.press(op.key);
    await page.waitForTimeout(80);
  }
}

// What a person sees of the section at this width: scrolled to its top and clipped
// to the viewport. An element screenshot grows the viewport to fit the element, and
// a layout sized to the viewport (columns to the floor) grows with it, so Beacon's
// board came out 5,309px tall.
async function shoot(page, selector, { screen = false } = {}) {
  const loc = page.locator(selector).first();
  const box = await loc
    .evaluate((el) => {
      // instant: a spoke's `scroll-behavior: smooth` would otherwise still be animating.
      el.scrollIntoView({ block: 'start', inline: 'start', behavior: 'instant' });
      let r = el.getBoundingClientRect();
      // A wrapper with no box of its own (display: contents, or a zero-height
      // host whose children are laid out elsewhere) is pictured by its children.
      if (r.width < 2 || r.height < 2) {
        const kids = [...el.querySelectorAll('*')].map((k) => k.getBoundingClientRect()).filter((k) => k.width > 1 && k.height > 1);
        if (!kids.length) return null;
        r = {
          left: Math.min(...kids.map((k) => k.left)),
          top: Math.min(...kids.map((k) => k.top)),
          right: Math.max(...kids.map((k) => k.right)),
          bottom: Math.max(...kids.map((k) => k.bottom)),
        };
      }
      return { x: r.left, y: r.top, right: r.right, bottom: r.bottom };
    })
    .catch(() => null);
  const vp = page.viewportSize();
  if (!box || !vp) return null;
  // The phone shot is the whole screen at the section: a desktop layout that keeps
  // its sidebar at 390px leaves the section itself a sliver at the edge.
  if (screen) return page.screenshot({ animations: 'disabled', caret: 'hide', timeout: 10_000 }).catch(() => null);
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const width = Math.min(box.right, vp.width) - x;
  const height = Math.min(box.bottom, vp.height) - y;
  if (width < 2 || height < 2) return null;
  return page.screenshot({ clip: { x, y, width, height }, animations: 'disabled', caret: 'hide', timeout: 10_000 }).catch(() => null);
}

/**
 * Sections for a route with no authored spec.
 * @returns {Promise<{label:string, selector:string}[]>}
 */
export async function deriveSections(browser, url, { prefixes, viewport }) {
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    return await page.evaluate(DERIVE_SECTIONS, { prefixes });
  } finally {
    await context.close();
  }
}

/**
 * @param {import('playwright').Browser} browser
 * @param {string} url  Local preview URL to load.
 * @param {{label:string, selector:string, apply?:object[]}[]} specSections
 * @param {{tierIndex:object, classifyTokens:Function, viewports:{desktop:object, phone:object}, libraryClasses?:string[]}} opts
 */
export async function captureSections(browser, url, specSections, { tierIndex, classifyTokens, viewports, libraryClasses = [] }) {
  const context = await browser.newContext({ viewport: viewports.desktop, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    const sheets = await trackSheets(page);
    const logs = [];
    const results = new Map();

    // One load per distinct recipe, in first-appearance order.
    const groups = new Map();
    for (const spec of specSections) {
      const key = JSON.stringify(spec.apply || []);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(spec);
    }

    let theme = null;
    for (const [, members] of groups) {
      sheets.headers = [];
      await page.setViewportSize(viewports.desktop);
      await page.goto(url, { waitUntil: 'networkidle' });
      try {
        await runApply(page, members[0].apply);
      } catch (err) {
        for (const s of members) logs.push(`  ! recipe failed, skipping "${s.label}": ${err.message.split('\n')[0]}`);
        continue;
      }
      // Settles the DOM the recipe drove. The captured CSS does not depend on this
      // landing in time (rules are enumerated, not sampled); only the markup does.
      await page.waitForTimeout(200);
      const rules = await allRules(sheets.client, sheets.headers);
      theme ??= await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

      const found = [];
      for (const spec of members) {
        const cap = await page.evaluate(READ_SECTION, { sel: spec.selector });
        if (!cap) {
          logs.push(`  ! selector not found, skipping "${spec.label}" (${spec.selector})`);
          continue;
        }
        // A wrapped library's own theme (AG Grid, Leaflet) is not the design; rules
        // reach the spec through the section's own classes only.
        const own = cap.classes.filter((c) => !libraryClasses.some((p) => c.startsWith(p)));
        const css = rulesForClasses(rules, own).map((r) => r.text).join('\n');
        const tokens = classifyTokens(tokensRead(css), cap.values, tierIndex).contract;
        const desktop = await shoot(page, spec.selector);
        found.push(spec);
        results.set(spec, {
          label: spec.label,
          selector: spec.selector,
          tag: cap.tag,
          html: await fmt(cap.html, 'html'),
          css: css ? await fmt(css, 'css') : '',
          tokens,
          classes: cap.classes,
          tags: cap.tags,
          stats: { fullBytes: cap.fullBytes, collapsed: cap.collapsed },
          shots: { desktop, phone: null },
        });
      }
      // Phone shots after every desktop read, so a resize cannot disturb a read.
      if (found.length) {
        await page.setViewportSize(viewports.phone);
        await page.waitForTimeout(250);
        for (const spec of found) results.get(spec).shots.phone = await shoot(page, spec.selector, { screen: true });
      }
    }

    const sections = specSections.filter((s) => results.has(s)).map((s) => results.get(s));
    for (const s of sections)
      logs.push(
        `  · ${s.label}: ${s.html.length}b html (${s.stats.collapsed} collapsed), ${s.tokens.length} tokens` +
          `${s.shots.desktop ? '' : ', no screenshot'}`
      );
    return { theme, sections, logs };
  } finally {
    await context.close();
  }
}
