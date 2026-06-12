import{i as d,b as c,a as m}from"./lit-element.C8p3bJxG.js";import"./esa-snackbar-item.astro_astro_type_script_index_0_lang.Dz1UUNS2.js";class u extends d{constructor(){super(...arguments),this.snackbars=[],this.nextId=0}static{this.properties={snackbars:{state:!0}}}show(s){const a={variant:"info",duration:5e3,dismissable:!0,...s};if(a.uniqueKey){const r=this.snackbars.find(o=>o.uniqueKey===a.uniqueKey);if(r)return r.id}const e=`esa-snackbar-${this.nextId++}`,n={...a,id:e,timer:null};return a.duration&&a.duration>0&&(n.timer=setTimeout(()=>this.dismiss(e),a.duration)),this.snackbars=[...this.snackbars,n],e}success(s,a){return this.show({...a,message:s,variant:"success"})}info(s,a){return this.show({...a,message:s,variant:"info"})}warning(s,a){return this.show({...a,message:s,variant:"warning"})}danger(s,a){return this.show({...a,message:s,variant:"danger"})}dismiss(s){const a=this.snackbars.find(e=>e.id===s);a?.timer&&clearTimeout(a.timer),this.snackbars=this.snackbars.filter(e=>e.id!==s)}clearAll(){this.snackbars.forEach(s=>s.timer&&clearTimeout(s.timer)),this.snackbars=[]}disconnectedCallback(){super.disconnectedCallback(),this.snackbars.forEach(s=>s.timer&&clearTimeout(s.timer))}render(){return c`
      <div class="esa-snackbar-container">
        ${this.snackbars.map(s=>c`
            <esa-snackbar-item
              message=${s.message}
              variant=${s.variant??"info"}
              action=${s.action??""}
              ?dismissable=${s.dismissable!==!1}
              @dismiss=${()=>this.dismiss(s.id)}
              @action=${()=>this.dispatchEvent(new CustomEvent("snackbar-action",{detail:{id:s.id},bubbles:!0,composed:!0}))}
            ></esa-snackbar-item>
          `)}
      </div>
    `}static{this.styles=m`
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
  `}}customElements.get("esa-snackbar-container")||customElements.define("esa-snackbar-container",u);const i=document.getElementById("toasts");document.querySelectorAll(".trigger").forEach(t=>t.addEventListener("click",()=>{switch(t.dataset.kind){case"info":i.info("A neutral notification.");break;case"success":i.success("Changes saved.");break;case"warning":i.warning("Low disk space.");break;case"danger":i.danger("Upload failed.");break;case"action":i.show({message:"Item archived.",variant:"success",action:"Undo"});break;case"clear":i.clearAll();break}}));
