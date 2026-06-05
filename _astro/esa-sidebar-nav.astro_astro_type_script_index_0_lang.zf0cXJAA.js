import{i as p,b as n,a as h}from"./lit-element.C8p3bJxG.js";const v='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>',g='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>',u='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',b='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';class f extends p{constructor(){super(),this.toggleCollapse=()=>{this.collapsed=!this.collapsed,this.dispatchEvent(new CustomEvent("collapsedchange",{detail:{collapsed:this.collapsed},bubbles:!0,composed:!0}))},this.items=[],this.collapsed=!1,this.collapsible=!0,this._expanded=new Set}static{this.properties={items:{type:Array},collapsed:{type:Boolean,reflect:!0},collapsible:{type:Boolean},_expanded:{state:!0}}}get groupedSections(){const e=[];let a=null,i=[];for(const t of this.items){const l=t.group??null;l!==a?(i.length>0&&e.push({group:a,items:i}),a=l,i=[t]):i.push(t)}return i.length>0&&e.push({group:a,items:i}),e}toggleChildren(e){const a=new Set(this._expanded);a.has(e.label)?a.delete(e.label):a.add(e.label),this._expanded=a}isExpanded(e){return this._expanded.has(e.label)}icon(e){return e?n`<span class="icon" .innerHTML=${e}></span>`:null}badge(e){return e!=null?n`<span class="badge">${e}</span>`:null}renderLeaf(e){return e.href?n`<a
        class="link ${e.active?"link--active":""} ${e.disabled?"link--disabled":""}"
        href=${e.href}
        tabindex=${e.disabled?-1:0}
        aria-current=${e.active?"page":"false"}
      >
        ${this.icon(e.icon)}
        <span class="label">${e.label}</span>
        ${this.badge(e.badge)}
      </a>`:n`<span class="link link--inert">
      ${this.icon(e.icon)}
      <span class="label">${e.label}</span>
      ${this.badge(e.badge)}
    </span>`}renderItem(e){if(e.children&&e.children.length>0){const a=this.isExpanded(e);return n`<li class="item ${e.disabled?"item--disabled":""}">
        <button
          class="link link--parent ${a?"link--expanded":""}"
          type="button"
          aria-expanded=${a}
          ?disabled=${e.disabled}
          @click=${()=>this.toggleChildren(e)}
        >
          ${this.icon(e.icon)}
          <span class="label">${e.label}</span>
          ${this.badge(e.badge)}
          <span class="chevron" .innerHTML=${a?u:b}></span>
        </button>
        ${a?n`<ul class="children" role="list">
              ${e.children.map(i=>n`<li class="child ${i.disabled?"child--disabled":""}">
                  ${i.href?n`<a
                        class="link link--child ${i.active?"link--active":""} ${i.disabled?"link--disabled":""}"
                        href=${i.href}
                        tabindex=${i.disabled?-1:0}
                      >
                        ${this.icon(i.icon)}
                        <span class="label">${i.label}</span>
                        ${this.badge(i.badge)}
                      </a>`:n`<span class="link link--child link--inert">
                        ${this.icon(i.icon)}
                        <span class="label">${i.label}</span>
                        ${this.badge(i.badge)}
                      </span>`}
                </li>`)}
            </ul>`:null}
      </li>`}return n`<li class="item ${e.disabled?"item--disabled":""}">
      ${this.renderLeaf(e)}
    </li>`}render(){return n`
      <nav class="nav" aria-label="Sidebar navigation">
        <slot name="header"></slot>
        ${this.collapsible?n`<button
              class="toggle"
              type="button"
              aria-label=${this.collapsed?"Expand sidebar":"Collapse sidebar"}
              @click=${this.toggleCollapse}
            >
              <span .innerHTML=${this.collapsed?g:v}></span>
            </button>`:null}
        <ul class="list" role="list">
          ${this.groupedSections.map(e=>n`
              ${e.group?n`<li class="group-heading" role="presentation">
                    <span class="group-label">${e.group}</span>
                  </li>`:null}
              ${e.items.map(a=>this.renderItem(a))}
            `)}
        </ul>
      </nav>
    `}static{this.styles=h`
    :host {
      --_sidenav-width: var(--sidebar-width, 260px);
      --_sidenav-collapsed-width: var(--sidebar-width-collapsed, 56px);
      --_sidenav-bg: var(--sidenav-bg, #ffffff);
      --_sidenav-border: var(--sidenav-border, #efefef);
      --_sidenav-item-height: 40px;
      --_sidenav-item-padding: var(--spacing-300, 12px);
      --_sidenav-item-radius: var(--radius-200, 8px);
      --_sidenav-item-color: var(--sidenav-link-text, #525252);
      --_sidenav-item-color-active: var(--sidenav-link-text-active, #005862);
      --_sidenav-item-bg-hover: var(--color-surface-sunken, #efefef);
      --_sidenav-item-bg-active: var(--color-teal-50, #f0fdfa);
      --_sidenav-group-color: var(--sidenav-section-text, #737373);
      --_sidenav-transition: var(--transition-base, 200ms ease);

      display: block;
      width: var(--_sidenav-width);
      height: 100%;
      border-right: 1px solid var(--_sidenav-border);
      background: var(--_sidenav-bg);
      transition: width var(--_sidenav-transition);
      overflow: hidden;
    }

    :host([collapsed]) { width: var(--_sidenav-collapsed-width); }
    :host([collapsed]) .label,
    :host([collapsed]) .badge,
    :host([collapsed]) .chevron,
    :host([collapsed]) .group-label {
      opacity: 0;
      width: 0;
      overflow: hidden;
      white-space: nowrap;
    }
    :host([collapsed]) .link { justify-content: center; padding-inline: var(--spacing-200, 8px); }
    :host([collapsed]) .children { display: none; }

    .nav {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--spacing-200, 8px);
    }

    ::slotted([slot='header']) {
      display: block;
      padding: var(--spacing-300, 12px) var(--_sidenav-item-padding);
      margin-bottom: var(--spacing-200, 8px);
      overflow: hidden;
      white-space: nowrap;
    }

    .toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 32px;
      margin-bottom: var(--spacing-200, 8px);
      border: none;
      border-radius: var(--_sidenav-item-radius);
      background: transparent;
      color: var(--_sidenav-item-color);
      cursor: pointer;
      transition: background 150ms ease;
    }
    .toggle:hover { background: var(--_sidenav-item-bg-hover); }
    .toggle:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .list,
    .children { list-style: none; margin: 0; padding: 0; }
    .children { padding-left: var(--spacing-400, 16px); }

    .group-heading {
      padding: var(--spacing-300, 12px) var(--_sidenav-item-padding) var(--spacing-100, 4px);
    }
    .group-label {
      display: block;
      font-size: var(--type-size-100, 11px);
      font-weight: var(--font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-wide, 0.05em);
      color: var(--_sidenav-group-color);
      white-space: nowrap;
      overflow: hidden;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }

    .link {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      width: 100%;
      height: var(--_sidenav-item-height);
      padding: 0 var(--_sidenav-item-padding);
      border: none;
      border-radius: var(--_sidenav-item-radius);
      background: transparent;
      color: var(--_sidenav-item-color);
      font-family: inherit;
      font-size: var(--type-size-200, 14px);
      font-weight: var(--font-weight-medium, 500);
      line-height: 1;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
      transition: background 150ms ease, color 150ms ease;
    }
    .link:hover:not(.link--disabled) { background: var(--_sidenav-item-bg-hover); }
    .link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .link--active {
      color: var(--_sidenav-item-color-active);
      background: var(--_sidenav-item-bg-active);
      font-weight: var(--font-weight-semibold, 600);
    }
    .link--disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    .link--inert { cursor: default; }
    .link--child { height: 36px; font-size: var(--type-size-150, 13px); }

    .icon { flex-shrink: 0; display: inline-flex; }
    .label {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }
    .badge {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--radius-full, 9999px);
      background: var(--color-primary, #005862);
      color: var(--color-text-inverse, #ffffff);
      font-size: var(--type-size-100, 11px);
      font-weight: var(--font-weight-semibold, 600);
      line-height: 1;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }
    .chevron {
      flex-shrink: 0;
      margin-left: auto;
      display: inline-flex;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }

    .item--disabled,
    .child--disabled { opacity: 0.5; pointer-events: none; }
  `}}customElements.get("esa-sidebar-nav")||customElements.define("esa-sidebar-nav",f);const s=r=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${r}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`,c=[{label:"Dashboard",href:"/dashboard",icon:s("#005862"),active:!0,group:"Main"},{label:"Projects",href:"/projects",icon:s("#525252"),badge:12,group:"Main"},{label:"Reports",icon:s("#525252"),group:"Main",children:[{label:"Monthly",href:"/reports/monthly"},{label:"Quarterly",href:"/reports/quarterly"}]},{label:"Team",href:"/team",icon:s("#525252"),group:"Admin"},{label:"Billing",href:"/billing",icon:s("#525252"),group:"Admin",disabled:!0},{label:"Settings",href:"/settings",icon:s("#525252"),group:"Admin"}],o=document.getElementById("demo");o&&(o.items=c);const d=document.getElementById("demo2");d&&(d.items=c.slice(0,4));
