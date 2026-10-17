// A small element builder and the kit's icons. The icons are drawn for this
// kit to Figma UI3's weight, measured from its panel: a 24px box rendered 1:1,
// a 12 to 14px glyph centred in it, a 1px stroke on half-pixel coordinates so
// it lands on whole device pixels. Not Lucide: Lucide's 1.75 stroke at 16px is
// twice Figma's ink.

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

/** An inline SVG from an icon name, 24px, 1px stroke. */
export function icon(name: keyof typeof ICONS): SVGSVGElement {
  const t = document.createElement('template');
  t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstElementChild as SVGSVGElement;
}

const dot = (x: number, y: number, r = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;

export const ICONS = {
  // ── actions ──
  /** The select tool: Figma's move arrow. */
  cursor: '<path d="M8.5 6.5v10.5l2.9-2.8 2 4.2 1.7-.8-2-4.1h4.1Z"/>',
  plus: '<path d="M12 6.5v11M6.5 12h11"/>',
  minus: '<path d="M6.5 12h11"/>',
  chevron: '<path d="m9 10.5 3 3 3-3"/>',
  check: '<path d="m7.5 12.5 3 3 6-6.5"/>',
  close: '<path d="m8 8 8 8M16 8l-8 8"/>',
  kebab: dot(7, 12) + dot(12, 12) + dot(17, 12),
  reset: '<path d="M8.5 9.5a5 5 0 1 1-1 4"/><path d="M8.5 6.5v3h3"/>',
  search: '<circle cx="11" cy="11" r="4.5"/><path d="m14.5 14.5 3 3"/>',
  eye: '<path d="M5.5 12s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4Z"/><circle cx="12" cy="12" r="1.75"/>',
  comment: '<path d="M7.5 16.5V9a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 16.5 9v4a1.5 1.5 0 0 1-1.5 1.5h-5l-2.5 2Z"/>',
  /** Hue and saturation move together (Figma's link glyph, horizontal). */
  link: '<path d="M10.5 8.5H9a3.5 3.5 0 0 0 0 7h1.5M13.5 8.5H15a3.5 3.5 0 0 1 0 7h-1.5M9.5 12h5"/>',
  /** Apply a variable: Figma's hexagon with a centre. */
  token: '<path d="m12 6 5.2 3v6L12 18l-5.2-3V9Z"/>' + dot(12, 12, 1.25),
  detach: '<path d="M10.5 8.5H9a3.5 3.5 0 0 0 0 7h1.5M13.5 8.5H15a3.5 3.5 0 0 1 0 7h-1.5"/><path d="M12 6v2M12 16v2"/>',
  /** Styles and variables: Figma's four dots. */
  styles: '<circle cx="9" cy="9" r="2"/><circle cx="15" cy="9" r="2"/><circle cx="9" cy="15" r="2"/><circle cx="15" cy="15" r="2"/>',
  /** Advanced settings for a section (Figma's two sliders). */
  adjust: '<path d="M9.5 6.5v3M9.5 13.5v4M14.5 6.5v4M14.5 14.5v3"/><circle cx="9.5" cy="11.5" r="1.5"/><circle cx="14.5" cy="12.5" r="1.5"/>',
  contrast: '<circle cx="12" cy="12" r="5.5"/><path d="M12 6.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" stroke="none"/>',
  /** Apply the reference spoke's values. */
  reference: '<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>',
  sun: '<circle cx="12" cy="12" r="2.5"/><path d="M12 6.5v1.5M12 16v1.5M6.5 12H8M16 12h1.5M8.1 8.1l1 1M14.9 14.9l1 1M8.1 15.9l1-1M14.9 9.1l1-1"/>',
  moon: '<path d="M16.5 13.5A5 5 0 0 1 10.5 7.5a5 5 0 1 0 6 6Z"/>',
  // ── field prefixes ──
  /** Font size. */
  size: '<path d="M8.5 8.5h7M12 8.5v8"/>',
  radius: '<path d="M8.5 16.5v-4a4 4 0 0 1 4-4h4"/>',
  /** Padding top and bottom: Figma's box with its horizontal bars. */
  padY: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><path d="M10 10.5h4M10 13.5h4"/>',
  /** Padding left and right. */
  padX: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><path d="M10.5 10v4M13.5 10v4"/>',
  height: '<path d="M12 7.5v9M10 9.5l2-2 2 2M10 14.5l2 2 2-2"/>',
  icon: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><rect x="10.5" y="10.5" width="3" height="3" rx=".5"/>',
} as const;
