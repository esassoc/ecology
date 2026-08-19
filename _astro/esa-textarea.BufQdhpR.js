import{b as i,i as s,A as t,a as l}from"./lit-element.D8DSg5zn.js";import{t as n}from"./typography.KBHeYOQc.js";import{a as d}from"./a11y.sqk3bMt7.js";const h=i`<svg
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
</svg>`,c={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},u={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class p extends s{constructor(){super(),this.warnedNameless=!1,this.onInput=e=>{this.value=e.target.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})),this.autoResize&&this.adjustHeight()},this.label="",this.size="md",this.placeholder="",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.rows=3,this.autoResize=!1,this.maxRows=10,this.value="",this.autocomplete="",this.liveError=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},rows:{type:Number},autoResize:{type:Boolean,attribute:"auto-resize",reflect:!0},maxRows:{type:Number,attribute:"max-rows"},value:{type:String},minlength:{type:Number},maxlength:{type:Number},autocomplete:{type:String},liveError:{type:Boolean,attribute:"live-error"}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}updated(e){e.has("value")&&this.internals.setFormValue(this.value),this.syncValidity(),this.warnIfNameless()}syncValidity(){const e=this.textareaEl;if(!e)return;const r=e.validity;if(r.valid){this.internals.setValidity({});return}const o=r.valueMissing&&this.label?`Enter ${this.label}.`:e.validationMessage;this.internals.setValidity({valueMissing:r.valueMissing,tooLong:r.tooLong,tooShort:r.tooShort,badInput:r.badInput},o,e)}warnIfNameless(){this.warnedNameless||this.label||this.getAttribute("aria-label")||(this.warnedNameless=!0,console.warn("⚠️  esa-textarea has no accessible name. Set `label` (preferred — it renders visibly AND wires <label for>), or `aria-label`. `placeholder` is not a name: it vanishes as soon as the user types.",this))}get textareaEl(){return this.renderRoot?.querySelector("textarea")??null}adjustHeight(){const e=this.textareaEl;if(!e)return;e.style.height="auto";const r=parseFloat(getComputedStyle(e).lineHeight)||20,o=this.maxRows*r,a=Math.min(e.scrollHeight,o);e.style.height=`${a}px`}focus(e){const r=this.renderRoot?.querySelector(".input");r?r.focus(e):super.focus(e)}render(){const e=!!this.errorText,r=[e?"error":"",this.helpText?"help":""].filter(Boolean).join(" ");return i`
      <div class="field ${e?"field--error":""} ${this.autoResize?"field--auto":""}">
        ${this.label?i`<label class="label typography-${c[this.size]}" for="input"
              >${this.label}${this.required?i`<span class="required" aria-hidden="true">*</span>`:null}</label
            >`:null}
        <textarea
          id="input"
          class="input typography-${u[this.size]}"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?required=${this.required}
          rows=${this.rows}
          minlength=${this.minlength??t}
          maxlength=${this.maxlength??t}
          autocomplete=${this.autocomplete||t}
          name=${this.name||t}
          aria-required=${this.required?"true":t}
          aria-invalid=${e?"true":t}
          aria-describedby=${r||t}
          @input=${this.onInput}
        ></textarea>

        <!-- Both nodes always present so the live region pre-exists its content. -->
        <p
          class="error typography-body-sm ${e?"is-shown":"visually-hidden"}"
          id="error"
          role=${this.liveError?"alert":t}
          data-esa-live=${this.liveError?"opt-in":t}
        >${e?i`${h}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`:t}</p>
        <p class="help typography-body-sm ${this.helpText?"is-shown":"visually-hidden"}" id="help"
          >${this.helpText||t}</p
        >
      </div>
    `}static{this.styles=[n,d,l`
    :host {
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #cecece);
      display: block;
    }
    /* Geometry only — type comes from the composite classes named in render(). */
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

    .label {
      color: var(--form-label-color, #646464);
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
      color: var(--form-text-color, #202020);
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
      color: var(--form-placeholder-color, #838383);
    }
    /* Hover moves the BORDER, not the fill — the field is transparent in every
       state so that it is the colour of whatever contains it.
       --form-border-color-hover already existed for exactly this and was wired
       into one component; it is the family treatment now. */
    .input:hover:not(:disabled) {
      --_field-border-color: var(--form-border-color-hover, #bbbbbb);
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

    .field--auto .input {
      resize: none;
      overflow: hidden;
    }

    .field--error .input {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    /* The invalid field's ring is the SAME ring in red, via the token rather than a property
       override — the house mechanism, so every focusable part inside the field follows with one
       declaration. See esa-text-field for the full account and the contrast numbers. */
    .field--error {
      --focus-ring-color: var(--form-error-border-color, #e5484d);
    }

    /* Type comes from .typography-body-sm on the element.

       Both nodes are always in the DOM (the live region has to pre-exist its content),
       so the gap is opt-IN via .is-shown rather than collapsed with :empty — Lit's
       template whitespace defeats :empty in engines that follow Selectors L3. */
    .help,
    .error {
      margin: 0;
    }
    .help.is-shown,
    .error.is-shown {
      margin-block-start: var(--form-help-gap, 4px);
    }
    .help {
      color: var(--form-help-color, #838383);
    }
    /* Colour, icon AND a visually-hidden "Error:" — three signals, because colour
       alone is SC 1.4.1 (Use of Color, Level A) and colour alone is what this had. */
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
  `]}}customElements.get("esa-textarea")||customElements.define("esa-textarea",p);
