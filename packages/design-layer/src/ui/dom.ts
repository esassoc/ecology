// A small element builder and the kit's icons (inline Lucide paths, 24px grid,
// drawn at 16px with a 1.5 stroke, which is how Figma's sidebar icons sit).

type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** An inline SVG from an icon name. */
export function icon(name: keyof typeof ICONS): SVGSVGElement {
  const t = document.createElement('template');
  t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstElementChild as SVGSVGElement;
}

export const ICONS = {
  /** Apply or edit a token binding: a hexagon, Figma's variable glyph. */
  token: '<path d="M12 2.5 20.5 7.25v9.5L12 21.5 3.5 16.75v-9.5Z"/><circle cx="12" cy="12" r="2.5"/>',
  detach: '<path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="m5.17 11.75-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><path d="M8 2v3M2 8h3M16 22v-3M22 16h-3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  collapse: '<path d="m9 18 6-6-6-6"/>',
  expand: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  size: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  weight: '<path d="M6 12h8a4 4 0 0 1 0 8H6Z"/><path d="M6 4h7a4 4 0 0 1 0 8H6Z"/>',
  radius: '<path d="M4 20V10a6 6 0 0 1 6-6h10"/>',
  height: '<path d="M12 3v18"/><path d="m8 7 4-4 4 4"/><path d="m8 17 4 4 4-4"/>',
  padY: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7.5h10M7 16.5h10"/>',
  padX: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 7v10M16.5 7v10"/>',
  icon: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12h6M12 9v6"/>',
  hue: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18"/>',
  sat: '<path d="M12 2.69 17.66 8.35a8 8 0 1 1-11.31 0Z"/>',
  light: '<circle cx="12" cy="12" r="9"/><path d="M12 7a5 5 0 0 1 0 10"/>',
  comment: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  minus: '<path d="M5 12h14"/>',
} as const;
