import { LitElement, html, css, nothing } from 'lit';

interface EsaInputTagOption {
  value: string;
  label: string;
}

/**
 * esa-input-tag — form-associated Lit Web Component (tag / token multiselect).
 *
 * Faithful translation of the Angular/Beacon ui-input-tag:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - selected value = array of tokens → mirrored to the form (comma-joined) + emitted as
 *     an array in the `change` event detail
 *
 * Tokens are free-form chips entered by the user (Enter to add) and removable (× or
 * Backspace on an empty field). An optional `options` list drives a filtered suggestion
 * dropdown; suggestions and typed values coexist. The token VALUE is what's submitted;
 * when an option matches, its label is shown on the chip.
 *
 * Ecology extensions (not in the Angular lib):
 *   - `strict`     — options-only vocabulary: the free-form "Add" row is suppressed,
 *                    tokens can only come from `options`.
 *   - `tags-below` — chips render in a row BELOW the input instead of inline, so a
 *                    long selection never crowds the field.
 *
 * Decorator-free on purpose: avoids per-consumer tsconfig decorator flags. Tokens reach
 * inside shadow DOM because CSS custom properties inherit through it.
 *
 * Keyboard: Enter adds the typed value (or the highlighted suggestion); ArrowUp/Down move
 * through suggestions; Backspace on an empty field removes the last token; Escape closes
 * the dropdown.
 */
export class EsaInputTag extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    hint: { type: String },
    placeholder: { type: String },
    options: { type: Array },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
    strict: { type: Boolean },
    tagsBelow: { type: Boolean, attribute: 'tags-below' },
    name: { type: String },
    _values: { state: true },
    _search: { state: true },
    _open: { state: true },
    _active: { state: true },
  };

  declare label: string;
  declare hint: string;
  declare placeholder: string;
  declare options: EsaInputTagOption[];
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare required: boolean;
  declare strict: boolean;
  declare tagsBelow: boolean;
  declare name: string;
  private _values: string[];
  private _search: string;
  private _open: boolean;
  private _active: number;

  private internals: ElementInternals;
  private onDocClick = (e: MouseEvent): void => {
    if (!this._open) return;
    if (!e.composedPath().includes(this)) this.closeDropdown();
  };

  constructor() {
    super();
    this.label = '';
    this.hint = '';
    this.placeholder = 'Search or add...';
    this.options = [];
    this.size = 'md';
    this.disabled = false;
    this.required = false;
    this.strict = false;
    this.tagsBelow = false;
    this.name = '';
    this._values = [];
    this._search = '';
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
  set value(val: string[] | string | null) {
    if (val == null) this._values = [];
    else if (Array.isArray(val)) this._values = [...val];
    else this._values = String(val).split(',').map((v) => v.trim()).filter(Boolean);
    this.syncFormValue();
  }
  get value(): string[] {
    return [...this._values];
  }

  // --- Computed getters ---

  /** Label to show on a chip for a given stored value (option label if known, else the raw value). */
  private labelFor(value: string): string {
    const opt = this.options.find((o) => o.value === value);
    return opt?.label ?? value;
  }

  /** Options not already selected and matching the current search. */
  private get filteredOptions(): EsaInputTagOption[] {
    const selected = new Set(this._values);
    const query = this._search.toLowerCase().trim();
    return this.options.filter((o) => {
      if (selected.has(o.value)) return false;
      if (query && !o.label.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  /** Whether the typed term can be added as a free-form token (not blank, not already present). */
  private get canAddTyped(): boolean {
    if (this.strict) return false; // options-only vocabulary
    const term = this._search.trim();
    if (!term) return false;
    if (this._values.includes(term)) return false;
    // Don't offer "Add" when an option's label is an exact match — selecting it is clearer.
    return !this.options.some((o) => o.label.toLowerCase() === term.toLowerCase() && !this._values.includes(o.value));
  }

  // --- Form / events ---

  private syncFormValue(): void {
    this.internals.setFormValue(this._values.length ? this._values.join(',') : null);
  }

  private emitValue(): void {
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  }

  // --- Open / close ---

  private openDropdown(): void {
    if (this.disabled || this._open) return;
    this._open = true;
    this._active = -1;
  }

  private closeDropdown(): void {
    if (!this._open) return;
    this._open = false;
    this._active = -1;
  }

  private focusInput(): void {
    requestAnimationFrame(() => {
      (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus();
    });
  }

  // --- Mutation ---

  private addToken(value: string): void {
    const v = value.trim();
    if (!v || this._values.includes(v)) return;
    this._values = [...this._values, v];
    this._search = '';
    this._active = -1;
    this.emitValue();
    this.focusInput();
  }

  private selectOption(option: EsaInputTagOption): void {
    if (this._values.includes(option.value)) return;
    this._values = [...this._values, option.value];
    this._search = '';
    this._active = -1;
    this.emitValue();
    this.focusInput();
  }

  private removeToken(value: string, event?: Event): void {
    event?.stopPropagation();
    this._values = this._values.filter((v) => v !== value);
    this.emitValue();
    this.focusInput();
  }

  // --- Input handlers ---

  private onSearchInput = (event: Event): void => {
    this._search = (event.target as HTMLInputElement).value;
    this._active = -1;
    if (!this._open) this.openDropdown();
  };

  private onInputFocus = (): void => {
    if (!this._open) this.openDropdown();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const opts = this.filteredOptions;
    const addOffset = this.canAddTyped ? 1 : 0;
    const total = opts.length + addOffset;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this._open) return this.openDropdown();
        if (total > 0) this._active = Math.min(this._active + 1, total - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (total > 0) this._active = Math.max(this._active - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this._open && this._active >= 0 && this._active < opts.length) {
          this.selectOption(opts[this._active]);
        } else if (this.canAddTyped) {
          // Either the "Add" row is highlighted, or nothing is highlighted: add the typed term.
          this.addToken(this._search);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        this._search = '';
        break;
      case 'Backspace':
        if (!this._search && this._values.length > 0) {
          this.removeToken(this._values[this._values.length - 1]);
        }
        break;
    }
  };

  private toggleDropdown = (): void => {
    if (this.disabled) return;
    this._open ? this.closeDropdown() : this.openDropdown();
    if (this._open) this.focusInput();
  };

  private renderChips() {
    return this._values.map(
      (value) => html`<span class="chip">
        <span class="chip__label">${this.labelFor(value)}</span>
        ${!this.disabled
          ? html`<button
              type="button"
              class="chip__remove"
              aria-label=${'Remove ' + this.labelFor(value)}
              @click=${(e: Event) => this.removeToken(value, e)}
            >
              ${this.xIcon()}
            </button>`
          : null}
      </span>`
    );
  }

  render() {
    return html`
      <div class="field">
        ${this.label
          ? html`<label class="field__label">
              ${this.label}${this.required ? html`<span class="field__required" aria-hidden="true">*</span>` : null}
            </label>`
          : null}

        <div class="container ${this._open ? 'container--open' : ''} ${this.disabled ? 'container--disabled' : ''}">
          <div class="chips">
            ${this.tagsBelow ? null : this.renderChips()}
            <input
              class="input"
              type="text"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded=${this._open}
              aria-autocomplete="list"
              aria-required=${this.required ? 'true' : nothing}
              placeholder=${this._values.length ? '' : this.placeholder}
              .value=${this._search}
              ?disabled=${this.disabled}
              @input=${this.onSearchInput}
              @focus=${this.onInputFocus}
              @keydown=${this.onKeydown}
            />
          </div>

          ${this.options.length > 0
            ? html`<button
                type="button"
                class="toggle"
                aria-label="Toggle suggestions"
                ?disabled=${this.disabled}
                @mousedown=${(e: Event) => e.preventDefault()}
                @click=${this.toggleDropdown}
              >
                <span class="arrow ${this._open ? 'arrow--open' : ''}">${this.chevronIcon()}</span>
              </button>`
            : null}

          ${this._open ? this.renderDropdown() : null}
        </div>

        ${this.tagsBelow && this._values.length
          ? html`<div class="chips chips--below">${this.renderChips()}</div>`
          : null}
        ${this.hint ? html`<span class="field__hint">${this.hint}</span>` : null}
      </div>
    `;
  }

  private renderDropdown() {
    const opts = this.filteredOptions;
    const canAdd = this.canAddTyped;
    const addIndex = opts.length;
    if (opts.length === 0 && !canAdd) {
      return html`<div class="dropdown" role="listbox">
        <div class="empty">${this._search ? 'No matches found' : 'Type a value and press Enter to add'}</div>
      </div>`;
    }
    return html`<div class="dropdown" role="listbox">
      ${opts.map(
        (option, i) => html`<button
          type="button"
          class="option ${i === this._active ? 'option--active' : ''}"
          role="option"
          aria-selected=${i === this._active}
          @mousedown=${(e: Event) => e.preventDefault()}
          @mouseenter=${() => (this._active = i)}
          @click=${() => this.selectOption(option)}
        >
          <span class="option__label">${option.label}</span>
        </button>`
      )}
      ${canAdd
        ? html`<button
            type="button"
            class="option option--add ${this._active === addIndex ? 'option--active' : ''}"
            role="option"
            aria-selected=${this._active === addIndex}
            @mousedown=${(e: Event) => e.preventDefault()}
            @mouseenter=${() => (this._active = addIndex)}
            @click=${() => this.addToken(this._search)}
          >
            ${this.plusIcon()}<span class="option__label">Add "${this._search.trim()}"</span>
          </button>`
        : null}
    </div>`;
  }

  // --- Inline Lucide icons ---
  private chevronIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`;
  }
  private xIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
  }
  private plusIcon() {
    return html`<svg class="option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`;
  }

  static styles = css`
    :host {
      display: block;
      --_field-padding-y: var(--form-padding-y-md, 8px);
      --_field-padding-x: var(--form-padding-x-md, 12px);
      --_field-font-size: var(--form-font-size-md, 14px);
      --_field-min-height: var(--form-height-md, 40px);
      --_field-radius: var(--form-radius-md, 8px);
      --_field-border-color: var(--form-border-color, #d4d4d4);
      --_chip-font-size: var(--type-size-150, 12px);
      /* Chip look — overridable per host (e.g. a neutral squared chip à la Beacon's
         ui-input-tag: gray bg, dark-gray text, small radius). Defaults unchanged. */
      --_chip-bg: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      --_chip-color: var(--color-primary-strong, #3a7c59);
      --_chip-radius: var(--radius-full, 9999px);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--form-padding-y-xs, 2px);
      --_field-padding-x: var(--form-padding-x-xs, 8px);
      --_field-font-size: var(--form-font-size-xs, 11px);
      --_field-min-height: var(--form-height-xs, 28px);
      --_field-radius: var(--form-radius-xs, 4px);
      --_chip-font-size: var(--type-size-100, 11px);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--form-padding-y-sm, 4px);
      --_field-padding-x: var(--form-padding-x-sm, 8px);
      --_field-font-size: var(--form-font-size-sm, 12px);
      --_field-min-height: var(--form-height-sm, 32px);
      --_field-radius: var(--form-radius-sm, 6px);
      --_chip-font-size: var(--type-size-100, 11px);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--form-padding-y-lg, 12px);
      --_field-padding-x: var(--form-padding-x-lg, 16px);
      --_field-font-size: var(--form-font-size-lg, 16px);
      --_field-min-height: var(--form-height-lg, 48px);
      --_field-radius: var(--form-radius-lg, 10px);
      --_chip-font-size: var(--type-size-200, 14px);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-label-color, #525252);
    }
    .field__required {
      color: var(--color-danger-strong, #ce2c31);
      margin-left: 2px;
    }
    .field__hint {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }

    .container {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      min-height: var(--_field-min-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .container:hover:not(.container--disabled) {
      --_field-border-color: var(--form-border-color-hover, #a3a3a3);
    }
    .container:focus-within,
    .container--open {
      --_field-border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }
    .container--disabled {
      background: var(--form-bg-disabled, #efefef);
      cursor: not-allowed;
    }
    .container--disabled:focus-within {
      box-shadow: none;
      --_field-border-color: var(--form-border-color, #d4d4d4);
    }

    .chips {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-100, 4px);
      min-width: 0;
    }
    /* tags-below mode: chips live in their own row under the field */
    .chips--below {
      flex: none;
      padding-top: var(--spacing-100, 4px);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
      padding: 2px var(--spacing-100, 4px) 2px var(--spacing-200, 8px);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_chip-font-size);
      line-height: 1.4;
      background: var(--_chip-bg);
      color: var(--_chip-color);
      border-radius: var(--_chip-radius);
      flex-shrink: 0;
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
      background: var(--color-hover-overlay-strong, rgba(0, 0, 0, 0.06));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }

    .input {
      flex: 1;
      min-width: 80px;
      padding: 0;
      background: transparent;
      border: none;
      outline: none;
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }
    .input:disabled {
      cursor: not-allowed;
      color: var(--color-disabled-text, #a3a3a3);
    }

    .toggle {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--color-text-muted, #737373);
      cursor: pointer;
    }
    .toggle:hover:not(:disabled) {
      color: var(--color-text-secondary, #525252);
    }
    .toggle:disabled {
      cursor: not-allowed;
    }
    .arrow {
      display: inline-flex;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .arrow svg {
      width: var(--icon-size-small, 16px);
      height: var(--icon-size-small, 16px);
    }
    .arrow--open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + var(--spacing-100, 4px));
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      max-height: 252px;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: var(--color-surface, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #e5e5e5);
      border-radius: var(--form-radius-md, 8px);
      box-shadow: var(--shadow-200, 0 4px 12px rgba(0, 0, 0, 0.12));
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      background: transparent;
      border: none;
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--color-text-primary, #171717);
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
      transition: background var(--transition-fast, 150ms ease);
    }
    .option:hover,
    .option--active {
      background: var(--color-surface-sunken, #efefef);
    }
    .option__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .option--add {
      color: var(--color-primary-strong, #3a7c59);
      font-weight: var(--font-weight-medium, 450);
      border-top: var(--form-border-width, 1px) solid var(--color-border-light, #efefef);
    }
    .option__icon {
      width: var(--icon-size-small, 16px);
      height: var(--icon-size-small, 16px);
      flex-shrink: 0;
    }

    .empty {
      padding: var(--spacing-300, 12px);
      color: var(--color-text-muted, #737373);
      font-size: var(--_field-font-size);
      font-style: italic;
      text-align: center;
    }
  `;
}

if (!customElements.get('esa-input-tag')) {
  customElements.define('esa-input-tag', EsaInputTag);
}
