import{i as d,b as r,a as l}from"./lit-element.C8p3bJxG.js";class n extends d{constructor(){super(),this.previousFocus=null,this.onKeydown=e=>{this.open&&(e.key==="Escape"?(e.preventDefault(),this.close()):e.key==="Tab"&&this.trapFocus(e))},this.onBackdropClick=()=>{this.close()},this.open=!1,this.heading="",this.showCloseButton=!0,this.size="md"}static{this.properties={open:{type:Boolean,reflect:!0},heading:{type:String},showCloseButton:{type:Boolean,attribute:"show-close-button"},size:{type:String,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeydown)}updated(e){e.has("open")&&(this.open?(this.previousFocus=document.activeElement,requestAnimationFrame(()=>this.focusFirst())):this.previousFocus&&(this.previousFocus.focus?.(),this.previousFocus=null))}show(){this.open=!0}close(){this.open&&(this.open=!1,this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0})))}focusable(){const o=this.renderRoot.querySelector(".esa-dialog");if(!o)return[];const i=o.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),s=Array.from(this.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));return[...Array.from(i),...s].filter(t=>t.offsetParent!==null||t===this)}focusFirst(){const e=this.focusable();e.length?e[0].focus():this.renderRoot.querySelector(".esa-dialog")?.focus()}trapFocus(e){const o=this.focusable();if(o.length===0)return;const i=o[0],s=o[o.length-1],t=this.renderRoot.activeElement||document.activeElement;e.shiftKey&&t===i?(e.preventDefault(),s.focus()):!e.shiftKey&&t===s&&(e.preventDefault(),i.focus())}render(){if(!this.open)return r``;const e=this.heading||this.showCloseButton||!!this.querySelector('[slot="header"]');return r`
      <div class="esa-dialog-backdrop" @click=${this.onBackdropClick}></div>
      <div class="esa-dialog-panel">
        <div class="esa-dialog" role="dialog" aria-modal="true" aria-label=${this.heading||"Dialog"} tabindex="-1">
          ${e?r`
                <div class="esa-dialog__header">
                  <slot name="header"><h2 class="esa-dialog__title">${this.heading}</h2></slot>
                  ${this.showCloseButton?r`
                        <button class="esa-dialog__close" @click=${this.close} aria-label="Close dialog">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      `:null}
                </div>
              `:null}
          <div class="esa-dialog__body"><slot></slot></div>
          <div class="esa-dialog__footer"><slot name="footer"></slot></div>
        </div>
      </div>
    `}static{this.styles=l`
    :host {
      --_dialog-bg: var(--dialog-bg, var(--color-surface-elevated, #ffffff));
      --_dialog-border-radius: var(--dialog-radius, var(--radius-400, 0.75rem));
      --_dialog-padding: var(--spacing-500, 1.5rem);
      --_dialog-header-border: var(--dialog-border-color, var(--color-border-light, #efefef));
      /* Optional header/footer surface tints — a spoke fills these to frame the
         body; default transparent leaves existing consumers unchanged. */
      --_dialog-header-bg: var(--dialog-header-bg, transparent);
      --_dialog-footer-bg: var(--dialog-footer-bg, transparent);
      --_dialog-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
      --_dialog-width: var(--dialog-width, 480px);
      --_dialog-max-height: 85vh;
    }
    /* base :host = md (480px). xs is one step below sm. */
    :host([size='xs']) { --_dialog-width: var(--dialog-width-xs, 280px); }
    :host([size='sm']) { --_dialog-width: var(--dialog-width-sm, 360px); }
    :host([size='lg']) { --_dialog-width: var(--dialog-width-lg, 640px); }
    :host([size='fullscreen']) {
      --_dialog-width: 100vw;
      --_dialog-max-height: 100vh;
      --_dialog-border-radius: 0;
    }

    .esa-dialog-backdrop {
      position: fixed;
      inset: 0;
      background: var(--dialog-backdrop-bg, var(--color-backdrop, rgba(0, 0, 0, 0.5)));
      z-index: var(--z-modal-backdrop, 300);
    }
    .esa-dialog-panel {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 400);
      pointer-events: none;
    }

    .esa-dialog {
      pointer-events: auto;
      background: var(--_dialog-bg);
      border-radius: var(--_dialog-border-radius);
      box-shadow: var(--_dialog-shadow);
      width: var(--_dialog-width);
      max-width: 100vw;
      max-height: var(--_dialog-max-height);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
    }
    .esa-dialog:focus { outline: none; }

    /* hub-edit-approved: user approved hub edits this session (2026-06-30) — on
       narrow (mobile) viewports a centered dialog reads better as a bottom sheet:
       docked to the bottom edge, full width, only the top corners rounded, and
       sliding up on open. */
    @media (max-width: 600px) {
      .esa-dialog-panel { align-items: flex-end; }
      .esa-dialog {
        width: 100%;
        max-width: 100%;
        max-height: 92vh;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        animation: esa-dialog-sheet-in 0.24s ease;
      }
    }
    @keyframes esa-dialog-sheet-in {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .esa-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--_dialog-padding);
      background: var(--_dialog-header-bg);
      border-bottom: 1px solid var(--_dialog-header-border);
      flex-shrink: 0;
    }
    .esa-dialog__title {
      font-size: var(--type-size-400, 1.125rem);
      font-weight: var(--font-weight-semibold, 550);
      margin: 0;
      color: var(--dialog-color, var(--color-text-primary, #171717));
    }
    .esa-dialog__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-200, 0.5rem);
      background: transparent;
      color: var(--color-text-secondary, #525252);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-dialog__close:hover { background: var(--color-surface-sunken, #efefef); }
    .esa-dialog__close:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .esa-dialog__body {
      padding: var(--_dialog-padding);
      overflow-y: auto;
      flex: 1;
      color: var(--dialog-color, var(--color-text-primary, #171717));
    }
    .esa-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--_dialog-padding);
      background: var(--_dialog-footer-bg);
      border-top: 1px solid var(--_dialog-header-border);
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
      flex-shrink: 0;
    }
    .esa-dialog__footer:not(:has(*)) { display: none; }
  `}}customElements.get("esa-dialog")||customElements.define("esa-dialog",n);document.querySelectorAll(".trigger").forEach(a=>a.addEventListener("click",()=>{document.getElementById(a.dataset.target)?.show()}));document.querySelectorAll(".trigger-close").forEach(a=>a.addEventListener("click",()=>{document.getElementById(a.dataset.close)?.close()}));
