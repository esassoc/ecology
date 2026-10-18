// Describing a picked element for design/feedback.jsonl: a stable selector,
// its text, its Astro source and its effective background.
const STATE_CLASS = /^(active|is-|has-|open|collapsed|selected|current|hover|focus|disabled|hidden)/;
function unique(sel: string, el: Element) {
  try { const all = document.querySelectorAll(sel); return all.length === 1 && all[0] === el; } catch { return false; }
}
export function selectorFor(el: Element): string {
  if (el.id && unique(`#${CSS.escape(el.id)}`, el)) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    if (cur !== el && cur.id && unique(`#${CSS.escape(cur.id)}`, cur)) { parts.unshift(`#${CSS.escape(cur.id)}`); break; }
    let part = cur.localName;
    const cls = [...cur.classList].filter((c) => !STATE_CLASS.test(c)).slice(0, 2);
    if (cls.length) part += cls.map((c) => `.${CSS.escape(c)}`).join('');
    const parent: Element | null = cur.parentElement;
    if (parent) {
      const name = cur.localName;
      const sibs = [...parent.children].filter((s) => s.localName === name);
      const twins = sibs.filter((s) => cls.every((c) => s.classList.contains(c)));
      if (twins.length > 1) part += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
    }
    parts.unshift(part);
    if (unique(parts.join(' > '), el)) break;
    cur = parent;
  }
  return parts.join(' > ');
}
export function snippet(el: Element) {
  const t = (el as HTMLElement).innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '';
  const s = t.replace(/\s+/g, ' ').trim();
  return s.length > 120 ? `${s.slice(0, 119)}…` : s;
}
// The nearest element Astro rendered: views the client re-renders keep only
// their server-rendered ancestors' source. The toolbar's audit app strips
// data-astro-source-* at startup, so the adapter (astro/integration.mjs) copies them to a map first.
export function source(el: Element) {
  const SOURCES = (window as unknown as { __designLayerSources?: WeakMap<Element, [string, string]> }).__designLayerSources;
  for (let cur: Element | null = el; cur; cur = cur?.parentElement ?? null) {
    const node: Element = cur;
    const a = SOURCES?.get(node);
    const file = a?.[0] ?? node.getAttribute('data-astro-source-file');
    if (!file) continue;
    const loc = a?.[1] ?? node.getAttribute('data-astro-source-loc') ?? '';
    const line = Number.parseInt(loc.split(':')[0], 10);
    return { sourceFile: file, sourceLine: Number.isFinite(line) ? line : null };
  }
  return { sourceFile: null, sourceLine: null };
}
export function effectiveBackground(el: Element) {
  for (let cur: Element | null = el; cur; cur = cur?.parentElement ?? null) {
    const bg = getComputedStyle(cur).backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return getComputedStyle(document.body).backgroundColor;
}
