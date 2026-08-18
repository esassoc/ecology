import { LitElement, html, css, type PropertyValues } from 'lit';
import { typography } from '../typography.js';
import { readColor, onThemeChange, forcedColorsActive } from '../token-bridge.js';
import {
  findMapHost,
  plainFeature,
  type BBox,
  type LngLat,
  type MapHost,
  type MapInstance,
  type PlainFeature,
} from '../map-engine.js';

/**
 * esa-map-geojson — polygons, lines and points from a GeoJSON source, themed.
 *
 * ZERO CONFIG IS THE POINT. Give it a `src` and it renders as a theme-aware
 * monochrome fill with a hairline outline — no paint expressions, no colour
 * decisions at the call site. That default is monochrome on purpose: the data
 * IS the subject, and a categorical palette applied to boundaries invents a
 * meaning the data does not carry. Colour by attribute is a deliberate act, not
 * a default.
 *
 * THREE LAYERS, ALWAYS. A fill layer draws polygons, a line layer draws
 * LineStrings *and* polygon outlines, a circle layer draws Points. Adding all
 * three means one component handles any geometry the file contains, and the
 * engine simply ignores the layers with nothing to draw. The alternative —
 * inspecting the data and adding only what is needed — breaks the moment a
 * FeatureCollection is mixed, which real GIS exports routinely are.
 *
 * THE DATA IS FETCHED HERE, not handed to the engine as a URL, and that is
 * load-bearing rather than incidental. `querySourceFeatures` only ever returns
 * what is currently tiled and in view, so a mirror built from it would silently
 * omit everything off-screen. Fetching once gives the complete feature list,
 * which is what the accessibility mirror below requires to be honest.
 *
 * THE ACCESSIBILITY MIRROR IS THE REASON THIS COMPONENT IS BIG. A shape drawn by
 * WebGL is a pixel: it has no role, no name, no focus, and no presence in the
 * accessibility tree. axe reports nothing, because there is no markup to be
 * wrong. So every feature also gets a real focusable button in a visually-hidden
 * list — same selection path, same event, reachable by keyboard and screen
 * reader. It is not a fallback bolted alongside the map; it is the map's only
 * non-visual representation.
 *
 * WHY IT SHIPS WITH THE LAYER rather than in a later accessibility pass:
 * retrofitting it means changing what this component RENDERS, not what colour it
 * renders in. Contrast and hit-target work can be batched later; this cannot.
 *
 * CYCLING OVERLAPPING FEATURES. `queryRenderedFeatures` returns every feature
 * under a point, topmost first — so repeated clicks in the same spot walk the
 * stack instead of stubbornly re-selecting the top one. This is the capability
 * Leaflet has no answer to, and the reason the engine choice went the way it did.
 */

/** Distinguishes this instance's source and layer ids from its siblings'. */
let seq = 0;

/** How close two clicks must be, in pixels, to count as "the same spot". */
const SAME_POINT_PX = 4;

interface FeatureCollection {
  type: 'FeatureCollection';
  features: PlainFeature[];
}

export class EsaMapGeojson extends LitElement {
  static properties = {
    src: { type: String },
    data: { type: Object },
    label: { type: String },
    nameProperty: { type: String, attribute: 'name-property' },
    hoverable: { type: Boolean },
    selectable: { type: Boolean },
    fitBounds: { type: Boolean, attribute: 'fit-bounds' },
  };

  /** URL of a GeoJSON FeatureCollection. Fetched by this component. */
  declare src: string | undefined;
  /** An already-parsed FeatureCollection. Wins over `src`. Property only. */
  declare data: FeatureCollection | undefined;
  /**
   * REQUIRED. Names the layer for assistive tech — it becomes the accessible
   * name of the mirror list ("California counties, 58 items"). Without it the
   * mirror is an unlabelled pile of buttons, which is worse than useless.
   */
  declare label: string;
  /** Which property holds a feature's human name, for mirror button labels. */
  declare nameProperty: string;
  /** Highlight a feature under the pointer, via engine feature-state. */
  declare hoverable: boolean;
  /** Emit `featureselect` on click, and expose the mirror. */
  declare selectable: boolean;
  /** Fit the camera to the data once it loads. */
  declare fitBounds: boolean;

  private host: MapHost | null = null;
  private map: MapInstance | null = null;
  private disposeTheme: (() => void) | null = null;
  private readonly uid = `esa-geojson-${++seq}`;
  private hoveredId: string | number | null = null;
  private selectedId: string | number | null = null;
  /** Complete feature list, for the mirror and for bounds. */
  private features: PlainFeature[] = [];
  /** Last click position and how far down the stack we have walked. */
  private lastPoint: { x: number; y: number } | null = null;
  private cycleIndex = 0;

  constructor() {
    super();
    this.label = '';
    this.nameProperty = 'name';
    this.hoverable = false;
    this.selectable = false;
    this.fitBounds = false;
  }

  private get fillId() {
    return `${this.uid}-fill`;
  }
  private get lineId() {
    return `${this.uid}-line`;
  }
  private get circleId() {
    return `${this.uid}-circle`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // A GL layer is painted, not cascaded: a theme change has to be pushed into
    // the paint properties or the layer keeps the old brand's colours.
    this.disposeTheme = onThemeChange(() => this.applyPaint());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disposeTheme?.();
    this.disposeTheme = null;
    const map = this.map;
    if (!map) return;
    // Layers before source: removing a source still referenced by a layer throws.
    for (const id of [this.fillId, this.lineId, this.circleId]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(this.uid)) map.removeSource(this.uid);
    this.map = null;
  }

  /** The palette, resolved from tier-2 roles. Monochrome by design. */
  private paint() {
    const forced = forcedColorsActive();
    // In forced-colors the user's own pair replaces the palette entirely — the
    // whole purpose of the mode. Separation then comes from the outline, which
    // is why the outline is never omitted.
    const ink = forced ? 'CanvasText' : readColor(this, '--color-content-default', '#202020');
    const line = forced ? 'CanvasText' : readColor(this, '--color-border-default', '#dcdddd');
    const accent = forced ? 'Highlight' : readColor(this, '--color-background-brand', '#2a6f97');
    return { ink, line, accent };
  }

  /**
   * Push colours into the layers.
   *
   * Fill opacity carries the state rather than fill colour, because a monochrome
   * layer that changes HUE on hover stops being monochrome. Three steps, far
   * enough apart to be legible without becoming decoration.
   */
  private applyPaint(): void {
    const map = this.map;
    if (!map || !map.getLayer(this.fillId)) return;
    const { ink, line, accent } = this.paint();

    map.setPaintProperty(this.fillId, 'fill-color', ink);
    map.setPaintProperty(this.fillId, 'fill-opacity', [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      0.28,
      ['boolean', ['feature-state', 'hover'], false],
      0.16,
      0.07,
    ]);
    map.setPaintProperty(this.lineId, 'line-color', [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      accent,
      line,
    ]);
    map.setPaintProperty(this.lineId, 'line-width', [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      2,
      // A hairline, not 1px: 0.75 reads as a boundary rather than a stroke, and
      // holds up when hundreds of them meet.
      0.75,
    ]);
    map.setPaintProperty(this.circleId, 'circle-color', accent);
    map.setPaintProperty(this.circleId, 'circle-stroke-color', line);
  }

  private async load(): Promise<FeatureCollection | null> {
    if (this.data) return this.data;
    if (!this.src) {
      console.error(`[esa-map-geojson] needs either \`src\` or \`data\`. Nothing to render.`);
      return null;
    }
    try {
      const res = await fetch(this.src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as FeatureCollection;
    } catch (e) {
      console.error(`[esa-map-geojson] could not load ${this.src}: ${(e as Error).message}`);
      return null;
    }
  }

  protected async firstUpdated(): Promise<void> {
    if (!this.label) {
      console.warn(
        '[esa-map-geojson] no `label`. The accessibility mirror will be an unnamed list, ' +
          'which tells a screen-reader user nothing about what these shapes are.',
      );
    }

    this.host = findMapHost(this, 'esa-map-geojson');
    if (!this.host) return;

    const [ready, collection] = await Promise.all([
      this.host.whenReady().catch(() => null),
      this.load(),
    ]);
    if (!ready || !collection) return;

    const { map } = ready;
    this.map = map;
    this.features = collection.features ?? [];

    map.addSource(this.uid, {
      type: 'geojson',
      data: collection,
      /*
       * generateId, rather than trusting the file's own ids. feature-state keys
       * off the feature id, and MapLibre only reliably accepts integers there —
       * a string id (a county NAME, say, which is exactly what a hand-made file
       * tends to carry) silently fails to highlight. Generated ids are integers
       * by construction; the human name still travels in `properties`.
       */
      generateId: true,
    });

    map.addLayer({ id: this.fillId, type: 'fill', source: this.uid, filter: ['==', ['geometry-type'], 'Polygon'] });
    map.addLayer({ id: this.lineId, type: 'line', source: this.uid });
    map.addLayer({
      id: this.circleId,
      type: 'circle',
      source: this.uid,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 5, 'circle-stroke-width': 1.5 },
    });
    this.applyPaint();

    if (this.hoverable) this.wireHover(map);
    if (this.selectable) this.wireSelect(map);
    if (this.fitBounds) {
      const b = this.boundsOf(this.features);
      if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 24 });
    }

    // The mirror needs the feature list, which only arrived just now.
    this.requestUpdate();
  }

  private wireHover(map: MapInstance): void {
    const enter = (e: unknown) => {
      const f = (e as { features?: PlainFeature[] }).features?.[0];
      if (!f || f.id === undefined) return;
      if (this.hoveredId !== null) {
        map.removeFeatureState({ source: this.uid, id: this.hoveredId }, 'hover');
      }
      this.hoveredId = f.id;
      map.setFeatureState({ source: this.uid, id: f.id }, { hover: true });
      map.getCanvas().style.cursor = this.selectable ? 'pointer' : '';
    };
    const leave = () => {
      if (this.hoveredId !== null) {
        map.removeFeatureState({ source: this.uid, id: this.hoveredId }, 'hover');
      }
      this.hoveredId = null;
      map.getCanvas().style.cursor = '';
    };
    map.on('mousemove', this.fillId, enter);
    map.on('mouseleave', this.fillId, leave);
    map.on('mousemove', this.circleId, enter);
    map.on('mouseleave', this.circleId, leave);
  }

  private wireSelect(map: MapInstance): void {
    map.on('click', (e: unknown) => {
      const ev = e as { point: { x: number; y: number }; lngLat: { lng: number; lat: number } };
      const raw = map.queryRenderedFeatures(ev.point, {
        layers: [this.fillId, this.lineId, this.circleId],
      });
      /*
       * DEDUPE BY FEATURE ID. All three layers draw from one source, so a click
       * near a boundary returns the SAME polygon twice — once from the fill and
       * once from its outline. Cycling through those is meaningless, and the
       * count shown to the user ("2 of 2") would be a lie about how many features
       * are actually there. What the consumer wants is distinct features.
       */
      const seen = new Set<string | number>();
      const hits = raw.filter((f) => {
        const key = f.id ?? JSON.stringify(f.properties);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!hits.length) return;

      /*
       * CYCLING. A click on overlapping shapes is ambiguous, and always taking
       * the topmost makes the ones underneath unreachable. So a repeat click in
       * essentially the same spot advances through the stack. The tolerance
       * exists because a real pointer never lands on the same pixel twice.
       */
      const same =
        this.lastPoint &&
        Math.abs(this.lastPoint.x - ev.point.x) <= SAME_POINT_PX &&
        Math.abs(this.lastPoint.y - ev.point.y) <= SAME_POINT_PX;
      this.cycleIndex = same ? (this.cycleIndex + 1) % hits.length : 0;
      this.lastPoint = { x: ev.point.x, y: ev.point.y };

      this.select(hits.map(plainFeature), [ev.lngLat.lng, ev.lngLat.lat], this.cycleIndex);
    });
  }

  /** Mark the chosen feature, then emit. One path for pointer and keyboard. */
  private select(features: PlainFeature[], lngLat: LngLat, index: number): void {
    const map = this.map;
    if (!map) return;
    const chosen = features[index];

    // Clear the PREVIOUS selection by id rather than sweeping every feature.
    // Sweeping is O(n) per click and pointless: at most one is ever selected.
    if (this.selectedId !== null) {
      map.removeFeatureState({ source: this.uid, id: this.selectedId }, 'selected');
      this.selectedId = null;
    }
    if (chosen?.id !== undefined) {
      this.selectedId = chosen.id;
      map.setFeatureState({ source: this.uid, id: chosen.id }, { selected: true });
    }

    this.dispatchEvent(
      new CustomEvent('featureselect', {
        detail: { features, feature: chosen, lngLat, index, count: features.length },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Bounding box of a feature list, or null when there is nothing to measure. */
  private boundsOf(features: PlainFeature[]): BBox | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const visit = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
        const [x, y] = c as number[];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        return;
      }
      if (Array.isArray(c)) c.forEach(visit);
    };
    features.forEach((f) => visit(f.geometry?.coordinates));
    return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
  }

  /** Activating a mirror row selects the feature, exactly as a click would. */
  private selectFromMirror(f: PlainFeature): void {
    const b = this.boundsOf([f]);
    // The bbox centre, not a true centroid: for selection the difference is
    // invisible, and a real centroid needs a polygon library.
    const centre: LngLat = b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : [0, 0];
    this.select([plainFeature(f)], centre, 0);
  }

  render() {
    // Nothing to mirror unless the layer is interactive — a decorative backdrop
    // does not owe a keyboard path to shapes nobody can act on.
    if (!this.selectable || !this.features.length) return html``;
    return html`
      <ul class="mirror" aria-label=${`${this.label || 'Map features'} (${this.features.length})`}>
        ${this.features.map(
          (f) => html`
            <li>
              <button type="button" @click=${() => this.selectFromMirror(f)}>
                ${String(f.properties?.[this.nameProperty] ?? f.id ?? 'Unnamed feature')}
              </button>
            </li>
          `,
        )}
      </ul>
    `;
  }

  static styles = [
    typography,
    css`
      :host {
        display: contents;
      }

      /*
       * VISUALLY HIDDEN, NOT HIDDEN. display:none and visibility:hidden both
       * remove an element from the accessibility tree, which would delete the
       * only non-visual representation these shapes have. The clip-rect idiom
       * keeps it focusable and readable while taking no visual space.
       *
       * It is deliberately NOT revealed on focus. Unlike a skip link, this is a
       * parallel representation of what is already on screen — flashing a list
       * of 58 county names over the map when someone tabs in would be noise.
       * The selection it triggers is visible on the map itself.
       */
      .mirror {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
        list-style: none;
      }
    `,
  ];
}

if (!customElements.get('esa-map-geojson')) {
  customElements.define('esa-map-geojson', EsaMapGeojson);
}
