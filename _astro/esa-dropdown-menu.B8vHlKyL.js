import{i as s,b as r,a as d}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";import{r as c,F as i,d as u}from"./overlay.BBIxLHx2.js";class p extends s{constructor(){super(),this.toggle=()=>{this.open?this.close():this.openMenu()},this.onDocumentClick=e=>{!this.contains(e.target)&&e.target!==this&&this.close()},this.onKeydown=e=>{if(!this.open){(e.key==="ArrowDown"||e.key==="ArrowUp")&&(e.preventDefault(),this.openMenu());return}switch(e.key){case"Escape":e.preventDefault(),this.close();break;case"ArrowDown":e.preventDefault(),this.focusItem(this.focusedIndex+1);break;case"ArrowUp":e.preventDefault(),this.focusItem(this.focusedIndex-1);break;case"Home":e.preventDefault(),this.focusItem(0);break;case"End":e.preventDefault(),this.focusItem(this.menuItems.length-1);break;case"Tab":this.close();break}},this.items=[],this.position="below-start",this.width="auto",this.open=!1}static{this.properties={items:{type:Array},position:{type:String,reflect:!0},width:{type:String,reflect:!0},open:{type:Boolean,reflect:!0}}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocumentClick,!0)}updated(e){this.syncTrigger(),e.has("open")&&(this.open?(document.addEventListener("click",this.onDocumentClick,!0),this.updateComplete.then(()=>this.focusItem(0))):document.removeEventListener("click",this.onDocumentClick,!0))}openMenu(){this.open=!0}close(){this.open&&(this.open=!1,c(this.triggerEl))}get triggerEl(){const t=(this.renderRoot.querySelector("slot")?.assignedElements({flatten:!0})??[]).find(n=>n instanceof HTMLElement);return t?t.matches(i)?t:t.querySelector(i)??t:null}syncTrigger(){const e=this.triggerEl;e&&(e.setAttribute("aria-haspopup","menu"),e.setAttribute("aria-expanded",String(this.open)),e.setAttribute("aria-controls","menu"),e.matches(i)||(e.hasAttribute("tabindex")||e.setAttribute("tabindex","0"),e.hasAttribute("role")||e.setAttribute("role","button")))}get menuItems(){return Array.from(this.renderRoot.querySelectorAll(".esa-dropdown-menu__item:not([disabled])"))}focusItem(e){const o=this.menuItems;if(!o.length)return;const t=(e+o.length)%o.length;o.forEach((n,a)=>n.setAttribute("tabindex",a===t?"0":"-1")),o[t].focus()}get focusedIndex(){return this.menuItems.indexOf(u())}selectItem(e){e.disabled||(e.action&&this.dispatchEvent(new CustomEvent("menu-action",{detail:e.action,bubbles:!0,composed:!0})),this.close())}render(){return r`
      <div class="esa-dropdown" @keydown=${this.onKeydown}>
        <div class="esa-dropdown__trigger typography-body-md" @click=${this.toggle}>
          <slot></slot>
        </div>
        ${this.open?r`
              <div class="esa-dropdown-menu__panel esa-dropdown-menu__panel--${this.position}" id="menu" role="menu">
                ${this.items.map(e=>e.divider?r`<div class="esa-dropdown-menu__divider" role="separator"></div>`:r`
                        <button
                          class="esa-dropdown-menu__item typography-body-md ${e.variant==="danger"?"esa-dropdown-menu__item--danger":""} ${e.disabled?"esa-dropdown-menu__item--disabled":""}"
                          ?disabled=${e.disabled}
                          role="menuitem"
                          tabindex="-1"
                          @click=${()=>this.selectItem(e)}
                        >
                          ${e.icon?r`<span class="esa-dropdown-menu__bullet" aria-hidden="true"></span>`:null}
                          <span>${e.label}</span>
                        </button>
                      `)}
              </div>
            `:null}
      </div>
    `}static{this.styles=[l,d`
    :host { display: inline-block; }

    .esa-dropdown {
      position: relative;
      display: inline-block;
    }
    .esa-dropdown__trigger {
      display: inline-block;
    }

    .esa-dropdown-menu__panel {
      position: absolute;
      z-index: var(--z-dropdown, 50);
      background: var(--color-background-elevation-floating, #fcfcfc);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      min-width: var(--dropdown-menu-min-width, 160px);
      max-width: var(--dropdown-menu-max-width, 280px);
      padding: var(--spacing-100, 0.25rem);
      overflow-y: auto;
      max-height: 320px;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
      animation: esa-dropdown-fade var(--animation-enter, 150ms ease-out);
    }
    @keyframes esa-dropdown-fade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    :host([width='trigger']) .esa-dropdown-menu__panel { min-width: 100%; }

    .esa-dropdown-menu__panel--below-start { top: calc(100% + 4px); left: 0; }
    .esa-dropdown-menu__panel--below-end { top: calc(100% + 4px); right: 0; }
    .esa-dropdown-menu__panel--above-start { bottom: calc(100% + 4px); left: 0; }
    .esa-dropdown-menu__panel--above-end { bottom: calc(100% + 4px); right: 0; }

    .esa-dropdown-menu__item {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 0.5rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      background: transparent;
      color: var(--color-content-default, #202020);
      /* UA reset, not a type role — a native button does not inherit the face. */
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 100ms ease;
    }
    .esa-dropdown-menu__item:hover:not(:disabled) {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }
    .esa-dropdown-menu__item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: -2px;
    }
    .esa-dropdown-menu__item--danger { color: var(--color-content-utility-danger, #ce2c31); }
    .esa-dropdown-menu__item--danger:hover:not(:disabled) {
      background: var(--color-background-utility-danger-subtle, #fffcfc);
    }
    .esa-dropdown-menu__item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .esa-dropdown-menu__bullet {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-pill, 9999px);
      background: currentColor;
      flex-shrink: 0;
      opacity: 0.6;
    }

    .esa-dropdown-menu__divider {
      height: 1px;
      background: var(--color-border-default-subtle, #d9d9d9);
      margin: var(--spacing-100, 0.25rem) 0;
    }

    /* FORCED COLORS. The panel keeps its real border, so only the interior needs
       work.

       The DIVIDER is a 1px box painted with 'background', which flattens to
       Canvas — menu grouping disappears silently. Naming CanvasText explicitly
       brings it back.

       The --danger item is NOT repaired here, and that is deliberate: it differs
       from a normal item by one 'color' declaration, there is no system colour
       that means "destructive", and the per-item 'icon' string renders an
       anonymous bullet dot rather than a glyph (see the class docblock), so
       there is no shape channel to reach for either. Faking it with Highlight
       would say "selected", which is worse than saying nothing. The item's LABEL
       is what has to carry the warning — "Delete project", not "Delete". */
    @media (forced-colors: active) {
      .esa-dropdown-menu__divider { background: CanvasText; }
      .esa-dropdown-menu__item:hover:not(:disabled),
      .esa-dropdown-menu__item--danger:hover:not(:disabled) {
        background: Highlight;
        color: HighlightText;
      }
      .esa-dropdown-menu__item--disabled,
      .esa-dropdown-menu__item:disabled { color: GrayText; }
    }
  `]}}customElements.get("esa-dropdown-menu")||customElements.define("esa-dropdown-menu",p);
