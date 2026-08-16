import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';

// Lucide `circle-alert`, copied from ./icon-registry — see esa-text-field.ts for why
// a Lit component inlines the glyph rather than reaching for <EsaIcon>.
const alertIcon = html`<svg
  class="error__icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line
    x1="12"
    x2="12.01"
    y1="16"
    y2="16"
  />
</svg>`;

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
    minlength: { type: Number },
    maxlength: { type: Number },
    autocomplete: { type: String },
    liveError: { type: Boolean, attribute: 'live-error' },
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
  declare minlength: number | undefined;
  declare maxlength: number | undefined;
  /** Autofill hint. The only way to satisfy SC 1.3.5 Identify Input Purpose (AA). */
  declare autocomplete: string;
  /**
   * Announce the error the moment it appears rather than only on focus. Off by default —
   * see the long note on `esa-text-field.liveError` for why (the house pattern is
   * validate-on-submit with `<esa-error-summary>`, and a live region per field races it).
   */
  declare liveError: boolean;

  private internals: ElementInternals;
  private warnedNameless = false;

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
    this.autocomplete = '';
    this.liveError = false;
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
    this.warnIfNameless();
  }

  /**
   * Constraint validation, MIRRORED from the inner textarea rather than hand-rolled.
   * The inner control is in this shadow root and is therefore NOT a control of the outer
   * form — the form sees only what `setValidity` reports here, so anything not mirrored
   * simply does not exist as far as submission is concerned. See the fuller note in
   * `esa-text-field.ts`; this file had the same defect with `minlength`/`maxlength`.
   */
  private syncValidity(): void {
    const inner = this.textareaEl;
    if (!inner) return;
    const v = inner.validity;
    if (v.valid) {
      this.internals.setValidity({});
      return;
    }
    const message =
      v.valueMissing && this.label ? `Enter ${this.label}.` : inner.validationMessage;
    this.internals.setValidity(
      {
        valueMissing: v.valueMissing,
        tooLong: v.tooLong,
        tooShort: v.tooShort,
        badInput: v.badInput,
      },
      message,
      inner,
    );
  }

  /** See esa-text-field.warnIfNameless — silent namelessness is the failure mode. */
  private warnIfNameless(): void {
    if (this.warnedNameless || this.label || this.getAttribute('aria-label')) return;
    this.warnedNameless = true;
    console.warn(
      `⚠️  esa-textarea has no accessible name. Set \`label\` (preferred — it renders ` +
        `visibly AND wires <label for>), or \`aria-label\`. \`placeholder\` is not a name: ` +
        `it vanishes as soon as the user types.`,
      this,
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

  /**
   * Forward focus to the inner control.
   *
   * A form-associated custom element is NOT focusable by default: it has no tabindex and
   * is not a natively focusable tag, so `host.focus()` is a silent no-op, and the real
   * control sits in a shadow root that no outside reference can reach. That is exactly
   * what `<esa-error-summary>` needs — its links resolve a field by id and call `.focus()`
   * on the HOST, because IDREFs cannot cross a shadow boundary in any engine.
   *
   * Without this override the summary scrolls to the field and leaves focus where it was,
   * which is the failure the summary exists to prevent.
   *
   * `delegatesFocus: true` on the shadow root would also do it, but it changes click and
   * `:focus` behaviour across the whole component; an explicit forward is the smaller and
   * more predictable change.
   */
  focus(options?: FocusOptions): void {
    const inner = this.renderRoot?.querySelector<HTMLElement>('.input');
    if (inner) inner.focus(options);
    else super.focus(options);
  }

  render() {
    const hasError = !!this.errorText;
    // Error FIRST, then help — both, never one instead of the other. See esa-text-field.
    const describedBy = [hasError ? 'error' : '', this.helpText ? 'help' : '']
      .filter(Boolean)
      .join(' ');
    return html`
      <div class="field ${hasError ? 'field--error' : ''} ${this.autoResize ? 'field--auto' : ''}">
        ${this.label
          ? html`<label class="label typography-${LABEL_TYPE[this.size]}" for="input"
              >${this.label}${this.required
                ? // aria-hidden, not aria-label — ARIA prohibits naming `generic`.
                  html`<span class="required" aria-hidden="true">*</span>`
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
          minlength=${this.minlength ?? nothing}
          maxlength=${this.maxlength ?? nothing}
          autocomplete=${this.autocomplete || nothing}
          name=${this.name || nothing}
          aria-required=${this.required ? 'true' : nothing}
          aria-invalid=${hasError ? 'true' : nothing}
          aria-describedby=${describedBy || nothing}
          @input=${this.onInput}
        ></textarea>

        <!-- Both nodes always present so the live region pre-exists its content. -->
        <p
          class="error typography-body-sm ${hasError ? 'is-shown' : 'visually-hidden'}"
          id="error"
          role=${this.liveError ? 'alert' : nothing}
          data-esa-live=${this.liveError ? 'opt-in' : nothing}
        >${hasError
            ? html`${alertIcon}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`
            : nothing}</p>
        <p class="help typography-body-sm ${this.helpText ? 'is-shown' : 'visually-hidden'}" id="help"
          >${this.helpText || nothing}</p
        >
      </div>
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host {
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #e5e5e5);
      display: block;
    }
    /* Geometry only — type comes from the composite classes named in render(). */
    :host([size='xs']) {
      --_field-padding-y: var(--spacing-200, 0.5rem);
      --_field-padding-x: var(--spacing-200, 0.5rem);
      --_field-radius: var(--radius-sm, 0.25rem);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--spacing-250, 0.625rem);
      --_field-padding-x: var(--spacing-250, 0.625rem);
      --_field-radius: var(--radius-sm, 0.25rem);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--spacing-400, 1rem);
      --_field-padding-x: var(--spacing-400, 1rem);
      --_field-radius: var(--radius-md, 0.5rem);
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
      color: var(--color-content-utility-danger, #ce2c31);
      margin-inline-start: 2px;
    }

    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      /* The one element here that KEEPS real leading, and it takes it from its own
         role rather than declaring any. --form-line-height is gone — it existed to
         force 1.6 onto single-line boxes that now run flush — and a textarea is
         genuinely multi-line prose, which is the case the body roles lead FOR; its
         rows attribute budgets height off that leading. This used to read
         --typography-body-sm-line-height while wearing body-md or body-lg: a reach
         into a neighbour composite for one of the five properties, which is the
         assembling-at-the-call-site problem in miniature. body-md leads at normal
         now, so there is nothing left to correct. */
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
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
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

    /* Type comes from .typography-body-sm on the element.

       Both nodes are always in the DOM (the live region has to pre-exist its content),
       so the gap is opt-IN via .is-shown rather than collapsed with :empty — Lit's
       template whitespace defeats :empty in engines that follow Selectors L3. */
    .help,
    .error {
      margin: 0;
    }
    .help.is-shown,
    .error.is-shown {
      margin-block-start: var(--form-help-gap, 4px);
    }
    .help {
      color: var(--form-help-color, #737373);
    }
    /* Colour, icon AND a visually-hidden "Error:" — three signals, because colour
       alone is SC 1.4.1 (Use of Color, Level A) and colour alone is what this had. */
    .error {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
    .error__icon {
      flex: none;
      width: 1em;
      height: 1em;
    }
  `,
  ];
}

if (!customElements.get('esa-textarea')) {
  customElements.define('esa-textarea', EsaTextarea);
}
