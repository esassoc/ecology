import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { boolish } from '../boolish.js';

/** The label is UI text. The hex field is the one value slot in the kit set in the
    MONO face — a hex code is tabular, so it reads code-* rather than body-*. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
// The hex field is microcopy in the mono face — a single-line <input> sized by padding.
const CODE_TYPE  = { xs: 'microcopy-code-sm', sm: 'microcopy-code-sm', md: 'microcopy-code-md', lg: 'microcopy-code-lg' } as const;

/** A swatch is a bare hex, or a hex with the name of the thing it stands for. */
export type ColorSwatch = string | { value: string; label?: string };

const swatchValue = (s: ColorSwatch): string => (typeof s === 'string' ? s : s.value);
const swatchLabel = (s: ColorSwatch): string | undefined =>
  typeof s === 'string' ? undefined : s.label;

/**
 * esa-color-picker — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-color-picker:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size/disabled classes       → reflected attributes + :host() selectors
 *   - native <input type=color> + hex input + swatch grid, same hex validation
 *
 * `swatches` accepts either a property or a JSON-encoded `swatches` attribute, and each
 * entry is a hex string OR an object carrying a name: {"value": "#12a594", "label": "Teal"}.
 * A grid of unnamed squares is a poor name for anyone not looking at it — a swatch that
 * stands for something the system already has ("Teal", "Brand") should say so, and then
 * the accessible name is the word rather than the hex.
 */
export class EsaColorPicker extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    swatches: { type: Array },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    showInput: { type: Boolean, attribute: 'show-input', converter: boolish },
    value: { type: String },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare swatches: ColorSwatch[];
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
    // Both inner controls need their OWN name. The visible span names the group,
    // and a group name does not name the things inside it — measured 2026-08-16
    // against Chrome's accessibility tree, the swatch came back role=ColorWell
    // name="" and the hex field fell through to its placeholder, name="#000000".
    //
    // The label text is repeated into each name rather than left to the group.
    // It is slightly verbose next to the group name, and it is what makes these
    // pass SC 2.5.3 Label in Name: a speech-control user says what they SEE, and
    // what they see is "Brand color".
    const swatchName = this.label ? `${this.label} color swatch` : 'Color swatch';
    const hexName = this.label ? `${this.label} hex value` : 'Hex value';
    return html`
      ${this.label
        ? html`<span id="label" class="label typography-${LABEL_TYPE[this.size]}"
            >${this.label}</span
          >`
        : null}
      <div
        class="controls"
        role="group"
        aria-labelledby=${this.label ? 'label' : nothing}
        aria-label=${this.label ? nothing : 'Color picker'}
      >
        <div class="input-row">
          <label class="swatch-input">
            <input
              type="color"
              class="native"
              aria-label=${swatchName}
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
                aria-label=${hexName}
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
              ${this.swatches.map((swatch) => {
                const color = swatchValue(swatch);
                const name = swatchLabel(swatch);
                return html`<button
                  type="button"
                  class="swatch ${this.isSelectedSwatch(color) ? 'swatch--selected' : ''}"
                  style="background-color: ${color}"
                  ?disabled=${this.disabled}
                  title=${name ? name + ' ' + color : color}
                  aria-label=${name ? 'Select color ' + name + ' ' + color : 'Select color ' + color}
                  aria-selected=${this.isSelectedSwatch(color)}
                  role="option"
                  @click=${() => this.selectSwatch(color)}
                ></button>`;
              })}
            </div>`
          : null}
      </div>
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
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
      border-color: var(--form-border-color-focus, #3e9b4f);
    }
    .native:focus-visible + .preview {
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
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
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
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

    /* FORCED COLORS. The one place in this kit where opting OUT is the correct
       answer: the colour IS the content. Both .preview and .swatch carry an
       inline 'background-color', so force-adjusting them turns the picker into a
       row of identical empty squares and nothing can be chosen.

       The opt-out repairs selection as a side effect. The base .swatch is
       'border: 2px solid transparent', and forced colors makes transparent
       borders VISIBLE — so without this, every swatch would gain the same 2px
       border that .swatch--selected uses to mark itself, and selection would be
       lost twice over. Under the opt-out the transparent border stays
       transparent and the selected swatch keeps both its border and its ring.

       An outline (not a border) frames each swatch so the opted-out colours still
       have an edge against the user's Canvas — outline sits outside the box, so
       it does not disturb the 2px selection border underneath it. */
    @media (forced-colors: active) {
      .preview,
      .swatch {
        forced-color-adjust: none;
      }
      .swatch { outline: 1px solid CanvasText; }
      .swatch--selected { outline: 2px solid Highlight; }
      .preview { outline: 1px solid CanvasText; }
    }
  `,
  ];
}

if (!customElements.get('esa-color-picker')) {
  customElements.define('esa-color-picker', EsaColorPicker);
}
