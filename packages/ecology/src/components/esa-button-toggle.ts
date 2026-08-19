import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/** Group label and segment text are both UI text (medium). The SELECTED segment
    steps up to semibold, which is what the -strong weight axis is for — it is not
    a size change, so the rung stays the same. */
const LABEL_TYPE  = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
// The OPTIONS are microcopy — nowrap text in a padding-sized box. The group label
// above them is not: it flows, so it keeps LABEL_TYPE. Selected steps to -strong.
const OPTION_TYPE = { xs: 'microcopy-2xs', sm: 'microcopy-xs', md: 'microcopy-md', lg: 'microcopy-lg' } as const;
const OPTION_SELECTED_TYPE = { xs: 'microcopy-2xs-strong', sm: 'microcopy-xs-strong', md: 'microcopy-md-strong', lg: 'microcopy-lg-strong' } as const;
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
 *
 * There is deliberately NO `hint` prop. The options are their own labels, so a
 * hint here restates the control — the audit of 2026-08-16 found its only fill
 * anywhere was "Pick a layout" above a row already reading Grid / List / Map.
 * A genuinely non-obvious interaction belongs on esa-input-tag's `hint`.
 */
export class EsaButtonToggle extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    options: { type: Array },
    value: { type: String },
    size: { type: String, reflect: true },
    name: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
  };

  declare label: string;
  /** Helper text below the group. */
  declare helpText: string;
  /** Validation message below the group; replaces `helpText` and reddens the track. */
  declare errorText: string;
  /** DEPRECATED — renamed to `helpText`. Still honoured; warns at runtime. */
  declare options: EsaToggleOption[];
  declare value: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare disabled: boolean;
  declare required: boolean;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.helpText = '';
    this.errorText = '';
    this.options = [];
    this.value = '';
    this.size = 'md';
    this.disabled = false;
    this.required = false;
    this.internals = this.attachInternals();
  }

  private get resolvedHelpText(): string {
    return this.helpText;
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

  updated(): void {
    this.syncValidity();
  }

  /**
   * Constraint validation. `required` has to actually BLOCK submission, not just
   * draw an asterisk and set aria-required — a required field the form happily
   * submits empty is a promise the component does not keep. Anchored to the first
   * segment so the browser can focus it and place its bubble.
   */
  private syncValidity(): void {
    if (!this.required || this.value) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.option') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Select ${this.label}.` : 'Select an option.',
      anchor,
    );
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
    const hasError = !!this.errorText;
    const help = this.resolvedHelpText;
    // Error replaces help — same precedence as esa-select / esa-text-field, so
    // only one of the two ever occupies the slot below the control.
    const describedBy = hasError ? 'error' : help ? 'help' : null;
    return html`
      ${hasLabel
        ? html`<span class="label typography-${LABEL_TYPE[this.size]}" id="label">
            ${this.label}${this.required ? html`<span class="required" aria-hidden="true">*</span>` : null}
          </span>`
        : null}
      <div
        class="group ${hasError ? 'group--error' : ''}"
        role="radiogroup"
        aria-labelledby=${hasLabel ? 'label' : null}
        aria-required=${this.required ? 'true' : null}
        aria-invalid=${hasError ? 'true' : null}
        aria-describedby=${describedBy}
        @keydown=${this.onKeydown}
      >
        ${this.options.map((opt, i) => {
          const selected = i === this.selectedIndex;
          return html`<button
            type="button"
            role="radio"
            class="option ${selected ? 'option--selected' : ''} typography-${selected ? OPTION_SELECTED_TYPE[this.size] : OPTION_TYPE[this.size]}"
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
      ${hasError
        ? html`<span class="error typography-body-sm" id="error">${this.errorText}</span>`
        : help
          ? html`<span class="help typography-body-sm" id="help">${help}</span>`
          : null}
    `;
  }

  static styles = [
    typography,
    css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
      --_pad-y: var(--spacing-300, 0.75rem);
      --_padding-x: var(--spacing-300, 0.75rem);
      --_radius: var(--form-radius-md, 8px);
      --_border-width: var(--form-border-width, 1px);
      --_border-color: var(--form-border-color, #d4d4d4);
      --_icon-size: 18px;
    }
    :host([size='xs']) {
      --_pad-y: var(--spacing-200, 0.5rem);
      --_padding-x: var(--spacing-200, 0.5rem);
      --_radius: var(--form-radius-xs, 4px);
      --_icon-size: 14px;
    }
    :host([size='sm']) {
      --_pad-y: var(--spacing-250, 0.625rem);
      --_padding-x: var(--spacing-250, 0.625rem);
      --_radius: var(--form-radius-sm, 6px);
      --_icon-size: 16px;
    }
    :host([size='lg']) {
      --_pad-y: var(--spacing-400, 1rem);
      --_padding-x: var(--spacing-400, 1rem);
      --_radius: var(--form-radius-lg, 10px);
      --_icon-size: 20px;
    }

    .label {
      color: var(--form-label-color, #171717);
    }
    .required {
      color: var(--color-content-utility-danger, #ce2c31);
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
      background: var(--color-background-elevation-sunken, #efefef);
      border: var(--_border-width) solid var(--_border-color);
      border-radius: var(--_radius);
    }
    .group--error {
      --_border-color: var(--form-error-border-color, #ef4444);
    }

    .option {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-150, 6px);
      /* Was calc(height - 4px) to compensate for the track's 2px padding. With no
         height token the segment is its own text plus padding, and the track wraps
         it — the compensation has nothing left to compensate for. */
      padding: var(--_pad-y) var(--_padding-x);
      color: var(--color-content-default-secondary, #525252);
      background: transparent;
      border: 0;
      border-radius: calc(var(--_radius) - 2px);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }

    .option__icon {
      width: var(--_icon-size);
      height: var(--_icon-size);
      flex-shrink: 0;
    }

    .option:hover:not(:disabled):not(.option--selected) {
      color: var(--color-content-default, #171717);
      background: var(--color-background-overlay-hover, rgba(0, 0, 0, 0.04));
    }

    .option:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
      position: relative;
      z-index: 1;
    }

    .option--selected {
      background: var(--color-background-elevation-raised, #fcfcfc);
      color: var(--color-content-brand, #2a7e3b);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .option:disabled {
      cursor: not-allowed;
      color: var(--color-content-disabled, #a3a3a3);
      background: transparent;
    }
    .option--selected:disabled {
      background: var(--color-background-elevation-raised, #fcfcfc);
      color: var(--color-content-disabled, #a3a3a3);
    }

    .help {
      color: var(--form-help-color, #737373);
    }
    .error {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
  `,
  ];
}

if (!customElements.get('esa-button-toggle')) {
  customElements.define('esa-button-toggle', EsaButtonToggle);
}
