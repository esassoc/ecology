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
import { rgbToHsv, hsvToRgb, rgbToHsl, rgbaToHex, toRgba, type ColorFormat, type Rgba } from '../color';
import { boundToken, conceptsFor, resolveConcept, shortName, tierOf, typeProp, type Token, type TokenKind } from './tokens';

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
const SHOW_ALL_KEY = 'design-layer:show-all';

/** What a pick meant: the concept, the variant it resolved to here, and its siblings. */
export interface PickIntent { concept: string; chosen: string; value: string; size: string | null; variants: string[]; matched: boolean }

/** Where the picker is opened from, so a concept can resolve its size variant. */
export interface PickContext { cssVar?: string; /** The CSS property the field feeds, when the variable's name does not say. */ prop?: string | null; current?: () => string | null; size?: () => string | null }

/**
 * The variables a field can take, one row per concept: "Label Strong" stands
 * for its five sizes and shows the value of the one that fits here. Primitives
 * and component aliases sit behind Show All at the foot. Enter or a click binds.
 */
export function openTokenPicker(o: { root: Root; anchor: HTMLElement; beside?: HTMLElement; kind: TokenKind; current: string | null; at?: PickContext; pick: (name: string, intent: PickIntent) => void }) {
  const prop = o.at?.prop ?? typeProp(o.at?.cssVar);
  const all = conceptsFor(o.kind, prop);
  const where = { current: o.at?.current?.() ?? null, size: o.at?.size?.() ?? null };
  let showAll = (() => { try { return localStorage.getItem(SHOW_ALL_KEY) === '1'; } catch { return false; } })();
  if (o.current && !all.some((c) => c.primary && c.variants.some((v) => v.token.name === o.current))) showAll = true;
  const input = h('input', { type: 'text', placeholder: 'Search variables', spellcheck: 'false', 'aria-label': 'Search variables' });
  const body = h('div', {});
  const toggle = checkbox({ label: 'Show All Variables', onChange: (on) => {
    showAll = on;
    toggle.set(on);
    try { localStorage.setItem(SHOW_ALL_KEY, on ? '1' : '0'); } catch { /* storage off */ }
    render();
  } });
  toggle.set(showAll);
  const wrap = h('div', {}, h('div', { class: 'tp__search' }, icon('search'), input), body, h('div', { class: 'tp__foot' }, toggle.el));
  let list: ReturnType<typeof menu<string>> | null = null;
  const resolved = new Map(all.map((c) => [c.id, resolveConcept(c, where)]));
  const render = () => {
    const q = input.value.trim().toLowerCase().replace(/^--/, '');
    const hits = all.filter((c) => (showAll || c.primary)
      && (!q || c.label.toLowerCase().includes(q) || c.group.includes(q) || c.variants.some((v) => v.token.name.includes(q)))).slice(0, 240);
    body.replaceChildren();
    if (!hits.length) { body.append(h('div', { class: 'tp__empty' }, 'No variables match')); list = null; return; }
    const items: MenuItem<string>[] = hits.map((c) => {
      const r = resolved.get(c.id)!;
      const d = r.token.display;
      const value = c.kind === 'color' ? d.replace(/^#/, '').toUpperCase() : d.length > 12 ? `${d.slice(0, 11)}…` : d;
      return { value: c.id, label: c.label, lead: glyph(r.token), header: c.primary ? c.group : `${c.group} · ${c.variants[0].token.tier === 1 ? 'primitive' : 'component'}`,
        meta: c.variants.length > 1 && r.size ? `${value} · ${r.size.toUpperCase()}` : value };
    });
    const sel = all.find((c) => c.variants.some((v) => v.token.name === o.current))?.id ?? null;
    list = menu(items, sel, (id) => {
      const c = all.find((x) => x.id === id)!;
      const r = resolved.get(id)!;
      const label = c.variants.length > 1 ? `${title(c.group)} / ${c.label}${prop ? ` · ${prop}` : ''}` : r.token.name;
      o.pick(r.token.name, { concept: label, chosen: r.token.name, value: r.token.display, size: r.size, variants: c.variants.map((v) => v.token.name), matched: r.matched });
      pop.close();
    });
    body.append(list.el);
    list.setActive(Math.max(0, hits.findIndex((c) => c.id === sel)));
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
const title = (g: string) => g.split(' / ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' / ');

/** A bound field's chip: the variable's name; click to change it. */
/** A long token name cut from the middle, keeping the distinctive tail (Figma's chip). */
const midName = (n: string, max = 24) => (n.length <= max ? n : `${n.slice(0, 7)}…${n.slice(n.length - (max - 8))}`);
const TIER_TIP: Record<number, string> = { 1: 'Primitive', 2: 'Semantic token', 3: 'Component token' };
function tokenChip(name: string, onClick: (e: MouseEvent) => void) {
  const c = h('button', { type: 'button', class: 'chip', title: `${name}\n${TIER_TIP[tierOf(name)] ?? ''}` },
    h('span', { class: 'chip__glyph', 'aria-hidden': 'true' }, icon('token')), h('span', { class: 'chip__name' }, midName(shortName(name))));
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
  tokens?: { kind: TokenKind; beside?: () => HTMLElement; at?: PickContext };
  /** A value, or var(--token) when bound; a pick carries what it meant. */
  onChange: (value: number | string, intent?: PickIntent) => void;
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

  const pick = () => openTokenPicker({ root: o.root, anchor: el, beside: o.tokens?.beside?.(), kind: o.tokens!.kind, current: bound,
    at: { current: () => `${value}px`, ...o.tokens!.at }, pick: (n, i) => o.onChange(`var(${n})`, i) });
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
  tokens?: { beside?: () => HTMLElement; at?: PickContext } | false;
  /** Where the colour picker opens beside (the panel). */
  beside?: () => HTMLElement;
  /** #rrggbb, #rrggbbaa below full opacity, or var(--token); a pick carries what it meant. */
  onChange: (value: string, intent?: PickIntent) => void;
}

const FORMAT_KEY = 'design-layer:color-format';
const FORMATS: MenuItem<ColorFormat>[] = [{ value: 'hex', label: 'Hex' }, { value: 'rgb', label: 'RGB' }, { value: 'hsl', label: 'HSL' }];
const savedFormat = (): ColorFormat => { try { const f = localStorage.getItem(FORMAT_KEY); return f === 'rgb' || f === 'hsl' ? f : 'hex'; } catch { return 'hex'; } };
const pct = (a: number) => String(Math.round(a * 100));

/** Figma's fill row: the swatch, six hex digits, the opacity in its own percent
    field, a name. Bound to a variable it is the variable's chip. Other formats
    live in the colour picker behind the swatch. */
export function colorField(o: ColorFieldOptions) {
  const el = h('div', { class: 'f f--color' });
  const sw = h('button', { type: 'button', class: 'sw', 'aria-label': `${o.label}: open the colour picker`, 'aria-expanded': 'false' });
  const pre = h('span', { class: 'f__pre' }, sw);
  const input = h('input', { class: 'f__input', maxlength: '7', spellcheck: 'false', 'aria-label': `${o.label} hex` });
  const alpha = h('input', { class: 'f__input f__alpha', inputmode: 'numeric', maxlength: '3', spellcheck: 'false', 'aria-label': `${o.label} opacity` });
  const alphaWrap = h('span', { class: 'f__op' }, alpha, h('span', { class: 'f__pct', 'aria-hidden': 'true' }, '%'));
  const name = h('button', { type: 'button', class: 'f__name' });
  const suf = o.suffix ? h('span', { class: 'f__suf' }, o.suffix) : null;
  let c: Rgba = { r: 0, g: 0, b: 0, a: 1 };
  let bound: string | null = null;
  const emit = (n: Rgba) => { c = n; o.onChange(rgbaToHex(n)); };

  const commitHex = () => {
    const v = input.value.trim().replace(/^#/, '').toLowerCase();
    const six = /^[0-9a-f]{6}$/.test(v) ? v : /^[0-9a-f]{3}$/.test(v) ? [...v].map((x) => x + x).join('') : null;
    if (!six) { input.value = rgbaToHex({ ...c, a: 1 }).slice(1).toUpperCase(); return; }
    emit({ r: parseInt(six.slice(0, 2), 16), g: parseInt(six.slice(2, 4), 16), b: parseInt(six.slice(4, 6), 16), a: c.a });
  };
  const commitAlpha = () => {
    const n = Number.parseFloat(alpha.value);
    if (!Number.isFinite(n)) { alpha.value = pct(c.a); return; }
    emit({ ...c, a: Math.min(100, Math.max(0, Math.round(n))) / 100 });
  };
  for (const [i, commit] of [[input, commitHex], [alpha, commitAlpha]] as const) {
    i.addEventListener('change', commit);
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); });
    i.addEventListener('focus', () => i.select());
  }
  alpha.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    emit({ ...c, a: Math.min(1, Math.max(0, Math.round((c.a + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 0.1 : 0.01)) * 100) / 100)) });
  });
  sw.addEventListener('click', () => {
    if (bound) { pick(); return; }
    sw.setAttribute('aria-expanded', 'true');
    openColorPicker({ root: o.root, anchor: el, beside: o.beside?.() ?? (o.tokens ? o.tokens.beside?.() : undefined), value: c, onChange: emit, onClose: () => sw.setAttribute('aria-expanded', 'false') });
  });
  const pick = () => openTokenPicker({ root: o.root, anchor: el, beside: o.tokens ? o.tokens.beside?.() : undefined, kind: 'color', current: bound,
    at: { current: () => rgbaToHex({ ...c, a: 1 }), ...(o.tokens ? o.tokens.at : {}) }, pick: (n, i) => o.onChange(`var(${n})`, i) });
  name.addEventListener('click', pick);
  const tok = o.tokens === false ? null : hoverButton('token', `Apply variable to ${o.label}`, pick);

  const render = () => {
    el.replaceChildren(pre);
    el.classList.toggle('f--outline', !!bound);
    if (bound) {
      name.textContent = shortName(bound);
      name.title = bound;
      el.append(name, hoverButton('detach', `Detach ${shortName(bound)}`, () => o.onChange(rgbaToHex(c))));
    } else { el.append(input, alphaWrap); if (suf) el.append(suf); if (tok) el.append(tok); }
  };
  render();

  return {
    el,
    /** Shows a colour: a value, or var(--token) when bound, with what it resolves to (any CSS colour). */
    set(v: string, opts: { resolved?: string } = {}) {
      const b = boundToken(v);
      c = toRgba(opts.resolved ?? v);
      if (b !== bound) { bound = b; render(); }
      sw.style.setProperty('--sw', `rgb(${c.r} ${c.g} ${c.b} / ${c.a})`);
      const active = (input.getRootNode() as ShadowRoot).activeElement;
      if (active !== input) input.value = rgbaToHex({ ...c, a: 1 }).slice(1).toUpperCase();
      if (active !== alpha) alpha.value = pct(c.a);
    },
  };
}

// ── colour picker ──────────────────────────────────────────────────────────
/** Figma's colour picker: a saturation and brightness square, hue and opacity
    strips, and the value in a format chosen from its dropdown (remembered). */
export function openColorPicker(o: { root: Root; anchor: HTMLElement; beside?: HTMLElement; value: Rgba; onChange: (c: Rgba) => void; onClose?: () => void }) {
  let { h: hue, s: sat, v: val } = rgbToHsv(o.value);
  let a = o.value.a;
  let format = savedFormat();
  const sv = h('div', { class: 'cp__sv', role: 'slider', tabindex: '0', 'aria-label': 'Saturation and brightness' }, h('span', { class: 'cp__knob' }));
  const hueEl = h('div', { class: 'cp__strip cp__hue', role: 'slider', tabindex: '0', 'aria-label': 'Hue', 'aria-valuemin': '0', 'aria-valuemax': '360' }, h('span', { class: 'cp__knob' }));
  const alphaEl = h('div', { class: 'cp__strip cp__alpha', role: 'slider', tabindex: '0', 'aria-label': 'Opacity', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span', { class: 'cp__fill' }), h('span', { class: 'cp__knob' }));
  // The format menu opens inside the picker: a second popover would close this one.
  let fmtMenu: HTMLElement | null = null;
  const closeFmt = () => { fmtMenu?.remove(); fmtMenu = null; fmt.el.setAttribute('aria-expanded', 'false'); };
  const fmt = dropdown({ label: 'Colour format', onOpen: (anchor) => {
    if (fmtMenu) { closeFmt(); return; }
    const m = menu(FORMATS, format, (f) => {
      format = f;
      try { localStorage.setItem(FORMAT_KEY, f); } catch { /* storage off */ }
      closeFmt();
      renderInputs();
      anchor.focus();
    });
    fmtMenu = h('div', { class: 'cp__menu' }, m.el);
    m.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeFmt(); anchor.focus(); } });
    row.append(fmtMenu);
    anchor.setAttribute('aria-expanded', 'true');
    m.focus();
  } });
  const inputs = h('div', { class: 'cp__in' });
  const opIn = h('input', { class: 'f__input f__alpha', inputmode: 'numeric', maxlength: '3', 'aria-label': 'Opacity' });
  const row = h('div', { class: 'cp__row' }, fmt.el, h('div', { class: 'f cp__val' }, inputs, h('span', { class: 'f__op' }, opIn, h('span', { class: 'f__pct', 'aria-hidden': 'true' }, '%'))));
  const wrap = h('div', { class: 'cp' }, sv, hueEl, alphaEl, row);

  const rgba = (): Rgba => ({ ...hsvToRgb(hue, sat, val), a });
  const paint = () => {
    const c = rgba();
    sv.style.setProperty('--hue', `hsl(${hue} 100% 50%)`);
    (sv.firstChild as HTMLElement).style.cssText = `left:${sat * 100}%;top:${(1 - val) * 100}%;background:rgb(${c.r} ${c.g} ${c.b})`;
    (hueEl.firstChild as HTMLElement).style.left = `${(hue / 360) * 100}%`;
    alphaEl.style.setProperty('--solid', `rgb(${c.r} ${c.g} ${c.b})`);
    (alphaEl.lastChild as HTMLElement).style.left = `${a * 100}%`;
    hueEl.setAttribute('aria-valuenow', String(Math.round(hue)));
    alphaEl.setAttribute('aria-valuenow', pct(a));
    sv.setAttribute('aria-valuetext', `Saturation ${Math.round(sat * 100)}%, brightness ${Math.round(val * 100)}%`);
    const active = (wrap.getRootNode() as ShadowRoot).activeElement;
    if (!inputs.contains(active)) fillInputs(c);
    if (active !== opIn) opIn.value = pct(a);
  };
  const change = () => { paint(); o.onChange(rgba()); };

  // The value in the chosen format: one hex field, or three channel fields.
  let fields: HTMLInputElement[] = [];
  function fillInputs(c: Rgba) {
    const vals = format === 'hex' ? [rgbaToHex({ ...c, a: 1 }).slice(1).toUpperCase()]
      : format === 'rgb' ? [c.r, c.g, c.b].map(String) : Object.values(rgbToHsl(c)).map(String);
    fields.forEach((f, i) => { f.value = vals[i]; });
  }
  function renderInputs() {
    fmt.set(FORMATS.find((f) => f.value === format)!.label);
    const names = format === 'hex' ? ['Hex'] : format === 'rgb' ? ['Red', 'Green', 'Blue'] : ['Hue', 'Saturation', 'Lightness'];
    fields = names.map((n) => h('input', { class: 'f__input', spellcheck: 'false', 'aria-label': n, ...(format === 'hex' ? { maxlength: '7' } : { inputmode: 'numeric', maxlength: '3' }) }) as HTMLInputElement);
    inputs.replaceChildren(...fields);
    inputs.dataset.n = String(fields.length);
    for (const f of fields) {
      f.addEventListener('change', commit);
      f.addEventListener('keydown', (e) => { if (e.key === 'Enter') f.blur(); });
      f.addEventListener('focus', () => f.select());
    }
    fillInputs(rgba());
  }
  function commit() {
    const n = fields.map((f) => f.value.trim().replace(/^#/, ''));
    let c: Rgba | null = null;
    if (format === 'hex') { const v = /^[0-9a-f]{3}$/i.test(n[0]) ? [...n[0]].map((x) => x + x).join('') : n[0]; if (/^[0-9a-f]{6}$/i.test(v)) c = toRgba(`#${v}`); }
    else {
      const [x, y, z] = n.map(Number);
      if ([x, y, z].every(Number.isFinite)) c = toRgba(format === 'rgb' ? `rgb(${x} ${y} ${z})` : `hsl(${x} ${y}% ${z}%)`);
    }
    if (!c) { fillInputs(rgba()); return; }
    ({ h: hue, s: sat, v: val } = rgbToHsv(c));
    change();
  }
  opIn.addEventListener('change', () => { const v = Number.parseFloat(opIn.value); if (Number.isFinite(v)) { a = Math.min(100, Math.max(0, Math.round(v))) / 100; change(); } else opIn.value = pct(a); });
  opIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') opIn.blur(); });

  // Drag on the square and the strips; arrows nudge them (Shift for ten).
  const drag = (target: HTMLElement, at: (x: number, y: number) => void) => target.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    target.focus();
    target.setPointerCapture(e.pointerId);
    const r = target.getBoundingClientRect();
    const move = (m: PointerEvent) => at(Math.min(1, Math.max(0, (m.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (m.clientY - r.top) / r.height)));
    move(e);
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  });
  drag(sv, (x, y) => { sat = x; val = 1 - y; change(); });
  drag(hueEl, (x) => { hue = x * 360; change(); });
  drag(alphaEl, (x) => { a = Math.round(x * 100) / 100; change(); });
  const nudge = (target: HTMLElement, step: (dx: number, dy: number) => void) => target.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k) return;
    e.preventDefault();
    const m = e.shiftKey ? 10 : 1;
    step(k[0] * m, k[1] * m);
    change();
  });
  nudge(sv, (dx, dy) => { sat = Math.min(1, Math.max(0, sat + dx / 100)); val = Math.min(1, Math.max(0, val - dy / 100)); });
  nudge(hueEl, (dx) => { hue = (hue + dx + 360) % 360; });
  nudge(alphaEl, (dx) => { a = Math.min(1, Math.max(0, Math.round((a + dx / 100) * 100) / 100)); });

  renderInputs();
  paint();
  const pop = openPopover({ root: o.root, anchor: o.anchor, content: wrap, className: 'cpop', beside: o.beside, onClose: o.onClose });
  sv.focus();
  return pop;
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
