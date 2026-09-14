import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

type TooltipPosition = 'above' | 'below' | 'left' | 'right';
type TooltipAlign = 'center' | 'start' | 'end';

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
 *
 * Added here: `align` (center|start|end) for above/below placements. There is no
 * collision handling, so the last icon button in a row that ends at the viewport
 * edge would push a centred bubble off-screen; `align="end"` hangs the bubble
 * from the trigger's right edge instead (`start` from its left).
 */
export class EsaTooltip extends LitElement {
  static properties = {
    text: { type: String },
    position: { type: String, reflect: true },
    align: { type: String, reflect: true },
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
  declare align: TooltipAlign;
  declare delay: number;
  declare open: boolean;

  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.text = '';
    this.position = 'above';
    this.align = 'center';
    this.delay = 200;
    this.open = false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.onGlobalKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onGlobalKeydown);
    if (this.showTimeout) clearTimeout(this.showTimeout);
  }

  /**
   * Esc dismisses the tooltip — SC 1.4.13 Content on Hover or Focus, Level AA.
   *
   * The criterion asks for three things and this component only ever had two.
   * HOVERABLE holds by construction: the bubble is a child of the anchor, so moving the
   * pointer onto it never fires the anchor's `mouseleave`. PERSISTENT holds too — there
   * is no auto-hide timer, only the show delay. DISMISSIBLE was missing outright, and
   * for a tooltip that matters more than it looks: it can obscure the very content the
   * user is trying to read, and until now the only way to get rid of it was to move the
   * pointer, which a keyboard or magnifier user may not be doing.
   *
   * ON `document`, NOT ON THE ANCHOR, and that is the whole reason this is not a
   * template binding. The mouse path opens a tooltip whose anchor never receives focus,
   * so a keydown listener on the anchor hears nothing — the user presses Esc and the
   * event goes to whatever they were actually focused on. `esa-filter-dropdown` reaches
   * for `document` for the same reason.
   *
   * It does NOT preventDefault: Esc here is a dismissal, not a consumption, and a
   * tooltip inside an open dialog must not swallow the key that closes the dialog.
   */
  private onGlobalKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.open) return;
    this.onLeave();
  };

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
              <span
                class="esa-tooltip typography-microcopy-sm-subtle esa-tooltip--${this.position} esa-tooltip--align-${this.align}"
                role="tooltip"
              >
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
      /* Enters by fading AND sliding 4px in from the side it sits on — the two
         transforms per position are the rest pose (--_to) and the pose one beat
         before it (--_from); the keyframe reads them so one animation serves all
         four placements. Reduced motion keeps the fade and drops the slide. */
      transform: var(--_to);
      animation: esa-tooltip-in var(--animation-enter, 150ms ease-out) both;
    }
    @keyframes esa-tooltip-in {
      from { opacity: 0; transform: var(--_from); }
      to { opacity: 1; transform: var(--_to); }
    }
    @keyframes esa-tooltip-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .esa-tooltip { animation-name: esa-tooltip-fade; }
    }

    .esa-tooltip--above {
      bottom: calc(100% + 8px);
      left: 50%;
      --_from: translate(-50%, 4px);
      --_to: translate(-50%, 0);
    }
    .esa-tooltip--below {
      top: calc(100% + 8px);
      left: 50%;
      --_from: translate(-50%, -4px);
      --_to: translate(-50%, 0);
    }
    .esa-tooltip--left {
      right: calc(100% + 8px);
      top: 50%;
      --_from: translate(4px, -50%);
      --_to: translate(0, -50%);
    }
    .esa-tooltip--right {
      left: calc(100% + 8px);
      top: 50%;
      --_from: translate(-4px, -50%);
      --_to: translate(0, -50%);
    }

    /* start/end only mean something above or below; left/right keep the vertical centre. */
    .esa-tooltip--above.esa-tooltip--align-start,
    .esa-tooltip--below.esa-tooltip--align-start {
      left: 0;
      --_from: translate(0, var(--_dy));
      --_to: translate(0, 0);
    }
    .esa-tooltip--above.esa-tooltip--align-end,
    .esa-tooltip--below.esa-tooltip--align-end {
      left: auto;
      right: 0;
      --_from: translate(0, var(--_dy));
      --_to: translate(0, 0);
    }
    .esa-tooltip--above { --_dy: 4px; }
    .esa-tooltip--below { --_dy: -4px; }

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

    /* FORCED COLORS. This file ships no 'border:' at all — the tooltip is a dark
       knockout background and a shadow, and the mode flattens the first and
       deletes the second. The ARROW is hidden rather than bordered: it is a
       rotated 8px square, so a border round it renders as a diamond floating
       outside the bubble, and the bubble's own edge already does the job. */
    @media (forced-colors: active) {
      .esa-tooltip { border: 1px solid CanvasText; }
      .esa-tooltip__arrow { display: none; }
    }
  
    /* After the per-position arrow rules on purpose: same specificity, so source order decides. */
    .esa-tooltip--align-start .esa-tooltip__arrow { left: 12px; margin-left: -4px; }
    .esa-tooltip--align-end .esa-tooltip__arrow { left: auto; right: 8px; margin-left: 0; }
`,
  ];
}

if (!customElements.get('esa-tooltip')) {
  customElements.define('esa-tooltip', EsaTooltip);
}
