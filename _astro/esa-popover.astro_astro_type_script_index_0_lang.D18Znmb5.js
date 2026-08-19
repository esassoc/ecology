import{i as n,A as i,b as t,a as p}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";import{d as c,r as h,F as a}from"./overlay.BBIxLHx2.js";import{b as d}from"./boolish.DOQu-9JQ.js";class v extends n{constructor(){super(),this.showTimeout=null,this.onDocumentKeydown=e=>{e.key==="Escape"&&this.open&&(e.preventDefault(),this.hide())},this.onTriggerClick=()=>{this.trigger==="click"&&(this.open?this.hide():this.show())},this.onMouseEnter=()=>{this.trigger==="hover"&&(this.showTimeout=setTimeout(()=>this.show(),200))},this.onMouseLeave=()=>{this.trigger==="hover"&&(this.cancelPending(),this.hide())},this.onFocusIn=()=>{this.trigger==="hover"&&(this.cancelPending(),this.show())},this.onFocusOut=e=>{if(this.trigger!=="hover")return;const r=e.relatedTarget;r&&this.contains(r)||(this.cancelPending(),this.hide())},this.onDocumentClick=e=>{!this.contains(e.target)&&e.target!==this&&this.hide()},this.position="bottom",this.trigger="click",this.hasArrow=!0,this.offset=8,this.open=!1,this.appearance="default",this.label=""}static{this.properties={position:{type:String,reflect:!0},trigger:{type:String},hasArrow:{type:Boolean,attribute:"has-arrow",converter:d},offset:{type:Number},open:{type:Boolean,reflect:!0},appearance:{type:String,reflect:!0},label:{type:String}}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.onDocumentClick,!0),document.removeEventListener("keydown",this.onDocumentKeydown,!0),this.showTimeout&&clearTimeout(this.showTimeout)}show(){this.open||(this.open=!0,this.trigger==="click"&&document.addEventListener("click",this.onDocumentClick,!0),document.addEventListener("keydown",this.onDocumentKeydown,!0))}hide(){if(!this.open)return;this.open=!1,document.removeEventListener("click",this.onDocumentClick,!0),document.removeEventListener("keydown",this.onDocumentKeydown,!0);const e=c();e&&(this.contains(e)||this.renderRoot.contains(e))&&h(this.triggerEl)}get triggerEl(){const o=(this.renderRoot.querySelector("slot:not([name])")?.assignedElements({flatten:!0})??[]).find(s=>s instanceof HTMLElement);return o?o.matches(a)?o:o.querySelector(a)??o:null}syncTrigger(){const e=this.triggerEl;e&&(e.setAttribute("aria-expanded",String(this.open)),this.label&&e.setAttribute("aria-haspopup","dialog"))}updated(){this.syncTrigger()}cancelPending(){this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=null)}render(){return t`
      <div
        class="esa-popover-anchor typography-label-md"
        @click=${this.onTriggerClick}
        @mouseenter=${this.onMouseEnter}
        @mouseleave=${this.onMouseLeave}
        @focusin=${this.onFocusIn}
        @focusout=${this.onFocusOut}
      >
        <slot></slot>
        ${this.open?t`
              <div
                class="esa-popover esa-popover--${this.position}"
                id="popover"
                role=${this.label?"dialog":i}
                aria-label=${this.label||i}
                style="--_offset: ${this.offset}px"
              >
                ${this.hasArrow?t`<div class="esa-popover__arrow esa-popover__arrow--${this.position}"></div>`:null}
                <div class="esa-popover__body typography-body-md"><slot name="content"></slot></div>
              </div>
            `:null}
      </div>
    `}static{this.styles=[l,p`
    :host {
      --_popover-bg: var(--color-background-elevation-raised, #fcfcfc);
      --_popover-border: var(--color-border-default, #cecece);
      --_popover-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      --_popover-radius: var(--radius-md, 0.5rem);
      --_popover-padding: var(--spacing-300, 0.75rem);
      --_popover-arrow-size: 8px;
      --_popover-color: var(--color-content-default, #202020);
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
      --_popover-color: var(--color-content-default-knockout, #fcfcfc);
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
  `]}}customElements.get("esa-popover")||customElements.define("esa-popover",v);
