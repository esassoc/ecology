import { LitElement, html, css } from 'lit';

type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * esa-popover — click/hover anchored popover [wc].
 *
 * Faithful translation of the Angular esaPopover directive + popover content
 * component (which used @angular/cdk/overlay). Reimplemented with plain CSS/JS:
 * the trigger goes in the default slot, the floating content in slot="content".
 * Positioning is done by measuring the trigger and the host (both share a
 * relatively-positioned wrapper) — no CDK, no floating-ui.
 *
 * Inputs preserved: position (top|bottom|left|right), trigger (click|hover),
 * has-arrow, offset. Click mode closes on outside-click + Esc; hover mode opens
 * after a 200ms delay (matching the Angular directive).
 */
export class EsaPopover extends LitElement {
  static properties = {
    position: { type: String, reflect: true },
    trigger: { type: String },
    hasArrow: { type: Boolean, attribute: 'has-arrow' },
    offset: { type: Number },
    open: { type: Boolean, reflect: true },
    appearance: { type: String, reflect: true },
  };

  declare position: PopoverPosition;
  declare trigger: 'click' | 'hover';
  declare hasArrow: boolean;
  declare offset: number;
  declare open: boolean;
  /** Aligned to Beacon's PopoverAppearance: light surface vs dark inverse. */
  declare appearance: 'default' | 'inverse';

  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.position = 'bottom';
    this.trigger = 'click';
    this.hasArrow = true;
    this.offset = 8;
    this.open = false;
    this.appearance = 'default';
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocumentClick, true);
    if (this.showTimeout) clearTimeout(this.showTimeout);
  }

  private show(): void {
    if (this.open) return;
    this.open = true;
    if (this.trigger === 'click') {
      document.addEventListener('click', this.onDocumentClick, true);
    }
  }

  private hide(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('click', this.onDocumentClick, true);
  }

  private onTriggerClick = (): void => {
    if (this.trigger !== 'click') return;
    this.open ? this.hide() : this.show();
  };

  private onMouseEnter = (): void => {
    if (this.trigger !== 'hover') return;
    this.showTimeout = setTimeout(() => this.show(), 200);
  };

  private onMouseLeave = (): void => {
    if (this.trigger !== 'hover') return;
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    this.hide();
  };

  private onDocumentClick = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node) && event.target !== this) {
      this.hide();
    }
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.hide();
    }
  };

  render() {
    return html`
      <div
        class="esa-popover-anchor"
        @click=${this.onTriggerClick}
        @mouseenter=${this.onMouseEnter}
        @mouseleave=${this.onMouseLeave}
        @keydown=${this.onKeydown}
      >
        <slot></slot>
        ${this.open
          ? html`
              <div
                class="esa-popover esa-popover--${this.position}"
                role="dialog"
                style="--_offset: ${this.offset}px"
              >
                ${this.hasArrow
                  ? html`<div class="esa-popover__arrow esa-popover__arrow--${this.position}"></div>`
                  : null}
                <div class="esa-popover__body"><slot name="content"></slot></div>
              </div>
            `
          : null}
      </div>
    `;
  }

  static styles = css`
    :host {
      --_popover-bg: var(--popover-bg, var(--color-surface, #ffffff));
      --_popover-border: var(--popover-border-color, var(--color-border, #e5e5e5));
      --_popover-shadow: var(--shadow-300, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      --_popover-radius: var(--popover-radius, var(--radius-200, 0.5rem));
      --_popover-padding: var(--spacing-300, 0.75rem);
      --_popover-arrow-size: 8px;
      --_popover-color: var(--popover-color, var(--color-text-primary, #171717));
      display: inline-block;
    }

    /* Inverse appearance (Beacon PopoverAppearance='inverse'): dark panel, light
       text — for documentation/help content. Overriding the private bg/border
       tokens re-skins both the panel and the arrow. */
    :host([appearance='inverse']) {
      --_popover-bg: var(--color-gray-12);
      --_popover-border: var(--color-gray-12);
      --_popover-color: var(--color-text-inverse, #ffffff);
    }

    .esa-popover-anchor {
      position: relative;
      display: inline-block;
    }

    .esa-popover {
      position: absolute;
      z-index: var(--z-dropdown, 50);
      min-width: max-content;
      max-width: var(--popover-max-width, none);
      background: var(--_popover-bg);
      border: 1px solid var(--_popover-border);
      border-radius: var(--_popover-radius);
      box-shadow: var(--_popover-shadow);
      animation: esa-popover-fade-in 150ms ease-out;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      color: var(--_popover-color);
    }

    .esa-popover--bottom {
      top: calc(100% + var(--_offset, 8px));
      left: 50%;
      transform: translateX(-50%);
    }
    .esa-popover--top {
      bottom: calc(100% + var(--_offset, 8px));
      left: 50%;
      transform: translateX(-50%);
    }
    .esa-popover--right {
      left: calc(100% + var(--_offset, 8px));
      top: 50%;
      transform: translateY(-50%);
    }
    .esa-popover--left {
      right: calc(100% + var(--_offset, 8px));
      top: 50%;
      transform: translateY(-50%);
    }

    @keyframes esa-popover-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .esa-popover__body {
      padding: var(--_popover-padding);
    }

    .esa-popover__arrow {
      position: absolute;
      width: var(--_popover-arrow-size);
      height: var(--_popover-arrow-size);
      background: var(--_popover-bg);
      border: 1px solid var(--_popover-border);
      transform: rotate(45deg);
    }
    .esa-popover__arrow--bottom {
      top: calc(var(--_popover-arrow-size) / -2);
      left: 50%;
      margin-left: calc(var(--_popover-arrow-size) / -2);
      border-bottom: none;
      border-right: none;
    }
    .esa-popover__arrow--top {
      bottom: calc(var(--_popover-arrow-size) / -2);
      left: 50%;
      margin-left: calc(var(--_popover-arrow-size) / -2);
      border-top: none;
      border-left: none;
    }
    .esa-popover__arrow--right {
      left: calc(var(--_popover-arrow-size) / -2);
      top: 50%;
      margin-top: calc(var(--_popover-arrow-size) / -2);
      border-top: none;
      border-right: none;
    }
    .esa-popover__arrow--left {
      right: calc(var(--_popover-arrow-size) / -2);
      top: 50%;
      margin-top: calc(var(--_popover-arrow-size) / -2);
      border-bottom: none;
      border-left: none;
    }
  `;
}

if (!customElements.get('esa-popover')) {
  customElements.define('esa-popover', EsaPopover);
}
