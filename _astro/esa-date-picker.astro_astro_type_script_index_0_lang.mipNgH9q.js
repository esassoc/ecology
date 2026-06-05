import{i as a,b as e,a as t}from"./lit-element.C8p3bJxG.js";class o extends a{constructor(){super(),this.onInput=r=>{const i=r.target.value;this.value=i,this.internals.setFormValue(i||null),this.dispatchEvent(new CustomEvent("change",{detail:{value:i},bubbles:!0,composed:!0}))},this.label="",this.size="md",this.placeholder="Select date...",this.min="",this.max="",this.disabled=!1,this.helpText="",this.errorText="",this.required=!1,this.value="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},min:{type:String},max:{type:String},disabled:{type:Boolean,reflect:!0},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value||null)}render(){const r=!!this.errorText;return e`
      <div class="field ${r?"field--error":""}">
        ${this.label?e`<label class="field__label">
              ${this.label}${this.required?e`<span class="field__required">*</span>`:null}
            </label>`:null}
        <input
          type="date"
          class="input"
          .value=${this.value}
          ?disabled=${this.disabled}
          min=${this.min||""}
          max=${this.max||""}
          placeholder=${this.placeholder}
          aria-label=${this.label||"Date"}
          @input=${this.onInput}
        />
        ${r?e`<span class="field__error">${this.errorText}</span>`:this.helpText?e`<span class="field__help">${this.helpText}</span>`:null}
      </div>
    `}static{this.styles=t`
    :host {
      display: block;
      --_field-padding-y: var(--form-padding-y-md, 8px);
      --_field-padding-x: var(--form-padding-x-md, 12px);
      --_field-font-size: var(--form-font-size-md, 14px);
      --_field-height: var(--form-height-md, 40px);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs, 2px);
      --_field-padding-x: var(--form-padding-x-xs, 8px);
      --_field-font-size: var(--form-font-size-xs, 11px);
      --_field-height: var(--form-height-xs, 28px);
      --_field-radius: var(--form-radius-xs, 4px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 4px);
      --_field-padding-x: var(--form-padding-x-sm, 8px);
      --_field-font-size: var(--form-font-size-sm, 12px);
      --_field-height: var(--form-height-sm, 32px);
      --_field-radius: var(--form-radius-sm, 6px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 12px);
      --_field-padding-x: var(--form-padding-x-lg, 16px);
      --_field-font-size: var(--form-font-size-lg, 16px);
      --_field-height: var(--form-height-lg, 48px);
      --_field-radius: var(--form-radius-lg, 10px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-danger, #ef4444);
      margin-left: 2px;
    }
    .field__help {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
    .field__error {
      font-size: var(--type-size-150, 12px);
      color: var(--form-error-color, #ef4444);
    }

    .input {
      width: 100%;
      height: var(--_field-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #005862);
      box-shadow: 0 0 0 2px var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }
    .input:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
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
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 2px var(--color-danger-border, rgba(211, 47, 47, 0.25));
    }
  `}}customElements.get("esa-date-picker")||customElements.define("esa-date-picker",o);
