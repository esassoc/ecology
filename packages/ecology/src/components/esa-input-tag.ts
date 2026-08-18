import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { announce } from '../announcer.js';

/** Label / trigger text is UI text (label-*, medium); typed values, options and
    chips are prose (body-*, regular). See the FORMS header in component-tokens.css. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
// The typed value is microcopy: it sits IN the field box, whose height comes from
// padding, so it carries no leading. `-subtle` is the regular weight — a value must
// not outweigh the label naming it.
const FIELD_TYPE = { xs: 'microcopy-2xs-subtle', sm: 'microcopy-xs-subtle', md: 'microcopy-md-subtle', lg: 'microcopy-lg-subtle' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

interface EsaInputTagOption {
  value: string;
  label: string;
}

/**
 * esa-input-tag — form-associated Lit Web Component (tag / token multiselect).
 *
 * Faithful translation of the Angular/Beacon ui-input-tag:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - selected value = array of tokens → mirrored to the form (comma-joined) + emitted as
 *     an array in the `change` event detail
 *
 * Tokens are free-form chips entered by the user (Enter to add) and removable (× or
 * Backspace on an empty field). An optional `options` list drives a filtered suggestion
 * dropdown; suggestions and typed values coexist. The token VALUE is what's submitted;
 * when an option matches, its label is shown on the chip.
 *
 * Ecology extensions (not in the Angular lib):
 *   - `strict`     — options-only vocabulary: the free-form "Add" row is suppressed,
 *                    tokens can only come from `options`.
 *   - `tags-below` — chips render in a row BELOW the input instead of inline, so a
 *                    long selection never crowds the field.
 *
 * Decorator-free on purpose: avoids per-consumer tsconfig decorator flags. Tokens reach
 * inside shadow DOM because CSS custom properties inherit through it.
 *
 * Keyboard: Enter adds the typed value (or the highlighted suggestion); ArrowUp/Down move
 * through suggestions; Backspace on an empty field removes the last token; Escape closes
 * the dropdown.
 */
export class EsaInputTag extends LitElement {
  static formAssociated = true;

  static properties = {
    /** The name of the value being collected. */
    label: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    /**
     * The non-obvious interaction this control requires, stated as an
     * instruction — a keyboard or entry mechanic the user can't infer on
     * their own, not a restatement of the label. "Press Enter to add each tag."
     */
    hint: { type: String },
    /**
     * An example of a well-formed value for this field — never an instruction,
     * never a substitute for the label. "e.g. 12-345-678."
     */
    placeholder: { type: String },
    options: { type: Array },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
    strict: { type: Boolean },
    tagsBelow: { type: Boolean, attribute: 'tags-below' },
    name: { type: String, reflect: true },
    _values: { state: true },
    _search: { state: true },
    _open: { state: true },
    _active: { state: true },
  };

  declare label: string;
  /** Helper text below the field. */
  declare helpText: string;
  /** Validation message below the field; replaces `helpText` and reddens the border. */
  declare errorText: string;
  /** DEPRECATED — renamed to `helpText`. Still honoured; warns at runtime. */
  declare hint: string;
  declare placeholder: string;
  declare options: EsaInputTagOption[];
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare required: boolean;
  declare strict: boolean;
  declare tagsBelow: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  private declare _values: string[];
  private declare _search: string;
  private declare _open: boolean;
  private declare _active: number;

  private internals: ElementInternals;
  private warnedHint = false;
  private onDocClick = (e: MouseEvent): void => {
    if (!this._open) return;
    if (!e.composedPath().includes(this)) this.closeDropdown();
  };

  constructor() {
    super();
    this.label = '';
    this.helpText = '';
    this.errorText = '';
    this.hint = '';
    this.placeholder = 'Search or add...';
    this.options = [];
    this.size = 'md';
    this.disabled = false;
    this.required = false;
    this.strict = false;
    this.tagsBelow = false;
    this._values = [];
    this._search = '';
    this._open = false;
    this._active = -1;
    this.internals = this.attachInternals();
  }

  /**
   * `hint` was renamed to `helpText` (migrations.json: form-hint-to-help-text) so
   * this control names the axis the way esa-select / esa-text-field / esa-textarea
   * already did. Explicit `helpText` WINS, so a spoke mid-migration can pass both
   * without the stale one overriding the fixed one.
   */
  private get resolvedHelpText(): string {
    if (this.hint && !this.helpText) {
      if (!this.warnedHint) {
        this.warnedHint = true;
        console.warn(
          `⚠️  esa-input-tag: \`hint="${this.hint}"\` is deprecated — renamed to ` +
            `\`help-text="${this.hint}"\`. Run \`node ../ecology/scripts/migrate-tokens.mjs --write\` ` +
            `in your spoke (migrations.json: form-hint-to-help-text).`,
        );
      }
      return this.hint;
    }
    return this.helpText;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.onDocClick);
    this.syncFormValue();
  }

  updated(): void {
    this.syncValidity();
    this.announceEmptyResults();
  }

  /**
   * Announce only the transition INTO no-matches. See esa-combobox.announceEmptyResults
   * for the reasoning: the cue sets the expectation that the list filters, so a
   * per-keystroke count is noise — but a query matching nothing has no other signal
   * for someone who cannot see the list empty out.
   *
   * `strict` matters here. Without it a typed term that matches no option can still be
   * ADDED as a free-form token, so the list being empty is not a dead end and saying
   * "no matches" would be misleading. With `strict` there is nowhere left to go.
   */
  private wasEmpty = false;
  private announceEmptyResults(): void {
    const isEmpty =
      this._open && this.strict && !!this._search.trim() && this.filteredOptions.length === 0;
    if (isEmpty && !this.wasEmpty) announce('No matching options', { assertive: true });
    this.wasEmpty = isEmpty;
  }

  /**
   * Constraint validation. `required` has to actually BLOCK submission, not just
   * draw an asterisk and set aria-required. "Empty" here means no tokens — a
   * half-typed search term that was never committed does not count.
   */
  private syncValidity(): void {
    if (!this.required || this._values.length > 0) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.input') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Add at least one ${this.label}.` : 'Add at least one value.',
      anchor,
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocClick);
  }

  // --- Public value accessor (mirrors writeValue) ---
  set value(val: string[] | string | null) {
    if (val == null) this._values = [];
    else if (Array.isArray(val)) this._values = [...val];
    else this._values = String(val).split(',').map((v) => v.trim()).filter(Boolean);
    this.syncFormValue();
  }
  get value(): string[] {
    return [...this._values];
  }

  // --- Computed getters ---

  /** Label to show on a chip for a given stored value (option label if known, else the raw value). */
  private labelFor(value: string): string {
    const opt = this.options.find((o) => o.value === value);
    return opt?.label ?? value;
  }

  /** Options not already selected and matching the current search. */
  private get filteredOptions(): EsaInputTagOption[] {
    const selected = new Set(this._values);
    const query = this._search.toLowerCase().trim();
    return this.options.filter((o) => {
      if (selected.has(o.value)) return false;
      if (query && !o.label.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  /** Whether the typed term can be added as a free-form token (not blank, not already present). */
  private get canAddTyped(): boolean {
    if (this.strict) return false; // options-only vocabulary
    const term = this._search.trim();
    if (!term) return false;
    if (this._values.includes(term)) return false;
    // Don't offer "Add" when an option's label is an exact match — selecting it is clearer.
    return !this.options.some((o) => o.label.toLowerCase() === term.toLowerCase() && !this._values.includes(o.value));
  }

  // --- Form / events ---

  private syncFormValue(): void {
    this.internals.setFormValue(this._values.length ? this._values.join(',') : null);
  }

  private emitValue(): void {
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  }

  // --- Open / close ---

  private openDropdown(): void {
    if (this.disabled || this._open) return;
    this._open = true;
    this._active = -1;
  }

  private closeDropdown(): void {
    if (!this._open) return;
    this._open = false;
    this._active = -1;
  }

  private focusInput(): void {
    requestAnimationFrame(() => {
      (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus();
    });
  }

  // --- Mutation ---

  private addToken(value: string): void {
    const v = value.trim();
    if (!v || this._values.includes(v)) return;
    this._values = [...this._values, v];
    this._search = '';
    this._active = -1;
    this.emitValue();
    this.focusInput();
  }

  private selectOption(option: EsaInputTagOption): void {
    if (this._values.includes(option.value)) return;
    this._values = [...this._values, option.value];
    this._search = '';
    this._active = -1;
    this.emitValue();
    this.focusInput();
  }

  private removeToken(value: string, event?: Event): void {
    event?.stopPropagation();
    this._values = this._values.filter((v) => v !== value);
    this.emitValue();
    this.focusInput();
  }

  // --- Input handlers ---

  private onSearchInput = (event: Event): void => {
    this._search = (event.target as HTMLInputElement).value;
    this._active = -1;
    if (!this._open) this.openDropdown();
  };

  private onInputFocus = (): void => {
    if (!this._open) this.openDropdown();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const opts = this.filteredOptions;
    const addOffset = this.canAddTyped ? 1 : 0;
    const total = opts.length + addOffset;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this._open) return this.openDropdown();
        if (total > 0) this._active = Math.min(this._active + 1, total - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (total > 0) this._active = Math.max(this._active - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this._open && this._active >= 0 && this._active < opts.length) {
          this.selectOption(opts[this._active]);
        } else if (this.canAddTyped) {
          // Either the "Add" row is highlighted, or nothing is highlighted: add the typed term.
          this.addToken(this._search);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        this._search = '';
        break;
      case 'Backspace':
        if (!this._search && this._values.length > 0) {
          this.removeToken(this._values[this._values.length - 1]);
        }
        break;
    }
  };

  private toggleDropdown = (): void => {
    if (this.disabled) return;
    this._open ? this.closeDropdown() : this.openDropdown();
    if (this._open) this.focusInput();
  };

  private renderChips() {
    return this._values.map(
      (value) => html`<span class="chip typography-body-sm">
        <span class="chip__label">${this.labelFor(value)}</span>
        ${!this.disabled
          ? html`<button
              type="button"
              class="chip__remove"
              aria-label=${'Remove ' + this.labelFor(value)}
              @click=${(e: Event) => this.removeToken(value, e)}
            >
              ${this.xIcon()}
            </button>`
          : null}
      </span>`
    );
  }

  /**
   * Forward focus to the inner control.
   *
   * Same override, same reason, as `esa-text-field` — see the long note there. A
   * form-associated custom element is not focusable by default, so `host.focus()`
   * is a silent no-op and `<esa-error-summary>` cannot send the user here.
   *
   * The target is the text input, NOT the first token's remove button, even though
   * the tokens come first in the DOM. Someone sent here to fix a validation error
   * needs the place they type, and the remove buttons come and go with the value —
   * landing on one is landing somewhere that may not exist next time.
   */
  focus(options?: FocusOptions): void {
    const inner = this.renderRoot?.querySelector<HTMLElement>('.input');
    if (inner) inner.focus(options);
    else super.focus(options);
  }

  render() {
    const hasError = !!this.errorText;
    const help = this.resolvedHelpText;
    // Error replaces help — same precedence as esa-select / esa-text-field, so
    // only one of the two ever occupies the slot below the control. The cue is
    // appended, not alternated: it explains how the widget works, which stays true
    // whichever message is showing. It goes LAST so the situational message is not
    // sitting behind a sentence about arrow keys.
    const describedBy = [hasError ? 'error' : help ? 'help' : '', 'cue']
      .filter(Boolean)
      .join(' ');
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        <!-- for="input" is load-bearing, not tidiness. Without it this label named
             nothing and the browser fell through to the PLACEHOLDER: measured
             2026-08-16, the visible label read "Tags" while the accessible name was
             "Add a tag". That fails SC 2.5.3 Label in Name — a speech-control user
             saying "click Tags" matches nothing. It also makes the label clickable,
             which no aria-label ever does. The IDREF is safe because both nodes are
             in this same shadow root; it is the light-DOM-to-shadow direction that
             cannot cross. -->
        ${this.label
          ? html`<label for="input" class="field__label typography-${LABEL_TYPE[this.size]}">
              ${this.label}${this.required ? html`<span class="field__required" aria-hidden="true">*</span>` : null}
            </label>`
          : null}

        <div class="container ${this._open ? 'container--open' : ''} ${this.disabled ? 'container--disabled' : ''}">
          <div class="chips">
            ${this.tagsBelow ? null : this.renderChips()}
            <input
              id="input"
              class="input typography-${FIELD_TYPE[this.size]}"
              type="text"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded=${this._open}
              aria-autocomplete="list"
              aria-required=${this.required ? 'true' : nothing}
              aria-invalid=${hasError ? 'true' : nothing}
              aria-describedby=${describedBy}
              placeholder=${this._values.length ? '' : this.placeholder}
              .value=${this._search}
              ?disabled=${this.disabled}
              @input=${this.onSearchInput}
              @focus=${this.onInputFocus}
              @keydown=${this.onKeydown}
            />
          </div>

          ${this.options.length > 0
            ? html`<button
                type="button"
                class="toggle"
                aria-label="Toggle suggestions"
                ?disabled=${this.disabled}
                @mousedown=${(e: Event) => e.preventDefault()}
                @click=${this.toggleDropdown}
              >
                <span class="arrow ${this._open ? 'arrow--open' : ''}">${this.chevronIcon()}</span>
              </button>`
            : null}

          ${this._open ? this.renderDropdown() : null}
        </div>

        ${this.tagsBelow && this._values.length
          ? html`<div class="chips chips--below">${this.renderChips()}</div>`
          : null}
        ${hasError
          ? html`<span class="field__error typography-body-sm" id="error">${this.errorText}</span>`
          : help
            ? html`<span class="field__help typography-body-sm" id="help">${help}</span>`
            : null}
        <!-- Always hidden, always present: the instructional cue that means the
             suggestion list does not need to announce itself as it filters. -->
        <span class="visually-hidden" id="cue"
          >Suggestions filter as you type. Use the up and down arrows to review them,
          Enter to add one, Backspace on an empty field to remove the last.</span
        >
      </div>
    `;
  }

  private renderDropdown() {
    const opts = this.filteredOptions;
    const canAdd = this.canAddTyped;
    const addIndex = opts.length;
    if (opts.length === 0 && !canAdd) {
      return html`<div class="dropdown" role="listbox">
        <div class="empty typography-${VALUE_TYPE[this.size]}">${this._search ? 'No matches found' : 'Type a value and press Enter to add'}</div>
      </div>`;
    }
    return html`<div class="dropdown" role="listbox">
      ${opts.map(
        (option, i) => html`<button
          type="button"
          class="option typography-${VALUE_TYPE[this.size]} ${i === this._active ? 'option--active' : ''}"
          role="option"
          aria-selected=${i === this._active}
          @mousedown=${(e: Event) => e.preventDefault()}
          @mouseenter=${() => (this._active = i)}
          @click=${() => this.selectOption(option)}
        >
          <span class="option__label">${option.label}</span>
        </button>`
      )}
      ${canAdd
        ? html`<button
            type="button"
            class="option option--add typography-${LABEL_TYPE[this.size]} ${this._active === addIndex ? 'option--active' : ''}"
            role="option"
            aria-selected=${this._active === addIndex}
            @mousedown=${(e: Event) => e.preventDefault()}
            @mouseenter=${() => (this._active = addIndex)}
            @click=${() => this.addToken(this._search)}
          >
            ${this.plusIcon()}<span class="option__label">Add "${this._search.trim()}"</span>
          </button>`
        : null}
    </div>`;
  }

  // --- Inline Lucide icons ---
  private chevronIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`;
  }
  private xIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
  }
  private plusIcon() {
    return html`<svg class="option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host {
      display: block;
      --_field-padding-y: var(--spacing-300, 0.75rem);
      --_field-padding-x: var(--spacing-300, 0.75rem);
      --_field-radius: var(--radius-md, 0.5rem);
      --_field-border-color: var(--form-border-color, #cecece);
      /* Chip look — overridable per host (e.g. a neutral squared chip à la Beacon's
         ui-input-tag: gray bg, dark-gray text, small radius). Defaults unchanged. */
      --_chip-bg: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      --_chip-color: var(--color-content-brand, #2a7e3b);
      --_chip-radius: var(--radius-pill, 9999px);
    }
    :host([size='xs']) {
      --_field-padding-y: var(--spacing-200, 0.5rem);
      --_field-padding-x: var(--spacing-200, 0.5rem);
      --_field-radius: var(--radius-sm, 0.25rem);
    }
    :host([size='sm']) {
      --_field-padding-y: var(--spacing-250, 0.625rem);
      --_field-padding-x: var(--spacing-250, 0.625rem);
      --_field-radius: var(--radius-sm, 0.25rem);
    }
    :host([size='lg']) {
      --_field-padding-y: var(--spacing-400, 1rem);
      --_field-padding-x: var(--spacing-400, 1rem);
      --_field-radius: var(--radius-md, 0.5rem);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .field__label {
      color: var(--form-label-color, #646464);
    }
    .field__required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      color: var(--form-help-color, #838383);
    }
    .field__error {
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }

    .container {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--_field-padding-y) var(--_field-padding-x);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .container:hover:not(.container--disabled) {
      --_field-border-color: var(--form-border-color-hover, #bbbbbb);
    }
    .container:focus-within,
    .container--open {
      --_field-border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    .container--disabled {
      cursor: not-allowed;
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
    }
    /* Hover/focus/open each re-point --_field-border-color at higher specificity
       than a bare ".field--error .container" selector, so the error state has to
       restate them or the border reverts to neutral the moment the pointer lands
       on it. */
    .field--error .container,
    .field--error .container:hover:not(.container--disabled) {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    /* The invalid field's ring is the SAME ring in red, via the token rather than a property
       override — the house mechanism. It covers the container AND every chip remove button
       with one declaration, which an outline-color override on .container would have missed.
       See esa-text-field for the full account and the contrast numbers. */
    .field--error {
      --focus-ring-color: var(--form-error-border-color, #e5484d);
    }
    .field--error .container:focus-within,
    .field--error .container.container--open {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    /* A disabled field must not wear the error ring.
       UNREACHABLE BY CONSTRUCTION — the inner input and every chip button take the native
       disabled attribute (see render), so :focus-within cannot match and this never fires.
       It is kept as the belt to that braces: the day someone swaps disabled for
       aria-disabled to keep the field focusable, this is what stops an inert field rendering
       as invalid.
       IT HAS NOW BEEN REWRITTEN TWICE FOR THE SAME REASON, which is the lesson: it was
       box-shadow: none, then outline-color, and it is now a token re-point, because a
       cancelling rule has to name whatever the rule it cancels names. Re-pointing the token
       back is also the version that needs no specificity trick — the old outline-color form
       needed a .field--error in the selector to reach (0,3,0) and beat the error rule.
       Restoring the NORMAL ring colour rather than removing the outline, because an element
       that CAN take focus still owes SC 2.4.7 a visible ring even when it is inert. */
    .container--disabled {
      --focus-ring-color: var(--color-border-default-focus, #3e9b4f);
    }
    .container--disabled:focus-within {
      --_field-border-color: var(--form-border-color, #cecece);
    }

    .chips {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-100, 4px);
      min-width: 0;
    }
    /* tags-below mode: chips live in their own row under the field */
    .chips--below {
      flex: none;
      padding-top: var(--spacing-100, 4px);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
      padding: 2px var(--spacing-100, 4px) 2px var(--spacing-200, 8px);
      background: var(--_chip-bg);
      color: var(--_chip-color);
      border-radius: var(--_chip-radius);
      flex-shrink: 0;
      user-select: none;
    }
    .chip__label {
      white-space: nowrap;
    }
    .chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-content-brand, #2a7e3b);
      border-radius: 50%;
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .chip__remove svg {
      width: 14px;
      height: 14px;
    }
    .chip__remove:hover {
      background: var(--color-background-overlay-strong-hover, rgba(0, 0, 0, 0.06));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: 1px;
    }

    .input {
      flex: 1;
      min-width: 80px;
      padding: 0;
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      background: transparent;
      border: none;
      outline: none;
      color: var(--form-text-color, #202020);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }
    .input:disabled {
      cursor: not-allowed;
      color: var(--color-content-disabled, #8d8d8d);
    }

    .toggle {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--color-content-default-muted, #838383);
      cursor: pointer;
    }
    .toggle:hover:not(:disabled) {
      color: var(--color-content-default-secondary, #646464);
    }
    .toggle:disabled {
      cursor: not-allowed;
    }
    .arrow {
      display: inline-flex;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .arrow svg {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
    }
    .arrow--open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + var(--spacing-100, 4px));
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      max-height: 252px;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: var(--color-background-elevation-raised, #fcfcfc);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      width: 100%;
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      background: transparent;
      border: none;
      color: var(--color-content-default, #202020);
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
      transition: background var(--transition-fast, 150ms ease);
    }
    .option:hover,
    .option--active {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }
    .option__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .option--add {
      color: var(--color-content-brand, #2a7e3b);
      border-top: var(--form-border-width, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }
    .option__icon {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
      flex-shrink: 0;
    }

    .empty {
      padding: var(--spacing-300, 12px);
      color: var(--color-content-default-muted, #838383);
      font-style: var(--font-style-italic, italic);
      text-align: center;
    }
  `,
  ];
}

if (!customElements.get('esa-input-tag')) {
  customElements.define('esa-input-tag', EsaInputTag);
}
