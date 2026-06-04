import { LitElement, html, css } from 'lit';

/**
 * esa-dialog — modal dialog [wc].
 *
 * Faithful translation of the Angular esa-dialog (which used @angular/cdk/dialog
 * for the overlay/backdrop/focus-trap). Here those services are reimplemented in
 * plain JS so there is zero CDK dependency:
 *   - host renders its own fixed backdrop + centered panel
 *   - `open` attribute drives visibility
 *   - Esc closes, focus is trapped while open, and focus is restored on close
 *
 * Inputs preserved: title, show-close-button, size (xs|sm|md|lg|fullscreen).
 * Slot the body as default content; slot footer content into slot="footer".
 *
 * Decorator-free Lit (matches esa-switch-toggle golden pattern).
 */
export class EsaDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    showCloseButton: { type: Boolean, attribute: 'show-close-button' },
    size: { type: String, reflect: true },
  };

  declare open: boolean;
  declare heading: string;
  declare showCloseButton: boolean;
  declare size: 'xs' | 'sm' | 'md' | 'lg' | 'fullscreen';

  private previousFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.showCloseButton = true;
    this.size = 'md';
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKeydown);
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      if (this.open) {
        this.previousFocus = document.activeElement as HTMLElement;
        // Focus the first focusable element (or the panel) once rendered.
        requestAnimationFrame(() => this.focusFirst());
      } else if (this.previousFocus) {
        this.previousFocus.focus?.();
        this.previousFocus = null;
      }
    }
  }

  /** Open the dialog imperatively. */
  show(): void {
    this.open = true;
  }

  /** Close the dialog and emit a bubbling/composed `close` event. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private onKeydown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  };

  private focusable(): HTMLElement[] {
    const root = this.renderRoot as ShadowRoot;
    const panel = root.querySelector('.esa-dialog');
    if (!panel) return [];
    const nodes = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    // Include slotted (light DOM) focusables too.
    const slotted = Array.from(this.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    return [...Array.from(nodes), ...slotted].filter((el) => el.offsetParent !== null || el === this);
  }

  private focusFirst(): void {
    const items = this.focusable();
    if (items.length) {
      items[0].focus();
    } else {
      const panel = (this.renderRoot as ShadowRoot).querySelector<HTMLElement>('.esa-dialog');
      panel?.focus();
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const items = this.focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = (this.renderRoot as ShadowRoot).activeElement || document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private onBackdropClick = (): void => {
    this.close();
  };

  render() {
    if (!this.open) return html``;
    const hasHeader = this.heading || this.showCloseButton || !!this.querySelector('[slot="header"]');
    return html`
      <div class="esa-dialog-backdrop" @click=${this.onBackdropClick}></div>
      <div class="esa-dialog-panel">
        <div class="esa-dialog" role="dialog" aria-modal="true" aria-label=${this.heading || 'Dialog'} tabindex="-1">
          ${hasHeader
            ? html`
                <div class="esa-dialog__header">
                  <slot name="header"><h2 class="esa-dialog__title">${this.heading}</h2></slot>
                  ${this.showCloseButton
                    ? html`
                        <button class="esa-dialog__close" @click=${this.close} aria-label="Close dialog">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      `
                    : null}
                </div>
              `
            : null}
          <div class="esa-dialog__body"><slot></slot></div>
          <div class="esa-dialog__footer"><slot name="footer"></slot></div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      --_dialog-bg: var(--color-surface-elevated, #ffffff);
      --_dialog-border-radius: var(--radius-400, 0.75rem);
      --_dialog-padding: var(--spacing-500, 1.5rem);
      --_dialog-header-border: var(--color-border-light, #efefef);
      --_dialog-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
      --_dialog-width: 480px;
      --_dialog-max-height: 85vh;
    }
    /* base :host = md (480px). xs is one step below sm. */
    :host([size='xs']) { --_dialog-width: 280px; }
    :host([size='sm']) { --_dialog-width: 360px; }
    :host([size='lg']) { --_dialog-width: 640px; }
    :host([size='fullscreen']) {
      --_dialog-width: 100vw;
      --_dialog-max-height: 100vh;
      --_dialog-border-radius: 0;
    }

    .esa-dialog-backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
    }
    .esa-dialog-panel {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 400);
      pointer-events: none;
    }

    .esa-dialog {
      pointer-events: auto;
      background: var(--_dialog-bg);
      border-radius: var(--_dialog-border-radius);
      box-shadow: var(--_dialog-shadow);
      width: var(--_dialog-width);
      max-width: 100vw;
      max-height: var(--_dialog-max-height);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
    }
    .esa-dialog:focus { outline: none; }

    .esa-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--_dialog-padding);
      border-bottom: 1px solid var(--_dialog-header-border);
      flex-shrink: 0;
    }
    .esa-dialog__title {
      font-size: var(--type-size-400, 1.125rem);
      font-weight: var(--font-weight-semibold, 550);
      margin: 0;
      color: var(--color-text-primary, #171717);
    }
    .esa-dialog__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-200, 0.5rem);
      background: transparent;
      color: var(--color-text-secondary, #525252);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-dialog__close:hover { background: var(--color-surface-sunken, #efefef); }
    .esa-dialog__close:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .esa-dialog__body {
      padding: var(--_dialog-padding);
      overflow-y: auto;
      flex: 1;
      color: var(--color-text-primary, #171717);
    }
    .esa-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--_dialog-padding);
      border-top: 1px solid var(--_dialog-header-border);
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
      flex-shrink: 0;
    }
    .esa-dialog__footer:not(:has(*)) { display: none; }
  `;
}

if (!customElements.get('esa-dialog')) {
  customElements.define('esa-dialog', EsaDialog);
}
