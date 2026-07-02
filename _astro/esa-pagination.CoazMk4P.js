import{i as s,b as a,a as o}from"./lit-element.C8p3bJxG.js";const n='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 18-6-6 6-6"/><path d="M7 6v12"/></svg>',r='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',l='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',g='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 18 6-6-6-6"/><path d="M17 6v12"/></svg>';class p extends s{constructor(){super(),this.goToFirst=()=>{this.disabled||this.isFirstPage||this.emitPageChange(0)},this.goToPrevious=()=>{this.disabled||this.isFirstPage||this.emitPageChange(this.currentPage-1)},this.goToNext=()=>{this.disabled||this.isLastPage||this.emitPageChange(this.currentPage+1)},this.goToLast=()=>{this.disabled||this.isLastPage||this.emitPageChange(this.totalPages-1)},this.onPageSizeChange=t=>{const e=Number(t.target.value);isNaN(e)||this.disabled||(this.pageSize=e,this.dispatchEvent(new CustomEvent("pagesizechange",{detail:{pageSize:e},bubbles:!0,composed:!0})),this.emitPageChange(0))},this.totalItems=0,this.pageSize=25,this.currentPage=0,this.pageSizeOptions=[10,25,50,100],this.showPageSizeSelector=!0,this.showFirstLastButtons=!0,this.disabled=!1}static{this.properties={totalItems:{type:Number,attribute:"total-items"},pageSize:{type:Number,attribute:"page-size"},currentPage:{type:Number,attribute:"current-page"},pageSizeOptions:{type:Array,attribute:"page-size-options"},showPageSizeSelector:{type:Boolean,attribute:"show-page-size-selector"},showFirstLastButtons:{type:Boolean,attribute:"show-first-last-buttons"},disabled:{type:Boolean,reflect:!0}}}get totalPages(){return Math.max(1,Math.ceil(this.totalItems/this.pageSize))}get rangeLabel(){const t=this.totalItems;if(t===0)return"0 of 0";const e=this.currentPage*this.pageSize+1,i=Math.min((this.currentPage+1)*this.pageSize,t);return`${e} – ${i} of ${t.toLocaleString()}`}get isFirstPage(){return this.currentPage===0}get isLastPage(){return this.currentPage>=this.totalPages-1}emitPageChange(t){this.currentPage=t,this.dispatchEvent(new CustomEvent("pagechange",{detail:{page:t},bubbles:!0,composed:!0}))}render(){return a`
      <div class="container ${this.disabled?"container--disabled":""}" role="navigation" aria-label="Pagination">
        ${this.showPageSizeSelector&&this.pageSizeOptions.length>0?a`<div class="page-size">
              <label class="page-size-label" for="esa-page-size">Items per page:</label>
              <select
                class="page-size-select"
                id="esa-page-size"
                .value=${String(this.pageSize)}
                ?disabled=${this.disabled}
                @change=${this.onPageSizeChange}
              >
                ${this.pageSizeOptions.map(t=>a`<option value=${t} ?selected=${t===this.pageSize}>${t}</option>`)}
              </select>
            </div>`:null}

        <span class="range">${this.rangeLabel}</span>

        <div class="buttons">
          ${this.showFirstLastButtons?a`<button class="button" type="button" aria-label="First page" ?disabled=${this.disabled||this.isFirstPage} @click=${this.goToFirst}>
                <span class="ic" .innerHTML=${n}></span>
              </button>`:null}
          <button class="button" type="button" aria-label="Previous page" ?disabled=${this.disabled||this.isFirstPage} @click=${this.goToPrevious}>
            <span class="ic" .innerHTML=${r}></span>
          </button>
          <button class="button" type="button" aria-label="Next page" ?disabled=${this.disabled||this.isLastPage} @click=${this.goToNext}>
            <span class="ic" .innerHTML=${l}></span>
          </button>
          ${this.showFirstLastButtons?a`<button class="button" type="button" aria-label="Last page" ?disabled=${this.disabled||this.isLastPage} @click=${this.goToLast}>
                <span class="ic" .innerHTML=${g}></span>
              </button>`:null}
        </div>
      </div>
    `}static{this.styles=o`
    :host {
      --_pagination-bg: var(--pagination-bg, var(--color-surface, #ffffff));
      --_pagination-border-color: var(--pagination-border-color, var(--color-border, rgba(0, 0, 0, 0.12)));
      --_pagination-text-color: var(--pagination-text-color, var(--color-text-secondary, #525252));
      --_pagination-font-size: var(--pagination-font-size, var(--type-size-200, 14px));
      --_pagination-button-color: var(--pagination-button-color, var(--color-text-primary, #171717));
      --_pagination-button-disabled-color: var(--color-disabled-text, #bdbdbd);
      --_pagination-button-hover-bg: var(--color-hover-overlay, rgba(0, 0, 0, 0.04));
      --_pagination-padding-x: var(--pagination-padding-x, var(--spacing-400, 16px));
      --_pagination-padding-y: var(--pagination-padding-y, var(--spacing-200, 8px));

      display: block;
    }

    .container {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-400, 16px);
      min-height: 40px;
      padding: var(--_pagination-padding-y) var(--_pagination-padding-x);
      background: var(--_pagination-bg);
      border-top: 1px solid var(--_pagination-border-color);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: var(--_pagination-font-size);
      color: var(--_pagination-text-color);
    }
    .container--disabled { opacity: 0.6; pointer-events: none; }

    .page-size { display: flex; align-items: center; gap: var(--spacing-200, 8px); }
    .page-size-label {
      white-space: nowrap;
      color: var(--_pagination-text-color);
      font-size: var(--_pagination-font-size);
    }
    .page-size-select {
      padding: var(--spacing-100, 4px) var(--spacing-200, 8px);
      border: 1px solid var(--_pagination-border-color);
      border-radius: var(--radius-100, 4px);
      background: var(--_pagination-bg);
      color: var(--_pagination-text-color);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: var(--_pagination-font-size);
      cursor: pointer;
      appearance: auto;
    }
    .page-size-select:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .page-size-select:disabled { cursor: default; opacity: 0.5; }

    .range {
      white-space: nowrap;
      color: var(--_pagination-text-color);
      font-size: var(--_pagination-font-size);
    }

    .buttons { display: flex; align-items: center; gap: var(--spacing-100, 4px); }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: var(--radius-full, 9999px);
      background: transparent;
      color: var(--_pagination-button-color);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
    }
    .ic { display: flex; }
    .button:hover:not(:disabled) { background: var(--_pagination-button-hover-bg); }
    .button:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .button:disabled { color: var(--_pagination-button-disabled-color); cursor: default; }
  `}}customElements.get("esa-pagination")||customElements.define("esa-pagination",p);
