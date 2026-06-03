import { LitElement, html, css } from 'lit';

/**
 * esa-date-picker — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-date-picker:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - onInput / onBlur                 → same logic, native <input type="date">
 *
 * Decorator-free Lit. Wraps a native date input (calendar UI is the browser's).
 */
export class EsaDatePicker extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    placeholder: { type: String },
    min: { type: String },
    max: { type: String },
    disabled: { type: Boolean, reflect: true },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    required: { type: Boolean },
    value: { type: String },
  };

  declare label: string;
  declare size: 'small' | 'medium' | 'large';
  declare placeholder: string;
  declare min: string;
  declare max: string;
  declare disabled: boolean;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare value: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.size = 'medium';
    this.placeholder = 'Select date...';
    this.min = '';
    this.max = '';
    this.disabled = false;
    this.helpText = '';
    this.errorText = '';
    this.required = false;
    this.value = '';
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(this.value || null);
  }

  private onInput = (event: Event): void => {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.internals.setFormValue(val || null);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: val }, bubbles: true, composed: true })
    );
  };

  render() {
    const hasError = !!this.errorText;
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? html`<label class="field__label">
              ${this.label}${this.required ? html`<span class="field__required">*</span>` : null}
            </label>`
          : null}
        <input
          type="date"
          class="input"
          .value=${this.value}
          ?disabled=${this.disabled}
          min=${this.min || ''}
          max=${this.max || ''}
          placeholder=${this.placeholder}
          aria-label=${this.label || 'Date'}
          @input=${this.onInput}
        />
        ${hasError
          ? html`<span class="field__error">${this.errorText}</span>`
          : this.helpText
            ? html`<span class="field__help">${this.helpText}</span>`
            : null}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --_field-padding-y: var(--form-padding-y-medium, 8px);
      --_field-padding-x: var(--form-padding-x-medium, 12px);
      --_field-font-size: var(--form-font-size-medium, 14px);
      --_field-height: var(--form-height-medium, 40px);
      --_field-radius: var(--form-radius-medium, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }
    :host([size='small']) {
      --_field-padding-y: var(--form-padding-y-small, 4px);
      --_field-padding-x: var(--form-padding-x-small, 8px);
      --_field-font-size: var(--form-font-size-small, 12px);
      --_field-height: var(--form-height-small, 32px);
      --_field-radius: var(--form-radius-small, 6px);
    }
    :host([size='large']) {
      --_field-padding-y: var(--form-padding-y-large, 12px);
      --_field-padding-x: var(--form-padding-x-large, 16px);
      --_field-font-size: var(--form-font-size-large, 16px);
      --_field-height: var(--form-height-large, 48px);
      --_field-radius: var(--form-radius-large, 10px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-danger, #ef4444);
      margin-left: 2px;
    }
    .field__help {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
    .field__error {
      font-size: var(--type-size-150, 12px);
      color: var(--form-error-color, #ef4444);
    }

    .input {
      width: 100%;
      height: var(--_field-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #005862);
      box-shadow: 0 0 0 2px var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }
    .input:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
      cursor: not-allowed;
    }
    .input::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .input::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
    }

    .field--error .input {
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 2px var(--color-danger-border, rgba(211, 47, 47, 0.25));
    }
  `;
}

if (!customElements.get('esa-date-picker')) {
  customElements.define('esa-date-picker', EsaDatePicker);
}
