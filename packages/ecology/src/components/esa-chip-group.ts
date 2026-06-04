import { LitElement, html, css } from 'lit';

/** Active-state palette for a chip. Maps to Ecology semantic tokens inside the primitive. */
export type EsaChipTone = 'neutral' | 'neutral-strong' | 'teal' | 'amber';

/** One selectable chip in an esa-chip-group. */
export interface EsaChipOption {
  value: string;
  label: string;
  /** Active-state palette; defaults to `neutral`. */
  tone?: EsaChipTone;
}

/**
 * esa-chip-group — form-associated Lit Web Component.
 *
 * Single-select chip radiogroup — a horizontal row of pill toggles where exactly one
 * is active. Faithful translation of Beacon's Angular ui-chip-group:
 *   - Angular signal inputs (options/value)  → Lit reactive properties
 *   - radiogroup host + roving tabindex       → role="radiogroup" + per-chip tabindex
 *   - UiChipTone (neutral/neutral-strong/teal/amber) → EsaChipTone, mapped to Ecology
 *     semantic tokens (surface-sunken/border, darker neutral, teal/primary, warning/amber)
 *   - valueChange output                       → composed/bubbling 'change' CustomEvent
 *
 * Form participation: the selected value is mirrored to the host form via
 * ElementInternals.setFormValue. Keyboard: Arrow keys move (with wrap-around),
 * Home/End jump to ends, Enter/Space select. `options` accepts an array directly
 * (property) or a JSON string (attribute). Decorator-free on purpose.
 */
export class EsaChipGroup extends LitElement {
  static formAssociated = true;

  static properties = {
    options: { type: Array },
    value: { type: String, reflect: true },
    size: { type: String, reflect: true },
    name: { type: String },
    label: { type: String },
  };

  declare options: EsaChipOption[];
  declare value: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare name: string;
  declare label: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.size = 'md';
    this.name = '';
    this.label = '';
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
    this.internals.role = 'radiogroup';
    if (this.label) this.internals.ariaLabel = this.label;
    this.syncFormValue();
  }

  updated(): void {
    if (this.label) this.internals.ariaLabel = this.label;
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.value || null);
  }

  private select(option: EsaChipOption): void {
    if (option.value === this.value) return;
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

  /**
   * Roving-tabindex keyboard navigation for the radiogroup: arrow keys move selection
   * (with wrap-around), Home/End jump to the ends, Enter/Space select the focused chip.
   * Selection follows arrow focus, per the WAI-ARIA radio pattern.
   */
  private onKeydown = (event: KeyboardEvent): void => {
    const options = this.options;
    if (!options || options.length === 0) return;

    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.value === this.value)
    );
    let targetIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (currentIndex + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (currentIndex - 1 + options.length) % options.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.select(options[currentIndex]);
        return;
      default:
        return;
    }

    event.preventDefault();
    this.select(options[targetIndex]);
    const chips = this.renderRoot.querySelectorAll<HTMLButtonElement>('.chip');
    chips[targetIndex]?.focus();
  };

  render() {
    return html`
      <div class="root" @keydown=${this.onKeydown}>
        ${(this.options ?? []).map((option) => {
          const active = option.value === this.value;
          return html`
            <button
              type="button"
              role="radio"
              class="chip chip--${option.tone ?? 'neutral'} ${active ? 'chip--active' : ''}"
              part="chip"
              tabindex=${active ? 0 : -1}
              aria-checked=${active}
              @click=${() => this.select(option)}
            >
              <span class="chip__label" part="label">${option.label}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  static styles = css`
    :host {
      --_gap: var(--spacing-150, 0.375rem);
      --_pad-y: var(--spacing-100, 0.25rem);
      --_pad-x: var(--form-padding-x-md, 0.75rem);
      --_font: var(--form-font-size-md, 0.9375rem);

      /* Resting (unselected) chrome. */
      --_bg: var(--color-surface, #fff);
      --_border: var(--color-border, #e5e5e5);
      --_color: var(--color-text-secondary, #525252);
      --_bg-hover: var(--color-surface-sunken, #f5f5f5);
      --_border-hover: var(--color-border-strong, #d4d4d4);
      --_color-hover: var(--color-text-primary, #171717);

      display: inline-flex;
    }
    :host([size='xs']) { --_pad-x: var(--form-padding-x-xs, 0.5rem); --_font: var(--form-font-size-xs, 0.75rem); }
    :host([size='sm']) { --_pad-x: var(--form-padding-x-sm, 0.625rem); --_font: var(--form-font-size-sm, 0.75rem); }
    :host([size='lg']) { --_pad-x: var(--form-padding-x-lg, 1rem); --_font: var(--form-font-size-lg, 1rem); --_pad-y: var(--spacing-200, 0.5rem); }

    .root {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--_gap);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      padding: var(--_pad-y) var(--_pad-x);
      border-radius: var(--radius-full, 9999px);
      border: 1px solid var(--_border);
      background: var(--_bg);
      color: var(--_color);
      font: inherit;
      font-size: var(--_font);
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
    }

    .chip:hover:not(.chip--active) {
      background: var(--_bg-hover);
      border-color: var(--_border-hover);
      color: var(--_color-hover);
    }

    .chip:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--focus-ring-color, #005862);
    }

    .chip__label { line-height: 1; }

    /* Active palettes mirror Ecology semantic tokens. */
    .chip--active.chip--neutral {
      background: var(--color-surface-sunken, #efefef);
      border-color: var(--color-border-strong, #d4d4d4);
      color: var(--color-text-tertiary, #404040);
    }
    .chip--active.chip--neutral-strong {
      background: var(--color-border, #e5e5e5);
      border-color: var(--color-border-strong, #d4d4d4);
      color: var(--color-text-primary, #171717);
    }
    .chip--active.chip--teal {
      background: var(--color-teal-50, #f0fdfa);
      border-color: var(--color-teal-200, #99f6e4);
      color: var(--color-primary, #005862);
    }
    .chip--active.chip--amber {
      background: var(--color-warning-subtle, #fffbeb);
      border-color: var(--color-warning-border, #fde68a);
      color: var(--color-warning, #b45309);
    }
  `;
}

if (!customElements.get('esa-chip-group')) {
  customElements.define('esa-chip-group', EsaChipGroup);
}
