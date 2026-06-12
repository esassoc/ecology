import{i as r,b as a,a as e}from"./lit-element.C8p3bJxG.js";class s extends r{constructor(){super(),this.onAction=()=>{this.dispatchEvent(new CustomEvent("action",{bubbles:!0,composed:!0})),this.dismiss()},this.dismiss=()=>{this.dispatchEvent(new CustomEvent("dismiss",{bubbles:!0,composed:!0}))},this.message="",this.variant="info",this.action="",this.dismissable=!0,this.icon=""}static{this.properties={message:{type:String},variant:{type:String,reflect:!0},action:{type:String},dismissable:{type:Boolean},icon:{type:String}}}renderIcon(){switch(this.variant){case"success":return a`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;case"warning":return a`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;case"danger":return a`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;default:return a`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`}}render(){return a`
      <div class="esa-snackbar esa-snackbar--${this.variant}">
        <span class="esa-snackbar__icon">${this.renderIcon()}</span>
        <span class="esa-snackbar__message">${this.message}</span>
        ${this.action?a`<button class="esa-snackbar__action" @click=${this.onAction}>${this.action}</button>`:null}
        ${this.dismissable?a`
              <button class="esa-snackbar__close" @click=${this.dismiss} aria-label="Dismiss">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            `:null}
      </div>
    `}static{this.styles=e`
    :host { display: block; }

    .esa-snackbar {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-radius: var(--snackbar-item-radius, var(--radius-200, 0.5rem));
      box-shadow: var(--shadow-300, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      background: var(--color-gray-900, #171717);
      color: var(--snackbar-item-color, var(--color-text-inverse, #ffffff));
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: var(--type-size-200, 0.9375rem);
      animation: esa-snackbar-enter 200ms ease-out;
    }
    @keyframes esa-snackbar-enter {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .esa-snackbar--success { background: var(--snackbar-item-bg-success, var(--color-green-800, #0a6562)); }
    .esa-snackbar--warning { background: var(--snackbar-item-bg-warning, var(--color-orange-800, #912a0f)); }
    .esa-snackbar--danger { background: var(--snackbar-item-bg-danger, var(--color-red-700, #b91c1c)); }
    .esa-snackbar--info { background: var(--snackbar-item-bg-info, var(--color-blue-800, #43608a)); }

    .esa-snackbar__icon {
      flex-shrink: 0;
      display: inline-flex;
    }
    .esa-snackbar__message { flex: 1; }

    .esa-snackbar__action {
      flex-shrink: 0;
      padding: var(--spacing-100, 0.25rem) var(--spacing-200, 0.5rem);
      border: none;
      border-radius: var(--radius-100, 0.25rem);
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
      font-family: inherit;
      font-size: var(--type-size-150, 0.875rem);
      font-weight: var(--font-weight-semibold, 550);
      cursor: pointer;
    }
    .esa-snackbar__action:hover { background: rgba(255, 255, 255, 0.3); }

    .esa-snackbar__close {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: var(--radius-100, 0.25rem);
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
    }
    .esa-snackbar__close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }
  `}}customElements.get("esa-snackbar-item")||customElements.define("esa-snackbar-item",s);
