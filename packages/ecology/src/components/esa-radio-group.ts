import { LitElement, html, css } from 'lit';

interface EsaOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * esa-radio-group — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-radio-group (a ControlValueAccessor whose
 * value is the single selected option value, with vertical/horizontal orientation,
 * per-option disabled state, and a custom circle + dot). No icon needed — the dot is
 * pure CSS.
 *
 * `options` accepts an array directly (property) or a JSON string (attribute).
 * Form participation: ElementInternals.setFormValue(selectedValue) + a
 * bubbling/composed 'change' CustomEvent. Keyboard: Space/Enter select. Decorator-free.
 */
export class EsaRadioGroup extends LitElement {
  static formAssociated = true;

  static properties = {
    options: { type: Array },
    label: { type: String },
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    value: { type: String },
  };

  declare options: EsaOption[];
  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare orientation: 'vertical' | 'horizontal';
  declare value: string | null;

  private internals: ElementInternals;

  constructor() {
    super();
    this.options = [];
    this.label = '';
    this.size = 'md';
    this.orientation = 'vertical';
    this.value = null;
    this.internals = this.attachInternals();
  }

  // Allow the `options` attribute to be a JSON string.
  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('options') && typeof this.options === 'string') {
      try {
        this.options = JSON.parse(this.options as unknown as string);
      } catch {
        this.options = [];
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(this.value);
  }

  private isSelected(value: string): boolean {
    return this.value === value;
  }

  private selectOption = (option: EsaOption): void => {
    if (option.disabled) return;
    this.value = option.value;
    this.internals.setFormValue(this.value);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent, option: EsaOption): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.selectOption(option);
    }
  };

  render() {
    return html`
      ${this.label ? html`<span class="group-label">${this.label}</span>` : null}
      <div class="items" role="radiogroup" aria-label=${this.label}>
        ${this.options.map((option) => {
          const selected = this.isSelected(option.value);
          const disabled = option.disabled ?? false;
          return html`
            <label
              class="item ${disabled ? 'item--disabled' : ''}"
              @keydown=${(e: KeyboardEvent) => this.onKeydown(e, option)}
              @click=${() => this.selectOption(option)}
            >
              <span
                class="circle ${selected ? 'circle--selected' : ''}"
                role="radio"
                aria-checked=${String(selected)}
                aria-disabled=${String(disabled)}
                tabindex=${disabled ? -1 : 0}
              >
                <span class="dot"></span>
              </span>
              <span class="item-label">${option.label}</span>
            </label>
          `;
        })}
      </div>
    `;
  }

  static styles = css`
    :host {
      --_radio-size: 20px;
      --_radio-dot-size: 10px;
      --_radio-font-size: var(--form-font-size-md);
      display: block;
    }
    :host([size='xs']) {
      --_radio-size: 14px;
      --_radio-dot-size: 7px;
      --_radio-font-size: var(--form-font-size-xs);
    }
    :host([size='sm']) {
      --_radio-size: 16px;
      --_radio-dot-size: 8px;
      --_radio-font-size: var(--form-font-size-sm);
    }
    :host([size='lg']) {
      --_radio-size: 24px;
      --_radio-dot-size: 12px;
      --_radio-font-size: var(--form-font-size-lg);
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200);
      font-family: var(--font-sans);
      font-size: var(--_radio-font-size);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-200);
    }
    :host([orientation='horizontal']) .items {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-400);
    }

    .item {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200);
      cursor: pointer;
      user-select: none;
    }
    .item--disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_radio-size);
      height: var(--_radio-size);
      flex-shrink: 0;
      border: var(--form-border-width) solid var(--form-border-color);
      border-radius: 50%;
      background: var(--form-bg);
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }
    .circle--selected {
      border-color: var(--color-primary);
    }
    .circle:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus);
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
    }

    .dot {
      width: var(--_radio-dot-size);
      height: var(--_radio-dot-size);
      border-radius: 50%;
      background: transparent;
      transition: background var(--transition-fast);
    }
    .circle--selected .dot {
      background: var(--color-primary);
    }

    .item-label {
      font-family: var(--font-sans);
      font-size: var(--_radio-font-size);
      color: var(--color-text-primary);
      line-height: 1.4;
    }
  `;
}

if (!customElements.get('esa-radio-group')) {
  customElements.define('esa-radio-group', EsaRadioGroup);
}
