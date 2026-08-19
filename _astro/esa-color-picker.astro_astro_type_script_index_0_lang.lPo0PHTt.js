import{i as t,b as a,a as r}from"./lit-element.D8DSg5zn.js";import{t as i}from"./typography.KBHeYOQc.js";import{a as o}from"./a11y.sqk3bMt7.js";const l={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},n={xs:"microcopy-code-sm",sm:"microcopy-code-sm",md:"microcopy-code-md",lg:"microcopy-code-lg"};class c extends t{constructor(){super(),this.onColorInput=e=>{this.disabled||this.commit(e.target.value)},this.onHexInput=e=>{if(this.disabled)return;let s=e.target.value.trim();s&&!s.startsWith("#")&&(s="#"+s),/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)&&this.commit(s)},this.label="",this.size="md",this.swatches=[],this.disabled=!1,this.showInput=!0,this.value="#000000",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},swatches:{type:Array},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},showInput:{type:Boolean,attribute:"show-input"},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}willUpdate(e){e.has("value")&&this.internals.setFormValue(this.value)}commit(e){this.value=e,this.internals.setFormValue(e),this.dispatchEvent(new CustomEvent("change",{detail:{value:e},bubbles:!0,composed:!0}))}selectSwatch(e){this.disabled||this.commit(e)}isSelectedSwatch(e){return this.value.toLowerCase()===e.toLowerCase()}render(){return a`
      ${this.label?a`<label class="label typography-${l[this.size]}">${this.label}</label>`:null}
      <div class="controls">
        <div class="input-row">
          <label class="swatch-input">
            <input
              type="color"
              class="native"
              .value=${this.value}
              ?disabled=${this.disabled}
              @input=${this.onColorInput}
            />
            <span class="preview" style="background-color: ${this.value}"></span>
          </label>
          ${this.showInput?a`<input
                type="text"
                class="hex-input typography-${n[this.size]}"
                .value=${this.value}
                ?disabled=${this.disabled}
                @change=${this.onHexInput}
                placeholder="#000000"
                maxlength="7"
                spellcheck="false"
              />`:null}
        </div>

        ${this.swatches.length>0?a`<div class="swatches" role="listbox" aria-label="Color swatches">
              ${this.swatches.map(e=>a`<button
                  type="button"
                  class="swatch ${this.isSelectedSwatch(e)?"swatch--selected":""}"
                  style="background-color: ${e}"
                  ?disabled=${this.disabled}
                  aria-label=${"Select color "+e}
                  aria-selected=${this.isSelectedSwatch(e)}
                  role="option"
                  @click=${()=>this.selectSwatch(e)}
                ></button>`)}
            </div>`:null}
      </div>
    `}static{this.styles=[i,o,r`
    :host {
      display: block;
      --_preview-size: 40px; /* was --control-height-*, now standalone — see note */
      --_swatch-size: 28px;
      --_pad-y: var(--spacing-300, 0.75rem);
      --_radius: var(--radius-md, 0.5rem);
      --_padding-x: var(--spacing-300, 0.75rem);
    }
    :host([size='xs']) {
      --_preview-size: 28px;
      --_swatch-size: 20px;
      --_pad-y: var(--spacing-200, 0.5rem);
      --_radius: var(--radius-sm, 0.25rem);
      --_padding-x: var(--spacing-200, 0.5rem);
    }
    :host([size='sm']) {
      --_preview-size: 32px;
      --_swatch-size: 24px;
      --_pad-y: var(--spacing-250, 0.625rem);
      --_radius: var(--radius-sm, 0.25rem);
      --_padding-x: var(--spacing-250, 0.625rem);
    }
    :host([size='lg']) {
      --_preview-size: 48px;
      --_swatch-size: 32px;
      --_pad-y: var(--spacing-400, 1rem);
      --_radius: var(--radius-md, 0.5rem);
      --_padding-x: var(--spacing-400, 1rem);
    }

    .label {
      display: block;
      margin-bottom: var(--spacing-100, 4px);

      color: var(--color-content-default, #202020);
    }
    .controls {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-300, 12px);
    }
    .input-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
    }
    .swatch-input {
      position: relative;
      display: inline-flex;
      cursor: pointer;
    }
    .native {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
    }
    .preview {
      display: inline-block;
      width: var(--_preview-size);
      height: var(--_preview-size);
      border-radius: var(--_radius);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      cursor: pointer;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .preview:hover {
      border-color: var(--form-border-color-focus, #46a758);
    }
    .native:focus-visible + .preview {
      border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .hex-input {
      width: 100px;
      /* A bare input with no flex centring — at padding:0 and no height token this
         would collapse straight to its line box. */
      padding: var(--_pad-y) var(--_padding-x);
      color: var(--form-text-color, #202020);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--_radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .hex-input:focus {
      border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    .hex-input:disabled {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }

    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-100, 4px);
    }
    .swatch {
      width: var(--_swatch-size);
      height: var(--_swatch-size);
      flex-shrink: 0;
      border: 2px solid transparent;
      border-radius: var(--radius-xs, 0.125rem);
      padding: 0;
      cursor: pointer;
      transition:
        border-color var(--transition-fast, 150ms ease),
        transform var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .swatch:hover:not(:disabled) {
      transform: scale(1.1);
    }
    .swatch--selected {
      border-color: var(--color-background-brand, #46a758);
      box-shadow: 0 0 0 1px var(--color-background-brand, #46a758);
    }
    .swatch:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .swatch:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    :host([disabled]) .swatch-input,
    :host([disabled]) .preview {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]}}customElements.get("esa-color-picker")||customElements.define("esa-color-picker",c);
