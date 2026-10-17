// The design layer's controls, one function each, matched to Figma UI3. Every
// control is a plain DOM element plus a small handle (set, range), owns no
// state beyond what it shows, and reports changes through its callbacks, so the
// panel stays the one place that decides what a value means.
//
// No control carries a label column. A number or colour field says what it is
// with its prefix (a letter or a 12px glyph in a 24px slot) and, where a word is
// needed, a right-aligned suffix inside the field, as Figma writes "Fill".
import { h, icon, type ICONS } from './dom';
import { menu, openPopover, closePopover, type MenuItem } from './popover';
import { boundToken, shortName, tokensFor, type Token, type TokenKind } from './tokens';

type IconName = keyof typeof ICONS;
type Root = ShadowRoot | HTMLElement;
/** A field's prefix: a glyph, or a letter or two. */
export type Prefix = IconName | { text: string };

const prefix = (p: Prefix, title: string) => h('span', { class: 'f__pre', title, 'aria-hidden': 'true' }, typeof p === 'string' ? icon(p) : p.text);

// ── icon button ────────────────────────────────────────────────────────────
export function iconButton(name: IconName, label: string, onClick: (e: MouseEvent) => void, pressed?: boolean) {
  const b = h('button', { type: 'button', class: 'ib', 'aria-label': label, title: label, ...(pressed === undefined ? {} : { 'aria-pressed': String(pressed) }) }, icon(name));
  b.addEventListener('click', onClick);
  return b;
}

// ── section ────────────────────────────────────────────────────────────────
/** A 40px head (title, icon actions) over rows on the panel grid. An empty
    section is its head alone with the title in secondary ink, Figma's Fill or
    Stroke with nothing set; its plus (an action the caller supplies) fills it. */
const COLLAPSED_KEY = 'design-layer:collapsed';
const collapsedSet = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]')); } catch { return new Set(); } };

/** A panel section: a 40px head (title, then its actions) over a body. Clicking
    the head (anywhere but an action) collapses the body, as Figma's do; the
    state persists per section. */
export function section(o: { id: string; title: string; actions?: Node[]; body: Node[]; empty?: boolean }) {
  const collapsed = collapsedSet().has(o.id);
  const toggle = h('button', { type: 'button', class: 'sec__toggle', 'aria-expanded': String(!collapsed) }, o.title);
  const head = h('div', { class: 'sec__h' }, h('h2', { class: 'sec__title' }, toggle), ...(o.actions ?? []));
  const el = h('section', { class: 'sec', 'data-sec': o.id, ...(o.empty ? { 'data-empty': true } : {}), ...(collapsed ? { 'data-collapsed': true } : {}) },
    head, h('div', { class: 'sec__b g' }, ...o.body));
  const flip = () => {
    const now = !el.hasAttribute('data-collapsed');
    el.toggleAttribute('data-collapsed', now);
    toggle.setAttribute('aria-expanded', String(!now));
    const set = collapsedSet();
    if (now) set.add(o.id); else set.delete(o.id);
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set])); } catch { /* storage off */ }
  };
  head.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t !== toggle && t.closest('button, input, [role="button"]')) return;
    flip();
  });
  return { el, setEmpty(empty: boolean) { el.toggleAttribute('data-empty', empty); } };
}

// ── menus ──────────────────────────────────────────────────────────────────
/** Figma's dark menu under an anchor. */
export function openMenu<T>(o: { root: Root; anchor: HTMLElement; items: MenuItem<T>[]; selected: T | null; pick: (v: T) => void; alignEnd?: boolean }) {
  const m = menu(o.items, o.selected, (v) => { pop.close(); o.anchor.focus(); o.pick(v); });
  const pop = openPopover({ root: o.root, anchor: o.anchor, content: m.el, className: 'pop--menu', alignEnd: o.alignEnd });
  pop.el.style.minWidth = `${Math.max(160, o.anchor.getBoundingClientRect().width)}px`;
  m.focus();
  return pop;
}

/** A ghost dropdown: text and a chevron, Figma's "20% ⌄". */
export function dropdown(o: { label: string; onOpen: (anchor: HTMLButtonElement) => void }) {
  const text = h('span', {});
  const el = h('button', { type: 'button', class: 'dd', 'aria-label': o.label, 'aria-haspopup': 'true', 'aria-expanded': 'false' }, text, icon('chevron'));
  el.addEventListener('click', () => o.onOpen(el));
  return { el, set(t: string) { text.textContent = t; } };
}

// ── token picker ───────────────────────────────────────────────────────────
const glyph = (t: Token) => (t.kind === 'color'
  ? h('span', { class: 'mi__sw', style: `background:${t.value}` })
  : h('span', { class: 'mi__glyph' }, t.kind === 'weight' ? 'W' : t.kind === 'font' ? 'Aa' : '#'));

/** The page's tokens of one kind, searchable; Enter or a click binds one. */
export function openTokenPicker(o: { root: Root; anchor: HTMLElement; beside?: HTMLElement; kind: TokenKind; prefer?: RegExp; current: string | null; pick: (name: string) => void }) {
  const all = tokensFor(o.kind, o.prefer);
  const input = h('input', { type: 'text', placeholder: 'Search variables', spellcheck: 'false', 'aria-label': 'Search variables' });
  const body = h('div', {});
  const wrap = h('div', {}, h('div', { class: 'tp__search' }, icon('search'), input), body);
  let list: ReturnType<typeof menu<string>> | null = null;
  const render = () => {
    const q = input.value.trim().toLowerCase().replace(/^--/, '');
    const hits = all.filter((t) => !q || t.name.includes(q)).slice(0, 200);
    body.replaceChildren();
    if (!hits.length) { body.append(h('div', { class: 'tp__empty' }, 'No variables match')); list = null; return; }
    const items: MenuItem<string>[] = hits.map((t) => ({
      value: t.name, label: t.label, lead: glyph(t), header: t.group,
      meta: t.kind === 'color' ? t.display.replace(/^#/, '').toUpperCase() : t.display.length > 12 ? `${t.display.slice(0, 11)}…` : t.display,
    }));
    list = menu(items, o.current, (name) => { o.pick(name); pop.close(); });
    body.append(list.el);
    list.setActive(Math.max(0, hits.findIndex((t) => t.name === o.current)));
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key) && list) list.el.dispatchEvent(new KeyboardEvent('keydown', { key: e.key }));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault();
  });
  const pop = openPopover({ root: o.root, anchor: o.anchor, content: wrap, className: 'pop--menu tp', alignEnd: true, beside: o.beside });
  render();
  input.focus();
  return pop;
}

/** A bound field's chip: the variable's name; click to change it. */
function tokenChip(name: string, onClick: (e: MouseEvent) => void) {
  const c = h('button', { type: 'button', class: 'chip', title: name }, h('span', { class: 'chip__name' }, shortName(name)));
  c.addEventListener('click', onClick);
  return c;
}
function hoverButton(name: IconName, label: string, onClick: (e: MouseEvent) => void) {
  const b = h('button', { type: 'button', class: 'f__tok', 'aria-label': label, title: label, 'aria-expanded': 'false' }, icon(name));
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
  return b;
}

// ── number field ───────────────────────────────────────────────────────────
export interface NumberFieldOptions {
  root: Root;
  /** The accessible name and the prefix's tooltip. */
  label: string;
  /** The scrub handle: a glyph or a letter. */
  prefix: Prefix;
  /** A word inside the field's right end (the row's name, a mode). */
  suffix?: string;
  min: number;
  max: number;
  step: number;
  /** Variables the field can bind to; omit for none. */
  tokens?: { kind: TokenKind; prefer?: RegExp; beside?: () => HTMLElement };
  /** A value, or var(--token) when bound. */
  onChange: (value: number | string) => void;
  /** Use the reference value (shown as a dot when the value departs). */
  onReference?: () => void;
  /** Values the field skips over (350). */
  refuse?: number[];
}

export function numberField(o: NumberFieldOptions) {
  const el = h('div', { class: 'f f--num' });
  const pre = prefix(o.prefix, `${o.label}: drag to change`);
  pre.setAttribute('data-scrub', '');
  const input = h('input', { class: 'f__input', inputmode: 'decimal', spellcheck: 'false', 'aria-label': o.label });
  const suf = o.suffix ? h('span', { class: 'f__suf' }, o.suffix) : null;
  const ref = h('button', { type: 'button', class: 'f__ref', hidden: true });
  let value = 0;
  let bound: string | null = null;
  let min = o.min;
  let max = o.max;

  const clamp = (n: number) => {
    let v = Math.min(max, Math.max(min, Math.round(n / o.step) * o.step));
    v = Math.round(v * 1000) / 1000;
    if (o.refuse?.includes(v)) v = v + (n >= value ? o.step : -o.step);
    return v;
  };
  const commit = (n: number) => {
    if (!Number.isFinite(n)) { input.value = String(value); return; }
    value = clamp(n);
    input.value = String(value);
    o.onChange(value);
  };
  input.addEventListener('change', () => commit(Number.parseFloat(input.value)));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    commit(value + (e.key === 'ArrowUp' ? 1 : -1) * o.step * (e.shiftKey ? 10 : 1));
  });
  input.addEventListener('focus', () => input.select());

  // Scrub: drag the prefix sideways, a step per pixel, Shift for ten (Figma's rate).
  pre.addEventListener('pointerdown', (e) => {
    if (bound) return;
    e.preventDefault();
    pre.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const v0 = value;
    const move = (m: PointerEvent) => commit(v0 + Math.round(m.clientX - x0) * o.step * (m.shiftKey ? 10 : 1));
    const up = () => { pre.removeEventListener('pointermove', move); pre.removeEventListener('pointerup', up); };
    pre.addEventListener('pointermove', move);
    pre.addEventListener('pointerup', up);
  });

  const pick = () => openTokenPicker({ root: o.root, anchor: el, beside: o.tokens?.beside?.(), kind: o.tokens!.kind, prefer: o.tokens!.prefer, current: bound, pick: (n) => o.onChange(`var(${n})`) });
  const tok = o.tokens ? hoverButton('token', `Apply variable to ${o.label}`, pick) : null;
  ref.addEventListener('click', () => o.onReference?.());

  const render = () => {
    el.replaceChildren(pre);
    el.classList.toggle('f--outline', !!bound);
    if (bound) el.append(tokenChip(bound, pick), hoverButton('detach', `Detach ${shortName(bound)}`, () => o.onChange(value)));
    else { el.append(input, ref); if (suf) el.append(suf); if (tok) el.append(tok); }
  };
  render();

  return {
    el,
    /** Moves the field's range (a weight follows the face's axis). */
    range(lo: number, hi: number) { min = lo; max = hi; },
    /** Shows a value (a number, or var(--token) when bound); a dot when it departs from the reference. */
    set(v: number | string, opts: { reference?: { name: string; value: number } | null; inherited?: boolean; resolved?: number } = {}) {
      const b = typeof v === 'string' ? boundToken(v) : null;
      if (typeof v === 'number') value = v;
      else if (opts.resolved !== undefined) value = opts.resolved;
      if (b !== bound) { bound = b; render(); }
      if (!bound && (input.getRootNode() as ShadowRoot).activeElement !== input) input.value = String(value);
      const r = opts.reference;
      ref.hidden = !r || !!bound || r.value === value;
      if (r) { ref.title = `${r.name} ${r.value}: use it`; ref.setAttribute('aria-label', `Use ${r.name} value ${r.value}`); }
      el.toggleAttribute('data-inherited', !!opts.inherited);
    },
  };
}

// ── colour field ───────────────────────────────────────────────────────────
export interface ColorFieldOptions {
  root: Root;
  label: string;
  /** The row's name inside the field's right end. */
  suffix?: string;
  /** Variables it can bind to; the default is every colour variable. */
  tokens?: { prefer?: RegExp; beside?: () => HTMLElement } | false;
  onChange: (value: string) => void;
}

/** Figma's fill row: the swatch in the prefix slot, the hex, a name. Bound to a
    variable, it turns into Figma's bordered chip: swatch and variable name. */
export function colorField(o: ColorFieldOptions) {
  const el = h('div', { class: 'f f--color' });
  const native = h('input', { type: 'color', class: 'f__native', tabindex: '-1', 'aria-hidden': 'true' });
  const sw = h('button', { type: 'button', class: 'sw', 'aria-label': `${o.label}: pick a colour` });
  const pre = h('span', { class: 'f__pre' }, sw);
  const input = h('input', { class: 'f__input', maxlength: '7', spellcheck: 'false', 'aria-label': `${o.label} hex` });
  const name = h('button', { type: 'button', class: 'f__name' });
  const suf = o.suffix ? h('span', { class: 'f__suf' }, o.suffix) : null;
  let hex = '#000000';
  let bound: string | null = null;

  sw.addEventListener('click', () => { native.value = hex; native.click(); });
  native.addEventListener('input', () => o.onChange(native.value));
  const commit = () => {
    const v = input.value.trim().replace(/^#?/, '#').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) o.onChange(v);
    else if (/^#[0-9a-f]{3}$/.test(v)) o.onChange(`#${[...v.slice(1)].map((c) => c + c).join('')}`);
    else input.value = hex.slice(1).toUpperCase();
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('focus', () => input.select());
  const pick = () => openTokenPicker({ root: o.root, anchor: el, beside: o.tokens ? o.tokens.beside?.() : undefined, kind: 'color', prefer: o.tokens ? o.tokens.prefer : undefined, current: bound, pick: (n) => o.onChange(`var(${n})`) });
  name.addEventListener('click', pick);
  const tok = o.tokens === false ? null : hoverButton('token', `Apply variable to ${o.label}`, pick);

  const render = () => {
    el.replaceChildren(native, pre);
    el.classList.toggle('f--outline', !!bound);
    if (bound) {
      name.textContent = shortName(bound);
      name.title = bound;
      el.append(name, hoverButton('detach', `Detach ${shortName(bound)}`, () => o.onChange(hex)));
    } else { el.append(input); if (suf) el.append(suf); if (tok) el.append(tok); }
  };
  render();

  return {
    el,
    /** Shows a colour (hex, or var(--token) when bound, with its resolved hex). */
    set(v: string, opts: { resolved?: string } = {}) {
      const b = boundToken(v);
      hex = (opts.resolved ?? v).toLowerCase();
      if (b !== bound) { bound = b; render(); }
      sw.style.background = hex;
      if ((input.getRootNode() as ShadowRoot).activeElement !== input) input.value = hex.replace(/^#/, '').toUpperCase();
    },
  };
}

// ── select: Figma's bordered dropdown ──────────────────────────────────────
export function selectField<T extends string>(o: { root: Root; label: string; options: MenuItem<T>[]; onChange: (v: T) => void; suffix?: string }) {
  const value = h('span', { class: 'f__value' });
  const el = h('button', { type: 'button', class: 'f f--select', 'aria-label': o.label, 'aria-haspopup': 'listbox', 'aria-expanded': 'false' },
    value, o.suffix ? h('span', { class: 'f__suf' }, o.suffix) : null, icon('chevron'));
  let current: T | null = null;
  el.addEventListener('click', () => openMenu({ root: o.root, anchor: el, items: o.options, selected: current, pick: o.onChange }));
  el.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); el.click(); } });
  return {
    el,
    set(v: T) {
      current = v;
      value.textContent = o.options.find((x) => x.value === v)?.label ?? v;
    },
  };
}

// ── segmented control and tabs ─────────────────────────────────────────────
/** A choice group (the selected cell white and bordered), or with `icons` a
    group of icon cells divided by 1px of panel (Figma's align buttons). */
export function segmented<T extends string>(o: { label: string; options: { value: T; label?: string; icon?: IconName }[]; onChange: (v: T) => void; icons?: boolean }) {
  const el = h('div', { class: `seg${o.icons ? ' seg--icons' : ''}`, role: 'group', 'aria-label': o.label });
  const buttons = o.options.map((op) => {
    const b = h('button', { type: 'button', 'aria-pressed': 'false', ...(op.icon ? { 'aria-label': op.label ?? op.value, title: op.label ?? op.value } : {}) }, op.icon ? icon(op.icon) : (op.label ?? op.value));
    b.addEventListener('click', () => o.onChange(op.value));
    el.append(b);
    return { b, v: op.value };
  });
  return { el, set(v: T | null) { for (const x of buttons) x.b.setAttribute('aria-pressed', String(x.v === v)); } };
}

export function tabs<T extends string>(o: { label: string; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const el = h('div', { class: 'tabs', role: 'tablist', 'aria-label': o.label });
  const items = o.options.map((op) => {
    const n = h('span', { class: 'n' });
    const b = h('button', { type: 'button', role: 'tab', 'aria-selected': 'false' }, op.label, n);
    b.addEventListener('click', () => o.onChange(op.value));
    el.append(b);
    return { b, n, v: op.value };
  });
  return {
    el,
    set(v: T) { for (const x of items) x.b.setAttribute('aria-selected', String(x.v === v)); },
    count(v: T, n: number) { const x = items.find((i) => i.v === v); if (x) x.n.textContent = n ? String(n) : ''; },
  };
}

// ── checkbox: Figma's 16px box ─────────────────────────────────────────────
export function checkbox(o: { label: string; onChange: (on: boolean) => void }) {
  const el = h('button', { type: 'button', class: 'cb', role: 'checkbox', 'aria-checked': 'false' }, h('span', { class: 'cb__box' }, icon('check')), h('span', {}, o.label));
  el.addEventListener('click', () => o.onChange(el.getAttribute('aria-checked') !== 'true'));
  return { el, set(on: boolean) { el.setAttribute('aria-checked', String(on)); } };
}

// ── palette picker ─────────────────────────────────────────────────────────
export interface PaletteOption { id: string; name: string; group: string; colors: string[]; off?: string }

export const paletteStrip = (colors: string[]) => h('span', { class: 'pal-strip', 'aria-hidden': 'true' }, ...colors.map((c) => h('i', { style: `background:${c}` })));

/** Every palette by group, in a panel-coloured popover beside the panel. */
export function openPalettePicker(o: { root: Root; anchor: HTMLElement; beside?: HTMLElement; palettes: PaletteOption[]; current: string | null; onPick: (id: string) => void }) {
  const body = h('div', { class: 'pop__b' });
  for (const g of [...new Set(o.palettes.map((p) => p.group))]) {
    body.append(h('div', { class: 'pp__group' }, g));
    const grid = h('div', { class: 'pp__grid' });
    for (const p of o.palettes.filter((x) => x.group === g)) {
      const b = h('button', { type: 'button', class: 'pp__item', 'aria-pressed': String(p.id === o.current), title: p.off ? `Off recipe: ${p.off}` : p.name },
        paletteStrip(p.colors), h('span', { class: 'pp__name' }, p.name), p.off ? h('span', { class: 'pp__off', 'aria-label': 'Off recipe' }) : null);
      b.addEventListener('click', () => { o.onPick(p.id); closePopover(); o.anchor.focus(); });
      grid.append(b);
    }
    body.append(grid);
  }
  const close = iconButton('close', 'Close', () => closePopover());
  const wrap = h('div', { class: 'pp__wrap' }, h('div', { class: 'pop__h' }, h('span', {}, 'Palettes'), close), body);
  const pop = openPopover({ root: o.root, anchor: o.anchor, content: wrap, className: 'pp', beside: o.beside });
  (body.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? body.querySelector<HTMLButtonElement>('button'))?.focus();
  return pop;
}

/** A panel-coloured popover with a title and a close button (Figma's settings popovers). */
export function openPanelPopover(o: { root: Root; anchor: HTMLElement; beside?: HTMLElement; title: string; body: Node[]; width?: number }) {
  const wrap = h('div', { style: `width:${o.width ?? 240}px` },
    h('div', { class: 'pop__h' }, h('span', {}, o.title), iconButton('close', 'Close', () => closePopover())),
    h('div', { class: 'pop__b g' }, ...o.body));
  return openPopover({ root: o.root, anchor: o.anchor, content: wrap, beside: o.beside });
}
