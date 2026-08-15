import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/** The label and value composites at each step of the control ramp. See
    the FORMS header in component-tokens.css for why the letters do not line up. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

/**
 * esa-textarea — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-textarea (a ControlValueAccessor that
 * composed esa-form-field around a native <textarea>, with optional auto-resize).
 * Field chrome (label / help / error) is rendered inline so the element is
 * self-contained and portable.
 *
 * Form participation: form-associated element + ElementInternals.setFormValue on
 * every input, plus a bubbling/composed 'change' CustomEvent. The adjustHeight()
 * auto-resize logic is preserved verbatim. Decorator-free on purpose.
 */
export class EsaTextarea extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    placeholder: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    rows: { type: Number },
    autoResize: { type: Boolean, attribute: 'auto-resize', reflect: true },
    maxRows: { type: Number, attribute: 'max-rows' },
    value: { type: String },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare placeholder: string;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare rows: number;
  declare autoResize: boolean;
  declare maxRows: number;
  declare value: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.size = 'md';
    this.placeholder = '';
    this.helpText = '';
    this.errorText = '';
    this.required = false;
    this.disabled = false;
    this.rows = 3;
    this.autoResize = false;
    this.maxRows = 10;
    this.value = '';
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(this.value);
  }

  // A value set from SCRIPT (el.value = '…') has to reach the form too. Only the
  // input handler used to call setFormValue, so a programmatically filled field
  // rendered the text and submitted an empty string.
  updated(changed: Map<string, unknown>): void {
    if (changed.has('value')) this.internals.setFormValue(this.value);
    this.syncValidity();
  }

  /**
   * Constraint validation. `required` has to actually BLOCK submission, not just
   * draw an asterisk and set aria-required — a required field the form happily
   * submits empty is a promise the component does not keep.
   */
  private syncValidity(): void {
    if (!this.required || this.value) {
      this.internals.setValidity({});
      return;
    }
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Enter ${this.label}.` : 'Fill out this field.',
      this.textareaEl ?? undefined,
    );
  }

  private get textareaEl(): HTMLTextAreaElement | null {
    return this.renderRoot?.querySelector('textarea') ?? null;
  }

  private onInput = (event: Event): void => {
    this.value = (event.target as HTMLTextAreaElement).value;
    this.internals.setFormValue(this.value);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
    if (this.autoResize) this.adjustHeight();
  };

  /** Adjusts the textarea height based on content, capped at maxRows. */
  private adjustHeight(): void {
    const textarea = this.textareaEl;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = this.maxRows * lineHeight;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }

  render() {
    const hasError = !!this.errorText;
    return html`
      <div class="field ${hasError ? 'field--error' : ''} ${this.autoResize ? 'field--auto' : ''}">
        ${this.label
          ? html`<label class="label typography-${LABEL_TYPE[this.size]}" for="input"
              >${this.label}${this.required
                ? html`<span class="required" aria-label="required">*</span>`
                : null}</label
            >`
          : null}
        <textarea
          id="input"
          class="input typography-${VALUE_TYPE[this.size]}"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          rows=${this.rows}
          aria-invalid=${hasError ? 'true' : 'false'}
          @input=${this.onInput}
        ></textarea>
        ${hasError
          ? html`<p class="error typography-body-sm">${this.errorText}</p>`
          : this.helpText
            ? html`<p class="help typography-body-sm">${this.helpText}</p>`
            : null}
      </div>
    `;
  }

  static styles = [
    typography,
    css`
    :host {
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--form-radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #e5e5e5);
      display: block;
    }
    /* Geometry only — type comes from the composite classes named in render(). */
    :host([size='xs']) {
      --_field-padding-y: var(--spacing-200, 0.5rem);
      --_field-padding-x: var(--spacing-200, 0.5rem);
      --_field-radius: var(--form-radius-xs, 0.25rem);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--spacing-250, 0.625rem);
      --_field-padding-x: var(--spacing-250, 0.625rem);
      --_field-radius: var(--form-radius-sm, 0.25rem);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--spacing-400, 1rem);
      --_field-padding-x: var(--spacing-400, 1rem);
      --_field-radius: var(--form-radius-lg, 0.5rem);
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .label {
      color: var(--form-label-color, #171717);
      margin-block-end: var(--form-label-gap, 4px);
    }
    .required {
      color: var(--color-content-danger, #ce2c31);
      margin-inline-start: 2px;
    }

    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      /* The one element here that KEEPS real leading. --form-line-height is gone —
         it existed to force 1.6 onto single-line boxes that now use 1 — but a
         textarea is genuinely multi-line prose, and its rows attribute budgets
         height off this. body-md/lg lead at relaxed (1.8), which is looser than a
         field wants, so it reads the normal rung directly. */
      line-height: var(--typography-body-sm-line-height, 1.6);
      color: var(--form-text-color, #171717);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      resize: vertical;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }
    /* Hover moves the BORDER, not the fill — the field is transparent in every
       state so that it is the colour of whatever contains it.
       --form-border-color-hover already existed for exactly this and was wired
       into one component; it is the family treatment now. */
    .input:hover:not(:disabled) {
      --_field-border-color: var(--form-border-color-hover, #bbbbbb);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
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

    .field--auto .input {
      resize: none;
      overflow: hidden;
    }

    .field--error .input {
      --_field-border-color: var(--form-error-border-color, #ef4444);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 var(--focus-ring-width) var(--form-error-border-color, #ef4444);
    }

    /* Type comes from .typography-body-sm on the element. */
    .help,
    .error {
      margin: 0;
      margin-block-start: var(--form-help-gap, 4px);
    }
    .help {
      color: var(--form-help-color, #737373);
    }
    .error {
      color: var(--form-error-color, var(--color-content-danger, #ce2c31));
    }
  `,
  ];
}

if (!customElements.get('esa-textarea')) {
  customElements.define('esa-textarea', EsaTextarea);
}
