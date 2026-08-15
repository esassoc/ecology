import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/** Label is UI text (medium); the typed date is prose (regular). See
    the FORMS header in component-tokens.css for the step→rung mapping. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

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
    /** The name of the value being collected. */
    label: { type: String },
    size: { type: String, reflect: true },
    /**
     * An example of a well-formed value for this field — never an instruction,
     * never a substitute for the label. "e.g. 12-345-678."
     */
    placeholder: { type: String },
    min: { type: String },
    max: { type: String },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    /**
     * A constraint on what this field will accept — its format, source, or
     * limit. "As it appears on the permit." "Letters, numbers, hyphens." Never
     * reassurance addressed to the user, nor a restatement of the field's state.
     */
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
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
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

  // A value set from SCRIPT (el.value = '…') has to reach the form too. Only the
  // input handler used to call setFormValue, so a programmatically filled field
  // rendered the text and submitted an empty string.
  updated(changed: Map<string, unknown>): void {
    if (changed.has('value')) this.internals.setFormValue(this.value || null);
    this.syncValidity();
  }

  /**
   * Constraint validation. `required` has to actually BLOCK submission, not just
   * draw an asterisk and set aria-required — a required field the form happily
   * submits empty is a promise the component does not keep. `min`/`max` are left
   * to the native date input inside, which enforces them itself.
   */
  private syncValidity(): void {
    if (!this.required || this.value) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.input') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Enter ${this.label}.` : 'Enter a date.',
      anchor,
    );
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
          ? html`<label class="field__label typography-${LABEL_TYPE[this.size]}">
              ${this.label}${this.required ? html`<span class="field__required">*</span>` : null}
            </label>`
          : null}
        <input
          type="date"
          class="input typography-${VALUE_TYPE[this.size]}"
          .value=${this.value}
          ?disabled=${this.disabled}
          min=${this.min || ''}
          max=${this.max || ''}
          placeholder=${this.placeholder}
          aria-label=${this.label || 'Date'}
          @input=${this.onInput}
        />
        ${hasError
          ? html`<span class="field__error typography-body-sm">${this.errorText}</span>`
          : this.helpText
            ? html`<span class="field__help typography-body-sm">${this.helpText}</span>`
            : null}
      </div>
    `;
  }

  static styles = [
    typography,
    css`
    :host {
      display: block;
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--spacing-200, 0.5rem);
      --_field-padding-x: var(--spacing-200, 0.5rem);
      --_field-radius: var(--form-radius-xs, 4px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--spacing-250, 0.625rem);
      --_field-padding-x: var(--spacing-250, 0.625rem);
      --_field-radius: var(--form-radius-sm, 6px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--spacing-400, 1rem);
      --_field-padding-x: var(--spacing-400, 1rem);
      --_field-radius: var(--form-radius-lg, 10px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    /* Type comes from the composite class on the element. */
    .field__label {
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-content-danger, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      color: var(--form-help-color, #737373);
    }
    .field__error {
      color: var(--form-error-color, #ef4444);
    }

    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      line-height: var(--line-height-none, 1);
      color: var(--form-text-color, #171717);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    .input:disabled {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
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
      --_field-border-color: var(--form-error-border-color, #ef4444);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 2px var(--color-border-danger, rgba(211, 47, 47, 0.25));
    }
  `,
  ];
}

if (!customElements.get('esa-date-picker')) {
  customElements.define('esa-date-picker', EsaDatePicker);
}
