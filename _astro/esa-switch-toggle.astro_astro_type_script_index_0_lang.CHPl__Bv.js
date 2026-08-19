import{i as s,b as a,a as r}from"./lit-element.D8DSg5zn.js";import{t as i}from"./typography.KBHeYOQc.js";class n extends s{constructor(){super(),this.toggle=()=>{this.disabled||(this.checked=!this.checked,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0})))},this.onKeydown=e=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.toggle())},this.label="",this.size="md",this.disabled=!1,this.labelPosition="after",this.checked=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},labelPosition:{type:String,attribute:"label-position",reflect:!0},checked:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){this.internals.setFormValue(this.checked?"on":null),this.internals.ariaChecked=String(this.checked)}render(){const e=this.label?a`<span class="label typography-body-md" part="label">${this.label}</span>`:null;return a`
      <button
        type="button"
        class="root"
        role="switch"
        aria-checked=${this.checked}
        ?disabled=${this.disabled}
        @click=${this.toggle}
        @keydown=${this.onKeydown}
      >
        ${this.labelPosition==="before"?e:null}
        <span class="track" part="track"><span class="thumb" part="thumb"></span></span>
        ${this.labelPosition==="after"?e:null}
      </button>
    `}static{this.styles=[i,r`
    :host {
      --_track-w: 40px;
      --_track-h: 22px;
      --_thumb: 18px;
      --_bg-off: var(--color-border-default-strong, #bbbbbb);
      --_bg-on: var(--color-background-brand, #46a758);
      --_thumb-color: var(--color-background-elevation-raised, #fcfcfc);
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
      color: var(--color-content-default, #202020);
      cursor: pointer;
    }
    .root:disabled { cursor: not-allowed; }

    .track {
      position: relative;
      flex: none;
      width: var(--_track-w);
      height: var(--_track-h);
      border-radius: var(--radius-pill, 9999px);
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
      border-radius: var(--radius-pill, 9999px);
      background: var(--_thumb-color);
      box-shadow: var(--elevation-1, 0 1px 4px rgba(0, 0, 0, 0.2));
      transition: left var(--transition-fast, 150ms ease);
    }
    :host([checked]) .thumb { left: calc(var(--_track-w) - var(--_thumb) - 2px); }

    .root:focus-visible .track {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    /* Type comes from .typography-body-md on the element, leading included — the
       role leads at normal, which is what a one-word label beside a 22px track
       wants. This carried a line-height override back when body-md was relaxed
       (1.8) and the row outgrew the track; the role moved, so the override went. */

    /* FORCED COLORS. The worst case in the kit: on/off is --_bg-on vs --_bg-off
       (both force-adjusted to the same Canvas) and the thumb's ONLY separation
       from the track is its background plus --elevation-1, which is deleted. The
       control becomes an empty pill with an invisible thumb, and the position
       channel is unreadable because the thing being positioned cannot be seen.
       There is no "On"/"Off" text to fall back on — 'label' is the field name and
       is identical in both states.

       Two channels are restored: the thumb FILL (Canvas when off, Highlight when
       on) and its POSITION, which already worked.

       The 'left' re-declaration is not optional. ':host([checked]) .thumb' above
       computes '--_track-w - --_thumb - 2px', which assumes --_track-w is the
       track's padding-box width. Adding a border under box-sizing: border-box
       shrinks that box by 2px while the calc still uses the full value, so the
       checked thumb would overshoot the right edge at every one of the four
       sizes. -4px absorbs it. */
    @media (forced-colors: active) {
      .track {
        box-sizing: border-box;
        border: 1px solid CanvasText;
        background: Canvas;
      }
      :host([checked]) .track { background: Canvas; }
      .thumb {
        box-sizing: border-box;
        border: 1px solid CanvasText;
        background: Canvas;
      }
      :host([checked]) .thumb {
        left: calc(var(--_track-w) - var(--_thumb) - 4px);
        background: Highlight;
      }
      :host([disabled]) .track,
      :host([disabled]) .thumb { border-color: GrayText; }
    }
  `]}}customElements.get("esa-switch-toggle")||customElements.define("esa-switch-toggle",n);const o=document.getElementById("sw-form");o?.addEventListener("submit",t=>{t.preventDefault();const e=new FormData(o);document.getElementById("sw-out").textContent="alerts = "+JSON.stringify(e.get("alerts"))});
