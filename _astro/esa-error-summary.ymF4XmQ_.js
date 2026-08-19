import{i as a,A as l,b as i,a as d}from"./lit-element.D8DSg5zn.js";import{t as h}from"./typography.KBHeYOQc.js";import{a as c}from"./a11y.sqk3bMt7.js";class u extends a{constructor(){super(),this.onLinkClick=(e,r)=>{e.preventDefault();const o=this.getRootNode().getElementById?.(r)??document.getElementById(r);o&&(o.scrollIntoView({block:"center",behavior:"smooth"}),o.focus?.({preventScroll:!0}))},this.errors=[],this.heading="There is a problem",this.headingLevel=2}static{this.properties={errors:{type:Array},heading:{type:String},headingLevel:{type:Number,attribute:"heading-level"}}}get valid(){return(this.errors??[]).filter(e=>e&&String(e.message??"").trim())}focus(e){this.valid.length!==0&&this.updateComplete.then(()=>{this.renderRoot.querySelector(".root")?.focus(e)})}render(){const e=this.valid;if(e.length===0)return l;const r=e.length,t=`${this.heading} — ${r} error${r===1?"":"s"}`,o=Math.min(6,Math.max(2,Number(this.headingLevel)||2));return i`
      <div
        class="root"
        tabindex="-1"
        role="group"
        aria-labelledby="heading"
      >
        ${this.alertIcon()}
        <div class="body">
          ${this.renderHeading(o,t)}
          <ul class="list">
            ${e.map(n=>i`<li class="item">
                ${n.field?i`<a
                      class="link"
                      href="#${n.field}"
                      @click=${s=>this.onLinkClick(s,n.field)}
                      >${n.message}</a
                    >`:i`<span class="text">${n.message}</span>`}
              </li>`)}
          </ul>
        </div>
      </div>
    `}renderHeading(e,r){const t="heading typography-label-md-strong";switch(e){case 3:return i`<h3 id="heading" class=${t}>${r}</h3>`;case 4:return i`<h4 id="heading" class=${t}>${r}</h4>`;case 5:return i`<h5 id="heading" class=${t}>${r}</h5>`;case 6:return i`<h6 id="heading" class=${t}>${r}</h6>`;default:return i`<h2 id="heading" class=${t}>${r}</h2>`}}alertIcon(){return i`<span class="icon" aria-hidden="true"
      ><svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg></span
    >`}static{this.styles=[h,c,d`
      :host {
        display: block;
      }

      .root {
        display: flex;
        gap: var(--spacing-300, 0.75rem);
        padding: var(--spacing-400, 1rem);
        /* The hairline role, not --border-width-200. This was 2px, reached via a
           primitive — the last direct tier-1 width read in the kit, left behind
           when --error-summary-border-width folded away. There is no tier-2
           EMPHASIS width to fold onto (default is 1px, focus is 2px but means
           the focus ring), so the choice was a heavier panel or the hairline
           every other panel edge uses. The hairline: the danger COLOUR is what
           marks this panel, and one component quietly running double-weight
           chrome was the divergence nobody asked for. Renders 1px now, down
           from 2px. */
        border: var(--border-width-default, 1px) solid
          var(--color-border-utility-danger, #fdbdbe);
        border-radius: var(--radius-md, 0.5rem);
        background: var(--color-background-utility-danger-subtle, #fff7f7);
        color: var(--color-content-default, #202020);
      }

      /* It takes focus programmatically, so the ring has to be visible when it does
         — this is one of the few places where :focus (not :focus-visible) is right.
         A user sent here by a failed submit did not "click" anything, and
         :focus-visible heuristics can decide not to paint. Losing the ring here
         means the user is moved somewhere with no indication of where. */
      .root:focus {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
        outline-offset: var(--focus-ring-offset, 2px);
      }

      .icon {
        flex: none;
        display: inline-flex;
        color: var(--color-content-utility-danger, #ce2c31);
      }

      .body {
        min-width: 0;
      }

      .heading {
        margin: 0;
        color: var(--color-content-utility-danger, #ce2c31);
      }

      .list {
        margin: var(--spacing-200, 0.5rem) 0 0;
        padding-inline-start: var(--spacing-400, 1rem);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-100, 0.25rem);
      }

      .link {
        color: inherit;
        /* Underlined, not colour-only: these sit on a tinted danger ground where a
           colour shift alone would be the SC 1.4.1 failure. */
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .link:hover {
        text-decoration-thickness: 2px;
      }
      .link:focus-visible {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
        outline-offset: var(--focus-ring-offset, 2px);
      }
    `]}}customElements.get("esa-error-summary")||customElements.define("esa-error-summary",u);
