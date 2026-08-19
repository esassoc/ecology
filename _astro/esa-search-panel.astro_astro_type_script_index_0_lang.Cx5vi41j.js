import{i as p,b as r,a as h}from"./lit-element.D8DSg5zn.js";import{t as u}from"./typography.KBHeYOQc.js";import{a as g}from"./a11y.sqk3bMt7.js";import{a as f}from"./announcer.dkeh-00N.js";const l=a=>r`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${a}
    height=${a}
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
`,m=a=>r`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${a}
    height=${a}
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
`,v=a=>r`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${a}
    height=${a}
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
`;class y extends p{constructor(){super(),this.query="",this.wasEmpty=!1,this.onNativeClose=()=>{this.close()},this.onSearch=t=>{const e=t.target.value;this.query=e,this.hasSearched=e.length>0,this.internals.setFormValue(e||null),this.dispatchEvent(new CustomEvent("search",{detail:{value:e},bubbles:!0,composed:!0}))},this.selectResult=t=>{this.dispatchEvent(new CustomEvent("result-select",{detail:t,bubbles:!0,composed:!0}))},this.close=()=>{this.open&&(this.open=!1,this.dispatchEvent(new CustomEvent("open-change",{detail:{open:!1},bubbles:!0,composed:!0})))},this.open=!1,this.placeholder="Search...",this.results=[],this.loading=!1,this.position="right",this.hasSearched=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={open:{type:Boolean,reflect:!0},placeholder:{type:String},results:{type:Array},loading:{type:Boolean,reflect:!0},position:{type:String,reflect:!0},name:{type:String,reflect:!0},hasSearched:{type:Boolean,state:!0}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(this.query||null)}get groupedResults(){const t=new Map;for(const e of this.results??[]){const o=e.category??"",i=t.get(o)??[];i.push(e),t.set(o,i)}return Array.from(t.entries()).map(([e,o])=>({category:e,items:o}))}announceEmptyResults(){const t=this.open&&this.hasSearched&&!this.loading&&(this.results?.length??0)===0;t&&!this.wasEmpty&&f("No results found",{assertive:!0}),this.wasEmpty=t}get dialogEl(){return this.renderRoot.querySelector("dialog")}updated(t){if(this.announceEmptyResults(),t.has("open")){const e=this.dialogEl;this.open?(this.hasSearched=!1,e&&!e.open&&e.showModal(),requestAnimationFrame(()=>{this.renderRoot.querySelector(".input")?.focus()})):e?.close()}}render(){return r`
      <dialog
        class="panel panel--${this.position}"
        closedby="any"
        aria-label=${this.placeholder||"Search"}
        @close=${this.onNativeClose}
      >
        <div class="header">
          <div class="search-box" role="search">
            ${l(20)}
            <!-- The input had no accessible name — only a placeholder, which is not
                 a name and disappears once you type. The cue is what makes announcing
                 the result list on every keystroke unnecessary. -->
            <input
              class="input typography-microcopy-md-subtle"
              type="text"
              aria-label=${this.placeholder||"Search"}
              aria-describedby="cue"
              placeholder=${this.placeholder}
              autocomplete="off"
              @input=${this.onSearch}
            />
            <span class="visually-hidden" id="cue"
              >Results appear below as you type. Escape closes the panel.</span
            >
          </div>
          <button class="close" @click=${this.close} aria-label="Close search">
            ${m(20)}
          </button>
        </div>
        <div class="body">${this.renderBody()}</div>
      </dialog>
    `}renderBody(){return this.loading?r`<div class="loading">Searching...</div>`:(this.results?.length??0)>0?this.groupedResults.map(t=>r`
          ${t.category?r`<div class="category typography-eyebrow-md">${t.category}</div>`:null}
          ${t.items.map(e=>r`
              <button class="result typography-body-sm" @click=${()=>this.selectResult(e)}>
                ${e.icon?v(16):null}
                <div class="result-content">
                  <span class="result-title typography-label-sm">${e.title}</span>
                  ${e.subtitle?r`<span class="result-subtitle typography-body-xs">${e.subtitle}</span>`:null}
                </div>
              </button>
            `)}
        `):this.hasSearched?r`
        <div class="empty">
          ${l(24)}
          <p>No results found</p>
        </div>
      `:null}static{this.styles=[u,g,h`
    :host {
      display: contents;
    }

    /* ::backdrop replaces the scrim div; the top layer replaces the z-index pair.
       Literal fallback is the real value where ::backdrop does not inherit custom
       properties — see esa-dialog. Note this scrim is 0.3 alpha, not the 0.5 the
       other overlays use; that difference predates the migration and is kept. */
    dialog.panel::backdrop {
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.3));
    }

    /* Edge-docked sheet: explicit insets and a zeroed margin rather than the UA's
       centering 'margin: auto', and its border/padding/max-* clamps cleared. */
    dialog.panel {
      position: fixed;
      top: 0;
      bottom: 0;
      margin: 0;
      border: none;
      padding: 0;
      width: var(--search-panel-width, 400px);
      max-width: 90vw;
      max-height: none;
      background: var(--color-background-elevation-floating, #fcfcfc);
      color: var(--color-content-default, #202020);
      box-shadow: var(--elevation-5, -4px 0 24px rgba(0, 0, 0, 0.1));
    }
    dialog.panel[open] { display: flex; flex-direction: column; }

    dialog.panel--right {
      right: 0;
      animation: esa-search-slide-in-right var(--animation-overlay-enter, 250ms ease-out);
    }

    dialog.panel--left {
      left: 0;
      box-shadow: var(--elevation-5, 4px 0 24px rgba(0, 0, 0, 0.1));
      animation: esa-search-slide-in-left var(--animation-overlay-enter, 250ms ease-out);
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
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      color: var(--color-content-default-secondary, #646464);
    }

    /* The ring goes on the search BOX, not the input — the input is chromeless, so
       a ring on it would float around bare text. :focus-within rather than
       :focus-visible because this is text entry, where a ring on click is native
       behaviour and wanted. Inset so it cannot collide with the close button that
       shares the header row. */
    .search-box:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
      border-radius: var(--radius-sm, 0.25rem);
    }

    .input {
      flex: 1;
      border: none;
      /* Suppressed only because .search-box paints the ring — never bare. */
      outline: none;
      font-family: inherit;
      color: var(--color-content-default, #202020);
      background: transparent;
    }

    .input::placeholder {
      color: var(--color-content-default-secondary, #646464);
    }

    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default-secondary, #646464);
      cursor: pointer;
    }

    .close:hover {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-200, 8px);
    }

    .category {
      padding: var(--spacing-300, 12px) var(--spacing-200, 8px) var(--spacing-100, 4px);
      color: var(--color-content-default-secondary, #646464);
    }

    .result {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 12px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default, #202020);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }

    .result:hover {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .result-content {
      display: flex;
      flex-direction: column;
    }

    .result-subtitle {
      color: var(--color-content-default-secondary, #646464);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-700, 48px) var(--spacing-400, 16px);
      color: var(--color-content-default-secondary, #646464);
      text-align: center;
    }

    .loading {
      padding: var(--spacing-500, 24px);
      text-align: center;
      color: var(--color-content-default-secondary, #646464);
    }

    /* FORCED COLORS. The panel is flush to the viewport edge with no radius, so
       only the INBOARD edge carries meaning — but that is the edge the shadow was
       drawing, and box-shadow is forced to 'none'. A full border is simpler than
       a side-specific one and costs nothing: the outboard edges are off-screen. */
    @media (forced-colors: active) {
      dialog.panel { border: 1px solid CanvasText; }
    }
  `]}}customElements.get("esa-search-panel")||customElements.define("esa-search-panel",y);const c=[{id:"r1",title:"Wetland delineation report",subtitle:"Project 2024-118",icon:"file",category:"Documents"},{id:"r2",title:"Air quality monitoring plan",subtitle:"Draft",icon:"file",category:"Documents"},{id:"r3",title:"North watershed",subtitle:"Region",icon:"pin",category:"Places"},{id:"r4",title:"Coastal zone",subtitle:"Region",icon:"pin",category:"Places"},{id:"r5",title:"Jane Doe",subtitle:"Compliance officer",category:"People"}],d=document.getElementById("status-right"),s=document.getElementById("sp-right");s.results=c;s.addEventListener("search",a=>{d.textContent=a.detail.value?`Searching: "${a.detail.value}"`:""});s.addEventListener("result-select",a=>{d.textContent=`Selected: ${a.detail.title}`,s.open=!1});document.getElementById("open-right").addEventListener("click",()=>s.open=!0);const n=document.getElementById("sp-left");n.results=c;n.addEventListener("result-select",()=>n.open=!1);document.getElementById("open-left").addEventListener("click",()=>n.open=!0);const b=document.getElementById("sp-loading");document.getElementById("open-loading").addEventListener("click",()=>b.open=!0);
