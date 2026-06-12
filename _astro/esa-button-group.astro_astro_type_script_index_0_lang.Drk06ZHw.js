import{i as n,b as a,a as d}from"./lit-element.C8p3bJxG.js";class l extends n{constructor(){super(),this.onSlotClick=s=>{if(this.selectionMode!=="single")return;const t=s.target.closest("button, [data-value]");if(!t||!this.contains(t))return;const e=t.getAttribute("data-value")??t.textContent?.trim()??"";this.value=e,this.syncSelected(),this.dispatchEvent(new CustomEvent("change",{detail:{value:e},bubbles:!0,composed:!0}))},this.selectionMode="none",this.size="md",this.value=""}static{this.properties={selectionMode:{type:String,attribute:"selection-mode"},size:{type:String,reflect:!0},value:{type:String}}}syncSelected(){const s=Array.from(this.children);for(const t of s){const e=t.getAttribute("data-value")??t.textContent?.trim()??"",o=this.selectionMode==="single"&&e===this.value;t.toggleAttribute("data-selected",o),t.setAttribute("aria-pressed",String(o))}}connectedCallback(){super.connectedCallback(),this.setAttribute("role","group"),this.addEventListener("click",this.onSlotClick),requestAnimationFrame(()=>this.syncSelected())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onSlotClick)}render(){return a`<slot @slotchange=${()=>this.syncSelected()}></slot>`}static{this.styles=d`
    :host {
      --_group-radius: var(--form-radius-md, var(--radius-200, 8px));
      --_group-border: var(--color-border, #e5e5e5);
      display: inline-flex;
      align-items: stretch;
      border-radius: var(--_group-radius);
      overflow: hidden;
    }
    /* Connected borders: square the internal corners, divider between buttons. */
    ::slotted(esa-button),
    ::slotted(button) {
      border-radius: 0 !important;
      position: relative;
    }
    ::slotted(esa-button:first-child),
    ::slotted(button:first-child) {
      border-radius: var(--_group-radius) 0 0 var(--_group-radius) !important;
    }
    ::slotted(esa-button:last-child),
    ::slotted(button:last-child) {
      border-radius: 0 var(--_group-radius) var(--_group-radius) 0 !important;
    }
    ::slotted(esa-button:only-child),
    ::slotted(button:only-child) {
      border-radius: var(--_group-radius) !important;
    }
  `}}customElements.get("esa-button-group")||customElements.define("esa-button-group",l);const u=document.getElementById("seg"),i=document.getElementById("seg-out");u?.addEventListener("change",r=>{i&&(i.textContent=r.detail.value)});
