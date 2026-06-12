import{i as r,b as a,a as o}from"./lit-element.C8p3bJxG.js";class i extends r{constructor(){super(),this.toggle=()=>{this.disabled||(this.checked=!this.checked,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0})))},this.onKeydown=t=>{(t.key===" "||t.key==="Enter")&&(t.preventDefault(),this.toggle())},this.label="",this.size="md",this.disabled=!1,this.labelPosition="after",this.checked=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},labelPosition:{type:String,attribute:"label-position",reflect:!0},checked:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){this.internals.setFormValue(this.checked?"on":null),this.internals.ariaChecked=String(this.checked)}render(){const t=this.label?a`<span class="label" part="label">${this.label}</span>`:null;return a`
      <button
        type="button"
        class="root"
        role="switch"
        aria-checked=${this.checked}
        ?disabled=${this.disabled}
        @click=${this.toggle}
        @keydown=${this.onKeydown}
      >
        ${this.labelPosition==="before"?t:null}
        <span class="track" part="track"><span class="thumb" part="thumb"></span></span>
        ${this.labelPosition==="after"?t:null}
      </button>
    `}static{this.styles=o`
    :host {
      --_track-w: 40px;
      --_track-h: 22px;
      --_thumb: 18px;
      --_bg-off: var(--switch-toggle-track-bg, var(--color-border-strong, #d4d4d4));
      --_bg-on: var(--switch-toggle-track-bg-checked, var(--color-primary, #43608a));
      --_thumb-color: var(--switch-toggle-thumb-bg, var(--color-surface, #fff));
      display: inline-block;
    }
    :host([size='xs']) { --_track-w: 28px; --_track-h: 16px; --_thumb: 12px; }
    :host([size='sm']) { --_track-w: 32px; --_track-h: 18px; --_thumb: 14px; }
    :host([size='lg']) { --_track-w: 48px; --_track-h: 26px; --_thumb: 22px; }
    :host([disabled]) { opacity: 0.5; }

    .root {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 0.5rem);
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: var(--switch-toggle-label-color, var(--color-text-primary, #171717));
      cursor: pointer;
    }
    .root:disabled { cursor: not-allowed; }

    .track {
      position: relative;
      flex: none;
      width: var(--_track-w);
      height: var(--_track-h);
      border-radius: var(--radius-full, 9999px);
      background: var(--_bg-off);
      transition: background var(--transition-fast, 150ms ease);
    }
    :host([checked]) .track { background: var(--_bg-on); }

    .thumb {
      position: absolute;
      top: 50%;
      left: 2px;
      width: var(--_thumb);
      height: var(--_thumb);
      transform: translateY(-50%);
      border-radius: var(--radius-full, 9999px);
      background: var(--_thumb-color);
      box-shadow: var(--shadow-50, 0 1px 4px rgba(0, 0, 0, 0.2));
      transition: left var(--transition-fast, 150ms ease);
    }
    :host([checked]) .thumb { left: calc(var(--_track-w) - var(--_thumb) - 2px); }

    .root:focus-visible .track {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .label {
      font-size: var(--type-size-200, 0.9375rem);
      line-height: var(--line-height-normal, 1.6);
    }
  `}}customElements.get("esa-switch-toggle")||customElements.define("esa-switch-toggle",i);const s=document.getElementById("sw-form");s?.addEventListener("submit",e=>{e.preventDefault();const t=new FormData(s);document.getElementById("sw-out").textContent="alerts = "+JSON.stringify(t.get("alerts"))});
