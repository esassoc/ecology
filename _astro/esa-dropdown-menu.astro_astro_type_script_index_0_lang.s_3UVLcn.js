import{i as n,b as o,a as r}from"./lit-element.C8p3bJxG.js";class a extends n{constructor(){super(),this.toggle=()=>{this.open?this.close():this.openMenu()},this.onDocumentClick=e=>{!this.contains(e.target)&&e.target!==this&&this.close()},this.onKeydown=e=>{e.key==="Escape"&&this.open&&(e.preventDefault(),this.close())},this.items=[],this.position="below-start",this.width="auto",this.open=!1}static{this.properties={items:{type:Array},position:{type:String,reflect:!0},width:{type:String,reflect:!0},open:{type:Boolean,reflect:!0}}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocumentClick,!0)}openMenu(){this.open=!0,document.addEventListener("click",this.onDocumentClick,!0)}close(){this.open&&(this.open=!1,document.removeEventListener("click",this.onDocumentClick,!0))}selectItem(e){e.disabled||(e.action&&this.dispatchEvent(new CustomEvent("menu-action",{detail:e.action,bubbles:!0,composed:!0})),this.close())}render(){return o`
      <div class="esa-dropdown" @keydown=${this.onKeydown}>
        <div class="esa-dropdown__trigger" @click=${this.toggle}>
          <slot></slot>
        </div>
        ${this.open?o`
              <div class="esa-dropdown-menu__panel esa-dropdown-menu__panel--${this.position}" role="menu">
                ${this.items.map(e=>e.divider?o`<div class="esa-dropdown-menu__divider" role="separator"></div>`:o`
                        <button
                          class="esa-dropdown-menu__item ${e.variant==="danger"?"esa-dropdown-menu__item--danger":""} ${e.disabled?"esa-dropdown-menu__item--disabled":""}"
                          ?disabled=${e.disabled}
                          role="menuitem"
                          @click=${()=>this.selectItem(e)}
                        >
                          ${e.icon?o`<span class="esa-dropdown-menu__bullet" aria-hidden="true"></span>`:null}
                          <span>${e.label}</span>
                        </button>
                      `)}
              </div>
            `:null}
      </div>
    `}static{this.styles=r`
    :host { display: inline-block; }

    .esa-dropdown {
      position: relative;
      display: inline-block;
    }
    .esa-dropdown__trigger { display: inline-block; }

    .esa-dropdown-menu__panel {
      position: absolute;
      z-index: var(--z-dropdown, 50);
      background: var(--color-surface-elevated, #ffffff);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: var(--radius-200, 0.5rem);
      box-shadow: var(--shadow-300, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      min-width: 160px;
      max-width: 280px;
      padding: var(--spacing-100, 0.25rem);
      overflow-y: auto;
      max-height: 320px;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      animation: esa-dropdown-fade 120ms ease-out;
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
      border-radius: var(--radius-100, 0.25rem);
      background: transparent;
      color: var(--color-text-primary, #171717);
      font-family: inherit;
      font-size: var(--type-size-200, 0.9375rem);
      cursor: pointer;
      text-align: left;
      transition: background 100ms ease;
    }
    .esa-dropdown-menu__item:hover:not(:disabled) {
      background: var(--color-surface-sunken, #efefef);
    }
    .esa-dropdown-menu__item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: -2px;
    }
    .esa-dropdown-menu__item--danger { color: var(--color-danger, #ef4444); }
    .esa-dropdown-menu__item--danger:hover:not(:disabled) {
      background: var(--color-danger-subtle, #fef2f2);
    }
    .esa-dropdown-menu__item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .esa-dropdown-menu__bullet {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full, 9999px);
      background: currentColor;
      flex-shrink: 0;
      opacity: 0.6;
    }

    .esa-dropdown-menu__divider {
      height: 1px;
      background: var(--color-border-light, #efefef);
      margin: var(--spacing-100, 0.25rem) 0;
    }
  `}}customElements.get("esa-dropdown-menu")||customElements.define("esa-dropdown-menu",a);const i=[{label:"Edit",icon:"pencil",action:"edit"},{label:"Duplicate",icon:"copy",action:"duplicate"},{divider:!0},{label:"Archive",icon:"archive",action:"archive",disabled:!0},{label:"Delete",icon:"trash",action:"delete",variant:"danger"}],s=document.getElementById("result");document.querySelectorAll("esa-dropdown-menu").forEach(t=>{t.items=i,t.addEventListener("menu-action",e=>{s.textContent=`Selected: ${e.detail}`})});
