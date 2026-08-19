import{i,b as r,a as t}from"./lit-element.D8DSg5zn.js";import{t as a}from"./typography.D6s5VeQm.js";const o={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},s={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class l extends i{constructor(){super(),this.onInput=e=>{this.value=e.target.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))},this.label="",this.size="md",this.placeholder="",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.type="text",this.value="",this.prefix="",this.suffix="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},type:{type:String},value:{type:String},prefix:{type:String},suffix:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}updated(e){e.has("value")&&this.internals.setFormValue(this.value),this.syncValidity()}syncValidity(){if(!this.required||this.value){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".input")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Enter ${this.label}.`:"Fill out this field.",e)}render(){const e=!!this.errorText;return r`
      <div class="field ${e?"field--error":""}">
        ${this.label?r`<label class="label typography-${o[this.size]}" for="input"
              >${this.label}${this.required?r`<span class="required" aria-label="required">*</span>`:null}</label
            >`:null}
        <div class="control typography-${s[this.size]}">
          ${this.prefix?r`<span class="affix affix--prefix" aria-hidden="true">${this.prefix}</span>`:null}
          <input
            id="input"
            class="input"
            .type=${this.type}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            aria-invalid=${e?"true":"false"}
            @input=${this.onInput}
          />
          ${this.suffix?r`<span class="affix affix--suffix" aria-hidden="true">${this.suffix}</span>`:null}
        </div>
        ${e?r`<p class="error typography-body-sm">${this.errorText}</p>`:this.helpText?r`<p class="help typography-body-sm">${this.helpText}</p>`:null}
      </div>
    `}static{this.styles=[a,t`
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
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    /* Defaults to --form-bg, so the field is flat on hover unless a theme opts in. */
    .control:hover:not(:has(.input:disabled)) {
      background: var(--form-bg-hover, var(--form-bg, #fff));
    }
    .control:focus-within {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .control:has(.input:disabled) {
      background: var(--form-bg-disabled, #efefef);
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
    .input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
  `]}}customElements.get("esa-text-field")||customElements.define("esa-text-field",l);
