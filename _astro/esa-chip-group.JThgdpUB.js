import{i as n,b as o,a as c}from"./lit-element.C8p3bJxG.js";class h extends n{constructor(){super(),this.onKeydown=e=>{const r=this.options;if(!r||r.length===0)return;const t=this.renderRoot.querySelectorAll(".chip"),s=Array.from(t).indexOf(this.renderRoot.activeElement),i=this.multiple?Math.max(0,s):Math.max(0,r.findIndex(l=>l.value===this.value));let a;switch(e.key){case"ArrowRight":case"ArrowDown":a=(i+1)%r.length;break;case"ArrowLeft":case"ArrowUp":a=(i-1+r.length)%r.length;break;case"Home":a=0;break;case"End":a=r.length-1;break;case"Enter":case" ":e.preventDefault(),this.select(r[i]);return;default:return}e.preventDefault(),this.multiple||this.select(r[a]),t[a]?.focus()},this.options=[],this.value="",this.values=[],this.multiple=!1,this.size="md",this.name="",this.label="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},value:{type:String,reflect:!0},values:{type:Array},multiple:{type:Boolean,reflect:!0},size:{type:String,reflect:!0},name:{type:String},label:{type:String}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}if(e.has("values")&&typeof this.values=="string")try{this.values=JSON.parse(this.values)}catch{this.values=[]}}connectedCallback(){super.connectedCallback(),this.internals.role=this.multiple?"group":"radiogroup",this.label&&(this.internals.ariaLabel=this.label),this.syncFormValue()}updated(){this.label&&(this.internals.ariaLabel=this.label)}syncFormValue(){this.multiple?this.internals.setFormValue(this.values.length?this.values.join(","):null):this.internals.setFormValue(this.value||null)}isActive(e){return this.multiple?this.values.includes(e.value):e.value===this.value}select(e){if(this.multiple){this.values=this.values.includes(e.value)?this.values.filter(r=>r!==e.value):[...this.values,e.value],this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{values:[...this.values]},bubbles:!0,composed:!0}));return}e.value!==this.value&&(this.value=e.value,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))}render(){return o`
      <div class="root" @keydown=${this.onKeydown}>
        ${(this.options??[]).map((e,r)=>{const t=this.isActive(e),s=this.multiple?r===0:t;return o`
            <button
              type="button"
              role=${this.multiple?"checkbox":"radio"}
              class="chip chip--${e.tone??"neutral"} ${t?"chip--active":""}"
              part="chip"
              tabindex=${s?0:-1}
              aria-checked=${t}
              @click=${()=>this.select(e)}
            >
              <span class="chip__label" part="label">${e.label}</span>
            </button>
          `})}
      </div>
    `}static{this.styles=c`
    :host {
      --_gap: var(--spacing-150, 0.375rem);
      --_pad-y: var(--spacing-150, 0.375rem);
      --_pad-x: var(--form-padding-x-md, 0.75rem);
      --_font: var(--form-font-size-md, 0.9375rem);
      --_radius: var(--radius-100, 0.25rem);

      /* Resting (unselected) chrome. */
      --_bg: var(--color-surface, #fff);
      --_border: var(--color-border, #e5e5e5);
      --_color: var(--color-text-secondary, #525252);
      --_bg-hover: var(--color-surface-sunken, #f5f5f5);
      --_border-hover: var(--color-border-strong, #d4d4d4);
      --_color-hover: var(--color-text-primary, #171717);

      display: inline-flex;
    }
    :host([size='xs']) { --_pad-x: var(--form-padding-x-xs, 0.5rem); --_font: var(--form-font-size-xs, 0.75rem); --_pad-y: var(--spacing-100, 0.25rem); }
    :host([size='sm']) { --_pad-x: var(--form-padding-x-sm, 0.625rem); --_font: var(--form-font-size-sm, 0.75rem); --_pad-y: var(--spacing-100, 0.25rem); }
    :host([size='lg']) { --_pad-x: var(--form-padding-x-lg, 1rem); --_font: var(--form-font-size-lg, 1rem); --_pad-y: var(--spacing-200, 0.5rem); }

    .root {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--_gap);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      padding: var(--_pad-y) var(--_pad-x);
      border-radius: var(--_radius, 0.25rem);
      border: 1px solid var(--_border);
      background: var(--_bg);
      color: var(--_color);
      font: inherit;
      font-size: var(--_font);
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
    }

    .chip:hover:not(.chip--active) {
      background: var(--_bg-hover);
      border-color: var(--_border-hover);
      color: var(--_color-hover);
    }

    .chip:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--focus-ring-color, #43608a);
    }

    .chip__label { line-height: 1; }

    /* Active palettes mirror Ecology semantic tokens. */
    .chip--active.chip--neutral {
      background: var(--color-surface-sunken, #efefef);
      border-color: var(--color-border-strong, #d4d4d4);
      color: var(--color-text-tertiary, #404040);
    }
    .chip--active.chip--neutral-strong {
      background: var(--color-border, #e5e5e5);
      border-color: var(--color-border-strong, #d4d4d4);
      color: var(--color-text-primary, #171717);
    }
    /* Reads the SEMANTIC primary chain so spoke themes re-skin it — hub
       default is brand blue, a forest-green theme goes forest. */
    .chip--active.chip--brand {
      background: var(--color-primary-subtle, #f3f8fb);
      border-color: var(--color-primary-border, #cfe2ee);
      color: var(--color-primary, #43608a);
    }
    .chip--active.chip--amber {
      background: var(--color-warning-subtle, #fffbeb);
      border-color: var(--color-warning-border, #fde68a);
      color: var(--color-warning, #b45309);
    }
  `}}customElements.get("esa-chip-group")||customElements.define("esa-chip-group",h);
