import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';

/** Both slots are UI text at medium: the field label, and the numeric readout —
    a readout is chrome, not something the user typed, so it stays label-*. */
// The readout is microcopy — a tabular number, min-width 3ch, in a flex row. The LABEL
// above it flows, so it keeps its own map.
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const VALUE_TYPE = { xs: 'microcopy-2xs', sm: 'microcopy-xs', md: 'microcopy-md', lg: 'microcopy-lg' } as const;

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
    name: { type: String, reflect: true },
    value: { type: Number },
  };

  declare min: number;
  declare max: number;
  declare step: number;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare label: string;
  declare showValue: boolean;
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
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

  // A value set from SCRIPT (el.value = 42) has to reach the form too. Only the
  // input handler used to call setFormValue, so a programmatically positioned
  // thumb rendered at 42 and submitted the default.
  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value')) this.internals.setFormValue(String(this.value));
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
      ${this.label
        ? html`<label for="input" class="label typography-${LABEL_TYPE[this.size]}"
            >${this.label}</label
          >`
        : null}
      <div class="row">
        <div class="track-wrapper">
          <input
            id="input"
            type="range"
            class="input"
            min=${this.min}
            max=${this.max}
            step=${this.step}
            .value=${String(this.value)}
            ?disabled=${this.disabled}
            style="--_fill-percent: ${this.fillPercent}%"
            aria-label=${this.label ? nothing : 'Range slider'}
            aria-valuemin=${this.min}
            aria-valuemax=${this.max}
            aria-valuenow=${this.value}
            @input=${this.onInput}
          />
        </div>
        ${this.showValue ? html`<span class="value typography-${VALUE_TYPE[this.size]}">${this.value}</span>` : null}
      </div>
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host {
      display: block;
      --_track-height: 6px;
      --_thumb-size: 20px;
    }
    :host([size='xs']) {
      --_track-height: 3px;
      --_thumb-size: 14px;
    }
    :host([size='sm']) {
      --_track-height: 4px;
      --_thumb-size: 16px;
    }
    :host([size='lg']) {
      --_track-height: 8px;
      --_thumb-size: 24px;
    }

    .label {
      display: block;
      margin-bottom: var(--spacing-100, 4px);
      color: var(--color-content-default, #202020);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 12px);
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
        var(--color-background-brand, #46a758) 0%,
        var(--color-background-brand, #46a758) var(--_fill-percent, 0%),
        var(--color-border-default, #cecece) var(--_fill-percent, 0%),
        var(--color-border-default, #cecece) 100%
      );
    }
    .input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      margin-top: calc((var(--_track-height) - var(--_thumb-size)) / 2);
      border: 2px solid var(--color-background-brand, #46a758);
      border-radius: 50%;
      background: var(--color-background-elevation-raised, #fcfcfc);
      box-shadow: var(--elevation-1, 0 1px 3px rgba(0, 0, 0, 0.12));
      transition:
        box-shadow var(--transition-fast, 150ms ease),
        transform var(--transition-fast, 150ms ease);
    }
    .input::-moz-range-track {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: var(--color-border-default, #cecece);
    }
    .input::-moz-range-progress {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: var(--color-background-brand, #46a758);
    }
    .input::-moz-range-thumb {
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      border: 2px solid var(--color-background-brand, #46a758);
      border-radius: 50%;
      background: var(--color-background-elevation-raised, #fcfcfc);
      box-shadow: var(--elevation-1, 0 1px 3px rgba(0, 0, 0, 0.12));
    }
    .input:focus-visible {
      outline: none;
    }
    .input:focus-visible::-webkit-slider-thumb {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .input:focus-visible::-moz-range-thumb {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
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
      color: var(--color-content-default, #202020);
      font-variant-numeric: tabular-nums;
    }

    /* FORCED COLORS. This is the kit's ONLY gradient, and it is the value fill —
       non-url() background-image is forced to 'none', so the slider would read as
       empty at every position. The thumb survives on its own (real 2px border).

       The track opts OUT and re-states the fill in system colours, rather than
       simply opting out and keeping the brand green. A plain opt-out would keep
       author colours the user has explicitly asked not to see, and green-on-black
       is exactly the contrast a theme may have been chosen to avoid. Highlight
       and Canvas are the user's own values, so the fill stays legible in a theme
       we cannot predict.

       Gecko splits the same job across two pseudo-elements (-moz-range-track is
       the trough, -moz-range-progress the fill), so it needs no gradient at all.

       The 'forced-color-adjust: none' on a UA pseudo-element is the part of this
       file to re-check in a real contrast theme. If it does not take, the fill is
       lost but the component still reports its value: showValue defaults to true
       and .value is real text. That fallback is why this is safe to ship. */
    @media (forced-colors: active) {
      .input::-webkit-slider-runnable-track {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
        background: linear-gradient(
          to right,
          Highlight 0%,
          Highlight var(--_fill-percent, 0%),
          Canvas var(--_fill-percent, 0%),
          Canvas 100%
        );
      }
      .input::-moz-range-track {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
        background: Canvas;
      }
      .input::-moz-range-progress {
        forced-color-adjust: none;
        background: Highlight;
      }
      .input:disabled::-webkit-slider-runnable-track,
      .input:disabled::-moz-range-track { border-color: GrayText; }
    }
  `,
  ];
}

if (!customElements.get('esa-range-slider')) {
  customElements.define('esa-range-slider', EsaRangeSlider);
}
