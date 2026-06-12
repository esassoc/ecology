import{i as l,b as r,a as d}from"./lit-element.C8p3bJxG.js";import{o as c}from"./unsafe-svg.BgYkCkso.js";class u extends l{constructor(){super(),this.onKeydown=e=>{if(this.disabled)return;const t=this.options;if(t.length===0)return;const i=this.selectedIndex>=0?this.selectedIndex:0;let o;switch(e.key){case"ArrowRight":case"ArrowDown":o=(i+1)%t.length;break;case"ArrowLeft":case"ArrowUp":o=(i-1+t.length)%t.length;break;case"Home":o=0;break;case"End":o=t.length-1;break;case"Enter":case" ":e.preventDefault(),this.select(t[i]);return;default:return}e.preventDefault(),this.select(t[o]),this.focusButton(o)},this.label="",this.hint="",this.options=[],this.value="",this.size="md",this.disabled=!1,this.required=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},hint:{type:String},options:{type:Array},value:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},required:{type:Boolean}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}willUpdate(e){(e.has("value")||e.has("options"))&&this.syncFormValue()}get selectedIndex(){return this.options.findIndex(e=>e.value===this.value)}get focusIndex(){const e=this.selectedIndex;return e>=0?e:0}syncFormValue(){this.internals.setFormValue(this.value||null)}select(e){this.disabled||e.value===this.value||(this.value=e.value,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))}focusButton(e){this.renderRoot.querySelectorAll(".option")[e]?.focus()}render(){const e=!!this.label;return r`
      ${e?r`<span class="label" id="label">
            ${this.label}${this.required?r`<span class="required" aria-hidden="true">*</span>`:null}
          </span>`:null}
      <div
        class="group"
        role="radiogroup"
        aria-labelledby=${e?"label":null}
        aria-required=${this.required?"true":null}
        aria-describedby=${this.hint?"hint":null}
        @keydown=${this.onKeydown}
      >
        ${this.options.map((t,i)=>{const o=i===this.selectedIndex;return r`<button
            type="button"
            role="radio"
            class="option ${o?"option--selected":""}"
            aria-checked=${o}
            aria-label=${t.ariaLabel??(t.label?null:t.value)}
            tabindex=${i===this.focusIndex?0:-1}
            ?disabled=${this.disabled}
            @click=${()=>this.select(t)}
          >
            ${t.icon?r`<svg
                  class="option__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  ${c(t.icon)}
                </svg>`:null}
            ${t.label?r`<span class="option__label">${t.label}</span>`:null}
          </button>`})}
      </div>
      ${this.hint?r`<span class="hint" id="hint">${this.hint}</span>`:null}
    `}static{this.styles=d`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
      --_height: var(--form-height-md, 40px);
      --_padding-x: var(--form-padding-x-md, 12px);
      --_font-size: var(--form-font-size-md, 14px);
      --_radius: var(--form-radius-md, 8px);
      --_border-width: var(--form-border-width, 1px);
      --_border-color: var(--form-border-color, #d4d4d4);
      --_icon-size: 18px;
    }
    :host([size='xs']) {
      --_height: var(--form-height-xs, 28px);
      --_padding-x: var(--form-padding-x-xs, 8px);
      --_font-size: var(--form-font-size-xs, 11px);
      --_radius: var(--form-radius-xs, 4px);
      --_icon-size: 14px;
    }
    :host([size='sm']) {
      --_height: var(--form-height-sm, 32px);
      --_padding-x: var(--form-padding-x-sm, 8px);
      --_font-size: var(--form-font-size-sm, 12px);
      --_radius: var(--form-radius-sm, 6px);
      --_icon-size: 16px;
    }
    :host([size='lg']) {
      --_height: var(--form-height-lg, 48px);
      --_padding-x: var(--form-padding-x-lg, 16px);
      --_font-size: var(--form-font-size-lg, 16px);
      --_radius: var(--form-radius-lg, 10px);
      --_icon-size: 20px;
    }

    .label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-label-color, #171717);
    }
    .required {
      color: var(--color-danger, #ef4444);
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
      background: var(--color-surface-sunken, #efefef);
      border: var(--_border-width) solid var(--_border-color);
      border-radius: var(--_radius);
    }

    .option {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-150, 6px);
      height: calc(var(--_height) - 4px);
      padding: 0 var(--_padding-x);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--color-text-secondary, #525252);
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
      color: var(--color-text-primary, #171717);
      background: var(--color-hover-overlay, rgba(0, 0, 0, 0.04));
    }

    .option:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--focus-ring-color, #43608a);
      position: relative;
      z-index: 1;
    }

    .option--selected {
      background: var(--form-bg, #fff);
      color: var(--color-primary, #43608a);
      font-weight: var(--font-weight-semibold, 550);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .option:disabled {
      cursor: not-allowed;
      color: var(--color-disabled-text, #a3a3a3);
      background: transparent;
    }
    .option--selected:disabled {
      background: var(--form-bg, #fff);
      color: var(--color-disabled-text, #a3a3a3);
    }

    .hint {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
  `}}customElements.get("esa-button-toggle")||customElements.define("esa-button-toggle",u);const h=[{value:"list",label:"List"},{value:"grid",label:"Grid"},{value:"map",label:"Map"}],s=[{value:"grid",label:"Grid",icon:"<rect width='18' height='18' x='3' y='3' rx='2'/><path d='M3 9h18'/><path d='M3 15h18'/><path d='M9 3v18'/><path d='M15 3v18'/>"},{value:"kanban",label:"Kanban",icon:"<path d='M3 3h18v18H3z'/><path d='M9 3v18'/><path d='M15 3v18'/>"},{value:"timeline",label:"Timeline",icon:"<path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/>"}];customElements.whenDefined("esa-button-toggle").then(()=>{document.querySelectorAll('esa-button-toggle:not([data-demo="icons"])').forEach(a=>{a.options=h}),document.querySelectorAll('esa-button-toggle[data-demo="icons"]').forEach(a=>{a.options=s,a.value="grid"}),document.querySelectorAll('esa-button-toggle[data-demo="icons-only"]').forEach(a=>{a.options=s.map(({label:e,...t})=>({...t,ariaLabel:e})),a.value="grid"}),document.querySelector('esa-button-toggle[data-demo="preview"]')?.setAttribute("value","grid"),document.querySelector('esa-button-toggle[data-demo="preview"]').value="grid"});const n=document.getElementById("bt-form");n?.addEventListener("submit",a=>{a.preventDefault();const e=new FormData(n);document.getElementById("bt-out").textContent="view = "+JSON.stringify(e.get("view"))});
