import{i as n,b as r,a as l}from"./lit-element.C8p3bJxG.js";class d extends n{constructor(){super(),this.selectOption=e=>{e.disabled||(this.value=e.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))},this.onKeydown=(e,t)=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.selectOption(t))},this.options=[],this.label="",this.size="md",this.orientation="vertical",this.value=null,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},label:{type:String},size:{type:String,reflect:!0},orientation:{type:String,reflect:!0},value:{type:String}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}isSelected(e){return this.value===e}render(){return r`
      ${this.label?r`<span class="group-label">${this.label}</span>`:null}
      <div class="items" role="radiogroup" aria-label=${this.label}>
        ${this.options.map(e=>{const t=this.isSelected(e.value),i=e.disabled??!1;return r`
            <label
              class="item ${i?"item--disabled":""}"
              @keydown=${o=>this.onKeydown(o,e)}
            >
              <span
                class="circle ${t?"circle--selected":""}"
                role="radio"
                aria-checked=${String(t)}
                aria-disabled=${String(i)}
                tabindex=${i?-1:0}
                @click=${()=>this.selectOption(e)}
              >
                <span class="dot"></span>
              </span>
              <span class="item-label">${e.label}</span>
            </label>
          `})}
      </div>
    `}static{this.styles=l`
    :host {
      --_radio-size: 20px;
      --_radio-dot-size: 10px;
      --_radio-font-size: var(--form-font-size-md, 0.9375rem);
      display: block;
    }
    :host([size='xs']) {
      --_radio-size: 14px;
      --_radio-dot-size: 7px;
      --_radio-font-size: var(--form-font-size-xs, 0.8125rem);
    }
    :host([size='sm']) {
      --_radio-size: 16px;
      --_radio-dot-size: 8px;
      --_radio-font-size: var(--form-font-size-sm, 0.875rem);
    }
    :host([size='lg']) {
      --_radio-size: 24px;
      --_radio-dot-size: 12px;
      --_radio-font-size: var(--form-font-size-lg, 1.125rem);
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_radio-font-size);
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

    .circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_radio-size);
      height: var(--_radio-size);
      flex-shrink: 0;
      border: var(--form-border-width, 2px) solid var(--form-border-color, #d4d4d4);
      border-radius: 50%;
      background: var(--form-bg, #fff);
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .circle--selected {
      border-color: var(--color-primary, #005862);
    }
    .circle:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #005862);
      box-shadow: 0 0 0 var(--focus-ring-width, 2px)
        var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }

    .dot {
      width: var(--_radio-dot-size);
      height: var(--_radio-dot-size);
      border-radius: 50%;
      background: transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .circle--selected .dot {
      background: var(--color-primary, #005862);
    }

    .item-label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_radio-font-size);
      color: var(--color-text-primary, #171717);
      line-height: 1.4;
    }
  `}}customElements.get("esa-radio-group")||customElements.define("esa-radio-group",d);const a=document.getElementById("rg-form");a?.addEventListener("submit",s=>{s.preventDefault();const e=new FormData(a);document.getElementById("rg-out").textContent="priority = "+JSON.stringify(e.get("priority"))});
