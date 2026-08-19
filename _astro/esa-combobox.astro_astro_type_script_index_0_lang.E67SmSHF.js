import{i as c,b as i,A as d,a as p}from"./lit-element.D8DSg5zn.js";import{t as h}from"./typography.D6s5VeQm.js";const a={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},s={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class u extends c{constructor(){super(),this._suppressNextOpen=!1,this.searchTimer=null,this.lastEmittedSearch="",this.onDocClick=e=>{this._open&&(e.composedPath().includes(this)||this.closeDropdown())},this.onSearchInput=e=>{const t=e.target.value;this._search=t,this._active=-1,this.emitSearch(t),this._open||this.openDropdown()},this.onInputFocus=()=>{if(this._suppressNextOpen){this._suppressNextOpen=!1;return}this._open||this.openDropdown()},this.onInputClick=()=>{this._open||this.openDropdown()},this.onKeydown=e=>{const t=this.filteredOptions;switch(e.key){case"ArrowDown":if(e.preventDefault(),!this._open)return this.openDropdown();{let r=this._active+1;for(;r<t.length&&t[r].disabled;)r++;r<t.length&&(this._active=r)}break;case"ArrowUp":if(e.preventDefault(),!this._open)return this.openDropdown();{let r=this._active-1;for(;r>=0&&t[r].disabled;)r--;r>=0&&(this._active=r)}break;case"Enter":if(e.preventDefault(),this._open&&this._active>=0){const r=t[this._active];r&&!r.disabled&&this.selectOption(r)}else this._open||this.openDropdown();break;case"Escape":e.preventDefault(),this.closeDropdown();break;case"Tab":this.closeDropdown();break}},this.mode="select",this.triggerStyle="field",this.options=[],this.multiple=!1,this.size="md",this.label="",this.placeholder="Select...",this.disabled=!1,this.required=!1,this.helpText="",this.errorText="",this.loading=!1,this.debounceMs=300,this.resultsCount=null,this._search="",this._selected=[],this._open=!1,this._active=-1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={mode:{type:String,reflect:!0},triggerStyle:{type:String,attribute:"trigger-style"},options:{type:Array},multiple:{type:Boolean},size:{type:String,reflect:!0},label:{type:String},placeholder:{type:String},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},required:{type:Boolean},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},loading:{type:Boolean},debounceMs:{type:Number,attribute:"debounce-ms"},resultsCount:{type:Number,attribute:"results-count"},_search:{state:!0},_selected:{state:!0},_open:{state:!0},_active:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.onDocClick),this.syncFormValue()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocClick),this.searchTimer&&clearTimeout(this.searchTimer)}set value(e){e==null?this._selected=[]:Array.isArray(e)?this._selected=e:this._selected=[e],this.syncFormValue()}get value(){return this.multiple?this._selected:this._selected[0]??""}get filteredOptions(){const e=this._search.toLowerCase();return e?this.options.filter(t=>t.label.toLowerCase().includes(e)):this.options}get displayValue(){return this._selected.length===0?"":this.multiple?this.options.filter(t=>this._selected.includes(t.value)).map(t=>t.label).join(", "):this.options.find(t=>t.value===this._selected[0])?.label??""}get selectedOptions(){return this.options.filter(e=>this._selected.includes(e.value))}get currentPlaceholder(){return this.multiple&&this._selected.length>0?"":this.placeholder}get inputValue(){return this.multiple?this._search:this._search||this.displayValue}isSelected(e){return this._selected.includes(e)}syncFormValue(){this.internals.setFormValue(this.multiple?this._selected.join(","):this._selected[0]??null)}updated(){this.syncValidity()}syncValidity(){if(!this.required||this._selected.length>0){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".input, .trigger--field, .trigger")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Select ${this.label}.`:"Select an option.",e)}emitValue(){this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}emitSearch(e){this.searchTimer&&clearTimeout(this.searchTimer),this.searchTimer=setTimeout(()=>{e!==this.lastEmittedSearch&&(this.lastEmittedSearch=e,this.dispatchEvent(new CustomEvent("search",{detail:{term:e},bubbles:!0,composed:!0})))},this.debounceMs)}toggleDropdown(){this.disabled||(this._open?this.closeDropdown():this.openDropdown())}openDropdown(){this.disabled||this._open||(this._open=!0,this._active=-1,this.mode==="select"&&requestAnimationFrame(()=>{this.renderRoot.querySelector(".search-input")?.focus()}))}closeDropdown(){this._open&&(this._open=!1,this._search="")}selectOption(e){if(e.disabled)return;const t=e.value;if(this.multiple){const r=this._selected.indexOf(t);this._selected=r>=0?this._selected.filter(l=>l!==t):[...this._selected,t],this._search="",this.emitValue();const o=this.mode==="autocomplete"?".input":".search-input";requestAnimationFrame(()=>this.renderRoot.querySelector(o)?.focus())}else if(this._selected=[t],this._search="",this.emitValue(),this.closeDropdown(),this.mode==="autocomplete"){const r=this.renderRoot.querySelector(".input");r&&this.renderRoot.activeElement!==r&&(this._suppressNextOpen=!0,requestAnimationFrame(()=>r.focus()))}}removeValue(e,t){t?.stopPropagation(),this._selected=this._selected.filter(r=>r!==e),this.emitValue()}highlight(e){const t=this._search.trim();if(!t)return i`${e}`;const o=e.toLowerCase().indexOf(t.toLowerCase());return o<0?i`${e}`:i`${e.slice(0,o)}<mark class="hl">${e.slice(o,o+t.length)}</mark>${e.slice(o+t.length)}`}render(){const e=!!this.errorText;return i`
      <div class="field ${e?"field--error":""}">
        ${this.label?i`<label class="field__label typography-${a[this.size]}">
              ${this.label}${this.required?i`<span class="field__required">*</span>`:null}
            </label>`:null}

        <div class="container">
          ${this.mode==="autocomplete"?this.renderAutocomplete():this.renderSelect()}
          ${this._open?this.renderDropdown():null}
        </div>

        ${e?i`<span class="field__error typography-body-sm">${this.errorText}</span>`:this.helpText?i`<span class="field__help typography-body-sm">${this.helpText}</span>`:null}
      </div>
    `}renderAutocomplete(){return i`
      ${this.multiple?this.renderChips():null}
      <div class="input-wrapper">
        <input
          class="input typography-${s[this.size]}"
          role="combobox"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder=${this.currentPlaceholder}
          .value=${this.inputValue}
          ?disabled=${this.disabled}
          @input=${this.onSearchInput}
          @keydown=${this.onKeydown}
          @focus=${this.onInputFocus}
          @click=${this.onInputClick}
        />
        ${this.loading?i`<span class="spinner spinner--inline">${this.spinnerIcon()}</span>`:null}
      </div>
    `}renderSelect(){const e=this.triggerStyle==="field";return i`
      ${this.multiple&&e?this.renderChips():null}
      <button
        type="button"
        class="trigger typography-${e?s[this.size]:a[this.size]} ${e?"trigger--field":"trigger--text"}"
        ?disabled=${this.disabled}
        @click=${()=>this.toggleDropdown()}
        @keydown=${this.onKeydown}
      >
        <span class="trigger__label">${this.displayValue||this.placeholder}</span>
        <span class="arrow ${this._open?"arrow--open":""}">${this.chevronIcon()}</span>
      </button>
    `}renderChips(){return this.selectedOptions.length===0?d:i`<div class="chips">
      ${this.selectedOptions.map(e=>i`<span class="chip typography-body-sm">
          <span class="chip__label">${e.label}</span>
          <button
            type="button"
            class="chip__remove"
            aria-label=${"Remove "+e.label}
            @click=${t=>this.removeValue(e.value,t)}
          >
            ${this.xIcon()}
          </button>
        </span>`)}
    </div>`}renderDropdown(){const e=this.filteredOptions;return i`<div class="dropdown" role="listbox" @keydown=${this.onKeydown}>
      ${this.mode==="select"?i`<div class="search">
            ${this.searchIcon()}
            <input
              class="search-input typography-${s[this.size]}"
              placeholder="Search..."
              .value=${this._search}
              @input=${this.onSearchInput}
              @keydown=${this.onKeydown}
            />
            ${this.loading?i`<span class="spinner">${this.spinnerIcon()}</span>`:null}
          </div>`:null}

      ${this.resultsCount!==null?i`<div class="results-count typography-body-sm">Displaying ${e.length} of ${this.resultsCount} results</div>`:null}

      <div class="viewport">
        ${e.map((t,r)=>{const o=this.isSelected(t.value);return i`<div
            class="option typography-${s[this.size]} ${r===this._active?"option--active":""} ${o?"option--selected":""} ${t.disabled?"option--disabled":""}"
            role="option"
            aria-selected=${o}
            @click=${()=>this.selectOption(t)}
            @mouseenter=${()=>this._active=r}
          >
            ${this.multiple?i`<span class="check ${o?"check--selected":""}">${this.checkIcon()}</span>`:null}
            <span class="option__label">${this.highlight(t.label)}</span>
          </div>`})}
      </div>

      ${e.length===0&&!this.loading?i`<div class="empty typography-${s[this.size]}">${this._search?"No results found":"No options available"}</div>`:null}
      ${this.loading&&e.length===0?i`<div class="loading typography-${s[this.size]}"><span class="spinner">${this.spinnerIcon()}</span> Searching...</div>`:null}
    </div>`}chevronIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`}checkIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>`}xIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`}searchIcon(){return i`<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>`}spinnerIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`}static{this.styles=[h,p`
    :host {
      display: block;
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--spacing-200, 0.5rem);
      --_field-padding-x: var(--spacing-200, 0.5rem);
      --_field-radius: var(--form-radius-xs, 4px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--spacing-250, 0.625rem);
      --_field-padding-x: var(--spacing-250, 0.625rem);
      --_field-radius: var(--form-radius-sm, 6px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--spacing-400, 1rem);
      --_field-padding-x: var(--spacing-400, 1rem);
      --_field-radius: var(--form-radius-lg, 10px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-content-danger, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      color: var(--form-help-color, #737373);
    }
    .field__error {
      color: var(--form-error-color, var(--color-content-danger, #ce2c31));
    }

    .container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      padding-inline-end: calc(var(--_field-padding-x) + 24px);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .input:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      display: inline-flex;
      color: var(--color-content-muted, #737373);
      animation: esa-cb-spin var(--animation-spin, 750ms linear infinite);
    }
    .spinner svg {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
    }
    .spinner--inline {
      position: absolute;
      right: var(--_field-padding-x);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    @keyframes esa-cb-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .spinner--inline {
      animation: esa-cb-spin-inline var(--animation-spin, 750ms linear infinite);
    }
    @keyframes esa-cb-spin-inline {
      from {
        transform: translateY(-50%) rotate(0deg);
      }
      to {
        transform: translateY(-50%) rotate(360deg);
      }
    }

    .trigger--text {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: 0;
      border: none;
      background: none;
      color: var(--color-content-brand, #3a7c59);
      cursor: pointer;
      max-width: 100%;
    }
    .trigger--text:hover {
      color: var(--color-content-brand, #3a7c59);
      text-decoration: underline;
    }
    .trigger--text:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 2px;
      border-radius: var(--_field-radius);
    }
    .trigger--text:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .trigger--text .trigger__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger--field {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      cursor: pointer;
      text-align: left;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .trigger--field:focus-visible {
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
      outline: none;
    }
    .trigger--field:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
      cursor: not-allowed;
    }
    .trigger--field .trigger__label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .arrow {
      display: inline-flex;
      color: var(--color-content-muted, #737373);
      pointer-events: none;
      transition: transform var(--transition-fast, 150ms ease);
      flex-shrink: 0;
    }
    .arrow svg {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
    }
    .arrow--open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      margin-top: var(--spacing-100, 4px);
      background: var(--color-background-raised, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #e5e5e5);
      border-radius: var(--form-radius-md, 8px);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      overflow: hidden;
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border, #e5e5e5);
    }
    .search__icon {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
      color: var(--color-content-muted, #737373);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      color: var(--form-text-color, #171717);
    }
    .search-input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }

    .results-count {
      padding: var(--spacing-100, 4px) var(--spacing-300, 12px);
      color: var(--color-content-muted, #737373);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-subtle, #efefef);
    }

    .viewport {
      max-height: 252px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      color: var(--color-content-primary, #171717);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
      box-sizing: border-box;
    }
    .option:hover,
    .option--active {
      background: var(--color-background-sunken, #efefef);
    }
    .option--selected {
      background: var(--color-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #3a7c59);
    }
    .option--disabled {
      color: var(--color-content-disabled, #a3a3a3);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .option--disabled:hover {
      background: transparent;
    }
    .option__label {
      flex: 1;
    }
    .hl {
      background: var(--color-background-warning-subtle, #fffbeb);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }

    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0;
      color: var(--color-content-brand, #3a7c59);
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .check svg {
      width: 16px;
      height: 16px;
    }
    .check--selected {
      opacity: 1;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-100, 4px);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
      padding: var(--spacing-050, 2px) var(--spacing-100, 4px) var(--spacing-050, 2px) var(--spacing-200, 8px);
      background: var(--color-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #3a7c59);
      border-radius: var(--radius-pill, 9999px);
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
      color: var(--color-content-brand, #3a7c59);
      border-radius: 50%;
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .chip__remove svg {
      width: 14px;
      height: 14px;
    }
    .chip__remove:hover {
      background: var(--color-overlay-hover-strong, rgba(0, 0, 0, 0.05));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }

    .empty,
    .loading {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-300, 12px);
      color: var(--color-content-muted, #737373);
      font-style: var(--font-style-italic, italic);
    }

    .field--error .input,
    .field--error .trigger--field {
      --_field-border-color: var(--form-error-border-color, #ef4444);
    }
    .field--error .input:focus,
    .field--error .trigger--field:focus-visible {
      box-shadow: 0 0 0 2px var(--color-border-danger, rgba(211, 47, 47, 0.25));
    }
  `]}}customElements.get("esa-combobox")||customElements.define("esa-combobox",u);const f=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada"].map(n=>({label:n,value:n.toLowerCase()}));customElements.whenDefined("esa-combobox").then(()=>{document.querySelectorAll("esa-combobox").forEach(n=>{n.options=f})});
