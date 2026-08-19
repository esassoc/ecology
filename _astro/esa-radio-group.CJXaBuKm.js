import{i as a,b as s,a as o}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.D6s5VeQm.js";const n={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},d={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class c extends a{constructor(){super(),this.selectOption=e=>{e.disabled||(this.value=e.value,this.internals.setFormValue(this.value),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))},this.onKeydown=(e,t)=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.selectOption(t))},this.options=[],this.label="",this.size="md",this.orientation="vertical",this.value=null,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},label:{type:String},size:{type:String,reflect:!0},orientation:{type:String,reflect:!0},name:{type:String,reflect:!0},value:{type:String}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}e.has("value")&&this.internals.setFormValue(this.value)}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}isSelected(e){return this.value===e}render(){return s`
      ${this.label?s`<span class="group-label typography-${n[this.size]}">${this.label}</span>`:null}
      <div class="items" role="radiogroup" aria-label=${this.label}>
        ${this.options.map(e=>{const t=this.isSelected(e.value),i=e.disabled??!1;return s`
            <label
              class="item ${i?"item--disabled":""}"
              @keydown=${r=>this.onKeydown(r,e)}
              @click=${()=>this.selectOption(e)}
            >
              <span
                class="circle ${t?"circle--selected":""}"
                role="radio"
                aria-checked=${String(t)}
                aria-disabled=${String(i)}
                tabindex=${i?-1:0}
              >
                <span class="dot"></span>
              </span>
              <span class="item-label typography-${d[this.size]}">${e.label}</span>
            </label>
          `})}
      </div>
    `}static{this.styles=[l,o`
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

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-primary, #171717);
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
      /* The size token is authoritative: without this, re-pointing the indicator
         border width would resize the control instead of thickening its edge. */
      box-sizing: border-box;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: 50%;
      background: var(--form-bg, #fff);
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .circle--selected {
      border-color: var(--color-background-brand, #43608a);
    }
    .circle:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
    }

    .dot {
      width: var(--_radio-dot-size);
      height: var(--_radio-dot-size);
      border-radius: 50%;
      background: transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .circle--selected .dot {
      background: var(--color-background-brand, #43608a);
    }

    .item-label {
      color: var(--color-content-primary, #171717);
    }
  `]}}customElements.get("esa-radio-group")||customElements.define("esa-radio-group",c);
