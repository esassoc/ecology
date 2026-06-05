import{A as h,E as m,i as f,b as i,a as v}from"./lit-element.C8p3bJxG.js";/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const g={CHILD:2},_=r=>(...e)=>({_$litDirective$:r,values:e});class b{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class d extends b{constructor(e){if(super(e),this.it=h,e.type!==g.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===h||e==null)return this._t=void 0,this.it=e;if(e===m)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}}d.directiveName="unsafeHTML",d.resultType=1;const p=_(d),w=r=>r.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),u=(r,e)=>{const t=w(r);if(!e)return t;const s=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return t.replace(new RegExp(`(${s})`,"ig"),"<mark>$1</mark>")};class x extends f{constructor(){super(),this.query="",this.activeScope="",this.activeId=null,this.onGlobalKeydown=e=>{this.hotkey==="mod+k"&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"?(e.preventDefault(),this.toggle()):this.hotkey==="slash"&&e.key==="/"&&!this.isEditable(e.target)&&(e.preventDefault(),this.show())},this.onSearch=e=>{this.query=e.target.value,this.activeId=null},this.onKeydown=e=>{if(e.key==="Escape"){e.preventDefault(),this.close();return}if(e.key==="Tab"){e.preventDefault(),this.cycleScope(e.shiftKey?-1:1);return}if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault(),this.emit("show-all",{query:this.query,scope:this.activeScope}),this.close();return}const t=this.flatItems;if(t.length===0)return;const s=t.findIndex(a=>a.id===this.activeId);switch(e.key){case"ArrowDown":{e.preventDefault();const a=s<t.length-1?s+1:0;this.activeId=t[a].id;break}case"ArrowUp":{e.preventDefault();const a=s>0?s-1:t.length-1;this.activeId=t[a].id;break}case"Enter":{e.preventDefault();const a=t.find(o=>o.id===this.activeId)??(t.length===1?t[0]:null);a&&this.selectEntity(a);break}}},this.entities=[],this.scopes=[],this.recent=[],this.rowActions=[],this.open=!1,this.placeholder="Search…",this.allLabel="All",this.hotkey=""}static{this.properties={entities:{type:Array},scopes:{type:Array},recent:{type:Array},rowActions:{type:Array,attribute:"row-actions"},open:{type:Boolean,reflect:!0},placeholder:{type:String},allLabel:{type:String,attribute:"all-label"},hotkey:{type:String},query:{state:!0},activeScope:{state:!0},activeId:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onGlobalKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onGlobalKeydown)}isEditable(e){const t=e;if(!t)return!1;const s=t.tagName;return s==="INPUT"||s==="TEXTAREA"||s==="SELECT"||t.isContentEditable}toggle(){this.open?this.close():this.show()}show(){this.open=!0,this.query="",this.activeScope="",this.activeId=null,requestAnimationFrame(()=>{this.renderRoot.querySelector(".esa-entity-search__input")?.focus()})}close(){this.open=!1}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}get queryMatches(){const e=this.query.toLowerCase().trim();return e?this.entities.filter(t=>`${t.title} ${t.subtitle??""}`.toLowerCase().includes(e)):this.entities}scopeCount(e){return this.queryMatches.filter(t=>t.scope===e).length}get renderGroups(){const e=t=>this.scopes.find(s=>s.id===t);if(this.activeScope){const t=e(this.activeScope),s=this.queryMatches.filter(a=>a.scope===this.activeScope);return t&&s.length?[{scope:t,items:s}]:[]}return this.scopes.map(t=>({scope:t,items:this.queryMatches.filter(s=>s.scope===t.id)})).filter(t=>t.items.length>0)}get showingRecent(){return!this.query.trim()&&!this.activeScope&&this.recent.length>0}get flatItems(){return this.showingRecent?this.recent:this.renderGroups.flatMap(e=>e.items)}setScope(e){this.activeScope=e,this.activeId=null,this.emit("scope-change",{scope:e})}cycleScope(e){const t=["",...this.scopes.map(o=>o.id)],a=(t.indexOf(this.activeScope)+e+t.length)%t.length;this.setScope(t[a])}selectEntity(e){this.emit("select",{entity:e}),this.close()}onRowAction(e,t,s){e.stopPropagation(),this.emit("row-action",{action:t.id,entity:s})}iconFor(e){return e.icon??this.scopes.find(t=>t.id===e.scope)?.icon}renderIcon(e){return e?i`<svg class="esa-entity-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p(e)}</svg>`:null}renderRow(e){const t=this.rowActions.filter(s=>!s.scopes||s.scopes.includes(e.scope));return i`
      <button
        class="esa-entity-search__row ${e.id===this.activeId?"esa-entity-search__row--active":""}"
        role="option"
        aria-selected=${e.id===this.activeId}
        @click=${()=>this.selectEntity(e)}
        @mouseenter=${()=>this.activeId=e.id}
      >
        <span class="esa-entity-search__row-icon">${this.renderIcon(this.iconFor(e))}</span>
        <span class="esa-entity-search__row-text">
          <span class="esa-entity-search__row-title">${p(u(e.title,this.query.trim()))}</span>
          ${e.subtitle?i`<span class="esa-entity-search__row-subtitle">${p(u(e.subtitle,this.query.trim()))}</span>`:null}
        </span>
        ${e.meta?i`<span class="esa-entity-search__row-meta">${e.meta}</span>`:null}
        ${t.length?i`<span class="esa-entity-search__row-actions">
              ${t.map(s=>i`<button
                  class="esa-entity-search__row-action"
                  type="button"
                  title=${s.label}
                  aria-label=${s.label}
                  @click=${a=>this.onRowAction(a,s,e)}
                >
                  ${s.icon?this.renderIcon(s.icon):i`<span>${s.label}</span>`}
                </button>`)}
            </span>`:null}
      </button>
    `}render(){if(!this.open)return i``;const e=this.query.trim(),t=this.renderGroups,s=this.showingRecent,a=this.queryMatches.length;return i`
      <div class="esa-entity-search__backdrop" @click=${this.close}></div>
      <div class="esa-entity-search" role="dialog" aria-label="Search">
        <div class="esa-entity-search__search">
          <svg class="esa-entity-search__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            class="esa-entity-search__input"
            type="text"
            placeholder=${this.placeholder}
            .value=${this.query}
            @input=${this.onSearch}
            @keydown=${this.onKeydown}
            autocomplete="off"
          />
          <kbd class="esa-entity-search__kbd">ESC</kbd>
        </div>

        ${this.scopes.length?i`<div class="esa-entity-search__scopes" role="tablist">
              <button
                class="esa-entity-search__scope ${this.activeScope===""?"esa-entity-search__scope--active":""}"
                role="tab"
                aria-selected=${this.activeScope===""}
                @click=${()=>this.setScope("")}
              >
                ${this.allLabel}${e?i`<span class="esa-entity-search__scope-count">${a}</span>`:null}
              </button>
              ${this.scopes.map(o=>i`<button
                  class="esa-entity-search__scope ${this.activeScope===o.id?"esa-entity-search__scope--active":""}"
                  role="tab"
                  aria-selected=${this.activeScope===o.id}
                  @click=${()=>this.setScope(o.id)}
                >
                  ${this.renderIcon(o.icon)}${o.label}${e?i`<span class="esa-entity-search__scope-count">${this.scopeCount(o.id)}</span>`:null}
                </button>`)}
            </div>`:null}

        <div class="esa-entity-search__results" role="listbox">
          ${s?i`<div class="esa-entity-search__group">
                <div class="esa-entity-search__group-head"><span>Recent</span></div>
                ${this.recent.map(o=>this.renderRow(o))}
              </div>`:t.length?t.map(o=>i`<div class="esa-entity-search__group">
                    <div class="esa-entity-search__group-head">
                      <span>${o.scope.label}</span>
                      <span class="esa-entity-search__group-count">${o.items.length}</span>
                    </div>
                    ${o.items.map(y=>this.renderRow(y))}
                  </div>`):i`<div class="esa-entity-search__empty">No results${e?i` for “${this.query}”`:null}.</div>`}
        </div>

        <div class="esa-entity-search__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          ${this.scopes.length?i`<span><kbd>Tab</kbd> Scope</span>`:null}
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    `}static{this.styles=v`
    :host { display: contents; }

    .esa-entity-search__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
    }

    .esa-entity-search {
      position: fixed;
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      max-width: calc(100vw - 2rem);
      max-height: 70vh;
      background: var(--color-surface-elevated, #ffffff);
      border: 1px solid var(--color-border, #dcdcdc);
      border-radius: var(--radius-400, 0.75rem);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      z-index: var(--z-modal, 400);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans, sans-serif);
      animation: esa-entity-enter 150ms ease-out;
    }
    @keyframes esa-entity-enter {
      from { opacity: 0; transform: translateX(-50%) scale(0.96); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }

    .esa-entity-search__search {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-bottom: 1px solid var(--color-border-light, #efefef);
    }
    .esa-entity-search__search-icon { color: var(--color-text-muted, #7c7c7c); flex-shrink: 0; }
    .esa-entity-search__input {
      flex: 1;
      border: none;
      outline: none;
      font-size: var(--type-size-300, 1.0625rem);
      color: var(--color-text-primary, #171717);
      background: transparent;
      font-family: inherit;
    }
    .esa-entity-search__input::placeholder { color: var(--color-text-muted, #7c7c7c); }
    .esa-entity-search__kbd, .esa-entity-search__footer kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 19px;
      height: 19px;
      padding: 0 5px;
      font-family: inherit;
      font-size: 11px;
      font-weight: var(--font-weight-medium, 500);
      color: var(--color-text-muted, #7c7c7c);
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #dcdcdc);
      border-bottom-width: 2px;
      border-radius: 4px;
    }

    .esa-entity-search__scopes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-150, 0.375rem);
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-bottom: 1px solid var(--color-border-light, #efefef);
    }
    .esa-entity-search__scope {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      padding: 4px var(--spacing-250, 0.625rem);
      border: 1px solid var(--color-border, #dcdcdc);
      border-radius: var(--radius-full, 9999px);
      background: var(--color-surface, #fff);
      color: var(--color-text-secondary, #525252);
      font: inherit;
      font-size: var(--type-size-100, 0.875rem);
      cursor: pointer;
      transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
    }
    .esa-entity-search__scope:hover { border-color: var(--color-primary-border, #c6dcf1); color: var(--color-text-primary, #171717); }
    .esa-entity-search__scope--active {
      background: var(--color-primary, #1e5386);
      border-color: var(--color-primary, #1e5386);
      color: var(--color-primary-contrast, #fff);
    }
    .esa-entity-search__scope-count {
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      opacity: 0.8;
    }
    .esa-entity-search__scope .esa-entity-search__icon { width: 15px; height: 15px; }

    .esa-entity-search__results { overflow-y: auto; padding: var(--spacing-200, 0.5rem); flex: 1; }
    .esa-entity-search__group + .esa-entity-search__group { margin-top: var(--spacing-200, 0.5rem); }
    .esa-entity-search__group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-200, 0.5rem) var(--spacing-200, 0.5rem) var(--spacing-100, 0.25rem);
      font-size: var(--type-size-100, 0.8125rem);
      font-weight: var(--font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--color-text-muted, #7c7c7c);
    }
    .esa-entity-search__group-count { font-variant-numeric: tabular-nums; }

    .esa-entity-search__row {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-200, 0.5rem);
      background: transparent;
      color: var(--color-text-primary, #171717);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;
    }
    .esa-entity-search__row--active { background: var(--color-surface-sunken, #f3f7fc); }
    .esa-entity-search__row-icon { flex-shrink: 0; display: inline-flex; color: var(--color-text-muted, #7c7c7c); }
    .esa-entity-search__row--active .esa-entity-search__row-icon { color: var(--color-primary, #1e5386); }
    .esa-entity-search__row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .esa-entity-search__row-title {
      font-size: var(--type-size-200, 0.9375rem);
      font-weight: var(--font-weight-medium, 500);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .esa-entity-search__row-subtitle {
      font-size: var(--type-size-100, 0.8125rem);
      color: var(--color-text-muted, #7c7c7c);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .esa-entity-search__row-title mark, .esa-entity-search__row-subtitle mark {
      background: color-mix(in srgb, var(--color-primary, #1e5386) 18%, transparent);
      color: inherit;
      border-radius: 2px;
    }
    .esa-entity-search__row-meta { flex-shrink: 0; font-size: var(--type-size-100, 0.8125rem); color: var(--color-text-muted, #7c7c7c); font-variant-numeric: tabular-nums; }
    .esa-entity-search__row-actions { flex-shrink: 0; display: inline-flex; gap: var(--spacing-100, 0.25rem); opacity: 0; }
    .esa-entity-search__row:hover .esa-entity-search__row-actions,
    .esa-entity-search__row--active .esa-entity-search__row-actions { opacity: 1; }
    .esa-entity-search__row-action {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px;
      border: 1px solid var(--color-border, #dcdcdc);
      border-radius: var(--radius-full, 9999px);
      background: var(--color-surface, #fff);
      color: var(--color-text-secondary, #525252);
      font: inherit; font-size: 12px; cursor: pointer;
    }
    .esa-entity-search__row-action:hover { border-color: var(--color-primary, #1e5386); color: var(--color-primary, #1e5386); }

    .esa-entity-search__empty {
      padding: var(--spacing-700, 3rem) var(--spacing-600, 2rem);
      text-align: center;
      color: var(--color-text-muted, #7c7c7c);
      font-size: var(--type-size-200, 0.9375rem);
    }

    .esa-entity-search__footer {
      display: flex;
      gap: var(--spacing-400, 1rem);
      padding: var(--spacing-250, 0.625rem) var(--spacing-400, 1rem);
      border-top: 1px solid var(--color-border-light, #efefef);
      font-size: var(--type-size-100, 0.8125rem);
      color: var(--color-text-muted, #7c7c7c);
    }
    .esa-entity-search__footer span { display: inline-flex; align-items: center; gap: 4px; }
  `}}customElements.get("esa-entity-search")||customElements.define("esa-entity-search",x);const n={folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',eye:'<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>'},c=document.getElementById("es");c.scopes=[{id:"projects",label:"Projects",icon:n.folder},{id:"people",label:"People",icon:n.users},{id:"documents",label:"Documents",icon:n.file}];c.entities=[{id:"p1",title:"Riverbank restoration — Phase 2",subtitle:"Active · 2026",scope:"projects",url:"#p1",meta:"PRJ-204"},{id:"p2",title:"Riparian buffer planting",subtitle:"Planning",scope:"projects",url:"#p2",meta:"PRJ-211"},{id:"p3",title:"Fish passage culvert survey",subtitle:"Complete",scope:"projects",url:"#p3",meta:"PRJ-188"},{id:"u1",title:"Rita Alvarez",subtitle:"Hydrologist",scope:"people",url:"#u1"},{id:"u2",title:"Marcus Webb",subtitle:"Project sponsor",scope:"people",url:"#u2"},{id:"u3",title:"Priya Nair",subtitle:"GIS analyst",scope:"people",url:"#u3"},{id:"d1",title:"Riverbank monitoring report (Q1)",subtitle:"PDF · 2.1 MB",scope:"documents",url:"#d1",meta:"Mar 2026"},{id:"d2",title:"Permit application — Phase 2",subtitle:"DOCX",scope:"documents",url:"#d2",meta:"Jan 2026"}];c.recent=[c.entities[0],c.entities[3]];c.rowActions=[{id:"impersonate",label:"View as",icon:n.eye,scopes:["people"]}];const k=document.getElementById("es-result"),l=r=>k.textContent=r;c.addEventListener("select",r=>l(`select → ${r.detail.entity.title}`));c.addEventListener("scope-change",r=>l(`scope-change → ${r.detail.scope||"all"}`));c.addEventListener("show-all",r=>l(`show-all → query="${r.detail.query}", scope=${r.detail.scope||"all"}`));c.addEventListener("row-action",r=>l(`row-action → ${r.detail.action} on ${r.detail.entity.title}`));document.getElementById("open-es").addEventListener("click",()=>c.show());
