import{i as o,b as t,a}from"./lit-element.D8DSg5zn.js";import{t as s}from"./typography.KBHeYOQc.js";class i extends o{constructor(){super(),this.showTimeout=null,this.onGlobalKeydown=e=>{e.key!=="Escape"||!this.open||this.onLeave()},this.onEnter=()=>{this.open||!this.text||(this.showTimeout=setTimeout(()=>{this.open=!0},this.delay))},this.onLeave=()=>{this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=null),this.open=!1},this.text="",this.position="above",this.align="center",this.delay=200,this.open=!1}static{this.properties={text:{type:String},position:{type:String,reflect:!0},align:{type:String,reflect:!0},delay:{type:Number},open:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onGlobalKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onGlobalKeydown),this.showTimeout&&clearTimeout(this.showTimeout)}render(){return t`
      <span
        class="esa-tooltip-anchor typography-label-md"
        @mouseenter=${this.onEnter}
        @mouseleave=${this.onLeave}
        @focusin=${this.onEnter}
        @focusout=${this.onLeave}
      >
        <slot></slot>
        ${this.open&&this.text?t`
              <span
                class="esa-tooltip typography-microcopy-xs-subtle esa-tooltip--${this.position} esa-tooltip--align-${this.align}"
                role="tooltip"
              >
                <span class="esa-tooltip__text">${this.text}</span>
                <span class="esa-tooltip__arrow"></span>
              </span>
            `:null}
      </span>
    `}static{this.styles=[s,a`
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
      padding: var(--spacing-150, 0.375rem) var(--spacing-250, 0.625rem);
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
`]}}customElements.get("esa-tooltip")||customElements.define("esa-tooltip",i);
