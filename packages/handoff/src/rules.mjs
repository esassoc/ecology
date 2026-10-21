// Deterministic rule selection. Every capture path (curated and whole-page) reads
// EVERY rule of every stylesheet the page loaded, then keeps the ones whose selector
// names a class present in the captured markup.
//
// It used to be Chrome's rule-usage coverage, which answers "what did this render
// exercise": a function of paint timing, not of the page. The same route captured
// twice on one machine emitted different bundles, and a slower machine disagreed
// with a faster one on the same commit (Beacon ledger, 2026-08-06). Enumerating is a
// pure function of the markup, and it keeps :hover / :focus rules the renderer never
// exercised, which a handoff wants.

// Astro scopes component styles with `[data-astro-cid-x]` on both selector and
// element. Strip it from the CSS side; the DOM side is stripped in-page.
export const descopeCss = (css) =>
  css.replace(/:where\(\[data-astro-cid-[\w-]+\]\)/g, '').replace(/\[data-astro-cid-[\w-]+\]/g, '');

// A rule whose selector is purely `:root` / `[data-theme]` / `html` is a token
// DEFINITION block. Dropped: the specs carry resolved token values instead, and the
// full ramps would defeat the narrowing (`:root` always matches).
export const isTokenDefSelector = (selector) =>
  selector.split(',').every((p) => /^\s*(:root|\[data-theme[^\]]*\]|html)\s*$/.test(p));

// At-rules whose body is more rules. Their matches keep the wrapper, so a phone
// layout under `@media (max-width: …)` reaches the spec instead of vanishing.
const GROUPING = /^@(media|supports|container|layer|scope)\b/i;

/**
 * Split CSS into style rules, at-rule wrappers preserved.
 * @returns {{selector:string, body:string, text:string, wrap:string[]}[]}
 */
export function splitRules(css, wrap = []) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    const semi = src.indexOf(';', i);
    if (open === -1) break;
    // A statement at-rule (`@import …;`, `@layer a, b;`) ends before any block.
    if (semi !== -1 && semi < open && src.slice(i, semi).trim().startsWith('@')) {
      i = semi + 1;
      continue;
    }
    const prelude = src.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      j++;
    }
    const body = src.slice(open + 1, j - 1).trim();
    i = j;
    if (!prelude) continue;
    if (prelude.startsWith('@')) {
      if (GROUPING.test(prelude)) rules.push(...splitRules(body, [...wrap, prelude]));
      continue; // @keyframes, @font-face, @property: not section styles
    }
    const own = `${prelude} {\n${body}\n}`;
    const text = wrap.reduceRight((inner, at) => `${at} {\n${inner}\n}`, own);
    rules.push({ selector: prelude, body, text, wrap });
  }
  return rules;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The rules whose selector names one of `classes`. A class matches on a word
 * boundary: `.bcn-aboard` does not pull in every `.bcn-aboard__col` rule, which a
 * substring test did, roughly doubling the styles of any BEM block.
 */
export function rulesForClasses(rules, classes) {
  const names = [...classes].filter(Boolean);
  if (!names.length) return [];
  // Chunked: one alternation over thousands of classes is slow to compile.
  const res = [];
  for (let k = 0; k < names.length; k += 200)
    res.push(new RegExp(`\\.(?:${names.slice(k, k + 200).map(escapeRe).join('|')})(?![\\w-])`));
  return rules.filter((r) => res.some((re) => re.test(r.selector)));
}

/** Class names present in a chunk of markup. */
export const classesIn = (html) =>
  new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));

/** Custom properties a chunk of CSS reads. */
export const tokensRead = (css) => [...new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))].sort();

/**
 * Every style rule on the page, de-scoped, de-duplicated, token-definition blocks
 * dropped. `headers` is what CSS.styleSheetAdded reported for this navigation; its
 * ARRIVAL order is not stable (a web component adopts its sheet whenever it
 * upgrades), so sheets are ordered by a content-derived key. Within a sheet, rules
 * keep source order, which the cascade uses to break specificity ties.
 */
export async function allRules(client, headers) {
  const sheets = [];
  for (const h of headers) {
    let text;
    try {
      text = (await client.send('CSS.getStyleSheetText', { styleSheetId: h.styleSheetId })).text;
    } catch {
      continue; // detached between being announced and being read
    }
    if (text) sheets.push({ url: h.sourceURL || '', text });
  }
  sheets.sort((a, b) => a.url.localeCompare(b.url) || a.text.localeCompare(b.text));

  const seen = new Set();
  const rules = [];
  for (const { text } of sheets)
    for (const rule of splitRules(descopeCss(text))) {
      if (isTokenDefSelector(rule.selector) || seen.has(rule.text)) continue;
      seen.add(rule.text); // identical rule text is idempotent; the first wins
      rules.push(rule);
    }
  return rules;
}

/** Open a CDP session that records every stylesheet the page announces. */
export async function trackSheets(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const state = { client, headers: [] };
  client.on('CSS.styleSheetAdded', ({ header }) => state.headers.push(header));
  return state;
}
