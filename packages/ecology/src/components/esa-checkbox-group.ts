import { LitElement, html, css, svg, nothing } from 'lit';
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

// Inlined Lucide `check` icon (lucide.dev) to avoid an icon dependency.
const checkIcon = svg`<polyline points="20 6 9 17 4 12"></polyline>`;

/**
 * esa-checkbox-group — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-checkbox-group (a ControlValueAccessor
 * whose value is a string[] of selected option values, with vertical/horizontal
 * orientation and per-option disabled state). The lucide-angular `check` icon is
 * inlined as SVG.
 *
 * `options` accepts an array directly (property) or a JSON string (attribute).
 * Form participation: each selected value is appended to a FormData submitted via
 * ElementInternals.setFormValue, plus a bubbling/composed 'change' CustomEvent
 * carrying the current string[]. Keyboard: Space/Enter toggle. Decorator-free.
 */
export class EsaCheckboxGroup extends LitElement {
  static formAssociated = true;

  static properties = {
    options: { type: Array },
    label: { type: String },
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: Array },
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
  declare value: string[];
  /**
   * Whether at least one option must be chosen.
   *
   * Unlike esa-radio-group this canNOT use `aria-required`: a checkbox group is a
   * `group`, and ARIA only allows aria-required on widget roles like `radiogroup`.
   * Overriding the role to radiogroup would be a lie — radiogroup means single-select.
   * So the requirement goes where the spec's own technique (H90) puts it: in the
   * group's ACCESSIBLE NAME, as "(select at least one)" appended to the legend.
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
    this.value = [];
    this.required = false;
    this.helpText = '';
    this.errorText = '';
    this.liveError = false;
    this.internals = this.attachInternals();
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
    // A value set from SCRIPT (el.value = [...]) has to reach the form too. Only
    // the toggle handler used to call syncFormValue, so a programmatically
    // checked box rendered as checked and submitted as empty. `name` is in here
    // because it is the FormData key — changing it has to rewrite the entries.
    if (changed.has('value') || changed.has('name')) this.syncFormValue();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  updated(): void {
    this.syncValidity();
  }

  /**
   * `required` has to actually BLOCK submission, not merely say so in the legend — the
   * same contract the seven self-chromed controls already keep. "Empty" here means no
   * boxes ticked. The anchor is the first box, so the browser's bubble and
   * `reportValidity()` land somewhere focusable.
   */
  private syncValidity(): void {
    if (!this.required || this.value.length > 0) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.box') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Select at least one option for ${this.label}.` : 'Select at least one option.',
      anchor,
    );
  }

  private syncFormValue(): void {
    const data = new FormData();
    const fieldName = this.name || 'checkbox-group';
    for (const v of this.value) data.append(fieldName, v);
    this.internals.setFormValue(data);
  }

  private isChecked(value: string): boolean {
    return this.value.includes(value);
  }

  private toggleOption = (option: EsaOption): void => {
    if (option.disabled) return;
    const idx = this.value.indexOf(option.value);
    this.value =
      idx >= 0 ? this.value.filter((v) => v !== option.value) : [...this.value, option.value];
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent, option: EsaOption): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggleOption(option);
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
    const inner = this.renderRoot?.querySelector<HTMLElement>('.box--checked, .box');
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
      <!-- A real fieldset/legend rather than a div with role=group + a copied aria-label.
           The legend names the fieldset natively (measured to work inside a shadow root),
           and a reference cannot drift from the visible text or vanish when label is
           empty. role=group is left IMPLICIT here — the explicit one bought nothing and
           is poorly supported on iOS VoiceOver and Android TalkBack. -->
      <fieldset
        class="items ${hasError ? 'items--error' : ''}"
        aria-invalid=${hasError ? 'true' : nothing}
        aria-describedby=${describedBy || nothing}
      >
        ${this.label
          ? html`<legend class="group-label typography-${LABEL_TYPE[this.size]}" id="legend">
              ${this.label}${this.required
                ? // The requirement lives in the NAME, not in aria-required — see the
                  // note on the `required` property. This is WCAG technique H90.
                  html`<span class="group-label__req"> (select at least one)</span>`
                : null}
            </legend>`
          : null}
        ${this.options.map((option) => {
          const checked = this.isChecked(option.value);
          const disabled = option.disabled ?? false;
          return html`
            <label
              class="item ${disabled ? 'item--disabled' : ''}"
              @keydown=${(e: KeyboardEvent) => this.onKeydown(e, option)}
            >
              <span
                class="box ${checked ? 'box--checked' : ''}"
                role="checkbox"
                aria-checked=${String(checked)}
                aria-disabled=${String(disabled)}
                tabindex=${disabled ? -1 : 0}
                @click=${() => this.toggleOption(option)}
              >
                ${checked
                  ? html`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${checkIcon}</svg>`
                  : null}
              </span>
              <span class="item-label typography-${VALUE_TYPE[this.size]}">${option.label}</span>
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
      --_checkbox-size: 20px;
      --_checkbox-radius: var(--radius-md, 0.5rem);
      --_checkbox-icon-size: 16px;
      display: block;
    }
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

    .group-label {
      display: block;
      margin-bottom: var(--spacing-200, 8px);
      color: var(--color-content-default, #171717);
    }

    .items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-200, 8px);
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

    .box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_checkbox-size);
      height: var(--_checkbox-size);
      flex-shrink: 0;
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--color-background-field, transparent);
      color: var(--color-content-default-knockout, #fff);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box--checked {
      background: var(--color-background-brand, #43608a);
      border-color: var(--color-background-brand, #43608a);
    }

    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    /* Unchecked only — see esa-checkbox for why. */
    .item--disabled .box:not(.box--checked) {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
    }
    .box:focus-visible {
      border-color: var(--form-border-color-focus, #43608a);
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    .item-label {
      color: var(--color-content-default, #171717);
    }

    /* An invalid group reddens its legend — the group is what is invalid, and there is
       no single box to outline the way a text field has. */
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
      color: var(--form-help-color, #737373);
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
  `,
  ];
}

if (!customElements.get('esa-checkbox-group')) {
  customElements.define('esa-checkbox-group', EsaCheckboxGroup);
}
