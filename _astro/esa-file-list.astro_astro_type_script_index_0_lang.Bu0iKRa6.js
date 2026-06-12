import{i as n,b as i,a as s}from"./lit-element.C8p3bJxG.js";class l extends n{static{this.properties={files:{type:Array},removable:{type:Boolean,reflect:!0},downloadable:{type:Boolean,reflect:!0}}}constructor(){super(),this.files=[],this.removable=!1,this.downloadable=!0}emit(e,t,o){this.dispatchEvent(new CustomEvent(e,{detail:{file:t,index:o},bubbles:!0,composed:!0}))}onRemove(e){const t=this.files[e];this.files=this.files.filter((o,a)=>a!==e),this.emit("remove",t,e)}render(){return this.files.length?i`
      <ul class="list">
        ${this.files.map((e,t)=>i`<li class="file">
            <span class="file__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
              </svg>
            </span>
            ${e.href?i`<a class="file__name" href=${e.href} title=${e.name}>${e.name}</a>`:i`<span class="file__name" title=${e.name}>${e.name}</span>`}
            <span class="file__actions">
              ${this.downloadable?i`<button
                    class="file__btn"
                    type="button"
                    aria-label=${"Download "+e.name}
                    @click=${()=>this.emit("download",e,t)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  </button>`:null}
              ${this.removable?i`<button
                    class="file__btn file__btn--remove"
                    type="button"
                    aria-label=${"Remove "+e.name}
                    @click=${()=>this.onRemove(t)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>`:null}
            </span>
          </li>`)}
      </ul>
    `:i``}static{this.styles=s`
    :host {
      display: block;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-150, 6px);
    }
    .file {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: 2px var(--spacing-300, 12px);
      border: var(--form-border-width, 1px) solid var(--color-border, #e5e5e5);
      border-radius: var(--radius-100, 4px);
      background: var(--color-surface, #fff);
      font-family: var(--font-sans, sans-serif);
      font-size: var(--type-size-150, 12px);
    }
    .file__icon {
      display: inline-flex;
      color: var(--color-text-muted, #737373);
    }
    .file__icon svg {
      width: 16px;
      height: 16px;
    }
    .file__name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text-primary, #171717);
      text-decoration: none;
    }
    a.file__name {
      color: var(--color-link, var(--color-primary, #005862));
    }
    a.file__name:hover {
      text-decoration: underline;
    }
    .file__actions {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
    }
    .file__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-text-muted, #737373);
      border-radius: var(--radius-100, 4px);
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
    }
    .file__btn svg {
      width: 15px;
      height: 15px;
    }
    .file__btn:hover {
      background: var(--color-surface-sunken, #efefef);
      color: var(--color-text-primary, #171717);
    }
    .file__btn--remove:hover {
      color: var(--color-danger, #ef4444);
    }
    .file__btn:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #005862);
      outline-offset: 1px;
    }
  `}}customElements.get("esa-file-list")||customElements.define("esa-file-list",l);const d=[{name:"nesting-bird-survey-2026.pdf",href:"#"},{name:"weap-signin-2026-05.pdf",href:"#"},{name:"C57-driller-license-2026.pdf",href:"#"}];customElements.whenDefined("esa-file-list").then(()=>{document.querySelectorAll("esa-file-list").forEach(e=>{e.files=d.map(t=>({...t}))});const r=document.querySelector('esa-file-list[data-demo="remove"]');r&&(r.downloadable=!1)});
