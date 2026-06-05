import{i as n,b as s,a as l}from"./lit-element.C8p3bJxG.js";class d extends n{constructor(){super(),this.onKeydown=e=>{if(this.disabled)return;const t=this.options;if(t.length===0)return;const o=this.selectedIndex>=0?this.selectedIndex:0;let r;switch(e.key){case"ArrowRight":case"ArrowDown":r=(o+1)%t.length;break;case"ArrowLeft":case"ArrowUp":r=(o-1+t.length)%t.length;break;case"Home":r=0;break;case"End":r=t.length-1;break;case"Enter":case" ":e.preventDefault(),this.select(t[o]);return;default:return}e.preventDefault(),this.select(t[r]),this.focusButton(r)},this.label="",this.hint="",this.options=[],this.value="",this.size="md",this.disabled=!1,this.required=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},hint:{type:String},options:{type:Array},value:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},required:{type:Boolean}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}willUpdate(e){(e.has("value")||e.has("options"))&&this.syncFormValue()}get selectedIndex(){return this.options.findIndex(e=>e.value===this.value)}get focusIndex(){const e=this.selectedIndex;return e>=0?e:0}syncFormValue(){this.internals.setFormValue(this.value||null)}select(e){this.disabled||e.value===this.value||(this.value=e.value,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))}focusButton(e){this.renderRoot.querySelectorAll(".option")[e]?.focus()}render(){const e=!!this.label;return s`
      ${e?s`<span class="label" id="label">
            ${this.label}${this.required?s`<span class="required" aria-hidden="true">*</span>`:null}
          </span>`:null}
      <div
        class="group"
        role="radiogroup"
        aria-labelledby=${e?"label":null}
        aria-required=${this.required?"true":null}
        aria-describedby=${this.hint?"hint":null}
        @keydown=${this.onKeydown}
      >
        ${this.options.map((t,o)=>{const r=o===this.selectedIndex;return s`<button
            type="button"
            role="radio"
            class="option ${r?"option--selected":""}"
            aria-checked=${r}
            tabindex=${o===this.focusIndex?0:-1}
            ?disabled=${this.disabled}
            @click=${()=>this.select(t)}
          >
            ${t.label}
          </button>`})}
      </div>
      ${this.hint?s`<span class="hint" id="hint">${this.hint}</span>`:null}
    `}static{this.styles=l`
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
    }
    :host([size='xs']) {
      --_height: var(--form-height-xs, 28px);
      --_padding-x: var(--form-padding-x-xs, 8px);
      --_font-size: var(--form-font-size-xs, 11px);
      --_radius: var(--form-radius-xs, 4px);
    }
    :host([size='sm']) {
      --_height: var(--form-height-sm, 32px);
      --_padding-x: var(--form-padding-x-sm, 8px);
      --_font-size: var(--form-font-size-sm, 12px);
      --_radius: var(--form-radius-sm, 6px);
    }
    :host([size='lg']) {
      --_height: var(--form-height-lg, 48px);
      --_padding-x: var(--form-padding-x-lg, 16px);
      --_font-size: var(--form-font-size-lg, 16px);
      --_radius: var(--form-radius-lg, 10px);
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

    .group {
      display: inline-flex;
      width: fit-content;
      max-width: 100%;
    }

    .option {
      appearance: none;
      height: var(--_height);
      padding: 0 var(--_padding-x);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--_border-width) solid var(--_border-color);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }

    /* Connected borders: collapse the shared edge, square the inner corners. */
    .option:not(:first-child) {
      margin-left: calc(-1 * var(--_border-width));
    }
    .option:first-child {
      border-top-left-radius: var(--_radius);
      border-bottom-left-radius: var(--_radius);
    }
    .option:last-child {
      border-top-right-radius: var(--_radius);
      border-bottom-right-radius: var(--_radius);
    }

    .option:hover:not(:disabled):not(.option--selected) {
      background: var(--color-surface-sunken, #efefef);
    }

    /* Raise the focused segment so its ring and border sit above neighbors. */
    .option:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--focus-ring-color, #005862);
      position: relative;
      z-index: 1;
    }

    .option--selected {
      background: var(--color-primary, #005862);
      border-color: var(--color-primary, #005862);
      color: var(--color-text-inverse, #fff);
      position: relative;
      z-index: 1;
    }

    .option:disabled {
      cursor: not-allowed;
      background: var(--form-bg-disabled, #efefef);
      color: var(--color-disabled-text, #a3a3a3);
      border-color: var(--form-border-color-disabled, #e5e5e5);
    }
    .option--selected:disabled {
      background: var(--color-disabled-text, #a3a3a3);
      border-color: var(--color-disabled-text, #a3a3a3);
      color: var(--color-text-inverse, #fff);
    }

    .hint {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
  `}}customElements.get("esa-button-toggle")||customElements.define("esa-button-toggle",d);const c=[{value:"list",label:"List"},{value:"grid",label:"Grid"},{value:"map",label:"Map"}];customElements.whenDefined("esa-button-toggle").then(()=>{document.querySelectorAll("esa-button-toggle").forEach(a=>{a.options=c}),document.querySelector('esa-button-toggle[data-demo="preview"]')?.setAttribute("value","grid"),document.querySelector('esa-button-toggle[data-demo="preview"]').value="grid"});const i=document.getElementById("bt-form");i?.addEventListener("submit",a=>{a.preventDefault();const e=new FormData(i);document.getElementById("bt-out").textContent="view = "+JSON.stringify(e.get("view"))});
