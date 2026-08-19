import{i as t,b as r,a}from"./lit-element.D8DSg5zn.js";import{t as s}from"./typography.KBHeYOQc.js";const l={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},o={xs:"microcopy-2xs-subtle",sm:"microcopy-xs-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"};class d extends t{constructor(){super(),this.onInput=e=>{const i=e.target.value;this.value=i,this.internals.setFormValue(i||null),this.dispatchEvent(new CustomEvent("change",{detail:{value:i},bubbles:!0,composed:!0}))},this.label="",this.size="md",this.placeholder="Select date...",this.min="",this.max="",this.disabled=!1,this.helpText="",this.errorText="",this.required=!1,this.value="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},min:{type:String},max:{type:String},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value||null)}updated(e){e.has("value")&&this.internals.setFormValue(this.value||null),this.syncValidity()}syncValidity(){if(!this.required||this.value){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".input")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Enter ${this.label}.`:"Enter a date.",e)}render(){const e=!!this.errorText;return r`
      <div class="field ${e?"field--error":""}">
        ${this.label?r`<label class="field__label typography-${l[this.size]}">
              ${this.label}${this.required?r`<span class="field__required">*</span>`:null}
            </label>`:null}
        <input
          type="date"
          class="input typography-${o[this.size]}"
          .value=${this.value}
          ?disabled=${this.disabled}
          min=${this.min||""}
          max=${this.max||""}
          placeholder=${this.placeholder}
          aria-label=${this.label||"Date"}
          @input=${this.onInput}
        />
        ${e?r`<span class="field__error typography-body-sm">${this.errorText}</span>`:this.helpText?r`<span class="field__help typography-body-sm">${this.helpText}</span>`:null}
      </div>
    `}static{this.styles=[s,a`
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
      color: var(--color-content-utility-danger, #ce2c31);
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
      box-shadow: 0 0 0 2px var(--color-border-utility-danger, rgba(211, 47, 47, 0.25));
    }
  `]}}customElements.get("esa-date-picker")||customElements.define("esa-date-picker",d);
