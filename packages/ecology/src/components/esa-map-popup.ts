import { LitElement, html, css, type PropertyValues } from 'lit';
import { boolish } from '../boolish.js';
import {
  findMapHost,
  type LngLat,
  type MapHost,
  type MapInstance,
  type PopupInstance,
} from '../map-engine.js';

/**
 * esa-map-popup — a popup anchored to a coordinate, opened programmatically.
 *
 * STANDALONE BY DESIGN. It is not owned by a marker and does not need one: set
 * `lng-lat` and `open` and it appears anywhere on the map. That is what makes it
 * work for the case a marker cannot serve — a click on a POLYGON, where the thing
 * you want to describe has no pin. `esa-map-geojson` emits `featureselect` with a
 * coordinate; feed it straight in.
 *
 * Pairing it with a marker is a composition, not another component:
 *
 *   <esa-map-marker lng-lat="[-122.4, 37.8]" @click=...>
 *   <esa-map-popup  lng-lat="[-122.4, 37.8]" .open=...>
 *
 * TOGGLETIP, NOT TOOLTIP, and the distinction decides the interaction contract. A
 * tooltip describes its trigger and appears on hover; a toggletip is opened
 * deliberately, holds real content the user may want to read, copy or click, and
 * therefore owes them: Escape to dismiss, a close button, dismissal on clicking
 * the map, and focus that goes INTO it and comes back out. Hover would be wrong —
 * the content is not a label.
 *
 * WHY FOCUS RESTORE IS RECORDED RATHER THAN DECLARED. A popup openable from
 * anywhere has no single trigger to hand focus back to, so there is nothing to
 * configure. What is always true is where focus WAS when it opened, so that is
 * what gets captured and restored.
 *
 * THIS ELEMENT STAYS PUT; A DIV GOES TO THE ENGINE — for the same reason as
 * `esa-map-marker`, and it is worth reading that file's header. Handing the engine
 * `this` relocates the custom element into the host's shadow root, after which
 * `document.getElementById('my-popup')` returns null and the page can no longer
 * open its own popup. The div is what the engine relocates; this element stays in
 * the light DOM as the handle you set `open` on.
 *
 * The bubble, tail and close button are the ENGINE's DOM inside the host's shadow
 * root, so `esa-map` themes them. Nothing here can reach them.
 */
/** Read a `lng-lat` attribute without trusting its contents. */
function parseLngLat(raw: string | null): LngLat | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number')
      ? (v as LngLat)
      : null;
  } catch {
    return null;
  }
}

export class EsaMapPopup extends LitElement {
  static properties = {
    lngLat: { type: Array, attribute: 'lng-lat' },
    open: { type: Boolean, reflect: true },
    closeButton: { type: Boolean, attribute: 'close-button', converter: boolish },
    closeOnClick: { type: Boolean, attribute: 'close-on-click' },
    maxWidth: { type: String, attribute: 'max-width' },
    minWidth: { type: String, attribute: 'min-width' },
    minHeight: { type: String, attribute: 'min-height' },
  };

  /** Where the popup points, `[lng, lat]`. */
  declare lngLat: LngLat;
  /** Whether it is showing. Set it to open and close the popup. */
  declare open: boolean;
  /** Show the engine's dismiss button. On by default — a toggletip owes one. */
  declare closeButton: boolean;
  /**
   * Dismiss when the user clicks the map. **Off by default, and that default was
   * measured rather than chosen for taste.**
   *
   * The engine implements this as a listener on the map's click event — the very
   * same event a layer's `selectable` handler uses to OPEN a popup. Both are
   * registered asynchronously, so their relative order is not defined: a click
   * that selects a new feature could open the popup and then immediately close
   * it, intermittently, depending on which listener happened to attach first.
   *
   * So the layer-driven case — which is the common one — must have this off, and
   * dismissal comes from the close button, Escape, or the page setting `open` to
   * false. Turn it on only for a popup nothing else opens.
   */
  declare closeOnClick: boolean;
  /** Caps the bubble width so long prose wraps instead of stretching the map. */
  declare maxWidth: string;
  /**
   * Floor for the bubble width. Measured on the SAME box as `maxWidth`, so the
   * two read as a range rather than as two numbers about different things.
   *
   * It has a default because a bubble that sizes purely to its content
   * collapses, and the result reads as broken rather than as compact: measured
   * on this kit's own examples, a popup holding "Redding / pop. 93k" rendered
   * **84px** wide. Popups in one map also came out at 84, 147 and 172px — the
   * same control at three sizes, which makes a set of them look accidental.
   *
   * 180px is one line of ~28 characters at the body size, which is where a
   * caption stops looking like a fragment. Set it wider for cards that should
   * all match; set it to `0` for a bubble that genuinely should hug one word.
   */
  declare minWidth: string;
  /**
   * Floor for the bubble height. **Unset by default, deliberately.**
   *
   * A width floor stops a bubble collapsing sideways, which is disfiguring. A
   * height floor pads short content with empty space, which is only ever wanted
   * when several popups must match exactly — so it is opt-in rather than a
   * default that quietly adds whitespace to every popup on the map.
   */
  declare minHeight: string;

  private host: MapHost | null = null;
  private popup: PopupInstance | null = null;
  private contentEl: HTMLDivElement | null = null;
  /** Where focus was when this opened, so it can be handed back. */
  private returnFocusTo: HTMLElement | null = null;
  /** The marker this popup is nested inside, if any. See `bindToMarker`. */
  private marker: (HTMLElement & { lngLat: LngLat }) | null = null;

  /**
   * Nesting a popup inside a marker wires it up:
   *
   *   <esa-map-marker lng-lat="[-121.49, 38.58]">
   *     <esa-map-popup>…rich content…</esa-map-popup>
   *   </esa-map-marker>
   *
   * The coordinate is INHERITED rather than repeated (a marker popup that can
   * point somewhere else is a bug waiting to happen, and repeating the pair is
   * how they drift), clicking the pin toggles it, and dragging the pin takes the
   * popup with it. An explicit `lng-lat` still wins — offsetting a popup off its
   * pin is legitimate.
   *
   * This is a COMPOSITION the component recognises, not a merger. The popup is
   * still the same standalone component, still openable from anywhere, and the
   * marker knows nothing about popups — `esa-map-marker` just declines to
   * swallow other `esa-map-*` children into its pin.
   */
  private bindToMarker(): void {
    const parent = this.parentElement;
    if (parent?.tagName.toLowerCase() !== 'esa-map-marker') return;
    this.marker = parent as HTMLElement & { lngLat: LngLat };
    if (!this.hasAttribute('lng-lat')) {
      /*
       * The ATTRIBUTE is the fallback, and it is not belt-and-braces: upgrade
       * order is not guaranteed, so a marker whose element definition has not
       * run yet has no `lngLat` property at all — the popup would silently
       * inherit [0, 0] and point at the Gulf of Guinea. The attribute is in the
       * HTML from the first parse.
       */
      const inherited = this.marker.lngLat ?? parseLngLat(this.marker.getAttribute('lng-lat'));
      if (inherited) this.lngLat = inherited;
    }
    this.marker.addEventListener('click', this.onMarkerClick);
    this.marker.addEventListener('markermove', this.onMarkerMove as EventListener);
  }

  private onMarkerClick = (): void => {
    // Toggle, not open. A marker popup has no other dismissal affordance if the
    // close button is turned off, and a second click on the pin is the gesture
    // everyone tries first.
    this.open = !this.open;
  };

  private onMarkerMove = (e: CustomEvent<{ lngLat: LngLat }>): void => {
    this.lngLat = e.detail.lngLat;
  };

  /**
   * One marker popup open at a time, and the map is the coordinator.
   *
   * Two bubbles open at once reads as a bug rather than a feature, and the
   * engine has no opinion — every popup is independent. This announces on the
   * HOST, so peers hear it without any of them holding references to each
   * other. Deliberately scoped to marker-owned popups: a standalone popup driven
   * by a layer's selection is the page's business, and closing it from here
   * would fight the page's own logic.
   */
  private closePeers(): void {
    if (!this.marker || !this.host) return;
    this.host.dispatchEvent(
      new CustomEvent('esa-map-popup-open', { detail: { popup: this } }),
    );
  }

  private onPeerOpen = (e: Event): void => {
    const { popup } = (e as CustomEvent<{ popup: EsaMapPopup }>).detail;
    if (popup !== this && this.marker && this.open) this.close();
  };

  /**
   * The element holding this popup's content — READ THIS BEFORE REACHING FOR
   * `document.querySelector`.
   *
   * The content you authored inside `<esa-map-popup>` is moved once, into the
   * engine's bubble, which lives inside `esa-map`'s shadow root. Document-level
   * queries do not cross a shadow boundary, so `document.querySelector('[data-x]')`
   * returns **null** afterwards even though the markup is on screen and working.
   * That is not a bug to route around; it is where the content now lives.
   *
   * So updating a popup's contents goes through here:
   *
   *   popup.body?.querySelector('[data-name]')!.textContent = feature.name;
   *
   * Null until the engine is ready — or forever, if the optional peer is absent.
   */
  get body(): HTMLElement | null {
    return this.contentEl;
  }

  constructor() {
    super();
    this.lngLat = [0, 0];
    this.open = false;
    this.closeButton = true;
    this.closeOnClick = false;
    this.maxWidth = '280px';
    this.minWidth = '180px';
    this.minHeight = '';
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.contentEl?.removeEventListener('keydown', this.onKeydown);
    this.marker?.removeEventListener('click', this.onMarkerClick);
    this.marker?.removeEventListener('markermove', this.onMarkerMove as EventListener);
    this.host?.removeEventListener('esa-map-popup-open', this.onPeerOpen);
    this.popup?.remove();
    this.popup = null;
    this.contentEl = null;
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.open) return;
    // Handled here, so it must not also close a dialog or drawer the map sits in.
    e.stopPropagation();
    this.close();
  };

  /** Close, emit, hand focus back. The single exit path. */
  private close(): void {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('popupclose', { detail: { lngLat: this.lngLat }, bubbles: true, composed: true }),
    );
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    // preventScroll: reclaiming focus must not yank the page somewhere.
    if (target?.isConnected) target.focus({ preventScroll: true });
  }

  protected async firstUpdated(): Promise<void> {
    this.host = findMapHost(this, 'esa-map-popup');
    if (!this.host) return;
    this.bindToMarker();
    this.host.addEventListener('esa-map-popup-open', this.onPeerOpen);

    let ready;
    try {
      ready = await this.host.whenReady();
    } catch {
      return;
    }

    const el = document.createElement('div');
    el.className = 'esa-popup-body';
    /*
     * -1: focus has to be able to MOVE here when the popup opens, but this must
     * not become a tab stop in its own right — it is reached deliberately, not by
     * tabbing past the map. Without a tabindex, `focus()` silently does nothing
     * and Escape never reaches the handler.
     */
    el.tabIndex = -1;
    el.addEventListener('keydown', this.onKeydown);
    while (this.firstChild) el.appendChild(this.firstChild);
    this.contentEl = el;

    this.popup = new ready.lib.Popup({
      closeButton: this.closeButton,
      // Off unless asked for — see the `closeOnClick` docs above for the race
      // this default avoids.
      closeOnClick: this.closeOnClick,
      maxWidth: this.maxWidth,
      className: 'esa-popup',
    })
      .setLngLat(this.lngLat)
      .setDOMContent(el);

    // The engine closes on its own for the close button and map clicks, so the
    // component has to hear about it or `open` would silently disagree.
    this.popup.on('close', () => {
      if (this.open) this.close();
    });

    if (this.open) this.show(ready.map);
  }

  private show(map: MapInstance): void {
    this.closePeers();
    this.returnFocusTo = (document.activeElement as HTMLElement) ?? null;
    this.popup?.addTo(map);
    this.applySize();
    // Focus lands on the content so a keyboard user is where the new content is,
    // and so Escape reaches the handler above.
    this.contentEl?.focus({ preventScroll: true });
    // After a frame, so the bubble has been laid out and can be measured — and
    // after `applySize`, or it would pan a bubble that is about to change size.
    requestAnimationFrame(() => this.panIntoView(map));
  }

  /**
   * Put the size floors on the bubble, not on our own content div.
   *
   * `maxWidth` is an engine option and lands on `.maplibregl-popup-content`.
   * Applying the minimum to the inner div instead would measure the two against
   * DIFFERENT boxes — the content box adds the engine's ~20px of padding — so
   * `min-width: 180px` with `max-width: 180px` would be a contradiction that
   * silently resolves in the minimum's favour. Same box, so they read as a
   * range.
   *
   * Set as inline style rather than through a custom property: an
   * `--esa-popup-*` name read with a fallback and declared in no token file is
   * exactly the ad-hoc tier-3 hook this repo holds at zero.
   */
  private applySize(): void {
    const box = this.contentEl?.closest('.maplibregl-popup-content') as HTMLElement | null;
    if (!box) return;
    box.style.minInlineSize = this.minWidth || '';
    box.style.minBlockSize = this.minHeight || '';
    this.warnIfImpossible();
  }

  /**
   * A minimum above the maximum is not an error the browser reports — the
   * minimum simply wins, and the author sees a bubble wider than the cap they
   * set with nothing to explain it. Only checked for plain `px` on both sides,
   * because comparing `40ch` with `18rem` needs layout, and a warning that
   * guesses is worse than none.
   */
  private warnIfImpossible(): void {
    const px = (v: string): number | null => {
      const m = /^(-?[\d.]+)px$/.exec(v.trim());
      return m ? Number(m[1]) : null;
    };
    const min = px(this.minWidth);
    const max = px(this.maxWidth);
    if (min !== null && max !== null && min > max) {
      console.warn(
        `[esa-map-popup] min-width (${this.minWidth}) is greater than max-width ` +
          `(${this.maxWidth}). The minimum wins, so the bubble will be ${this.minWidth} ` +
          'wide and the cap has no effect.',
      );
    }
  }

  /**
   * Pan the map so the whole bubble is visible.
   *
   * THE ENGINE DOES NOT DO THIS. MapLibre's `Popup` has no auto-pan option at
   * all — Leaflet's `autoPan` has no counterpart here — so a popup opened near
   * an edge is simply clipped by the map frame. It is invisible on the short
   * two-line popups this component started with and obvious the moment content
   * gets rich: measured, a 260px card on a marker in the lower half of the map
   * had its action button cut off, with nothing wrong anywhere in the DOM.
   *
   * Deliberately `panBy` rather than `easeTo` on the marker's coordinate:
   * centring throws away the surroundings, which for a map is most of the
   * information. This moves the least amount that works, and not marked
   * `essential`, so a reduced-motion preference still turns the animation off.
   */
  private panIntoView(map: MapInstance): void {
    const bubble = this.contentEl?.closest('.maplibregl-popup') as HTMLElement | null;
    if (!bubble) return;
    const view = map.getCanvas().getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    // Breathing room, and it is also what keeps the bubble clear of the zoom
    // and attribution controls sitting in the frame's corners.
    const pad = 12;

    let dx = 0;
    let dy = 0;
    if (box.left < view.left + pad) dx = box.left - (view.left + pad);
    else if (box.right > view.right - pad) dx = box.right - (view.right - pad);
    if (box.top < view.top + pad) dy = box.top - (view.top + pad);
    else if (box.bottom > view.bottom - pad) dy = box.bottom - (view.bottom - pad);

    /*
     * A bubble taller or wider than the frame cannot be fully shown, and
     * pulling both edges in fights itself — each correction re-breaks the other.
     * Showing the TOP is the useful half: that is where the title is.
     */
    if (box.height > view.height - pad * 2) dy = box.top - (view.top + pad);
    if (box.width > view.width - pad * 2) dx = box.left - (view.left + pad);

    if (dx || dy) map.panBy([dx, dy]);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!this.popup || !this.host) return;
    // Only meaningful while open — the bubble does not exist otherwise, and
    // `show` applies the floors on every open anyway.
    if (changed.has('minWidth') || changed.has('minHeight')) this.applySize();
    if (changed.has('lngLat')) this.popup.setLngLat(this.lngLat);
    if (changed.has('open')) {
      if (this.open) {
        this.host.whenReady().then(({ map }) => this.show(map)).catch(() => {});
      } else if (this.popup.isOpen()) {
        this.popup.remove();
      }
    }
  }

  /* Renders nothing: the content moved into the engine's bubble, and this element
     remains as the addressable handle you set `open` and `lng-lat` on. */
  render() {
    return html``;
  }

  static styles = css`
    :host {
      display: none;
    }
  `;
}

if (!customElements.get('esa-map-popup')) {
  customElements.define('esa-map-popup', EsaMapPopup);
}
