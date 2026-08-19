import{i as r,A as s,b as i,a as d}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";import{b as n}from"./boolish.DOQu-9JQ.js";class h extends r{constructor(){super(),this.onNativeClose=()=>{this.close()},this.onLightDismiss=e=>{const o=this.dialogEl;if(!o||!this.open||e.composedPath()[0]!==o)return;const a=o.getBoundingClientRect();a.top<=e.clientY&&e.clientY<=a.top+a.height&&a.left<=e.clientX&&e.clientX<=a.left+a.width||this.close()},this.open=!1,this.heading="",this.showCloseButton=!0,this.size="md"}static{this.properties={open:{type:Boolean,reflect:!0},heading:{type:String},showCloseButton:{type:Boolean,attribute:"show-close-button",converter:n},size:{type:String,reflect:!0}}}get dialogEl(){return this.renderRoot.querySelector("dialog")}updated(e){if(!e.has("open"))return;const o=this.dialogEl;o&&(this.open?o.open||o.showModal():o.close())}show(){this.open=!0}close(){this.open&&(this.open=!1,this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0})))}connectedCallback(){super.connectedCallback(),"closedBy"in HTMLDialogElement.prototype||this.addEventListener("click",this.onLightDismiss)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onLightDismiss)}render(){const e=this.heading||this.showCloseButton||!!this.querySelector('[slot="header"]'),o=this.querySelector('[slot="header"]')?.textContent?.trim(),a=!!this.heading;return i`
      <dialog
        class="esa-dialog"
        closedby="any"
        aria-labelledby=${a?"esa-dialog-title":s}
        aria-label=${a?s:o||"Dialog"}
        @close=${this.onNativeClose}
      >
        ${e?i`
              <div class="esa-dialog__header typography-title">
                <slot name="header"><h2 id="esa-dialog-title" class="esa-dialog__title typography-title">${this.heading}</h2></slot>
                ${this.showCloseButton?i`
                      <button class="esa-dialog__close" @click=${this.close} aria-label="Close dialog">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    `:null}
              </div>
            `:null}
        <div class="esa-dialog__body typography-body-md"><slot></slot></div>
        <div class="esa-dialog__footer typography-label-md"><slot name="footer"></slot></div>
      </dialog>
    `}static{this.styles=[l,d`
    :host {
      --_dialog-bg: var(--color-background-elevation-floating, #fcfcfc);
      --_dialog-border-radius: var(--radius-lg, 0.75rem);
      --_dialog-padding: var(--spacing-500, 1.5rem);
      --_dialog-header-border: var(--color-border-default-subtle, #d9d9d9);
      /* Header/footer surface tints. These were --dialog-header-bg /
         --dialog-footer-bg, declared in no token file — a hook offered on the
         strength of a fallback nobody had asked to override. Folded to their
         literal default 2026-08-16; --dialog-* is a live namespace, so they come
         back as declarations the day a spoke actually wants to frame the body. */
      --_dialog-header-bg: transparent;
      --_dialog-footer-bg: transparent;
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

    /* The two wrapper divs (a fixed backdrop + a flex centering layer) are gone:
       a modal <dialog> is centered by the UA via 'margin: auto' in the top layer,
       and ::backdrop paints the scrim. That also retires the z-index pair — the top
       layer is above every stacking context on the page by definition. */
    dialog.esa-dialog {
      /* UA reset. The UA sheet gives <dialog> a solid border, 1em padding and
         'max-width/max-height: calc(100% - 6px - 2em)'; without clearing those the
         panel renders inside a second, smaller box. */
      border: none;
      padding: 0;
      margin: auto;
      background: var(--_dialog-bg);
      color: var(--color-content-default, #202020);
      border-radius: var(--_dialog-border-radius);
      box-shadow: var(--_dialog-shadow);
      width: var(--_dialog-width);
      max-width: 100vw;
      max-height: var(--_dialog-max-height);
      overflow: hidden;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
    }
    /* display is what the UA toggles for open/closed, so it can only be set on the
       open state — putting 'display: flex' on the bare selector would make a CLOSED
       dialog visible, and with it every slotted focusable inside. */
    dialog.esa-dialog[open] {
      display: flex;
      flex-direction: column;
    }
    dialog.esa-dialog:focus { outline: none; }

    /* ::backdrop does not reliably inherit custom properties from its originating
       element across engines, so the var() here may not resolve — the literal
       fallback is the real value in that case, and the two are kept in step
       deliberately. Do NOT replace the fallback with a bare var(). */
    dialog.esa-dialog::backdrop {
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
    }

    /* hub-edit-approved: user approved hub edits this session (2026-06-30) — on
       narrow (mobile) viewports a centered dialog reads better as a bottom sheet:
       docked to the bottom edge, full width, only the top corners rounded, and
       sliding up on open. 'margin: auto auto 0' is what docks it now that the flex
       centering layer is gone. */
    @media (max-width: 600px) {
      dialog.esa-dialog {
        margin: auto auto 0;
        width: 100%;
        max-width: 100%;
        max-height: 92vh;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        animation: esa-dialog-sheet-in var(--animation-overlay-enter, 250ms ease-out);
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
      border-bottom: var(--border-width-default, 1px) solid var(--_dialog-header-border);
      flex-shrink: 0;
    }
    .esa-dialog__title {
      margin: 0;
      color: var(--color-content-default, #202020);
    }
    .esa-dialog__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default-secondary, #646464);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .esa-dialog__close:hover { background: var(--color-background-elevation-sunken, #f0f0f0); }
    .esa-dialog__close:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .esa-dialog__body {
      padding: var(--_dialog-padding);
      overflow-y: auto;
      flex: 1;
      color: var(--color-content-default, #202020);
    }
    .esa-dialog__footer {
      padding: var(--spacing-300, 0.75rem) var(--_dialog-padding);
      background: var(--_dialog-footer-bg);
      border-top: var(--border-width-default, 1px) solid var(--_dialog-header-border);
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-200, 0.5rem);
      flex-shrink: 0;
    }
    .esa-dialog__footer:not(:has(*)) { display: none; }

    /* FORCED COLORS. The panel's only edge is --_dialog-shadow, and box-shadow is
       forced to 'none' in this mode — without a border the dialog and the page
       behind it become one undifferentiated Canvas. Scoped to the query rather
       than shipping a transparent border unconditionally because .esa-dialog is
       content-box with a fixed width, so an unconditional border would push it
       2px past 'max-width: 100vw' at every size. */
    @media (forced-colors: active) {
      dialog.esa-dialog { border: 1px solid CanvasText; }
    }
  `]}}customElements.get("esa-dialog")||customElements.define("esa-dialog",h);document.querySelectorAll("[data-target]").forEach(t=>t.addEventListener("click",()=>{document.getElementById(t.dataset.target)?.show()}));document.querySelectorAll("[data-close]").forEach(t=>t.addEventListener("click",()=>{document.getElementById(t.dataset.close)?.close()}));
