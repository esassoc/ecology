// The design layer's panel: a dark panel docked right, drawn into a shadow
// root the host adapter hands it (Astro's dev toolbar canvas today), so nothing
// leaks either way. No framework imports: an adapter supplies PanelHost.
//
// Tune edits the spoke's real custom properties live: Palette picks a whole
// theme (palettes.ts) and tunes its chrome as one ramp (surfaces.ts); the other
// groups override the properties the spoke config maps (defaults.mjs). Sizes and
// Components carry the reference spoke's value on every row (a tick on the
// slider, a note when the value departs from it) and a preset that applies them
// all. A weight is a number on the face's own wght axis, read from the
// @font-face rules the page has loaded. Comments picks an element on the page
// and appends a line to feedback.jsonl.
//
// bcn-lego-checked: no esa- lego fits a dev tool whose job is editing the tokens the
// esa-* legos read: esa-text-field, esa-select, esa-textarea, esa-switch-toggle and
// esa-range-slider would restyle themselves mid-tune, and none is a native color
// input. So native controls on a palette of the panel's own (--dl-*).
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

const WIDTH = 360;
const STRIP = 44;
const SECTIONS_KEY = 'design-layer:closed';

interface Base {
  colors: Record<string, string>;
  surfaces: Record<SurfaceId, string>;
  fonts: Record<string, string>;
  sizes: Record<string, number>;
  weights: Record<string, number>;
  components: Record<string, number>;
}

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
const pct = (v: number, [lo, hi]: [number, number]) => `${((v - lo) / (hi - lo)) * 100}%`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const keyOf = (href: string) => { const u = new URL(href, location.href); return u.pathname + u.hash; };
const pageKey = () => location.pathname + location.hash;

// The toolbar closes its open app on any Escape; the app's dialogs use Escape
// too, so the panel stays open (the toggle key, the toolbar icon and the
// collapse button close it).
let escapeAt = 0;

// ── the panel ──────────────────────────────────────────────────────────────
const STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .dl, .dl-strip {
    --dl-bg: #18181b; --dl-raised: #222226; --dl-field: #111113; --dl-line: #303036; --dl-line-strong: #46464e;
    --dl-ink: #ededf0; --dl-ink-2: #a8a8b3; --dl-fail: #ff8f8f; --dl-mark: #3d8bfd; --dl-on: #ededf0; --dl-on-ink: #18181b; --dl-band: #3d8bfd;
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483000;
    font: 400 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--dl-ink);
    background: var(--dl-bg); border-left: 1px solid var(--dl-line); color-scheme: dark;
    -webkit-font-smoothing: antialiased;
  }
  .dl { width: ${WIDTH}px; display: flex; flex-direction: column; }
  [hidden] { display: none !important; }
  .dl-strip { width: ${STRIP}px; display: flex; justify-content: center; padding-top: 10px; }
  button, input, select, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; }
  :focus-visible { outline: 2px solid var(--dl-mark); outline-offset: 1px; }

  .head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--dl-line); }
  .head .seg--tabs { flex: 1; }
  .seg { display: inline-flex; padding: 2px; gap: 2px; border: 1px solid var(--dl-line); border-radius: 6px; background: var(--dl-field); }
  .seg button { flex: 1; height: 28px; padding: 0 10px; border: 0; border-radius: 4px; background: none; color: var(--dl-ink-2); font-weight: 500; white-space: nowrap; }
  .seg button[aria-pressed="true"], .seg button[aria-selected="true"] { background: var(--dl-raised); color: var(--dl-ink); box-shadow: inset 0 0 0 1px var(--dl-line-strong); }
  .count { margin-left: 4px; color: var(--dl-ink-2); font-variant-numeric: tabular-nums; }
  .icon { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 4px; background: none; color: var(--dl-ink-2); }
  .icon:hover { background: var(--dl-raised); color: var(--dl-ink); }
  .icon svg { width: 16px; height: 16px; }

  .body { flex: 1; overflow-y: auto; padding: 4px 12px 16px; }
  section { padding: 14px 0 6px; }
  section + section, details + details { border-top: 1px solid var(--dl-line); }
  h2 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--dl-ink); }
  .h2row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .h2row h2 { margin: 0; }

  details { padding: 4px 0 8px; }
  summary { display: flex; align-items: center; gap: 6px; min-height: 36px; list-style: none; cursor: pointer; font-weight: 600; }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: ''; width: 6px; height: 6px; border: solid var(--dl-ink-2); border-width: 0 1.5px 1.5px 0; transform: rotate(-45deg); margin: 0 4px 0 2px; transition: transform 120ms; }
  details[open] > summary::before { transform: rotate(45deg); }
  summary .icon { margin-left: auto; }
  .sub { margin: 10px 0 2px; color: var(--dl-ink-2); }

  .row { display: grid; align-items: center; gap: 8px; min-height: 34px; }
  .row--color { grid-template-columns: 1fr 28px 84px 52px 24px; }
  .row--font { grid-template-columns: 76px 1fr 24px; }
  .row--size { grid-template-columns: 92px 1fr 48px 24px; row-gap: 0; }
  /* The icon sizes share the type rows' columns, so every slider in Sizes lines up. */
  [data-group="sizes"] .row--comp { grid-template-columns: 92px 1fr 48px 24px; }
  .row--size .bnote { grid-row: 3; }
  .lbl--sub { padding-left: 10px; color: var(--dl-ink-2); }
  .row--comp { grid-template-columns: 112px 1fr 48px 24px; row-gap: 0; }
  .rng { position: relative; display: block; min-width: 0; }
  .rng input { position: relative; display: block; }
  .rng[data-no-ref] .tick { display: none; }
  .tick { position: absolute; top: 50%; left: calc(7px + (100% - 14px) * var(--t, 0)); width: 2px; height: 12px; margin: -6px 0 0 -1px; border-radius: 1px; background: var(--dl-ink-2); pointer-events: none; }
  .bnote { grid-row: 2; grid-column: 2 / -2; justify-self: end; margin-top: -4px; color: var(--dl-ink-2); font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bnote[data-same] { visibility: hidden; }
  .bnote[data-banned] { color: var(--dl-fail); }
  .banned { margin: 4px 0 0; padding: 0; list-style: none; color: var(--dl-fail); }
  .banned:empty { display: none; }
  .preset { height: 28px; padding: 0 10px; margin-left: auto; border: 1px solid var(--dl-line-strong); border-radius: 4px; background: var(--dl-raised); color: var(--dl-ink); font-weight: 500; }
  .preset:hover { border-color: var(--dl-ink-2); }
  .preset[aria-pressed="true"] { background: var(--dl-on); border-color: var(--dl-on); color: var(--dl-on-ink); }
  .preset + .icon { margin-left: 0; }
  .row--ramp { grid-template-columns: 64px 1fr 44px 98px; }
  .row--srf { grid-template-columns: 64px 1fr 44px 98px; }
  .row--own { grid-template-columns: 64px 1fr 44px 98px; }
  .row--own .lbl { padding-left: 10px; color: var(--dl-ink-2); }

  .pal-group { margin: 0 0 6px; color: var(--dl-ink-2); }
  .palettes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
  .pal { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 3px 3px 4px; border: 1px solid var(--dl-line); border-radius: 6px; background: none; color: var(--dl-ink); font-size: 13px; line-height: 1.2; text-align: left; }
  .pal:hover { border-color: var(--dl-line-strong); }
  .pal[aria-pressed="true"] { border-color: var(--dl-ink); box-shadow: inset 0 0 0 1px var(--dl-ink); }
  .mini { position: relative; display: grid; grid-template-columns: 14px 1fr; grid-template-rows: 7px 22px; border-radius: 3px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
  .mini > :first-child { grid-column: 1 / -1; }
  .mini b { position: absolute; right: 5px; bottom: 6px; width: 10px; height: 10px; border-radius: 50%; }
  .pal__name, .pal__like { padding: 0 2px; overflow-wrap: break-word; }
  .pal__like { color: var(--dl-ink-2); }
  .pal__off { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--dl-fail); box-shadow: 0 0 0 2px var(--dl-bg); }

  input[type="range"].track-band { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; background:
    linear-gradient(to right, var(--dl-line-strong) 0 var(--lo, 0%), var(--dl-band) var(--lo, 0%) var(--hi, 0%), var(--dl-line-strong) var(--hi, 0%) 100%); }
  input[type="range"].track-hue { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; background:
    linear-gradient(to right, hsl(0 70% 55%), hsl(60 70% 55%), hsl(120 70% 55%), hsl(180 70% 55%), hsl(240 70% 55%), hsl(300 70% 55%), hsl(360 70% 55%)); }
  input[type="range"].track-band::-webkit-slider-thumb, input[type="range"].track-hue::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--dl-ink); border: 2px solid var(--dl-bg); }
  .hexwrap { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .hexwrap .field { min-width: 0; width: 100%; }
  .dot { flex: 0 0 auto; width: 14px; height: 14px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }

  .ramp-read { margin-top: 8px; padding: 8px 10px; border: 1px solid var(--dl-line); border-radius: 6px; font-variant-numeric: tabular-nums; }
  .ramp-read__offsets { display: flex; gap: 14px; color: var(--dl-ink); }
  .ramp-read__match { margin-top: 2px; color: var(--dl-ink-2); }
  .ramp-read ul { margin: 4px 0 0; padding: 0; list-style: none; color: var(--dl-fail); }
  .ramp-read li { display: block; padding: 0; }
  .ramp-read li + li { border-top: 0; }
  .lbl { color: var(--dl-ink); white-space: nowrap; }
  .row[data-set] .lbl { font-weight: 600; }
  .swatch { width: 28px; height: 28px; padding: 0; border: 1px solid var(--dl-line-strong); border-radius: 4px; background: none; }
  .swatch::-webkit-color-swatch-wrapper { padding: 2px; }
  .swatch::-webkit-color-swatch { border: 0; border-radius: 2px; }
  .field { height: 28px; padding: 0 8px; border: 1px solid var(--dl-line); border-radius: 4px; background: var(--dl-field); min-width: 0; }
  .field:hover { border-color: var(--dl-line-strong); }
  .hex { font-variant-numeric: tabular-nums; text-transform: lowercase; }
  .num { width: 100%; text-align: right; font-variant-numeric: tabular-nums; }
  .num::-webkit-inner-spin-button, .num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .num { -moz-appearance: textfield; padding: 0 6px; }
  .readout { color: var(--dl-ink-2); font-size: 13px; font-variant-numeric: tabular-nums; text-align: right; }
  select.field { width: 100%; }
  input[type="range"] { width: 100%; accent-color: var(--dl-on); }
  .reset { visibility: hidden; }
  .row[data-set] .reset, details[data-set] > summary .reset { visibility: visible; }

  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { height: 30px; padding: 0 4px; text-align: right; font-weight: 400; }
  th { color: var(--dl-ink-2); }
  th:first-child, td:first-child { text-align: left; }
  tbody th { color: var(--dl-ink); text-align: left; }
  tbody tr + tr > * { border-top: 1px solid var(--dl-line); }
  .grade { display: inline-block; min-width: 34px; margin-left: 6px; color: var(--dl-ink-2); }
  .fail, .fail .grade { color: var(--dl-fail); }

  .foot { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--dl-line); }
  .btn { height: 32px; padding: 0 14px; border: 1px solid var(--dl-line-strong); border-radius: 6px; background: var(--dl-raised); color: var(--dl-ink); font-weight: 500; }
  .btn:hover:not(:disabled) { border-color: var(--dl-ink-2); }
  .btn--primary { background: var(--dl-on); border-color: var(--dl-on); color: var(--dl-on-ink); }
  .btn:disabled { cursor: default; opacity: 0.55; }
  .btn--ghost { border-color: transparent; background: none; color: var(--dl-ink-2); padding: 0 8px; }
  .btn--ghost:hover:not(:disabled) { color: var(--dl-ink); border-color: transparent; }
  .push { margin-left: auto; }

  .switch { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 34px; padding: 0; border: 0; background: none; text-align: left; }
  .track { position: relative; width: 34px; height: 20px; border-radius: 10px; background: var(--dl-line-strong); transition: background 120ms; }
  .track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--dl-ink); transition: transform 120ms; }
  .switch[aria-checked="true"] .track { background: var(--dl-mark); }
  .switch[aria-checked="true"] .track::after { transform: translateX(14px); }

  .picked { margin: 12px 0 8px; padding: 10px; border: 1px solid var(--dl-line); border-radius: 6px; background: var(--dl-raised); }
  .picked__text { color: var(--dl-ink); overflow-wrap: anywhere; }
  .picked__where { margin-top: 4px; color: var(--dl-ink-2); font-size: 13px; overflow-wrap: anywhere; }
  textarea { display: block; width: 100%; min-height: 84px; padding: 8px; border: 1px solid var(--dl-line); border-radius: 4px; background: var(--dl-field); resize: vertical; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

  ol { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: 22px 1fr auto; gap: 10px; align-items: start; padding: 10px 0; }
  li + li { border-top: 1px solid var(--dl-line); }
  li .pin { position: static; box-shadow: none; }
  .c-text { overflow-wrap: anywhere; }
  .c-where { margin-top: 2px; color: var(--dl-ink-2); font-size: 13px; overflow-wrap: anywhere; }
  li .btn { height: 28px; padding: 0 10px; }

  .pin { position: fixed; z-index: 2147482999; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
    background: #3d8bfd; color: #fff; font: 600 13px/1 system-ui, -apple-system, sans-serif; box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,.35); pointer-events: none; }
  .box { position: fixed; z-index: 2147482998; pointer-events: none; border: 2px solid #3d8bfd; background: rgba(61, 139, 253, 0.08); border-radius: 2px; }
  .box--picked { background: rgba(61, 139, 253, 0.16); }
`;

const ICON_COLLAPSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
const ICON_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';

const resetBtn = (label: string, key: string) => `<button type="button" class="icon reset" data-reset="${key}" aria-label="Reset ${label}" title="Reset">${ICON_RESET}</button>`;
const label = (id: string) => COLORS.find((c) => c.id === id)!.label;
const group = (id: string, title: string, body: string, extra = '') =>
  `<details open data-group="${id}"><summary>${title}${extra}</summary>${body}</details>`;
const range = (attrs: string, cls = 'track-band') => `<input type="range" class="${cls}" ${attrs}>`;
/** A slider with the reference's value as a tick on its track (placed by sync). */
const ticked = (attrs: string) => `<span class="rng"><i class="tick" aria-hidden="true"></i>${range(attrs)}</span>`;
const note = '<span class="bnote" data-bnote data-same></span>';

function surfacesMarkup() {
  const card = (p: (typeof PALETTES)[number]) => `
    <button type="button" class="pal" data-palette="${p.id}" aria-pressed="false">
      <span class="mini" aria-hidden="true"><i data-mini="bar"></i><i data-mini="rail"></i><i data-mini="canvas"></i><b data-mini="primary"></b></span>
      <span class="pal__name">${esc(p.name)}</span>
      ${p.like ? `<span class="pal__like">${esc(p.like).replace('/', '/<wbr>')}-like</span>` : ''}
      <i class="pal__off" data-off hidden></i>
    </button>`;
  const palettes = GROUPS.map((g) => `
    <div class="pal-group" id="dl-pg-${g.id}">${g.label}</div>
    <div class="palettes" role="group" aria-labelledby="dl-pg-${g.id}">${PALETTES.filter((p) => p.group === g.id).map(card).join('')}</div>`).join('');
  const own = (id: SurfaceId) => `
    <div class="row row--own" data-own="${id}:h" hidden>
      <label class="lbl" for="dl-own-${id}-h">Hue</label>
      ${range(`id="dl-own-${id}-h" min="0" max="360" step="1"`, 'track-hue')}
      <input type="number" class="field num" min="0" max="360" step="1" aria-label="${SURFACE_LABELS[id]} hue">
      <span></span>
    </div>
    <div class="row row--own" data-own="${id}:s" hidden>
      <label class="lbl" for="dl-own-${id}-s">Saturation</label>
      ${range(`id="dl-own-${id}-s" min="0" max="60" step="0.5"`)}
      <input type="number" class="field num" min="0" max="100" step="0.5" aria-label="${SURFACE_LABELS[id]} saturation">
      <span></span>
    </div>`;
  const surfaces = SURFACE_IDS.map((id) => `
    <div class="row row--srf" data-srf="${id}">
      <label class="lbl" for="dl-srf-${id}">${SURFACE_LABELS[id]}</label>
      ${range(`id="dl-srf-${id}" step="0.5"`)}
      <input type="number" class="field num" step="0.5" aria-label="${SURFACE_LABELS[id]} ${id === 'canvas' ? 'lightness' : 'lightness offset'}">
      <span class="hexwrap"><i class="dot" aria-hidden="true"></i><input type="text" class="field hex" maxlength="7" spellcheck="false" aria-label="${SURFACE_LABELS[id]} hex"></span>
    </div>${own(id)}`).join('');
  const body = `
    ${palettes}
    <button type="button" class="switch" role="switch" aria-checked="true" data-act="linked">
      <span>Move Together</span><span class="track" aria-hidden="true"></span>
    </button>
    <div class="row row--ramp" data-shared="h">
      <label class="lbl" for="dl-ramp-h">Hue</label>
      ${range('id="dl-ramp-h" min="0" max="360" step="1"', 'track-hue')}
      <input type="number" class="field num" min="0" max="360" step="1" aria-label="Shared hue">
      <span></span>
    </div>
    <div class="row row--ramp" data-shared="s">
      <label class="lbl" for="dl-ramp-s">Saturation</label>
      ${range('id="dl-ramp-s" min="0" max="60" step="0.5"')}
      <input type="number" class="field num" min="0" max="100" step="0.5" aria-label="Shared saturation">
      <span></span>
    </div>
    ${surfaces}
    <div class="ramp-read" data-ramp-read>
      <div class="ramp-read__offsets" data-offsets></div>
      <div class="ramp-read__match" data-match></div>
      <ul data-flags></ul>
    </div>`;
  return group('surfaces', 'Palette', body, resetBtn('Palette', 'surfaces'));
}

function markup() {
  const colors = COLORS.map((c) => `
    <div class="row row--color" data-color="${c.id}">
      <span class="lbl" id="dl-c-${c.id}">${c.label}</span>
      <input type="color" class="swatch" aria-labelledby="dl-c-${c.id}">
      <input type="text" class="field hex" maxlength="7" spellcheck="false" aria-label="${c.label} hex">
      <span class="readout" title="OKLCH lightness"></span>
      ${resetBtn(c.label, `color:${c.id}`)}
    </div>`).join('');
  const fonts = FONTS.map((f) => `
    <div class="row row--font" data-font="${f.id}">
      <label class="lbl" for="dl-f-${f.id}">${f.label}</label>
      <select class="field" id="dl-f-${f.id}">${FONT_OPTIONS.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join('')}</select>
      ${resetBtn(f.label, `font:${f.id}`)}
    </div>`).join('');
  // Each size row is two lines: the size, then its weight on the face's axis
  // (sync sets the weight slider's range).
  const sizes = SIZES.map((s) => `
    <div class="row row--size" data-size="${s.id}">
      <label class="lbl" for="dl-s-${s.id}">${s.label}</label>
      ${ticked(`id="dl-s-${s.id}" data-k="size" min="${s.min}" max="${s.max}" step="0.5"`)}
      <input type="number" class="field num" data-k="size" min="${s.min}" max="${s.max}" step="0.5" aria-label="${s.label} size in pixels">
      ${resetBtn(s.label, `size:${s.id}`)}
      <label class="lbl lbl--sub" for="dl-w-${s.id}">Weight</label>
      ${ticked(`id="dl-w-${s.id}" data-k="weight" step="1"`)}
      <input type="number" class="field num" data-k="weight" step="1" aria-label="${s.label} weight">
      <span></span>
      ${note}
    </div>`).join('');
  const lengthRow = (c: (typeof COMPONENTS)[number]) => `
    <div class="row row--comp" data-comp="${c.id}">
      <label class="lbl" for="dl-k-${c.id}">${c.label}</label>
      ${ticked(`id="dl-k-${c.id}" min="${c.min}" max="${c.max}" step="${c.step}"`)}
      <input type="number" class="field num" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label} in pixels">
      ${resetBtn(c.label, `comp:${c.id}`)}
      ${note}
    </div>`;
  const icons = COMPONENTS.filter((c) => c.group === 'sizes').map(lengthRow).join('');
  const components = COMPONENTS.filter((c) => !c.group).map(lengthRow).join('');
  const preset = CFG.reference
    ? `<button type="button" class="preset" data-act="reference" aria-pressed="false" title="Every size and weight at ${esc(CFG.reference.name)}'s value">${esc(CFG.reference.name)}</button>`
    : '';
  const contrastRows = SURFACE_IDS.map((s) => `<tr><th scope="row">${SURFACE_LABELS[s]}</th>${INKS.map((i) => `<td data-cr="${s}:${i}"></td>`).join('')}</tr>`).join('');
  return `
    <aside class="dl" aria-label="Design Layer">
      <div class="head">
        <div class="seg seg--tabs" role="tablist" aria-label="Panel">
          <button type="button" role="tab" data-tab="tune" aria-selected="true">Tune</button>
          <button type="button" role="tab" data-tab="comments" aria-selected="false">Comments<span class="count" data-count></span></button>
        </div>
        <div class="seg" role="group" aria-label="Mode" data-mode-seg>
          <button type="button" data-mode="light" aria-pressed="true">Light</button>
          <button type="button" data-mode="dark" aria-pressed="false">Dark</button>
        </div>
        <button type="button" class="icon" data-act="collapse" aria-label="Collapse panel">${ICON_COLLAPSE}</button>
      </div>

      <div class="body" data-pane="tune" role="tabpanel">
        ${surfacesMarkup()}
        ${group('colors', 'Colors', `${colors}
          <div class="sub">Contrast</div>
          <table>
            <thead><tr><th scope="col">Surface</th>${INKS.map((i) => `<th scope="col">${label(i)}</th>`).join('')}</tr></thead>
            <tbody>${contrastRows}</tbody>
          </table>`)}
        ${group('fonts', 'Fonts', fonts)}
        ${group('sizes', 'Sizes', `${sizes}${icons}<ul class="banned" data-banned-list></ul>`, preset)}
        ${components ? group('components', 'Components', components) : ''}
      </div>

      <div class="body" data-pane="comments" role="tabpanel" hidden>
        <section>
          <button type="button" class="switch" role="switch" aria-checked="false" data-act="comment-mode">
            <span>Comment Mode</span><span class="track" aria-hidden="true"></span>
          </button>
          <div data-composer hidden>
            <div class="picked"><div class="picked__text" data-picked-text></div><div class="picked__where" data-picked-where></div></div>
            <textarea aria-label="Comment" data-comment></textarea>
            <div class="actions">
              <button type="button" class="btn btn--primary" data-act="comment-save" disabled>Save</button>
              <button type="button" class="btn" data-act="comment-cancel">Cancel</button>
            </div>
          </div>
        </section>
        <section data-open-list hidden>
          <h2>Open</h2>
          <ol data-list></ol>
        </section>
      </div>

      <div class="foot" data-foot>
        <button type="button" class="btn btn--ghost" data-act="reset-all">Reset All</button>
        <button type="button" class="btn btn--primary push" data-act="save" disabled>Saved</button>
      </div>
    </aside>
    <div class="dl-strip" hidden><button type="button" class="icon" data-act="expand" aria-label="Expand panel">${ICON_EXPAND}</button></div>
    <div class="box" data-hover hidden></div>
    <div class="box box--picked" data-picked hidden></div>
    <div data-pins></div>`;
}

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
  {
    canvas.innerHTML = `<style>${STYLE}</style>${markup()}`;
    const $ = <T extends Element = HTMLElement>(sel: string) => canvas.querySelector(sel) as T;
    const $$ = <T extends Element = HTMLElement>(sel: string) => [...canvas.querySelectorAll(sel)] as T[];
    const html = document.documentElement;

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
    let mode: Mode = html.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light';
    let tweaks = emptyTweaks();
    let saved = emptyTweaks();
    let feedback: FeedbackRecord[] = [];
    let commenting = false;
    let picked: Element | null = null;
    let hovered: Element | null = null;
    const base: Partial<Record<Mode, Base>> = {};

    // ── tokens ──────────────────────────────────────────────────────────
    // The theme's own values, read with every override switched off.
    function readBase(m: Mode): Base {
      if (base[m]) return base[m]!;
      const savedSheet = document.getElementById('design-layer-tweaks') as HTMLLinkElement | null;
      const scheme = html.getAttribute('data-scheme');
      live.disabled = true;
      if (savedSheet) savedSheet.disabled = true;
      html.setAttribute('data-scheme', m);
      document.body.append(probe);
      const read = (prop: 'color' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'width', v: string) => {
        probe.style[prop] = `var(${v})`;
        const out = getComputedStyle(probe)[prop];
        probe.style[prop] = '';
        return out;
      };
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
    /** The override, else the palette's value, else the theme's own. */
    const colorValue = (id: string, m: Mode) => {
      const v = modeVars(tweaks, m, CFG.roles)[COLORS.find((c) => c.id === id)!.cssVar];
      return v ? toHex(v) : readBase(m).colors[id];
    };
    const fontOption = (id: string) => {
      const f = FONTS.find((x) => x.id === id)!;
      const css = tweaks.shared[f.cssVar] ?? readBase(mode).fonts[id];
      return FONT_OPTIONS.find((o) => firstFamily(o.css) === firstFamily(css));
    };
    const baseSize = (id: string) => Math.round(readBase(mode).sizes[id] * 2) / 2;
    const sizeValue = (id: string) => {
      const v = tweaks.shared[SIZES.find((s) => s.id === id)!.cssVar];
      return v ? Number.parseFloat(v) : baseSize(id);
    };
    const weightValue = (id: string) => {
      const v = tweaks.shared[SIZES.find((s) => s.id === id)!.weightVar];
      return v ? Number.parseFloat(v) : readBase(mode).weights[id];
    };
    const compOf = (id: string) => COMPONENTS.find((c) => c.id === id)!;
    const baseComp = (id: string) => half(readBase(mode).components[id]);
    const compValue = (id: string) => {
      const v = tweaks.shared[compOf(id).cssVar];
      return v ? Number.parseFloat(v) : baseComp(id);
    };
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
    /** Places a row's ticks (one per pair, on its slider in order) and writes its
        note: the reference's value for each pair that departs from it, none when
        all match. A row the reference does not name shows neither. */
    function markReference(row: Element, pairs: { value: number; ref: number | null; lo: number; hi: number }[]) {
      const rngs = row.querySelectorAll<HTMLElement>('.rng');
      pairs.forEach((p, i) => {
        rngs[i]?.toggleAttribute('data-no-ref', p.ref === null);
        if (p.ref !== null) rngs[i]?.style.setProperty('--t', String(Math.min(1, Math.max(0, (p.ref - p.lo) / (p.hi - p.lo)))));
      });
      const named = pairs.filter((p): p is typeof p & { ref: number } => p.ref !== null);
      const off = named.filter((p) => p.value !== p.ref);
      const el = row.querySelector<HTMLElement>('[data-bnote]')!;
      // Hidden, not emptied, when nothing departs, so the row keeps its height.
      el.textContent = named.length ? `${CFG.reference!.name} ${(off.length ? off : named).map((p) => p.ref).join(' / ')}` : '';
      el.toggleAttribute('data-same', !off.length);
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
    const setWeight = (s: (typeof SIZES)[number], w: number) =>
      set('shared', s.weightVar, w === readBase(mode).weights[s.id] ? null : String(w));
    const isBanned = (v: string | number) => {
      const t = String(v).trim();
      return Number.parseFloat(t) === BANNED_WEIGHT || t === `var(--font-weight-${BANNED_WEIGHT})`;
    };
    /** Every tuned weight (any mode, any weight variable) set to the banned 350. */
    const bannedTweaks = () => (['shared', 'light', 'dark'] as const).flatMap((k) =>
      Object.entries(tweaks[k]).filter(([v, val]) => /weight/.test(v) && isBanned(val)).map(([v]) => v));

    // ── surfaces ────────────────────────────────────────────────────────
    let linked = true;
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

    // ── render ──────────────────────────────────────────────────────────
    function sync() {
      for (const b of $$('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
      for (const c of COLORS) {
        const row = $(`[data-color="${c.id}"]`);
        const hex = colorValue(c.id, mode);
        const sw = row.querySelector<HTMLInputElement>('.swatch')!;
        const tx = row.querySelector<HTMLInputElement>('.hex')!;
        if (sw.value !== hex) sw.value = hex;
        if (canvas.activeElement !== tx) tx.value = hex;
        row.querySelector('.readout')!.textContent = `L ${oklchL(hex).toFixed(3)}`;
        row.toggleAttribute('data-set', c.cssVar in tweaks[mode]);
      }
      syncSurfaces();
      const ramp = rampOf(mode);
      for (const s of SURFACE_IDS) for (const i of INKS) {
        const ratio = contrast(colorValue(i, mode), surfaceHex(ramp, s));
        const td = $(`[data-cr="${s}:${i}"]`);
        const pass = ratio >= 4.5;
        td.classList.toggle('fail', !pass);
        td.innerHTML = `${ratio.toFixed(2)}<span class="grade">${pass ? 'AA' : 'Fail'}</span>`;
      }
      for (const f of FONTS) {
        const row = $(`[data-font="${f.id}"]`);
        const opt = fontOption(f.id);
        const sel = row.querySelector('select')!;
        if (opt && sel.value !== opt.id) sel.value = opt.id;
        row.toggleAttribute('data-set', f.cssVar in tweaks.shared);
      }
      for (const s of SIZES) {
        const row = $(`[data-size="${s.id}"]`);
        const v = String(sizeValue(s.id));
        const range = row.querySelector<HTMLInputElement>('input[type="range"][data-k="size"]')!;
        const num = row.querySelector<HTMLInputElement>('.num[data-k="size"]')!;
        if (range.value !== v) range.value = v;
        if (canvas.activeElement !== num) num.value = v;
        // The weight: a slider over the face's axis (re-ranged when the face changes).
        const axis = axisOf(fontOption(s.font));
        const w = weightValue(s.id);
        const wRange = row.querySelector<HTMLInputElement>('input[type="range"][data-k="weight"]')!;
        const wNum = row.querySelector<HTMLInputElement>('.num[data-k="weight"]')!;
        for (const el of [wRange, wNum]) { el.min = String(axis.min); el.max = String(axis.max); }
        wRange.title = axis.stops ? `Static: ${axis.stops.join(', ')}` : `Variable: ${axis.min} to ${axis.max}`;
        if (wRange.value !== String(w)) wRange.value = String(w);
        if (canvas.activeElement !== wNum) wNum.value = String(w);
        row.toggleAttribute('data-set', s.cssVar in tweaks.shared || s.weightVar in tweaks.shared);
        const r = refSize(s.id);
        markReference(row, [
          { value: sizeValue(s.id), ref: r?.size ?? null, lo: s.min, hi: s.max },
          { value: w, ref: r?.weight ?? null, lo: axis.min, hi: axis.max },
        ]);
        // 350 is banned: the row's note says so in place of the reference's value.
        if (weightValue(s.id) === BANNED_WEIGHT) {
          const n = row.querySelector<HTMLElement>('[data-bnote]')!;
          n.textContent = `Weight ${BANNED_WEIGHT} is banned; regular is 400`;
          n.removeAttribute('data-same');
          n.setAttribute('data-banned', '');
        } else row.querySelector('[data-bnote]')!.removeAttribute('data-banned');
      }
      for (const c of COMPONENTS) {
        const row = $(`[data-comp="${c.id}"]`);
        const v = String(compValue(c.id));
        const range = row.querySelector<HTMLInputElement>('input[type="range"]')!;
        const num = row.querySelector<HTMLInputElement>('.num')!;
        if (range.value !== v) range.value = v;
        if (canvas.activeElement !== num) num.value = v;
        row.toggleAttribute('data-set', c.cssVar in tweaks.shared);
        markReference(row, [{ value: compValue(c.id), ref: refLength(c.id), lo: c.min, hi: c.max }]);
      }
      $('[data-act="reference"]')?.setAttribute('aria-pressed', String(atReference()));
      // Weight variables outside the Sizes rows (a hand-edited tweaks.json) carrying 350.
      const sizeWeights = new Set(SIZES.map((s) => s.weightVar));
      $('[data-banned-list]').innerHTML = bannedTweaks().filter((v) => !sizeWeights.has(v))
        .map((v) => `<li>${esc(v)}: ${BANNED_WEIGHT} is banned</li>`).join('');
      const dirty = !same(tweaks, saved);
      const save = $<HTMLButtonElement>('[data-act="save"]');
      save.disabled = !dirty;
      save.textContent = dirty ? 'Save' : 'Saved';
      $<HTMLButtonElement>('[data-act="reset-all"]').disabled = same(tweaks, emptyTweaks());
      syncComments();
    }

    function syncSurfaces() {
      const ramp = rampOf(mode);
      const choice = tweaks.palette?.[mode];
      const rc = RECIPE[mode];
      $('[data-group="surfaces"]').toggleAttribute('data-set', !!choice);
      for (const p of PALETTES) {
        const card = $(`[data-palette="${p.id}"]`);
        card.setAttribute('aria-pressed', String(choice?.palette === p.id));
        for (const id of [...SURFACE_IDS, 'primary'] as const) card.querySelector<HTMLElement>(`[data-mini="${id}"]`)!.style.background = p[mode][id];
        // The recipe check on each palette as given: a dot where it departs, the flags in its name.
        const flags = grade(paletteRamp(p, mode), mode).flags;
        const off = card.querySelector<HTMLElement>('[data-off]')!;
        off.hidden = !flags.length;
        card.title = flags.length ? `Off recipe: ${flags.join('; ')}` : '';
        card.setAttribute('aria-label', [p.name, p.like && `${p.like}-like`, flags.length && `off recipe: ${flags.join('; ')}`].filter(Boolean).join(', '));
      }
      $('[data-act="linked"]').setAttribute('aria-checked', String(linked));
      for (const el of $$('[data-shared]')) el.hidden = !linked;
      for (const el of $$('[data-own]')) el.hidden = linked;
      const put = (row: Element, v: number, lo: number, hi: number, band?: [number, number]) => {
        const r = row.querySelector<HTMLInputElement>('input[type="range"]')!;
        const n = row.querySelector<HTMLInputElement>('.num')!;
        r.min = String(lo); r.max = String(hi);
        if (band) { r.style.setProperty('--lo', pct(band[0], [lo, hi])); r.style.setProperty('--hi', pct(band[1], [lo, hi])); }
        if (Number(r.value) !== v) r.value = String(v);
        if (canvas.activeElement !== n) n.value = String(round1(v));
      };
      put($('[data-shared="h"]'), ramp.h, 0, 360);
      put($('[data-shared="s"]'), ramp.s, 0, 60);
      for (const id of SURFACE_IDS) {
        const row = $(`[data-srf="${id}"]`);
        const b = id === 'canvas' ? rc.canvas : rc[id];
        put(row, surfaceControlValue(ramp, id), ...(id === 'canvas' ? CANVAS_RANGE[mode] : OFFSET_RANGE), [b.min, b.max]);
        const hex = surfaceHex(ramp, id);
        row.querySelector<HTMLElement>('.dot')!.style.background = hex;
        const tx = row.querySelector<HTMLInputElement>('.hex')!;
        if (canvas.activeElement !== tx) tx.value = hex;
        const hs = surfaceHueSat(ramp, id);
        put($(`[data-own="${id}:h"]`), hs.h, 0, 360);
        put($(`[data-own="${id}:s"]`), hs.s, 0, 60);
      }
      const g = grade(ramp, mode);
      $('[data-offsets]').innerHTML = SURFACE_IDS.map((id) => `<span>${SURFACE_SHORT[id]} ${signed(g.offsets[id])}</span>`).join('');
      $('[data-match]').hidden = !g.matched;
      $('[data-match]').textContent = 'Same Hue and Saturation';
      $('[data-flags]').innerHTML = g.flags.map((f) => `<li>${esc(f)}</li>`).join('');
    }

    const openHere = () => feedback.filter((r) => r.status === 'open' && keyOf(r.url) === pageKey());
    function syncComments() {
      const here = openHere();
      $('[data-count]').textContent = here.length ? ` ${here.length}` : '';
      $('[data-open-list]').hidden = !here.length;
      $('[data-list]').innerHTML = here.map((r, n) => `
        <li>
          <span class="pin">${n + 1}</span>
          <div><div class="c-text">${esc(r.comment)}</div><div class="c-where">${esc(r.text || r.selector)}</div></div>
          <button type="button" class="btn" data-resolve="${esc(r.id)}">Resolve</button>
        </li>`).join('');
      $('[data-act="comment-mode"]').setAttribute('aria-checked', String(commenting));
      $('[data-composer]').hidden = !picked;
      if (picked) {
        $('[data-picked-text]').textContent = snippet(picked) || `<${picked.localName}>`;
        const src = source(picked);
        $('[data-picked-where]').textContent = src.sourceFile ? `${src.sourceFile.split('/src/').pop()}:${src.sourceLine ?? ''}` : selectorFor(picked);
      }
      placeOverlays();
    }

    function placeBox(box: HTMLElement, el: Element | null) {
      const r = el?.isConnected ? el.getBoundingClientRect() : null;
      box.hidden = !r || !r.width || !r.height || !open;
      if (r && !box.hidden) Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    }
    function placeOverlays() {
      placeBox($('[data-hover]'), commenting && hovered !== picked ? hovered : null);
      placeBox($('[data-picked]'), picked);
      const pins = $('[data-pins]');
      if (!open) { pins.innerHTML = ''; return; }
      const edge = innerWidth - (collapsed ? STRIP : WIDTH) - 24;
      pins.innerHTML = openHere().map((r, n) => {
        let el: Element | null = null;
        try { el = document.querySelector(r.selector); } catch { /* stale selector */ }
        const rect = el?.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return '';
        return `<span class="pin" style="left:${Math.min(rect.right - 11, edge)}px;top:${Math.max(rect.top - 11, 2)}px">${n + 1}</span>`;
      }).join('');
    }

    function setOpen(state: boolean) {
      open = state;
      pill.hidden = open;
      if (open) { mode = html.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light'; host.send('load', {}); }
      else setCommenting(false);
      applyLive();
      sync();
    }
    function setCollapsed(state: boolean) {
      collapsed = state;
      $('.dl').hidden = collapsed;
      $('.dl-strip').hidden = !collapsed;
      if (collapsed) setCommenting(false);
      applyLive();
      placeOverlays();
    }
    function setTab(t: 'tune' | 'comments') {
      for (const b of $$('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === t));
      for (const p of $$('[data-pane]')) p.hidden = p.dataset.pane !== t;
      $('[data-foot]').hidden = t !== 'tune';
      $('[data-mode-seg]').hidden = t !== 'tune';
      if (t !== 'comments') setCommenting(false);
    }
    function setCommenting(state: boolean) {
      commenting = state;
      hovered = null;
      if (!state) { picked = null; textarea.value = ''; }
      html.style.cursor = state ? 'crosshair' : '';
      syncComments();
    }

    // ── panel events ────────────────────────────────────────────────────
    // Control+Option+D: Option+Shift+D is taken by a global Figma shortcut on Andy's Mac.
    const isToggleKey = (e: KeyboardEvent) => e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.code === 'KeyD';
    const textarea = $<HTMLTextAreaElement>('[data-comment]');
    const commentSave = $<HTMLButtonElement>('[data-act="comment-save"]');
    // Keys typed in the panel stay in the panel: the app's own shortcuts (/, the
    // editor's) listen on document and would otherwise fire from a text field.
    for (const root of [$('.dl'), $('.dl-strip')]) {
      for (const type of ['keydown', 'keyup', 'keypress'] as const) {
        root.addEventListener(type, (e) => {
          const k = e as KeyboardEvent;
          if (type === 'keydown' && isToggleKey(k)) { k.preventDefault(); host.setOpen(!open); }
          if (type === 'keydown' && k.key === 'Escape' && picked) { picked = null; syncComments(); }
          e.stopPropagation();
        });
      }
    }
    canvas.addEventListener('click', (e) => {
      const t = (e.target as Element).closest<HTMLElement>('button');
      if (!t) return;
      // A button in a group's summary acts without toggling the group.
      if (t.closest('summary')) e.preventDefault();
      if (t.dataset.tab) setTab(t.dataset.tab as 'tune' | 'comments');
      else if (t.dataset.mode) { mode = t.dataset.mode as Mode; html.setAttribute('data-scheme', mode); sync(); }
      else if (t.dataset.palette) pickPalette(t.dataset.palette);
      else if (t.dataset.reset) {
        const [kind, id] = t.dataset.reset.split(':');
        if (kind === 'surfaces') { setRamp('light', null, null, false); setRamp('dark', null); }
        if (kind === 'color') set(mode, COLORS.find((c) => c.id === id)!.cssVar, null);
        if (kind === 'font') set('shared', FONTS.find((f) => f.id === id)!.cssVar, null);
        if (kind === 'size') {
          const s = SIZES.find((x) => x.id === id)!;
          delete tweaks.shared[s.weightVar];
          set('shared', s.cssVar, null);
        }
        if (kind === 'comp') set('shared', compOf(id).cssVar, null);
      } else if (t.dataset.resolve) host.send('set-status', { id: t.dataset.resolve, status: 'resolved' });
      else switch (t.dataset.act) {
        case 'linked': linked = !linked; sync(); break;
        case 'collapse': setCollapsed(true); break;
        case 'expand': setCollapsed(false); break;
        case 'reset-all': tweaks = emptyTweaks(); applyLive(); sync(); break;
        case 'reference': applyReference(); break;
        case 'save': host.send('save-tweaks', { json: { ...tweaks, departures: departures() }, css: buildCss(tweaks, CFG.roles) }); break;
        case 'comment-mode': setCommenting(!commenting); break;
        case 'comment-cancel': picked = null; textarea.value = ''; syncComments(); break;
        case 'comment-save': saveComment(); break;
      }
    });
    for (const c of COLORS) {
      const row = $(`[data-color="${c.id}"]`);
      row.querySelector('.swatch')!.addEventListener('input', (e) => set(mode, c.cssVar, (e.target as HTMLInputElement).value));
      const tx = row.querySelector<HTMLInputElement>('.hex')!;
      const commit = () => {
        const v = tx.value.trim().replace(/^#?/, '#').toLowerCase();
        if (/^#[0-9a-f]{6}$/.test(v)) set(mode, c.cssVar, v); else tx.value = colorValue(c.id, mode);
      };
      tx.addEventListener('change', commit);
      tx.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    }
    for (const f of FONTS) {
      $(`[data-font="${f.id}"] select`).addEventListener('change', (e) => {
        const opt = FONT_OPTIONS.find((o) => o.id === (e.target as HTMLSelectElement).value)!;
        const isDefault = firstFamily(opt.css) === firstFamily(readBase(mode).fonts[f.id]);
        // A row set in this face keeps its weight if the new face's axis has it, else the nearest it does.
        const axis = axisOf(opt);
        for (const s of SIZES.filter((x) => x.font === f.id)) {
          const w = weightValue(s.id);
          const fit = fitWeight(axis, w);
          if (fit !== w) tweaks.shared[s.weightVar] = String(fit === BANNED_WEIGHT ? 400 : fit);
        }
        set('shared', f.cssVar, isDefault ? null : opt.css);
      });
    }
    // Surfaces: the shared hue and saturation (Move Together), each surface's
    // lightness, and with Move Together off, a surface's own hue and saturation.
    const onValue = (row: Element, fn: (v: number) => void) => {
      const go = (raw: string) => { const n = Number.parseFloat(raw); if (Number.isFinite(n)) fn(n); };
      row.querySelector('input[type="range"]')!.addEventListener('input', (e) => go((e.target as HTMLInputElement).value));
      row.querySelector('.num')!.addEventListener('change', (e) => go((e.target as HTMLInputElement).value));
    };
    onValue($('[data-shared="h"]'), (v) => editRamp((r) => { r.h = v; delete r.own; }));
    onValue($('[data-shared="s"]'), (v) => editRamp((r) => { r.s = v; delete r.own; }));
    for (const id of SURFACE_IDS) {
      const row = $(`[data-srf="${id}"]`);
      onValue(row, (v) => editRamp((r) => setSurfaceL(r, id, v)));
      for (const key of ['h', 's'] as const) {
        onValue($(`[data-own="${id}:${key}"]`), (v) => editRamp((r) => {
          (r.own ??= {})[id] = { ...surfaceHueSat(r, id), [key]: v };
        }));
      }
      const tx = row.querySelector<HTMLInputElement>('.hex')!;
      const commit = () => {
        const v = tx.value.trim().replace(/^#?/, '#').toLowerCase();
        if (!/^#[0-9a-f]{6}$/.test(v)) { tx.value = surfaceHex(rampOf(mode), id); return; }
        const hsl = hexToHsl(v);
        editRamp((r) => {
          // Move Together: the hex sets the shared hue and saturation. Alone: this surface's own.
          if (linked) { r.h = hsl.h; r.s = hsl.s; delete r.own; } else (r.own ??= {})[id] = { h: hsl.h, s: hsl.s };
          setSurfaceL(r, id, id === 'canvas' ? hsl.l : hsl.l - r.l);
        });
      };
      tx.addEventListener('change', commit);
      tx.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    }
    // Which groups are closed, per viewer.
    let closed: string[] = [];
    try { closed = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '[]'); } catch { /* storage blocked */ }
    for (const d of $$<HTMLDetailsElement>('details[data-group]')) {
      d.open = !closed.includes(d.dataset.group!);
      d.addEventListener('toggle', () => {
        const ids = $$<HTMLDetailsElement>('details[data-group]').filter((x) => !x.open).map((x) => x.dataset.group!);
        try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(ids)); } catch { /* storage blocked */ }
      });
    }
    for (const s of SIZES) {
      const row = $(`[data-size="${s.id}"]`);
      const write = (raw: string) => {
        const n = Number.parseFloat(raw);
        if (!Number.isFinite(n)) return;
        const v = Math.min(s.max, Math.max(s.min, Math.round(n * 2) / 2));
        set('shared', s.cssVar, v === baseSize(s.id) ? null : `${v}px`);
      };
      row.querySelector('input[type="range"][data-k="size"]')!.addEventListener('input', (e) => write((e.target as HTMLInputElement).value));
      row.querySelector('.num[data-k="size"]')!.addEventListener('change', (e) => write((e.target as HTMLInputElement).value));
      // Weight: the slider steps over 350 (the value holds); the field turns 350 into 400.
      const wRange = row.querySelector<HTMLInputElement>('input[type="range"][data-k="weight"]')!;
      const wNum = row.querySelector<HTMLInputElement>('.num[data-k="weight"]')!;
      wRange.addEventListener('input', () => {
        const w = fitWeight(axisOf(fontOption(s.font)), Number(wRange.value));
        if (w === BANNED_WEIGHT) { wRange.value = String(weightValue(s.id)); return; }
        setWeight(s, w);
      });
      wNum.addEventListener('change', () => {
        const n = Number.parseFloat(wNum.value);
        if (!Number.isFinite(n)) { wNum.value = String(weightValue(s.id)); return; }
        const fit = fitWeight(axisOf(fontOption(s.font)), n);
        const w = fit === BANNED_WEIGHT ? 400 : fit;
        setWeight(s, w);
        wNum.value = String(w);
      });
    }
    for (const c of COMPONENTS) {
      onValue($(`[data-comp="${c.id}"]`), (n) => {
        const v = Math.min(c.max, Math.max(c.min, Math.round(n / c.step) * c.step));
        set('shared', c.cssVar, v === baseComp(c.id) ? null : `${v}px`);
      });
    }
    textarea.addEventListener('input', () => { commentSave.disabled = !textarea.value.trim(); });
    textarea.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveComment(); } });

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
    // A face declared or loaded (a font picked, the saved sheet's @import) re-ranges the weight sliders.
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
      button { position: fixed; right: 16px; bottom: 16px; z-index: 2000000000; font: 500 13px/1 system-ui, sans-serif;
        color: #ededed; background: #1c1c1c; border: 1px solid #3a3a3a; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
      button:hover { background: #262626; }
      button:focus-visible { outline: 2px solid #5d8bff; outline-offset: 2px; }
      button[hidden] { display: none; }
    </style><button type="button" title="Design (Control+Option+D)">Design</button>`;
    const pill = pillRoot.querySelector('button') as HTMLButtonElement;
    pill.addEventListener('click', () => host.setOpen(true));
    document.body.append(pillHost);
    host.onToggled((state) => setOpen(state));
    host.send('load', {});
  }
  return { allowClose: () => performance.now() - escapeAt > 150 };
}
