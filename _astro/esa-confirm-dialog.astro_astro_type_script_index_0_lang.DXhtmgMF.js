import{i as c,b as o,a as l}from"./lit-element.C8p3bJxG.js";class d extends c{constructor(){super(),this.previousFocus=null,this.confirm=()=>this.resolve(!0),this.cancel=()=>this.resolve(!1),this.onKeydown=e=>{if(this.open){if(e.key==="Escape")e.preventDefault(),this.cancel();else if(e.key==="Tab"){const i=this.renderRoot,a=Array.from(i.querySelectorAll("button:not([disabled])"));if(a.length===0)return;const n=a[0],t=a[a.length-1],s=i.activeElement;e.shiftKey&&s===n?(e.preventDefault(),t.focus()):!e.shiftKey&&s===t&&(e.preventDefault(),n.focus())}}},this.open=!1,this.heading="",this.message="",this.variant="default",this.confirmLabel="Confirm",this.cancelLabel="Cancel",this.showIcon=!0}static{this.properties={open:{type:Boolean,reflect:!0},heading:{type:String},message:{type:String},variant:{type:String,reflect:!0},confirmLabel:{type:String,attribute:"confirm-label"},cancelLabel:{type:String,attribute:"cancel-label"},showIcon:{type:Boolean,attribute:"show-icon"}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeydown)}updated(e){e.has("open")&&(this.open?(this.previousFocus=document.activeElement,requestAnimationFrame(()=>{this.renderRoot.querySelector(".esa-confirm-dialog__confirm")?.focus()})):this.previousFocus&&(this.previousFocus.focus?.(),this.previousFocus=null))}show(){this.open=!0}resolve(e){this.open=!1,this.dispatchEvent(new CustomEvent(e?"confirm":"cancel",{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("resolved",{detail:{confirmed:e},bubbles:!0,composed:!0}))}icon(){return this.showIcon?this.variant==="danger"?o`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`:this.variant==="warning"?o`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`:o`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`:null}render(){return this.open?o`
      <div class="esa-confirm-dialog__backdrop" @click=${this.cancel}></div>
      <div class="esa-confirm-dialog__panel">
        <div class="esa-confirm-dialog" role="alertdialog" aria-modal="true" aria-label=${this.heading}>
          <div class="esa-confirm-dialog__content">
            ${this.showIcon?o`<div class="esa-confirm-dialog__icon esa-confirm-dialog__icon--${this.variant}">${this.icon()}</div>`:null}
            <h2 class="esa-confirm-dialog__title">${this.heading}</h2>
            <p class="esa-confirm-dialog__message">${this.message}</p>
          </div>
          <div class="esa-confirm-dialog__footer">
            <button class="esa-confirm-dialog__btn esa-confirm-dialog__btn--outline" @click=${this.cancel}>${this.cancelLabel}</button>
            <button
              class="esa-confirm-dialog__confirm esa-confirm-dialog__btn esa-confirm-dialog__btn--${this.variant==="default"?"primary":this.variant}"
              @click=${this.confirm}
            >${this.confirmLabel}</button>
          </div>
        </div>
      </div>
    `:o``}static{this.styles=l`
    :host { display: contents; }

    .esa-confirm-dialog__backdrop {
      position: fixed;
      inset: 0;
      background: var(--confirm-dialog-backdrop-bg, var(--color-backdrop, rgba(0, 0, 0, 0.5)));
      z-index: var(--z-modal-backdrop, 300);
    }
    .esa-confirm-dialog__panel {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 400);
      pointer-events: none;
    }
    .esa-confirm-dialog {
      pointer-events: auto;
      width: var(--confirm-dialog-width, 360px);
      max-width: calc(100vw - 2rem);
      background: var(--confirm-dialog-bg, var(--color-surface-elevated, #ffffff));
      border-radius: var(--confirm-dialog-radius, var(--radius-400, 0.75rem));
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
    }

    .esa-confirm-dialog__content {
      padding: var(--spacing-500, 1.5rem);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .esa-confirm-dialog__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-full, 9999px);
      margin-bottom: var(--spacing-300, 0.75rem);
    }
    .esa-confirm-dialog__icon--default {
      background: var(--color-info-subtle, #eff6ff);
      color: var(--color-info, #3b82f6);
    }
    .esa-confirm-dialog__icon--danger {
      background: var(--color-danger-subtle, #fef2f2);
      color: var(--color-danger, #ef4444);
    }
    .esa-confirm-dialog__icon--warning {
      background: var(--color-warning-subtle, #fffbeb);
      color: var(--color-warning, #f59e0b);
    }
    .esa-confirm-dialog__title {
      font-size: var(--type-size-400, 1.125rem);
      font-weight: var(--font-weight-semibold, 550);
      margin: 0 0 var(--spacing-150, 0.375rem);
      color: var(--confirm-dialog-color, var(--color-text-primary, #171717));
    }
    .esa-confirm-dialog__message {
      color: var(--confirm-dialog-color, var(--color-text-secondary, #525252));
      font-size: var(--type-size-200, 0.9375rem);
      line-height: var(--line-height-normal, 1.6);
      margin: 0;
    }

    .esa-confirm-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--spacing-500, 1.5rem);
      border-top: 1px solid var(--confirm-dialog-border-color, var(--color-border-light, #efefef));
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
    }

    .esa-confirm-dialog__btn {
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-radius: var(--radius-200, 0.5rem);
      font-family: inherit;
      font-size: var(--type-size-200, 0.9375rem);
      font-weight: var(--font-weight-medium, 450);
      cursor: pointer;
      border: 1px solid transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-confirm-dialog__btn:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .esa-confirm-dialog__btn--outline {
      background: transparent;
      border-color: var(--color-border-strong, #d4d4d4);
      color: var(--color-text-primary, #171717);
    }
    .esa-confirm-dialog__btn--outline:hover { background: var(--color-surface-sunken, #efefef); }
    .esa-confirm-dialog__btn--primary {
      background: var(--color-primary, #43608a);
      color: var(--color-text-inverse, #ffffff);
    }
    .esa-confirm-dialog__btn--primary:hover { background: var(--color-primary-hover, #39506f); }
    .esa-confirm-dialog__btn--danger {
      background: var(--color-danger, #ef4444);
      color: var(--color-text-inverse, #ffffff);
    }
    .esa-confirm-dialog__btn--danger:hover { background: #dc2626; }
    .esa-confirm-dialog__btn--warning {
      background: var(--color-warning, #f59e0b);
      color: var(--color-text-inverse, #ffffff);
    }
    .esa-confirm-dialog__btn--warning:hover { background: #d97706; }
  `}}customElements.get("esa-confirm-dialog")||customElements.define("esa-confirm-dialog",d);const f=document.getElementById("result");document.querySelectorAll(".trigger").forEach(r=>r.addEventListener("click",()=>{document.getElementById(r.dataset.target)?.show()}));document.querySelectorAll("esa-confirm-dialog").forEach(r=>r.addEventListener("resolved",e=>{const i=e.detail.confirmed;f.textContent=i?"Confirmed ✓":"Cancelled ✕"}));
