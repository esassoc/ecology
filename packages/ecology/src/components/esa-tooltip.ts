import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

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

  /**
   * What the hovered element means or does, when its own label doesn't already
   * say. e.g. "Search", "Least-advanced covering permit — its status sets this
   * segment's status". Don't restate the trigger's visible label — that's redundant.
   */
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
        class="esa-tooltip-anchor typography-label-md"
        @mouseenter=${this.onEnter}
        @mouseleave=${this.onLeave}
        @focusin=${this.onEnter}
        @focusout=${this.onLeave}
      >
        <slot></slot>
        ${this.open && this.text
          ? html`
              <span class="esa-tooltip typography-microcopy-sm-subtle esa-tooltip--${this.position}" role="tooltip">
                <span class="esa-tooltip__text">${this.text}</span>
                <span class="esa-tooltip__arrow"></span>
              </span>
            `
          : null}
      </span>
    `;
  }

  static styles = [
    typography,
    css`
    :host { display: inline-block; }

    .esa-tooltip-anchor {
      position: relative;
      display: inline-flex;
    }

    .esa-tooltip {
      position: absolute;
      z-index: var(--z-tooltip, 600);
      background: var(--color-background-default-knockout);
      color: var(--color-content-default-knockout, #fcfcfc);
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border-radius: var(--radius-sm, 0.25rem);
      /* Leading comes from microcopy-sm-subtle. This carried a tight override
         justified as "a tooltip may wrap to two or three lines" — but the rule
         below sets white-space: nowrap, so it never wraps and never did. The
         override was correcting for a case this component cannot produce.
         --tooltip-max-width is in the same position: nowrap makes it inert. */
      max-width: var(--tooltip-max-width, 240px);
      pointer-events: none;
      white-space: nowrap;
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      animation: esa-tooltip-fade var(--animation-enter, 150ms ease-out);
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
      background: var(--color-background-default-knockout);
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

    /* FORCED COLORS. This file ships no `border:` at all — the tooltip is a dark
       knockout background and a shadow, and the mode flattens the first and
       deletes the second. The ARROW is hidden rather than bordered: it is a
       rotated 8px square, so a border round it renders as a diamond floating
       outside the bubble, and the bubble's own edge already does the job. */
    @media (forced-colors: active) {
      .esa-tooltip { border: 1px solid CanvasText; }
      .esa-tooltip__arrow { display: none; }
    }
  `,
  ];
}

if (!customElements.get('esa-tooltip')) {
  customElements.define('esa-tooltip', EsaTooltip);
}
