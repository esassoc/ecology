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
  BANNED_WEIGHT, FONT_OPTIONS, buildCss, googleHref, migrateShared, modeVars, rootSelector, scopedBlocks,
  type ColorControl, type Departure, type FeedbackRecord, type FontControl, type FontOption,
  type LengthControl, type Mode, type PanelHost, type ResolvedConfig, type ServerState,
  type EditScope, type PageState, type ScopedOverride, type Variant, type SizeControl, type Tweaks, type VarMap, type WeightAxis,
} from './controls';
import { contrast, firstFamily, oklchL, toHex } from './color';
import { effectiveBackground, selectorFor, snippet, source } from './describe';
import {
  RECIPE, SURFACE_IDS, SURFACE_LABELS, SURFACE_SHORT,
  grade, hexToHsl, rampFromHexes, signed, surfaceHex, surfaceHueSat,
  type Ramp, type SurfaceId,
} from './surfaces';
import { GROUPS, PALETTES, paletteById, paletteRamp } from './palettes';
import { ancestors, candidate, firstChildComponent, select, type Selection } from './select';
import { computedOn, tokensOn, type TokenUse } from './inspect';
import { dependents, invalidateGraph } from './graph';
import { createStage } from './stage';
import {
  UI_CSS, h, icon, checkbox, colorField, dropdown, iconButton, numberField, openMenu, openPalettePicker, openPanelPopover,
  section, segmented, selectField, tabs, boundToken, shortName, closePopover, invalidateTokens, registerPanelFont, type ICONS, type MenuItem,
  type PaletteOption, type Prefix,
} from './ui';

/** The panel's width: a setting, dragged on its left edge. Figma's own panel is 240; 280 gives the fields room. */
const WIDTH = { default: 280, min: 240, max: 480 };
const WIDTH_KEY = 'design-layer:width';
const THEME_KEY = 'design-layer:theme';
const LAYOUT_KEY = 'design-layer:layout-open';
const PROPS_KEY = 'design-layer:properties-open';
type PanelTheme = 'light' | 'dark' | 'system';
const store = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, v: string) { try { localStorage.setItem(key, v); } catch { /* storage blocked */ } },
};

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
  ...(t?.overrides?.length ? { overrides: structuredClone(t.overrides) } : {}),
  ...(t?.variants?.length ? { variants: structuredClone(t.variants) } : {}),
  ...(t?.states?.length ? { states: structuredClone(t.states) } : {}),
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

// What the panel needs beyond the kit: docking, the
// comments pane, and the page overlays (pins, the hover and picked boxes).
const PANEL_CSS = `
  .dock { position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483000; }
  .pane { display: grid; gap: 8px; padding: 8px 8px 16px 16px; }
  .picked { display: grid; gap: 0; padding: 4px 8px; border-radius: 5px; background: var(--field); }
  .picked__text { overflow-wrap: anywhere; }
  .picked__where, .c-where { color: var(--ink-2); overflow-wrap: anywhere; }
  .ui textarea { display: block; width: 100%; min-height: 64px; padding: 4px 8px; border: 1px solid transparent; border-radius: 5px; background: var(--field); resize: vertical; }
  .ui textarea:hover { border-color: var(--line); }
  .ui textarea:focus { border-color: var(--focus); background: var(--bg); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .clist { grid-column: 1 / -1; display: grid; margin: 0; padding: 0; list-style: none; }
  .clist li { display: grid; grid-template-columns: 16px 1fr auto; gap: 8px; align-items: start; padding: 4px 0; }
  .clist .pin { position: static; box-shadow: none; }
  .c-text { overflow-wrap: anywhere; }
  .pin { position: fixed; z-index: 2147482999; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
    background: #0d99ff; color: #fff; font: 550 9px/1 'Design Layer UI', Inter, system-ui, sans-serif; box-shadow: 0 0 0 1.5px #fff, 0 1px 3px rgba(0,0,0,.3); pointer-events: none; }
  .box { position: fixed; z-index: 2147482998; pointer-events: none; border: 1px solid #0d99ff; background: rgba(13, 153, 255, 0.06); }
  .box--picked { border-width: 2px; background: rgba(13, 153, 255, 0.12); }
  .box--sel { border-color: #0d99ff; background: none; }
  .box__name, .box__size { position: absolute; height: 16px; padding: 0 4px; border-radius: 2px; background: #0d99ff; color: #fff;
    font: 550 11px/16px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: .055px; white-space: nowrap; }
  .box__name { left: -1px; bottom: calc(100% + 4px); }
  .box__size { left: 50%; top: calc(100% + 4px); transform: translateX(-50%); font-variant-numeric: tabular-nums; }
  .crumbs { flex: 1 1 auto; display: flex; align-items: center; min-width: 0; margin-left: -4px; }
  .crumbs:not([hidden]) ~ .grow { display: none; }
  .crumb { flex: 0 1 auto; min-width: 0; height: 24px; padding: 0 4px; border: 0; border-radius: 5px; background: none; color: var(--ink-2);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  button.crumb:hover { background: var(--hover); color: var(--ink); }
  .crumb--cur { flex: 0 0 auto; max-width: 60%; color: var(--ink); font: 550 13px/24px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: -0.032px; }
  .crumb-sep { flex: none; padding: 0 2px; color: var(--ink-3); }
  .sub { height: 24px; line-height: 24px; color: var(--ink-2); }
  .f--ro, .f--ro:hover { border-color: transparent; }
  .f--ro .f__name { padding: 0; cursor: default; }
  .f--ro .sw { pointer-events: none; }
  .vrow { display: flex; align-items: center; gap: 8px; min-width: 0; height: 24px; padding: 0 7px 0 8px; border: 1px solid transparent; border-radius: 5px;
    background: var(--field); color: var(--ink); text-align: left; }
  .vrow:hover { border-color: var(--line); }
  .vrow[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .vrow__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vrow__meta { flex: none; color: var(--ink-2); }
  .vrow[aria-pressed="true"] .vrow__meta { color: inherit; opacity: .7; }
  .ib:disabled { color: var(--ink-3); background: none; }
  .row-x { visibility: hidden; }
  .row-x[data-on] { visibility: visible; }
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
  let width = Math.min(WIDTH.max, Math.max(WIDTH.min, Number(store.get(WIDTH_KEY)) || WIDTH.default));
  let panelTheme: PanelTheme = (['light', 'dark', 'system'] as const).find((t) => t === store.get(THEME_KEY)) ?? 'system';
  let layoutOpen = store.get(LAYOUT_KEY) === '1';
  let tab: 'tune' | 'comments' = 'tune';
  let mode: Mode = html.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light';
  let tweaks = emptyTweaks();
  let saved = emptyTweaks();
  let feedback: FeedbackRecord[] = [];
  let commenting = false;
  let picked: Element | null = null;
  let hovered: Element | null = null;
  let linked = true;
  // The select tool and what it selected; edits land at `scope` (Component by default).
  let selecting = false;
  let selection: Selection | null = null;
  let scope: EditScope = 'component';
  /** Set while reading or writing the reference, which is page-wide whatever the scope. */
  let forceRoot = false;
  // Isolation: the selection alone on a canvas, its variants beside it.
  let isolating = false;
  let activeVariant: string | null = null;
  let compare = true;
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
  // ── where an edit lands ─────────────────────────────────────────────
  type Scoped = { kind: 'component' | 'instance' | 'variant'; selector: string; name: string; el: Element; page?: string; id?: string };
  type Target = { kind: 'root' } | Scoped;
  /** The current scope made concrete: the root (Token, or nothing selected),
      every instance of the selection's component, or the one element. */
  function target(): Target {
    if (!forceRoot && selection && isolating && activeVariant) {
      const v = variantById(activeVariant);
      if (v) return { kind: 'variant', id: v.id, selector: `[data-dl-variant="${v.id}"]`, name: v.name, el: stage.copyOf(v.id) ?? selection.el };
    }
    if (forceRoot || !selection || scope === 'token') return { kind: 'root' };
    const c = selection.component;
    if (scope === 'component' && c) return { kind: 'component', selector: c.selector, name: c.name, el: c.root };
    return { kind: 'instance', selector: selection.instance, name: selection.name, el: selection.el, page: location.pathname };
  }
  const effectiveScope = (): EditScope => (scope === 'component' && !selection?.component ? 'instance' : scope);
  const isRule = (o: ScopedOverride, t: Scoped) => o.scope === t.kind && o.selector === t.selector && (o.page ?? '') === (t.page ?? '');
  /** The map an edit at the current scope reads, and (with `create`) writes. */
  function layer(s: Mode | 'shared', create = false): VarMap {
    const t = target();
    if (t.kind === 'root') return tweaks[s];
    if (t.kind === 'variant') return variantById(t.id!)![s];
    let o = tweaks.overrides?.find((x) => isRule(x, t));
    if (!o) {
      if (!create) return {};
      o = { scope: t.kind as ScopedOverride['scope'], selector: t.selector, name: t.name, ...(t.page ? { page: t.page } : {}), light: {}, dark: {}, shared: {} };
      (tweaks.overrides ??= []).push(o);
    }
    return o[s];
  }
  /** Drops scoped overrides that hold nothing. */
  function prune() {
    if (!tweaks.overrides) return;
    tweaks.overrides = tweaks.overrides.filter((o) => Object.keys(o.light).length + Object.keys(o.dark).length + Object.keys(o.shared).length);
    if (!tweaks.overrides.length) delete tweaks.overrides;
  }
  const VOID = /^(img|input|br|hr|area|col|embed|source|track|wbr|textarea|select|svg|path|use)$/;
  /** What a value computes to where the current scope lands (a var() resolves there). */
  function measureAt(prop: Prop, value: string) {
    const t = target();
    if (t.kind === 'root') return measure(prop, value);
    const host = VOID.test(t.el.localName) ? (t.el.parentElement ?? document.body) : t.el;
    host.append(probe);
    probe.style[prop] = value;
    const out = getComputedStyle(probe)[prop];
    probe.style[prop] = '';
    probe.remove();
    return out;
  }
  const atRoot = () => target().kind === 'root';
  const variantById = (id: string) => tweaks.variants?.find((v) => v.id === id);
  /** What a variant is of: the selection's component, else the element. */
  const variantOf = () => (selection ? (selection.component?.selector ?? selection.instance) : '');
  const variantsHere = (): Variant[] => (tweaks.variants ?? []).filter((v) => v.of === variantOf());
  const stage = createStage((id) => { activeVariant = id === 'original' ? null : id; stage.setActive(id); sync(); });

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
  // Each getter reads the current scope: its override, else (at the root) the
  // palette's and then the theme's own value, else (scoped) what the variable
  // resolves to where the scope lands.
  const colorVar = (id: string) => COLORS.find((c) => c.id === id)!.cssVar;
  const colorRaw = (id: string, m: Mode) => (atRoot() ? modeVars(tweaks, m, CFG.roles)[colorVar(id)] : layer(m)[colorVar(id)]);
  const colorValue = (id: string, m: Mode) => {
    const v = colorRaw(id, m);
    if (!v) return atRoot() ? readBase(m).colors[id] : toHex(measureAt('color', `var(${colorVar(id)})`));
    return boundToken(v) ? toHex(measureAt('color', v)) : toHex(v);
  };
  const fontOption = (id: string) => {
    const f = FONTS.find((x) => x.id === id)!;
    const css = layer('shared')[f.cssVar] ?? (atRoot() ? readBase(mode).fonts[id] : measureAt('fontFamily', `var(${f.cssVar})`));
    return FONT_OPTIONS.find((o) => firstFamily(o.css) === firstFamily(css));
  };
  /** A shared length as stored (Npx or var(--token)) resolved to px, else the fallback. */
  const lengthOf = (cssVar: string, fallback: number, prop: Prop = 'width') => {
    const v = layer('shared')[cssVar];
    if (!v) return fallback;
    return boundToken(v) ? half(Number.parseFloat(measureAt(prop, v))) : Number.parseFloat(v);
  };
  const sizeOf = (id: string) => SIZES.find((s) => s.id === id)!;
  const baseSize = (id: string) => half(atRoot() ? readBase(mode).sizes[id] : Number.parseFloat(measureAt('fontSize', `var(${sizeOf(id).cssVar})`)));
  const sizeValue = (id: string) => lengthOf(sizeOf(id).cssVar, baseSize(id), 'fontSize');
  const baseWeight = (id: string) => (atRoot() ? readBase(mode).weights[id] : Number.parseFloat(measureAt('fontWeight', `var(${sizeOf(id).weightVar})`)));
  const weightValue = (id: string) => {
    const v = layer('shared')[sizeOf(id).weightVar];
    if (!v) return baseWeight(id);
    return Number.parseFloat(boundToken(v) ? measureAt('fontWeight', v) : v);
  };
  const compOf = (id: string) => COMPONENTS.find((c) => c.id === id)!;
  const baseComp = (id: string) => half(atRoot() ? readBase(mode).components[id] : Number.parseFloat(measureAt('width', `var(${compOf(id).cssVar})`)));
  const compValue = (id: string) => lengthOf(compOf(id).cssVar, baseComp(id));
  /** What a field shows: the bound var(--token), else the number. */
  const shown = (cssVar: string, n: number) => { const v = layer('shared')[cssVar]; return v && boundToken(v) ? v : n; };
  /** Runs `fn` against the root whatever the scope (the reference is page-wide). */
  const rooted = <T>(fn: () => T): T => { forceRoot = true; try { return fn(); } finally { forceRoot = false; } };

  /** Every size, weight and length that differs from the reference's, for Save. */
  function departures(): Departure[] { return rooted(departuresAtRoot); }
  function departuresAtRoot(): Departure[] {
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
    forceRoot = true;
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
    forceRoot = false;
    applyLive();
    sync();
  }
  const atReference = () => rooted(() => SIZES.every((s) => { const r = refSize(s.id); return !r || (sizeValue(s.id) === r.size && weightValue(s.id) === r.weight); })
    && COMPONENTS.every((c) => { const r = refLength(c.id); return r === null || compValue(c.id) === r; }));

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
  const bannedTweaks = () => [tweaks, ...(tweaks.overrides ?? [])].flatMap((maps) => (['shared', 'light', 'dark'] as const).flatMap((k) =>
    Object.entries(maps[k]).filter(([v, val]) => /weight/.test(v) && isBanned(val)).map(([v]) => ('selector' in maps ? `${maps.name} ${v}` : v))));

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
    const dock = open ? width : 0;
    const root = rootSelector(true);
    const variantCss = (tweaks.variants ?? []).map((v) => scopedBlocks(root, (sel) => `${sel} [data-dl-variant="${v.id}"]`, v, dependents)).join('');
    live.textContent = buildCss(tweaks, CFG.roles, true, dependents) + variantCss + (dock ? `html:root body { margin-right: ${dock}px; }\n` : '');
    const specs = [...new Set(Object.values(tweaks.shared).map((css) => FONT_OPTIONS.find((o) => o.css === css)?.google).filter((g): g is string => !!g))];
    const href = googleHref(specs);
    if (href) { if (fontLink.getAttribute('href') !== href) fontLink.href = href; if (!fontLink.isConnected) document.head.append(fontLink); }
    else fontLink.remove();
  }
  /** Writes one variable at the current scope (null drops the override). */
  function set(s: Mode | 'shared', cssVar: string, value: string | null) {
    const map = layer(s, value !== null);
    if (value === null) delete map[cssVar]; else map[cssVar] = value;
    prune();
    applyLive();
    sync();
  }

  // ── build ───────────────────────────────────────────────────────────
  // No label column: a row says what it is with its prefix and its suffix,
  // and the section title says the rest (Figma's Fill, Stroke, Typography).
  const beside = () => panel;
  const dimOn = (b: HTMLElement, on: boolean) => b.toggleAttribute('data-on', on);
  /** A row's minus in the icon column: drops the override (Figma's remove-fill). */
  const rowX = (label: string, onClick: () => void) => { const b = iconButton('minus', `Reset ${label}`, onClick); b.classList.add('row-x', 'c3'); return b; };

  // Top: Tune / Comments, the page's mode, Save (Figma's tabs, zoom, Share).
  const tabBar = tabs({ label: 'Panel', options: [{ value: 'tune', label: 'Tune' }, { value: 'comments', label: 'Comments' }], onChange: (t) => setTab(t) });
  const setMode = (m: Mode) => { mode = m; html.setAttribute('data-scheme', m); invalidateTokens(); invalidateGraph(); renderStage(); sync(); };
  const modeDd = dropdown({
    label: 'Page mode',
    onOpen: (a) => openMenu<Mode>({ root, anchor: a, alignEnd: true, selected: mode, pick: setMode, items: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] }),
  });
  const save = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Saved');
  save.addEventListener('click', () => host.send('save-tweaks', { json: { ...tweaks, departures: departures() }, css: buildCss(tweaks, CFG.roles, false, dependents) }));
  const pickBtn = iconButton('cursor', 'Select (Click an Element)', () => setSelecting(!selecting), false);
  const top = h('div', { class: 'p-top' }, tabBar.el, h('span', { class: 'grow' }), pickBtn, modeDd.el, save);

  // Selection header: the palette as the title, the reference, the menu.
  const paletteOptions = (): PaletteOption[] => PALETTES.map((p) => {
    const flags = grade(paletteRamp(p, mode), mode).flags;
    return {
      id: p.id, name: p.like ? `${p.name} (${p.like})` : p.name, group: GROUPS.find((g) => g.id === p.group)!.label,
      colors: [p[mode].bar, p[mode].canvas, p[mode].primary], off: flags.length ? flags.join('; ') : undefined,
    };
  });
  const paletteDd = dropdown({
    label: 'Palette',
    onOpen: (a) => openPalettePicker({ root, anchor: a, beside: panel, palettes: paletteOptions(), current: tweaks.palette?.[mode]?.palette ?? null, onPick: pickPalette }),
  });
  const refBtn = CFG.reference ? iconButton('reference', `Use ${CFG.reference.name} sizes`, applyReference, false) : null;
  const resetAllTweaks = () => { tweaks = emptyTweaks(); applyLive(); sync(); };
  type MenuAction = 'reset-palette' | 'reset-all' | PanelTheme | 'close';
  const menuBtn = iconButton('kebab', 'More', () => openMenu<MenuAction>({
    root, anchor: menuBtn, alignEnd: true, selected: panelTheme,
    items: [
      { value: 'reset-palette', label: 'Reset Palette' },
      { value: 'reset-all', label: 'Reset All' },
      ...(['light', 'dark', 'system'] as const).map((t): MenuItem<MenuAction> => ({ value: t, label: t === 'system' ? 'Match System' : t === 'light' ? 'Light' : 'Dark', header: 'Panel Theme' })),
      { value: 'close', label: 'Close Panel', meta: '⌃⌥D', header: ' ' },
    ],
    pick: (v) => {
      if (v === 'reset-palette') { setRamp('light', null, null, false); setRamp('dark', null); }
      else if (v === 'reset-all') resetAllTweaks();
      else if (v === 'close') host.setOpen(false);
      else { panelTheme = v; store.set(THEME_KEY, v); applyTheme(); }
    },
  }));
  // With a selection the header is its breadcrumb (Figma's layer path) instead of the palette.
  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Selection', hidden: true });
  const clearBtn = iconButton('close', 'Clear Selection (Esc)', () => setSelection(null));
  const isolateBtn = iconButton('isolate', 'Isolate Selection', () => setIsolating(!isolating), false);
  const sel = h('div', { class: 'sel' }, paletteDd.el, crumbs, h('span', { class: 'grow' }), refBtn, isolateBtn, clearBtn, menuBtn);
  function syncHeader() {
    paletteDd.el.hidden = !!selection;
    crumbs.hidden = !selection;
    clearBtn.hidden = !selection;
    isolateBtn.hidden = !selection;
    isolateBtn.setAttribute('aria-pressed', String(isolating));
    if (refBtn) refBtn.hidden = !!selection;
    if (!selection) return;
    const up = ancestors(selection.el);
    const crumb = (name: string, el: Element) => {
      const b = h('button', { type: 'button', class: 'crumb', title: `Select ${name}` }, name);
      b.addEventListener('click', () => setSelection(select(el)));
      return b;
    };
    const sep = () => h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/');
    crumbs.replaceChildren(
      ...(up.length > 2 ? [h('span', { class: 'crumb-sep', title: up.slice(0, -2).map((a) => a.name).join(' / ') }, '…'), sep()] : []),
      ...up.slice(-2).flatMap((a) => [crumb(a.name, a.root), sep()]),
      h('span', { class: 'crumb crumb--cur', title: selection.component?.file ?? selection.name, 'aria-current': 'true' }, selection.name),
    );
  }

  // Scope: where an edit lands. Component (every instance) is the default.
  const scopeSeg = segmented<EditScope>({
    label: 'Edit scope',
    options: [{ value: 'component', label: 'Component' }, { value: 'token', label: 'Token' }, { value: 'instance', label: 'Instance' }],
    onChange: (v) => { scope = v; sync(); },
  });
  scopeSeg.el.classList.add('span2');
  const scopeSec = section({ id: 'scope', title: 'Scope', body: [scopeSeg.el] });

  // Tokens: what the selection reads, by tier, each editable at the scope.
  // Properties: its computed values, read only.
  const tokensSec = section({ id: 'tokens', title: 'Tokens', body: [] });
  const tokensBody = tokensSec.el.querySelector('.sec__b')!;
  let tokenRows: { sync: () => void }[] = [];
  const TIERS: [TokenUse['tier'], string][] = [[3, 'Component'], [2, 'Semantic'], [1, 'Primitive']];
  const prefixFor = (props: string[]): Prefix => {
    const has = (re: RegExp) => props.some((p) => re.test(p));
    if (has(/radius/)) return 'radius';
    if (has(/padding-(inline|left|right)/)) return 'padX';
    if (has(/padding/)) return 'padY';
    if (has(/font-size/)) return 'size';
    if (has(/height/)) return 'height';
    if (has(/gap/)) return { text: 'G' };
    return { text: '#' };
  };
  function tokenRow(u: TokenUse): { nodes: Node[]; sync: () => void } {
    const label = shortName(u.name).replace(/^color-/, '');
    const title = `${u.name}${u.props.length ? ` → ${u.props.join(', ')}` : ''}`;
    if (u.kind === 'color') {
      const f = colorField({ root, label: u.name, suffix: label, tokens: { beside }, onChange: (v) => set(mode, u.name, v) });
      f.el.classList.add('span2');
      f.el.title = title;
      const x = rowX(label, () => set(mode, u.name, null));
      return { nodes: [f.el, x], sync: () => {
        const raw = layer(mode)[u.name];
        const hex = toHex(measureAt('color', raw ?? `var(${u.name})`));
        f.set(raw && boundToken(raw) ? raw : hex, { resolved: hex });
        dimOn(x, u.name in layer(mode));
      } };
    }
    if (u.kind === 'length' || u.kind === 'weight') {
      const weight = u.kind === 'weight';
      const f = numberField({
        root, label: u.name, prefix: weight ? { text: 'W' } : prefixFor(u.props), suffix: label, min: weight ? 100 : 0, max: weight ? 900 : 400, step: weight ? 1 : 0.5,
        refuse: weight ? [BANNED_WEIGHT] : undefined, tokens: { kind: u.kind, beside },
        onChange: (v) => set('shared', u.name, typeof v === 'string' ? v : weight ? String(v) : `${v}px`),
      });
      f.el.classList.add('span2');
      f.el.title = title;
      const x = rowX(label, () => set('shared', u.name, null));
      return { nodes: [f.el, x], sync: () => {
        const raw = layer('shared')[u.name];
        const n = Number.parseFloat(measureAt(weight ? 'fontWeight' : 'width', raw ?? `var(${u.name})`));
        f.set(raw && boundToken(raw) ? raw : weight ? n : half(n), { resolved: n });
        dimOn(x, u.name in layer('shared'));
      } };
    }
    // Faces and anything else: shown, not edited here (a face is a Typography row).
    const value = h('span', { class: 'f__name' });
    const row = h('div', { class: 'f f--ro span2', title }, h('span', { class: 'f__pre', 'aria-hidden': 'true' }, u.kind === 'font' ? 'Aa' : '#'), value, h('span', { class: 'f__suf' }, label));
    return { nodes: [row, h('span', {})], sync: () => { value.textContent = selection ? getComputedStyle(selection.el).getPropertyValue(u.name).trim() : ''; } };
  }
  function renderTokens() {
    tokenRows = [];
    const uses = selection ? tokensOn(selection.el) : [];
    tokensSec.setEmpty(!uses.length);
    const nodes: Node[] = [];
    for (const [tier, title] of TIERS) {
      const group = uses.filter((u) => u.tier === tier).sort((a, b) => (a.kind === 'color' ? 0 : 1) - (b.kind === 'color' ? 0 : 1) || a.name.localeCompare(b.name));
      if (!group.length) continue;
      nodes.push(h('div', { class: 'sub span3' }, title));
      for (const u of group) { const r = tokenRow(u); tokenRows.push(r); nodes.push(...r.nodes); }
    }
    tokensBody.replaceChildren(...nodes);
  }

  const ro = (pre: Prefix | Node, suffix?: string) => {
    const value = h('span', { class: 'f__name' });
    const el = h('div', { class: 'f f--ro' },
      h('span', { class: 'f__pre', 'aria-hidden': 'true' }, pre instanceof Node ? pre : typeof pre === 'string' ? icon(pre) : pre.text),
      value, suffix ? h('span', { class: 'f__suf' }, suffix) : null);
    return { el, value };
  };
  const swText = h('span', { class: 'sw' });
  const swFill = h('span', { class: 'sw' });
  const props = {
    color: ro(swText, 'Text'), fill: ro(swFill, 'Fill'), font: ro({ text: 'Aa' }), size: ro('size'), line: ro({ text: 'LH' }),
    padY: ro('padY'), padX: ro('padX'), radius: ro('radius'), border: ro({ text: 'B' }), w: ro({ text: 'W' }), h: ro({ text: 'H' }),
  };
  for (const k of ['color', 'fill', 'font'] as const) props[k].el.classList.add('span2');
  let propsOpen = store.get(PROPS_KEY) !== '0';
  const propsToggle = iconButton('minus', 'Hide Properties', () => { propsOpen = !propsOpen; store.set(PROPS_KEY, propsOpen ? '1' : '0'); syncSelection(); });
  const pad = () => h('span', {});
  const propsSec = section({
    id: 'properties', title: 'Properties', actions: [propsToggle],
    body: [props.color.el, pad(), props.fill.el, pad(), props.font.el, pad(), props.size.el, props.line.el, pad(),
      props.padY.el, props.padX.el, pad(), props.radius.el, props.border.el, pad(), props.w.el, props.h.el, pad()],
  });
  function syncSelection() {
    const has = !!selection;
    scopeSec.el.hidden = !has || !!activeVariant;
    tokensSec.el.hidden = !has;
    propsSec.el.hidden = !has;
    surfacesSec.el.hidden = !atRoot();
    syncHeader();
    if (!selection) return;
    const eff = effectiveScope();
    scopeSeg.set(eff);
    const [compBtn, tokenBtn, instBtn] = scopeSeg.el.querySelectorAll('button');
    compBtn.disabled = !selection.component;
    compBtn.title = selection.component ? `Every ${selection.component.name}` : 'Not inside a component';
    tokenBtn.title = 'The tokens themselves, everywhere';
    instBtn.title = `This ${selection.name}, on this page`;
    for (const r of tokenRows) r.sync();
    propsSec.setEmpty(!propsOpen);
    propsToggle.replaceChildren(icon(propsOpen ? 'minus' : 'plus'));
    propsToggle.setAttribute('aria-label', propsOpen ? 'Hide Properties' : 'Show Properties');
    const c = computedOn(selection.el);
    const hexOf = (v: string) => (/rgba\(.*,\s*0\)$|transparent/.test(v) ? 'None' : toHex(v).slice(1).toUpperCase());
    props.color.value.textContent = hexOf(c.color);
    swText.style.background = c.color;
    props.fill.value.textContent = hexOf(c.background);
    swFill.style.background = c.background;
    props.font.value.textContent = `${c.fontFamily} ${c.fontWeight}`;
    props.size.value.textContent = String(c.fontSize);
    props.line.value.textContent = c.lineHeight === 'normal' ? 'Auto' : String(Math.round(Number.parseFloat(c.lineHeight) * 10) / 10);
    props.padY.value.textContent = String(c.padY);
    props.padX.value.textContent = String(c.padX);
    props.radius.value.textContent = String(c.radius);
    props.border.value.textContent = String(c.border);
    props.w.value.textContent = String(c.width);
    props.h.value.textContent = String(c.height);
  }

  // Surfaces: the palette's three chrome surfaces; hue, saturation and
  // lightness offsets behind the adjust button, in a popover beside the panel.
  const linkBtn = iconButton('link', 'Move Together', () => { linked = !linked; sync(); }, true);
  const hsField = (label: string, key: 'h' | 's', apply: (r: Ramp, v: number) => void) =>
    numberField({ root, label, prefix: { text: key.toUpperCase() }, min: 0, max: key === 'h' ? 360 : 100, step: key === 'h' ? 1 : 0.5, onChange: (v) => { if (typeof v === 'number') editRamp((r) => apply(r, v)); } });
  const sharedH = hsField('Shared hue', 'h', (r, v) => { r.h = v; delete r.own; });
  const sharedS = hsField('Shared saturation', 's', (r, v) => { r.s = v; delete r.own; });
  const surfaces = SURFACE_IDS.map((id) => {
    const label = SURFACE_LABELS[id];
    const color = colorField({
      root, label, suffix: label, tokens: false,
      onChange: (v) => {
        const hsl = hexToHsl(v);
        editRamp((r) => {
          // Move Together: the hex sets the shared hue and saturation. Alone: this surface's own.
          if (linked) { r.h = hsl.h; r.s = hsl.s; delete r.own; } else (r.own ??= {})[id] = { h: hsl.h, s: hsl.s };
          setSurfaceL(r, id, id === 'canvas' ? hsl.l : hsl.l - r.l);
        });
      },
    });
    color.el.classList.add('span2');
    const range = id === 'canvas' ? CANVAS_RANGE[mode] : OFFSET_RANGE;
    const light = numberField({
      root, label: `${label} ${id === 'canvas' ? 'lightness' : 'lightness offset'}`, prefix: { text: 'L' }, suffix: SURFACE_SHORT[id], min: range[0], max: range[1], step: 0.5,
      onChange: (v) => { if (typeof v === 'number') editRamp((r) => setSurfaceL(r, id, v)); },
    });
    light.el.classList.add('span2');
    const ownField = (key: 'h' | 's') => numberField({
      root, label: `${label} ${key === 'h' ? 'hue' : 'saturation'}`, prefix: { text: key.toUpperCase() }, suffix: key === 'h' ? SURFACE_SHORT[id] : undefined, min: 0, max: key === 'h' ? 360 : 100, step: key === 'h' ? 1 : 0.5,
      onChange: (v) => { if (typeof v === 'number') editRamp((r) => { (r.own ??= {})[id] = { ...surfaceHueSat(r, id), [key]: v }; }); },
    });
    return { id, color, light, ownH: ownField('h'), ownS: ownField('s') };
  });
  const readOffsets = h('div', { class: 'note span3' });
  const readMatch = h('div', { class: 'note span3' }, 'Same hue and saturation');
  const readFlags = h('div', { class: 'span3', style: 'display:grid' });
  const adjustBtn = iconButton('adjust', 'Surface Settings', () => openPanelPopover({
    root, anchor: adjustBtn, beside: panel, title: 'Surfaces',
    body: [
      ...(linked ? [sharedH.el, sharedS.el, h('span', {})] : []),
      ...surfaces.flatMap((s) => [s.light.el, h('span', {}), ...(linked ? [] : [s.ownH.el, s.ownS.el, h('span', {})])]),
      readOffsets, readMatch,
    ],
  }));
  const surfacesSec = section({ id: 'surfaces', title: 'Surfaces', actions: [linkBtn, adjustBtn], body: [...surfaces.map((s) => s.color.el), readFlags] });

  // Colors: one fill row each, the contrast table behind its button.
  const colorRows = COLORS.map((c) => {
    const f = colorField({ root, label: c.label, suffix: c.label, tokens: { prefer: /^--color-(content|background|border)-/, beside }, onChange: (v) => set(mode, c.cssVar, v) });
    f.el.classList.add('span2');
    return { c, f, x: rowX(c.label, () => set(mode, c.cssVar, null)) };
  });
  const contrastCells = new Map<string, HTMLElement>();
  const contrastTable = h('div', { class: 'grid-table span3', style: `grid-template-columns: 40px repeat(${INKS.length}, 1fr)` },
    h('span', { class: 'h' }), ...INKS.map((i) => { const t = COLORS.find((c) => c.id === i)!.label; return h('span', { class: 'h', title: t }, t); }),
    ...SURFACE_IDS.flatMap((s) => [h('span', { class: 'h' }, SURFACE_SHORT[s]), ...INKS.map((i) => {
      const cell = h('span', {});
      contrastCells.set(`${s}:${i}`, cell);
      return cell;
    })]));
  const contrastBtn = iconButton('contrast', 'Contrast', () => openPanelPopover({ root, anchor: contrastBtn, beside: panel, title: 'Contrast', body: [contrastTable], width: 280 }));
  const colorsSec = section({ id: 'colors', title: 'Colors', actions: INKS.length ? [contrastBtn] : [], body: colorRows.flatMap((r) => [r.f.el, r.x]) });

  // Typography: each face, then each role's size and weight.
  const fontRows = FONTS.map((f) => {
    const sel1 = selectField({
      root, label: `${f.label} font`, suffix: f.label, options: FONT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
      onChange: (id) => {
        const opt = FONT_OPTIONS.find((o) => o.id === id)!;
        const isDefault = atRoot() && firstFamily(opt.css) === firstFamily(readBase(mode).fonts[f.id]);
        // A row set in this face keeps its weight if the new face's axis has it, else the nearest it does.
        const axis = axisOf(opt);
        for (const s of SIZES.filter((x) => x.font === f.id)) {
          const w = weightValue(s.id);
          const fit = fitWeight(axis, w);
          if (fit !== w) layer('shared', true)[s.weightVar] = String(fit === BANNED_WEIGHT ? 400 : fit);
        }
        set('shared', f.cssVar, isDefault ? null : opt.css);
      },
    });
    sel1.el.classList.add('span2');
    return { f, sel: sel1, x: rowX(`${f.label} font`, () => set('shared', f.cssVar, null)) };
  });
  const setSize = (s: SizeControl, v: number | string) => {
    if (typeof v === 'string') { set('shared', s.cssVar, v); return; }
    set('shared', s.cssVar, atRoot() && v === baseSize(s.id) ? null : `${v}px`);
  };
  const setWeight = (s: SizeControl, v: number | string) => {
    if (typeof v === 'string') { if (!isBanned(v)) set('shared', s.weightVar, v); else sync(); return; }
    const fit = fitWeight(axisOf(fontOption(s.font)), v);
    const w = fit === BANNED_WEIGHT ? 400 : fit;
    set('shared', s.weightVar, atRoot() && w === baseWeight(s.id) ? null : String(w));
  };
  const sizeRows = SIZES.map((s) => {
    const size = numberField({
      root, label: `${s.label} size`, prefix: 'size', suffix: s.label, min: s.min, max: s.max, step: 0.5,
      tokens: { kind: 'length', prefer: /font-size|typography/, beside },
      onChange: (v) => setSize(s, v),
      onReference: () => { const r = refSize(s.id); if (r) setSize(s, r.size); },
    });
    const weight = numberField({
      root, label: `${s.label} weight`, prefix: { text: 'W' }, min: 100, max: 900, step: 1, refuse: [BANNED_WEIGHT],
      tokens: { kind: 'weight', beside },
      onChange: (v) => setWeight(s, v),
      onReference: () => { const r = refSize(s.id); if (r) setWeight(s, r.weight); },
    });
    return { s, size, weight, x: rowX(s.label, () => { const m = layer('shared'); delete m[s.cssVar]; delete m[s.weightVar]; prune(); applyLive(); sync(); }) };
  });
  const bannedList = h('div', { class: 'span3', style: 'display:grid' });
  const typeSec = section({
    id: 'type', title: 'Typography',
    body: [...fontRows.flatMap((r) => [r.sel.el, r.x]), ...sizeRows.flatMap((r) => [r.size.el, r.weight.el, r.x]), bannedList],
  });

  // Layout: icon and component lengths. Closed to its head unless opened, like
  // Figma's empty sections; the plus opens it.
  const setLength = (c: LengthControl, v: number | string) => {
    if (typeof v === 'string') { set('shared', c.cssVar, v); return; }
    set('shared', c.cssVar, atRoot() && v === baseComp(c.id) ? null : `${v}px`);
  };
  const lengthRows = COMPONENTS.map((c) => {
    const f = numberField({
      root, label: c.label, prefix: leadFor(c), suffix: c.label, min: c.min, max: c.max, step: c.step,
      tokens: { kind: 'length', prefer: /radius|spacing|size/, beside },
      onChange: (v) => setLength(c, v),
      onReference: () => { const r = refLength(c.id); if (r !== null) setLength(c, r); },
    });
    f.el.classList.add('span2');
    return { c, f, x: rowX(c.label, () => set('shared', c.cssVar, null)) };
  });
  const layoutToggle = iconButton('plus', 'Show Layout', () => { layoutOpen = !layoutOpen; store.set(LAYOUT_KEY, layoutOpen ? '1' : '0'); syncLayout(); });
  const layoutSec = lengthRows.length
    ? section({ id: 'layout', title: 'Layout', actions: [layoutToggle], body: lengthRows.flatMap((r) => [r.f.el, r.x]), empty: !layoutOpen })
    : null;
  function syncLayout() {
    if (!layoutSec) return;
    layoutSec.setEmpty(!layoutOpen);
    layoutToggle.replaceChildren(icon(layoutOpen ? 'minus' : 'plus'));
    const t = layoutOpen ? 'Hide Layout' : 'Show Layout';
    layoutToggle.setAttribute('aria-label', t);
    layoutToggle.title = t;
  }

  // Variants: copies beside the original in isolation, each with its own
  // overrides; the active one takes the edits. Apply folds it into the scope.
  const vrow = (name: string, meta: string, pressed: boolean, onClick: () => void) => {
    const b = h('button', { type: 'button', class: 'vrow span2', 'aria-pressed': String(pressed) }, h('span', { class: 'vrow__name' }, name), h('span', { class: 'vrow__meta' }, meta));
    b.addEventListener('click', onClick);
    return b;
  };
  const count = (m: { light: VarMap; dark: VarMap; shared: VarMap }) => Object.keys(m.light).length + Object.keys(m.dark).length + Object.keys(m.shared).length;
  const applyBtn = iconButton('check', 'Apply Variant to the Component', () => applyVariant());
  const compareBtn = iconButton('compare', 'Compare Side by Side', () => { compare = !compare; renderStage(); sync(); }, true);
  const addVariantBtn = iconButton('plus', 'Add Variant', () => addVariant());
  const variantsSec = section({ id: 'variants', title: 'Variants', actions: [applyBtn, compareBtn, addVariantBtn], body: [] });
  const variantsBody = variantsSec.el.querySelector('.sec__b')!;
  function syncVariants() {
    variantsSec.el.hidden = !isolating;
    if (!isolating || !selection) return;
    const vs = variantsHere();
    applyBtn.disabled = !activeVariant;
    applyBtn.classList.toggle('ib--dim', !activeVariant);
    compareBtn.setAttribute('aria-pressed', String(compare));
    const pick = (id: string | null) => () => { activeVariant = id; renderStage(); sync(); };
    variantsBody.replaceChildren(
      vrow(selection.name, 'Original', !activeVariant, pick(null)), h('span', {}),
      ...vs.flatMap((v) => {
        const n = count(v);
        const x = iconButton('minus', `Remove ${v.name}`, () => removeVariant(v.id));
        return [vrow(v.name, n ? `${n} ${n === 1 ? 'change' : 'changes'}` : '', activeVariant === v.id, pick(v.id)), x];
      }),
    );
  }
  function addVariant() {
    if (!selection) return;
    const letter = String.fromCharCode(66 + variantsHere().length);
    const v: Variant = { id: `v${Date.now().toString(36)}`, name: `Variant ${letter}`, of: variantOf(), light: {}, dark: {}, shared: {} };
    (tweaks.variants ??= []).push(v);
    activeVariant = v.id;
    renderStage();
    applyLive();
    sync();
  }
  function removeVariant(id: string) {
    tweaks.variants = (tweaks.variants ?? []).filter((v) => v.id !== id);
    if (!tweaks.variants.length) delete tweaks.variants;
    if (activeVariant === id) activeVariant = null;
    renderStage();
    applyLive();
    sync();
  }
  /** Folds the active variant into the scope (Component, else Instance), then drops it. */
  function applyVariant() {
    const v = activeVariant ? variantById(activeVariant) : null;
    if (!v) return;
    activeVariant = null;
    if (scope === 'token') scope = 'component';
    for (const k of ['light', 'dark', 'shared'] as const) Object.assign(layer(k, true), v[k]);
    removeVariant(v.id);
  }
  function renderStage() {
    if (!isolating || !selection) { stage.close(); return; }
    const all = [{ id: 'original', label: selection.name }, ...variantsHere().map((v) => ({ id: v.id, label: v.name }))];
    const active = activeVariant ?? 'original';
    stage.render(selection.el, compare ? all : all.filter((i) => i.id === active), { active, right: width, dark: mode === 'dark' });
  }
  function setIsolating(state: boolean) {
    isolating = state && !!selection;
    if (!isolating) activeVariant = null;
    closePopover();
    renderStage();
    sync();
  }

  // States: named snapshots of every tweak, applied whole (Figma's pages, for a design's states).
  const stateSnapshot = (): PageState['tweaks'] => {
    const { states: _s, variants: _v, departures: _d, ...rest } = tweaks;
    return structuredClone(rest);
  };
  const addStateBtn = iconButton('plus', 'Save Page State', () => openSaveState());
  const statesSec = section({ id: 'states', title: 'States', actions: [addStateBtn], body: [] });
  const statesBody = statesSec.el.querySelector('.sec__b')!;
  function syncStates() {
    statesSec.el.hidden = !!selection;
    const list = tweaks.states ?? [];
    statesSec.setEmpty(!list.length);
    const now = stateSnapshot();
    statesBody.replaceChildren(...list.flatMap((st, i) => {
      const on = st.mode === mode && same(st.tweaks, now);
      const x = iconButton('minus', `Remove ${st.name}`, () => { tweaks.states = list.filter((_, j) => j !== i); if (!tweaks.states.length) delete tweaks.states; sync(); });
      return [vrow(st.name, st.mode === 'dark' ? 'Dark' : 'Light', on, () => applyState(st)), x];
    }));
  }
  function applyState(st: PageState) {
    const keep = { states: tweaks.states, variants: tweaks.variants };
    tweaks = normalize({ ...structuredClone(st.tweaks), ...keep });
    if (st.mode !== mode) { mode = st.mode; html.setAttribute('data-scheme', mode); invalidateTokens(); invalidateGraph(); }
    applyLive();
    sync();
  }
  function openSaveState() {
    const input = h('input', { class: 'f__input', spellcheck: 'false', 'aria-label': 'State name', placeholder: 'State name' });
    const field = h('div', { class: 'f span2', style: 'padding-left: 8px' }, input);
    const ok = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Save');
    const cancel = h('button', { type: 'button', class: 'btn' }, 'Cancel');
    const commit = () => {
      const name = input.value.trim();
      if (!name) return;
      const list = (tweaks.states ?? []).filter((x) => x.name !== name);
      tweaks.states = [...list, { name, savedAt: new Date().toISOString(), mode, tweaks: stateSnapshot() }];
      closePopover();
      sync();
    };
    input.addEventListener('input', () => { ok.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    ok.addEventListener('click', commit);
    cancel.addEventListener('click', () => closePopover());
    openPanelPopover({ root, anchor: addStateBtn, beside: panel, title: 'Save Page State', body: [field, h('span', {}), h('span', {}), h('div', { class: 'actions span3' }, ok, cancel)] });
    input.focus();
  }

  const tunePane = h('div', { class: 'p-body', role: 'tabpanel' }, sel, statesSec.el, variantsSec.el, scopeSec.el, tokensSec.el, propsSec.el, surfacesSec.el, colorsSec.el, typeSec.el, layoutSec?.el);

  // Comments: pick an element, write a line.
  const commentBox = checkbox({ label: 'Comment Mode', onChange: (on) => setCommenting(on) });
  const pickedText = h('div', { class: 'picked__text' });
  const pickedWhere = h('div', { class: 'picked__where' });
  const textarea = h('textarea', { 'aria-label': 'Comment', placeholder: 'Add a comment' });
  const commentSave = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Save');
  const commentCancel = h('button', { type: 'button', class: 'btn' }, 'Cancel');
  const composer = h('div', { class: 'pane', hidden: true }, h('div', { class: 'picked' }, pickedText, pickedWhere), textarea, h('div', { class: 'actions' }, commentSave, commentCancel));
  const list = h('ol', { class: 'clist' });
  const listSec = section({ id: 'open-comments', title: 'Open', body: [list] });
  const commentsPane = h('div', { class: 'p-body', role: 'tabpanel', hidden: true }, h('div', { class: 'sec' }, h('div', { class: 'sec__h' }, commentBox.el)), composer, listSec.el);

  const resize = h('div', { class: 'p-resize', 'aria-hidden': 'true', title: 'Drag to resize' });
  const panel = h('aside', { class: 'p', 'aria-label': 'Design Layer' }, resize, top, tunePane, commentsPane);
  const dock = h('div', { class: 'dock' }, panel);
  const hoverBox = h('div', { class: 'box', hidden: true });
  const pickedBox = h('div', { class: 'box box--picked', hidden: true });
  // The selection, Figma's way: a 1px blue frame, its name above, its size below.
  const selName = h('span', { class: 'box__name' });
  const selSize = h('span', { class: 'box__size' });
  const selBox = h('div', { class: 'box box--sel', hidden: true }, selName, selSize);
  const pins = h('div', {});
  ui.append(dock, hoverBox, pickedBox, selBox, pins);

  // Width: drag the left edge; the page's margin follows; the setting persists.
  const applyWidth = () => { ui.style.setProperty('--w', `${width}px`); if (stage.open) stage.el.style.right = `${width}px`; };
  resize.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    resize.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const w0 = width;
    closePopover();
    const move = (m: PointerEvent) => { width = Math.min(WIDTH.max, Math.max(WIDTH.min, Math.round(w0 + x0 - m.clientX))); applyWidth(); applyLive(); placeOverlays(); };
    const up = () => { resize.removeEventListener('pointermove', move); resize.removeEventListener('pointerup', up); store.set(WIDTH_KEY, String(width)); };
    resize.addEventListener('pointermove', move);
    resize.addEventListener('pointerup', up);
  });
  resize.addEventListener('dblclick', () => { width = WIDTH.default; store.set(WIDTH_KEY, String(width)); applyWidth(); applyLive(); placeOverlays(); });
  // The panel's own theme: light, dark, or the system's (Figma's appearance setting).
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => { ui.dataset.theme = panelTheme === 'system' ? (systemDark.matches ? 'dark' : 'light') : panelTheme; };
  systemDark.addEventListener('change', applyTheme);
  applyWidth();
  applyTheme();
  syncLayout();

  // ── render ──────────────────────────────────────────────────────────
  function sync() {
    // A re-render can replace the selected node: find it again by its selector, else let it go.
    if (selection && !selection.el.isConnected) {
      let el: Element | null = null;
      try { el = document.querySelector(selection.instance); } catch { /* stale selector */ }
      selection = el ? select(el) : null;
      renderTokens();
    }
    syncSelection();
    syncVariants();
    syncStates();
    tabBar.set(tab);
    modeDd.set(mode === 'dark' ? 'Dark' : 'Light');
    syncSurfaces();
    for (const r of colorRows) {
      const hex = colorValue(r.c.id, mode);
      const raw = colorRaw(r.c.id, mode);
      r.f.set(raw && boundToken(raw) ? raw : hex, { resolved: hex });
      dimOn(r.x, r.c.cssVar in layer(mode));
    }
    const ramp = rampOf(mode);
    let fails = 0;
    for (const s of SURFACE_IDS) for (const i of INKS) {
      const ratio = contrast(colorValue(i, mode), surfaceHex(ramp, s));
      const cell = contrastCells.get(`${s}:${i}`)!;
      const pass = ratio >= 4.5;
      if (!pass) fails++;
      cell.classList.toggle('fail', !pass);
      cell.textContent = `${ratio.toFixed(1)}${pass ? '' : ' Fail'}`;
    }
    contrastBtn.toggleAttribute('data-warn', fails > 0);
    contrastBtn.title = fails ? `Contrast: ${fails} below 4.5` : 'Contrast';
    for (const r of fontRows) {
      const opt = fontOption(r.f.id);
      if (opt) r.sel.set(opt.id);
      dimOn(r.x, r.f.cssVar in layer('shared'));
    }
    const ref = CFG.reference;
    for (const r of sizeRows) {
      const { s } = r;
      const ref1 = refSize(s.id);
      const size = sizeValue(s.id);
      r.size.set(shown(s.cssVar, size), { resolved: size, reference: ref && ref1 ? { name: ref.name, value: ref1.size } : null });
      // The weight field follows the face's axis (re-ranged when the face changes).
      const axis = axisOf(fontOption(s.font));
      r.weight.range(axis.min, axis.max);
      r.weight.el.title = axis.stops ? `Static: ${axis.stops.join(', ')}` : `Variable: ${axis.min} to ${axis.max}`;
      const w = weightValue(s.id);
      r.weight.set(shown(s.weightVar, w), { resolved: w, reference: ref && ref1 ? { name: ref.name, value: ref1.weight } : null });
      dimOn(r.x, s.cssVar in layer('shared') || s.weightVar in layer('shared'));
    }
    for (const r of lengthRows) {
      const ref1 = refLength(r.c.id);
      const v = compValue(r.c.id);
      r.f.set(shown(r.c.cssVar, v), { resolved: v, reference: ref && ref1 !== null ? { name: ref.name, value: ref1 } : null });
      dimOn(r.x, r.c.cssVar in layer('shared'));
    }
    refBtn?.setAttribute('aria-pressed', String(atReference()));
    // 350 is banned, wherever it came from (a hand-edited tweaks.json included).
    bannedList.replaceChildren(...bannedTweaks().map((v) => h('div', { class: 'note note--fail' }, `${v.replace(/^--/, '')}: ${BANNED_WEIGHT} is banned; regular is 400`)));
    const dirty = !same(tweaks, saved);
    save.disabled = !dirty;
    save.textContent = dirty ? 'Save' : 'Saved';
    syncComments();
  }

  function syncSurfaces() {
    const ramp = rampOf(mode);
    const choice = tweaks.palette?.[mode];
    const p = choice?.palette ? paletteById(choice.palette) : null;
    paletteDd.set(p ? (p.like ? `${p.name} (${p.like})` : p.name) : 'Theme Default');
    linkBtn.setAttribute('aria-pressed', String(linked));
    sharedH.set(round1(ramp.h));
    sharedS.set(round1(ramp.s));
    for (const s of surfaces) {
      s.color.set(surfaceHex(ramp, s.id));
      const [lo, hi] = s.id === 'canvas' ? CANVAS_RANGE[mode] : OFFSET_RANGE;
      s.light.range(lo, hi);
      s.light.set(round1(surfaceControlValue(ramp, s.id)));
      const band = s.id === 'canvas' ? RECIPE[mode].canvas : RECIPE[mode][s.id];
      s.light.el.title = `Recipe ${band.min} to ${band.max}`;
      const hs = surfaceHueSat(ramp, s.id);
      s.ownH.set(round1(hs.h));
      s.ownS.set(round1(hs.s));
    }
    const g = grade(ramp, mode);
    readOffsets.textContent = SURFACE_IDS.map((id) => `${SURFACE_SHORT[id]} ${signed(g.offsets[id])}`).join('  ·  ');
    readMatch.hidden = !g.matched;
    readFlags.replaceChildren(...g.flags.map((f) => h('div', { class: 'note note--fail' }, f)));
  }

  const openHere = () => feedback.filter((r) => r.status === 'open' && keyOf(r.url) === pageKey());
  function syncComments() {
    const here = openHere();
    tabBar.count('comments', here.length);
    listSec.el.hidden = !here.length;
    list.replaceChildren(...here.map((r, n) => {
      const resolve = h('button', { type: 'button', class: 'btn' }, 'Resolve');
      resolve.addEventListener('click', () => host.send('set-status', { id: r.id, status: 'resolved' }));
      return h('li', {}, h('span', { class: 'pin' }, String(n + 1)),
        h('div', {}, h('div', { class: 'c-text' }, r.comment), h('div', { class: 'c-where' }, r.text || r.selector)), resolve);
    }));
    commentBox.set(commenting);
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
    placeBox(hoverBox, (commenting || selecting) && hovered !== picked && hovered !== selection?.el ? hovered : null);
    placeBox(pickedBox, picked);
    placeBox(selBox, tab === 'tune' && !isolating ? selection?.el ?? null : null);
    if (selection && !selBox.hidden) {
      const r = selection.el.getBoundingClientRect();
      selName.textContent = selection.name;
      selSize.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    }
    if (!open || isolating) { pins.replaceChildren(); return; }
    const edge = innerWidth - width - 20;
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
    else { setCommenting(false); setSelecting(false); setSelection(null); closePopover(); }
    invalidateGraph();
    applyLive();
    sync();
  }
  /** The select tool: hover outlines, a click selects. */
  function setSelecting(state: boolean) {
    selecting = state;
    if (state && commenting) setCommenting(false);
    if (state && tab !== 'tune') setTab('tune');
    hovered = null;
    pickBtn.setAttribute('aria-pressed', String(state));
    html.style.cursor = state ? 'default' : commenting ? 'crosshair' : '';
    placeOverlays();
  }
  function setSelection(s: Selection | null) {
    selection = s;
    hovered = null;
    activeVariant = null;
    if (!s) isolating = false;
    closePopover();
    renderTokens();
    renderStage();
    sync();
  }
  function setTab(t: 'tune' | 'comments') {
    tab = t;
    tabBar.set(t);
    tunePane.hidden = t !== 'tune';
    commentsPane.hidden = t !== 'comments';
    if (t !== 'comments') setCommenting(false);
    if (t !== 'tune' && isolating) setIsolating(false);
  }
  function setCommenting(state: boolean) {
    commenting = state;
    if (state && selecting) setSelecting(false);
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
      else if (type === 'keydown' && k.key === 'Escape' && selection && !ui.querySelector('.pop') && !(k.composedPath()[0] instanceof HTMLInputElement)) setSelection(null);
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
    return t instanceof Element && !t.closest('astro-dev-toolbar, design-layer-stage') && t !== html && t !== document.body;
  };
  // The select tool picks the nearest component; Cmd or Alt picks the element itself (Figma's deep select).
  const deep = (e: MouseEvent) => e.metaKey || e.altKey;
  document.addEventListener('mousemove', (e) => {
    if (!open || !(commenting || selecting)) return;
    hovered = onPage(e) ? (selecting ? candidate(e.target as Element, deep(e)) : (e.target as Element)) : null;
    placeOverlays();
  }, true);
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'dblclick', 'click'] as const) {
    document.addEventListener(type, (e) => {
      if (!open || !(commenting || selecting) || !onPage(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (type === 'click' && selecting) { setSelection(select(candidate(e.target as Element, deep(e as MouseEvent)))); return; }
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
  // On the page: Esc clears the selection (then leaves the select tool),
  // Shift+Enter selects the parent component, Enter the first one inside.
  document.addEventListener('keydown', (e) => {
    if (!open || commenting) return;
    const t = e.composedPath()[0];
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return;
    if (e.key === 'Escape' && (selection || selecting)) {
      escapeAt = performance.now();
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isolating) setIsolating(false); else if (selection) setSelection(null); else setSelecting(false);
    } else if (e.key === 'Enter' && selection) {
      const next = e.shiftKey ? ancestors(selection.el).pop()?.root : firstChildComponent(selection.el)?.root;
      if (!next) return;
      e.preventDefault();
      setSelection(select(next));
    }
  }, true);
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
    invalidateGraph();
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
