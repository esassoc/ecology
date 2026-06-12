import{i as p,b as s,a as u}from"./lit-element.C8p3bJxG.js";const l=r=>s`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${r}
    height=${r}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>
`,h=r=>s`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${r}
    height=${r}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18"></path>
    <path d="m6 6 12 12"></path>
  </svg>
`,g=r=>s`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${r}
    height=${r}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;class f extends p{constructor(){super(),this.query="",this.onSearch=e=>{const t=e.target.value;this.query=t,this.hasSearched=t.length>0,this.internals.setFormValue(t||null),this.dispatchEvent(new CustomEvent("search",{detail:{value:t},bubbles:!0,composed:!0}))},this.selectResult=e=>{this.dispatchEvent(new CustomEvent("result-select",{detail:e,bubbles:!0,composed:!0}))},this.close=()=>{this.open&&(this.open=!1,this.dispatchEvent(new CustomEvent("open-change",{detail:{open:!1},bubbles:!0,composed:!0})))},this.onKeydown=e=>{e.key==="Escape"&&(e.preventDefault(),this.close())},this.open=!1,this.placeholder="Search...",this.results=[],this.loading=!1,this.position="right",this.hasSearched=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={open:{type:Boolean,reflect:!0},placeholder:{type:String},results:{type:Array},loading:{type:Boolean,reflect:!0},position:{type:String,reflect:!0},hasSearched:{type:Boolean,state:!0}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.query||null)}get groupedResults(){const e=new Map;for(const t of this.results??[]){const n=t.category??"",i=e.get(n)??[];i.push(t),e.set(n,i)}return Array.from(e.entries()).map(([t,n])=>({category:t,items:n}))}updated(e){e.has("open")&&this.open&&(this.hasSearched=!1,requestAnimationFrame(()=>{this.renderRoot.querySelector(".input")?.focus()}))}render(){return this.open?s`
      <div class="backdrop" @click=${this.close}></div>
      <aside
        class="panel panel--${this.position}"
        role="search"
        @keydown=${this.onKeydown}
      >
        <div class="header">
          <div class="search-box">
            ${l(20)}
            <input
              class="input"
              type="text"
              placeholder=${this.placeholder}
              autocomplete="off"
              @input=${this.onSearch}
            />
          </div>
          <button class="close" @click=${this.close} aria-label="Close search">
            ${h(20)}
          </button>
        </div>
        <div class="body">${this.renderBody()}</div>
      </aside>
    `:s``}renderBody(){return this.loading?s`<div class="loading">Searching...</div>`:(this.results?.length??0)>0?this.groupedResults.map(e=>s`
          ${e.category?s`<div class="category">${e.category}</div>`:null}
          ${e.items.map(t=>s`
              <button class="result" @click=${()=>this.selectResult(t)}>
                ${t.icon?g(16):null}
                <div class="result-content">
                  <span class="result-title">${t.title}</span>
                  ${t.subtitle?s`<span class="result-subtitle">${t.subtitle}</span>`:null}
                </div>
              </button>
            `)}
        `):this.hasSearched?s`
        <div class="empty">
          ${l(24)}
          <p>No results found</p>
        </div>
      `:null}static{this.styles=u`
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop, rgba(0, 0, 0, 0.3));
      z-index: var(--z-modal-backdrop, 9998);
    }

    .panel {
      position: fixed;
      top: 0;
      bottom: 0;
      width: var(--search-panel-width, 400px);
      max-width: 90vw;
      background: var(--search-panel-bg, var(--color-surface-elevated, #ffffff));
      box-shadow: var(--search-panel-shadow, var(--shadow-400, -4px 0 24px rgba(0, 0, 0, 0.1)));
      z-index: var(--z-modal, 9999);
      display: flex;
      flex-direction: column;
    }

    .panel--right {
      right: 0;
      animation: esa-search-slide-in-right 200ms ease-out;
    }

    .panel--left {
      left: 0;
      box-shadow: var(--search-panel-shadow, var(--shadow-400, 4px 0 24px rgba(0, 0, 0, 0.1)));
      animation: esa-search-slide-in-left 200ms ease-out;
    }

    @keyframes esa-search-slide-in-right {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes esa-search-slide-in-left {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-300, 12px) var(--spacing-400, 16px);
      border-bottom: 1px solid var(--color-border-light, #efefef);
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      color: var(--color-text-muted, #737373);
    }

    .input {
      flex: 1;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: 1rem;
      color: var(--color-text-primary, #171717);
      background: transparent;
    }

    .input::placeholder {
      color: var(--color-text-muted, #737373);
    }

    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-200, 8px);
      background: transparent;
      color: var(--color-text-secondary, #525252);
      cursor: pointer;
    }

    .close:hover {
      background: var(--color-surface-sunken, #efefef);
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-200, 8px);
    }

    .category {
      padding: var(--spacing-300, 12px) var(--spacing-200, 8px) var(--spacing-100, 4px);
      font-size: 0.6875rem;
      font-weight: var(--font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-wide, 0.05em);
      color: var(--color-text-muted, #737373);
    }

    .result {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 12px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border: none;
      border-radius: var(--radius-200, 8px);
      background: transparent;
      color: var(--color-text-primary, #171717);
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      text-align: left;
    }

    .result:hover {
      background: var(--search-panel-result-bg-hover, var(--color-surface-sunken, #efefef));
    }

    .result-content {
      display: flex;
      flex-direction: column;
    }

    .result-title {
      font-weight: var(--font-weight-medium, 500);
    }

    .result-subtitle {
      font-size: 0.75rem;
      color: var(--color-text-muted, #737373);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-700, 48px) var(--spacing-400, 16px);
      color: var(--color-text-muted, #737373);
      text-align: center;
    }

    .loading {
      padding: var(--spacing-500, 24px);
      text-align: center;
      color: var(--color-text-muted, #737373);
    }
  `}}customElements.get("esa-search-panel")||customElements.define("esa-search-panel",f);const c=[{id:"r1",title:"Wetland delineation report",subtitle:"Project 2024-118",icon:"file",category:"Documents"},{id:"r2",title:"Air quality monitoring plan",subtitle:"Draft",icon:"file",category:"Documents"},{id:"r3",title:"North watershed",subtitle:"Region",icon:"pin",category:"Places"},{id:"r4",title:"Coastal zone",subtitle:"Region",icon:"pin",category:"Places"},{id:"r5",title:"Jane Doe",subtitle:"Compliance officer",category:"People"}],d=document.getElementById("status-right"),a=document.getElementById("sp-right");a.results=c;a.addEventListener("search",r=>{d.textContent=r.detail.value?`Searching: "${r.detail.value}"`:""});a.addEventListener("result-select",r=>{d.textContent=`Selected: ${r.detail.title}`,a.open=!1});document.getElementById("open-right").addEventListener("click",()=>a.open=!0);const o=document.getElementById("sp-left");o.results=c;o.addEventListener("result-select",()=>o.open=!1);document.getElementById("open-left").addEventListener("click",()=>o.open=!0);const v=document.getElementById("sp-loading");document.getElementById("open-loading").addEventListener("click",()=>v.open=!0);
