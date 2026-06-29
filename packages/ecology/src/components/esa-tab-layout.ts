import { LitElement, html, css } from 'lit';

/**
 * esa-tab-layout — Lit Web Component.
 *
 * Why a Web Component (not .astro): tabs are the canonical ARIA tablist pattern —
 * active-tab state, roving keyboard navigation (Arrow/Home/End), and a panel that
 * swaps with the active tab. All runtime behavior.
 *
 * Faithful translation of the Angular esa-tab-layout (content mode):
 *   - tabs input / activeIndex model    → `tabs` property + `activeIndex` property
 *   - size + variant host classes       → reflected `size` / `variant` attributes
 *   - selectTab() + (tabChange) output  → selectTab() + bubbling `tabchange` event
 *   - onKeydown ArrowLeft/Right/Home/End + skip-disabled  → same logic
 *   - <ng-content> panel                → default <slot>; per-tab named slots
 *     (slot="panel-0", "panel-1", …) when you want tab-specific content.
 *
 * The routed-tabs branch of the Angular component (RouterOutlet) is not portable
 * outside Angular, so this implements the content/panel mode. Decorator-free.
 * Lucide icons inlined as SVG strings on `tab.icon`.
 */
export interface EsaTab {
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}

export class EsaTabLayout extends LitElement {
  static properties = {
    tabs: { type: Array },
    activeIndex: { type: Number, attribute: 'active-index' },
    size: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    appearance: { type: String, reflect: true },
  };

  declare tabs: EsaTab[];
  declare activeIndex: number;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  /** @deprecated legacy alias for `appearance` ('pill' === 'segmented'). */
  declare variant: 'underline' | 'pill';
  /** Aligned to Beacon's UiTabsAppearance. */
  declare appearance: 'underline' | 'segmented';

  constructor() {
    super();
    this.tabs = [];
    this.activeIndex = 0;
    this.size = 'md';
    this.variant = 'underline';
    this.appearance = 'underline';
  }

  private selectTab(index: number): void {
    const tab = this.tabs[index];
    if (tab?.disabled) return;
    this.activeIndex = index;
    this.dispatchEvent(
      new CustomEvent('tabchange', { detail: { index }, bubbles: true, composed: true })
    );
  }

  private findNextEnabledTab(fromIndex: number, direction: number): number | null {
    let index = fromIndex + direction;
    while (index >= 0 && index < this.tabs.length) {
      if (!this.tabs[index].disabled) return index;
      index += direction;
    }
    return null;
  }

  private onKeydown = (event: KeyboardEvent, currentIndex: number): void => {
    let targetIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        targetIndex = this.findNextEnabledTab(currentIndex, 1);
        break;
      case 'ArrowLeft':
        targetIndex = this.findNextEnabledTab(currentIndex, -1);
        break;
      case 'Home':
        targetIndex = this.findNextEnabledTab(-1, 1);
        break;
      case 'End':
        targetIndex = this.findNextEnabledTab(this.tabs.length, -1);
        break;
      default:
        return;
    }
    if (targetIndex !== null) {
      event.preventDefault();
      this.selectTab(targetIndex);
      const tabList = (event.target as HTMLElement).parentElement;
      const targetButton = tabList?.children[targetIndex] as HTMLElement | undefined;
      targetButton?.focus();
    }
  };

  render() {
    return html`
      <div class="layout">
        <div class="tabs" part="tabs" role="tablist">
          ${this.tabs.map((tab, i) => {
            const active = this.activeIndex === i;
            return html`<button
              class="tab ${active ? 'tab--active' : ''} ${tab.disabled ? 'tab--disabled' : ''}"
              type="button"
              role="tab"
              aria-selected=${active}
              tabindex=${active ? 0 : -1}
              ?disabled=${tab.disabled}
              @click=${() => this.selectTab(i)}
              @keydown=${(e: KeyboardEvent) => this.onKeydown(e, i)}
            >
              ${tab.icon ? html`<span class="icon" .innerHTML=${tab.icon}></span>` : null}
              <span>${tab.label}</span>
              ${tab.badge != null ? html`<span class="badge">${tab.badge}</span>` : null}
            </button>`;
          })}
        </div>
        <div class="panel" role="tabpanel">
          <slot name="panel-${this.activeIndex}"><slot></slot></slot>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      --_tab-height: var(--tab-layout-height-md);
      --_tab-font-size: var(--type-size-200);
      --_tab-color: var(--tab-layout-color);
      --_tab-color-active: var(--tab-layout-color-active);
      --_tab-color-hover: var(--color-text-primary);
      --_tab-indicator-color: var(--tab-layout-indicator-color);
      --_tab-indicator-height: 2px;
      --_tab-bg-hover: var(--color-surface-sunken);
      --_tab-gap: var(--spacing-100);
      --_tab-padding-x: var(--spacing-400);
      --_tab-border: var(--tab-layout-border-color);
      --_tab-badge-bg: var(--color-primary);
      --_tab-badge-color: var(--color-text-inverse);

      display: block;
    }

    /* base :host = md. xs is one step below sm; sm/lg keep the old small/large values. */
    :host([size='xs']) {
      --_tab-height: var(--tab-layout-height-xs);
      --_tab-font-size: var(--type-size-100);
      --_tab-padding-x: var(--spacing-200);
    }
    :host([size='sm']) {
      --_tab-height: var(--tab-layout-height-sm);
      --_tab-font-size: var(--type-size-150);
      --_tab-padding-x: var(--spacing-300);
    }
    :host([size='lg']) {
      --_tab-height: var(--tab-layout-height-lg);
      --_tab-font-size: var(--type-size-300);
      --_tab-padding-x: var(--spacing-500);
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--_tab-border);
      gap: var(--_tab-gap);
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200);
      height: var(--_tab-height);
      padding-inline: var(--_tab-padding-x);
      font-family: inherit;
      font-size: var(--_tab-font-size);
      color: var(--_tab-color);
      background: none;
      border: none;
      cursor: pointer;
      position: relative;
      text-decoration: none;
      white-space: nowrap;
      transition: color 150ms ease, background-color 150ms ease;
    }
    .tab:hover:not(:disabled):not(.tab--disabled) {
      color: var(--_tab-color-hover);
      background: var(--_tab-bg-hover);
    }
    .tab--active { color: var(--_tab-color-active); font-weight: var(--font-weight-medium); }
    .tab--active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--_tab-indicator-height);
      background: var(--_tab-indicator-color);
      border-radius: var(--_tab-indicator-height);
    }
    .tab--disabled { opacity: 0.5; cursor: not-allowed; }
    .tab:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: -2px;
      border-radius: var(--radius-100);
    }

    .icon { display: inline-flex; }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding-inline: var(--spacing-150);
      font-size: var(--type-size-100);
      font-weight: var(--font-weight-semibold);
      background: var(--_tab-badge-bg);
      color: var(--_tab-badge-color);
      border-radius: var(--radius-full);
    }

    /* Segmented appearance (Beacon UiTabsAppearance='segmented').
       variant='pill' is the legacy alias and shares these rules. */
    :host([appearance='segmented']) .tabs,
    :host([variant='pill']) .tabs {
      align-self: flex-start;
      border-bottom: none;
      background: var(--color-surface-sunken);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-200);
      padding: var(--spacing-050);
      gap: var(--spacing-050);
    }
    :host([appearance='segmented']) .tab,
    :host([variant='pill']) .tab { border-radius: var(--radius-100); }
    :host([appearance='segmented']) .tab--active,
    :host([variant='pill']) .tab--active {
      background: var(--color-surface);
      box-shadow: var(--shadow-50);
    }
    :host([appearance='segmented']) .tab--active::after,
    :host([variant='pill']) .tab--active::after { display: none; }

    .panel { padding-top: var(--spacing-400); }
  `;
}

if (!customElements.get('esa-tab-layout')) {
  customElements.define('esa-tab-layout', EsaTabLayout);
}
