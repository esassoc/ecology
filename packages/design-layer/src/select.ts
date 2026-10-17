// What a click on the page selects, Figma's way: the nearest component
// around the element (Cmd or Alt for the element itself), its ancestors as a
// breadcrumb, and the selectors a scoped edit writes to.
//
// A component is a custom element (its tag), or the root of an Astro
// component: the outermost element whose source file is that component's
// (data-astro-source-file, kept by the adapter before the toolbar strips it).
// Page and layout files are not components.
import { selectorFor } from './describe';

export interface ComponentInfo {
  /** `esa-card`, `bcn-filter-bar`: the tag, or the component file's name. */
  name: string;
  root: Element;
  /** What every instance shares: the tag, the class named for it, or the adapter's stamp. */
  selector: string;
  file: string | null;
}

const SKIP_TAGS = /^(astro-|design-layer-)/;
const STATE = /^(is-|has-|active|open|selected|current|disabled|hidden|typography-)/;
const BLOCK = /^[a-z][a-z0-9]*-[a-z0-9-]+$/;
const KIT = /^(esa|bcn)-/;

export function fileOf(el: Element): string | null {
  const map = (window as unknown as { __designLayerSources?: WeakMap<Element, [string, string]> }).__designLayerSources;
  return map?.get(el)?.[0] ?? el.getAttribute('data-astro-source-file');
}
const isComponentFile = (f: string) => !/\/(pages|layouts)\//.test(f);
const baseName = (f: string) => f.split('/').pop()!.replace(/\.(astro|tsx?|jsx?|svelte|vue)$/, '');

/** The element as a component root, or null when it is not one. */
export function asComponent(el: Element): ComponentInfo | null {
  if (el.localName.includes('-') && !SKIP_TAGS.test(el.localName)) {
    return { name: el.localName, root: el, selector: el.localName, file: null };
  }
  const file = fileOf(el);
  const stamp = el.getAttribute('data-dl-component');
  if (!stamp && (!file || !isComponentFile(file) || (el.parentElement && fileOf(el.parentElement) === file))) {
    // No source to go on (a component rendered from node_modules, or on the
    // client): a BEM block class is the component, `esa-*` and `bcn-*` always,
    // another prefix when its own elements or modifiers are there.
    const block = file && !isComponentFile(file) ? undefined : [...el.classList].find((c) => BLOCK.test(c) && !STATE.test(c)
      && (KIT.test(c) || el.classList.contains(`${c}--`) || [...el.classList].some((x) => x.startsWith(`${c}--`)) || !!el.querySelector(`[class*="${CSS.escape(c)}__"]`)));
    return block ? { name: block, root: el, selector: `.${CSS.escape(block)}`, file } : null;
  }
  const name = stamp ?? baseName(file!);
  const classes = [...el.classList];
  const own = classes.find((c) => c === name)
    ?? classes.find((c) => !c.includes('__') && !c.includes('--') && !STATE.test(c) && c.includes('-'));
  return { name, root: el, selector: own ? `.${CSS.escape(own)}` : `[data-dl-component="${name}"]`, file };
}

/** The nearest component at or around an element. */
export function componentOf(el: Element): ComponentInfo | null {
  for (let cur: Element | null = el; cur && cur !== document.body; cur = cur.parentElement) {
    const c = asComponent(cur);
    if (c) return c;
  }
  return null;
}

/** The components around an element, outermost first, not counting its own. */
export function ancestors(el: Element): ComponentInfo[] {
  const out: ComponentInfo[] = [];
  for (let cur = el.parentElement; cur && cur !== document.body; cur = cur.parentElement) {
    const c = asComponent(cur);
    if (c) out.unshift(c);
  }
  return out;
}

/** The first component inside an element (Figma's Enter: select children). */
export function firstChildComponent(el: Element): ComponentInfo | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const c = asComponent(n as Element);
    if (c) return c;
  }
  return null;
}

/** What a click selects: the nearest component, or with `deep` the element. */
export const candidate = (el: Element, deep: boolean) => (deep ? el : (componentOf(el)?.root ?? el));

export interface Selection {
  el: Element;
  /** The component the element is (or sits in); null for plain page markup. */
  component: ComponentInfo | null;
  /** A selector unique on this page, for instance scope. */
  instance: string;
  /** What the panel calls it. */
  name: string;
}

export function select(el: Element): Selection {
  const own = asComponent(el);
  const component = own ?? componentOf(el);
  const cls = [...el.classList].find((c) => !STATE.test(c));
  const name = own ? own.name : cls ? `.${cls}` : el.localName;
  return { el, component, instance: selectorFor(el), name };
}
