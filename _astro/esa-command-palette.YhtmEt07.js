import{i,b as r,a as l}from"./lit-element.D8DSg5zn.js";import{t as d}from"./typography.KBHeYOQc.js";import{a as c}from"./a11y.sqk3bMt7.js";import{a as m}from"./announcer.D25EqVSf.js";class p extends i{constructor(){super(),this.query="",this.activeId=null,this.onGlobalKeydown=e=>{this.hotkey&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"&&(e.preventDefault(),this.toggle())},this.onSearch=e=>{this.query=e.target.value,this.activeId=null},this.onKeydown=e=>{const o=this.flatCommands;if(e.key==="Escape"){e.preventDefault(),this.close();return}if(o.length===0)return;const t=o.findIndex(a=>a.id===this.activeId);switch(e.key){case"ArrowDown":{e.preventDefault();const a=t<o.length-1?t+1:0;this.activeId=o[a].id;break}case"ArrowUp":{e.preventDefault();const a=t>0?t-1:o.length-1;this.activeId=o[a].id;break}case"Enter":{e.preventDefault();const a=o.find(s=>s.id===this.activeId);a?this.execute(a):o.length===1&&this.execute(o[0]);break}}},this.wasEmpty=!1,this.commands=[],this.open=!1,this.hotkey=!0}static{this.properties={commands:{type:Array},open:{type:Boolean,reflect:!0},hotkey:{type:Boolean},query:{state:!0},activeId:{state:!0}}}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onGlobalKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onGlobalKeydown)}toggle(){this.open?this.close():this.show()}show(){this.open=!0,this.query="",this.activeId=null,requestAnimationFrame(()=>{this.renderRoot.querySelector(".esa-command-palette__input")?.focus()})}close(){this.open=!1}get flatCommands(){return this.filteredGroups().flatMap(e=>e.commands.filter(o=>!o.disabled))}filteredGroups(){const e=this.query.toLowerCase().trim(),o=e?this.commands.filter(a=>[a.label,a.description??"",...a.keywords??[]].join(" ").toLowerCase().includes(e)):this.commands,t=new Map;for(const a of o){const s=a.group??"Commands",n=t.get(s)??[];n.push(a),t.set(s,n)}return Array.from(t.entries()).map(([a,s])=>({label:a,commands:s}))}execute(e){e.disabled||(e.action(),this.close())}announceEmptyResults(){const e=this.open&&!!this.query.trim()&&this.filteredGroups().length===0;e&&!this.wasEmpty&&m("No commands found",{assertive:!0}),this.wasEmpty=e}updated(){this.announceEmptyResults()}render(){if(!this.open)return r``;const e=this.filteredGroups();return r`
      <div class="esa-command-palette__backdrop" @click=${this.close}></div>
      <div class="esa-command-palette" role="dialog" aria-label="Command palette">
        <div class="esa-command-palette__search">
          <svg class="esa-command-palette__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <!-- The input had no accessible name — only a placeholder, which is not a
               name and vanishes as soon as you type. The cue below is what makes
               announcing the result list on every keystroke unnecessary; the visible
               footer tells sighted users the same thing. -->
          <input
            class="esa-command-palette__input typography-microcopy-lg-subtle"
            type="text"
            aria-label="Search commands"
            aria-describedby="cue"
            placeholder="Type a command..."
            .value=${this.query}
            @input=${this.onSearch}
            @keydown=${this.onKeydown}
            autocomplete="off"
          />
          <span class="visually-hidden" id="cue"
            >Commands filter as you type. Use the up and down arrows to review them,
            Enter to run one, Escape to close.</span
          >
          <kbd class="esa-command-palette__kbd typography-body-xs">ESC</kbd>
        </div>
        <div class="esa-command-palette__results" role="listbox">
          ${e.map(o=>r`
              <div class="esa-command-palette__group">
                <div class="esa-command-palette__group-label typography-eyebrow-md">${o.label}</div>
                ${o.commands.map(t=>r`
                    <button
                      class="esa-command-palette__item ${t.id===this.activeId?"esa-command-palette__item--active":""} ${t.disabled?"esa-command-palette__item--disabled":""}"
                      ?disabled=${t.disabled}
                      role="option"
                      aria-selected=${t.id===this.activeId}
                      @click=${()=>this.execute(t)}
                      @mouseenter=${()=>this.activeId=t.id}
                    >
                      <div class="esa-command-palette__item-content">
                        <span class="esa-command-palette__item-label typography-label-md">${t.label}</span>
                        ${t.description?r`<span class="esa-command-palette__item-desc typography-body-sm">${t.description}</span>`:null}
                      </div>
                      ${t.shortcut?r`<kbd class="esa-command-palette__item-shortcut typography-body-xs">${t.shortcut}</kbd>`:null}
                    </button>
                  `)}
              </div>
            `)}
          ${e.length===0?r`<div class="esa-command-palette__empty typography-body-md">No commands found for "${this.query}"</div>`:null}
        </div>
      </div>
    `}static{this.styles=[d,c,l`
    :host { display: contents; }

    .esa-command-palette__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
    }

    .esa-command-palette {
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: var(--command-palette-width, 560px);
      max-width: calc(100vw - 2rem);
      max-height: var(--command-palette-max-height, 440px);
      background: var(--color-background-elevation-floating, #fcfcfc);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-lg, 0.75rem);
      box-shadow: var(--elevation-6, 0 20px 60px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
      animation: esa-cmdk-enter var(--animation-enter, 150ms ease-out);
    }
    @keyframes esa-cmdk-enter {
      from { opacity: 0; transform: translateX(-50%) scale(0.96); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }

    .esa-command-palette__search {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }
    /* The ring goes on the ROW, not the input. The input is chromeless by design,
       so a ring drawn on it would float around bare text; the row is the visible
       affordance. :focus-within rather than :focus-visible for the same reason
       esa-text-field uses it — this is text entry, where a ring on click is native
       behaviour and wanted.

       Inset because the row runs edge to edge inside an overflow:hidden panel, so
       an outline at positive offset would be clipped on both sides. */
    .esa-command-palette__search:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
    }
    .esa-command-palette__search-icon {
      color: var(--color-content-default-muted, #838383);
      flex-shrink: 0;
    }
    .esa-command-palette__input {
      flex: 1;
      border: none;
      /* Suppressed only because the row above paints the ring — never bare. */
      outline: none;
      color: var(--color-content-default, #202020);
      background: transparent;
      font-family: inherit;
    }
    .esa-command-palette__input::placeholder { color: var(--color-content-default-muted, #838383); }

    .esa-command-palette__kbd,
    .esa-command-palette__item-shortcut {
      padding: 2px 6px;
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-content-default-muted, #838383);
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .esa-command-palette__results {
      overflow-y: auto;
      padding: var(--spacing-200, 0.5rem);
    }
    .esa-command-palette__group-label {
      padding: var(--spacing-200, 0.5rem) var(--spacing-200, 0.5rem) var(--spacing-100, 0.25rem);
      color: var(--color-content-default-muted, #838383);
    }

    .esa-command-palette__item {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default, #202020);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;
    }
    .esa-command-palette__item--active { background: var(--color-background-elevation-sunken, #f0f0f0); }
    .esa-command-palette__item--disabled { opacity: 0.5; cursor: not-allowed; }
    .esa-command-palette__item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: -2px;
    }

    .esa-command-palette__item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .esa-command-palette__item-desc {
      color: var(--color-content-default-muted, #838383);
    }

    .esa-command-palette__empty {
      padding: var(--spacing-600, 2rem);
      text-align: center;
      color: var(--color-content-default-muted, #838383);
    }
  `]}}customElements.get("esa-command-palette")||customElements.define("esa-command-palette",p);
