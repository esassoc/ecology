import{i as a,b as o,a as s}from"./lit-element.D8DSg5zn.js";import{t as l}from"./typography.KBHeYOQc.js";class d extends a{static{this.properties={files:{type:Array},removable:{type:Boolean,reflect:!0},downloadable:{type:Boolean,reflect:!0}}}constructor(){super(),this.files=[],this.removable=!1,this.downloadable=!0}emit(e,t,r){this.dispatchEvent(new CustomEvent(e,{detail:{file:t,index:r},bubbles:!0,composed:!0}))}onRemove(e){const t=this.files[e];this.files=this.files.filter((r,n)=>n!==e),this.emit("remove",t,e)}render(){return this.files.length?o`
      <ul class="list">
        ${this.files.map((e,t)=>o`<li class="file typography-microcopy-sm-subtle">
            <span class="file__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
              </svg>
            </span>
            ${e.href?o`<a class="file__name" href=${e.href} title=${e.name}>${e.name}</a>`:o`<span class="file__name" title=${e.name}>${e.name}</span>`}
            <span class="file__actions">
              ${this.downloadable?o`<button
                    class="file__btn"
                    type="button"
                    aria-label=${"Download "+e.name}
                    @click=${()=>this.emit("download",e,t)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  </button>`:null}
              ${this.removable?o`<button
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
    `:o``}static{this.styles=[l,s`
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
      /* hub-edit-approved: Andrew (front-end architect) approved in-session — add a
         backward-compatible density knob so consumers can give file rows more breathing
         room without restyling the shadow DOM. Defaults reproduce the original tight row. */
      padding: var(--file-list-row-padding-y, 2px)
        var(--file-list-row-padding-x, var(--spacing-300, 12px));
      /* --border-width-default, not --form-border-width: a file row is not a form
         control, and the colour half of this very declaration already reads the
         tier-2 role. --form-border-width is a thin alias over the same token, so
         this is value-neutral and stops a spoke's input restyling from reaching
         file rows. */
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-sm, 0.25rem);
      background: var(--color-background-elevation-raised, #fcfcfc);
    }
    .file__icon {
      display: inline-flex;
      color: var(--color-content-default-muted, #838383);
    }
    .file__icon svg {
      width: 16px;
      height: 16px;
    }
    .file__name {
      min-width: 0;
      /* CLIP THE X AXIS ONLY — "overflow: hidden" here sliced the descenders off
         every g/j/p/q/y in a filename. The row carries .typography-microcopy-sm-subtle,
         so line-height is "none" (1): the line box is exactly 1em tall while DM Sans's
         glyph box needs 1.30em (0.99 ascent + 0.31 descent). Half-leading is therefore
         NEGATIVE (-0.15em) and the baseline sits 0.16em off the bottom, but the
         descender ink reaches 0.21em — ~1px of it below the box at 14px. Hiding both
         axes clips that ink; hiding one and leaving the other visible does not.
         clip/visible is the legal pair (hidden/visible is not — it computes to auto
         and can grow a scrollbar), text-overflow: ellipsis still applies, and the box
         height is unchanged, so nothing in the grid row moves. Verified truncating in
         Chromium, WebKit and Firefox. Do not collapse this back to "overflow: hidden". */
      overflow-x: clip;
      overflow-y: visible;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-content-default, #202020);
      /* Transparent, not 'none'. text-decoration-color IS force-adjusted, so the
         underline comes back in forced colors and a linked filename stays
         distinguishable from an unlinked one — which here is otherwise a pure
         colour difference. Removing the decoration outright cannot come back. */
      text-decoration-color: transparent;
    }
    a.file__name {
      color: var(--color-content-brand, #2a7e3b);
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
      color: var(--color-content-default-muted, #838383);
      border-radius: var(--radius-sm, 0.25rem);
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
      background: var(--color-background-elevation-sunken, #f0f0f0);
      color: var(--color-content-default, #202020);
    }
    .file__btn--remove:hover {
      color: var(--color-content-utility-danger, #ce2c31);
    }
    .file__btn:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: 1px;
    }
  `]}}customElements.get("esa-file-list")||customElements.define("esa-file-list",d);const c=[{name:"nesting-bird-survey-2026.pdf",href:"#"},{name:"weap-signin-2026-05.pdf",href:"#"},{name:"C57-driller-license-2026.pdf",href:"#"}];customElements.whenDefined("esa-file-list").then(()=>{document.querySelectorAll("esa-file-list").forEach(e=>{e.files=c.map(t=>({...t}))});const i=document.querySelector('esa-file-list[data-demo="remove"]');i&&(i.downloadable=!1)});
