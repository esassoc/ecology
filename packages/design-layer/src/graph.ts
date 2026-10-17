// Reverse lineage on the live page: which root variables resolve through a
// given one. The idea of the hub's apps/site/src/data/token-graph.ts, read from
// the page's own stylesheets instead of the token sources, so a spoke's theme
// and its scheme blocks are in it.
//
// Why it is needed: a custom property is substituted where it is declared.
// --color-background-brand: var(--color-teal-9) resolves at :root, so setting
// --color-teal-9 on .esa-card moves nothing inside the card. Re-declaring the
// dependents in the same scoped block (with their declared values) makes them
// resolve there, and the override reaches them.
import type { Mode } from './surfaces';
import type { VarMap } from './types';

const ROOTISH = /(^|[\s,(])(:root|html)(\b|[[:.)])|\[data-theme/;
const OWN = new Set(['design-layer-live', 'design-layer-tweaks', 'design-layer-stage-css']);
const cache: Partial<Record<Mode, Map<string, string>>> = {};

/** Forget the declarations (a stylesheet changed). */
export const invalidateGraph = () => { delete cache.light; delete cache.dark; };

/** Every variable declared on the root element in a mode, with its declared
    (unresolved) value; later rules win, as they would at equal specificity. */
function declarations(m: Mode): Map<string, string> {
  const hit = cache[m];
  if (hit) return hit;
  const html = document.documentElement;
  const probe = document.createElement('html');
  for (const a of html.attributes) probe.setAttribute(a.name, a.value);
  probe.setAttribute('data-scheme', m);
  const out = new Map<string, string>();
  const walk = (rules: CSSRuleList) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        if (!ROOTISH.test(r.selectorText)) continue;
        let applies = false;
        try { applies = probe.matches(r.selectorText.replace(/:root/g, 'html')); } catch { /* a selector a detached element cannot test */ }
        if (!applies) continue;
        for (let i = 0; i < r.style.length; i++) {
          const p = r.style[i];
          if (p.startsWith('--')) out.set(p, r.style.getPropertyValue(p).trim());
        }
      } else if (r instanceof CSSMediaRule) {
        if (matchMedia(r.conditionText).matches) walk(r.cssRules);
      } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
    }
  };
  for (const s of document.styleSheets) {
    const owner = s.ownerNode as Element | null;
    if (owner?.id && OWN.has(owner.id)) continue;
    try { walk(s.cssRules); } catch { /* a cross-origin sheet */ }
  }
  return (cache[m] = out);
}

const REF = /var\(\s*(--[\w-]+)/g;

/** The root variables that resolve through any of `vars`, transitively, with
    their declared values; the names in `vars` themselves are left out. */
export function dependents(vars: VarMap, m: Mode): VarMap {
  const moved = new Set(Object.keys(vars));
  if (!moved.size) return {};
  const decl = declarations(m);
  const out: VarMap = {};
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, raw] of decl) {
      if (moved.has(name)) continue;
      for (const ref of raw.matchAll(REF)) {
        if (!moved.has(ref[1])) continue;
        moved.add(name);
        out[name] = raw;
        grew = true;
        break;
      }
    }
  }
  return out;
}
