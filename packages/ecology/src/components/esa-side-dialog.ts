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
    // Internal: keeps the panel mounted through the slide-out so close animates.
    closing: { state: true },
  };

  declare open: boolean;
  declare heading: string;
  declare position: 'left' | 'right';
  declare size: 'sm' | 'md' | 'lg';
  declare showCloseButton: boolean;
  declare closing: boolean;
  private previousFocus: HTMLElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.position = 'right';
    this.size = 'md';
    this.showCloseButton = true;
    this.closing = false;
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
    clearTimeout(this.closeTimer);
    this.closing = false;
    this.open = true;
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    // Stay mounted for the slide-out, then unmount.
    this.closing = true;
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closing = false;
    }, 200);
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
    if (!this.open && !this.closing) return html``;
    const hasHeaderSlot = !!this.querySelector('[slot="header"]');
    const hasHeader = this.heading || this.showCloseButton || hasHeaderSlot;
    const closing = this.closing && !this.open;
    return html`
      <div class="backdrop ${closing ? 'is-closing' : ''}" @click=${this.close}></div>
      <div
        class="panel ${closing ? 'is-closing' : ''}"
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
    :host { --_width: var(--side-dialog-width); }
    :host([size='sm']) { --_width: var(--side-dialog-width-sm); }
    :host([size='lg']) { --_width: var(--side-dialog-width-lg); }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--side-dialog-backdrop-bg);
      /* Opt-in frosted backdrop — set --backdrop-filter (e.g. blur(4px)) on the host. */
      backdrop-filter: var(--backdrop-filter);
      -webkit-backdrop-filter: var(--backdrop-filter);
      z-index: var(--z-modal-backdrop);
      animation: fade 150ms ease;
    }
    /* Inset floating panel (matches Beacon prod .ui-side-dialog): 16px gap on the
       top / bottom / anchored side, rounded corners. --_inset is overridable. */
    .panel {
      --_inset: var(--side-dialog-inset);
      position: fixed;
      top: var(--_inset);
      bottom: var(--_inset);
      width: min(var(--_width), calc(100vw - var(--_inset) * 2));
      display: flex;
      flex-direction: column;
      background: var(--side-dialog-bg);
      border-radius: var(--side-dialog-radius);
      box-shadow: var(--shadow-400);
      z-index: var(--z-modal);
      outline: none;
      overflow: hidden;
      /* Hosts may re-point --side-dialog-inset while open (e.g. card-stacking a
         second dialog on top) — ease the reposition instead of jumping. */
      transition: top 220ms ease, right 220ms ease, bottom 220ms ease, left 220ms ease;
    }
    :host([position='right']) .panel { right: var(--_inset); animation: slide-right 220ms ease; }
    :host([position='left']) .panel { left: var(--_inset); animation: slide-left 220ms ease; }
    /* Exit: keep the end state so it doesn't flash back before unmounting. */
    :host([position='right']) .panel.is-closing { animation: slide-out-right 200ms ease forwards; }
    :host([position='left']) .panel.is-closing { animation: slide-out-left 200ms ease forwards; }
    .backdrop.is-closing { animation: fade-out 150ms ease forwards; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-300);
      padding: var(--spacing-400) var(--spacing-500);
      border-bottom: 1px solid var(--side-dialog-border-color);
      flex: none;
    }
    .title { margin: 0; font-size: var(--type-size-400); font-weight: var(--font-weight-semibold); color: var(--side-dialog-color, var(--color-text-primary)); }
    .close {
      display: grid; place-items: center; width: 32px; height: 32px;
      border: 0; border-radius: var(--radius-100); background: none;
      color: var(--color-text-muted); cursor: pointer;
    }
    .close:hover { background: var(--color-surface-sunken); color: var(--color-text-primary); }
    .body { flex: 1; overflow-y: auto; padding: var(--spacing-500); color: var(--side-dialog-color, var(--color-text-secondary)); }
    .footer { flex: none; padding: var(--spacing-400) var(--spacing-500); border-top: 1px solid var(--side-dialog-border-color); }
    .footer:not(:has(*)) { display: none; }

    @keyframes fade { from { opacity: 0; } }
    @keyframes fade-out { to { opacity: 0; } }
    /* Offset by the inset so the panel fully clears the viewport edge. */
    @keyframes slide-right { from { transform: translateX(calc(100% + var(--_inset))); } }
    @keyframes slide-left { from { transform: translateX(calc(-100% - var(--_inset))); } }
    @keyframes slide-out-right { to { transform: translateX(calc(100% + var(--_inset))); } }
    @keyframes slide-out-left { to { transform: translateX(calc(-100% - var(--_inset))); } }
  `;
}

if (!customElements.get('esa-side-dialog')) {
  customElements.define('esa-side-dialog', EsaSideDialog);
}
