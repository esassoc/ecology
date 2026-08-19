import{i as s,b as o,a as n}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";const c={xs:"microcopy-xs-subtle",sm:"microcopy-sm-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"},d={xs:"microcopy-xs",sm:"microcopy-sm",md:"microcopy-md",lg:"microcopy-lg"};class b extends s{constructor(){super(),this.onKeydown=(t,e)=>{let a=null;switch(t.key){case"ArrowRight":a=this.findNextEnabledTab(e,1);break;case"ArrowLeft":a=this.findNextEnabledTab(e,-1);break;case"Home":a=this.findNextEnabledTab(-1,1);break;case"End":a=this.findNextEnabledTab(this.tabs.length,-1);break;default:return}a!==null&&(t.preventDefault(),this.selectTab(a),t.target.parentElement?.children[a]?.focus())},this.tabs=[],this.activeIndex=0,this.size="md",this.variant="underline",this.appearance="underline"}static{this.properties={tabs:{type:Array},activeIndex:{type:Number,attribute:"active-index"},size:{type:String,reflect:!0},variant:{type:String,reflect:!0},appearance:{type:String,reflect:!0}}}selectTab(t){this.tabs[t]?.disabled||(this.activeIndex=t,this.dispatchEvent(new CustomEvent("tabchange",{detail:{index:t},bubbles:!0,composed:!0})))}findNextEnabledTab(t,e){let a=t+e;for(;a>=0&&a<this.tabs.length;){if(!this.tabs[a].disabled)return a;a+=e}return null}render(){return o`
      <div class="layout">
        <div class="tabs" part="tabs" role="tablist">
          ${this.tabs.map((t,e)=>{const a=this.activeIndex===e,r=a?d[this.size]:c[this.size];return o`<button
              class="tab typography-${r} ${a?"tab--active":""} ${t.disabled?"tab--disabled":""}"
              type="button"
              role="tab"
              aria-selected=${a}
              tabindex=${a?0:-1}
              ?disabled=${t.disabled}
              @click=${()=>this.selectTab(e)}
              @keydown=${i=>this.onKeydown(i,e)}
            >
              ${t.icon?o`<span class="icon" .innerHTML=${t.icon}></span>`:null}
              <span>${t.label}</span>
              ${t.badge!=null?o`<span class="badge typography-microcopy-xs-strong">${t.badge}</span>`:null}
            </button>`})}
        </div>
        <div class="panel typography-body-md" role="tabpanel">
          <slot name="panel-${this.activeIndex}"><slot></slot></slot>
        </div>
      </div>
    `}static{this.styles=[l,n`
    :host {
      --_tab-height: var(--tab-layout-height-md, 44px);
      --_tab-color: var(--tab-layout-color, var(--color-content-default-secondary, #525252));
      --_tab-color-active: var(--tab-layout-color-active, var(--color-background-brand, #43608a));
      --_tab-color-hover: var(--color-content-default, #171717);
      --_tab-indicator-color: var(--tab-layout-indicator-color, var(--color-background-brand, #43608a));
      --_tab-indicator-height: 2px;
      --_tab-bg-hover: var(--color-background-elevation-sunken, #efefef);
      --_tab-gap: var(--spacing-100, 4px);
      --_tab-padding-x: var(--spacing-400, 16px);
      --_tab-border: var(--tab-layout-border-color, var(--color-border-default, #e5e5e5));
      --_tab-badge-bg: var(--color-background-brand, #43608a);
      --_tab-badge-color: var(--color-content-default-knockout, #ffffff);

      display: block;
    }

    /* base :host = md. xs is one step below sm; sm/lg keep the old small/large values.
       The size steps carry geometry only — the text comes from a composite class
       named in render() (TAB_TYPE / TAB_ACTIVE_TYPE), so a tab says "this is body
       text at the sm rung" rather than assembling a size and a weight here. */
    :host([size='xs']) {
      --_tab-height: var(--tab-layout-height-xs, 30px);
      --_tab-padding-x: var(--spacing-200, 8px);
    }
    :host([size='sm']) {
      --_tab-height: var(--tab-layout-height-sm, 36px);
      --_tab-padding-x: var(--spacing-300, 12px);
    }
    :host([size='lg']) {
      --_tab-height: var(--tab-layout-height-lg, 52px);
      --_tab-padding-x: var(--spacing-500, 24px);
    }

    .tabs {
      display: flex;
      border-bottom: var(--border-width-default, 1px) solid var(--_tab-border);
      gap: var(--_tab-gap);
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      height: var(--_tab-height);
      padding-inline: var(--_tab-padding-x);
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
    /* The active tab's weight comes from TAB_ACTIVE_TYPE (label-*, medium). */
    .tab--active { color: var(--_tab-color-active); }
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
      border-radius: var(--radius-control, 4px);
    }

    .icon { display: inline-flex; }

    .badge {
      /* A count. microcopy has no leading, so it must not wrap. */
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding-inline: var(--spacing-150, 6px);
      background: var(--_tab-badge-bg);
      color: var(--_tab-badge-color);
      border-radius: var(--radius-pill, 9999px);
    }

    /* Segmented appearance (Beacon UiTabsAppearance='segmented').
       variant='pill' is the legacy alias and shares these rules. */
    :host([appearance='segmented']) .tabs,
    :host([variant='pill']) .tabs {
      align-self: flex-start;
      border-bottom: none;
      background: var(--color-background-elevation-sunken, #efefef);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #e5e5e5);
      border-radius: var(--radius-surface, 8px);
      padding: var(--spacing-050, 2px);
      gap: var(--spacing-050, 2px);
    }
    :host([appearance='segmented']) .tab,
    :host([variant='pill']) .tab { border-radius: var(--radius-control, 4px); }
    :host([appearance='segmented']) .tab--active,
    :host([variant='pill']) .tab--active {
      background: var(--color-background-elevation-raised, #ffffff);
      box-shadow: var(--elevation-1, 0 1px 2px rgba(0, 0, 0, 0.06));
    }
    :host([appearance='segmented']) .tab--active::after,
    :host([variant='pill']) .tab--active::after { display: none; }

    /* body-md is the panel's default type role — it inherits through the slot to
       light-DOM content, and any esa-* component slotted in names its own. */
    .panel { padding-top: var(--spacing-400, 16px); }
  `]}}customElements.get("esa-tab-layout")||customElements.define("esa-tab-layout",b);
