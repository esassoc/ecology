import { LitElement, html, css } from 'lit';

/** Active-state palette for a chip. Maps to Ecology semantic tokens inside the primitive. */
// Semantic tones plus any accent hue. Shadow DOM can't read the global
// [data-accent] context, so each tone resolves to a hue (+ intensity) here and
// the active-state ramp steps are set inline per chip.
export type EsaChipTone =
  | 'neutral' | 'neutral-strong' | 'brand' | 'amber'
  | 'gray' | 'blue' | 'copper' | 'gold' | 'grass' | 'green' | 'lime'
  | 'orange' | 'red' | 'teal' | 'yellow';

// tone → { hue, strong? }. Unknown tones pass straight through as a hue, so any
// accent ramp works. `strong` bumps the alpha/text steps for a heavier chip.
const CHIP_TONES: Record<string, { hue: string; strong?: boolean }> = {
  neutral: { hue: 'gray' },
  'neutral-strong': { hue: 'gray', strong: true },
  brand: { hue: 'grass' },
  amber: { hue: 'yellow' },
};
// Inline the active-state ramp steps for a chip's tone: a-3/a-6/11 (or the
// heavier a-4/a-7/12 for a `strong` tone). These custom props feed .chip--active.
function chipToneStyle(tone: string | undefined): string {
  const spec = CHIP_TONES[tone ?? 'neutral'] ?? { hue: tone ?? 'gray' };
  const [bg, bd, tx] = spec.strong ? ['4', '7', '12'] : ['3', '6', '11'];
  return `--_active-bg: var(--color-${spec.hue}-a-${bg});` +
    `--_active-border: var(--color-${spec.hue}-a-${bd});` +
    `--_active-text: var(--color-${spec.hue}-${tx});`;
}

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
    color: { type: String },
  };

  declare options: EsaChipOption[];
  declare value: string;
  /** Selected values when `multiple`. */
  declare values: string[];
  declare multiple: boolean;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare name: string;
  declare label: string;
  /** Group-level active accent — a hue or semantic tone applied to every chip's
   *  selected state, unless an option sets its own `tone`. Empty = neutral. */
  declare color: EsaChipTone | '';

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
    this.color = '';
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
              class="chip ${active ? 'chip--active' : ''}"
              part="chip"
              style=${chipToneStyle(option.tone || this.color)}
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
      --_gap: var(--spacing-150, 0.375rem);
      --_pad-y: var(--spacing-150, 0.375rem);
      --_pad-x: var(--form-padding-x-md, 0.75rem);
      --_font: var(--form-font-size-md, 0.9375rem);
      --_radius: var(--radius-100, 0.25rem);

      /* Resting (unselected) chrome. */
      --_bg: var(--color-surface, #fff);
      --_border: var(--color-border, #e5e5e5);
      --_color: var(--color-text-secondary, #525252);
      --_bg-hover: var(--color-surface-sunken, #f5f5f5);
      --_border-hover: var(--color-border-strong, #d4d4d4);
      --_color-hover: var(--color-text-primary, #171717);

      display: inline-flex;
    }
    :host([size='xs']) { --_pad-x: var(--form-padding-x-xs, 0.5rem); --_font: var(--form-font-size-xs, 0.75rem); --_pad-y: var(--spacing-100, 0.25rem); }
    :host([size='sm']) { --_pad-x: var(--form-padding-x-sm, 0.625rem); --_font: var(--form-font-size-sm, 0.75rem); --_pad-y: var(--spacing-100, 0.25rem); }
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
      /* Reset the native <button> UA border (2px outset black) — the edge is the
         inset ring below. Without this the browser default shows through. */
      border: 0;
      appearance: none;
      border-radius: var(--_radius, 0.25rem);
      background: var(--_bg);
      color: var(--_color);
      box-shadow: inset 0 0 0 1px var(--_border);
      font: inherit;
      font-size: var(--_font);
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
    }

    .chip:hover:not(.chip--active) {
      background: var(--_bg-hover);
      box-shadow: inset 0 0 0 1px var(--_border-hover);
      color: var(--_color-hover);
    }

    /* Focus ring composes over whatever inset edge the chip currently has
       (resting or active tone). Duplicated class raises specificity so the
       focus ring stays visible on an active, focused chip. */
    .chip.chip:focus-visible {
      outline: none;
      box-shadow:
        inset 0 0 0 1px var(--_border),
        0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    /* Active + focused: compose the tone's inset ring with the outer focus ring.
       The tone's ramp steps arrive as inline --_active-* props (chipToneStyle). */
    .chip--active.chip:focus-visible {
      box-shadow:
        inset 0 0 0 1px var(--_active-border),
        0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .chip__label { line-height: 1; }

    /* One active rule for every tone — fill / ring / text come from the inline
       --_active-* props, which resolve to the chip's accent hue. */
    .chip--active {
      background: var(--_active-bg);
      box-shadow: inset 0 0 0 1px var(--_active-border);
      color: var(--_active-text);
    }
  `;
}

if (!customElements.get('esa-chip-group')) {
  customElements.define('esa-chip-group', EsaChipGroup);
}
