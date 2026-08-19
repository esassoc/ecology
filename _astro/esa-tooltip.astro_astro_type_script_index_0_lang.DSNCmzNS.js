import{i as o,b as t,a as e}from"./lit-element.D8DSg5zn.js";import{t as a}from"./typography.KBHeYOQc.js";class i extends o{constructor(){super(),this.showTimeout=null,this.onEnter=()=>{this.open||!this.text||(this.showTimeout=setTimeout(()=>{this.open=!0},this.delay))},this.onLeave=()=>{this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=null),this.open=!1},this.text="",this.position="above",this.delay=200,this.open=!1}static{this.properties={text:{type:String},position:{type:String,reflect:!0},delay:{type:Number},open:{type:Boolean,reflect:!0}}}disconnectedCallback(){super.disconnectedCallback(),this.showTimeout&&clearTimeout(this.showTimeout)}render(){return t`
      <span
        class="esa-tooltip-anchor typography-label-md"
        @mouseenter=${this.onEnter}
        @mouseleave=${this.onLeave}
        @focusin=${this.onEnter}
        @focusout=${this.onLeave}
      >
        <slot></slot>
        ${this.open&&this.text?t`
              <span class="esa-tooltip typography-microcopy-sm-subtle esa-tooltip--${this.position}" role="tooltip">
                <span class="esa-tooltip__text">${this.text}</span>
                <span class="esa-tooltip__arrow"></span>
              </span>
            `:null}
      </span>
    `}static{this.styles=[a,e`
    :host { display: inline-block; }

    .esa-tooltip-anchor {
      position: relative;
      display: inline-flex;
    }

    .esa-tooltip {
      position: absolute;
      z-index: var(--z-tooltip, 600);
      background: var(--tooltip-bg, var(--color-background-default-knockout));
      color: var(--tooltip-color, var(--color-content-default-knockout, #ffffff));
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border-radius: var(--tooltip-radius, var(--radius-control, 0.25rem));
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
      background: var(--tooltip-bg, var(--color-background-default-knockout));
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
  `]}}customElements.get("esa-tooltip")||customElements.define("esa-tooltip",i);
