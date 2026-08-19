import{i,b as r,a as n}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";const d={xs:"microcopy-xs-subtle",sm:"microcopy-sm-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"},c={xs:"microcopy-xs",sm:"microcopy-sm",md:"microcopy-md",lg:"microcopy-lg"};class b extends i{constructor(){super(),this.onKeydown=(e,t)=>{let a=null;switch(e.key){case"ArrowRight":a=this.findNextEnabledTab(t,1);break;case"ArrowLeft":a=this.findNextEnabledTab(t,-1);break;case"Home":a=this.findNextEnabledTab(-1,1);break;case"End":a=this.findNextEnabledTab(this.tabs.length,-1);break;default:return}a!==null&&(e.preventDefault(),this.selectTab(a),e.target.parentElement?.children[a]?.focus())},this.tabs=[],this.activeIndex=0,this.size="md",this.variant="underline",this.appearance="underline"}static{this.properties={tabs:{type:Array},activeIndex:{type:Number,attribute:"active-index"},size:{type:String,reflect:!0},variant:{type:String,reflect:!0},appearance:{type:String,reflect:!0}}}selectTab(e){this.tabs[e]?.disabled||(this.activeIndex=e,this.dispatchEvent(new CustomEvent("tabchange",{detail:{index:e},bubbles:!0,composed:!0})))}findNextEnabledTab(e,t){let a=e+t;for(;a>=0&&a<this.tabs.length;){if(!this.tabs[a].disabled)return a;a+=t}return null}render(){return r`
      <div class="layout">
        <div class="tabs" part="tabs" role="tablist">
          ${this.tabs.map((e,t)=>{const a=this.activeIndex===t,o=a?c[this.size]:d[this.size];return r`<button
              class="tab typography-${o} ${a?"tab--active":""} ${e.disabled?"tab--disabled":""}"
              type="button"
              role="tab"
              aria-selected=${a}
              tabindex=${a?0:-1}
              ?disabled=${e.disabled}
              @click=${()=>this.selectTab(t)}
              @keydown=${s=>this.onKeydown(s,t)}
            >
              ${e.icon?r`<span class="icon" .innerHTML=${e.icon}></span>`:null}
              <span>${e.label}</span>
              ${e.badge!=null?r`<span class="badge typography-microcopy-xs-strong">${e.badge}</span>`:null}
            </button>`})}
        </div>
        <div class="panel typography-body-md" role="tabpanel">
          <slot name="panel-${this.activeIndex}"><slot></slot></slot>
        </div>
      </div>
    `}static{this.styles=[l,n`
    :host {
      --_tab-height: var(--tab-layout-height-md, 44px);
      --_tab-color: var(--color-content-default-secondary, #646464);
      --_tab-color-active: var(--color-background-brand, #46a758);
      --_tab-color-hover: var(--color-content-default, #202020);
      --_tab-indicator-color: var(--color-background-brand, #46a758);
      --_tab-indicator-height: 2px;
      --_tab-bg-hover: var(--color-background-elevation-sunken, #f0f0f0);
      --_tab-gap: var(--spacing-100, 4px);
      --_tab-padding-x: var(--spacing-400, 16px);
      --_tab-border: var(--color-border-default, #cecece);
      --_tab-badge-bg: var(--color-background-brand, #46a758);
      --_tab-badge-color: var(--color-content-default-knockout, #fcfcfc);

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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: -2px;
      border-radius: var(--radius-sm, 0.25rem);
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
      background: var(--color-background-elevation-sunken, #f0f0f0);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      padding: var(--spacing-050, 2px);
      gap: var(--spacing-050, 2px);
    }
    :host([appearance='segmented']) .tab,
    :host([variant='pill']) .tab { border-radius: var(--radius-sm, 0.25rem); }
    :host([appearance='segmented']) .tab--active,
    :host([variant='pill']) .tab--active {
      background: var(--color-background-elevation-raised, #fcfcfc);
      box-shadow: var(--elevation-1, 0 1px 2px rgba(0, 0, 0, 0.06));
    }
    :host([appearance='segmented']) .tab--active::after,
    :host([variant='pill']) .tab--active::after { display: none; }

    /* body-md is the panel's default type role — it inherits through the slot to
       light-DOM content, and any esa-* component slotted in names its own. */
    .panel { padding-top: var(--spacing-400, 16px); }

    /* FORCED COLORS. Both appearances lose their active marker, for different
       reasons. The default appearance paints .tab--active::after — a generated
       box whose only paint is 'background', so it flattens to Canvas. The
       segmented/pill appearances set that ::after to 'display: none' and signal
       with a background plus --elevation-1 instead, and the shadow is deleted.

       Fills rather than borders, same reason as esa-button-toggle: .tab has a
       fixed height inside a flex row, so a border on --active alone would make
       the selected tab 2px taller than its neighbours and break the row.
       The segmented .tabs container has a real border and survives on its own. */
    @media (forced-colors: active) {
      .tab--active::after { background: Highlight; }
      :host([appearance='segmented']) .tab--active,
      :host([variant='pill']) .tab--active {
        background: Highlight;
        color: HighlightText;
      }
      .tab--disabled,
      .tab:disabled { color: GrayText; }
    }
  `]}}customElements.get("esa-tab-layout")||customElements.define("esa-tab-layout",b);
