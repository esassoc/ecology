import{i as r,A as i,b as a,a as s}from"./lit-element.D8DSg5zn.js";import{t as o}from"./typography.KBHeYOQc.js";import{a as n}from"./a11y.sqk3bMt7.js";import{b as l}from"./boolish.DOQu-9JQ.js";const c={xs:"label-2xs",sm:"label-xs",md:"label-md",lg:"label-lg"},h={xs:"microcopy-2xs",sm:"microcopy-xs",md:"microcopy-md",lg:"microcopy-lg"};class u extends r{constructor(){super(),this.onInput=e=>{const t=Number(e.target.value);this.value=t,this.internals.setFormValue(String(t)),this.dispatchEvent(new CustomEvent("change",{detail:{value:t},bubbles:!0,composed:!0}))},this.min=0,this.max=100,this.step=1,this.size="md",this.label="",this.showValue=!0,this.disabled=!1,this.value=0,this.internals=this.attachInternals()}static{this.formAssociated=!0}static{this.properties={min:{type:Number},max:{type:Number},step:{type:Number},size:{type:String,reflect:!0},label:{type:String},showValue:{type:Boolean,attribute:"show-value",converter:l},disabled:{type:Boolean,reflect:!0},name:{type:String,reflect:!0},value:{type:Number}}}connectedCallback(){super.connectedCallback(),this.internals.setFormValue(String(this.value))}willUpdate(e){e.has("value")&&this.internals.setFormValue(String(this.value))}get fillPercent(){return this.max===this.min?0:(this.value-this.min)/(this.max-this.min)*100}render(){return a`
      ${this.label?a`<label for="input" class="label typography-${c[this.size]}"
            >${this.label}</label
          >`:null}
      <div class="row">
        <div class="track-wrapper">
          <input
            id="input"
            type="range"
            class="input"
            min=${this.min}
            max=${this.max}
            step=${this.step}
            .value=${String(this.value)}
            ?disabled=${this.disabled}
            style="--_fill-percent: ${this.fillPercent}%"
            aria-label=${this.label?i:"Range slider"}
            aria-valuemin=${this.min}
            aria-valuemax=${this.max}
            aria-valuenow=${this.value}
            @input=${this.onInput}
          />
        </div>
        ${this.showValue?a`<span class="value typography-${h[this.size]}">${this.value}</span>`:null}
      </div>
    `}static{this.styles=[o,n,s`
    :host {
      display: block;
      --_track-height: 6px;
      --_thumb-size: 20px;
    }
    :host([size='xs']) {
      --_track-height: 3px;
      --_thumb-size: 14px;
    }
    :host([size='sm']) {
      --_track-height: 4px;
      --_thumb-size: 16px;
    }
    :host([size='lg']) {
      --_track-height: 8px;
      --_thumb-size: 24px;
    }

    .label {
      display: block;
      margin-bottom: var(--spacing-100, 4px);
      color: var(--color-content-default, #202020);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 12px);
    }
    .track-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
    }

    .input {
      width: 100%;
      height: var(--_thumb-size);
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      cursor: pointer;
    }
    .input::-webkit-slider-runnable-track {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: linear-gradient(
        to right,
        var(--color-background-brand, #46a758) 0%,
        var(--color-background-brand, #46a758) var(--_fill-percent, 0%),
        var(--color-border-default, #cecece) var(--_fill-percent, 0%),
        var(--color-border-default, #cecece) 100%
      );
    }
    .input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      margin-top: calc((var(--_track-height) - var(--_thumb-size)) / 2);
      border: 2px solid var(--color-background-brand, #46a758);
      border-radius: 50%;
      background: var(--color-background-elevation-raised, #fcfcfc);
      box-shadow: var(--elevation-1, 0 1px 3px rgba(0, 0, 0, 0.12));
      transition:
        box-shadow var(--transition-fast, 150ms ease),
        transform var(--transition-fast, 150ms ease);
    }
    .input::-moz-range-track {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: var(--color-border-default, #cecece);
    }
    .input::-moz-range-progress {
      height: var(--_track-height);
      border-radius: calc(var(--_track-height) / 2);
      background: var(--color-background-brand, #46a758);
    }
    .input::-moz-range-thumb {
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      border: 2px solid var(--color-background-brand, #46a758);
      border-radius: 50%;
      background: var(--color-background-elevation-raised, #fcfcfc);
      box-shadow: var(--elevation-1, 0 1px 3px rgba(0, 0, 0, 0.12));
    }
    .input:focus-visible {
      outline: none;
    }
    .input:focus-visible::-webkit-slider-thumb {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .input:focus-visible::-moz-range-thumb {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .input:hover:not(:disabled)::-webkit-slider-thumb {
      transform: scale(1.1);
    }
    .input:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .value {
      min-width: 3ch;
      text-align: right;
      color: var(--color-content-default, #202020);
      font-variant-numeric: tabular-nums;
    }

    /* FORCED COLORS. This is the kit's ONLY gradient, and it is the value fill —
       non-url() background-image is forced to 'none', so the slider would read as
       empty at every position. The thumb survives on its own (real 2px border).

       The track opts OUT and re-states the fill in system colours, rather than
       simply opting out and keeping the brand green. A plain opt-out would keep
       author colours the user has explicitly asked not to see, and green-on-black
       is exactly the contrast a theme may have been chosen to avoid. Highlight
       and Canvas are the user's own values, so the fill stays legible in a theme
       we cannot predict.

       Gecko splits the same job across two pseudo-elements (-moz-range-track is
       the trough, -moz-range-progress the fill), so it needs no gradient at all.

       The 'forced-color-adjust: none' on a UA pseudo-element is the part of this
       file to re-check in a real contrast theme. If it does not take, the fill is
       lost but the component still reports its value: showValue defaults to true
       and .value is real text. That fallback is why this is safe to ship. */
    @media (forced-colors: active) {
      .input::-webkit-slider-runnable-track {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
        background: linear-gradient(
          to right,
          Highlight 0%,
          Highlight var(--_fill-percent, 0%),
          Canvas var(--_fill-percent, 0%),
          Canvas 100%
        );
      }
      .input::-moz-range-track {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
        background: Canvas;
      }
      .input::-moz-range-progress {
        forced-color-adjust: none;
        background: Highlight;
      }
      .input:disabled::-webkit-slider-runnable-track,
      .input:disabled::-moz-range-track { border-color: GrayText; }
    }
  `]}}customElements.get("esa-range-slider")||customElements.define("esa-range-slider",u);
