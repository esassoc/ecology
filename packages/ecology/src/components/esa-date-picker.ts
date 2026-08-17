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

/** Label is UI text (medium); the typed date is prose (regular). See
    the FORMS header in component-tokens.css for the step→rung mapping. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
// The typed value is microcopy: it sits IN the field box, whose height comes from
// padding, so it carries no leading. `-subtle` is the regular weight — a value must
// not outweigh the label naming it.
const FIELD_TYPE = { xs: 'microcopy-2xs-subtle', sm: 'microcopy-xs-subtle', md: 'microcopy-md-subtle', lg: 'microcopy-lg-subtle' } as const;
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
    liveError: { type: Boolean, attribute: 'live-error' },
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
  /**
   * Announce the error the moment it appears rather than only when the field is focused.
   * OFF by default — see the long note on `esa-text-field.liveError`: the house pattern is
   * validate-on-submit with `<esa-error-summary>`, under which a live region per field
   * fires an assertive announcement for EVERY invalid field at once, racing the summary
   * the user was just sent to. Turn it on for fields validated INLINE, on blur.
   */
  declare liveError: boolean;
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
    this.liveError = false;
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
    this.warnIfPlaceholder();
  }

  private warnedPlaceholder = false;

  /**
   * `placeholder` is INERT on this component and always was — browsers ignore the
   * attribute on `<input type="date">`, which renders its own dd/mm/yyyy mask. It used
   * to be bound anyway, so the prop appeared in the API table and did nothing. Kept
   * rather than deleted (removing it is a breaking change needing a migrations row) but
   * it now warns, following the house shim pattern in esa-select/esa-input-tag.
   */
  private warnIfPlaceholder(): void {
    if (this.warnedPlaceholder || !this.placeholder) return;
    this.warnedPlaceholder = true;
    console.warn(
      `⚠️  esa-date-picker: \`placeholder\` does nothing — browsers ignore it on ` +
        `<input type="date">, which supplies its own date mask. Use \`help-text\` if you ` +
        `need to tell the user the expected format.`,
      this,
    );
  }

  /**
   * Constraint validation, MIRRORED from the inner date input.
   *
   * The old comment said `min`/`max` were "left to the native date input inside, which
   * enforces them itself". It does enforce them — on ITSELF, in this shadow root, where
   * it is not a control of the outer form. The form sees only what `setValidity` reports
   * here, so a date outside `min`/`max` reported VALID and submitted. Mirroring the inner
   * validity picks up `rangeUnderflow`/`rangeOverflow`/`badInput` for free and keeps them
   * correct if more constraints are forwarded later.
   */
  private syncValidity(): void {
    const inner = this.renderRoot?.querySelector<HTMLInputElement>('.input');
    if (!inner) return;
    const v = inner.validity;
    if (v.valid) {
      this.internals.setValidity({});
      return;
    }
    const message = v.valueMissing
      ? this.label
        ? `Enter ${this.label}.`
        : 'Enter a date.'
      : inner.validationMessage;
    this.internals.setValidity(
      {
        valueMissing: v.valueMissing,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        badInput: v.badInput,
      },
      message,
      inner,
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
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? // A real <label for>, now that the inner input has an id. A native
            // <input type="date"> IS a labelable element, so this is the strongest of
            // the three naming mechanisms — and unlike the aria-label it replaces, it
            // makes the visible text a click target that focuses the field.
            html`<label class="field__label typography-${LABEL_TYPE[this.size]}" for="input">
              ${this.label}${this.required
                ? html`<span class="field__required" aria-hidden="true">*</span>`
                : null}
            </label>`
          : null}
        <input
          id="input"
          type="date"
          class="input typography-${FIELD_TYPE[this.size]}"
          .value=${this.value}
          ?disabled=${this.disabled}
          ?required=${this.required}
          min=${this.min || nothing}
          max=${this.max || nothing}
          name=${this.name || nothing}
          aria-label=${this.label ? nothing : 'Date'}
          aria-required=${this.required ? 'true' : nothing}
          aria-invalid=${hasError ? 'true' : nothing}
          aria-describedby=${describedBy || nothing}
          @input=${this.onInput}
        />
        <!-- Both message nodes always present so the live region pre-exists its content;
             .visually-hidden when empty keeps them out of .field's flex gap. -->
        <span
          class="field__error typography-body-sm ${hasError ? '' : 'visually-hidden'}"
          id="error"
          role=${this.liveError ? 'alert' : nothing}
          data-esa-live=${this.liveError ? 'opt-in' : nothing}
        >${hasError
            ? html`${alertIcon}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`
            : nothing}</span
        >
        <span
          class="field__help typography-body-sm ${this.helpText ? '' : 'visually-hidden'}"
          id="help"
          >${this.helpText || nothing}</span
        >
      </div>
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host {
      display: block;
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #cecece);
    }
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
      gap: var(--spacing-100, 4px);
    }
    /* Type comes from the composite class on the element. */
    .field__label {
      color: var(--form-label-color, #646464);
    }
    .field__required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      color: var(--form-help-color, #838383);
    }
    /* Three signals, not one: colour, icon, and a visually-hidden "Error:" prefix.
       Colour alone is SC 1.4.1 (Use of Color, Level A). */
    .field__error {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
    .field__error .error__icon {
      flex: none;
      width: 1em;
      height: 1em;
    }
    /* Both message nodes ALWAYS render so the live region pre-exists its content;
       .visually-hidden when empty takes them out of .field's flex gap. Not
       display:none — that would drop them from the accessibility tree. */

    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      color: var(--form-text-color, #202020);
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
      --_field-border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
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
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px)
        var(--color-border-utility-danger, rgba(211, 47, 47, 0.25));
    }
  `,
  ];
}

if (!customElements.get('esa-date-picker')) {
  customElements.define('esa-date-picker', EsaDatePicker);
}
