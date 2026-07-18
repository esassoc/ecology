import { LitElement, html, css } from 'lit';

interface EsaOption {
  label: string;
  value: string;
  disabled?: boolean;
}

// Per-instance id seed so each group's aria-labelledby references are unique on
// a page with multiple radio groups.
let esaRadioGroupUid = 0;

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
    ariaLabel: { type: String, attribute: 'aria-label' },
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    value: { type: String },
  };

  declare options: EsaOption[];
  declare label: string;
  /**
   * Accessible name for the group when there is no visible `label` (e.g. the
   * group is described by surrounding context). A radiogroup MUST be named:
   * set `label` (visible, preferred) OR `aria-label` (invisible). Ignored when
   * `label` is present — the visible text names the group via aria-labelledby.
   */
  declare ariaLabel: string | null;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare orientation: 'vertical' | 'horizontal';
  declare value: string | null;

  private internals: ElementInternals;
  private uid: string;
  private warnedNoName = false;

  constructor() {
    super();
    this.options = [];
    this.label = '';
    this.ariaLabel = null;
    this.size = 'md';
    this.orientation = 'vertical';
    this.value = null;
    this.internals = this.attachInternals();
    this.uid = `esa-radio-${++esaRadioGroupUid}`;
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

    // A radiogroup must have an accessible name. Warn once (dev aid) if neither
    // a visible `label` nor an `aria-label` fallback is set.
    if (!this.warnedNoName && !this.label && !this.ariaLabel) {
      this.warnedNoName = true;
      console.warn(
        '<esa-radio-group> has no accessible name. Set `label` (visible) or ' +
          '`aria-label` (invisible) so screen readers announce the group.'
      );
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
    const groupLabelId = `${this.uid}-label`;
    return html`
      ${this.label
        ? html`<span class="group-label" id=${groupLabelId}>${this.label}</span>`
        : null}
      <div
        class="items"
        role="radiogroup"
        aria-labelledby=${this.label ? groupLabelId : undefined}
        aria-label=${!this.label && this.ariaLabel ? this.ariaLabel : undefined}
      >
        ${this.options.map((option, index) => {
          const selected = this.isSelected(option.value);
          const disabled = option.disabled ?? false;
          // Each radio is named by its own visible label via aria-labelledby, so
          // the accessible name matches the on-screen text (WCAG 2.5.3 / 4.1.2).
          // A wrapping <label> does NOT name a role=radio span on its own.
          const optionLabelId = `${this.uid}-option-${index}`;
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
                aria-labelledby=${optionLabelId}
                tabindex=${disabled ? -1 : 0}
              >
                <span class="dot"></span>
              </span>
              <span class="item-label" id=${optionLabelId}>${option.label}</span>
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
      --_radio-font-size: var(--form-font-size-md, 0.9375rem);
      display: block;
    }
    :host([size='xs']) {
      --_radio-size: 14px;
      --_radio-dot-size: 7px;
      --_radio-font-size: var(--form-font-size-xs, 0.8125rem);
    }
    :host([size='sm']) {
      --_radio-size: 16px;
      --_radio-dot-size: 8px;
      --_radio-font-size: var(--form-font-size-sm, 0.875rem);
    }
    :host([size='lg']) {
      --_radio-size: 24px;
      --_radio-dot-size: 12px;
      --_radio-font-size: var(--form-font-size-lg, 1.125rem);
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_radio-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--color-text-primary, #171717);
    }

    .items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-200, 8px);
    }
    :host([orientation='horizontal']) .items {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-400, 16px);
    }

    .item {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
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
      border-radius: 50%;
      background: var(--form-bg, #fff);
      box-shadow: inset 0 0 0 var(--form-border-width, 2px) var(--form-border-color, #d4d4d4);
      transition: box-shadow var(--transition-fast, 150ms ease);
    }
    .circle--selected {
      box-shadow: inset 0 0 0 var(--form-border-width, 2px) var(--color-primary, #43608a);
    }
    .circle:focus-visible {
      outline: none;
      box-shadow:
        inset 0 0 0 var(--form-border-width, 2px) var(--form-border-color-focus, #43608a),
        0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .dot {
      width: var(--_radio-dot-size);
      height: var(--_radio-dot-size);
      border-radius: 50%;
      background: transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .circle--selected .dot {
      background: var(--color-primary, #43608a);
    }

    .item-label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_radio-font-size);
      color: var(--color-text-primary, #171717);
      line-height: 1.4;
    }
  `;
}

if (!customElements.get('esa-radio-group')) {
  customElements.define('esa-radio-group', EsaRadioGroup);
}
