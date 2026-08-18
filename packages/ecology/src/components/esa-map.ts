import { LitElement, html, css, type PropertyValues } from 'lit';
import { typography } from '../typography.js';
import { boolish } from '../boolish.js';
import {
  readColor,
  onThemeChange,
  forcedColorsActive,
  systemColor,
  currentScheme,
} from '../token-bridge.js';
import type {
  LngLat,
  BBox,
  MapInstance,
  MapLibreModule,
  MapReady,
  RasterSourceInstance,
} from '../map-engine.js';

export type { LngLat, BBox } from '../map-engine.js';

/**
 * esa-map — a token-themed host for MapLibre GL, or a placeholder without it.
 *
 * THE ENGINE IS MAPLIBRE GL, AND THAT IS A DECISION, not an implementation
 * detail. The doc page this component replaces described a Leaflet wrapper and
 * claimed "a MapLibre GL backend would satisfy the same API". That is true only
 * of the narrow API it documented — centre, zoom, tile URL, markers. It stops
 * being true at the first real requirement:
 *
 *   - `queryRenderedFeatures()` — cycling through overlays that intersect one
 *     click point. Leaflet has no analogue; you hand-roll point-in-polygon.
 *   - `feature-state` — per-feature hover on a layer of thousands of shapes.
 *   - GL-rendered point layers — `L.geoJSON` makes one SVG path per feature and
 *     falls over on large sets.
 *
 * Many ESA apps run Leaflet today. That constrains those apps, not what this
 * kit prototypes in. The API here stays engine-neutral on purpose — props take
 * primitives and GeoJSON, events carry plain data, and this is the ONLY file
 * that imports an engine — so a Leaflet or ArcGIS backend stays buildable if a
 * spoke ever needs one. Nobody has asked yet, so nobody has built it.
 *
 * SHADOW DOM IS FINE, and that was measured rather than assumed. AG Charts
 * injects its stylesheet into the shadow root as well as the document, which is
 * why `esa-chart` needed no escape. MapLibre does neither: the bundle contains
 * ZERO `document.head` writes and ZERO `createElement('style')` calls, and v6
 * dropped the "missing CSS declarations" canary that Mapbox GL JS logs. It
 * simply draws elements with `.maplibregl-*` classes and expects a stylesheet
 * somewhere in scope. So the stylesheet is adopted into the shadow root here,
 * where it styles the controls it was written for and cannot leak onto the page.
 *
 * BOTH HALVES OF THE DEPENDENCY ARE LAZY. The engine and its 83KB stylesheet are
 * imported together on first render, so a spoke that never maps pays for
 * neither and `@esa/ecology`'s hard dependency list stays at `lit` alone. The
 * stylesheet import MUST be dynamic for the same reason the engine's is: a
 * static one fails the BUILD when the optional peer is absent, which would
 * destroy the placeholder contract below — the component's whole promise is
 * that a layout still compiles and reserves space without the engine installed.
 *
 * WHAT THE THEME BRIDGE CAN AND CANNOT REACH, stated plainly because the
 * temptation is to overclaim. A WebGL map is a bitmap: no custom property
 * reaches inside it, exactly as with a canvas chart. Three surfaces here:
 *
 *   - This component's own chrome (frame, placeholder) — ordinary CSS, themes
 *     for free.
 *   - MapLibre's control chrome — DOM inside our shadow root, so the overrides
 *     at the bottom of this file re-theme it for free too.
 *   - The MAP STYLE itself — JS only, and only for the styles this component
 *     GENERATES (`style-url="blank"` and `tile-url`), whose background is
 *     painted from a token and re-painted when the theme moves. For a vendor
 *     style URL we do NOT restyle the vendor's layers: we do not know their
 *     names, and guessing would break the basemap. A vendor basemap is the
 *     vendor's. Say so in the docs rather than pretending otherwise.
 *
 * THREE WAYS TO GET A BASEMAP, and the middle one is the one people ask for
 * without knowing its name. `style-url="blank"` draws no Earth at all, which is
 * right when the data IS the map. `tile-url` generates a raster style from one
 * XYZ template — no style JSON, no account, no key, and the shape every ArcGIS,
 * WMTS and internal tile cache already publishes. `style-url` takes a full
 * vector style document, which is a piece of cartography somebody designed.
 *
 * REDUCED MOTION IS THE LIBRARY'S JOB HERE, unusually. MapLibre checks
 * `prefersReducedMotion` internally and skips camera animation unless a move is
 * marked `essential`. So this component's obligation is the opposite of
 * `esa-chart`'s: not to add machinery, but to never pass `essential: true` on a
 * decorative move and thereby override a preference the user set.
 */

/**
 * MapLibre's own keyless demo tiles. Deliberately the default: it works with no
 * signup, no API key and no account, so a prototype maps on the first run. It is
 * also visibly low-detail, which is the honest signal that a real project needs
 * a real tile source. `style-url="blank"` is the no-network alternative.
 */
const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

/**
 * The background layer id in every style this component GENERATES — blank and
 * raster alike. Shared on purpose: it is the one layer whose colour we are
 * entitled to set, so the theme bridge can look for exactly one name.
 */
const BLANK_BG_LAYER = 'esa-blank-background';

/** Source and layer ids in the generated raster basemap style. */
const RASTER_SOURCE = 'esa-basemap';
const RASTER_LAYER = 'esa-basemap-tiles';

/**
 * The stylesheet, constructed once for the whole page rather than per instance.
 *
 * `adoptedStyleSheets` shares one `CSSStyleSheet` object across every shadow
 * root that adopts it, so eight maps cost one parse of 83KB, not eight.
 */
let maplibreSheet: CSSStyleSheet | null = null;

export class EsaMap extends LitElement {
  static properties = {
    label: { type: String },
    center: { type: Array },
    zoom: { type: Number },
    minZoom: { type: Number, attribute: 'min-zoom' },
    maxZoom: { type: Number, attribute: 'max-zoom' },
    bearing: { type: Number },
    pitch: { type: Number },
    bounds: { type: Array },
    styleUrl: { type: String, attribute: 'style-url' },
    tileUrl: { type: String, attribute: 'tile-url' },
    tileUrlDark: { type: String, attribute: 'tile-url-dark' },
    tileSize: { type: Number, attribute: 'tile-size' },
    attribution: { type: String },
    interactive: { type: Boolean, converter: boolish },
    controls: { type: String },
    height: { type: String, reflect: true },
  };

  /**
   * REQUIRED. The map's accessible name.
   *
   * MapLibre names its canvas from the `Map.Title` locale string, which defaults
   * to the bare word "Map" — a name, so axe stays green, and useless. It says
   * the shape of the thing rather than what it shows. Absent, this warns at
   * runtime rather than shipping the generic string silently.
   */
  declare label: string;
  /** Initial centre, `[lng, lat]`. Ignored when `bounds` is set. */
  declare center: LngLat;
  declare zoom: number;
  declare minZoom: number;
  declare maxZoom: number;
  declare bearing: number;
  declare pitch: number;
  /** `[w, s, e, n]`. Wins over `center`/`zoom` when present. */
  declare bounds: BBox | undefined;
  /** A style JSON URL, or the keyword `blank` for a token-painted empty style. */
  declare styleUrl: string;
  /**
   * An XYZ raster tile template — the plain "a basemap of Earth" route, and the
   * one that needs no style JSON, no vendor account and no API key.
   *
   * A vector style is a whole cartography document: sources, sprites, glyphs,
   * and a hundred-odd layers someone designed. A raster basemap is one line
   * (`https://host/{z}/{x}/{y}.png`), which is also the shape every ArcGIS,
   * WMTS and internal tile cache already publishes — so this is the prop an ESA
   * project will actually reach for. Set it and the style is generated here:
   * a token-painted background, with the tiles drawn on top.
   *
   * Wins over `styleUrl`. Supported placeholders are the engine's:
   * `{z}` `{x}` `{y}`, plus `{quadkey}`, `{bbox-epsg-3857}` and `{ratio}`.
   * **`{s}` is Leaflet's and is NOT one of them** — see `checkTileUrl`.
   */
  declare tileUrl: string;
  /**
   * The tile template to use under `data-scheme="dark"`.
   *
   * Optional, and its absence is the honest default rather than a gap: raster
   * tiles are a picture of somebody's cartography, and there is no way to make a
   * light basemap dark from this side. `raster-brightness` only produces a grey
   * fog. So a theme-aware basemap means a second service, and swapping to it is
   * `setTiles` on the existing source — never `setStyle`, which would delete
   * every layer a child added.
   */
  declare tileUrlDark: string;
  /**
   * Pixel size of one raster tile. 256 is the near-universal default; some
   * services publish 512. Guessing wrong is not an error — it silently renders
   * the basemap one zoom level off, so labels come out too large or too small.
   */
  declare tileSize: number;
  /**
   * Attribution for a `tileUrl` basemap, shown in the engine's own control.
   *
   * Nearly every tile service requires it by licence (OpenStreetMap's does), and
   * a template carries no metadata to infer it from — unlike a style JSON, which
   * declares its own. So this warns when a basemap is set without one, since the
   * consequence lands on the project rather than on this component.
   */
  declare attribution: string;
  /** Whether the user can pan and zoom at all. */
  declare interactive: boolean;
  /** Space-separated opt-ins: any of `zoom`, `scale`, `fullscreen`, `locate`. */
  declare controls: string;
  declare height: string;

  /** Set when the optional peer is genuinely absent — drives the placeholder. */
  private libraryMissing = false;
  private map: MapInstance | null = null;
  private disposeTheme: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  /*
   * THE SEAM CHILDREN MOUNT THROUGH.
   *
   * A layer or marker cannot just grab the engine: it has to wait for the STYLE
   * to load. `addSource`/`addLayer` before that throws ("Style is not done
   * loading"), and the race is timing-dependent, so it passes locally on a warm
   * cache and fails on a cold one. A promise makes the wait unavoidable rather
   * than something each child has to remember.
   *
   * Created here, not in `firstUpdated`, because a child's `connectedCallback`
   * can run BEFORE the host's — light-DOM children upgrade in document order,
   * and a child that called `whenReady()` against an unset promise would hang
   * forever.
   */
  private resolveReady!: (v: MapReady) => void;
  private rejectReady!: (e: Error) => void;
  private readonly ready: Promise<MapReady> = new Promise((res, rej) => {
    this.resolveReady = res;
    this.rejectReady = rej;
  });

  /**
   * Resolves once the engine is loaded AND the style is ready to take sources.
   *
   * This is the supported way to reach the map. Rejects when the optional peer
   * is missing, so a child fails loudly instead of waiting forever.
   */
  whenReady(): Promise<MapReady> {
    return this.ready;
  }

  constructor() {
    super();
    this.label = '';
    // Geographic centre of the contiguous United States. A neutral default that
    // is somewhere rather than [0, 0], which is in the Gulf of Guinea.
    this.center = [-98.5795, 39.8283];
    this.zoom = 3;
    this.minZoom = 0;
    this.maxZoom = 22;
    this.bearing = 0;
    this.pitch = 0;
    this.styleUrl = DEMO_STYLE;
    this.tileUrl = '';
    this.tileUrlDark = '';
    this.tileSize = 256;
    this.attribution = '';
    this.interactive = true;
    this.controls = 'zoom';
    this.height = '400px';
  }

  connectedCallback(): void {
    super.connectedCallback();
    // A WebGL surface does not recompute when the cascade changes, the same way
    // a canvas does not. Without this a theme switch leaves the map painted in
    // the OLD brand with no error anywhere.
    this.disposeTheme = onThemeChange(() => this.applyTheme());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disposeTheme?.();
    this.disposeTheme = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
  }

  private get mount(): HTMLElement {
    return this.renderRoot.querySelector('.canvas') as HTMLElement;
  }

  /**
   * The generated blank style — a background and nothing else.
   *
   * This is the "no network at all" option, and it is what makes a GeoJSON
   * overlay legible on its own terms: point a layer at world data and it renders
   * against this system's own surface rather than someone's basemap. It is also
   * the only style whose colours we are entitled to set, which is why the theme
   * bridge below touches this layer and no other.
   */
  private blankStyle(): Record<string, unknown> {
    return {
      version: 8,
      name: 'esa-blank',
      sources: {},
      layers: [
        {
          id: BLANK_BG_LAYER,
          type: 'background',
          paint: { 'background-color': this.surfaceColor() },
        },
      ],
    };
  }

  /** Which tile template the active colour scheme calls for. */
  private activeTileUrl(): string {
    return this.tileUrlDark && currentScheme() === 'dark' ? this.tileUrlDark : this.tileUrl;
  }

  /**
   * The generated raster style — a basemap of Earth from one URL template.
   *
   * THE BACKGROUND LAYER UNDERNEATH IS NOT DECORATION. Tiles arrive over the
   * network, so there is a real interval with nothing painted, and every service
   * has edges: zoom past its `maxzoom`, pan off its coverage, lose the network,
   * and the raster layer has nothing to draw. Whatever is behind it shows
   * through in all four cases. Left to the engine that is opaque white, which
   * flashes on every load and is simply wrong under a dark scheme. Painting it
   * from the same token the blank style uses means the gaps look like this
   * system rather than like a broken map — and it costs one layer.
   */
  private rasterStyle(): Record<string, unknown> {
    return {
      version: 8,
      name: 'esa-raster',
      sources: {
        [RASTER_SOURCE]: {
          type: 'raster',
          tiles: [this.activeTileUrl()],
          tileSize: this.tileSize,
          attribution: this.attribution,
        },
      },
      layers: [
        {
          id: BLANK_BG_LAYER,
          type: 'background',
          paint: { 'background-color': this.surfaceColor() },
        },
        { id: RASTER_LAYER, type: 'raster', source: RASTER_SOURCE },
      ],
    };
  }

  /**
   * Catch the two ways a tile template silently produces a blank map.
   *
   * `{s}` IS LEAFLET'S, NOT THE ENGINE'S, and this is the one that will actually
   * happen here: many ESA applications run Leaflet, and their tile URLs are all
   * written `https://{s}.tile.example.org/{z}/{x}/{y}.png`. MapLibre substitutes
   * `{z}` `{x}` `{y}` `{quadkey}` `{bbox-epsg-3857}` `{ratio}` and nothing else,
   * so `{s}` is requested LITERALLY: every tile 404s against a host that does
   * not exist, and what you see is an empty frame and a console full of network
   * errors that name the URL but not the cause.
   *
   * It is reported rather than rewritten. Picking a subdomain would be guessing
   * at someone's infrastructure, and modern services do not shard — dropping the
   * placeholder is almost always right, but it is the author's call to make.
   */
  private checkTileUrl(): void {
    const url = this.activeTileUrl();
    if (!url) return;
    if (url.includes('{s}')) {
      console.error(
        `[esa-map] tile-url contains {s}, which is Leaflet's subdomain placeholder — ` +
          'MapLibre does not substitute it, so every tile request will 404 against a ' +
          `literal "{s}" host. Modern tile services do not shard: drop it. ` +
          `Got: ${url}`,
      );
    }
    if (!this.attribution) {
      console.warn(
        '[esa-map] tile-url is set without `attribution`. A tile template carries no ' +
          'metadata to infer one from, and most services (OpenStreetMap included) ' +
          'require attribution by licence.',
      );
    }
  }

  /**
   * The map's own background colour.
   *
   * In forced-colors this must be the user's `Canvas`, resolved through a real
   * element — handing a library the literal keyword throws out of its colour
   * parser and leaves an empty box, which is how a forced-colors "fix" ends up
   * worse than doing nothing. See `token-bridge.systemColor`.
   */
  private surfaceColor(): string {
    return forcedColorsActive()
      ? systemColor(this.renderRoot as unknown as ParentNode, 'Canvas', '#ffffff')
      : readColor(this, '--color-background-elevation-sunken', '#f4f4f4');
  }

  /**
   * Re-resolve everything we are allowed to paint, after the theme moved.
   *
   * Deliberately narrow. We own the blank style's background; we do not own a
   * vendor style's layers and will not guess at their names. If the map is on a
   * vendor basemap this is a no-op, and that is the correct behaviour rather
   * than a gap — see the header.
   */
  private applyTheme(): void {
    if (!this.map) return;
    if (this.map.getLayer(BLANK_BG_LAYER)) {
      this.map.setPaintProperty(BLANK_BG_LAYER, 'background-color', this.surfaceColor());
    }
    // A basemap with a dark twin swaps tiles IN PLACE. `setStyle` would be the
    // obvious call and is the wrong one: it discards the style, and with it every
    // source and layer a child added through `whenReady()` — the overlays would
    // vanish on a theme switch and never come back.
    if (this.tileUrlDark) {
      const source = this.map.getSource(RASTER_SOURCE) as RasterSourceInstance | undefined;
      source?.setTiles?.([this.activeTileUrl()]);
    }
  }

  /**
   * Move any `<style>` written directly inside `<esa-map>` into this shadow
   * root — THE ONLY WAY TO STYLE MARKER AND POPUP CONTENT.
   *
   * The problem it solves is silent, which is why the feature exists rather
   * than a documentation note. The engine MOVES a marker's content, and a
   * popup's, into its own containers in here. The moment it does, they stop
   * being page content: a document stylesheet does not reach into a shadow
   * root, so the author's CSS is simply ignored — measured, a rule saying
   * `display: grid` computed to `display: block`, with nothing logged. Type
   * roles and token `var()` reads keep working (this root adopts `typography`,
   * and custom properties inherit across the boundary), which makes the failure
   * worse: content looks half-styled rather than obviously broken.
   *
   * So the author puts the rules where the content is going. Here rather than
   * inside each marker because a style element inside a POPUP only lands in
   * this root when that popup first opens — so pins styled from a popup's block
   * render naked until something is clicked. One block on the map is in the
   * root from mount, and is one copy rather than one per overlay.
   *
   * Scope is the whole root, map chrome included; prefix your selectors. The
   * node is MOVED, not copied — leaving it in the light DOM would apply nothing
   * while looking like it should.
   *
   * In Astro this needs `<style is:inline>`. A plain `<style>` is hoisted out of
   * the markup into the page bundle, which is exactly the case that does not
   * work.
   */
  private adoptSlottedStyles(): void {
    const styles = Array.from(this.children).filter(
      (el): el is HTMLStyleElement => el.tagName === 'STYLE',
    );
    for (const style of styles) (this.renderRoot as unknown as ShadowRoot).appendChild(style);
  }

  /** Attach the opt-in controls named by the `controls` attribute. */
  private addControls(mod: MapLibreModule, map: MapInstance): void {
    const wanted = new Set(this.controls.split(/\s+/).filter(Boolean));
    // MapLibre's own controls, restyled from tokens at the bottom of this file
    // rather than rebuilt from esa-button variant="chrome". They arrive
    // keyboard-wired and correctly labelled, and their buttons measure 29px —
    // clear of the 24px target floor. Rebuilding them would mean reimplementing
    // the fullscreen and geolocation permission flows for cosmetic parity.
    if (wanted.has('zoom')) map.addControl(new mod.NavigationControl({ showCompass: false }), 'top-left');
    if (wanted.has('fullscreen')) map.addControl(new mod.FullscreenControl(), 'top-right');
    if (wanted.has('locate')) map.addControl(new mod.GeolocateControl({ trackUserLocation: true }), 'top-right');
    if (wanted.has('scale')) map.addControl(new mod.ScaleControl({ unit: 'imperial' }), 'bottom-left');
  }

  private emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** The camera, as plain numbers. The event payload shape for every move. */
  private camera(): Record<string, unknown> {
    const map = this.map;
    if (!map) return {};
    const c = map.getCenter();
    return {
      center: [c.lng, c.lat] as LngLat,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      bounds: map.getBounds().toArray().flat() as BBox,
    };
  }

  protected async firstUpdated(): Promise<void> {
    if (!this.label) {
      console.warn(
        '[esa-map] no `label`. MapLibre will fall back to the generic name "Map", ' +
          'which says the shape of the thing rather than what it shows.',
      );
    }

    let mod: MapLibreModule;
    let sheetText: string;
    try {
      /*
       * Literal specifiers on purpose, for both halves. The bundler has to be
       * able to SEE these to resolve them — a variable specifier would silence
       * the "optional peer is missing" type error while leaving a bare
       * specifier in the browser, which cannot be resolved at runtime.
       *
       * The stylesheet is fetched as text (`?inline`) rather than injected,
       * because the default behaviour would put it in `document.head` where it
       * cannot reach into this shadow root, and would leak `.maplibregl-*`
       * rules onto every page that ever mounted a map.
       */
      const [engine, sheet, worker] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl.css?inline'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
      ]);
      mod = engine as unknown as MapLibreModule;
      sheetText = sheet.default;
      /*
       * THE WORKER HAS TO BE POINTED AT EXPLICITLY, and getting this wrong is
       * INVISIBLE ON A RASTER MAP.
       *
       * MapLibre derives its worker URL at runtime — `new URL(
       * './maplibre-gl-worker.mjs', import.meta.url)` against its own chunk.
       * A bundler cannot see that string, so the worker is never emitted and
       * the request 404s in a production build. There is no thrown error: the
       * map constructs, the style loads, controls appear, and raster tiles
       * paint normally because images load on the MAIN thread. What silently
       * does nothing is everything the worker parses — so a GeoJSON layer
       * renders NOTHING, on a map that otherwise looks entirely healthy.
       *
       * `?worker&url` makes the bundler resolve the worker's own imports (it
       * pulls in the 482KB shared chunk) and emit it as a real asset;
       * `setWorkerUrl` is the supported way to say where it landed.
       *
       * This is separate from `optimizeDeps.exclude: ['maplibre-gl']` in the
       * site's vite config, which fixes the SAME symptom in dev only. Both are
       * needed: the dev server pre-bundles, the production build does not.
       */
      mod.setWorkerUrl?.(worker.default);
    } catch {
      // An optional peer that is genuinely missing is an author error, not a
      // user-facing one — but a layout still has to compile and reserve space,
      // so this renders the placeholder rather than leaving a silent empty box.
      this.libraryMissing = true;
      this.requestUpdate();
      // Children awaiting the seam must fail rather than hang. An unhandled
      // rejection here would be noise on top of the error below, so children
      // catch it; this is the signal, not the report.
      this.rejectReady(new Error('maplibre-gl is not installed'));
      console.error(
        '[esa-map] `maplibre-gl` is not installed. It is an optional peer ' +
          'dependency: run `npm install maplibre-gl`.',
      );
      return;
    }

    if (!maplibreSheet) {
      maplibreSheet = new CSSStyleSheet();
      maplibreSheet.replaceSync(sheetText);
    }
    /*
     * THE VENDOR SHEET GOES FIRST, and getting this backwards silently breaks
     * the whole component.
     *
     * MapLibre adds `.maplibregl-map` to the very element we mount into, and its
     * sheet declares `position: relative` on it. Our own `.canvas` rule says
     * `position: absolute` at the SAME specificity (0,1,0), so whichever sheet
     * comes last wins. Appended last, the vendor won: the mount fell back into
     * normal flow, its only child (the canvas container) is absolutely
     * positioned and therefore contributes no height, and the mount computed to
     * **height: 0**. The map then paints into a zero-height box — canvas and
     * controls all present, all correctly sized, all invisible. Nothing errors.
     *
     * Same principle as `typography` leading `static styles`: the borrowed sheet
     * is the FLOOR, this component's rules are the override.
     */
    const root = this.renderRoot as unknown as ShadowRoot;
    root.adoptedStyleSheets = [maplibreSheet, ...root.adoptedStyleSheets];

    this.checkTileUrl();
    this.adoptSlottedStyles();

    const map = new mod.Map({
      container: this.mount,
      // Three cases, in precedence order: a generated raster basemap, the
      // generated blank style, or somebody's style JSON.
      style: this.tileUrl
        ? this.rasterStyle()
        : this.styleUrl === 'blank'
          ? this.blankStyle()
          : this.styleUrl,
      center: this.center,
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      bearing: this.bearing,
      pitch: this.pitch,
      interactive: this.interactive,
      // Replaces the canvas's generic "Map" accessible name. This is the
      // supported route; there is no top-level ariaLabel option.
      locale: this.label ? { 'Map.Title': this.label } : undefined,
      // Wins over center/zoom when present — MapLibre applies it at construction,
      // so there is no initial-frame flash from fitting the bounds afterwards.
      bounds: this.bounds
        ? [
            [this.bounds[0], this.bounds[1]],
            [this.bounds[2], this.bounds[3]],
          ]
        : undefined,
    });
    this.map = map;

    this.addControls(mod, map);

    /*
     * EVENT NAMES ARE PREFIXED WHERE THE PLATFORM ALREADY OWNS THE WORD, and
     * `click` is the one that actually bites. A composed CustomEvent named
     * `click` is indistinguishable from a real one at the listener, and a real
     * MouseEvent's `detail` is the CLICK COUNT — a number. So
     * `e.detail.lngLat` would be `undefined` on every genuine click, silently,
     * with both events arriving on the same handler. `mapclick` cannot collide.
     *
     * `moveend` is left bare: it is MapLibre's own name, the platform does not
     * use it, and it matches the kit's `tabchange` / `pagechange` shape.
     */
    map.on('load', () => {
      this.applyTheme();
      // Children go first: a layer added before the consumer's own `mapload`
      // handler runs means the handler can already see the layer it expects.
      this.resolveReady({ map, lib: mod });
      this.emit('mapload', this.camera());
    });
    map.on('moveend', () => this.emit('moveend', this.camera()));
    map.on('click', (e: unknown) => {
      const { lngLat } = e as { lngLat: { lng: number; lat: number } };
      this.emit('mapclick', { lngLat: [lngLat.lng, lngLat.lat] as LngLat });
    });

    /*
     * A GL canvas sizes itself from its container ONCE. A map that mounts inside
     * a drawer, a tab panel or a collapsed section is measured at zero and stays
     * that way — the classic "map is a grey sliver" bug. Watching the host is
     * cheaper and more reliable than asking every caller to remember `resize()`.
     */
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(this);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!this.map) return;
    // Camera props are applied as a MOVE, not a rebuild. `easeTo` is used rather
    // than `jumpTo` so the transition is legible — and NOT marked `essential`,
    // which is what lets MapLibre skip it for a user who asked for reduced
    // motion. Marking it essential would override that preference.
    if (changed.has('center') || changed.has('zoom') || changed.has('bearing') || changed.has('pitch')) {
      this.map.easeTo({
        center: this.center,
        zoom: this.zoom,
        bearing: this.bearing,
        pitch: this.pitch,
      });
    }
  }

  render() {
    if (this.libraryMissing) return this.renderPlaceholder();
    /*
     * The slot holds markers, popups and layers. Most of them render NOTHING
     * here: a layer draws on the GL canvas, and the engine MOVES a marker out of
     * the slot into its own container. The slot exists so those children are in
     * the tree at all — which is what lets them upgrade, find this host with
     * `closest()`, and await `whenReady()`.
     *
     * It sits after .canvas and is not positioned, so a child that renders
     * nothing costs no layout.
     */
    return html`
      <div class="frame" style="height: ${this.height}">
        <div class="canvas"></div>
        <slot></slot>
      </div>
    `;
  }

  /**
   * The engine-absent state.
   *
   * Mirrors `esa-empty-state`'s anatomy — centred icon, title, description — and
   * names TYPE ROLES rather than raw sizes. The doc page that specified this
   * component predates the composite classes and reads `--font-size-150`
   * directly; that is not the current contract and is not copied here.
   */
  private renderPlaceholder() {
    return html`
      <div class="frame frame--placeholder" style="height: ${this.height}">
        <div class="ph">
          <svg class="ph-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p class="ph-title typography-label-md-strong">Map unavailable</p>
          <p class="ph-text typography-body-sm">
            Install <code>maplibre-gl</code> to enable interactive maps.
          </p>
        </div>
      </div>
    `;
  }

  static styles = [
    typography,
    css`
      /*
       * A MAP HAS NO INTRINSIC WIDTH, so it must claim its container explicitly.
       *
       * display:block alone is not enough, and the failure is ugly. The only
       * child of .frame is the absolutely-positioned .canvas, which is out of
       * flow and contributes NOTHING to content width. In normal flow that is
       * harmless — a block fills its containing block. But drop the component
       * into a flex or grid container (the docs Preview is display:flex, and a
       * spoke will do the same) and it becomes a shrink-to-fit item with no
       * content to measure: it collapses to whatever min-inline-size says and
       * renders as a narrow sliver, which reads as "the map did not load".
       *
       * inline-size:100% resolves against the containing block in every layout
       * mode — normal flow, flex item, grid item — so it is the one declaration
       * that fixes all three.
       */
      :host {
        display: block;
        inline-size: 100%;
      }

      .frame {
        position: relative;
        overflow: hidden;
        background: var(--color-background-elevation-sunken, #f4f4f4);
        border: 1px solid var(--color-border-default, #dcdddd);
        border-radius: var(--radius-md, 0.5rem);
      }

      .canvas {
        position: absolute;
        inset: 0;
      }

      /* Placeholder ------------------------------------------------------- */

      .ph {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-200, 0.5rem);
        padding: var(--spacing-500, 1.5rem);
        text-align: center;
      }
      .ph-icon {
        inline-size: 32px;
        block-size: 32px;
        color: var(--color-content-default-muted, #838383);
      }
      .ph-title {
        margin: 0;
        color: var(--color-content-default-secondary, #646464);
      }
      .ph-text {
        margin: 0;
        max-inline-size: 320px;
        color: var(--color-content-default-muted, #838383);
      }

      /* MapLibre's own chrome ---------------------------------------------
       *
       * The vendor sheet is adopted BEFORE these styles (see firstUpdated), so
       * these rules win on equal specificity. Only the surfaces the kit actually
       * has an opinion about are touched: the control buttons and the
       * attribution bar. The library's layout, hit targets and focus order are
       * left alone.
       */

      .maplibregl-ctrl-group {
        background: var(--color-background-elevation-raised, #fff);
        border-radius: var(--radius-sm, 0.25rem);
        box-shadow: var(--elevation-2, 0 1px 3px rgb(0 0 0 / 0.16));
      }
      .maplibregl-ctrl-group button + button {
        border-block-start-color: var(--color-border-default-subtle, #e8e9e9);
      }
      .maplibregl-ctrl-group button:hover {
        background: var(--color-background-elevation-sunken, #f4f4f4);
      }
      .maplibregl-ctrl-attrib {
        background: var(--color-background-elevation-raised, #fff);
        color: var(--color-content-default-secondary, #646464);
      }
      .maplibregl-ctrl-attrib a {
        color: var(--color-content-default-secondary, #646464);
      }
      .maplibregl-ctrl-scale {
        background: var(--color-background-elevation-raised, #fff);
        border-color: var(--color-border-default, #dcdddd);
        color: var(--color-content-default-secondary, #646464);
      }

      /* Popup chrome -------------------------------------------------------
       *
       * The bubble, tail and close button are the ENGINE's DOM, and the engine
       * appends popups into this shadow root. So this stylesheet is the only
       * place that can reach them — esa-map-popup styles only its own slotted
       * content, one tree down. That is why popup theming lives in the host
       * rather than in the popup component.
       */
      .maplibregl-popup-content {
        background: var(--color-background-elevation-floating, #fff);
        color: var(--color-content-default, #202020);
        border-radius: var(--radius-md, 0.5rem);
        box-shadow: var(--elevation-8, 0 8px 24px -6px rgb(0 0 0 / 0.18));
        padding: var(--spacing-300, 0.75rem);
        /*
         * So a popup's min-width and max-width mean the BUBBLE, which is the
         * only width their author can see. This element is content-box by
         * default, and the padding above is ours — so a requested 180px
         * measured 204px on screen, off by exactly the 24px this rule adds. An
         * author reconciling that has to know both that the padding exists and
         * what it is set to.
         */
        box-sizing: border-box;
      }
      /* The tail is drawn as a border triangle, so its colour has to match the
         bubble's background on whichever side the engine placed it. */
      .maplibregl-popup-anchor-top .maplibregl-popup-tip {
        border-bottom-color: var(--color-background-elevation-floating, #fff);
      }
      .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
        border-top-color: var(--color-background-elevation-floating, #fff);
      }
      .maplibregl-popup-anchor-left .maplibregl-popup-tip {
        border-right-color: var(--color-background-elevation-floating, #fff);
      }
      .maplibregl-popup-anchor-right .maplibregl-popup-tip {
        border-left-color: var(--color-background-elevation-floating, #fff);
      }
      .maplibregl-popup-close-button {
        color: var(--color-content-default-secondary, #646464);
        border-radius: var(--radius-sm, 0.25rem);
        /* The engine ships a 12px hit box. 24px is the SC 2.5.8 floor, and a
           dismiss control is the last thing that should be hard to hit. */
        inline-size: 24px;
        block-size: 24px;
        font-size: 16px;
        line-height: 1;
      }
      .maplibregl-popup-close-button:hover {
        background: var(--color-background-elevation-sunken, #f4f4f4);
        color: var(--color-content-default, #202020);
      }
      .maplibregl-popup-close-button:focus-visible {
        outline: 2px solid var(--focus-ring-color, var(--color-border-default-focus, #2a6f97));
        outline-offset: 1px;
      }

      /* Marker and popup bodies --------------------------------------------
       *
       * These elements are created by esa-map-marker and esa-map-popup but the
       * engine RELOCATES them into this shadow root, which is why their styling
       * lives here rather than with the components that own their behaviour. A
       * child component's own stylesheet cannot reach one shadow tree up.
       *
       * The children themselves came from the consumer's light DOM and carry
       * their own styles with them; only the wrapper is ours.
       */
      .esa-marker {
        cursor: pointer;
        /* A pin is a pointer target, so it must not start a text selection. */
        user-select: none;
        -webkit-user-select: none;
        line-height: 0;
      }
      .esa-marker--draggable {
        cursor: grab;
      }
      .esa-marker--draggable:active {
        cursor: grabbing;
      }
      .esa-marker--default svg {
        display: block;
        inline-size: 28px;
        block-size: 28px;
        filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.3));
        transition: inline-size 120ms ease, block-size 120ms ease;
      }
      .esa-marker--default.esa-marker--selected svg {
        inline-size: 36px;
        block-size: 36px;
      }
      /*
       * A marker's label and tooltip are rendered by esa-map-marker but
       * styled HERE, because they land in this shadow root and a child's
       * stylesheet cannot reach one tree up. Both are absolutely positioned off
       * the pin so neither changes its hit box: a caption that made the pin
       * wider would move the thing it names.
       *
       * DO NOT ADD position:relative HERE to make that work. The engine
       * already sets position: absolute on this element, from a rule of the
       * SAME specificity (0,1,0) in a sheet that loads first — so a rule here
       * silently wins and takes the marker out of absolute positioning. It
       * then stretches to the container's full width, and a label anchored at
       * 50% of that lands hundreds of pixels away from its own pin. Measured:
       * a 22px marker became 616px wide, with the caption 275px off. The
       * engine's own absolute positioning is already the containing block
       * these two need.
       */
      .esa-marker__label,
      .esa-marker__tip {
        position: absolute;
        z-index: 1;
        padding: 0 var(--spacing-100, 0.25rem);
        border-radius: var(--radius-xs, 0.125rem);
        /* Type comes from the composite class the marker sets, not from raw
           size/weight declarations here — a composite IS the type role. */
        white-space: nowrap;
        pointer-events: none;
      }
      .esa-marker__label {
        background: var(--color-background-elevation-raised, #fff);
        color: var(--color-content-default-secondary, #646464);
        box-shadow: var(--elevation-2, 0 1px 2px rgb(0 0 0 / 0.24));
      }
      .esa-marker__label--bottom {
        inset-block-start: calc(100% + var(--spacing-050, 0.125rem));
        inset-inline-start: 50%;
        translate: -50% 0;
      }
      .esa-marker__label--top {
        inset-block-end: calc(100% + var(--spacing-050, 0.125rem));
        inset-inline-start: 50%;
        translate: -50% 0;
      }
      .esa-marker__label--left {
        inset-inline-end: calc(100% + var(--spacing-100, 0.25rem));
        inset-block-start: 50%;
        translate: 0 -50%;
      }
      .esa-marker__label--right {
        inset-inline-start: calc(100% + var(--spacing-100, 0.25rem));
        inset-block-start: 50%;
        translate: 0 -50%;
      }
      /*
       * The tooltip is INVERTED, and that is the difference the eye reads. A
       * label is part of the map; a tooltip is a temporary overlay on top of
       * it, and giving them the same chrome makes a transient thing look
       * permanent.
       */
      .esa-marker__tip {
        inset-block-end: calc(100% + var(--spacing-100, 0.25rem));
        inset-inline-start: 50%;
        translate: -50% 0;
        background: var(--color-background-inverse, #202020);
        color: var(--color-content-inverse, #fff);
        opacity: 0;
        transition: opacity 120ms ease;
      }
      .esa-marker__tip--visible {
        opacity: 1;
      }

      /* The engine gives a marker no focus affordance at all. */
      .esa-marker:focus-visible {
        outline: 2px solid var(--focus-ring-color, var(--color-border-default-focus, #2a6f97));
        outline-offset: 2px;
        border-radius: var(--radius-sm, 0.25rem);
      }
      /* The popup body is focused when the popup opens, which would otherwise
         paint a ring around content the user did not tab to. */
      .esa-popup-body:focus {
        outline: none;
      }
      .esa-popup-body:focus-visible {
        outline: 2px solid var(--focus-ring-color, var(--color-border-default-focus, #2a6f97));
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .esa-marker--default svg {
          transition: none;
        }
      }
      @media (forced-colors: active) {
        .esa-marker--default svg path {
          fill: CanvasText;
          stroke: Canvas;
        }
        .esa-marker--default svg circle {
          fill: Canvas;
        }
      }

      /*
       * Forced colors. The GL surface is a bitmap and is repainted from JS (see
       * surfaceColor); nothing in CSS reaches it. What IS reachable is this
       * component's own frame, and the border is what matters — border-color is
       * force-adjusted, so a real border keeps the map's bounds visible once the
       * background behind it is flattened.
       */
      @media (forced-colors: active) {
        .frame {
          border-color: CanvasText;
        }
      }
    `,
  ];
}

if (!customElements.get('esa-map')) {
  customElements.define('esa-map', EsaMap);
}
