import { LitElement, html, css, svg } from 'lit';

// Inlined Lucide icons (lucide.dev) to avoid an icon dependency.
const checkIcon = svg`<polyline points="20 6 9 17 4 12"></polyline>`;
const minusIcon = svg`<line x1="5" y1="12" x2="19" y2="12"></line>`;

/**
 * esa-checkbox — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-checkbox (a ControlValueAccessor with a
 * custom box, hidden native input, indeterminate state, and Space/Enter keyboard
 * toggling). The lucide-angular `check`/`minus` icons are inlined as SVG.
 *
 * Form participation: form-associated element + ElementInternals.setFormValue
 * ('on' when checked, null otherwise) + a bubbling/composed 'change' CustomEvent.
 * Keyboard: Space/Enter toggle. Decorator-free on purpose.
 */
export class EsaCheckbox extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    checked: { type: Boolean, reflect: true },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare indeterminate: boolean;
  declare checked: boolean;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.size = 'md';
    this.disabled = false;
    this.indeterminate = false;
    this.checked = false;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.checked ? 'on' : null);
    this.internals.ariaChecked = this.indeterminate ? 'mixed' : String(this.checked);
  }

  private toggle = (): void => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.syncFormValue();
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
    return html`
      <label class="wrapper" @keydown=${this.onKeydown}>
        <span
          class="box"
          role="checkbox"
          aria-checked=${this.indeterminate ? 'mixed' : String(this.checked)}
          aria-disabled=${String(this.disabled)}
          tabindex=${this.disabled ? -1 : 0}
          @click=${this.toggle}
        >
          ${this.indeterminate
            ? html`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${minusIcon}</svg>`
            : this.checked
              ? html`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${checkIcon}</svg>`
              : null}
        </span>
        ${this.label ? html`<span class="label">${this.label}</span>` : null}
      </label>
    `;
  }

  static styles = css`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--form-radius-md, 0.5rem);
      --_checkbox-font-size: var(--form-font-size-md, 0.9375rem);
      --_checkbox-icon-size: 16px;
      display: inline-block;
    }
    :host([size='xs']) {
      --_checkbox-size: 14px;
      --_checkbox-radius: var(--form-radius-xs, 0.25rem);
      --_checkbox-font-size: var(--form-font-size-xs, 0.8125rem);
      --_checkbox-icon-size: 10px;
    }
    :host([size='sm']) {
      --_checkbox-size: 16px;
      --_checkbox-radius: var(--form-radius-sm, 0.25rem);
      --_checkbox-font-size: var(--form-font-size-sm, 0.875rem);
      --_checkbox-icon-size: 12px;
    }
    :host([size='lg']) {
      --_checkbox-size: 24px;
      --_checkbox-radius: var(--form-radius-lg, 0.5rem);
      --_checkbox-font-size: var(--form-font-size-lg, 1.125rem);
      --_checkbox-icon-size: 20px;
    }
    :host([disabled]) .wrapper {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      cursor: pointer;
      user-select: none;
    }

    .box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_checkbox-size);
      height: var(--_checkbox-size);
      flex-shrink: 0;
      border: var(--form-border-width, 2px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--form-bg, #fff);
      color: var(--color-text-inverse, #fff);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #005862);
      box-shadow: 0 0 0 var(--focus-ring-width, 2px)
        var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    :host([checked]) .box,
    :host([indeterminate]) .box {
      background: var(--color-primary, #005862);
      border-color: var(--color-primary, #005862);
    }

    .label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_checkbox-font-size);
      color: var(--color-text-primary, #171717);
      line-height: 1.4;
    }
  `;
}

if (!customElements.get('esa-checkbox')) {
  customElements.define('esa-checkbox', EsaCheckbox);
}
