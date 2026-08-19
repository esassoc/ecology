import{i as n,A as l,b as i,a as c}from"./lit-element.D8DSg5zn.js";import{t as d}from"./typography.KBHeYOQc.js";import{a as h}from"./a11y.sqk3bMt7.js";class u extends n{constructor(){super(),this.onLinkClick=(e,r)=>{e.preventDefault();const t=this.getRootNode().getElementById?.(r)??document.getElementById(r);t&&(t.scrollIntoView({block:"center",behavior:"smooth"}),t.focus?.({preventScroll:!0}))},this.errors=[],this.heading="There is a problem",this.headingLevel=2}static{this.properties={errors:{type:Array},heading:{type:String},headingLevel:{type:Number,attribute:"heading-level"}}}get valid(){return(this.errors??[]).filter(e=>e&&String(e.message??"").trim())}focus(e){this.valid.length!==0&&this.updateComplete.then(()=>{this.renderRoot.querySelector(".root")?.focus(e)})}render(){const e=this.valid;if(e.length===0)return l;const r=e.length,o=`${this.heading} — ${r} error${r===1?"":"s"}`,t=Math.min(6,Math.max(2,Number(this.headingLevel)||2));return i`
      <div
        class="root"
        tabindex="-1"
        role="group"
        aria-labelledby="heading"
      >
        ${this.alertIcon()}
        <div class="body">
          ${this.renderHeading(t,o)}
          <ul class="list">
            ${e.map(s=>i`<li class="item">
                ${s.field?i`<a
                      class="link"
                      href="#${s.field}"
                      @click=${a=>this.onLinkClick(a,s.field)}
                      >${s.message}</a
                    >`:i`<span class="text">${s.message}</span>`}
              </li>`)}
          </ul>
        </div>
      </div>
    `}renderHeading(e,r){const o="heading typography-label-md-strong";switch(e){case 3:return i`<h3 id="heading" class=${o}>${r}</h3>`;case 4:return i`<h4 id="heading" class=${o}>${r}</h4>`;case 5:return i`<h5 id="heading" class=${o}>${r}</h5>`;case 6:return i`<h6 id="heading" class=${o}>${r}</h6>`;default:return i`<h2 id="heading" class=${o}>${r}</h2>`}}alertIcon(){return i`<span class="icon" aria-hidden="true"
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
    >`}static{this.styles=[d,h,c`
      :host {
        display: block;
      }

      .root {
        display: flex;
        gap: var(--spacing-300, 0.75rem);
        padding: var(--spacing-400, 1rem);
        border: var(--error-summary-border-width, var(--border-width-200, 2px)) solid
          var(--error-summary-border-color, var(--color-border-utility-danger, #fdbdbe));
        border-radius: var(--error-summary-radius, var(--radius-md, 0.5rem));
        background: var(--error-summary-bg, var(--color-background-utility-danger-subtle, #fff7f7));
        color: var(--color-content-default, #202020);
      }

      /* It takes focus programmatically, so the ring has to be visible when it does
         — this is one of the few places where :focus (not :focus-visible) is right.
         A user sent here by a failed submit did not "click" anything, and
         :focus-visible heuristics can decide not to paint. Losing the ring here
         means the user is moved somewhere with no indication of where. */
      .root:focus {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
        outline-offset: var(--focus-ring-offset, 2px);
      }

      .icon {
        flex: none;
        display: inline-flex;
        color: var(--error-summary-icon-color, var(--color-content-utility-danger, #ce2c31));
      }

      .body {
        min-width: 0;
      }

      .heading {
        margin: 0;
        color: var(--error-summary-heading-color, var(--color-content-utility-danger, #ce2c31));
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
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
        outline-offset: var(--focus-ring-offset, 2px);
      }
    `]}}customElements.get("esa-error-summary")||customElements.define("esa-error-summary",u);
