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
    chips are prose (body-*, regular). See the FORMS header in component-tokens.css.

    NO `xs` KEY, unlike the other form controls. It was here, and it was the whole
    bug: the map answered for a size the stylesheet had no block for, so `size="xs"`
    got xs text in md padding instead of failing. Sizes are clamped to the supported
    set in willUpdate now, so these maps are never asked for a key they lack — and if
    one is ever added back here it must come with a `:host([size='…'])` block. */
const LABEL_TYPE = { sm: 'label-xs', md: 'label-md', lg: 'label-lg' } as const;
// The typed value is microcopy: it sits IN the field box, whose height comes from
// padding, so it carries no leading. `-subtle` is the regular weight — a value must
// not outweigh the label naming it.
const FIELD_TYPE = { sm: 'microcopy-xs-subtle', md: 'microcopy-md-subtle', lg: 'microcopy-lg-subtle' } as const;
const VALUE_TYPE = { sm: 'body-xs', md: 'body-md', lg: 'body-lg' } as const;

interface EsaOption {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * esa-select — form-associated Lit Web Component.
 *
 * SELECT vs COMBOBOX — the distinction, so nobody has to re-derive it:
 *
 *   esa-select    displays a list of options to pick from, opened by a BUTTON.
 *                 No text entry. Long lists are reachable by TYPEAHEAD (type
 *                 "c","a" → jump to the first "Ca…"), the way a native <select>
 *                 works.
 *   esa-combobox  an autocomplete INPUT with a list of suggestions. You type, it
 *                 filters, and it can fetch remotely (debounced `search` event,
 *                 `loading`, `resultsCount`).
 *
 * If the user types into it, it is a combobox. If they pick from what you gave
 * them, it is a select. Until 2026-08-15 both components had this backwards at
 * their defaults — `searchable` defaulted TRUE here, and esa-combobox defaulted to
 * a button trigger — so each was rendering the other's control. See
 * docs/system-improvement-ledger.md.
 *
 * Faithful translation of the Angular esa-select:
 *   - signal inputs                    → Lit reactive properties
 *   - ControlValueAccessor (NG_VALUE)  → form-associated element + ElementInternals
 *   - host size class                  → reflected `size` attribute + :host() selectors
 *   - filteredOptions / displayValue   → getters over `_search` and `_selected`
 *   - selection, keyboard nav, multi-select chips, outside-click close — same logic
 *
 * Single-select sets a string form value; multi-select joins values with commas.
 * Keyboard: ArrowDown/ArrowUp navigate, Enter selects, Escape closes, Tab closes.
 * Dropdown is positioned with plain absolute CSS (no CDK). Outside-click closes it.
 */
export class EsaSelect extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    options: { type: Array },
    size: { type: String, reflect: true },
    placeholder: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    cue: { type: String },
    errorText: { type: String, attribute: 'error-text' },
    required: { type: Boolean },
    liveError: { type: Boolean, attribute: 'live-error' },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    multiple: { type: Boolean },
    searchable: { type: Boolean },
    chipMode: { type: Boolean, attribute: 'chip-mode' },
    _search: { state: true },
    _selected: { state: true },
    _open: { state: true },
    _active: { state: true },
  };

  declare label: string;
  declare options: EsaOption[];
  // No `xs`. A select is a click target with a popup — at 28px the trigger and
  // its chevron are below a comfortable tap size, and the option list it opens
  // is unaffected by the trigger's size anyway, so the compaction buys nothing
  // downstream. `sm` (32px) is the floor. See esa-text-field for a control where
  // xs is still legitimate: it has no popup and no hit target beyond the field.
  declare size: 'sm' | 'md' | 'lg';
  declare placeholder: string;
  declare helpText: string;
  /**
   * Override the visually-hidden instructional cue read to screen reader users.
   *
   * The default explains how to review options and that typing jumps to a match —
   * which is what makes announcing the list unnecessary as it changes. Do not blank
   * it, or the option list becomes silent with nothing to set expectations.
   */
  declare cue: string;
  declare errorText: string;
  declare required: boolean;
  /**
   * Announce the error the moment it appears rather than only when the field is focused.
   * OFF by default — see the long note on `esa-text-field.liveError`: the house pattern is
   * validate-on-submit with `<esa-error-summary>`, under which a live region per field
   * fires an assertive announcement for EVERY invalid field at once, racing the summary
   * the user was just sent to. Turn it on for fields validated INLINE, on blur.
   */
  declare liveError: boolean;
  declare disabled: boolean;
  /** Form field name — the key this control submits under. */
  declare name: string | undefined;
  declare multiple: boolean;
  /**
   * DEPRECATED (2026-08-15) — a select opens a list from a BUTTON; a type-to-filter
   * field is an autocomplete, i.e. `esa-combobox`. Still honoured, warns once.
   * Defaulted to TRUE until this date, which is why every existing call site was
   * silently rendering an autocomplete. Typeahead replaces the common use.
   */
  declare searchable: boolean;
  declare chipMode: boolean;
  private declare _search: string;
  private declare _selected: string[];
  private declare _open: boolean;
  private declare _active: number;

  private internals: ElementInternals;
  private onDocClick = (e: MouseEvent): void => {
    if (!this._open) return;
    if (!e.composedPath().includes(this)) {
      this._open = false;
    }
  };

  constructor() {
    super();
    this.label = '';
    this.options = [];
    this.size = 'md';
    this.placeholder = 'Select...';
    this.helpText = '';
    this.cue = '';
    this.errorText = '';
    this.required = false;
    this.liveError = false;
    this.disabled = false;
    this.multiple = false;
    this.searchable = false;
    this.chipMode = false;
    this._search = '';
    this._selected = [];
    this._open = false;
    this._active = -1;
    this.internals = this.attachInternals();
  }

  /** The sizes this component actually implements. `xs` is excluded by decision — see `declare size`. */
  private static readonly SIZES = ['sm', 'md', 'lg'];
  private warnedSize = false;
  private warnedSearchable = false;

  /**
   * Clamp an out-of-range `size` to the floor BEFORE render.
   *
   * The type says `'sm' | 'md' | 'lg'`, but the attribute path is untyped — plain
   * markup, a spoke's template, any non-TS consumer can write `size="xs"`. That
   * used to produce a hybrid rather than an error: `LABEL_TYPE`/`VALUE_TYPE` had
   * `xs` entries so the TEXT shrank, while the stylesheet had no
   * `:host([size='xs'])` block so the PADDING stayed at the `:host` default (md).
   * The result was 42px — taller than this component's own `sm` at 41.2px, i.e. the
   * ramp inverted at the bottom end. The fixed-height ramp hid it; removing heights
   * on 2026-08-14 made the box content-driven and it surfaced.
   *
   * Clamping here rather than adding an xs block is deliberate: `sm` is the floor
   * for the reason given on `declare size`, and this makes the floor real instead of
   * merely documented. `size` reflects, so assigning it fixes the attribute selector
   * and the typography lookup in one move.
   */
  willUpdate(): void {
    if (!EsaSelect.SIZES.includes(this.size)) {
      const bad = this.size;
      this.size = 'sm';
      if (!this.warnedSize) {
        this.warnedSize = true;
        console.warn(
          `⚠️  esa-select: size="${bad}" is not supported — clamped to "sm". A select is a ` +
            `click target with a popup; below sm the trigger and chevron fall under a comfortable ` +
            `tap size, and the option list does not shrink with it. Use esa-text-field if you need xs.`,
        );
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.onDocClick);
    this.syncFormValue();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocClick);
    clearTimeout(this._typeaheadTimer);
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

  private get filteredOptions(): EsaOption[] {
    const search = this._search.toLowerCase();
    if (!search) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(search));
  }

  private get displayValue(): string {
    if (this._selected.length === 0) return '';
    const opt = this.options.find((o) => o.value === this._selected[0]);
    return opt?.label ?? '';
  }

  private get selectedOptions(): EsaOption[] {
    return this.options.filter((o) => this._selected.includes(o.value));
  }

  private get inputValue(): string {
    if (this.multiple) return this._search;
    return this._search || this.displayValue;
  }

  private isSelected(value: string): boolean {
    return this._selected.includes(value);
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.multiple ? this._selected.join(',') : (this._selected[0] ?? null));
  }

  updated(): void {
    this.syncValidity();
  }

  /**
   * Constraint validation. `required` has to actually BLOCK submission, not just
   * draw an asterisk and set aria-required — a required field the form happily
   * submits empty is a promise the component does not keep. Anchored to the
   * field so the browser can focus it and place its bubble.
   */
  private syncValidity(): void {
    if (!this.required || this._selected.length > 0) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.renderRoot?.querySelector<HTMLElement>('.input') ?? undefined;
    this.internals.setValidity(
      { valueMissing: true },
      this.label ? `Select ${this.label}.` : 'Select an option.',
      anchor,
    );
  }

  private emit(): void {
    this.syncFormValue();
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private toggleDropdown(): void {
    if (this.disabled) return;
    this._open ? (this._open = false) : this.openDropdown();
  }

  private openDropdown(): void {
    if (this.disabled) return;
    this._open = true;
    this._active = -1;
    requestAnimationFrame(() => {
      (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus();
    });
  }

  private selectOption(option: EsaOption): void {
    if (option.disabled) return;
    const value = option.value;
    if (this.multiple) {
      const idx = this._selected.indexOf(value);
      this._selected = idx >= 0 ? this._selected.filter((v) => v !== value) : [...this._selected, value];
      this._search = '';
      this.emit();
      requestAnimationFrame(() => {
        (this.renderRoot.querySelector('.input') as HTMLInputElement | null)?.focus();
      });
    } else {
      this._selected = [value];
      this._search = '';
      this._open = false;
      this.emit();
    }
  }

  private removeValue(value: string, event?: Event): void {
    event?.stopPropagation();
    this._selected = this._selected.filter((v) => v !== value);
    this.emit();
  }

  private clearSelection(event?: Event): void {
    event?.stopPropagation();
    this._selected = [];
    this.emit();
  }

  // Tag-mode content: never render more than ONE token, so the field stays a single
  // line at its height. One selection shows its own chip; 2+ collapse into a single
  // "N Options" count whose x clears the whole selection.
  private renderTags() {
    const selected = this.selectedOptions;
    if (selected.length === 0) return null;
    if (selected.length > 1) {
      return html`<span class="chip chip--count typography-body-sm">
        <span class="chip__label">${selected.length} Options</span>
        <button
          type="button"
          class="chip__remove"
          aria-label="Clear selection"
          @click=${(e: Event) => this.clearSelection(e)}
        >
          ${this.xIcon()}
        </button>
      </span>`;
    }
    const opt = selected[0];
    return html`<span class="chip typography-body-sm">
      <span class="chip__label">${opt.label}</span>
      <button
        type="button"
        class="chip__remove"
        aria-label=${'Remove ' + opt.label}
        @click=${(e: Event) => this.removeValue(opt.value, e)}
      >
        ${this.xIcon()}
      </button>
    </span>`;
  }

  private onSearchInput = (event: Event): void => {
    this._search = (event.target as HTMLInputElement).value;
    this._active = -1;
    if (!this._open) this._open = true;
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
        this._open = false;
        break;
      case 'Tab':
        this._open = false;
        break;
      default:
        this.onTypeahead(event);
        break;
    }
  };

  /**
   * Native-style typeahead: type "c","a" and jump to the first "Ca…" option.
   *
   * This is how a real <select> lets you reach an option in a long list, and it is
   * why dropping `searchable` does not make this control worse — it replaces a text
   * FIELD (which is what made this a combobox) with a keyboard behaviour that needs
   * no field at all. It does NOT filter: the list is unchanged, only the active
   * option moves. Filtering as you type is esa-combobox's job.
   *
   * The 500ms reset is the platform convention — long enough to type a couple of
   * characters, short enough that a pause starts a fresh search rather than
   * appending to a stale buffer.
   */
  private _typeahead = '';
  private _typeaheadTimer?: ReturnType<typeof setTimeout>;

  private onTypeahead(event: KeyboardEvent): void {
    // Single printable characters only — modifier combos are shortcuts, not typing.
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    // The deprecated `searchable` path owns the keyboard: it has a real text input,
    // and stealing its keystrokes here would break filtering.
    if (this.searchable) return;
    event.preventDefault();

    this._typeahead += event.key.toLowerCase();
    clearTimeout(this._typeaheadTimer);
    this._typeaheadTimer = setTimeout(() => { this._typeahead = ''; }, 500);

    const i = this.options.findIndex(
      (o) => !o.disabled && o.label.toLowerCase().startsWith(this._typeahead),
    );
    if (i < 0) return;
    if (!this._open) this.openDropdown();
    this._active = i;
  }


  /**
   * The trigger. A select is "a list of options, opened by a BUTTON" — that is the
   * whole distinction from esa-combobox, which is an autocomplete input with
   * suggestions. Until 2026-08-15 this rendered an <input> with
   * `?readonly=${!this.searchable}` and `searchable` defaulted to TRUE, so the
   * default select was an editable autocomplete: esa-combobox's job, under this
   * component's name. Nothing in the hub or in cb-fish-design ever set the prop —
   * every call site was taking that default.
   *
   * `role="combobox"` stays and is correct: WAI-ARIA's SELECT-ONLY COMBOBOX pattern
   * puts it on a non-editable element. `aria-autocomplete="list"` is gone, because
   * there is no autocomplete here any more.
   */
  /**
   * The description id list, shared by both trigger shapes. Error FIRST, then help —
   * BOTH, never one instead of the other: a format hint is most needed at exactly the
   * moment the format was got wrong, and the old ternary deleted it right then.
   */
  private get describedBy(): string {
    // The cue goes LAST: an error is about right now, help is about this field, the
    // cue is about how the widget works. Descriptions are read in order, so the most
    // situational thing must not sit behind a sentence about arrow keys.
    return [this.errorText ? 'error' : '', this.helpText ? 'help' : '', 'cue']
      .filter(Boolean)
      .join(' ');
  }

  /** See esa-combobox.cueText — same reasoning, different keyboard model. */
  private get cueText(): string {
    if (this.cue) return this.cue;
    return 'Use the up and down arrows to review options, or type to jump to one. Enter to choose.';
  }

  private renderTrigger() {
    const shown = this.multiple
      ? this.selectedOptions.map((o) => o.label).join(', ')
      : this.displayValue;
    const isPlaceholder = !shown;
    return html`<button
      type="button"
      class="input input--trigger typography-${FIELD_TYPE[this.size]} ${isPlaceholder ? 'input--placeholder' : ''}"
      role="combobox"
      aria-expanded=${this._open}
      aria-haspopup="listbox"
      aria-labelledby=${this.label ? 'label' : nothing}
      aria-required=${this.required ? 'true' : nothing}
      aria-invalid=${this.errorText ? 'true' : nothing}
      aria-describedby=${this.describedBy || nothing}
      aria-controls=${this._open ? 'listbox' : nothing}
      aria-activedescendant=${this._open && this._active >= 0 ? `opt-${this._active}` : nothing}
      ?disabled=${this.disabled}
      @keydown=${this.onKeydown}
    >
      ${this.multiple && this.chipMode && this.selectedOptions.length
        ? ''
        : shown || this.placeholder}
    </button>`;
  }

  /**
   * DEPRECATED path — `searchable`. Kept verbatim so a spoke upgrading the hub sees
   * no visual change; cb-fish-design has 38 call sites all relying on the old
   * default. Warns once, then behaves exactly as before. Removed once spokes have
   * migrated (migrations.json: select-searchable-to-combobox).
   */
  private renderSearchableInput() {
    if (!this.warnedSearchable) {
      this.warnedSearchable = true;
      console.warn(
        `⚠️  esa-select: \`searchable\` is deprecated — a select is a list opened by a ` +
          `BUTTON. A type-to-filter field is an autocomplete, which is \`esa-combobox\`. ` +
          `Either drop \`searchable\` (the list is still reachable by typeahead) or switch ` +
          `to <esa-combobox>. (migrations.json: select-searchable-to-combobox)`,
      );
    }
    return html`<input
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
      placeholder=${this.multiple && this.chipMode && this.selectedOptions.length
        ? ''
        : this.placeholder}
      .value=${this.inputValue}
      ?disabled=${this.disabled}
      @input=${this.onSearchInput}
      @keydown=${this.onKeydown}
    />`;
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
    const inner = this.renderRoot?.querySelector<HTMLElement>('.input');
    if (inner) inner.focus(options);
    else super.focus(options);
  }

  render() {
    const hasError = !!this.errorText;
    return html`
      <div class="field ${hasError ? 'field--error' : ''}">
        ${this.label
          ? // A <span>, not a <label>. The thing being named is a <button role="combobox">
            // in this shadow root — <label> names LABELABLE elements (input/textarea/select)
            // and confers nothing on a button, so the old markup was an orphaned <label>
            // and this control had no accessible name but its own VALUE. Named by
            // REFERENCE via aria-labelledby, not by copying the string into aria-label:
            // a copy silently unnames the control the moment `label` is empty.
            html`<span class="field__label typography-${LABEL_TYPE[this.size]}" id="label">
              ${this.label}${this.required
                ? html`<span class="field__required" aria-hidden="true">*</span>`
                : null}
            </span>`
          : null}

        <div class="container">
          <!-- Multi-select chip mode renders the selected tokens INSIDE the field
               box (tag input), not floating above it. -->
          <div
            class="input-wrapper ${this.multiple && this.chipMode ? 'input-wrapper--tags' : ''}"
            @click=${() => this.toggleDropdown()}
          >
            ${this.multiple && this.chipMode ? this.renderTags() : null}
            ${this.searchable ? this.renderSearchableInput() : this.renderTrigger()}
            <span class="arrow ${this._open ? 'arrow--open' : ''}">${this.chevronIcon()}</span>
          </div>

          ${this._open
            ? html`<div class="dropdown" role="listbox" id="listbox">
                ${this.filteredOptions.length === 0
                  ? html`<div class="option option--empty typography-${VALUE_TYPE[this.size]}">No results found</div>`
                  : this.filteredOptions.map((option, i) => {
                      const selected = this.isSelected(option.value);
                      return html`<div
                        class="option typography-${VALUE_TYPE[this.size]} ${i === this._active ? 'option--active' : ''} ${selected
                          ? 'option--selected'
                          : ''} ${option.disabled ? 'option--disabled' : ''}"
                        role="option"
                        id="opt-${i}"
                        aria-selected=${selected}
                        aria-disabled=${option.disabled ?? false}
                        @click=${() => this.selectOption(option)}
                        @mouseenter=${() => (this._active = i)}
                      >
                        <span class="check ${selected ? 'check--selected' : ''}"
                          >${this.checkIcon()}</span
                        >
                        <span class="option__label">${option.label}</span>
                      </div>`;
                    })}
              </div>`
            : null}
        </div>

        <!-- Both nodes always present: a live region created at the same moment as its
             text is routinely not announced, so it has to already be there. .is-shown
             rather than :empty — Lit's template whitespace defeats :empty in engines
             following Selectors L3. -->
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
        <!-- Always hidden, always present: the instructional cue that means the option
             list does not need to announce itself as it filters. See cueText. -->
        <span class="visually-hidden" id="cue">${this.cueText}</span
        >
      </div>
    `;
  }

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
    /* No :host([size='xs']) — see the note on "declare size". "sm" is the floor by
       decision, and an out-of-range size is clamped to it before it reaches here.
       (No backticks in this comment: one would close the css tagged template.) */
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
      /* Was the last reader of --form-label-font-size and one of two readers of
         --form-label-font-weight. Both are retired with the rest of the size-only
         ramp; the composite carries size and weight together. */
      color: var(--form-label-color, #646464);
    }
    .field__required {
      color: var(--color-content-utility-danger, #ce2c31);
      margin-left: 2px;
    }
    .field__help {
      color: var(--form-help-color, #838383);
    }
    /* Three signals, not one: colour, the icon, and a visually-hidden "Error:" prefix.
       Colour alone is SC 1.4.1 (Use of Color, Level A) — and colour alone is exactly
       what separated this from .field__help, which is otherwise an identical span in
       an identical slot. */
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
    /* Both message nodes are ALWAYS rendered — a live region created at the same moment
       as its text is routinely not announced, so it has to already exist. When there is
       nothing to say they carry .visually-hidden, which takes them out of flow: .field
       is a flex column with a gap, so an in-flow empty node would spend 4px of dead
       space per message. Deliberately NOT display:none, which would drop them from the
       accessibility tree and defeat the arrangement entirely. */

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
      cursor: pointer;
    }
    /* Tag mode: chips render inside the field box, so the wrapper carries the
       border/height/focus and the input becomes a borderless filler beside them. */
    .input-wrapper--tags {
      flex-wrap: nowrap;
      gap: var(--spacing-100, 4px);
      padding: var(--_field-padding-y) calc(var(--_field-padding-x) + 24px)
        var(--_field-padding-y) var(--_field-padding-x);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input-wrapper--tags:focus-within {
      --_field-border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .input-wrapper--tags .input {
      /* Compact tag filter: at most ONE token renders (a single chip, or an
         "N Options" count for 2+), so the input rides beside it on one line and the
         box stays at field height — it never wraps to a second row. */
      flex: 1 1 2rem;
      width: auto;
      min-width: 2rem;
      height: auto;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
    }
    .input-wrapper--tags .input:focus {
      box-shadow: none;
    }
    .field--error .input-wrapper--tags {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    .input {
      width: 100%;
      padding: var(--_field-padding-y) var(--_field-padding-x);
      padding-inline-end: calc(var(--_field-padding-x) + 24px);
      /* The box is content + padding since heights were removed (2026-08-14), so
         LEADING IS NOW LOAD-BEARING — it is the term that decides how tall a field
         is. On a single-line control leading has no typographic job: there is one
         line, and the space above and below it is invisible. Letting the body-*
         composite's relaxed leading through added 12px here at md and made this
         field 7px taller than esa-text-field on the same step, breaking the row
         alignment component-tokens.css promises. Restated, not compensated for with
         a smaller padding rung: leading scales with the fluid type (27px at 1600,
         22px at 375) and is re-pointable by a theme, so a static padding offset
         would cancel it at exactly one viewport. Same line esa-button,
         esa-text-field, esa-button-toggle and esa-color-picker already carry.
         esa-textarea deliberately does NOT — it is genuinely multi-line. */
      color: var(--form-text-color, #202020);
      background: var(--color-background-field, transparent);
      border: var(--form-border-width, 1px) solid var(--_field-border-color);
      border-radius: var(--_field-radius);
      outline: none;
      cursor: pointer;
      box-sizing: border-box;
      transition:
        border-color var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .input::placeholder {
      color: var(--form-placeholder-color, #838383);
    }

    /* The default trigger is a BUTTON, not an input — a select opens a list, it does
       not accept typing. A button brings UA styles an input does not: centred text,
       its own font, and a min-width. Restate them so the two trigger paths (button,
       and the deprecated searchable input) are visually identical. */
    .input--trigger {
      display: block;
      text-align: start;
      font: inherit;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-appearance: none;
      appearance: none;
    }
    /* ::placeholder cannot apply to a button — there is no placeholder attribute,
       only fallback text — so the muted colour is a class instead. */
    .input--placeholder {
      color: var(--form-placeholder-color, #838383);
    }
    /* Hover moves the BORDER, not the fill — the field is transparent in every
       state so that it is the colour of whatever contains it.
       --form-border-color-hover already existed for exactly this and was wired
       into one component; it is the family treatment now. */
    .input:hover:not(:disabled) {
      --_field-border-color: var(--form-border-color-hover, #bbbbbb);
    }
    .input:focus {
      --_field-border-color: var(--form-border-color-focus, #46a758);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
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
    /* Tag mode moves the box chrome onto the wrapper, so the disabled fill has to
       follow it there — the .input above is borderless in that mode. */
    .input-wrapper--tags:has(.input:disabled) {
      background: var(--color-background-disabled, #f0f0f0);
      --_field-border-color: var(--color-border-disabled, #d9d9d9);
    }

    .arrow {
      position: absolute;
      right: var(--_field-padding-x);
      top: 50%;
      transform: translateY(-50%);
      display: inline-flex;
      color: var(--color-content-default-muted, #838383);
      pointer-events: none;
      transition: transform var(--transition-fast, 150ms ease);
    }
    .arrow svg {
      width: var(--icon-size-md, 20px);
      height: var(--icon-size-md, 20px);
    }
    .arrow--open {
      transform: translateY(-50%) rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: var(--z-dropdown, 50);
      margin-top: var(--spacing-100, 4px);
      max-height: 256px;
      overflow-y: auto;
      background: var(--color-background-elevation-raised, #fcfcfc);
      border: var(--form-border-width, 1px) solid var(--form-border-color, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      box-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
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
    .option--empty {
      color: var(--color-content-default-muted, #838383);
      cursor: default;
      font-style: var(--font-style-italic, italic);
    }
    .option--empty:hover {
      background: transparent;
    }
    .option__label {
      flex: 1;
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
      padding: 0 var(--spacing-100, 4px) 0 var(--spacing-200, 8px);
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
      width: 16px;
      height: 16px;
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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: 1px;
    }

    .field--error .input {
      --_field-border-color: var(--form-error-border-color, #e5484d);
    }
    .field--error .input:focus {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px)
        var(--color-border-utility-danger, rgba(211, 47, 47, 0.25));
    }

    /* FORCED COLORS. Three of this listbox's states are backgrounds and nothing
       else — :hover, --active (the keyboard cursor) and --selected — so all three
       collapse onto Canvas together and the list reads as inert.

       They are given DIFFERENT channels rather than different colours, because
       the two states can coexist on one row: --selected takes the Highlight fill,
       --active takes an inset outline. An inset outline is used so the cursor
       does not enlarge the row or clip against the panel edge.

       This also repairs a normal-mode bug. '.option--selected' is declared after
       '.option--active' at equal specificity, so today the keyboard cursor simply
       vanishes when it lands on the selected row. Here they compose. */
    @media (forced-colors: active) {
      .option--active {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
      .option--selected {
        background: Highlight;
        color: HighlightText;
      }
      /* The tick declares its own brand colour, which would survive as a
         force-adjusted value and could land on top of the Highlight fill. It
         must follow the row instead. Its opacity 0/1 toggle needs no help —
         opacity is not force-adjusted. */
      .check { color: inherit; }
      .option--disabled { color: GrayText; }
    }
  `,
  ];
}

if (!customElements.get('esa-select')) {
  customElements.define('esa-select', EsaSelect);
}
