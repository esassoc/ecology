import{b as t,i as s,A as i,a as o}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";import{a as n}from"./a11y.sqk3bMt7.js";const d=t`<svg
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
</svg>`,c={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},h={xs:"microcopy-2xs-subtle",sm:"microcopy-xs-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"};class p extends s{constructor(){super(),this.warnedPlaceholder=!1,this.onInput=e=>{const r=e.target.value;this.value=r,this.internals.setFormValue(r||null),this.dispatchEvent(new CustomEvent("change",{detail:{value:r},bubbles:!0,composed:!0}))},this.label="",this.size="md",this.placeholder="Select date...",this.min="",this.max="",this.disabled=!1,this.helpText="",this.errorText="",this.required=!1,this.liveError=!1,this.value="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},min:{type:String},max:{type:String},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean},liveError:{type:Boolean,attribute:"live-error"},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value||null)}updated(e){e.has("value")&&this.internals.setFormValue(this.value||null),this.syncValidity(),this.warnIfPlaceholder()}warnIfPlaceholder(){this.warnedPlaceholder||!this.placeholder||(this.warnedPlaceholder=!0,console.warn('⚠️  esa-date-picker: `placeholder` does nothing — browsers ignore it on <input type="date">, which supplies its own date mask. Use `help-text` if you need to tell the user the expected format.',this))}syncValidity(){const e=this.renderRoot?.querySelector(".input");if(!e)return;const r=e.validity;if(r.valid){this.internals.setValidity({});return}const a=r.valueMissing?this.label?`Enter ${this.label}.`:"Enter a date.":e.validationMessage;this.internals.setValidity({valueMissing:r.valueMissing,rangeUnderflow:r.rangeUnderflow,rangeOverflow:r.rangeOverflow,badInput:r.badInput},a,e)}focus(e){const r=this.renderRoot?.querySelector(".input");r?r.focus(e):super.focus(e)}render(){const e=!!this.errorText,r=[e?"error":"",this.helpText?"help":""].filter(Boolean).join(" ");return t`
      <div class="field ${e?"field--error":""}">
        ${this.label?t`<label class="field__label typography-${c[this.size]}" for="input">
              ${this.label}${this.required?t`<span class="field__required" aria-hidden="true">*</span>`:null}
            </label>`:null}
        <input
          id="input"
          type="date"
          class="input typography-${h[this.size]}"
          .value=${this.value}
          ?disabled=${this.disabled}
          ?required=${this.required}
          min=${this.min||i}
          max=${this.max||i}
          name=${this.name||i}
          aria-label=${this.label?i:"Date"}
          aria-required=${this.required?"true":i}
          aria-invalid=${e?"true":i}
          aria-describedby=${r||i}
          @input=${this.onInput}
        />
        <!-- Both message nodes always present so the live region pre-exists its content;
             .visually-hidden when empty keeps them out of .field's flex gap. -->
        <span
          class="field__error typography-body-sm ${e?"":"visually-hidden"}"
          id="error"
          role=${this.liveError?"alert":i}
          data-esa-live=${this.liveError?"opt-in":i}
        >${e?t`${d}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`:i}</span
        >
        <span
          class="field__help typography-body-sm ${this.helpText?"":"visually-hidden"}"
          id="help"
          >${this.helpText||i}</span
        >
      </div>
    `}static{this.styles=[l,n,o`
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
      --_field-border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
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
  `]}}customElements.get("esa-date-picker")||customElements.define("esa-date-picker",p);
