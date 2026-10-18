// Levers: the design layer's way of changing a value. A lever moves along a
// ramp the system already has (the spacing scale, the type scale, a colour's
// roles), one rung at a time, the way Claude's effort slider moves between
// its settings. The value shown is what renders (24px, Raised); the rung's
// token name is in the tooltip, because which token is Claude's call.
//
// Three shapes, one row pattern: a label and the value on top, the lever under
// it. A moved lever shows "was → now" and a reset; the rung it started on keeps
// a tick on the track.
import { h, icon } from './dom';

export interface Rung {
  /** The token, as var(--name), or a literal for a rung with no token (0). */
  value: string;
  /** What the rung is called where a name reads better than a number: "Raised", "Pill". */
  name?: string;
  /** The token's name, for the tooltip. */
  token?: string;
}

const STEP = (e: KeyboardEvent) => ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 } as Record<string, number>)[e.key] ?? 0;

function head(label: string) {
  const value = h('span', { class: 'lv__v' });
  const reset = h('button', { type: 'button', class: 'lv__reset', 'aria-label': `Reset ${label}`, title: 'Reset', hidden: true }, icon('reset'));
  const el = h('div', { class: 'lv__h' }, h('span', { class: 'lv__l' }, label), value, reset);
  return { el, value, reset };
}

function hover(el: HTMLElement, on?: (on: boolean) => void) {
  if (!on) return;
  el.addEventListener('pointerenter', () => on(true));
  el.addEventListener('pointerleave', () => on(false));
  el.addEventListener('focusin', () => on(true));
  el.addEventListener('focusout', () => on(false));
}

/**
 * A size on its ramp: a notched track, a thumb that snaps to rungs. Drag,
 * click a notch, or arrow keys (Shift or Home/End for the ends).
 */
export function rampLever(o: { label: string; rungs: Rung[]; show: (r: Rung) => string; onChange: (i: number) => void; onHover?: (on: boolean) => void }) {
  const hd = head(o.label);
  const last = Math.max(1, o.rungs.length - 1);
  const track = h('div', { class: 'lv__track', role: 'slider', tabindex: '0', 'aria-label': o.label, 'aria-valuemin': '0', 'aria-valuemax': String(o.rungs.length - 1) });
  const pos = (i: number) => `calc(12px + (100% - 24px) * ${i / last})`;
  const notches = o.rungs.map((r, i) => h('i', { class: 'lv__n', style: `left:${pos(i)}`, title: r.token ?? r.name ?? r.value }));
  const was = h('span', { class: 'lv__was', 'aria-hidden': 'true' });
  const thumb = h('span', { class: 'lv__thumb', 'aria-hidden': 'true' });
  track.append(...notches, was, thumb);
  const sug = h('button', { type: 'button', class: 'lv__sug', tabindex: '-1' }, 'Suggested');
  const sugRow = h('div', { class: 'lv__sugrow', hidden: true }, sug);
  const note = h('div', { class: 'lv__note', hidden: true });
  const el = h('div', { class: 'lv' }, hd.el, track, sugRow, note);
  let at = 0;
  let origin = 0;
  let suggested: number | null = null;
  const paint = () => {
    thumb.style.left = pos(at);
    was.style.left = pos(origin);
    was.hidden = at === origin;
    const now = o.show(o.rungs[at]);
    hd.value.textContent = at === origin ? now : `${o.show(o.rungs[origin])} → ${now}`;
    hd.reset.hidden = at === origin;
    el.toggleAttribute('data-moved', at !== origin);
    notches.forEach((n, i) => { n.toggleAttribute('data-past', i < at); n.toggleAttribute('data-sug', i === suggested); });
    sugRow.hidden = suggested === null || suggested === at;
    if (suggested !== null) sug.style.left = pos(suggested);
    track.setAttribute('aria-valuenow', String(at));
    track.setAttribute('aria-valuetext', now);
    track.title = o.rungs[at].token ?? '';
  };
  const go = (i: number) => {
    const n = Math.max(0, Math.min(o.rungs.length - 1, i));
    if (n === at) return;
    at = n;
    paint();
    o.onChange(at);
  };
  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    track.focus();
    track.setPointerCapture(e.pointerId);
    const r = track.getBoundingClientRect();
    const move = (m: PointerEvent) => go(Math.round(((m.clientX - r.left - 12) / (r.width - 24)) * last));
    move(e);
    const up = () => { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); };
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', up);
  });
  track.addEventListener('keydown', (e) => {
    const d = STEP(e);
    if (!d && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    go(e.key === 'Home' ? 0 : e.key === 'End' ? o.rungs.length - 1 : e.shiftKey ? (d < 0 ? 0 : o.rungs.length - 1) : at + d);
  });
  hd.reset.addEventListener('click', () => go(origin));
  sug.addEventListener('click', () => { if (suggested !== null) go(suggested); });
  hover(el, o.onHover);
  return {
    el,
    head: hd.el,
    /** A rung the system would pick here (the effort slider's Recommended). */
    suggest(i: number | null) { suggested = i; paint(); },
    /** One line of evaluation under the lever: a measurement, or a warning. */
    note(text: string | null, tone?: 'warn') { note.hidden = !text; note.textContent = text ?? ''; note.toggleAttribute('data-warn', tone === 'warn'); },
    /** Shows a rung; `from` sets the rung it started on (the tick). */
    set(i: number, from = i) { at = i; origin = from; paint(); },
    get: () => at,
  };
}

/**
 * A colour on its roles: swatches ordered light to dark, the current one
 * ringed. Arrow keys step lighter and darker; the chevron opens the colour's
 * whole twelve-step ramp under it, for a value between roles.
 */
export function swatchLever(o: { label: string; rungs: Rung[]; more?: Rung[]; onChange: (r: Rung) => void; onHover?: (on: boolean) => void }) {
  const hd = head(o.label);
  const row = h('div', { class: 'lv__sw', role: 'radiogroup', 'aria-label': o.label });
  const ramp = h('div', { class: 'lv__ramp', role: 'radiogroup', 'aria-label': `${o.label}, whole ramp`, hidden: true });
  const moreBtn = o.more ? h('button', { type: 'button', class: 'lv__more', 'aria-label': `Whole ${o.label} ramp`, 'aria-expanded': 'false', title: 'Whole ramp' }, icon('chevron')) : null;
  const note = h('div', { class: 'lv__note', hidden: true });
  const el = h('div', { class: 'lv lv--sw' }, hd.el, h('div', { class: 'lv__swrow' }, row, moreBtn), ramp, note);
  let cur: Rung = o.rungs[0];
  let origin: Rung = o.rungs[0];
  const swatch = (r: Rung, cls: string) => {
    const b = h('button', { type: 'button', class: cls, role: 'radio', 'aria-label': r.name ?? r.token ?? r.value, title: [r.name, r.token].filter(Boolean).join('\n'), style: `--c:${r.value}` });
    b.addEventListener('click', () => pick(r));
    return b;
  };
  const cells = o.rungs.map((r) => swatch(r, 'lv__c'));
  row.append(...cells);
  const steps = (o.more ?? []).map((r) => swatch(r, 'lv__s'));
  ramp.append(...steps);
  const label = (r: Rung) => r.name ?? r.token?.replace(/^--color-/, '') ?? r.value;
  const paint = () => {
    const all = [...o.rungs.map((r, i) => [r, cells[i]] as const), ...(o.more ?? []).map((r, i) => [r, steps[i]] as const)];
    for (const [r, b] of all) {
      b.setAttribute('aria-checked', String(r.value === cur.value));
      b.toggleAttribute('data-was', r.value === origin.value && cur.value !== origin.value);
      b.tabIndex = r.value === cur.value ? 0 : -1;
    }
    if (!o.rungs.some((r) => r.value === cur.value)) cells[0].tabIndex = 0;
    hd.value.textContent = cur.value === origin.value ? label(cur) : `${label(origin)} → ${label(cur)}`;
    hd.reset.hidden = cur.value === origin.value;
    el.toggleAttribute('data-moved', cur.value !== origin.value);
  };
  function pick(r: Rung) {
    if (r.value === cur.value) return;
    cur = r;
    paint();
    o.onChange(r);
  }
  const keys = (list: Rung[], btns: HTMLButtonElement[]) => (e: KeyboardEvent) => {
    const d = STEP(e);
    if (!d) return;
    const i = list.findIndex((r) => r.value === cur.value);
    const n = Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i + d)));
    e.preventDefault();
    pick(list[n]);
    btns[n].focus();
  };
  row.addEventListener('keydown', keys(o.rungs, cells));
  if (o.more) ramp.addEventListener('keydown', keys(o.more, steps));
  moreBtn?.addEventListener('click', () => {
    ramp.hidden = !ramp.hidden;
    moreBtn.setAttribute('aria-expanded', String(!ramp.hidden));
  });
  hd.reset.addEventListener('click', () => pick(origin));
  hover(el, o.onHover);
  return {
    el,
    set(r: Rung, from: Rung = r) { cur = r; origin = from; paint(); },
    note(text: string | null, tone?: 'warn') { note.hidden = !text; note.textContent = text ?? ''; note.toggleAttribute('data-warn', tone === 'warn'); },
    /** Marks the swatches a check fails on, before they are picked. */
    marks(fails: (r: Rung) => boolean) {
      o.rungs.forEach((r, i) => cells[i].toggleAttribute('data-fail', fails(r)));
      (o.more ?? []).forEach((r, i) => steps[i].toggleAttribute('data-fail', fails(r)));
    },
  };
}

/**
 * Two sizes that usually move together (padding's X and Y): one lever while
 * linked, two when the link is off.
 */
export function pairLever(o: { label: string; labels: [string, string]; rungs: Rung[]; show: (r: Rung) => string; onChange: (x: number, y: number) => void; onHover?: (on: boolean) => void }) {
  let linked = true;
  let x = 0;
  let y = 0;
  let from: [number, number] = [0, 0];
  const both = rampLever({ label: o.label, rungs: o.rungs, show: o.show, onHover: o.onHover, onChange: (i) => { x = i; y = i; o.onChange(x, y); } });
  const one = rampLever({ label: `${o.label} ${o.labels[0]}`, rungs: o.rungs, show: o.show, onHover: o.onHover, onChange: (i) => { x = i; o.onChange(x, y); } });
  const two = rampLever({ label: `${o.label} ${o.labels[1]}`, rungs: o.rungs, show: o.show, onHover: o.onHover, onChange: (i) => { y = i; o.onChange(x, y); } });
  const link = h('button', { type: 'button', class: 'lv__link', 'aria-pressed': 'true', 'aria-label': `Link ${o.labels[0]} and ${o.labels[1]}`, title: 'Move together' }, icon('link'));
  const el = h('div', { class: 'lv-pair' }, both.el, one.el, two.el);
  const show = () => {
    both.el.hidden = !linked;
    one.el.hidden = linked;
    two.el.hidden = linked;
    link.setAttribute('aria-pressed', String(linked));
    const host = linked ? both.head : one.head;
    host.insertBefore(link, host.querySelector('.lv__reset'));
    both.set(x, from[0]);
    one.set(x, from[0]);
    two.set(y, from[1]);
  };
  link.addEventListener('click', () => {
    linked = !linked;
    if (linked && x !== y) { y = x; o.onChange(x, y); }
    show();
  });
  show();
  return {
    el,
    note(text: string | null, tone?: 'warn') { both.note(text, tone); one.note(text, tone); },
    set(nx: number, ny: number, f: [number, number] = [nx, ny]) {
      x = nx; y = ny; from = f;
      linked = x === y && f[0] === f[1];
      show();
    },
  };
}

export const LEVER_CSS = `
  .lv { display: grid; gap: 6px; padding: 4px 0; }
  .lv__h { display: flex; align-items: center; gap: 6px; min-height: 20px; }
  .lv__l { flex: 1; min-width: 0; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lv[data-moved] .lv__l { color: var(--ink); }
  .lv__v { color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .lv__reset, .lv__link, .lv__more { display: grid; place-items: center; flex: none; width: 20px; height: 20px; margin: -2px -4px -2px 0; padding: 0; border: 0; border-radius: 4px; background: none; color: var(--ink-2); }
  .lv__reset[hidden] { display: none; }
  .lv__reset svg, .lv__link svg, .lv__more svg { width: 20px; height: 20px; }
  .lv__reset:hover, .lv__link:hover, .lv__more:hover { background: var(--hover); color: var(--ink); }
  .lv__link[aria-pressed="false"] { color: var(--ink-3); }

  /* the track: Claude's effort slider at the panel's size */
  .lv__track { position: relative; height: 24px; border-radius: 12px; background: var(--field); cursor: pointer; touch-action: none; }
  .lv__n, .lv__was, .lv__thumb { position: absolute; top: 50%; translate: -50% -50%; }
  .lv__n { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-3); }
  .lv__n[data-past] { background: var(--ink-2); }
  .lv__was { width: 2px; height: 12px; border-radius: 1px; background: var(--ink-2); }
  .lv__was[hidden] { display: none; }
  .lv__thumb { width: 28px; height: 20px; border-radius: 10px; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(0, 0, 0, 0.2); transition: left 140ms cubic-bezier(0.16, 1, 0.3, 1); }
  @media (prefers-reduced-motion: reduce) { .lv__thumb { transition: none; } }
  .ui .lv__track:focus-visible { box-shadow: none; outline: 1px solid var(--focus); outline-offset: 1px; }

  /* colour: roles as swatches, light to dark */
  .lv__swrow { display: flex; gap: 4px; align-items: center; }
  .lv__sw { flex: 1; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
  .lv__c, .lv__s { position: relative; height: 24px; padding: 0; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 5px; background: var(--c); }
  .lv__c[aria-checked="true"], .lv__s[aria-checked="true"] { outline: 2px solid var(--ink); outline-offset: 1px; }
  .ui .lv__c:focus-visible, .ui .lv__s:focus-visible { box-shadow: none; outline: 2px solid var(--focus); outline-offset: 1px; }
  .lv__c[data-was]::after, .lv__s[data-was]::after { content: ''; position: absolute; left: 50%; bottom: -6px; width: 6px; height: 2px; translate: -50% 0; border-radius: 1px; background: var(--ink-2); }
  .lv__more svg { transition: rotate 160ms; }
  .lv__more[aria-expanded="true"] svg { rotate: 180deg; }
  .lv__ramp { display: grid; grid-template-columns: repeat(12, 1fr); gap: 2px; margin-top: 6px; }
  .lv__ramp[hidden] { display: none; }
  .lv__s { height: 16px; border-radius: 3px; }
  .sec__b > .lv, .sec__b > .lv-pair { grid-column: 1 / -1; }
  .sec__b:has(> .lv, > .lv-pair) { padding-right: 16px; row-gap: 4px; }
  .lv__note { color: var(--ink-2); }
  .lv__note[data-warn] { color: var(--danger); }
  .lv__n[data-sug] { width: 7px; height: 7px; background: none; box-shadow: inset 0 0 0 1px var(--ink-2); }
  .lv__sugrow { position: relative; height: 14px; margin-top: -2px; }
  .lv__sug { position: absolute; top: 0; translate: -50% 0; padding: 0 2px; border: 0; background: none; color: var(--ink-3); font: inherit; font-size: 10px; line-height: 14px; white-space: nowrap; }
  .lv__sug:hover { color: var(--ink); }
  .lv__c[data-fail]::before, .lv__s[data-fail]::before { content: ''; position: absolute; top: -3px; right: -3px; width: 7px; height: 7px; border-radius: 50%; background: var(--danger); box-shadow: 0 0 0 1.5px var(--bg); }
  .lv-pair { display: grid; }
  .lv-pair > [hidden] { display: none; }
`;
