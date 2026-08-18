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
 * Unique ids for tooltips, so `aria-describedby` resolves to the right one.
 * A module counter rather than a random string: it stays stable across a render
 * and is legible when debugging a tree of markers.
 */
let tipSeq = 0;

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
    label: { type: String },
    labelPosition: { type: String, attribute: 'label-position' },
    tooltip: { type: String },
    interactive: { type: Boolean },
  };

  /** Where the marker sits, `[lng, lat]`. Longitude first, as in GeoJSON. */
  declare lngLat: LngLat;
  /** Let the user move the pin. Emits `markermove` when they let go. */
  declare draggable: boolean;
  /** Grows the default pin, and reflected so page CSS can react. */
  declare selected: boolean;
  /** Which part of the marker sits on the coordinate. */
  declare anchor: 'center' | 'top' | 'bottom' | 'left' | 'right';
  /**
   * A caption rendered beside the pin, always visible.
   *
   * A LABEL AND A TOOLTIP ARE NOT THE SAME CONTROL, and choosing by "how much
   * room do I have" gets it wrong. A label is part of the map's information —
   * it is readable without interacting, it is there for someone who cannot
   * hover, and it costs space on every pin whether or not anyone wants it. Use
   * it when the name IS the point (a few named sites). A tooltip is a
   * progressive disclosure for a pin whose identity is otherwise a guess.
   *
   * The label is rendered and styled by `esa-map`, which owns the shadow root
   * this ends up in — hand-rolling it as slotted content means writing the
   * positioning yourself AND discovering that page CSS cannot reach it.
   */
  declare label: string;
  /** Which side of the pin the label sits on. */
  declare labelPosition: 'bottom' | 'top' | 'left' | 'right';
  /**
   * Text shown on hover AND on focus.
   *
   * Setting it makes the marker interactive, because a hover-only tooltip is
   * unreachable by keyboard — SC 2.1.1, Level A. It is also dismissible with
   * Escape while the pointer stays put, which is the part of SC 1.4.13 that
   * hand-rolled tooltips almost always miss.
   */
  declare tooltip: string;
  /**
   * Make the pin a real focus target with `role="button"` and Enter/Space.
   *
   * IMPLIED, not usually written: a marker with a `tooltip`, or with a nested
   * `esa-map-popup`, is interactive by definition and turns this on itself. It
   * exists as a prop for the marker whose click is handled by the page, which
   * this component cannot detect — a `click` listener is invisible to it.
   *
   * It is NOT applied when slotted content already contains something
   * focusable: that would nest one interactive control inside another, which
   * axe flags and screen readers announce as a single confused control. The
   * author's own button wins.
   */
  declare interactive: boolean;

  private host: MapHost | null = null;
  private marker: MarkerInstance | null = null;
  /** The element the ENGINE owns and positions. Never this component. */
  private contentEl: HTMLDivElement | null = null;
  private tipEl: HTMLSpanElement | null = null;
  private tipVisible = false;

  constructor() {
    super();
    this.lngLat = [0, 0];
    this.draggable = false;
    this.selected = false;
    this.anchor = 'bottom';
    this.label = '';
    this.labelPosition = 'bottom';
    this.tooltip = '';
    this.interactive = false;
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
    this.decorate(el);
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

  /**
   * Add the label, the tooltip, and keyboard access to the engine-owned div.
   *
   * All of it goes HERE rather than into slotted content, because this div ends
   * up in `esa-map`'s shadow root: the host's stylesheet is the only thing that
   * can style it, and `aria-describedby` only resolves between elements in the
   * same root. A hand-rolled label is the author writing positioning by hand and
   * then discovering their CSS does not apply.
   */
  private decorate(el: HTMLDivElement): void {
    if (this.label) {
      const label = document.createElement('span');
      label.className =
        `esa-marker__label esa-marker__label--${this.labelPosition} typography-label-xs`;
      label.textContent = this.label;
      /*
       * Hidden from assistive tech when the pin is interactive, because the
       * label is already the pin's accessible NAME there — exposing both makes
       * a screen reader read the place twice. A non-interactive marker is not
       * announced at all, so the text has to stay in the tree.
       */
      if (this.isInteractive()) label.setAttribute('aria-hidden', 'true');
      el.appendChild(label);
    }

    if (this.tooltip) {
      const tip = document.createElement('span');
      tip.className = 'esa-marker__tip typography-label-xs';
      tip.id = `esa-marker-tip-${++tipSeq}`;
      /*
       * The tooltip text is folded into the pin's NAME rather than referenced
       * as a description, so it is marked away from assistive tech here.
       *
       * A description is the wrong slot for it. `label` is a category
       * ("Landmark") repeated across every pin, so a name of `label` alone
       * identifies nothing — three pins all called "Landmark, button" — and a
       * description is announced late, or not at all depending on verbosity
       * settings. The tooltip carries the only text that says WHICH pin this
       * is, so it belongs in the name. See `accessibleName`.
       */
      tip.setAttribute('aria-hidden', 'true');
      tip.textContent = this.tooltip;
      el.appendChild(tip);
      this.tipEl = tip;
      // Focus as well as hover: a tooltip only a pointer can reach is SC 2.1.1.
      for (const evt of ['pointerenter', 'focus']) {
        el.addEventListener(evt, () => this.showTip(true));
      }
      for (const evt of ['pointerleave', 'blur']) {
        el.addEventListener(evt, () => this.showTip(false));
      }
      /*
       * Escape dismisses it WITHOUT moving the pointer, which is the half of
       * SC 1.4.13 hand-rolled tooltips miss. Stopped here so it does not also
       * close a dialog the map happens to sit inside.
       */
      el.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key !== 'Escape' || !this.tipVisible) return;
        e.stopPropagation();
        this.showTip(false);
      });
    }

    if (!this.isInteractive()) return;
    /*
     * `role="button"` on the wrapper rather than a real <button> element
     * wrapping the content: wrapping would put the author's slotted markup
     * inside a control they did not write, and a slotted link or button would
     * become a nested interactive. The cost is that forced-colors gives this no
     * system styling — hence the explicit border in `esa-map`'s stylesheet.
     */
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const name = this.accessibleName();
    if (name) el.setAttribute('aria-label', name);
    else {
      console.warn(
        '[esa-map-marker] interactive with no `label`, `tooltip` or aria-label. It will ' +
          'announce as an unnamed button — a pin on a map has no text of its own to fall ' +
          'back to.',
      );
    }
    el.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      if (key !== 'Enter' && key !== ' ') return;
      // Space scrolls the page otherwise, which moves the map out from under
      // the user at the moment they act on it.
      e.preventDefault();
      el.click();
    });
  }

  /**
   * What an interactive pin announces as.
   *
   * The VISIBLE label leads, which is SC 2.5.3 (Label in Name): someone saying
   * "click Landmark" to a voice-control tool has to hit this. The tooltip
   * follows, because it is the part that says which pin. An explicit
   * `aria-label` on the element beats both — the author has said what they
   * want and this must not overwrite it.
   */
  private accessibleName(): string {
    const authored = this.getAttribute('aria-label');
    if (authored) return authored;
    if (this.label && this.tooltip) return `${this.label}: ${this.tooltip}`;
    return this.label || this.tooltip;
  }

  /**
   * Is this marker something a user acts on?
   *
   * A nested popup counts because it IS the interaction; a tooltip counts
   * because it has to be reachable by keyboard. A page-attached `click`
   * listener cannot be detected from here, which is what the explicit prop is
   * for. Slotted focusable content opts out — see `interactive`.
   */
  private isInteractive(): boolean {
    if (this.contentEl?.querySelector('a[href], button, input, select, textarea, [tabindex]')) {
      return false;
    }
    return this.interactive || !!this.tooltip || !!this.querySelector('esa-map-popup');
  }

  private showTip(visible: boolean): void {
    this.tipVisible = visible;
    this.tipEl?.classList.toggle('esa-marker__tip--visible', visible);
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
