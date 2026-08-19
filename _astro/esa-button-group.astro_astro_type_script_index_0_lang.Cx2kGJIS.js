import{i as a,b as l,a as d}from"./lit-element.D8DSg5zn.js";import{t as u}from"./typography.KBHeYOQc.js";class c extends a{constructor(){super(),this.onSlotClick=o=>{if(this.selectionMode!=="single")return;const t=o.target.closest("button, [data-value]");if(!t||!this.contains(t))return;const e=t.getAttribute("data-value")??t.textContent?.trim()??"";this.value=e,this.syncSelected(),this.dispatchEvent(new CustomEvent("change",{detail:{value:e},bubbles:!0,composed:!0}))},this.selectionMode="none",this.value=""}static{this.properties={selectionMode:{type:String,attribute:"selection-mode"},value:{type:String}}}syncSelected(){const o=Array.from(this.children);for(const t of o){const e=t.getAttribute("data-value")??t.textContent?.trim()??"",i=this.selectionMode==="single"&&e===this.value;t.toggleAttribute("data-selected",i);const s=t.querySelector('button, [role="button"]')??(t.matches('button, [role="button"]')?t:null);s&&(this.selectionMode==="single"?s.setAttribute("aria-pressed",String(i)):s.removeAttribute("aria-pressed"))}}connectedCallback(){super.connectedCallback(),this.setAttribute("role","group"),this.addEventListener("click",this.onSlotClick),requestAnimationFrame(()=>this.syncSelected())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onSlotClick)}render(){return l`<div class="esa-button-group__slot typography-label-md">
      <slot @slotchange=${()=>this.syncSelected()}></slot>
    </div>`}static{this.styles=[u,d`
    :host {
      --_group-radius: var(--button-radius-md, var(--radius-md, 0.5rem));
      --_group-border: var(--color-border-default, #cecece);
      display: inline-flex;
      align-items: stretch;
      border-radius: var(--_group-radius);
      overflow: hidden;
    }
    /* No box of its own — the buttons stay direct flex items of the host. */
    .esa-button-group__slot { display: contents; }
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
  `]}}customElements.get("esa-button-group")||customElements.define("esa-button-group",c);const b=document.getElementById("seg"),n=document.getElementById("seg-out");b?.addEventListener("change",r=>{n&&(n.textContent=r.detail.value)});
