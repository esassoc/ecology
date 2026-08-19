import{b as i,i as c,A as r,a as h}from"./lit-element.D8DSg5zn.js";import{t as p}from"./typography.KBHeYOQc.js";import{a as u}from"./a11y.sqk3bMt7.js";const b=i`<svg
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
</svg>`,g={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},f={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class m extends c{constructor(){super(),this.selectOption=e=>{e.disabled||(this.value=e.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))},this.onKeydown=(e,t)=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.selectOption(t))},this.options=[],this.label="",this.size="md",this.orientation="vertical",this.value=null,this.required=!1,this.helpText="",this.errorText="",this.liveError=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},label:{type:String},size:{type:String,reflect:!0},orientation:{type:String,reflect:!0},name:{type:String,reflect:!0},value:{type:String},required:{type:Boolean},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},liveError:{type:Boolean,attribute:"live-error"}}}updated(){this.syncValidity()}syncValidity(){if(!this.required||this.value){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".circle")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Select ${this.label}.`:"Select an option.",e)}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}e.has("value")&&this.internals.setFormValue(this.value)}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}isSelected(e){return this.value===e}focus(e){const t=this.renderRoot?.querySelector(".circle--selected, .circle");t?t.focus(e):super.focus(e)}render(){const e=!!this.errorText,t=[e?"error":"",this.helpText?"help":""].filter(Boolean).join(" ");return i`
      <!-- A real fieldset/legend, not a div with role=group + aria-label. Three reasons:
           the legend NAMES the fieldset natively (measured to work inside a shadow
           root); a name by REFERENCE cannot drift from the visible text the way the old
           copied aria-label did, which also silently unnamed the group whenever label
           was empty; and role=group is the weak one — support is poor on iOS VoiceOver
           and Android TalkBack, i.e. exactly the users most likely to be filling this in
           on a phone.

           role=radiogroup overrides the fieldset's implicit group role because ARIA does
           not allow aria-required on group, and radiogroup is what this actually is.
           aria-labelledby is belt-and-braces: name-from-legend is an HTML-AAM mapping,
           and overriding the role puts it on less certain ground. -->
      <fieldset
        class="items ${e?"items--error":""}"
        role="radiogroup"
        aria-labelledby=${this.label?"legend":r}
        aria-required=${this.required?"true":r}
        aria-invalid=${e?"true":r}
        aria-describedby=${t||r}
      >
        ${this.label?i`<legend class="group-label typography-${g[this.size]}" id="legend">
              ${this.label}${this.required?i`<span class="required" aria-hidden="true">*</span>`:null}
            </legend>`:null}
        ${this.options.map((o,n)=>{const s=this.isSelected(o.value),a=o.disabled??!1,l=`opt-${n}-label`;return i`
            <label
              class="item ${a?"item--disabled":""}"
              @keydown=${d=>this.onKeydown(d,o)}
              @click=${()=>this.selectOption(o)}
            >
              <span
                class="circle ${s?"circle--selected":""}"
                role="radio"
                aria-labelledby=${l}
                aria-checked=${String(s)}
                aria-disabled=${String(a)}
                tabindex=${a?-1:0}
              >
                <span class="dot"></span>
              </span>
              <span id=${l} class="item-label typography-${f[this.size]}"
                >${o.label}</span
              >
            </label>
          `})}
      </fieldset>

      <!-- Both message nodes always present so the live region pre-exists its content;
           .visually-hidden when empty keeps them out of flow. -->
      <p
        class="error typography-body-sm ${e?"is-shown":"visually-hidden"}"
        id="error"
        role=${this.liveError?"alert":r}
          data-esa-live=${this.liveError?"opt-in":r}
      >${e?i`${b}<span class="visually-hidden">Error: </span
              ><span>${this.errorText}</span>`:r}</p>
      <p class="help typography-body-sm ${this.helpText?"is-shown":"visually-hidden"}" id="help"
        >${this.helpText||r}</p
      >
    `}static{this.styles=[p,u,h`
    :host {
      --_radio-size: 20px;
      --_radio-dot-size: 10px;
      display: block;
    }
    :host([size='xs']) {
      --_radio-size: 14px;
      --_radio-dot-size: 7px;
    }
    :host([size='sm']) {
      --_radio-size: 16px;
      --_radio-dot-size: 8px;
    }
    :host([size='lg']) {
      --_radio-size: 24px;
      --_radio-dot-size: 12px;
    }

    /* A <legend>, so it names the fieldset natively. The UA gives legend a float/
       padding treatment inside a bordered fieldset; with the border reset off below
       there is nothing to inset it from, and this restores plain block flow. */
    .group-label {
      display: block;
      padding: 0;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-default, #202020);
    }
    .required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-inline-start: 2px;
    }

    /* Now a <fieldset>, which arrives with a UA border, padding, margin and a
       min-inline-size: min-content that breaks flex children. All four are reset —
       the element is here for its SEMANTICS (name-from-legend, and disabled
       propagation if a group-level disabled is ever added), not its chrome. */
    .items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-200, 8px);
      border: 0;
      padding: 0;
      margin: 0;
      min-inline-size: 0;
    }
    :host([orientation='horizontal']) .items {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-400, 16px);
    }

    .item {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      cursor: pointer;
      user-select: none;
    }
    .item--disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_radio-size);
      height: var(--_radio-size);
      flex-shrink: 0;
      /* The size token is authoritative: without this, re-pointing the indicator
         border width would resize the control instead of thickening its edge. */
      box-sizing: border-box;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: 50%;
      background: var(--color-background-field, transparent);
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .circle--selected {
      border-color: var(--color-background-brand, #46a758);
    }
    .circle:focus-visible {
      border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .dot {
      width: var(--_radio-dot-size);
      height: var(--_radio-dot-size);
      border-radius: 50%;
      background: transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .circle--selected .dot {
      background: var(--color-background-brand, #46a758);
    }

    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    /* The dot is a CHILD here, not a fill on the circle, so unlike the checkbox
       this can paint every disabled circle without erasing the selection. */
    .item--disabled .circle {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
    }

    .item-label {
      color: var(--color-content-default, #202020);
    }

    /* An invalid group reddens its legend — the group is what is invalid, and there is
       no single box to outline the way a text field has. */
    .items--error .group-label {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }

    /* Both message nodes always render (the live region has to pre-exist its content);
       .visually-hidden takes the empty ones out of flow. Not display:none, which would
       drop them from the accessibility tree. */
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
    /* Colour, icon AND a visually-hidden "Error:" — colour alone is SC 1.4.1. */
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

    /* FORCED COLORS. The radio is worse off than the checkbox: the checkbox has a
       tick, a real shape that survives, but selection here is a .dot that is
       always in the DOM and differs ONLY by 'background' (transparent vs brand).
       Force-adjust both and selected and unselected become the same empty circle.
       Nothing else changes — border-WIDTH is constant, only border-colour moves,
       and colour is exactly what this mode overrides.

       CanvasText rather than Highlight for the dot: the dot sits inside the
       circle rather than replacing it, so it reads as a mark on the control, not
       as a selection sweep across a row. Highlight is reserved for list rows. */
    @media (forced-colors: active) {
      .circle {
        background: Canvas;
        border-color: CanvasText;
      }
      .circle--selected { border-color: CanvasText; }
      .circle--selected .dot { background: CanvasText; }
      .item--disabled .circle { border-color: GrayText; }
      .item--disabled .circle--selected .dot { background: GrayText; }
      .item--disabled { color: GrayText; }
    }
  `]}}customElements.get("esa-radio-group")||customElements.define("esa-radio-group",m);
