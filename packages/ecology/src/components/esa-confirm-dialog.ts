// `nothing` (not undefined) is what REMOVES an attribute — see esa-dialog's import.
import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { boolish } from '../boolish.js';

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
 * Built on the native <dialog> element (showModal), like esa-dialog — see that
 * file's header for why the hand-rolled backdrop/trap/focus-restore went away.
 * It needs no esa-dialog dependency. Inline icon (✓ default / triangle / etc.)
 * keyed off the variant.
 *
 * `role="alertdialog"` is kept on the native element: <dialog> maps to `dialog`,
 * and this one interrupts to demand an answer.
 */
export class EsaConfirmDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    message: { type: String },
    variant: { type: String, reflect: true },
    confirmLabel: { type: String, attribute: 'confirm-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    showIcon: { type: Boolean, attribute: 'show-icon', converter: boolish },
    // hub-edit-approved: user approved (2026-06-29) — confirm dialogs need an X close.
    showCloseButton: { type: Boolean, attribute: 'show-close-button' },
  };

  declare open: boolean;
  declare heading: string;
  declare message: string;
  declare variant: ConfirmVariant;
  declare confirmLabel: string;
  declare cancelLabel: string;
  declare showIcon: boolean;
  declare showCloseButton: boolean;

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.message = '';
    this.variant = 'default';
    this.confirmLabel = 'Confirm';
    this.cancelLabel = 'Cancel';
    this.showIcon = true;
    // hub-edit-approved: user approved (2026-06-29) — X close visible by default.
    this.showCloseButton = true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Light dismiss where `closedby` is missing (Safari). See esa-dialog.
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      this.addEventListener('click', this.onLightDismiss);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onLightDismiss);
  }

  private get dialogEl(): HTMLDialogElement | null {
    return (this.renderRoot as ShadowRoot).querySelector('dialog');
  }

  updated(changed: Map<string, unknown>): void {
    if (!changed.has('open')) return;
    const el = this.dialogEl;
    if (!el) return;
    if (this.open) {
      if (!el.open) el.showModal();
      // INITIAL FOCUS goes to Cancel, not Confirm. Until 2026-08-18 this focused
      // `.esa-confirm-dialog__confirm` unconditionally — including variant="danger",
      // where that button is the delete. Landing pre-focused on the destructive
      // choice turns a stray Enter into the thing the dialog exists to guard.
      requestAnimationFrame(() => {
        const root = this.renderRoot as ShadowRoot;
        root.querySelector<HTMLElement>('.esa-confirm-dialog__btn--outline')?.focus();
      });
    } else {
      el.close();
    }
  }

  /**
   * Native `close` fires for Esc and for platform close requests. Both are a
   * DISMISS here (aborted without answering), which is the distinction this
   * component's `dismissed` flag exists to carry — so it must not resolve as a
   * plain cancel. Guarded on `open` so our own resolve() paths do not re-enter.
   */
  private onNativeClose = (): void => {
    if (this.open) this.dismiss();
  };

  private onLightDismiss = (event: MouseEvent): void => {
    const el = this.dialogEl;
    if (!el || !this.open) return;
    if (event.composedPath()[0] !== el) return;
    const r = el.getBoundingClientRect();
    const inside =
      r.top <= event.clientY &&
      event.clientY <= r.top + r.height &&
      r.left <= event.clientX &&
      event.clientX <= r.left + r.width;
    if (!inside) this.dismiss();
  };

  show(): void {
    this.open = true;
  }

  // hub-edit-approved: user approved in conversation (2026-06-29) — confirm dialog
  // must distinguish a backdrop/Esc dismiss from an explicit cancel choice.
  private resolve(confirmed: boolean, dismissed = false): void {
    this.open = false;
    if (dismissed) {
      this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true, composed: true }));
    }
    this.dispatchEvent(
      new CustomEvent(confirmed ? 'confirm' : 'cancel', { bubbles: true, composed: true }),
    );
    this.dispatchEvent(
      new CustomEvent('resolved', {
        detail: { confirmed, dismissed },
        bubbles: true,
        composed: true,
      }),
    );
  }

  confirm = (): void => this.resolve(true);
  cancel = (): void => this.resolve(false);
  // Backdrop click / Esc — the user dismissed the dialog without answering.
  // Resolved as not-confirmed AND dismissed, so consumers can tell an abort
  // apart from an explicit "cancel" choice (the cancel button stays dismissed:false).
  dismiss = (): void => this.resolve(false, true);

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
    // NAME. This was `aria-label=${this.heading}` with `heading` defaulting to '',
    // so a confirm dialog opened without a heading shipped aria-label="" — an
    // alertdialog with NO accessible name at all, which is worse than having no
    // role. It now points at the real <h2> (same shadow root, so the IDREF
    // resolves) and falls back to a literal only when there is no heading to use.
    // hub-edit-approved: user approved (2026-06-29) — backdrop click is a dismiss, not a cancel choice.
    return html`
      <dialog
        class="esa-confirm-dialog"
        role="alertdialog"
        closedby="any"
        aria-labelledby=${this.heading ? 'esa-confirm-dialog-title' : nothing}
        aria-label=${this.heading ? nothing : 'Confirm'}
        aria-describedby=${this.message ? 'esa-confirm-dialog-message' : nothing}
        @close=${this.onNativeClose}
      >
        ${/* hub-edit-approved: user approved (2026-06-29) — X close button dismisses (abort, not submit). */ ''}
        ${this.showCloseButton
          ? html`<button
              class="esa-confirm-dialog__close"
              type="button"
              aria-label="Close"
              @click=${this.dismiss}
            ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`
          : null}
        <div class="esa-confirm-dialog__content">
          ${this.showIcon
            ? html`<div class="esa-confirm-dialog__icon esa-confirm-dialog__icon--${this.variant}">${this.icon()}</div>`
            : null}
          <h2 id="esa-confirm-dialog-title" class="esa-confirm-dialog__title typography-title">${this.heading}</h2>
          <p id="esa-confirm-dialog-message" class="esa-confirm-dialog__message typography-body-md">${this.message}</p>
        </div>
        <div class="esa-confirm-dialog__footer">
          <button class="esa-confirm-dialog__btn esa-confirm-dialog__btn--outline typography-label-md" @click=${this.cancel}>${this.cancelLabel}</button>
          <button
            class="esa-confirm-dialog__confirm esa-confirm-dialog__btn typography-label-md esa-confirm-dialog__btn--${this.variant === 'default' ? 'primary' : this.variant}"
            @click=${this.confirm}
          >${this.confirmLabel}</button>
        </div>
      </dialog>
    `;
  }

  static styles = [
    typography,
    css`
    :host { display: contents; }

    /* The backdrop and centering divs are gone — ::backdrop paints the scrim and
       the UA centers a modal <dialog> with 'margin: auto'. See esa-dialog. */
    /* hub-edit-approved: user approved (2026-06-29) — relative + close button styles. */
    dialog.esa-confirm-dialog {
      position: relative;
      border: none;
      padding: 0;
      margin: auto;
      width: var(--confirm-dialog-width, 360px);
      max-width: calc(100vw - 2rem);
      background: var(--color-background-elevation-floating, #fcfcfc);
      color: var(--color-content-default, #202020);
      border-radius: var(--radius-lg, 0.75rem);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
    }
    dialog.esa-confirm-dialog[open] { display: block; }
    /* Literal fallback is the real value where ::backdrop does not inherit. */
    dialog.esa-confirm-dialog::backdrop {
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
    }

    /* hub-edit-approved: user approved hub edits this session (2026-06-30) — on mobile
       the confirm dialog docks to the bottom as a full-width sheet, matching esa-dialog. */
    @media (max-width: 600px) {
      dialog.esa-confirm-dialog {
        margin: auto auto 0;
        width: 100%;
        max-width: 100%;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        animation: esa-confirm-sheet-in var(--animation-overlay-enter, 250ms ease-out);
      }
    }
    @keyframes esa-confirm-sheet-in {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .esa-confirm-dialog__close {
      position: absolute;
      top: var(--spacing-300, 0.75rem);
      right: var(--spacing-300, 0.75rem);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default-secondary, #646464);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
    }
    .esa-confirm-dialog__close:hover {
      background: var(--color-background-elevation-sunken, #f0f0f0);
      color: var(--color-content-default, #202020);
    }
    .esa-confirm-dialog__close:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
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
      border-radius: var(--radius-pill, 9999px);
      margin-bottom: var(--spacing-300, 0.75rem);
    }
    .esa-confirm-dialog__icon--default {
      background: var(--color-background-utility-info-subtle, #fbfdff);
      color: var(--color-content-utility-info, #0d74ce);
    }
    .esa-confirm-dialog__icon--danger {
      background: var(--color-background-utility-danger-subtle, #fffcfc);
      color: var(--color-content-utility-danger, #ce2c31);
    }
    .esa-confirm-dialog__icon--warning {
      background: var(--color-background-utility-warning-subtle, #fefdfb);
      color: var(--color-content-utility-warning, #ab6400);
    }
    .esa-confirm-dialog__title {
      margin: 0 0 var(--spacing-150, 0.375rem);
      color: var(--color-content-default, #202020);
    }
    .esa-confirm-dialog__message {
      color: var(--color-content-default-secondary, #646464);
      /* Leading comes from .typography-body-md. It carried an override back when
         body-md was relaxed (1.8); the role leads at normal now, so it went. */
      margin: 0;
    }

    .esa-confirm-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--spacing-500, 1.5rem);
      border-top: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
    }

    .esa-confirm-dialog__btn {
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-radius: var(--radius-md, 0.5rem);
      cursor: pointer;
      border: var(--border-width-default, 1px) solid transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-confirm-dialog__btn:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .esa-confirm-dialog__btn--outline {
      background: transparent;
      border-color: var(--color-border-default-strong, #bbbbbb);
      color: var(--color-content-default, #202020);
    }
    .esa-confirm-dialog__btn--outline:hover { background: var(--color-background-elevation-sunken, #f0f0f0); }
    .esa-confirm-dialog__btn--primary {
      background: var(--color-background-brand, #46a758);
      color: var(--color-content-default-knockout, #fcfcfc);
    }
    .esa-confirm-dialog__btn--primary:hover { background: var(--color-background-brand-hover, #3e9b4f); }
    .esa-confirm-dialog__btn--danger {
      background: var(--color-background-utility-danger, #ce2c31);
      color: var(--color-content-on-utility-danger, #fcfcfc);
    }
    .esa-confirm-dialog__btn--danger:hover { background: var(--color-background-utility-danger-hover, #641723); }
    /* Knockout text here measured 1.54:1 — yellow-9 is a bright scale, so the
       foreground is dark (7.21:1). This is the one intent whose fill does NOT move
       to step 11: yellow-11 under dark text drops to 2.47:1. */
    .esa-confirm-dialog__btn--warning {
      background: var(--color-background-utility-warning, #ffc53d);
      color: var(--color-content-on-utility-warning, #4f3422);
    }
    .esa-confirm-dialog__btn--warning:hover { background: var(--color-background-utility-warning-hover, #ffba18); }

    /* FORCED COLORS. box-shadow is forced to 'none', so the panel needs a real
       edge. The danger/warning BUTTONS lose their tint here too and there is no
       system colour that means "destructive" — the button's own label is what
       carries that, which is why confirm dialogs must never ship a bare "OK". */
    @media (forced-colors: active) {
      dialog.esa-confirm-dialog { border: 1px solid CanvasText; }
    }
  `,
  ];
}

if (!customElements.get('esa-confirm-dialog')) {
  customElements.define('esa-confirm-dialog', EsaConfirmDialog);
}
