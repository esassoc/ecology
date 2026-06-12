import { LitElement, html, css } from 'lit';

type ConfirmVariant = 'default' | 'danger' | 'warning';

/**
 * esa-confirm-dialog — confirmation modal [wc].
 *
 * Faithful translation of the Angular esa-confirm-dialog. In Angular this was
 * opened imperatively with EsaConfirmDialogData and resolved a boolean through
 * DialogRef. Here the same data is expressed as attributes/properties, and the
 * boolean result is delivered via a `confirm` / `cancel` CustomEvent plus a
 * convenient `resolved` event carrying { confirmed: boolean }.
 *
 * Self-contained modal (own backdrop, Esc-to-cancel, focus trap, restore focus)
 * so it needs no esa-dialog dependency. Inline icon (✓ default / triangle / etc.)
 * keyed off the variant.
 */
export class EsaConfirmDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    message: { type: String },
    variant: { type: String, reflect: true },
    confirmLabel: { type: String, attribute: 'confirm-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    showIcon: { type: Boolean, attribute: 'show-icon' },
  };

  declare open: boolean;
  declare heading: string;
  declare message: string;
  declare variant: ConfirmVariant;
  declare confirmLabel: string;
  declare cancelLabel: string;
  declare showIcon: boolean;

  private previousFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.message = '';
    this.variant = 'default';
    this.confirmLabel = 'Confirm';
    this.cancelLabel = 'Cancel';
    this.showIcon = true;
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
        requestAnimationFrame(() => {
          const root = this.renderRoot as ShadowRoot;
          root.querySelector<HTMLElement>('.esa-confirm-dialog__confirm')?.focus();
        });
      } else if (this.previousFocus) {
        this.previousFocus.focus?.();
        this.previousFocus = null;
      }
    }
  }

  show(): void {
    this.open = true;
  }

  private resolve(confirmed: boolean): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent(confirmed ? 'confirm' : 'cancel', { bubbles: true, composed: true }),
    );
    this.dispatchEvent(
      new CustomEvent('resolved', { detail: { confirmed }, bubbles: true, composed: true }),
    );
  }

  confirm = (): void => this.resolve(true);
  cancel = (): void => this.resolve(false);

  private onKeydown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    } else if (event.key === 'Tab') {
      const root = this.renderRoot as ShadowRoot;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('button:not([disabled])'),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = root.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  private icon() {
    if (!this.showIcon) return null;
    if (this.variant === 'danger') {
      return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
    }
    if (this.variant === 'warning') {
      return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
    }
    return html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
  }

  render() {
    if (!this.open) return html``;
    return html`
      <div class="esa-confirm-dialog__backdrop" @click=${this.cancel}></div>
      <div class="esa-confirm-dialog__panel">
        <div class="esa-confirm-dialog" role="alertdialog" aria-modal="true" aria-label=${this.heading}>
          <div class="esa-confirm-dialog__content">
            ${this.showIcon
              ? html`<div class="esa-confirm-dialog__icon esa-confirm-dialog__icon--${this.variant}">${this.icon()}</div>`
              : null}
            <h2 class="esa-confirm-dialog__title">${this.heading}</h2>
            <p class="esa-confirm-dialog__message">${this.message}</p>
          </div>
          <div class="esa-confirm-dialog__footer">
            <button class="esa-confirm-dialog__btn esa-confirm-dialog__btn--outline" @click=${this.cancel}>${this.cancelLabel}</button>
            <button
              class="esa-confirm-dialog__confirm esa-confirm-dialog__btn esa-confirm-dialog__btn--${this.variant === 'default' ? 'primary' : this.variant}"
              @click=${this.confirm}
            >${this.confirmLabel}</button>
          </div>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host { display: contents; }

    .esa-confirm-dialog__backdrop {
      position: fixed;
      inset: 0;
      background: var(--confirm-dialog-backdrop-bg, var(--color-backdrop, rgba(0, 0, 0, 0.5)));
      z-index: var(--z-modal-backdrop, 300);
    }
    .esa-confirm-dialog__panel {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 400);
      pointer-events: none;
    }
    .esa-confirm-dialog {
      pointer-events: auto;
      width: var(--confirm-dialog-width, 360px);
      max-width: calc(100vw - 2rem);
      background: var(--confirm-dialog-bg, var(--color-surface-elevated, #ffffff));
      border-radius: var(--confirm-dialog-radius, var(--radius-400, 0.75rem));
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
    }

    .esa-confirm-dialog__content {
      padding: var(--spacing-500, 1.5rem);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .esa-confirm-dialog__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-full, 9999px);
      margin-bottom: var(--spacing-300, 0.75rem);
    }
    .esa-confirm-dialog__icon--default {
      background: var(--color-info-subtle, #eff6ff);
      color: var(--color-info, #3b82f6);
    }
    .esa-confirm-dialog__icon--danger {
      background: var(--color-danger-subtle, #fef2f2);
      color: var(--color-danger, #ef4444);
    }
    .esa-confirm-dialog__icon--warning {
      background: var(--color-warning-subtle, #fffbeb);
      color: var(--color-warning, #f59e0b);
    }
    .esa-confirm-dialog__title {
      font-size: var(--type-size-400, 1.125rem);
      font-weight: var(--font-weight-semibold, 550);
      margin: 0 0 var(--spacing-150, 0.375rem);
      color: var(--confirm-dialog-color, var(--color-text-primary, #171717));
    }
    .esa-confirm-dialog__message {
      color: var(--confirm-dialog-color, var(--color-text-secondary, #525252));
      font-size: var(--type-size-200, 0.9375rem);
      line-height: var(--line-height-normal, 1.6);
      margin: 0;
    }

    .esa-confirm-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--spacing-500, 1.5rem);
      border-top: 1px solid var(--confirm-dialog-border-color, var(--color-border-light, #efefef));
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
    }

    .esa-confirm-dialog__btn {
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-radius: var(--radius-200, 0.5rem);
      font-family: inherit;
      font-size: var(--type-size-200, 0.9375rem);
      font-weight: var(--font-weight-medium, 450);
      cursor: pointer;
      border: 1px solid transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-confirm-dialog__btn:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .esa-confirm-dialog__btn--outline {
      background: transparent;
      border-color: var(--color-border-strong, #d4d4d4);
      color: var(--color-text-primary, #171717);
    }
    .esa-confirm-dialog__btn--outline:hover { background: var(--color-surface-sunken, #efefef); }
    .esa-confirm-dialog__btn--primary {
      background: var(--color-primary, #43608a);
      color: var(--color-text-inverse, #ffffff);
    }
    .esa-confirm-dialog__btn--primary:hover { background: var(--color-primary-hover, #39506f); }
    .esa-confirm-dialog__btn--danger {
      background: var(--color-danger, #ef4444);
      color: var(--color-text-inverse, #ffffff);
    }
    .esa-confirm-dialog__btn--danger:hover { background: #dc2626; }
    .esa-confirm-dialog__btn--warning {
      background: var(--color-warning, #f59e0b);
      color: var(--color-text-inverse, #ffffff);
    }
    .esa-confirm-dialog__btn--warning:hover { background: #d97706; }
  `;
}

if (!customElements.get('esa-confirm-dialog')) {
  customElements.define('esa-confirm-dialog', EsaConfirmDialog);
}
