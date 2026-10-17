// What a picked element reads: the tokens its matched rules reference (with
// the property each one feeds), and its computed values. Read from the CSSOM,
// shadow roots included, so a Lit component's :host rules count.
import { kindOf, tierOf, type TokenKind } from './ui/tokens';

export interface TokenUse {
  name: string;
  /** The properties it feeds on this element: `color`, `padding-inline`. */
  props: string[];
  tier: 1 | 2 | 3;
  kind: TokenKind;
}

const REF = /var\(\s*(--[\w-]+)/g;
const OWN = new Set(['design-layer-live', 'design-layer-tweaks', 'design-layer-stage-css']);

function matchedRules(el: Element): CSSStyleRule[] {
  const out: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList, host: boolean) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        let sel = r.selectorText;
        if (host) {
          if (!sel.includes(':host')) continue;
          sel = sel.replace(/:host\(([^)]*)\)/g, '$1').replace(/:host/g, '*');
        }
        try { if (el.matches(sel)) out.push(r); } catch { /* a selector this element cannot test */ }
      } else if (r instanceof CSSMediaRule) {
        if (matchMedia(r.conditionText).matches) walk(r.cssRules, host);
      } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules, host);
    }
  };
  const sheets = (list: Iterable<CSSStyleSheet>, host: boolean) => {
    for (const s of list) {
      const owner = s.ownerNode as Element | null;
      if (owner?.id && OWN.has(owner.id)) continue;
      try { walk(s.cssRules, host); } catch { /* a cross-origin sheet */ }
    }
  };
  const rootNode = el.getRootNode();
  sheets(document.styleSheets, false);
  if (rootNode instanceof ShadowRoot) { sheets(rootNode.styleSheets, false); sheets(rootNode.adoptedStyleSheets, false); }
  if (el.shadowRoot) { sheets(el.shadowRoot.styleSheets, true); sheets(el.shadowRoot.adoptedStyleSheets, true); }
  return out;
}

/** A rule's declarations as written. Read from cssText, not the indexed
    longhands: `background: var(--_bg)` expands to longhands whose values read
    back empty while a var() is pending, so the indexed form loses the token. */
function declarations(css: string): [string, string][] {
  const out: [string, string][] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= css.length; i++) {
    const c = css[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if ((c === ';' && depth === 0) || i === css.length) {
      const d = css.slice(start, i);
      const colon = d.indexOf(':');
      if (colon > 0) out.push([d.slice(0, colon).trim(), d.slice(colon + 1).replace(/!important\s*$/, '').trim()]);
      start = i + 1;
    }
  }
  return out;
}

/** The public tokens the element's rules read, by the property each feeds. A
    private --_x in between (the kit's pattern) is followed to its property. */
export function tokensOn(el: Element): TokenUse[] {
  const priv = new Map<string, string[]>();
  const uses: [prop: string, refs: string[]][] = [];
  for (const r of matchedRules(el)) {
    for (const [p, value] of declarations(r.style.cssText)) {
      const refs = [...value.matchAll(REF)].map((m) => m[1]);
      if (!refs.length) continue;
      if (p.startsWith('--_')) priv.set(p, refs); else uses.push([p, refs]);
    }
  }
  const out = new Map<string, Set<string>>();
  const add = (prop: string, refs: string[], depth = 0) => {
    for (const ref of refs) {
      if (ref.startsWith('--_')) { if (depth < 4) add(prop, priv.get(ref) ?? [], depth + 1); continue; }
      (out.get(ref) ?? out.set(ref, new Set()).get(ref)!).add(prop);
    }
  };
  for (const [prop, refs] of uses) add(prop, refs);
  const cs = getComputedStyle(el);
  return [...out].map(([name, props]) => ({
    name, props: [...props].filter((p) => !p.startsWith('--')), tier: tierOf(name), kind: kindOf(name, cs.getPropertyValue(name).trim()),
  })).filter((t) => cs.getPropertyValue(t.name).trim());
}

export interface Computed {
  color: string; background: string; fontFamily: string; fontSize: number; fontWeight: number; lineHeight: string;
  padY: number; padX: number; radius: number; border: number; width: number; height: number;
}

export function computedOn(el: Element): Computed {
  const cs = getComputedStyle(el);
  const n = (v: string) => Math.round(Number.parseFloat(v) * 10) / 10 || 0;
  const r = el.getBoundingClientRect();
  return {
    color: cs.color, background: cs.backgroundColor, fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
    fontSize: n(cs.fontSize), fontWeight: n(cs.fontWeight), lineHeight: cs.lineHeight,
    padY: n(cs.paddingTop), padX: n(cs.paddingLeft), radius: n(cs.borderTopLeftRadius), border: n(cs.borderTopWidth),
    width: Math.round(r.width), height: Math.round(r.height),
  };
}
