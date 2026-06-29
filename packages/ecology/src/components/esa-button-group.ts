import { LitElement, html, css } from 'lit';

/**
 * esa-button-group — groups slotted <esa-button> elements with connected borders.
 * Faithful port of the Angular esa-button-group: `selectionMode` 'none' (visual
 * grouping) or 'single' (radio-like segmented control). Interactive selection +
 * `valueChange` output → Lit WC emitting a composed `change` event.
 *
 * Children are presentational esa-button.astro (plain <button>) projected via a
 * slot; in 'single' mode this element manages aria-pressed/selected on them.
 */
export class EsaButtonGroup extends LitElement {
  static properties = {
    selectionMode: { type: String, attribute: 'selection-mode' },
    size: { type: String, reflect: true },
    value: { type: String },
  };

  declare selectionMode: 'none' | 'single';
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare value: string;

  constructor() {
    super();
    this.selectionMode = 'none';
    this.size = 'md';
    this.value = '';
  }

  private onSlotClick = (event: Event): void => {
    if (this.selectionMode !== 'single') return;
    const btn = (event.target as HTMLElement).closest('button, [data-value]') as HTMLElement | null;
    if (!btn || !this.contains(btn)) return;
    const v = btn.getAttribute('data-value') ?? btn.textContent?.trim() ?? '';
    this.value = v;
    this.syncSelected();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: v }, bubbles: true, composed: true })
    );
  };

  /** Reflect the current value onto slotted children for styling/a11y. */
  private syncSelected(): void {
    const children = Array.from(this.children) as HTMLElement[];
    for (const child of children) {
      const v = child.getAttribute('data-value') ?? child.textContent?.trim() ?? '';
      const selected = this.selectionMode === 'single' && v === this.value;
      child.toggleAttribute('data-selected', selected);
      child.setAttribute('aria-pressed', String(selected));
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.addEventListener('click', this.onSlotClick);
    // sync once children are present
    requestAnimationFrame(() => this.syncSelected());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onSlotClick);
  }

  render() {
    return html`<slot @slotchange=${() => this.syncSelected()}></slot>`;
  }

  static styles = css`
    :host {
      --_group-radius: var(--form-radius-md);
      --_group-border: var(--color-border);
      display: inline-flex;
      align-items: stretch;
      border-radius: var(--_group-radius);
      overflow: hidden;
    }
    /* Connected borders: square the internal corners, divider between buttons. */
    ::slotted(esa-button),
    ::slotted(button) {
      border-radius: 0 !important;
      position: relative;
    }
    ::slotted(esa-button:first-child),
    ::slotted(button:first-child) {
      border-radius: var(--_group-radius) 0 0 var(--_group-radius) !important;
    }
    ::slotted(esa-button:last-child),
    ::slotted(button:last-child) {
      border-radius: 0 var(--_group-radius) var(--_group-radius) 0 !important;
    }
    ::slotted(esa-button:only-child),
    ::slotted(button:only-child) {
      border-radius: var(--_group-radius) !important;
    }
  `;
}

if (!customElements.get('esa-button-group')) {
  customElements.define('esa-button-group', EsaButtonGroup);
}
