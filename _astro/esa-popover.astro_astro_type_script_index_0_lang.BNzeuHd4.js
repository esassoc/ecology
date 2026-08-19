import{i as r,b as e,a as t}from"./lit-element.D8DSg5zn.js";import{t as a}from"./typography.KBHeYOQc.js";class i extends r{constructor(){super(),this.showTimeout=null,this.onTriggerClick=()=>{this.trigger==="click"&&(this.open?this.hide():this.show())},this.onMouseEnter=()=>{this.trigger==="hover"&&(this.showTimeout=setTimeout(()=>this.show(),200))},this.onMouseLeave=()=>{this.trigger==="hover"&&(this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=null),this.hide())},this.onDocumentClick=o=>{!this.contains(o.target)&&o.target!==this&&this.hide()},this.onKeydown=o=>{o.key==="Escape"&&this.open&&(o.preventDefault(),this.hide())},this.position="bottom",this.trigger="click",this.hasArrow=!0,this.offset=8,this.open=!1,this.appearance="default"}static{this.properties={position:{type:String,reflect:!0},trigger:{type:String},hasArrow:{type:Boolean,attribute:"has-arrow"},offset:{type:Number},open:{type:Boolean,reflect:!0},appearance:{type:String,reflect:!0}}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocumentClick,!0),this.showTimeout&&clearTimeout(this.showTimeout)}show(){this.open||(this.open=!0,this.trigger==="click"&&document.addEventListener("click",this.onDocumentClick,!0))}hide(){this.open&&(this.open=!1,document.removeEventListener("click",this.onDocumentClick,!0))}render(){return e`
      <div
        class="esa-popover-anchor typography-label-md"
        @click=${this.onTriggerClick}
        @mouseenter=${this.onMouseEnter}
        @mouseleave=${this.onMouseLeave}
        @keydown=${this.onKeydown}
      >
        <slot></slot>
        ${this.open?e`
              <div
                class="esa-popover esa-popover--${this.position}"
                role="dialog"
                style="--_offset: ${this.offset}px"
              >
                ${this.hasArrow?e`<div class="esa-popover__arrow esa-popover__arrow--${this.position}"></div>`:null}
                <div class="esa-popover__body typography-body-md"><slot name="content"></slot></div>
              </div>
            `:null}
      </div>
    `}static{this.styles=[a,t`
    :host {
      --_popover-bg: var(--popover-bg, var(--color-background-elevation-raised, #ffffff));
      --_popover-border: var(--popover-border-color, var(--color-border-default, #e5e5e5));
      --_popover-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      --_popover-radius: var(--popover-radius, var(--radius-surface, 0.5rem));
      --_popover-padding: var(--spacing-300, 0.75rem);
      --_popover-arrow-size: 8px;
      --_popover-color: var(--popover-color, var(--color-content-default, #171717));
      display: inline-block;
    }

    /* Knocked-out appearance (Beacon PopoverAppearance='inverse'): dark panel,
       light text — for documentation/help content. Overriding the private
       bg/border tokens re-skins both the panel and the arrow, which carries the
       same border and kills one side per position.

       THE BORDER USED TO BE THE BACKGROUND — a workaround, not a choice. There
       was no knocked-out border token, and the only alternative was
       --color-border-default, which is a hairline built for a light ground and
       vanishes into a near-black panel. Setting border = bg made it invisible on
       purpose. --color-border-default-knockout is the real answer and it flips
       with the theme, so this panel keeps a visible edge in both schemes. */
    :host([appearance='inverse']) {
      --_popover-bg: var(--color-background-default-knockout);
      --_popover-border: var(--color-border-default-knockout, #484848);
      --_popover-color: var(--color-content-default-knockout, #ffffff);
    }

    /* label-md is the trigger's default type role — it inherits through the slot
       to whatever is slotted in, and the panel below re-declares its own. */
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
      border: var(--border-width-default, 1px) solid var(--_popover-border);
      border-radius: var(--_popover-radius);
      box-shadow: var(--_popover-shadow);
      animation: esa-popover-fade-in var(--animation-enter, 150ms ease-out);
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
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
      border: var(--border-width-default, 1px) solid var(--_popover-border);
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
  `]}}customElements.get("esa-popover")||customElements.define("esa-popover",i);
