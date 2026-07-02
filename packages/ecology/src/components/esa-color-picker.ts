import { LitElement, html, css } from 'lit';

/**
 * esa-color-picker — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-color-picker:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size/disabled classes       → reflected attributes + :host() selectors
 *   - native <input type=color> + hex input + swatch grid, same hex validation
 *
 * `swatches` accepts either a string[] property or a JSON-encoded `swatches` attribute.
 */
export class EsaColorPicker extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    swatches: { type: Array },
    disabled: { type: Boolean, reflect: true },
    showInput: { type: Boolean, attribute: 'show-input' },
    value: { type: String },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare swatches: string[];
  declare disabled: boolean;
  declare showInput: boolean;
  declare value: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.size = 'md';
    this.swatches = [];
    this.disabled = false;
    this.showInput = true;
    this.value = '#000000';
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(this.value);
  }

  private commit(val: string): void {
    this.value = val;
    this.internals.setFormValue(val);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: val }, bubbles: true, composed: true })
    );
  }

  private onColorInput = (event: Event): void => {
    if (this.disabled) return;
    this.commit((event.target as HTMLInputElement).value);
  };

  private onHexInput = (event: Event): void => {
    if (this.disabled) return;
    let val = (event.target as HTMLInputElement).value.trim();
    if (val && !val.startsWith('#')) val = '#' + val;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
      this.commit(val);
    }
  };

  private selectSwatch(color: string): void {
    if (this.disabled) return;
    this.commit(color);
  }

  private isSelectedSwatch(color: string): boolean {
    return this.value.toLowerCase() === color.toLowerCase();
  }

  render() {
    return html`
      ${this.label ? html`<label class="label">${this.label}</label>` : null}
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
          ${this.showInput
            ? html`<input
                type="text"
                class="hex-input"
                .value=${this.value}
                ?disabled=${this.disabled}
                @change=${this.onHexInput}
                placeholder="#000000"
                maxlength="7"
                spellcheck="false"
              />`
            : null}
        </div>

        ${this.swatches.length > 0
          ? html`<div class="swatches" role="listbox" aria-label="Color swatches">
              ${this.swatches.map(
                (color) => html`<button
                  type="button"
                  class="swatch ${this.isSelectedSwatch(color) ? 'swatch--selected' : ''}"
                  style="background-color: ${color}"
                  ?disabled=${this.disabled}
                  aria-label=${'Select color ' + color}
                  aria-selected=${this.isSelectedSwatch(color)}
                  role="option"
                  @click=${() => this.selectSwatch(color)}
                ></button>`
              )}
            </div>`
          : null}
      </div>
    `;
  }

  static styles = css`
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
  `;
}

if (!customElements.get('esa-color-picker')) {
  customElements.define('esa-color-picker', EsaColorPicker);
}
