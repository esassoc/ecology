import{w as l,i as c,b as s,a as n}from"./lit-element.D8DSg5zn.js";import{t as d}from"./typography.KBHeYOQc.js";const h={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},b={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"},u=l`<polyline points="20 6 9 17 4 12"></polyline>`;class p extends c{constructor(){super(),this.toggleOption=e=>{if(e.disabled)return;const o=this.value.indexOf(e.value);this.value=o>=0?this.value.filter(t=>t!==e.value):[...this.value,e.value],this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))},this.onKeydown=(e,o)=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.toggleOption(o))},this.options=[],this.label="",this.size="md",this.orientation="vertical",this.value=[],this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},label:{type:String},size:{type:String,reflect:!0},orientation:{type:String,reflect:!0},name:{type:String,reflect:!0},value:{type:Array}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}(e.has("value")||e.has("name"))&&this.syncFormValue()}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){const e=new FormData,o=this.name||"checkbox-group";for(const t of this.value)e.append(o,t);this.internals.setFormValue(e)}isChecked(e){return this.value.includes(e)}render(){return s`
      ${this.label?s`<span class="group-label typography-${h[this.size]}">${this.label}</span>`:null}
      <div class="items" role="group" aria-label=${this.label}>
        ${this.options.map(e=>{const o=this.isChecked(e.value),t=e.disabled??!1;return s`
            <label
              class="item ${t?"item--disabled":""}"
              @keydown=${i=>this.onKeydown(i,e)}
            >
              <span
                class="box ${o?"box--checked":""}"
                role="checkbox"
                aria-checked=${String(o)}
                aria-disabled=${String(t)}
                tabindex=${t?-1:0}
                @click=${()=>this.toggleOption(e)}
              >
                ${o?s`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${u}</svg>`:null}
              </span>
              <span class="item-label typography-${b[this.size]}">${e.label}</span>
            </label>
          `})}
      </div>
    `}static{this.styles=[d,n`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--form-radius-md, 0.5rem);
      --_checkbox-icon-size: 16px;
      display: block;
    }
    :host([size='xs']) {
      --_checkbox-size: 14px;
      --_checkbox-radius: var(--form-radius-xs, 0.25rem);
      --_checkbox-icon-size: 10px;
    }
    :host([size='sm']) {
      --_checkbox-size: 16px;
      --_checkbox-radius: var(--form-radius-sm, 0.25rem);
      --_checkbox-icon-size: 12px;
    }
    :host([size='lg']) {
      --_checkbox-size: 24px;
      --_checkbox-radius: var(--form-radius-lg, 0.5rem);
      --_checkbox-icon-size: 20px;
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-default, #171717);
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
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--color-background-field, transparent);
      color: var(--color-content-default-knockout, #fff);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box--checked {
      background: var(--color-background-brand, #43608a);
      border-color: var(--color-background-brand, #43608a);
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
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    .item-label {
      color: var(--color-content-default, #171717);
    }
  `]}}customElements.get("esa-checkbox-group")||customElements.define("esa-checkbox-group",p);const r=document.getElementById("cbg-form");r?.addEventListener("submit",a=>{a.preventDefault();const e=new FormData(r);document.getElementById("cbg-out").textContent="media = "+JSON.stringify(e.getAll("media"))});
