import{i as a,b as e,a as t}from"./lit-element.D8DSg5zn.js";import{t as s}from"./typography.KBHeYOQc.js";class n extends a{constructor(){super(),this.onAction=()=>{this.dispatchEvent(new CustomEvent("action",{bubbles:!0,composed:!0})),this.dismiss()},this.dismiss=()=>{this.dispatchEvent(new CustomEvent("dismiss",{bubbles:!0,composed:!0}))},this.message="",this.variant="info",this.action="",this.dismissable=!0,this.icon=""}static{this.properties={message:{type:String},variant:{type:String,reflect:!0},action:{type:String},dismissable:{type:Boolean},icon:{type:String}}}renderIcon(){switch(this.variant){case"success":return e`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;case"warning":return e`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;case"danger":return e`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;default:return e`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`}}render(){return e`
      <div class="esa-snackbar typography-body-md esa-snackbar--${this.variant}">
        <span class="esa-snackbar__icon">${this.renderIcon()}</span>
        <span class="esa-snackbar__message">${this.message}</span>
        ${this.action?e`<button class="esa-snackbar__action typography-microcopy-sm-strong" @click=${this.onAction}>${this.action}</button>`:null}
        ${this.dismissable?e`
              <button class="esa-snackbar__close" @click=${this.dismiss} aria-label="Dismiss notification">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            `:null}
      </div>
    `}static{this.styles=[s,t`
    :host { display: block; }

    .esa-snackbar {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      background: var(--color-background-default-knockout);
      color: var(--color-content-default-knockout, #fcfcfc);
      animation: esa-snackbar-enter var(--animation-overlay-enter, 250ms ease-out);
    }
    @keyframes esa-snackbar-enter {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .esa-snackbar--success { background: var(--color-content-utility-success); }
    .esa-snackbar--warning { background: var(--color-content-utility-warning); }
    .esa-snackbar--danger { background: var(--color-content-utility-danger); }
    .esa-snackbar--info { background: var(--color-content-utility-info); }

    .esa-snackbar__icon {
      flex-shrink: 0;
      display: inline-flex;
    }
    .esa-snackbar__message { flex: 1; }

    .esa-snackbar__action {
      /* One word ("Undo"). microcopy has no leading, so wrapping would collide. */
      white-space: nowrap;
      flex-shrink: 0;
      /* Same target-size reasoning as the close button below: a short word like
         "Undo" produces a box only as tall as its own line, which lands under the
         24px minimum. The min-height sets the floor without padding the label. */
      min-height: 32px;
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      /* THE WHITE ALPHA IS CORRECT HERE AND SHOULD NOT BECOME A TOKEN.
         This button sits on FIVE different grounds — the knocked-out default
         plus the success, warning, danger and info fills below — and an alpha
         is the only value that lifts off all of them. A solid knocked-out grey
         would be right on one and wrong on four (a grey chip on a green bar).
         Checked when --color-background-elevation-raised-knockout was proposed;
         that token was dropped partly because this, its most obvious reader,
         did not want it. */
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
      /* UA reset, not a type role — a native button does not inherit the face. */
      font-family: inherit;
      cursor: pointer;
    }
    .esa-snackbar__action:hover { background: rgba(255, 255, 255, 0.3); }

    .esa-snackbar__close {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      /* 32px, not the 24px this was. 24 is the exact floor of SC 2.5.8 Target Size
         (Minimum, AA) — passing a criterion with zero margin is not the same as
         being usable, and this is the control someone reaches for in a hurry, on a
         box that may be about to disappear. The glyph stays 16px; only the hit area
         grows, so the toast does not get taller. */
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
    }
    .esa-snackbar__close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Both buttons were keyboard-invisible: :hover only, no focus style at all
       (SC 2.4.7 Focus Visible, AA). The ring is white rather than
       --focus-ring-color because these sit on FIVE different fills — the
       knocked-out default plus success/warning/danger/info — and the brand-blue
       ring disappears against at least one of them. Same reasoning as the alpha
       backgrounds above, and the same reason this is not a token. */
    .esa-snackbar__action:focus-visible,
    .esa-snackbar__close:focus-visible {
      outline: var(--focus-ring-width, 2px) solid #ffffff;
      outline-offset: var(--focus-ring-offset, 2px);
      opacity: 1;
    }
  `]}}customElements.get("esa-snackbar-item")||customElements.define("esa-snackbar-item",n);
