// The design layer's controls, one function each. Every control is a plain DOM
// element plus a small handle (set, bind), owns no state beyond what it shows,
// and reports changes through the callbacks it is given, so the panel stays the
// one place that decides what a value means.
import { h, icon, type ICONS } from './dom';
import { menu, openPopover, closePopover, type MenuItem } from './popover';
import { boundToken, shortName, tokensFor, type Token, type TokenKind } from './tokens';

type IconName = keyof typeof ICONS;
type Root = ShadowRoot | HTMLElement;

// ── icon button ────────────────────────────────────────────────────────────
export function iconButton(name: IconName, label: string, onClick: (e: MouseEvent) => void, pressed?: boolean) {
  const b = h('button', { type: 'button', class: 'ib', 'aria-label': label, title: label, ...(pressed === undefined ? {} : { 'aria-pressed': String(pressed) }) }, icon(name));
  b.addEventListener('click', onClick);
  return b;
}

// ── section ────────────────────────────────────────────────────────────────
/** A 40px head with a title that folds the section and actions on the right. */
export function section(o: { id: string; title: string; actions?: Node[]; body: Node[]; closed?: boolean; onToggle?: (closed: boolean) => void }) {
  const el = h('section', { class: 'sec', 'data-sec': o.id, ...(o.closed ? { 'data-closed': true } : {}) });
  const title = h('button', { type: 'button', class: 'sec__title', 'aria-expanded': String(!o.closed) }, o.title);
  title.addEventListener('click', () => {
    const closed = !el.hasAttribute('data-closed');
    el.toggleAttribute('data-closed', closed);
    title.setAttribute('aria-expanded', String(!closed));
    o.onToggle?.(closed);
  });
  el.append(
    h('div', { class: 'sec__h' }, title, h('div', { class: 'sec__actions' }, ...(o.actions ?? []))),
    h('div', { class: 'sec__b' }, ...o.body),
  );
  return el;
}

// ── token picker ───────────────────────────────────────────────────────────
const glyph = (t: Token) => (t.kind === 'color'
  ? h('span', { class: 'mi__sw', style: `background:${t.value}` })
  : h('span', { class: 'mi__glyph' }, t.kind === 'weight' ? 'W' : t.kind === 'font' ? 'Aa' : '#'));

/** A searchable list of the page's tokens of one kind; Enter or a click binds one. */
export function openTokenPicker(o: { root: Root; anchor: HTMLElement; kind: TokenKind; prefer?: RegExp; current: string | null; pick: (name: string) => void }) {
  const all = tokensFor(o.kind, o.prefer);
  const input = h('input', { type: 'text', placeholder: 'Search tokens', spellcheck: 'false', 'aria-label': 'Search tokens' });
  const body = h('div', {});
  const wrap = h('div', {}, h('div', { class: 'tp__search' }, icon('search'), input), body);
  let list: ReturnType<typeof menu<string>> | null = null;
  const render = () => {
    const q = input.value.trim().toLowerCase().replace(/^--/, '');
    const hits = all.filter((t) => !q || t.name.includes(q)).slice(0, 200);
    body.replaceChildren();
    if (!hits.length) { body.append(h('div', { class: 'tp__empty' }, 'No tokens match')); list = null; return; }
    const items: MenuItem<string>[] = hits.map((t) => ({
      value: t.name, label: t.label, lead: glyph(t), header: t.group,
      meta: t.kind === 'color' ? t.display.replace(/^#/, '') : t.display.length > 12 ? `${t.display.slice(0, 11)}…` : t.display,
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
  const pop = openPopover({ root: o.root, anchor: o.anchor, content: wrap, className: 'tp', alignEnd: true });
  render();
  input.focus();
  return pop;
}

/** The chip a bound field shows in place of its input: the token's name, click to change. */
function tokenChip(name: string, kind: TokenKind, onClick: (e: MouseEvent) => void) {
  const value = kind === 'color' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '';
  const c = h('button', { type: 'button', class: 'chip', title: name },
    kind === 'color' && value ? h('span', { class: 'chip__sw', style: `background:${value}` }) : icon('token'),
    h('span', { class: 'chip__name' }, shortName(name)));
  c.addEventListener('click', onClick);
  return c;
}

// ── number field ───────────────────────────────────────────────────────────
export interface NumberFieldOptions {
  root: Root;
  label: string;
  /** The scrub handle: an icon, or a short letter. */
  lead: IconName | { text: string };
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Tokens the field can bind to; omit for none. */
  tokens?: { kind: TokenKind; prefer?: RegExp };
  /** A value, or var(--token) when bound. */
  onChange: (value: number | string) => void;
  /** Reset to the reference value (shown as a dim chip when the value departs). */
  onReference?: () => void;
  /** Steps a value lands on are refused (350): the field skips over them. */
  refuse?: number[];
}

export function numberField(o: NumberFieldOptions) {
  const el = h('div', { class: 'f f--num' });
  const lead = h('span', { class: 'f__lead', title: `${o.label}: drag to change` }, typeof o.lead === 'string' ? icon(o.lead) : o.lead.text);
  if (typeof o.lead !== 'string') lead.classList.add('f__lead--text');
  const input = h('input', { class: 'f__input', inputmode: 'decimal', spellcheck: 'false', 'aria-label': o.label });
  const unit = o.unit ? h('span', { class: 'f__unit' }, o.unit) : null;
  const ref = h('button', { type: 'button', class: 'f__ref', hidden: true });
  const tok = o.tokens ? h('button', { type: 'button', class: 'f__tok', 'aria-label': `Apply token to ${o.label}`, title: 'Apply token', 'aria-expanded': 'false' }, icon('token')) : null;
  let value = 0;
  let bound: string | null = null;

  const clamp = (n: number) => {
    let v = Math.min(o.max, Math.max(o.min, Math.round(n / o.step) * o.step));
    v = Math.round(v * 1000) / 1000;
    if (o.refuse?.includes(v)) v = v + (n >= value ? o.step : -o.step);
    return v;
  };
  const commit = (n: number) => {
    if (!Number.isFinite(n)) { input.value = String(value); return; }
    const v = clamp(n);
    value = v;
    input.value = String(v);
    o.onChange(v);
  };
  input.addEventListener('change', () => commit(Number.parseFloat(input.value)));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const d = (e.key === 'ArrowUp' ? 1 : -1) * o.step * (e.shiftKey ? 10 : 1);
    commit(value + d);
  });
  input.addEventListener('focus', () => input.select());

  // Scrub: drag the lead sideways, a step per two pixels, Shift for ten.
  lead.addEventListener('pointerdown', (e) => {
    if (bound) return;
    e.preventDefault();
    lead.setPointerCapture(e.pointerId);
    el.setAttribute('data-scrubbing', '');
    const x0 = e.clientX;
    const v0 = value;
    const move = (m: PointerEvent) => commit(v0 + Math.round((m.clientX - x0) / 2) * o.step * (m.shiftKey ? 10 : 1));
    const up = () => {
      el.removeAttribute('data-scrubbing');
      lead.removeEventListener('pointermove', move);
      lead.removeEventListener('pointerup', up);
    };
    lead.addEventListener('pointermove', move);
    lead.addEventListener('pointerup', up);
  });

  const pick = (e: MouseEvent) => {
    e.stopPropagation();
    openTokenPicker({ root: o.root, anchor: el, kind: o.tokens!.kind, prefer: o.tokens!.prefer, current: bound, pick: (n) => o.onChange(`var(${n})`) });
  };
  tok?.addEventListener('click', pick);
  ref.addEventListener('click', () => o.onReference?.());

  const render = () => {
    el.replaceChildren(lead);
    if (bound) {
      el.append(tokenChip(bound, o.tokens?.kind ?? 'length', pick), iconButtonSmall('detach', `Detach ${shortName(bound)}`, () => o.onChange(value)));
    } else {
      el.append(input);
      if (unit) el.append(unit);
      el.append(ref);
      if (tok) el.append(tok);
    }
  };
  render();

  return {
    el,
    /** Shows a value (a number, or var(--token) when bound) and the reference, if it departs. */
    set(v: number | string, opts: { reference?: { name: string; value: number } | null; setByUser?: boolean } = {}) {
      const b = typeof v === 'string' ? boundToken(v) : null;
      if (typeof v === 'number') value = v;
      const changed = b !== bound;
      bound = b;
      if (changed) render();
      if (!bound && el.ownerDocument.activeElement !== input && (input.getRootNode() as ShadowRoot).activeElement !== input) input.value = String(value);
      const r = opts.reference;
      const departs = !!r && !bound && r.value !== value;
      ref.hidden = !departs;
      if (r) { ref.textContent = String(r.value); ref.title = `${r.name} ${r.value}${o.unit ?? ''}: reset to it`; }
      el.toggleAttribute('data-set', !!opts.setByUser);
    },
  };
}

function iconButtonSmall(name: IconName, label: string, onClick: () => void) {
  const b = h('button', { type: 'button', class: 'f__tok', 'aria-label': label, title: label }, icon(name));
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

// ── colour field ───────────────────────────────────────────────────────────
export interface ColorFieldOptions {
  root: Root;
  label: string;
  /** Tokens it can bind to; the default is every colour token. */
  tokens?: { prefer?: RegExp } | false;
  onChange: (value: string) => void;
}

export function colorField(o: ColorFieldOptions) {
  const el = h('div', { class: 'f f--color' });
  const native = h('input', { type: 'color', class: 'f__native', tabindex: '-1', 'aria-hidden': 'true' });
  const sw = h('button', { type: 'button', class: 'sw', 'aria-label': `${o.label} colour` });
  const input = h('input', { class: 'f__input', maxlength: '7', spellcheck: 'false', 'aria-label': `${o.label} hex` });
  const meta = h('span', { class: 'f__meta', hidden: true });
  const tok = o.tokens === false ? null : h('button', { type: 'button', class: 'f__tok', 'aria-label': `Apply token to ${o.label}`, title: 'Apply token', 'aria-expanded': 'false' }, icon('token'));
  let hex = '#000000';
  let bound: string | null = null;

  sw.addEventListener('click', () => { native.value = hex; native.click(); });
  native.addEventListener('input', () => o.onChange(native.value));
  const commit = () => {
    const v = input.value.trim().replace(/^#?/, '#').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) o.onChange(v);
    else if (/^#[0-9a-f]{3}$/.test(v)) o.onChange(`#${[...v.slice(1)].map((c) => c + c).join('')}`);
    else input.value = hex.slice(1);
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('focus', () => input.select());
  const pick = (e: MouseEvent) => {
    e.stopPropagation();
    openTokenPicker({ root: o.root, anchor: el, kind: 'color', prefer: o.tokens ? o.tokens.prefer : undefined, current: bound, pick: (n) => o.onChange(`var(${n})`) });
  };
  tok?.addEventListener('click', pick);

  const render = () => {
    el.replaceChildren(native);
    if (bound) el.append(tokenChip(bound, 'color', pick), iconButtonSmall('detach', `Detach ${shortName(bound)}`, () => o.onChange(hex)));
    else { el.append(sw, input, meta); if (tok) el.append(tok); }
  };
  render();

  return {
    el,
    /** Shows a colour (hex, or var(--token) when bound, with its resolved hex) and an optional readout. */
    set(v: string, opts: { resolved?: string; meta?: string; setByUser?: boolean } = {}) {
      const b = boundToken(v);
      hex = (opts.resolved ?? v).toLowerCase();
      if (b !== bound) { bound = b; render(); }
      sw.style.background = hex;
      if ((input.getRootNode() as ShadowRoot).activeElement !== input) input.value = hex.replace(/^#/, '');
      meta.hidden = !opts.meta;
      meta.textContent = opts.meta ?? '';
      el.toggleAttribute('data-set', !!opts.setByUser);
    },
  };
}

// ── select ─────────────────────────────────────────────────────────────────
export function selectField<T extends string>(o: { root: Root; label: string; options: MenuItem<T>[]; onChange: (v: T) => void; lead?: () => Node | null }) {
  const value = h('span', { class: 'f__value' });
  const el = h('button', { type: 'button', class: 'f f--select', 'aria-label': o.label, 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, value, icon('chevron'));
  el.querySelector('svg')!.classList.add('chev');
  let current: T | null = null;
  el.addEventListener('click', () => {
    const m = menu(o.options, current, (v) => { pop.close(); el.focus(); o.onChange(v); });
    const pop = openPopover({ root: o.root, anchor: el, content: m.el });
    pop.el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    m.focus();
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); el.click(); } });
  return {
    el,
    set(v: T) {
      current = v;
      const opt = o.options.find((x) => x.value === v);
      value.textContent = opt?.label ?? v;
      const lead = o.lead?.();
      el.querySelector('.f__lead-node')?.remove();
      if (lead) { (lead as HTMLElement).classList?.add('f__lead-node'); el.prepend(lead); }
    },
  };
}

// ── segmented control and tabs ─────────────────────────────────────────────
export function segmented<T extends string>(o: { label: string; options: { value: T; label?: string; icon?: IconName }[]; onChange: (v: T) => void; fit?: boolean }) {
  const el = h('div', { class: `seg${o.fit ? ' seg--fit' : ''}`, role: 'group', 'aria-label': o.label });
  const buttons = o.options.map((op) => {
    const b = h('button', { type: 'button', 'aria-pressed': 'false', ...(op.icon ? { 'aria-label': op.label ?? op.value, title: op.label ?? op.value } : {}) }, op.icon ? icon(op.icon) : (op.label ?? op.value));
    b.addEventListener('click', () => o.onChange(op.value));
    el.append(b);
    return { b, v: op.value };
  });
  return { el, set(v: T) { for (const x of buttons) x.b.setAttribute('aria-pressed', String(x.v === v)); } };
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

// ── switch row ─────────────────────────────────────────────────────────────
export function switchRow(o: { label: string; onChange: (on: boolean) => void }) {
  const el = h('button', { type: 'button', class: 'sw-row', role: 'switch', 'aria-checked': 'false' }, h('span', {}, o.label), h('span', { class: 'track', 'aria-hidden': 'true' }));
  el.addEventListener('click', () => o.onChange(el.getAttribute('aria-checked') !== 'true'));
  return { el, set(on: boolean) { el.setAttribute('aria-checked', String(on)); } };
}

// ── palette picker ─────────────────────────────────────────────────────────
export interface PaletteOption { id: string; name: string; group: string; colors: string[]; off?: string }

const strip = (colors: string[]) => h('span', { class: 'pal-strip', 'aria-hidden': 'true' }, ...colors.map((c) => h('i', { style: `background:${c}` })));

/** A field showing the current palette; opens a grid of every palette by group. */
export function palettePicker(o: { root: Root; label: string; palettes: () => PaletteOption[]; onPick: (id: string) => void; emptyLabel: string }) {
  const name = h('span', { class: 'f__value' });
  const lead = h('span', { style: 'display:flex' });
  const el = h('button', { type: 'button', class: 'f f--select', 'aria-label': o.label, 'aria-haspopup': 'dialog', 'aria-expanded': 'false' }, lead, name, icon('chevron'));
  el.querySelector('svg')!.classList.add('chev');
  let current: string | null = null;
  el.addEventListener('click', () => {
    const wrap = h('div', {});
    const groups = [...new Set(o.palettes().map((p) => p.group))];
    for (const g of groups) {
      wrap.append(h('div', { class: 'pp__group' }, g));
      const grid = h('div', { class: 'pp__grid' });
      for (const p of o.palettes().filter((x) => x.group === g)) {
        const b = h('button', { type: 'button', class: 'pp__item', 'aria-pressed': String(p.id === current), title: p.off ? `Off recipe: ${p.off}` : p.name },
          strip(p.colors), h('span', { class: 'pp__name' }, p.name), p.off ? h('span', { class: 'pp__off', 'aria-label': 'Off recipe' }) : null);
        b.addEventListener('click', () => { o.onPick(p.id); closePopover(); el.focus(); });
        grid.append(b);
      }
      wrap.append(grid);
    }
    openPopover({ root: o.root, anchor: el, content: wrap, className: 'pp' });
    (wrap.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? wrap.querySelector<HTMLButtonElement>('button'))?.focus();
  });
  return {
    el,
    set(id: string | null, colors: string[]) {
      current = id;
      const p = o.palettes().find((x) => x.id === id);
      name.textContent = p?.name ?? o.emptyLabel;
      lead.replaceChildren(strip(colors));
    },
  };
}
