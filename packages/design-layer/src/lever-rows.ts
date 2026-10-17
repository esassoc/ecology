// A selection's levers: one per property the element actually uses (fields.ts
// decides which), each moving along the system's ramp for that property
// (ramps.ts) and measuring itself in one line (checks.ts). The panel supplies a
// LeverHost: where an edit lands, how to read the source's own value, and what
// a committed move does. Nothing here writes a token file.
//
// Colours are compared in both schemes, because a role is one name for both;
// sizes against the page's own scale; spacing against what it contains.
import { pairLever, rampLever, swatchLever, type Rung } from './ui/levers';
import { toHex, contrast } from './color';
import { effectiveBackground } from './describe';
import { declared } from './graph';
import { fieldsFor, readProp, specsFor, type ElementKind } from './fields';
import type { TokenUse } from './inspect';
import * as R from './ramps';
import { NON_TEXT, contrastLine, nearest, nearest as nearestOf, pairedIcon, rank, suggestedLeading, textBar, worst, type SchemeRatio } from './checks';

export type MapKey = 'shared' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';
/** One variable a move writes, in the maps it lives in; null drops it (back to the source). */
export interface Write { name: string; modes: MapKey[]; value: string | null }
export interface LeverChange {
  field: string;
  label: string;
  from: string;
  to: string;
  fromToken: string | null;
  toToken: string | null;
  writes: Write[];
}
export type Band = 'padding' | 'gap';

export interface LeverHost {
  el: Element;
  uses: TokenUse[];
  kinds: ElementKind[];
  /** What the target's layer holds for a variable or property. */
  raw(m: MapKey, name: string): string | undefined;
  /** Runs `fn` with every design-layer edit switched off: the source's own values. */
  original<T>(fn: () => T): T;
  /** Runs `fn` once per scheme. */
  schemes<T>(fn: (s: Scheme) => T): Record<Scheme, T>;
  commit(c: LeverChange): void;
  /** The check a field's current value fails, or null; the panel keeps it on the change. */
  flag(field: string, check: string | null): void;
  /** Paints padding or gap on the page while its lever is hovered. */
  hover(band: Band | null): void;
  /** Whether the element's face has this weight. */
  weightOk(n: number): boolean;
}

export interface LeverRow {
  id: string;
  group: 'Text' | 'Icon' | 'Box' | 'Border' | 'Layout';
  label: string;
  el: HTMLElement;
  sync(): void;
  /** A band dragged on the page: the nearest rung to `px`, on one axis or both. */
  drag?(axis: 'x' | 'y' | 'both', px: number): void;
  /** The value now, for the band to start from. */
  px?(axis: 'x' | 'y'): number;
  /** Options: steps along the ramp from where it is (false when it cannot move). */
  move?(d: number): boolean;
  /** Options: the rung (or role) with this name. */
  pick?(name: string): boolean;
}

const VOID = /^(img|input|br|hr|area|col|embed|source|track|wbr|textarea|select|svg|path|use|g|circle|rect|line|polyline|polygon)$/;
const r1 = (n: number) => Math.round(n * 10) / 10;
const pxText = (n: number) => `${r1(n)} px`;
const off = (px: number): Rung => ({ value: `${r1(px)}px`, name: pxText(px) });

export function buildLevers(host: LeverHost): LeverRow[] {
  const { el, uses, kinds } = host;
  const cs = () => getComputedStyle(el);
  const usedBy = new Map<string, TokenUse>();
  for (const u of uses) for (const p of u.props) for (const sp of specsFor(p, u.kind)) if (!usedBy.has(sp.prop)) usedBy.set(sp.prop, u);
  /** What a move writes for a property: the component token the element reads for it, else the property. */
  const nameFor = (prop: string) => { const u = usedBy.get(prop); return u && u.tier === 3 ? u.name : prop; };

  // A probe inside the element, so a value resolves with its font size and inherited tokens.
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;display:block';
  const at = VOID.test(el.localName) ? (el.parentElement ?? document.body) : el;
  function resolve(prop: 'width' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'color', value: string, fontSize?: string) {
    at.append(probe);
    if (fontSize) probe.style.fontSize = fontSize;
    probe.style[prop] = value;
    const out = getComputedStyle(probe)[prop];
    probe.style[prop] = '';
    probe.style.fontSize = '';
    probe.remove();
    return out;
  }
  const num = (s: string) => Number.parseFloat(s) || 0;

  const fields = new Set(fieldsFor(el, kinds, new Set(usedBy.keys()), new Set()).filter((f) => f.shown).map((f) => f.spec.prop));
  const isIcon = kinds.includes('icon');
  const rows: LeverRow[] = [];
  const hoverOf = (band: Band) => (on: boolean) => host.hover(on ? band : null);

  // ── sizes on a ramp ────────────────────────────────────────────────────
  interface LengthOpts {
    id: string; label: string; group: LeverRow['group']; props: string[]; base: Rung[];
    measure: 'width' | 'fontSize' | 'fontWeight' | 'lineHeight';
    read: () => number;
    show: (r: Rung, px: number) => string;
    check?: (px: number) => { text: string; warn?: boolean } | null;
    suggest?: (rungs: Rung[], pxs: number[]) => number | null;
    band?: Band;
    /** How close a value must be to a rung to be on it (px; a ratio for line height). */
    tol?: number;
    /** A literal for a value off every rung. */
    literal?: (v: number) => Rung;
  }
  function lengthRow(o: LengthOpts): LeverRow {
    const names = [...new Set(o.props.map(nameFor))];
    const fs = cs().fontSize;
    const valueOf = (r: Rung) => (r.value === '0px' || r.value === 'none' ? 0 : o.measure === 'lineHeight'
      ? lineHeightPx(resolve('lineHeight', r.value, fs), num(fs)) / num(fs) : num(resolve(o.measure, r.value, fs)));
    const nearest = (list: number[], v: number) => nearestOf(list, v, o.tol);
    const rungs = [...o.base];
    const pxs = rungs.map(valueOf);
    const place = (px: number) => {
      if (nearest(pxs, px) >= 0) return;
      const i = pxs.findIndex((p) => p > px);
      const at2 = i < 0 ? rungs.length : i;
      rungs.splice(at2, 0, (o.literal ?? off)(px));
      pxs.splice(at2, 0, px);
    };
    const originPx = host.original(o.read);
    place(originPx);
    place(o.read());
    const originI = () => nearest(pxs, originPx);
    const show = (i: number) => o.show(rungs[i], pxs[i]);
    const commit = (i: number) => {
      const oi = originI();
      host.commit({
        field: o.id, label: o.label, from: show(oi), to: show(i), fromToken: rungs[oi]?.token ?? null, toToken: rungs[i].token ?? null,
        writes: names.map((name) => ({ name, modes: ['shared'], value: i === oi ? null : rungs[i].value })),
      });
    };
    const lever = rampLever({ label: o.label, rungs, show: (r) => o.show(r, pxs[rungs.indexOf(r)]), onChange: commit, onHover: o.band ? hoverOf(o.band) : undefined });
    const current = () => {
      const raw = host.raw('shared', names[0]);
      const byToken = raw ? rungs.findIndex((r) => r.value === raw) : -1;
      if (byToken >= 0) return byToken;
      // Off every rung (the page moved under it): the closest one.
      const now = o.read();
      let b = 0;
      pxs.forEach((p, i) => { if (Math.abs(p - now) < Math.abs(pxs[b] - now)) b = i; });
      return b;
    };
    return {
      id: o.id, group: o.group, label: o.label, el: lever.el,
      sync() {
        const i = current();
        lever.set(i, originI());
        const c = o.check?.(pxs[i]) ?? null;
        lever.note(c?.text ?? null, c?.warn ? 'warn' : undefined);
        host.flag(o.id, c?.warn ? c.text : null);
        lever.suggest(o.suggest?.(rungs, pxs) ?? null);
      },
      drag(_axis, px) {
        let best = 0;
        pxs.forEach((p, i) => { if (Math.abs(p - px) < Math.abs(pxs[best] - px)) best = i; });
        if (best === current()) return;
        commit(best);
      },
      px: () => o.read(),
      move(d) {
        const c = current();
        const i = Math.max(0, Math.min(rungs.length - 1, c + d));
        if (i === c) return false;
        commit(i);
        return true;
      },
      pick(name) {
        const i = rungs.findIndex((r) => r.name === name);
        if (i < 0 || i === current()) return false;
        commit(i);
        return true;
      },
    };
  }
  const lineHeightPx = (lh: string, fontPx: number) => {
    const n = num(lh);
    if (lh === 'normal') return fontPx * 1.2;
    return n < 4 ? n * fontPx : n;
  };

  // ── colours on their roles ─────────────────────────────────────────────
  interface ColorOpts {
    id: string; label: string; group: LeverRow['group']; props: string[]; base: Rung[]; more: Rung[];
    read: () => string;
    /** A rung's contrast in both schemes against what it is judged on, and the bar it must clear. */
    judge?: (hex: Record<Scheme, string>) => { ratio: SchemeRatio; bar: number; info?: boolean } | null;
  }
  function colorRow(o: ColorOpts): LeverRow {
    const names = [...new Set(o.props.map(nameFor))];
    const all = [...o.base, ...o.more];
    const hexAll = () => host.schemes(() => all.map((r) => toHex(resolve('color', r.value))));
    let hexes = hexAll();
    const hexOf = (r: Rung): Record<Scheme, string> => { const i = all.indexOf(r); return { light: hexes.light[i], dark: hexes.dark[i] }; };
    const scheme = (): Scheme => (document.documentElement.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light');
    const read = () => toHex(o.read());
    const reads = usedBy.get(o.props[0])?.name;
    const findRung = (hex: string, token?: string) => (token && all.find((r) => r.token === token)) || all.find((r) => hexOf(r)[scheme()] === hex) || null;
    let origin = host.original(() => findRung(read(), reads)) ?? { value: host.original(read), name: 'Custom' };
    if (!all.includes(origin)) { all.unshift(origin); o.base.unshift(origin); hexes = hexAll(); }
    const label = (r: Rung) => r.name ?? r.token ?? r.value;
    const commit = (r: Rung) => host.commit({
      field: o.id, label: o.label, from: label(origin), to: label(r), fromToken: origin.token ?? null, toToken: r.token ?? null,
      writes: names.map((name) => ({ name, modes: ['light', 'dark'], value: r === origin ? null : r.value })),
    });
    const lever = swatchLever({ label: o.label, rungs: o.base, more: o.more.length ? o.more : undefined, onChange: commit });
    const now = () => { const raw = host.raw('light', names[0]); return (raw && all.find((r) => r.value === raw)) || (raw ? findRung(toHex(raw)) : origin) || origin; };
    return {
      id: o.id, group: o.group, label: o.label, el: lever.el,
      pick(name) {
        const r = o.base.find((x) => x.name === name);
        if (!r || r.value === now().value) return false;
        commit(r);
        return true;
      },
      sync() {
        const cur = now();
        lever.set(cur, origin);
        if (!o.judge) { lever.note(null); host.flag(o.id, null); return; }
        const fails = new Set<Rung>();
        for (const r of all) { const j = o.judge(hexOf(r)); if (j && !j.info && worst(j.ratio).ratio < j.bar) fails.add(r); }
        lever.marks((r) => fails.has(r));
        const j = o.judge(hexOf(cur));
        if (!j) { lever.note(null); host.flag(o.id, null); return; }
        const line = contrastLine(j.ratio, j.bar);
        const warn = line.fail && !j.info;
        lever.note(j.info ? (line.fail ? `Edge ${line.text}` : null) : line.text, warn ? 'warn' : undefined);
        host.flag(o.id, warn ? `Contrast ${line.text}` : null);
      },
    };
  }

  // What a colour is judged on, read in both schemes once per build.
  const ground = host.schemes(() => toHex(effectiveBackground(el.parentElement ?? el)));
  const ownGround = host.schemes(() => toHex(effectiveBackground(el)));
  const themeRamps = R.themeRamps();
  /** The twelve steps of whichever ramp (brand or neutral) holds a colour nearest. */
  const rampFor = (hex: string) => {
    const dist = (r: Rung[]) => Math.min(...r.map((x) => contrast(toHex(resolve('color', x.value)), hex)));
    return themeRamps.neutral.length && dist(themeRamps.neutral) <= dist(themeRamps.brand) ? themeRamps.neutral : themeRamps.brand;
  };

  // ── the fields, grouped ────────────────────────────────────────────────
  const fontPx = () => num(cs().fontSize);
  const fontWeight = () => num(cs().fontWeight);

  if (fields.has('color')) {
    const icon = isIcon;
    colorRowFor(icon ? 'icon-color' : 'color', icon ? 'Icon Color' : 'Color', icon ? 'Icon' : 'Text');
  }
  function colorRowFor(id: string, label: string, group: LeverRow['group']) {
    rows.push(colorRow({
      id, label, group, props: ['color'], base: R.textRoles(), more: rampFor(toHex(cs().color)), read: () => cs().color,
      judge: (hex) => ({ ratio: { light: contrast(hex.light, ownGround.light), dark: contrast(hex.dark, ownGround.dark) }, bar: isIcon ? NON_TEXT : textBar(fontPx(), fontWeight()) }),
    }));
  }

  if (fields.has('font-size')) {
    const sizes = () => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,label,a,span,strong,small,button,figcaption')]
      .filter((x) => x.closest('astro-dev-toolbar') === null && (x as HTMLElement).offsetParent !== null && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
      .map((x) => ({ el: x, px: num(getComputedStyle(x).fontSize) }));
    const token = nameFor('font-size');
    rows.push(lengthRow({
      id: 'font-size', label: 'Size', group: 'Text', props: ['font-size'], base: R.fontSizes(), measure: 'fontSize', read: fontPx,
      show: (r, px) => pxText(px),
      check: (px) => {
        const all = sizes();
        const same = all.find((x) => x.el !== el && /^H[1-3]$/.test(x.el.tagName) && Math.round(x.px) === Math.round(px) && !el.contains(x.el) && x.el.tagName !== el.tagName);
        if (same) return { text: `Same size as the ${same.el.tagName}`, warn: true };
        const fluid = fluidRange(token);
        const where = rank(px, all.map((x) => x.px));
        return { text: [where, fluid].filter(Boolean).join(' · ') || pxText(px) };
      },
    }));
  }
  /** "phone 26 px, wide 36 px" for a clamp()ed size. */
  function fluidRange(token: string) {
    if (!token.startsWith('--')) return null;
    const d = declared(token, 'light');
    const m = d?.match(/clamp\(\s*([\d.]+)(rem|px)\s*,.*,\s*([\d.]+)(rem|px)\s*\)/);
    if (!m) return null;
    const px = (n: string, u: string) => Math.round(Number(n) * (u === 'rem' ? 16 : 1));
    return `phone ${px(m[1], m[2])} px, wide ${px(m[3], m[4])} px`;
  }

  if (fields.has('font-weight')) {
    rows.push(lengthRow({
      id: 'font-weight', label: 'Weight', group: 'Text', props: ['font-weight'], base: R.weights(host.weightOk), measure: 'fontWeight', read: fontWeight,
      show: (r, n) => String(Math.round(n)),
    }));
  }

  if (fields.has('line-height')) {
    // Read as a ratio of the size, so a size change does not move it to another rung.
    const ratio = () => lineHeightPx(cs().lineHeight, fontPx()) / fontPx();
    rows.push(lengthRow({
      id: 'line-height', label: 'Line Height', group: 'Text', props: ['line-height'], base: R.lineHeights(), measure: 'lineHeight', read: ratio, tol: 0.03,
      literal: (v) => ({ value: String(Math.round(v * 100) / 100), name: `${Math.round(v * 100) / 100}` }),
      show: (r, v) => `${r.name ?? ''} · ${Math.round(v * fontPx())} px`.replace(/^ · /, ''),
      check: (v) => ({ text: `${Math.round(v * fontPx())} px lines on ${Math.round(fontPx())} px text` }),
      suggest: (rungs) => { const s = rungs.findIndex((r) => r.token === `--line-height-${suggestedLeading(fontPx())}`); return s < 0 ? null : s; },
    }));
  }

  if (isIcon && (fields.has('width') || fields.has('height'))) {
    const size = () => el.getBoundingClientRect().width;
    const beside = num(getComputedStyle(el.parentElement ?? el).fontSize);
    rows.push(lengthRow({
      id: 'icon-size', label: 'Icon Size', group: 'Icon', props: ['width', 'height'], base: R.iconSizes(), measure: 'width', read: size,
      show: (r, px) => `${r.name ?? ''} · ${pxText(px)}`.replace(/^ · /, ''),
      check: (px) => (Math.abs(px - pairedIcon(beside)) <= 2 ? { text: `Pairs with the ${Math.round(beside)} px text beside it` } : { text: `Text beside it is ${Math.round(beside)} px` }),
      suggest: (_rungs, pxs) => { const want = pairedIcon(beside); let b = 0; pxs.forEach((p, i) => { if (Math.abs(p - want) < Math.abs(pxs[b] - want)) b = i; }); return b; },
    }));
  }

  // Box: fill, padding, corners, shadow.
  if (fields.has('background-color')) {
    const inside = () => {
      const txt = [el, ...el.querySelectorAll('*')].filter((x) => [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())).slice(0, 24);
      return host.schemes(() => txt.map((x) => toHex(getComputedStyle(x).color)));
    };
    const ink = inside();
    rows.push(colorRow({
      id: 'fill', label: 'Fill', group: 'Box', props: ['background-color'], base: R.fillRoles(), more: rampFor(toHex(cs().backgroundColor)),
      read: () => { const b = cs().backgroundColor; return /rgba\(.*,\s*0\)$|transparent/.test(b) ? effectiveBackground(el.parentElement ?? el) : b; },
      judge: (hex) => {
        if (!ink.light.length) return { ratio: { light: contrast(hex.light, ground.light), dark: contrast(hex.dark, ground.dark) }, bar: 1.1, info: true };
        const min = (s: Scheme) => Math.min(...ink[s].map((c) => contrast(c, hex[s])));
        return { ratio: { light: min('light'), dark: min('dark') }, bar: 4.5 };
      },
    }));
  }

  const padding = fields.has('padding-block') || fields.has('padding-inline');
  if (padding) {
    const yName = nameFor('padding-block');
    const xName = nameFor('padding-inline');
    const innerGap = () => { const g = num(cs().rowGap); if (g) return g; const c = [...el.children].find((x) => /flex|grid/.test(getComputedStyle(x).display)); return c ? num(getComputedStyle(c).rowGap) : 0; };
    const check = (px: number) => { const g = innerGap(); return g && px < g ? { text: `Tighter than the ${Math.round(g)} px gap inside`, warn: true } : null; };
    if (yName === xName) {
      rows.push(lengthRow({
        id: 'padding', label: 'Padding', group: 'Box', props: ['padding-block'], base: R.spacing(), measure: 'width', read: () => num(cs().paddingTop),
        show: (r, px) => pxText(px), check, band: 'padding',
      }));
    } else rows.push(paddingPair(yName, xName, check));
  }
  function paddingPair(yName: string, xName: string, check: (px: number) => { text: string; warn?: boolean } | null): LeverRow {
    const rungs = R.spacing();
    const pxs = rungs.map((r) => (r.value === '0px' ? 0 : num(resolve('width', r.value))));
    const place = (px: number) => { if (nearest(pxs, px) >= 0) return; const i = pxs.findIndex((p) => p > px); const k = i < 0 ? rungs.length : i; rungs.splice(k, 0, off(px)); pxs.splice(k, 0, px); };
    const readY = () => num(cs().paddingTop);
    const readX = () => num(cs().paddingLeft);
    const oy = host.original(readY);
    const ox = host.original(readX);
    [oy, ox, readY(), readX()].forEach(place);
    const show = (i: number) => pxText(pxs[i]);
    const idx = (px: number) => nearest(pxs, px);
    const commit = (x: number, y: number) => {
      const [oxi, oyi] = [idx(ox), idx(oy)];
      host.commit({
        field: 'padding', label: 'Padding',
        from: oxi === oyi ? show(oxi) : `${show(oyi)} × ${show(oxi)}`, to: x === y ? show(x) : `${show(y)} × ${show(x)}`,
        fromToken: rungs[oyi]?.token ?? null, toToken: rungs[y].token ?? null,
        writes: [
          { name: yName, modes: ['shared'], value: y === oyi ? null : rungs[y].value },
          { name: xName, modes: ['shared'], value: x === oxi ? null : rungs[x].value },
        ],
      });
    };
    const lever = pairLever({ label: 'Padding', labels: ['X', 'Y'], rungs, show: (r) => pxText(pxs[rungs.indexOf(r)]), onChange: commit, onHover: hoverOf('padding') });
    return {
      id: 'padding', group: 'Box', label: 'Padding', el: lever.el,
      sync() {
        const [x, y] = [idx(readX()), idx(readY())];
        lever.set(x, y, [idx(ox), idx(oy)]);
        const c = check(Math.min(pxs[x], pxs[y]));
        lever.note(c?.text ?? null, c?.warn ? 'warn' : undefined);
        host.flag('padding', c?.warn ? c.text : null);
      },
      drag(axis, px) {
        let b = 0;
        pxs.forEach((p, i) => { if (Math.abs(p - px) < Math.abs(pxs[b] - px)) b = i; });
        const [x, y] = [idx(readX()), idx(readY())];
        const nx = axis === 'y' ? x : b;
        const ny = axis === 'x' ? y : b;
        if (nx !== x || ny !== y) commit(nx, ny);
      },
      px: (axis) => (axis === 'x' ? readX() : readY()),
      move(d) {
        const [x, y] = [idx(readX()), idx(readY())];
        const c = (i: number) => Math.max(0, Math.min(rungs.length - 1, i + d));
        if (c(x) === x && c(y) === y) return false;
        commit(c(x), c(y));
        return true;
      },
    };
  }

  if (fields.has('border-radius')) {
    const parentR = () => { const p = el.parentElement; return p ? num(getComputedStyle(p).borderTopLeftRadius) : 0; };
    rows.push(lengthRow({
      id: 'radius', label: 'Corners', group: 'Box', props: ['border-radius'], base: R.radii(), measure: 'width', read: () => num(cs().borderTopLeftRadius),
      show: (r, px) => (r.name === 'Pill' || r.name === 'None' ? r.name : r.name ? `${r.name} · ${pxText(px)}` : pxText(px)),
      check: (px) => { const p = parentR(); return p && px > p && px < 999 ? { text: `Rounder than its container (${Math.round(p)} px)`, warn: true } : null; },
    }));
  }

  if (fields.has('box-shadow')) {
    const shadows = R.shadows();
    const name = nameFor('box-shadow');
    const read = () => cs().boxShadow;
    const origin = host.original(read);
    const resolveShadow = (v: string) => { at.append(probe); probe.style.boxShadow = v; const s = getComputedStyle(probe).boxShadow; probe.style.boxShadow = ''; probe.remove(); return s; };
    const vals = shadows.map((r) => resolveShadow(r.value));
    let oi = vals.indexOf(origin);
    if (oi < 0) { shadows.splice(1, 0, { value: origin, name: 'Custom' }); vals.splice(1, 0, origin); oi = 1; }
    const commit = (i: number) => host.commit({
      field: 'shadow', label: 'Shadow', from: shadows[oi].name!, to: shadows[i].name!, fromToken: shadows[oi].token ?? null, toToken: shadows[i].token ?? null,
      writes: [{ name, modes: ['shared'], value: i === oi ? null : shadows[i].value }],
    });
    const lever = rampLever({ label: 'Shadow', rungs: shadows, show: (r) => r.name ?? '', onChange: commit });
    const now = () => { const raw = host.raw('shared', name); const i = raw ? shadows.findIndex((r) => r.value === raw) : vals.indexOf(read()); return i < 0 ? oi : i; };
    rows.push({
      id: 'shadow', group: 'Box', label: 'Shadow', el: lever.el,
      sync() { lever.set(now(), oi); },
      move(d) { const c = now(); const i = Math.max(0, Math.min(shadows.length - 1, c + d)); if (i === c) return false; commit(i); return true; },
    });
  }

  // Border: width, then colour.
  if (fields.has('border-width')) {
    rows.push(lengthRow({
      id: 'border-width', label: 'Border', group: 'Border', props: ['border-width'], base: R.borderWidths(), measure: 'width', read: () => num(cs().borderTopWidth),
      show: (r, px) => (px ? pxText(px) : 'None'),
      check: (px) => (px === 0 && contrast(ownGround.light, ground.light) < 1.1 ? { text: 'No edge: the fill matches what is behind it' } : null),
    }));
  }
  if (fields.has('border-color')) {
    rows.push(colorRow({
      id: 'border-color', label: 'Border Color', group: 'Border', props: ['border-color'], base: R.borderRoles(), more: rampFor(toHex(cs().borderTopColor)),
      read: () => cs().borderTopColor,
      judge: (hex) => ({ ratio: { light: contrast(hex.light, ground.light), dark: contrast(hex.dark, ground.dark) }, bar: NON_TEXT, info: true }),
    }));
  }

  // Layout: the gap between children.
  if (fields.has('gap')) {
    const outer = () => { const p = el.parentElement; return p && /flex|grid/.test(getComputedStyle(p).display) && p.children.length > 1 ? num(getComputedStyle(p).rowGap) : 0; };
    rows.push(lengthRow({
      id: 'gap', label: 'Gap', group: 'Layout', props: ['gap'], base: R.spacing(), measure: 'width', read: () => (cs().rowGap === 'normal' ? 0 : num(cs().rowGap)),
      show: (r, px) => pxText(px), band: 'gap',
      check: (px) => { const g = outer(); return g && px >= g ? { text: `As wide as the ${Math.round(g)} px gap between groups`, warn: true } : null; },
    }));
  }
  return rows;
}

export const GROUP_ORDER: LeverRow['group'][] = ['Text', 'Icon', 'Box', 'Border', 'Layout'];
