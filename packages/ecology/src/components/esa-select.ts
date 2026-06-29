import { LitElement, html, css } from 'lit';

interface EsaOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * esa-select — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-select:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - filteredOptions / displayValue   → getters over `_search` and `_selected`
 *   - selection, keyboard nav, multi-select chips, outside-click close — same logic
 *
 * Single-select sets a string form value; multi-select joins values with commas.
 * Keyboard: ArrowDown/ArrowUp navigate, Enter selects, Escape closes, Tab closes.
 * Dropdown is positioned with plain absolute CSS (no CDK). Outside-click closes it.
 */
export class EsaSelect extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    options: { type: Array },
    size: { type: String, reflect: true },
    placeholder: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    required: { type: Boolean },
    disabled: { type: Boolean, reflect: true },
    multiple: { type: Boolean },
    searchable: { type: Boolean },
    chipMode: { type: Boolean, attribute: 'chip-mode' },
    _search: { state: true },
    _selected: { state: true },
    _open: { state: true },
    _active: { state: true },
  };

  declare label: string;
  declare options: EsaOption[];
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare placeholder: string;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare disabled: boolean;
  declare multiple: boolean;
  declare searchable: boolean;
  declare chipMode: boolean;
  private _search: string;
  private _selected: string[];
  private _open: boolean;
  private _active: number;

  private internals: ElementInternals;
  private onDocClick = (e: MouseEvent): void => {
    if (!this._open) return;
    if (!e.composedPath().includes(this)) {
      this._open = false;
    }
  };

  constructor() {
    super();
    this.label = '';
    this.options = [];
    this.size = 'md';
    this.placeholder = 'Select...';
    this.helpText = '';
    this.errorText = '';
    this.required = false;
    this.disabled = false;
    this.multiple = false;
    this.searchable = true;
    this.chipMode = false;
    this._search = '';
    this._selected = [];
    this._open = false;
    this._active = -1;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.onDocClick);
    this.syncFormValue();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocClick);
  }

  // --- Public value accessor (mirrors writeValue) ---
  set value(val: string | string[] | null) {
    if (val == null) this._selected = [];
    else if (Array.isArray(val)) this._selected = val;
    else this._selected = [val];
    this.syncFormValue();
  }
  get value(): string | string[] {
    return this.multiple ? this._selected : (this._selected[0] ?? '');
  }

  private get filteredOptions(): EsaOption[] {
    const search = this._search.toLowerCase();
    if (!search) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(search));
  }

  private get displayValue(): string {
    if (this._selected.length === 0) return '';
    const opt = this.options.find((o) => o.value === this._selected[0]);
    return opt?.label ?? '';
  }

  private get selectedOptions(): EsaOption[] {
    return this.options.filter((o) => this._selected.includes(o.value));
  }

  private get inputValue(): string {
    if (this.multiple) return this._search;
    return this._search || this.displayValue;
  }

  private isSelected(value: string): boolean {
    return this._selected.includes(value);
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.multiple ? this._selected.join(',') : (this._selected[0] ?? null));
  }

  private emit(): void {
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private toggleDropdown(): void {
    if (this.disabled) return;
    this._open ? (this._open = false) : this.openDropdown();
  }

  private openDropdown(): void {
    if (this.disabled) return;
    this._open = true;
    this._active = -1;
    requestAnimationFrame(() => {
      (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus();
    });
  }

  private selectOption(option: EsaOption): void {
    if (option.disabled) return;
    const value = option.value;
    if (this.multiple) {
      const idx = this._selected.indexOf(value);
      this._selected = idx >= 0 ? this._selected.filter((v) => v !== value) : [...this._selected, value];
      this._search = '';
      this.emit();
      requestAnimationFrame(() => {
        (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus();
      });
    } else {
      this._selected = [value];
      this._search = '';
      this._open = false;
      this.emit();
    }
  }

  private removeValue(value: string, event?: Event): void {
    event?.stopPropagation();
    this._selected = this._selected.filter((v) => v !== value);
    this.emit();
  }

  private onSearchInput = (event: Event): void => {
    this._search = (event.target as HTMLInputElement).value;
    this._active = -1;
    if (!this._open) this._open = true;
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const opts = this.filteredOptions;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this._open) return this.openDropdown();
        {
          let next = this._active + 1;
          while (next < opts.length && opts[next].disabled) next++;
          if (next < opts.length) this._active = next;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this._open) return this.openDropdown();
        {
          let next = this._active - 1;
          while (next >= 0 && opts[next].disabled) next--;
          if (next >= 0) this._active = next;
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (this._open && this._active >= 0) {
          const opt = opts[this._active];
          if (opt && !opt.disabled) this.selectOption(opt);
        } else if (!this._open) {
          this.openDropdown();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this._open = false;
        break;
      case 'Tab':
        this._open = false;
        break;
    }
  };

  render() {
    const hasError = !!this.errorText;
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? html`<label class="field__label">
              ${this.label}${this.required ? html`<span class="field__required">*</span>` : null}
            </label>`
          : null}

        <div class="container">
          ${this.multiple && this.chipMode
            ? html`<div class="chips">
                ${this.selectedOptions.map(
                  (opt) => html`<span class="chip">
                    <span class="chip__label">${opt.label}</span>
                    <button
                      type="button"
                      class="chip__remove"
                      aria-label=${'Remove ' + opt.label}
                      @click=${(e: Event) => this.removeValue(opt.value, e)}
                    >
                      ${this.xIcon()}
                    </button>
                  </span>`
                )}
              </div>`
            : null}

          <div class="input-wrapper" @click=${() => this.toggleDropdown()}>
            <input
              class="input"
              role="combobox"
              aria-expanded=${this._open}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              placeholder=${this.placeholder}
              .value=${this.inputValue}
              ?disabled=${this.disabled}
              ?readonly=${!this.searchable}
              @input=${this.onSearchInput}
              @keydown=${this.onKeydown}
            />
            <span class="arrow ${this._open ? 'arrow--open' : ''}">${this.chevronIcon()}</span>
          </div>

          ${this._open
            ? html`<div class="dropdown" role="listbox">
                ${this.filteredOptions.length === 0
                  ? html`<div class="option option--empty">No results found</div>`
                  : this.filteredOptions.map((option, i) => {
                      const selected = this.isSelected(option.value);
                      return html`<div
                        class="option ${i === this._active ? 'option--active' : ''} ${selected
                          ? 'option--selected'
                          : ''} ${option.disabled ? 'option--disabled' : ''}"
                        role="option"
                        aria-selected=${selected}
                        aria-disabled=${option.disabled ?? false}
                        @click=${() => this.selectOption(option)}
                        @mouseenter=${() => (this._active = i)}
                      >
                        ${this.multiple
                          ? html`<span class="check ${selected ? 'check--selected' : ''}">${this.checkIcon()}</span>`
                          : null}
                        <span class="option__label">${option.label}</span>
                      </div>`;
                    })}
              </div>`
            : null}
        </div>

        ${hasError
          ? html`<span class="field__error">${this.errorText}</span>`
          : this.helpText
            ? html`<span class="field__help">${this.helpText}</span>`
            : null}
      </div>
    `;
  }

  private chevronIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`;
  }
  private checkIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>`;
  }
  private xIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
  }

  static styles = css`
    :host {
      display: block;
      --_field-padding-y: var(--form-padding-y-md, 8px);
      --_field-padding-x: var(--form-padding-x-md, 12px);
      --_field-font-size: var(--form-font-size-md, 14px);
      --_field-height: var(--form-height-md, 40px);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs, 2px);
      --_field-padding-x: var(--form-padding-x-xs, 8px);
      --_field-font-size: var(--form-font-size-xs, 11px);
      --_field-height: var(--form-height-xs, 28px);
      --_field-radius: var(--form-radius-xs, 4px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 4px);
      --_field-padding-x: var(--form-padding-x-sm, 8px);
      --_field-font-size: var(--form-font-size-sm, 12px);
      --_field-height: var(--form-height-sm, 32px);
      --_field-radius: var(--form-radius-sm, 6px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 12px);
      --_field-padding-x: var(--form-padding-x-lg, 16px);
      --_field-font-size: var(--form-font-size-lg, 16px);
      --_field-height: var(--form-height-lg, 48px);
      --_field-radius: var(--form-radius-lg, 10px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--form-label-font-size, var(--_field-font-size));
      font-weight: var(--form-label-font-weight, var(--font-weight-medium, 450));
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-danger-strong, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
    .field__error {
      font-size: var(--type-size-150, 12px);
      color: var(--form-error-color, var(--color-danger-strong, #ce2c31));
    }

    .container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .input {
      width: 100%;
      height: var(--_field-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      padding-inline-end: calc(var(--_field-padding-x) + 24px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      cursor: pointer;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .input:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .arrow {
      position: absolute;
      right: var(--_field-padding-x);
      top: 50%;
      transform: translateY(-50%);
      display: inline-flex;
      color: var(--color-text-muted, #737373);
      pointer-events: none;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .arrow svg {
      width: var(--icon-size-medium, 20px);
      height: var(--icon-size-medium, 20px);
    }
    .arrow--open {
      transform: translateY(-50%) rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      margin-top: var(--spacing-100, 4px);
      max-height: 256px;
      overflow-y: auto;
      background: var(--color-surface, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #e5e5e5);
      border-radius: var(--form-radius-md, 8px);
      box-shadow: var(--shadow-200, 0 4px 12px rgba(0, 0, 0, 0.12));
      overscroll-behavior: contain;
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--color-text-primary, #171717);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
    }
    .option:hover,
    .option--active {
      background: var(--color-surface-sunken, #efefef);
    }
    .option--selected {
      background: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      color: var(--color-primary-strong, #3a7c59);
    }
    .option--disabled {
      color: var(--color-disabled-text, #a3a3a3);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .option--disabled:hover {
      background: transparent;
    }
    .option--empty {
      color: var(--color-text-muted, #737373);
      cursor: default;
      font-style: italic;
    }
    .option--empty:hover {
      background: transparent;
    }
    .option__label {
      flex: 1;
    }

    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0;
      color: var(--color-primary-strong, #3a7c59);
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .check svg {
      width: 16px;
      height: 16px;
    }
    .check--selected {
      opacity: 1;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-100, 4px);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
      padding: var(--spacing-050, 2px) var(--spacing-100, 4px) var(--spacing-050, 2px) var(--spacing-200, 8px);
      background: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      color: var(--color-primary-strong, #3a7c59);
      border-radius: var(--radius-full, 9999px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--type-size-150, 12px);
      line-height: 1.4;
      user-select: none;
    }
    .chip__label {
      white-space: nowrap;
    }
    .chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-primary-strong, #3a7c59);
      border-radius: 50%;
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .chip__remove svg {
      width: 14px;
      height: 14px;
    }
    .chip__remove:hover {
      background: var(--color-hover-overlay-strong, rgba(0, 0, 0, 0.05));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }

    .field--error .input {
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 2px var(--color-danger-border, rgba(211, 47, 47, 0.25));
    }
  `;
}

if (!customElements.get('esa-select')) {
  customElements.define('esa-select', EsaSelect);
}
