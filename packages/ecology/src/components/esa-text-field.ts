import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';

// Lucide `circle-alert`, copied from ./icon-registry. A Lit component cannot import
// the .astro <EsaIcon>, and the registry is a plain string map meant for `set:html`
// — inlining the one glyph is cheaper than routing unsafeSVG through here.
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
// The typed value is microcopy: it sits IN the field box, whose height comes from
// padding, so it carries no leading. `-subtle` is the regular weight — a value must
// not outweigh the label naming it.
const FIELD_TYPE = { xs: 'microcopy-2xs-subtle', sm: 'microcopy-xs-subtle', md: 'microcopy-md-subtle', lg: 'microcopy-lg-subtle' } as const;
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
    label: { type: String },
    size: { type: String, reflect: true },
    placeholder: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    type: { type: String },
    value: { type: String },
    prefix: { type: String },
    suffix: { type: String },
    pattern: { type: String },
    minlength: { type: Number },
    maxlength: { type: Number },
    autocomplete: { type: String },
    inputmode: { type: String },
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
  declare type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  declare value: string;
  declare prefix: string;
  declare suffix: string;
  /** Regular expression the value must match — forwarded to the inner input. */
  declare pattern: string;
  declare minlength: number | undefined;
  declare maxlength: number | undefined;
  /**
   * Autofill hint (`email`, `given-name`, `one-time-code`, …). This is the ONLY way to
   * satisfy SC 1.3.5 Identify Input Purpose (AA): `type="email"` says what KIND of data
   * the field wants, `autocomplete="email"` says WHOSE. It also turns on browser autofill,
   * which is a large win for motor impairments. Use the real fixed values, not invented ones.
   */
  declare autocomplete: string;
  /** Mobile keyboard hint (`numeric`, `decimal`, `tel`, …). Usability only — enforces nothing. */
  declare inputmode: string;
  /**
   * Announce the error the moment it appears, instead of only when the field is focused.
   *
   * OFF by default, and that default is the considered one. The house pattern is
   * validate-on-submit with an `<esa-error-summary>` that takes focus — under which a
   * live region here would fire an assertive announcement for EVERY invalid field at
   * once, racing the summary the user was just sent to. `aria-describedby` already
   * carries the message when they arrive at the field.
   *
   * Turn it on for fields you validate INLINE (on blur), where the appearing message is
   * the only signal and there is exactly one of it. Note that JAWS may then announce it
   * twice — once live, once as the description on focus — which is the known cost of
   * pairing a live region with `aria-describedby` on the same node.
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
    this.type = 'text';
    this.value = '';
    this.prefix = '';
    this.suffix = '';
    this.pattern = '';
    this.autocomplete = '';
    this.inputmode = '';
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
   * Constraint validation, MIRRORED from the inner input.
   *
   * This used to hand-roll `valueMissing` and carried a comment saying format checking
   * for `type="email"` was "the inner native input's job". It is not — the inner input
   * lives in this shadow root and is not a control of the outer form, so the form sees
   * ONLY what `setValidity` reports here. The result was that
   * `<esa-text-field type="email" value="not-an-email" required>` reported VALID and
   * submitted, while `checkValidity()` returned true. Three separate defects have now
   * landed on this one method (cosmetic `required`, unsynced scripted `value`, this) —
   * the shape to watch for is a comment describing a delegation that does not happen.
   *
   * Reading `inner.validity` gets `valueMissing`, `typeMismatch`, `patternMismatch`,
   * `tooShort`/`tooLong` and the rest for free, and keeps them correct as the forwarded
   * constraint attributes grow. The flags are copied explicitly rather than passing the
   * live `ValidityState` through: `setValidity` takes a `ValidityStateFlags` dictionary,
   * and the two interfaces are only incidentally compatible.
   */
  private syncValidity(): void {
    const inner = this.renderRoot?.querySelector<HTMLInputElement>('.input');
    if (!inner) return;
    const v = inner.validity;
    if (v.valid) {
      this.internals.setValidity({});
      return;
    }
    // A missing REQUIRED value gets our own wording; everything else keeps the browser's,
    // which already names the constraint it broke and is localised.
    const message =
      v.valueMissing && this.label ? `Enter ${this.label}.` : inner.validationMessage;
    this.internals.setValidity(
      {
        valueMissing: v.valueMissing,
        typeMismatch: v.typeMismatch,
        patternMismatch: v.patternMismatch,
        tooLong: v.tooLong,
        tooShort: v.tooShort,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        stepMismatch: v.stepMismatch,
        badInput: v.badInput,
      },
      message,
      inner,
    );
  }

  /**
   * A control with no name announces "edit text, blank". Nothing renders red and no test
   * fails, which is why this warns — and why it checks `aria-label` too, since that is
   * the legitimate way to run without a visible label. `placeholder` is deliberately NOT
   * accepted as a name: it disappears the moment the user types.
   */
  private warnIfNameless(): void {
    if (this.warnedNameless || this.label || this.getAttribute('aria-label')) return;
    this.warnedNameless = true;
    console.warn(
      `⚠️  esa-text-field has no accessible name. Set \`label\` (preferred — it renders ` +
        `visibly AND wires <label for>), or \`aria-label\` if the name is carried elsewhere. ` +
        `\`placeholder\` is not a name: it vanishes as soon as the user types.`,
      this,
    );
  }

  private onInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value;
    this.internals.setFormValue(this.value);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
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
    // BOTH ids, always, in that order. The error is announced first because it is what
    // changed; the help text follows because a format hint is most needed at exactly the
    // moment the format was got wrong. The old code swapped one for the other, so a user
    // who mistyped a password lost the requirements list on the keystroke they needed it.
    const describedBy = [hasError ? 'error' : '', this.helpText ? 'help' : '']
      .filter(Boolean)
      .join(' ');
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? html`<label class="label typography-${LABEL_TYPE[this.size]}" for="input"
              >${this.label}${this.required
                ? // aria-hidden, NOT aria-label="required" — ARIA prohibits naming
                  // `generic`, so the old attribute was inert in some engines and a
                  // duplicate name in others. `aria-required` below is what carries it.
                  html`<span class="required" aria-hidden="true">*</span>`
                : null}</label
            >`
          : null}
        <div class="control typography-${FIELD_TYPE[this.size]}">
          ${this.prefix
            ? // NOT aria-hidden. A "$" or "%" affix changes what the number MEANS;
              // hiding it from assistive tech loses the unit.
              html`<span class="affix affix--prefix">${this.prefix}</span>`
            : null}
          <input
            id="input"
            class="input"
            .type=${this.type}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            pattern=${this.pattern || nothing}
            minlength=${this.minlength ?? nothing}
            maxlength=${this.maxlength ?? nothing}
            autocomplete=${this.autocomplete || nothing}
            inputmode=${this.inputmode || nothing}
            name=${this.name || nothing}
            aria-required=${this.required ? 'true' : nothing}
            aria-invalid=${hasError ? 'true' : nothing}
            aria-describedby=${describedBy || nothing}
            @input=${this.onInput}
          />
          ${this.suffix ? html`<span class="affix affix--suffix">${this.suffix}</span>` : null}
        </div>

        <!-- BOTH nodes render unconditionally. A live region that is created at the same
             moment as its text is routinely not announced — it has to already exist for
             the mutation to be observed. :empty collapses the gap so a clean field
             looks untouched, WITHOUT display:none, which would drop it from the
             accessibility tree and defeat the whole arrangement. -->
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

  /* `typography` FIRST so this component's own rules win on equal specificity. It
     carries the .typography-* composite classes into the shadow root — a global
     class does not cross the boundary, so the definitions come with us. */
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
    /* Type is NOT set here. The size steps carry geometry only; the text comes
       from a composite class named in render() (LABEL_TYPE / VALUE_TYPE), so the
       component says "this text is a label" rather than assembling a size, a
       weight and a leading at the call site. */
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

    /* Type comes from .typography-label-* on the element. Colour and spacing are
       not typography and stay here. */
    .label {
      color: var(--form-label-color, #171717);
      margin-block-end: var(--form-label-gap, 4px);
    }
    .required {
      color: var(--color-content-utility-danger, #ce2c31);
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
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
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
      color: var(--form-affix-color, var(--color-content-default-secondary, #737373));
      background: var(--form-affix-bg, var(--color-background-elevation-sunken, #efefef));
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
    /* Both nodes are ALWAYS in the DOM (see render()), so the gap is opt-IN rather
       than collapsed away. Deliberately not display:none when empty — that removes
       the node from the accessibility tree, and a live region that is not in the tree
       cannot announce anything. An empty <p> with no margin occupies no space.

       .is-shown rather than :empty: Lit's template whitespace leaves a text node
       inside the element, and browsers still disagree about whether :empty ignores
       whitespace-only children (Selectors L4 says yes, L3 says no). A class is
       deterministic; :empty here would silently leave 4px of dead space under every
       clean field in some engines and not others. */
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
    /* The error line is distinguished from the help line by THREE things — colour, the
       icon, and the visually-hidden "Error:" prefix. Colour alone is SC 1.4.1 (Use of
       Color, Level A), and colour alone is exactly what these two had: same tag, same
       type role, same position, different custom property. */
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

if (!customElements.get('esa-text-field')) {
  customElements.define('esa-text-field', EsaTextField);
}
