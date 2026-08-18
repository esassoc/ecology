import { LitElement, html, css, type PropertyValues } from 'lit';
import { findMapHost, type LngLat, type MapHost, type MarkerInstance } from '../map-engine.js';

/**
 * esa-map-marker — a DOM marker inside `esa-map`, holding whatever you slot into it.
 *
 * DOM MARKER, NOT A GL LAYER, AND THE DIFFERENCE IS A CAPABILITY not a
 * performance setting. This is the one that can hold arbitrary HTML — slot an
 * `esa-badge`, an avatar, a status pill — and the one that can be dragged. A GL
 * point layer draws circles, sprite icons and text, nothing else, and cannot be
 * dragged at all.
 *
 * The trade is a ceiling: **past roughly 200–500 markers a page becomes
 * noticeably slow**, because each one is a real element the browser lays out and
 * composites on every camera move. Nothing here silently switches to a GL layer
 * at some threshold, and that is deliberate: crossing it would delete the ability
 * to put a badge in a marker, which is the only reason to be using this
 * component. Past the ceiling the answer is a different component, chosen by you.
 *
 * THIS ELEMENT STAYS PUT; A DIV GOES TO THE ENGINE. That indirection is not
 * ceremony, and the first version did not have it. MapLibre takes ownership of
 * whatever element it is given for a marker and APPENDS IT into its own container
 * inside the host's shadow root. Hand it `this` and the custom element itself is
 * relocated out of the document tree — at which point
 * `document.getElementById('my-pin')` returns **null**, because id lookups do not
 * cross a shadow boundary. Measured: every marker on a page vanished from
 * `document.querySelectorAll`, silently, while rendering perfectly.
 *
 * A framework consumer holding a ref would never notice. A spoke wiring a plain
 * Astro page with `getElementById` — which is how most of this kit is consumed —
 * would be completely stuck. So the engine gets `contentEl`, this element stays
 * in the light DOM as the addressable handle, and clicks are forwarded back so
 * `@click` on the custom element still means what it looks like it means.
 *
 * The content div lives in the HOST's shadow root, so it cannot be styled from
 * here — `esa-map` owns its appearance, same as the popup chrome. Anything that
 * has to travel with the marker travels as a custom property, which inherits
 * across the boundary.
 *
 * WHY NO CLICK EVENT OF ITS OWN. `click` is a name the platform owns: a composed
 * CustomEvent named `click` is indistinguishable from a real one at the listener,
 * and a real MouseEvent's `detail` is the click COUNT. The forwarded native event
 * is the API. `markermove` is emitted because a drag is otherwise unobservable.
 */
/**
 * Is this node another map component rather than marker content?
 *
 * Tag-prefix based on purpose: it has to cover `esa-map-popup` today and
 * whatever mounts into a marker next, without this file importing any of them.
 */
function isMapChild(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).tagName.toLowerCase().startsWith('esa-map-')
  );
}

export class EsaMapMarker extends LitElement {
  static properties = {
    lngLat: { type: Array, attribute: 'lng-lat' },
    draggable: { type: Boolean },
    selected: { type: Boolean, reflect: true },
    anchor: { type: String },
  };

  /** Where the marker sits, `[lng, lat]`. Longitude first, as in GeoJSON. */
  declare lngLat: LngLat;
  /** Let the user move the pin. Emits `markermove` when they let go. */
  declare draggable: boolean;
  /** Grows the default pin, and reflected so page CSS can react. */
  declare selected: boolean;
  /** Which part of the marker sits on the coordinate. */
  declare anchor: 'center' | 'top' | 'bottom' | 'left' | 'right';

  private host: MapHost | null = null;
  private marker: MarkerInstance | null = null;
  /** The element the ENGINE owns and positions. Never this component. */
  private contentEl: HTMLDivElement | null = null;

  constructor() {
    super();
    this.lngLat = [0, 0];
    this.draggable = false;
    this.selected = false;
    this.anchor = 'bottom';
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // No deferred re-check needed: this element is never relocated, so a
    // disconnect here is always a real removal.
    this.marker?.remove();
    this.marker = null;
    this.contentEl = null;
  }

  /** The default pin, used when nothing is slotted. */
  private defaultPin(): string {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"
          fill="var(--color-background-brand, #2a6f97)"
          stroke="var(--color-background-elevation-raised, #fff)" stroke-width="1.5" />
        <circle cx="12" cy="9" r="2.5" fill="var(--color-background-elevation-raised, #fff)" />
      </svg>`;
  }

  protected async firstUpdated(): Promise<void> {
    // Resolved before anything is attached: `closest` reaches the host through
    // the light DOM, which is exactly where this element stays.
    this.host = findMapHost(this, 'esa-map-marker');
    if (!this.host) return;

    let ready;
    try {
      ready = await this.host.whenReady();
    } catch {
      // The host already reported the missing engine; one message per marker
      // would bury it.
      return;
    }

    const el = document.createElement('div');
    el.className = 'esa-marker';
    /*
     * Children are MOVED rather than copied. Copying would leave a duplicate
     * rendering in the light DOM under the map, and cloning would break identity
     * for anything the consumer already holds a reference to.
     *
     * OTHER MAP COMPONENTS ARE LEFT BEHIND, and this is what makes
     * `<esa-map-marker><esa-map-popup>…</esa-map-popup></esa-map-marker>` work.
     * A nested popup is not marker CONTENT — it is a sibling behaviour that
     * happens to be written inside the marker for the obvious reason. Moved into
     * the pin it would render as part of the pin, and worse, be relocated into
     * the host's shadow root where `document.getElementById` can no longer reach
     * it — the exact trap the header describes, one level down.
     */
    const content = Array.from(this.childNodes).filter((n) => !isMapChild(n));
    /*
     * Whitespace does not count. `this.childNodes.length` was the old test, and
     * it is true for a marker whose only child is a nested popup — indentation
     * alone makes two text nodes. That silently deleted the default pin and left
     * an EMPTY marker: nothing rendered, nothing logged.
     */
    const hasContent = content.some(
      (n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '',
    );
    if (hasContent) {
      for (const node of content) el.appendChild(node);
    } else {
      el.innerHTML = this.defaultPin();
      el.classList.add('esa-marker--default');
    }
    // Re-target the native event onto the addressable element, so a consumer's
    // `@click` on <esa-map-marker> fires even though the hit happened on a div
    // one shadow tree away.
    el.addEventListener('click', () => {
      this.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    this.contentEl = el;
    this.syncContentState();

    this.marker = new ready.lib.Marker({ element: el, anchor: this.anchor, draggable: this.draggable })
      .setLngLat(this.lngLat)
      .addTo(ready.map);

    this.marker.on('dragend', () => {
      const p = this.marker?.getLngLat();
      if (!p) return;
      // Keep the property truthful about where the user actually left it.
      this.lngLat = [p.lng, p.lat];
      this.dispatchEvent(
        new CustomEvent('markermove', {
          detail: { lngLat: this.lngLat },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  /** Mirror state onto the engine-owned div, which CSS here cannot reach. */
  private syncContentState(): void {
    const el = this.contentEl;
    if (!el) return;
    el.classList.toggle('esa-marker--selected', this.selected);
    el.classList.toggle('esa-marker--draggable', this.draggable);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has('selected') || changed.has('draggable')) this.syncContentState();
    if (!this.marker) return;
    if (changed.has('lngLat')) this.marker.setLngLat(this.lngLat);
    if (changed.has('draggable')) this.marker.setDraggable(this.draggable);
  }

  /*
   * Renders nothing. The visual content was moved into the engine's div, and this
   * element remains only as the addressable, listenable handle for it.
   */
  render() {
    return html``;
  }

  static styles = css`
    :host {
      display: none;
    }
  `;
}

if (!customElements.get('esa-map-marker')) {
  customElements.define('esa-map-marker', EsaMapMarker);
}
