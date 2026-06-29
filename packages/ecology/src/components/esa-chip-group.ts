import { LitElement, html, css } from 'lit';

/** Active-state palette for a chip. Maps to Ecology semantic tokens inside the primitive. */
export type EsaChipTone = 'neutral' | 'neutral-strong' | 'brand' | 'amber';

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
 *   - UiChipTone (neutral/neutral-strong/brand/amber) → EsaChipTone, mapped to Ecology
 *     semantic tokens (surface-sunken/border, darker neutral, primary/brand, warning/amber).
 *     BREAKING (2026-06-12): the 'teal' tone value was renamed 'brand' — it always
 *     rendered the semantic primary chain, and the hub default is no longer teal.
 *   - valueChange output                       → composed/bubbling 'change' CustomEvent
 *
 * MULTI-SELECT (Ecology extension, not in the Angular lib): set `multiple` and the
 * group becomes a chip checkbox set — chips toggle independently, selection lives in
 * the `values` array property (form value = comma-joined), `change` detail carries
 * `{ values }`, and arrows move focus WITHOUT selecting (the WAI-ARIA checkbox-group
 * pattern), Enter/Space toggles the focused chip.
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
    values: { type: Array },
    multiple: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    name: { type: String },
    label: { type: String },
  };

  declare options: EsaChipOption[];
  declare value: string;
  /** Selected values when `multiple`. */
  declare values: string[];
  declare multiple: boolean;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare name: string;
  declare label: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.values = [];
    this.multiple = false;
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
    if (changed.has('values') && typeof this.values === 'string') {
      try {
        this.values = JSON.parse(this.values as unknown as string);
      } catch {
        this.values = [];
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.role = this.multiple ? 'group' : 'radiogroup';
    if (this.label) this.internals.ariaLabel = this.label;
    this.syncFormValue();
  }

  updated(): void {
    if (this.label) this.internals.ariaLabel = this.label;
  }

  private syncFormValue(): void {
    if (this.multiple) {
      this.internals.setFormValue(this.values.length ? this.values.join(',') : null);
    } else {
      this.internals.setFormValue(this.value || null);
    }
  }

  private isActive(option: EsaChipOption): boolean {
    return this.multiple ? this.values.includes(option.value) : option.value === this.value;
  }

  private select(option: EsaChipOption): void {
    if (this.multiple) {
      this.values = this.values.includes(option.value)
        ? this.values.filter((v) => v !== option.value)
        : [...this.values, option.value];
      this.syncFormValue();
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { values: [...this.values] },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }
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
   * Roving-tabindex keyboard navigation. Single (radio pattern): arrow keys move
   * selection (with wrap-around), Home/End jump to the ends, Enter/Space select.
   * Multiple (checkbox-group pattern): arrows move FOCUS only; Enter/Space toggles
   * the focused chip.
   */
  private onKeydown = (event: KeyboardEvent): void => {
    const options = this.options;
    if (!options || options.length === 0) return;

    const chips = this.renderRoot.querySelectorAll<HTMLButtonElement>('.chip');
    const focusedIndex = Array.from(chips).indexOf(this.renderRoot.activeElement as HTMLButtonElement);
    const currentIndex = this.multiple
      ? Math.max(0, focusedIndex)
      : Math.max(
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
    if (!this.multiple) this.select(options[targetIndex]);
    chips[targetIndex]?.focus();
  };

  render() {
    return html`
      <div class="root" @keydown=${this.onKeydown}>
        ${(this.options ?? []).map((option, i) => {
          const active = this.isActive(option);
          const tabbable = this.multiple ? i === 0 : active;
          return html`
            <button
              type="button"
              role=${this.multiple ? 'checkbox' : 'radio'}
              class="chip chip--${option.tone ?? 'neutral'} ${active ? 'chip--active' : ''}"
              part="chip"
              tabindex=${tabbable ? 0 : -1}
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
      --_gap: var(--spacing-150);
      --_pad-y: var(--spacing-150);
      --_pad-x: var(--form-padding-x-md);
      --_font: var(--form-font-size-md);
      --_radius: var(--radius-100);

      /* Resting (unselected) chrome. */
      --_bg: var(--color-surface);
      --_border: var(--color-border);
      --_color: var(--color-text-secondary);
      --_bg-hover: var(--color-surface-sunken);
      --_border-hover: var(--color-border-strong);
      --_color-hover: var(--color-text-primary);

      display: inline-flex;
    }
    :host([size='xs']) { --_pad-x: var(--form-padding-x-xs); --_font: var(--form-font-size-xs); --_pad-y: var(--spacing-100); }
    :host([size='sm']) { --_pad-x: var(--form-padding-x-sm); --_font: var(--form-font-size-sm); --_pad-y: var(--spacing-100); }
    :host([size='lg']) { --_pad-x: var(--form-padding-x-lg); --_font: var(--form-font-size-lg); --_pad-y: var(--spacing-200); }

    .root {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--_gap);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100);
      padding: var(--_pad-y) var(--_pad-x);
      border-radius: var(--_radius, 0.25rem);
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
        background-color var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);
    }

    .chip:hover:not(.chip--active) {
      background: var(--_bg-hover);
      border-color: var(--_border-hover);
      color: var(--_color-hover);
    }

    .chip:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .chip__label { line-height: 1; }

    /* Active palettes mirror Ecology semantic tokens. */
    .chip--active.chip--neutral {
      background: var(--color-surface-sunken);
      border-color: var(--color-border-strong);
      color: var(--color-text-tertiary);
    }
    .chip--active.chip--neutral-strong {
      background: var(--color-border);
      border-color: var(--color-border-strong);
      color: var(--color-text-primary);
    }
    /* Reads the SEMANTIC primary chain so spoke themes re-skin it — hub
       default is brand blue, a forest-green theme goes forest. */
    .chip--active.chip--brand {
      background: var(--color-primary-subtle);
      border-color: var(--color-primary-border);
      color: var(--color-primary-strong);
    }
    .chip--active.chip--amber {
      background: var(--color-warning-subtle);
      border-color: var(--color-warning-border);
      color: var(--color-warning-strong);
    }
  `;
}

if (!customElements.get('esa-chip-group')) {
  customElements.define('esa-chip-group', EsaChipGroup);
}
