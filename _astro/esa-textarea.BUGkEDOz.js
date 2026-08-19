import{i as a,b as r,a as s}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";const d={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},n={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class h extends a{constructor(){super(),this.onInput=e=>{this.value=e.target.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})),this.autoResize&&this.adjustHeight()},this.label="",this.size="md",this.placeholder="",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.rows=3,this.autoResize=!1,this.maxRows=10,this.value="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},rows:{type:Number},autoResize:{type:Boolean,attribute:"auto-resize",reflect:!0},maxRows:{type:Number,attribute:"max-rows"},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}updated(e){e.has("value")&&this.internals.setFormValue(this.value),this.syncValidity()}syncValidity(){if(!this.required||this.value){this.internals.setValidity({});return}this.internals.setValidity({valueMissing:!0},this.label?`Enter ${this.label}.`:"Fill out this field.",this.textareaEl??void 0)}get textareaEl(){return this.renderRoot?.querySelector("textarea")??null}adjustHeight(){const e=this.textareaEl;if(!e)return;e.style.height="auto";const t=parseFloat(getComputedStyle(e).lineHeight)||20,i=this.maxRows*t,o=Math.min(e.scrollHeight,i);e.style.height=`${o}px`}render(){const e=!!this.errorText;return r`
      <div class="field ${e?"field--error":""} ${this.autoResize?"field--auto":""}">
        ${this.label?r`<label class="label typography-${d[this.size]}" for="input"
              >${this.label}${this.required?r`<span class="required" aria-label="required">*</span>`:null}</label
            >`:null}
        <textarea
          id="input"
          class="input typography-${n[this.size]}"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          rows=${this.rows}
          aria-invalid=${e?"true":"false"}
          @input=${this.onInput}
        ></textarea>
        ${e?r`<p class="error typography-body-sm">${this.errorText}</p>`:this.helpText?r`<p class="help typography-body-sm">${this.helpText}</p>`:null}
      </div>
    `}static{this.styles=[l,s`
    :host {
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--form-radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #e5e5e5);
      display: block;
    }
    /* Geometry only — type comes from the composite classes named in render(). */
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
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
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

    /* Type comes from .typography-body-sm on the element. */
    .help,
    .error {
      margin: 0;
      margin-block-start: var(--form-help-gap, 4px);
    }
    .help {
      color: var(--form-help-color, #737373);
    }
    .error {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
  `]}}customElements.get("esa-textarea")||customElements.define("esa-textarea",h);
