import{i as l,b as t,a as c}from"./lit-element.D8DSg5zn.js";import{t as d}from"./typography.KBHeYOQc.js";class u extends l{constructor(){super(),this.previousFocus=null,this.confirm=()=>this.resolve(!0),this.cancel=()=>this.resolve(!1),this.dismiss=()=>this.resolve(!1,!0),this.onKeydown=e=>{if(this.open){if(e.key==="Escape")e.preventDefault(),this.dismiss();else if(e.key==="Tab"){const o=this.renderRoot,i=Array.from(o.querySelectorAll("button:not([disabled])"));if(i.length===0)return;const a=i[0],n=i[i.length-1],s=o.activeElement;e.shiftKey&&s===a?(e.preventDefault(),n.focus()):!e.shiftKey&&s===n&&(e.preventDefault(),a.focus())}}},this.open=!1,this.heading="",this.message="",this.variant="default",this.confirmLabel="Confirm",this.cancelLabel="Cancel",this.showIcon=!0,this.showCloseButton=!0}static{this.properties={open:{type:Boolean,reflect:!0},heading:{type:String},message:{type:String},variant:{type:String,reflect:!0},confirmLabel:{type:String,attribute:"confirm-label"},cancelLabel:{type:String,attribute:"cancel-label"},showIcon:{type:Boolean,attribute:"show-icon"},showCloseButton:{type:Boolean,attribute:"show-close-button"}}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeydown)}updated(e){e.has("open")&&(this.open?(this.previousFocus=document.activeElement,requestAnimationFrame(()=>{this.renderRoot.querySelector(".esa-confirm-dialog__confirm")?.focus()})):this.previousFocus&&(this.previousFocus.focus?.(),this.previousFocus=null))}show(){this.open=!0}resolve(e,o=!1){this.open=!1,o&&this.dispatchEvent(new CustomEvent("dismiss",{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent(e?"confirm":"cancel",{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("resolved",{detail:{confirmed:e,dismissed:o},bubbles:!0,composed:!0}))}icon(){return this.showIcon?this.variant==="danger"?t`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`:this.variant==="warning"?t`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`:t`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`:null}render(){return this.open?t`
      <div class="esa-confirm-dialog__backdrop" @click=${this.dismiss}></div>
      <div class="esa-confirm-dialog__panel">
        <div class="esa-confirm-dialog" role="alertdialog" aria-modal="true" aria-label=${this.heading}>
          ${""}
          ${this.showCloseButton?t`<button
                class="esa-confirm-dialog__close"
                type="button"
                aria-label="Close"
                @click=${this.dismiss}
              ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`:null}
          <div class="esa-confirm-dialog__content">
            ${this.showIcon?t`<div class="esa-confirm-dialog__icon esa-confirm-dialog__icon--${this.variant}">${this.icon()}</div>`:null}
            <h2 class="esa-confirm-dialog__title typography-title">${this.heading}</h2>
            <p class="esa-confirm-dialog__message typography-body-md">${this.message}</p>
          </div>
          <div class="esa-confirm-dialog__footer">
            <button class="esa-confirm-dialog__btn esa-confirm-dialog__btn--outline typography-label-md" @click=${this.cancel}>${this.cancelLabel}</button>
            <button
              class="esa-confirm-dialog__confirm esa-confirm-dialog__btn typography-label-md esa-confirm-dialog__btn--${this.variant==="default"?"primary":this.variant}"
              @click=${this.confirm}
            >${this.confirmLabel}</button>
          </div>
        </div>
      </div>
    `:t``}static{this.styles=[d,c`
    :host { display: contents; }

    .esa-confirm-dialog__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
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
    /* hub-edit-approved: user approved (2026-06-29) — relative + close button styles. */
    .esa-confirm-dialog {
      position: relative;
      pointer-events: auto;
      width: var(--confirm-dialog-width, 360px);
      max-width: calc(100vw - 2rem);
      background: var(--color-background-elevation-floating, #fcfcfc);
      border-radius: var(--radius-lg, 0.75rem);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
    }

    /* hub-edit-approved: user approved hub edits this session (2026-06-30) — on mobile
       the confirm dialog docks to the bottom as a full-width sheet, matching esa-dialog. */
    @media (max-width: 600px) {
      .esa-confirm-dialog__panel { align-items: flex-end; }
      .esa-confirm-dialog {
        width: 100%;
        max-width: 100%;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        animation: esa-confirm-sheet-in var(--animation-overlay-enter, 250ms ease-out);
      }
    }
    @keyframes esa-confirm-sheet-in {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .esa-confirm-dialog__close {
      position: absolute;
      top: var(--spacing-300, 0.75rem);
      right: var(--spacing-300, 0.75rem);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default-muted, #838383);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
    }
    .esa-confirm-dialog__close:hover {
      background: var(--color-background-elevation-sunken, #f0f0f0);
      color: var(--color-content-default, #202020);
    }
    .esa-confirm-dialog__close:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
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
      border-radius: var(--radius-pill, 9999px);
      margin-bottom: var(--spacing-300, 0.75rem);
    }
    .esa-confirm-dialog__icon--default {
      background: var(--color-background-utility-info-subtle, #f4faff);
      color: var(--color-content-utility-info, #0d74ce);
    }
    .esa-confirm-dialog__icon--danger {
      background: var(--color-background-utility-danger-subtle, #fff7f7);
      color: var(--color-content-utility-danger, #ce2c31);
    }
    .esa-confirm-dialog__icon--warning {
      background: var(--color-background-utility-warning-subtle, #fefbe9);
      color: var(--color-content-utility-warning, #ab6400);
    }
    .esa-confirm-dialog__title {
      margin: 0 0 var(--spacing-150, 0.375rem);
      color: var(--color-content-default, #202020);
    }
    .esa-confirm-dialog__message {
      color: var(--color-content-default-secondary, #646464);
      /* Leading comes from .typography-body-md. It carried an override back when
         body-md was relaxed (1.8); the role leads at normal now, so it went. */
      margin: 0;
    }

    .esa-confirm-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--spacing-500, 1.5rem);
      border-top: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
    }

    .esa-confirm-dialog__btn {
      padding: var(--spacing-200, 0.5rem) var(--spacing-400, 1rem);
      border-radius: var(--radius-md, 0.5rem);
      cursor: pointer;
      border: var(--border-width-default, 1px) solid transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-confirm-dialog__btn:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .esa-confirm-dialog__btn--outline {
      background: transparent;
      border-color: var(--color-border-default-strong, #bbbbbb);
      color: var(--color-content-default, #202020);
    }
    .esa-confirm-dialog__btn--outline:hover { background: var(--color-background-elevation-sunken, #f0f0f0); }
    .esa-confirm-dialog__btn--primary {
      background: var(--color-background-brand, #46a758);
      color: var(--color-content-default-knockout, #fcfcfc);
    }
    .esa-confirm-dialog__btn--primary:hover { background: var(--color-background-brand-hover, #3e9b4f); }
    .esa-confirm-dialog__btn--danger {
      background: var(--color-background-utility-danger, #e5484d);
      color: var(--color-content-default-knockout, #fcfcfc);
    }
    .esa-confirm-dialog__btn--danger:hover { background: #dc2626; }
    .esa-confirm-dialog__btn--warning {
      background: var(--color-background-utility-warning, #ffc53d);
      color: var(--color-content-default-knockout, #fcfcfc);
    }
    .esa-confirm-dialog__btn--warning:hover { background: #d97706; }

    /* FORCED COLORS. box-shadow is forced to 'none', so the panel needs a real
       edge. The danger/warning BUTTONS lose their tint here too and there is no
       system colour that means "destructive" — the button's own label is what
       carries that, which is why confirm dialogs must never ship a bare "OK". */
    @media (forced-colors: active) {
      .esa-confirm-dialog { border: 1px solid CanvasText; }
    }
  `]}}customElements.get("esa-confirm-dialog")||customElements.define("esa-confirm-dialog",u);const f=document.getElementById("result");document.querySelectorAll(".trigger").forEach(r=>r.addEventListener("click",()=>{document.getElementById(r.dataset.target)?.show()}));document.querySelectorAll("esa-confirm-dialog").forEach(r=>r.addEventListener("resolved",e=>{const o=e.detail.confirmed;f.textContent=o?"Confirmed ✓":"Cancelled ✕"}));
