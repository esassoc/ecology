import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/**
 * The two composites a control needs at each step of the size ramp.
 *
 * A control renders TWO text treatments at one size: the label is UI text
 * (`label-*`, medium) and the value the user typed is prose (`body-*`, regular).
 * No single composite describes "a form control", which is why this is a map and
 * not one class — see the FORMS header in component-tokens.css for the full table.
 *
 * The letters do not line up: `size="sm"` takes the `-xs` rung, because the control
 * ramp lands on 050·100·200·300 while the type families walk 050·100·150·200·300.
 * That offset is spelled out here on purpose rather than hidden behind a token named
 * for the control step.
 */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

/**
 * esa-text-field — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-text-field (a ControlValueAccessor that
 * composed esa-form-field around a native <input>). Here the field chrome
 * (label / help / error) is rendered inline so the element is self-contained and
 * portable across any stack.
 *
 * Form participation: form-associated element + ElementInternals.setFormValue on
 * every input, plus a bubbling/composed 'change' CustomEvent — the framework-agnostic
 * equivalent of CVA's onChange. Decorator-free to avoid per-consumer tsconfig flags.
 *
 * Affixes: optional `prefix` / `suffix` strings render as a segmented addon INSIDE
 * the field box, on the leading / trailing edge (e.g. a "$" price prefix, a "%"
 * suffix). The box chrome (border / height / focus ring) lives on the `.control`
 * wrapper so the addon sits flush inside the same border, divided from the input by
 * a hairline over a sunken tint. Default empty = unchanged rendering.
 */
export class EsaTextField extends LitElement {
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
    /**
     * A constraint on what this field will accept — its format, source, or
     * limit. "As it appears on the permit." "Letters, numbers, hyphens." Never
     * reassurance addressed to the user, nor a restatement of the field's state.
     */
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    type: { type: String },
    value: { type: String },
    prefix: { type: String },
    suffix: { type: String },
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
  declare type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  declare value: string;
  declare prefix: string;
  declare suffix: string;

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
    this.type = 'text';
    this.value = '';
    this.prefix = '';
    this.suffix = '';
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
   * submits empty is a promise the component does not keep. Only `valueMissing`
   * is enforced here; format checking for `type="email"` etc. is the inner
   * native input's job and is not mirrored onto the host.
   */
  private syncValidity(): void {
    if (!this.required || this.value) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.input') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Enter ${this.label}.` : 'Fill out this field.',
      anchor,
    );
  }

  private onInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value;
    this.internals.setFormValue(this.value);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  };

  render() {
    const hasError = !!this.errorText;
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? html`<label class="label typography-${LABEL_TYPE[this.size]}" for="input"
              >${this.label}${this.required
                ? html`<span class="required" aria-label="required">*</span>`
                : null}</label
            >`
          : null}
        <div class="control typography-${VALUE_TYPE[this.size]}">
          ${this.prefix
            ? html`<span class="affix affix--prefix" aria-hidden="true">${this.prefix}</span>`
            : null}
          <input
            id="input"
            class="input"
            .type=${this.type}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            aria-invalid=${hasError ? 'true' : 'false'}
            @input=${this.onInput}
          />
          ${this.suffix
            ? html`<span class="affix affix--suffix" aria-hidden="true">${this.suffix}</span>`
            : null}
        </div>
        ${hasError
          ? html`<p class="error typography-body-sm">${this.errorText}</p>`
          : this.helpText
            ? html`<p class="help typography-body-sm">${this.helpText}</p>`
            : null}
      </div>
    `;
  }

  /* `typography` FIRST so this component's own rules win on equal specificity. It
     carries the .typography-* composite classes into the shadow root — a global
     class does not cross the boundary, so the definitions come with us. */
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
    /* Type is NOT set here. The size steps carry geometry only; the text comes
       from a composite class named in render() (LABEL_TYPE / VALUE_TYPE), so the
       component says "this text is a label" rather than assembling a size, a
       weight and a leading at the call site. */
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

    /* Type comes from .typography-label-* on the element. Colour and spacing are
       not typography and stay here. */
    .label {
      color: var(--form-label-color, #171717);
      margin-block-end: var(--form-label-gap, 4px);
    }
    .required {
      color: var(--color-content-danger, #ce2c31);
      margin-inline-start: 2px;
    }

    /* The box chrome (border / height / radius / focus ring) lives on the wrapper
       so any affixes sit flush inside the same border as the input. */
    .control {
      display: flex;
      align-items: stretch;
      /* NO HEIGHT. The box is as tall as the input inside it, which is its line
         box plus its padding. A px height could not grow with rem text, so it
         clipped — and this rule used to pair one with overflow:hidden, which is
         what made the clipping silent. See semantic/size.json.

         line-height 1 is what leaves padding as the only variable: at 1.6 there
         is a third term (0.6 x font-size of leading) that nobody chose and that
         grows faster than either input. Everything else — face, size, weight,
         tracking — still comes from .typography-body-* on this element and
         inherits to the input and the affixes below. */
      line-height: var(--line-height-none, 1);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    /* Hover moves the BORDER, not the fill — the field is transparent in every
       state so that it is the colour of whatever contains it. --form-border-color-hover
       already existed for exactly this and was wired into one component; it is the
       family treatment now. Disabled needs no rule here: .input:disabled below
       dims and sets the cursor. */
    .control:hover:not(:has(.input:disabled)) {
      --_field-border-color: var(--form-border-color-hover, #bbbbbb);
    }
    .control:focus-within {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .input {
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
      /* No height: 100%. It used to resolve against .control's fixed height, which
         meant this padding was ABSORBED into that height rather than adding to it.
         With no fixed parent it would compute to auto anyway; removing it makes the
         padding load-bearing, which is the point. .control is align-items:stretch,
         so the affixes still match this element's height. */
      padding: var(--_field-padding-y) var(--_field-padding-x);
      /* A native control does not inherit type by default — this is what opts it
         into the composite already resolved on .control. */
      font: inherit;
      color: var(--form-text-color, #171717);
      background: transparent;
      border: none;
      outline: none;
      box-sizing: border-box;
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    .control:has(.input:disabled) {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
    }
    .input:disabled {
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }
    .input:disabled::placeholder {
      color: var(--color-content-disabled, #8d8d8d);
    }

    /* Segmented addon inside the field box — a sunken tint divided from the input
       by a hairline. The divider stays neutral on focus (uses the static border
       color, not the dynamic --_field-border-color). */
    .affix {
      display: inline-flex;
      align-items: center;
      flex: none;
      padding-inline: var(--_field-padding-x);
      color: var(--form-affix-color, var(--color-content-secondary, #737373));
      background: var(--form-affix-bg, var(--color-background-sunken, #efefef));
      user-select: none;
      white-space: nowrap;
    }
    .affix--prefix {
      border-inline-end: var(--form-border-width, 1px) solid
        var(--form-affix-border-color, var(--form-border-color, #e5e5e5));
    }
    .affix--suffix {
      border-inline-start: var(--form-border-width, 1px) solid
        var(--form-affix-border-color, var(--form-border-color, #e5e5e5));
    }

    .field--error .control {
      --_field-border-color: var(--form-error-border-color, #ef4444);
    }
    .field--error .control:focus-within {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--form-error-border-color, #ef4444);
    }

    /* Type comes from .typography-body-sm — help and error are one size at every
       control step, so they name the composite directly rather than mapping. */
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

if (!customElements.get('esa-text-field')) {
  customElements.define('esa-text-field', EsaTextField);
}
