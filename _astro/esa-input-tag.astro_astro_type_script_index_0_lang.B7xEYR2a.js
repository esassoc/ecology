import{i as p,b as r,A as n,a as u}from"./lit-element.D8DSg5zn.js";import{t as f}from"./typography.KBHeYOQc.js";import{a as v}from"./a11y.sqk3bMt7.js";import{a as g}from"./announcer.D25EqVSf.js";const l={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},b={xs:"microcopy-2xs-subtle",sm:"microcopy-xs-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"},d={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};class m extends p{constructor(){super(),this.warnedHint=!1,this.onDocClick=e=>{this._open&&(e.composedPath().includes(this)||this.closeDropdown())},this.wasEmpty=!1,this.onSearchInput=e=>{this._search=e.target.value,this._active=-1,this._open||this.openDropdown()},this.onInputFocus=()=>{this._open||this.openDropdown()},this.onKeydown=e=>{const t=this.filteredOptions,i=this.canAddTyped?1:0,o=t.length+i;switch(e.key){case"ArrowDown":if(e.preventDefault(),!this._open)return this.openDropdown();o>0&&(this._active=Math.min(this._active+1,o-1));break;case"ArrowUp":e.preventDefault(),o>0&&(this._active=Math.max(this._active-1,0));break;case"Enter":e.preventDefault(),this._open&&this._active>=0&&this._active<t.length?this.selectOption(t[this._active]):this.canAddTyped&&this.addToken(this._search);break;case"Escape":e.preventDefault(),this.closeDropdown(),this._search="";break;case"Backspace":!this._search&&this._values.length>0&&this.removeToken(this._values[this._values.length-1]);break}},this.toggleDropdown=()=>{this.disabled||(this._open?this.closeDropdown():this.openDropdown(),this._open&&this.focusInput())},this.label="",this.helpText="",this.errorText="",this.hint="",this.placeholder="Search or add...",this.options=[],this.size="md",this.disabled=!1,this.required=!1,this.strict=!1,this.tagsBelow=!1,this._values=[],this._search="",this._open=!1,this._active=-1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},helpText:{type:String,attribute:"help-text"},errorText:{type:String,attribute:"error-text"},hint:{type:String},placeholder:{type:String},options:{type:Array},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},required:{type:Boolean},strict:{type:Boolean},tagsBelow:{type:Boolean,attribute:"tags-below"},name:{type:String,reflect:!0},_values:{state:!0},_search:{state:!0},_open:{state:!0},_active:{state:!0}}}get resolvedHelpText(){return this.hint&&!this.helpText?(this.warnedHint||(this.warnedHint=!0,console.warn(`⚠️  esa-input-tag: \`hint="${this.hint}"\` is deprecated — renamed to \`help-text="${this.hint}"\`. Run \`node ../ecology/scripts/migrate-tokens.mjs --write\` in your spoke (migrations.json: form-hint-to-help-text).`)),this.hint):this.helpText}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.onDocClick),this.syncFormValue()}updated(){this.syncValidity(),this.announceEmptyResults()}announceEmptyResults(){const e=this._open&&this.strict&&!!this._search.trim()&&this.filteredOptions.length===0;e&&!this.wasEmpty&&g("No matching options",{assertive:!0}),this.wasEmpty=e}syncValidity(){if(!this.required||this._values.length>0){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".input")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Add at least one ${this.label}.`:"Add at least one value.",e)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocClick)}set value(e){e==null?this._values=[]:Array.isArray(e)?this._values=[...e]:this._values=String(e).split(",").map(t=>t.trim()).filter(Boolean),this.syncFormValue()}get value(){return[...this._values]}labelFor(e){return this.options.find(i=>i.value===e)?.label??e}get filteredOptions(){const e=new Set(this._values),t=this._search.toLowerCase().trim();return this.options.filter(i=>!(e.has(i.value)||t&&!i.label.toLowerCase().includes(t)))}get canAddTyped(){if(this.strict)return!1;const e=this._search.trim();return!e||this._values.includes(e)?!1:!this.options.some(t=>t.label.toLowerCase()===e.toLowerCase()&&!this._values.includes(t.value))}syncFormValue(){this.internals.setFormValue(this._values.length?this._values.join(","):null)}emitValue(){this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}openDropdown(){this.disabled||this._open||(this._open=!0,this._active=-1)}closeDropdown(){this._open&&(this._open=!1,this._active=-1)}focusInput(){requestAnimationFrame(()=>{this.renderRoot.querySelector(".input")?.focus()})}addToken(e){const t=e.trim();!t||this._values.includes(t)||(this._values=[...this._values,t],this._search="",this._active=-1,this.emitValue(),this.focusInput())}selectOption(e){this._values.includes(e.value)||(this._values=[...this._values,e.value],this._search="",this._active=-1,this.emitValue(),this.focusInput())}removeToken(e,t){t?.stopPropagation(),this._values=this._values.filter(i=>i!==e),this.emitValue(),this.focusInput()}renderChips(){return this._values.map(e=>r`<span class="chip typography-body-sm">
        <span class="chip__label">${this.labelFor(e)}</span>
        ${this.disabled?null:r`<button
              type="button"
              class="chip__remove"
              aria-label=${"Remove "+this.labelFor(e)}
              @click=${t=>this.removeToken(e,t)}
            >
              ${this.xIcon()}
            </button>`}
      </span>`)}focus(e){const t=this.renderRoot?.querySelector(".input");t?t.focus(e):super.focus(e)}render(){const e=!!this.errorText,t=this.resolvedHelpText,i=[e?"error":t?"help":"","cue"].filter(Boolean).join(" ");return r`
      <div class="field ${e?"field--error":""}">
        ${this.label?r`<label class="field__label typography-${l[this.size]}">
              ${this.label}${this.required?r`<span class="field__required" aria-hidden="true">*</span>`:null}
            </label>`:null}

        <div class="container ${this._open?"container--open":""} ${this.disabled?"container--disabled":""}">
          <div class="chips">
            ${this.tagsBelow?null:this.renderChips()}
            <input
              class="input typography-${b[this.size]}"
              type="text"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded=${this._open}
              aria-autocomplete="list"
              aria-required=${this.required?"true":n}
              aria-invalid=${e?"true":n}
              aria-describedby=${i}
              placeholder=${this._values.length?"":this.placeholder}
              .value=${this._search}
              ?disabled=${this.disabled}
              @input=${this.onSearchInput}
              @focus=${this.onInputFocus}
              @keydown=${this.onKeydown}
            />
          </div>

          ${this.options.length>0?r`<button
                type="button"
                class="toggle"
                aria-label="Toggle suggestions"
                ?disabled=${this.disabled}
                @mousedown=${o=>o.preventDefault()}
                @click=${this.toggleDropdown}
              >
                <span class="arrow ${this._open?"arrow--open":""}">${this.chevronIcon()}</span>
              </button>`:null}

          ${this._open?this.renderDropdown():null}
        </div>

        ${this.tagsBelow&&this._values.length?r`<div class="chips chips--below">${this.renderChips()}</div>`:null}
        ${e?r`<span class="field__error typography-body-sm" id="error">${this.errorText}</span>`:t?r`<span class="field__help typography-body-sm" id="help">${t}</span>`:null}
        <!-- Always hidden, always present: the instructional cue that means the
             suggestion list does not need to announce itself as it filters. -->
        <span class="visually-hidden" id="cue"
          >Suggestions filter as you type. Use the up and down arrows to review them,
          Enter to add one, Backspace on an empty field to remove the last.</span
        >
      </div>
    `}renderDropdown(){const e=this.filteredOptions,t=this.canAddTyped,i=e.length;return e.length===0&&!t?r`<div class="dropdown" role="listbox">
        <div class="empty typography-${d[this.size]}">${this._search?"No matches found":"Type a value and press Enter to add"}</div>
      </div>`:r`<div class="dropdown" role="listbox">
      ${e.map((o,a)=>r`<button
          type="button"
          class="option typography-${d[this.size]} ${a===this._active?"option--active":""}"
          role="option"
          aria-selected=${a===this._active}
          @mousedown=${h=>h.preventDefault()}
          @mouseenter=${()=>this._active=a}
          @click=${()=>this.selectOption(o)}
        >
          <span class="option__label">${o.label}</span>
        </button>`)}
      ${t?r`<button
            type="button"
            class="option option--add typography-${l[this.size]} ${this._active===i?"option--active":""}"
            role="option"
            aria-selected=${this._active===i}
            @mousedown=${o=>o.preventDefault()}
            @mouseenter=${()=>this._active=i}
            @click=${()=>this.addToken(this._search)}
          >
            ${this.plusIcon()}<span class="option__label">Add "${this._search.trim()}"</span>
          </button>`:null}
    </div>`}chevronIcon(){return r`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`}xIcon(){return r`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`}plusIcon(){return r`<svg class="option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`}static{this.styles=[f,v,u`
    :host {
      display: block;
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #cecece);
      /* Chip look — overridable per host (e.g. a neutral squared chip à la Beacon's
         ui-input-tag: gray bg, dark-gray text, small radius). Defaults unchanged. */
      --_chip-bg: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      --_chip-color: var(--color-content-brand, #2a7e3b);
      --_chip-radius: var(--radius-pill, 9999px);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--spacing-200, 0.5rem);
      --_field-padding-x: var(--spacing-200, 0.5rem);
      --_field-radius: var(--radius-sm, 0.25rem);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--spacing-250, 0.625rem);
      --_field-padding-x: var(--spacing-250, 0.625rem);
      --_field-radius: var(--radius-sm, 0.25rem);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--spacing-400, 1rem);
      --_field-padding-x: var(--spacing-400, 1rem);
      --_field-radius: var(--radius-md, 0.5rem);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      color: var(--form-label-color, #646464);
    }
    .field__required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      color: var(--form-help-color, #838383);
    }
    .field__error {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }

    .container {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .container:hover:not(.container--disabled) {
      --_field-border-color: var(--form-border-color-hover, #bbbbbb);
    }
    .container:focus-within,
    .container--open {
      --_field-border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    .container--disabled {
      cursor: not-allowed;
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
    }
    /* Hover/focus/open each re-point --_field-border-color at higher specificity
       than a bare ".field--error .container" selector, so the error state has to
       restate them or the border reverts to neutral the moment the pointer lands
       on it. */
    .field--error .container,
    .field--error .container:hover:not(.container--disabled) {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    .field--error .container:focus-within,
    .field--error .container.container--open {
      --_field-border-color: var(--form-error-border-color, #e5484d);
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--form-error-border-color, #e5484d);
    }
    .container--disabled:focus-within {
      box-shadow: none;
      --_field-border-color: var(--form-border-color, #cecece);
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
      color: var(--color-content-brand, #2a7e3b);
      border-radius: 50%;
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .chip__remove svg {
      width: 14px;
      height: 14px;
    }
    .chip__remove:hover {
      background: var(--color-background-overlay-strong-hover, rgba(0, 0, 0, 0.06));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: 1px;
    }

    .input {
      flex: 1;
      min-width: 80px;
      padding: 0;
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      background: transparent;
      border: none;
      outline: none;
      color: var(--form-text-color, #202020);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }
    .input:disabled {
      cursor: not-allowed;
      color: var(--color-content-disabled, #8d8d8d);
    }

    .toggle {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--color-content-default-muted, #838383);
      cursor: pointer;
    }
    .toggle:hover:not(:disabled) {
      color: var(--color-content-default-secondary, #646464);
    }
    .toggle:disabled {
      cursor: not-allowed;
    }
    .arrow {
      display: inline-flex;
      transition: transform var(--transition-fast, 150ms ease);
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
      top: calc(100% + var(--spacing-100, 4px));
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      max-height: 252px;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: var(--color-background-elevation-raised, #fcfcfc);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      background: transparent;
      border: none;
      color: var(--color-content-default, #202020);
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
      transition: background var(--transition-fast, 150ms ease);
    }
    .option:hover,
    .option--active {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }
    .option__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .option--add {
      color: var(--color-content-brand, #2a7e3b);
      border-top: var(--form-border-width, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }
    .option__icon {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
      flex-shrink: 0;
    }

    .empty {
      padding: var(--spacing-300, 12px);
      color: var(--color-content-default-muted, #838383);
      font-style: var(--font-style-italic, italic);
      text-align: center;
    }
  `]}}customElements.get("esa-input-tag")||customElements.define("esa-input-tag",m);const _=["California red-legged frog","Steelhead trout","Chinook salmon","Western pond turtle","Coho salmon","Tidewater goby","Burrowing owl","Vernal pool fairy shrimp","Delta smelt"].map(s=>({label:s,value:s.toLowerCase().replace(/\s+/g,"-")}));customElements.whenDefined("esa-input-tag").then(()=>{const s=document.getElementById("it-species");s&&(s.options=_);const e=document.getElementById("it-disabled");e&&(e.value=["wetland","riparian"])});const c=document.getElementById("it-form");c?.addEventListener("submit",s=>{s.preventDefault();const e=new FormData(c);document.getElementById("it-out").textContent="tags = "+JSON.stringify(e.get("tags"))});
