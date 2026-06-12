import{i as o,b as r,a as s}from"./lit-element.C8p3bJxG.js";class l extends o{constructor(){super(),this.onInput=e=>{this.value=e.target.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})),this.autoResize&&this.adjustHeight()},this.label="",this.size="md",this.placeholder="",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.rows=3,this.autoResize=!1,this.maxRows=10,this.value="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean,reflect:!0},disabled:{type:Boolean,reflect:!0},rows:{type:Number},autoResize:{type:Boolean,attribute:"auto-resize",reflect:!0},maxRows:{type:Number,attribute:"max-rows"},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}get textareaEl(){return this.renderRoot?.querySelector("textarea")??null}adjustHeight(){const e=this.textareaEl;if(!e)return;e.style.height="auto";const t=parseFloat(getComputedStyle(e).lineHeight)||20,i=this.maxRows*t,a=Math.min(e.scrollHeight,i);e.style.height=`${a}px`}render(){const e=!!this.errorText;return r`
      <div class="field ${e?"field--error":""} ${this.autoResize?"field--auto":""}">
        ${this.label?r`<label class="label" for="input"
              >${this.label}${this.required?r`<span class="required" aria-label="required">*</span>`:null}</label
            >`:null}
        <textarea
          id="input"
          class="input"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          rows=${this.rows}
          aria-invalid=${e?"true":"false"}
          @input=${this.onInput}
        ></textarea>
        ${e?r`<p class="error">${this.errorText}</p>`:this.helpText?r`<p class="help">${this.helpText}</p>`:null}
      </div>
    `}static{this.styles=s`
    :host {
      --_field-padding-y: var(--form-padding-y-md, 0.5rem);
      --_field-padding-x: var(--form-padding-x-md, 0.75rem);
      --_field-font-size: var(--form-font-size-md, 0.9375rem);
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
      --_field-radius: var(--form-radius-xs, 0.25rem);
      --_label-font-size: var(--type-size-050, 0.8125rem);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 0.375rem);
      --_field-padding-x: var(--form-padding-x-sm, 0.5rem);
      --_field-font-size: var(--form-font-size-sm, 0.875rem);
      --_field-radius: var(--form-radius-sm, 0.25rem);
      --_label-font-size: var(--type-size-150, 0.875rem);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 0.75rem);
      --_field-padding-x: var(--form-padding-x-lg, 1rem);
      --_field-font-size: var(--form-font-size-lg, 1.125rem);
      --_field-radius: var(--form-radius-lg, 0.5rem);
      --_label-font-size: var(--type-size-300, 1.125rem);
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .label {
      color: var(--form-label-color, #171717);
      font-weight: var(--font-weight-medium, 450);
      font-size: var(--_label-font-size);
      margin-block-end: var(--form-label-gap, 4px);
    }
    .required {
      color: var(--color-danger, #ef4444);
      margin-inline-start: 2px;
    }

    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: inherit;
      font-size: var(--_field-font-size);
      line-height: var(--form-line-height, 1.6);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
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
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width, 2px)
        var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }
    .input:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.5;
      cursor: not-allowed;
    }

    .field--auto .input {
      resize: none;
      overflow: hidden;
    }

    .field--error .input {
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .input:focus {
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
      color: var(--form-error-color, #ef4444);
    }
  `}}customElements.get("esa-textarea")||customElements.define("esa-textarea",l);
