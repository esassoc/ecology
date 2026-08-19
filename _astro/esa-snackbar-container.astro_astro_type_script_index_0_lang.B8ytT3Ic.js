import{i as b,b as h,a as f}from"./lit-element.D8DSg5zn.js";import{a as l}from"./announcer.D25EqVSf.js";import"./esa-snackbar-item.astro_astro_type_script_index_0_lang.f06hl-Z2.js";import"./typography.KBHeYOQc.js";let u=!1;class p extends b{constructor(){super(),this.nextId=0,this.previousFocus=null,this.pauseAll=()=>{for(const e of this.snackbars)e.timer&&(clearTimeout(e.timer),e.timer=null,e.remaining=Math.max(0,e.remaining-(Date.now()-e.startedAt)))},this.resumeAll=()=>{for(const e of this.snackbars)!e.timer&&e.remaining>0&&this.startTimer(e)},this.onKeydown=e=>{e.key!=="Escape"||this.snackbars.length===0||(e.stopPropagation(),this.dismiss(this.snackbars[this.snackbars.length-1].id))},this.onFocusIn=e=>{const s=e.relatedTarget;s&&!this.contains(s)&&(this.previousFocus=s),this.pauseAll()},this.snackbars=[],this.label="Notifications"}static{this.properties={snackbars:{state:!0},label:{type:String}}}show(e){e.duration===void 0&&!u&&(u=!0,console.info("[esa-snackbar] Toasts now persist until dismissed. The `duration` default changed from 5000 to 0 on 2026-08-16 — a timer the user cannot adjust is WCAG 2.2.1 (Level A). Pass `duration: 5000` to restore auto-dismiss, and read the note on EsaSnackbarConfig.duration before you do."));const s={variant:"info",duration:0,dismissable:!0,...e},n=s.variant==="danger";if(s.uniqueKey){const d=this.snackbars.find(o=>o.uniqueKey===s.uniqueKey);if(d){this.snackbars=this.snackbars.map(i=>i.uniqueKey===s.uniqueKey?{...i,...s,id:i.id,timer:i.timer}:i);const o=this.snackbars.find(i=>i.id===d.id)??d;return l(s.message,{assertive:n}),this.restartTimer(o),o.id}}const r=`esa-snackbar-${this.nextId++}`,t=s.duration??0,m={...s,id:r,timer:null,remaining:t,startedAt:0};return this.snackbars=[...this.snackbars,m],l(s.message,{assertive:n}),this.startTimer(m),r}success(e,s){return this.show({...s,message:e,variant:"success"})}info(e,s){return this.show({...s,message:e,variant:"info"})}warning(e,s){return this.show({...s,message:e,variant:"warning"})}danger(e,s){return this.show({...s,message:e,variant:"danger"})}startTimer(e){e.remaining<=0||(e.startedAt=Date.now(),e.timer=setTimeout(()=>this.dismiss(e.id),e.remaining))}restartTimer(e){e.timer&&clearTimeout(e.timer),e.remaining=e.duration??0,this.startTimer(e)}dismiss(e){const s=this.snackbars.find(t=>t.id===e);s?.timer&&clearTimeout(s.timer);const n=this.renderRoot.activeElement??document.activeElement,r=!!n&&this.renderRoot.contains(n);if(this.snackbars=this.snackbars.filter(t=>t.id!==e),r){const t=this.previousFocus;this.previousFocus=null,this.updateComplete.then(()=>{t?.isConnected?t.focus():document.body.focus?.()})}}clearAll(){this.snackbars.forEach(e=>e.timer&&clearTimeout(e.timer)),this.snackbars=[]}disconnectedCallback(){super.disconnectedCallback(),this.snackbars.forEach(e=>e.timer&&clearTimeout(e.timer))}render(){return h`
      <div
        class="esa-snackbar-container"
        role="region"
        aria-label=${this.label}
        @keydown=${this.onKeydown}
        @mouseenter=${this.pauseAll}
        @mouseleave=${this.resumeAll}
        @focusin=${this.onFocusIn}
        @focusout=${this.resumeAll}
      >
        ${this.snackbars.map(e=>h`
            <esa-snackbar-item
              message=${e.message}
              variant=${e.variant??"info"}
              action=${e.action??""}
              ?dismissable=${e.dismissable!==!1}
              @dismiss=${()=>this.dismiss(e.id)}
              @action=${()=>this.dispatchEvent(new CustomEvent("snackbar-action",{detail:{id:e.id},bubbles:!0,composed:!0}))}
            ></esa-snackbar-item>
          `)}
      </div>
    `}static{this.styles=f`
    :host { display: contents; }

    .esa-snackbar-container {
      position: fixed;
      bottom: var(--spacing-500, 1.5rem);
      right: var(--spacing-500, 1.5rem);
      z-index: var(--z-toast, 500);
      display: flex;
      flex-direction: column-reverse;
      gap: var(--spacing-200, 0.5rem);
      max-width: var(--snackbar-container-max-width, 420px);
    }

    /* An empty region should not be a hit-testable rectangle sitting over the
       bottom-right of every page. The :empty selector is safe here because the
       container's only children are elements, with no template whitespace
       between them. */
    .esa-snackbar-container:empty {
      display: none;
    }

    /* Reflow (SC 1.4.10) and resize (1.4.4). Below the 320px reflow width a
       420px box with 1.5rem offsets on both sides cannot fit, so the stack
       becomes a full-width strip instead of overflowing the viewport. The same
       rule is what a 400%-zoom viewport hits. */
    @media (max-width: 30rem) {
      .esa-snackbar-container {
        left: var(--spacing-200, 0.5rem);
        right: var(--spacing-200, 0.5rem);
        bottom: var(--spacing-200, 0.5rem);
        max-width: none;
      }
    }
  `}}customElements.get("esa-snackbar-container")||customElements.define("esa-snackbar-container",p);const a=document.getElementById("toasts");document.querySelectorAll(".trigger").forEach(c=>c.addEventListener("click",()=>{switch(c.dataset.kind){case"info":a.info("A neutral notification.");break;case"success":a.success("Changes saved.");break;case"warning":a.warning("Low disk space.");break;case"danger":a.danger("Upload failed.");break;case"action":a.show({message:"Item archived.",variant:"success",action:"Undo"});break;case"timed":a.show({message:"Auto-dismisses in 5s.",duration:5e3});break;case"clear":a.clearAll();break}}));
