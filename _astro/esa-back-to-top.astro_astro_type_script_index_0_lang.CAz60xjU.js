import{i as s,b as e,a}from"./lit-element.C8p3bJxG.js";class i extends s{constructor(){super(),this.scrollHandler=null,this.scrollToTop=()=>{const o=this.smoothScroll?"smooth":"auto",t=this.scrollTarget;t?t.scrollTo({top:0,behavior:o}):window.scrollTo({top:0,behavior:o})},this.threshold=300,this.smoothScroll=!0,this.scrollTarget=null,this.visible=!1}static{this.properties={threshold:{type:Number},smoothScroll:{type:Boolean,attribute:"smooth-scroll"},scrollTarget:{attribute:!1},visible:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.scrollHandler=()=>{const t=this.scrollTarget,r=(t?t.scrollTop:window.scrollY||document.documentElement.scrollTop)>this.threshold;r!==this.visible&&(this.visible=r)},(this.scrollTarget||window).addEventListener("scroll",this.scrollHandler,{passive:!0}),this.scrollHandler()}disconnectedCallback(){super.disconnectedCallback(),this.scrollHandler&&((this.scrollTarget||window).removeEventListener("scroll",this.scrollHandler),this.scrollHandler=null)}render(){return e`
      <button
        class="button"
        part="button"
        type="button"
        aria-label="Back to top"
        @click=${this.scrollToTop}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 7-7 7 7"></path>
          <path d="M12 19V5"></path>
        </svg>
      </button>
    `}static{this.styles=a`
    :host {
      --_btt-size: 44px;
      --_btt-bg: var(--color-primary, #005862);
      --_btt-text: var(--color-text-inverse, #fff);
      --_btt-shadow: var(--shadow-300, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      --_btt-radius: var(--radius-full, 9999px);
      --_btt-bottom: var(--spacing-500, 1.5rem);
      --_btt-right: var(--spacing-500, 1.5rem);

      position: fixed;
      bottom: var(--_btt-bottom);
      right: var(--_btt-right);
      z-index: var(--z-sidebar, 100);
      pointer-events: none;
      opacity: 0;
      transform: translateY(16px);
      transition: opacity var(--transition-base, 200ms ease),
                  transform var(--transition-base, 200ms ease);
    }

    :host([visible]) {
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0);
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_btt-size);
      height: var(--_btt-size);
      border: none;
      border-radius: var(--_btt-radius);
      background: var(--_btt-bg);
      color: var(--_btt-text);
      box-shadow: var(--_btt-shadow);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease),
                  box-shadow var(--transition-fast, 150ms ease),
                  transform var(--transition-fast, 150ms ease);
    }

    .button:hover {
      background: var(--color-primary-hover, #004752);
      box-shadow: var(--shadow-400, 0 8px 32px -8px rgba(0, 0, 0, 0.08));
    }

    .button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .button:active {
      transform: scale(0.95);
    }
  `}}customElements.get("esa-back-to-top")||customElements.define("esa-back-to-top",i);
