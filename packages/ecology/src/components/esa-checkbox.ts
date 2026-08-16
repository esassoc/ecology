import { LitElement, html, css, svg } from 'lit';
import { typography } from '../typography.js';

/** A choice label is the option's own text, not the group's heading — prose
    weight, so it reads body-* rather than label-*. See the FORMS header in
    component-tokens.css for the step→rung mapping. */
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

// Inlined Lucide icons (lucide.dev) to avoid an icon dependency.
const checkIcon = svg`<polyline points="20 6 9 17 4 12"></polyline>`;
const minusIcon = svg`<line x1="5" y1="12" x2="19" y2="12"></line>`;

/**
 * esa-checkbox — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-checkbox (a ControlValueAccessor with a
 * custom box, hidden native input, indeterminate state, and Space/Enter keyboard
 * toggling). The lucide-angular `check`/`minus` icons are inlined as SVG.
 *
 * Form participation: form-associated element + ElementInternals.setFormValue
 * ('on' when checked, null otherwise) + a bubbling/composed 'change' CustomEvent.
 * Keyboard: Space/Enter toggle. Decorator-free on purpose.
 */
export class EsaCheckbox extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    checked: { type: Boolean, reflect: true },
  };

  declare label: string;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare indeterminate: boolean;
  declare checked: boolean;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = '';
    this.size = 'md';
    this.disabled = false;
    this.indeterminate = false;
    this.checked = false;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.syncFormValue();
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.checked ? 'on' : null);
    this.internals.ariaChecked = this.indeterminate ? 'mixed' : String(this.checked);
  }

  private toggle = (): void => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { checked: this.checked }, bubbles: true, composed: true })
    );
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  };

  render() {
    return html`
      <label class="wrapper" @keydown=${this.onKeydown} @click=${this.toggle}>
        <span
          class="box"
          role="checkbox"
          aria-checked=${this.indeterminate ? 'mixed' : String(this.checked)}
          aria-disabled=${String(this.disabled)}
          tabindex=${this.disabled ? -1 : 0}
        >
          ${this.indeterminate
            ? html`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${minusIcon}</svg>`
            : this.checked
              ? html`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${checkIcon}</svg>`
              : null}
        </span>
        ${this.label
          ? html`<span class="label typography-${VALUE_TYPE[this.size]}">${this.label}</span>`
          : null}
      </label>
    `;
  }

  static styles = [
    typography,
    css`
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
      border: var(--form-border-width, 1px) solid var(--form-border-color, #d4d4d4);
      border-radius: var(--_checkbox-radius);
      background: var(--color-background-field, transparent);
      color: var(--color-content-default-knockout, #fff);
      transition:
        background var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .box:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    .icon {
      width: var(--_checkbox-icon-size);
      height: var(--_checkbox-icon-size);
    }

    :host([checked]) .box,
    :host([indeterminate]) .box {
      background: var(--color-background-brand, #43608a);
      border-color: var(--color-background-brand, #43608a);
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
      color: var(--color-content-default, #171717);
    }
  `,
  ];
}

if (!customElements.get('esa-checkbox')) {
  customElements.define('esa-checkbox', EsaCheckbox);
}
