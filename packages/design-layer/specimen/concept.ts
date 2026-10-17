// The levers concept: the design layer reconceived around the system's ramps.
// A mock page on the hub's real tokens and face, and the panel driving it:
// select something, pull its levers, send the changes to Claude.
//
// Each kind of value gets its own way to adjust, test, evaluate and accept
// (levers-by-use-case.md): a colour is judged by contrast in both schemes, a
// space by what it sits beside, a size by where it lands on the page's
// hierarchy.
//
// ?state=page | card | text | size | color | icon | brand | review | before   ?theme=light
import { UI_CSS, h, section, segmented, iconButton } from '../src/ui';
import { rampLever, swatchLever, pairLever, LEVER_CSS, type Rung } from '../src/ui/levers';

// ── ramps: the system's own rungs ─────────────────────────────────────────
const tok = (t: string, name?: string): Rung => ({ value: `var(${t})`, token: t, name });
const SPACE: Rung[] = [{ value: '0px', name: '0' }, ...['050', '100', '150', '200', '250', '300', '400', '500', '600', '650', '700', '800'].map((n) => tok(`--spacing-${n}`))];
const SIZE: Rung[] = ['100', '150', '200', '250', '300', '400', '500', '600', '700', '800', '900'].map((n) => tok(`--font-size-${n}`));
const RADIUS: Rung[] = [{ value: '0px', name: 'None' }, tok('--radius-xs', 'XS'), tok('--radius-sm', 'SM'), tok('--radius-md', 'MD'), tok('--radius-lg', 'LG'), tok('--radius-pill', 'Pill')];
const WIDTH: Rung[] = [{ value: '0px', name: 'None' }, tok('--border-width-100'), tok('--border-width-200'), tok('--border-width-300'), tok('--border-width-400')];
const WEIGHT: Rung[] = [tok('--font-weight-300', 'Light'), tok('--font-weight-400', 'Regular'), tok('--font-weight-500', 'Medium'), tok('--font-weight-600', 'Semibold'), tok('--font-weight-700', 'Bold')];
const LEADING: Rung[] = [tok('--line-height-none', 'None'), tok('--line-height-tight', 'Tight'), tok('--line-height-normal', 'Normal'), tok('--line-height-relaxed', 'Relaxed')];
const ICON: Rung[] = ['xs', 'sm', 'md', 'lg', 'xl'].map((n) => tok(`--icon-size-${n}`, n.toUpperCase()));
const COLS: Rung[] = ['1', '2', '3', '4'].map((n) => ({ value: n, name: n }));
const TEXT: Rung[] = [tok('--color-content-default', 'Default'), tok('--color-content-default-secondary', 'Secondary'), tok('--color-content-disabled', 'Disabled'), tok('--color-content-brand', 'Brand')];
const FILL: Rung[] = [tok('--color-background-default', 'Default'), tok('--color-background-elevation-sunken', 'Sunken'), tok('--color-background-brand-subtle', 'Brand Subtle'), tok('--color-background-brand-muted', 'Brand Muted'), tok('--color-background-brand', 'Brand'), tok('--color-background-default-knockout', 'Knockout')];
const LINE: Rung[] = [tok('--color-border-default-subtle', 'Subtle'), tok('--color-border-default', 'Default'), tok('--color-border-default-strong', 'Strong'), tok('--color-border-default-focus', 'Brand')];
const hueRamp = (hue: string) => Array.from({ length: 12 }, (_, i) => tok(`--color-${hue}-${i + 1}`, `${hue[0].toUpperCase()}${hue.slice(1)} ${i + 1}`));
const BRANDS = ['grass', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'plum', 'crimson', 'orange', 'amber'];
const NEUTRALS = ['gray', 'slate', 'sand', 'mauve', 'sage', 'olive'];
const CORNERS: Rung[] = [{ value: 'flat', name: 'Flat' }, { value: 'soft', name: 'Soft' }, { value: 'round', name: 'Round' }];
const DENSITY: Rung[] = [{ value: '0.75', name: 'Compact' }, { value: '1', name: 'Default' }, { value: '1.25', name: 'Comfortable' }];
const SCALE: Rung[] = [{ value: '0.9', name: 'Smaller' }, { value: '1', name: 'Default' }, { value: '1.12', name: 'Larger' }];

const root = document.documentElement;
const canvas = h('div', { class: 'canvas' });

// What a rung renders as, measured on a probe so a clamp() reads at this viewport.
const probe = document.createElement('div');
probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
const measure = (value: string, prop: string) => {
  if (!probe.isConnected) canvas.append(probe);
  probe.style.setProperty(prop, value);
  return getComputedStyle(probe).getPropertyValue(prop);
};
const num = (r: Rung, prop = 'width') => Math.round(Number.parseFloat(measure(r.value, prop)) * 10) / 10;
const showPx = (r: Rung) => `${num(r)} px`;
const showFont = (r: Rung) => `${num(r, 'font-size')} px`;
const showName = (r: Rung) => r.name ?? r.value;
const showNamePx = (r: Rung) => (r.value === '0px' ? 'None' : r.value.includes('pill') ? 'Pill' : `${r.name} · ${num(r)} px`);
const nearest = (ladder: number[], v: number) => ladder.reduce((b, x, i) => (Math.abs(x - v) < Math.abs(ladder[b] - v) ? i : b), 0);
const pxOf = (v: string) => Number.parseFloat(v) || 0;

// ── colour: contrast, measured in both schemes ─────────────────────────────
const rgba = (c: string) => { const m = (c.match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
const lum = (c: string) => { const { r, g, b } = rgba(c); const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const resolve = (value: string) => measure(value, 'color');
const fmt = (n: number) => `${n.toFixed(1)}:1`;
function inSchemes<T>(fn: () => T): { light: T; dark: T } {
  const was = root.dataset.scheme;
  root.dataset.scheme = 'light'; const light = fn();
  root.dataset.scheme = 'dark'; const dark = fn();
  root.dataset.scheme = was;
  return { light, dark };
}
function opaqueBg(start: Element | null): string {
  for (let e = start; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (rgba(c).a > 0.5) return c; }
  return resolve('var(--color-background-default)');
}
const textFloor = (el: Element) => { const s = getComputedStyle(el); const size = pxOf(s.fontSize); return size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700) ? 3 : 4.5; };

// ── the elements and their levers ──────────────────────────────────────────
type Role = 'type-size' | 'leading' | 'weight' | 'text-color' | 'icon-color' | 'fill' | 'padding' | 'corners' | 'border-width' | 'border-color' | 'gap-inside' | 'gap-between' | 'icon-size' | 'columns';
type Overlay = 'padding' | 'gap' | 'lines';
type LeverDef =
  | { id: string; label: string; role: Role; kind: 'ramp'; rungs: Rung[]; show: (r: Rung) => string; def: string; overlay?: Overlay }
  | { id: string; label: string; role: Role; kind: 'swatch'; rungs: Rung[]; def: string }
  | { id: string; label: string; role: Role; kind: 'pair'; rungs: Rung[]; show: (r: Rung) => string; def: [string, string]; overlay?: Overlay };
interface Group { title: string; levers: LeverDef[] }
interface Kind { name: string; plural: string; groups: Group[]; canvas?: Overlay[] }

const textGroup = (size: string, weight: string, lead: string, color: string): Group => ({ title: 'Text', levers: [
  { id: 'size', label: 'Size', role: 'type-size', kind: 'ramp', rungs: SIZE, show: showFont, def: size },
  { id: 'weight', label: 'Weight', role: 'weight', kind: 'ramp', rungs: WEIGHT, show: showName, def: weight },
  { id: 'lh', label: 'Line Height', role: 'leading', kind: 'ramp', rungs: LEADING, show: showName, def: lead, overlay: 'lines' },
  { id: 'color', label: 'Color', role: 'text-color', kind: 'swatch', rungs: TEXT, def: color },
] });
const KINDS: Record<string, Kind> = {
  card: { name: 'Stat Card', plural: 'Stat Cards', canvas: ['padding', 'gap'], groups: [
    { title: 'Box', levers: [
      { id: 'fill', label: 'Fill', role: 'fill', kind: 'swatch', rungs: FILL, def: '--color-background-default' },
      { id: 'pad', label: 'Padding', role: 'padding', kind: 'pair', rungs: SPACE, show: showPx, def: ['--spacing-400', '--spacing-400'], overlay: 'padding' },
      { id: 'radius', label: 'Corners', role: 'corners', kind: 'ramp', rungs: RADIUS, show: showNamePx, def: '--radius-md' },
    ] },
    { title: 'Border', levers: [
      { id: 'bw', label: 'Width', role: 'border-width', kind: 'ramp', rungs: WIDTH, show: (r) => (r.value === '0px' ? 'None' : showPx(r)), def: '--border-width-100' },
      { id: 'bc', label: 'Color', role: 'border-color', kind: 'swatch', rungs: LINE, def: '--color-border-default-subtle' },
    ] },
    { title: 'Layout', levers: [{ id: 'gap', label: 'Gap', role: 'gap-inside', kind: 'ramp', rungs: SPACE, show: showPx, def: '--spacing-200', overlay: 'gap' }] },
  ] },
  value: { name: 'Stat Value', plural: 'Stat Values', canvas: ['lines'], groups: [textGroup('--font-size-700', '--font-weight-600', '--line-height-tight', '--color-content-default')] },
  label: { name: 'Stat Label', plural: 'Stat Labels', canvas: ['lines'], groups: [textGroup('--font-size-250', '--font-weight-500', '--line-height-tight', '--color-content-default-secondary')] },
  caption: { name: 'Caption', plural: 'Captions', canvas: ['lines'], groups: [textGroup('--font-size-200', '--font-weight-400', '--line-height-normal', '--color-content-default-secondary')] },
  title: { name: 'Page Title', plural: 'Page Titles', canvas: ['lines'], groups: [textGroup('--font-size-600', '--font-weight-600', '--line-height-tight', '--color-content-default')] },
  icon: { name: 'Icon', plural: 'Icons', groups: [{ title: 'Icon', levers: [
    { id: 'size', label: 'Size', role: 'icon-size', kind: 'ramp', rungs: ICON, show: (r) => `${r.name} · ${num(r)} px`, def: '--icon-size-md' },
    { id: 'color', label: 'Color', role: 'icon-color', kind: 'swatch', rungs: TEXT, def: '--color-content-brand' },
    { id: 'fill', label: 'Badge Fill', role: 'fill', kind: 'swatch', rungs: FILL, def: '--color-background-brand-muted' },
  ] }] },
  cards: { name: 'Stat Row', plural: 'Stat Rows', canvas: ['gap'], groups: [{ title: 'Layout', levers: [
    { id: 'gap', label: 'Gap', role: 'gap-between', kind: 'ramp', rungs: SPACE, show: showPx, def: '--spacing-400', overlay: 'gap' },
    { id: 'cols', label: 'Columns', role: 'columns', kind: 'ramp', rungs: COLS, show: showName, def: '3' },
  ] }] },
};

// ── the page ───────────────────────────────────────────────────────────────
const ico = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const card = (icon: keyof typeof ICONS, label: string, value: string, caption: string) => `
  <article class="card" data-k="card">
    <span class="ico" data-k="icon">${ico(ICONS[icon])}</span>
    <span class="label" data-k="label">${label}</span>
    <span class="value" data-k="value">${value}</span>
    <span class="caption" data-k="caption">${caption}</span>
  </article>`;
const PAGE = `
  <main class="pg">
    <header class="pg__h"><h1 data-k="title">Water Rights Overview</h1><p class="pg__sub">Kern Subbasin · Water Year 2026</p></header>
    <section class="cards" data-k="cards">
      ${card('drop', 'Allocated', '41,280 AF', '82% of the basin cap')}
      ${card('file', 'Open Filings', '17', '4 awaiting review')}
      ${card('clock', 'Days to Deadline', '23', 'Annual report due 2026-11-09')}
    </section>
    <section class="list">
      <h2>Recent Filings</h2>
      <ul>
        <li><span>Change of Use · Parcel 114-22</span><span class="m">2026-10-14</span></li>
        <li><span>New Appropriation · Rosedale</span><span class="m">2026-10-11</span></li>
        <li><span>Transfer · Semitropic to Buena Vista</span><span class="m">2026-10-07</span></li>
      </ul>
    </section>
  </main>`;

const PAGE_CSS = `
  html { --m-density: 1; --m-scale: 1; }
  body { margin: 0; display: grid; grid-template-columns: 1fr 296px; height: 100vh; overflow: hidden; background: #1e1e1e; }
  .canvas { position: relative; overflow: auto; background: var(--color-background-elevation-sunken); font-family: var(--font-family-primary); color: var(--color-content-default); }
  .pg { max-width: 920px; margin: 0 auto; padding: calc(var(--spacing-700) * var(--m-density)) var(--spacing-600); display: grid; gap: calc(var(--spacing-600) * var(--m-density)); }
  .pg__h h1 { margin: 0; font-size: calc(var(--m-title-size, var(--font-size-600)) * var(--m-scale)); font-weight: var(--m-title-weight, var(--font-weight-600)); line-height: var(--m-title-lh, var(--line-height-tight)); color: var(--m-title-color, var(--color-content-default)); }
  .pg__sub { margin: var(--spacing-100) 0 0; font-size: var(--font-size-250); color: var(--color-content-default-secondary); }
  .cards { display: grid; grid-template-columns: repeat(var(--m-cards-cols, 3), minmax(0, 1fr)); gap: calc(var(--m-cards-gap, var(--spacing-400)) * var(--m-density)); }
  .card { display: grid; align-content: start; justify-items: start;
    gap: calc(var(--m-card-gap, var(--spacing-200)) * var(--m-density));
    padding: calc(var(--m-card-pad-y, var(--spacing-400)) * var(--m-density)) calc(var(--m-card-pad-x, var(--spacing-400)) * var(--m-density));
    border-radius: var(--m-card-radius, var(--radius-md)); background: var(--m-card-fill, var(--color-background-default));
    border: var(--m-card-bw, var(--border-width-100)) solid var(--m-card-bc, var(--color-border-default-subtle)); }
  .ico { display: grid; place-items: center; padding: var(--spacing-150); border-radius: var(--radius-md); background: var(--m-icon-fill, var(--color-background-brand-muted)); color: var(--m-icon-color, var(--color-content-brand)); }
  .ico svg { width: var(--m-icon-size, var(--icon-size-md)); height: var(--m-icon-size, var(--icon-size-md)); }
  .label { font-size: calc(var(--m-label-size, var(--font-size-250)) * var(--m-scale)); font-weight: var(--m-label-weight, var(--font-weight-500)); line-height: var(--m-label-lh, var(--line-height-tight)); color: var(--m-label-color, var(--color-content-default-secondary)); }
  .value { font-size: calc(var(--m-value-size, var(--font-size-700)) * var(--m-scale)); font-weight: var(--m-value-weight, var(--font-weight-600)); line-height: var(--m-value-lh, var(--line-height-tight)); color: var(--m-value-color, var(--color-content-default)); font-variant-numeric: tabular-nums; }
  .caption { font-size: calc(var(--m-caption-size, var(--font-size-200)) * var(--m-scale)); font-weight: var(--m-caption-weight, var(--font-weight-400)); line-height: var(--m-caption-lh, var(--line-height-normal)); color: var(--m-caption-color, var(--color-content-default-secondary)); }
  .list { background: var(--color-background-default); border: var(--border-width-100) solid var(--color-border-default-subtle); border-radius: var(--radius-md); padding: calc(var(--spacing-400) * var(--m-density)) var(--spacing-500); }
  .list h2 { margin: 0 0 var(--spacing-200); font-size: calc(var(--font-size-400) * var(--m-scale)); font-weight: var(--font-weight-600); }
  .list ul { margin: 0; padding: 0; list-style: none; }
  .list li { display: flex; justify-content: space-between; gap: var(--spacing-400); padding: calc(var(--spacing-300) * var(--m-density)) 0; border-top: var(--border-width-100) solid var(--color-border-default-subtle); font-size: calc(var(--font-size-250) * var(--m-scale)); }
  .list .m { color: var(--color-content-default-secondary); font-variant-numeric: tabular-nums; }

  /* the inspector's marks on the page */
  [data-k] { cursor: default; }
  .mk { position: absolute; pointer-events: none; z-index: 5; }
  .mk--hover { outline: 1px solid #0c8ce9; }
  .mk--sel { outline: 1.5px solid #0c8ce9; }
  .mk--sib { outline: 1px dashed #0c8ce9; }
  .mk__tag { position: absolute; left: -1.5px; bottom: 100%; margin-bottom: 4px; padding: 0 6px; border-radius: 3px; background: #0c8ce9; color: #fff; font: 550 11px/18px 'Design Layer UI', Inter, sans-serif; white-space: nowrap; }
  .mk--pad { background: rgba(140, 196, 110, 0.42); display: grid; place-items: center; }
  .mk--gap { background: repeating-linear-gradient(45deg, rgba(186, 110, 230, 0.6) 0 1px, rgba(186, 110, 230, 0.18) 1px 6px); display: grid; place-items: center; }
  .mk--line { background: rgba(12, 140, 233, 0.1); border-bottom: 1px solid rgba(12, 140, 233, 0.5); display: grid; place-items: center end; }
  .mk--line .mk__px { margin-right: -32px; }
  .mk--drag { pointer-events: auto; }
  .mk--drag[data-axis="x"] { cursor: ew-resize; }
  .mk--drag[data-axis="y"] { cursor: ns-resize; }
  .mk--drag:hover { filter: saturate(1.6) brightness(0.95); }
  .mk__px { padding: 0 4px; border-radius: 3px; background: rgba(0, 0, 0, 0.72); color: #fff; font: 550 10px/15px 'Design Layer UI', Inter, sans-serif; white-space: nowrap; }
  .canvas[data-before]::before { content: 'Before'; position: sticky; top: 12px; float: left; margin: 12px 0 0 12px; z-index: 6; padding: 0 8px; border-radius: 4px; background: #1e1e1e; color: #fff; font: 550 11px/22px 'Design Layer UI', Inter, sans-serif; }
`;

// ── state ──────────────────────────────────────────────────────────────────
type Scope = 'all' | 'one';
interface Change { key: string; who: string; what: string; from: string; to: string; fromTok?: string; toTok?: string; scope: string; undo: () => void; redo: () => void; check?: string }
const changes = new Map<string, Change>();
interface Step { key: string; prev: Change | undefined; next: Change | undefined; apply: (on: boolean) => void }
const history: Step[] = [];
const future: Step[] = [];
let selected: HTMLElement | null = null;
let scope: Scope = 'all';
let view: 'edit' | 'review' = 'edit';
let tool: 'select' | 'comment' = 'select';
let sent = false;
let leverOver: Overlay | undefined;
let canvasOver = false;
let dragging = false;
let before = false;
const pageSeeds: Record<string, string> = { brand: 'grass', neutral: 'gray', corners: 'soft', density: '1', scale: '1' };
const comments = [{ who: 'Page Title', text: 'Header feels crowded against the cards' }];
const evals: (() => void)[] = [];

const varName = (k: string, id: string) => `--m-${k}-${id}`;
const targetFor = (el: HTMLElement) => (scope === 'all' ? root : el);
const readVar = (el: HTMLElement, k: string, id: string) => (el.style.getPropertyValue(varName(k, id)) || root.style.getPropertyValue(varName(k, id))).trim();
const valueOf = (el: HTMLElement, k: string, id: string, d: string) => readVar(el, k, id) || (d.startsWith('--') ? `var(${d})` : d);
const rungAt = (rungs: Rung[], v: string) => Math.max(0, rungs.findIndex((r) => r.value === v || r.token === v));
const peersOf = (k: string) => [...document.querySelectorAll<HTMLElement>(`[data-k="${k}"]`)];
const cs = (el: Element) => getComputedStyle(el);
const firstOf = (k: string) => document.querySelector<HTMLElement>(`[data-k="${k}"]`)!;

function record(c: Omit<Change, 'undo' | 'redo'>, apply: (on: boolean) => void) {
  const prev = changes.get(c.key);
  const next: Change = { ...c, from: prev?.from ?? c.from, fromTok: prev ? prev.fromTok : c.fromTok, undo: prev ? prev.undo : () => apply(false), redo: () => apply(true) };
  if (next.from === next.to) changes.delete(c.key); else changes.set(c.key, next);
  history.push({ key: c.key, prev, next: changes.get(c.key), apply });
  future.length = 0;
  sent = false;
}

/** Writes a rung to one or more of an element's variables, at the current scope, and records it. */
function commit(el: HTMLElement, k: string, id: string, what: string, from: Rung, to: Rung, show: (r: Rung) => string, vars: string[] = [id]) {
  const tgt = targetFor(el);
  const prev = vars.map((v) => tgt.style.getPropertyValue(varName(k, v)));
  for (const v of vars) tgt.style.setProperty(varName(k, v), to.value);
  const who = scope === 'all' ? KINDS[k].plural : `This ${KINDS[k].name}`;
  const key = `${k}|${scope}|${id}`;
  record({ key, who, what, from: show(from), to: show(to), fromTok: from.token, toTok: to.token, scope: scope === 'all' ? `All ${peersOf(k).length}` : 'Just this one' },
    (on) => vars.forEach((v, i) => { if (on) tgt.style.setProperty(varName(k, v), to.value); else if (prev[i]) tgt.style.setProperty(varName(k, v), prev[i]); else tgt.style.removeProperty(varName(k, v)); }));
  return key;
}

// ── evaluation: one line under a lever, measured off the page ──────────────
interface Verdict { text: string | null; warn?: boolean }

function contentsOf(el: HTMLElement) {
  return [...(el.dataset.k === 'icon' ? [el] : el.querySelectorAll<HTMLElement>('[data-k]'))].map((c) => {
    const icon = c.dataset.k === 'icon';
    return { floor: icon ? 3 : textFloor(c), color: () => cs(icon ? c.querySelector('svg')! : c).color };
  });
}
/** A content's contrast scaled so 4.5 always means "just passes", whatever its own floor. */
const worstOn = (parts: ReturnType<typeof contentsOf>, bg: string) => Math.min(...parts.map((p) => (ratio(p.color(), bg) / p.floor) * 4.5));

function evaluate(d: LeverDef, k: string, el: HTMLElement): Verdict {
  switch (d.role) {
    case 'text-color': case 'icon-color': {
      const floor = d.role === 'icon-color' ? 3 : textFloor(el);
      const target = d.role === 'icon-color' ? el.querySelector('svg')! : el;
      const r = inSchemes(() => ratio(cs(target).color, opaqueBg(el)));
      const fail = Math.min(r.light, r.dark) < floor;
      return { text: `${fmt(r.light)} light · ${fmt(r.dark)} dark${fail ? ` · under ${floor}:1` : ''}`, warn: fail };
    }
    case 'fill': {
      const parts = contentsOf(el);
      const worst = inSchemes(() => worstOn(parts, cs(el).backgroundColor));
      const edge = inSchemes(() => ratio(cs(el).backgroundColor, opaqueBg(el.parentElement)));
      const w = Math.min(worst.light, worst.dark);
      const e = Math.min(edge.light, edge.dark);
      if (w < 4.5) return { text: `Contents fall to ${fmt(w)} on this fill`, warn: true };
      if (k === 'card' && e < 1.2 && pxOf(cs(el).borderTopWidth) === 0) return { text: `No border, and the fill matches the page (${fmt(e)})`, warn: true };
      return { text: `Contents ${fmt(w)} at worst · edge ${fmt(e)}` };
    }
    case 'border-color': {
      const r = inSchemes(() => ratio(cs(el).borderTopColor, opaqueBg(el.parentElement)));
      return { text: `Against the page ${fmt(r.light)} light · ${fmt(r.dark)} dark` };
    }
    case 'border-width': {
      if (pxOf(cs(el).borderTopWidth) > 0) return { text: null };
      const e = Math.min(...Object.values(inSchemes(() => ratio(cs(el).backgroundColor, opaqueBg(el.parentElement)))));
      return e < 1.2 ? { text: `No edge: the fill matches the page (${fmt(e)})`, warn: true } : { text: null };
    }
    case 'type-size': {
      const own = pxOf(cs(el).fontSize);
      const tokenName = valueOf(el, k, d.id, d.kind === 'pair' ? d.def[0] : d.def).match(/--[\w-]+/)?.[0];
      const rem = [...(tokenName ? cs(root).getPropertyValue(tokenName) : '').matchAll(/([\d.]+)rem/g)].map((m) => Number(m[1]) * 16);
      const range = rem.length >= 2 ? `phone ${Math.round(rem[0])} px, wide ${Math.round(rem[rem.length - 1])} px` : '';
      const others = Object.keys(KINDS).filter((o) => o !== k && KINDS[o].canvas?.includes('lines')).map((o) => ({ o, s: pxOf(cs(firstOf(o)).fontSize) }));
      const same = others.find((x) => Math.abs(x.s - own) < 0.5);
      if (same) return { text: `Same size as the ${KINDS[same.o].name}`, warn: true };
      const rank = others.filter((x) => x.s > own).length + 1;
      const place = rank === 1 ? 'Largest text' : `${['', '', '2nd', '3rd', '4th', '5th'][rank] ?? `${rank}th`} largest`;
      return { text: range ? `${place} · ${range}` : place };
    }
    case 'leading': {
      const lh = pxOf(cs(el).lineHeight) || pxOf(cs(el).fontSize) * 1.2;
      return { text: `${Math.round(lh)} px lines on ${Math.round(pxOf(cs(el).fontSize))} px text` };
    }
    case 'padding': {
      const pad = Math.min(pxOf(cs(el).paddingLeft), pxOf(cs(el).paddingTop));
      const inside = pxOf(cs(el).rowGap);
      const between = pxOf(cs(el.parentElement!).columnGap);
      if (pad < inside) return { text: `Tighter than the ${inside} px gap inside`, warn: true };
      return { text: `Gap inside ${inside} px · between cards ${between} px` };
    }
    case 'gap-inside': case 'gap-between': {
      const c = d.role === 'gap-inside' ? el : firstOf('card');
      const inside = pxOf(cs(c).rowGap);
      const between = pxOf(cs(c.parentElement!).columnGap);
      if (inside >= between) return { text: `Inside ${inside} px, between ${between} px: the cards stop reading as groups`, warn: true };
      return { text: `Inside a card ${inside} px · between cards ${between} px` };
    }
    case 'corners': {
      const badge = el.querySelector('.ico');
      const outer = pxOf(cs(el).borderTopLeftRadius);
      const inner = badge ? pxOf(cs(badge).borderTopLeftRadius) : 0;
      if (badge && inner > outer) return { text: `The icon badge inside (${inner} px) is rounder than the card`, warn: true };
      return { text: badge ? `Icon badge inside ${inner} px` : null };
    }
    case 'icon-size': {
      const label = el.closest('.card')?.querySelector('.label');
      return { text: label ? `Pairs with the ${Math.round(pxOf(cs(label).fontSize))} px label` : null };
    }
    case 'columns': return { text: `Cards ${Math.round(firstOf('card').getBoundingClientRect().width)} px wide` };
    default: return { text: null };
  }
}
/** Which swatches a check would fail on, before they are picked. */
function failsFor(d: LeverDef, el: HTMLElement): ((r: Rung) => boolean) | null {
  if (d.role === 'text-color' || d.role === 'icon-color') {
    const floor = d.role === 'icon-color' ? 3 : textFloor(el);
    return (r) => Math.min(...Object.values(inSchemes(() => ratio(resolve(r.value), opaqueBg(el))))) < floor;
  }
  if (d.role === 'fill') {
    const parts = contentsOf(el);
    return (r) => Math.min(...Object.values(inSchemes(() => worstOn(parts, resolve(r.value))))) < 4.5;
  }
  return null;
}
/** The rung the system would pick here, where one follows from what is around it. */
function suggestFor(d: LeverDef, el: HTMLElement): number | null {
  if (d.role === 'leading') return pxOf(cs(el).fontSize) >= 24 ? 1 : 2;
  if (d.role === 'icon-size') {
    const label = el.closest('.card')?.querySelector('.label');
    return label ? nearest(ICON.map((r) => num(r)), pxOf(cs(label).fontSize) * 1.25) : null;
  }
  return null;
}

// ── panel ──────────────────────────────────────────────────────────────────
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });
const theme = new URLSearchParams(location.search).get('theme') === 'light' ? 'light' : 'dark';
shadow.innerHTML = `<style>${UI_CSS}${LEVER_CSS}${PANEL_CSS()}</style>`;
const ui = h('div', { class: 'ui', 'data-theme': theme });
shadow.append(ui);
const body = h('div', { class: 'p-body' });
const foot = h('div', { class: 'cx-foot' });

const tools = segmented({ label: 'Tool', icons: true, options: [{ value: 'select', icon: 'cursor', label: 'Select (V)' }, { value: 'comment', icon: 'comment', label: 'Comment (C)' }], onChange: (v) => { tool = v; tools.set(v); } });
tools.set('select');
const undoBtn = iconButton('undo', 'Undo (⌘Z)', () => step(false));
const redoBtn = iconButton('redo', 'Redo (⇧⌘Z)', () => step(true));
const schemeBtn = iconButton('moon', 'Dark Page', () => {
  const dark = root.dataset.scheme !== 'dark';
  root.dataset.scheme = dark ? 'dark' : 'light';
  schemeBtn.replaceChildren(iconButton(dark ? 'sun' : 'moon', '', () => {}).firstChild!);
  schemeBtn.setAttribute('aria-label', dark ? 'Light Page' : 'Dark Page');
  render();
});
ui.append(h('aside', { class: 'p cx', 'aria-label': 'Design Layer' },
  h('div', { class: 'p-top' }, tools.el, h('span', { class: 'grow' }), undoBtn, redoBtn, schemeBtn, iconButton('kebab', 'More', () => {})),
  body, foot));

function step(redo: boolean) {
  const e = (redo ? future : history).pop();
  if (!e) return;
  e.apply(redo);
  const c = redo ? e.next : e.prev;
  if (c) changes.set(e.key, c); else changes.delete(e.key);
  (redo ? history : future).push(e);
  render();
}

function head(title: string, sub?: Node) {
  return h('div', { class: 'cx-head' }, h('div', { class: 'cx-title' }, title), sub ?? null);
}

interface Lever { note: (t: string | null, tone?: 'warn') => void }
function leverFor(def: LeverDef, k: string, el: HTMLElement) {
  const overlay = 'overlay' in def ? def.overlay : undefined;
  const onHover = overlay ? (on: boolean) => { leverOver = on ? overlay : undefined; paintMarks(); } : undefined;
  const originOf = (id: string, rungs: Rung[], cur: number) => {
    const c = changes.get(`${k}|${scope}|${id}`);
    if (!c) return cur;
    const i = rungs.findIndex((r) => (c.fromTok ? r.token === c.fromTok : showName(r) === c.from || r.value === c.from));
    return i < 0 ? cur : i;
  };
  let lever: Lever;
  const after = (key?: string) => {
    const v = evaluate(def, k, el);
    lever.note(v.text, v.warn ? 'warn' : undefined);
    const c = key ? changes.get(key) : undefined;
    if (c) c.check = v.warn ? v.text ?? undefined : undefined;
  };
  let node: HTMLElement;
  if (def.kind === 'ramp') {
    let cur = rungAt(def.rungs, valueOf(el, k, def.id, def.def));
    const lv = rampLever({ label: def.label, rungs: def.rungs, show: def.show, onHover, onChange: (i) => {
      const key = commit(el, k, def.id, def.label, def.rungs[cur], def.rungs[i], def.show); cur = i; after(key); changed();
    } });
    lv.set(cur, originOf(def.id, def.rungs, cur));
    lv.suggest(suggestFor(def, el));
    lever = lv; node = lv.el;
  } else if (def.kind === 'swatch') {
    const curV = valueOf(el, k, def.id, def.def);
    const base = def.rungs[rungAt(def.rungs, curV)];
    const more = hueRamp(/brand/.test(base.value) ? pageSeeds.brand : pageSeeds.neutral);
    const all = [...def.rungs, ...more];
    let now = all.find((r) => r.value === curV) ?? base;
    const show = (r: Rung) => r.name ?? '';
    const lv = swatchLever({ label: def.label, rungs: def.rungs, more, onChange: (r) => {
      const key = commit(el, k, def.id, def.label, now, r, show); now = r; after(key); changed();
    } });
    const c = changes.get(`${k}|${scope}|${def.id}`);
    lv.set(now, c ? all.find((r) => r.token === c.fromTok) ?? now : now);
    const fails = failsFor(def, el);
    if (fails) lv.marks(fails);
    lever = lv; node = lv.el;
  } else {
    let cx = rungAt(def.rungs, valueOf(el, k, `${def.id}-x`, def.def[0]));
    let cy = rungAt(def.rungs, valueOf(el, k, `${def.id}-y`, def.def[1]));
    const lv = pairLever({ label: def.label, labels: ['X', 'Y'], rungs: def.rungs, show: def.show, onHover, onChange: (x, y) => {
      let key: string | undefined;
      if (x === y && cx === cy) key = commit(el, k, def.id, def.label, def.rungs[cx], def.rungs[x], def.show, [`${def.id}-x`, `${def.id}-y`]);
      else {
        if (x !== cx) key = commit(el, k, `${def.id}-x`, `${def.label} X`, def.rungs[cx], def.rungs[x], def.show);
        if (y !== cy) key = commit(el, k, `${def.id}-y`, `${def.label} Y`, def.rungs[cy], def.rungs[y], def.show);
      }
      cx = x; cy = y; after(key); changed();
    } });
    const linked = changes.get(`${k}|${scope}|${def.id}`);
    const lo = linked ? def.rungs.findIndex((r) => r.token === linked.fromTok) : -1;
    lv.set(cx, cy, [lo >= 0 ? lo : originOf(`${def.id}-x`, def.rungs, cx), lo >= 0 ? lo : originOf(`${def.id}-y`, def.rungs, cy)]);
    lever = lv; node = lv.el;
  }
  evals.push(() => after());
  return node;
}

/** After any change: every lever re-measures (a fill change moves the border's verdict), the marks repaint. */
function changed() {
  for (const e of evals) e();
  paintFooter();
  paintMarks();
}

function renderSelection(el: HTMLElement) {
  const k = el.dataset.k!;
  const kind = KINDS[k];
  const n = peersOf(k).length;
  const sc = segmented<Scope>({ label: 'Applies to', options: [{ value: 'all', label: n > 1 ? `All ${n}` : 'All' }, { value: 'one', label: 'This One' }], onChange: (v) => { scope = v; render(); } });
  sc.set(scope);
  sc.el.classList.add('cx-scope');
  body.replaceChildren(
    head(kind.name, sc.el),
    ...kind.groups.map((g) => section({ id: `cx-${k}-${g.title}`, title: g.title, body: g.levers.map((d) => leverFor(d, k, el)) }).el),
  );
  for (const e of evals) e();
}

function renderPage() {
  const seed = (id: string, label: string, rungs: Rung[], show: (r: Rung) => string, apply: (v: string) => void) => {
    let cur = rungs.findIndex((r) => r.value === pageSeeds[id]);
    const c = changes.get(`page|${id}`);
    const o = c ? rungs.findIndex((r) => showName(r) === c.from) : cur;
    const lv = rampLever({ label, rungs, show, onChange: (i) => {
      const from = rungs[cur]; const to = rungs[i]; const prev = pageSeeds[id];
      pageSeeds[id] = to.value; apply(to.value); cur = i;
      record({ key: `page|${id}`, who: 'Page', what: label, from: show(from), to: show(to), scope: 'Theme' }, (on) => { pageSeeds[id] = on ? to.value : prev; apply(pageSeeds[id]); });
      changed();
    } });
    lv.set(cur, o);
    return lv.el;
  };
  const hueSeed = (id: string, label: string, hues: string[], stepN: number, apply: (v: string) => void, check: (hue: string) => Verdict) => {
    const rungs: Rung[] = hues.map((n) => ({ value: `var(--color-${n}-${stepN})`, name: n[0].toUpperCase() + n.slice(1), token: `--color-${n}-${stepN}` }));
    let cur = rungs[hues.indexOf(pageSeeds[id])];
    const c = changes.get(`page|${id}`);
    const note = () => { const v = check(pageSeeds[id]); lv.note(v.text, v.warn ? 'warn' : undefined); const ch = changes.get(`page|${id}`); if (ch) ch.check = v.warn ? v.text ?? undefined : undefined; };
    const lv = swatchLever({ label, rungs, onChange: (r) => {
      const prev = pageSeeds[id]; const name = hues[rungs.indexOf(r)];
      pageSeeds[id] = name; apply(name);
      record({ key: `page|${id}`, who: 'Page', what: label, from: cur.name!, to: r.name!, scope: 'Theme' }, (on) => { pageSeeds[id] = on ? name : prev; apply(pageSeeds[id]); });
      cur = r; note(); changed();
    } });
    lv.set(cur, c ? rungs.find((r) => r.name === c.from) ?? cur : cur);
    lv.marks((r) => !!check(hues[rungs.indexOf(r)]).warn);
    note();
    return lv.el;
  };
  // A brand works if its button text reads on its fill: that is what a primary button asks of it.
  const brandCheck = (hue: string): Verdict => {
    const w = Math.min(...Object.values(inSchemes(() => ratio(resolve('var(--color-content-on-brand)'), resolve(`var(--color-${hue}-9)`)))));
    return w < 4.5 ? { text: `Button text ${fmt(w)} on this brand · under 4.5:1`, warn: true } : { text: `Button text ${fmt(w)}` };
  };
  const neutralCheck = (n: string): Verdict => ({ text: `Body text ${fmt(ratio(resolve(`var(--color-${n}-12)`), resolve(`var(--color-${n}-1)`)))}` });
  body.replaceChildren(
    head('Page'),
    section({ id: 'cx-color', title: 'Color', body: [hueSeed('brand', 'Brand', BRANDS, 9, applyBrand, brandCheck), hueSeed('neutral', 'Neutral', NEUTRALS, 11, applyNeutral, neutralCheck)] }).el,
    section({ id: 'cx-shape', title: 'Shape', body: [seed('corners', 'Corners', CORNERS, showName, applyCorners)] }).el,
    section({ id: 'cx-rhythm', title: 'Rhythm', body: [seed('density', 'Density', DENSITY, showName, (v) => root.style.setProperty('--m-density', v)), seed('scale', 'Type Scale', SCALE, showName, (v) => root.style.setProperty('--m-scale', v))] }).el,
  );
}

function applyBrand(hue: string) {
  const s = root.style;
  s.setProperty('--color-background-brand', `var(--color-${hue}-9)`);
  s.setProperty('--color-background-brand-muted', `var(--color-${hue}-3)`);
  s.setProperty('--color-background-brand-subtle', `var(--color-${hue}-1)`);
  s.setProperty('--color-content-brand', `var(--color-${hue}-11)`);
  s.setProperty('--color-border-default-focus', `var(--color-${hue}-10)`);
}
function applyNeutral(n: string) {
  const s = root.style;
  const map: Record<string, number> = { '--color-content-default': 12, '--color-content-default-secondary': 11, '--color-content-disabled': 9, '--color-border-default': 7, '--color-border-default-subtle': 6, '--color-border-default-strong': 8, '--color-background-default': 1, '--color-background-elevation-sunken': 3 };
  for (const [v, stepN] of Object.entries(map)) s.setProperty(v, `var(--color-${n}-${stepN})`);
}
function applyCorners(c: string) {
  const m: Record<string, [string, string, string]> = { flat: ['--radius-050', '--radius-050', '--radius-100'], soft: ['--radius-100', '--radius-200', '--radius-400'], round: ['--radius-200', '--radius-400', '--radius-500'] };
  const [sm, md, lg] = m[c];
  root.style.setProperty('--radius-sm', `var(${sm})`);
  root.style.setProperty('--radius-md', `var(${md})`);
  root.style.setProperty('--radius-lg', `var(${lg})`);
}

// The review: every change as one row, flagged where its check failed, and the handoff.
function renderReview() {
  const byWho = new Map<string, Change[]>();
  for (const c of changes.values()) byWho.set(c.who, [...(byWho.get(c.who) ?? []), c]);
  const back = iconButton('chevron', 'Back to Editing', () => { view = 'edit'; render(); });
  back.classList.add('cx-back');
  const list = h('div', { class: 'cx-list' });
  for (const [who, group] of byWho) {
    list.append(h('div', { class: 'cx-grp' }, who));
    for (const c of group) {
      const revert = iconButton('reset', `Revert ${c.what}`, () => { c.undo(); changes.delete(c.key); render(); });
      list.append(h('div', { class: 'cx-row', title: [c.fromTok, c.toTok].filter(Boolean).join(' → ') },
        h('span', { class: 'cx-row__what' }, c.what),
        h('span', { class: 'cx-row__v' }, h('span', { class: 'cx-row__from' }, c.from), ' → ', c.to),
        revert,
        ...(c.check ? [h('span', { class: 'cx-row__check' }, c.check)] : [])));
    }
  }
  if (comments.length) {
    list.append(h('div', { class: 'cx-grp' }, 'Comments'));
    for (const c of comments) list.append(h('div', { class: 'cx-row cx-row--c' }, h('span', { class: 'cx-row__what' }, c.who), h('span', { class: 'cx-row__note' }, c.text)));
  }
  const prev = h('details', { class: 'cx-prev' }, h('summary', {}, 'design/changes.md'), h('pre', { class: 'cx-md' }, changesMd()));
  body.replaceChildren(h('div', { class: 'cx-head cx-head--back' }, back, h('div', { class: 'cx-title' }, 'Changes')), list, prev);
}

function changesMd() {
  const lines = ['# Design changes', '', '/dashboard · Radial', ''];
  for (const c of changes.values()) {
    lines.push(`- ${c.who} · ${c.what}: ${c.from} → ${c.to}${c.toTok ? ` (${c.fromTok ?? '?'} → ${c.toTok})` : ''} · ${c.scope}`);
    if (c.check) lines.push(`  - check: ${c.check}`);
  }
  for (const c of comments) lines.push(`- Comment on ${c.who}: "${c.text}"`);
  return lines.join('\n');
}

/** Hold to see the page as it was: every change off, then back on in order. */
function compare(on: boolean) {
  if (before === on) return;
  before = on;
  const list = [...changes.values()];
  if (on) list.reverse().forEach((c) => c.undo()); else list.forEach((c) => c.redo());
  canvas.toggleAttribute('data-before', on);
  paintMarks();
}

function paintFooter() {
  const n = changes.size + comments.length;
  undoBtn.disabled = !history.length;
  redoBtn.disabled = !future.length;
  const send = h('button', { type: 'button', class: 'btn btn--primary cx-send', disabled: !n || sent }, sent ? 'Sent' : 'Send to Claude');
  send.addEventListener('click', () => { sent = true; paintFooter(); });
  if (view === 'review') {
    const keep = h('button', { type: 'button', class: 'btn' }, 'Keep Editing');
    keep.addEventListener('click', () => { view = 'edit'; render(); });
    foot.replaceChildren(send, keep, ...(sent ? [h('span', { class: 'cx-chip' }, 'Prompt Copied')] : []));
    return;
  }
  const count = h('button', { type: 'button', class: 'btn cx-count', disabled: !n }, n ? `${n} ${n === 1 ? 'Change' : 'Changes'}` : 'No Changes');
  count.addEventListener('click', () => { view = 'review'; render(); });
  const hold = h('button', { type: 'button', class: 'btn cx-before', disabled: !changes.size, title: 'Hold to see the page before your changes (B)' }, 'Before');
  hold.addEventListener('pointerdown', () => compare(true));
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, () => compare(false));
  foot.replaceChildren(count, hold, h('span', { class: 'grow' }), send);
}

function render() {
  evals.length = 0;
  if (view === 'review') renderReview();
  else if (selected) renderSelection(selected);
  else renderPage();
  paintFooter();
  paintMarks();
}

// ── marks on the canvas ────────────────────────────────────────────────────
canvas.innerHTML = PAGE;
document.body.append(canvas, host);
let hoverEl: HTMLElement | null = null;
type Box = { left: number; top: number; width: number; height: number };
const at = (r: Box, cls: string) => {
  const c = canvas.getBoundingClientRect();
  const m = h('div', { class: `mk ${cls}` });
  Object.assign(m.style, { left: `${r.left - c.left + canvas.scrollLeft}px`, top: `${r.top - c.top + canvas.scrollTop}px`, width: `${Math.max(0, r.width)}px`, height: `${Math.max(0, r.height)}px` });
  return m;
};
const tagPx = (m: HTMLElement, v: number) => { if (v >= 6) m.append(h('span', { class: 'mk__px' }, String(Math.round(v)))); return m; };

/** Drag a band on the page and the space snaps along its ramp; the lever follows on release. */
function draggable(m: HTMLElement, el: HTMLElement, k: string, id: 'pad-x' | 'pad-y' | 'gap', axis: 'x' | 'y', dir: 1 | -1, start: number) {
  m.classList.add('mk--drag');
  m.dataset.axis = axis;
  m.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    dragging = true;
    const ladder = SPACE.map((r) => num(r));
    let cur = nearest(ladder, start);
    const x0 = e.clientX; const y0 = e.clientY;
    const linked = id !== 'gap' && pxOf(cs(el).paddingTop) === pxOf(cs(el).paddingLeft) && !e.altKey;
    const move = (ev: PointerEvent) => {
      const i = nearest(ladder, start + (axis === 'x' ? ev.clientX - x0 : ev.clientY - y0) * dir);
      if (i === cur) return;
      if (linked) commit(el, k, 'pad', 'Padding', SPACE[cur], SPACE[i], showPx, ['pad-x', 'pad-y']);
      else commit(el, k, id, id === 'pad-x' ? 'Padding X' : id === 'pad-y' ? 'Padding Y' : 'Gap', SPACE[cur], SPACE[i], showPx);
      cur = i;
      paintMarks();
      paintFooter();
    };
    const up = () => { dragging = false; window.removeEventListener('pointermove', move); render(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  });
}

function overlaysNow(): Overlay[] {
  if (!selected || before) return [];
  if (leverOver) return [leverOver];
  if (canvasOver || dragging) return KINDS[selected.dataset.k!].canvas ?? [];
  return [];
}

function paintMarks() {
  canvas.querySelectorAll('.mk').forEach((m) => m.remove());
  if (hoverEl && hoverEl !== selected && !dragging) canvas.append(at(hoverEl.getBoundingClientRect(), 'mk--hover'));
  if (!selected) return;
  const k = selected.dataset.k!;
  const peers = scope === 'all' ? peersOf(k) : [selected];
  for (const p of peers) if (p !== selected) canvas.append(at(p.getBoundingClientRect(), 'mk--sib'));
  const sel = at(selected.getBoundingClientRect(), 'mk--sel');
  sel.append(h('span', { class: 'mk__tag' }, KINDS[k].name));
  canvas.append(sel);
  for (const o of overlaysNow()) for (const p of peers) {
    const r = p.getBoundingClientRect();
    const s = cs(p);
    const own = p === selected;
    if (o === 'padding') {
      const b = pxOf(s.borderTopWidth);
      const [t, ri, bo, l] = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(pxOf);
      const inner = r.height - 2 * b - t - bo;
      const bands: [Box, 'pad-x' | 'pad-y', 'x' | 'y', 1 | -1, number][] = [
        [{ left: r.left + b, top: r.top + b, width: r.width - 2 * b, height: t }, 'pad-y', 'y', 1, t],
        [{ left: r.left + b, top: r.bottom - b - bo, width: r.width - 2 * b, height: bo }, 'pad-y', 'y', -1, bo],
        [{ left: r.left + b, top: r.top + b + t, width: l, height: inner }, 'pad-x', 'x', 1, l],
        [{ left: r.right - b - ri, top: r.top + b + t, width: ri, height: inner }, 'pad-x', 'x', -1, ri],
      ];
      bands.forEach(([box, id, axis, dir, v], i) => {
        const m = at(box, 'mk--pad');
        if (own) { if (i === 0 || i === 2) tagPx(m, v); draggable(m, p, k, id, axis, dir, v); }
        canvas.append(m);
      });
    } else if (o === 'gap') {
      const kids = [...p.children].map((c) => c.getBoundingClientRect());
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1]; const bb = kids[i];
        const row = Math.abs(a.top - bb.top) < 2;
        const box: Box = row
          ? { left: a.right, top: a.top, width: bb.left - a.right, height: a.height }
          : { left: r.left + pxOf(s.borderLeftWidth) + pxOf(s.paddingLeft), top: a.bottom, width: p.clientWidth - pxOf(s.paddingLeft) - pxOf(s.paddingRight), height: bb.top - a.bottom };
        const m = at(box, 'mk--gap');
        const v = row ? box.width : box.height;
        if (own) { tagPx(m, v); draggable(m, p, k, 'gap', row ? 'x' : 'y', 1, v); }
        canvas.append(m);
      }
    } else if (o === 'lines' && own) {
      const lh = pxOf(s.lineHeight) || pxOf(s.fontSize) * 1.2;
      const n = Math.max(1, Math.round(r.height / lh));
      for (let i = 0; i < n; i++) canvas.append(tagPx(at({ left: r.left, top: r.top + i * lh, width: r.width, height: lh }, 'mk--line'), i === 0 ? lh : 0));
    }
  }
}
canvas.addEventListener('pointermove', (e) => {
  if (dragging) return;
  const tgt = e.target as HTMLElement;
  if (tgt.classList.contains('mk')) return;
  const t = tgt.closest<HTMLElement>('[data-k]');
  const over = !!selected && selected.contains(tgt);
  if (t !== hoverEl || over !== canvasOver) { hoverEl = t; canvasOver = over; paintMarks(); }
});
canvas.addEventListener('pointerleave', () => { if (dragging) return; hoverEl = null; canvasOver = false; paintMarks(); });
canvas.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).classList.contains('mk')) return;
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
  if (tool === 'comment' && t) return;
  selected = t;
  view = 'edit';
  render();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) { selected = null; render(); }
  if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.repeat && changes.size) compare(true);
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); step(e.shiftKey); }
});
document.addEventListener('keyup', (e) => { if (e.key.toLowerCase() === 'b') compare(false); });

function PANEL_CSS() {
  return `
  .ui.ui { height: 100vh; }
  .cx { width: 296px; height: 100vh; border-radius: 0; border-width: 0 0 0 1px; }
  .cx .p-top { gap: 2px; padding: 8px; }
  .cx .seg--icons button { width: 32px; }
  .cx-head { display: grid; gap: 8px; padding: 14px 16px 12px; border-bottom: 1px solid var(--line); }
  .cx-title { font-size: 13px; line-height: 20px; font-weight: 550; }
  .cx-scope { width: 100%; }
  .cx-scope button { flex: 1; }
  .cx-head--back { display: flex; align-items: center; gap: 4px; padding-left: 8px; }
  .cx-back svg { rotate: 90deg; }
  .cx-foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--line); flex: none; }
  .cx-foot .grow { flex: 1; }
  .cx-before { user-select: none; touch-action: none; }
  .cx-chip { margin-left: auto; padding: 0 8px; border-radius: 4px; background: var(--chip); color: var(--ink-2); line-height: 20px; }
  .cx-list { padding: 4px 0 12px; }
  .cx-grp { padding: 12px 16px 4px; color: var(--ink-2); font-weight: 550; }
  .cx-row { display: grid; grid-template-columns: 1fr auto 24px; align-items: center; column-gap: 8px; min-height: 32px; padding: 0 8px 0 16px; }
  .cx-row:hover { background: var(--hover); }
  .cx-row__v { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .cx-row__from { color: var(--ink-2); }
  .cx-row__check { grid-column: 1 / -1; margin: -6px 0 6px; color: var(--danger); }
  .cx-row--c { grid-template-columns: auto 1fr; padding-block: 6px; padding-right: 16px; align-items: start; }
  .cx-row__note { min-width: 0; color: var(--ink-2); }
  .cx-prev { margin: 0 16px 16px; border: 1px solid var(--line); border-radius: 6px; }
  .cx-prev summary { padding: 8px 10px; color: var(--ink-2); cursor: pointer; font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
  .cx-md { margin: 0; padding: 0 10px 10px; white-space: pre-wrap; color: var(--ink); font: 10.5px/16px ui-monospace, 'SF Mono', Menlo, monospace; }
  `;
}

// ── a state from the URL, for the screenshots ──────────────────────────────
const q = new URLSearchParams(location.search);
const st = q.get('state');
const pageStyle = document.createElement('style');
pageStyle.textContent = PAGE_CSS;
document.head.append(pageStyle);
render();
requestAnimationFrame(() => {
  const fire = (sel: string) => { selected = canvas.querySelector<HTMLElement>(sel)!; render(); };
  const press = (label: string, key: string, times = 1) => {
    const track = [...body.querySelectorAll<HTMLElement>('.lv__track')].find((t) => t.getAttribute('aria-label') === label);
    for (let i = 0; i < times; i++) track?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };
  const swatch = (name: string) => [...body.querySelectorAll<HTMLElement>('.lv__c')].find((c) => c.getAttribute('aria-label') === name)?.click();
  if (st === 'card' || st === 'review' || st === 'before') {
    fire('.card');
    press('Padding', 'ArrowRight');
    press('Corners', 'ArrowRight');
    if (st === 'card') { canvasOver = true; paintMarks(); }
    else {
      press('Gap', 'ArrowRight', 3);
      fire('.value');
      press('Size', 'ArrowLeft');
      selected = null; render();
      swatch('Teal');
      if (st === 'review') { view = 'review'; render(); } else compare(true);
    }
  } else if (st === 'text') { fire('.value'); canvasOver = true; paintMarks(); }
  else if (st === 'size') { fire('.value'); press('Size', 'ArrowLeft', 2); }
  else if (st === 'color') { fire('.caption'); swatch('Disabled'); }
  else if (st === 'icon') { fire('.ico'); press('Size', 'ArrowLeft', 2); }
  else if (st === 'brand') { swatch('Amber'); }
});
