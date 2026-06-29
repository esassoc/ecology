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
  declare size: 'xs' | 'sm' | 'md' | 'lg';
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
    this.size = 'md';
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
      --_field-padding-y: var(--form-padding-y-md);
      --_field-padding-x: var(--form-padding-x-md);
      --_field-font-size: var(--form-font-size-md);
      --_field-height: var(--form-height-md);
      --_field-radius: var(--form-radius-md);
      --_field-border-color: var(--form-border-color);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs);
      --_field-padding-x: var(--form-padding-x-xs);
      --_field-font-size: var(--form-font-size-xs);
      --_field-height: var(--form-height-xs);
      --_field-radius: var(--form-radius-xs);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm);
      --_field-padding-x: var(--form-padding-x-sm);
      --_field-font-size: var(--form-font-size-sm);
      --_field-height: var(--form-height-sm);
      --_field-radius: var(--form-radius-sm);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg);
      --_field-padding-x: var(--form-padding-x-lg);
      --_field-font-size: var(--form-font-size-lg);
      --_field-height: var(--form-height-lg);
      --_field-radius: var(--form-radius-lg);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100);
    }
    .field__label {
      font-family: var(--font-sans);
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium);
      color: var(--form-label-color);
    }
    .field__required {
      color: var(--color-danger);
      margin-left: 2px;
    }
    .field__help {
      font-size: var(--type-size-150);
      color: var(--form-help-color);
    }
    .field__error {
      font-size: var(--type-size-150);
      color: var(--form-error-color);
    }

    .input {
      width: 100%;
      height: var(--_field-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: var(--font-sans);
      font-size: var(--_field-font-size);
      color: var(--form-text-color);
      background: var(--form-bg);
      border: var(--form-border-width) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .input:disabled {
      background: var(--form-bg-disabled);
      opacity: 0.6;
      cursor: not-allowed;
    }
    .input::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity var(--transition-fast);
    }
    .input::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
    }

    .field--error .input {
      --_field-border-color: var(--form-border-color-error);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 2px var(--color-danger-border);
    }
  `;
}

if (!customElements.get('esa-date-picker')) {
  customElements.define('esa-date-picker', EsaDatePicker);
}
