// The levers concept: the design layer reconceived around the system's ramps.
// A mock page on the hub's real tokens and face, and the panel driving it:
// select something, pull its levers, send the changes to Claude.
//
// ?state=page | card | text | review   ?hover=padding|gap   ?theme=light
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

// What a rung renders as, measured on a probe so a clamp() reads at this viewport.
const probe = document.createElement('div');
probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
const px = (r: Rung, prop: 'width' | 'font-size' = 'width') => {
  if (!probe.isConnected) document.querySelector('.canvas')!.append(probe);
  probe.style.setProperty(prop, r.value);
  const v = Number.parseFloat(getComputedStyle(probe).getPropertyValue(prop));
  return `${Math.round(v * 10) / 10}`;
};
const showPx = (r: Rung) => `${px(r)} px`;
const showFont = (r: Rung) => `${px(r, 'font-size')} px`;
const showName = (r: Rung) => r.name ?? r.value;
const showNamePx = (r: Rung) => (r.value === '0px' ? 'None' : r.value.includes('pill') ? 'Pill' : `${r.name} · ${px(r)} px`);

// ── the elements and their levers ──────────────────────────────────────────
type LeverDef =
  | { id: string; label: string; kind: 'ramp'; rungs: Rung[]; show: (r: Rung) => string; def: string; overlay?: 'padding' | 'gap' }
  | { id: string; label: string; kind: 'swatch'; rungs: Rung[]; def: string; hue?: string }
  | { id: string; label: string; kind: 'pair'; rungs: Rung[]; show: (r: Rung) => string; def: [string, string]; overlay?: 'padding' };
interface Group { title: string; levers: LeverDef[] }
interface Kind { name: string; plural: string; groups: Group[] }

const textGroup = (size: string, weight: string, lead: string, color: string): Group => ({ title: 'Text', levers: [
  { id: 'size', label: 'Size', kind: 'ramp', rungs: SIZE, show: showFont, def: size },
  { id: 'weight', label: 'Weight', kind: 'ramp', rungs: WEIGHT, show: showName, def: weight },
  { id: 'lh', label: 'Line Height', kind: 'ramp', rungs: LEADING, show: showName, def: lead },
  { id: 'color', label: 'Color', kind: 'swatch', rungs: TEXT, def: color },
] });
const KINDS: Record<string, Kind> = {
  card: { name: 'Stat Card', plural: 'Stat Cards', groups: [
    { title: 'Box', levers: [
      { id: 'fill', label: 'Fill', kind: 'swatch', rungs: FILL, def: '--color-background-default' },
      { id: 'pad', label: 'Padding', kind: 'pair', rungs: SPACE, show: showPx, def: ['--spacing-400', '--spacing-400'], overlay: 'padding' },
      { id: 'radius', label: 'Corners', kind: 'ramp', rungs: RADIUS, show: showNamePx, def: '--radius-md' },
    ] },
    { title: 'Border', levers: [
      { id: 'bw', label: 'Width', kind: 'ramp', rungs: WIDTH, show: (r) => (r.value === '0px' ? 'None' : showPx(r)), def: '--border-width-100' },
      { id: 'bc', label: 'Color', kind: 'swatch', rungs: LINE, def: '--color-border-default-subtle' },
    ] },
    { title: 'Layout', levers: [{ id: 'gap', label: 'Gap', kind: 'ramp', rungs: SPACE, show: showPx, def: '--spacing-200', overlay: 'gap' }] },
  ] },
  value: { name: 'Stat Value', plural: 'Stat Values', groups: [textGroup('--font-size-700', '--font-weight-600', '--line-height-tight', '--color-content-default')] },
  label: { name: 'Stat Label', plural: 'Stat Labels', groups: [textGroup('--font-size-250', '--font-weight-500', '--line-height-tight', '--color-content-default-secondary')] },
  caption: { name: 'Caption', plural: 'Captions', groups: [textGroup('--font-size-200', '--font-weight-400', '--line-height-normal', '--color-content-default-secondary')] },
  title: { name: 'Page Title', plural: 'Page Titles', groups: [textGroup('--font-size-600', '--font-weight-600', '--line-height-tight', '--color-content-default')] },
  icon: { name: 'Icon', plural: 'Icons', groups: [{ title: 'Icon', levers: [
    { id: 'size', label: 'Size', kind: 'ramp', rungs: ICON, show: (r) => `${r.name} · ${px(r)} px`, def: '--icon-size-md' },
    { id: 'color', label: 'Color', kind: 'swatch', rungs: TEXT, def: '--color-content-brand' },
    { id: 'fill', label: 'Badge Fill', kind: 'swatch', rungs: FILL, def: '--color-background-brand-muted' },
  ] }] },
  cards: { name: 'Stat Row', plural: 'Stat Rows', groups: [{ title: 'Layout', levers: [
    { id: 'gap', label: 'Gap', kind: 'ramp', rungs: SPACE, show: showPx, def: '--spacing-400', overlay: 'gap' },
    { id: 'cols', label: 'Columns', kind: 'ramp', rungs: COLS, show: showName, def: '3' },
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
  .mk--pad { box-sizing: border-box; border-style: solid; border-color: rgba(140, 196, 110, 0.5); }
  .mk--gap { background: repeating-linear-gradient(45deg, rgba(186, 110, 230, 0.55) 0 1px, rgba(186, 110, 230, 0.16) 1px 6px); }
`;

// ── state ──────────────────────────────────────────────────────────────────
type Scope = 'all' | 'one';
interface Change { key: string; who: string; what: string; from: string; to: string; fromTok?: string; toTok?: string; scope: string; undo: () => void }
const changes = new Map<string, Change>();
const history: { key: string; prev: Change | undefined; apply: (on: boolean) => void }[] = [];
const future: typeof history = [];
let selected: HTMLElement | null = null;
let scope: Scope = 'all';
let view: 'edit' | 'review' = 'edit';
let tool: 'select' | 'comment' = 'select';
let sent = false;
const pageSeeds: Record<string, string> = { brand: 'grass', neutral: 'gray', corners: 'soft', density: '1', scale: '1' };
const comments = [{ who: 'Page Title', text: 'Header feels crowded against the cards' }];

const root = document.documentElement;
const varName = (k: string, id: string) => `--m-${k}-${id}`;
const targetFor = (el: HTMLElement) => (scope === 'all' ? root : el);
const readVar = (el: HTMLElement, k: string, id: string) => (el.style.getPropertyValue(varName(k, id)) || root.style.getPropertyValue(varName(k, id))).trim();

function record(c: Omit<Change, 'undo'>, apply: (on: boolean) => void) {
  const prev = changes.get(c.key);
  const merged: Change = { ...c, from: prev?.from ?? c.from, fromTok: prev ? prev.fromTok : c.fromTok, undo: () => apply(false) };
  if (merged.from === merged.to) changes.delete(c.key); else changes.set(c.key, merged);
  history.push({ key: c.key, prev, apply });
  future.length = 0;
  sent = false;
  paintFooter();
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
const undoBtn = iconButton('undo', 'Undo (⌘Z)', () => step(history, future, false));
const redoBtn = iconButton('redo', 'Redo (⇧⌘Z)', () => step(future, history, true));
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

function step(from: typeof history, to: typeof history, redo: boolean) {
  const e = from.pop();
  if (!e) return;
  e.apply(redo);
  to.push(e);
  paintFooter();
  render();
}

function head(title: string, sub?: Node) {
  return h('div', { class: 'cx-head' }, h('div', { class: 'cx-title' }, title), sub ?? null);
}

function leverFor(def: LeverDef, k: string, el: HTMLElement) {
  const who = scope === 'all' ? KINDS[k].plural : `This ${KINDS[k].name}`;
  const at = (rungs: Rung[], v: string) => Math.max(0, rungs.findIndex((r) => r.value === v || r.token === v || r.value === `var(${v})`));
  const valueOf = (id: string, d: string) => readVar(el, k, id) || (d.startsWith('--') ? `var(${d})` : d);
  const setVar = (id: string, v: string) => targetFor(el).style.setProperty(varName(k, id), v);
  const overlay = 'overlay' in def ? def.overlay : undefined;
  const onHover = overlay ? (on: boolean) => paintMarks(on ? overlay : undefined) : undefined;
  const commit = (id: string, what: string, rungs: Rung[], from: Rung, to: Rung, show: (r: Rung) => string, vars: string[] = [id]) => {
    const tgt = targetFor(el);
    const prev = vars.map((v) => tgt.style.getPropertyValue(varName(k, v)));
    for (const v of vars) setVar(v, to.value);
    paintMarks(overlay);
    record({ key: `${k}|${scope}|${id}`, who, what, from: show(from), to: show(to), fromTok: from.token, toTok: to.token, scope: scope === 'all' ? `All ${document.querySelectorAll(`[data-k="${k}"]`).length}` : 'Just this one' },
      (on) => vars.forEach((v, i) => { if (on) tgt.style.setProperty(varName(k, v), to.value); else if (prev[i]) tgt.style.setProperty(varName(k, v), prev[i]); else tgt.style.removeProperty(varName(k, v)); }));
  };
  const origin = (id: string, d: string, rungs: Rung[]) => {
    const c = changes.get(`${k}|${scope}|${id}`);
    return c ? rungs.findIndex((r) => r.token === c.fromTok || (!r.token && showName(r) === c.from)) : at(rungs, d.startsWith('--') ? d : d);
  };
  if (def.kind === 'ramp') {
    let cur = at(def.rungs, valueOf(def.id, def.def));
    const lv = rampLever({ label: def.label, rungs: def.rungs, show: def.show, onHover, onChange: (i) => { commit(def.id, def.label, def.rungs, def.rungs[cur], def.rungs[i], def.show); cur = i; } });
    const o = origin(def.id, def.def, def.rungs);
    lv.set(cur, o < 0 ? cur : o);
    return lv.el;
  }
  if (def.kind === 'swatch') {
    const curV = valueOf(def.id, def.def);
    const cur = def.rungs[at(def.rungs, curV)];
    const hue = /brand/.test(cur.value) ? pageSeeds.brand : pageSeeds.neutral;
    const more = hueRamp(hue);
    const all = [...def.rungs, ...more];
    const found = all.find((r) => r.value === curV) ?? cur;
    let now = found;
    const show = (r: Rung) => r.name ?? '';
    const lv = swatchLever({ label: def.label, rungs: def.rungs, more, onChange: (r) => { commit(def.id, def.label, all, now, r, show); now = r; } });
    const c = changes.get(`${k}|${scope}|${def.id}`);
    lv.set(found, c ? all.find((r) => r.token === c.fromTok) ?? found : found);
    return lv.el;
  }
  const x0 = at(def.rungs, valueOf(`${def.id}-x`, def.def[0]));
  const y0 = at(def.rungs, valueOf(`${def.id}-y`, def.def[1]));
  let cx = x0; let cy = y0;
  const lv = pairLever({ label: def.label, labels: ['X', 'Y'], rungs: def.rungs, show: def.show, onHover, onChange: (x, y) => {
    if (x === y && cx === cy && x !== cx) commit(def.id, def.label, def.rungs, def.rungs[cx], def.rungs[x], def.show, [`${def.id}-x`, `${def.id}-y`]);
    else if (x !== cx) commit(`${def.id}-x`, `${def.label} X`, def.rungs, def.rungs[cx], def.rungs[x], def.show);
    if (!(x === y && cx === cy) && y !== cy) commit(`${def.id}-y`, `${def.label} Y`, def.rungs, def.rungs[cy], def.rungs[y], def.show);
    cx = x; cy = y;
  } });
  const linkedC = changes.get(`${k}|${scope}|${def.id}`);
  const lo = linkedC ? def.rungs.findIndex((r) => r.token === linkedC.fromTok) : -1;
  const ox = lo >= 0 ? lo : origin(`${def.id}-x`, def.def[0], def.rungs); const oy = lo >= 0 ? lo : origin(`${def.id}-y`, def.def[1], def.rungs);
  lv.set(x0, y0, [ox < 0 ? x0 : ox, oy < 0 ? y0 : oy]);
  return lv.el;
}

function renderSelection(el: HTMLElement) {
  const k = el.dataset.k!;
  const kind = KINDS[k];
  const n = document.querySelectorAll(`[data-k="${k}"]`).length;
  const sc = segmented<Scope>({ label: 'Applies to', options: [{ value: 'all', label: n > 1 ? `All ${n}` : 'All' }, { value: 'one', label: 'This One' }], onChange: (v) => { scope = v; render(); } });
  sc.set(scope);
  sc.el.classList.add('cx-scope');
  body.replaceChildren(
    head(kind.name, sc.el),
    ...kind.groups.map((g) => section({ id: `cx-${k}-${g.title}`, title: g.title, body: g.levers.map((d) => leverFor(d, k, el)) }).el),
  );
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
    } });
    lv.set(cur, o);
    return lv.el;
  };
  const hueSeed = (id: string, label: string, hues: string[], step: number, apply: (v: string) => void) => {
    const rungs: Rung[] = hues.map((n) => ({ value: `var(--color-${n}-${step})`, name: n[0].toUpperCase() + n.slice(1), token: `--color-${n}-${step}` }));
    const byName = (n: string) => rungs[hues.indexOf(n)];
    let cur = byName(pageSeeds[id]);
    const c = changes.get(`page|${id}`);
    const lv = swatchLever({ label, rungs, onChange: (r) => {
      const prev = pageSeeds[id]; const name = hues[rungs.indexOf(r)];
      pageSeeds[id] = name; apply(name);
      record({ key: `page|${id}`, who: 'Page', what: label, from: cur.name!, to: r.name!, scope: 'Theme' }, (on) => { pageSeeds[id] = on ? name : prev; apply(pageSeeds[id]); });
      cur = r;
    } });
    lv.set(cur, c ? rungs.find((r) => r.name === c.from) ?? cur : cur);
    return lv.el;
  };
  body.replaceChildren(
    head('Page'),
    section({ id: 'cx-color', title: 'Color', body: [hueSeed('brand', 'Brand', BRANDS, 9, applyBrand), hueSeed('neutral', 'Neutral', NEUTRALS, 11, applyNeutral)] }).el,
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
  const dark = root.dataset.scheme === 'dark' ? `${n}-dark` : n;
  const map: Record<string, number> = { '--color-content-default': 12, '--color-content-default-secondary': 11, '--color-content-disabled': 9, '--color-border-default': 7, '--color-border-default-subtle': 6, '--color-border-default-strong': 8, '--color-background-default': 1, '--color-background-elevation-sunken': 3 };
  for (const [v, step] of Object.entries(map)) s.setProperty(v, `var(--color-${dark}-${step})`);
}
function applyCorners(c: string) {
  const m: Record<string, [string, string, string]> = { flat: ['--radius-050', '--radius-050', '--radius-100'], soft: ['--radius-100', '--radius-200', '--radius-400'], round: ['--radius-200', '--radius-400', '--radius-500'] };
  const [sm, md, lg] = m[c];
  root.style.setProperty('--radius-sm', `var(${sm})`);
  root.style.setProperty('--radius-md', `var(${md})`);
  root.style.setProperty('--radius-lg', `var(${lg})`);
}

// The review: every change as one row, and the handoff.
function renderReview() {
  const rows = [...changes.values()];
  const byWho = new Map<string, Change[]>();
  for (const c of rows) byWho.set(c.who, [...(byWho.get(c.who) ?? []), c]);
  const back = iconButton('chevron', 'Back to Editing', () => { view = 'edit'; render(); });
  back.classList.add('cx-back');
  const list = h('div', { class: 'cx-list' });
  for (const [who, cs] of byWho) {
    list.append(h('div', { class: 'cx-grp' }, who));
    for (const c of cs) {
      const revert = iconButton('reset', `Revert ${c.what}`, () => {
        c.undo(); changes.delete(c.key); paintFooter(); render();
      });
      list.append(h('div', { class: 'cx-row', title: [c.fromTok, c.toTok].filter(Boolean).join(' → ') },
        h('span', { class: 'cx-row__what' }, c.what),
        h('span', { class: 'cx-row__v' }, h('span', { class: 'cx-row__from' }, c.from), ' → ', c.to),
        revert));
    }
  }
  if (comments.length) {
    list.append(h('div', { class: 'cx-grp' }, 'Comments'));
    for (const c of comments) list.append(h('div', { class: 'cx-row cx-row--c' }, h('span', { class: 'cx-row__what' }, c.who), h('span', { class: 'cx-row__note' }, c.text)));
  }
  const md = h('pre', { class: 'cx-md' }, changesMd());
  const prev = h('details', { class: 'cx-prev' }, h('summary', {}, 'design/changes.md'), md);
  body.replaceChildren(h('div', { class: 'cx-head cx-head--back' }, back, h('div', { class: 'cx-title' }, 'Changes')), list, prev);
}

function changesMd() {
  const lines = ['# Design changes', '', '/dashboard · Radial', ''];
  for (const c of changes.values()) lines.push(`- ${c.who} · ${c.what}: ${c.from} → ${c.to}${c.toTok ? ` (${c.fromTok ?? '?'} → ${c.toTok})` : ''} · ${c.scope}`);
  for (const c of comments) lines.push(`- Comment on ${c.who}: "${c.text}"`);
  return lines.join('\n');
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
  foot.replaceChildren(count, h('span', { class: 'grow' }), send);
}

function render() {
  if (view === 'review') renderReview();
  else if (selected) renderSelection(selected);
  else renderPage();
  paintFooter();
  paintMarks();
}

// ── marks on the canvas ────────────────────────────────────────────────────
const canvas = h('div', { class: 'canvas' });
canvas.innerHTML = PAGE;
document.body.append(canvas, host);
let hoverEl: HTMLElement | null = null;
const box = (el: Element, cls: string) => {
  const r = el.getBoundingClientRect(); const c = canvas.getBoundingClientRect();
  const m = h('div', { class: `mk ${cls}` });
  Object.assign(m.style, { left: `${r.left - c.left + canvas.scrollLeft}px`, top: `${r.top - c.top + canvas.scrollTop}px`, width: `${r.width}px`, height: `${r.height}px` });
  return m;
};
function paintMarks(overlay?: 'padding' | 'gap') {
  canvas.querySelectorAll('.mk').forEach((m) => m.remove());
  if (hoverEl && hoverEl !== selected) canvas.append(box(hoverEl, 'mk--hover'));
  if (!selected) return;
  const k = selected.dataset.k!;
  const peers = scope === 'all' ? [...document.querySelectorAll<HTMLElement>(`[data-k="${k}"]`)] : [selected];
  for (const p of peers) if (p !== selected) canvas.append(box(p, 'mk--sib'));
  const sel = box(selected, 'mk--sel');
  sel.append(h('span', { class: 'mk__tag' }, KINDS[k].name));
  canvas.append(sel);
  if (!overlay) return;
  for (const p of peers) {
    const cs = getComputedStyle(p);
    if (overlay === 'padding') {
      const m = box(p, 'mk--pad');
      m.style.borderWidth = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
      const bw = Number.parseFloat(cs.borderTopWidth);
      m.style.left = `${Number.parseFloat(m.style.left) + bw}px`; m.style.top = `${Number.parseFloat(m.style.top) + bw}px`;
      m.style.width = `${Number.parseFloat(m.style.width) - bw * 2}px`; m.style.height = `${Number.parseFloat(m.style.height) - bw * 2}px`;
      canvas.append(m);
    } else {
      const kids = [...p.children].map((c) => c.getBoundingClientRect());
      const c = canvas.getBoundingClientRect();
      const grid = getComputedStyle(p).gridTemplateColumns.split(' ').length > 1;
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1]; const b = kids[i];
        const g = h('div', { class: 'mk mk--gap' });
        if (grid && Math.abs(a.top - b.top) < 2) Object.assign(g.style, { left: `${a.right - c.left}px`, top: `${a.top - c.top + canvas.scrollTop}px`, width: `${b.left - a.right}px`, height: `${a.height}px` });
        else Object.assign(g.style, { left: `${p.getBoundingClientRect().left - c.left + Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.borderLeftWidth)}px`, top: `${a.bottom - c.top + canvas.scrollTop}px`, width: `${p.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight)}px`, height: `${b.top - a.bottom}px` });
        canvas.append(g);
      }
    }
  }
}
canvas.addEventListener('pointermove', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
  if (t !== hoverEl) { hoverEl = t; paintMarks(); }
});
canvas.addEventListener('pointerleave', () => { hoverEl = null; paintMarks(); });
canvas.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
  if (tool === 'comment' && t) return;
  selected = t;
  view = 'edit';
  render();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) { selected = null; render(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) step(future, history, true); else step(history, future, false); }
});

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
  .cx-chip { margin-left: auto; padding: 0 8px; border-radius: 4px; background: var(--chip); color: var(--ink-2); line-height: 20px; }
  .cx-list { padding: 4px 0 12px; }
  .cx-grp { padding: 12px 16px 4px; color: var(--ink-2); font-weight: 550; }
  .cx-row { display: grid; grid-template-columns: 1fr auto 24px; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px 0 16px; }
  .cx-row:hover { background: var(--hover); }
  .cx-row__v { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .cx-row__from { color: var(--ink-2); }
  .cx-row--c { grid-template-columns: auto 1fr; padding-block: 6px; align-items: start; }
  .cx-row__note { min-width: 0; color: var(--ink-2); }
  .cx-row--c { padding-right: 16px; }
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
  const fire = (sel: string) => { const t = canvas.querySelector<HTMLElement>(sel)!; selected = t; render(); };
  if (st === 'card' || st === 'review') {
    fire('.card');
    const s = body;
    const press = (label: string, key: string, times = 1) => {
      const track = [...s.querySelectorAll<HTMLElement>('.lv__track')].find((t) => t.getAttribute('aria-label') === label);
      for (let i = 0; i < times; i++) track?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };
    press('Padding', 'ArrowRight', 1);
    press('Corners', 'ArrowRight', 1);
    if (st === 'review') {
      fire('.value');
      press('Size', 'ArrowLeft', 1);
      selected = null; render();
      const b = [...body.querySelectorAll<HTMLElement>('.lv__c')].find((c) => c.getAttribute('aria-label') === 'Teal');
      b?.click();
      view = 'review'; render();
    } else if (q.get('hover')) {
      paintMarks(q.get('hover') as 'padding');
      const lv = [...body.querySelectorAll<HTMLElement>('.lv')].find((l) => l.querySelector('.lv__l')?.textContent === 'Padding');
      lv?.setAttribute('data-hot', '');
    }
  } else if (st === 'text') {
    fire('.value');
  }
});
