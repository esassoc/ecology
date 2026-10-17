// The design layer's panel: Figma's right sidebar for a spoke's tokens, drawn
// into a shadow root the host adapter hands it (Astro's dev toolbar canvas
// today), so nothing leaks either way. No framework imports: an adapter
// supplies PanelHost. Every control comes from the kit in ./ui.
//
// Tune edits the spoke's real custom properties live: Palette picks a whole
// theme (palettes.ts) and tunes its chrome as one ramp (surfaces.ts); the other
// sections override the properties the spoke config maps (defaults.mjs). Any
// colour, size, weight or length can be bound to one of the page's tokens
// instead of a raw value (stored as var(--token)). Sizes and Components carry
// the reference spoke's value: a field that departs from it shows that value
// as a chip that resets it, and "Use <reference>" applies them all. A weight is
// a number on the face's own wght axis, read from the @font-face rules the page
// has loaded; 350 is refused. Comments picks an element on the page and
// appends a line to feedback.jsonl.
//
// bcn-lego-checked: no esa- lego fits a dev tool whose job is editing the tokens the
// esa-* legos read: they would restyle themselves mid-tune. So the panel's own kit
// (./ui), on the tool's own palette and face.
import {
  BANNED_WEIGHT, FONT_OPTIONS, buildCss, googleHref, migrateShared, modeVars,
  type ColorControl, type Departure, type FeedbackRecord, type FontControl, type FontOption,
  type LengthControl, type Mode, type PanelHost, type ResolvedConfig, type ServerState,
  type SizeControl, type Tweaks, type WeightAxis,
} from './controls';
import { contrast, firstFamily, oklchL, toHex } from './color';
import { effectiveBackground, selectorFor, snippet, source } from './describe';
import {
  RECIPE, SURFACE_IDS, SURFACE_LABELS, SURFACE_SHORT,
  grade, hexToHsl, rampFromHexes, signed, surfaceHex, surfaceHueSat,
  type Ramp, type SurfaceId,
} from './surfaces';
import { GROUPS, PALETTES, paletteById, paletteRamp } from './palettes';
import {
  UI_CSS, h, colorField, iconButton, numberField, palettePicker, section, segmented, selectField, switchRow, tabs,
  boundToken, closePopover, invalidateTokens, registerPanelFont, type ICONS, type PaletteOption,
} from './ui';

/** The panel's width in px: --ui-w in ui/styles.ts, repeated here for the page margin it docks into. */
const WIDTH = 240;
const STRIP = 40;
const SECTIONS_KEY = 'design-layer:closed';

interface Base {
  colors: Record<string, string>;
  surfaces: Record<SurfaceId, string>;
  fonts: Record<string, string>;
  sizes: Record<string, number>;
  weights: Record<string, number>;
  components: Record<string, number>;
}
type NumberHandle = ReturnType<typeof numberField>;
type ColorHandle = ReturnType<typeof colorField>;

// The spoke's controls, set by mountPanel before anything renders.
let CFG: ResolvedConfig;
let COLORS: ColorControl[] = [];
let FONTS: FontControl[] = [];
let SIZES: SizeControl[] = [];
let COMPONENTS: LengthControl[] = [];
let INKS: string[] = [];

const emptyTweaks = (): Tweaks => ({ light: {}, dark: {}, shared: {} });
/** The reference's value for a size row, or null when it names none. */
const refSize = (id: string) => { const v = CFG.reference?.values[id]; return typeof v === 'object' ? v : null; };
/** The reference's value for a length row, or null when it names none. */
const refLength = (id: string) => { const v = CFG.reference?.values[id]; return typeof v === 'number' ? v : null; };
const normalize = (t: Partial<Tweaks> | undefined): Tweaks => ({
  light: { ...(t?.light ?? {}) }, dark: { ...(t?.dark ?? {}) }, shared: migrateShared(t?.shared ?? {}, CFG),
  ...(t?.palette && Object.keys(t.palette).length ? { palette: structuredClone(t.palette) } : {}),
});
const cloneRamp = (r: Ramp): Ramp => structuredClone(r);
const round1 = (n: number) => Math.round(n * 10) / 10;
const half = (n: number) => Math.round(n * 2) / 2;
/** Ranges per mode for the canvas lightness; offsets share one range. */
const CANVAS_RANGE: Record<Mode, [number, number]> = { light: [85, 100], dark: [0, 25] };
const OFFSET_RANGE: [number, number] = [-8, 4];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const keyOf = (href: string) => { const u = new URL(href, location.href); return u.pathname + u.hash; };
const pageKey = () => location.pathname + location.hash;

/** The scrub handle a length row gets, from what its variable names. */
function leadFor(c: LengthControl): keyof typeof ICONS {
  const n = `${c.id} ${c.cssVar}`;
  if (/radius/.test(n)) return 'radius';
  if (/icon/.test(n)) return 'icon';
  if (/padding-x|pad-x|inline/.test(n)) return 'padX';
  if (/padding|pad|row/.test(n)) return 'padY';
  if (/height|control/.test(n)) return 'height';
  return 'size';
}

// The toolbar closes its open app on any Escape; the panel's popovers use
// Escape too, so the panel stays open (the toggle key, the toolbar icon and the
// collapse button close it).
let escapeAt = 0;

// What the panel needs beyond the kit: docking, the collapsed strip, the
// comments pane, and the page overlays (pins, the hover and picked boxes).
const PANEL_CSS = `
  .dock { position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483000; }
  .strip { display: flex; justify-content: center; width: ${STRIP}px; height: 100%; padding-top: 8px; border-left: 1px solid var(--ui-line); background: var(--ui-bg); }
  .pane { display: grid; gap: 6px; padding: 8px var(--ui-pad); }
  .picked { display: grid; gap: 2px; padding: 8px; border-radius: var(--ui-r); background: var(--ui-field); }
  .picked__text { overflow-wrap: anywhere; }
  .picked__where, .c-where { color: var(--ui-ink-3); overflow-wrap: anywhere; }
  .ui textarea { display: block; width: 100%; min-height: 72px; padding: 6px 8px; border: 1px solid transparent; border-radius: var(--ui-r); background: var(--ui-field); resize: vertical; }
  .ui textarea:focus { border-color: var(--ui-accent); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .clist { display: grid; margin: 0; padding: 0; list-style: none; }
  .clist li { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: start; padding: 8px 0; }
  .clist li + li { border-top: 1px solid var(--ui-line); }
  .clist .pin { position: static; box-shadow: none; }
  .c-text { overflow-wrap: anywhere; }
  .fails { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; color: var(--ui-fail); }
  .fails:empty { display: none; }
  .pin { position: fixed; z-index: 2147482999; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
    background: var(--ui-accent); color: var(--ui-on-accent); font-weight: 600; box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,.35); pointer-events: none; }
  .box { position: fixed; z-index: 2147482998; pointer-events: none; border: 2px solid var(--ui-accent); background: rgba(13, 153, 255, 0.08); border-radius: 2px; }
  .box--picked { background: rgba(13, 153, 255, 0.16); }
`;

/** Draws the panel into `canvas` (a shadow root) and wires it to `host`.
    Returns the hook a host calls before closing on Escape. */
export function mountPanel(canvas: ShadowRoot, host: PanelHost, config: ResolvedConfig): { allowClose(): boolean } {
  CFG = config;
  COLORS = config.colors;
  FONTS = config.fonts;
  SIZES = config.sizes;
  COMPONENTS = config.lengths;
  INKS = config.inks.filter((i) => COLORS.some((c) => c.id === i));
  const CSS_ROUTE = host.cssRoute;
  if (host.fontUrl) registerPanelFont(host.fontUrl);
  canvas.innerHTML = `<style>${UI_CSS}${PANEL_CSS}</style>`;
  const ui = h('div', { class: 'ui' });
  canvas.append(ui);
  const html = document.documentElement;
  const root = canvas;

  // Page-side nodes: the live preview, the font links, and a probe that reads tokens.
  const live = document.createElement('style');
  live.id = 'design-layer-live';
  document.head.append(live);
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.id = 'design-layer-fonts';
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;';

  let open = false;
  let collapsed = false;
  let tab: 'tune' | 'comments' = 'tune';
  let mode: Mode = html.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light';
  let tweaks = emptyTweaks();
  let saved = emptyTweaks();
  let feedback: FeedbackRecord[] = [];
  let commenting = false;
  let picked: Element | null = null;
  let hovered: Element | null = null;
  let linked = true;
  const base: Partial<Record<Mode, Base>> = {};

  // ── tokens ──────────────────────────────────────────────────────────
  type Prop = 'color' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'width';
  /** What a CSS value computes to on the page right now (a var() resolves). */
  function measure(prop: Prop, value: string) {
    const attached = probe.isConnected;
    if (!attached) document.body.append(probe);
    probe.style[prop] = value;
    const out = getComputedStyle(probe)[prop];
    probe.style[prop] = '';
    if (!attached) probe.remove();
    return out;
  }
  // The theme's own values, read with every override switched off.
  function readBase(m: Mode): Base {
    if (base[m]) return base[m]!;
    const savedSheet = document.getElementById('design-layer-tweaks') as HTMLLinkElement | null;
    const scheme = html.getAttribute('data-scheme');
    live.disabled = true;
    if (savedSheet) savedSheet.disabled = true;
    html.setAttribute('data-scheme', m);
    document.body.append(probe);
    const read = (prop: Prop, v: string) => measure(prop, `var(${v})`);
    const b: Base = {
      colors: Object.fromEntries(COLORS.map((c) => [c.id, toHex(read('color', c.cssVar))])),
      surfaces: Object.fromEntries(SURFACE_IDS.map((id) => [id, toHex(read('color', CFG.roles[id]?.[0] ?? '--color-background-default'))])) as Record<SurfaceId, string>,
      fonts: Object.fromEntries(FONTS.map((f) => [f.id, read('fontFamily', f.cssVar)])),
      sizes: Object.fromEntries(SIZES.map((s) => [s.id, Number.parseFloat(read('fontSize', s.cssVar))])),
      weights: Object.fromEntries(SIZES.map((s) => [s.id, Number.parseFloat(read('fontWeight', s.weightVar))])),
      components: Object.fromEntries(COMPONENTS.map((c) => [c.id, Number.parseFloat(read('width', c.cssVar))])),
    };
    probe.remove();
    if (scheme === null) html.removeAttribute('data-scheme'); else html.setAttribute('data-scheme', scheme);
    live.disabled = false;
    if (savedSheet) savedSheet.disabled = false;
    return (base[m] = b);
  }
  /** A colour row's value as stored: a hex, var(--token), or undefined for the theme's own. */
  const colorRaw = (id: string, m: Mode) => modeVars(tweaks, m, CFG.roles)[COLORS.find((c) => c.id === id)!.cssVar];
  /** The override, else the palette's value, else the theme's own, as hex. */
  const colorValue = (id: string, m: Mode) => {
    const v = colorRaw(id, m);
    if (!v) return readBase(m).colors[id];
    return boundToken(v) ? toHex(measure('color', v)) : toHex(v);
  };
  const fontOption = (id: string) => {
    const f = FONTS.find((x) => x.id === id)!;
    const css = tweaks.shared[f.cssVar] ?? readBase(mode).fonts[id];
    return FONT_OPTIONS.find((o) => firstFamily(o.css) === firstFamily(css));
  };
  /** A shared length as stored (Npx or var(--token)) resolved to px, else the fallback. */
  const lengthOf = (cssVar: string, fallback: number, prop: Prop = 'width') => {
    const v = tweaks.shared[cssVar];
    if (!v) return fallback;
    return boundToken(v) ? half(Number.parseFloat(measure(prop, v))) : Number.parseFloat(v);
  };
  const baseSize = (id: string) => half(readBase(mode).sizes[id]);
  const sizeOf = (id: string) => SIZES.find((s) => s.id === id)!;
  const sizeValue = (id: string) => lengthOf(sizeOf(id).cssVar, baseSize(id), 'fontSize');
  const weightValue = (id: string) => {
    const v = tweaks.shared[sizeOf(id).weightVar];
    if (!v) return readBase(mode).weights[id];
    return Number.parseFloat(boundToken(v) ? measure('fontWeight', v) : v);
  };
  const compOf = (id: string) => COMPONENTS.find((c) => c.id === id)!;
  const baseComp = (id: string) => half(readBase(mode).components[id]);
  const compValue = (id: string) => lengthOf(compOf(id).cssVar, baseComp(id));
  /** What a field shows: the bound var(--token), else the number. */
  const shown = (cssVar: string, n: number) => { const v = tweaks.shared[cssVar]; return v && boundToken(v) ? v : n; };

  /** Every size, weight and length that differs from the reference's, for Save. */
  function departures(): Departure[] {
    const out: Departure[] = [];
    for (const s of SIZES) {
      const r = refSize(s.id);
      if (!r) continue;
      const size = sizeValue(s.id);
      const weight = weightValue(s.id);
      if (size !== r.size) out.push({ id: `${s.id}-size`, label: `${s.label} Size`, cssVar: s.cssVar, value: size, reference: r.size });
      if (weight !== r.weight) out.push({ id: `${s.id}-weight`, label: `${s.label} Weight`, cssVar: s.weightVar, value: weight, reference: r.weight });
    }
    for (const c of COMPONENTS) {
      const r = refLength(c.id);
      if (r === null) continue;
      const v = compValue(c.id);
      if (v !== r) out.push({ id: c.id, label: c.label, cssVar: c.cssVar, value: v, reference: r });
    }
    return out;
  }
  /** Every size, weight and length at the reference's value; a value that is also the theme's own stays unset. */
  function applyReference() {
    const b = readBase(mode);
    for (const s of SIZES) {
      const r = refSize(s.id);
      if (!r) continue;
      if (r.size === baseSize(s.id)) delete tweaks.shared[s.cssVar]; else tweaks.shared[s.cssVar] = `${r.size}px`;
      if (r.weight === b.weights[s.id]) delete tweaks.shared[s.weightVar]; else tweaks.shared[s.weightVar] = String(r.weight);
    }
    for (const c of COMPONENTS) {
      const r = refLength(c.id);
      if (r === null) continue;
      if (r === baseComp(c.id)) delete tweaks.shared[c.cssVar]; else tweaks.shared[c.cssVar] = `${r}px`;
    }
    applyLive();
    sync();
  }
  const atReference = () => SIZES.every((s) => { const r = refSize(s.id); return !r || (sizeValue(s.id) === r.size && weightValue(s.id) === r.weight); })
    && COMPONENTS.every((c) => { const r = refLength(c.id); return r === null || compValue(c.id) === r; });

  /** A face's weights as the page has loaded them: the wght range its
      @font-face rules declare (a variable face: every whole number in it), else
      the weights its static faces declare, else (not declared yet) the css2
      range it will load or its listed weights. Cached until fonts change. */
  const axes = new Map<string, WeightAxis>();
  const keyword = (w: string) => (w === 'normal' ? 400 : w === 'bold' ? 700 : Number.parseFloat(w));
  function axisOf(opt: FontOption | undefined): WeightAxis {
    const fam = opt ? firstFamily(opt.css) : '';
    const hit = axes.get(fam);
    if (hit) return hit;
    const ranges: [number, number][] = [];
    const stops = new Set<number>();
    for (const f of document.fonts) {
      if (firstFamily(f.family) !== fam || f.style !== 'normal') continue;
      const [a, b = a] = f.weight.trim().split(/\s+/).map(keyword);
      if (!Number.isFinite(a)) continue;
      if (b !== a) ranges.push([a, b]); else stops.add(a);
    }
    let axis: WeightAxis;
    if (ranges.length) {
      const all = [...ranges.flat(), ...stops];
      axis = { min: Math.min(...all), max: Math.max(...all), stops: null };
    } else if (stops.size) {
      const list = [...stops].sort((x, y) => x - y);
      axis = { min: list[0], max: list[list.length - 1], stops: list };
    } else {
      const m = opt?.google?.match(/wght@(\d+)\.\.(\d+)/);
      const list = opt?.weights ?? [300, 400, 500, 600, 700, 800];
      axis = m ? { min: Number(m[1]), max: Number(m[2]), stops: null } : { min: list[0], max: list[list.length - 1], stops: list };
    }
    if (fam && (ranges.length || stops.size)) axes.set(fam, axis);
    return axis;
  }
  /** A weight brought onto the axis: whole, in range, a static face's nearest weight. */
  const fitWeight = (axis: WeightAxis, n: number) => {
    const w = Math.min(axis.max, Math.max(axis.min, Math.round(n)));
    return axis.stops ? axis.stops.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a)) : w;
  };
  const isBanned = (v: string | number) => {
    const t = String(v).trim();
    return Number.parseFloat(t) === BANNED_WEIGHT || t === `var(--font-weight-${BANNED_WEIGHT})`;
  };
  /** Every tuned weight (any mode, any weight variable) set to the banned 350. */
  const bannedTweaks = () => (['shared', 'light', 'dark'] as const).flatMap((k) =>
    Object.entries(tweaks[k]).filter(([v, val]) => /weight/.test(v) && isBanned(val)).map(([v]) => v));

  // ── surfaces ────────────────────────────────────────────────────────
  const baseRamp = (m: Mode) => rampFromHexes(readBase(m).surfaces);
  const rampOf = (m: Mode): Ramp => tweaks.palette?.[m]?.ramp ?? baseRamp(m);
  /** Writes a mode's choice: the palette (null: the theme's own surfaces) and
      its ramp as tuned. buildCss turns it into the variables. */
  function setRamp(m: Mode, ramp: Ramp | null, palette: string | null = tweaks.palette?.[m]?.palette ?? null, render = true) {
    const isBase = ramp && !palette && SURFACE_IDS.every((id) => surfaceHex(ramp, id) === readBase(m).surfaces[id]);
    if (!ramp || isBase) {
      if (tweaks.palette) { delete tweaks.palette[m]; if (!Object.keys(tweaks.palette).length) delete tweaks.palette; }
    } else (tweaks.palette ??= {})[m] = { palette, ramp };
    if (!render) return;
    applyLive();
    sync();
  }
  /** A palette is a whole theme: picking one sets both modes, each tuned from its own ramp. */
  function pickPalette(id: string) {
    const p = paletteById(id)!;
    setRamp('light', paletteRamp(p, 'light'), id, false);
    setRamp('dark', paletteRamp(p, 'dark'), id);
  }
  function editRamp(fn: (r: Ramp) => void) {
    const r = cloneRamp(rampOf(mode));
    fn(r);
    setRamp(mode, r);
  }
  /** A surface's lightness, as its control shows it: the canvas absolute, the others offsets. */
  function setSurfaceL(r: Ramp, id: SurfaceId, v: number) {
    if (id !== 'canvas') { r.off[id] = v; return; }
    // Move Together: the canvas carries the ramp. Alone: the others hold their lightness.
    if (!linked) { const d = v - r.l; r.off.bar -= d; r.off.rail -= d; }
    r.l = v;
  }
  const surfaceControlValue = (r: Ramp, id: SurfaceId) => (id === 'canvas' ? r.l : r.off[id]);

  function applyLive() {
    const dock = open ? (collapsed ? STRIP : WIDTH) : 0;
    live.textContent = buildCss(tweaks, CFG.roles, true) + (dock ? `html:root body { margin-right: ${dock}px; }\n` : '');
    const specs = [...new Set(Object.values(tweaks.shared).map((css) => FONT_OPTIONS.find((o) => o.css === css)?.google).filter((g): g is string => !!g))];
    const href = googleHref(specs);
    if (href) { if (fontLink.getAttribute('href') !== href) fontLink.href = href; if (!fontLink.isConnected) document.head.append(fontLink); }
    else fontLink.remove();
  }
  function set(scope: Mode | 'shared', cssVar: string, value: string | null) {
    if (value === null) delete tweaks[scope][cssVar]; else tweaks[scope][cssVar] = value;
    applyLive();
    sync();
  }

  // ── build ───────────────────────────────────────────────────────────
  let closed: string[] = [];
  try { closed = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '[]'); } catch { /* storage blocked */ }
  const fold = (id: string) => ({
    closed: closed.includes(id),
    onToggle: (isClosed: boolean) => {
      closed = isClosed ? [...new Set([...closed, id])] : closed.filter((x) => x !== id);
      try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(closed)); } catch { /* storage blocked */ }
    },
  });
  const lbl = (t: string) => h('span', { class: 'lbl', title: t }, t);

  // Head: Tune / Comments, the mode, collapse.
  const tabBar = tabs({ label: 'Panel', options: [{ value: 'tune', label: 'Tune' }, { value: 'comments', label: 'Comments' }], onChange: (t) => setTab(t) });
  const modeSeg = segmented<Mode>({
    label: 'Mode', fit: true,
    options: [{ value: 'light', icon: 'sun', label: 'Light' }, { value: 'dark', icon: 'moon', label: 'Dark' }],
    onChange: (m) => { mode = m; html.setAttribute('data-scheme', m); invalidateTokens(); sync(); },
  });
  const head = h('div', { class: 'p-head' }, tabBar.el, h('span', { class: 'grow' }), modeSeg.el, iconButton('collapse', 'Collapse Panel', () => setCollapsed(true)));

  // Palette: the whole theme, the shared hue and saturation, each surface.
  const paletteOptions = (): PaletteOption[] => PALETTES.map((p) => {
    const flags = grade(paletteRamp(p, mode), mode).flags;
    return {
      id: p.id, name: p.like ? `${p.name} (${p.like})` : p.name, group: GROUPS.find((g) => g.id === p.group)!.label,
      colors: [p[mode].bar, p[mode].canvas, p[mode].primary], off: flags.length ? flags.join('; ') : undefined,
    };
  });
  const picker = palettePicker({ root, label: 'Palette', palettes: paletteOptions, onPick: pickPalette, emptyLabel: 'Theme Default' });
  const linkBtn = iconButton('link', 'Move Together', () => { linked = !linked; sync(); }, true);
  const hsField = (label: string, key: 'h' | 's', apply: (r: Ramp, v: number) => void) =>
    numberField({ root, label, lead: { text: key.toUpperCase() }, min: 0, max: key === 'h' ? 360 : 100, step: key === 'h' ? 1 : 0.5, onChange: (v) => { if (typeof v === 'number') editRamp((r) => apply(r, v)); } });
  const sharedH = hsField('Shared hue', 'h', (r, v) => { r.h = v; delete r.own; });
  const sharedS = hsField('Shared saturation', 's', (r, v) => { r.s = v; delete r.own; });
  const sharedRow = h('div', { class: 'row2' }, sharedH.el, sharedS.el);
  const surfaces = SURFACE_IDS.map((id) => {
    const label = SURFACE_LABELS[id];
    const color = colorField({
      root, label, tokens: false,
      onChange: (v) => {
        const hsl = hexToHsl(v);
        editRamp((r) => {
          // Move Together: the hex sets the shared hue and saturation. Alone: this surface's own.
          if (linked) { r.h = hsl.h; r.s = hsl.s; delete r.own; } else (r.own ??= {})[id] = { h: hsl.h, s: hsl.s };
          setSurfaceL(r, id, id === 'canvas' ? hsl.l : hsl.l - r.l);
        });
      },
    });
    const range = id === 'canvas' ? CANVAS_RANGE[mode] : OFFSET_RANGE;
    const light = numberField({
      root, label: `${label} ${id === 'canvas' ? 'lightness' : 'lightness offset'}`, lead: { text: 'L' }, min: range[0], max: range[1], step: 0.5,
      onChange: (v) => { if (typeof v === 'number') editRamp((r) => setSurfaceL(r, id, v)); },
    });
    const ownField = (key: 'h' | 's') => numberField({
      root, label: `${label} ${key === 'h' ? 'hue' : 'saturation'}`, lead: { text: key.toUpperCase() }, min: 0, max: key === 'h' ? 360 : 100, step: key === 'h' ? 1 : 0.5,
      onChange: (v) => { if (typeof v === 'number') editRamp((r) => { (r.own ??= {})[id] = { ...surfaceHueSat(r, id), [key]: v }; }); },
    });
    const ownH = ownField('h');
    const ownS = ownField('s');
    const name = lbl(label);
    const row = h('div', { class: 'rowl rowl--srf' }, name, color.el, light.el);
    const own = h('div', { class: 'row2' }, ownH.el, ownS.el);
    return { id, color, light, ownH, ownS, name, row, own };
  });
  const readOffsets = h('div', { class: 'readout' });
  const readMatch = h('div', { class: 'readout' }, 'Same Hue and Saturation');
  const readFlags = h('ul', { class: 'fails' });
  const paletteSec = section({
    id: 'palette', title: 'Palette', ...fold('palette'),
    actions: [linkBtn, iconButton('reset', 'Reset Palette', () => { setRamp('light', null, null, false); setRamp('dark', null); })],
    body: [picker.el, sharedRow, ...surfaces.flatMap((s) => [s.row, s.own]), readOffsets, readMatch, readFlags],
  });

  // Colors, with the contrast of each ink on each surface.
  const colorRows = COLORS.map((c) => {
    const f = colorField({ root, label: c.label, tokens: { prefer: /^--color-(content|background|border)-/ }, onChange: (v) => set(mode, c.cssVar, v) });
    const name = lbl(c.label);
    return { c, f, name, row: h('div', { class: 'rowl' }, name, f.el) };
  });
  const contrastCells = new Map<string, HTMLElement>();
  const contrastTable = h('div', { class: 'grid-table', style: `grid-template-columns: 48px repeat(${INKS.length}, 1fr)` },
    h('span', { class: 'h' }, 'Contrast'), ...INKS.map((i) => { const t = COLORS.find((c) => c.id === i)!.label; return h('span', { class: 'h', title: t }, t); }),
    ...SURFACE_IDS.flatMap((s) => [h('span', {}, SURFACE_SHORT[s]), ...INKS.map((i) => {
      const cell = h('span', {});
      contrastCells.set(`${s}:${i}`, cell);
      return cell;
    })]));
  const colorsSec = section({
    id: 'colors', title: 'Colors', ...fold('colors'),
    actions: [iconButton('reset', 'Reset Colors', () => { for (const c of COLORS) delete tweaks[mode][c.cssVar]; applyLive(); sync(); })],
    body: [...colorRows.map((r) => r.row), ...(INKS.length ? [contrastTable] : [])],
  });

  // Fonts.
  const fontRows = FONTS.map((f) => {
    const sel = selectField({
      root, label: `${f.label} font`, options: FONT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
      onChange: (id) => {
        const opt = FONT_OPTIONS.find((o) => o.id === id)!;
        const isDefault = firstFamily(opt.css) === firstFamily(readBase(mode).fonts[f.id]);
        // A row set in this face keeps its weight if the new face's axis has it, else the nearest it does.
        const axis = axisOf(opt);
        for (const s of SIZES.filter((x) => x.font === f.id)) {
          const w = weightValue(s.id);
          const fit = fitWeight(axis, w);
          if (fit !== w) tweaks.shared[s.weightVar] = String(fit === BANNED_WEIGHT ? 400 : fit);
        }
        set('shared', f.cssVar, isDefault ? null : opt.css);
      },
    });
    const name = lbl(f.label);
    return { f, sel, name, row: h('div', { class: 'rowl' }, name, sel.el) };
  });
  const fontsSec = section({
    id: 'fonts', title: 'Fonts', ...fold('fonts'),
    actions: [iconButton('reset', 'Reset Fonts', () => { for (const f of FONTS) delete tweaks.shared[f.cssVar]; applyLive(); sync(); })],
    body: fontRows.map((r) => r.row),
  });

  // Sizes: each type role's size and weight, then the icon sizes.
  const setSize = (s: SizeControl, v: number | string) => {
    if (typeof v === 'string') { set('shared', s.cssVar, v); return; }
    set('shared', s.cssVar, v === baseSize(s.id) ? null : `${v}px`);
  };
  const setWeight = (s: SizeControl, v: number | string) => {
    if (typeof v === 'string') { if (!isBanned(v)) set('shared', s.weightVar, v); else sync(); return; }
    const fit = fitWeight(axisOf(fontOption(s.font)), v);
    const w = fit === BANNED_WEIGHT ? 400 : fit;
    set('shared', s.weightVar, w === readBase(mode).weights[s.id] ? null : String(w));
  };
  const sizeRows = SIZES.map((s) => {
    const size = numberField({
      root, label: `${s.label} size`, lead: 'size', min: s.min, max: s.max, step: 0.5,
      tokens: { kind: 'length', prefer: /font-size|typography/ },
      onChange: (v) => setSize(s, v),
      onReference: () => { const r = refSize(s.id); if (r) setSize(s, r.size); },
    });
    const weight = numberField({
      root, label: `${s.label} weight`, lead: { text: 'W' }, min: 100, max: 900, step: 1, refuse: [BANNED_WEIGHT],
      tokens: { kind: 'weight' },
      onChange: (v) => setWeight(s, v),
      onReference: () => { const r = refSize(s.id); if (r) setWeight(s, r.weight); },
    });
    const name = lbl(s.label);
    return { s, size, weight, name, row: h('div', { class: 'rowl rowl--2' }, name, size.el, weight.el) };
  });
  const setLength = (c: LengthControl, v: number | string) => {
    if (typeof v === 'string') { set('shared', c.cssVar, v); return; }
    set('shared', c.cssVar, v === baseComp(c.id) ? null : `${v}px`);
  };
  const lengthRow = (c: LengthControl) => {
    const f = numberField({
      root, label: c.label, lead: leadFor(c), min: c.min, max: c.max, step: c.step, unit: 'px',
      tokens: { kind: 'length', prefer: /radius|spacing|size/ },
      onChange: (v) => setLength(c, v),
      onReference: () => { const r = refLength(c.id); if (r !== null) setLength(c, r); },
    });
    const name = lbl(c.label);
    return { c, f, name, row: h('div', { class: 'rowl' }, name, f.el) };
  };
  const iconRows = COMPONENTS.filter((c) => c.group === 'sizes').map(lengthRow);
  const compRows = COMPONENTS.filter((c) => !c.group).map(lengthRow);
  const bannedList = h('ul', { class: 'fails' });
  const refBtn = CFG.reference
    ? h('button', { type: 'button', class: 'tb', 'aria-pressed': 'false', title: `Every size, weight and length at ${CFG.reference.name}'s value` }, `Use ${CFG.reference.name}`)
    : null;
  refBtn?.addEventListener('click', applyReference);
  const resetVars = (vars: string[]) => { for (const v of vars) delete tweaks.shared[v]; applyLive(); sync(); };
  const sizesSec = section({
    id: 'sizes', title: 'Sizes', ...fold('sizes'),
    actions: [...(refBtn ? [refBtn] : []), iconButton('reset', 'Reset Sizes', () => resetVars([...SIZES.flatMap((s) => [s.cssVar, s.weightVar]), ...iconRows.map((r) => r.c.cssVar)]))],
    body: [...sizeRows.map((r) => r.row), ...iconRows.map((r) => r.row), bannedList],
  });
  const compsSec = compRows.length ? section({
    id: 'components', title: 'Components', ...fold('components'),
    actions: [iconButton('reset', 'Reset Components', () => resetVars(compRows.map((r) => r.c.cssVar)))],
    body: compRows.map((r) => r.row),
  }) : null;

  const tunePane = h('div', { class: 'p-body', role: 'tabpanel' }, paletteSec, colorsSec, fontsSec, sizesSec, ...(compsSec ? [compsSec] : []));

  // Comments: pick an element, write a line.
  const commentSwitch = switchRow({ label: 'Comment Mode', onChange: (on) => setCommenting(on) });
  const pickedText = h('div', { class: 'picked__text' });
  const pickedWhere = h('div', { class: 'picked__where' });
  const textarea = h('textarea', { 'aria-label': 'Comment', placeholder: 'Add a comment' });
  const commentSave = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Save');
  const commentCancel = h('button', { type: 'button', class: 'btn' }, 'Cancel');
  const composer = h('div', { class: 'pane', hidden: true }, h('div', { class: 'picked' }, pickedText, pickedWhere), textarea, h('div', { class: 'actions' }, commentSave, commentCancel));
  const list = h('ol', { class: 'clist' });
  const listSec = section({ id: 'open-comments', title: 'Open', body: [list] });
  const commentsPane = h('div', { class: 'p-body', role: 'tabpanel', hidden: true }, h('div', { class: 'pane' }, commentSwitch.el), composer, listSec);

  // Foot: Reset All, Save.
  const resetAll = h('button', { type: 'button', class: 'tb' }, 'Reset All');
  const save = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Saved');
  const foot = h('div', { class: 'p-foot' }, resetAll, h('span', { class: 'grow' }), save);
  resetAll.addEventListener('click', () => { tweaks = emptyTweaks(); applyLive(); sync(); });
  save.addEventListener('click', () => host.send('save-tweaks', { json: { ...tweaks, departures: departures() }, css: buildCss(tweaks, CFG.roles) }));

  const panel = h('aside', { class: 'p', 'aria-label': 'Design Layer' }, head, tunePane, commentsPane, foot);
  const dock = h('div', { class: 'dock' }, panel);
  const strip = h('div', { class: 'dock strip', hidden: true }, iconButton('expand', 'Expand Panel', () => setCollapsed(false)));
  const hoverBox = h('div', { class: 'box', hidden: true });
  const pickedBox = h('div', { class: 'box box--picked', hidden: true });
  const pins = h('div', {});
  ui.append(dock, strip, hoverBox, pickedBox, pins);

  // ── render ──────────────────────────────────────────────────────────
  function sync() {
    modeSeg.set(mode);
    tabBar.set(tab);
    syncSurfaces();
    for (const r of colorRows) {
      const hex = colorValue(r.c.id, mode);
      const raw = colorRaw(r.c.id, mode);
      const isSet = r.c.cssVar in tweaks[mode];
      r.f.set(raw && boundToken(raw) ? raw : hex, { resolved: hex, meta: `L ${oklchL(hex).toFixed(2)}`, setByUser: isSet });
      r.name.toggleAttribute('data-set', isSet);
    }
    const ramp = rampOf(mode);
    for (const s of SURFACE_IDS) for (const i of INKS) {
      const ratio = contrast(colorValue(i, mode), surfaceHex(ramp, s));
      const cell = contrastCells.get(`${s}:${i}`)!;
      const pass = ratio >= 4.5;
      cell.classList.toggle('fail', !pass);
      cell.textContent = `${ratio.toFixed(1)} ${pass ? 'AA' : 'Fail'}`;
    }
    for (const r of fontRows) {
      const opt = fontOption(r.f.id);
      if (opt) r.sel.set(opt.id);
      r.name.toggleAttribute('data-set', r.f.cssVar in tweaks.shared);
    }
    const ref = CFG.reference;
    for (const r of sizeRows) {
      const { s } = r;
      const ref1 = refSize(s.id);
      const size = sizeValue(s.id);
      r.size.set(shown(s.cssVar, size), { reference: ref && ref1 ? { name: ref.name, value: ref1.size } : null, setByUser: s.cssVar in tweaks.shared });
      // The weight field follows the face's axis (re-ranged when the face changes).
      const axis = axisOf(fontOption(s.font));
      r.weight.range(axis.min, axis.max);
      r.weight.el.title = axis.stops ? `Static: ${axis.stops.join(', ')}` : `Variable: ${axis.min} to ${axis.max}`;
      const w = weightValue(s.id);
      r.weight.set(shown(s.weightVar, w), { reference: ref && ref1 ? { name: ref.name, value: ref1.weight } : null, setByUser: s.weightVar in tweaks.shared });
      r.name.toggleAttribute('data-set', s.cssVar in tweaks.shared || s.weightVar in tweaks.shared);
    }
    for (const r of [...iconRows, ...compRows]) {
      const ref1 = refLength(r.c.id);
      r.f.set(shown(r.c.cssVar, compValue(r.c.id)), { reference: ref && ref1 !== null ? { name: ref.name, value: ref1 } : null, setByUser: r.c.cssVar in tweaks.shared });
      r.name.toggleAttribute('data-set', r.c.cssVar in tweaks.shared);
    }
    refBtn?.setAttribute('aria-pressed', String(atReference()));
    // 350 is banned, wherever it came from (a hand-edited tweaks.json included).
    bannedList.replaceChildren(...bannedTweaks().map((v) => h('li', {}, `${v.replace(/^--/, '')}: ${BANNED_WEIGHT} is banned; regular is 400`)));
    const dirty = !same(tweaks, saved);
    save.disabled = !dirty;
    save.textContent = dirty ? 'Save' : 'Saved';
    resetAll.disabled = same(tweaks, emptyTweaks());
    syncComments();
  }

  function syncSurfaces() {
    const ramp = rampOf(mode);
    const choice = tweaks.palette?.[mode];
    const p = choice?.palette ? paletteById(choice.palette) : null;
    picker.set(p?.id ?? null, p ? [p[mode].bar, p[mode].canvas, p[mode].primary] : SURFACE_IDS.map((id) => surfaceHex(ramp, id)));
    linkBtn.setAttribute('aria-pressed', String(linked));
    sharedRow.hidden = !linked;
    sharedH.set(round1(ramp.h));
    sharedS.set(round1(ramp.s));
    for (const s of surfaces) {
      const hex = surfaceHex(ramp, s.id);
      s.color.set(hex);
      const [lo, hi] = s.id === 'canvas' ? CANVAS_RANGE[mode] : OFFSET_RANGE;
      s.light.range(lo, hi);
      s.light.set(round1(surfaceControlValue(ramp, s.id)));
      const band = s.id === 'canvas' ? RECIPE[mode].canvas : RECIPE[mode][s.id];
      s.light.el.title = `Recipe ${band.min} to ${band.max}`;
      s.own.hidden = linked;
      const hs = surfaceHueSat(ramp, s.id);
      s.ownH.set(round1(hs.h));
      s.ownS.set(round1(hs.s));
    }
    const g = grade(ramp, mode);
    readOffsets.replaceChildren(...SURFACE_IDS.map((id) => h('span', {}, `${SURFACE_SHORT[id]} ${signed(g.offsets[id])}`)));
    readMatch.hidden = !g.matched;
    readFlags.replaceChildren(...g.flags.map((f) => h('li', {}, f)));
  }

  const openHere = () => feedback.filter((r) => r.status === 'open' && keyOf(r.url) === pageKey());
  function syncComments() {
    const here = openHere();
    tabBar.count('comments', here.length);
    listSec.hidden = !here.length;
    list.replaceChildren(...here.map((r, n) => {
      const resolve = h('button', { type: 'button', class: 'btn' }, 'Resolve');
      resolve.addEventListener('click', () => host.send('set-status', { id: r.id, status: 'resolved' }));
      return h('li', {}, h('span', { class: 'pin' }, String(n + 1)),
        h('div', {}, h('div', { class: 'c-text' }, r.comment), h('div', { class: 'c-where' }, r.text || r.selector)), resolve);
    }));
    commentSwitch.set(commenting);
    composer.hidden = !picked;
    if (picked) {
      pickedText.textContent = snippet(picked) || `<${picked.localName}>`;
      const src = source(picked);
      pickedWhere.textContent = src.sourceFile ? `${src.sourceFile.split('/src/').pop()}:${src.sourceLine ?? ''}` : selectorFor(picked);
    }
    placeOverlays();
  }

  function placeBox(box: HTMLElement, el: Element | null) {
    const r = el?.isConnected ? el.getBoundingClientRect() : null;
    box.hidden = !r || !r.width || !r.height || !open;
    if (r && !box.hidden) Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  function placeOverlays() {
    placeBox(hoverBox, commenting && hovered !== picked ? hovered : null);
    placeBox(pickedBox, picked);
    if (!open) { pins.replaceChildren(); return; }
    const edge = innerWidth - (collapsed ? STRIP : WIDTH) - 20;
    pins.replaceChildren(...openHere().flatMap((r, n) => {
      let el: Element | null = null;
      try { el = document.querySelector(r.selector); } catch { /* stale selector */ }
      const rect = el?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return [];
      return [h('span', { class: 'pin', style: `left:${Math.min(rect.right - 9, edge)}px;top:${Math.max(rect.top - 9, 2)}px` }, String(n + 1))];
    }));
  }

  function setOpen(state: boolean) {
    open = state;
    pill.hidden = open;
    if (open) { mode = html.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light'; invalidateTokens(); host.send('load', {}); }
    else { setCommenting(false); closePopover(); }
    applyLive();
    sync();
  }
  function setCollapsed(state: boolean) {
    collapsed = state;
    dock.hidden = collapsed;
    strip.hidden = !collapsed;
    if (collapsed) { setCommenting(false); closePopover(); }
    applyLive();
    placeOverlays();
  }
  function setTab(t: 'tune' | 'comments') {
    tab = t;
    tabBar.set(t);
    tunePane.hidden = t !== 'tune';
    commentsPane.hidden = t !== 'comments';
    foot.hidden = t !== 'tune';
    modeSeg.el.hidden = t !== 'tune';
    if (t !== 'comments') setCommenting(false);
  }
  function setCommenting(state: boolean) {
    commenting = state;
    hovered = null;
    if (!state) { picked = null; textarea.value = ''; commentSave.disabled = true; }
    html.style.cursor = state ? 'crosshair' : '';
    syncComments();
  }

  // ── panel events ────────────────────────────────────────────────────
  // Control+Option+D: Option+Shift+D is taken by a global Figma shortcut on Andy's Mac.
  const isToggleKey = (e: KeyboardEvent) => e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.code === 'KeyD';
  // Keys typed in the panel stay in the panel: the app's own shortcuts (/, the
  // editor's) listen on document and would otherwise fire from a text field.
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    ui.addEventListener(type, (e) => {
      const k = e as KeyboardEvent;
      if (type === 'keydown' && isToggleKey(k)) { k.preventDefault(); host.setOpen(!open); }
      if (type === 'keydown' && k.key === 'Escape' && picked) { picked = null; syncComments(); }
      e.stopPropagation();
    });
  }
  textarea.addEventListener('input', () => { commentSave.disabled = !textarea.value.trim(); });
  textarea.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveComment(); } });
  commentSave.addEventListener('click', saveComment);
  commentCancel.addEventListener('click', () => { picked = null; textarea.value = ''; commentSave.disabled = true; syncComments(); });

  function saveComment() {
    const comment = textarea.value.trim();
    if (!picked || !comment) return;
    const cs = getComputedStyle(picked);
    const record: FeedbackRecord = {
      id: `c-${Date.now().toString(36)}`,
      url: location.href,
      selector: selectorFor(picked),
      text: snippet(picked),
      ...source(picked),
      computed: { color: cs.color, background: effectiveBackground(picked), fontFamily: cs.fontFamily, fontSize: cs.fontSize },
      comment,
      timestamp: new Date().toISOString(),
      status: 'open',
    };
    host.send('add-comment', record);
    picked = null;
    textarea.value = '';
    commentSave.disabled = true;
    syncComments();
  }

  // ── comment mode on the page ────────────────────────────────────────
  const onPage = (e: Event) => {
    const t = e.target;
    return t instanceof Element && !t.closest('astro-dev-toolbar') && t !== html && t !== document.body;
  };
  document.addEventListener('mousemove', (e) => {
    if (!open || !commenting) return;
    hovered = onPage(e) ? (e.target as Element) : null;
    placeOverlays();
  }, true);
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'dblclick', 'click'] as const) {
    document.addEventListener(type, (e) => {
      if (!open || !commenting || !onPage(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (type === 'click') {
        picked = e.target as Element;
        hovered = null;
        syncComments();
        textarea.focus();
      }
    }, true);
  }
  // A face declared or loaded (a font picked, the saved sheet's @import) re-ranges the weight fields.
  const refreshAxes = () => { axes.clear(); if (open) sync(); };
  document.fonts.addEventListener('loadingdone', refreshAxes);
  fontLink.addEventListener('load', refreshAxes);
  document.addEventListener('keydown', (e) => { if (isToggleKey(e)) { e.preventDefault(); host.setOpen(!open); } });
  window.addEventListener('keyup', (e) => { if (e.key === 'Escape') escapeAt = performance.now(); }, true);
  let frame = 0;
  const replace = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (open) placeOverlays(); }); };
  addEventListener('scroll', replace, true);
  addEventListener('resize', replace);
  addEventListener('hashchange', () => { setTimeout(syncComments, 50); });
  // Views and dialogs open without scrolling; a slow tick keeps pins on their elements.
  setInterval(replace, 600);

  // ── server ──────────────────────────────────────────────────────────
  host.onState((s: ServerState) => {
    const incoming = normalize(s.tweaks);
    const wasClean = same(tweaks, saved);
    saved = incoming;
    if (wasClean) tweaks = normalize(incoming);
    feedback = s.feedback ?? [];
    const link = document.getElementById('design-layer-tweaks') as HTMLLinkElement | null;
    if (link) link.href = `${CSS_ROUTE}?${Date.now()}`;
    applyLive();
    sync();
  });

  // An always-visible way in, so the panel never depends on a shortcut. The
  // toolbar canvas is hidden while the app is off, so the pill lives in its own host.
  const pillHost = document.createElement('design-layer-pill');
  const pillRoot = pillHost.attachShadow({ mode: 'open' });
  pillRoot.innerHTML = `<style>
    button { position: fixed; right: 16px; bottom: 16px; z-index: 2000000000; font: 500 11px/1 'Design Layer UI', Inter, system-ui, sans-serif;
      color: #eeeeee; background: #222222; border: 1px solid #484848; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
    button:hover { background: #2a2a2a; }
    button:focus-visible { outline: 2px solid #0d99ff; outline-offset: 2px; }
    button[hidden] { display: none; }
  </style><button type="button" title="Design (Control+Option+D)">Design</button>`;
  const pill = pillRoot.querySelector('button') as HTMLButtonElement;
  pill.addEventListener('click', () => host.setOpen(true));
  document.body.append(pillHost);
  host.onToggled((state) => setOpen(state));
  setTab('tune');
  host.send('load', {});
  return { allowClose: () => performance.now() - escapeAt > 150 };
}
