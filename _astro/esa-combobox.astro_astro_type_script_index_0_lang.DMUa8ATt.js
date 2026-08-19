import{b as r,i as p,A as o,a as u}from"./lit-element.D8DSg5zn.js";import{t as f}from"./typography.KBHeYOQc.js";import{a as g}from"./a11y.sqk3bMt7.js";import{a as b}from"./announcer.dkeh-00N.js";const v=r`<svg
  class="error__icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line
    x1="12"
    x2="12.01"
    y1="16"
    y2="16"
  />
</svg>`,l={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},d={xs:"microcopy-2xs-subtle",sm:"microcopy-xs-subtle",md:"microcopy-md-subtle",lg:"microcopy-lg-subtle"},n={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"};let c=!1;class m extends p{constructor(){super(),this._suppressNextOpen=!1,this.warnedMode=!1,this.searchTimer=null,this.lastEmittedSearch="",this.onDocClick=e=>{this._open&&(e.composedPath().includes(this)||this.closeDropdown())},this.wasEmpty=!1,this.onSearchInput=e=>{const t=e.target.value;this._search=t,this._active=-1,this.emitSearch(t),this._open||this.openDropdown()},this.onInputFocus=()=>{if(this._suppressNextOpen){this._suppressNextOpen=!1;return}this._open||this.openDropdown()},this.onInputClick=()=>{this._open||this.openDropdown()},this.onKeydown=e=>{const t=this.filteredOptions;switch(e.key){case"ArrowDown":if(e.preventDefault(),!this._open)return this.openDropdown();{let i=this._active+1;for(;i<t.length&&t[i].disabled;)i++;i<t.length&&(this._active=i)}break;case"ArrowUp":if(e.preventDefault(),!this._open)return this.openDropdown();{let i=this._active-1;for(;i>=0&&t[i].disabled;)i--;i>=0&&(this._active=i)}break;case"Enter":if(e.preventDefault(),this._open&&this._active>=0){const i=t[this._active];i&&!i.disabled&&this.selectOption(i)}else this._open||this.openDropdown();break;case"Escape":e.preventDefault(),this.closeDropdown();break;case"Tab":this.closeDropdown();break}},this.mode="autocomplete",this.triggerStyle="field",this.options=[],this.multiple=!1,this.size="md",this.label="",this.placeholder="Select...",this.disabled=!1,this.required=!1,this.liveError=!1,this.helpText="",this.cue="",this.errorText="",this.loading=!1,this.debounceMs=300,this.resultsCount=null,this._search="",this._selected=[],this._open=!1,this._active=-1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={mode:{type:String,reflect:!0},triggerStyle:{type:String,attribute:"trigger-style"},options:{type:Array},multiple:{type:Boolean},size:{type:String,reflect:!0},label:{type:String},placeholder:{type:String},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},required:{type:Boolean},liveError:{type:Boolean,attribute:"live-error"},helpText:{type:String,attribute:"help-text"},cue:{type:String},errorText:{type:String,attribute:"error-text"},loading:{type:Boolean},debounceMs:{type:Number,attribute:"debounce-ms"},resultsCount:{type:Number,attribute:"results-count"},_search:{state:!0},_selected:{state:!0},_open:{state:!0},_active:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.onDocClick),this.syncFormValue(),this.warnDefaultModeFlip()}warnDefaultModeFlip(){c||this.hasAttribute("mode")||(c=!0,console.warn('⚠️  esa-combobox: `mode` now defaults to "autocomplete" (was "select" before 2026-08-15), so this instance renders a free-text input rather than a button trigger. If that is what you want, write `mode="autocomplete"` to silence this. If you wanted the button trigger over a fixed list, that is <esa-select>. (migrations.json: combobox-mode-select-to-select)'))}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocClick),this.searchTimer&&clearTimeout(this.searchTimer)}set value(e){e==null?this._selected=[]:Array.isArray(e)?this._selected=e:this._selected=[e],this.syncFormValue()}get value(){return this.multiple?this._selected:this._selected[0]??""}get filteredOptions(){const e=this._search.toLowerCase();return e?this.options.filter(t=>t.label.toLowerCase().includes(e)):this.options}get displayValue(){return this._selected.length===0?"":this.multiple?this.options.filter(t=>this._selected.includes(t.value)).map(t=>t.label).join(", "):this.options.find(t=>t.value===this._selected[0])?.label??""}get selectedOptions(){return this.options.filter(e=>this._selected.includes(e.value))}get currentPlaceholder(){return this.multiple&&this._selected.length>0?"":this.placeholder}get inputValue(){return this.multiple?this._search:this._search||this.displayValue}isSelected(e){return this._selected.includes(e)}syncFormValue(){this.internals.setFormValue(this.multiple?this._selected.join(","):this._selected[0]??null)}updated(){this.syncValidity(),this.announceEmptyResults()}announceEmptyResults(){const e=this._open&&!this.loading&&!!this._search&&this.filteredOptions.length===0;e&&!this.wasEmpty&&b("No results found",{assertive:!0}),this.wasEmpty=e}get cueText(){return this.cue?this.cue:this.mode==="autocomplete"?"Results filter as you type. Use the up and down arrows to review them, Enter to choose.":"Use the up and down arrows to review options, Enter to choose."}syncValidity(){if(!this.required||this._selected.length>0){this.internals.setValidity({});return}const e=this.renderRoot?.querySelector(".input, .trigger--field, .trigger")??void 0;this.internals.setValidity({valueMissing:!0},this.label?`Select ${this.label}.`:"Select an option.",e)}emitValue(){this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}emitSearch(e){this.searchTimer&&clearTimeout(this.searchTimer),this.searchTimer=setTimeout(()=>{e!==this.lastEmittedSearch&&(this.lastEmittedSearch=e,this.dispatchEvent(new CustomEvent("search",{detail:{term:e},bubbles:!0,composed:!0})))},this.debounceMs)}toggleDropdown(){this.disabled||(this._open?this.closeDropdown():this.openDropdown())}openDropdown(){this.disabled||this._open||(this._open=!0,this._active=-1,this.mode==="select"&&requestAnimationFrame(()=>{this.renderRoot.querySelector(".search-input")?.focus()}))}closeDropdown(){if(!this._open)return;const e=this.renderRoot,t=this.mode!=="autocomplete"&&!!e.activeElement;this._open=!1,this._search="",t&&this.updateComplete.then(()=>{e.querySelector(".trigger")?.focus()})}selectOption(e){if(e.disabled)return;const t=e.value;if(this.multiple){const i=this._selected.indexOf(t);this._selected=i>=0?this._selected.filter(h=>h!==t):[...this._selected,t],this._search="",this.emitValue();const s=this.mode==="autocomplete"?".input":".search-input";requestAnimationFrame(()=>this.renderRoot.querySelector(s)?.focus())}else if(this._selected=[t],this._search="",this.emitValue(),this.closeDropdown(),this.mode==="autocomplete"){const i=this.renderRoot.querySelector(".input");i&&this.renderRoot.activeElement!==i&&(this._suppressNextOpen=!0,requestAnimationFrame(()=>i.focus()))}}removeValue(e,t){t?.stopPropagation(),this._selected=this._selected.filter(i=>i!==e),this.emitValue()}highlight(e){const t=this._search.trim();if(!t)return r`${e}`;const s=e.toLowerCase().indexOf(t.toLowerCase());return s<0?r`${e}`:r`${e.slice(0,s)}<mark class="hl">${e.slice(s,s+t.length)}</mark>${e.slice(s+t.length)}`}focus(e){const t=this.renderRoot?.querySelector(".input, .trigger");t?t.focus(e):super.focus(e)}render(){const e=!!this.errorText;return r`
      <div class="field ${e?"field--error":""}">
        ${this.label?r`<span class="field__label typography-${l[this.size]}" id="label">
              ${this.label}${this.required?r`<span class="field__required" aria-hidden="true">*</span>`:null}
            </span>`:null}

        <div class="container">
          ${this.mode==="autocomplete"?this.renderAutocomplete():this.renderSelect()}
          ${this._open?this.renderDropdown():null}
        </div>

        <!-- Both message nodes always present so the live region pre-exists its content;
             .visually-hidden when empty keeps them out of .field's flex gap. -->
        <span
          class="field__error typography-body-sm ${e?"":"visually-hidden"}"
          id="error"
          role=${this.liveError?"alert":o}
          data-esa-live=${this.liveError?"opt-in":o}
        >${e?r`${v}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`:o}</span
        >
        <span
          class="field__help typography-body-sm ${this.helpText?"":"visually-hidden"}"
          id="help"
          >${this.helpText||o}</span
        >
        <!-- Always hidden, always present: the instructional cue that means the
             results list does not need to announce itself. See the cueText prop. -->
        <span class="visually-hidden" id="cue">${this.cueText}</span>
      </div>
    `}get describedBy(){return[this.errorText?"error":"",this.helpText?"help":"","cue"].filter(Boolean).join(" ")}renderAutocomplete(){return r`
      ${this.multiple?this.renderChips():null}
      <div class="input-wrapper">
        <input
          class="input typography-${d[this.size]}"
          role="combobox"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-labelledby=${this.label?"label":o}
          aria-required=${this.required?"true":o}
          aria-invalid=${this.errorText?"true":o}
          aria-describedby=${this.describedBy||o}
          aria-controls=${this._open?"listbox":o}
          aria-activedescendant=${this._open&&this._active>=0?`opt-${this._active}`:o}
          placeholder=${this.currentPlaceholder}
          .value=${this.inputValue}
          ?disabled=${this.disabled}
          @input=${this.onSearchInput}
          @keydown=${this.onKeydown}
          @focus=${this.onInputFocus}
          @click=${this.onInputClick}
        />
        ${this.loading?r`<span class="spinner spinner--inline">${this.spinnerIcon()}</span>`:null}
      </div>
    `}renderSelect(){this.warnedMode||(this.warnedMode=!0,console.warn('⚠️  esa-combobox: `mode="select"` is deprecated — a button trigger over a fixed list is <esa-select>. A combobox is an autocomplete input with suggestions. Switch to <esa-select>, or drop `mode` to get the autocomplete input this component is for. (migrations.json: combobox-mode-select-to-select)'));const e=this.triggerStyle==="field";return r`
      ${this.multiple&&e?this.renderChips():null}
      <button
        type="button"
        class="trigger typography-${e?d[this.size]:l[this.size]} ${e?"trigger--field":"trigger--text"}"
        aria-labelledby=${this.label?"label":o}
        aria-required=${this.required?"true":o}
        aria-invalid=${this.errorText?"true":o}
        aria-describedby=${this.describedBy||o}
        ?disabled=${this.disabled}
        @click=${()=>this.toggleDropdown()}
        @keydown=${this.onKeydown}
      >
        <span class="trigger__label">${this.displayValue||this.placeholder}</span>
        <span class="arrow ${this._open?"arrow--open":""}">${this.chevronIcon()}</span>
      </button>
    `}renderChips(){return this.selectedOptions.length===0?o:r`<div class="chips">
      ${this.selectedOptions.map(e=>r`<span class="chip typography-body-sm">
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
    </div>`}renderDropdown(){const e=this.filteredOptions;return r`<div class="dropdown" role="listbox" id="listbox" @keydown=${this.onKeydown}>
      ${this.mode==="select"?r`<div class="search">
            ${this.searchIcon()}
            <input
              class="search-input typography-${n[this.size]}"
              placeholder="Search..."
              .value=${this._search}
              @input=${this.onSearchInput}
              @keydown=${this.onKeydown}
            />
            ${this.loading?r`<span class="spinner">${this.spinnerIcon()}</span>`:null}
          </div>`:null}

      ${this.resultsCount!==null?r`<div class="results-count typography-body-sm">Displaying ${e.length} of ${this.resultsCount} results</div>`:null}

      <div class="viewport">
        ${e.map((t,i)=>{const s=this.isSelected(t.value);return r`<div
            class="option typography-${n[this.size]} ${i===this._active?"option--active":""} ${s?"option--selected":""} ${t.disabled?"option--disabled":""}"
            role="option"
            id="opt-${i}"
            aria-selected=${s}
            aria-disabled=${t.disabled?"true":o}
            @click=${()=>this.selectOption(t)}
            @mouseenter=${()=>this._active=i}
          >
            <span class="check ${s?"check--selected":""}"
              >${this.checkIcon()}</span
            >
            <span class="option__label">${this.highlight(t.label)}</span>
          </div>`})}
      </div>

      ${e.length===0&&!this.loading?r`<div class="empty typography-${n[this.size]}">${this._search?"No results found":"No options available"}</div>`:null}
      ${this.loading&&e.length===0?r`<div class="loading typography-${n[this.size]}"><span class="spinner">${this.spinnerIcon()}</span> Searching...</div>`:null}
    </div>`}chevronIcon(){return r`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`}checkIcon(){return r`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>`}xIcon(){return r`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`}searchIcon(){return r`<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>`}spinnerIcon(){return r`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`}static{this.styles=[f,g,u`
    :host {
      display: block;
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #cecece);
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
    /* Three signals, not one: colour, icon, and a visually-hidden "Error:" prefix.
       Colour alone is SC 1.4.1 (Use of Color, Level A), and colour alone is all that
       separated this from .field__help — same tag, same slot, same type role. */
    .field__error {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
    .field__error .error__icon {
      flex: none;
      width: 1em;
      height: 1em;
    }
    /* Both message nodes ALWAYS render — a live region created at the same moment as
       its text is routinely not announced, so it has to already exist. When empty they
       carry .visually-hidden, which takes them out of flow: .field is a flex column
       with a gap, so an in-flow empty node would spend 4px of dead space each.
       Deliberately NOT display:none, which drops them from the accessibility tree. */

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
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      color: var(--form-text-color, #202020);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    .input:disabled {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }

    .spinner {
      display: inline-flex;
      color: var(--color-content-default-secondary, #646464);
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
      color: var(--color-content-brand, #2a7e3b);
      cursor: pointer;
      max-width: 100%;
    }
    .trigger--text:hover {
      color: var(--color-content-brand, #2a7e3b);
      text-decoration: underline;
    }
    .trigger--text:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
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
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      color: var(--form-text-color, #202020);
      background: var(--color-background-field, transparent);
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
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .trigger--field:disabled {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
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
      color: var(--color-content-default-secondary, #646464);
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
      background: var(--color-background-elevation-raised, #fcfcfc);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      overflow: hidden;
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
    }
    /* The ring goes on the ROW. .search-input is chromeless by design, so a ring on
       it would float around bare text; the row is the visible affordance. Inset
       because the row runs edge to edge inside an overflow:hidden dropdown. This is
       the same repair as esa-entity-search, esa-search-panel and esa-command-palette
       — the whole shape is "chromeless input in a bordered row". */
    .search:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
    }
    .search__icon {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
      color: var(--color-content-default-secondary, #646464);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      border: none;
      background: none;
      /* Suppressed only because .search paints the ring — never bare. */
      outline: none;
      color: var(--form-text-color, #202020);
    }
    .search-input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }

    .results-count {
      padding: var(--spacing-100, 4px) var(--spacing-300, 12px);
      color: var(--color-content-default-secondary, #646464);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
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
      color: var(--color-content-default, #202020);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
      box-sizing: border-box;
    }
    .option:hover,
    .option--active {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }
    .option--selected {
      background: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #2a7e3b);
    }
    .option--disabled {
      color: var(--color-content-disabled, #8d8d8d);
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
      background: var(--color-background-utility-warning-subtle, #fefdfb);
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
      color: var(--color-content-brand, #2a7e3b);
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
      background: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #2a7e3b);
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
      background: var(--color-background-overlay-strong-hover, rgba(0, 0, 0, 0.05));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: 1px;
    }

    .empty,
    .loading {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-300, 12px);
      color: var(--color-content-default-secondary, #646464);
      font-style: var(--font-style-italic, italic);
    }

    .field--error .input,
    .field--error .trigger--field {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    /* The invalid field's ring is the SAME ring in red, via the token rather than a property
       override. THIS COMPONENT IS THE STRONGEST CASE for the token: five things in here read
       --focus-ring-color — the autocomplete input, the text trigger, the field trigger, the
       dropdown's own search box, and every chip remove button. Naming each in an
       outline-color override is five rules to keep in step, and any one missed keeps ringing
       brand-green inside a field that is telling the user it is invalid. One declaration on
       the error wrapper reaches all five, because custom properties inherit. The dropdown
       panel is included by the same inheritance — see esa-text-field, where that consequence
       is recorded as a decision rather than left to be discovered.
       Two fixes here on 2026-08-17: it was a box-shadow, which stacked a second band once the
       base rings became outlines; and it read --color-border-utility-danger, which is red-6,
       a SUBTLE BORDER step measuring 1.40:1 on a sunken surface. */
    .field--error {
      --focus-ring-color: var(--form-error-border-color, #e5484d);
    }

    /* FORCED COLORS. Same treatment as esa-select, whose option CSS this file
       duplicates verbatim — see the longer note there. --selected takes the fill,
       --active takes an inset outline, so a row that is both still shows both.

       .hl (the search-match highlight) is a background too, and it is the one
       place here where the tint is the only channel. It gets Highlight so the
       matched run stays visible; the surrounding row keeps Canvas. */
    @media (forced-colors: active) {
      .option--active {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
      .option--selected {
        background: Highlight;
        color: HighlightText;
      }
      /* The tick must follow the row rather than keep its own brand colour. */
      .check { color: inherit; }
      .option--disabled { color: GrayText; }
      .hl {
        background: Highlight;
        color: HighlightText;
      }
    }
  `]}}customElements.get("esa-combobox")||customElements.define("esa-combobox",m);const x=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada"].map(a=>({label:a,value:a.toLowerCase()}));customElements.whenDefined("esa-combobox").then(()=>{document.querySelectorAll("esa-combobox").forEach(a=>{a.options=x})});
