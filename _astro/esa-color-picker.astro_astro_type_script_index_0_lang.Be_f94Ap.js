import{i as r,b as t,a}from"./lit-element.C8p3bJxG.js";class i extends r{constructor(){super(),this.onColorInput=e=>{this.disabled||this.commit(e.target.value)},this.onHexInput=e=>{if(this.disabled)return;let s=e.target.value.trim();s&&!s.startsWith("#")&&(s="#"+s),/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)&&this.commit(s)},this.label="",this.size="md",this.swatches=[],this.disabled=!1,this.showInput=!0,this.value="#000000",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},swatches:{type:Array},disabled:{type:Boolean,reflect:!0},showInput:{type:Boolean,attribute:"show-input"},value:{type:String}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.value)}commit(e){this.value=e,this.internals.setFormValue(e),this.dispatchEvent(new CustomEvent("change",{detail:{value:e},bubbles:!0,composed:!0}))}selectSwatch(e){this.disabled||this.commit(e)}isSelectedSwatch(e){return this.value.toLowerCase()===e.toLowerCase()}render(){return t`
      ${this.label?t`<label class="label">${this.label}</label>`:null}
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
          ${this.showInput?t`<input
                type="text"
                class="hex-input"
                .value=${this.value}
                ?disabled=${this.disabled}
                @change=${this.onHexInput}
                placeholder="#000000"
                maxlength="7"
                spellcheck="false"
              />`:null}
        </div>

        ${this.swatches.length>0?t`<div class="swatches" role="listbox" aria-label="Color swatches">
              ${this.swatches.map(e=>t`<button
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
    `}static{this.styles=a`
    :host {
      display: block;
      --_preview-size: 40px;
      --_swatch-size: 28px;
      --_font-size: var(--form-font-size-md, 14px);
      --_height: var(--form-height-md, 40px);
      --_radius: var(--form-radius-md, 8px);
      --_padding-x: var(--form-padding-x-md, 12px);
    }
    :host([size='xs']) {
      --_preview-size: 28px;
      --_swatch-size: 20px;
      --_font-size: var(--form-font-size-xs, 11px);
      --_height: var(--form-height-xs, 28px);
      --_radius: var(--form-radius-xs, 4px);
      --_padding-x: var(--form-padding-x-xs, 8px);
    }
    :host([size='sm']) {
      --_preview-size: 32px;
      --_swatch-size: 24px;
      --_font-size: var(--form-font-size-sm, 12px);
      --_height: var(--form-height-sm, 32px);
      --_radius: var(--form-radius-sm, 6px);
      --_padding-x: var(--form-padding-x-sm, 8px);
    }
    :host([size='lg']) {
      --_preview-size: 48px;
      --_swatch-size: 32px;
      --_font-size: var(--form-font-size-lg, 16px);
      --_height: var(--form-height-lg, 48px);
      --_radius: var(--form-radius-lg, 10px);
      --_padding-x: var(--form-padding-x-lg, 16px);
    }

    .label {
      display: block;
      margin-bottom: var(--spacing-100, 4px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--color-text-primary, #171717);
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
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      cursor: pointer;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .preview:hover {
      border-color: var(--form-border-color-focus, #43608a);
    }
    .native:focus-visible + .preview {
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .hex-input {
      width: 100px;
      height: var(--_height);
      padding: 0 var(--_padding-x);
      font-family: var(--font-mono, monospace);
      font-size: var(--_font-size);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .hex-input:focus {
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .hex-input:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
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
      border-radius: var(--radius-050, 4px);
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
      border-color: var(--color-primary, #43608a);
      box-shadow: 0 0 0 1px var(--color-primary, #43608a);
    }
    .swatch:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
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
  `}}customElements.get("esa-color-picker")||customElements.define("esa-color-picker",i);
