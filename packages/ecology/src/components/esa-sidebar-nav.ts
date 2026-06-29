// hub-edit-approved: Andy approved (2026-06-15) — resolve item.icon by registry
// NAME (via ./icon-registry) so spokes pass icon: 'chef-hat' instead of pasting
// raw <svg> blobs into nav data. Raw-SVG strings still work (back-compat).
import { LitElement, html, css } from 'lit';
import { iconSvg } from './icon-registry';

/**
 * esa-sidebar-nav — Lit Web Component.
 *
 * Why a Web Component (not .astro): the sidebar carries real runtime state —
 * a collapse toggle (icon-rail vs. full width) and per-parent accordion expand.
 * As a custom element this behavior travels into any stack.
 *
 * Faithful translation of the Angular esa-sidebar-nav:
 *   - signal `collapsed` (model)        → reflected `collapsed` attribute + toggle()
 *   - `expandedGroups` Set              → internal Set, toggleChildren()/isExpanded()
 *   - `groupedSections` computed        → same grouping logic over `items`
 *   - host class .--collapsed           → :host([collapsed]) selector
 *   - RouterLink/RouterLinkActive       → plain <a href>; `active` flag on items
 *
 * Decorator-free on purpose (avoids per-consumer tsconfig decorator flags).
 * `items` is a property (array) — set it from JS; not an attribute.
 * Icons on `item.icon` may be an esa-icon registry NAME ('chef-hat') or a raw
 * inline SVG string — see the icon() resolver. hub-edit-approved: Andy 2026-06-15.
 */
export interface EsaSidebarNavItem {
  label: string;
  href?: string;
  icon?: string;
  badge?: string | number;
  children?: EsaSidebarNavItem[];
  disabled?: boolean;
  group?: string;
  active?: boolean;
}

interface GroupedNavSection {
  group: string | null;
  items: EsaSidebarNavItem[];
}

// hub-edit-approved: Andy approved (2026-06-15) — collapse/accordion chevrons also
// come from the shared icon-registry (16px), so this component holds zero inline SVG.
const CHEVRONS_LEFT = iconSvg('chevrons-left', 16) ?? '';
const CHEVRONS_RIGHT = iconSvg('chevrons-right', 16) ?? '';
const CHEVRON_UP = iconSvg('chevron-up', 16) ?? '';
const CHEVRON_DOWN = iconSvg('chevron-down', 16) ?? '';

export class EsaSidebarNav extends LitElement {
  static properties = {
    items: { type: Array },
    collapsed: { type: Boolean, reflect: true },
    collapsible: { type: Boolean },
    _expanded: { state: true },
  };

  declare items: EsaSidebarNavItem[];
  declare collapsed: boolean;
  declare collapsible: boolean;
  private _expanded: Set<string>;

  constructor() {
    super();
    this.items = [];
    this.collapsed = false;
    this.collapsible = true;
    this._expanded = new Set<string>();
  }

  private get groupedSections(): GroupedNavSection[] {
    const sections: GroupedNavSection[] = [];
    let currentGroup: string | null = null;
    let currentItems: EsaSidebarNavItem[] = [];

    for (const item of this.items) {
      const group = item.group ?? null;
      if (group !== currentGroup) {
        if (currentItems.length > 0) {
          sections.push({ group: currentGroup, items: currentItems });
        }
        currentGroup = group;
        currentItems = [item];
      } else {
        currentItems.push(item);
      }
    }
    if (currentItems.length > 0) {
      sections.push({ group: currentGroup, items: currentItems });
    }
    return sections;
  }

  private toggleCollapse = (): void => {
    this.collapsed = !this.collapsed;
    this.dispatchEvent(
      new CustomEvent('collapsedchange', {
        detail: { collapsed: this.collapsed },
        bubbles: true,
        composed: true,
      })
    );
  };

  private toggleChildren(item: EsaSidebarNavItem): void {
    const next = new Set(this._expanded);
    if (next.has(item.label)) next.delete(item.label);
    else next.add(item.label);
    this._expanded = next;
  }

  private isExpanded(item: EsaSidebarNavItem): boolean {
    return this._expanded.has(item.label);
  }

  // hub-edit-approved: Andy approved (2026-06-15) — name-or-raw icon resolution.
  // `icon` may be a registry name ('chef-hat') or a raw inline <svg> string.
  // Markup (starts with '<') is injected as-is; otherwise it's resolved by name.
  private icon(icon?: string) {
    if (!icon) return null;
    const svg = icon.trimStart().startsWith('<') ? icon : iconSvg(icon);
    return svg ? html`<span class="icon" .innerHTML=${svg}></span>` : null;
  }

  private badge(value?: string | number) {
    return value != null
      ? html`<span class="badge">${value}</span>`
      : null;
  }

  private renderLeaf(item: EsaSidebarNavItem) {
    if (item.href) {
      return html`<a
        class="link ${item.active ? 'link--active' : ''} ${item.disabled ? 'link--disabled' : ''}"
        href=${item.href}
        tabindex=${item.disabled ? -1 : 0}
        aria-current=${item.active ? 'page' : 'false'}
      >
        ${this.icon(item.icon)}
        <span class="label">${item.label}</span>
        ${this.badge(item.badge)}
      </a>`;
    }
    return html`<span class="link link--inert">
      ${this.icon(item.icon)}
      <span class="label">${item.label}</span>
      ${this.badge(item.badge)}
    </span>`;
  }

  private renderItem(item: EsaSidebarNavItem) {
    if (item.children && item.children.length > 0) {
      const expanded = this.isExpanded(item);
      return html`<li class="item ${item.disabled ? 'item--disabled' : ''}">
        <button
          class="link link--parent ${expanded ? 'link--expanded' : ''}"
          type="button"
          aria-expanded=${expanded}
          ?disabled=${item.disabled}
          @click=${() => this.toggleChildren(item)}
        >
          ${this.icon(item.icon)}
          <span class="label">${item.label}</span>
          ${this.badge(item.badge)}
          <span class="chevron" .innerHTML=${expanded ? CHEVRON_UP : CHEVRON_DOWN}></span>
        </button>
        ${expanded
          ? html`<ul class="children" role="list">
              ${item.children.map(
                (child) => html`<li class="child ${child.disabled ? 'child--disabled' : ''}">
                  ${child.href
                    ? html`<a
                        class="link link--child ${child.active ? 'link--active' : ''} ${child.disabled ? 'link--disabled' : ''}"
                        href=${child.href}
                        tabindex=${child.disabled ? -1 : 0}
                      >
                        ${this.icon(child.icon)}
                        <span class="label">${child.label}</span>
                        ${this.badge(child.badge)}
                      </a>`
                    : html`<span class="link link--child link--inert">
                        ${this.icon(child.icon)}
                        <span class="label">${child.label}</span>
                        ${this.badge(child.badge)}
                      </span>`}
                </li>`
              )}
            </ul>`
          : null}
      </li>`;
    }
    return html`<li class="item ${item.disabled ? 'item--disabled' : ''}">
      ${this.renderLeaf(item)}
    </li>`;
  }

  render() {
    return html`
      <nav class="nav" aria-label="Sidebar navigation">
        <slot name="header"></slot>
        ${this.collapsible
          ? html`<button
              class="toggle"
              type="button"
              aria-label=${this.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              @click=${this.toggleCollapse}
            >
              <span .innerHTML=${this.collapsed ? CHEVRONS_RIGHT : CHEVRONS_LEFT}></span>
            </button>`
          : null}
        <ul class="list" role="list">
          ${this.groupedSections.map(
            (section) => html`
              ${section.group
                ? html`<li class="group-heading" role="presentation">
                    <span class="group-label">${section.group}</span>
                  </li>`
                : null}
              ${section.items.map((item) => this.renderItem(item))}
            `
          )}
        </ul>
      </nav>
    `;
  }

  static styles = css`
    /* The light-DOM box-sizing reset doesn't cross the shadow boundary, so set it
       here — without it, .link (width:100% + padding) overflows the rail, pushing
       the right-aligned badge past the border and shifting collapsed icons off-center. */
    *, *::before, *::after { box-sizing: border-box; }

    :host {
      --_sidenav-width: var(--sidebar-width);
      --_sidenav-collapsed-width: var(--sidebar-width-collapsed);
      --_sidenav-bg: var(--sidenav-bg);
      --_sidenav-border: var(--sidenav-border);
      --_sidenav-item-height: 40px;
      --_sidenav-item-padding: var(--spacing-300);
      --_sidenav-item-radius: var(--radius-200);
      --_sidenav-item-color: var(--sidenav-link-text);
      --_sidenav-item-color-active: var(--sidenav-link-text-active);
      --_sidenav-item-bg-hover: var(--color-surface-sunken);
      --_sidenav-item-bg-active: var(--color-primary-subtle);
      --_sidenav-group-color: var(--sidenav-section-text);
      --_sidenav-transition: var(--transition-base);

      display: block;
      width: var(--_sidenav-width);
      height: 100%;
      border-right: 1px solid var(--_sidenav-border);
      background: var(--_sidenav-bg);
      transition: width var(--_sidenav-transition);
      overflow: hidden;
    }

    :host([collapsed]) { width: var(--_sidenav-collapsed-width); }
    :host([collapsed]) .label,
    :host([collapsed]) .badge,
    :host([collapsed]) .chevron,
    :host([collapsed]) .group-label {
      opacity: 0;
      width: 0;
      /* Collapse to a TRUE zero footprint so justify-content:center can center the
         icon: flex:none (else .label's flex:1 eats the space), and min-width/padding:0
         (else the badge's 20px min-width + padding leaves a ghost that shoves the
         icon off-center). */
      flex: none;
      min-width: 0;
      padding: 0;
      overflow: hidden;
      white-space: nowrap;
    }
    :host([collapsed]) .link { justify-content: center; gap: 0; padding-inline: var(--spacing-200); }
    :host([collapsed]) .children { display: none; }

    .nav {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--spacing-200);
    }

    ::slotted([slot='header']) {
      display: block;
      padding: var(--spacing-300) var(--_sidenav-item-padding);
      margin-bottom: var(--spacing-200);
      overflow: hidden;
      white-space: nowrap;
    }

    .toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 32px;
      margin-bottom: var(--spacing-200);
      border: none;
      border-radius: var(--_sidenav-item-radius);
      background: transparent;
      color: var(--_sidenav-item-color);
      cursor: pointer;
      transition: background 150ms ease;
    }
    .toggle:hover { background: var(--_sidenav-item-bg-hover); }
    .toggle:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }

    .list,
    .children { list-style: none; margin: 0; padding: 0; }
    .children { padding-left: var(--spacing-400); }

    .group-heading {
      padding: var(--spacing-300) var(--_sidenav-item-padding) var(--spacing-100);
    }
    .group-label {
      display: block;
      font-size: var(--type-size-100);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-wide);
      color: var(--_sidenav-group-color);
      white-space: nowrap;
      overflow: hidden;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }

    .link {
      display: flex;
      align-items: center;
      gap: var(--spacing-200);
      width: 100%;
      height: var(--_sidenav-item-height);
      padding: 0 var(--_sidenav-item-padding);
      border: none;
      border-radius: var(--_sidenav-item-radius);
      background: transparent;
      color: var(--_sidenav-item-color);
      font-family: inherit;
      font-size: var(--type-size-200);
      font-weight: var(--font-weight-medium);
      line-height: 1;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
      transition: background 150ms ease, color 150ms ease;
    }
    .link:hover:not(.link--disabled) { background: var(--_sidenav-item-bg-hover); }
    .link:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }

    .link--active {
      color: var(--_sidenav-item-color-active);
      background: var(--_sidenav-item-bg-active);
      font-weight: var(--font-weight-semibold);
    }
    .link--disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    .link--inert { cursor: default; }
    .link--child { height: 36px; font-size: var(--type-size-150); }

    .icon { flex-shrink: 0; display: inline-flex; }
    .label {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }
    .badge {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-text-inverse);
      font-size: var(--type-size-100);
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }
    .chevron {
      flex-shrink: 0;
      margin-left: auto;
      display: inline-flex;
      transition: opacity var(--_sidenav-transition), width var(--_sidenav-transition);
    }

    .item--disabled,
    .child--disabled { opacity: 0.5; pointer-events: none; }
  `;
}

if (!customElements.get('esa-sidebar-nav')) {
  customElements.define('esa-sidebar-nav', EsaSidebarNav);
}
