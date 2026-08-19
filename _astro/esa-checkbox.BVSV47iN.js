import{w as o,i as t,b as e,a as s}from"./lit-element.D8DSg5zn.js";import{t as r}from"./typography.D6s5VeQm.js";const n={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"},a=o`<polyline points="20 6 9 17 4 12"></polyline>`,c=o`<line x1="5" y1="12" x2="19" y2="12"></line>`;class l extends t{constructor(){super(),this.toggle=()=>{this.disabled||(this.checked=!this.checked,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0})))},this.onKeydown=i=>{(i.key===" "||i.key==="Enter")&&(i.preventDefault(),this.toggle())},this.label="",this.size="md",this.disabled=!1,this.indeterminate=!1,this.checked=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},indeterminate:{type:Boolean,reflect:!0},checked:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){this.internals.setFormValue(this.checked?"on":null),this.internals.ariaChecked=this.indeterminate?"mixed":String(this.checked)}render(){return e`
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
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a}</svg>`:null}
        </span>
        ${this.label?e`<span class="label typography-${n[this.size]}">${this.label}</span>`:null}
      </label>
    `}static{this.styles=[r,s`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--form-radius-md, 0.5rem);
      --_checkbox-icon-size: 16px;
      display: inline-block;
    }
    /* Box geometry only — the label's type is a composite named in render(). */
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
      /* The size token is authoritative: without this, re-pointing the indicator
         border width would resize the control instead of thickening its edge. */
      box-sizing: border-box;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--form-bg, #fff);
      color: var(--color-content-inverse, #fff);
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
      background: var(--color-background-brand, #43608a);
      border-color: var(--color-background-brand, #43608a);
    }

    /* Type comes from .typography-body-* on the element — including its leading.
       This used to pin line-height to tight (1.3) while every other label in the
       kit led at 1.6; that was a local special case, not a decision, and choice
       labels now read like the rest. */
    .label {
      color: var(--color-content-primary, #171717);
    }
  `]}}customElements.get("esa-checkbox")||customElements.define("esa-checkbox",l);
