// Popovers: one open at a time, anchored under (or above) the control that
// opened it, inside the same shadow root, closed by Escape, an outside click or
// the anchor again. Menus are the popover's list form, with the keyboard Figma
// uses: arrows move, Enter picks, Escape closes and returns focus.
import { h, icon } from './dom';

let current: { el: HTMLElement; anchor: HTMLElement; close: () => void } | null = null;

export interface PopoverOptions {
  /** Where the popover goes: the root the panel is drawn in. */
  root: ShadowRoot | HTMLElement;
  anchor: HTMLElement;
  content: HTMLElement;
  className?: string;
  /** Align to the anchor's right edge instead of its left. */
  alignEnd?: boolean;
  /** Open beside this element (the panel) on its left, top-aligned with the anchor: where Figma opens its pickers. */
  beside?: HTMLElement;
  onClose?: () => void;
}

export function closePopover() {
  current?.close();
}

export function openPopover(o: PopoverOptions): { el: HTMLElement; close: () => void } {
  if (current?.anchor === o.anchor) { closePopover(); return { el: o.content, close: () => {} }; }
  closePopover();
  const el = h('div', { class: `pop ${o.className ?? ''}`.trim(), role: 'dialog' }, o.content);
  const host = o.root instanceof ShadowRoot ? (o.root.querySelector('.ui') ?? o.root) : o.root;
  host.append(el);
  const place = () => {
    const a = o.anchor.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (o.beside) {
      const b = o.beside.getBoundingClientRect();
      const top = Math.max(8, Math.min(a.top, innerHeight - r.height - 8));
      Object.assign(el.style, { top: `${top}px`, left: `${Math.max(8, b.left - 8 - r.width)}px` });
      return;
    }
    const below = a.bottom + 4 + r.height <= innerHeight - 8;
    const top = below ? a.bottom + 4 : Math.max(8, a.top - 4 - r.height);
    let left = o.alignEnd ? a.right - r.width : a.left;
    left = Math.min(Math.max(8, left), innerWidth - r.width - 8);
    Object.assign(el.style, { top: `${top}px`, left: `${left}px` });
  };
  place();
  // Content can grow after it opens (a search filling a list): keep it on screen.
  const ro = new ResizeObserver(place);
  ro.observe(el);
  o.anchor.setAttribute('aria-expanded', 'true');
  const onDown = (e: Event) => {
    const path = e.composedPath();
    if (!path.includes(el) && !path.includes(o.anchor)) close();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); o.anchor.focus(); } };
  const doc = o.anchor.ownerDocument;
  setTimeout(() => doc.addEventListener('pointerdown', onDown, true));
  el.addEventListener('keydown', onKey);
  addEventListener('resize', place);
  function close() {
    if (current?.el !== el) return;
    current = null;
    el.remove();
    o.anchor.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('pointerdown', onDown, true);
    removeEventListener('resize', place);
    ro.disconnect();
    o.onClose?.();
  }
  current = { el, anchor: o.anchor, close };
  return { el, close };
}

export interface MenuItem<T> {
  value: T;
  label: string;
  /** Right-aligned, dim: a value, a shortcut. */
  meta?: string;
  /** A node in the leading column (a swatch); a check shows there for the selected item otherwise. */
  lead?: Node;
  header?: string;
}

/** A keyboard-driven list. Returns the list element and a focus function. */
export function menu<T>(items: MenuItem<T>[], selected: T | null, pick: (v: T) => void) {
  const list = h('div', { class: 'menu', role: 'listbox', tabindex: '-1' });
  const rows: HTMLButtonElement[] = [];
  let active = -1;
  const setActive = (i: number) => {
    rows[active]?.removeAttribute('data-active');
    active = Math.max(0, Math.min(rows.length - 1, i));
    const r = rows[active];
    if (!r) return;
    r.setAttribute('data-active', '');
    r.scrollIntoView({ block: 'nearest' });
  };
  let lastHeader: string | undefined;
  for (const it of items) {
    if (it.header && it.header !== lastHeader) {
      if (rows.length) list.append(h('div', { class: 'msep' }));
      list.append(h('div', { class: 'mh' }, it.header));
      lastHeader = it.header;
    }
    const isSel = it.value === selected;
    const row = h('button', { type: 'button', class: 'mi', role: 'option', 'aria-selected': String(isSel) },
      it.lead ?? (isSel ? icon('check') : h('span')),
      h('span', { class: 'mi__label' }, it.label),
      it.meta ? h('span', { class: 'mi__meta' }, it.meta) : h('span'));
    const i = rows.length;
    row.addEventListener('pointermove', () => { if (active !== i) setActive(i); });
    row.addEventListener('click', () => pick(it.value));
    rows.push(row);
    list.append(row);
  }
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter' && rows[active]) { e.preventDefault(); rows[active].click(); }
  });
  const focus = () => {
    const sel = items.findIndex((it) => it.value === selected);
    setActive(sel >= 0 ? sel : 0);
    list.focus();
  };
  return { el: list, focus, setActive: (i: number) => setActive(i), count: () => rows.length };
}
