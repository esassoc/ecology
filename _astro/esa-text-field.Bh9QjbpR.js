import{i,b as e,a as o}from"./lit-element.C8p3bJxG.js";class a extends i{constructor(){super(),this.onInput=r=>{this.value=r.target.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))},this.label="",this.size="md",this.placeholder="",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.type="text",this.value="",this.prefix="",this.suffix="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean,reflect:!0},disabled:{type:Boolean,reflect:!0},type:{type:String},value:{type:String},prefix:{type:String},suffix:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}render(){const r=!!this.errorText;return e`
      <div class="field ${r?"field--error":""}">
        ${this.label?e`<label class="label" for="input"
              >${this.label}${this.required?e`<span class="required" aria-label="required">*</span>`:null}</label
            >`:null}
        <div class="control">
          ${this.prefix?e`<span class="affix affix--prefix" aria-hidden="true">${this.prefix}</span>`:null}
          <input
            id="input"
            class="input"
            .type=${this.type}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            aria-invalid=${r?"true":"false"}
            @input=${this.onInput}
          />
          ${this.suffix?e`<span class="affix affix--suffix" aria-hidden="true">${this.suffix}</span>`:null}
        </div>
        ${r?e`<p class="error">${this.errorText}</p>`:this.helpText?e`<p class="help">${this.helpText}</p>`:null}
      </div>
    `}static{this.styles=o`
    :host {
      --_field-padding-y: var(--form-padding-y-md, 0.5rem);
      --_field-padding-x: var(--form-padding-x-md, 0.75rem);
      --_field-font-size: var(--form-font-size-md, 0.9375rem);
      --_field-height: var(--form-height-md, 40px);
      --_field-radius: var(--form-radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #e5e5e5);
      --_label-font-size: var(--type-size-200, 0.9375rem);
      display: block;
      font-family: var(--font-sans, sans-serif);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs, 0.25rem);
      --_field-padding-x: var(--form-padding-x-xs, 0.5rem);
      --_field-font-size: var(--form-font-size-xs, 0.8125rem);
      --_field-height: var(--form-height-xs, 28px);
      --_field-radius: var(--form-radius-xs, 0.25rem);
      --_label-font-size: var(--type-size-050, 0.8125rem);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 0.375rem);
      --_field-padding-x: var(--form-padding-x-sm, 0.5rem);
      --_field-font-size: var(--form-font-size-sm, 0.875rem);
      --_field-height: var(--form-height-sm, 32px);
      --_field-radius: var(--form-radius-sm, 0.25rem);
      --_label-font-size: var(--type-size-150, 0.875rem);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 0.75rem);
      --_field-padding-x: var(--form-padding-x-lg, 1rem);
      --_field-font-size: var(--form-font-size-lg, 1.125rem);
      --_field-height: var(--form-height-lg, 48px);
      --_field-radius: var(--form-radius-lg, 0.5rem);
      --_label-font-size: var(--type-size-300, 1.125rem);
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .label {
      color: var(--form-label-color, #171717);
      font-weight: var(--form-label-font-weight, var(--font-weight-medium, 450));
      font-size: var(--form-label-font-size, var(--_label-font-size));
      margin-block-end: var(--form-label-gap, 4px);
    }
    .required {
      color: var(--color-danger-strong, #ce2c31);
      margin-inline-start: 2px;
    }

    /* The box chrome (border / height / radius / focus ring) lives on the wrapper
       so any affixes sit flush inside the same border as the input. */
    .control {
      display: flex;
      align-items: stretch;
      height: var(--_field-height);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      overflow: hidden;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
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
      height: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: inherit;
      font-size: var(--_field-font-size);
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
      color: var(--form-affix-color, var(--color-text-secondary, #737373));
      font-size: var(--_field-font-size);
      background: var(--form-affix-bg, var(--color-surface-sunken, #efefef));
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
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .control:focus-within {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--form-border-color-error, #ef4444);
    }

    .help,
    .error {
      margin: 0;
      margin-block-start: var(--form-help-gap, 4px);
      font-size: var(--type-size-100, 0.75rem);
    }
    .help {
      color: var(--form-help-color, #737373);
    }
    .error {
      color: var(--form-error-color, var(--color-danger-strong, #ce2c31));
    }
  `}}customElements.get("esa-text-field")||customElements.define("esa-text-field",a);
