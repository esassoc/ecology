import { LitElement, html, css } from 'lit';

/**
 * esa-pagination — Lit Web Component.
 *
 * Why a Web Component (not .astro): page navigation is pure runtime state —
 * current page, prev/next/first/last, page-size selection, and the derived
 * "1 – 25 of 100" range label. Not a form control (no ElementInternals); it
 * emits events instead.
 *
 * Faithful translation of the Angular esa-pagination:
 *   - inputs (totalItems, pageSize, pageSizeOptions, …) → reactive properties
 *   - model(currentPage)/model(pageSize)               → properties + events
 *   - computed totalPages / rangeLabel / isFirst/Last  → getters
 *   - (pageChange)/(pageSizeChange) outputs            → bubbling CustomEvents
 *
 * Decorator-free on purpose. Lucide chevron icons inlined as SVG.
 */
const ICON_FIRST =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 18-6-6 6-6"/><path d="M7 6v12"/></svg>';
const ICON_PREV =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_NEXT =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
const ICON_LAST =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 18 6-6-6-6"/><path d="M17 6v12"/></svg>';

export class EsaPagination extends LitElement {
  static properties = {
    totalItems: { type: Number, attribute: 'total-items' },
    pageSize: { type: Number, attribute: 'page-size' },
    currentPage: { type: Number, attribute: 'current-page' },
    pageSizeOptions: { type: Array, attribute: 'page-size-options' },
    showPageSizeSelector: { type: Boolean, attribute: 'show-page-size-selector' },
    showFirstLastButtons: { type: Boolean, attribute: 'show-first-last-buttons' },
    disabled: { type: Boolean, reflect: true },
  };

  declare totalItems: number;
  declare pageSize: number;
  declare currentPage: number;
  declare pageSizeOptions: number[];
  declare showPageSizeSelector: boolean;
  declare showFirstLastButtons: boolean;
  declare disabled: boolean;

  constructor() {
    super();
    this.totalItems = 0;
    this.pageSize = 25;
    this.currentPage = 0;
    this.pageSizeOptions = [10, 25, 50, 100];
    this.showPageSizeSelector = true;
    this.showFirstLastButtons = true;
    this.disabled = false;
  }

  private get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  private get rangeLabel(): string {
    const total = this.totalItems;
    if (total === 0) return '0 of 0';
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, total);
    return `${start} – ${end} of ${total.toLocaleString()}`;
  }

  private get isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  private get isLastPage(): boolean {
    return this.currentPage >= this.totalPages - 1;
  }

  private emitPageChange(page: number): void {
    this.currentPage = page;
    this.dispatchEvent(
      new CustomEvent('pagechange', { detail: { page }, bubbles: true, composed: true })
    );
  }

  private goToFirst = (): void => {
    if (this.disabled || this.isFirstPage) return;
    this.emitPageChange(0);
  };
  private goToPrevious = (): void => {
    if (this.disabled || this.isFirstPage) return;
    this.emitPageChange(this.currentPage - 1);
  };
  private goToNext = (): void => {
    if (this.disabled || this.isLastPage) return;
    this.emitPageChange(this.currentPage + 1);
  };
  private goToLast = (): void => {
    if (this.disabled || this.isLastPage) return;
    this.emitPageChange(this.totalPages - 1);
  };

  private onPageSizeChange = (event: Event): void => {
    const newSize = Number((event.target as HTMLSelectElement).value);
    if (isNaN(newSize) || this.disabled) return;
    this.pageSize = newSize;
    this.dispatchEvent(
      new CustomEvent('pagesizechange', {
        detail: { pageSize: newSize },
        bubbles: true,
        composed: true,
      })
    );
    // Reset to first page when page size changes (mirrors Angular behavior).
    this.emitPageChange(0);
  };

  render() {
    return html`
      <div class="container ${this.disabled ? 'container--disabled' : ''}" role="navigation" aria-label="Pagination">
        ${this.showPageSizeSelector && this.pageSizeOptions.length > 0
          ? html`<div class="page-size">
              <label class="page-size-label" for="esa-page-size">Items per page:</label>
              <select
                class="page-size-select"
                id="esa-page-size"
                .value=${String(this.pageSize)}
                ?disabled=${this.disabled}
                @change=${this.onPageSizeChange}
              >
                ${this.pageSizeOptions.map(
                  (opt) => html`<option value=${opt} ?selected=${opt === this.pageSize}>${opt}</option>`
                )}
              </select>
            </div>`
          : null}

        <span class="range">${this.rangeLabel}</span>

        <div class="buttons">
          ${this.showFirstLastButtons
            ? html`<button class="button" type="button" aria-label="First page" ?disabled=${this.disabled || this.isFirstPage} @click=${this.goToFirst}>
                <span class="ic" .innerHTML=${ICON_FIRST}></span>
              </button>`
            : null}
          <button class="button" type="button" aria-label="Previous page" ?disabled=${this.disabled || this.isFirstPage} @click=${this.goToPrevious}>
            <span class="ic" .innerHTML=${ICON_PREV}></span>
          </button>
          <button class="button" type="button" aria-label="Next page" ?disabled=${this.disabled || this.isLastPage} @click=${this.goToNext}>
            <span class="ic" .innerHTML=${ICON_NEXT}></span>
          </button>
          ${this.showFirstLastButtons
            ? html`<button class="button" type="button" aria-label="Last page" ?disabled=${this.disabled || this.isLastPage} @click=${this.goToLast}>
                <span class="ic" .innerHTML=${ICON_LAST}></span>
              </button>`
            : null}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      --_pagination-bg: var(--pagination-bg, var(--color-surface, #ffffff));
      --_pagination-border-color: var(--pagination-border-color, var(--color-border, rgba(0, 0, 0, 0.12)));
      --_pagination-text-color: var(--pagination-text-color, var(--color-text-secondary, #525252));
      --_pagination-font-size: var(--pagination-font-size, var(--type-size-200, 14px));
      --_pagination-button-color: var(--pagination-button-color, var(--color-text-primary, #171717));
      --_pagination-button-disabled-color: var(--color-disabled-text, #bdbdbd);
      --_pagination-button-hover-bg: var(--color-hover-overlay, rgba(0, 0, 0, 0.04));
      --_pagination-padding-x: var(--pagination-padding-x, var(--spacing-400, 16px));
      --_pagination-padding-y: var(--pagination-padding-y, var(--spacing-200, 8px));

      display: block;
    }

    .container {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-400, 16px);
      min-height: 40px;
      padding: var(--_pagination-padding-y) var(--_pagination-padding-x);
      background: var(--_pagination-bg);
      border-top: 1px solid var(--_pagination-border-color);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: var(--_pagination-font-size);
      color: var(--_pagination-text-color);
    }
    .container--disabled { opacity: 0.6; pointer-events: none; }

    .page-size { display: flex; align-items: center; gap: var(--spacing-200, 8px); }
    .page-size-label {
      white-space: nowrap;
      color: var(--_pagination-text-color);
      font-size: var(--_pagination-font-size);
    }
    .page-size-select {
      padding: var(--spacing-100, 4px) var(--spacing-200, 8px);
      border: 1px solid var(--_pagination-border-color);
      border-radius: var(--radius-100, 4px);
      background: var(--_pagination-bg);
      color: var(--_pagination-text-color);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: var(--_pagination-font-size);
      cursor: pointer;
      appearance: auto;
    }
    .page-size-select:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .page-size-select:disabled { cursor: default; opacity: 0.5; }

    .range {
      white-space: nowrap;
      color: var(--_pagination-text-color);
      font-size: var(--_pagination-font-size);
    }

    .buttons { display: flex; align-items: center; gap: var(--spacing-100, 4px); }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: var(--radius-full, 9999px);
      background: transparent;
      color: var(--_pagination-button-color);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
    }
    .ic { display: flex; }
    .button:hover:not(:disabled) { background: var(--_pagination-button-hover-bg); }
    .button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .button:disabled { color: var(--_pagination-button-disabled-color); cursor: default; }
  `;
}

if (!customElements.get('esa-pagination')) {
  customElements.define('esa-pagination', EsaPagination);
}
