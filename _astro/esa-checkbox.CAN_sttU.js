import{w as i,i as o,b as e,a as r}from"./lit-element.C8p3bJxG.js";const t=i`<polyline points="20 6 9 17 4 12"></polyline>`,c=i`<line x1="5" y1="12" x2="19" y2="12"></line>`;class a extends o{constructor(){super(),this.toggle=()=>{this.disabled||(this.checked=!this.checked,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0})))},this.onKeydown=s=>{(s.key===" "||s.key==="Enter")&&(s.preventDefault(),this.toggle())},this.label="",this.size="md",this.disabled=!1,this.indeterminate=!1,this.checked=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},indeterminate:{type:Boolean,reflect:!0},checked:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){this.internals.setFormValue(this.checked?"on":null),this.internals.ariaChecked=this.indeterminate?"mixed":String(this.checked)}render(){return e`
      <label class="wrapper" @keydown=${this.onKeydown} @click=${this.toggle}>
        <span
          class="box"
          role="checkbox"
          aria-checked=${this.indeterminate?"mixed":String(this.checked)}
          aria-disabled=${String(this.disabled)}
          tabindex=${this.disabled?-1:0}
        >
          ${this.indeterminate?e`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${c}</svg>`:this.checked?e`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t}</svg>`:null}
        </span>
        ${this.label?e`<span class="label">${this.label}</span>`:null}
      </label>
    `}static{this.styles=r`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--form-radius-md, 0.5rem);
      --_checkbox-font-size: var(--form-font-size-md, 0.9375rem);
      --_checkbox-icon-size: 16px;
      display: inline-block;
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
    :host([disabled]) .wrapper {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      cursor: pointer;
      user-select: none;
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
    .box:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    :host([checked]) .box,
    :host([indeterminate]) .box {
      background: var(--color-primary, #43608a);
      border-color: var(--color-primary, #43608a);
    }

    .label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_checkbox-font-size);
      color: var(--color-text-primary, #171717);
      line-height: 1.4;
    }
  `}}customElements.get("esa-checkbox")||customElements.define("esa-checkbox",a);
