import { LitElement, html, css, nothing } from 'lit';

interface EsaComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}
type EsaComboboxMode = 'autocomplete' | 'select';
type EsaComboboxTriggerStyle = 'field' | 'text';

/**
 * esa-combobox — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-combobox:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - two modes: 'autocomplete' (input trigger) / 'select' (button trigger w/ in-panel search)
 *   - two trigger styles: 'field' (bordered) / 'text' (link-like)
 *   - multi-select chips, search filter + match highlight, loading spinner, results count
 *   - debounced `search` event, `change` event on selection — same key logic
 *
 * SIMPLIFIED vs Angular: the CDK Overlay + cdk-virtual-scroll-viewport are replaced
 * by a plain absolutely-positioned panel with a max-height scroll area. All public
 * behavior (filtering, keyboard nav, selection, value binding, debounced search,
 * highlight, loading/empty/count) is preserved; only the virtual-scroll/overlay
 * implementation detail changed. Outside-click closes the panel.
 *
 * Keyboard: ArrowDown/Up navigate, Enter selects, Escape & Tab close.
 */
export class EsaCombobox extends LitElement {
  static formAssociated = true;

  static properties = {
    mode: { type: String, reflect: true },
    triggerStyle: { type: String, attribute: 'trigger-style' },
    options: { type: Array },
    multiple: { type: Boolean },
    size: { type: String, reflect: true },
    label: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    loading: { type: Boolean },
    debounceMs: { type: Number, attribute: 'debounce-ms' },
    resultsCount: { type: Number, attribute: 'results-count' },
    _search: { state: true },
    _selected: { state: true },
    _open: { state: true },
    _active: { state: true },
  };

  declare mode: EsaComboboxMode;
  declare triggerStyle: EsaComboboxTriggerStyle;
  declare options: EsaComboboxOption[];
  declare multiple: boolean;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare label: string;
  declare placeholder: string;
  declare disabled: boolean;
  declare required: boolean;
  declare helpText: string;
  declare errorText: string;
  declare loading: boolean;
  declare debounceMs: number;
  declare resultsCount: number | null;
  private declare _search: string;
  private declare _selected: string[];
  private declare _open: boolean;
  private declare _active: number;
  private _suppressNextOpen = false;

  private internals: ElementInternals;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEmittedSearch = '';
  private onDocClick = (e: MouseEvent): void => {
    if (!this._open) return;
    if (!e.composedPath().includes(this)) this.closeDropdown();
  };

  constructor() {
    super();
    this.mode = 'select';
    this.triggerStyle = 'field';
    this.options = [];
    this.multiple = false;
    this.size = 'md';
    this.label = '';
    this.placeholder = 'Select...';
    this.disabled = false;
    this.required = false;
    this.helpText = '';
    this.errorText = '';
    this.loading = false;
    this.debounceMs = 300;
    this.resultsCount = null;
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
    if (this.searchTimer) clearTimeout(this.searchTimer);
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

  // --- Computed getters ---

  private get filteredOptions(): EsaComboboxOption[] {
    const search = this._search.toLowerCase();
    if (!search) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(search));
  }

  private get displayValue(): string {
    if (this._selected.length === 0) return '';
    if (this.multiple) {
      return this.options
        .filter((o) => this._selected.includes(o.value))
        .map((o) => o.label)
        .join(', ');
    }
    const opt = this.options.find((o) => o.value === this._selected[0]);
    return opt?.label ?? '';
  }

  private get selectedOptions(): EsaComboboxOption[] {
    return this.options.filter((o) => this._selected.includes(o.value));
  }

  private get currentPlaceholder(): string {
    if (this.multiple && this._selected.length > 0) return '';
    return this.placeholder;
  }

  private get inputValue(): string {
    if (this.multiple) return this._search;
    return this._search || this.displayValue;
  }

  private isSelected(value: string): boolean {
    return this._selected.includes(value);
  }

  // --- Form / events ---

  private syncFormValue(): void {
    this.internals.setFormValue(this.multiple ? this._selected.join(',') : (this._selected[0] ?? null));
  }

  private emitValue(): void {
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  }

  /** Debounced 'search' event (mirrors Angular's debounceTime + distinctUntilChanged). */
  private emitSearch(term: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (term === this.lastEmittedSearch) return;
      this.lastEmittedSearch = term;
      this.dispatchEvent(
        new CustomEvent('search', { detail: { term }, bubbles: true, composed: true })
      );
    }, this.debounceMs);
  }

  // --- Open / close ---

  private toggleDropdown(): void {
    if (this.disabled) return;
    this._open ? this.closeDropdown() : this.openDropdown();
  }

  private openDropdown(): void {
    if (this.disabled || this._open) return;
    this._open = true;
    this._active = -1;
    if (this.mode === 'select') {
      requestAnimationFrame(() => {
        (this.renderRoot.querySelector('.search-input') as HTMLInputElement | null)?.focus();
      });
    }
  }

  private closeDropdown(): void {
    if (!this._open) return;
    this._open = false;
    this._search = '';
  }

  // --- Selection ---

  private selectOption(option: EsaComboboxOption): void {
    if (option.disabled) return;
    const value = option.value;
    if (this.multiple) {
      const idx = this._selected.indexOf(value);
      this._selected = idx >= 0 ? this._selected.filter((v) => v !== value) : [...this._selected, value];
      this._search = '';
      this.emitValue();
      const sel = this.mode === 'autocomplete' ? '.input' : '.search-input';
      requestAnimationFrame(() => (this.renderRoot.querySelector(sel) as HTMLInputElement | null)?.focus());
    } else {
      this._selected = [value];
      this._search = '';
      this.emitValue();
      this.closeDropdown();
      if (this.mode === 'autocomplete') {
        this._suppressNextOpen = true; // hub-edit-approved: user approved fix for mouse-select dropdown reopen bug
        requestAnimationFrame(() => (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus());
      }
    }
  }

  private removeValue(value: string, event?: Event): void {
    event?.stopPropagation();
    this._selected = this._selected.filter((v) => v !== value);
    this.emitValue();
  }

  // --- Input handlers ---

  private onSearchInput = (event: Event): void => {
    const val = (event.target as HTMLInputElement).value;
    this._search = val;
    this._active = -1;
    this.emitSearch(val);
    if (!this._open) this.openDropdown();
  };

  private onInputFocus = (): void => {
    if (this._suppressNextOpen) { this._suppressNextOpen = false; return; }
    if (!this._open) this.openDropdown();
  };

  // clicking an already-focused autocomplete input must reopen the dropdown —
  // focus doesn't re-fire when the element already has focus, so @focus alone
  // misses the "click after select" case.
  private onInputClick = (): void => {
    if (!this._open) this.openDropdown();
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
        this.closeDropdown();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  };

  // --- Highlight (mirrors EsaHighlightPipe) ---
  private highlight(label: string) {
    const term = this._search.trim();
    if (!term) return html`${label}`;
    const lower = label.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx < 0) return html`${label}`;
    return html`${label.slice(0, idx)}<mark class="hl">${label.slice(idx, idx + term.length)}</mark>${label.slice(
      idx + term.length
    )}`;
  }

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
          ${this.mode === 'autocomplete' ? this.renderAutocomplete() : this.renderSelect()}
          ${this._open ? this.renderDropdown() : null}
        </div>

        ${hasError
          ? html`<span class="field__error">${this.errorText}</span>`
          : this.helpText
            ? html`<span class="field__help">${this.helpText}</span>`
            : null}
      </div>
    `;
  }

  private renderAutocomplete() {
    return html`
      ${this.multiple ? this.renderChips() : null}
      <div class="input-wrapper">
        <input
          class="input"
          role="combobox"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder=${this.currentPlaceholder}
          .value=${this.inputValue}
          ?disabled=${this.disabled}
          @input=${this.onSearchInput}
          @keydown=${this.onKeydown}
          @focus=${this.onInputFocus}
          @click=${this.onInputClick}
        />
        ${this.loading ? html`<span class="spinner spinner--inline">${this.spinnerIcon()}</span>` : null}
      </div>
    `;
  }

  private renderSelect() {
    const isField = this.triggerStyle === 'field';
    return html`
      ${this.multiple && isField ? this.renderChips() : null}
      <button
        type="button"
        class="trigger ${isField ? 'trigger--field' : 'trigger--text'}"
        ?disabled=${this.disabled}
        @click=${() => this.toggleDropdown()}
        @keydown=${this.onKeydown}
      >
        <span class="trigger__label">${this.displayValue || this.placeholder}</span>
        <span class="arrow ${this._open ? 'arrow--open' : ''}">${this.chevronIcon()}</span>
      </button>
    `;
  }

  private renderChips() {
    if (this.selectedOptions.length === 0) return nothing;
    return html`<div class="chips">
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
    </div>`;
  }

  private renderDropdown() {
    const opts = this.filteredOptions;
    return html`<div class="dropdown" role="listbox" @keydown=${this.onKeydown}>
      ${this.mode === 'select'
        ? html`<div class="search">
            ${this.searchIcon()}
            <input
              class="search-input"
              placeholder="Search..."
              .value=${this._search}
              @input=${this.onSearchInput}
              @keydown=${this.onKeydown}
            />
            ${this.loading ? html`<span class="spinner">${this.spinnerIcon()}</span>` : null}
          </div>`
        : null}

      ${this.resultsCount !== null
        ? html`<div class="results-count">Displaying ${opts.length} of ${this.resultsCount} results</div>`
        : null}

      <div class="viewport">
        ${opts.map((option, i) => {
          const selected = this.isSelected(option.value);
          return html`<div
            class="option ${i === this._active ? 'option--active' : ''} ${selected
              ? 'option--selected'
              : ''} ${option.disabled ? 'option--disabled' : ''}"
            role="option"
            aria-selected=${selected}
            @click=${() => this.selectOption(option)}
            @mouseenter=${() => (this._active = i)}
          >
            ${this.multiple
              ? html`<span class="check ${selected ? 'check--selected' : ''}">${this.checkIcon()}</span>`
              : null}
            <span class="option__label">${this.highlight(option.label)}</span>
          </div>`;
        })}
      </div>

      ${opts.length === 0 && !this.loading
        ? html`<div class="empty">${this._search ? 'No results found' : 'No options available'}</div>`
        : null}
      ${this.loading && opts.length === 0
        ? html`<div class="loading"><span class="spinner">${this.spinnerIcon()}</span> Searching...</div>`
        : null}
    </div>`;
  }

  // --- Inline Lucide icons ---
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
  private searchIcon() {
    return html`<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>`;
  }
  private spinnerIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`;
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
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium, 450);
      color: var(--form-label-color, #171717);
    }
    .field__required {
      color: var(--color-danger, #ef4444);
      margin-left: 2px;
    }
    .field__help {
      font-size: var(--type-size-150, 12px);
      color: var(--form-help-color, #737373);
    }
    .field__error {
      font-size: var(--type-size-150, 12px);
      color: var(--form-error-color, #ef4444);
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

    .spinner {
      display: inline-flex;
      color: var(--color-text-muted, #737373);
      animation: esa-cb-spin 1s linear infinite;
    }
    .spinner svg {
      width: var(--icon-size-small, 16px);
      height: var(--icon-size-small, 16px);
    }
    .spinner--inline {
      position: absolute;
      right: var(--_field-padding-x);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    @keyframes esa-cb-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .spinner--inline {
      animation: esa-cb-spin-inline 1s linear infinite;
    }
    @keyframes esa-cb-spin-inline {
      from {
        transform: translateY(-50%) rotate(0deg);
      }
      to {
        transform: translateY(-50%) rotate(360deg);
      }
    }

    .trigger--text {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: 0;
      border: none;
      background: none;
      color: var(--color-primary, #43608a);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      font-weight: var(--font-weight-medium, 450);
      cursor: pointer;
      max-width: 100%;
    }
    .trigger--text:hover {
      color: var(--color-primary-hover, #39506f);
      text-decoration: underline;
    }
    .trigger--text:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 2px;
      border-radius: var(--_field-radius);
    }
    .trigger--text:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .trigger--text .trigger__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger--field {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--_field-height);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
      background: var(--form-bg, #fff);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      cursor: pointer;
      text-align: left;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .trigger--field:focus-visible {
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
      outline: none;
    }
    .trigger--field:disabled {
      background: var(--form-bg-disabled, #efefef);
      opacity: 0.6;
      cursor: not-allowed;
    }
    .trigger--field .trigger__label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .arrow {
      display: inline-flex;
      color: var(--color-text-muted, #737373);
      pointer-events: none;
      transition: transform var(--transition-fast, 150ms ease);
      flex-shrink: 0;
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
      top: 100%;
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      margin-top: var(--spacing-100, 4px);
      background: var(--color-surface, #fff);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #e5e5e5);
      border-radius: var(--form-radius-md, 8px);
      box-shadow: var(--shadow-200, 0 4px 12px rgba(0, 0, 0, 0.12));
      overflow: hidden;
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border-bottom: 1px solid var(--color-border, #e5e5e5);
    }
    .search__icon {
      width: var(--icon-size-small, 16px);
      height: var(--icon-size-small, 16px);
      color: var(--color-text-muted, #737373);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-family: var(--font-sans, sans-serif);
      font-size: var(--_field-font-size);
      color: var(--form-text-color, #171717);
    }
    .search-input::placeholder {
      color: var(--form-placeholder-color, #737373);
    }

    .results-count {
      padding: var(--spacing-100, 4px) var(--spacing-300, 12px);
      font-size: var(--type-size-100, 11px);
      color: var(--color-text-muted, #737373);
      border-bottom: 1px solid var(--color-border-light, #efefef);
    }

    .viewport {
      max-height: 252px;
      overflow-y: auto;
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
      box-sizing: border-box;
    }
    .option:hover,
    .option--active {
      background: var(--color-surface-sunken, #efefef);
    }
    .option--selected {
      background: var(--color-active-overlay, rgba(0, 88, 98, 0.08));
      color: var(--color-primary, #43608a);
    }
    .option--disabled {
      color: var(--color-disabled-text, #a3a3a3);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .option--disabled:hover {
      background: transparent;
    }
    .option__label {
      flex: 1;
    }
    .hl {
      background: var(--color-warning-subtle, #fffbeb);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }

    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0;
      color: var(--color-primary, #43608a);
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
      color: var(--color-primary, #43608a);
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
      color: var(--color-primary, #43608a);
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

    .empty,
    .loading {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-300, 12px);
      color: var(--color-text-muted, #737373);
      font-size: var(--_field-font-size);
      font-style: italic;
    }

    .field--error .input,
    .field--error .trigger--field {
      --_field-border-color: var(--form-border-color-error, #ef4444);
    }
    .field--error .input:focus,
    .field--error .trigger--field:focus-visible {
      box-shadow: 0 0 0 2px var(--color-danger-border, rgba(211, 47, 47, 0.25));
    }
  `;
}

if (!customElements.get('esa-combobox')) {
  customElements.define('esa-combobox', EsaCombobox);
}
