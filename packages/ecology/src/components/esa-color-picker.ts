import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/** The label is UI text. The hex field is the one value slot in the kit set in the
    MONO face — a hex code is tabular, so it reads code-* rather than body-*. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const CODE_TYPE  = { xs: 'code-sm', sm: 'code-sm', md: 'code-md', lg: 'code-lg' } as const;

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
    name: { type: String, reflect: true },
    showInput: { type: Boolean, attribute: 'show-input' },
    value: { type: String },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare swatches: string[];
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
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

  // A value set from SCRIPT (el.value = '#ff0000') has to reach the form too.
  // Only commit() used to call setFormValue, so a programmatically set colour
  // rendered red and submitted the default black.
  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value')) this.internals.setFormValue(this.value);
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
      ${this.label ? html`<label class="label typography-${LABEL_TYPE[this.size]}">${this.label}</label>` : null}
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
                class="hex-input typography-${CODE_TYPE[this.size]}"
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

  static styles = [
    typography,
    css`
    :host {
      display: block;
      --_preview-size: 40px; /* was --control-height-*, now standalone — see note */
      --_swatch-size: 28px;
      --_pad-y: var(--spacing-300, 0.75rem);
      --_radius: var(--form-radius-md, 8px);
      --_padding-x: var(--spacing-300, 0.75rem);
    }
    :host([size='xs']) {
      --_preview-size: 28px;
      --_swatch-size: 20px;
      --_pad-y: var(--spacing-200, 0.5rem);
      --_radius: var(--form-radius-xs, 4px);
      --_padding-x: var(--spacing-200, 0.5rem);
    }
    :host([size='sm']) {
      --_preview-size: 32px;
      --_swatch-size: 24px;
      --_pad-y: var(--spacing-250, 0.625rem);
      --_radius: var(--form-radius-sm, 6px);
      --_padding-x: var(--spacing-250, 0.625rem);
    }
    :host([size='lg']) {
      --_preview-size: 48px;
      --_swatch-size: 32px;
      --_pad-y: var(--spacing-400, 1rem);
      --_radius: var(--form-radius-lg, 10px);
      --_padding-x: var(--spacing-400, 1rem);
    }

    .label {
      display: block;
      margin-bottom: var(--spacing-100, 4px);

      color: var(--color-content-primary, #171717);
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
      /* A bare input with no flex centring — at padding:0 and no height token this
         would collapse straight to its line box. */
      padding: var(--_pad-y) var(--_padding-x);
      line-height: var(--line-height-none, 1);
      color: var(--form-text-color, #171717);
      background: var(--color-background-field, transparent);
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
      border-color: var(--color-background-brand, #43608a);
      box-shadow: 0 0 0 1px var(--color-background-brand, #43608a);
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
  `,
  ];
}

if (!customElements.get('esa-color-picker')) {
  customElements.define('esa-color-picker', EsaColorPicker);
}
