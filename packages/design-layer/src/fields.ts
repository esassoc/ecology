// Which fields a selection offers, read off what the element is and what it is
// already styled with, never a fixed list. One table (RULES) says which
// properties each kind of element can take; `isSet` says which of those it
// actually uses. The panel shows the set ones (and every property a token
// feeds), the quick-edit popover the top four, and a section's plus adds the rest.

export type ElementKind = 'component' | 'text' | 'link' | 'box' | 'container' | 'icon' | 'image';
export type FieldKind = 'color' | 'length' | 'weight' | 'font' | 'shadow';

export interface FieldSpec {
  /** The CSS property the field writes (a longhand pair for padding). */
  prop: string;
  label: string;
  kind: FieldKind;
  /** The panel section it sits in. */
  group: 'sel-fill' | 'sel-text' | 'sel-type' | 'sel-spacing' | 'sel-radius' | 'sel-border' | 'sel-effects' | 'sel-size';
}

const F = (prop: string, label: string, kind: FieldKind, group: FieldSpec['group']): FieldSpec => ({ prop, label, kind, group });
export const SPECS: Record<string, FieldSpec> = {
  'color': F('color', 'Color', 'color', 'sel-text'),
  'font-family': F('font-family', 'Family', 'font', 'sel-type'),
  'font-size': F('font-size', 'Size', 'length', 'sel-type'),
  'font-weight': F('font-weight', 'Weight', 'weight', 'sel-type'),
  'line-height': F('line-height', 'Line Height', 'length', 'sel-type'),
  'letter-spacing': F('letter-spacing', 'Letter Spacing', 'length', 'sel-type'),
  'background-color': F('background-color', 'Fill', 'color', 'sel-fill'),
  'border-color': F('border-color', 'Border Color', 'color', 'sel-border'),
  'border-width': F('border-width', 'Border Width', 'length', 'sel-border'),
  'border-radius': F('border-radius', 'Radius', 'length', 'sel-radius'),
  'padding-block': F('padding-block', 'Padding Y', 'length', 'sel-spacing'),
  'padding-inline': F('padding-inline', 'Padding X', 'length', 'sel-spacing'),
  'gap': F('gap', 'Gap', 'length', 'sel-spacing'),
  'box-shadow': F('box-shadow', 'Shadow', 'shadow', 'sel-effects'),
  'width': F('width', 'Width', 'length', 'sel-size'),
  'height': F('height', 'Height', 'length', 'sel-size'),
};

/**
 * The rule table, in priority order within each kind: the order the
 * quick-edit popover takes its top four from. Written out in the README.
 */
export const RULES: Record<ElementKind, string[]> = {
  component: [],
  text: ['color', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing'],
  link: ['color', 'font-size', 'font-weight'],
  box: ['background-color', 'border-radius', 'padding-block', 'padding-inline', 'border-color', 'border-width', 'box-shadow'],
  container: ['gap', 'padding-block', 'padding-inline'],
  icon: ['color', 'width', 'height'],
  image: ['border-radius', 'width', 'height'],
};

const TEXT_TAGS = /^(H[1-6]|P|SPAN|A|LABEL|BUTTON|STRONG|EM|SMALL|LI|TD|TH|DT|DD|FIGCAPTION|LEGEND|SUMMARY|CODE)$/;
const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());

/** What an element is, most specific first; a button is a component, text and a box at once. */
export function kindsOf(el: Element, isComponent: boolean): ElementKind[] {
  const cs = getComputedStyle(el);
  const out: ElementKind[] = [];
  if (isComponent) out.push('component');
  if (el instanceof SVGElement || (el.querySelector(':scope > svg') && !ownText(el) && el.getBoundingClientRect().width <= 48)) out.push('icon');
  if (el instanceof HTMLImageElement || el instanceof HTMLPictureElement || el instanceof HTMLVideoElement) out.push('image');
  if (el instanceof HTMLAnchorElement && el.href) out.push('link');
  if (!out.includes('icon') && !out.includes('image') && (ownText(el) || (TEXT_TAGS.test(el.tagName) && el.textContent?.trim()))) out.push('text');
  const painted = !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || Number.parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
  if (painted || /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || isComponent) out.push('box');
  if (/flex|grid/.test(cs.display) && el.children.length > 1) out.push('container');
  return out;
}

const px = (v: string) => Number.parseFloat(v) || 0;

/** Whether the element actually uses a property: a value that is not the default (or the inherited one). */
export function isSet(el: Element, prop: string): boolean {
  const cs = getComputedStyle(el);
  const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
  const differs = (p: string) => !parent || cs.getPropertyValue(p) !== parent.getPropertyValue(p);
  switch (prop) {
    case 'color': return true;
    case 'font-size': case 'font-weight': return true;
    case 'font-family': return differs('font-family');
    case 'line-height': return cs.lineHeight !== 'normal' && differs('line-height');
    case 'letter-spacing': return cs.letterSpacing !== 'normal' && px(cs.letterSpacing) !== 0;
    case 'background-color': return !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
    case 'border-color': case 'border-width': return px(cs.borderTopWidth) > 0;
    case 'border-radius': return px(cs.borderTopLeftRadius) > 0;
    case 'padding-block': return px(cs.paddingTop) + px(cs.paddingBottom) > 0;
    case 'padding-inline': return px(cs.paddingLeft) + px(cs.paddingRight) > 0;
    case 'gap': return px(cs.rowGap) + px(cs.columnGap) > 0;
    case 'box-shadow': return cs.boxShadow !== 'none';
    case 'width': case 'height': return true;
    default: return false;
  }
}

/** The fields a token feeding this property claims; a shorthand claims every field it sets that fits the token's kind. */
export function specsFor(cssProp: string, kind: string): FieldSpec[] {
  if (cssProp === 'padding') return [SPECS['padding-block'], SPECS['padding-inline']];
  if (/^(border|outline)(-(top|right|bottom|left|block|inline))?$/.test(cssProp)) return [kind === 'color' ? SPECS['border-color'] : SPECS['border-width']];
  if (cssProp === 'font') return [kind === 'weight' ? SPECS['font-weight'] : kind === 'font' ? SPECS['font-family'] : SPECS['font-size']];
  const one = specFor(cssProp);
  return one ? [one] : [];
}

/** The field a longhand property maps onto. */
export function specFor(cssProp: string): FieldSpec | null {
  if (SPECS[cssProp]) return SPECS[cssProp];
  if (/^background$/.test(cssProp)) return SPECS['background-color'];
  if (/^padding-(top|bottom)$|^padding-block-/.test(cssProp)) return SPECS['padding-block'];
  if (/^padding-(left|right)$|^padding-inline-/.test(cssProp)) return SPECS['padding-inline'];
  if (/^(row-|column-)gap$/.test(cssProp)) return SPECS.gap;
  if (/radius/.test(cssProp)) return SPECS['border-radius'];
  if (/^border(-(top|right|bottom|left|block|inline))?-color$|^outline-color$/.test(cssProp)) return SPECS['border-color'];
  if (/^border(-(top|right|bottom|left|block|inline))?-width$/.test(cssProp)) return SPECS['border-width'];
  if (/^(inline-size|min-width)$/.test(cssProp)) return SPECS.width;
  if (/^(block-size|min-height)$/.test(cssProp)) return SPECS.height;
  if (cssProp === 'fill' || cssProp === 'stroke') return SPECS.color;
  return null;
}

/** The value a field shows for a property, read from computed style. */
export function readProp(el: Element, prop: string): string {
  const cs = getComputedStyle(el);
  switch (prop) {
    case 'padding-block': return cs.paddingTop;
    case 'padding-inline': return cs.paddingLeft;
    case 'border-width': return cs.borderTopWidth;
    case 'border-color': return cs.borderTopColor;
    case 'border-radius': return cs.borderTopLeftRadius;
    case 'gap': return cs.rowGap === 'normal' ? '0px' : cs.rowGap;
    case 'width': return `${el.getBoundingClientRect().width}px`;
    case 'height': return `${el.getBoundingClientRect().height}px`;
    case 'line-height': return cs.lineHeight === 'normal' ? `${Math.round(px(cs.fontSize) * 1.2)}px` : cs.lineHeight;
    case 'letter-spacing': return cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    default: return cs.getPropertyValue(prop);
  }
}

/** A link's hover colour from the page's own :hover rule, if it has one. */
export function hoverColor(el: Element): string | null {
  let found: string | null = null;
  const walk = (rules: CSSRuleList) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        if (!r.selectorText.includes(':hover') || !r.style.color) continue;
        const parts = r.selectorText.split(',').filter((s) => s.includes(':hover')).map((s) => s.replace(/:hover/g, '').trim());
        try { if (parts.some((s) => s && el.matches(s))) found = r.style.color; } catch { /* untestable selector */ }
      } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { /* cross-origin */ } }
  return found;
}

/**
 * The fields to offer, in order, each marked shown or addable. Properties a
 * token feeds come first within their kind; `added` holds the ones a plus added.
 */
export function fieldsFor(el: Element, kinds: ElementKind[], tokenProps: Set<string>, added: Set<string>) {
  const seen = new Set<string>();
  const out: { spec: FieldSpec; shown: boolean; token: boolean }[] = [];
  for (const k of kinds) {
    for (const p of RULES[k]) {
      if (seen.has(p)) continue;
      seen.add(p);
      const token = tokenProps.has(p);
      out.push({ spec: SPECS[p], token, shown: token || added.has(p) || isSet(el, p) });
    }
  }
  return out;
}
