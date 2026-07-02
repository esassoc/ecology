import{i as s,b as i,a}from"./lit-element.C8p3bJxG.js";class n extends s{constructor(){super(),this.onDocClick=e=>{this._open&&(e.composedPath().includes(this)||(this._open=!1))},this.onSearchInput=e=>{this._search=e.target.value,this._active=-1,this._open||(this._open=!0)},this.onKeydown=e=>{const r=this.filteredOptions;switch(e.key){case"ArrowDown":if(e.preventDefault(),!this._open)return this.openDropdown();{let t=this._active+1;for(;t<r.length&&r[t].disabled;)t++;t<r.length&&(this._active=t)}break;case"ArrowUp":if(e.preventDefault(),!this._open)return this.openDropdown();{let t=this._active-1;for(;t>=0&&r[t].disabled;)t--;t>=0&&(this._active=t)}break;case"Enter":if(e.preventDefault(),this._open&&this._active>=0){const t=r[this._active];t&&!t.disabled&&this.selectOption(t)}else this._open||this.openDropdown();break;case"Escape":e.preventDefault(),this._open=!1;break;case"Tab":this._open=!1;break}},this.label="",this.options=[],this.size="md",this.placeholder="Select...",this.helpText="",this.errorText="",this.required=!1,this.disabled=!1,this.multiple=!1,this.searchable=!0,this.chipMode=!1,this._search="",this._selected=[],this._open=!1,this._active=-1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},options:{type:Array},size:{type:String,reflect:!0},placeholder:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},required:{type:Boolean},disabled:{type:Boolean,reflect:!0},multiple:{type:Boolean},searchable:{type:Boolean},chipMode:{type:Boolean,attribute:"chip-mode"},_search:{state:!0},_selected:{state:!0},_open:{state:!0},_active:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.onDocClick),this.syncFormValue()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocClick)}set value(e){e==null?this._selected=[]:Array.isArray(e)?this._selected=e:this._selected=[e],this.syncFormValue()}get value(){return this.multiple?this._selected:this._selected[0]??""}get filteredOptions(){const e=this._search.toLowerCase();return e?this.options.filter(r=>r.label.toLowerCase().includes(e)):this.options}get displayValue(){return this._selected.length===0?"":this.options.find(r=>r.value===this._selected[0])?.label??""}get selectedOptions(){return this.options.filter(e=>this._selected.includes(e.value))}get inputValue(){return this.multiple?this._search:this._search||this.displayValue}isSelected(e){return this._selected.includes(e)}syncFormValue(){this.internals.setFormValue(this.multiple?this._selected.join(","):this._selected[0]??null)}emit(){this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}toggleDropdown(){this.disabled||(this._open?this._open=!1:this.openDropdown())}openDropdown(){this.disabled||(this._open=!0,this._active=-1,requestAnimationFrame(()=>{this.renderRoot.querySelector(".input")?.focus()}))}selectOption(e){if(e.disabled)return;const r=e.value;if(this.multiple){const t=this._selected.indexOf(r);this._selected=t>=0?this._selected.filter(o=>o!==r):[...this._selected,r],this._search="",this.emit(),requestAnimationFrame(()=>{this.renderRoot.querySelector(".input")?.focus()})}else this._selected=[r],this._search="",this._open=!1,this.emit()}removeValue(e,r){r?.stopPropagation(),this._selected=this._selected.filter(t=>t!==e),this.emit()}clearSelection(e){e?.stopPropagation(),this._selected=[],this.emit()}renderTags(){const e=this.selectedOptions;if(e.length===0)return null;if(e.length>1)return i`<span class="chip chip--count">
        <span class="chip__label">${e.length} Options</span>
        <button
          type="button"
          class="chip__remove"
          aria-label="Clear selection"
          @click=${t=>this.clearSelection(t)}
        >
          ${this.xIcon()}
        </button>
      </span>`;const r=e[0];return i`<span class="chip">
      <span class="chip__label">${r.label}</span>
      <button
        type="button"
        class="chip__remove"
        aria-label=${"Remove "+r.label}
        @click=${t=>this.removeValue(r.value,t)}
      >
        ${this.xIcon()}
      </button>
    </span>`}render(){const e=!!this.errorText;return i`
      <div class="field ${e?"field--error":""}">
        ${this.label?i`<label class="field__label">
              ${this.label}${this.required?i`<span class="field__required">*</span>`:null}
            </label>`:null}

        <div class="container">
          <!-- Multi-select chip mode renders the selected tokens INSIDE the field
               box (tag input), not floating above it. -->
          <div
            class="input-wrapper ${this.multiple&&this.chipMode?"input-wrapper--tags":""}"
            @click=${()=>this.toggleDropdown()}
          >
            ${this.multiple&&this.chipMode?this.renderTags():null}
            <input
              class="input"
              role="combobox"
              aria-expanded=${this._open}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              placeholder=${this.multiple&&this.chipMode&&this.selectedOptions.length?"":this.placeholder}
              .value=${this.inputValue}
              ?disabled=${this.disabled}
              ?readonly=${!this.searchable}
              @input=${this.onSearchInput}
              @keydown=${this.onKeydown}
            />
            <span class="arrow ${this._open?"arrow--open":""}">${this.chevronIcon()}</span>
          </div>

          ${this._open?i`<div class="dropdown" role="listbox">
                ${this.filteredOptions.length===0?i`<div class="option option--empty">No results found</div>`:this.filteredOptions.map((r,t)=>{const o=this.isSelected(r.value);return i`<div
                        class="option ${t===this._active?"option--active":""} ${o?"option--selected":""} ${r.disabled?"option--disabled":""}"
                        role="option"
                        aria-selected=${o}
                        aria-disabled=${r.disabled??!1}
                        @click=${()=>this.selectOption(r)}
                        @mouseenter=${()=>this._active=t}
                      >
                        ${this.multiple?i`<span class="check ${o?"check--selected":""}">${this.checkIcon()}</span>`:null}
                        <span class="option__label">${r.label}</span>
                      </div>`})}
              </div>`:null}
        </div>

        ${e?i`<span class="field__error">${this.errorText}</span>`:this.helpText?i`<span class="field__help">${this.helpText}</span>`:null}
      </div>
    `}chevronIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`}checkIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>`}xIcon(){return i`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`}static{this.styles=a`
    :host {
      display: block;
      --_field-padding-y: var(--form-padding-y-md, 8px);
      --_field-padding-x: var(--form-padding-x-md, 12px);
      --_field-font-size: var(--form-font-size-md, 14px);
      --_field-height: var(--form-height-md, 40px);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs, 2px);
      --_field-padding-x: var(--form-padding-x-xs, 8px);
      --_field-font-size: var(--form-font-size-xs, 11px);
      --_field-height: var(--form-height-xs, 28px);
      --_field-radius: var(--form-radius-xs, 4px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 4px);
      --_field-padding-x: var(--form-padding-x-sm, 8px);
      --_field-font-size: var(--form-font-size-sm, 12px);
      --_field-height: var(--form-height-sm, 32px);
      --_field-radius: var(--form-radius-sm, 6px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 12px);
      --_field-padding-x: var(--form-padding-x-lg, 16px);
      --_field-font-size: var(--form-font-size-lg, 16px);
      --_field-height: var(--form-height-lg, 48px);
      --_field-radius: var(--form-radius-lg, 10px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--form-label-font-size, var(--_field-font-size));
      font-weight: var(--form-label-font-weight, var(--font-weight-medium, 450));
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-danger-strong, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
    .field__error {
      font-size: var(--type-size-150, 12px);
      color: var(--form-error-color, var(--color-danger-strong, #ce2c31));
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
      cursor: pointer;
    }
    /* Tag mode: chips render inside the field box, so the wrapper carries the
       border/height/focus and the input becomes a borderless filler beside them. */
    .input-wrapper--tags {
      flex-wrap: nowrap;
      gap: var(--spacing-100, 4px);
      min-height: var(--_field-height);
      padding: var(--_field-padding-y) calc(var(--_field-padding-x) + 24px)
        var(--_field-padding-y) var(--_field-padding-x);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input-wrapper--tags:focus-within {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 2px var(--focus-ring-color, rgba(0, 88, 98, 0.25));
    }
    .input-wrapper--tags .input {
      /* Compact tag filter: at most ONE token renders (a single chip, or an
         "N Options" count for 2+), so the input rides beside it on one line and the
         box stays at field height — it never wraps to a second row. */
      flex: 1 1 2rem;
      width: auto;
      min-width: 2rem;
      height: auto;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
    }
    .input-wrapper--tags .input:focus {
      box-shadow: none;
    }
    .field--error .input-wrapper--tags {
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .input {
      width: 100%;
      height: var(--_field-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      padding-inline-end: calc(var(--_field-padding-x) + 24px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      cursor: pointer;
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

    .arrow {
      position: absolute;
      right: var(--_field-padding-x);
      top: 50%;
      transform: translateY(-50%);
      display: inline-flex;
      color: var(--color-text-muted, #737373);
      pointer-events: none;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .arrow svg {
      width: var(--icon-size-medium, 20px);
      height: var(--icon-size-medium, 20px);
    }
    .arrow--open {
      transform: translateY(-50%) rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      margin-top: var(--spacing-100, 4px);
      max-height: 256px;
      overflow-y: auto;
      background: var(--color-surface, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #e5e5e5);
      border-radius: var(--form-radius-md, 8px);
      box-shadow: var(--shadow-200, 0 4px 12px rgba(0, 0, 0, 0.12));
      overscroll-behavior: contain;
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--color-text-primary, #171717);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
    }
    .option:hover,
    .option--active {
      background: var(--color-surface-sunken, #efefef);
    }
    .option--selected {
      background: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      color: var(--color-primary-strong, #3a7c59);
    }
    .option--disabled {
      color: var(--color-disabled-text, #a3a3a3);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .option--disabled:hover {
      background: transparent;
    }
    .option--empty {
      color: var(--color-text-muted, #737373);
      cursor: default;
      font-style: italic;
    }
    .option--empty:hover {
      background: transparent;
    }
    .option__label {
      flex: 1;
    }

    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0;
      color: var(--color-primary-strong, #3a7c59);
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
      padding: 0 var(--spacing-100, 4px) 0 var(--spacing-200, 8px);
      background: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      color: var(--color-primary-strong, #3a7c59);
      border-radius: var(--radius-full, 9999px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--type-size-150, 12px);
      line-height: 1.2;
      user-select: none;
    }
    .chip__label {
      white-space: nowrap;
    }
    .chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-primary-strong, #3a7c59);
      border-radius: 50%;
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .chip__remove svg {
      width: 14px;
      height: 14px;
    }
    .chip__remove:hover {
      background: var(--color-hover-overlay-strong, rgba(0, 0, 0, 0.05));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }

    .field--error .input {
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 2px var(--color-danger-border, rgba(211, 47, 47, 0.25));
    }
  `}}customElements.get("esa-select")||customElements.define("esa-select",n);
