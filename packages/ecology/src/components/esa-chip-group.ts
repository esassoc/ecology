import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';

/** Chip text is UI text at the SEMIBOLD tier. It rendered `font-weight: 600` as a
    raw literal — 600 is not a token weight in this system (semibold is 550), so
    adopting the composite is a small deliberate weight change, logged in the ledger. */
const STRONG_TYPE = { xs: 'microcopy-2xs-strong', sm: 'microcopy-xs-strong', md: 'microcopy-md-strong', lg: 'microcopy-lg-strong' } as const;

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
    name: { type: String, reflect: true },
    label: { type: String },
  };

  declare options: EsaChipOption[];
  declare value: string;
  /** Selected values when `multiple`. */
  declare values: string[];
  declare multiple: boolean;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare label: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.values = [];
    this.multiple = false;
    this.size = 'md';
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
    // A value set from SCRIPT (el.value = 'x') has to reach the form too. Only
    // the click handler used to call syncFormValue, so a programmatically
    // selected chip rendered as active and submitted as empty.
    if (changed.has('value') || changed.has('values') || changed.has('multiple')) {
      this.syncFormValue();
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
              class="chip chip--${option.tone ?? 'neutral'} ${active ? 'chip--active' : ''} typography-${STRONG_TYPE[this.size]}"
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

  static styles = [
    typography,
    a11y,
    css`
    :host {
      --_gap: var(--spacing-150, 0.375rem);
      --_pad-y: var(--spacing-150, 0.375rem);
      --_pad-x: var(--spacing-300, 0.75rem);
      /* --radius-chip — shared with esa-badge and esa-pill; becomes the capsule under
         a 'round' corner language, tracks --radius-sm otherwise. */
      --_radius: var(--radius-chip, var(--radius-sm, 0.25rem));

      /* Resting (unselected) chrome. */
      --_bg: var(--color-background-elevation-raised, #fcfcfc);
      --_border: var(--color-border-default, #cecece);
      --_color: var(--color-content-default-secondary, #646464);
      --_bg-hover: var(--color-background-elevation-sunken, #f0f0f0);
      --_border-hover: var(--color-border-default-strong, #bbbbbb);
      --_color-hover: var(--color-content-default, #202020);

      display: inline-flex;
    }
    /* --_pad-x walks --spacing-200/250/300/400 — the CONTROL ramp, shared with the
       inputs and buttons, because a chip is interactive and lines up beside them.
       esa-badge and esa-pill look identical in shape but walk 100/150/200/300: they
       are static marks, not controls. Same code, different ramp; don't sync them.
       --_pad-y is its OWN ramp (--spacing-100/100/150/200), NOT a copy of --_pad-x.
       That is the one place this component must not follow the control ramp: --_pad-x
       walks 200/250/300/400 because a chip sits beside an input, but 12-16px of
       VERTICAL padding makes it as tall as a button (measured: md rendered 50px).
       A chip is wider than it is tall. There is no height token any more:
       --chip-group-height-* and the shared --chip-height-* ramp behind it went on
       2026-08-15. This box also carries a 1px border per side. */
    :host([size='xs']) { --_pad-y: var(--spacing-100, 0.25rem); --_pad-x: var(--spacing-200, 0.5rem); }
    :host([size='sm']) { --_pad-y: var(--spacing-100, 0.25rem); --_pad-x: var(--spacing-250, 0.625rem); }
    :host([size='lg']) { --_pad-y: var(--spacing-200, 0.5rem); --_pad-x: var(--spacing-400, 1rem); }

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
      box-sizing: border-box;
      padding-block: var(--_pad-y);
      padding-inline: var(--_pad-x);
      border-radius: var(--_radius, 0.25rem);
      border: var(--border-width-default, 1px) solid var(--_border);
      background: var(--_bg);
      color: var(--_color);
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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    /* Active palettes mirror Ecology semantic tokens. */
    .chip--active.chip--neutral {
      background: var(--color-background-elevation-sunken, #f0f0f0);
      border-color: var(--color-border-default-strong, #bbbbbb);
      color: var(--color-content-default-secondary, #646464);
    }
    .chip--active.chip--neutral-strong {
      background: var(--color-border-default, #cecece);
      border-color: var(--color-border-default-strong, #bbbbbb);
      color: var(--color-content-default, #202020);
    }
    /* Reads the SEMANTIC primary chain so spoke themes re-skin it — hub
       default is brand blue, a forest-green theme goes forest. */
    .chip--active.chip--brand {
      background: var(--color-background-brand-subtle, #fbfefb);
      border-color: var(--color-border-brand, #b2ddb5);
      color: var(--color-content-brand, #2a7e3b);
    }
    .chip--active.chip--amber {
      background: var(--color-background-utility-warning-subtle, #fefdfb);
      border-color: var(--color-border-utility-warning, #f3d673);
      color: var(--color-content-utility-warning, #ab6400);
    }
  `,
  ];
}

if (!customElements.get('esa-chip-group')) {
  customElements.define('esa-chip-group', EsaChipGroup);
}
