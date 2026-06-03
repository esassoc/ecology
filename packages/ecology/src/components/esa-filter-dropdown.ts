import { LitElement, html, css } from 'lit';

/**
 * esa-filter-dropdown — INTERACTIVE filter control (Lit Web Component).
 *
 * Why a Web Component (not .astro): real behavior — open/close panel, search,
 * keyboard navigation (Arrow/Enter/Escape), single + multi select, and overlay
 * positioning. As a custom element it works in any stack.
 *
 * Faithful translation of the Angular esa-filter-dropdown:
 *   - signal inputs (name/label/options/multiple/placeholder/size) → reactive props
 *   - CDK overlay                                                  → own absolute-positioned panel + outside-click/Escape close
 *   - togglePanel / selectOption / onKeydown / clear               → same logic
 *   - selectionChange output                                       → bubbling `selection-change` CustomEvent
 *   - EsaFilterService.setFilter                                   → bubbling `esa-filter-change` event (parent container coordinates state)
 *
 * Decorator-free on purpose (no per-consumer tsconfig decorator flags).
 */
interface FilterOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export class EsaFilterDropdown extends LitElement {
  static properties = {
    name: { type: String },
    label: { type: String },
    options: { type: Array },
    multiple: { type: Boolean, reflect: true },
    placeholder: { type: String },
    size: { type: String, reflect: true },
    // internal state
    _open: { state: true },
    _searchText: { state: true },
    _selected: { state: true },
    _highlighted: { state: true },
  };

  declare name: string;
  declare label: string;
  declare options: FilterOption[];
  declare multiple: boolean;
  declare placeholder: string;
  declare size: 'small' | 'medium' | 'large';

  declare _open: boolean;
  declare _searchText: string;
  declare _selected: string[];
  declare _highlighted: number;

  private onDocClick = (e: MouseEvent): void => {
    if (this._open && !e.composedPath().includes(this)) {
      this._open = false;
    }
  };

  private onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._open) {
      this._open = false;
    }
  };

  constructor() {
    super();
    this.name = '';
    this.label = '';
    this.options = [];
    this.multiple = false;
    this.placeholder = '';
    this.size = 'medium';
    this._open = false;
    this._searchText = '';
    this._selected = [];
    this._highlighted = -1;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.onDocClick, true);
    document.addEventListener('keydown', this.onDocKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocClick, true);
    document.removeEventListener('keydown', this.onDocKeydown);
  }

  private get filteredOptions(): FilterOption[] {
    const search = this._searchText.toLowerCase();
    if (!search) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(search));
  }

  private get hasSelection(): boolean {
    return this._selected.length > 0;
  }

  private get buttonLabel(): string {
    if (this._selected.length === 0) return this.label;
    const first = this.options.find((o) => o.value === this._selected[0]);
    const firstLabel = first?.label ?? this._selected[0];
    if (this._selected.length === 1) return `${this.label}: ${firstLabel}`;
    return `${this.label}: ${firstLabel} +${this._selected.length - 1}`;
  }

  private isSelected(value: string): boolean {
    return this._selected.includes(value);
  }

  private togglePanel = (): void => {
    const opening = !this._open;
    this._open = opening;
    if (opening) {
      this._highlighted = -1;
      requestAnimationFrame(() => {
        const input = this.renderRoot?.querySelector<HTMLInputElement>('.esa-filter-dropdown__search-input');
        input?.focus();
      });
    }
  };

  private selectOption(option: FilterOption): void {
    if (option.disabled) return;
    const value = option.value;

    if (this.multiple) {
      const idx = this._selected.indexOf(value);
      const next = idx >= 0 ? this._selected.filter((v) => v !== value) : [...this._selected, value];
      this._selected = next;
      this._searchText = '';
      this.emitChange(next);
      requestAnimationFrame(() => {
        const input = this.renderRoot?.querySelector<HTMLInputElement>('.esa-filter-dropdown__search-input');
        input?.focus();
      });
    } else {
      this._selected = [value];
      this._searchText = '';
      this._open = false;
      this.emitChange([value]);
    }
  }

  private onSearchInput = (e: Event): void => {
    this._searchText = (e.target as HTMLInputElement).value;
    this._highlighted = -1;
  };

  private onKeydown = (e: KeyboardEvent): void => {
    const options = this.filteredOptions;
    const max = options.length - 1;
    let idx = this._highlighted;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        idx = idx < max ? idx + 1 : 0;
        while (options[idx]?.disabled && idx < max) idx++;
        this._highlighted = idx;
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = idx > 0 ? idx - 1 : max;
        while (options[idx]?.disabled && idx > 0) idx--;
        this._highlighted = idx;
        break;
      case 'Enter':
        e.preventDefault();
        if (idx >= 0 && idx <= max) this.selectOption(options[idx]);
        break;
      case 'Escape':
        this._open = false;
        break;
    }
  };

  private clear = (e: Event): void => {
    e.stopPropagation();
    this._selected = [];
    this.emitChange([]);
  };

  /** Emit selection-change (for direct listeners) and esa-filter-change (for a parent container). */
  private emitChange(values: string[]): void {
    const payload = this.multiple ? values : (values[0] ?? undefined);
    this.dispatchEvent(
      new CustomEvent('selection-change', { detail: { value: payload }, bubbles: true, composed: true })
    );
    const activeFilters = values.map((v) => {
      const opt = this.options.find((o) => o.value === v);
      return { name: this.name, label: this.label, value: v, displayValue: opt?.label ?? v };
    });
    this.dispatchEvent(
      new CustomEvent('esa-filter-change', {
        detail: { name: this.name, filters: activeFilters },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const options = this.filteredOptions;
    return html`
      <div class="esa-filter-dropdown">
        <button
          class="esa-filter-dropdown__trigger ${this.hasSelection || this._open ? 'esa-filter-dropdown__trigger--active' : ''}"
          type="button"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          @click=${this.togglePanel}
        >
          <span class="esa-filter-dropdown__label">${this.buttonLabel}</span>
          ${this.hasSelection
            ? html`<span
                class="esa-filter-dropdown__clear"
                role="button"
                aria-label="Clear filter"
                @click=${this.clear}
              >${closeIcon}</span>`
            : html`<span
                class="esa-filter-dropdown__arrow ${this._open ? 'esa-filter-dropdown__arrow--open' : ''}"
              >${chevronIcon}</span>`}
        </button>

        ${this._open
          ? html`<div class="esa-filter-dropdown__panel" role="listbox">
              <div class="esa-filter-dropdown__search">
                <input
                  class="esa-filter-dropdown__search-input"
                  type="text"
                  placeholder=${this.placeholder || 'Search...'}
                  .value=${this._searchText}
                  @input=${this.onSearchInput}
                  @keydown=${this.onKeydown}
                  autocomplete="off"
                />
              </div>
              <ul class="esa-filter-dropdown__options" role="listbox">
                ${options.length === 0
                  ? html`<li class="esa-filter-dropdown__option esa-filter-dropdown__option--disabled">
                      No options available
                    </li>`
                  : options.map(
                      (option, i) => html`<li
                        class="esa-filter-dropdown__option
                          ${option.disabled ? 'esa-filter-dropdown__option--disabled' : ''}
                          ${this.isSelected(option.value) ? 'esa-filter-dropdown__option--selected' : ''}
                          ${this._highlighted === i ? 'esa-filter-dropdown__option--highlighted' : ''}"
                        role="option"
                        aria-selected=${this.isSelected(option.value)}
                        aria-disabled=${option.disabled ?? false}
                        @click=${() => this.selectOption(option)}
                      >
                        ${this.multiple
                          ? html`<span
                              class="esa-filter-dropdown__check ${this.isSelected(option.value) ? 'esa-filter-dropdown__check--selected' : ''}"
                              >&#10003;</span
                            >`
                          : null}
                        ${option.label}
                      </li>`
                    )}
              </ul>
            </div>`
          : null}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: inline-block;

      --_filter-height: 40px;
      --_filter-padding-x: var(--spacing-400, 1rem);
      --_filter-font-size: var(--type-size-200, 0.9375rem);
      --_filter-radius: var(--radius-200, 0.5rem);
      --_filter-bg: var(--color-surface, #fff);
      --_filter-bg-active: var(--color-primary, #005862);
      --_filter-text: var(--color-text-primary, #171717);
      --_filter-text-active: var(--color-text-inverse, #fff);
      --_filter-border: var(--color-border, #e5e5e5);
      --_filter-border-active: var(--color-primary, #005862);
    }

    :host([size='small']) {
      --_filter-height: 32px;
      --_filter-padding-x: var(--spacing-300, 0.75rem);
      --_filter-font-size: var(--type-size-150, 0.875rem);
      --_filter-radius: var(--radius-100, 0.25rem);
    }
    :host([size='large']) {
      --_filter-height: 48px;
      --_filter-padding-x: var(--spacing-500, 1.5rem);
      --_filter-font-size: var(--type-size-300, 1.125rem);
      --_filter-radius: var(--radius-300, 0.5rem);
    }

    .esa-filter-dropdown {
      position: relative;
      display: inline-flex;
    }

    .esa-filter-dropdown__trigger {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      height: var(--_filter-height);
      padding-inline: var(--_filter-padding-x);
      border: 1px solid var(--_filter-border);
      border-radius: var(--_filter-radius);
      background: var(--_filter-bg);
      color: var(--_filter-text);
      font-family: var(--font-sans, inherit);
      font-size: var(--_filter-font-size);
      font-weight: var(--font-weight-medium, 450);
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
      -webkit-appearance: none;
      appearance: none;
    }
    .esa-filter-dropdown__trigger:hover:not(.esa-filter-dropdown__trigger--active) {
      border-color: var(--_filter-border-active);
    }
    .esa-filter-dropdown__trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .esa-filter-dropdown__trigger--active {
      background: var(--_filter-bg-active);
      border-color: var(--_filter-border-active);
      color: var(--_filter-text-active);
    }

    .esa-filter-dropdown__label {
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .esa-filter-dropdown__arrow {
      display: inline-flex;
      width: 20px;
      height: 20px;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__arrow svg { width: 20px; height: 20px; }
    .esa-filter-dropdown__arrow--open {
      transform: rotate(180deg);
    }

    .esa-filter-dropdown__clear {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__clear:hover { opacity: 1; }
    .esa-filter-dropdown__clear svg { width: 16px; height: 16px; }

    .esa-filter-dropdown__panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: var(--z-dropdown, 50);
      min-width: var(--filter-dropdown-min-width, 200px);
      max-height: 300px;
      background: var(--filter-dropdown-bg, var(--color-surface, #fff));
      border: var(--filter-dropdown-border, 1px solid var(--color-border, #e5e5e5));
      border-radius: var(--filter-dropdown-radius, var(--radius-200, 0.5rem));
      box-shadow: var(--filter-dropdown-shadow, var(--shadow-200, 0 4px 20px -4px rgba(0, 0, 0, 0.06)));
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .esa-filter-dropdown__search {
      padding: var(--spacing-200, 0.5rem);
      border-bottom: 1px solid var(--color-border, #e5e5e5);
    }
    .esa-filter-dropdown__search-input {
      width: 100%;
      box-sizing: border-box;
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: var(--radius-100, 0.25rem);
      font-family: var(--font-sans, inherit);
      font-size: var(--_filter-font-size);
      background: var(--color-surface, #fff);
      color: var(--color-text-primary, #171717);
      outline: none;
    }
    .esa-filter-dropdown__search-input:focus {
      border-color: var(--color-primary, #005862);
      box-shadow: 0 0 0 1px var(--color-primary, #005862);
    }

    .esa-filter-dropdown__options {
      list-style: none;
      margin: 0;
      padding: var(--spacing-100, 0.25rem) 0;
      overflow-y: auto;
      max-height: 240px;
    }
    .esa-filter-dropdown__option {
      display: flex;
      align-items: center;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      font-size: var(--_filter-font-size);
      font-family: var(--font-sans, inherit);
      color: var(--color-text-primary, #171717);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__option:hover:not(.esa-filter-dropdown__option--disabled) {
      background: var(--color-hover-overlay, rgba(0, 0, 0, 0.03));
    }
    .esa-filter-dropdown__option--highlighted:not(.esa-filter-dropdown__option--disabled) {
      background: var(--color-hover-overlay-strong, rgba(0, 0, 0, 0.05));
    }
    .esa-filter-dropdown__option--selected {
      font-weight: var(--font-weight-medium, 450);
      color: var(--color-primary, #005862);
    }
    .esa-filter-dropdown__option--disabled {
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    }

    .esa-filter-dropdown__check {
      display: inline-block;
      width: 1em;
      margin-inline-end: var(--spacing-100, 0.25rem);
      opacity: 0;
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .esa-filter-dropdown__check--selected { opacity: 1; }
  `;
}

const chevronIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>`;
const closeIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>`;

if (!customElements.get('esa-filter-dropdown')) {
  customElements.define('esa-filter-dropdown', EsaFilterDropdown);
}
