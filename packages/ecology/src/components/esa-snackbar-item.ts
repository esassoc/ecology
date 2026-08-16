import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

export type EsaSnackbarVariant = 'info' | 'success' | 'warning' | 'danger';

/**
 * esa-snackbar-item — a single toast [wc].
 *
 * Faithful translation of the Angular esa-snackbar-item. Renders one toast with
 * variant color, leading icon, message, optional action button, and optional
 * dismiss button. Inputs preserved as attributes/properties: message, variant,
 * action, dismissable.
 *
 * Emits `action` when the action button is pressed and `dismiss` when closed —
 * both bubbling/composed so a container (or any host) can react. Inline Lucide
 * SVGs per variant (info / circle-check / triangle-alert / circle-alert).
 */
export class EsaSnackbarItem extends LitElement {
  static properties = {
    message: { type: String },
    variant: { type: String, reflect: true },
    action: { type: String },
    dismissable: { type: Boolean },
    icon: { type: String },
  };

  /**
   * The completed action, in the past tense, naming the affected record where
   * there is one. e.g. "Saved.", "Item deleted.", "{name} turned on — saved".
   */
  declare message: string;
  declare variant: EsaSnackbarVariant;
  declare action: string;
  declare dismissable: boolean;
  declare icon: string;

  constructor() {
    super();
    this.message = '';
    this.variant = 'info';
    this.action = '';
    this.dismissable = true;
    this.icon = '';
  }

  private onAction = (): void => {
    this.dispatchEvent(new CustomEvent('action', { bubbles: true, composed: true }));
    this.dismiss();
  };

  dismiss = (): void => {
    this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true, composed: true }));
  };

  private renderIcon() {
    switch (this.variant) {
      case 'success':
        return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
      case 'warning':
        return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
      case 'danger':
        return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
      default:
        return html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
    }
  }

  render() {
    return html`
      <div class="esa-snackbar typography-body-md esa-snackbar--${this.variant}">
        <span class="esa-snackbar__icon">${this.renderIcon()}</span>
        <span class="esa-snackbar__message">${this.message}</span>
        ${this.action
          ? html`<button class="esa-snackbar__action typography-microcopy-sm-strong" @click=${this.onAction}>${this.action}</button>`
          : null}
        ${this.dismissable
          ? html`
              <button class="esa-snackbar__close" @click=${this.dismiss} aria-label="Dismiss">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            `
          : null}
      </div>
    `;
  }

  static styles = [
    typography,
    css`
    :host { display: block; }

    .esa-snackbar {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-radius: var(--snackbar-item-radius, var(--radius-surface, 0.5rem));
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      background: var(--color-background-default-knockout);
      color: var(--snackbar-item-color, var(--color-content-default-knockout, #ffffff));
      animation: esa-snackbar-enter var(--animation-overlay-enter, 250ms ease-out);
    }
    @keyframes esa-snackbar-enter {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .esa-snackbar--success { background: var(--snackbar-item-success-bg, var(--color-content-utility-success)); }
    .esa-snackbar--warning { background: var(--snackbar-item-warning-bg, var(--color-content-utility-warning)); }
    .esa-snackbar--danger { background: var(--snackbar-item-danger-bg, var(--color-content-utility-danger)); }
    .esa-snackbar--info { background: var(--snackbar-item-info-bg, var(--color-content-utility-info)); }

    .esa-snackbar__icon {
      flex-shrink: 0;
      display: inline-flex;
    }
    .esa-snackbar__message { flex: 1; }

    .esa-snackbar__action {
      /* One word ("Undo"). microcopy has no leading, so wrapping would collide. */
      white-space: nowrap;
      flex-shrink: 0;
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border: none;
      border-radius: var(--radius-control, 0.25rem);
      /* THE WHITE ALPHA IS CORRECT HERE AND SHOULD NOT BECOME A TOKEN.
         This button sits on FIVE different grounds — the knocked-out default
         plus the success, warning, danger and info fills below — and an alpha
         is the only value that lifts off all of them. A solid knocked-out grey
         would be right on one and wrong on four (a grey chip on a green bar).
         Checked when --color-background-elevation-raised-knockout was proposed;
         that token was dropped partly because this, its most obvious reader,
         did not want it. */
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
      /* UA reset, not a type role — a native button does not inherit the face. */
      font-family: inherit;
      cursor: pointer;
    }
    .esa-snackbar__action:hover { background: rgba(255, 255, 255, 0.3); }

    .esa-snackbar__close {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: var(--radius-control, 0.25rem);
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
    }
    .esa-snackbar__close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }
  `,
  ];
}

if (!customElements.get('esa-snackbar-item')) {
  customElements.define('esa-snackbar-item', EsaSnackbarItem);
}
