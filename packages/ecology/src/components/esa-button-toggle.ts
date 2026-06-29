import { LitElement, html, css } from 'lit';
// unsafeSVG (not unsafeHTML): parses the markup in the SVG namespace so injected
// <path>/<rect> children render. unsafeHTML would create them as XHTML elements.
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

interface EsaToggleOption {
  label: string;
  value: string;
  /**
   * Optional leading icon: the inner Lucide SVG markup (the `<path>`/`<rect>`…
   * children, no `<svg>` wrapper) — the same `paths` convention as esa-icon.
   * Inherits `currentColor`, so it flips to the inverse color when the segment
   * is selected. Renders before the label; either label or icon may be omitted.
   */
  icon?: string;
  /**
   * Accessible name for the segment. Required for icon-only segments (no
   * `label`); when omitted the visible `label` is the accessible name.
   */
  ariaLabel?: string;
}

/**
 * esa-button-toggle — form-associated Lit Web Component.
 *
 * A segmented single-select: one-of-N choices rendered as a row of connected
 * buttons. The form value holds the selected option's `value` (a string),
 * never the whole option object — same value contract as esa-select.
 *
 * Faithful translation of the Beacon ui-button-toggle:
 *   - signal inputs                    → Lit reactive properties
 *   - UiFormControlBase / CVA          → form-associated element + ElementInternals
 *   - host size data-attr              → reflected `size` attribute + :host() selectors
 *   - role=radiogroup + roving tabindex → same WAI-ARIA radiogroup pattern
 *
 * Connected borders square the inner corners; the selected segment fills with
 * the primary color. Keyboard: Arrow keys move selection, Home/End jump to
 * ends, Enter/Space select the focused segment. Emits a composed `change`.
 *
 * Decorator-free on purpose: avoids per-consumer tsconfig decorator flags.
 * Set `options` as a property (it is an array, not an attribute).
 */
export class EsaButtonToggle extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    hint: { type: String },
    options: { type: Array },
    value: { type: String },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
  };

  declare label: string;
  declare hint: string;
  declare options: EsaToggleOption[];
  declare value: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare required: boolean;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.hint = '';
    this.options = [];
    this.value = '';
    this.size = 'md';
    this.disabled = false;
    this.required = false;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value') || changed.has('options')) {
      this.syncFormValue();
    }
  }

  private get selectedIndex(): number {
    return this.options.findIndex((o) => o.value === this.value);
  }

  /** Roving-tabindex anchor: the selected option, or the first when none is selected. */
  private get focusIndex(): number {
    const selected = this.selectedIndex;
    return selected >= 0 ? selected : 0;
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.value || null);
  }

  private select(option: EsaToggleOption): void {
    if (this.disabled || option.value === this.value) return;
    this.value = option.value;
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private focusButton(index: number): void {
    const buttons = this.renderRoot.querySelectorAll<HTMLButtonElement>('.option');
    buttons[index]?.focus();
  }

  private onKeydown = (event: KeyboardEvent): void => {
    if (this.disabled) return;
    const options = this.options;
    if (options.length === 0) return;

    const current = this.selectedIndex >= 0 ? this.selectedIndex : 0;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.select(options[current]);
        return;
      default:
        return;
    }
    event.preventDefault();
    this.select(options[next]);
    this.focusButton(next);
  };

  render() {
    const hasLabel = !!this.label;
    return html`
      ${hasLabel
        ? html`<span class="label" id="label">
            ${this.label}${this.required ? html`<span class="required" aria-hidden="true">*</span>` : null}
          </span>`
        : null}
      <div
        class="group"
        role="radiogroup"
        aria-labelledby=${hasLabel ? 'label' : null}
        aria-required=${this.required ? 'true' : null}
        aria-describedby=${this.hint ? 'hint' : null}
        @keydown=${this.onKeydown}
      >
        ${this.options.map((opt, i) => {
          const selected = i === this.selectedIndex;
          return html`<button
            type="button"
            role="radio"
            class="option ${selected ? 'option--selected' : ''}"
            aria-checked=${selected}
            aria-label=${opt.ariaLabel ?? (opt.label ? null : opt.value)}
            tabindex=${i === this.focusIndex ? 0 : -1}
            ?disabled=${this.disabled}
            @click=${() => this.select(opt)}
          >
            ${opt.icon
              ? html`<svg
                  class="option__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  ${unsafeSVG(opt.icon)}
                </svg>`
              : null}
            ${opt.label ? html`<span class="option__label">${opt.label}</span>` : null}
          </button>`;
        })}
      </div>
      ${this.hint ? html`<span class="hint" id="hint">${this.hint}</span>` : null}
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100);
      --_height: var(--form-height-md);
      --_padding-x: var(--form-padding-x-md);
      --_font-size: var(--form-font-size-md);
      --_radius: var(--form-radius-md);
      --_border-width: var(--form-border-width);
      --_border-color: var(--form-border-color);
      --_icon-size: 18px;
    }
    :host([size='xs']) {
      --_height: var(--form-height-xs);
      --_padding-x: var(--form-padding-x-xs);
      --_font-size: var(--form-font-size-xs);
      --_radius: var(--form-radius-xs);
      --_icon-size: 14px;
    }
    :host([size='sm']) {
      --_height: var(--form-height-sm);
      --_padding-x: var(--form-padding-x-sm);
      --_font-size: var(--form-font-size-sm);
      --_radius: var(--form-radius-sm);
      --_icon-size: 16px;
    }
    :host([size='lg']) {
      --_height: var(--form-height-lg);
      --_padding-x: var(--form-padding-x-lg);
      --_font-size: var(--form-font-size-lg);
      --_radius: var(--form-radius-lg);
      --_icon-size: 20px;
    }

    .label {
      font-family: var(--font-sans);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium);
      color: var(--form-label-color);
    }
    .required {
      color: var(--color-danger);
      margin-left: 2px;
    }

    /* Segmented-pill track: a sunken rail with a small inset; the selected
       segment floats as a raised white chip. (Replaces the older connected-button
       model — softer, and what the Beacon tracker mockups settled on.) */
    .group {
      display: inline-flex;
      width: fit-content;
      max-width: 100%;
      gap: 2px;
      padding: 2px;
      background: var(--color-surface-sunken);
      border: var(--_border-width) solid var(--_border-color);
      border-radius: var(--_radius);
    }

    .option {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-150);
      height: calc(var(--_height) - 4px);
      padding: 0 var(--_padding-x);
      font-family: var(--font-sans);
      font-size: var(--_font-size);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      background: transparent;
      border: 0;
      border-radius: calc(var(--_radius) - 2px);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast),
        color var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .option__icon {
      width: var(--_icon-size);
      height: var(--_icon-size);
      flex-shrink: 0;
    }

    .option:hover:not(:disabled):not(.option--selected) {
      color: var(--color-text-primary);
      background: var(--color-hover-overlay);
    }

    .option:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
      position: relative;
      z-index: 1;
    }

    .option--selected {
      background: var(--form-bg);
      color: var(--color-primary);
      font-weight: var(--font-weight-semibold);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .option:disabled {
      cursor: not-allowed;
      color: var(--color-disabled-text);
      background: transparent;
    }
    .option--selected:disabled {
      background: var(--form-bg);
      color: var(--color-disabled-text);
    }

    .hint {
      font-size: var(--type-size-150);
      color: var(--form-help-color);
    }
  `;
}

if (!customElements.get('esa-button-toggle')) {
  customElements.define('esa-button-toggle', EsaButtonToggle);
}
