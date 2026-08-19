import { LitElement, html, css, svg } from 'lit';
import { typography } from '../typography.js';

/** The group heading is UI text (label-*, medium); each option's own text is prose
    (body-*, regular). See the FORMS header in component-tokens.css for the mapping. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

interface EsaOption {
  label: string;
  value: string;
  disabled?: boolean;
}

// Inlined Lucide `check` icon (lucide.dev) to avoid an icon dependency.
const checkIcon = svg`<polyline points="20 6 9 17 4 12"></polyline>`;

/**
 * esa-checkbox-group — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-checkbox-group (a ControlValueAccessor
 * whose value is a string[] of selected option values, with vertical/horizontal
 * orientation and per-option disabled state). The lucide-angular `check` icon is
 * inlined as SVG.
 *
 * `options` accepts an array directly (property) or a JSON string (attribute).
 * Form participation: each selected value is appended to a FormData submitted via
 * ElementInternals.setFormValue, plus a bubbling/composed 'change' CustomEvent
 * carrying the current string[]. Keyboard: Space/Enter toggle. Decorator-free.
 */
export class EsaCheckboxGroup extends LitElement {
  static formAssociated = true;

  static properties = {
    options: { type: Array },
    label: { type: String },
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: Array },
  };

  declare options: EsaOption[];
  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare orientation: 'vertical' | 'horizontal';
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare value: string[];

  private internals: ElementInternals;

  constructor() {
    super();
    this.options = [];
    this.label = '';
    this.size = 'md';
    this.orientation = 'vertical';
    this.value = [];
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
    // A value set from SCRIPT (el.value = [...]) has to reach the form too. Only
    // the toggle handler used to call syncFormValue, so a programmatically
    // checked box rendered as checked and submitted as empty. `name` is in here
    // because it is the FormData key — changing it has to rewrite the entries.
    if (changed.has('value') || changed.has('name')) this.syncFormValue();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  private syncFormValue(): void {
    const data = new FormData();
    const fieldName = this.name || 'checkbox-group';
    for (const v of this.value) data.append(fieldName, v);
    this.internals.setFormValue(data);
  }

  private isChecked(value: string): boolean {
    return this.value.includes(value);
  }

  private toggleOption = (option: EsaOption): void => {
    if (option.disabled) return;
    const idx = this.value.indexOf(option.value);
    this.value =
      idx >= 0 ? this.value.filter((v) => v !== option.value) : [...this.value, option.value];
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent, option: EsaOption): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggleOption(option);
    }
  };

  render() {
    return html`
      ${this.label ? html`<span class="group-label typography-${LABEL_TYPE[this.size]}">${this.label}</span>` : null}
      <div class="items" role="group" aria-label=${this.label}>
        ${this.options.map((option) => {
          const checked = this.isChecked(option.value);
          const disabled = option.disabled ?? false;
          return html`
            <label
              class="item ${disabled ? 'item--disabled' : ''}"
              @keydown=${(e: KeyboardEvent) => this.onKeydown(e, option)}
            >
              <span
                class="box ${checked ? 'box--checked' : ''}"
                role="checkbox"
                aria-checked=${String(checked)}
                aria-disabled=${String(disabled)}
                tabindex=${disabled ? -1 : 0}
                @click=${() => this.toggleOption(option)}
              >
                ${checked
                  ? html`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${checkIcon}</svg>`
                  : null}
              </span>
              <span class="item-label typography-${VALUE_TYPE[this.size]}">${option.label}</span>
            </label>
          `;
        })}
      </div>
    `;
  }

  static styles = [
    typography,
    css`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--form-radius-md, 0.5rem);
      --_checkbox-icon-size: 16px;
      display: block;
    }
    :host([size='xs']) {
      --_checkbox-size: 14px;
      --_checkbox-radius: var(--form-radius-xs, 0.25rem);
      --_checkbox-icon-size: 10px;
    }
    :host([size='sm']) {
      --_checkbox-size: 16px;
      --_checkbox-radius: var(--form-radius-sm, 0.25rem);
      --_checkbox-icon-size: 12px;
    }
    :host([size='lg']) {
      --_checkbox-size: 24px;
      --_checkbox-radius: var(--form-radius-lg, 0.5rem);
      --_checkbox-icon-size: 20px;
    }

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-default, #171717);
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

    .box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_checkbox-size);
      height: var(--_checkbox-size);
      flex-shrink: 0;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--color-background-field, transparent);
      color: var(--color-content-default-knockout, #fff);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box--checked {
      background: var(--color-background-brand, #43608a);
      border-color: var(--color-background-brand, #43608a);
    }

    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    /* Unchecked only — see esa-checkbox for why. */
    .item--disabled .box:not(.box--checked) {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
    }
    .box:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width)
        var(--focus-ring-color);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    .item-label {
      color: var(--color-content-default, #171717);
    }
  `,
  ];
}

if (!customElements.get('esa-checkbox-group')) {
  customElements.define('esa-checkbox-group', EsaCheckboxGroup);
}
