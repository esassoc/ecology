import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
// unsafeSVG for icon markup (SVG namespace); unsafeHTML stays for text highlight.
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

/**
 * A facet/scope the search can be narrowed to (e.g. Projects, People, Funds).
 * `icon` is inner SVG markup (the <path>/<circle>… children, no <svg> wrapper) —
 * the same shape esa-icon's `paths` prop takes — so consumers supply their own
 * glyphs without this component shipping an icon registry.
 */
export interface EsaSearchScope {
  id: string;
  label: string;
  icon?: string;
}

/** A searchable record. Falls back to its scope's icon when `icon` is omitted. */
export interface EsaSearchEntity {
  id: string;
  title: string;
  subtitle?: string;
  /** id of the EsaSearchScope this entity belongs to. */
  scope: string;
  icon?: string;
  /** Where selecting it should navigate — the consumer handles the actual nav. */
  url?: string;
  /** Optional right-aligned secondary text (e.g. a status or date). */
  meta?: string;
}

/**
 * A per-row secondary action (e.g. "Impersonate"). Clicking it fires a
 * `row-action` event instead of selecting the row. Restrict it to certain scopes
 * with `scopes` (e.g. only People rows get Impersonate).
 */
export interface EsaSearchRowAction {
  id: string;
  label: string;
  icon?: string;
  scopes?: string[];
}

interface RenderGroup {
  scope: EsaSearchScope;
  items: EsaSearchEntity[];
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Escape, then wrap case-insensitive query matches in <mark>. */
const highlight = (text: string, q: string): string => {
  const escaped = escapeHtml(text);
  if (!q) return escaped;
  const qEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${qEsc})`, 'ig'), '<mark>$1</mark>');
};

/**
 * esa-entity-search — a scoped entity-search overlay [wc].
 *
 * A sibling to esa-command-palette, NOT a variant of it: a command palette fires
 * actions (`action()` callbacks); this navigates to records. You feed it `entities`
 * + `scopes`; it filters client-side, shows per-scope counts, highlights matches,
 * groups results by scope, and surfaces a `recent` list when the query is empty.
 * It owns no data and no routing — it emits events the consumer handles:
 *   - `select`       detail: { entity }            — a row was chosen
 *   - `scope-change` detail: { scope }             — the active facet changed ('' = all)
 *   - `show-all`     detail: { query, scope }      — ⌘/Ctrl+Enter "see all results"
 *   - `row-action`   detail: { action, entity }    — a per-row action button was clicked
 * All events bubble and are composed. Open via the `open` property, `show()`/`toggle()`,
 * or the built-in `hotkey` ("mod+k" or "slash").
 */
export class EsaEntitySearch extends LitElement {
  static properties = {
    entities: { type: Array },
    scopes: { type: Array },
    recent: { type: Array },
    rowActions: { type: Array, attribute: 'row-actions' },
    open: { type: Boolean, reflect: true },
    placeholder: { type: String },
    allLabel: { type: String, attribute: 'all-label' },
    hotkey: { type: String },
    query: { state: true },
    activeScope: { state: true },
    activeId: { state: true },
  };

  declare entities: EsaSearchEntity[];
  declare scopes: EsaSearchScope[];
  declare recent: EsaSearchEntity[];
  declare rowActions: EsaSearchRowAction[];
  declare open: boolean;
  declare placeholder: string;
  declare allLabel: string;
  declare hotkey: '' | 'mod+k' | 'slash';
  private query = '';
  private activeScope = '';
  private activeId: string | null = null;

  constructor() {
    super();
    this.entities = [];
    this.scopes = [];
    this.recent = [];
    this.rowActions = [];
    this.open = false;
    this.placeholder = 'Search…';
    this.allLabel = 'All';
    this.hotkey = '';
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.onGlobalKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onGlobalKeydown);
  }

  private isEditable(el: EventTarget | null): boolean {
    const node = el as HTMLElement | null;
    if (!node) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
  }

  private onGlobalKeydown = (event: KeyboardEvent): void => {
    if (this.hotkey === 'mod+k' && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    } else if (this.hotkey === 'slash' && event.key === '/' && !this.isEditable(event.target)) {
      event.preventDefault();
      this.show();
    }
  };

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(): void {
    this.open = true;
    this.query = '';
    this.activeScope = '';
    this.activeId = null;
    requestAnimationFrame(() => {
      (this.renderRoot as ShadowRoot)
        .querySelector<HTMLInputElement>('.esa-entity-search__input')
        ?.focus();
    });
  }

  close(): void {
    this.open = false;
  }

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // ---- data ----

  /** Entities matching the query, ignoring the active scope (for counts + grouping). */
  private get queryMatches(): EsaSearchEntity[] {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.entities;
    return this.entities.filter((e) =>
      `${e.title} ${e.subtitle ?? ''}`.toLowerCase().includes(q),
    );
  }

  private scopeCount(scopeId: string): number {
    return this.queryMatches.filter((e) => e.scope === scopeId).length;
  }

  /** What renders, in keyboard-nav order: recent (empty query), flat (scoped), or grouped. */
  private get renderGroups(): RenderGroup[] {
    const scopeById = (id: string) => this.scopes.find((s) => s.id === id);
    if (this.activeScope) {
      const scope = scopeById(this.activeScope);
      const items = this.queryMatches.filter((e) => e.scope === this.activeScope);
      return scope && items.length ? [{ scope, items }] : [];
    }
    return this.scopes
      .map((scope) => ({ scope, items: this.queryMatches.filter((e) => e.scope === scope.id) }))
      .filter((g) => g.items.length > 0);
  }

  private get showingRecent(): boolean {
    return !this.query.trim() && !this.activeScope && this.recent.length > 0;
  }

  private get flatItems(): EsaSearchEntity[] {
    if (this.showingRecent) return this.recent;
    return this.renderGroups.flatMap((g) => g.items);
  }

  // ---- interaction ----

  private onSearch = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value;
    this.activeId = null;
  };

  private setScope(scopeId: string): void {
    this.activeScope = scopeId;
    this.activeId = null;
    this.emit('scope-change', { scope: scopeId });
  }

  private cycleScope(dir: 1 | -1): void {
    const ids = ['', ...this.scopes.map((s) => s.id)];
    const idx = ids.indexOf(this.activeScope);
    const next = (idx + dir + ids.length) % ids.length;
    this.setScope(ids[next]);
  }

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.cycleScope(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.emit('show-all', { query: this.query, scope: this.activeScope });
      this.close();
      return;
    }
    const flat = this.flatItems;
    if (flat.length === 0) return;
    const currentIndex = flat.findIndex((e) => e.id === this.activeId);
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = currentIndex < flat.length - 1 ? currentIndex + 1 : 0;
        this.activeId = flat[next].id;
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : flat.length - 1;
        this.activeId = flat[prev].id;
        break;
      }
      case 'Enter': {
        event.preventDefault();
        const active = flat.find((e) => e.id === this.activeId) ?? (flat.length === 1 ? flat[0] : null);
        if (active) this.selectEntity(active);
        break;
      }
    }
  };

  private selectEntity(entity: EsaSearchEntity): void {
    this.emit('select', { entity });
    this.close();
  }

  private onRowAction(event: Event, action: EsaSearchRowAction, entity: EsaSearchEntity): void {
    event.stopPropagation();
    this.emit('row-action', { action: action.id, entity });
  }

  // ---- render ----

  private iconFor(entity: EsaSearchEntity): string | undefined {
    return entity.icon ?? this.scopes.find((s) => s.id === entity.scope)?.icon;
  }

  private renderIcon(inner?: string) {
    if (!inner) return null;
    return html`<svg class="esa-entity-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${unsafeSVG(inner)}</svg>`;
  }

  private renderRow(entity: EsaSearchEntity) {
    const actions = this.rowActions.filter((a) => !a.scopes || a.scopes.includes(entity.scope));
    return html`
      <button
        class="esa-entity-search__row ${entity.id === this.activeId ? 'esa-entity-search__row--active' : ''}"
        role="option"
        aria-selected=${entity.id === this.activeId}
        @click=${() => this.selectEntity(entity)}
        @mouseenter=${() => (this.activeId = entity.id)}
      >
        <span class="esa-entity-search__row-icon">${this.renderIcon(this.iconFor(entity))}</span>
        <span class="esa-entity-search__row-text">
          <span class="esa-entity-search__row-title">${unsafeHTML(highlight(entity.title, this.query.trim()))}</span>
          ${entity.subtitle
            ? html`<span class="esa-entity-search__row-subtitle">${unsafeHTML(highlight(entity.subtitle, this.query.trim()))}</span>`
            : null}
        </span>
        ${entity.meta ? html`<span class="esa-entity-search__row-meta">${entity.meta}</span>` : null}
        ${actions.length
          ? html`<span class="esa-entity-search__row-actions">
              ${actions.map(
                (a) => html`<button
                  class="esa-entity-search__row-action"
                  type="button"
                  title=${a.label}
                  aria-label=${a.label}
                  @click=${(e: Event) => this.onRowAction(e, a, entity)}
                >
                  ${a.icon ? this.renderIcon(a.icon) : html`<span>${a.label}</span>`}
                </button>`,
              )}
            </span>`
          : null}
      </button>
    `;
  }

  render() {
    if (!this.open) return html``;
    const q = this.query.trim();
    const groups = this.renderGroups;
    const showingRecent = this.showingRecent;
    const totalCount = this.queryMatches.length;

    return html`
      <div class="esa-entity-search__backdrop" @click=${this.close}></div>
      <div class="esa-entity-search" role="dialog" aria-label="Search">
        <div class="esa-entity-search__search">
          <svg class="esa-entity-search__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            class="esa-entity-search__input"
            type="text"
            placeholder=${this.placeholder}
            .value=${this.query}
            @input=${this.onSearch}
            @keydown=${this.onKeydown}
            autocomplete="off"
          />
          <kbd class="esa-entity-search__kbd">ESC</kbd>
        </div>

        ${this.scopes.length
          ? html`<div class="esa-entity-search__scopes" role="tablist">
              <button
                class="esa-entity-search__scope ${this.activeScope === '' ? 'esa-entity-search__scope--active' : ''}"
                role="tab"
                aria-selected=${this.activeScope === ''}
                @click=${() => this.setScope('')}
              >
                ${this.allLabel}${q ? html`<span class="esa-entity-search__scope-count">${totalCount}</span>` : null}
              </button>
              ${this.scopes.map(
                (s) => html`<button
                  class="esa-entity-search__scope ${this.activeScope === s.id ? 'esa-entity-search__scope--active' : ''}"
                  role="tab"
                  aria-selected=${this.activeScope === s.id}
                  @click=${() => this.setScope(s.id)}
                >
                  ${this.renderIcon(s.icon)}${s.label}${q
                    ? html`<span class="esa-entity-search__scope-count">${this.scopeCount(s.id)}</span>`
                    : null}
                </button>`,
              )}
            </div>`
          : null}

        <div class="esa-entity-search__results" role="listbox">
          ${showingRecent
            ? html`<div class="esa-entity-search__group">
                <div class="esa-entity-search__group-head"><span>Recent</span></div>
                ${this.recent.map((e) => this.renderRow(e))}
              </div>`
            : groups.length
              ? groups.map(
                  (g) => html`<div class="esa-entity-search__group">
                    <div class="esa-entity-search__group-head">
                      <span>${g.scope.label}</span>
                      <span class="esa-entity-search__group-count">${g.items.length}</span>
                    </div>
                    ${g.items.map((e) => this.renderRow(e))}
                  </div>`,
                )
              : html`<div class="esa-entity-search__empty">No results${q ? html` for “${this.query}”` : null}.</div>`}
        </div>

        <div class="esa-entity-search__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          ${this.scopes.length ? html`<span><kbd>Tab</kbd> Scope</span>` : null}
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host { display: contents; }

    .esa-entity-search__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
    }

    .esa-entity-search {
      position: fixed;
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
      width: var(--entity-search-width, 600px);
      max-width: calc(100vw - 2rem);
      max-height: var(--entity-search-max-height, 70vh);
      background: var(--entity-search-bg, var(--color-surface-elevated, #ffffff));
      border-radius: var(--entity-search-radius, var(--radius-400, 0.75rem));
      box-shadow: var(--entity-search-shadow, 0 20px 60px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans, sans-serif);
      animation: esa-entity-enter 150ms ease-out;
    }
    @keyframes esa-entity-enter {
      from { opacity: 0; transform: translateX(-50%) scale(0.96); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }

    .esa-entity-search__search {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-bottom: 1px solid var(--color-border-light, #efefef);
    }
    .esa-entity-search__search-icon { color: var(--color-text-muted, #7c7c7c); flex-shrink: 0; }
    .esa-entity-search__input {
      flex: 1;
      border: none;
      outline: none;
      font-size: var(--type-size-300, 1.0625rem);
      color: var(--color-text-primary, #171717);
      background: transparent;
      font-family: inherit;
    }
    .esa-entity-search__input::placeholder { color: var(--color-text-muted, #7c7c7c); }
    .esa-entity-search__kbd, .esa-entity-search__footer kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 19px;
      height: 19px;
      padding: 0 5px;
      font-family: inherit;
      font-size: 11px;
      font-weight: var(--font-weight-medium, 500);
      color: var(--color-text-muted, #7c7c7c);
      background: var(--color-surface, #fff);
      box-shadow: inset 0 0 0 1px var(--color-border, #dcdcdc), inset 0 -1px 0 0 var(--color-border, #dcdcdc);
      border-radius: 4px;
    }

    .esa-entity-search__scopes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-150, 0.375rem);
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-bottom: 1px solid var(--color-border-light, #efefef);
    }
    .esa-entity-search__scope {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 0.25rem);
      padding: 4px var(--spacing-250, 0.625rem);
      box-shadow: inset 0 0 0 1px var(--_scope-border, var(--color-border, #dcdcdc));
      border-radius: var(--radius-full, 9999px);
      background: var(--color-surface, #fff);
      color: var(--color-text-secondary, #525252);
      font: inherit;
      font-size: var(--type-size-100, 0.875rem);
      cursor: pointer;
      transition: background 80ms ease, box-shadow 80ms ease, color 80ms ease;
    }
    .esa-entity-search__scope:hover { --_scope-border: var(--color-primary-border, #c6dcf1); color: var(--color-text-primary, #171717); }
    .esa-entity-search__scope--active {
      background: var(--color-primary, #1e5386);
      --_scope-border: var(--color-primary, #1e5386);
      color: var(--color-primary-contrast, #fff);
    }
    .esa-entity-search__scope-count {
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      opacity: 0.8;
    }
    .esa-entity-search__scope .esa-entity-search__icon { width: 15px; height: 15px; }

    .esa-entity-search__results { overflow-y: auto; padding: var(--spacing-200, 0.5rem); flex: 1; }
    .esa-entity-search__group + .esa-entity-search__group { margin-top: var(--spacing-200, 0.5rem); }
    .esa-entity-search__group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-200, 0.5rem) var(--spacing-200, 0.5rem) var(--spacing-100, 0.25rem);
      font-size: var(--type-size-100, 0.8125rem);
      font-weight: var(--font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--color-text-muted, #7c7c7c);
    }
    .esa-entity-search__group-count { font-variant-numeric: tabular-nums; }

    .esa-entity-search__row {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-200, 0.5rem);
      background: transparent;
      color: var(--color-text-primary, #171717);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;
    }
    .esa-entity-search__row--active { background: var(--entity-search-row-bg-active, var(--color-surface-sunken, #f3f7fc)); }
    .esa-entity-search__row-icon { flex-shrink: 0; display: inline-flex; color: var(--color-text-muted, #7c7c7c); }
    .esa-entity-search__row--active .esa-entity-search__row-icon { color: var(--color-primary, #1e5386); }
    .esa-entity-search__row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .esa-entity-search__row-title {
      font-size: var(--type-size-200, 0.9375rem);
      font-weight: var(--font-weight-medium, 500);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .esa-entity-search__row-subtitle {
      font-size: var(--type-size-100, 0.8125rem);
      color: var(--color-text-muted, #7c7c7c);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .esa-entity-search__row-title mark, .esa-entity-search__row-subtitle mark {
      background: color-mix(in srgb, var(--color-primary, #1e5386) 18%, transparent);
      color: inherit;
      border-radius: 2px;
    }
    .esa-entity-search__row-meta { flex-shrink: 0; font-size: var(--type-size-100, 0.8125rem); color: var(--color-text-muted, #7c7c7c); font-variant-numeric: tabular-nums; }
    .esa-entity-search__row-actions { flex-shrink: 0; display: inline-flex; gap: var(--spacing-100, 0.25rem); opacity: 0; }
    .esa-entity-search__row:hover .esa-entity-search__row-actions,
    .esa-entity-search__row--active .esa-entity-search__row-actions { opacity: 1; }
    .esa-entity-search__row-action {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px;
      box-shadow: inset 0 0 0 1px var(--_row-action-border, var(--color-border, #dcdcdc));
      border-radius: var(--radius-full, 9999px);
      background: var(--color-surface, #fff);
      color: var(--color-text-secondary, #525252);
      font: inherit; font-size: 12px; cursor: pointer;
    }
    .esa-entity-search__row-action:hover { --_row-action-border: var(--color-primary, #1e5386); color: var(--color-primary, #1e5386); }

    .esa-entity-search__empty {
      padding: var(--spacing-700, 3rem) var(--spacing-600, 2rem);
      text-align: center;
      color: var(--color-text-muted, #7c7c7c);
      font-size: var(--type-size-200, 0.9375rem);
    }

    .esa-entity-search__footer {
      display: flex;
      gap: var(--spacing-400, 1rem);
      padding: var(--spacing-250, 0.625rem) var(--spacing-400, 1rem);
      border-top: 1px solid var(--color-border-light, #efefef);
      font-size: var(--type-size-100, 0.8125rem);
      color: var(--color-text-muted, #7c7c7c);
    }
    .esa-entity-search__footer span { display: inline-flex; align-items: center; gap: 4px; }
  `;
}

if (!customElements.get('esa-entity-search')) {
  customElements.define('esa-entity-search', EsaEntitySearch);
}
