// Load a rendered prototype URL in headless Chrome and extract everything a
// handoff needs, using the Chrome DevTools Protocol (CDP) rather than parsing
// Astro internals:
//   - CSS.startRuleUsageTracking / stop  → exactly which CSS rules the page
//     matched (Chrome's "Coverage"), so we ship only used styles.
//   - getComputedStyle(:root)            → resolve every referenced token to its
//     final value for the active theme.
//   - DOM walk                           → de-scoped, section-tagged markup.
import { chromium } from 'playwright';
import { descopeCss } from './descope.mjs';

// A rule whose selector is purely `:root` / `[data-theme=...]` is a token
// DEFINITION block (the primitive→semantic ramps). We drop these and synthesize
// a minimal, flattened token block from resolved values instead — keeping the
// full ramp would defeat tree-shaking, since `:root` always "matches".
function isTokenDefSelector(selector) {
  return selector
    .split(',')
    .every((part) => /^\s*(:root|\[data-theme[^\]]*\]|html)\s*$/.test(part));
}

// Split flat CSS into { selector, body, text } rules. Safe because Ecology's
// component CSS has no at-rules; any @media/@keyframes are passed through whole.
export function splitRules(css) {
  const rules = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].trim();
    if (selector.startsWith('@')) continue; // guard: skip at-rule headers
    rules.push({ selector, body: m[2].trim(), text: m[0].trim() });
  }
  return rules;
}

export async function capture(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);

  await client.send('DOM.enable');
  await client.send('CSS.enable');
  await client.send('CSS.startRuleUsageTracking');
  await page.goto(url, { waitUntil: 'networkidle' });
  const { ruleUsage } = await client.send('CSS.stopRuleUsageTracking');

  // Reconstruct used CSS from the matched byte ranges, de-scoped + de-duped.
  const sheetText = new Map();
  for (const r of ruleUsage) {
    if (!r.used || sheetText.has(r.styleSheetId)) continue;
    const { text } = await client.send('CSS.getStyleSheetText', {
      styleSheetId: r.styleSheetId,
    });
    sheetText.set(r.styleSheetId, text);
  }
  const originalBytes = [...sheetText.values()].reduce((n, t) => n + t.length, 0);

  const seen = new Set();
  const componentRules = [];
  for (const r of ruleUsage) {
    if (!r.used) continue;
    const key = `${r.styleSheetId}:${r.startOffset}:${r.endOffset}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = descopeCss(sheetText.get(r.styleSheetId).slice(r.startOffset, r.endOffset));
    for (const rule of splitRules(raw)) {
      if (!isTokenDefSelector(rule.selector)) componentRules.push(rule);
    }
  }
  const componentCss = componentRules.map((r) => r.text).join('\n');

  // Every token the surviving CSS references → resolved value at :root.
  const tokenNames = [
    ...new Set([...componentCss.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])),
  ].sort();

  // Tag top-level body sections, strip Astro attrs, then read back the clean
  // markup + per-section subtrees + resolved token values in one in-page pass.
  const captured = await page.evaluate(
    ({ names }) => {
      // Real page sections only — skip injected/dev chrome so the manifest is
      // clean whether captured from `astro dev` or a production `preview` build.
      const IGNORE = /^(SCRIPT|STYLE|LINK|ASTRO-DEV-TOOLBAR|ASTRO-ISLAND)$/;
      const kids = [...document.body.children].filter((el) => !IGNORE.test(el.tagName));
      // Name each section by, in order: an explicit aria-label, its structural
      // landmark role (nav/header/footer/main/aside), a real heading (h1–h3,
      // NOT nav-column heads), or a humanized component class — then the tag.
      const LANDMARK = { NAV: 'Nav', HEADER: 'Header', FOOTER: 'Footer', MAIN: 'Main', ASIDE: 'Aside' };
      const LAYOUT = /^(cbf|esa)-(container|grid|row|col|stack|cluster|wrap)/;
      const sections = kids.map((el, index) => {
        el.setAttribute('data-handoff-section', String(index));
        const heading = el.querySelector('h1,h2,h3')?.textContent?.trim();
        const compClass = [...el.classList, ...[...el.querySelectorAll('[class]')].flatMap((c) => [...c.classList])]
          .find((c) => /^(cbf|esa)-[a-z-]+$/.test(c) && !LAYOUT.test(c));
        const humanized = compClass &&
          compClass.replace(/^(cbf|esa)-/, '').replace(/-/g, ' ').replace(/^\w/, (m) => m.toUpperCase());
        const label =
          el.getAttribute('aria-label') ||
          LANDMARK[el.tagName] ||
          heading ||
          humanized ||
          el.tagName.toLowerCase();
        return { index, tag: el.tagName.toLowerCase(), className: el.className, label };
      });
      // Remove Astro's scoping attributes from the live DOM. Inlined (not eval'd)
      // so this runs as ordinary page code over our own document.
      for (const el of document.querySelectorAll('*')) {
        for (const attr of [...el.attributes]) {
          if (attr.name.startsWith('data-astro-cid') || attr.name === 'data-handoff-section')
            el.removeAttribute(attr.name);
        }
      }
      const rootCs = getComputedStyle(document.documentElement);
      const values = Object.fromEntries(
        names.map((n) => [n, rootCs.getPropertyValue(n).trim()])
      );
      // Resolve each token AGAINST EACH SECTION'S OWN ELEMENT too — component
      // tokens like --app-bar-gap are defined on the component, not :root, so
      // they read empty at the root but resolve correctly on the section node.
      const sectionTokenValues = kids.map((el) => {
        const cs = getComputedStyle(el);
        return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]));
      });
      // Re-read each section's now-clean outerHTML (same filtered set).
      const sectionHtml = kids.map((el) => el.outerHTML);
      return {
        title: document.title,
        fontLinks: [...document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]')]
          .filter((l) => /fonts\.googleapis|fonts\.gstatic/.test(l.href))
          .map((l) => l.outerHTML),
        themeAttr: document.documentElement.getAttribute('data-theme') || null,
        bodyHtml: sectionHtml.join('\n'),
        sections: sections.map((s, i) => ({ ...s, html: sectionHtml[i] })),
        tokenValues: values,
        sectionTokenValues,
      };
    },
    { names: tokenNames }
  );

  await browser.close();

  // Partition CSS per section by class membership (for the overlay/manifest).
  for (const s of captured.sections) {
    const classes = new Set(
      [...s.html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))
    );
    const rules = componentRules.filter((r) =>
      [...classes].some((c) => c && r.selector.includes('.' + c))
    );
    s.css = rules.map((r) => r.text).join('\n');
    s.tokens = [
      ...new Set([...s.css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])),
    ].sort();
    // Prefer the value resolved on the section element; fall back to :root.
    const local = captured.sectionTokenValues[s.index] || {};
    s.tokenValues = Object.fromEntries(
      s.tokens.map((n) => [n, local[n] || captured.tokenValues[n] || ''])
    );
  }

  return {
    url,
    title: captured.title,
    themeAttr: captured.themeAttr,
    fontLinks: captured.fontLinks,
    bodyHtml: captured.bodyHtml,
    componentCss,
    tokenNames,
    tokenValues: captured.tokenValues,
    sections: captured.sections,
    stats: {
      rulesMatched: componentRules.length,
      originalBytes,
      tokensReferenced: tokenNames.length,
    },
  };
}
