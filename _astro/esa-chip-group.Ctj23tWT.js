import{i as n,b as o,a as c}from"./lit-element.D8DSg5zn.js";import{t as h}from"./typography.KBHeYOQc.js";import{a as u}from"./a11y.sqk3bMt7.js";const p={xs:"microcopy-2xs-strong",sm:"microcopy-xs-strong",md:"microcopy-md-strong",lg:"microcopy-lg-strong"};class d extends n{constructor(){super(),this.onKeydown=e=>{const r=this.options;if(!r||r.length===0)return;const t=this.renderRoot.querySelectorAll(".chip"),s=Array.from(t).indexOf(this.renderRoot.activeElement),i=this.multiple?Math.max(0,s):Math.max(0,r.findIndex(l=>l.value===this.value));let a;switch(e.key){case"ArrowRight":case"ArrowDown":a=(i+1)%r.length;break;case"ArrowLeft":case"ArrowUp":a=(i-1+r.length)%r.length;break;case"Home":a=0;break;case"End":a=r.length-1;break;case"Enter":case" ":e.preventDefault(),this.select(r[i]);return;default:return}e.preventDefault(),this.multiple||this.select(r[a]),t[a]?.focus()},this.options=[],this.value="",this.values=[],this.multiple=!1,this.size="md",this.label="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={options:{type:Array},value:{type:String,reflect:!0},values:{type:Array},multiple:{type:Boolean,reflect:!0},size:{type:String,reflect:!0},name:{type:String,reflect:!0},label:{type:String}}}willUpdate(e){if(e.has("options")&&typeof this.options=="string")try{this.options=JSON.parse(this.options)}catch{this.options=[]}if(e.has("values")&&typeof this.values=="string")try{this.values=JSON.parse(this.values)}catch{this.values=[]}(e.has("value")||e.has("values")||e.has("multiple"))&&this.syncFormValue()}connectedCallback(){super.connectedCallback(),this.internals.role=this.multiple?"group":"radiogroup",this.label&&(this.internals.ariaLabel=this.label),this.syncFormValue()}updated(){this.label&&(this.internals.ariaLabel=this.label)}syncFormValue(){this.multiple?this.internals.setFormValue(this.values.length?this.values.join(","):null):this.internals.setFormValue(this.value||null)}isActive(e){return this.multiple?this.values.includes(e.value):e.value===this.value}select(e){if(this.multiple){this.values=this.values.includes(e.value)?this.values.filter(r=>r!==e.value):[...this.values,e.value],this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{values:[...this.values]},bubbles:!0,composed:!0}));return}e.value!==this.value&&(this.value=e.value,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0})))}render(){return o`
      <div class="root" @keydown=${this.onKeydown}>
        ${(this.options??[]).map((e,r)=>{const t=this.isActive(e),s=this.multiple?r===0:t;return o`
            <button
              type="button"
              role=${this.multiple?"checkbox":"radio"}
              class="chip chip--${e.tone??"neutral"} ${t?"chip--active":""} typography-${p[this.size]}"
              part="chip"
              tabindex=${s?0:-1}
              aria-checked=${t}
              @click=${()=>this.select(e)}
            >
              <span class="chip__label" part="label">${e.label}</span>
            </button>
          `})}
      </div>
    `}static{this.styles=[h,u,c`
    :host {
      --_gap: var(--spacing-150, 0.375rem);
      --_pad-y: var(--spacing-150, 0.375rem);
      --_pad-x: var(--spacing-300, 0.75rem);
      /* --radius-chip — shared with esa-badge and esa-pill; becomes the capsule under
         a 'round' corner language, tracks --radius-sm otherwise. */
      --_radius: var(--radius-chip, var(--radius-sm, 0.25rem));

      /* Resting (unselected) chrome. */
      --_bg: var(--color-background-elevation-raised, #fcfcfc);
      --_border: var(--color-border-default, #cecece);
      --_color: var(--color-content-default-secondary, #646464);
      --_bg-hover: var(--color-background-elevation-sunken, #f0f0f0);
      --_border-hover: var(--color-border-default-strong, #bbbbbb);
      --_color-hover: var(--color-content-default, #202020);

      display: inline-flex;
    }
    /* --_pad-x walks --spacing-200/250/300/400 — the CONTROL ramp, shared with the
       inputs and buttons, because a chip is interactive and lines up beside them.
       esa-badge and esa-pill look identical in shape but walk 100/150/200/300: they
       are static marks, not controls. Same code, different ramp; don't sync them.
       --_pad-y is its OWN ramp (--spacing-100/100/150/200), NOT a copy of --_pad-x.
       That is the one place this component must not follow the control ramp: --_pad-x
       walks 200/250/300/400 because a chip sits beside an input, but 12-16px of
       VERTICAL padding makes it as tall as a button (measured: md rendered 50px).
       A chip is wider than it is tall. There is no height token any more:
       --chip-group-height-* and the shared --chip-height-* ramp behind it went on
       2026-08-15. This box also carries a 1px border per side. */
    :host([size='xs']) { --_pad-y: var(--spacing-100, 0.25rem); --_pad-x: var(--spacing-200, 0.5rem); }
    :host([size='sm']) { --_pad-y: var(--spacing-100, 0.25rem); --_pad-x: var(--spacing-250, 0.625rem); }
    :host([size='lg']) { --_pad-y: var(--spacing-200, 0.5rem); --_pad-x: var(--spacing-400, 1rem); }

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
      box-sizing: border-box;
      padding-block: var(--_pad-y);
      padding-inline: var(--_pad-x);
      border-radius: var(--_radius, 0.25rem);
      border: var(--border-width-default, 1px) solid var(--_border);
      background: var(--_bg);
      color: var(--_color);
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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    /* Active palettes mirror Ecology semantic tokens. */
    .chip--active.chip--neutral {
      background: var(--color-background-elevation-sunken, #f0f0f0);
      border-color: var(--color-border-default-strong, #bbbbbb);
      color: var(--color-content-default-secondary, #646464);
    }
    .chip--active.chip--neutral-strong {
      background: var(--color-border-default, #cecece);
      border-color: var(--color-border-default-strong, #bbbbbb);
      color: var(--color-content-default, #202020);
    }
    /* Reads the SEMANTIC primary chain so spoke themes re-skin it — hub
       default is brand blue, a forest-green theme goes forest. */
    .chip--active.chip--brand {
      background: var(--color-background-brand-subtle, #fbfefb);
      border-color: var(--color-border-brand, #b2ddb5);
      color: var(--color-content-brand, #2a7e3b);
    }
    .chip--active.chip--amber {
      background: var(--color-background-utility-warning-subtle, #fefdfb);
      border-color: var(--color-border-utility-warning, #f3d673);
      color: var(--color-content-utility-warning, #ab6400);
    }
  `]}}customElements.get("esa-chip-group")||customElements.define("esa-chip-group",d);
