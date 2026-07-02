import{w as n,i as c,b as t,a as l}from"./lit-element.C8p3bJxG.js";const h=n`<polyline points="20 6 9 17 4 12"></polyline>`;class d extends c{constructor(){super(),this.toggleOption=e=>{if(e.disabled)return;const s=this.value.indexOf(e.value);this.value=s>=0?this.value.filter(o=>o!==e.value):[...this.value,e.value],this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))},this.onKeydown=(e,s)=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.toggleOption(s))},this.options=[],this.label="",this.size="md",this.orientation="vertical",this.name="",this.value=[],this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},label:{type:String},size:{type:String,reflect:!0},orientation:{type:String,reflect:!0},name:{type:String},value:{type:Array}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){const e=new FormData,s=this.name||"checkbox-group";for(const o of this.value)e.append(s,o);this.internals.setFormValue(e)}isChecked(e){return this.value.includes(e)}render(){return t`
      ${this.label?t`<span class="group-label">${this.label}</span>`:null}
      <div class="items" role="group" aria-label=${this.label}>
        ${this.options.map(e=>{const s=this.isChecked(e.value),o=e.disabled??!1;return t`
            <label
              class="item ${o?"item--disabled":""}"
              @keydown=${a=>this.onKeydown(a,e)}
            >
              <span
                class="box ${s?"box--checked":""}"
                role="checkbox"
                aria-checked=${String(s)}
                aria-disabled=${String(o)}
                tabindex=${o?-1:0}
                @click=${()=>this.toggleOption(e)}
              >
                ${s?t`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${h}</svg>`:null}
              </span>
              <span class="item-label">${e.label}</span>
            </label>
          `})}
      </div>
    `}static{this.styles=l`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--form-radius-md, 0.5rem);
      --_checkbox-font-size: var(--form-font-size-md, 0.9375rem);
      --_checkbox-icon-size: 16px;
      display: block;
    }
    :host([size='xs']) {
      --_checkbox-size: 14px;
      --_checkbox-radius: var(--form-radius-xs, 0.25rem);
      --_checkbox-font-size: var(--form-font-size-xs, 0.8125rem);
      --_checkbox-icon-size: 10px;
    }
    :host([size='sm']) {
      --_checkbox-size: 16px;
      --_checkbox-radius: var(--form-radius-sm, 0.25rem);
      --_checkbox-font-size: var(--form-font-size-sm, 0.875rem);
      --_checkbox-icon-size: 12px;
    }
    :host([size='lg']) {
      --_checkbox-size: 24px;
      --_checkbox-radius: var(--form-radius-lg, 0.5rem);
      --_checkbox-font-size: var(--form-font-size-lg, 1.125rem);
      --_checkbox-icon-size: 20px;
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_checkbox-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--color-text-primary, #171717);
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
      border: var(--form-border-width, 2px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--form-bg, #fff);
      color: var(--color-text-inverse, #fff);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box--checked {
      background: var(--color-primary, #43608a);
      border-color: var(--color-primary, #43608a);
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
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_checkbox-font-size);
      color: var(--color-text-primary, #171717);
      line-height: 1.4;
    }
  `}}customElements.get("esa-checkbox-group")||customElements.define("esa-checkbox-group",d);const r=document.getElementById("cbg-form");r?.addEventListener("submit",i=>{i.preventDefault();const e=new FormData(r);document.getElementById("cbg-out").textContent="media = "+JSON.stringify(e.getAll("media"))});
