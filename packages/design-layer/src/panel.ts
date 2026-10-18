// The design layer's panel: Figma's right sidebar for a spoke's tokens, drawn
// into a shadow root the host adapter hands it (Astro's dev toolbar canvas
// today), so nothing leaks either way. No framework imports: an adapter
// supplies PanelHost. Every control comes from the kit in ./ui.
//
// Tune edits the spoke's real custom properties live: Palette picks a whole
// theme (palettes.ts) and tunes its chrome as one ramp (surfaces.ts); the other
// sections override the properties the spoke config maps (defaults.mjs). Any
// colour, size, weight or length can be bound to one of the page's tokens
// instead of a raw value (stored as var(--token)). A weight is
// a number on the face's own wght axis, read from the @font-face rules the page
// has loaded; 350 is refused. Comments picks an element on the page and
// appends a line to feedback.jsonl.
//
// bcn-lego-checked: no esa- lego fits a dev tool whose job is editing the tokens the
// esa-* legos read: they would restyle themselves mid-tune. So the panel's own kit
// (./ui), on the tool's own palette and face.
import {
  BANNED_WEIGHT, FONT_OPTIONS, buildCss, googleHref, migrateShared, modeVars, rootSelector, scopedBlocks,
  type ColorControl, type FeedbackRecord, type FontControl, type FontOption,
  type LengthControl, type Mode, type PanelHost, type ResolvedConfig, type ServerState,
  type ChangeNote, type EditScope, type PageState, type PromoteEntry, type PromotePlan, type ScopedOverride, type Variant, type SizeControl, type Tweaks, type VarMap, type WeightAxis,
} from './controls';
import { contrast, firstFamily, formatColor, formatOf, oklchL, toHex, toRgba } from './color';
import { effectiveBackground, selectorFor, snippet, source } from './describe';
import {
  RECIPE, SURFACE_IDS, SURFACE_LABELS, SURFACE_SHORT,
  grade, hexToHsl, rampFromHexes, signed, surfaceHex, surfaceHueSat,
  type Ramp, type SurfaceId,
} from './surfaces';
import { GROUPS, PALETTES, paletteById, paletteRamp } from './palettes';
import { ancestors, candidate, firstChildComponent, select, type Selection } from './select';
import { computedOn, tokensOn, type TokenUse } from './inspect';
import { declared, dependents, invalidateGraph } from './graph';
import { createStage } from './stage';
import { kindsOf } from './fields';
import { buildLevers, GROUP_ORDER, type Band, type LeverChange, type LeverHost, type LeverRow, type MapKey, type Scheme, type Write } from './lever-rows';
import { hueOf, hues, neutrals, themeRamps } from './ramps';
import { CORNERS, DENSITY, NEUTRAL_SEED, TYPE_SCALE } from './recipe-seeds.mjs';
import { contrastLine, worst } from './checks';
import { applyDirection, bestThree, directionsFor, type Direction } from './options';
import { rampLever, swatchLever, LEVER_CSS, type Rung } from './ui/levers';
import { reviewModel, scopeWords, overridesWithout } from './review.mjs';
import { COLOR_LEVER_CSS, COLOR_CONTROL_KEY, colorControl, type ColorControl as ColorStudy } from './ui/color-levers';
import {
  UI_CSS, h, icon, checkbox, colorField, dropdown, iconButton, numberField, openMenu, openPalettePicker, openPanelPopover, openPopover,
  section, segmented, selectField, tabs, boundToken, shortName, closePopover, invalidateTokens, registerPanelFont, type ICONS, type MenuItem,
  SIZE_RUNGS, readTokens, typeProp, type PaletteOption, type PickIntent, type Prefix,
} from './ui';

/** The panel's width: a setting, dragged on its inner edge. Figma's own panel is 240; 320 gives the fields and the top row's undo and redo room. */
const WIDTH = { default: 320, min: 260, max: 480 };
const WIDTH_KEY = 'design-layer:width';
const SIDE_KEY = 'design-layer:side';
/** The overlay's distance from the viewport's edges: Figma's floating-panel gap, spacing-300. */
const INSET = 12;
/** Open, close and the side swap: one ease-out curve. */
const MOTION = 220;
const LAYOUT_KEY = 'design-layer:layout-open';
const DETAILS_KEY = 'design-layer:theme-details';
type Side = 'left' | 'right';
type Tab = 'tune' | 'review';
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
const normalize = (t: Partial<Tweaks> | undefined): Tweaks => ({
  light: { ...(t?.light ?? {}) }, dark: { ...(t?.dark ?? {}) }, shared: migrateShared(t?.shared ?? {}, CFG),
  ...(t?.palette && Object.keys(t.palette).length ? { palette: structuredClone(t.palette) } : {}),
  ...(t?.overrides?.length ? { overrides: structuredClone(t.overrides) } : {}),
  ...(t?.variants?.length ? { variants: structuredClone(t.variants) } : {}),
  ...(t?.states?.length ? { states: structuredClone(t.states) } : {}),
  ...(t?.notes && Object.keys(t.notes).length ? { notes: structuredClone(t.notes) } : {}),
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
  .dock { position: fixed; top: ${INSET}px; bottom: ${INSET}px; right: ${INSET}px; z-index: 2147483000;
    transition: transform ${MOTION}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${MOTION}ms cubic-bezier(0.16, 1, 0.3, 1); }
  .dock[data-side="left"] { right: auto; left: ${INSET}px; }
  .dock[data-state="closed"] { opacity: 0; transform: translateX(24px) scale(0.985); pointer-events: none; }
  .dock[data-side="left"][data-state="closed"] { transform: translateX(-24px) scale(0.985); }
  .dock[data-side="left"] .p-resize { left: auto; right: 0; }
  @media (prefers-reduced-motion: reduce) { .dock { transition: none; } }
  .pane { display: grid; gap: 8px; padding: 8px 8px 16px 16px; }
  .picked { display: grid; gap: 0; padding: 4px 8px; border-radius: 5px; background: var(--field); }
  .picked__text { overflow-wrap: anywhere; }
  .picked__where, .c-where { color: var(--ink-2); overflow-wrap: anywhere; }
  .ui textarea { display: block; width: 100%; min-height: 64px; padding: 4px 8px; border: 1px solid transparent; border-radius: 5px; background: var(--field); resize: vertical; }
  .ui textarea:hover { border-color: var(--line); }
  .ui textarea:focus { border-color: var(--focus); background: var(--bg); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .sp { width: 320px; max-width: 320px; }
  .sp__b { max-height: 420px; overflow-y: auto; padding: 8px; }
  .sp__file { padding: 8px 8px 4px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sp__file:first-child { padding-top: 0; }
  .sp__r { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 8px; align-items: center; height: 24px; padding: 0 8px; }
  .sp__n, .sp__v { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sp__v { color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }
  .sp__r--dim { color: var(--ink-2); }
  .sp__sub { padding: 4px 8px 0; font-weight: 550; }
  .sp__note { padding: 4px 8px; color: var(--ink-2); }
  .sp__cands { padding: 0 8px 4px; color: var(--ink-3); font-size: 11px; overflow-wrap: anywhere; }
  .sp__err { padding: 4px 8px; color: var(--danger); overflow-wrap: anywhere; }
  .sp__f { padding: 8px 16px 16px; border-top: 1px solid var(--line); }
  .clist { grid-column: 1 / -1; display: grid; margin: 0; padding: 0; list-style: none; }
  .clist li { display: grid; grid-template-columns: 16px 1fr auto; gap: 8px; align-items: start; padding: 4px 0; }
  .clist .pin { position: static; box-shadow: none; }
  .c-text { overflow-wrap: anywhere; }
  .pin { position: fixed; z-index: 2147482999; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
    background: #0d99ff; color: #fff; font: 550 9px/1 'Design Layer UI', Inter, system-ui, sans-serif; box-shadow: 0 0 0 1.5px #fff, 0 1px 3px rgba(0,0,0,.3); pointer-events: none; }
  /* outlines only: nothing fills over the design */
  .box { position: fixed; z-index: 2147482998; pointer-events: none; border: 1px solid #0d99ff; background: none; }
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
  .crumb--page { margin-left: -4px; }
  .crumb--only { flex: 1 1 auto; max-width: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { height: 24px; line-height: 24px; color: var(--ink-2); }
  .f--ro, .f--ro:hover { border-color: transparent; }
  .f--ro .f__name { padding: 0; cursor: default; }
  .f--ro .sw { pointer-events: none; }
  .vrow { display: flex; align-items: center; gap: 8px; min-width: 0; height: 24px; padding: 0 7px 0 8px; border: 1px solid transparent; border-radius: 5px;
    background: var(--field); color: var(--ink); text-align: left; }
  .vrow:hover { border-color: var(--line); }
  .vrow[aria-pressed="true"], .vrow[aria-pressed="true"]:hover { border-color: transparent; background: var(--selected); color: var(--selected-ink); }
  .vrow:focus-visible { box-shadow: none; text-decoration: underline; text-underline-offset: 3px; }
  .sel--two { border-bottom: 0; height: 48px; }
  .tb--try { color: var(--ink-2); }
  .tb--try:hover, .tb--try[aria-pressed="true"] { color: var(--ink); }
  .sel__ctx { margin-top: -8px; padding: 0 16px 16px; border-bottom: 1px solid var(--line); color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .f--readout { background: none; border-color: transparent; }
  .f--readout:hover { border-color: transparent; }
  .f--readout .f__name { color: var(--ink); user-select: text; cursor: copy; }
  .f--readout .f__suf { color: var(--ink-2); }
  .f--readout[data-copied]::after { content: 'Copied'; position: absolute; right: 0; top: -22px; height: 18px; padding: 0 6px; border-radius: 4px; background: var(--menu-bg); color: var(--menu-ink); font-size: 11px; line-height: 18px; box-shadow: var(--shadow); pointer-events: none; }
  .vrow__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vrow__meta { flex: none; color: var(--ink-2); }
  .vrow[aria-pressed="true"] .vrow__meta { color: inherit; opacity: .7; }
  .ib:disabled { color: var(--ink-3); background: none; }
  .row-x { visibility: hidden; }
  .row-x[data-on] { visibility: visible; }
  /* the target switch under the breadcrumb */
  .sel__lbl { height: 16px; margin-bottom: 4px; color: var(--ink-3); font-size: 11px; line-height: 16px; }
  .sel__ctx .seg { display: flex; width: 100%; }
  .sel__ctx .seg button { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  /* footer: the count, Before, Send to Claude */
  .p-foot { display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 12px 0 8px; border-top: 1px solid var(--line); flex: none; }
  .p-foot .grow { flex: 1; }
  .ft__n { height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink-2); font: inherit; font-variant-numeric: tabular-nums; }
  .ft__n:hover { background: var(--hover); color: var(--ink); }
  .btn[aria-pressed="true"] { border-color: transparent; background: var(--selected); color: var(--selected-ink); }
  /* review */
  .rv { display: grid; padding: 8px 8px 16px 16px; }
  .rv__r { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line); }
  .rv__t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rv__who { font-weight: 550; }
  .rv__v { grid-column: 1; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .rv__x { grid-column: 1 / -1; color: var(--danger); }
  .rv__s { grid-column: 1 / -1; color: var(--ink-3); }
  .rv__empty { padding: 16px 0; color: var(--ink-2); }
  .rv__h { padding: 12px 0 4px; font-weight: 550; }
  .rv__r--c { grid-template-columns: 16px minmax(0, 1fr) auto; align-items: start; }
  .rv__pin { position: static; margin-top: 2px; box-shadow: none; }
  .rv__dot { width: 16px; }
  .rv__ct { min-width: 0; }
  .rv__r--done .c-text { color: var(--ink-2); }
  .rv__resolve { color: var(--ink-2); }
  .rv__resolve:hover { color: var(--ink); }
  .rv__more { display: flex; align-items: center; gap: 2px; height: 32px; margin-left: -6px; padding: 0; border: 0; background: none; color: var(--ink-2); font: inherit; }
  .rv__more svg { width: 20px; height: 20px; rotate: -90deg; transition: rotate 120ms; }
  .rv__more[aria-expanded="true"] svg { rotate: 0deg; }
  .rv__more:hover { color: var(--ink); }
  /* padding and gap on the page, Chrome's inspector colours; dragged along the spacing scale */
  /* the bands are always there to drag, and paint only while their lever is hovered, they are hovered, or dragged: at rest nothing covers the design */
  .band { position: fixed; z-index: 2147482997; background: none; cursor: ns-resize; }
  .band[data-axis="x"] { cursor: ew-resize; }

  .band--padding[data-on], .band--padding:hover { background: rgba(147, 196, 125, 0.55); }
  .band--gap[data-on], .band--gap:hover { background: repeating-linear-gradient(45deg, rgba(175, 82, 222, 0.75) 0 1.5px, rgba(175, 82, 222, 0.12) 1.5px 6px); }
  .band__px { position: absolute; left: 50%; top: 50%; translate: -50% -50%; height: 14px; padding: 0 4px; border-radius: 2px; background: #3a7d22; color: #fff;
    font: 550 10px/14px 'Design Layer UI', Inter, system-ui, sans-serif; font-variant-numeric: tabular-nums; white-space: nowrap; pointer-events: none; visibility: hidden; }
  .band--gap .band__px { background: #8a3fb3; }
  .band[data-on] .band__px, .band:hover .band__px { visibility: visible; }
  .shield { position: fixed; inset: 0; z-index: 2147483100; cursor: ns-resize; }
  .shield[data-axis="x"] { cursor: ew-resize; }
  .ui[data-before] .box--sel { border-style: dashed; }
  /* options: A, B, C */
  .opt { display: grid; gap: 6px; padding: 8px 8px 8px 16px; border-bottom: 1px solid var(--line); }
  .opt[hidden] { display: none; }
  .opt__row { display: flex; align-items: center; gap: 4px; }
  .opt__row .seg { flex: 1; display: flex; min-width: 0; }
  .opt__row .seg button { position: relative; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .opt__row .seg button:first-child { flex: none; }
  .opt__row .seg button[hidden] { display: none; }
  .opt__row .seg button[data-fail]::after { content: ''; position: absolute; top: 3px; right: 3px; width: 5px; height: 5px; border-radius: 50%; background: var(--danger); }
  .opt__why { color: var(--ink-2); }
  .opt__why[data-warn] { color: var(--danger); }
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
  canvas.innerHTML = `<style>${UI_CSS}${LEVER_CSS}${COLOR_LEVER_CSS}${PANEL_CSS}</style>`;
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
  let side: Side = store.get(SIDE_KEY) === 'left' ? 'left' : 'right';
  /** Set once the undo history exists; until then a change has nothing to record into. */
  let onEdit = () => {};
  let closing = false;
  let layoutOpen = store.get(LAYOUT_KEY) === '1';
  /** The theme's own sections (surfaces, colours, type, layout, states) under the page levers. */
  let details = store.get(DETAILS_KEY) === '1';
  let tab: Tab = 'tune';
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
  /** Set while an edit must land page-wide whatever the scope. */
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
    const peer = peerOf(selection);
    if (scope === 'component' && peer) return { kind: 'component', ...peer };
    return { kind: 'instance', selector: selection.instance, name: selection.name, el: selection.el, page: location.pathname };
  }
  /** Every element like the selection: the component, or the same part inside every instance of it. */
  function peerOf(s: Selection): { selector: string; name: string; el: Element } | null {
    const c = s.component;
    if (!c) return null;
    if (c.root === s.el) return { selector: c.selector, name: c.name, el: c.root };
    const cls = [...s.el.classList].find((x) => !/^(is-|has-|active|open|selected|current|disabled|hidden|astro-|typography-)/.test(x));
    const part = cls ? `.${CSS.escape(cls)}` : s.el.localName;
    // "esa-card Title": the part's own word, not its BEM class.
    const word = (cls ? cls.split('__').pop()! : s.el.localName).replace(/-/g, ' ');
    return { selector: `${c.selector} ${part}`, name: `${c.name} ${word[0].toUpperCase()}${word.slice(1)}`, el: s.el };
  }
  /** How many elements "All" reaches. */
  const peerCount = () => { const p = selection && peerOf(selection); if (!p) return 1; try { return document.querySelectorAll(p.selector).length; } catch { return 1; } };
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
  /** The promote key of an edit at the current target: scope|selector|mode|var. */
  function keyAt(s: Mode | 'shared', cssVar: string) {
    const t = target();
    return t.kind === 'root' ? `token||${s}|${cssVar}` : `${t.kind}|${t.selector ?? ''}|${s}|${cssVar}`;
  }
  /** The selection's size rung, when its component has one (size="sm", or a --sm modifier class). */
  function sizeOfSelection(): string | null {
    const el = selection?.component?.root ?? selection?.el;
    if (!el) return null;
    const a = el.getAttribute('size');
    if (a && SIZE_RUNGS.includes(a)) return a;
    return [...el.classList].map((c) => c.match(/--(2xs|xs|sm|md|lg|xl)$/)?.[1]).find(Boolean) ?? null;
  }
  /**
   * Records what a pick meant, or forgets it when the value is typed. A
   * concept is exact here when it has one token, or when the field's own value
   * picked the size rung and the edit cannot span other sizes: an instance, a
   * variant, or a variable whose name carries its rung. Otherwise every rung is
   * a candidate and Save to Source asks for a coding pass.
   */
  function remember(s: Mode | 'shared', cssVar: string, intent?: PickIntent) {
    const key = keyAt(s, cssVar);
    const rest = (tweaks.intents ?? []).filter((i) => i.key !== key);
    if (intent) {
      const t = target();
      const narrow = t.kind === 'instance' || t.kind === 'variant' || /-(2xs|xs|sm|md|lg|xl|2xl)(-|$)/.test(cssVar);
      const exact = intent.variants.length === 1 || (intent.matched && narrow);
      rest.push({ key, concept: intent.concept, chosen: intent.chosen, value: intent.value, candidates: exact ? [intent.chosen] : intent.variants,
        context: { mode: s, size: intent.size ?? sizeOfSelection(), scope: t.kind === 'root' ? 'token' : t.kind, selection: selection ? (t.kind === 'root' ? null : t.selector ?? selection.instance) : null } });
    }
    if (rest.length) tweaks.intents = rest; else delete tweaks.intents;
  }
  /** Where a field's picker resolves concepts: its variable and the selection's size. */
  const pickAt = (cssVar: string, props: string[] = []) => ({ cssVar, prop: typeProp(cssVar) ?? props.map(typeProp).find(Boolean) ?? null, size: sizeOfSelection });
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
  /** Runs `fn` against the root whatever the scope. */
  const rooted = <T>(fn: () => T): T => { forceRoot = true; try { return fn(); } finally { forceRoot = false; } };


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

  function liveCss() {
    const root = rootSelector(true);
    const variantCss = (tweaks.variants ?? []).map((v) => scopedBlocks(root, (sel) => `${sel} [data-dl-variant="${v.id}"]`, v, dependents)).join('');
    return buildCss(tweaks, CFG.roles, true, dependents) + variantCss;
  }
  function applyLive() {
    live.textContent = liveCss();
    onEdit();
    const specs = [...new Set(Object.values(tweaks.shared).map((css) => FONT_OPTIONS.find((o) => o.css === css)?.google).filter((g): g is string => !!g))];
    const href = googleHref(specs);
    if (href) { if (fontLink.getAttribute('href') !== href) fontLink.href = href; if (!fontLink.isConnected) document.head.append(fontLink); }
    else fontLink.remove();
  }
  /** Writes one variable at the current scope (null drops the override). */
  function set(s: Mode | 'shared', cssVar: string, value: string | null, intent?: PickIntent) {
    // A colour keeps the format its source writes it in: the field speaks hex, an rgb() token stays rgb().
    if (value && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
      const f = formatOf(declared(cssVar, s === 'dark' ? 'dark' : 'light'));
      if (f !== 'hex') value = formatColor(toRgba(value), f);
    }
    const map = layer(s, value !== null);
    if (value === null) delete map[cssVar]; else map[cssVar] = value;
    remember(s, cssVar, value === null ? undefined : intent);
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

  // Top: Tune / Review / Comments, the tools, the page's scheme. Edits save
  // themselves (to tweaks.json, never to the token files); Send to Claude and
  // Save to Source are the two ways a change leaves the layer.
  const tabBar = tabs<Tab>({ label: 'Panel', options: [{ value: 'tune', label: 'Finetune' }, { value: 'review', label: 'Review' }], onChange: (t) => setTab(t) });
  const setMode = (m: Mode) => { mode = m; html.setAttribute('data-scheme', m); invalidateTokens(); invalidateGraph(); renderStage(); renderTokens(); renderPage(); sync(); };
  const schemeBtn = iconButton('moon', 'Dark Page', () => setMode(mode === 'dark' ? 'light' : 'dark'));
  let saveTimer = 0;
  const saveNow = () => {
    clearTimeout(saveTimer);
    if (same(tweaks, saved)) return;
    host.send('save-tweaks', { json: tweaks, css: buildCss(tweaks, CFG.roles, false, dependents) });
  };
  const autosave = () => { clearTimeout(saveTimer); saveTimer = window.setTimeout(saveNow, 700); };
  const pickBtn = iconButton('cursor', 'Select (Click an Element)', () => setSelecting(!selecting), false);
  const undoBtn = iconButton('undo', 'Undo (⌘Z)', () => undo());
  const redoBtn = iconButton('redo', 'Redo (⇧⌘Z)', () => redo());
  // The comment tool: Figma's speech bubble, toggled, C. A comment lands in Review.
  const commentBtn = iconButton('comment', 'Comment (C)', () => setCommenting(!commenting), false);
  const top = h('div', { class: 'p-top' }, tabBar.el, h('span', { class: 'grow' }), commentBtn, undoBtn, redoBtn);

  // Selection header: the palette as the title, then the selection's actions.
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
  const resetAllTweaks = () => { tweaks = emptyTweaks(); applyLive(); sync(); };
  type MenuAction = 'promote' | 'isolate' | 'scheme' | 'details' | 'reset-palette' | 'reset-all' | 'side' | 'close' | `color-${ColorStudy}`;
  const COLOR_CONTROLS: [ColorStudy, string][] = [['swatches', 'Swatches'], ['row', 'Row'], ['lever', 'Lever']];
  const menuBtn = iconButton('kebab', 'More', () => openMenu<MenuAction>({
    root, anchor: menuBtn, alignEnd: true, selected: null,
    items: [
      ...(selection ? [{ value: 'isolate' as MenuAction, label: 'Isolate Selection', lead: isolating ? icon('check') : h('span') }] : []),
      { value: 'scheme', label: mode === 'dark' ? 'Light Page' : 'Dark Page', header: selection ? ' ' : undefined },
      { value: 'promote', label: 'Save to Source…', header: '   ' },
      { value: 'details', label: 'Show Theme Details', header: ' ', lead: details ? icon('check') : h('span') },
      { value: 'reset-palette', label: 'Reset Palette' },
      { value: 'reset-all', label: 'Reset All to Source' },
      ...COLOR_CONTROLS.map(([v, label]) => ({ value: `color-${v}` as MenuAction, label, header: 'Color Control', lead: colorControl() === v ? icon('check') : h('span') })),
      { value: 'side', label: side === 'right' ? 'Move to Left' : 'Move to Right', header: '  ' },
      { value: 'close', label: 'Close Panel', meta: '⌃⌥D' },
    ],
    pick: (v) => {
      if (v === 'promote') openPromote();
      else if (v === 'isolate') setIsolating(!isolating);
      else if (v === 'scheme') setMode(mode === 'dark' ? 'light' : 'dark');
      else if (v === 'details') { details = !details; store.set(DETAILS_KEY, details ? '1' : '0'); sync(); }
      else if (v === 'reset-palette') { setRamp('light', null, null, false); setRamp('dark', null); }
      else if (v === 'reset-all') resetAllTweaks();
      else if (v.startsWith('color-')) { store.set(COLOR_CONTROL_KEY, v.slice(6)); renderTokens(); sync(); }
      else if (v === 'side') setSide(side === 'right' ? 'left' : 'right');
      else if (v === 'close') host.setOpen(false);
    },
  }));
  // With a selection the header is its breadcrumb (Figma's layer path) instead of the palette.
  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Selection', hidden: true });
  const clearBtn = iconButton('close', 'Clear Selection (Esc)', () => setSelection(null));
  const isolateBtn = iconButton('isolate', 'Isolate Selection', () => setIsolating(!isolating), false);
  const pageTitle = h('span', { class: 'crumb crumb--cur crumb--page' }, 'Page');
  const tryBtn = h('button', { type: 'button', class: 'tb tb--try', 'aria-pressed': 'false', title: 'Three variations of this, to compare (1, 2, 3)' }, 'Variations');
  tryBtn.addEventListener('click', () => (opts ? closeOptions() : tryThree()));
  const sel = h('div', { class: 'sel' }, paletteDd.el, pageTitle, crumbs, h('span', { class: 'grow' }), tryBtn, clearBtn);
  top.append(menuBtn);
  // What an edit applies to, under the breadcrumb: every one like it, or this one.
  const SCOPE_LABEL: Record<EditScope, string> = { component: 'Component', token: 'Token', instance: 'Instance' };
  const targetSeg = segmented<EditScope>({
    label: 'Apply to',
    options: [{ value: 'component', label: 'Every' }, { value: 'instance', label: 'Only This One' }],
    onChange: (v) => { scope = v; renderTokens(); sync(); },
  });
  const selCtx = h('div', { class: 'sel__ctx', hidden: true }, h('div', { class: 'sel__lbl' }, 'Applies To'), targetSeg.el);
  function syncHeader() {
    paletteDd.el.hidden = !!selection || !details;
    pageTitle.hidden = !!selection || details;
    selCtx.hidden = !selection;
    sel.classList.toggle('sel--two', !!selection);
    crumbs.hidden = !selection;
    clearBtn.hidden = !selection;
    isolateBtn.hidden = !selection;
    isolateBtn.setAttribute('aria-pressed', String(isolating));
    // Page mode has no selection line: Page heads its own section, Variations in that head.
    sel.hidden = !selection && !details;
    const pageHead = pageSec.el.querySelector('.sec__h')!;
    if (!selection && !details) { if (tryBtn.parentElement !== pageHead) pageHead.append(tryBtn); }
    else if (tryBtn.parentElement !== sel) sel.insertBefore(tryBtn, clearBtn);
    if (!selection) return;
    // Only the selected thing's name, Figma's layer name: the component when stamped, else its class or tag.
    crumbs.replaceChildren(h('span', { class: 'crumb crumb--cur crumb--only', title: selection.component?.file ?? selection.name, 'aria-current': 'true' }, selection.name));
  }

  // ── levers ──────────────────────────────────────────────────────────
  // A selection's sections are its levers (lever-rows.ts): Text, Icon, Box,
  // Border, Layout, each property moving along the system's ramp and
  // measuring itself in one line. A move is one undo step and one review row.
  const leverSecs = new Map(GROUP_ORDER.map((g) => [g, section({ id: `lv-${g.toLowerCase()}`, title: g, body: [] })]));
  let leverRows: LeverRow[] = [];
  let renderedFor = '';
  const num = (v: string) => Number.parseFloat(v) || 0;

  /** Runs `fn` with the live preview and the saved sheet off: what the source renders. */
  function original<T>(fn: () => T): T {
    const sheet = document.getElementById('design-layer-tweaks') as HTMLLinkElement | null;
    const was = [live.disabled, sheet?.disabled ?? false];
    const t = target();
    // A scoped target starts from what the element shows without THIS target's
    // edits: Only This One starts from what Every made it, so its reading is
    // true and picking the source value writes it instead of writing nothing.
    if ((t.kind === 'instance' || t.kind === 'component') && !before) {
      const keep = tweaks;
      const text = live.textContent;
      tweaks = { ...keep, overrides: overridesWithout(keep.overrides ?? [], t) };
      live.textContent = liveCss();
      if (sheet) sheet.disabled = true;
      try { return fn(); } finally { tweaks = keep; live.textContent = text; if (sheet) sheet.disabled = was[1]; }
    }
    live.disabled = true;
    if (sheet) sheet.disabled = true;
    try { return fn(); } finally { live.disabled = was[0]; if (sheet) sheet.disabled = was[1]; }
  }
  /** Runs `fn` in each scheme, then puts the page's scheme back. */
  function schemes<T>(fn: (s: Scheme) => T): Record<Scheme, T> {
    const prev = html.getAttribute('data-scheme');
    const out = {} as Record<Scheme, T>;
    for (const s of ['light', 'dark'] as const) { html.setAttribute('data-scheme', s); out[s] = fn(s); }
    if (prev === null) html.removeAttribute('data-scheme'); else html.setAttribute('data-scheme', prev);
    return out;
  }
  const axisFor = (el: Element) => axisOf({ id: '', label: '', css: getComputedStyle(el).fontFamily, weights: [] } as unknown as FontOption);
  const noteKey = (t: Target, field: string) => (t.kind === 'root' ? `page|${field}` : `${t.kind}|${t.selector}|${t.page ?? ''}|${field}`);
  const whereOf = (t: Scoped): ChangeNote['where'] => ({ kind: t.kind === 'component' ? 'component' : 'instance', selector: t.selector, ...(t.page ? { page: t.page } : {}) });

  /** A lever moved: its writes land at the target, its note says what changed. One undo step. */
  function commitLever(c: LeverChange) {
    if (peekBase) peek(null);
    checkpoint(true);
    const t = target();
    for (const w of c.writes) for (const m of w.modes) {
      const map = layer(m, w.value !== null);
      if (w.value === null) delete map[w.name]; else map[w.name] = w.value;
    }
    if (t.kind !== 'root' && t.kind !== 'variant') {
      const key = noteKey(t, c.field);
      const notes = { ...(tweaks.notes ?? {}) };
      if (c.writes.every((w) => w.value === null)) delete notes[key];
      else {
        notes[key] = {
          who: t.name, where: whereOf(t), field: c.field, what: c.label, from: c.from, to: c.to, fromToken: c.fromToken, toToken: c.toToken,
          writes: c.writes.map(({ name, modes }) => ({ name, modes })), ...(t.kind === 'component' ? { count: peerCount() } : {}),
          file: source(t.el).sourceFile, at: new Date().toISOString(),
        };
      }
      if (Object.keys(notes).length) tweaks.notes = notes; else delete tweaks.notes;
    }
    prune();
    applyLive();
    sync();
    checkpoint(true);
  }
  /** Keeps a change's failed check on its note, as the lever worded it. */
  function flagNote(field: string, check: string | null) {
    const n = tweaks.notes?.[noteKey(target(), field)];
    if (!n || (n.check ?? null) === check) return;
    if (check) n.check = check; else delete n.check;
  }
  const leverHost = (el: Element): LeverHost => ({
    el, uses: tokensOn(el), kinds: kindsOf(el, selection?.component?.root === el),
    raw: (m: MapKey, name: string) => layer(m)[name],
    original, schemes, commit: commitLever, flag: flagNote,
    hover: (b) => { bandHover = b; placeBands(); },
    weightOk: (n) => { const a = axisFor(el); return n >= a.min && n <= a.max && (!a.stops || a.stops.includes(n)); },
    peek,
  });
  // A hovered option, shown on the page and not kept: the writes go on a copy
  // of the tweaks, the page renders it, and leaving puts the copy back. Nothing
  // is saved, checkpointed or noted while it is up.
  let peekBase: Tweaks | null = null;
  function peek(writes: Write[] | null) {
    if (peekBase) { tweaks = peekBase; peekBase = null; }
    if (writes) {
      peekBase = structuredClone(tweaks);
      for (const w of writes) for (const m of w.modes) { const map = layer(m, w.value !== null); if (w.value === null) delete map[w.name]; else map[w.name] = w.value; }
    }
    previewing = !!peekBase || !!opts;
    applyLive();
  }

  function renderTokens() {
    const t = target();
    renderedFor = `${selection?.instance ?? ''}|${t.kind}|${activeVariant ?? ''}`;
    leverRows = selection?.el.isConnected ? buildLevers(leverHost(selection.el)) : [];
    for (const [g, sec] of leverSecs) {
      const rows = leverRows.filter((r) => r.group === g);
      sec.el.querySelector('.sec__b')!.replaceChildren(...rows.map((r) => r.el));
      sec.el.hidden = !rows.length;
    }
  }


  // ── page levers ─────────────────────────────────────────────────────
  // With nothing selected the panel is the theme, as levers on the recipe's
  // seeds (recipe-seeds.mjs): brand hue, neutral, corners, density, type
  // scale. Each re-points the spoke's own ramps at the root, previews live,
  // and names the seed that makes it real; Density and Type Scale have none
  // yet, and their notes say so. Border width is per element, not page-wide.
  // With nothing selected, Page is the first section head and its levers sit right under it.
  const pageSec = section({ id: 'page', title: 'Page', body: [] });
  type PageRow = { id: string; el: HTMLElement; sync(): void; move?(d: number): boolean; pick?(name: string): boolean };
  let pageRows: PageRow[] = [];
  const pageNote = (field: string) => tweaks.notes?.[`page|${field}`];
  type PageWrite = { name: string; modes: MapKey[]; value: string | null };
  function commitPage(field: string, what: string, from: string, to: string, tokens: [string | null, string | null], writes: PageWrite[], seed: ChangeNote['seed']) {
    checkpoint(true);
    for (const w of writes) for (const m of w.modes) { if (w.value === null) delete tweaks[m][w.name]; else tweaks[m][w.name] = w.value; }
    const notes = { ...(tweaks.notes ?? {}) };
    const key = `page|${field}`;
    if (writes.every((w) => w.value === null)) delete notes[key];
    else notes[key] = { who: 'Page', where: { kind: 'root', selector: ':root' }, field, what, from, to, fromToken: tokens[0], toToken: tokens[1], writes: writes.map(({ name, modes }) => ({ name, modes })), seed, at: new Date().toISOString() };
    if (Object.keys(notes).length) tweaks.notes = notes; else delete tweaks.notes;
    applyLive();
    sync();
    checkpoint(true);
  }
  const hexAt = (v: string) => toHex(measure('color', v));
  const pxAt = (v: string) => num(measure('width', v));
  const titleCase = (s: string) => s[0].toUpperCase() + s.slice(1);
  /** The hub's brand roles and the step each reads, for a page with no generated theme. */
  const BRAND_ROLES: [string, number][] = [
    ['--color-background-brand', 9], ['--color-background-brand-hover', 10], ['--color-background-brand-active', 10], ['--color-background-brand-muted', 3],
    ['--color-background-brand-muted-hover', 4], ['--color-background-brand-subtle', 2], ['--color-content-brand', 11], ['--color-content-link', 11],
    ['--color-content-on-brand-muted', 11], ['--color-border-brand', 8],
  ];
  /** Points a ramp's twelve steps (or the hub's brand roles) at a Radix scale, light and dark. */
  const rampWrites = (names: [string, number][], scale: string | null): PageWrite[] => names.flatMap(([name, n]) => [
    { name, modes: ['light'], value: scale ? `var(--color-${scale}-${n})` : null },
    { name, modes: ['dark'], value: scale ? `var(--color-${scale}-dark-${n})` : null },
  ]);
  const steps = (prefix: string): [string, number][] => Array.from({ length: 12 }, (_, i) => [`${prefix}-${i + 1}`, i + 1]);
  /**
   * The roles a spoke's theme points at one of its scoped ramps (--radial-neutral-7)
   * that something later overrides (Radial's theme-app.css re-points them at
   * --rd-gray-*), per scheme. Re-pointing the ramp cannot reach these, so a lever
   * writes them directly, and the note says the recipe seed alone would not.
   */
  function blockedRoles(prefix: string): { name: string; step: number; scheme: Scheme }[] {
    const found = new Map<string, { name: string; step: number; scheme: Scheme }>();
    const re = new RegExp(`^var\\(${prefix.replace(/[-]/g, '\\-')}-(\\d+)\\)$`);
    const walk = (rules: CSSRuleList) => {
      for (const r of [...rules]) {
        if ('cssRules' in r && !(r instanceof CSSStyleRule)) { walk((r as CSSGroupingRule).cssRules); continue; }
        if (!(r instanceof CSSStyleRule) || !/data-theme/.test(r.selectorText)) continue;
        const scheme: Scheme = /data-scheme="?dark/.test(r.selectorText) ? 'dark' : 'light';
        for (const name of [...r.style]) {
          if (!name.startsWith('--color-')) continue;
          const m = r.style.getPropertyValue(name).trim().match(re);
          if (m) found.set(`${scheme}|${name}`, { name, step: Number(m[1]), scheme });
        }
      }
    };
    for (const sheet of [...document.styleSheets]) { if (sheet.ownerNode === live) continue; try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
    const now = schemes((sc) => [...found.values()].filter((f) => f.scheme === sc).map((f) => hexAt(`var(${f.name})`) !== hexAt(`var(${prefix}-${f.step})`)));
    return (['light', 'dark'] as const).flatMap((sc) => [...found.values()].filter((f) => f.scheme === sc).filter((_, i) => now[sc][i]));
  }
  function renderPage() {
    const rows: PageRow[] = [];
    /** A ramp lever's move and pick, through its own onChange, for Options. */
    const steer = (lever: { get(): number }, rungs: Rung[], change: (i: number) => void) => ({
      move(d: number) { const c = lever.get(); const i = Math.max(0, Math.min(rungs.length - 1, c + d)); if (i === c) return false; change(i); return true; },
      pick(name: string) { const i = rungs.findIndex((r) => r.name === name); if (i < 0 || i === lever.get()) return false; change(i); return true; },
    });
    const tr = themeRamps();
    const sc = tr.scope;
    const themeFile = sc ? `theme-${sc}.json` : 'the theme recipe';

    // Brand: a hue at step 9. Judged by the button text it carries, in both schemes.
    const hs = hues();
    if (hs.all.length) {
      const onBrand = original(() => schemes(() => hexAt('var(--color-content-on-brand)')));
      const curFill = original(() => schemes(() => hexAt('var(--color-background-brand)')));
      const current: Rung = { value: curFill.light, name: 'Current' };
      const fill = (r: Rung) => { const hue = r === current ? null : hueOf(r); return hue ? { light: hexAt(`var(--color-${hue}-9)`), dark: hexAt(`var(--color-${hue}-dark-9)`) } : curFill; };
      const all = [current, ...hs.all];
      // Regenerating re-picks the foreground (white, or the darkest neutral), so a hue is judged by the better of the two.
      const dark = original(() => schemes(() => hexAt(sc ? `var(--${sc}-neutral-12)` : 'var(--color-gray-12)')));
      const best = (s: Scheme, f: string) => Math.max(contrast(onBrand[s], f), contrast('#ffffff', f), contrast(dark.light, f));
      const ratio = new Map(all.map((r) => { const f = fill(r); return [r.value, { light: best('light', f.light), dark: best('dark', f.dark) }]; }));
      const change = (r: Rung) => {
        const hue = r === current || r.value === current.value ? null : hueOf(r);
        commitPage('brand', 'Brand', 'Current', r.name ?? '', [null, r.token ?? null], rampWrites(sc ? steps(`--${sc}-brand`) : BRAND_ROLES, hue),
          hue ? { name: 'seeds.brand', value: hexAt(`var(--color-${hue}-9)`), exists: true } : undefined);
      };
      const lever = swatchLever({ label: 'Brand', rungs: [current, ...hs.lever], more: hs.all, onChange: change });
      lever.marks((r) => worst(ratio.get(r.value)!).ratio < 4.5);
      rows.push({ id: 'brand', el: lever.el, pick(name) { const r = all.find((x) => x.name === name); if (!r || pageNote('brand')?.toToken === r.token) return false; change(r); return true; }, sync() {
        const n = pageNote('brand');
        const cur = (n && all.find((r) => r.token === n.toToken)) || current;
        lever.set(cur, current);
        const line = contrastLine(ratio.get(cur.value)!, 4.5);
        lever.note(`Button text ${line.text}`, line.fail ? 'warn' : undefined);
        if (n) { if (line.fail) n.check = `Button text ${line.text}`; else delete n.check; }
      } });
    }

    // Neutral: one of the six. Judged by body text on the page.
    const ns = neutrals();
    if (sc && tr.neutral.length === 12 && ns.length) {
      const cur9 = original(() => hexAt(`var(--${sc}-neutral-9)`));
      const scaleOf = (r: Rung) => r.token?.match(/^--color-([a-z]+)-9$/)?.[1] ?? null;
      const origin = ns.find((r) => hexAt(r.value) === cur9) ?? { value: cur9, name: 'Current' };
      const rungs = ns.includes(origin) ? ns : [origin, ...ns];
      const body = (r: Rung) => { const n = scaleOf(r) ?? 'gray'; return { light: contrast(hexAt(`var(--color-${n}-12)`), hexAt(`var(--color-${n}-1)`)), dark: contrast(hexAt(`var(--color-${n}-dark-12)`), hexAt(`var(--color-${n}-dark-1)`)) }; };
      // Measured once, with the layer off: which roles Radial's own CSS holds away from the ramp.
      const blocked = original(() => blockedRoles(`--${sc}-neutral`));
      const change = (r: Rung) => {
        const n = r === origin ? null : scaleOf(r);
        const direct: PageWrite[] = blocked.map((b) => ({ name: b.name, modes: [b.scheme], value: n ? `var(--color-${n}${b.scheme === 'dark' ? '-dark' : ''}-${b.step})` : null }));
        commitPage('neutral', 'Neutral', origin.name ?? '', r.name ?? '', [origin.token ?? null, r.token ?? null], [...rampWrites(steps(`--${sc}-neutral`), n), ...direct],
          n ? { name: 'seeds.neutral', value: NEUTRAL_SEED[n as keyof typeof NEUTRAL_SEED], exists: true } : undefined);
      };
      const temp = (r: Rung) => { const n = scaleOf(r); return n ? NEUTRAL_SEED[n as keyof typeof NEUTRAL_SEED] : ''; };
      const roles = new Set(blocked.map((b) => b.name)).size;
      const lever = swatchLever({ label: 'Neutral', rungs, onChange: change });
      rows.push({ id: 'neutral', el: lever.el, pick(name) { const r = rungs.find((x) => x.name === name); const cur = pageNote('neutral')?.toToken ?? origin.token; if (!r || r.token === cur) return false; change(r); return true; }, sync() {
        const n = pageNote('neutral');
        const cur = (n && rungs.find((r) => r.token === n.toToken)) || origin;
        lever.set(cur, origin);
        const line = contrastLine(body(cur), 4.5).text;
        const shift = cur === origin ? `Body text ${line}` : `${origin.name} → ${cur.name} · ${temp(cur)} · body text ${line}`;
        lever.note(roles ? `${shift}. ${sc[0].toUpperCase()}${sc.slice(1)}'s own CSS overrides ${roles} of these roles, so the seed alone would not reach them; previewed directly.` : shift);
      } });
    }

    // Corners: the recipe's three corner languages.
    const has = (n: string) => !!getComputedStyle(html).getPropertyValue(n).trim();
    if (['xs', 'sm', 'md', 'lg'].every((k) => has(`--radius-${k}`))) {
      const keys = Object.keys(CORNERS) as (keyof typeof CORNERS)[];
      const mdOf = (k: keyof typeof CORNERS) => pxAt(CORNERS[k].md === '0' ? '0px' : CORNERS[k].md);
      const originMd = original(() => pxAt('var(--radius-md)'));
      const found = original(() => keys.findIndex((k) => Math.abs(mdOf(k) - originMd) < 0.5));
      const rungs: Rung[] = [...(found < 0 ? [{ value: 'current', name: 'Current' }] : []), ...keys.map((k) => ({ value: k, name: titleCase(k) }))];
      const oi = found < 0 ? 0 : found;
      const change = (i: number) => {
        const k = rungs[i].value as keyof typeof CORNERS;
        const back = i === oi;
        const writes: PageWrite[] = (['xs', 'sm', 'md', 'lg', 'chip'] as const).map((r) => ({ name: `--radius-${r}`, modes: ['shared'], value: back ? null : CORNERS[k][r] }));
        commitPage('corners', 'Corners', rungs[oi].name!, rungs[i].name!, [null, null], writes, back ? undefined : { name: 'seeds.corners', value: k, exists: true });
      };
      const lever = rampLever({ label: 'Corners', rungs, show: (r) => r.name ?? r.value, onChange: change });
      rows.push({ id: 'corners', el: lever.el, ...steer(lever, rungs, change), sync() {
        const n = pageNote('corners');
        const i = n ? rungs.findIndex((r) => r.name === n.to) : oi;
        lever.set(i < 0 ? oi : i, oi);
        lever.note(`Cards ${Math.round(pxAt('var(--radius-md)'))} px, chips ${Math.round(Math.min(pxAt('var(--radius-chip)'), 999))} px`.replace(' 999 px', ' pill'));
      } });
    }

    // Density and Type Scale: a multiplier over a scale, previewed on its declared values.
    const multiplier = (field: string, what: string, family: RegExp, rungs: Rung[], seedName: string) => {
      const names = readTokens().filter((t) => family.test(t.name)).map((t) => t.name);
      if (!names.length) return;
      const oi = rungs.findIndex((r) => r.value === '1');
      const change = (i: number) => {
        const f = rungs[i].value;
        const writes: PageWrite[] = names.map((name) => { const d = declared(name, 'light'); return { name, modes: ['shared'], value: f === '1' || !d ? null : `calc(${d} * ${f})` }; });
        commitPage(field, what, rungs[oi].name!, rungs[i].name!, [null, null], writes, f === '1' ? undefined : { name: seedName, value: rungs[i].name!.toLowerCase(), exists: false });
      };
      const lever = rampLever({ label: what, rungs, show: (r) => r.name ?? r.value, onChange: change });
      rows.push({ id: field, el: lever.el, ...steer(lever, rungs, change), sync() {
        const n = pageNote(field);
        const i = n ? rungs.findIndex((r) => r.name === n.to) : oi;
        lever.set(i < 0 ? oi : i, oi);
        lever.note(n ? 'Preview: needs a recipe seed' : null);
      } });
    };
    multiplier('density', 'Density', /^--spacing-\d+$/, DENSITY, 'seeds.density');
    multiplier('type-scale', 'Type Scale', /^--font-size-\d+$/, TYPE_SCALE, 'seeds.typeScale');

    pageRows = rows;
    pageSec.el.querySelector('.sec__b')!.replaceChildren(...rows.map((r) => r.el));
    pageSec.setEmpty(!rows.length);
    void themeFile;
  }

  // ── review: every change as one row, revertible, its failed check under it ──
  const reviewList = h('div', { class: 'rv' });
  const reviewPane = h('div', { class: 'p-body', role: 'tabpanel', hidden: true }, reviewList);
  function revertNote(key: string) {
    const n = tweaks.notes?.[key];
    if (!n) return;
    checkpoint(true);
    const maps = n.where.kind === 'root' ? tweaks : tweaks.overrides?.find((o) => o.scope === n.where.kind && o.selector === n.where.selector && (o.page ?? '') === (n.where.page ?? ''));
    if (maps) for (const w of n.writes) for (const m of w.modes) delete maps[m][w.name];
    const notes = { ...tweaks.notes };
    delete notes[key];
    if (Object.keys(notes).length) tweaks.notes = notes; else delete tweaks.notes;
    prune();
    applyLive();
    sync();
    checkpoint(true);
  }
  let showResolved = false;
  function syncReview() {
    const m = reviewModel({ notes: tweaks.notes, feedback, page: pageKey(), base: location.href });
    const n = m.changes.length;
    tabBar.count('review', m.count);
    changesBtn.textContent = `${n} ${n === 1 ? 'Change' : 'Changes'}`;
    sendBtn.disabled = !n && !m.open.length;
    beforeBtn.disabled = !n && !before;
    if (reviewPane.hidden) return;
    const comment = (r: FeedbackRecord, i: number | null) => {
      const resolve = r.status === 'open' ? h('button', { type: 'button', class: 'tb rv__resolve' }, 'Resolve') : h('span');
      resolve.addEventListener('click', () => host.send('set-status', { id: r.id, status: 'resolved' }));
      return h('div', { class: `rv__r rv__r--c${r.status === 'resolved' ? ' rv__r--done' : ''}` },
        i === null ? h('span', { class: 'rv__dot' }) : h('span', { class: 'pin rv__pin' }, String(i + 1)),
        h('div', { class: 'rv__ct' }, h('div', { class: 'c-text' }, r.comment), h('div', { class: 'rv__v' }, r.text || r.selector)),
        resolve);
    };
    const resolvedBtn = h('button', { type: 'button', class: 'rv__more', 'aria-expanded': String(showResolved) }, icon('chevron'), `Resolved (${m.resolved.length})`);
    resolvedBtn.addEventListener('click', () => { showResolved = !showResolved; syncReview(); });
    reviewList.replaceChildren(
      ...(m.changes.length || m.open.length || m.resolved.length ? [] : [h('div', { class: 'rv__empty' }, 'No changes or comments yet')]),
      ...m.changes.map(([key, c]: [string, ChangeNote]) => h('div', { class: 'rv__r' },
        h('div', { class: 'rv__t', title: c.where.selector }, h('span', { class: 'rv__who' }, c.who), ` · ${c.what}`),
        iconButton('reset', `Revert ${c.who} ${c.what}`, () => revertNote(key)),
        h('div', { class: 'rv__v' }, `${c.from} → ${c.to} · ${scopeWords(c.where, c.count)}`),
        ...(c.check ? [h('div', { class: 'rv__x' }, c.check)] : []),
        ...(c.seed && !c.seed.exists ? [h('div', { class: 'rv__s' }, 'Needs a recipe seed')] : []))),
      ...(m.open.length ? [h('div', { class: 'rv__h' }, 'Comments'), ...m.open.map((r, i) => comment(r as FeedbackRecord, i))] : []),
      ...(m.resolved.length ? [resolvedBtn, ...(showResolved ? m.resolved.map((r) => comment(r as FeedbackRecord, null)) : [])] : []),
    );
  }

  // ── footer: the count, Before, Send to Claude ───────────────────────
  const changesBtn = h('button', { type: 'button', class: 'ft__n' }, '0 Changes');
  changesBtn.addEventListener('click', () => setTab(tab === 'review' ? 'tune' : 'review'));
  const beforeBtn = h('button', { type: 'button', class: 'btn btn--before', 'aria-pressed': 'false', title: 'Hold the button, or B, to see the page before your changes' }, 'Hold for Before');
  const sendBtn = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Send to Claude');
  const foot = h('div', { class: 'p-foot' }, changesBtn, h('span', { class: 'grow' }), beforeBtn, sendBtn);
  /** The page without the layer's edits, while B is held (or the button is pressed). */
  let before = false;
  function setBefore(on: boolean) {
    if (before === on) return;
    before = on;
    live.disabled = on;
    const sheet = document.getElementById('design-layer-tweaks') as HTMLLinkElement | null;
    if (sheet) sheet.disabled = on;
    beforeBtn.setAttribute('aria-pressed', String(on));
    beforeBtn.textContent = on ? 'Showing Before' : 'Hold for Before';
    ui.toggleAttribute('data-before', on);
    placeOverlays();
  }
  // Held, never toggled: down shows the page before, up (or leaving) puts the changes back.
  beforeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); beforeBtn.setPointerCapture(e.pointerId); setBefore(true); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) beforeBtn.addEventListener(t, () => setBefore(false));
  beforeBtn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); setBefore(true); } });
  beforeBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') setBefore(false); });
  let beforeKey = false;
  /** B held anywhere but a text field shows the page before. */
  function beforeKeys(e: KeyboardEvent) {
    if (!open || e.code !== 'KeyB' || e.metaKey || e.ctrlKey || e.altKey) return false;
    const t = e.composedPath()[0];
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return false;
    e.preventDefault();
    if (e.type === 'keydown' && !e.repeat && !before) { beforeKey = true; setBefore(true); }
    if (e.type === 'keyup' && beforeKey) { beforeKey = false; setBefore(false); }
    return true;
  }

  /** changes.md: one heading per change, in Andy's words first and the system's after. */
  function changesMd(notes: ChangeNote[]) {
    const lines = [`# Design changes`, '', `${location.pathname} · ${new Date().toISOString().slice(0, 10)} · ${notes.length} ${notes.length === 1 ? 'change' : 'changes'} from the design layer`, ''];
    for (const n of notes) {
      lines.push(`## ${n.who} · ${n.what}`, '', `- ${n.from} → ${n.to}${n.fromToken || n.toToken ? ` (${n.fromToken ?? 'literal'} → ${n.toToken ?? 'literal'})` : ''}`);
      if (n.where.kind !== 'root') lines.push(`- ${n.where.kind === 'component' ? `Every ${n.count ?? ''} \`${n.where.selector}\``.replace('Every  ', 'Every ') : `Only this one, \`${n.where.selector}\`${n.where.page ? ` on ${n.where.page}` : ''}`}${n.file ? `, in ${n.file.split('/src/').pop()}` : ''}`);
      lines.push(`- Writes ${n.writes.map((w) => `\`${w.name}\``).slice(0, 6).join(', ')}${n.writes.length > 6 ? ` and ${n.writes.length - 6} more` : ''}`);
      if (n.seed) lines.push(n.seed.exists
        ? `- Recipe: set \`${n.seed.name}\` to \`${n.seed.value}\` in the theme recipe and regenerate (npm run theme:make); do not edit the generated CSS.`
        : `- No recipe seed for ${n.seed.name} yet; this is a preview (${n.seed.value}). Propose the seed before applying it.`);
      if (n.check) lines.push(`- Check failed: ${n.check}`);
      lines.push('');
    }
    return lines.join('\n');
  }
  sendBtn.addEventListener('click', () => {
    const notes = Object.values(tweaks.notes ?? {});
    if (!notes.length) return;
    saveNow();
    host.send('send-to-claude', {
      md: changesMd(notes),
      json: { page: location.pathname, at: new Date().toISOString(), scheme: mode, changes: notes, comments: openHere() },
    });
    const dir = CFG.dataDir;
    const prompt = `Apply the design changes in ${dir}/changes.md (selectors, tokens and source files are in ${dir}/changes.json). Each one is a lever I moved in the design layer on ${location.pathname}. Make each in source: point the element at the token named, change page-wide ones through the theme recipe (never the generated CSS), and stop and ask about any marked "Check failed" before applying it.`;
    void navigator.clipboard?.writeText(prompt).catch(() => {});
    sendBtn.textContent = 'Copied Prompt';
    setTimeout(() => { sendBtn.textContent = 'Send to Claude'; }, 1600);
  });

  // ── bands: padding and gap on the page, dragged along the spacing scale ──
  let bandHover: Band | null = null;
  const bands = h('div', {});
  function placeBands() {
    const el = selection?.el;
    if (!open || !el || !el.isConnected || isolating || tab !== 'tune' || before) { bands.replaceChildren(); return; }
    const rows = new Map(leverRows.map((r) => [r.id, r]));
    const out: HTMLElement[] = [];
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const band = (kind: Band, row: LeverRow, box: { left: number; top: number; width: number; height: number }, axis: 'x' | 'y', dir: 1 | -1, px: number) => {
      if (box.width < 1 || box.height < 1) return;
      const b = h('div', { class: `band band--${kind}`, 'data-axis': axis, ...(bandHover === kind ? { 'data-on': true } : {}), title: kind === 'padding' ? 'Drag (Alt: one side)' : 'Drag' },
        h('span', { class: 'band__px' }, `${Math.round(px)}`));
      Object.assign(b.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
      b.addEventListener('pointerdown', (e) => startDrag(e, row, kind === 'padding' && !e.altKey ? 'both' : axis, axis, dir));
      out.push(b);
    };
    const pad = rows.get('padding');
    if (pad?.drag) {
      const [t, rt, bt, l] = ['Top', 'Right', 'Bottom', 'Left'].map((k) => num(cs.getPropertyValue(`padding-${k.toLowerCase()}`)));
      band('padding', pad, { left: r.left, top: r.top, width: r.width, height: t }, 'y', 1, t);
      band('padding', pad, { left: r.left, top: r.bottom - bt, width: r.width, height: bt }, 'y', -1, bt);
      band('padding', pad, { left: r.left, top: r.top + t, width: l, height: r.height - t - bt }, 'x', 1, l);
      band('padding', pad, { left: r.right - rt, top: r.top + t, width: rt, height: r.height - t - bt }, 'x', -1, rt);
    }
    const gap = rows.get('gap');
    if (gap?.drag) {
      const kids = [...el.children].map((k) => k.getBoundingClientRect()).filter((k) => k.width && k.height);
      const g = num(cs.rowGap);
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1];
        const b = kids[i];
        if (b.top >= a.bottom - 1) band('gap', gap, { left: Math.max(r.left, Math.min(a.left, b.left)), top: a.bottom, width: Math.min(r.width, Math.max(a.right, b.right) - Math.min(a.left, b.left)), height: b.top - a.bottom }, 'y', 1, g);
        else if (b.left >= a.right - 1) band('gap', gap, { left: a.right, top: Math.min(a.top, b.top), width: b.left - a.right, height: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top) }, 'x', 1, num(cs.columnGap));
      }
    }
    bands.replaceChildren(...out);
  }
  /** A band dragged: a shield takes the pointer (the bands redraw under it), each rung reached is one move. */
  function startDrag(e: PointerEvent, row: LeverRow, which: 'x' | 'y' | 'both', axis: 'x' | 'y', dir: 1 | -1) {
    e.preventDefault();
    e.stopPropagation();
    const shield = h('div', { class: 'shield', 'data-axis': axis });
    ui.append(shield);
    shield.setPointerCapture?.(e.pointerId);
    const start = row.px?.(axis) ?? 0;
    const x0 = e.clientX;
    const y0 = e.clientY;
    pressing = true;
    const was = bandHover;
    bandHover = row.id as Band;
    const move = (m: PointerEvent) => row.drag?.(which, Math.max(0, start + (axis === 'y' ? m.clientY - y0 : m.clientX - x0) * dir));
    const up = () => { shield.remove(); pressing = false; bandHover = was; placeBands(); removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); };
    addEventListener('pointermove', move, true);
    addEventListener('pointerup', up, true);
  }

  // ── variations ──────────────────────────────────────────────────
  // Three directions (options.ts) previewed live, named for what they do. A previewed
  // option is real lever moves on a copy of the tweaks; Keep makes it one undo
  // step, Original or a new selection drops it. A direction whose moves fail a
  // check carries a red dot before it is picked.
  let previewing = false;
  let opts: { dirs: Direction[]; base: Tweaks; active: number | null; fails: number[]; moved: number[] } | null = null;
  const optSeg = segmented<string>({
    label: 'Options', options: [{ value: '0', label: 'Original' }, { value: '1', label: 'A' }, { value: '2', label: 'B' }, { value: '3', label: 'C' }],
    onChange: (v) => showOption(v === '0' ? null : Number(v) - 1),
  });
  const optWhy = h('div', { class: 'opt__why' });
  const keepBtn = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Keep');
  keepBtn.addEventListener('click', () => keepOption());
  const optClose = iconButton('close', 'Close Variations', () => closeOptions());
  const optBar = h('div', { class: 'opt', hidden: true }, h('div', { class: 'opt__row' }, optSeg.el, keepBtn, optClose), optWhy);
  const steerRows = () => (selection ? leverRows : pageRows);
  const checksNow = () => Object.values(tweaks.notes ?? {}).filter((n) => n.check).length;
  function preview(t: Tweaks) { tweaks = normalize(structuredClone(t)); applyLive(); }
  function tryThree() {
    const dirs = directionsFor(steerRows(), !selection);
    if (!dirs.length) return;
    checkpoint(true);
    saveNow();
    const base = structuredClone(tweaks);
    previewing = true;
    const before0 = checksNow();
    const fails: number[] = [];
    const moved: number[] = [];
    for (const d of dirs) { preview(base); moved.push(applyDirection(d, steerRows())); fails.push(Math.max(0, checksNow() - before0)); }
    preview(base);
    const keep = bestThree(dirs, moved);
    if (!keep.length) { previewing = false; return; }
    opts = { dirs: keep.map((i) => dirs[i]), base, active: null, fails: keep.map((i) => fails[i]), moved: keep.map((i) => moved[i]) };
    sync();
    showOption(moved.findIndex((m) => m > 0));
  }
  function showOption(i: number | null) {
    if (!opts) return;
    preview(opts.base);
    opts.active = i !== null && i >= 0 && opts.moved[i] ? i : null;
    if (opts.active !== null) applyDirection(opts.dirs[opts.active], steerRows());
    sync();
  }
  function keepOption() {
    if (!opts) return;
    if (opts.active === null) { closeOptions(); return; }
    opts = null;
    previewing = false;
    checkpoint(true);
    sync();
  }
  function closeOptions() {
    if (!opts) return;
    const base = opts.base;
    opts = null;
    previewing = false;
    preview(base);
    sync();
  }
  function syncOptions() {
    optBar.hidden = !opts || tab !== 'tune';
    tryBtn.setAttribute('aria-pressed', String(!!opts));
    tryBtn.hidden = !!activeVariant || !steerRows().length;
    if (!opts) return;
    const o = opts;
    optSeg.set(o.active === null ? '0' : String(o.active + 1));
    const btns = [...optSeg.el.querySelectorAll('button')];
    btns.slice(1).forEach((b, i) => {
      const d = o.dirs[i];
      b.hidden = !d;
      if (!d) return;
      b.textContent = d.name;
      b.disabled = !o.moved[i];
      b.toggleAttribute('data-fail', o.fails[i] > 0);
      b.title = `${d.name} (${i + 1})${o.fails[i] ? `: ${o.fails[i]} ${o.fails[i] === 1 ? 'check fails' : 'checks fail'}` : ''}`;
    });
    keepBtn.disabled = o.active === null;
    const a = o.active;
    optWhy.hidden = a === null;
    optWhy.textContent = a === null ? '' : `${o.dirs[a].why}${o.fails[a] ? ` ${o.fails[a]} ${o.fails[a] === 1 ? 'check fails' : 'checks fail'}.` : ''}`;
    optWhy.toggleAttribute('data-warn', a !== null && o.fails[a] > 0);
  }
  /** 0 to 3 pick Off, A, B, C while options are open; Esc drops them. */
  function optionKeys(e: KeyboardEvent) {
    if (!open || !opts || e.metaKey || e.ctrlKey || e.altKey) return false;
    const t = e.composedPath()[0];
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return false;
    if (e.key === 'Escape') { e.preventDefault(); closeOptions(); escapeAt = performance.now(); return true; }
    const n = ['0', '1', '2', '3'].indexOf(e.key);
    if (n < 0) return false;
    e.preventDefault();
    showOption(n === 0 ? null : n - 1);
    return true;
  }

  function syncSelection() {
    const has = !!selection;
    // A target change rebuilds the levers (they read and write at the target).
    if (`${selection?.instance ?? ''}|${target().kind}|${activeVariant ?? ''}` !== renderedFor) renderTokens();
    surfacesSec.el.hidden = has || !details;
    for (const sec of [colorsSec, typeSec, layoutSec]) if (sec) sec.el.hidden = has || !details;
    pageSec.el.hidden = has;
    if (!has) for (const sec of leverSecs.values()) sec.el.hidden = true;
    syncHeader();
    if (!selection) { for (const r of pageRows) r.sync(); placeBands(); return; }
    const eff = effectiveScope();
    targetSeg.set(eff === 'token' ? 'component' : eff);
    selCtx.hidden = !!activeVariant;
    const [allBtn, oneBtn] = targetSeg.el.querySelectorAll('button');
    const peer = peerOf(selection);
    const n = peerCount();
    allBtn.disabled = !peer;
    allBtn.textContent = peer ? `Every ${peer.el === selection.component?.root ? peer.name : selection.name} (${n})` : 'Every';
    allBtn.title = peer ? `Every ${peer.name} on this page (${n})` : 'Not inside a component';
    oneBtn.title = `This ${selection.name}, on this page`;
    for (const r of leverRows) r.sync();
    placeBands();
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
    const f = colorField({ root, label: c.label, suffix: c.label, tokens: { beside, at: pickAt(c.cssVar) }, onChange: (v, i) => set(mode, c.cssVar, v, i) });
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
  const setSize = (s: SizeControl, v: number | string, i?: PickIntent) => {
    if (typeof v === 'string') { set('shared', s.cssVar, v, i); return; }
    set('shared', s.cssVar, atRoot() && v === baseSize(s.id) ? null : `${v}px`);
  };
  const setWeight = (s: SizeControl, v: number | string, i?: PickIntent) => {
    if (typeof v === 'string') { if (!isBanned(v)) set('shared', s.weightVar, v, i); else sync(); return; }
    const fit = fitWeight(axisOf(fontOption(s.font)), v);
    const w = fit === BANNED_WEIGHT ? 400 : fit;
    set('shared', s.weightVar, atRoot() && w === baseWeight(s.id) ? null : String(w));
  };
  const sizeRows = SIZES.map((s) => {
    const size = numberField({
      root, label: `${s.label} size`, prefix: 'size', suffix: s.label, min: s.min, max: s.max, step: 0.5,
      tokens: { kind: 'length', beside, at: pickAt(s.cssVar) },
      onChange: (v, i) => setSize(s, v, i),
    });
    const weight = numberField({
      root, label: `${s.label} weight`, prefix: { text: 'W' }, min: 100, max: 900, step: 1, refuse: [BANNED_WEIGHT],
      tokens: { kind: 'weight', beside, at: pickAt(s.weightVar) },
      onChange: (v, i) => setWeight(s, v, i),
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
  const setLength = (c: LengthControl, v: number | string, i?: PickIntent) => {
    if (typeof v === 'string') { set('shared', c.cssVar, v, i); return; }
    set('shared', c.cssVar, atRoot() && v === baseComp(c.id) ? null : `${v}px`);
  };
  const lengthRows = COMPONENTS.map((c) => {
    const f = numberField({
      root, label: c.label, prefix: leadFor(c), suffix: c.label, min: c.min, max: c.max, step: c.step,
      tokens: { kind: 'length', beside, at: pickAt(c.cssVar) },
      onChange: (v, i) => setLength(c, v, i),
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
    const active = activeVariant ?? 'original';
    const ctx = (id: string, name: string) => (id === active ? `Editing ${id === 'original' ? 'Original' : name} · ${id === 'original' ? SCOPE_LABEL[effectiveScope()] : 'Variant'}` : name);
    const all = [{ id: 'original', label: ctx('original', selection.name) }, ...variantsHere().map((v) => ({ id: v.id, label: ctx(v.id, v.name) }))];
    stage.render(selection.el, compare ? all : all.filter((i) => i.id === active), { active, ...stageInset(), dark: mode === 'dark' });
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
    const { states: _s, variants: _v, departures: _d, ...rest } = tweaks as Tweaks & { departures?: unknown };
    return structuredClone(rest);
  };
  const addStateBtn = iconButton('plus', 'Save Page State', () => openSaveState());
  const statesSec = section({ id: 'states', title: 'States', actions: [addStateBtn], body: [] });
  const statesBody = statesSec.el.querySelector('.sec__b')!;
  function syncStates() {
    statesSec.el.hidden = !!selection || !details;
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

  // Undo and redo: one step per committed change, Figma's way. A checkpoint
  // follows each change once it settles (a microtask after the live CSS is
  // rebuilt), and waits while a pointer is down, so a scrub or a drag is one
  // step from press to release; text fields already commit on Enter or blur.
  // The stack is per page session: it survives closing the panel and clears on
  // Save to Source.
  const past: Tweaks[] = [];
  const future: Tweaks[] = [];
  let anchorT: Tweaks = structuredClone(tweaks);
  let pressing = false;
  let queued = false;
  const syncHistory = () => { undoBtn.disabled = !past.length; redoBtn.disabled = !future.length; };
  /** `force`: a lever's notch is its own step, even mid-drag. */
  function checkpoint(force = false) {
    queued = false;
    if (previewing || (pressing && !force) || same(tweaks, anchorT)) return;
    past.push(anchorT);
    if (past.length > 200) past.shift();
    future.length = 0;
    anchorT = structuredClone(tweaks);
    syncHistory();
  }
  const queueCheckpoint = () => { if (!queued) { queued = true; queueMicrotask(checkpoint); } };
  onEdit = queueCheckpoint;
  /** A state that is not an edit (the server's copy arriving): the new baseline, no step. */
  const rebase = () => { anchorT = structuredClone(tweaks); syncHistory(); };
  function restore(t: Tweaks) {
    tweaks = normalize(structuredClone(t));
    anchorT = structuredClone(tweaks);
    closePopover();
    applyLive();
    sync();
    syncHistory();
  }
  function undo() { checkpoint(); const t = past.pop(); if (!t) return; future.push(structuredClone(tweaks)); restore(t); }
  function redo() { const t = future.pop(); if (!t) return; past.push(structuredClone(tweaks)); restore(t); }
  const clearHistory = () => { past.length = 0; future.length = 0; rebase(); };
  syncHistory();
  // A press in the panel holds the checkpoint until release: one scrub, one step.
  ui.addEventListener('pointerdown', () => { pressing = true; }, true);
  addEventListener('pointerup', () => { if (pressing) { pressing = false; queueCheckpoint(); } }, true);
  addEventListener('pointercancel', () => { pressing = false; }, true);
  /** ⌘Z / ⇧⌘Z (Ctrl on other systems), except mid-edit in a text field, which keeps its own. */
  function historyKey(e: KeyboardEvent) {
    if (!open || !(e.metaKey || e.ctrlKey) || e.altKey || e.code !== 'KeyZ') return false;
    const t = e.composedPath()[0];
    if (t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button'].includes(t.type)) || (t instanceof HTMLElement && t.isContentEditable)) return false;
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return true;
  }

  // Save to Source: every component- and token-scope edit, written into the
  // files that declare it (promote.mjs decides where, and says so before it
  // writes). Instance edits stay as overrides. What it wrote leaves the tweaks.
  let promoting: { body: HTMLElement; ok: HTMLButtonElement; entries: PromoteEntry[] } | null = null;
  const instanceCount = () => (tweaks.overrides ?? []).filter((o) => o.scope === 'instance')
    .reduce((n, o) => n + Object.keys(o.light).length + Object.keys(o.dark).length + Object.keys(o.shared).length, 0);
  /** Of the lineage a component edit re-declares, what an instance (or anything
      inside it) actually reads, with what those read in turn: the live preview
      re-declares all of it, the source only what the component needs. */
  function readThrough(dep: VarMap, selector: string): VarMap {
    let el: Element | null = null;
    try { el = document.querySelector(selector); } catch { /* not a page selector */ }
    if (!el) return dep;
    const read = new Set<string>();
    for (const e of [el, ...el.querySelectorAll('*')].slice(0, 400)) for (const t of tokensOn(e)) read.add(t.name);
    const keep = new Set(Object.keys(dep).filter((k) => read.has(k)));
    for (let grew = true; grew;) {
      grew = false;
      for (const k of [...keep]) for (const m of dep[k].matchAll(/var\(\s*(--[\w-]+)/g)) if (m[1] in dep && !keep.has(m[1])) { keep.add(m[1]); grew = true; }
    }
    return Object.fromEntries(Object.entries(dep).filter(([k]) => keep.has(k)));
  }
  function promoteEntries(): PromoteEntry[] {
    const out = promoteRaw();
    // A pick whose concept is ambiguous here goes as a todo, never as a guessed token.
    const intents = new Map((tweaks.intents ?? []).map((i) => [i.key, i]));
    for (const e of out) {
      const i = intents.get(`${e.scope}|${e.selector ?? ''}|${e.mode}|${e.cssVar}`);
      if (i && i.candidates.length > 1 && e.value === `var(${i.chosen})`) e.todo = { concept: i.concept, chosen: i.chosen, candidates: i.candidates };
    }
    return out;
  }
  function promoteRaw(): PromoteEntry[] {
    const out: PromoteEntry[] = [];
    for (const m of ['light', 'dark'] as const) {
      for (const [cssVar, value] of Object.entries(modeVars(tweaks, m, CFG.roles))) {
        out.push({ scope: 'token', name: 'Root', mode: m, cssVar, value, base: declared(cssVar, m), ...(m === 'light' ? { darkBase: declared(cssVar, 'dark') } : {}) });
      }
    }
    for (const [cssVar, value] of Object.entries(tweaks.shared)) out.push({ scope: 'token', name: 'Root', mode: 'shared', cssVar, value, base: declared(cssVar, 'light') });
    for (const o of tweaks.overrides ?? []) {
      if (o.scope !== 'component') continue;
      for (const m of ['shared', 'light', 'dark'] as const) {
        const raw = o[m];
        if (!Object.keys(raw).length) continue;
        const at: Mode = m === 'dark' ? 'dark' : 'light';
        const base = { scope: 'component' as const, selector: o.selector, name: o.name, mode: m };
        for (const [cssVar, value] of Object.entries(raw)) out.push({ ...base, cssVar, value, base: declared(cssVar, at) });
        for (const [cssVar, value] of Object.entries(readThrough(dependents(raw, at), o.selector))) if (!(cssVar in raw)) out.push({ ...base, cssVar, value, expanded: true });
      }
    }
    return out;
  }
  function openPromote() {
    const entries = promoteEntries();
    const instances = instanceCount();
    const body = h('div', { class: 'sp__b' });
    if (!entries.length) body.append(h('div', { class: 'sp__note' }, instances ? 'Only instance edits, which stay as overrides.' : 'No edits to save.'));
    const ok = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Save') as HTMLButtonElement;
    const cancel = h('button', { type: 'button', class: 'btn' }, 'Cancel');
    const content = h('div', {},
      h('div', { class: 'pop__h' }, h('span', {}, 'Save to Source'), iconButton('close', 'Close', () => closePopover())),
      body, h('div', { class: 'sp__f actions' }, ok, cancel));
    openPopover({ root, anchor: menuBtn, beside: panel, content, className: 'sp', onClose: () => { promoting = null; } });
    promoting = { body, ok, entries };
    cancel.addEventListener('click', () => closePopover());
    ok.addEventListener('click', () => {
      ok.disabled = true;
      ok.textContent = 'Saving';
      host.send('promote', { entries, instances, write: true });
    });
    if (entries.length) host.send('promote', { entries, instances, write: false });
  }
  const short = (v: string | null) => (v == null ? '' : v.replace(/^var\(--([\w-]+)\)$/, '$1'));
  function renderPromote(plan: PromotePlan) {
    if (!promoting) return;
    if (plan.written && !plan.error) { finishPromote(plan); return; }
    const { body, ok } = promoting;
    const row = (name: string, value: string, title: string, dim = false) =>
      h('div', { class: `sp__r${dim ? ' sp__r--dim' : ''}`, title }, h('span', { class: 'sp__n' }, name.replace(/^--/, '')), h('span', { class: 'sp__v' }, value));
    const rows: Node[] = [];
    if (plan.error) rows.push(h('div', { class: 'sp__err' }, plan.error));
    for (const f of plan.files) {
      rows.push(h('div', { class: 'sp__file', title: f.path }, f.path));
      let group = 'Root';
      for (const c of [...f.changes].sort((a, b) => Number(a.name !== 'Root' && a.name !== 'Dark') - Number(b.name !== 'Root' && b.name !== 'Dark'))) {
        const named = c.name !== 'Root' && c.name !== 'Dark' && !/^(Pinned|[\w-]+\.)/.test(c.name) ? c.name : 'Root';
        if (named !== group) { group = named; rows.push(h('div', { class: 'sp__sub' }, named)); }
        const value = c.from == null || c.from === c.to ? short(c.to) : `${short(c.from)} → ${short(c.to)}`;
        const mode = c.mode === 'shared' ? 'Both Modes' : c.mode === 'light' ? 'Light' : 'Dark';
        rows.push(row(c.cssVar, value, [`${c.cssVar}: ${c.to}`, `${c.name} · ${mode}`, c.note].filter(Boolean).join('\n'), !!c.note));
      }
    }
    if (plan.regenerate.length) rows.push(...plan.regenerate.map((r) => h('div', { class: 'sp__note' }, r)));
    if (plan.todo.length) {
      rows.push(h('div', { class: 'sp__file' }, 'Needs a Coding Pass'));
      for (const t of plan.todo) {
        const where = t.file ? `A todo line in ${t.file}` : 'Listed here only; no theme file holds todos';
        rows.push(row(t.cssVar, t.concept.replace(/ · [\w-]+$/, ''), [`${t.cssVar} · ${t.name}`, `Wants ${t.concept}`, `Could be: ${t.candidates.join(', ')}`, where].join('\n')));
        rows.push(h('div', { class: 'sp__cands' }, t.candidates.map((c) => c.replace(/^--/, '')).join(' · ')));
      }
    }
    if (plan.skipped.length) {
      rows.push(h('div', { class: 'sp__file' }, 'Not Saved'));
      for (const x of plan.skipped) rows.push(row(x.cssVar, x.reason, `${x.cssVar} · ${x.name}\n${x.reason}`, true));
    }
    if (plan.instances) rows.push(h('div', { class: 'sp__note' }, `${plan.instances} instance ${plan.instances === 1 ? 'edit stays' : 'edits stay'} as overrides.`));
    body.replaceChildren(...rows);
    ok.textContent = 'Save';
    ok.disabled = !plan.keys.length && !plan.todo.some((t) => t.file);
  }
  function finishPromote(plan: PromotePlan) {
    const done = new Set(plan.keys);
    for (const m of ['light', 'dark'] as const) {
      for (const k of Object.keys(tweaks[m])) if (done.has(`token||${m}|${k}`)) delete tweaks[m][k];
      const pal = tweaks.palette?.[m];
      if (!pal) continue;
      const vars = Object.keys(modeVars({ ...emptyTweaks(), palette: { [m]: pal } }, m, CFG.roles));
      if (vars.every((v) => done.has(`token||${m}|${v}`))) delete tweaks.palette![m];
    }
    if (tweaks.palette && !Object.keys(tweaks.palette).length) delete tweaks.palette;
    for (const k of Object.keys(tweaks.shared)) if (done.has(`token||shared|${k}`)) delete tweaks.shared[k];
    for (const o of tweaks.overrides ?? []) {
      if (o.scope !== 'component') continue;
      for (const m of ['shared', 'light', 'dark'] as const) for (const k of Object.keys(o[m])) if (done.has(`component|${o.selector}|${m}|${k}`)) delete o[m][k];
    }
    prune();
    closePopover();
    host.send('save-tweaks', { json: tweaks, css: buildCss(tweaks, CFG.roles, false, dependents) });
    clearHistory();
    invalidateGraph();
    applyLive();
    sync();
  }

  const tunePane = h('div', { class: 'p-body', role: 'tabpanel' }, sel, selCtx, optBar, variantsSec.el, ...[...leverSecs.values()].map((g) => g.el), pageSec.el, statesSec.el, surfacesSec.el, colorsSec.el, typeSec.el, layoutSec?.el);

  // Comments: pick an element, write a line.
  const pickedText = h('div', { class: 'picked__text' });
  const pickedWhere = h('div', { class: 'picked__where' });
  const textarea = h('textarea', { 'aria-label': 'Comment', placeholder: 'Add a comment' });
  const commentSave = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Save');
  const commentCancel = h('button', { type: 'button', class: 'btn' }, 'Cancel');
  const composer = h('div', { class: 'pane', hidden: true }, h('div', { class: 'picked' }, pickedText, pickedWhere), textarea, h('div', { class: 'actions' }, commentSave, commentCancel));

  reviewPane.prepend(composer);
  const resize = h('div', { class: 'p-resize', 'aria-hidden': 'true', title: 'Drag to resize' });
  const panel = h('aside', { class: 'p', 'aria-label': 'Design Layer' }, resize, top, tunePane, reviewPane, foot);
  const dock = h('div', { class: 'dock' }, panel);
  const hoverBox = h('div', { class: 'box', hidden: true });
  const pickedBox = h('div', { class: 'box box--picked', hidden: true });
  // The selection, Figma's way: a 1px blue frame, its name above, its size below.
  const selName = h('span', { class: 'box__name' });
  const selSize = h('span', { class: 'box__size' });
  const selBox = h('div', { class: 'box box--sel', hidden: true }, selName, selSize);
  const pins = h('div', {});
  ui.append(dock, bands, hoverBox, pickedBox, selBox, pins);

  // Width: drag the inner edge; the setting persists. The overlay sits over the
  // page, which keeps its full width; only the isolation stage makes room.
  const stageInset = () => (side === 'right' ? { left: 0, right: width + 2 + INSET * 2 } : { left: width + 2 + INSET * 2, right: 0 });
  const applyWidth = () => {
    ui.style.setProperty('--w', `${width}px`);
    if (stage.open) { const i = stageInset(); stage.el.style.left = `${i.left}px`; stage.el.style.right = `${i.right}px`; }
  };
  resize.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    resize.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const w0 = width;
    closePopover();
    const move = (m: PointerEvent) => { width = Math.min(WIDTH.max, Math.max(WIDTH.min, Math.round(w0 + (side === 'right' ? x0 - m.clientX : m.clientX - x0)))); applyWidth(); placeOverlays(); };
    const up = () => { resize.removeEventListener('pointermove', move); resize.removeEventListener('pointerup', up); store.set(WIDTH_KEY, String(width)); };
    resize.addEventListener('pointermove', move);
    resize.addEventListener('pointerup', up);
  });
  resize.addEventListener('dblclick', () => { width = WIDTH.default; store.set(WIDTH_KEY, String(width)); applyWidth(); placeOverlays(); });
  // The panel is always dark (Figma's dark chrome), whatever the page's mode.
  ui.dataset.theme = 'dark';
  dock.dataset.side = side;
  dock.dataset.state = 'closed';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const later = (fn: () => void) => (reduced.matches ? fn() : setTimeout(fn, MOTION));
  /** Slides out, swaps sides, slides back in. */
  function setSide(next: Side) {
    if (next === side) return;
    closePopover();
    dock.dataset.state = 'closed';
    later(() => {
      side = next;
      store.set(SIDE_KEY, side);
      dock.dataset.side = side;
      applyWidth();
      placeOverlays();
      void dock.offsetWidth;
      dock.dataset.state = 'open';
    });
  }
  applyWidth();
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
    schemeBtn.replaceChildren(icon(mode === 'dark' ? 'sun' : 'moon'));
    schemeBtn.setAttribute('aria-label', mode === 'dark' ? 'Light Page' : 'Dark Page');
    schemeBtn.title = mode === 'dark' ? 'Light Page' : 'Dark Page';
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
    for (const r of sizeRows) {
      const { s } = r;
      const size = sizeValue(s.id);
      r.size.set(shown(s.cssVar, size), { resolved: size });
      // The weight field follows the face's axis (re-ranged when the face changes).
      const axis = axisOf(fontOption(s.font));
      r.weight.range(axis.min, axis.max);
      r.weight.el.title = axis.stops ? `Static: ${axis.stops.join(', ')}` : `Variable: ${axis.min} to ${axis.max}`;
      const w = weightValue(s.id);
      r.weight.set(shown(s.weightVar, w), { resolved: w });
      dimOn(r.x, s.cssVar in layer('shared') || s.weightVar in layer('shared'));
    }
    for (const r of lengthRows) {
      const v = compValue(r.c.id);
      r.f.set(shown(r.c.cssVar, v), { resolved: v });
      dimOn(r.x, r.c.cssVar in layer('shared'));
    }
    // 350 is banned, wherever it came from (a hand-edited tweaks.json included).
    bannedList.replaceChildren(...bannedTweaks().map((v) => h('div', { class: 'note note--fail' }, `${v.replace(/^--/, '')}: ${BANNED_WEIGHT} is banned; regular is 400`)));
    if (!previewing && !same(tweaks, saved)) autosave();
    syncReview();
    syncOptions();
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
    commentBtn.setAttribute('aria-pressed', String(commenting));
    composer.hidden = !picked;
    if (picked) {
      pickedText.textContent = snippet(picked) || `<${picked.localName}>`;
      const src = source(picked);
      pickedWhere.textContent = src.sourceFile ? `${src.sourceFile.split('/src/').pop()}:${src.sourceLine ?? ''}` : selectorFor(picked);
    }
    syncReview();
    placeOverlays();
  }

  function placeBox(box: HTMLElement, el: Element | null) {
    const r = el?.isConnected ? el.getBoundingClientRect() : null;
    box.hidden = !r || !r.width || !r.height || !open;
    if (r && !box.hidden) Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  function placeOverlays() {
    placeBands();
    placeBox(hoverBox, (commenting || selecting) && hovered !== picked && hovered !== selection?.el ? hovered : null);
    placeBox(pickedBox, picked);
    placeBox(selBox, tab === 'tune' && !isolating ? selection?.el ?? null : null);
    if (selection && !selBox.hidden) {
      const r = selection.el.getBoundingClientRect();
      selName.textContent = selection.name;
      selSize.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      selSize.hidden = hovered !== selection.el;
    }
    if (!open || isolating) { pins.replaceChildren(); return; }
    const lo = side === 'left' ? width + INSET * 2 + 2 : 2;
    const hi = side === 'right' ? innerWidth - width - INSET * 2 - 20 : innerWidth - 20;
    pins.replaceChildren(...openHere().flatMap((r, n) => {
      let el: Element | null = null;
      try { el = document.querySelector(r.selector); } catch { /* stale selector */ }
      const rect = el?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return [];
      return [h('span', { class: 'pin', style: `left:${Math.max(lo, Math.min(rect.right - 9, hi))}px;top:${Math.max(rect.top - 9, 2)}px` }, String(n + 1))];
    }));
  }

  function setOpen(state: boolean) {
    open = state;
    closing = false;
    pill.hidden = open;
    // In: start off-screen on its side, then ease to rest on the next frame.
    dock.dataset.state = 'closed';
    if (open) requestAnimationFrame(() => requestAnimationFrame(() => { dock.dataset.state = 'open'; }));
    if (open) { mode = html.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light'; invalidateTokens(); host.send('load', {}); renderPage(); if (tab === 'tune') setSelecting(true); }
    else { setCommenting(false); setSelecting(false); setSelection(null); closePopover(); setBefore(false); saveNow(); }
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
  function setSelection(s: Selection | null, fromClick = false) {
    closeOptions();
    // Each new selection starts on Every: a This One left over from the last
    // selection would quietly apply the next edit to one element.
    if (s && s.instance !== selection?.instance) scope = 'component';
    selection = s;
    hovered = null;
    activeVariant = null;
    if (!s) isolating = false;
    closePopover();
    renderTokens();
    renderStage();
    sync();
  }
  function setTab(t: Tab) {
    tab = t;
    tabBar.set(t);
    tunePane.hidden = t !== 'tune';
    reviewPane.hidden = t !== 'review';
    if (t === 'review') syncReview();
    placeOverlays();
    if (t !== 'tune' && isolating) setIsolating(false);
    // Selecting is always on in Tune: the page is the canvas, as in Figma.
    if (t === 'tune' && !selecting && !commenting) setSelecting(true);
    else if (t !== 'tune' && selecting) setSelecting(false);
  }
  function setCommenting(state: boolean) {
    commenting = state;
    if (state && selecting) setSelecting(false);
    hovered = null;
    if (!state) { picked = null; textarea.value = ''; commentSave.disabled = true; }
    html.style.cursor = state ? 'crosshair' : '';
    if (!state && tab === 'tune') setSelecting(true);
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
      if (type === 'keydown') historyKey(k);
      if (type !== 'keypress') beforeKeys(k);
      if (type === 'keydown' && optionKeys(k)) { e.stopPropagation(); return; }
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
      if (type === 'click' && selecting) { setSelection(select(candidate(e.target as Element, deep(e as MouseEvent))), true); return; }
      if (type === 'click') {
        picked = e.target as Element;
        hovered = null;
        if (tab !== 'review') setTab('review');
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
  /** C toggles the comment tool, anywhere but a text field. */
  function commentKey(e: KeyboardEvent) {
    if (!open || e.code !== 'KeyC' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return false;
    const t = e.composedPath()[0];
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return false;
    e.preventDefault();
    setCommenting(!commenting);
    return true;
  }
  document.addEventListener('keydown', (e) => { if (historyKey(e) || optionKeys(e) || beforeKeys(e) || commentKey(e)) e.stopImmediatePropagation(); }, true);
  document.addEventListener('keyup', (e) => { if (beforeKeys(e)) e.stopImmediatePropagation(); }, true);
  document.addEventListener('keydown', (e) => {
    if (!open || commenting) return;
    const t = e.composedPath()[0];
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return;
    // An open popover takes Esc first: it closes, the selection stays.
    if (e.key === 'Escape' && ui.querySelector('.pop')) return;
    if (e.key === 'Escape' && (selection || selecting)) {
      escapeAt = performance.now();
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isolating) setIsolating(false); else if (selection) setSelection(null);
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
    if (wasClean) { tweaks = normalize(incoming); anchorT = structuredClone(tweaks); }
    feedback = s.feedback ?? [];
    if (s.promote) renderPromote(s.promote);
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
  // Out: the toolbar hides its canvas the moment it closes, so the first close
  // request plays the animation and the second, after it, is let through.
  return {
    allowClose: () => {
      if (performance.now() - escapeAt <= 150) return false;
      if (closing || reduced.matches || !open) return true;
      closing = true;
      closePopover();
      dock.dataset.state = 'closed';
      setTimeout(() => host.setOpen(false), MOTION);
      return false;
    },
  };
}
