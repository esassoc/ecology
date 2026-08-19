import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';
import { announce } from '../announcer.js';

/**
 * esa-chart — an accessibility-corrected wrapper over AG Charts Community.
 *
 * WHY A WRAPPER. AG Charts was scored against the five-question charting-library
 * rubric in a real browser (Community 14.1.0). It passes the two questions that are
 * hardest to retrofit and fails three that are cheap for US to fix once, here, so no
 * spoke re-derives them:
 *
 *   Q1 canvas or SVG?      canvas + a synchronized proxy DOM (~32 real elements).
 *   Q2 role + name?        PASS, unprompted: role="figure", but the generated name is
 *                          the generic "chart, N series" — see `label` below.
 *   Q3 text alternative?   FAIL. Zero <table>, <figcaption>, offscreen text. Ship the
 *                          paired grid; see "THE TABLE ALTERNATIVE" below.
 *   Q4 keyboard to data?   PASS. Arrows walk data, Home/End jump, no focus trap.
 *   Q5 reduced motion?     FAIL. `prefers-reduced-motion` appears ZERO times in the
 *                          2.8MB bundle; all four matchMedia calls are (resolution:
 *                          Xdppx) for HiDPI scaling. It cannot honour the setting —
 *                          so this component asks on its behalf.
 *
 * Three more found while probing, none of them in the rubric:
 *   - legend items measure 16px tall, under the 24px target floor (SC 2.5.8);
 *   - forced-colors cannot touch a canvas at all — it is a bitmap;
 *   - series are told apart by colour alone (SC 1.4.1, Level A).
 *
 * SHADOW DOM IS FINE, and that was measured rather than assumed. The worry was that
 * the library injects its stylesheet into `document.head`, where it could not reach
 * inside a shadow root — it does not: it injects into the shadow root TOO. Verified
 * identical computed styles for `.ag-charts-wrapper` and `.ag-charts-proxy-elem`
 * light vs shadow, canvas + proxy DOM present in both, focus entering the shadow
 * chart with its accessible name intact, and zero page errors. So this stays on the
 * kit's normal convention and does NOT need `createRenderRoot`.
 *
 * WHY THE JS THEME BRIDGE. The wrapper carries ~60 `--ag-charts-*` custom properties
 * and the library's own CSS consumes 49 of them — but those style the DOM CHROME
 * only. Measured: overriding them with `!important` changed `getComputedStyle`
 * (`--ag-charts-background-color` → `#101820`) while the canvas still painted
 * `rgba(255,255,255,255)`. A canvas is a bitmap; no custom property, no `@media`
 * block and no assurance profile reaches into it. So every mark colour is resolved
 * in JS with `getComputedStyle(this)` and handed over as a literal — and re-resolved
 * whenever the theme moves, because a canvas does not recompute on a cascade change.
 *
 * THE TABLE ALTERNATIVE IS NOT OPTIONAL AND IS NOT IN THIS FILE. A chart ships with
 * its data as a grid:
 *
 *   <esa-chart label="Rainfall by month" .data=${rows} .series=${series}></esa-chart>
 *   <esa-collapsible summary="View as data">
 *     <esa-grid .columnDefs=${cols} .rowData=${rows}></esa-grid>
 *   </esa-collapsible>
 *
 * That is deliberately a composition rather than a prop: `esa-grid` already solves
 * tabular semantics, and a sighted keyboard user gets a real affordance instead of
 * an offscreen table only a screen reader can find.
 *
 * DEPENDENCY. `ag-charts-community` is an OPTIONAL peer dependency, imported
 * dynamically on first render, so a spoke that never charts never pays the ~2.8MB
 * and `@esa/ecology`'s hard dependency list stays at `lit` alone.
 */

/** Options object handed to AG Charts. Kept loose — the library owns this shape. */
type ChartOptions = Record<string, unknown>;
type ColorScale = 'categorical' | 'sequential' | 'diverging';

/** The slice of AG Charts' instance API this component uses. */
interface ChartInstance {
  update(options: ChartOptions): void;
  destroy(): void;
}

/** The slice of the library's entry point this component uses. */
interface AgChartsModule {
  AgCharts: { create(options: ChartOptions): ChartInstance };
  ModuleRegistry: { registerModules(definitions: unknown[]): void };
  AllCommunityModule: unknown;
}

/**
 * AG Charts v14 ships an empty MODULE REGISTRY and throws "No modules have been
 * registered" from `create()` until you fill it. The UMD build registers everything
 * on load, which is a genuine trap: probe the library through its UMD bundle — as the
 * accessibility scoring for this component did — and charts render, so the ESM path
 * looks equally fine right up until it throws at runtime in a real build.
 *
 * `AllCommunityModule` is every community module. A wrapper cannot know which series
 * types its callers will ask for, so narrowing this would trade a size win for a
 * runtime error on the first unregistered `type`. A spoke drawing only one kind of
 * chart can register a narrower bundle (`AllCartesianModule`, `AllPolarModule`) by
 * calling `registerModules` itself before the first chart mounts — registration is
 * global and additive, and this guard makes a second call harmless.
 */
let modulesRegistered = false;

/**
 * The library's own proxy-DOM root — the element carrying `role="figure"` and the
 * generated accessible name. Reaching for it by class is reaching into someone
 * else's internals; `scripts/check-chart-a11y.mjs` asserts the name actually landed,
 * so an upgrade that renames this fails loudly instead of quietly restoring
 * "chart, N series".
 */
const PROXY_ROOT = '.ag-charts-canvas-proxy';

/**
 * How many slots each tier-2 dataviz family declares. MUST match `DATAVIZ_LENGTHS`
 * in `scripts/lib/dataviz.mjs`, which is what actually generates them.
 *
 * A mismatch fails SILENTLY and in the worst direction: the resolver below requires
 * all `n` slots to resolve before it trusts the family, so asking for 9 when 7 exist
 * means the magnitude scales never resolve at all and quietly fall back to the
 * CATEGORICAL ramp — a heatmap painted in eight unrelated hues, with a console warning
 * that says the tokens are missing when they are in fact present.
 */
const SCALE_LENGTH: Record<ColorScale, number> = {
  categorical: 8,
  sequential: 7,
  diverging: 7,
};

/**
 * LAST RESORT, not a placeholder. The tier-2 `--color-background-dataviz-*` family
 * shipped 2026-08-17, so on any page that loads `@esa/tokens` this never fires — the
 * console warning below is how you find out it did, which would mean the stylesheet is
 * missing rather than that the palette is unfinished.
 *
 * Validated, not eyeballed: run through the dataviz skill's `validate_palette.js`
 * against THIS system's own surfaces (`#fcfcfc` light / `#191919` dark), not the
 * reference surfaces it ships with. Both modes pass the lightness band, chroma
 * floor, adjacent-pair CVD separation (worst ΔE 9.1 light / 8.4 dark, ≥8 target)
 * and the normal-vision floor (19.6 / 19.3, ≥15).
 *
 * ONE STANDING CAVEAT, and it is why `viewAsData` is not a suggestion: in LIGHT
 * mode three slots sit under 3:1 against the surface — aqua 2.74, yellow 2.11,
 * magenta 2.62. The validator calls that a WARN with "relief required (visible
 * labels or table view)". The paired grid IS that relief. Drop the grid and this
 * palette stops being legal, not merely unfriendly.
 */
const FALLBACK_CATEGORICAL: Record<'light' | 'dark', readonly string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/**
 * Marker shapes rotate with the series so identity survives without hue — SC 1.4.1,
 * Level A. Applies to line/scatter/area, which are the forms that HAVE markers; bars
 * cannot carry a pattern in Community, so for those the answer is the paired grid or
 * direct labels, and the doc page says so.
 */
const MARKER_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'plus'] as const;

/**
 * Series that draw markers ALONGSIDE a line or fill, and so take a NESTED `marker`.
 *
 * Scatter and bubble are deliberately not here even though they are nothing but
 * markers: they ARE the marker, so their shape and size sit at the series level and a
 * nested `marker` is rejected — `Unknown option series[0].marker, ignoring`. Passing
 * it cost nothing visible (the fill still applied) and logged a warning on every
 * scatter chart the kit would ever draw.
 */
const MARKER_SERIES = new Set(['line', 'area']);

/** Series that ARE a marker — shape and size go on the series itself. */
const POINT_SERIES = new Set(['scatter', 'bubble']);

/*
 * Which series types accept which colour options. Setting the wrong one is not a
 * silent no-op — AG Charts logs `Unknown option series[N].fill, ignoring`, which is
 * easy to miss in a console and leaves the series drawn in a default colour that has
 * nothing to do with the palette. A line has a stroke and no fill.
 */
const FILL_SERIES = new Set(['bar', 'area', 'scatter', 'bubble', 'histogram']);
const STROKE_SERIES = new Set(['line', 'area', 'scatter', 'bubble']);

/**
 * The two series that are ONE series wearing MANY colours.
 *
 * Every other type maps one series to one colour, so slot N of the palette is series
 * N. A pie or donut is a single series whose SLICES each need their own, and AG Charts
 * spells that `fills` (plural, an array) — handing it `fill` is rejected outright:
 * `Unknown option series[0].fill; Did you mean 'fills'?`. It then falls back to its
 * OWN stock palette, so a pie rendered in `#34bfe1 #ffa03a #459d55 …` — six colours
 * from the library, none of them ours, on a page whose whole point is the tokens.
 *
 * That failure is quiet in the worst way: the chart looks finished, the colours look
 * deliberate, and only a pixel check against the token values catches it.
 */
const SLICE_SERIES = new Set(['pie', 'donut']);

export class EsaChart extends LitElement {
  static properties = {
    label: { type: String },
    data: { type: Array },
    series: { type: Array },
    options: { type: Object },
    colorScale: { type: String, attribute: 'color-scale', reflect: true },
    describedBy: { type: String, attribute: 'described-by' },
    height: { type: String, reflect: true },
  };

  /**
   * REQUIRED. The chart's accessible name.
   *
   * Without it AG Charts generates "chart, 2 series" — which announces the SHAPE of
   * the thing and nothing about what it shows. That is a name, so axe stays green and
   * nothing fails; it is just useless. Absent, this warns at runtime rather than
   * shipping the generic string silently.
   */
  declare label: string;
  /** Row objects. Passed to AG Charts untouched. */
  declare data: unknown[];
  /** Series definitions. Passed to AG Charts, with marker shapes layered in. */
  declare series: Array<Record<string, unknown>>;
  /** Escape hatch merged over everything this component computes. */
  declare options: ChartOptions;
  /** Which tier-2 dataviz family to read. */
  declare colorScale: ColorScale;
  /**
   * IDREF of prose describing the chart's takeaway, resolved in the LIGHT DOM.
   *
   * Not a plain `aria-describedby` inside the shadow root, because an IDREF never
   * crosses a shadow boundary in any engine — it would silently reference nothing.
   * This is applied with ELEMENT REFLECTION (`ariaDescribedByElements`), which is
   * the one cross-root association that does work, and works OUTWARD (a shadow-DOM
   * element referencing a light-DOM one) in all three engines.
   */
  declare describedBy: string | undefined;
  declare height: string;

  private chart: ChartInstance | null = null;
  /** Bumped on every disconnect, so an import still in flight knows it is stale. */
  private mountGeneration = 0;
  private themeObserver: MutationObserver | null = null;
  private nameObserver: MutationObserver | null = null;
  private overlayObserver: MutationObserver | null = null;
  private motionQuery: MediaQueryList | null = null;
  private forcedQuery: MediaQueryList | null = null;
  private warnedFallback = false;

  constructor() {
    super();
    this.label = '';
    this.data = [];
    this.series = [];
    this.options = {};
    this.colorScale = 'categorical';
    this.height = '320px';
  }

  connectedCallback(): void {
    super.connectedCallback();

    // A canvas does not recompute when the cascade changes. Grids re-theme for free
    // because they are DOM; this is the charting equivalent, and without it a theme
    // switch leaves the chart painted in the OLD brand with no error anywhere.
    this.themeObserver = new MutationObserver(() => this.rerender());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-scheme', 'data-assurance'],
    });

    // The library never asks for either of these, so we ask and re-ask: a preference
    // toggled mid-session has to land without a reload.
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.forcedQuery = window.matchMedia('(forced-colors: active)');
    this.motionQuery.addEventListener('change', this.rerender);
    this.forcedQuery.addEventListener('change', this.rerender);

    /*
     * REBUILD AFTER A RECONNECT. firstUpdated() runs ONCE per element in Lit, and
     * disconnectedCallback() destroys the chart — so before this, any re-parenting
     * left a permanently blank .canvas: moving a chart into a dialog, a tab panel
     * that re-appends its content, a list re-order, an Astro view transition. It
     * failed silently, because connectedCallback re-armed the observers and
     * rerender() returns on `if (!this.chart) return`, so nothing threw and nothing
     * warned. Guarded on hasUpdated so this does not race the FIRST render, which
     * firstUpdated still owns.
     */
    if (this.hasUpdated && !this.chart) void this.createChart();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Any createChart() awaiting its dynamic import is now stale; see the guard there.
    this.mountGeneration += 1;
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.nameObserver?.disconnect();
    this.nameObserver = null;
    this.overlayObserver?.disconnect();
    this.overlayObserver = null;
    this.motionQuery?.removeEventListener('change', this.rerender);
    this.forcedQuery?.removeEventListener('change', this.rerender);
    this.chart?.destroy();
    this.chart = null;
  }

  private rerender = (): void => {
    if (!this.chart) return;
    this.chart.update(this.buildOptions(this.mount));
    // The proxy DOM is rebuilt on update, taking the name with it.
    this.applyAria();
  };

  /**
   * Replace the library's generated accessible name, and wire the description.
   *
   * AG Charts names the chart "chart, N series" with no option to change it — there
   * is no top-level `ariaLabel` in its options (only on buttons), and `title.text`
   * does not feed it: measured, a titled chart still announced the generic string.
   * So the name is written onto its proxy root directly.
   *
   * ONE-SHOT DOES NOT WORK, and this is the part that is easy to get wrong. `create()`
   * returns before the proxy DOM is built, and the library REWRITES the name on every
   * subsequent render — so a name set once is silently reverted the first time the
   * chart resizes or re-themes. `nameObserver` (below) re-applies it; this method is
   * idempotent and only touches the attribute when it is actually wrong, so the
   * observer it triggers settles immediately instead of looping.
   */
  private applyAria(): void {
    const proxy = this.renderRoot.querySelector(PROXY_ROOT);
    if (!proxy) return;
    if (this.label && proxy.getAttribute('aria-label') !== this.label) {
      proxy.setAttribute('aria-label', this.label);
    }

    this.adoptLibraryOverlay();

    if (!this.describedBy) return;
    // Resolve in the light DOM: this component's own root node is where the author's
    // prose lives, and `document` is the fallback when nested in another shadow root.
    const root = this.getRootNode() as Document | ShadowRoot;
    const target = root.getElementById?.(this.describedBy) ?? document.getElementById(this.describedBy);
    if (!target) return;
    if ('ariaDescribedByElements' in proxy) {
      (proxy as Element & { ariaDescribedByElements: Element[] }).ariaDescribedByElements = [target];
    }
  }

  private get mount(): HTMLElement {
    return this.renderRoot.querySelector('.canvas') as HTMLElement;
  }

  /** Read a custom property off the host. Empty string when undeclared. */
  private token(name: string): string {
    return getComputedStyle(this).getPropertyValue(name).trim();
  }

  /**
   * Normalise ANY CSS colour to an sRGB hex string AG Charts will accept.
   *
   * EVERY COLOUR CROSSING THIS BOUNDARY GOES THROUGH HERE, and skipping it broke
   * Safari completely. AG Charts ships its own colour parser that understands a
   * narrow set of notations, and a browser is free to serialise a computed colour in
   * any equivalent form. On a wide-gamut display **Safari returns
   * `color(display-p3 0.125 0.125 0.125)`** where Chrome and Firefox return
   * `rgb(32, 32, 32)` — the parser throws `Invalid color string`, `create()` never
   * completes, and the chart is an empty box in Safari while looking perfect
   * everywhere else. Nothing in the build catches that; it is a runtime failure on
   * one engine, on one class of monitor.
   *
   * A canvas 2D context is the browser's own parser, and it answers in sRGB hex.
   * That also makes `color-mix()`, `oklch()`, named colours and the forced-colors
   * system keywords all safe by construction rather than one fix at a time — and it
   * matches this system's "emit hex only" rule for auditable colour.
   */
  private normalizeColor(value: string | undefined, fallback: string): string {
    const raw = (value ?? '').trim();
    if (!raw) return fallback;
    const ctx = (EsaChart.colorCtx ??= document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true }));
    if (!ctx) return raw;

    // Validity first: an unparseable value leaves fillStyle at whatever it was, so
    // probe from two different sentinels and require agreement.
    ctx.fillStyle = '#000000';
    const fromBlack = ((ctx.fillStyle = raw), String(ctx.fillStyle));
    ctx.fillStyle = '#ffffff';
    const fromWhite = ((ctx.fillStyle = raw), String(ctx.fillStyle));
    if (fromBlack !== fromWhite) return fallback;

    /*
     * PAINT IT, do not just re-serialise it. Reading `fillStyle` back is not a
     * conversion — WebKit happily accepts `color(display-p3 …)` and returns the same
     * string, so a round-trip "normalisation" is a no-op on the one engine that
     * needed it. A 2d context is `colorSpace: 'srgb'` by default, so rasterising one
     * pixel and reading it back is what actually forces the gamut conversion.
     */
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return a === 255 ? `#${hex(r)}${hex(g)}${hex(b)}` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  }

  private static colorCtx: CanvasRenderingContext2D | null = null;

  /**
   * Resolve a CSS system colour keyword to a concrete `rgb()` the library can parse.
   *
   * AG CHARTS DOES NOT ACCEPT SYSTEM KEYWORDS. Handing it `CanvasText` throws
   * "Invalid color string: 'CanvasText'" out of its own colour parser, `create()`
   * never completes, and the chart renders as an EMPTY BOX — which is how a
   * forced-colors "fix" ends up strictly worse than doing nothing. Nothing catches
   * this either: axe has no forced-colors rule at all, so the page audits clean while
   * being blank for exactly the users the mode exists to serve.
   *
   * The browser will do the resolution for us, though: a keyword assigned to a real
   * element comes back from `getComputedStyle` already resolved to the user's actual
   * chosen colour.
   */
  private systemColor(keyword: string, fallback: string): string {
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;width:0;height:0;opacity:0;color:${keyword}`;
    this.renderRoot.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return this.normalizeColor(resolved, fallback);
  }

  private get scheme(): 'light' | 'dark' {
    return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
  }

  /**
   * The tier-2 dataviz family, or the temporary fallback.
   *
   * The fallback WARNS rather than working silently. A `var(--x, <fallback>)` that
   * always resolves is exactly how a token's absence becomes invisible — the same
   * failure mode as the "fourth tier" this repo shipped for two months. If the
   * palette is coming from a token, its absence has to be observable.
   */
  private palette(): string[] {
    const n = SCALE_LENGTH[this.colorScale];
    const fallback = FALLBACK_CATEGORICAL[this.scheme];
    const read: string[] = [];
    for (let i = 1; i <= n; i++) {
      const v = this.token(`--color-background-dataviz-${this.colorScale}-${i}`);
      // Normalised on the way in: a theme is free to declare these as color-mix(),
      // oklch() or anything else CSS understands, and the library understands none
      // of it. See normalizeColor.
      if (v) read.push(this.normalizeColor(v, fallback[read.length % fallback.length]));
    }
    if (read.length === n) return read;

    if (!this.warnedFallback) {
      this.warnedFallback = true;
      console.warn(
        `[esa-chart] --color-background-dataviz-${this.colorScale}-1..${n} resolved ${read.length}/${n}; ` +
          `using the temporary built-in ramp. Charts will not follow this theme's brand until ` +
          `the tier-2 dataviz family is declared.`,
      );
    }
    // Only categorical has a validated stand-in; magnitude scales are not guessable.
    return [...FALLBACK_CATEGORICAL[this.scheme]];
  }

  /**
   * Series with a marker shape layered in, so identity is not carried by hue alone.
   * An explicit `marker` on the caller's series always wins.
   */
  private decorateSeries(colors: string[]): Array<Record<string, unknown>> {
    return this.series.map((s, i) => {
      const color = colors[i % colors.length];
      const type = String(s.type ?? 'line');
      const base: Record<string, unknown> = { ...s };
      if (SLICE_SERIES.has(type)) {
        // The whole palette, in order — one colour per slice, not per series.
        base.fills = s.fills ?? [...colors];
      } else {
        if (FILL_SERIES.has(type)) base.fill = s.fill ?? color;
        if (STROKE_SERIES.has(type)) base.stroke = s.stroke ?? color;
      }
      // 8px is the dataviz floor for a hittable, readable marker.
      const shape = MARKER_SHAPES[i % MARKER_SHAPES.length];
      if (MARKER_SERIES.has(type) && s.marker === undefined) {
        base.marker = { enabled: true, shape, size: 8 };
      } else if (POINT_SERIES.has(type) && s.shape === undefined) {
        base.shape = shape;
        /*
         * SIZE ONLY FOR SCATTER. A bubble's radius encodes a third variable, so it is
         * derived from `sizeKey` and bounded by `minSize`/`maxSize` — passing `size`
         * is rejected outright. Setting a fixed size on a bubble would be meaningless
         * even if it were accepted: it is the dimension carrying the data.
         */
        if (type === 'scatter' && s.size === undefined) base.size = 8;

        /*
         * OPACITY VOIDS THE CONTRAST GUARANTEE, so a point series paints solid.
         *
         * AG Charts defaults scatter and bubble to a translucent fill — sensible for
         * overplotting, and quietly fatal here. Measured on the hub's own surface:
         * the palette colour `#3e9b4f` clears the SC 1.4.11 bar at 3.41:1, and what
         * actually reached the canvas was `#64ae71` — the same colour blended with the
         * surface — at 2.61:1. BELOW the bar.
         *
         * Nothing upstream can see that: `check-contrast.mjs` grades the TOKEN, the
         * derivation searched on the TOKEN, and both are correct. The opacity is
         * applied at paint time, downstream of every check. A caller who wants
         * translucency for dense scatter can still pass `fillOpacity` explicitly and
         * owns the trade-off.
         */
        if (s.fillOpacity === undefined) base.fillOpacity = 1;
      }
      return base;
    });
  }

  /**
   * Take AG Charts' own live region out of service and route its text through the
   * kit's announcer instead.
   *
   * The library mounts `<div role="status" aria-live="polite" aria-hidden="true">` for
   * its overlay messages ("No data to display"). That is a THIRD live region on the
   * page, inside a shadow root — both things the kit's status-message contract rules
   * out, and `npm run a11y:live` flags it. The objection is not pedantic: regions
   * interfere with each other, and observation across a shadow boundary is the least
   * reliable case there is (worst in Safari/VoiceOver).
   *
   * So the region is demoted to a plain element and its text is mirrored to
   * `announce()`, which owns the page's only two regions and lives in the light DOM.
   * Nothing is lost — the message still reaches a screen reader, by the one route the
   * kit guarantees.
   */
  private adoptLibraryOverlay(): void {
    const overlay = this.renderRoot.querySelector('.ag-charts-overlay');
    if (!overlay || overlay.getAttribute('data-esa-adopted') === 'true') return;

    overlay.removeAttribute('role');
    overlay.removeAttribute('aria-live');
    overlay.removeAttribute('aria-atomic');
    overlay.setAttribute('data-esa-adopted', 'true');

    let last = '';
    const mirror = new MutationObserver(() => {
      const text = (overlay.textContent ?? '').trim();
      // Only a CHANGE is worth announcing, and only when the library is actually
      // showing the overlay rather than parking it hidden.
      if (text && text !== last && overlay.getAttribute('aria-hidden') !== 'true') {
        last = text;
        announce(text);
      } else if (!text) {
        last = '';
      }
    });
    mirror.observe(overlay, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-hidden'] });
    // The guard above is per-ELEMENT, so a wholesale replacement of the overlay lands
    // here again with a fresh node. Drop the observer watching the detached one.
    this.overlayObserver?.disconnect();
    this.overlayObserver = mirror;
  }

  private buildOptions(container: HTMLElement): ChartOptions {
    const forced = this.forcedQuery?.matches ?? false;
    const reduced = this.motionQuery?.matches ?? false;
    const colors = this.palette();

    /*
     * FORCED COLORS. The one and only route into a canvas is to re-theme it in JS
     * with the system keywords, because the mode operates at the used-value layer,
     * downstream of every token, and a bitmap has no used values to adjust. This
     * DISCARDS the dataviz palette on purpose: the user picked those colours, and
     * overriding them would itself be SC 1.4.8. Marks stay apart by SHAPE here,
     * which is why the rotation above is not decoration.
     */
    const ink = forced
      ? this.systemColor('CanvasText', '#000000')
      : this.normalizeColor(this.token('--color-content-default'), '#181d1f');
    const subtle = forced
      ? this.systemColor('GrayText', '#555555')
      : this.normalizeColor(this.token('--color-content-default-secondary'), '#707374');
    const surface = forced
      ? this.systemColor('Canvas', '#ffffff')
      : this.normalizeColor(this.token('--color-background-elevation-raised'), '#ffffff');
    const gridline = forced
      ? this.systemColor('GrayText', '#555555')
      : this.normalizeColor(this.token('--color-border-default-subtle'), '#e8e9e9');
    /*
     * One ink colour for every series in forced colors, on purpose. The mode exists
     * to collapse the palette to the user's chosen pair; painting eight hues would
     * defeat it. Series stay apart by SHAPE — which is why the marker rotation above
     * is load-bearing rather than decorative — and by the paired data grid.
     */
    const seriesColors = forced ? [ink] : colors;

    const computed: ChartOptions = {
      container,
      data: this.data,
      series: this.decorateSeries(seriesColors),

      background: { fill: surface },

      theme: {
        params: {
          foregroundColor: ink,
          backgroundColor: surface,
          textColor: ink,
          subtleTextColor: subtle,
          gridLineColor: gridline,
          axisLineColor: gridline,
          fontFamily: this.token('--typography-font-family-sans') || 'system-ui, sans-serif',
        },
      },

      /*
       * LEGEND TARGET SIZE — REPORTED, NOT PATCHED, and the first two attempts here
       * were both wrong in instructive ways.
       *
       * Measured: a legend item's `role="listitem"` box renders 16px tall, under the
       * 24px raw floor. The obvious fix, `item.paddingY`, IS NOT AN OPTION — AG Charts
       * accepted it and silently ignored it, so the config read as a fix and did
       * nothing. `item.padding` is real but sets spacing BETWEEN items, not the item's
       * own height. The only lever that moves the box is `item.marker.size`, and it
       * moves it 1:1 — 24px markers for a 24px box.
       *
       * We do not set it. axe reports ZERO target-size violations on a chart page:
       * SC 2.5.8's spacing exception passes an undersized target whose 24px circle
       * clears its neighbours', and the default legend spacing earns it. Forcing 24px
       * markers would trade a real conformance pass for chunky chrome — the same
       * "quietly make the existing one bigger" move this system has already tried and
       * withdrawn twice.
       *
       * THE EXCEPTION IS LAYOUT-DEPENDENT, though, and that is the part to remember: a
       * legend packed tight enough loses it. If `npm run a11y` ever reports target-size
       * on a chart, the lever is `options.legend.item.marker.size`.
       */
      legend: { enabled: this.series.length > 1 },
    };

    /*
     * Q5's fix, and note it only ever asserts OFF.
     *
     * `AnimationModule` ships in ag-charts-ENTERPRISE, so Community cannot animate at
     * all — measured: no entrance animation, and a data update snaps in one frame even
     * with `animation: {enabled: true, duration: 1000}`. Asking for animation anyway
     * just makes the library log a "register AnimationModule from ag-charts-enterprise"
     * notice on every Community chart, so we never ask.
     *
     * Saying `enabled: false` when the user asked for reduced motion still matters: it
     * is the difference between a wrapper that happens to be still because the library
     * is limited, and one that will STAY still the day someone registers the Enterprise
     * animation module. The preference is honoured by us, not by the tier we happen to
     * be on.
     */
    if (reduced) computed.animation = { enabled: false };

    // The caller's escape hatch wins over everything computed above.
    return { ...computed, ...this.options };
  }

  protected firstUpdated(): void {
    void this.createChart();
  }

  /**
   * Build the chart. Called by firstUpdated() and again by connectedCallback() after
   * a reconnect — NOT once per element, which is what firstUpdated alone guaranteed.
   */
  private async createChart(): Promise<void> {
    const generation = this.mountGeneration;
    if (!this.label) {
      console.warn(
        '[esa-chart] no `label`. AG Charts will fall back to a generated name like ' +
          '"chart, 2 series", which names the shape of the thing rather than what it shows.',
      );
    }

    let mod: AgChartsModule;
    try {
      // A literal specifier on purpose: the bundler must be able to see and resolve
      // this. A variable specifier would silence the "optional peer is missing" type
      // error but leave a bare specifier in the browser, which cannot be resolved.
      mod = (await import('ag-charts-community')) as unknown as AgChartsModule;
    } catch (e) {
      /*
       * NAME BOTH CAUSES, because the likelier one is not the obvious one.
       *
       * A failed dynamic import looks identical whether the package is absent or the
       * DEV SERVER cannot serve it. The second is far more common and much more
       * confusing: Vite pre-bundles dependencies at startup, so a dev server that was
       * running when `ag-charts-community` was installed never optimised it and answers
       * `504 (Outdated Optimize Dep)` forever. The chart renders as an empty box, the
       * production build is perfectly fine, and the honest-looking "not installed"
       * message sends you to reinstall a package that is already there.
       */
      console.error(
        '[esa-chart] could not load `ag-charts-community`, so the chart is an empty box.\n' +
          '  1. If the dev server was running when it was installed, RESTART IT — Vite\n' +
          '     pre-bundles deps at startup and answers 504 (Outdated Optimize Dep)\n' +
          '     for anything added since. Check the network tab before reinstalling.\n' +
          '  2. Otherwise it is genuinely missing: `npm install ag-charts-community`\n' +
          '     (an optional peer dependency).',
        e,
      );
      return;
    }

    /*
     * The element can be disconnected while `await import(...)` is in flight. Assigning
     * this.chart now would hand an instance to a component disconnectedCallback has
     * already swept, leaking it with nothing left holding a reference to destroy it —
     * and the reconnect path above would then see a non-null chart and skip the rebuild.
     */
    if (generation !== this.mountGeneration || !this.isConnected) return;

    if (!modulesRegistered) {
      mod.ModuleRegistry.registerModules([mod.AllCommunityModule]);
      modulesRegistered = true;
    }

    this.chart = mod.AgCharts.create(this.buildOptions(this.mount));

    /*
     * Hold the name against the library, which rebuilds its proxy DOM — and with it
     * the generated "chart, N series" — on every render. Watching the subtree covers
     * both cases: the proxy being replaced wholesale, and its aria-label being
     * rewritten in place.
     */
    this.nameObserver = new MutationObserver(() => this.applyAria());
    this.nameObserver.observe(this.renderRoot as unknown as Node, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
    this.applyAria();

    /*
     * The ONLY announcement this component makes, and it is deliberately about async
     * arrival rather than about the data. AG Charts already re-labels the focused
     * datum through a two-element swapchain (alternating `aria-labelledby` targets so
     * a repeated string still counts as a change) — that surfaces without any live
     * region, so adding one would be the fourth-choice answer to a solved problem.
     * The kit's announcer owns the page's only two regions; this component declares
     * no `aria-live` of its own.
     */
    if (this.data.length) announce(`${this.label || 'Chart'} loaded.`);
  }

  /**
   * Which props feed the chart's options, and so require a re-render.
   *
   * `colorScale` BELONGS HERE and was missing until 2026-08-17, which made the prop
   * completely inert: setting it to `sequential` resolved the right seven tokens and
   * then painted the categorical ramp anyway, because nothing asked the chart to
   * redraw. A prop that reads as working — no error, no warning, correct tokens
   * resolved — and changes nothing is the worst kind to ship, so the list is spelled
   * out rather than left as a chain of `||`.
   */
  private static readonly RENDER_PROPS = ['data', 'series', 'options', 'colorScale'];

  /** Props that only change how the chart is ANNOUNCED, not how it is drawn. */
  private static readonly ARIA_PROPS = ['label', 'describedBy'];

  protected updated(changed: Map<string, unknown>): void {
    if (!this.chart) return;
    if (EsaChart.RENDER_PROPS.some((p) => changed.has(p))) {
      this.rerender();
    } else if (EsaChart.ARIA_PROPS.some((p) => changed.has(p))) {
      this.applyAria();
    }
  }

  /*
   * No role and no name on this wrapper on purpose. AG Charts builds a proxy DOM
   * whose root already carries role="figure"; naming a second element around it
   * would announce the chart twice. The name goes ONTO that root instead, in
   * applyAria() above.
   */
  render() {
    return html`
      <div class="wrap">
        <div class="canvas" style="height: ${this.height}"></div>
      </div>
    `;
  }

  static styles = [
    typography,
    css`
      :host {
        display: block;
        /* A chart needs room; below this AG Charts stops drawing axes legibly. */
        min-inline-size: 300px;
      }
      .wrap {
        margin: 0;
        background: var(--color-background-elevation-raised, #fff);
        border: 1px solid var(--color-border-default, #dcdddd);
        border-radius: var(--radius-md, 0.5rem);
        padding: var(--spacing-300, 0.75rem);
      }
      .canvas {
        inline-size: 100%;
      }

      /*
       * Forced colors. The canvas itself is repainted from JS (see buildOptions) —
       * nothing in CSS can reach it. What IS reachable is this component's own
       * chrome, and the border is the part that matters: border-color is
       * force-adjusted, so a real border keeps the chart's bounds visible when the
       * background it sits on is flattened.
       */
      @media (forced-colors: active) {
        .wrap {
          border-color: CanvasText;
        }
      }
    `,
  ];
}

if (!customElements.get('esa-chart')) {
  customElements.define('esa-chart', EsaChart);
}
