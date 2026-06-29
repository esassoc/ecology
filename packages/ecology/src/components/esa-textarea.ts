import { LitElement, html, css } from 'lit';

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
          ? html`<label class="label" for="input"
              >${this.label}${this.required
                ? html`<span class="required" aria-label="required">*</span>`
                : null}</label
            >`
          : null}
        <textarea
          id="input"
          class="input"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          rows=${this.rows}
          aria-invalid=${hasError ? 'true' : 'false'}
          @input=${this.onInput}
        ></textarea>
        ${hasError
          ? html`<p class="error">${this.errorText}</p>`
          : this.helpText
            ? html`<p class="help">${this.helpText}</p>`
            : null}
      </div>
    `;
  }

  static styles = css`
    :host {
      --_field-padding-y: var(--form-padding-y-md);
      --_field-padding-x: var(--form-padding-x-md);
      --_field-font-size: var(--form-font-size-md);
      --_field-radius: var(--form-radius-md);
      --_field-border-color: var(--form-border-color);
      --_label-font-size: var(--type-size-200);
      display: block;
      font-family: var(--font-sans);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs);
      --_field-padding-x: var(--form-padding-x-xs);
      --_field-font-size: var(--form-font-size-xs);
      --_field-radius: var(--form-radius-xs);
      --_label-font-size: var(--type-size-050);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm);
      --_field-padding-x: var(--form-padding-x-sm);
      --_field-font-size: var(--form-font-size-sm);
      --_field-radius: var(--form-radius-sm);
      --_label-font-size: var(--type-size-150);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg);
      --_field-padding-x: var(--form-padding-x-lg);
      --_field-font-size: var(--form-font-size-lg);
      --_field-radius: var(--form-radius-lg);
      --_label-font-size: var(--type-size-300);
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .label {
      color: var(--form-label-color);
      font-weight: var(--font-weight-medium);
      font-size: var(--_label-font-size);
      margin-block-end: var(--form-label-gap);
    }
    .required {
      color: var(--color-danger-strong);
      margin-inline-start: 2px;
    }

    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: inherit;
      font-size: var(--_field-font-size);
      line-height: var(--form-line-height);
      color: var(--form-text-color);
      background: var(--form-bg);
      border: var(--form-border-width) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      resize: vertical;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }
    .input::placeholder {
      color: var(--form-placeholder-color);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus);
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
    }
    .input:disabled {
      background: var(--form-bg-disabled);
      opacity: 0.5;
      cursor: not-allowed;
    }

    .field--auto .input {
      resize: none;
      overflow: hidden;
    }

    .field--error .input {
      --_field-border-color: var(--form-border-color-error);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 var(--focus-ring-width) var(--form-border-color-error);
    }

    .help,
    .error {
      margin: 0;
      margin-block-start: var(--form-help-gap);
      font-size: var(--type-size-100);
    }
    .help {
      color: var(--form-help-color);
    }
    .error {
      color: var(--form-error-color);
    }
  `;
}

if (!customElements.get('esa-textarea')) {
  customElements.define('esa-textarea', EsaTextarea);
}
