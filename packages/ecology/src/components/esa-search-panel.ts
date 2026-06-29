import { LitElement, html, css } from 'lit';

/**
 * esa-search-panel — interactive Lit Web Component.
 *
 * Faithful translation of the Angular esa-search-panel (overlays entry point):
 *   - Angular signal inputs (placeholder/results/loading/position) → Lit properties
 *   - two-way `open` model                                         → reflected `open` attribute + `open-change` event
 *   - searchChange / resultSelect outputs                          → bubbling/composed CustomEvents
 *   - groupedResults computed                                      → grouping helper in render()
 *   - effect() auto-focus on open                                  → updated() lifecycle focus
 *
 * It carries a search value, so it is form-associated: the current query is mirrored
 * to the owning form via ElementInternals, alongside a bubbling `search` CustomEvent.
 *
 * Overlay is positioned with plain CSS (position: fixed) — no Angular CDK. Esc closes,
 * the backdrop closes on click, and focus moves to the input when the panel opens.
 *
 * Decorator-free on purpose: avoids per-consumer tsconfig decorator flags.
 */

export interface EsaSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  category?: string;
  url?: string;
}

interface GroupedResults {
  category: string;
  items: EsaSearchResult[];
}

// Inline Lucide SVGs (search, x) — no icon dependency.
const searchIcon = (size: number) => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>
`;

const xIcon = (size: number) => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18"></path>
    <path d="m6 6 12 12"></path>
  </svg>
`;

// Minimal stroke-icon renderer for per-result icons that match a known Lucide name.
const dotIcon = (size: number) => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;

export class EsaSearchPanel extends LitElement {
  static formAssociated = true;

  static properties = {
    open: { type: Boolean, reflect: true },
    placeholder: { type: String },
    results: { type: Array },
    loading: { type: Boolean, reflect: true },
    position: { type: String, reflect: true },
    hasSearched: { type: Boolean, state: true },
  };

  declare open: boolean;
  declare placeholder: string;
  declare results: EsaSearchResult[];
  declare loading: boolean;
  declare position: 'right' | 'left';
  declare hasSearched: boolean;

  private internals: ElementInternals;
  private query = '';

  constructor() {
    super();
    this.open = false;
    this.placeholder = 'Search...';
    this.results = [];
    this.loading = false;
    this.position = 'right';
    this.hasSearched = false;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(this.query || null);
  }

  /** Group results by category, preserving insertion order. */
  private get groupedResults(): GroupedResults[] {
    const groupMap = new Map<string, EsaSearchResult[]>();
    for (const item of this.results ?? []) {
      const key = item.category ?? '';
      const list = groupMap.get(key) ?? [];
      list.push(item);
      groupMap.set(key, list);
    }
    return Array.from(groupMap.entries()).map(([category, items]) => ({ category, items }));
  }

  updated(changed: Map<string, unknown>): void {
    // Auto-focus the input + reset search state when the panel opens.
    if (changed.has('open')) {
      if (this.open) {
        this.hasSearched = false;
        // Wait a tick so the input is rendered before focusing.
        requestAnimationFrame(() => {
          const input = this.renderRoot.querySelector<HTMLInputElement>('.input');
          input?.focus();
        });
      }
    }
  }

  private onSearch = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    this.query = value;
    this.hasSearched = value.length > 0;
    this.internals.setFormValue(value || null);
    this.dispatchEvent(
      new CustomEvent('search', { detail: { value }, bubbles: true, composed: true })
    );
  };

  private selectResult = (result: EsaSearchResult): void => {
    this.dispatchEvent(
      new CustomEvent('result-select', { detail: result, bubbles: true, composed: true })
    );
  };

  private close = (): void => {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('open-change', { detail: { open: false }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  };

  render() {
    if (!this.open) return html``;

    return html`
      <div class="backdrop" @click=${this.close}></div>
      <aside
        class="panel panel--${this.position}"
        role="search"
        @keydown=${this.onKeydown}
      >
        <div class="header">
          <div class="search-box">
            ${searchIcon(20)}
            <input
              class="input"
              type="text"
              placeholder=${this.placeholder}
              autocomplete="off"
              @input=${this.onSearch}
            />
          </div>
          <button class="close" @click=${this.close} aria-label="Close search">
            ${xIcon(20)}
          </button>
        </div>
        <div class="body">${this.renderBody()}</div>
      </aside>
    `;
  }

  private renderBody() {
    if (this.loading) {
      return html`<div class="loading">Searching...</div>`;
    }
    if ((this.results?.length ?? 0) > 0) {
      return this.groupedResults.map(
        (group) => html`
          ${group.category ? html`<div class="category">${group.category}</div>` : null}
          ${group.items.map(
            (item) => html`
              <button class="result" @click=${() => this.selectResult(item)}>
                ${item.icon ? dotIcon(16) : null}
                <div class="result-content">
                  <span class="result-title">${item.title}</span>
                  ${item.subtitle
                    ? html`<span class="result-subtitle">${item.subtitle}</span>`
                    : null}
                </div>
              </button>
            `
          )}
        `
      );
    }
    if (this.hasSearched) {
      return html`
        <div class="empty">
          ${searchIcon(24)}
          <p>No results found</p>
        </div>
      `;
    }
    return null;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop);
      z-index: var(--z-modal-backdrop);
    }

    .panel {
      position: fixed;
      top: 0;
      bottom: 0;
      width: var(--search-panel-width);
      max-width: 90vw;
      background: var(--search-panel-bg);
      box-shadow: var(--search-panel-shadow, var(--shadow-400));
      z-index: var(--z-modal);
      display: flex;
      flex-direction: column;
    }

    .panel--right {
      right: 0;
      animation: esa-search-slide-in-right 200ms ease-out;
    }

    .panel--left {
      left: 0;
      box-shadow: var(--search-panel-shadow, var(--shadow-400));
      animation: esa-search-slide-in-left 200ms ease-out;
    }

    @keyframes esa-search-slide-in-right {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes esa-search-slide-in-left {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--spacing-200);
      padding: var(--spacing-300) var(--spacing-400);
      border-bottom: 1px solid var(--color-border-light);
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--spacing-200);
      color: var(--color-text-muted);
    }

    .input {
      flex: 1;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: 1rem;
      color: var(--color-text-primary);
      background: transparent;
    }

    .input::placeholder {
      color: var(--color-text-muted);
    }

    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-200);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .close:hover {
      background: var(--color-surface-sunken);
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-200);
    }

    .category {
      padding: var(--spacing-300) var(--spacing-200) var(--spacing-100);
      font-size: 0.6875rem;
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-wide);
      color: var(--color-text-muted);
    }

    .result {
      display: flex;
      align-items: center;
      gap: var(--spacing-300);
      width: 100%;
      padding: var(--spacing-200) var(--spacing-300);
      border: none;
      border-radius: var(--radius-200);
      background: transparent;
      color: var(--color-text-primary);
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      text-align: left;
    }

    .result:hover {
      background: var(--search-panel-result-bg-hover);
    }

    .result-content {
      display: flex;
      flex-direction: column;
    }

    .result-title {
      font-weight: var(--font-weight-medium);
    }

    .result-subtitle {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-200);
      padding: var(--spacing-700) var(--spacing-400);
      color: var(--color-text-muted);
      text-align: center;
    }

    .loading {
      padding: var(--spacing-500);
      text-align: center;
      color: var(--color-text-muted);
    }
  `;
}

if (!customElements.get('esa-search-panel')) {
  customElements.define('esa-search-panel', EsaSearchPanel);
}
