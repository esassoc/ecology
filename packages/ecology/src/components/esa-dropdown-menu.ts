import { LitElement, html, css } from 'lit';

export interface EsaMenuItem {
  label: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
  action?: string;
  variant?: 'default' | 'danger';
}

type DropdownPosition = 'below-start' | 'below-end' | 'above-start' | 'above-end';

/**
 * esa-dropdown-menu — click-toggled menu [wc].
 *
 * Faithful translation of the Angular esa-dropdown-menu (which used
 * @angular/cdk/overlay CdkConnectedOverlay). The trigger element is slotted; the
 * menu items are passed as the `items` property (EsaMenuItem[]). Clicking the
 * trigger toggles the panel; outside-click and Esc close it; selecting an item
 * emits a `menu-action` CustomEvent carrying the item's `action` string.
 *
 * Inputs preserved: items, position (below-start|below-end|above-start|above-end),
 * width (auto|trigger). Positioning is plain CSS — no CDK.
 *
 * Note: `icon` strings on items render a small bullet dot placeholder rather than
 * pulling in a Lucide icon set (kept dependency-free per the migration brief).
 */
export class EsaDropdownMenu extends LitElement {
  static properties = {
    items: { type: Array },
    position: { type: String, reflect: true },
    width: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
  };

  declare items: EsaMenuItem[];
  declare position: DropdownPosition;
  declare width: 'auto' | 'trigger';
  declare open: boolean;

  constructor() {
    super();
    this.items = [];
    this.position = 'below-start';
    this.width = 'auto';
    this.open = false;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocumentClick, true);
  }

  private toggle = (): void => {
    this.open ? this.close() : this.openMenu();
  };

  private openMenu(): void {
    this.open = true;
    document.addEventListener('click', this.onDocumentClick, true);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('click', this.onDocumentClick, true);
  }

  private onDocumentClick = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node) && event.target !== this) {
      this.close();
    }
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.close();
    }
  };

  private selectItem(item: EsaMenuItem): void {
    if (item.disabled) return;
    if (item.action) {
      this.dispatchEvent(
        new CustomEvent('menu-action', { detail: item.action, bubbles: true, composed: true }),
      );
    }
    this.close();
  }

  render() {
    return html`
      <div class="esa-dropdown" @keydown=${this.onKeydown}>
        <div class="esa-dropdown__trigger" @click=${this.toggle}>
          <slot></slot>
        </div>
        ${this.open
          ? html`
              <div class="esa-dropdown-menu__panel esa-dropdown-menu__panel--${this.position}" role="menu">
                ${this.items.map((item) =>
                  item.divider
                    ? html`<div class="esa-dropdown-menu__divider" role="separator"></div>`
                    : html`
                        <button
                          class="esa-dropdown-menu__item ${item.variant === 'danger'
                            ? 'esa-dropdown-menu__item--danger'
                            : ''} ${item.disabled ? 'esa-dropdown-menu__item--disabled' : ''}"
                          ?disabled=${item.disabled}
                          role="menuitem"
                          @click=${() => this.selectItem(item)}
                        >
                          ${item.icon ? html`<span class="esa-dropdown-menu__bullet" aria-hidden="true"></span>` : null}
                          <span>${item.label}</span>
                        </button>
                      `,
                )}
              </div>
            `
          : null}
      </div>
    `;
  }

  static styles = css`
    :host { display: inline-block; }

    .esa-dropdown {
      position: relative;
      display: inline-block;
    }
    .esa-dropdown__trigger { display: inline-block; }

    .esa-dropdown-menu__panel {
      position: absolute;
      z-index: var(--z-dropdown, 50);
      background: var(--dropdown-menu-bg, var(--color-surface-elevated, #ffffff));
      border-radius: var(--dropdown-menu-radius, var(--radius-200, 0.5rem));
      box-shadow: var(--shadow-300, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      min-width: var(--dropdown-menu-min-width, 160px);
      max-width: var(--dropdown-menu-max-width, 280px);
      padding: var(--spacing-100, 0.25rem);
      overflow-y: auto;
      max-height: 320px;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      animation: esa-dropdown-fade 120ms ease-out;
    }
    @keyframes esa-dropdown-fade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    :host([width='trigger']) .esa-dropdown-menu__panel { min-width: 100%; }

    .esa-dropdown-menu__panel--below-start { top: calc(100% + 4px); left: 0; }
    .esa-dropdown-menu__panel--below-end { top: calc(100% + 4px); right: 0; }
    .esa-dropdown-menu__panel--above-start { bottom: calc(100% + 4px); left: 0; }
    .esa-dropdown-menu__panel--above-end { bottom: calc(100% + 4px); right: 0; }

    .esa-dropdown-menu__item {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 0.5rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-100, 0.25rem);
      background: transparent;
      color: var(--dropdown-menu-item-color, var(--color-text-primary, #171717));
      font-family: inherit;
      font-size: var(--type-size-200, 0.9375rem);
      cursor: pointer;
      text-align: left;
      transition: background 100ms ease;
    }
    .esa-dropdown-menu__item:hover:not(:disabled) {
      background: var(--color-surface-sunken, #efefef);
    }
    .esa-dropdown-menu__item:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: -2px;
    }
    .esa-dropdown-menu__item--danger { color: var(--color-danger, #ef4444); }
    .esa-dropdown-menu__item--danger:hover:not(:disabled) {
      background: var(--color-danger-subtle, #fef2f2);
    }
    .esa-dropdown-menu__item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .esa-dropdown-menu__bullet {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full, 9999px);
      background: currentColor;
      flex-shrink: 0;
      opacity: 0.6;
    }

    .esa-dropdown-menu__divider {
      height: 1px;
      background: var(--color-border-light, #efefef);
      margin: var(--spacing-100, 0.25rem) 0;
    }
  `;
}

if (!customElements.get('esa-dropdown-menu')) {
  customElements.define('esa-dropdown-menu', EsaDropdownMenu);
}
