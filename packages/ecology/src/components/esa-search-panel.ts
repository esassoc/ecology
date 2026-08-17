import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { announce } from '../announcer.js';

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
  /** The record's name. e.g. "Wetland delineation report", "Jane Doe". */
  title: string;
  /**
   * The record's distinguishing attribute — status, type, role, or a related
   * identifier. e.g. "Project 2024-118", "Draft", "Compliance officer".
   */
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
    name: { type: String, reflect: true },
    hasSearched: { type: Boolean, state: true },
  };

  declare open: boolean;
  declare placeholder: string;
  declare results: EsaSearchResult[];
  declare loading: boolean;
  declare position: 'right' | 'left';
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
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

  /**
   * Announce only the transition INTO no-results. See esa-combobox.announceEmptyResults
   * for the reasoning — the cue sets the expectation, so a per-keystroke count would be
   * noise, but a dry query has no other signal for someone who cannot see the list.
   *
   * Gated on `hasSearched` so the panel does not announce "no results" the moment it
   * opens, before anyone has typed anything.
   */
  private wasEmpty = false;
  private announceEmptyResults(): void {
    const isEmpty =
      this.open && this.hasSearched && !this.loading && (this.results?.length ?? 0) === 0;
    if (isEmpty && !this.wasEmpty) announce('No results found', { assertive: true });
    this.wasEmpty = isEmpty;
  }

  updated(changed: Map<string, unknown>): void {
    this.announceEmptyResults();
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
            <!-- The input had no accessible name — only a placeholder, which is not
                 a name and disappears once you type. The cue is what makes announcing
                 the result list on every keystroke unnecessary. -->
            <input
              class="input typography-microcopy-md-subtle"
              type="text"
              aria-label=${this.placeholder || 'Search'}
              aria-describedby="cue"
              placeholder=${this.placeholder}
              autocomplete="off"
              @input=${this.onSearch}
            />
            <span class="visually-hidden" id="cue"
              >Results appear below as you type. Escape closes the panel.</span
            >
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
          ${group.category
            ? html`<div class="category typography-eyebrow-md">${group.category}</div>`
            : null}
          ${group.items.map(
            (item) => html`
              <button class="result typography-body-sm" @click=${() => this.selectResult(item)}>
                ${item.icon ? dotIcon(16) : null}
                <div class="result-content">
                  <span class="result-title typography-label-sm">${item.title}</span>
                  ${item.subtitle
                    ? html`<span class="result-subtitle typography-body-xs">${item.subtitle}</span>`
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

  static styles = [
    typography,
    a11y,
    css`
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.3));
      z-index: var(--z-modal-backdrop, 300);
    }

    .panel {
      position: fixed;
      top: 0;
      bottom: 0;
      width: var(--search-panel-width, 400px);
      max-width: 90vw;
      background: var(--color-background-elevation-floating, #fcfcfc);
      box-shadow: var(--elevation-5, -4px 0 24px rgba(0, 0, 0, 0.1));
      z-index: var(--z-modal, 400);
      display: flex;
      flex-direction: column;
    }

    .panel--right {
      right: 0;
      animation: esa-search-slide-in-right var(--animation-overlay-enter, 250ms ease-out);
    }

    .panel--left {
      left: 0;
      box-shadow: var(--elevation-5, 4px 0 24px rgba(0, 0, 0, 0.1));
      animation: esa-search-slide-in-left var(--animation-overlay-enter, 250ms ease-out);
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
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-300, 12px) var(--spacing-400, 16px);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      color: var(--color-content-default-muted, #838383);
    }

    /* The ring goes on the search BOX, not the input — the input is chromeless, so
       a ring on it would float around bare text. :focus-within rather than
       :focus-visible because this is text entry, where a ring on click is native
       behaviour and wanted. Inset so it cannot collide with the close button that
       shares the header row. */
    .search-box:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
      border-radius: var(--radius-sm, 0.25rem);
    }

    .input {
      flex: 1;
      border: none;
      /* Suppressed only because .search-box paints the ring — never bare. */
      outline: none;
      font-family: inherit;
      color: var(--color-content-default, #202020);
      background: transparent;
    }

    .input::placeholder {
      color: var(--color-content-default-muted, #838383);
    }

    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default-secondary, #646464);
      cursor: pointer;
    }

    .close:hover {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-200, 8px);
    }

    .category {
      padding: var(--spacing-300, 12px) var(--spacing-200, 8px) var(--spacing-100, 4px);
      color: var(--color-content-default-muted, #838383);
    }

    .result {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 12px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default, #202020);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }

    .result:hover {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .result-content {
      display: flex;
      flex-direction: column;
    }

    .result-subtitle {
      color: var(--color-content-default-muted, #838383);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-700, 48px) var(--spacing-400, 16px);
      color: var(--color-content-default-muted, #838383);
      text-align: center;
    }

    .loading {
      padding: var(--spacing-500, 24px);
      text-align: center;
      color: var(--color-content-default-muted, #838383);
    }

    /* FORCED COLORS. The panel is flush to the viewport edge with no radius, so
       only the INBOARD edge carries meaning — but that is the edge the shadow was
       drawing, and box-shadow is forced to 'none'. A full border is simpler than
       a side-specific one and costs nothing: the outboard edges are off-screen. */
    @media (forced-colors: active) {
      .panel { border: 1px solid CanvasText; }
    }
  `,
  ];
}

if (!customElements.get('esa-search-panel')) {
  customElements.define('esa-search-panel', EsaSearchPanel);
}
