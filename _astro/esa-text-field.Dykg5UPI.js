import{b as i,i as a,A as r,a as s}from"./lit-element.D8DSg5zn.js";import{t as n}from"./typography.KBHeYOQc.js";import{a as l}from"./a11y.sqk3bMt7.js";const d=i`<svg
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
</svg>`,h={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},c={xs:"microcopy-2xs-subtle",sm:"microcopy-xs-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"};class p extends a{constructor(){super(),this.warnedNameless=!1,this.onInput=e=>{this.value=e.target.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))},this.label="",this.size="md",this.placeholder="",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.type="text",this.value="",this.prefix="",this.suffix="",this.pattern="",this.autocomplete="",this.inputmode="",this.liveError=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},type:{type:String},value:{type:String},prefix:{type:String},suffix:{type:String},pattern:{type:String},minlength:{type:Number},maxlength:{type:Number},autocomplete:{type:String},inputmode:{type:String},liveError:{type:Boolean,attribute:"live-error"}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}updated(e){e.has("value")&&this.internals.setFormValue(this.value),this.syncValidity(),this.warnIfNameless()}syncValidity(){const e=this.renderRoot?.querySelector(".input");if(!e)return;const t=e.validity;if(t.valid){this.internals.setValidity({});return}const o=t.valueMissing&&this.label?`Enter ${this.label}.`:e.validationMessage;this.internals.setValidity({valueMissing:t.valueMissing,typeMismatch:t.typeMismatch,patternMismatch:t.patternMismatch,tooLong:t.tooLong,tooShort:t.tooShort,rangeUnderflow:t.rangeUnderflow,rangeOverflow:t.rangeOverflow,stepMismatch:t.stepMismatch,badInput:t.badInput},o,e)}warnIfNameless(){this.warnedNameless||this.label||this.getAttribute("aria-label")||(this.warnedNameless=!0,console.warn("⚠️  esa-text-field has no accessible name. Set `label` (preferred — it renders visibly AND wires <label for>), or `aria-label` if the name is carried elsewhere. `placeholder` is not a name: it vanishes as soon as the user types.",this))}focus(e){const t=this.renderRoot?.querySelector(".input");t?t.focus(e):super.focus(e)}render(){const e=!!this.errorText,t=[e?"error":"",this.helpText?"help":""].filter(Boolean).join(" ");return i`
      <div class="field ${e?"field--error":""}">
        ${this.label?i`<label class="label typography-${h[this.size]}" for="input"
              >${this.label}${this.required?i`<span class="required" aria-hidden="true">*</span>`:null}</label
            >`:null}
        <div class="control typography-${c[this.size]}">
          ${this.prefix?i`<span class="affix affix--prefix">${this.prefix}</span>`:null}
          <input
            id="input"
            class="input"
            .type=${this.type}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            pattern=${this.pattern||r}
            minlength=${this.minlength??r}
            maxlength=${this.maxlength??r}
            autocomplete=${this.autocomplete||r}
            inputmode=${this.inputmode||r}
            name=${this.name||r}
            aria-required=${this.required?"true":r}
            aria-invalid=${e?"true":r}
            aria-describedby=${t||r}
            @input=${this.onInput}
          />
          ${this.suffix?i`<span class="affix affix--suffix">${this.suffix}</span>`:null}
        </div>

        <!-- BOTH nodes render unconditionally. A live region that is created at the same
             moment as its text is routinely not announced — it has to already exist for
             the mutation to be observed. :empty collapses the gap so a clean field
             looks untouched, WITHOUT display:none, which would drop it from the
             accessibility tree and defeat the whole arrangement. -->
        <p
          class="error typography-body-sm ${e?"is-shown":"visually-hidden"}"
          id="error"
          role=${this.liveError?"alert":r}
          data-esa-live=${this.liveError?"opt-in":r}
        >${e?i`${d}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`:r}</p>
        <p class="help typography-body-sm ${this.helpText?"is-shown":"visually-hidden"}" id="help"
          >${this.helpText||r}</p
        >
      </div>
    `}static{this.styles=[n,l,s`
    :host {
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #cecece);
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
      color: var(--form-label-color, #646464);
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
      --_field-border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
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
      color: var(--form-text-color, #202020);
      background: transparent;
      border: none;
      outline: none;
      box-sizing: border-box;
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #838383);
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
      color: var(--form-affix-color, var(--color-content-default-secondary, #646464));
      background: var(--form-affix-bg, var(--color-background-elevation-sunken, #f0f0f0));
      user-select: none;
      white-space: nowrap;
    }
    .affix--prefix {
      border-inline-end: var(--form-border-width, 1px) solid
        var(--form-affix-border-color, var(--form-border-color, #cecece));
    }
    .affix--suffix {
      border-inline-start: var(--form-border-width, 1px) solid
        var(--form-affix-border-color, var(--form-border-color, #cecece));
    }

    .field--error .control {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    .field--error .control:focus-within {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--form-error-border-color, #e5484d);
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
      color: var(--form-help-color, #838383);
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
  `]}}customElements.get("esa-text-field")||customElements.define("esa-text-field",p);
