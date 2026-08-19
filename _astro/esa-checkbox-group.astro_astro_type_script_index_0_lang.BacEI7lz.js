import{b as o,w as d,i as h,A as i,a as p}from"./lit-element.D8DSg5zn.js";import{t as u}from"./typography.KBHeYOQc.js";import{a as b}from"./a11y.sqk3bMt7.js";const f=o`<svg
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
</svg>`,m={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},x={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"},g=d`<polyline points="20 6 9 17 4 12"></polyline>`;class y extends h{constructor(){super(),this.toggleOption=e=>{if(e.disabled)return;const t=this.value.indexOf(e.value);this.value=t>=0?this.value.filter(r=>r!==e.value):[...this.value,e.value],this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))},this.onKeydown=(e,t)=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.toggleOption(t))},this.options=[],this.label="",this.size="md",this.orientation="vertical",this.value=[],this.required=!1,this.helpText="",this.errorText="",this.liveError=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},label:{type:String},size:{type:String,reflect:!0},orientation:{type:String,reflect:!0},name:{type:String,reflect:!0},value:{type:Array},required:{type:Boolean},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},liveError:{type:Boolean,attribute:"live-error"}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}(e.has("value")||e.has("name"))&&this.syncFormValue()}connectedCallback(){super.connectedCallback(),this.syncFormValue()}updated(){this.syncValidity()}syncValidity(){if(!this.required||this.value.length>0){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".box")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Select at least one option for ${this.label}.`:"Select at least one option.",e)}syncFormValue(){const e=new FormData,t=this.name||"checkbox-group";for(const r of this.value)e.append(t,r);this.internals.setFormValue(e)}isChecked(e){return this.value.includes(e)}focus(e){const t=this.renderRoot?.querySelector(".box--checked, .box");t?t.focus(e):super.focus(e)}render(){const e=!!this.errorText,t=[e?"error":"",this.helpText?"help":""].filter(Boolean).join(" ");return o`
      <!-- A real fieldset/legend rather than a div with role=group + a copied aria-label.
           The legend names the fieldset natively (measured to work inside a shadow root),
           and a reference cannot drift from the visible text or vanish when label is
           empty. role=group is left IMPLICIT here — the explicit one bought nothing and
           is poorly supported on iOS VoiceOver and Android TalkBack. -->
      <fieldset
        class="items ${e?"items--error":""}"
        aria-invalid=${e?"true":i}
        aria-describedby=${t||i}
      >
        ${this.label?o`<legend class="group-label typography-${m[this.size]}" id="legend">
              ${this.label}${this.required?o`<span class="group-label__req"> (select at least one)</span>`:null}
            </legend>`:null}
        ${this.options.map(r=>{const s=this.isChecked(r.value),a=r.disabled??!1;return o`
            <label
              class="item ${a?"item--disabled":""}"
              @keydown=${c=>this.onKeydown(c,r)}
            >
              <span
                class="box ${s?"box--checked":""}"
                role="checkbox"
                aria-checked=${String(s)}
                aria-disabled=${String(a)}
                tabindex=${a?-1:0}
                @click=${()=>this.toggleOption(r)}
              >
                ${s?o`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`:null}
              </span>
              <span class="item-label typography-${x[this.size]}">${r.label}</span>
            </label>
          `})}
      </fieldset>

      <!-- Both message nodes always present so the live region pre-exists its content;
           .visually-hidden when empty keeps them out of flow. -->
      <p
        class="error typography-body-sm ${e?"is-shown":"visually-hidden"}"
        id="error"
        role=${this.liveError?"alert":i}
          data-esa-live=${this.liveError?"opt-in":i}
      >${e?o`${f}<span class="visually-hidden">Error: </span
              ><span>${this.errorText}</span>`:i}</p>
      <p class="help typography-body-sm ${this.helpText?"is-shown":"visually-hidden"}" id="help"
        >${this.helpText||i}</p
      >
    `}static{this.styles=[u,b,p`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--radius-md, 0.5rem);
      --_checkbox-icon-size: 16px;
      display: block;
    }
    :host([size='xs']) {
      --_checkbox-size: 14px;
      --_checkbox-radius: var(--radius-sm, 0.25rem);
      --_checkbox-icon-size: 10px;
    }
    :host([size='sm']) {
      --_checkbox-size: 16px;
      --_checkbox-radius: var(--radius-sm, 0.25rem);
      --_checkbox-icon-size: 12px;
    }
    :host([size='lg']) {
      --_checkbox-size: 24px;
      --_checkbox-radius: var(--radius-md, 0.5rem);
      --_checkbox-icon-size: 20px;
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-default, #202020);
    }

    .items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-200, 8px);
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

    .box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_checkbox-size);
      height: var(--_checkbox-size);
      flex-shrink: 0;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--_checkbox-radius);
      background: var(--color-background-field, transparent);
      color: var(--color-content-default-knockout, #fcfcfc);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box--checked {
      background: var(--color-background-brand, #46a758);
      border-color: var(--color-background-brand, #46a758);
    }

    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    /* Unchecked only — see esa-checkbox for why. */
    .item--disabled .box:not(.box--checked) {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
    }
    .box:focus-visible {
      border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
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
  `]}}customElements.get("esa-checkbox-group")||customElements.define("esa-checkbox-group",y);const n=document.getElementById("cbg-form");n?.addEventListener("submit",l=>{l.preventDefault();const e=new FormData(n);document.getElementById("cbg-out").textContent="media = "+JSON.stringify(e.getAll("media"))});
