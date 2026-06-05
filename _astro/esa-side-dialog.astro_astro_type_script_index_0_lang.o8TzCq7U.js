import{i as n,b as r,a as l}from"./lit-element.C8p3bJxG.js";class d extends n{constructor(){super(),this.previousFocus=null,this.onKeydown=e=>{e.key==="Escape"?(e.preventDefault(),this.close()):e.key==="Tab"&&this.trapFocus(e)},this.open=!1,this.heading="",this.position="right",this.size="md",this.showCloseButton=!0}static{this.properties={open:{type:Boolean,reflect:!0},heading:{type:String},position:{type:String,reflect:!0},size:{type:String,reflect:!0},showCloseButton:{type:Boolean,attribute:"show-close-button"}}}updated(e){e.has("open")&&(this.open?(this.previousFocus=document.activeElement,requestAnimationFrame(()=>this.focusFirst())):e.get("open")&&this.previousFocus?.focus?.())}show(){this.open=!0}close(){this.open&&(this.open=!1,this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0})))}focusable(){const e='a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',o=this.renderRoot.querySelectorAll(e),s=Array.from(this.querySelectorAll(e));return[...Array.from(o),...s].filter(i=>i.offsetParent!==null)}focusFirst(){const e=this.focusable();e.length?e[0].focus():this.renderRoot.querySelector(".panel")?.focus()}trapFocus(e){const o=this.focusable();if(!o.length)return;const s=o[0],i=o[o.length-1],a=this.renderRoot.activeElement||document.activeElement;e.shiftKey&&a===s?(e.preventDefault(),i.focus()):!e.shiftKey&&a===i&&(e.preventDefault(),s.focus())}render(){if(!this.open)return r``;const e=!!this.querySelector('[slot="header"]'),o=this.heading||this.showCloseButton||e;return r`
      <div class="backdrop" @click=${this.close}></div>
      <div
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-label=${this.heading||"Side dialog"}
        tabindex="-1"
        @keydown=${this.onKeydown}
      >
        ${o?r`<header class="header">
              <slot name="header"><h2 class="title">${this.heading}</h2></slot>
              ${this.showCloseButton?r`<button class="close" @click=${this.close} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>`:null}
            </header>`:null}
        <div class="body"><slot></slot></div>
        <footer class="footer"><slot name="footer"></slot></footer>
      </div>
    `}static{this.styles=l`
    :host { --_width: 400px; }
    :host([size='sm']) { --_width: 320px; }
    :host([size='lg']) { --_width: 520px; }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
      animation: fade 150ms ease;
    }
    .panel {
      position: fixed;
      top: 0;
      bottom: 0;
      width: min(var(--_width), 100vw);
      display: flex;
      flex-direction: column;
      background: var(--color-surface, #fff);
      box-shadow: var(--shadow-400, 0 8px 32px -8px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      outline: none;
    }
    :host([position='right']) .panel { right: 0; animation: slide-right 200ms ease; }
    :host([position='left']) .panel { left: 0; animation: slide-left 200ms ease; }

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
    @keyframes slide-right { from { transform: translateX(100%); } }
    @keyframes slide-left { from { transform: translateX(-100%); } }
  `}}customElements.get("esa-side-dialog")||customElements.define("esa-side-dialog",d);document.getElementById("open-sd")?.addEventListener("click",()=>document.getElementById("sd")?.show());document.getElementById("open-left")?.addEventListener("click",()=>{let t=document.getElementById("sd-left");t||(t=document.createElement("esa-side-dialog"),t.id="sd-left",t.setAttribute("position","left"),t.setAttribute("size","sm"),t.heading="Left · sm",t.innerHTML="<p>A small drawer from the left edge.</p>",document.body.appendChild(t)),t.show()});
