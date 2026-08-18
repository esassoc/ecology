/**
 * map-engine — the contract between `esa-map` and the things that mount into it.
 *
 * WHY THESE TYPES ARE STRUCTURAL rather than imported from `maplibre-gl`. The
 * engine is an OPTIONAL peer dependency: `@esa/ecology` has to typecheck and
 * build with it absent, so nothing here may `import` it. Each interface names
 * only the slice this kit actually calls, which doubles as documentation of how
 * small our dependency on the engine really is — and therefore how much of it a
 * different backend would have to satisfy. Same reason `esa-chart` narrows AG
 * Charts.
 *
 * WHY A SHARED MODULE rather than types on the component. Four components need
 * them (`esa-map` plus marker, popup and each layer), and a child importing them
 * from `esa-map.ts` would create an import edge to the host — which would drag
 * the whole host module, and its 83KB stylesheet handling, into any page that
 * only wanted a marker.
 */

/** A `[longitude, latitude]` pair. Note the order — GeoJSON's, not Leaflet's. */
export type LngLat = [number, number];

/** `[west, south, east, north]`, the GeoJSON bbox order. */
export type BBox = [number, number, number, number];

/** A GeoJSON feature, as it crosses the boundary out to a consumer. */
export interface PlainFeature {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** The slice of MapLibre's `Map` this kit calls. */
export interface MapInstance {
  on(event: string, handlerOrLayer: unknown, handler?: unknown): void;
  off(event: string, handlerOrLayer: unknown, handler?: unknown): void;
  remove(): void;
  resize(): void;
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  getBearing(): number;
  getPitch(): number;
  getBounds(): { toArray(): [[number, number], [number, number]] };
  jumpTo(options: Record<string, unknown>): void;
  easeTo(options: Record<string, unknown>): void;
  panBy(offset: [number, number], options?: Record<string, unknown>): void;
  fitBounds(bounds: unknown, options?: Record<string, unknown>): void;
  setPaintProperty(layer: string, name: string, value: unknown): void;
  getLayer(id: string): unknown;
  addLayer(layer: Record<string, unknown>, before?: string): void;
  removeLayer(id: string): void;
  addSource(id: string, source: Record<string, unknown>): void;
  removeSource(id: string): void;
  getSource(id: string): unknown;
  setFeatureState(target: Record<string, unknown>, state: Record<string, unknown>): void;
  removeFeatureState(target: Record<string, unknown>, key?: string): void;
  querySourceFeatures(source: string, params?: Record<string, unknown>): PlainFeature[];
  queryRenderedFeatures(point?: unknown, options?: Record<string, unknown>): PlainFeature[];
  addControl(control: unknown, position?: string): void;
  getCanvas(): HTMLCanvasElement;
  isStyleLoaded(): boolean;
}

/**
 * A raster tile source, which is the whole of a generated basemap.
 *
 * `setTiles` is the reason this is worth narrowing separately: swapping a
 * basemap's tile URLs in place leaves every other source and layer alone,
 * whereas `setStyle` throws the style away — and with it every layer a child
 * component added through `whenReady()`. So a theme-aware basemap goes through
 * here, never through a restyle.
 */
export interface RasterSourceInstance {
  setTiles(tiles: string[]): unknown;
}

/** A MapLibre `Marker`, as this kit drives it. */
export interface MarkerInstance {
  setLngLat(v: LngLat): MarkerInstance;
  addTo(map: MapInstance): MarkerInstance;
  remove(): MarkerInstance;
  setDraggable(v: boolean): MarkerInstance;
  getLngLat(): { lng: number; lat: number };
  on(event: string, handler: () => void): MarkerInstance;
}

/** A MapLibre `Popup`, as this kit drives it. */
export interface PopupInstance {
  setLngLat(v: LngLat): PopupInstance;
  setDOMContent(node: Node): PopupInstance;
  addTo(map: MapInstance): PopupInstance;
  remove(): PopupInstance;
  isOpen(): boolean;
  on(event: string, handler: () => void): PopupInstance;
}

/** The slice of the engine's entry point this kit constructs from. */
export interface MapLibreModule {
  Map: new (options: Record<string, unknown>) => MapInstance;
  Marker: new (options?: Record<string, unknown>) => MarkerInstance;
  Popup: new (options?: Record<string, unknown>) => PopupInstance;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  ScaleControl: new (options?: Record<string, unknown>) => unknown;
  FullscreenControl: new (options?: Record<string, unknown>) => unknown;
  GeolocateControl: new (options?: Record<string, unknown>) => unknown;
  /**
   * Where the engine's worker script was emitted. Optional in this type on
   * purpose: it is a MapLibre-specific escape hatch, so a different backend is
   * not obliged to have one.
   */
  setWorkerUrl?: (url: string) => void;
}

/** What a child receives once the host's style is loaded and safe to mutate. */
export interface MapReady {
  map: MapInstance;
  lib: MapLibreModule;
}

/** The host's public shape, from a child's point of view. */
export interface MapHost extends HTMLElement {
  whenReady(): Promise<MapReady>;
}

/**
 * Find the `esa-map` a child belongs to, and wait until its style is loaded.
 *
 * WHY `closest()` AND WHY IT MUST BE CALLED EARLY. Children sit in the host's
 * LIGHT DOM, so `closest` finds the host — but only until the engine moves the
 * child. MapLibre takes the element it is given for a marker and appends it into
 * its own container inside the host's SHADOW root, at which point `closest`
 * stops at the shadow boundary and returns null. So every child resolves its
 * host once, on connect, and holds the reference.
 *
 * Returns null when there is no host, having said so — a marker outside a map is
 * an authoring mistake that is otherwise completely silent.
 */
export function findMapHost(el: HTMLElement, tag: string): MapHost | null {
  const host = el.closest('esa-map') as MapHost | null;
  if (!host) {
    console.error(
      `[${tag}] must be a child of <esa-map>. It has no map to attach to, so it will not render.`,
    );
    return null;
  }
  return host;
}

/**
 * Round-trip a feature through JSON so what leaves an event is PLAIN data.
 *
 * The engine hands back live objects carrying its own prototypes and internal
 * references; letting those out of an event would make the whole "engine-neutral
 * API" claim false, and would tempt consumers into engine-specific code that a
 * different backend could never satisfy.
 */
export function plainFeature(f: PlainFeature): PlainFeature {
  return {
    type: 'Feature',
    id: f.id,
    properties: { ...f.properties },
    geometry: JSON.parse(JSON.stringify(f.geometry)),
  };
}
