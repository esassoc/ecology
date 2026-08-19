import{i as a,b as r,a as s}from"./lit-element.D8DSg5zn.js";import{t as n}from"./typography.KBHeYOQc.js";class l extends a{constructor(){super(),this.openFileBrowser=()=>{if(this.disabled)return;this.renderRoot.querySelector(".native")?.click()},this.onFileSelected=e=>{const o=e.target;o.files&&this.processFiles(Array.from(o.files)),o.value=""},this.onDragOver=e=>{e.preventDefault(),e.stopPropagation(),this.disabled||(this._isDragging=!0)},this.onDragLeave=e=>{e.preventDefault(),e.stopPropagation(),this._isDragging=!1},this.onDrop=e=>{if(e.preventDefault(),e.stopPropagation(),this._isDragging=!1,this.disabled)return;const o=e.dataTransfer?.files;o&&this.processFiles(Array.from(o))},this.onZoneKeydown=e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.openFileBrowser())},this.label="Upload files",this.accept="",this.multiple=!1,this.maxSizeMb=10,this.disabled=!1,this.name="files",this._isDragging=!1,this._files=[],this._error="",this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},accept:{type:String},multiple:{type:Boolean},maxSizeMb:{type:Number,attribute:"max-size-mb"},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},_isDragging:{state:!0},_files:{state:!0},_error:{state:!0}}}updated(){this.toggleAttribute("dragging",this._isDragging)}syncFormValue(){const e=new FormData;for(const o of this._files)e.append(this.name,o,o.name);this.internals.setFormValue(this._files.length?e:null),this.dispatchEvent(new CustomEvent("change",{detail:{files:[...this._files]},bubbles:!0,composed:!0}))}removeFile(e){this._files=this._files.filter((o,i)=>i!==e),this.syncFormValue()}formatFileSize(e){return e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB"}processFiles(e){this._error="";const o=this.maxSizeMb*1024*1024,i=e.filter(t=>t.size>o);i.length>0&&(this._error=`File${i.length>1?"s":""} exceed ${this.maxSizeMb} MB limit: ${i.map(t=>t.name).join(", ")}`,e=e.filter(t=>t.size<=o)),e.length!==0&&(this._files=this.multiple?[...this._files,...e]:[e[0]],this.syncFormValue())}render(){return r`
      <input
        type="file"
        class="native"
        accept=${this.accept}
        ?multiple=${this.multiple}
        ?disabled=${this.disabled}
        @change=${this.onFileSelected}
      />

      <div
        class="zone"
        role="button"
        tabindex="0"
        aria-disabled=${this.disabled}
        @click=${this.openFileBrowser}
        @dragover=${this.onDragOver}
        @dragleave=${this.onDragLeave}
        @drop=${this.onDrop}
        @keydown=${this.onZoneKeydown}
      >
        ${this.uploadIcon()}
        <span class="zone__label typography-label-md">${this.label}</span>
        <span class="zone__hint typography-body-sm">Drag &amp; drop or <span class="browse">browse</span></span>
        ${this.maxSizeMb?r`<span class="zone__limit typography-body-sm">Max ${this.maxSizeMb} MB per file</span>`:null}
      </div>

      ${this._error?r`<div class="error typography-body-sm">${this._error}</div>`:null}

      ${this._files.length>0?r`<ul class="files">
            ${this._files.map((e,o)=>r`<li class="file">
                ${this.fileIcon()}
                <span class="file__name typography-microcopy-sm-subtle">${e.name}</span>
                <span class="file__size typography-microcopy-sm-subtle">${this.formatFileSize(e.size)}</span>
                <button
                  type="button"
                  class="file__remove"
                  aria-label=${"Remove "+e.name}
                  @click=${i=>{i.stopPropagation(),this.removeFile(o)}}
                >
                  ${this.xIcon()}
                </button>
              </li>`)}
          </ul>`:null}
    `}uploadIcon(){return r`<svg class="icon icon--lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" /></svg>`}fileIcon(){return r`<svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>`}xIcon(){return r`<svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`}static{this.styles=[n,s`
    :host {
      display: block;
    }
    .icon {
      width: var(--icon-size-md, 20px);
      height: var(--icon-size-md, 20px);
      flex-shrink: 0;
    }
    .icon--sm {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
    }
    .icon--lg {
      width: var(--icon-size-lg, 24px);
      height: var(--icon-size-lg, 24px);
    }

    .native {
      display: none;
    }

    .zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-100, 4px);
      padding: var(--spacing-600, 32px) var(--spacing-400, 16px);
      border: 2px dashed var(--form-border-color, #d4d4d4);
      border-radius: var(--form-radius-md, 8px);
      background: var(--color-background-field, transparent);
      cursor: pointer;
      text-align: center;
      color: var(--color-content-default-muted, #737373);
      transition:
        border-color var(--transition-fast, 150ms ease),
        background var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .zone:hover {
      border-color: var(--form-border-color-focus, #43608a);
    }
    .zone:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    :host([dragging]) .zone {
      border-color: var(--color-background-brand, #43608a);
      background: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #2a7e3b);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    :host([disabled]) .zone,
    :host([disabled]) .zone:hover {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }

    .zone__label {
      color: var(--color-content-default, #171717);
    }
    .zone__hint {
      color: var(--color-content-default-muted, #737373);
    }
    .browse {
      color: var(--color-content-brand, #2a7e3b);
      text-decoration: underline;
    }
    .zone__limit {
      color: var(--color-content-default-muted, #737373);
    }

    .error {
      margin-top: var(--spacing-100, 4px);
      color: var(--color-content-utility-danger, #ce2c31);
    }

    .files {
      list-style: none;
      margin: var(--spacing-200, 8px) 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .file {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      background: var(--color-background-elevation-sunken, #efefef);
      border-radius: var(--form-radius-sm, 6px);
      color: var(--color-content-default-muted, #737373);
    }
    .file__name {
      flex: 1;
      color: var(--color-content-default, #171717);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file__size {
      color: var(--color-content-default-muted, #737373);
      white-space: nowrap;
    }
    .file__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-content-default-muted, #737373);
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
      transition: background var(--transition-fast, 150ms ease);
    }
    .file__remove:hover {
      background: var(--color-border-default, #e5e5e5);
      color: var(--color-content-utility-danger, #ce2c31);
    }
    .file__remove:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }
  `]}}customElements.get("esa-file-upload")||customElements.define("esa-file-upload",l);
