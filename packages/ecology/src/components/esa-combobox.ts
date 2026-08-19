import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { announce } from '../announcer.js';

// Lucide `circle-alert`, copied from ./icon-registry — see esa-text-field.ts for why
// a Lit component inlines the glyph rather than reaching for <EsaIcon>.
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

/** Label / trigger text is UI text (label-*, medium); typed values, options and
    chips are prose (body-*, regular). See the FORMS header in component-tokens.css. */
const LABEL_TYPE = { xs: 'label-2xs', sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
// The typed value is microcopy: it sits IN the field box, whose height comes from
// padding, so it carries no leading. `-subtle` is the regular weight — a value must
// not outweigh the label naming it.
const FIELD_TYPE = { xs: 'microcopy-2xs-subtle', sm: 'microcopy-xs-subtle', md: 'microcopy-md-subtle', lg: 'microcopy-lg-subtle' } as const;
const VALUE_TYPE = { xs: 'body-2xs', sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

interface EsaComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}
type EsaComboboxMode = 'autocomplete' | 'select';
type EsaComboboxTriggerStyle = 'field' | 'text';

/**
 * esa-combobox — form-associated Lit Web Component.
 *
 * COMBOBOX vs SELECT — the distinction, so nobody has to re-derive it:
 *
 *   esa-combobox  an autocomplete INPUT with a list of suggestions. You type, it
 *                 filters, and it can fetch remotely (debounced `search` event,
 *                 `loading`, `resultsCount`).
 *   esa-select    displays a list of options to pick from, opened by a BUTTON. No
 *                 text entry; long lists are reachable by typeahead.
 *
 * If the user types into it, it is a combobox. If they pick from what you gave
 * them, it is a select. Until 2026-08-15 both had this backwards at their defaults.
 * See docs/system-improvement-ledger.md.
 *
 * Faithful translation of the Angular esa-combobox:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - `mode` / `triggerStyle` are DEPRECATED (see below) — the select-mode button
 *     trigger they produce is esa-select's control, not this one's
 *   - multi-select chips, search filter + match highlight, loading spinner, results count
 *   - debounced `search` event, `change` event on selection — same key logic
 *
 * SIMPLIFIED vs Angular: the CDK Overlay + cdk-virtual-scroll-viewport are replaced
 * by a plain absolutely-positioned panel with a max-height scroll area. All public
 * behavior (filtering, keyboard nav, selection, value binding, debounced search,
 * highlight, loading/empty/count) is preserved; only the virtual-scroll/overlay
 * implementation detail changed. Outside-click closes the panel.
 *
 * Keyboard: ArrowDown/Up navigate, Enter selects, Escape & Tab close.
 */
/**
 * ONCE PER PAGE, not once per instance. Unlike the `mode="select"` notice — which
 * reaches only the authors who opted in explicitly — this one fires for every call
 * site that omitted the attribute, which was the majority. Per-instance would turn a
 * deprecation notice into console spam on any page with a few comboboxes.
 */
let warnedDefaultModeFlip = false;

export class EsaCombobox extends LitElement {
  static formAssociated = true;

  static properties = {
    mode: { type: String, reflect: true },
    triggerStyle: { type: String, attribute: 'trigger-style' },
    options: { type: Array },
    multiple: { type: Boolean },
    size: { type: String, reflect: true },
    /** The name of the value being collected. */
    label: { type: String },
    /**
     * An example of a well-formed value for this field — never an instruction,
     * never a substitute for the label. "e.g. 12-345-678."
     */
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    required: { type: Boolean },
    liveError: { type: Boolean, attribute: 'live-error' },
    /**
     * A constraint on what this field will accept — its format, source, or
     * limit. "As it appears on the permit." "Letters, numbers, hyphens." Never
     * reassurance addressed to the user, nor a restatement of the field's state.
     */
    helpText: { type: String, attribute: 'help-text' },
    cue: { type: String },
    errorText: { type: String, attribute: 'error-text' },
    loading: { type: Boolean },
    debounceMs: { type: Number, attribute: 'debounce-ms' },
    resultsCount: { type: Number, attribute: 'results-count' },
    _search: { state: true },
    _selected: { state: true },
    _open: { state: true },
    _active: { state: true },
  };

  /**
   * DEPRECATED (2026-08-15) — `mode="select"` renders a BUTTON trigger, which is
   * esa-select's job. A combobox is an autocomplete input with suggestions. Still
   * honoured, warns once. This DEFAULTED to 'select' until now, so the default
   * combobox was a select — and this component's own doc page demoed `mode="select"`
   * 12 times against `autocomplete` twice.
   */
  declare mode: EsaComboboxMode;
  /**
   * DEPRECATED (2026-08-15) — read at exactly one site, inside `renderSelect()`, so
   * it only ever styled the button trigger. It dies with `mode="select"`.
   */
  declare triggerStyle: EsaComboboxTriggerStyle;
  declare options: EsaComboboxOption[];
  declare multiple: boolean;
  declare size: 'xs' | 'sm' | 'md' | 'lg';
  declare label: string;
  declare placeholder: string;
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare required: boolean;
  /**
   * Announce the error the moment it appears rather than only when the field is focused.
   * OFF by default — see the long note on `esa-text-field.liveError`: the house pattern is
   * validate-on-submit with `<esa-error-summary>`, under which a live region per field
   * fires an assertive announcement for EVERY invalid field at once, racing the summary
   * the user was just sent to. Turn it on for fields validated INLINE, on blur.
   */
  declare liveError: boolean;
  declare helpText: string;
  /**
   * Override the visually-hidden instructional cue read to screen reader users.
   *
   * The default explains that results filter as you type and how to review them —
   * which is what makes announcing every keystroke unnecessary. Replace it if this
   * combobox behaves differently (server-side search with a delay, say); do not
   * blank it, or the results list becomes silent with nothing to set expectations.
   */
  declare cue: string;
  declare errorText: string;
  declare loading: boolean;
  declare debounceMs: number;
  declare resultsCount: number | null;
  private declare _search: string;
  private declare _selected: string[];
  private declare _open: boolean;
  private declare _active: number;
  private _suppressNextOpen = false;

  private warnedMode = false;
  private internals: ElementInternals;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEmittedSearch = '';
  private onDocClick = (e: MouseEvent): void => {
    if (!this._open) return;
    if (!e.composedPath().includes(this)) this.closeDropdown();
  };

  constructor() {
    super();
    this.mode = 'autocomplete';
    this.triggerStyle = 'field';
    this.options = [];
    this.multiple = false;
    this.size = 'md';
    this.label = '';
    this.placeholder = 'Select...';
    this.disabled = false;
    this.required = false;
    this.liveError = false;
    this.helpText = '';
    this.cue = '';
    this.errorText = '';
    this.loading = false;
    this.debounceMs = 300;
    this.resultsCount = null;
    this._search = '';
    this._selected = [];
    this._open = false;
    this._active = -1;
    this.internals = this.attachInternals();
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.onDocClick);
    this.syncFormValue();
    this.warnDefaultModeFlip();
  }

  /**
   * THE WARNING THAT MATTERS FIRES ON THE PATH THAT DID NOT CHANGE, so this is the
   * other half. `mode` defaulted to 'select' until 2026-08-15; the call sites hurt by
   * that flip are the ones that never wrote the attribute at all, and they render
   * renderAutocomplete(), which holds no warning. renderSelect()'s notice reaches only
   * authors who already opted in explicitly — i.e. the ones whose rendering is
   * unchanged.
   *
   * It cannot be a migrations.json rewrite either: `combobox-mode-select-to-select` is
   * a deprecatedProps row with no `pairs`, so the codemod has nothing to write and no
   * way to tell an omitted attribute from a deliberate one.
   *
   * Keyed on the ATTRIBUTE, not the property: an omitted attribute is the signal, and
   * writing `mode="autocomplete"` is both the confirmation and the way to silence this.
   *
   * IT MUST RUN BEFORE THE FIRST UPDATE, because `mode` REFLECTS. Lit writes the
   * resolved value back onto the element, so a few milliseconds later every instance
   * carries `mode="autocomplete"` whether or not anyone typed it, and the check reads
   * as "nobody is affected". connectedCallback is before first update on the initial
   * upgrade, which is the moment this needs to be right. (A re-connection later is
   * after reflection and would not warn — harmless only because the flag above is
   * module-scoped and this has already fired once by then.)
   */
  private warnDefaultModeFlip(): void {
    if (warnedDefaultModeFlip) return;
    if (this.hasAttribute('mode')) return;
    warnedDefaultModeFlip = true;
    console.warn(
      `⚠️  esa-combobox: \`mode\` now defaults to "autocomplete" (was "select" before ` +
        `2026-08-15), so this instance renders a free-text input rather than a button ` +
        `trigger. If that is what you want, write \`mode="autocomplete"\` to silence ` +
        `this. If you wanted the button trigger over a fixed list, that is <esa-select>. ` +
        `(migrations.json: combobox-mode-select-to-select)`,
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocClick);
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  // --- Public value accessor (mirrors writeValue) ---
  set value(val: string | string[] | null) {
    if (val == null) this._selected = [];
    else if (Array.isArray(val)) this._selected = val;
    else this._selected = [val];
    this.syncFormValue();
  }
  get value(): string | string[] {
    return this.multiple ? this._selected : (this._selected[0] ?? '');
  }

  // --- Computed getters ---

  private get filteredOptions(): EsaComboboxOption[] {
    const search = this._search.toLowerCase();
    if (!search) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(search));
  }

  private get displayValue(): string {
    if (this._selected.length === 0) return '';
    if (this.multiple) {
      return this.options
        .filter((o) => this._selected.includes(o.value))
        .map((o) => o.label)
        .join(', ');
    }
    const opt = this.options.find((o) => o.value === this._selected[0]);
    return opt?.label ?? '';
  }

  private get selectedOptions(): EsaComboboxOption[] {
    return this.options.filter((o) => this._selected.includes(o.value));
  }

  private get currentPlaceholder(): string {
    if (this.multiple && this._selected.length > 0) return '';
    return this.placeholder;
  }

  private get inputValue(): string {
    if (this.multiple) return this._search;
    return this._search || this.displayValue;
  }

  private isSelected(value: string): boolean {
    return this._selected.includes(value);
  }

  // --- Form / events ---

  private syncFormValue(): void {
    this.internals.setFormValue(this.multiple ? this._selected.join(',') : (this._selected[0] ?? null));
  }

  updated(): void {
    this.syncValidity();
    this.announceEmptyResults();
  }

  /**
   * Announce the moment a query stops matching anything — and ONLY that moment.
   *
   * The instructional cue (see `cueText`) already tells the user results filter as
   * they type, so announcing every keystroke's result count would be noise on top of
   * information they already have. Running commentary while someone is typing is the
   * classic way this pattern is got wrong.
   *
   * The exception is the dry query. A sighted user sees the list empty out
   * immediately and corrects course; with no announcement, a screen reader user keeps
   * typing into nothing and only finds out when they navigate down to an empty list.
   * That is the one case worth interrupting for, which is why it is assertive.
   *
   * Guarded on the TRANSITION, not the state — otherwise every subsequent keystroke
   * in an already-empty query re-announces.
   */
  private wasEmpty = false;
  private announceEmptyResults(): void {
    const isEmpty =
      this._open && !this.loading && !!this._search && this.filteredOptions.length === 0;
    if (isEmpty && !this.wasEmpty) {
      announce('No results found', { assertive: true });
    }
    this.wasEmpty = isEmpty;
  }

  /**
   * The instructional cue, wired to the control via `aria-describedby`.
   *
   * This is the part that removes the NEED for a live region on the results. Telling
   * someone once, up front, that the list filters as they type sets the expectation
   * for every keystroke after it — so they know to go and read the list when they are
   * done, and nothing has to interrupt them meanwhile. A persistent description beats
   * a transient announcement: it can be re-read, it cannot be missed, and it does not
   * compete with anything else for the announcement queue.
   *
   * Visually hidden because sighted users get the same information from watching the
   * list change.
   */
  private get cueText(): string {
    if (this.cue) return this.cue;
    return this.mode === 'autocomplete'
      ? 'Results filter as you type. Use the up and down arrows to review them, Enter to choose.'
      : 'Use the up and down arrows to review options, Enter to choose.';
  }

  /**
   * Constraint validation. `required` has to actually BLOCK submission, not just
   * draw an asterisk and set aria-required — a required field the form happily
   * submits empty is a promise the component does not keep. The anchor differs
   * by `triggerStyle`, so fall back to the host when neither node is in the tree.
   */
  private syncValidity(): void {
    if (!this.required || this._selected.length > 0) {
      this.internals.setValidity({});
      return;
    }
    const anchor =
      this.renderRoot?.querySelector<HTMLElement>('.input, .trigger--field, .trigger') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Select ${this.label}.` : 'Select an option.',
      anchor,
    );
  }

  private emitValue(): void {
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', { detail: { value: this.value }, bubbles: true, composed: true })
    );
  }

  /** Debounced 'search' event (mirrors Angular's debounceTime + distinctUntilChanged). */
  private emitSearch(term: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (term === this.lastEmittedSearch) return;
      this.lastEmittedSearch = term;
      this.dispatchEvent(
        new CustomEvent('search', { detail: { term }, bubbles: true, composed: true })
      );
    }, this.debounceMs);
  }

  // --- Open / close ---

  private toggleDropdown(): void {
    if (this.disabled) return;
    this._open ? this.closeDropdown() : this.openDropdown();
  }

  private openDropdown(): void {
    if (this.disabled || this._open) return;
    this._open = true;
    this._active = -1;
    if (this.mode === 'select') {
      requestAnimationFrame(() => {
        (this.renderRoot.querySelector('.search-input') as HTMLInputElement | null)?.focus();
      });
    }
  }

  private closeDropdown(): void {
    if (!this._open) return;
    this._open = false;
    this._search = '';
  }

  // --- Selection ---

  private selectOption(option: EsaComboboxOption): void {
    if (option.disabled) return;
    const value = option.value;
    if (this.multiple) {
      const idx = this._selected.indexOf(value);
      this._selected = idx >= 0 ? this._selected.filter((v) => v !== value) : [...this._selected, value];
      this._search = '';
      this.emitValue();
      const sel = this.mode === 'autocomplete' ? '.input' : '.search-input';
      requestAnimationFrame(() => (this.renderRoot.querySelector(sel) as HTMLInputElement | null)?.focus());
    } else {
      this._selected = [value];
      this._search = '';
      this.emitValue();
      this.closeDropdown();
      if (this.mode === 'autocomplete') {
        const input = this.renderRoot.querySelector('.input') as HTMLInputElement | null;
        // Refocus (and suppress the resulting focus-open) only when selection moved
        // focus off the input, i.e. a mouse pick. Keyboard selection keeps the input
        // focused — no focus event will fire, so setting the flag would leave it
        // stale and swallow the next legitimate focus-open (e.g. Tab back in).
        if (input && (this.renderRoot as unknown as ShadowRoot).activeElement !== input) {
          this._suppressNextOpen = true;
          requestAnimationFrame(() => input.focus());
        }
      }
    }
  }

  private removeValue(value: string, event?: Event): void {
    event?.stopPropagation();
    this._selected = this._selected.filter((v) => v !== value);
    this.emitValue();
  }

  // --- Input handlers ---

  private onSearchInput = (event: Event): void => {
    const val = (event.target as HTMLInputElement).value;
    this._search = val;
    this._active = -1;
    this.emitSearch(val);
    if (!this._open) this.openDropdown();
  };

  private onInputFocus = (): void => {
    if (this._suppressNextOpen) { this._suppressNextOpen = false; return; }
    if (!this._open) this.openDropdown();
  };

  // clicking an already-focused autocomplete input must reopen the dropdown —
  // focus doesn't re-fire when the element already has focus, so @focus alone
  // misses the "click after select" case.
  private onInputClick = (): void => {
    if (!this._open) this.openDropdown();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const opts = this.filteredOptions;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this._open) return this.openDropdown();
        {
          let next = this._active + 1;
          while (next < opts.length && opts[next].disabled) next++;
          if (next < opts.length) this._active = next;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this._open) return this.openDropdown();
        {
          let next = this._active - 1;
          while (next >= 0 && opts[next].disabled) next--;
          if (next >= 0) this._active = next;
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (this._open && this._active >= 0) {
          const opt = opts[this._active];
          if (opt && !opt.disabled) this.selectOption(opt);
        } else if (!this._open) {
          this.openDropdown();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  };

  // --- Highlight (mirrors EsaHighlightPipe) ---
  private highlight(label: string) {
    const term = this._search.trim();
    if (!term) return html`${label}`;
    const lower = label.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx < 0) return html`${label}`;
    return html`${label.slice(0, idx)}<mark class="hl">${label.slice(idx, idx + term.length)}</mark>${label.slice(
      idx + term.length
    )}`;
  }

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
    const inner = this.renderRoot?.querySelector<HTMLElement>('.input, .trigger');
    if (inner) inner.focus(options);
    else super.focus(options);
  }

  render() {
    const hasError = !!this.errorText;
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? // A <span>, not a <label>. <label> names LABELABLE elements only; the thing
            // being named here is an <input role="combobox"> that the label never had a
            // `for` on, so this was an orphaned <label> and the control's only accessible
            // name was its own value. Named by REFERENCE below via aria-labelledby — a
            // copied aria-label silently unnames the control when `label` goes empty.
            html`<span class="field__label typography-${LABEL_TYPE[this.size]}" id="label">
              ${this.label}${this.required
                ? html`<span class="field__required" aria-hidden="true">*</span>`
                : null}
            </span>`
          : null}

        <div class="container">
          ${this.mode === 'autocomplete' ? this.renderAutocomplete() : this.renderSelect()}
          ${this._open ? this.renderDropdown() : null}
        </div>

        <!-- Both message nodes always present so the live region pre-exists its content;
             .visually-hidden when empty keeps them out of .field's flex gap. -->
        <span
          class="field__error typography-body-sm ${hasError ? '' : 'visually-hidden'}"
          id="error"
          role=${this.liveError ? 'alert' : nothing}
          data-esa-live=${this.liveError ? 'opt-in' : nothing}
        >${hasError
            ? html`${alertIcon}<span class="visually-hidden">Error: </span
                ><span>${this.errorText}</span>`
            : nothing}</span
        >
        <span
          class="field__help typography-body-sm ${this.helpText ? '' : 'visually-hidden'}"
          id="help"
          >${this.helpText || nothing}</span
        >
        <!-- Always hidden, always present: the instructional cue that means the
             results list does not need to announce itself. See the cueText prop. -->
        <span class="visually-hidden" id="cue">${this.cueText}</span>
      </div>
    `;
  }

  /**
   * Error FIRST, then help, then the cue. See esa-text-field for the error/help order.
   *
   * The cue goes LAST because it is the least situational of the three: an error is
   * about right now, help is about this field, the cue is about how the widget works.
   * A screen reader reads descriptions in order, so the most specific thing should not
   * be sitting behind a sentence about arrow keys.
   */
  private get describedBy(): string {
    return [this.errorText ? 'error' : '', this.helpText ? 'help' : '', 'cue']
      .filter(Boolean)
      .join(' ');
  }

  private renderAutocomplete() {
    // aria-activedescendant is what makes arrow-key navigation audible. Focus stays
    // on the input (it has to — the user is still typing), so without it the active
    // option changes visually and a screen reader says nothing at all. It was absent
    // from every listbox in this kit until 2026-08-16.
    //
    // Both IDREFs resolve inside this shadow root, which is the only place they can:
    // aria-activedescendant, like every IDREF, does not cross a shadow boundary.
    return html`
      ${this.multiple ? this.renderChips() : null}
      <div class="input-wrapper">
        <input
          class="input typography-${FIELD_TYPE[this.size]}"
          role="combobox"
          aria-expanded=${this._open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-labelledby=${this.label ? 'label' : nothing}
          aria-required=${this.required ? 'true' : nothing}
          aria-invalid=${this.errorText ? 'true' : nothing}
          aria-describedby=${this.describedBy || nothing}
          aria-controls=${this._open ? 'listbox' : nothing}
          aria-activedescendant=${this._open && this._active >= 0 ? `opt-${this._active}` : nothing}
          placeholder=${this.currentPlaceholder}
          .value=${this.inputValue}
          ?disabled=${this.disabled}
          @input=${this.onSearchInput}
          @keydown=${this.onKeydown}
          @focus=${this.onInputFocus}
          @click=${this.onInputClick}
        />
        ${this.loading ? html`<span class="spinner spinner--inline">${this.spinnerIcon()}</span>` : null}
      </div>
    `;
  }

  /**
   * DEPRECATED path — `mode="select"`. A button trigger over a fixed option list is
   * esa-select, not a combobox. Kept verbatim so spokes see no visual change on
   * upgrade (cb-fish-design has 4 call sites on this path), warns once, and is
   * removed after they migrate (migrations.json: combobox-mode-select-to-select).
   */
  private renderSelect() {
    if (!this.warnedMode) {
      this.warnedMode = true;
      console.warn(
        `⚠️  esa-combobox: \`mode="select"\` is deprecated — a button trigger over a ` +
          `fixed list is <esa-select>. A combobox is an autocomplete input with ` +
          `suggestions. Switch to <esa-select>, or drop \`mode\` to get the ` +
          `autocomplete input this component is for. ` +
          `(migrations.json: combobox-mode-select-to-select)`,
      );
    }
    const isField = this.triggerStyle === 'field';
    return html`
      ${this.multiple && isField ? this.renderChips() : null}
      <button
        type="button"
        class="trigger typography-${isField ? FIELD_TYPE[this.size] : LABEL_TYPE[this.size]} ${isField ? 'trigger--field' : 'trigger--text'}"
        aria-labelledby=${this.label ? 'label' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-invalid=${this.errorText ? 'true' : nothing}
        aria-describedby=${this.describedBy || nothing}
        ?disabled=${this.disabled}
        @click=${() => this.toggleDropdown()}
        @keydown=${this.onKeydown}
      >
        <span class="trigger__label">${this.displayValue || this.placeholder}</span>
        <span class="arrow ${this._open ? 'arrow--open' : ''}">${this.chevronIcon()}</span>
      </button>
    `;
  }

  private renderChips() {
    if (this.selectedOptions.length === 0) return nothing;
    return html`<div class="chips">
      ${this.selectedOptions.map(
        (opt) => html`<span class="chip typography-body-sm">
          <span class="chip__label">${opt.label}</span>
          <button
            type="button"
            class="chip__remove"
            aria-label=${'Remove ' + opt.label}
            @click=${(e: Event) => this.removeValue(opt.value, e)}
          >
            ${this.xIcon()}
          </button>
        </span>`
      )}
    </div>`;
  }

  private renderDropdown() {
    const opts = this.filteredOptions;
    return html`<div class="dropdown" role="listbox" id="listbox" @keydown=${this.onKeydown}>
      ${this.mode === 'select'
        ? html`<div class="search">
            ${this.searchIcon()}
            <input
              class="search-input typography-${VALUE_TYPE[this.size]}"
              placeholder="Search..."
              .value=${this._search}
              @input=${this.onSearchInput}
              @keydown=${this.onKeydown}
            />
            ${this.loading ? html`<span class="spinner">${this.spinnerIcon()}</span>` : null}
          </div>`
        : null}

      ${this.resultsCount !== null
        ? html`<div class="results-count typography-body-sm">Displaying ${opts.length} of ${this.resultsCount} results</div>`
        : null}

      <div class="viewport">
        ${opts.map((option, i) => {
          const selected = this.isSelected(option.value);
          return html`<div
            class="option typography-${VALUE_TYPE[this.size]} ${i === this._active ? 'option--active' : ''} ${selected
              ? 'option--selected'
              : ''} ${option.disabled ? 'option--disabled' : ''}"
            role="option"
            id="opt-${i}"
            aria-selected=${selected}
            aria-disabled=${option.disabled ? 'true' : nothing}
            @click=${() => this.selectOption(option)}
            @mouseenter=${() => (this._active = i)}
          >
            <span class="check ${selected ? 'check--selected' : ''}"
              >${this.checkIcon()}</span
            >
            <span class="option__label">${this.highlight(option.label)}</span>
          </div>`;
        })}
      </div>

      ${opts.length === 0 && !this.loading
        ? html`<div class="empty typography-${VALUE_TYPE[this.size]}">${this._search ? 'No results found' : 'No options available'}</div>`
        : null}
      ${this.loading && opts.length === 0
        ? html`<div class="loading typography-${VALUE_TYPE[this.size]}"><span class="spinner">${this.spinnerIcon()}</span> Searching...</div>`
        : null}
    </div>`;
  }

  // --- Inline Lucide icons ---
  private chevronIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>`;
  }
  private checkIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>`;
  }
  private xIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
  }
  private searchIcon() {
    return html`<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>`;
  }
  private spinnerIcon() {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`;
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
    /* Three signals, not one: colour, icon, and a visually-hidden "Error:" prefix.
       Colour alone is SC 1.4.1 (Use of Color, Level A), and colour alone is all that
       separated this from .field__help — same tag, same slot, same type role. */
    .field__error {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      color: var(--form-error-color, var(--color-content-utility-danger, #ce2c31));
    }
    .field__error .error__icon {
      flex: none;
      width: 1em;
      height: 1em;
    }
    /* Both message nodes ALWAYS render — a live region created at the same moment as
       its text is routinely not announced, so it has to already exist. When empty they
       carry .visually-hidden, which takes them out of flow: .field is a flex column
       with a gap, so an in-flow empty node would spend 4px of dead space each.
       Deliberately NOT display:none, which drops them from the accessibility tree. */

    .container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      padding-inline-end: calc(var(--_field-padding-x) + 24px);
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      color: var(--form-text-color, #202020);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }
    .input:focus {
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
    .input:disabled {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }

    .spinner {
      display: inline-flex;
      color: var(--color-content-default-muted, #838383);
      animation: esa-cb-spin var(--animation-spin, 750ms linear infinite);
    }
    .spinner svg {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
    }
    .spinner--inline {
      position: absolute;
      right: var(--_field-padding-x);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    @keyframes esa-cb-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .spinner--inline {
      animation: esa-cb-spin-inline var(--animation-spin, 750ms linear infinite);
    }
    @keyframes esa-cb-spin-inline {
      from {
        transform: translateY(-50%) rotate(0deg);
      }
      to {
        transform: translateY(-50%) rotate(360deg);
      }
    }

    .trigger--text {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: 0;
      border: none;
      background: none;
      color: var(--color-content-brand, #2a7e3b);
      cursor: pointer;
      max-width: 100%;
    }
    .trigger--text:hover {
      color: var(--color-content-brand, #2a7e3b);
      text-decoration: underline;
    }
    .trigger--text:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: 2px;
      border-radius: var(--_field-radius);
    }
    .trigger--text:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .trigger--text .trigger__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger--field {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      /* Leading is load-bearing on a content-sized box — see the long note in
         esa-select's .input. Single line, so the composite's relaxed leading only
         adds height. */
      color: var(--form-text-color, #202020);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      cursor: pointer;
      text-align: left;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .trigger--field:focus-visible {
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .trigger--field:disabled {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }
    .trigger--field .trigger__label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .arrow {
      display: inline-flex;
      color: var(--color-content-default-muted, #838383);
      pointer-events: none;
      transition: transform var(--transition-fast, 150ms ease);
      flex-shrink: 0;
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
      top: 100%;
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      margin-top: var(--spacing-100, 4px);
      background: var(--color-background-elevation-raised, #fcfcfc);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      overflow: hidden;
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
    }
    /* The ring goes on the ROW. .search-input is chromeless by design, so a ring on
       it would float around bare text; the row is the visible affordance. Inset
       because the row runs edge to edge inside an overflow:hidden dropdown. This is
       the same repair as esa-entity-search, esa-search-panel and esa-command-palette
       — the whole shape is "chromeless input in a bordered row". */
    .search:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
    }
    .search__icon {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
      color: var(--color-content-default-muted, #838383);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      border: none;
      background: none;
      /* Suppressed only because .search paints the ring — never bare. */
      outline: none;
      color: var(--form-text-color, #202020);
    }
    .search-input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }

    .results-count {
      padding: var(--spacing-100, 4px) var(--spacing-300, 12px);
      color: var(--color-content-default-muted, #838383);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }

    .viewport {
      max-height: 252px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--spacing-100, 4px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      color: var(--color-content-default, #202020);
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast, 150ms ease);
      box-sizing: border-box;
    }
    .option:hover,
    .option--active {
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }
    .option--selected {
      background: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #2a7e3b);
    }
    .option--disabled {
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .option--disabled:hover {
      background: transparent;
    }
    .option__label {
      flex: 1;
    }
    .hl {
      background: var(--color-background-utility-warning-subtle, #fefbe9);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }

    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0;
      color: var(--color-content-brand, #2a7e3b);
      transition: opacity var(--transition-fast, 150ms ease);
    }
    .check svg {
      width: 16px;
      height: 16px;
    }
    .check--selected {
      opacity: 1;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-100, 4px);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050, 2px);
      padding: var(--spacing-050, 2px) var(--spacing-100, 4px) var(--spacing-050, 2px) var(--spacing-200, 8px);
      background: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #2a7e3b);
      border-radius: var(--radius-pill, 9999px);
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
      background: var(--color-background-overlay-strong-hover, rgba(0, 0, 0, 0.05));
    }
    .chip__remove:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: 1px;
    }

    .empty,
    .loading {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-300, 12px);
      color: var(--color-content-default-muted, #838383);
      font-style: var(--font-style-italic, italic);
    }

    .field--error .input,
    .field--error .trigger--field {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    /* The invalid field's ring is the SAME ring in red, via the token rather than a property
       override. THIS COMPONENT IS THE STRONGEST CASE for the token: five things in here read
       --focus-ring-color — the autocomplete input, the text trigger, the field trigger, the
       dropdown's own search box, and every chip remove button. Naming each in an
       outline-color override is five rules to keep in step, and any one missed keeps ringing
       brand-green inside a field that is telling the user it is invalid. One declaration on
       the error wrapper reaches all five, because custom properties inherit. The dropdown
       panel is included by the same inheritance — see esa-text-field, where that consequence
       is recorded as a decision rather than left to be discovered.
       Two fixes here on 2026-08-17: it was a box-shadow, which stacked a second band once the
       base rings became outlines; and it read --color-border-utility-danger, which is red-6,
       a SUBTLE BORDER step measuring 1.40:1 on a sunken surface. */
    .field--error {
      --focus-ring-color: var(--form-error-border-color, #e5484d);
    }

    /* FORCED COLORS. Same treatment as esa-select, whose option CSS this file
       duplicates verbatim — see the longer note there. --selected takes the fill,
       --active takes an inset outline, so a row that is both still shows both.

       .hl (the search-match highlight) is a background too, and it is the one
       place here where the tint is the only channel. It gets Highlight so the
       matched run stays visible; the surrounding row keeps Canvas. */
    @media (forced-colors: active) {
      .option--active {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
      .option--selected {
        background: Highlight;
        color: HighlightText;
      }
      /* The tick must follow the row rather than keep its own brand colour. */
      .check { color: inherit; }
      .option--disabled { color: GrayText; }
      .hl {
        background: Highlight;
        color: HighlightText;
      }
    }
  `,
  ];
}

if (!customElements.get('esa-combobox')) {
  customElements.define('esa-combobox', EsaCombobox);
}
