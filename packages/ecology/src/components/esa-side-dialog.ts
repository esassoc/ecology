// `nothing` (not undefined) is what REMOVES an attribute — see esa-dialog's import.
import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { boolish } from '../boolish.js';

/**
 * esa-side-dialog — a slide-in drawer / side sheet (Ecology's first).
 * Aligned to Beacon's ui-side-dialog. Same modal mechanics as esa-dialog — the
 * native <dialog> element opened with showModal() — but the panel is full-height
 * and fixed to a side edge, sliding in/out.
 *
 * THE EXIT ANIMATION IS WHY THIS FILE IS NOT A STRAIGHT COPY OF esa-dialog. A
 * CSS-only exit (transition-behavior: allow-discrete + the `overlay` property)
 * would be tidier, but `overlay` is Chromium-only as of 2026-08, so in Firefox and
 * Safari the panel would vanish instantly instead of sliding. The pre-existing
 * `closing` flag + 200ms timer therefore stays, and the native close() is deferred
 * to the END of it.
 *
 * That deferral also fixes a real bug: the old code restored focus the moment
 * `open` went false, so for 200ms the visibly-open panel contained no focus and
 * the trigger behind the scrim did.
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
    showCloseButton: { type: Boolean, attribute: 'show-close-button', converter: boolish },
    // Internal: keeps the panel mounted through the slide-out so close animates.
    closing: { state: true },
  };

  declare open: boolean;
  declare heading: string;
  declare position: 'left' | 'right';
  declare size: 'sm' | 'md' | 'lg';
  declare showCloseButton: boolean;
  declare closing: boolean;
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

  connectedCallback(): void {
    super.connectedCallback();
    // Light dismiss where `closedby` is missing (Safari). Routed through close()
    // rather than the platform's own dismissal so the slide-out still plays.
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      this.addEventListener('click', this.onLightDismiss);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onLightDismiss);
    clearTimeout(this.closeTimer);
  }

  private get dialogEl(): HTMLDialogElement | null {
    return (this.renderRoot as ShadowRoot).querySelector('dialog');
  }

  updated(changed: Map<string, unknown>): void {
    // `closing` matters as much as `open` here: the native dialog must stay open
    // (and therefore in the top layer, and therefore still painting) for the whole
    // slide-out. It is closed for real only once `closing` falls back to false.
    if (!changed.has('open') && !changed.has('closing')) return;
    const el = this.dialogEl;
    if (!el) return;
    const shouldBeOpen = this.open || this.closing;
    if (shouldBeOpen && !el.open) el.showModal();
    else if (!shouldBeOpen && el.open) el.close();
  }

  show(): void {
    clearTimeout(this.closeTimer);
    this.closing = false;
    this.open = true;
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    // Stay mounted for the slide-out, then let updated() call the native close()
    // — which is also what restores focus, so focus lands on the trigger exactly
    // when the panel finishes leaving rather than 200ms before it.
    this.closing = true;
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closing = false;
    }, 200);
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  /**
   * Esc and light dismiss both arrive as a "close request" that fires `cancel`.
   * We preventDefault and run our own close() so the exit animation plays; without
   * this the platform tears the dialog out of the top layer on the same frame and
   * the slide-out never renders.
   */
  private onCancel = (event: Event): void => {
    event.preventDefault();
    this.close();
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
    if (!inside) this.close();
  };

  render() {
    const hasHeaderSlot = !!this.querySelector('[slot="header"]');
    const hasHeader = this.heading || this.showCloseButton || hasHeaderSlot;
    const closing = this.closing && !this.open;
    const slottedHeader = this.querySelector('[slot="header"]')?.textContent?.trim();
    return html`
      <dialog
        class="panel ${closing ? 'is-closing' : ''}"
        closedby="any"
        aria-labelledby=${this.heading ? 'esa-side-dialog-title' : nothing}
        aria-label=${this.heading ? nothing : slottedHeader || 'Side dialog'}
        @cancel=${this.onCancel}
      >
        ${hasHeader
          ? html`<header class="header typography-title">
              <slot name="header"><h2 id="esa-side-dialog-title" class="title typography-title">${this.heading}</h2></slot>
              ${this.showCloseButton
                ? html`<button class="close" @click=${this.close} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>`
                : null}
            </header>`
          : null}
        <div class="body typography-body-md"><slot></slot></div>
        <footer class="footer typography-label-md"><slot name="footer"></slot></footer>
      </dialog>
    `;
  }

  static styles = [
    typography,
    css`
    :host { --_width: var(--side-dialog-width, 400px); }
    :host([size='sm']) { --_width: var(--side-dialog-width-sm, 320px); }
    :host([size='lg']) { --_width: var(--side-dialog-width-lg, 520px); }

    /* ::backdrop replaces the hand-rolled .backdrop div. The var() may not resolve
       here — ::backdrop does not inherit custom properties from its originating
       element in every engine — but --side-dialog-backdrop-filter's declared
       default IS 'none' (component-tokens.css), so the fallback and the default
       agree and the only thing at stake is whether an opt-in frost applies in an
       older engine. Keep the literal fallbacks in step with the token defaults. */
    dialog.panel::backdrop {
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
      backdrop-filter: var(--side-dialog-backdrop-filter, none);
      -webkit-backdrop-filter: var(--side-dialog-backdrop-filter, none);
      animation: fade var(--animation-enter, 150ms ease-out);
    }
    dialog.panel.is-closing::backdrop { animation: fade-out var(--animation-exit, 150ms ease-in) forwards; }

    /* Inset floating panel (matches Beacon prod .ui-side-dialog): 16px gap on the
       top / bottom / anchored side, rounded corners. --_inset is overridable.
       'position: fixed' with explicit insets overrides the UA's centering margin;
       the UA's border/padding and its 'max-width/max-height: calc(100% - 6px - 2em)'
       have to be cleared or they clamp this panel inside a second, smaller box. */
    dialog.panel {
      --_inset: var(--side-dialog-inset, 16px);
      position: fixed;
      top: var(--_inset);
      bottom: var(--_inset);
      margin: 0;
      border: none;
      padding: 0;
      width: min(var(--_width), calc(100vw - var(--_inset) * 2));
      max-width: none;
      max-height: none;
      background: var(--color-background-elevation-raised, #fcfcfc);
      color: var(--color-content-default, #202020);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-5, 0 8px 32px -8px rgba(0, 0, 0, 0.2));
      outline: none;
      overflow: hidden;
      /* Hosts may re-point --side-dialog-inset while open (e.g. card-stacking a
         second dialog on top) — ease the reposition instead of jumping. */
      transition: top 220ms ease, right 220ms ease, bottom 220ms ease, left 220ms ease;
    }
    dialog.panel[open] { display: flex; flex-direction: column; }
    :host([position='right']) dialog.panel { right: var(--_inset); animation: slide-right var(--animation-overlay-enter, 250ms ease-out); }
    :host([position='left']) dialog.panel { left: var(--_inset); animation: slide-left var(--animation-overlay-enter, 250ms ease-out); }
    /* Exit: keep the end state so it doesn't flash back before unmounting. */
    :host([position='right']) dialog.panel.is-closing { animation: slide-out-right var(--animation-overlay-exit, 200ms ease-in) forwards; }
    :host([position='left']) dialog.panel.is-closing { animation: slide-out-left var(--animation-overlay-exit, 200ms ease-in) forwards; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-400, 1rem) var(--spacing-500, 1.5rem);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      flex: none;
    }
    .title { margin: 0; color: var(--color-content-default, #202020); }
    .close {
      display: grid; place-items: center; width: 32px; height: 32px;
      border: 0; border-radius: var(--radius-sm, 0.25rem); background: none;
      color: var(--color-content-default-muted, #838383); cursor: pointer;
    }
    .close:hover { background: var(--color-background-elevation-sunken, #f0f0f0); color: var(--color-content-default, #202020); }
    .body { flex: 1; overflow-y: auto; padding: var(--spacing-500, 1.5rem); color: var(--color-content-default-secondary, #646464); }
    .footer { flex: none; padding: var(--spacing-400, 1rem) var(--spacing-500, 1.5rem); border-top: var(--border-width-default, 1px) solid var(--color-border-default, #cecece); }
    .footer:not(:has(*)) { display: none; }

    @keyframes fade { from { opacity: 0; } }
    @keyframes fade-out { to { opacity: 0; } }
    /* Offset by the inset so the panel fully clears the viewport edge. */
    @keyframes slide-right { from { transform: translateX(calc(100% + var(--_inset))); } }
    @keyframes slide-left { from { transform: translateX(calc(-100% - var(--_inset))); } }
    @keyframes slide-out-right { to { transform: translateX(calc(100% + var(--_inset))); } }
    @keyframes slide-out-left { to { transform: translateX(calc(-100% - var(--_inset))); } }

    /* FORCED COLORS. This panel floats with a 16px inset on all four sides, so
       losing --elevation-5 leaves it with no edge at all against the scrim.
       Width is 'min(--_width, 100vw - inset*2)' on a content-box element; the
       border is inside the query so that clamp keeps holding in normal mode. */
    @media (forced-colors: active) {
      dialog.panel { border: 1px solid CanvasText; }
    }
  `,
  ];
}

if (!customElements.get('esa-side-dialog')) {
  customElements.define('esa-side-dialog', EsaSideDialog);
}
