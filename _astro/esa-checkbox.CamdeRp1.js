import{w as i,i as a,A as o,b as t,a as s}from"./lit-element.D8DSg5zn.js";import{t as r}from"./typography.KBHeYOQc.js";import{a as n}from"./a11y.sqk3bMt7.js";const c={xs:"body-2xs",sm:"body-xs",md:"body-md",lg:"body-lg"},l=i`<polyline points="20 6 9 17 4 12"></polyline>`,d=i`<line x1="5" y1="12" x2="19" y2="12"></line>`;class h extends a{constructor(){super(),this.toggle=()=>{this.disabled||(this.checked=!this.checked,this.syncFormValue(),this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0})))},this.onKeydown=e=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.toggle())},this.label="",this.size="md",this.disabled=!1,this.indeterminate=!1,this.checked=!1,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={label:{type:String},size:{type:String,reflect:!0},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},indeterminate:{type:Boolean,reflect:!0},checked:{type:Boolean,reflect:!0}}}connectedCallback(){super.connectedCallback(),this.syncFormValue()}syncFormValue(){this.internals.setFormValue(this.checked?"on":null),this.internals.ariaChecked=this.indeterminate?"mixed":String(this.checked)}render(){const e=this.getAttribute("aria-label");return t`
      <label class="wrapper" @keydown=${this.onKeydown} @click=${this.toggle}>
        <!-- aria-labelledby, NOT the wrapping label. A label associates only with a
             LABELABLE element — a form control — and an ARIA role does not make a
             span into one. Measured 2026-08-16 against Chrome's accessibility tree:
             this control's name was the empty string, with no name source at all.
             The wrapping label still earns its keep for the click target. -->
        <span
          class="box"
          role="checkbox"
          aria-labelledby=${this.label?"label":o}
          aria-label=${!this.label&&e?e:o}
          aria-checked=${this.indeterminate?"mixed":String(this.checked)}
          aria-disabled=${String(this.disabled)}
          tabindex=${this.disabled?-1:0}
        >
          ${this.indeterminate?t`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`:this.checked?t`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${l}</svg>`:null}
        </span>
        ${this.label?t`<span id="label" class="label typography-${c[this.size]}">${this.label}</span>`:null}
      </label>
    `}static{this.styles=[r,n,s`
    :host {
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--radius-md, 0.5rem);
      --_checkbox-icon-size: 16px;
      display: inline-block;
    }
    /* Box geometry only — the label's type is a composite named in render(). */
    :host([size='xs']) {
      --_checkbox-size: 14px;
      --_checkbox-radius: var(--radius-sm, 0.25rem);
      --_checkbox-icon-size: 10px;
    }
    :host([size='sm']) {
      --_checkbox-size: 16px;
      --_checkbox-radius: var(--radius-sm, 0.25rem);
      --_checkbox-icon-size: 12px;
    }
    :host([size='lg']) {
      --_checkbox-size: 24px;
      --_checkbox-radius: var(--radius-md, 0.5rem);
      --_checkbox-icon-size: 20px;
    }
    :host([disabled]) .wrapper {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      cursor: pointer;
      user-select: none;
    }

    .box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_checkbox-size);
      height: var(--_checkbox-size);
      flex-shrink: 0;
      /* The size token is authoritative: without this, re-pointing the indicator
         border width would resize the control instead of thickening its edge. */
      box-sizing: border-box;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--_checkbox-radius);
      background: var(--color-background-field, transparent);
      color: var(--color-content-default-knockout, #fcfcfc);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box:focus-visible {
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    :host([checked]) .box,
    :host([indeterminate]) .box {
      background: var(--color-background-brand, #46a758);
      border-color: var(--color-background-brand, #46a758);
    }

    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    /* Scoped to the UNCHECKED box on purpose: a checked box is a brand fill, and
       painting grey over it would erase the check. The wrapper's opacity above is
       what dims the checked case. */
    :host([disabled]:not([checked]):not([indeterminate])) .box {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
    }

    /* Type comes from .typography-body-* on the element — including its leading.
       This used to pin line-height to tight (1.3) while every other label in the
       kit led at 1.6; that was a local special case, not a decision, and choice
       labels now read like the rest. */
    .label {
      color: var(--color-content-default, #202020);
    }

    /* FORCED COLORS. The box is a span carrying role=checkbox, not an input, so it
       gets none of the system styling a native checkbox does — no ButtonFace, and
       no GrayText when disabled. aria-disabled is invisible to this mode; it
       reads elements, never roles.

       Checked survives on its own: the tick is a currentColor SVG, and a SHAPE
       is not something force-adjustment can take away. What it can take away is
       the brand fill behind it, which would leave a tick the same colour as the
       box it sits in — hence the explicit Highlight/HighlightText pair.

       Disabled is stated in GrayText because the custom grey above collapses onto
       ordinary text colour. The opacity on the group wrapper does survive (opacity
       is not force-adjusted), so this is belt and braces, not the only signal. */
    @media (forced-colors: active) {
      .box {
        background: Canvas;
        border-color: CanvasText;
      }
      :host([checked]) .box,
      :host([indeterminate]) .box {
        background: Highlight;
        border-color: Highlight;
        color: HighlightText;
      }
      :host([disabled]) .box { border-color: GrayText; }
      :host([disabled]) .label { color: GrayText; }
    }
  `]}}customElements.get("esa-checkbox")||customElements.define("esa-checkbox",h);
