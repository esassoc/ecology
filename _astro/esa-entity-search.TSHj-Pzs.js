import{i as d,b as s,a as h}from"./lit-element.D8DSg5zn.js";import{o as p,a as n}from"./unsafe-svg.XdkOy8tF.js";const u=o=>o.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),c=(o,e)=>{const t=u(o);if(!e)return t;const r=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return t.replace(new RegExp(`(${r})`,"ig"),"<mark>$1</mark>")};class f extends d{constructor(){super(),this.query="",this.activeScope="",this.activeId=null,this.onGlobalKeydown=e=>{this.hotkey==="mod+k"&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"?(e.preventDefault(),this.toggle()):this.hotkey==="slash"&&e.key==="/"&&!this.isEditable(e.target)&&(e.preventDefault(),this.show())},this.onSearch=e=>{this.query=e.target.value,this.activeId=null},this.onKeydown=e=>{if(e.key==="Escape"){e.preventDefault(),this.close();return}if(e.key==="Tab"){e.preventDefault(),this.cycleScope(e.shiftKey?-1:1);return}if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault(),this.emit("show-all",{query:this.query,scope:this.activeScope}),this.close();return}const t=this.flatItems;if(t.length===0)return;const r=t.findIndex(a=>a.id===this.activeId);switch(e.key){case"ArrowDown":{e.preventDefault();const a=r<t.length-1?r+1:0;this.activeId=t[a].id;break}case"ArrowUp":{e.preventDefault();const a=r>0?r-1:t.length-1;this.activeId=t[a].id;break}case"Enter":{e.preventDefault();const a=t.find(i=>i.id===this.activeId)??(t.length===1?t[0]:null);a&&this.selectEntity(a);break}}},this.entities=[],this.scopes=[],this.recent=[],this.rowActions=[],this.open=!1,this.placeholder="Search…",this.allLabel="All",this.hotkey=""}static{this.properties={entities:{type:Array},scopes:{type:Array},recent:{type:Array},rowActions:{type:Array,attribute:"row-actions"},open:{type:Boolean,reflect:!0},placeholder:{type:String},allLabel:{type:String,attribute:"all-label"},hotkey:{type:String},query:{state:!0},activeScope:{state:!0},activeId:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onGlobalKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onGlobalKeydown)}isEditable(e){const t=e;if(!t)return!1;const r=t.tagName;return r==="INPUT"||r==="TEXTAREA"||r==="SELECT"||t.isContentEditable}toggle(){this.open?this.close():this.show()}show(){this.open=!0,this.query="",this.activeScope="",this.activeId=null,requestAnimationFrame(()=>{this.renderRoot.querySelector(".esa-entity-search__input")?.focus()})}close(){this.open=!1}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}get queryMatches(){const e=this.query.toLowerCase().trim();return e?this.entities.filter(t=>`${t.title} ${t.subtitle??""}`.toLowerCase().includes(e)):this.entities}scopeCount(e){return this.queryMatches.filter(t=>t.scope===e).length}get renderGroups(){const e=t=>this.scopes.find(r=>r.id===t);if(this.activeScope){const t=e(this.activeScope),r=this.queryMatches.filter(a=>a.scope===this.activeScope);return t&&r.length?[{scope:t,items:r}]:[]}return this.scopes.map(t=>({scope:t,items:this.queryMatches.filter(r=>r.scope===t.id)})).filter(t=>t.items.length>0)}get showingRecent(){return!this.query.trim()&&!this.activeScope&&this.recent.length>0}get flatItems(){return this.showingRecent?this.recent:this.renderGroups.flatMap(e=>e.items)}setScope(e){this.activeScope=e,this.activeId=null,this.emit("scope-change",{scope:e})}cycleScope(e){const t=["",...this.scopes.map(i=>i.id)],a=(t.indexOf(this.activeScope)+e+t.length)%t.length;this.setScope(t[a])}selectEntity(e){this.emit("select",{entity:e}),this.close()}onRowAction(e,t,r){e.stopPropagation(),this.emit("row-action",{action:t.id,entity:r})}iconFor(e){return e.icon??this.scopes.find(t=>t.id===e.scope)?.icon}renderIcon(e){return e?s`<svg class="esa-entity-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p(e)}</svg>`:null}renderRow(e){const t=this.rowActions.filter(r=>!r.scopes||r.scopes.includes(e.scope));return s`
      <button
        class="esa-entity-search__row ${e.id===this.activeId?"esa-entity-search__row--active":""}"
        role="option"
        aria-selected=${e.id===this.activeId}
        @click=${()=>this.selectEntity(e)}
        @mouseenter=${()=>this.activeId=e.id}
      >
        <span class="esa-entity-search__row-icon">${this.renderIcon(this.iconFor(e))}</span>
        <span class="esa-entity-search__row-text">
          <span class="esa-entity-search__row-title">${n(c(e.title,this.query.trim()))}</span>
          ${e.subtitle?s`<span class="esa-entity-search__row-subtitle">${n(c(e.subtitle,this.query.trim()))}</span>`:null}
        </span>
        ${e.meta?s`<span class="esa-entity-search__row-meta">${e.meta}</span>`:null}
        ${t.length?s`<span class="esa-entity-search__row-actions">
              ${t.map(r=>s`<button
                  class="esa-entity-search__row-action"
                  type="button"
                  title=${r.label}
                  aria-label=${r.label}
                  @click=${a=>this.onRowAction(a,r,e)}
                >
                  ${r.icon?this.renderIcon(r.icon):s`<span>${r.label}</span>`}
                </button>`)}
            </span>`:null}
      </button>
    `}render(){if(!this.open)return s``;const e=this.query.trim(),t=this.renderGroups,r=this.showingRecent,a=this.queryMatches.length;return s`
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

        ${this.scopes.length?s`<div class="esa-entity-search__scopes" role="tablist">
              <button
                class="esa-entity-search__scope ${this.activeScope===""?"esa-entity-search__scope--active":""}"
                role="tab"
                aria-selected=${this.activeScope===""}
                @click=${()=>this.setScope("")}
              >
                ${this.allLabel}${e?s`<span class="esa-entity-search__scope-count">${a}</span>`:null}
              </button>
              ${this.scopes.map(i=>s`<button
                  class="esa-entity-search__scope ${this.activeScope===i.id?"esa-entity-search__scope--active":""}"
                  role="tab"
                  aria-selected=${this.activeScope===i.id}
                  @click=${()=>this.setScope(i.id)}
                >
                  ${this.renderIcon(i.icon)}${i.label}${e?s`<span class="esa-entity-search__scope-count">${this.scopeCount(i.id)}</span>`:null}
                </button>`)}
            </div>`:null}

        <div class="esa-entity-search__results" role="listbox">
          ${r?s`<div class="esa-entity-search__group">
                <div class="esa-entity-search__group-head"><span>Recent</span></div>
                ${this.recent.map(i=>this.renderRow(i))}
              </div>`:t.length?t.map(i=>s`<div class="esa-entity-search__group">
                    <div class="esa-entity-search__group-head">
                      <span>${i.scope.label}</span>
                      <span class="esa-entity-search__group-count">${i.items.length}</span>
                    </div>
                    ${i.items.map(l=>this.renderRow(l))}
                  </div>`):s`<div class="esa-entity-search__empty">No results${e?s` for “${this.query}”`:null}.</div>`}
        </div>

        <div class="esa-entity-search__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          ${this.scopes.length?s`<span><kbd>Tab</kbd> Scope</span>`:null}
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    `}static{this.styles=h`
    :host { display: contents; }

    .esa-entity-search__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-overlay-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
    }

    .esa-entity-search {
      position: fixed;
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
      width: var(--entity-search-width, 600px);
      max-width: calc(100vw - 2rem);
      max-height: var(--entity-search-max-height, 70vh);
      background: var(--entity-search-bg, var(--color-background-floating, #ffffff));
      border: var(--border-width-default, 1px) solid var(--entity-search-border-color, var(--color-border, #dcdcdc));
      border-radius: var(--entity-search-radius, var(--radius-overlay, 0.75rem));
      box-shadow: var(--entity-search-shadow, 0 20px 60px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans, sans-serif);
      animation: esa-entity-enter var(--animation-enter, 150ms ease-out);
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
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-subtle, #efefef);
    }
    .esa-entity-search__search-icon { color: var(--color-content-muted, #7c7c7c); flex-shrink: 0; }
    .esa-entity-search__input {
      flex: 1;
      border: none;
      outline: none;
      font-size: var(--font-size-300, 1.0625rem);
      color: var(--color-content-primary, #171717);
      background: transparent;
      font-family: inherit;
    }
    .esa-entity-search__input::placeholder { color: var(--color-content-muted, #7c7c7c); }
    .esa-entity-search__kbd, .esa-entity-search__footer kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 19px;
      height: 19px;
      padding: 0 5px;
      font-family: inherit;
      font-size: var(--font-size-100, 0.75rem);
      font-weight: var(--font-weight-medium, 500);
      color: var(--color-content-muted, #7c7c7c);
      background: var(--color-background-raised, #fff);
      border: var(--border-width-default, 1px) solid var(--color-border, #dcdcdc);
      border-bottom-width: 2px;
      border-radius: 4px;
    }

    .esa-entity-search__scopes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-150, 0.375rem);
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-subtle, #efefef);
    }
    .esa-entity-search__scope {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      padding: 4px var(--spacing-250, 0.625rem);
      border: var(--border-width-default, 1px) solid var(--color-border, #dcdcdc);
      border-radius: var(--radius-pill, 9999px);
      background: var(--color-background-raised, #fff);
      color: var(--color-content-secondary, #525252);
      font: inherit;
      font-size: var(--font-size-100, 0.875rem);
      cursor: pointer;
      transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
    }
    .esa-entity-search__scope:hover { border-color: var(--color-border-brand, #c6dcf1); color: var(--color-content-primary, #171717); }
    .esa-entity-search__scope--active {
      background: var(--color-background-brand, #1e5386);
      border-color: var(--color-background-brand, #1e5386);
      color: var(--entity-search-selected-text, var(--color-content-inverse, #fcfcfc));
    }
    .esa-entity-search__scope-count {
      font-size: var(--font-size-100, 0.75rem);
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
      font-size: var(--font-size-100, 0.8125rem);
      font-weight: var(--font-weight-semibold, 550);
      text-transform: var(--text-transform-uppercase, uppercase);
      letter-spacing: 0.03em;
      color: var(--color-content-muted, #7c7c7c);
    }
    .esa-entity-search__group-count { font-variant-numeric: tabular-nums; }

    .esa-entity-search__row {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-surface, 0.5rem);
      background: transparent;
      color: var(--color-content-primary, #171717);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;
    }
    .esa-entity-search__row--active { background: var(--entity-search-row-bg-active, var(--color-background-sunken, #f3f7fc)); }
    .esa-entity-search__row-icon { flex-shrink: 0; display: inline-flex; color: var(--color-content-muted, #7c7c7c); }
    .esa-entity-search__row--active .esa-entity-search__row-icon { color: var(--color-content-brand, #2a7e3b); }
    .esa-entity-search__row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .esa-entity-search__row-title {
      font-size: var(--font-size-200, 0.9375rem);
      font-weight: var(--font-weight-medium, 500);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .esa-entity-search__row-subtitle {
      font-size: var(--font-size-100, 0.8125rem);
      color: var(--color-content-muted, #7c7c7c);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .esa-entity-search__row-title mark, .esa-entity-search__row-subtitle mark {
      background: color-mix(in srgb, var(--color-background-brand, #1e5386) 18%, transparent);
      color: inherit;
      border-radius: 2px;
    }
    .esa-entity-search__row-meta { flex-shrink: 0; font-size: var(--font-size-100, 0.8125rem); color: var(--color-content-muted, #7c7c7c); font-variant-numeric: tabular-nums; }
    .esa-entity-search__row-actions { flex-shrink: 0; display: inline-flex; gap: var(--spacing-100, 0.25rem); opacity: 0; }
    .esa-entity-search__row:hover .esa-entity-search__row-actions,
    .esa-entity-search__row--active .esa-entity-search__row-actions { opacity: 1; }
    .esa-entity-search__row-action {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px;
      border: var(--border-width-default, 1px) solid var(--color-border, #dcdcdc);
      border-radius: var(--radius-pill, 9999px);
      background: var(--color-background-raised, #fff);
      color: var(--color-content-secondary, #525252);
      font: inherit; font-size: var(--font-size-100, 0.75rem); cursor: pointer;
    }
    .esa-entity-search__row-action:hover { border-color: var(--color-background-brand, #1e5386); color: var(--color-background-brand, #1e5386); }

    .esa-entity-search__empty {
      padding: var(--spacing-700, 3rem) var(--spacing-600, 2rem);
      text-align: center;
      color: var(--color-content-muted, #7c7c7c);
      font-size: var(--font-size-200, 0.9375rem);
    }

    .esa-entity-search__footer {
      display: flex;
      gap: var(--spacing-400, 1rem);
      padding: var(--spacing-250, 0.625rem) var(--spacing-400, 1rem);
      border-top: var(--border-width-default, 1px) solid var(--color-border-subtle, #efefef);
      font-size: var(--font-size-100, 0.8125rem);
      color: var(--color-content-muted, #7c7c7c);
    }
    .esa-entity-search__footer span { display: inline-flex; align-items: center; gap: 4px; }
  `}}customElements.get("esa-entity-search")||customElements.define("esa-entity-search",f);
