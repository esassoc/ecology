import{i as o,b as r,a as s}from"./lit-element.C8p3bJxG.js";class n extends o{constructor(){super(),this.onKeydown=(a,e)=>{let t=null;switch(a.key){case"ArrowRight":t=this.findNextEnabledTab(e,1);break;case"ArrowLeft":t=this.findNextEnabledTab(e,-1);break;case"Home":t=this.findNextEnabledTab(-1,1);break;case"End":t=this.findNextEnabledTab(this.tabs.length,-1);break;default:return}t!==null&&(a.preventDefault(),this.selectTab(t),a.target.parentElement?.children[t]?.focus())},this.tabs=[],this.activeIndex=0,this.size="md",this.variant="underline",this.appearance="underline"}static{this.properties={tabs:{type:Array},activeIndex:{type:Number,attribute:"active-index"},size:{type:String,reflect:!0},variant:{type:String,reflect:!0},appearance:{type:String,reflect:!0}}}selectTab(a){this.tabs[a]?.disabled||(this.activeIndex=a,this.dispatchEvent(new CustomEvent("tabchange",{detail:{index:a},bubbles:!0,composed:!0})))}findNextEnabledTab(a,e){let t=a+e;for(;t>=0&&t<this.tabs.length;){if(!this.tabs[t].disabled)return t;t+=e}return null}render(){return r`
      <div class="layout">
        <div class="tabs" part="tabs" role="tablist">
          ${this.tabs.map((a,e)=>{const t=this.activeIndex===e;return r`<button
              class="tab ${t?"tab--active":""} ${a.disabled?"tab--disabled":""}"
              type="button"
              role="tab"
              aria-selected=${t}
              tabindex=${t?0:-1}
              ?disabled=${a.disabled}
              @click=${()=>this.selectTab(e)}
              @keydown=${i=>this.onKeydown(i,e)}
            >
              ${a.icon?r`<span class="icon" .innerHTML=${a.icon}></span>`:null}
              <span>${a.label}</span>
              ${a.badge!=null?r`<span class="badge">${a.badge}</span>`:null}
            </button>`})}
        </div>
        <div class="panel" role="tabpanel">
          <slot name="panel-${this.activeIndex}"><slot></slot></slot>
        </div>
      </div>
    `}static{this.styles=s`
    :host {
      --_tab-height: var(--tab-layout-height-md, 44px);
      --_tab-font-size: var(--type-size-200, 0.875rem);
      --_tab-color: var(--tab-layout-color, var(--color-text-secondary, #525252));
      --_tab-color-active: var(--tab-layout-color-active, var(--color-primary, #43608a));
      --_tab-color-hover: var(--color-text-primary, #171717);
      --_tab-indicator-color: var(--tab-layout-indicator-color, var(--color-primary, #43608a));
      --_tab-indicator-height: 2px;
      --_tab-bg-hover: var(--color-surface-sunken, #efefef);
      --_tab-gap: var(--spacing-100, 4px);
      --_tab-padding-x: var(--spacing-400, 16px);
      --_tab-border: var(--tab-layout-border-color, var(--color-border, #e5e5e5));
      --_tab-badge-bg: var(--color-primary, #43608a);
      --_tab-badge-color: var(--color-text-inverse, #ffffff);

      display: block;
    }

    /* base :host = md. xs is one step below sm; sm/lg keep the old small/large values. */
    :host([size='xs']) {
      --_tab-height: var(--tab-layout-height-xs, 30px);
      --_tab-font-size: var(--type-size-100, 0.6875rem);
      --_tab-padding-x: var(--spacing-200, 8px);
    }
    :host([size='sm']) {
      --_tab-height: var(--tab-layout-height-sm, 36px);
      --_tab-font-size: var(--type-size-150, 0.75rem);
      --_tab-padding-x: var(--spacing-300, 12px);
    }
    :host([size='lg']) {
      --_tab-height: var(--tab-layout-height-lg, 52px);
      --_tab-font-size: var(--type-size-300, 1rem);
      --_tab-padding-x: var(--spacing-500, 24px);
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--_tab-border);
      gap: var(--_tab-gap);
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      height: var(--_tab-height);
      padding-inline: var(--_tab-padding-x);
      font-family: inherit;
      font-size: var(--_tab-font-size);
      color: var(--_tab-color);
      background: none;
      border: none;
      cursor: pointer;
      position: relative;
      text-decoration: none;
      white-space: nowrap;
      transition: color 150ms ease, background-color 150ms ease;
    }
    .tab:hover:not(:disabled):not(.tab--disabled) {
      color: var(--_tab-color-hover);
      background: var(--_tab-bg-hover);
    }
    .tab--active { color: var(--_tab-color-active); font-weight: var(--font-weight-medium, 500); }
    .tab--active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--_tab-indicator-height);
      background: var(--_tab-indicator-color);
      border-radius: var(--_tab-indicator-height);
    }
    .tab--disabled { opacity: 0.5; cursor: not-allowed; }
    .tab:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: -2px;
      border-radius: var(--radius-100, 4px);
    }

    .icon { display: inline-flex; }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding-inline: var(--spacing-150, 6px);
      font-size: var(--type-size-100, 0.6875rem);
      font-weight: var(--font-weight-semibold, 600);
      background: var(--_tab-badge-bg);
      color: var(--_tab-badge-color);
      border-radius: var(--radius-full, 9999px);
    }

    /* Segmented appearance (Beacon UiTabsAppearance='segmented').
       variant='pill' is the legacy alias and shares these rules. */
    :host([appearance='segmented']) .tabs,
    :host([variant='pill']) .tabs {
      align-self: flex-start;
      border-bottom: none;
      background: var(--color-surface-sunken, #efefef);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: var(--radius-200, 8px);
      padding: var(--spacing-050, 2px);
      gap: var(--spacing-050, 2px);
    }
    :host([appearance='segmented']) .tab,
    :host([variant='pill']) .tab { border-radius: var(--radius-100, 4px); }
    :host([appearance='segmented']) .tab--active,
    :host([variant='pill']) .tab--active {
      background: var(--color-surface, #ffffff);
      box-shadow: var(--shadow-50, 0 1px 2px rgba(0, 0, 0, 0.06));
    }
    :host([appearance='segmented']) .tab--active::after,
    :host([variant='pill']) .tab--active::after { display: none; }

    .panel { padding-top: var(--spacing-400, 16px); }
  `}}customElements.get("esa-tab-layout")||customElements.define("esa-tab-layout",n);
