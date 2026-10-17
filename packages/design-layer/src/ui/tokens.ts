// The page's tokens, read live: every custom property declared on :root,
// html or a [data-theme] scope in the page's stylesheets, with its resolved
// value and a kind, so a field can offer the tokens that fit it. Read from the
// page rather than a build artifact, so a spoke's own tokens are in the list.

export type TokenKind = 'color' | 'length' | 'weight' | 'font' | 'other';

export interface Token {
  name: string;
  value: string;
  kind: TokenKind;
  /** The family the name belongs to, for the picker's headings: "color / background". */
  group: string;
  /** The name inside its group: "brand-hover" under "color / background". */
  label: string;
  /** What the value resolves to here, for the picker's right column: "16px" for a clamp(). */
  display: string;
  /** 1 primitive, 2 semantic, 3 component, by the hub's naming. */
  tier: 1 | 2 | 3;
}

const ROOTISH = /(^|[\s,])(:root|html)(\b|[[:.])|\[data-theme/;
let cache: Token[] | null = null;

/** Forget the cached list (a stylesheet changed). */
export const invalidateTokens = () => { cache = null; };

function names(): Set<string> {
  const out = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        if (!ROOTISH.test(r.selectorText)) continue;
        for (let i = 0; i < r.style.length; i++) {
          const p = r.style[i];
          if (p.startsWith('--') && !p.startsWith('--_')) out.add(p);
        }
      } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
    }
  };
  for (const s of document.styleSheets) {
    try { walk(s.cssRules); } catch { /* a cross-origin sheet */ }
  }
  return out;
}

function kindOf(name: string, value: string): TokenKind {
  if (/font-family|family/.test(name)) return 'font';
  if (/weight/.test(name) && /^\d{3}$/.test(value)) return 'weight';
  if (/^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i.test(value) && CSS.supports('color', value)) return 'color';
  if (/^-?[\d.]+(px|rem|em)$|^(clamp|calc|min|max)\(/.test(value)) return 'length';
  return 'other';
}

const TIER2 = /^--(color|typography|radius|size|elevation|motion|layout|border|focus-scroll|target|touch)-/;
const TIER1 = /^--(color-[a-z]+(-dark)?(-a)?-\d+|spacing-\d+|font-size-\d+|font-weight-\d+|radius-\d+|font-family-[a-z-]+|line-height-\d+)$/;

/** The family a name belongs to (its first two words, or one for a short
    family) and the rest of the name, the way the picker heads and lists it. */
function split(name: string): { group: string; label: string } {
  const parts = name.slice(2).split('-');
  const two = ['color', 'typography', 'font', 'form', 'grid', 'sidenav', 'card', 'button'].includes(parts[0]) && parts.length > 2;
  const head = parts.slice(0, two ? 2 : 1);
  return { group: head.join(' / '), label: parts.slice(head.length).join('-') || parts.join('-') };
}

/** A length token as the px it computes to here (a clamp() reads at this viewport). */
function px(name: string): string {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;visibility:hidden;width:var(${name})`;
  document.body.append(probe);
  const w = Number.parseFloat(getComputedStyle(probe).width);
  probe.remove();
  return Number.isFinite(w) ? `${Math.round(w * 10) / 10}px` : '';
}

export function readTokens(): Token[] {
  if (cache) return cache;
  const cs = getComputedStyle(document.documentElement);
  cache = [...names()].sort().map((name) => {
    const value = cs.getPropertyValue(name).trim();
    const tier: Token['tier'] = TIER1.test(name) ? 1 : TIER2.test(name) ? 2 : 3;
    const kind = kindOf(name, value);
    const display = kind === 'length' && !/^-?[\d.]+px$/.test(value) ? px(name) : value;
    return { name, value, kind, ...split(name), display, tier };
  }).filter((t) => t.value);
  return cache;
}

/** The tokens a field of this kind can take, semantic before primitive. */
export function tokensFor(kind: TokenKind, prefer?: RegExp): Token[] {
  const all = readTokens().filter((t) => t.kind === kind);
  const rank = (t: Token) => (prefer?.test(t.name) ? 0 : 1) * 10 + (t.tier === 2 ? 0 : t.tier === 3 ? 1 : 2);
  return all.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The token a value is bound to, if it is exactly var(--name). */
export const boundToken = (v: string | undefined | null) => v?.match(/^var\((--[\w-]+)\)$/)?.[1] ?? null;

/** A token's name without the leading dashes, the way the chip and picker show it. */
export const shortName = (name: string) => name.replace(/^--/, '');
