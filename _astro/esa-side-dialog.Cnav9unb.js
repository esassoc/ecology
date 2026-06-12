import{i as a,b as i,a as n}from"./lit-element.C8p3bJxG.js";class l extends a{constructor(){super(),this.previousFocus=null,this.onKeydown=e=>{e.key==="Escape"?(e.preventDefault(),this.close()):e.key==="Tab"&&this.trapFocus(e)},this.open=!1,this.heading="",this.position="right",this.size="md",this.showCloseButton=!0,this.closing=!1}static{this.properties={open:{type:Boolean,reflect:!0},heading:{type:String},position:{type:String,reflect:!0},size:{type:String,reflect:!0},showCloseButton:{type:Boolean,attribute:"show-close-button"},closing:{state:!0}}}updated(e){e.has("open")&&(this.open?(this.previousFocus=document.activeElement,requestAnimationFrame(()=>this.focusFirst())):e.get("open")&&this.previousFocus?.focus?.())}show(){clearTimeout(this.closeTimer),this.closing=!1,this.open=!0}close(){this.open&&(this.open=!1,this.closing=!0,clearTimeout(this.closeTimer),this.closeTimer=setTimeout(()=>{this.closing=!1},200),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0})))}focusable(){const e='a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',t=this.renderRoot.querySelectorAll(e),o=Array.from(this.querySelectorAll(e));return[...Array.from(t),...o].filter(s=>s.offsetParent!==null)}focusFirst(){const e=this.focusable();e.length?e[0].focus():this.renderRoot.querySelector(".panel")?.focus()}trapFocus(e){const t=this.focusable();if(!t.length)return;const o=t[0],s=t[t.length-1],r=this.renderRoot.activeElement||document.activeElement;e.shiftKey&&r===o?(e.preventDefault(),s.focus()):!e.shiftKey&&r===s&&(e.preventDefault(),o.focus())}render(){if(!this.open&&!this.closing)return i``;const e=!!this.querySelector('[slot="header"]'),t=this.heading||this.showCloseButton||e,o=this.closing&&!this.open;return i`
      <div class="backdrop ${o?"is-closing":""}" @click=${this.close}></div>
      <div
        class="panel ${o?"is-closing":""}"
        role="dialog"
        aria-modal="true"
        aria-label=${this.heading||"Side dialog"}
        tabindex="-1"
        @keydown=${this.onKeydown}
      >
        ${t?i`<header class="header">
              <slot name="header"><h2 class="title">${this.heading}</h2></slot>
              ${this.showCloseButton?i`<button class="close" @click=${this.close} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>`:null}
            </header>`:null}
        <div class="body"><slot></slot></div>
        <footer class="footer"><slot name="footer"></slot></footer>
      </div>
    `}static{this.styles=n`
    :host { --_width: 400px; }
    :host([size='sm']) { --_width: 320px; }
    :host([size='lg']) { --_width: 520px; }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.5));
      /* Opt-in frosted backdrop — set --backdrop-filter (e.g. blur(4px)) on the host. */
      backdrop-filter: var(--backdrop-filter, none);
      -webkit-backdrop-filter: var(--backdrop-filter, none);
      z-index: var(--z-modal-backdrop, 300);
      animation: fade 150ms ease;
    }
    /* Inset floating panel (matches Beacon prod .ui-side-dialog): 16px gap on the
       top / bottom / anchored side, rounded corners. --_inset is overridable. */
    .panel {
      --_inset: var(--side-dialog-inset, 16px);
      position: fixed;
      top: var(--_inset);
      bottom: var(--_inset);
      width: min(var(--_width), calc(100vw - var(--_inset) * 2));
      display: flex;
      flex-direction: column;
      background: var(--color-surface, #fff);
      border-radius: var(--radius-200, 8px);
      box-shadow: var(--shadow-400, 0 8px 32px -8px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      outline: none;
      overflow: hidden;
      /* Hosts may re-point --side-dialog-inset while open (e.g. card-stacking a
         second dialog on top) — ease the reposition instead of jumping. */
      transition: top 220ms ease, right 220ms ease, bottom 220ms ease, left 220ms ease;
    }
    :host([position='right']) .panel { right: var(--_inset); animation: slide-right 220ms ease; }
    :host([position='left']) .panel { left: var(--_inset); animation: slide-left 220ms ease; }
    /* Exit: keep the end state so it doesn't flash back before unmounting. */
    :host([position='right']) .panel.is-closing { animation: slide-out-right 200ms ease forwards; }
    :host([position='left']) .panel.is-closing { animation: slide-out-left 200ms ease forwards; }
    .backdrop.is-closing { animation: fade-out 150ms ease forwards; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-400, 1rem) var(--spacing-500, 1.5rem);
      border-bottom: 1px solid var(--color-border, #e5e5e5);
      flex: none;
    }
    .title { margin: 0; font-size: var(--type-size-400, 1.25rem); font-weight: var(--font-weight-semibold, 600); color: var(--color-text-primary, #171717); }
    .close {
      display: grid; place-items: center; width: 32px; height: 32px;
      border: 0; border-radius: var(--radius-100, 4px); background: none;
      color: var(--color-text-muted, #737373); cursor: pointer;
    }
    .close:hover { background: var(--color-surface-sunken, #efefef); color: var(--color-text-primary, #171717); }
    .body { flex: 1; overflow-y: auto; padding: var(--spacing-500, 1.5rem); color: var(--color-text-secondary, #525252); }
    .footer { flex: none; padding: var(--spacing-400, 1rem) var(--spacing-500, 1.5rem); border-top: 1px solid var(--color-border, #e5e5e5); }
    .footer:not(:has(*)) { display: none; }

    @keyframes fade { from { opacity: 0; } }
    @keyframes fade-out { to { opacity: 0; } }
    /* Offset by the inset so the panel fully clears the viewport edge. */
    @keyframes slide-right { from { transform: translateX(calc(100% + var(--_inset))); } }
    @keyframes slide-left { from { transform: translateX(calc(-100% - var(--_inset))); } }
    @keyframes slide-out-right { to { transform: translateX(calc(100% + var(--_inset))); } }
    @keyframes slide-out-left { to { transform: translateX(calc(-100% - var(--_inset))); } }
  `}}customElements.get("esa-side-dialog")||customElements.define("esa-side-dialog",l);
