import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

/**
 * The two composites a tab renders at each step of the size ramp.
 *
 * A tab label is regular until it is the selected one, and then it is UI text
 * carrying state — so the active row swaps family rather than stacking a
 * font-weight override on top of the resting role. Both maps walk the same rung,
 * which is what keeps the tab from reflowing when selection moves.
 */
const TAB_TYPE = { xs: 'microcopy-xs-subtle', sm: 'microcopy-sm-subtle', md: 'microcopy-md-subtle', lg: 'microcopy-lg-subtle' } as const;
const TAB_ACTIVE_TYPE = { xs: 'microcopy-xs', sm: 'microcopy-sm', md: 'microcopy-md', lg: 'microcopy-lg' } as const;

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
            const role = active ? TAB_ACTIVE_TYPE[this.size] : TAB_TYPE[this.size];
            return html`<button
              class="tab typography-${role} ${active ? 'tab--active' : ''} ${tab.disabled ? 'tab--disabled' : ''}"
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
              ${tab.badge != null
                ? html`<span class="badge typography-microcopy-xs-strong">${tab.badge}</span>`
                : null}
            </button>`;
          })}
        </div>
        <div class="panel typography-body-md" role="tabpanel">
          <slot name="panel-${this.activeIndex}"><slot></slot></slot>
        </div>
      </div>
    `;
  }

  /* `typography` FIRST so this component's own rules win on equal specificity — it
     carries the .typography-* composite classes across the shadow boundary. */
  static styles = [
    typography,
    css`
    :host {
      --_tab-height: var(--tab-layout-height-md, 44px);
      --_tab-color: var(--color-content-default-secondary, #646464);
      --_tab-color-active: var(--color-background-brand, #46a758);
      --_tab-color-hover: var(--color-content-default, #202020);
      --_tab-indicator-color: var(--color-background-brand, #46a758);
      --_tab-indicator-height: 2px;
      --_tab-bg-hover: var(--color-background-elevation-sunken, #f0f0f0);
      --_tab-gap: var(--spacing-100, 4px);
      --_tab-padding-x: var(--spacing-400, 16px);
      --_tab-border: var(--color-border-default, #cecece);
      --_tab-badge-bg: var(--color-background-brand, #46a758);
      --_tab-badge-color: var(--color-content-default-knockout, #fcfcfc);

      display: block;
    }

    /* base :host = md. xs is one step below sm; sm/lg keep the old small/large values.
       The size steps carry geometry only — the text comes from a composite class
       named in render() (TAB_TYPE / TAB_ACTIVE_TYPE), so a tab says "this is body
       text at the sm rung" rather than assembling a size and a weight here. */
    :host([size='xs']) {
      --_tab-height: var(--tab-layout-height-xs, 30px);
      --_tab-padding-x: var(--spacing-200, 8px);
    }
    :host([size='sm']) {
      --_tab-height: var(--tab-layout-height-sm, 36px);
      --_tab-padding-x: var(--spacing-300, 12px);
    }
    :host([size='lg']) {
      --_tab-height: var(--tab-layout-height-lg, 52px);
      --_tab-padding-x: var(--spacing-500, 24px);
    }

    .tabs {
      display: flex;
      border-bottom: var(--border-width-default, 1px) solid var(--_tab-border);
      gap: var(--_tab-gap);
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      height: var(--_tab-height);
      padding-inline: var(--_tab-padding-x);
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
    /* The active tab's weight comes from TAB_ACTIVE_TYPE (label-*, medium). */
    .tab--active { color: var(--_tab-color-active); }
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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: -2px;
      border-radius: var(--radius-sm, 0.25rem);
    }

    .icon { display: inline-flex; }

    .badge {
      /* A count. microcopy has no leading, so it must not wrap. */
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding-inline: var(--spacing-150, 6px);
      background: var(--_tab-badge-bg);
      color: var(--_tab-badge-color);
      border-radius: var(--radius-pill, 9999px);
    }

    /* Segmented appearance (Beacon UiTabsAppearance='segmented').
       variant='pill' is the legacy alias and shares these rules. */
    :host([appearance='segmented']) .tabs,
    :host([variant='pill']) .tabs {
      align-self: flex-start;
      border-bottom: none;
      background: var(--color-background-elevation-sunken, #f0f0f0);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      padding: var(--spacing-050, 2px);
      gap: var(--spacing-050, 2px);
    }
    :host([appearance='segmented']) .tab,
    :host([variant='pill']) .tab { border-radius: var(--radius-sm, 0.25rem); }
    :host([appearance='segmented']) .tab--active,
    :host([variant='pill']) .tab--active {
      background: var(--color-background-elevation-raised, #fcfcfc);
      box-shadow: var(--elevation-1, 0 1px 2px rgba(0, 0, 0, 0.06));
    }
    :host([appearance='segmented']) .tab--active::after,
    :host([variant='pill']) .tab--active::after { display: none; }

    /* body-md is the panel's default type role — it inherits through the slot to
       light-DOM content, and any esa-* component slotted in names its own. */
    .panel { padding-top: var(--spacing-400, 16px); }

    /* FORCED COLORS. Both appearances lose their active marker, for different
       reasons. The default appearance paints .tab--active::after — a generated
       box whose only paint is 'background', so it flattens to Canvas. The
       segmented/pill appearances set that ::after to 'display: none' and signal
       with a background plus --elevation-1 instead, and the shadow is deleted.

       Fills rather than borders, same reason as esa-button-toggle: .tab has a
       fixed height inside a flex row, so a border on --active alone would make
       the selected tab 2px taller than its neighbours and break the row.
       The segmented .tabs container has a real border and survives on its own. */
    @media (forced-colors: active) {
      .tab--active::after { background: Highlight; }
      :host([appearance='segmented']) .tab--active,
      :host([variant='pill']) .tab--active {
        background: Highlight;
        color: HighlightText;
      }
      .tab--disabled,
      .tab:disabled { color: GrayText; }
    }
  `,
  ];
}

if (!customElements.get('esa-tab-layout')) {
  customElements.define('esa-tab-layout', EsaTabLayout);
}
