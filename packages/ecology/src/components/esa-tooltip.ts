import { LitElement, html, css } from 'lit';

type TooltipPosition = 'above' | 'below' | 'left' | 'right';

/**
 * esa-tooltip — hover/focus tooltip [wc].
 *
 * Faithful translation of the Angular esaTooltip directive + tooltip panel
 * (which used @angular/cdk/overlay). Reimplemented with plain CSS/JS: the
 * trigger goes in the default slot, the tooltip text is the `text` attribute.
 * Positioning is CSS-absolute relative to a wrapper — no CDK.
 *
 * Inputs preserved: text, position (above|below|left|right), delay (ms, default
 * 200). Shows on mouseenter/focusin, hides on mouseleave/focusout, matching the
 * Angular directive's host bindings.
 */
export class EsaTooltip extends LitElement {
  static properties = {
    text: { type: String },
    position: { type: String, reflect: true },
    delay: { type: Number },
    open: { type: Boolean, reflect: true },
  };

  declare text: string;
  declare position: TooltipPosition;
  declare delay: number;
  declare open: boolean;

  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.text = '';
    this.position = 'above';
    this.delay = 200;
    this.open = false;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.showTimeout) clearTimeout(this.showTimeout);
  }

  private onEnter = (): void => {
    if (this.open || !this.text) return;
    this.showTimeout = setTimeout(() => {
      this.open = true;
    }, this.delay);
  };

  private onLeave = (): void => {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    this.open = false;
  };

  render() {
    return html`
      <span
        class="esa-tooltip-anchor"
        @mouseenter=${this.onEnter}
        @mouseleave=${this.onLeave}
        @focusin=${this.onEnter}
        @focusout=${this.onLeave}
      >
        <slot></slot>
        ${this.open && this.text
          ? html`
              <span class="esa-tooltip esa-tooltip--${this.position}" role="tooltip">
                <span class="esa-tooltip__text">${this.text}</span>
                <span class="esa-tooltip__arrow"></span>
              </span>
            `
          : null}
      </span>
    `;
  }

  static styles = css`
    :host { display: inline-block; }

    .esa-tooltip-anchor {
      position: relative;
      display: inline-flex;
    }

    .esa-tooltip {
      position: absolute;
      z-index: var(--z-tooltip, 600);
      background: var(--color-gray-900, #171717);
      color: var(--color-text-inverse, #ffffff);
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border-radius: var(--radius-100, 0.25rem);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: var(--type-size-150, 0.875rem);
      line-height: var(--line-height-tight, 1.3);
      max-width: 240px;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: var(--shadow-100, 0 2px 12px rgba(0, 0, 0, 0.04));
      animation: esa-tooltip-fade 120ms ease-out;
    }
    @keyframes esa-tooltip-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .esa-tooltip--above {
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
    }
    .esa-tooltip--below {
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
    }
    .esa-tooltip--left {
      right: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
    }
    .esa-tooltip--right {
      left: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
    }

    .esa-tooltip__arrow {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--color-gray-900, #171717);
      transform: rotate(45deg);
    }
    .esa-tooltip--above .esa-tooltip__arrow {
      bottom: -4px;
      left: 50%;
      margin-left: -4px;
    }
    .esa-tooltip--below .esa-tooltip__arrow {
      top: -4px;
      left: 50%;
      margin-left: -4px;
    }
    .esa-tooltip--left .esa-tooltip__arrow {
      right: -4px;
      top: 50%;
      margin-top: -4px;
    }
    .esa-tooltip--right .esa-tooltip__arrow {
      left: -4px;
      top: 50%;
      margin-top: -4px;
    }
  `;
}

if (!customElements.get('esa-tooltip')) {
  customElements.define('esa-tooltip', EsaTooltip);
}
