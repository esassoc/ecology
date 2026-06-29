import { LitElement, html, css } from 'lit';

/**
 * esa-range-slider — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-range-slider:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size/disabled classes       → reflected attributes + :host() selectors
 *   - fillPercent gradient + value chip, same arithmetic
 *
 * Native <input type=range> keeps native keyboard support (Arrow/Home/End/PageUp/Down).
 */
export class EsaRangeSlider extends LitElement {
  static formAssociated = true;

  static properties = {
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    size: { type: String, reflect: true },
    label: { type: String },
    showValue: { type: Boolean, attribute: 'show-value' },
    disabled: { type: Boolean, reflect: true },
    value: { type: Number },
  };

  declare min: number;
  declare max: number;
  declare step: number;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare label: string;
  declare showValue: boolean;
  declare disabled: boolean;
  declare value: number;

  private internals: ElementInternals;

  constructor() {
    super();
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.size = 'md';
    this.label = '';
    this.showValue = true;
    this.disabled = false;
    this.value = 0;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(String(this.value));
  }

  private get fillPercent(): number {
    if (this.max === this.min) return 0;
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }

  private onInput = (event: Event): void => {
    const val = Number((event.target as HTMLInputElement).value);
    this.value = val;
    this.internals.setFormValue(String(val));
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: val }, bubbles: true, composed: true })
    );
  };

  render() {
    return html`
      ${this.label ? html`<label class="label">${this.label}</label>` : null}
      <div class="row">
        <div class="track-wrapper">
          <input
            type="range"
            class="input"
            min=${this.min}
            max=${this.max}
            step=${this.step}
            .value=${String(this.value)}
            ?disabled=${this.disabled}
            style="--fill-percent: ${this.fillPercent}%"
            aria-label=${this.label || 'Range slider'}
            aria-valuemin=${this.min}
            aria-valuemax=${this.max}
            aria-valuenow=${this.value}
            @input=${this.onInput}
          />
        </div>
        ${this.showValue ? html`<span class="value">${this.value}</span>` : null}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --_track-height: 6px;
      --_thumb-size: 20px;
      --_font-size: var(--form-font-size-md);
    }
    :host([size='xs']) {
      --_track-height: 3px;
      --_thumb-size: 14px;
      --_font-size: var(--form-font-size-xs);
    }
    :host([size='sm']) {
      --_track-height: 4px;
      --_thumb-size: 16px;
      --_font-size: var(--form-font-size-sm);
    }
    :host([size='lg']) {
      --_track-height: 8px;
      --_thumb-size: 24px;
      --_font-size: var(--form-font-size-lg);
    }

    .label {
      display: block;
      margin-bottom: var(--spacing-100);
      font-family: var(--font-sans);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--spacing-300);
    }
    .track-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
    }

    .input {
      width: 100%;
      height: var(--_thumb-size);
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      cursor: pointer;
    }
    .input::-webkit-slider-runnable-track {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: linear-gradient(
        to right,
        var(--color-primary) 0%,
        var(--color-primary) var(--fill-percent),
        var(--color-border) var(--fill-percent),
        var(--color-border) 100%
      );
    }
    .input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      margin-top: calc((var(--_track-height) - var(--_thumb-size)) / 2);
      border: 2px solid var(--color-primary);
      border-radius: 50%;
      background: var(--color-surface);
      box-shadow: var(--shadow-50);
      transition:
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }
    .input::-moz-range-track {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: var(--color-border);
    }
    .input::-moz-range-progress {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: var(--color-primary);
    }
    .input::-moz-range-thumb {
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      border: 2px solid var(--color-primary);
      border-radius: 50%;
      background: var(--color-surface);
      box-shadow: var(--shadow-50);
    }
    .input:focus-visible {
      outline: none;
    }
    .input:focus-visible::-webkit-slider-thumb {
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .input:focus-visible::-moz-range-thumb {
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .input:hover:not(:disabled)::-webkit-slider-thumb {
      transform: scale(1.1);
    }
    .input:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .value {
      min-width: 3ch;
      text-align: right;
      font-family: var(--font-sans);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }
  `;
}

if (!customElements.get('esa-range-slider')) {
  customElements.define('esa-range-slider', EsaRangeSlider);
}
