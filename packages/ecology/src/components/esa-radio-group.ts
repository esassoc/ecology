import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';

// Lucide `circle-alert`, copied from ./icon-registry — see esa-text-field.ts.
const alertIcon = html`<svg
  class="error__icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line
    x1="12"
    x2="12.01"
    y1="16"
    y2="16"
  />
</svg>`;

/** The group heading is UI text (label-*, medium); each option's own text is prose
    (body-*, regular). See the FORMS header in component-tokens.css for the mapping. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

interface EsaOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * esa-radio-group — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-radio-group (a ControlValueAccessor whose
 * value is the single selected option value, with vertical/horizontal orientation,
 * per-option disabled state, and a custom circle + dot). No icon needed — the dot is
 * pure CSS.
 *
 * `options` accepts an array directly (property) or a JSON string (attribute).
 * Form participation: ElementInternals.setFormValue(selectedValue) + a
 * bubbling/composed 'change' CustomEvent. Keyboard: Space/Enter select. Decorator-free.
 */
export class EsaRadioGroup extends LitElement {
  static formAssociated = true;

  static properties = {
    options: { type: Array },
    label: { type: String },
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String },
    required: { type: Boolean },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    liveError: { type: Boolean, attribute: 'live-error' },
  };

  declare options: EsaOption[];
  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare orientation: 'vertical' | 'horizontal';
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare value: string | null;
  /**
   * Whether an option must be chosen. Marked on the GROUP, never on each radio — putting
   * `aria-required` on every option announces "required" per option, which reads as
   * "you must select all of these". The group is the thing that is required.
   */
  declare required: boolean;
  declare helpText: string;
  /** Validation message below the group; reddens the legend and renders the error line. */
  declare errorText: string;
  /**
   * Announce the error the moment it appears rather than only when the group is entered.
   * Off by default — see the long note on `esa-text-field.liveError`.
   */
  declare liveError: boolean;

  private internals: ElementInternals;

  constructor() {
    super();
    this.options = [];
    this.label = '';
    this.size = 'md';
    this.orientation = 'vertical';
    this.value = null;
    this.required = false;
    this.helpText = '';
    this.errorText = '';
    this.liveError = false;
    this.internals = this.attachInternals();
  }

  updated(): void {
    this.syncValidity();
  }

  /**
   * `required` has to actually BLOCK submission, not merely announce itself — the same
   * contract the seven self-chromed controls already keep. There is no inner native
   * control to mirror here (the radios are ARIA-role spans), so `valueMissing` is
   * reported directly. The anchor is the first radio, so the browser's own bubble and
   * `reportValidity()` land somewhere focusable.
   */
  private syncValidity(): void {
    if (!this.required || this.value) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.circle') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Select ${this.label}.` : 'Select an option.',
      anchor,
    );
  }

  // Allow the `options` attribute to be a JSON string.
  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('options') && typeof this.options === 'string') {
      try {
        this.options = JSON.parse(this.options as unknown as string);
      } catch {
        this.options = [];
      }
    }
    // A value set from SCRIPT (el.value = 'x') has to reach the form too. Only
    // the click handler used to call setFormValue, so a programmatically
    // selected option rendered as selected and submitted as empty.
    if (changed.has('value')) this.internals.setFormValue(this.value);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.internals.setFormValue(this.value);
  }

  private isSelected(value: string): boolean {
    return this.value === value;
  }

  private selectOption = (option: EsaOption): void => {
    if (option.disabled) return;
    this.value = option.value;
    this.internals.setFormValue(this.value);
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent, option: EsaOption): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.selectOption(option);
    }
  };

  /**
   * Forward focus to the inner control.
   *
   * A form-associated custom element is NOT focusable by default: it has no tabindex and
   * is not a natively focusable tag, so `host.focus()` is a silent no-op, and the real
   * control sits in a shadow root that no outside reference can reach. That is exactly
   * what `<esa-error-summary>` needs — its links resolve a field by id and call `.focus()`
   * on the HOST, because IDREFs cannot cross a shadow boundary in any engine.
   *
   * Without this override the summary scrolls to the field and leaves focus where it was,
   * which is the failure the summary exists to prevent.
   *
   * `delegatesFocus: true` on the shadow root would also do it, but it changes click and
   * `:focus` behaviour across the whole component; an explicit forward is the smaller and
   * more predictable change.
   */
  focus(options?: FocusOptions): void {
    const inner = this.renderRoot?.querySelector<HTMLElement>('.circle--selected, .circle');
    if (inner) inner.focus(options);
    else super.focus(options);
  }

  render() {
    const hasError = !!this.errorText;
    // Error FIRST, then help — both, never one instead of the other.
    const describedBy = [hasError ? 'error' : '', this.helpText ? 'help' : '']
      .filter(Boolean)
      .join(' ');
    return html`
      <!-- A real fieldset/legend, not a div with role=group + aria-label. Three reasons:
           the legend NAMES the fieldset natively (measured to work inside a shadow
           root); a name by REFERENCE cannot drift from the visible text the way the old
           copied aria-label did, which also silently unnamed the group whenever label
           was empty; and role=group is the weak one — support is poor on iOS VoiceOver
           and Android TalkBack, i.e. exactly the users most likely to be filling this in
           on a phone.

           role=radiogroup overrides the fieldset's implicit group role because ARIA does
           not allow aria-required on group, and radiogroup is what this actually is.
           aria-labelledby is belt-and-braces: name-from-legend is an HTML-AAM mapping,
           and overriding the role puts it on less certain ground. -->
      <fieldset
        class="items ${hasError ? 'items--error' : ''}"
        role="radiogroup"
        aria-labelledby=${this.label ? 'legend' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-invalid=${hasError ? 'true' : nothing}
        aria-describedby=${describedBy || nothing}
      >
        ${this.label
          ? html`<legend class="group-label typography-${LABEL_TYPE[this.size]}" id="legend">
              ${this.label}${this.required
                ? html`<span class="required" aria-hidden="true">*</span>`
                : null}
            </legend>`
          : null}
        ${this.options.map((option, i) => {
          const selected = this.isSelected(option.value);
          const disabled = option.disabled ?? false;
          // aria-labelledby, NOT the wrapping label. A label associates only with a
          // LABELABLE element, and role="radio" does not make a span into one — so
          // every option here had NO accessible name until 2026-08-16, measured
          // against Chrome's own accessibility tree. The legend named the group and
          // nothing named the choices inside it, which is the worst shape: the user
          // is told what is being asked and not what the answers are.
          // Indexed because the ids must be unique within this shadow root.
          const labelId = `opt-${i}-label`;
          return html`
            <label
              class="item ${disabled ? 'item--disabled' : ''}"
              @keydown=${(e: KeyboardEvent) => this.onKeydown(e, option)}
              @click=${() => this.selectOption(option)}
            >
              <span
                class="circle ${selected ? 'circle--selected' : ''}"
                role="radio"
                aria-labelledby=${labelId}
                aria-checked=${String(selected)}
                aria-disabled=${String(disabled)}
                tabindex=${disabled ? -1 : 0}
              >
                <span class="dot"></span>
              </span>
              <span id=${labelId} class="item-label typography-${VALUE_TYPE[this.size]}"
                >${option.label}</span
              >
            </label>
          `;
        })}
      </fieldset>

      <!-- Both message nodes always present so the live region pre-exists its content;
           .visually-hidden when empty keeps them out of flow. -->
      <p
        class="error typography-body-sm ${hasError ? 'is-shown' : 'visually-hidden'}"
        id="error"
        role=${this.liveError ? 'alert' : nothing}
          data-esa-live=${this.liveError ? 'opt-in' : nothing}
      >${hasError
          ? html`${alertIcon}<span class="visually-hidden">Error: </span
              ><span>${this.errorText}</span>`
          : nothing}</p>
      <p class="help typography-body-sm ${this.helpText ? 'is-shown' : 'visually-hidden'}" id="help"
        >${this.helpText || nothing}</p
      >
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host {
      --_radio-size: 20px;
      --_radio-dot-size: 10px;
      display: block;
    }
    :host([size='xs']) {
      --_radio-size: 14px;
      --_radio-dot-size: 7px;
    }
    :host([size='sm']) {
      --_radio-size: 16px;
      --_radio-dot-size: 8px;
    }
    :host([size='lg']) {
      --_radio-size: 24px;
      --_radio-dot-size: 12px;
    }

    /* A <legend>, so it names the fieldset natively. The UA gives legend a float/
       padding treatment inside a bordered fieldset; with the border reset off below
       there is nothing to inset it from, and this restores plain block flow. */
    .group-label {
      display: block;
      padding: 0;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-default, #202020);
    }
    .required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-inline-start: 2px;
    }

    /* Now a <fieldset>, which arrives with a UA border, padding, margin and a
       min-inline-size: min-content that breaks flex children. All four are reset —
       the element is here for its SEMANTICS (name-from-legend, and disabled
       propagation if a group-level disabled is ever added), not its chrome. */
    .items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-200, 8px);
      border: 0;
      padding: 0;
      margin: 0;
      min-inline-size: 0;
    }
    :host([orientation='horizontal']) .items {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-400, 16px);
    }

    .item {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      cursor: pointer;
      user-select: none;
    }
    .item--disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_radio-size);
      height: var(--_radio-size);
      flex-shrink: 0;
      /* The size token is authoritative: without this, re-pointing the indicator
         border width would resize the control instead of thickening its edge. */
      box-sizing: border-box;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: 50%;
      background: var(--color-background-field, transparent);
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .circle--selected {
      border-color: var(--color-background-brand, #46a758);
    }
    .circle:focus-visible {
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .dot {
      width: var(--_radio-dot-size);
      height: var(--_radio-dot-size);
      border-radius: 50%;
      background: transparent;
      transition: background var(--transition-fast, 150ms ease);
    }
    .circle--selected .dot {
      background: var(--color-background-brand, #46a758);
    }

    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    /* The dot is a CHILD here, not a fill on the circle, so unlike the checkbox
       this can paint every disabled circle without erasing the selection. */
    .item--disabled .circle {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
    }

    .item-label {
      color: var(--color-content-default, #202020);
    }

    /* An invalid group reddens its legend — the group is what is invalid. This comment used
       to add "and there is no single box to outline the way a text field has", and gave that
       as the reason the ring stayed brand-coloured. The premise was right and the conclusion
       was not: there is no single circle, so DO NOT outline one — re-point the token instead
       and all N circles follow. That is the house mechanism for the error ring as of
       2026-08-17 (see esa-text-field), and a group is the case that makes it obviously
       correct rather than merely tidier. */
    .items--error {
      --focus-ring-color: var(--form-error-border-color, #e5484d);
    }
    .items--error .group-label {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }

    /* Both message nodes always render (the live region has to pre-exist its content);
       .visually-hidden takes the empty ones out of flow. Not display:none, which would
       drop them from the accessibility tree. */
    .help,
    .error {
      margin: 0;
    }
    .help.is-shown,
    .error.is-shown {
      margin-block-start: var(--form-help-gap, 4px);
    }
    .help {
      color: var(--form-help-color, #838383);
    }
    /* Colour, icon AND a visually-hidden "Error:" — colour alone is SC 1.4.1. */
    .error {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
    .error__icon {
      flex: none;
      width: 1em;
      height: 1em;
    }

    /* FORCED COLORS. The radio is worse off than the checkbox: the checkbox has a
       tick, a real shape that survives, but selection here is a .dot that is
       always in the DOM and differs ONLY by 'background' (transparent vs brand).
       Force-adjust both and selected and unselected become the same empty circle.
       Nothing else changes — border-WIDTH is constant, only border-colour moves,
       and colour is exactly what this mode overrides.

       CanvasText rather than Highlight for the dot: the dot sits inside the
       circle rather than replacing it, so it reads as a mark on the control, not
       as a selection sweep across a row. Highlight is reserved for list rows. */
    @media (forced-colors: active) {
      .circle {
        background: Canvas;
        border-color: CanvasText;
      }
      .circle--selected { border-color: CanvasText; }
      .circle--selected .dot { background: CanvasText; }
      .item--disabled .circle { border-color: GrayText; }
      .item--disabled .circle--selected .dot { background: GrayText; }
      .item--disabled { color: GrayText; }
    }
  `,
  ];
}

if (!customElements.get('esa-radio-group')) {
  customElements.define('esa-radio-group', EsaRadioGroup);
}
