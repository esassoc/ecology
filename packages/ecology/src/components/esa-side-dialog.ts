import { LitElement, html, css } from 'lit';

/**
 * esa-side-dialog — a slide-in drawer / side sheet (Ecology's first).
 * Aligned to Beacon's ui-side-dialog. Same modal mechanics as esa-dialog
 * (own backdrop, focus trap, Esc-to-close, focus restore) but the panel is
 * full-height and fixed to a side edge, sliding in/out.
 *
 * Slot the body as default content; footer into slot="footer".
 * Decorator-free Lit; self-register guard at the bottom.
 */
export class EsaSideDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    position: { type: String, reflect: true },
    size: { type: String, reflect: true },
    showCloseButton: { type: Boolean, attribute: 'show-close-button' },
  };

  declare open: boolean;
  declare heading: string;
  declare position: 'left' | 'right';
  declare size: 'sm' | 'md' | 'lg';
  declare showCloseButton: boolean;
  private previousFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.position = 'right';
    this.size = 'md';
    this.showCloseButton = true;
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      if (this.open) {
        this.previousFocus = document.activeElement as HTMLElement;
        requestAnimationFrame(() => this.focusFirst());
      } else if (changed.get('open')) {
        this.previousFocus?.focus?.();
      }
    }
  }

  show(): void {
    this.open = true;
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  };

  private focusable(): HTMLElement[] {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    const inShadow = this.renderRoot.querySelectorAll<HTMLElement>(sel);
    const slotted = Array.from(this.querySelectorAll<HTMLElement>(sel));
    return [...Array.from(inShadow), ...slotted].filter((el) => el.offsetParent !== null);
  }

  private focusFirst(): void {
    const items = this.focusable();
    if (items.length) items[0].focus();
    else (this.renderRoot.querySelector('.panel') as HTMLElement)?.focus();
  }

  private trapFocus(event: KeyboardEvent): void {
    const items = this.focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = (this.renderRoot.activeElement || document.activeElement) as HTMLElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  render() {
    if (!this.open) return html``;
    const hasHeaderSlot = !!this.querySelector('[slot="header"]');
    const hasHeader = this.heading || this.showCloseButton || hasHeaderSlot;
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <div
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-label=${this.heading || 'Side dialog'}
        tabindex="-1"
        @keydown=${this.onKeydown}
      >
        ${hasHeader
          ? html`<header class="header">
              <slot name="header"><h2 class="title">${this.heading}</h2></slot>
              ${this.showCloseButton
                ? html`<button class="close" @click=${this.close} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>`
                : null}
            </header>`
          : null}
        <div class="body"><slot></slot></div>
        <footer class="footer"><slot name="footer"></slot></footer>
      </div>
    `;
  }

  static styles = css`
    :host { --_width: 400px; }
    :host([size='sm']) { --_width: 320px; }
    :host([size='lg']) { --_width: 520px; }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
      animation: fade 150ms ease;
    }
    .panel {
      position: fixed;
      top: 0;
      bottom: 0;
      width: min(var(--_width), 100vw);
      display: flex;
      flex-direction: column;
      background: var(--color-surface, #fff);
      box-shadow: var(--shadow-400, 0 8px 32px -8px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      outline: none;
    }
    :host([position='right']) .panel { right: 0; animation: slide-right 200ms ease; }
    :host([position='left']) .panel { left: 0; animation: slide-left 200ms ease; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-400, 1rem) var(--spacing-500, 1.5rem);
      border-bottom: 1px solid var(--color-border, #e5e5e5);
      flex: none;
    }
    .title { margin: 0; font-size: var(--type-size-400, 1.25rem); font-weight: var(--font-weight-semibold, 600); color: var(--color-text-primary, #171717); }
    .close {
      display: grid; place-items: center; width: 32px; height: 32px;
      border: 0; border-radius: var(--radius-100, 4px); background: none;
      color: var(--color-text-muted, #737373); cursor: pointer;
    }
    .close:hover { background: var(--color-surface-sunken, #efefef); color: var(--color-text-primary, #171717); }
    .body { flex: 1; overflow-y: auto; padding: var(--spacing-500, 1.5rem); color: var(--color-text-secondary, #525252); }
    .footer { flex: none; padding: var(--spacing-400, 1rem) var(--spacing-500, 1.5rem); border-top: 1px solid var(--color-border, #e5e5e5); }
    .footer:not(:has(*)) { display: none; }

    @keyframes fade { from { opacity: 0; } }
    @keyframes slide-right { from { transform: translateX(100%); } }
    @keyframes slide-left { from { transform: translateX(-100%); } }
  `;
}

if (!customElements.get('esa-side-dialog')) {
  customElements.define('esa-side-dialog', EsaSideDialog);
}
