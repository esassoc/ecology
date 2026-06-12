import{i as n,b as o,a as l}from"./lit-element.C8p3bJxG.js";import"./esa-checkbox.B-_0TbWH.js";class d extends n{constructor(){super(),this.onDocClick=e=>{this._open&&!e.composedPath().includes(this)&&(this._open=!1)},this.onDocKeydown=e=>{e.key==="Escape"&&this._open&&(this._open=!1)},this.togglePanel=()=>{const e=!this._open;this._open=e,e&&(this._highlighted=-1,requestAnimationFrame(()=>{this.renderRoot?.querySelector(".esa-filter-dropdown__search-input")?.focus()}))},this.onSearchInput=e=>{this._searchText=e.target.value,this._highlighted=-1},this.onKeydown=e=>{const t=this.filteredOptions,i=t.length-1;let r=this._highlighted;switch(e.key){case"ArrowDown":for(e.preventDefault(),r=r<i?r+1:0;t[r]?.disabled&&r<i;)r++;this._highlighted=r;break;case"ArrowUp":for(e.preventDefault(),r=r>0?r-1:i;t[r]?.disabled&&r>0;)r--;this._highlighted=r;break;case"Enter":e.preventDefault(),r>=0&&r<=i&&this.selectOption(t[r]);break;case"Escape":this._open=!1;break}},this.clear=e=>{e.stopPropagation(),this._selected=[],this.emitChange([])},this.name="",this.label="",this.options=[],this.multiple=!1,this.placeholder="",this.size="md",this._open=!1,this._searchText="",this._selected=[],this._highlighted=-1}static{this.properties={name:{type:String},label:{type:String},options:{type:Array},multiple:{type:Boolean,reflect:!0},placeholder:{type:String},size:{type:String,reflect:!0},_open:{state:!0},_searchText:{state:!0},_selected:{state:!0},_highlighted:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.onDocClick,!0),document.addEventListener("keydown",this.onDocKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocClick,!0),document.removeEventListener("keydown",this.onDocKeydown)}get filteredOptions(){const e=this._searchText.toLowerCase();return e?this.options.filter(t=>t.label.toLowerCase().includes(e)):this.options}get hasSelection(){return this._selected.length>0}get buttonLabel(){if(this.multiple||this._selected.length===0)return this.label;const e=this.options.find(t=>t.value===this._selected[0]);return`${this.label}: ${e?.label??this._selected[0]}`}isSelected(e){return this._selected.includes(e)}selectOption(e){if(e.disabled)return;const t=e.value;if(this.multiple){const r=this._selected.indexOf(t)>=0?this._selected.filter(a=>a!==t):[...this._selected,t];this._selected=r,this._searchText="",this.emitChange(r),requestAnimationFrame(()=>{this.renderRoot?.querySelector(".esa-filter-dropdown__search-input")?.focus()})}else this._selected=[t],this._searchText="",this._open=!1,this.emitChange([t])}emitChange(e){const t=this.multiple?e:e[0]??void 0;this.dispatchEvent(new CustomEvent("selection-change",{detail:{value:t},bubbles:!0,composed:!0}));const i=e.map(r=>{const a=this.options.find(s=>s.value===r);return{name:this.name,label:this.label,value:r,displayValue:a?.label??r}});this.dispatchEvent(new CustomEvent("esa-filter-change",{detail:{name:this.name,filters:i},bubbles:!0,composed:!0}))}render(){const e=this.filteredOptions;return o`
      <div class="esa-filter-dropdown">
        <button
          class="esa-filter-dropdown__trigger ${this.hasSelection?"esa-filter-dropdown__trigger--active":""}"
          type="button"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          @click=${this.togglePanel}
        >
          <span class="esa-filter-dropdown__label">${this.buttonLabel}</span>
          ${this.multiple&&this._selected.length>0?o`<span class="esa-filter-dropdown__count">${this._selected.length}</span>`:null}
          <span
            class="esa-filter-dropdown__arrow ${this._open?"esa-filter-dropdown__arrow--open":""}"
          >${p}</span>
        </button>

        ${this._open?o`<div class="esa-filter-dropdown__panel" role="listbox">
              <div class="esa-filter-dropdown__search">
                <input
                  class="esa-filter-dropdown__search-input"
                  type="text"
                  placeholder=${this.placeholder||"Search..."}
                  .value=${this._searchText}
                  @input=${this.onSearchInput}
                  @keydown=${this.onKeydown}
                  autocomplete="off"
                />
              </div>
              <div class="esa-filter-dropdown__options" role="group" aria-label=${this.label}>
                ${e.length===0?o`<div class="esa-filter-dropdown__empty">No options match.</div>`:e.map((t,i)=>o`<div
                        class="esa-filter-dropdown__option
                          ${t.disabled?"esa-filter-dropdown__option--disabled":""}
                          ${this._highlighted===i?"esa-filter-dropdown__option--highlighted":""}"
                        role="option"
                        aria-selected=${this.isSelected(t.value)}
                        aria-disabled=${t.disabled??!1}
                        @click=${()=>this.selectOption(t)}
                      >
                        <esa-checkbox
                          class="esa-filter-dropdown__checkbox"
                          size="sm"
                          ?checked=${this.isSelected(t.value)}
                          ?disabled=${t.disabled}
                          aria-hidden="true"
                          tabindex="-1"
                        ></esa-checkbox>
                        ${t.color?o`<span
                              class="esa-filter-dropdown__option-dot"
                              style="background:${t.color}"
                            ></span>`:null}
                        <span class="esa-filter-dropdown__option-label">${t.label}</span>
                      </div>`)}
              </div>
              <div class="esa-filter-dropdown__footer">
                <button
                  type="button"
                  class="esa-filter-dropdown__clear-link"
                  ?disabled=${!this.hasSelection}
                  @click=${this.clear}
                >Clear all</button>
              </div>
            </div>`:null}
      </div>
    `}static{this.styles=l`
    :host {
      display: inline-block;

      --_filter-height: 40px;
      --_filter-padding-x: var(--spacing-400, 1rem);
      --_filter-font-size: var(--type-size-200, 0.9375rem);
      --_filter-radius: var(--radius-200, 0.5rem);
      --_filter-bg: var(--color-surface, #fff);
      --_filter-bg-active: var(--color-primary-subtle, #f3f8fb);
      --_filter-text: var(--color-text-primary, #171717);
      --_filter-text-active: var(--color-primary, #43608a);
      --_filter-border: var(--color-border, #e5e5e5);
      --_filter-border-active: var(--color-primary, #43608a);
    }

    /* base :host = md. xs is one step below sm; sm/lg keep the old small/large values. */
    :host([size='xs']) {
      --_filter-height: 28px;
      --_filter-padding-x: var(--spacing-200, 0.5rem);
      --_filter-font-size: var(--type-size-100, 0.75rem);
      --_filter-radius: var(--radius-100, 0.25rem);
    }
    :host([size='sm']) {
      --_filter-height: 32px;
      --_filter-padding-x: var(--spacing-300, 0.75rem);
      --_filter-font-size: var(--type-size-150, 0.875rem);
      --_filter-radius: var(--radius-100, 0.25rem);
    }
    :host([size='lg']) {
      --_filter-height: 48px;
      --_filter-padding-x: var(--spacing-500, 1.5rem);
      --_filter-font-size: var(--type-size-300, 1.125rem);
      --_filter-radius: var(--radius-300, 0.5rem);
    }

    .esa-filter-dropdown {
      position: relative;
      display: inline-flex;
    }

    .esa-filter-dropdown__trigger {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      height: var(--_filter-height);
      padding-inline: var(--_filter-padding-x);
      border: 1px solid var(--_filter-border);
      border-radius: var(--_filter-radius);
      background: var(--_filter-bg);
      color: var(--_filter-text);
      font-family: var(--font-sans, inherit);
      font-size: var(--_filter-font-size);
      font-weight: var(--font-weight-medium, 450);
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
      -webkit-appearance: none;
      appearance: none;
    }
    .esa-filter-dropdown__trigger:hover:not(.esa-filter-dropdown__trigger--active) {
      border-color: var(--_filter-border-active);
    }
    .esa-filter-dropdown__trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .esa-filter-dropdown__trigger--active {
      background: var(--_filter-bg-active);
      border-color: var(--_filter-border-active);
      color: var(--_filter-text-active);
      font-weight: var(--font-weight-semibold, 550);
    }
    /* Open (panel showing) but nothing selected yet → just lift the border. */
    .esa-filter-dropdown__trigger[aria-expanded='true']:not(.esa-filter-dropdown__trigger--active) {
      border-color: var(--_filter-border-active);
    }

    .esa-filter-dropdown__label {
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .esa-filter-dropdown__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding-inline: 0.3rem;
      border-radius: var(--radius-full, 9999px);
      background: var(--color-primary, #43608a);
      color: var(--color-text-inverse, #fff);
      font-size: var(--type-size-100, 0.75rem);
      font-weight: var(--font-weight-semibold, 550);
      line-height: 1;
    }

    .esa-filter-dropdown__arrow {
      display: inline-flex;
      width: 20px;
      height: 20px;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__arrow svg { width: 20px; height: 20px; }
    .esa-filter-dropdown__arrow--open {
      transform: rotate(180deg);
    }

    .esa-filter-dropdown__clear {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__clear:hover { opacity: 1; }
    .esa-filter-dropdown__clear svg { width: 16px; height: 16px; }

    .esa-filter-dropdown__panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: var(--z-dropdown, 50);
      min-width: var(--filter-dropdown-min-width, 200px);
      max-height: 300px;
      background: var(--filter-dropdown-bg, var(--color-surface, #fff));
      border: var(--filter-dropdown-border, 1px solid var(--color-border, #e5e5e5));
      border-radius: var(--filter-dropdown-radius, var(--radius-200, 0.5rem));
      box-shadow: var(--filter-dropdown-shadow, var(--shadow-200, 0 4px 20px -4px rgba(0, 0, 0, 0.06)));
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .esa-filter-dropdown__search {
      padding: var(--spacing-200, 0.5rem);
      border-bottom: 1px solid var(--color-border, #e5e5e5);
    }
    .esa-filter-dropdown__search-input {
      width: 100%;
      box-sizing: border-box;
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: var(--radius-100, 0.25rem);
      font-family: var(--font-sans, inherit);
      font-size: var(--_filter-font-size);
      background: var(--color-surface, #fff);
      color: var(--color-text-primary, #171717);
      outline: none;
    }
    .esa-filter-dropdown__search-input:focus {
      border-color: var(--color-primary, #43608a);
      box-shadow: 0 0 0 1px var(--color-primary, #43608a);
    }

    .esa-filter-dropdown__options {
      margin: 0;
      padding: var(--spacing-100, 0.25rem) 0;
      overflow-y: auto;
      max-height: 240px;
    }
    .esa-filter-dropdown__option {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 0.5rem);
      padding: var(--spacing-150, 0.375rem) var(--spacing-300, 0.75rem);
      font-size: var(--_filter-font-size);
      font-family: var(--font-sans, inherit);
      color: var(--color-text-primary, #171717);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__option:hover:not(.esa-filter-dropdown__option--disabled),
    .esa-filter-dropdown__option--highlighted:not(.esa-filter-dropdown__option--disabled) {
      background: var(--color-surface-sunken, #f4f4f5);
    }
    .esa-filter-dropdown__option--disabled {
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    }
    /* Display-only: the row owns the click so the box never double-toggles. */
    .esa-filter-dropdown__checkbox {
      pointer-events: none;
      flex-shrink: 0;
    }
    /* Optional per-option color dot (options[].color) */
    .esa-filter-dropdown__option-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .esa-filter-dropdown__option-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .esa-filter-dropdown__empty {
      padding: var(--spacing-300, 0.75rem);
      color: var(--color-text-muted, #737373);
      font-style: italic;
      text-align: center;
    }

    .esa-filter-dropdown__footer {
      display: flex;
      justify-content: flex-end;
      padding: var(--spacing-200, 0.5rem);
      border-top: 1px solid var(--color-border, #e5e5e5);
    }
    .esa-filter-dropdown__clear-link {
      background: none;
      border: none;
      color: var(--color-primary, #43608a);
      font-family: var(--font-sans, inherit);
      font-size: var(--type-size-150, 0.875rem);
      font-weight: var(--font-weight-medium, 450);
      cursor: pointer;
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border-radius: var(--radius-100, 0.25rem);
    }
    .esa-filter-dropdown__clear-link:hover:not(:disabled) {
      background: var(--color-surface-sunken, #f4f4f5);
    }
    .esa-filter-dropdown__clear-link:disabled {
      color: var(--color-text-muted, #a3a3a3);
      cursor: not-allowed;
    }
  `}}const p=o`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>`;customElements.get("esa-filter-dropdown")||customElements.define("esa-filter-dropdown",d);
