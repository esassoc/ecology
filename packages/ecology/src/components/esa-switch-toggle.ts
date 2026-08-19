import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/**
 * esa-switch-toggle — GOLDEN INTERACTIVE PATTERN (Lit Web Component).
 *
 * Why a Web Component (not .astro): this needs real behavior — toggle, keyboard,
 * form participation. As a custom element it works in ANY stack (Astro, React,
 * Angular, plain HTML), which is the portable-interactivity layer of the hub.
 *
 * Faithful translation of the Angular esa-switch-toggle:
 *   - Angular signal inputs            → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host classes / size variants     → reflected attributes + :host() selectors
 *   - toggle() / onKeydown()           → same logic, same Space/Enter handling
 *
 * Decorator-free on purpose: avoids per-consumer tsconfig decorator flags.
 * Tokens reach inside shadow DOM because CSS custom properties inherit through it —
 * except class definitions, which is why the typography composites are adopted into
 * `static styles` and the label names a role instead of listing size and leading.
 */
export class EsaSwitchToggle extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    labelPosition: { type: String, attribute: 'label-position', reflect: true },
    checked: { type: Boolean, reflect: true },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare labelPosition: 'before' | 'after';
  declare checked: boolean;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.size = 'md';
    this.disabled = false;
    this.labelPosition = 'after';
    this.checked = false;
    this.internals = this.attachInternals();
  }

  /** Mirror initial value to the form on connect. */
  connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.checked ? 'on' : null);
    this.internals.ariaChecked = String(this.checked);
  }

  private toggle = (): void => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.syncFormValue();
    // Framework-agnostic equivalent of CVA's onChange: a bubbling, composed event.
    this.dispatchEvent(
      new CustomEvent('change', { detail: { checked: this.checked }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  };

  render() {
    const labelEl = this.label
      ? html`<span class="label typography-body-md" part="label">${this.label}</span>`
      : null;
    return html`
      <button
        type="button"
        class="root"
        role="switch"
        aria-checked=${this.checked}
        ?disabled=${this.disabled}
        @click=${this.toggle}
        @keydown=${this.onKeydown}
      >
        ${this.labelPosition === 'before' ? labelEl : null}
        <span class="track" part="track"><span class="thumb" part="thumb"></span></span>
        ${this.labelPosition === 'after' ? labelEl : null}
      </button>
    `;
  }

  /* `typography` FIRST so this component's own rules win on equal specificity — it
     carries the .typography-* composite classes across the shadow boundary. */
  static styles = [
    typography,
    css`
    :host {
      --_track-w: 40px;
      --_track-h: 22px;
      --_thumb: 18px;
      --_bg-off: var(--color-border-default-strong, #bbbbbb);
      --_bg-on: var(--color-background-brand, #46a758);
      --_thumb-color: var(--color-background-elevation-raised, #fcfcfc);
      display: inline-block;
    }
    :host([size='xs']) { --_track-w: 28px; --_track-h: 16px; --_thumb: 12px; }
    :host([size='sm']) { --_track-w: 32px; --_track-h: 18px; --_thumb: 14px; }
    :host([size='lg']) { --_track-w: 48px; --_track-h: 26px; --_thumb: 22px; }
    :host([disabled]) { opacity: 0.5; }

    .root {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 0.5rem);
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: var(--color-content-default, #202020);
      cursor: pointer;
    }
    .root:disabled { cursor: not-allowed; }

    .track {
      position: relative;
      flex: none;
      width: var(--_track-w);
      height: var(--_track-h);
      border-radius: var(--radius-pill, 9999px);
      background: var(--_bg-off);
      transition: background var(--transition-fast, 150ms ease);
    }
    :host([checked]) .track { background: var(--_bg-on); }

    .thumb {
      position: absolute;
      top: 50%;
      left: 2px;
      width: var(--_thumb);
      height: var(--_thumb);
      transform: translateY(-50%);
      border-radius: var(--radius-pill, 9999px);
      background: var(--_thumb-color);
      box-shadow: var(--elevation-1, 0 1px 4px rgba(0, 0, 0, 0.2));
      transition: left var(--transition-fast, 150ms ease);
    }
    :host([checked]) .thumb { left: calc(var(--_track-w) - var(--_thumb) - 2px); }

    .root:focus-visible .track {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    /* Type comes from .typography-body-md on the element, leading included — the
       role leads at normal, which is what a one-word label beside a 22px track
       wants. This carried a line-height override back when body-md was relaxed
       (1.8) and the row outgrew the track; the role moved, so the override went. */
  `,
  ];
}

if (!customElements.get('esa-switch-toggle')) {
  customElements.define('esa-switch-toggle', EsaSwitchToggle);
}
