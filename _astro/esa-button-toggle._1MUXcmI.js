import{i as l,b as s,a as c}from"./lit-element.D8DSg5zn.js";import{t as d}from"./typography.KBHeYOQc.js";import{a as h}from"./a11y.sqk3bMt7.js";import{o as p}from"./unsafe-svg.XdkOy8tF.js";const u={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},g={xs:"microcopy-2xs",sm:"microcopy-xs",md:"microcopy-md",lg:"microcopy-lg"},b={xs:"microcopy-2xs-strong",sm:"microcopy-xs-strong",md:"microcopy-md-strong",lg:"microcopy-lg-strong"};class m extends l{constructor(){super(),this.onKeydown=e=>{if(this.disabled)return;const t=this.options;if(t.length===0)return;const a=this.selectedIndex>=0?this.selectedIndex:0;let r;switch(e.key){case"ArrowRight":case"ArrowDown":r=(a+1)%t.length;break;case"ArrowLeft":case"ArrowUp":r=(a-1+t.length)%t.length;break;case"Home":r=0;break;case"End":r=t.length-1;break;case"Enter":case" ":e.preventDefault(),this.select(t[a]);return;default:return}e.preventDefault(),this.select(t[r]),this.focusButton(r)},this.label="",this.helpText="",this.errorText="",this.options=[],this.value="",this.size="md",this.disabled=!1,this.required=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},options:{type:Array},value:{type:String},size:{type:String,reflect:!0},name:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},required:{type:Boolean}}}get resolvedHelpText(){return this.helpText}connectedCallback(){super.connectedCallback(),this.syncFormValue()}willUpdate(e){(e.has("value")||e.has("options"))&&this.syncFormValue()}updated(){this.syncValidity()}syncValidity(){if(!this.required||this.value){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".option")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Select ${this.label}.`:"Select an option.",e)}get selectedIndex(){return this.options.findIndex(e=>e.value===this.value)}get focusIndex(){const e=this.selectedIndex;return e>=0?e:0}syncFormValue(){this.internals.setFormValue(this.value||null)}select(e){this.disabled||e.value===this.value||(this.value=e.value,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))}focusButton(e){this.renderRoot.querySelectorAll(".option")[e]?.focus()}render(){const e=!!this.label,t=!!this.errorText,a=this.resolvedHelpText,r=t?"error":a?"help":null;return s`
      ${e?s`<span class="label typography-${u[this.size]}" id="label">
            ${this.label}${this.required?s`<span class="required" aria-hidden="true">*</span>`:null}
          </span>`:null}
      <div
        class="group ${t?"group--error":""}"
        role="radiogroup"
        aria-labelledby=${e?"label":null}
        aria-required=${this.required?"true":null}
        aria-invalid=${t?"true":null}
        aria-describedby=${r}
        @keydown=${this.onKeydown}
      >
        ${this.options.map((o,n)=>{const i=n===this.selectedIndex;return s`<button
            type="button"
            role="radio"
            class="option ${i?"option--selected":""} typography-${i?b[this.size]:g[this.size]}"
            aria-checked=${i}
            aria-label=${o.ariaLabel??(o.label?null:o.value)}
            tabindex=${n===this.focusIndex?0:-1}
            ?disabled=${this.disabled}
            @click=${()=>this.select(o)}
          >
            ${o.icon?s`<svg
                  class="option__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  ${p(o.icon)}
                </svg>`:null}
            ${o.label?s`<span class="option__label">${o.label}</span>`:null}
          </button>`})}
      </div>
      ${t?s`<span class="error typography-body-sm" id="error">${this.errorText}</span>`:a?s`<span class="help typography-body-sm" id="help">${a}</span>`:null}
    `}static{this.styles=[d,h,c`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
      --_pad-y: var(--spacing-300, 0.75rem);
      --_padding-x: var(--spacing-300, 0.75rem);
      --_radius: var(--radius-md, 0.5rem);
      --_border-width: var(--form-border-width, 1px);
      --_border-color: var(--form-border-color, #cecece);
      --_icon-size: 18px;
    }
    :host([size='xs']) {
      --_pad-y: var(--spacing-200, 0.5rem);
      --_padding-x: var(--spacing-200, 0.5rem);
      --_radius: var(--radius-sm, 0.25rem);
      --_icon-size: 14px;
    }
    :host([size='sm']) {
      --_pad-y: var(--spacing-250, 0.625rem);
      --_padding-x: var(--spacing-250, 0.625rem);
      --_radius: var(--radius-sm, 0.25rem);
      --_icon-size: 16px;
    }
    :host([size='lg']) {
      --_pad-y: var(--spacing-400, 1rem);
      --_padding-x: var(--spacing-400, 1rem);
      --_radius: var(--radius-md, 0.5rem);
      --_icon-size: 20px;
    }

    .label {
      color: var(--form-label-color, #646464);
    }
    .required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-left: 2px;
    }

    /* Segmented-pill track: a sunken rail with a small inset; the selected
       segment floats as a raised white chip. (Replaces the older connected-button
       model — softer, and what the Beacon tracker mockups settled on.) */
    .group {
      display: inline-flex;
      width: fit-content;
      max-width: 100%;
      gap: 2px;
      padding: 2px;
      background: var(--color-background-elevation-sunken, #f0f0f0);
      border: var(--_border-width) solid var(--_border-color);
      border-radius: var(--_radius);
    }
    .group--error {
      --_border-color: var(--form-error-border-color, #e5484d);
    }

    .option {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-150, 6px);
      /* Was calc(height - 4px) to compensate for the track's 2px padding. With no
         height token the segment is its own text plus padding, and the track wraps
         it — the compensation has nothing left to compensate for. */
      padding: var(--_pad-y) var(--_padding-x);
      color: var(--color-content-default-secondary, #646464);
      background: transparent;
      border: 0;
      border-radius: calc(var(--_radius) - 2px);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }

    .option__icon {
      width: var(--_icon-size);
      height: var(--_icon-size);
      flex-shrink: 0;
    }

    .option:hover:not(:disabled):not(.option--selected) {
      color: var(--color-content-default, #202020);
      background: var(--color-background-overlay-hover, rgba(0, 0, 0, 0.04));
    }

    .option:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
      position: relative;
      z-index: 1;
    }

    .option--selected {
      background: var(--color-background-elevation-raised, #fcfcfc);
      color: var(--color-content-brand, #2a7e3b);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .option:disabled {
      cursor: not-allowed;
      color: var(--color-content-disabled, #8d8d8d);
      background: transparent;
    }
    .option--selected:disabled {
      background: var(--color-background-elevation-raised, #fcfcfc);
      color: var(--color-content-disabled, #8d8d8d);
    }

    .help {
      color: var(--form-help-color, #838383);
    }
    .error {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }

    /* FORCED COLORS. The .group track keeps its real border, so the frame
       survives; what disappears is the SELECTED segment, whose whole treatment is
       a background, a colour and a 1px shadow.

       Highlight/HighlightText rather than a border, deliberately. '.option' is
       intrinsically sized inside a fit-content flex row, so a border on
       --selected alone would make that one segment 2px larger and shove its
       siblings sideways on every selection change; reserving the border on the
       base .option instead would outline all of them. A fill changes no boxes.

       The type role already swaps to OPTION_SELECTED_TYPE (a weight change, which
       survives force-adjustment), so this is the second channel, not the only. */
    @media (forced-colors: active) {
      .option--selected {
        background: Highlight;
        color: HighlightText;
      }
      .option:disabled { color: GrayText; }
      .option--selected:disabled {
        background: GrayText;
        color: Canvas;
      }
    }
  `]}}customElements.get("esa-button-toggle")||customElements.define("esa-button-toggle",m);
