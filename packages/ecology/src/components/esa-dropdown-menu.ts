import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

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
/** What counts as "already a control" when resolving a slotted trigger. */
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
    // A menu takes focus on open — that is the whole difference between a menu and
    // a list of links that happens to be in a box.
    this.updateComplete.then(() => this.focusItem(0));
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('click', this.onDocumentClick, true);
    // FOCUS RETURN, absent until 2026-08-18. Keyboard-only use survived it by
    // accident, because focus never entered the menu in the first place — but
    // CLICKING an item put focus on that button, and close() then deleted it from
    // the DOM, dropping focus to <body>. Now that focus does move in on open, this
    // is load-bearing rather than a nicety.
    this.triggerEl?.focus?.();
  }

  /**
   * The trigger is whatever the consumer slotted. It is read rather than rendered
   * because the component only ever owned a wrapper <div> around <slot> — which is
   * also why the ARIA below has to be applied to the assigned node instead of
   * written in this file's template.
   */
  private get triggerEl(): HTMLElement | null {
    const slot = (this.renderRoot as ShadowRoot).querySelector('slot');
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    const outer = assigned.find((el) => el instanceof HTMLElement) as HTMLElement | undefined;
    if (!outer) return null;
    // THE SLOTTED ELEMENT IS OFTEN A WRAPPER, NOT THE CONTROL. esa-button renders
    // <span class="esa-button"><button class="esa-button__native">, so treating the
    // outer node as the trigger put role="button" tabindex="0" around a real
    // button — axe's `nested-interactive`, and aria-expanded on an element no
    // screen reader would read it from. Resolve to the control that actually takes
    // focus, and only fall back to the wrapper when there is nothing inside.
    if (outer.matches(FOCUSABLE)) return outer;
    return outer.querySelector<HTMLElement>(FOCUSABLE) ?? outer;
  }

  /**
   * The trigger had NO menu-button semantics at all: no role, no aria-haspopup, no
   * aria-expanded, no aria-controls. Open or closed sounded identical. These land
   * on the slotted element on every update, since `open` is in the announcement.
   *
   * If the consumer slotted something that is not natively focusable this also
   * makes it operable — a bare <span> trigger was keyboard-dead before.
   */
  private syncTrigger(): void {
    const el = this.triggerEl;
    if (!el) return;
    el.setAttribute('aria-haspopup', 'menu');
    el.setAttribute('aria-expanded', String(this.open));
    el.setAttribute('aria-controls', 'menu');
    if (!el.matches(FOCUSABLE)) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    }
  }

  updated(): void {
    this.syncTrigger();
  }

  private onDocumentClick = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node) && event.target !== this) {
      this.close();
    }
  };

  /** Enabled menu items, in DOM order — the roving-tabindex ring. */
  private get menuItems(): HTMLElement[] {
    return Array.from(
      (this.renderRoot as ShadowRoot).querySelectorAll<HTMLElement>(
        '.esa-dropdown-menu__item:not([disabled])',
      ),
    );
  }

  private focusItem(index: number): void {
    const items = this.menuItems;
    if (!items.length) return;
    const i = (index + items.length) % items.length;
    // Roving tabindex: the menu is ONE tab stop, not one per item. Every item was
    // a plain <button> with implicit tabindex="0", so Tab walked the whole list —
    // which is a toolbar's contract, not a menu's.
    items.forEach((el, n) => el.setAttribute('tabindex', n === i ? '0' : '-1'));
    items[i].focus();
  }

  private get focusedIndex(): number {
    const active = (this.renderRoot as ShadowRoot).activeElement as HTMLElement | null;
    return this.menuItems.indexOf(active as HTMLElement);
  }

  private onKeydown = (event: KeyboardEvent): void => {
    // Down/Up open the menu from the trigger, which is the menu-button contract.
    if (!this.open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.openMenu();
      }
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusItem(this.focusedIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusItem(this.focusedIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItem(this.menuItems.length - 1);
        break;
      case 'Tab':
        // A menu is not a place Tab navigates within. Let it move on, and close.
        this.close();
        break;
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
        <div class="esa-dropdown__trigger typography-body-md" @click=${this.toggle}>
          <slot></slot>
        </div>
        ${this.open
          ? html`
              <div class="esa-dropdown-menu__panel esa-dropdown-menu__panel--${this.position}" id="menu" role="menu">
                ${this.items.map((item) =>
                  item.divider
                    ? html`<div class="esa-dropdown-menu__divider" role="separator"></div>`
                    : html`
                        <button
                          class="esa-dropdown-menu__item typography-body-md ${item.variant === 'danger'
                            ? 'esa-dropdown-menu__item--danger'
                            : ''} ${item.disabled ? 'esa-dropdown-menu__item--disabled' : ''}"
                          ?disabled=${item.disabled}
                          role="menuitem"
                          tabindex="-1"
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

  static styles = [
    typography,
    css`
    :host { display: inline-block; }

    .esa-dropdown {
      position: relative;
      display: inline-block;
    }
    .esa-dropdown__trigger {
      display: inline-block;
    }

    .esa-dropdown-menu__panel {
      position: absolute;
      z-index: var(--z-dropdown, 50);
      background: var(--color-background-elevation-floating, #fcfcfc);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      min-width: var(--dropdown-menu-min-width, 160px);
      max-width: var(--dropdown-menu-max-width, 280px);
      padding: var(--spacing-100, 0.25rem);
      overflow-y: auto;
      max-height: 320px;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
      animation: esa-dropdown-fade var(--animation-enter, 150ms ease-out);
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
      border-radius: var(--radius-sm, 0.25rem);
      background: transparent;
      color: var(--color-content-default, #202020);
      /* UA reset, not a type role — a native button does not inherit the face. */
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 100ms ease;
    }
    .esa-dropdown-menu__item:hover:not(:disabled) {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }
    .esa-dropdown-menu__item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: -2px;
    }
    .esa-dropdown-menu__item--danger { color: var(--color-content-utility-danger, #ce2c31); }
    .esa-dropdown-menu__item--danger:hover:not(:disabled) {
      background: var(--color-background-utility-danger-subtle, #fffcfc);
    }
    .esa-dropdown-menu__item--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .esa-dropdown-menu__bullet {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-pill, 9999px);
      background: currentColor;
      flex-shrink: 0;
      opacity: 0.6;
    }

    .esa-dropdown-menu__divider {
      height: 1px;
      background: var(--color-border-default-subtle, #d9d9d9);
      margin: var(--spacing-100, 0.25rem) 0;
    }

    /* FORCED COLORS. The panel keeps its real border, so only the interior needs
       work.

       The DIVIDER is a 1px box painted with 'background', which flattens to
       Canvas — menu grouping disappears silently. Naming CanvasText explicitly
       brings it back.

       The --danger item is NOT repaired here, and that is deliberate: it differs
       from a normal item by one 'color' declaration, there is no system colour
       that means "destructive", and the per-item 'icon' string renders an
       anonymous bullet dot rather than a glyph (see the class docblock), so
       there is no shape channel to reach for either. Faking it with Highlight
       would say "selected", which is worse than saying nothing. The item's LABEL
       is what has to carry the warning — "Delete project", not "Delete". */
    @media (forced-colors: active) {
      .esa-dropdown-menu__divider { background: CanvasText; }
      .esa-dropdown-menu__item:hover:not(:disabled),
      .esa-dropdown-menu__item--danger:hover:not(:disabled) {
        background: Highlight;
        color: HighlightText;
      }
      .esa-dropdown-menu__item--disabled,
      .esa-dropdown-menu__item:disabled { color: GrayText; }
    }
  `,
  ];
}

if (!customElements.get('esa-dropdown-menu')) {
  customElements.define('esa-dropdown-menu', EsaDropdownMenu);
}
