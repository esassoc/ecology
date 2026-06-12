import{i as d,b as i,A as c,a as p}from"./lit-element.C8p3bJxG.js";class h extends d{constructor(){super(),this.onDocClick=e=>{this._open&&(e.composedPath().includes(this)||this.closeDropdown())},this.onSearchInput=e=>{this._search=e.target.value,this._active=-1,this._open||this.openDropdown()},this.onInputFocus=()=>{this._open||this.openDropdown()},this.onKeydown=e=>{const t=this.filteredOptions,o=this.canAddTyped?1:0,s=t.length+o;switch(e.key){case"ArrowDown":if(e.preventDefault(),!this._open)return this.openDropdown();s>0&&(this._active=Math.min(this._active+1,s-1));break;case"ArrowUp":e.preventDefault(),s>0&&(this._active=Math.max(this._active-1,0));break;case"Enter":e.preventDefault(),this._open&&this._active>=0&&this._active<t.length?this.selectOption(t[this._active]):this.canAddTyped&&this.addToken(this._search);break;case"Escape":e.preventDefault(),this.closeDropdown(),this._search="";break;case"Backspace":!this._search&&this._values.length>0&&this.removeToken(this._values[this._values.length-1]);break}},this.toggleDropdown=()=>{this.disabled||(this._open?this.closeDropdown():this.openDropdown(),this._open&&this.focusInput())},this.label="",this.hint="",this.placeholder="Search or add...",this.options=[],this.size="md",this.disabled=!1,this.required=!1,this.strict=!1,this.tagsBelow=!1,this.name="",this._values=[],this._search="",this._open=!1,this._active=-1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},hint:{type:String},placeholder:{type:String},options:{type:Array},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},required:{type:Boolean},strict:{type:Boolean},tagsBelow:{type:Boolean,attribute:"tags-below"},name:{type:String},_values:{state:!0},_search:{state:!0},_open:{state:!0},_active:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.onDocClick),this.syncFormValue()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocClick)}set value(e){e==null?this._values=[]:Array.isArray(e)?this._values=[...e]:this._values=String(e).split(",").map(t=>t.trim()).filter(Boolean),this.syncFormValue()}get value(){return[...this._values]}labelFor(e){return this.options.find(o=>o.value===e)?.label??e}get filteredOptions(){const e=new Set(this._values),t=this._search.toLowerCase().trim();return this.options.filter(o=>!(e.has(o.value)||t&&!o.label.toLowerCase().includes(t)))}get canAddTyped(){if(this.strict)return!1;const e=this._search.trim();return!e||this._values.includes(e)?!1:!this.options.some(t=>t.label.toLowerCase()===e.toLowerCase()&&!this._values.includes(t.value))}syncFormValue(){this.internals.setFormValue(this._values.length?this._values.join(","):null)}emitValue(){this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}openDropdown(){this.disabled||this._open||(this._open=!0,this._active=-1)}closeDropdown(){this._open&&(this._open=!1,this._active=-1)}focusInput(){requestAnimationFrame(()=>{this.renderRoot.querySelector(".input")?.focus()})}addToken(e){const t=e.trim();!t||this._values.includes(t)||(this._values=[...this._values,t],this._search="",this._active=-1,this.emitValue(),this.focusInput())}selectOption(e){this._values.includes(e.value)||(this._values=[...this._values,e.value],this._search="",this._active=-1,this.emitValue(),this.focusInput())}removeToken(e,t){t?.stopPropagation(),this._values=this._values.filter(o=>o!==e),this.emitValue(),this.focusInput()}renderChips(){return this._values.map(e=>i`<span class="chip">
        <span class="chip__label">${this.labelFor(e)}</span>
        ${this.disabled?null:i`<button
              type="button"
              class="chip__remove"
              aria-label=${"Remove "+this.labelFor(e)}
              @click=${t=>this.removeToken(e,t)}
            >
              ${this.xIcon()}
            </button>`}
      </span>`)}render(){return i`
      <div class="field">
        ${this.label?i`<label class="field__label">
              ${this.label}${this.required?i`<span class="field__required" aria-hidden="true">*</span>`:null}
            </label>`:null}

        <div class="container ${this._open?"container--open":""} ${this.disabled?"container--disabled":""}">
          <div class="chips">
            ${this.tagsBelow?null:this.renderChips()}
            <input
              class="input"
              type="text"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded=${this._open}
              aria-autocomplete="list"
              aria-required=${this.required?"true":c}
              placeholder=${this._values.length?"":this.placeholder}
              .value=${this._search}
              ?disabled=${this.disabled}
              @input=${this.onSearchInput}
              @focus=${this.onInputFocus}
              @keydown=${this.onKeydown}
            />
          </div>

          ${this.options.length>0?i`<button
                type="button"
                class="toggle"
                aria-label="Toggle suggestions"
                ?disabled=${this.disabled}
                @mousedown=${e=>e.preventDefault()}
                @click=${this.toggleDropdown}
              >
                <span class="arrow ${this._open?"arrow--open":""}">${this.chevronIcon()}</span>
              </button>`:null}

          ${this._open?this.renderDropdown():null}
        </div>

        ${this.tagsBelow&&this._values.length?i`<div class="chips chips--below">${this.renderChips()}</div>`:null}
        ${this.hint?i`<span class="field__hint">${this.hint}</span>`:null}
      </div>
    `}renderDropdown(){const e=this.filteredOptions,t=this.canAddTyped,o=e.length;return e.length===0&&!t?i`<div class="dropdown" role="listbox">
        <div class="empty">${this._search?"No matches found":"Type a value and press Enter to add"}</div>
      </div>`:i`<div class="dropdown" role="listbox">
      ${e.map((s,a)=>i`<button
          type="button"
          class="option ${a===this._active?"option--active":""}"
          role="option"
          aria-selected=${a===this._active}
          @mousedown=${l=>l.preventDefault()}
          @mouseenter=${()=>this._active=a}
          @click=${()=>this.selectOption(s)}
        >
          <span class="option__label">${s.label}</span>
        </button>`)}
      ${t?i`<button
            type="button"
            class="option option--add ${this._active===o?"option--active":""}"
            role="option"
            aria-selected=${this._active===o}
            @mousedown=${s=>s.preventDefault()}
            @mouseenter=${()=>this._active=o}
            @click=${()=>this.addToken(this._search)}
          >
            ${this.plusIcon()}<span class="option__label">Add "${this._search.trim()}"</span>
          </button>`:null}
    </div>`}chevronIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`}xIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`}plusIcon(){return i`<svg class="option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`}static{this.styles=p`
    :host {
      display: block;
      --_field-padding-y: var(--form-padding-y-md, 8px);
      --_field-padding-x: var(--form-padding-x-md, 12px);
      --_field-font-size: var(--form-font-size-md, 14px);
      --_field-min-height: var(--form-height-md, 40px);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
      --_chip-font-size: var(--type-size-150, 12px);
      /* Chip look — overridable per host (e.g. a neutral squared chip à la Beacon's
         ui-input-tag: gray bg, dark-gray text, small radius). Defaults unchanged. */
      --_chip-bg: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      --_chip-color: var(--color-primary, #43608a);
      --_chip-radius: var(--radius-full, 9999px);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs, 2px);
      --_field-padding-x: var(--form-padding-x-xs, 8px);
      --_field-font-size: var(--form-font-size-xs, 11px);
      --_field-min-height: var(--form-height-xs, 28px);
      --_field-radius: var(--form-radius-xs, 4px);
      --_chip-font-size: var(--type-size-100, 11px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 4px);
      --_field-padding-x: var(--form-padding-x-sm, 8px);
      --_field-font-size: var(--form-font-size-sm, 12px);
      --_field-min-height: var(--form-height-sm, 32px);
      --_field-radius: var(--form-radius-sm, 6px);
      --_chip-font-size: var(--type-size-100, 11px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 12px);
      --_field-padding-x: var(--form-padding-x-lg, 16px);
      --_field-font-size: var(--form-font-size-lg, 16px);
      --_field-min-height: var(--form-height-lg, 48px);
      --_field-radius: var(--form-radius-lg, 10px);
      --_chip-font-size: var(--type-size-200, 14px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-label-color, #525252);
    }
    .field__required {
      color: var(--color-danger, #ef4444);
      margin-left: 2px;
    }
    .field__hint {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }

    .container {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      min-height: var(--_field-min-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .container:hover:not(.container--disabled) {
      --_field-border-color: var(--form-border-color-hover, #a3a3a3);
    }
    .container:focus-within,
    .container--open {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }
    .container--disabled {
      background: var(--form-bg-disabled, #efefef);
      cursor: not-allowed;
    }
    .container--disabled:focus-within {
      box-shadow: none;
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }

    .chips {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-100, 4px);
      min-width: 0;
    }
    /* tags-below mode: chips live in their own row under the field */
    .chips--below {
      flex: none;
      padding-top: var(--spacing-100, 4px);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
      padding: 2px var(--spacing-100, 4px) 2px var(--spacing-200, 8px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_chip-font-size);
      line-height: 1.4;
      background: var(--_chip-bg);
      color: var(--_chip-color);
      border-radius: var(--_chip-radius);
      flex-shrink: 0;
      user-select: none;
    }
    .chip__label {
      white-space: nowrap;
    }
    .chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-primary, #43608a);
      border-radius: 50%;
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .chip__remove svg {
      width: 14px;
      height: 14px;
    }
    .chip__remove:hover {
      background: var(--color-hover-overlay-strong, rgba(0, 0, 0, 0.06));
    }
    .chip__remove:focus-visible {
      outline: 2px solid var(--focus-ring-color, rgba(0, 88, 98, 0.25));
      outline-offset: 1px;
    }

    .input {
      flex: 1;
      min-width: 80px;
      padding: 0;
      background: transparent;
      border: none;
      outline: none;
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }
    .input:disabled {
      cursor: not-allowed;
      color: var(--color-disabled-text, #a3a3a3);
    }

    .toggle {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--color-text-muted, #737373);
      cursor: pointer;
    }
    .toggle:hover:not(:disabled) {
      color: var(--color-text-secondary, #525252);
    }
    .toggle:disabled {
      cursor: not-allowed;
    }
    .arrow {
      display: inline-flex;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .arrow svg {
      width: var(--icon-size-small, 16px);
      height: var(--icon-size-small, 16px);
    }
    .arrow--open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + var(--spacing-100, 4px));
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      max-height: 252px;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: var(--color-surface, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #e5e5e5);
      border-radius: var(--form-radius-md, 8px);
      box-shadow: var(--shadow-200, 0 4px 12px rgba(0, 0, 0, 0.12));
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      background: transparent;
      border: none;
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--color-text-primary, #171717);
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
      transition: background var(--transition-fast, 150ms ease);
    }
    .option:hover,
    .option--active {
      background: var(--color-surface-sunken, #efefef);
    }
    .option__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .option--add {
      color: var(--color-primary, #43608a);
      font-weight: var(--font-weight-medium, 450);
      border-top: var(--form-border-width, 1px) solid var(--color-border-light, #efefef);
    }
    .option__icon {
      width: var(--icon-size-small, 16px);
      height: var(--icon-size-small, 16px);
      flex-shrink: 0;
    }

    .empty {
      padding: var(--spacing-300, 12px);
      color: var(--color-text-muted, #737373);
      font-size: var(--_field-font-size);
      font-style: italic;
      text-align: center;
    }
  `}}customElements.get("esa-input-tag")||customElements.define("esa-input-tag",h);const u=["California red-legged frog","Steelhead trout","Chinook salmon","Western pond turtle","Coho salmon","Tidewater goby","Burrowing owl","Vernal pool fairy shrimp","Delta smelt"].map(r=>({label:r,value:r.toLowerCase().replace(/\s+/g,"-")}));customElements.whenDefined("esa-input-tag").then(()=>{const r=document.getElementById("it-species");r&&(r.options=u);const e=document.getElementById("it-disabled");e&&(e.value=["wetland","riparian"])});const n=document.getElementById("it-form");n?.addEventListener("submit",r=>{r.preventDefault();const e=new FormData(n);document.getElementById("it-out").textContent="tags = "+JSON.stringify(e.get("tags"))});
