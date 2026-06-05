import{i as c,b as i,a as d}from"./lit-element.C8p3bJxG.js";class p extends c{constructor(){super(),this.onKeydown=r=>{const e=this.options;if(!e||e.length===0)return;const o=Math.max(0,e.findIndex(n=>n.value===this.value));let a;switch(r.key){case"ArrowRight":case"ArrowDown":a=(o+1)%e.length;break;case"ArrowLeft":case"ArrowUp":a=(o-1+e.length)%e.length;break;case"Home":a=0;break;case"End":a=e.length-1;break;case"Enter":case" ":r.preventDefault(),this.select(e[o]);return;default:return}r.preventDefault(),this.select(e[a]),this.renderRoot.querySelectorAll(".chip")[a]?.focus()},this.options=[],this.value="",this.size="md",this.name="",this.label="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},value:{type:String,reflect:!0},size:{type:String,reflect:!0},name:{type:String},label:{type:String}}}willUpdate(r){if(r.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}}connectedCallback(){super.connectedCallback(),this.internals.role="radiogroup",this.label&&(this.internals.ariaLabel=this.label),this.syncFormValue()}updated(){this.label&&(this.internals.ariaLabel=this.label)}syncFormValue(){this.internals.setFormValue(this.value||null)}select(r){r.value!==this.value&&(this.value=r.value,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))}render(){return i`
      <div class="root" @keydown=${this.onKeydown}>
        ${(this.options??[]).map(r=>{const e=r.value===this.value;return i`
            <button
              type="button"
              role="radio"
              class="chip chip--${r.tone??"neutral"} ${e?"chip--active":""}"
              part="chip"
              tabindex=${e?0:-1}
              aria-checked=${e}
              @click=${()=>this.select(r)}
            >
              <span class="chip__label" part="label">${r.label}</span>
            </button>
          `})}
      </div>
    `}static{this.styles=d`
    :host {
      --_gap: var(--spacing-150, 0.375rem);
      --_pad-y: var(--spacing-100, 0.25rem);
      --_pad-x: var(--form-padding-x-md, 0.75rem);
      --_font: var(--form-font-size-md, 0.9375rem);

      /* Resting (unselected) chrome. */
      --_bg: var(--color-surface, #fff);
      --_border: var(--color-border, #e5e5e5);
      --_color: var(--color-text-secondary, #525252);
      --_bg-hover: var(--color-surface-sunken, #f5f5f5);
      --_border-hover: var(--color-border-strong, #d4d4d4);
      --_color-hover: var(--color-text-primary, #171717);

      display: inline-flex;
    }
    :host([size='xs']) { --_pad-x: var(--form-padding-x-xs, 0.5rem); --_font: var(--form-font-size-xs, 0.75rem); }
    :host([size='sm']) { --_pad-x: var(--form-padding-x-sm, 0.625rem); --_font: var(--form-font-size-sm, 0.75rem); }
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
      border-radius: var(--radius-full, 9999px);
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
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--focus-ring-color, #005862);
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
    .chip--active.chip--teal {
      background: var(--color-teal-50, #f0fdfa);
      border-color: var(--color-teal-200, #99f6e4);
      color: var(--color-primary, #005862);
    }
    .chip--active.chip--amber {
      background: var(--color-warning-subtle, #fffbeb);
      border-color: var(--color-warning-border, #fde68a);
      color: var(--color-warning, #b45309);
    }
  `}}customElements.get("esa-chip-group")||customElements.define("esa-chip-group",p);const l=[{value:"all",label:"All",tone:"neutral"},{value:"open",label:"Open",tone:"teal"},{value:"flagged",label:"Flagged",tone:"amber"}],h=[{value:"n",label:"Neutral",tone:"neutral"},{value:"ns",label:"Neutral strong",tone:"neutral-strong"},{value:"t",label:"Teal",tone:"teal"},{value:"a",label:"Amber",tone:"amber"}],s=(t,r)=>{const e=document.querySelector(t);e&&(e.options=r)};s('[data-demo="preview"]',l);s('[data-demo="tones"]',h);for(const t of["xs","sm","md","lg"])s(`[data-demo="size-${t}"]`,l);
