// Two studies for a colour field, beside the swatch row (swatchLever), because
// a row of twelve swatches on every colour field reads as busy. Same handle as
// swatchLever (set, note, marks), so lever-rows.ts picks one by the panel's
// "Color control" setting and nothing else changes.
//
// Row: Figma UI3's fill row at rest (a 14px swatch in a 24px slot, the role in
// an 18px chip, the contrast right-aligned and dim); the roles open in a
// popover grouped by kind, and hovering one previews it on the page.
//
// Lever: the roles as rungs on the rail the sizes use, ordered by lightness,
// dark on the left. The thumb is the colour; the ticks stay neutral dots.
import { h, icon } from './dom';
import { openPopover, closePopover } from './popover';
import { swatchLever, type Rung } from './levers';
import { contrast } from '../color';

export type ColorControl = 'swatches' | 'row' | 'lever';
export const COLOR_CONTROL_KEY = 'design-layer:color-control';
export function colorControl(): ColorControl {
  try { const v = localStorage.getItem(COLOR_CONTROL_KEY); return v === 'swatches' || v === 'lever' ? v : 'row'; } catch { return 'row'; }
}

export interface ColorLeverOptions {
  label: string;
  /** What the field colours, for the popover's first group: Text, Fill or Border. */
  kind: string;
  rungs: Rung[];
  more?: Rung[];
  /** The label on the toggle that shows `more`: "All 12 Steps" unless given. */
  moreLabel?: string;
  onChange: (r: Rung) => void;
  onHover?: (on: boolean) => void;
  /** Shows a rung on the page without committing it; null puts the page back. */
  onPeek?: (r: Rung | null) => void;
  /** A rung's colour in the scheme on screen. */
  hex: (r: Rung) => string;
  /** A rung's contrast, worded, and whether it fails; null where nothing is judged. */
  judge: (r: Rung) => { text: string; short: string; pair: string; fail: boolean } | null;
}

export interface ColorLever {
  el: HTMLElement;
  set(r: Rung, from?: Rung): void;
  note(text: string | null, tone?: 'warn'): void;
  marks(fails: (r: Rung) => boolean): void;
}

export function colorLever(o: ColorLeverOptions): ColorLever {
  const c = colorControl();
  if (c === 'row') return rowLever(o);
  if (c === 'lever') return railLever(o);
  return swatchLever(o);
}

const nameOf = (r: Rung) => r.name ?? r.token?.replace(/^--color-/, '') ?? r.value;
const groupOf = (r: Rung, kind: string) => (/utility/.test(r.token ?? '') ? 'Status' : /brand|link/.test(r.token ?? '') ? 'Brand' : kind);
const swatchStyle = (r: Rung) => `--sw:${r.value}`;

// ── Study A: one row ─────────────────────────────────────────────────────────
function rowLever(o: ColorLeverOptions): ColorLever {
  const sw = h('span', { class: 'sw', style: '', 'aria-hidden': 'true' });
  const name = h('span', { class: 'chip__name' });
  const chip = h('span', { class: 'chip lvr__chip' }, name);
  const read = h('span', { class: 'lvr__read' });
  const field = h('button', { type: 'button', class: 'f lvr__f', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': o.label },
    h('span', { class: 'f__pre' }, sw), chip, read);
  const reset = h('button', { type: 'button', class: 'lv__reset', 'aria-label': `Reset ${o.label}`, title: 'Reset', hidden: true }, icon('reset'));
  const label = h('span', { class: 'lv__l' }, o.label);
  const el = h('div', { class: 'lv lvr' }, h('div', { class: 'lvr__line' }, label, reset, field));
  let cur = o.rungs[0];
  let origin = o.rungs[0];
  let fails: (r: Rung) => boolean = () => false;
  // A hovered role previews on the page; the field keeps saying what is set.
  let peeking = false;
  const peek = (r: Rung | null) => { peeking = !!r; o.onPeek?.(r); };

  const paint = () => {
    sw.setAttribute('style', swatchStyle(cur));
    name.textContent = nameOf(cur);
    field.title = cur.value === origin.value ? (cur.token ?? '') : `${nameOf(origin)} → ${nameOf(cur)}`;
    reset.hidden = cur.value === origin.value;
    el.toggleAttribute('data-moved', cur.value !== origin.value);
  };
  const pick = (r: Rung) => {
    if (r.value === cur.value) return;
    cur = r;
    paint();
    o.onChange(r);
  };

  const row = (r: Rung) => {
    const j = o.judge(r);
    const b = h('button', { type: 'button', class: 'mi lvr__mi', role: 'option', 'aria-selected': String(r.value === cur.value), title: r.token ?? '' },
      h('span', { class: 'mi__sw lvr__sw', style: `background:${r.value}`, ...(fails(r) ? { 'data-fail': true } : {}) }),
      h('span', { class: 'mi__label' }, nameOf(r)),
      h('span', { class: 'mi__meta', ...(j?.fail ? { 'data-fail': true } : {}) }, j?.short ?? ''));
    b.addEventListener('pointerenter', () => peek(r));
    b.addEventListener('focus', () => peek(r));
    b.addEventListener('click', () => { peek(null); closePopover(); pick(r); field.focus(); });
    return b;
  };
  const open = () => {
    const groups = new Map<string, Rung[]>();
    for (const r of o.rungs) { const g = groupOf(r, o.kind); groups.set(g, [...(groups.get(g) ?? []), r]); }
    const list = h('div', { class: 'menu lvr__menu', role: 'listbox', 'aria-label': o.label });
    let first = true;
    for (const [g, rs] of groups) {
      if (!first) list.append(h('div', { class: 'msep' }));
      first = false;
      list.append(h('div', { class: 'mh lvr__mh' }, g), ...rs.map(row));
    }
    const body = h('div', { class: 'lvr__pop' }, list);
    if (o.more?.length) {
      const strip = h('div', { class: 'lvr__strip', hidden: true });
      for (const r of o.more) {
        const s = h('button', { type: 'button', class: 'lvr__step', title: [r.name, r.token].filter(Boolean).join('\n'), style: `background:${r.value}`, 'aria-label': nameOf(r), ...(r.value === cur.value ? { 'aria-current': 'true' } : {}), ...(fails(r) ? { 'data-fail': true } : {}) });
        s.addEventListener('pointerenter', () => peek(r));
        s.addEventListener('click', () => { peek(null); closePopover(); pick(r); field.focus(); });
        strip.append(s);
      }
      const toggle = h('button', { type: 'button', class: 'lvr__more', 'aria-expanded': 'false' }, h('span', {}, o.moreLabel ?? 'All 12 Steps'), icon('chevron'));
      toggle.addEventListener('click', () => { strip.hidden = !strip.hidden; toggle.setAttribute('aria-expanded', String(!strip.hidden)); });
      body.append(h('div', { class: 'msep' }), toggle, strip);
    }
    body.addEventListener('pointerleave', () => peek(null));
    const root = el.getRootNode() as ShadowRoot;
    const pop = openPopover({ root, anchor: field, content: body, className: 'pop--menu lvr__popover', alignEnd: true, beside: (el.closest('.p') as HTMLElement | null) ?? undefined, onClose: () => { peek(null); field.setAttribute('aria-expanded', 'false'); } });
    pop.el.style.width = '240px';
    // Focus goes into the list, so Escape closes it (and returns to the field) and arrows move through it.
    const opts = () => [...body.querySelectorAll<HTMLButtonElement>('.lvr__mi')];
    (opts().find((b) => b.getAttribute('aria-selected') === 'true') ?? opts()[0])?.focus({ preventScroll: true });
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    list.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const all = opts();
      all[Math.max(0, Math.min(all.length - 1, all.indexOf(e.target as HTMLButtonElement) + d))]?.focus();
    });
  };
  field.addEventListener('click', open);
  // Arrows step through the roles without opening anything, as the swatch row does.
  field.addEventListener('keydown', (e) => {
    const d = ({ ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 } as Record<string, number>)[e.key];
    if (!d) return;
    e.preventDefault();
    const i = o.rungs.findIndex((r) => r.value === cur.value);
    pick(o.rungs[Math.max(0, Math.min(o.rungs.length - 1, (i < 0 ? 0 : i + d)))]);
  });
  reset.addEventListener('click', () => pick(origin));
  if (o.onHover) { el.addEventListener('pointerenter', () => o.onHover!(true)); el.addEventListener('pointerleave', () => o.onHover!(false)); }
  return {
    el,
    set(r, from = r) { if (peeking) return; cur = r; origin = from; paint(); },
    note(text, tone) {
      if (peeking) return;
      read.textContent = text ? o.judge(cur)?.short ?? '' : '';
      read.title = text ?? '';
      read.toggleAttribute('data-fail', tone === 'warn');
      field.toggleAttribute('data-fail', tone === 'warn');
    },
    marks(f) { fails = f; },
  };
}

// ── Study B: the rail ────────────────────────────────────────────────────────
function railLever(o: ColorLeverOptions): ColorLever {
  // Lightness against black: higher is lighter. "None" shows the page, so it sits at the light end.
  const light = (r: Rung) => (r.value === 'transparent' ? 99 : contrast(o.hex(r), '#000000'));
  const rungs = [...o.rungs].sort((a, b) => light(a) - light(b));
  const last = Math.max(1, rungs.length - 1);
  const pos = (i: number) => `calc(12px + (100% - 24px) * ${i / last})`;

  const value = h('span', { class: 'lv__v' });
  const reset = h('button', { type: 'button', class: 'lv__reset', 'aria-label': `Reset ${o.label}`, title: 'Reset', hidden: true }, icon('reset'));
  const moreBtn = o.more?.length ? h('button', { type: 'button', class: 'lv__more', 'aria-label': `Whole ${o.label} ramp`, 'aria-expanded': 'false', title: 'All 12 steps' }, icon('chevron')) : null;
  const head = h('div', { class: 'lv__h' }, h('span', { class: 'lv__l' }, o.label), value, moreBtn, reset);
  const track = h('div', { class: 'lv__track lvb__track', role: 'slider', tabindex: '0', 'aria-label': o.label, 'aria-valuemin': '0', 'aria-valuemax': String(last) });
  const notches = rungs.map((r, i) => h('i', { class: 'lv__n', style: `left:${pos(i)}`, 'data-name': nameOf(r) }));
  const was = h('span', { class: 'lv__was', 'aria-hidden': 'true' });
  const thumb = h('span', { class: 'lv__thumb lvb__thumb', 'aria-hidden': 'true' });
  const tip = h('span', { class: 'lvb__tip', hidden: true }, h('span', { class: 'sw' }), h('span', { class: 'lvb__tipn' }));
  track.append(...notches, was, thumb, tip);
  const ramp = h('div', { class: 'lv__ramp', hidden: true });
  const el = h('div', { class: 'lv lvb' }, head, track, ramp);
  let cur = rungs[0];
  let origin = rungs[0];
  let readout = '';
  let warn = false;

  const steps = (o.more ?? []).map((r) => {
    const b = h('button', { type: 'button', class: 'lv__s', role: 'radio', 'aria-label': nameOf(r), title: [r.name, r.token].filter(Boolean).join('\n'), style: `--c:${r.value}` });
    b.addEventListener('click', () => pick(r));
    ramp.append(b);
    return b;
  });
  const at = () => rungs.findIndex((r) => r.value === cur.value);
  const paint = () => {
    const i = at();
    const o_ = rungs.findIndex((r) => r.value === origin.value);
    thumb.hidden = i < 0;
    thumb.setAttribute('style', `${i >= 0 ? `left:${pos(i)};` : ''}${swatchStyle(cur)}`);
    was.hidden = cur.value === origin.value || o_ < 0;
    if (o_ >= 0) was.style.left = pos(o_);
    const name = cur.value === origin.value ? nameOf(cur) : `${nameOf(origin)} → ${nameOf(cur)}`;
    value.textContent = readout ? `${name} · ${readout}` : name;
    value.toggleAttribute('data-fail', warn);
    reset.hidden = cur.value === origin.value;
    el.toggleAttribute('data-moved', cur.value !== origin.value);
    notches.forEach((n, k) => n.toggleAttribute('data-past', i >= 0 && k < i));
    steps.forEach((b, k) => b.setAttribute('aria-checked', String(o.more![k].value === cur.value)));
    track.setAttribute('aria-valuenow', String(Math.max(0, i)));
    track.setAttribute('aria-valuetext', nameOf(cur));
  };
  function pick(r: Rung) {
    if (r.value === cur.value) return;
    cur = r;
    paint();
    o.onChange(r);
  }
  const go = (i: number) => pick(rungs[Math.max(0, Math.min(last, i))]);
  const index = (x: number) => { const b = track.getBoundingClientRect(); return Math.max(0, Math.min(last, Math.round(((x - b.left - 12) / (b.width - 24)) * last))); };

  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    track.focus();
    track.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => go(index(m.clientX));
    move(e);
    const up = () => { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); };
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', up);
  });
  // Hovering a rung names it: its swatch and role, over the tick.
  track.addEventListener('pointermove', (e) => {
    const i = index(e.clientX);
    const r = rungs[i];
    tip.hidden = false;
    tip.style.left = pos(i);
    (tip.firstElementChild as HTMLElement).setAttribute('style', swatchStyle(r));
    tip.lastElementChild!.textContent = nameOf(r);
  });
  track.addEventListener('pointerleave', () => { tip.hidden = true; });
  track.addEventListener('keydown', (e) => {
    const d = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 } as Record<string, number>)[e.key] ?? 0;
    if (!d && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    go(e.key === 'Home' ? 0 : e.key === 'End' ? last : Math.max(0, at()) + d);
  });
  track.addEventListener('wheel', (e) => {
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (!d) return;
    e.preventDefault();
    go(Math.max(0, at()) + (d > 0 ? 1 : -1));
  }, { passive: false });
  moreBtn?.addEventListener('click', () => { ramp.hidden = !ramp.hidden; moreBtn.setAttribute('aria-expanded', String(!ramp.hidden)); });
  reset.addEventListener('click', () => pick(origin));
  if (o.onHover) { el.addEventListener('pointerenter', () => o.onHover!(true)); el.addEventListener('pointerleave', () => o.onHover!(false)); }
  return {
    el,
    set(r, from = r) { cur = r; origin = from; paint(); },
    note(text, tone) { readout = text ? o.judge(cur)?.pair ?? '' : ''; warn = tone === 'warn'; paint(); },
    marks(f) {
      rungs.forEach((r, i) => notches[i].toggleAttribute('data-fail', f(r)));
      (o.more ?? []).forEach((r, i) => steps[i].toggleAttribute('data-fail', f(r)));
    },
  };
}

export const COLOR_LEVER_CSS = `
  /* Study A: Figma's fill row, the field the kit already measured (24 tall, radius 5, a 14 swatch in a 24 slot, an 18 chip) */
  .lvr__line { display: flex; align-items: center; gap: 8px; min-height: 24px; }
  .lvr__line .lv__reset { margin: 0 -4px; }
  .lvr__f { flex: none; width: 184px; padding: 0 8px 0 0; text-align: left; font: inherit; cursor: default; }
  /* the swatch fills the field less 2px a side, so it reads as the colour first */
  .lvr__f .f__pre { position: relative; width: 22px; margin-right: 2px; }
  .lvr__f .sw { width: 20px; height: 20px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14); }
  .lvr__f[data-fail] .f__pre::after { content: ''; position: absolute; top: -1px; right: -2px; width: 6px; height: 6px; border-radius: 50%; background: var(--danger); box-shadow: 0 0 0 1.5px var(--field); }
  .lvr__f[aria-expanded="true"] { border-color: var(--focus); }
  .lvr__chip { flex: 0 1 auto; margin-right: 0; }
  .lvr__read { flex: 1; min-width: 0; text-align: right; color: var(--ink-3); font-size: 10px; opacity: 0; transition: opacity 120ms; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 8px; }
  .lvr__read[data-fail] { color: var(--danger); }
  .lvr__f:hover .lvr__read, .lvr__f:focus-visible .lvr__read, .lvr__f[aria-expanded="true"] .lvr__read { opacity: 1; }
  .lvr__popover { padding: 8px; }
  .lvr__menu { max-height: 300px; }
  .lvr__mh { padding-left: 8px; }
  .lvr__mi { grid-template-columns: 12px 1fr auto; padding-left: 8px; }
  .lvr__sw { position: relative; }
  .lvr__mi[aria-selected="true"] .mi__label { font-weight: 550; }
  .lvr__mi .mi__meta { color: var(--menu-ink-3); font-size: 10px; }
  .lvr__mi .mi__meta[data-fail] { color: var(--menu-ink-3); }
  .lvr__mi { grid-template-columns: 20px 1fr auto; height: 28px; }
  .lvr__sw { width: 20px; height: 20px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14); }
  .lvr__mi[data-active] .mi__meta[data-fail] { color: #ffffff; }
  .lvr__sw[data-fail]::after, .lvr__step[data-fail]::after { content: ''; position: absolute; top: -3px; right: -3px; width: 6px; height: 6px; border-radius: 50%; background: var(--danger); box-shadow: 0 0 0 1.5px var(--menu-bg); }
  .lvr__more { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 24px; padding: 0 0 0 8px; border: 0; border-radius: 5px; background: none; color: var(--menu-ink-2); font: inherit; }
  .lvr__more:hover { background: var(--hover); color: var(--menu-ink); }
  .lvr__more svg { width: 20px; height: 20px; transition: rotate 160ms; }
  .lvr__more[aria-expanded="true"] svg { rotate: 180deg; }
  .lvr__strip { display: grid; grid-template-columns: repeat(12, 1fr); gap: 2px; padding: 6px 0 2px; }
  .lvr__strip[hidden] { display: none; }
  .lvr__step { position: relative; height: 16px; padding: 0; border: 0; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(128,128,128,.25); }
  .lvr__step[aria-current] { outline: 2px solid var(--menu-ink); outline-offset: 1px; }

  /* Study B: the size rail, carrying a colour */
  .lvb .lv__v[data-fail] { color: var(--danger); }
  .lvb .lv__v { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .lvb .lv__l { flex: none; }
  .lvb { grid-template-columns: minmax(0, 1fr); }
  .lvb__thumb { background: linear-gradient(var(--sw, #000), var(--sw, #000)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 6px 6px; box-shadow: 0 0 0 1.5px #fff, 0 1px 3px rgba(0, 0, 0, 0.5); }
  .lvb__thumb[hidden] { display: none; }
  .lvb .lv__n[data-fail] { width: 5px; height: 5px; background: var(--danger); }
  .lvb__tip { position: absolute; bottom: calc(100% + 6px); translate: -50% 0; display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 6px; border-radius: 5px; background: var(--menu-bg); box-shadow: var(--shadow); color: var(--menu-ink); white-space: nowrap; pointer-events: none; z-index: 2; }
  .lvb__tip[hidden] { display: none; }
`;
