import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { announce } from '../announcer.js';

/**
 * esa-file-upload — form-associated Lit Web Component.
 *
 * Faithful translation of the Angular esa-file-upload:
 *   - signal inputs                    → Lit reactive properties
 *   - filesSelected output             → bubbling/composed 'change' CustomEvent (detail.files)
 *   - host dragging/disabled classes   → reflected attributes + :host() selectors
 *   - drag/drop, browse, size validation, file list, remove — same logic
 *
 * The Angular original was NOT a ControlValueAccessor, but per the migration brief
 * file inputs participate in forms: we set a FormData payload via ElementInternals so
 * the selected files submit with the enclosing <form>. Keyboard: Enter/Space open browse.
 */
export class EsaFileUpload extends LitElement {
  static formAssociated = true;

  static properties = {
    label: { type: String },
    accept: { type: String },
    multiple: { type: Boolean },
    maxSizeMb: { type: Number, attribute: 'max-size-mb' },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    _isDragging: { state: true },
    _files: { state: true },
    _error: { state: true },
  };

  declare label: string;
  declare accept: string;
  declare multiple: boolean;
  declare maxSizeMb: number;
  declare disabled: boolean;
  /** Form field name — the key each selected file is appended under. */
  declare name: string;
  private declare _isDragging: boolean;
  private declare _files: File[];
  private declare _error: string;

  private internals: ElementInternals;

  constructor() {
    super();
    this.label = 'Upload files';
    this.accept = '';
    this.multiple = false;
    this.maxSizeMb = 10;
    this.disabled = false;
    this.name = 'files';
    this._isDragging = false;
    this._files = [];
    this._error = '';
    this.internals = this.attachInternals();
  }

  /** Reflect dragging state onto the host for :host([dragging]) styling. */
  updated(): void {
    this.toggleAttribute('dragging', this._isDragging);
  }

  private syncFormValue(): void {
    const data = new FormData();
    for (const f of this._files) data.append(this.name, f, f.name);
    this.internals.setFormValue(this._files.length ? data : null);
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [...this._files] },
        bubbles: true,
        composed: true,
      })
    );
  }

  private openFileBrowser = (): void => {
    if (this.disabled) return;
    const native = this.renderRoot.querySelector('.native') as HTMLInputElement | null;
    native?.click();
  };

  private onFileSelected = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (input.files) this.processFiles(Array.from(input.files));
    input.value = '';
  };

  private onDragOver = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) this._isDragging = true;
  };

  private onDragLeave = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging = false;
  };

  private onDrop = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    this._isDragging = false;
    if (this.disabled) return;
    const files = event.dataTransfer?.files;
    if (files) this.processFiles(Array.from(files));
  };

  private onZoneKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFileBrowser();
    }
  };

  private removeFile(index: number): void {
    const removed = this._files[index];
    this._files = this._files.filter((_, i) => i !== index);
    this.syncFormValue();
    // The remove button the user just pressed is gone, and with it the row it sat
    // in — so there is no element left to carry the confirmation and nothing for
    // focus to land on. Name the file: with several rows the user cannot otherwise
    // tell WHICH one went.
    if (removed) announce(`${removed.name} removed. ${this._files.length} remaining.`);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private processFiles(files: File[]): void {
    this._error = '';
    const maxBytes = this.maxSizeMb * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxBytes);

    if (oversized.length > 0) {
      this._error = `File${oversized.length > 1 ? 's' : ''} exceed ${this.maxSizeMb} MB limit: ${oversized
        .map((f) => f.name)
        .join(', ')}`;
      // ASSERTIVE, and this is the clearest case for it in the kit. The user dropped
      // files and some were silently discarded. A sighted user sees the red line
      // appear the moment it happens; waiting for a pause to say so means they keep
      // going on the assumption it worked. Rejection is exactly the "interrupt when
      // things go wrong" case.
      announce(this._error, { assertive: true });
      files = files.filter((f) => f.size <= maxBytes);
    }

    if (files.length === 0) return;

    this._files = this.multiple ? [...this._files, ...files] : [files[0]];
    this.syncFormValue();

    // Polite: the drop zone gives no other feedback that anything landed, and the
    // file list that appears below is not announced by existing. Count only — the
    // names are in the list, which the user can now navigate to and read.
    announce(
      `${files.length} file${files.length > 1 ? 's' : ''} added. ${this._files.length} total.`,
    );
  }

  render() {
    return html`
      <input
        type="file"
        class="native"
        accept=${this.accept}
        ?multiple=${this.multiple}
        ?disabled=${this.disabled}
        @change=${this.onFileSelected}
      />

      <div
        class="zone"
        role="button"
        tabindex="0"
        aria-disabled=${this.disabled}
        @click=${this.openFileBrowser}
        @dragover=${this.onDragOver}
        @dragleave=${this.onDragLeave}
        @drop=${this.onDrop}
        @keydown=${this.onZoneKeydown}
      >
        ${this.uploadIcon()}
        <span class="zone__label typography-label-md">${this.label}</span>
        <span class="zone__hint typography-body-sm">Drag &amp; drop or <span class="browse">browse</span></span>
        ${this.maxSizeMb
          ? html`<span class="zone__limit typography-body-sm">Max ${this.maxSizeMb} MB per file</span>`
          : null}
      </div>

      ${this._error ? html`<div class="error typography-body-sm">${this._error}</div>` : null}

      ${this._files.length > 0
        ? html`<ul class="files">
            ${this._files.map(
              (file, i) => html`<li class="file">
                ${this.fileIcon()}
                <span class="file__name typography-microcopy-sm-subtle">${file.name}</span>
                <span class="file__size typography-microcopy-sm-subtle">${this.formatFileSize(file.size)}</span>
                <button
                  type="button"
                  class="file__remove"
                  aria-label=${'Remove ' + file.name}
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.removeFile(i);
                  }}
                >
                  ${this.xIcon()}
                </button>
              </li>`
            )}
          </ul>`
        : null}
    `;
  }

  private uploadIcon() {
    return html`<svg class="icon icon--lg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" /></svg>`;
  }

  private fileIcon() {
    return html`<svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>`;
  }

  private xIcon() {
    return html`<svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>`;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host {
      display: block;
    }
    .icon {
      width: var(--icon-size-md, 20px);
      height: var(--icon-size-md, 20px);
      flex-shrink: 0;
    }
    .icon--sm {
      width: var(--icon-size-sm, 16px);
      height: var(--icon-size-sm, 16px);
    }
    .icon--lg {
      width: var(--icon-size-lg, 24px);
      height: var(--icon-size-lg, 24px);
    }

    .native {
      display: none;
    }

    .zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-100, 4px);
      padding: var(--spacing-600, 32px) var(--spacing-400, 16px);
      /* The colour half was wired from the start; the width was a bare 2px until
         2026-08-16, because no tier-2 width meant 2px (default is the 1px
         hairline, focus means the ring). That literal is why the kit could keep
         claiming no component needed an emphasis role — a hardcoded number does
         not show up in a survey of token reads, so the one border that wanted
         the role was the one border the survey could not see. */
      border: var(--border-width-emphasis, 2px) dashed var(--form-border-color, #cecece);
      border-radius: var(--radius-md, 0.5rem);
      background: var(--color-background-field, transparent);
      cursor: pointer;
      text-align: center;
      color: var(--color-content-default-muted, #838383);
      transition:
        border-color var(--transition-fast, 150ms ease),
        background var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .zone:hover {
      border-color: var(--form-border-color-focus, #3e9b4f);
    }
    .zone:focus-visible {
      border-color: var(--form-border-color-focus, #3e9b4f);
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    :host([dragging]) .zone {
      border-color: var(--color-background-brand, #46a758);
      background: var(--color-background-overlay-active, rgba(0, 88, 98, 0.08));
      color: var(--color-content-brand, #2a7e3b);
    }
    /* DISABLED IS A TOKEN TREATMENT, not an opacity hack. Tier 2 already ships the
       whole triple — --color-background-disabled, --color-border-disabled,
       --color-content-disabled — and this is the state they exist for; two of the
       three had zero readers because the kit reached for opacity instead.
       The fill is also the one moment a field is deliberately NOT the colour of its
       container: the break from the surface IS the signal that it is inert. */
    :host([disabled]) .zone,
    :host([disabled]) .zone:hover {
      background: var(--color-background-disabled, #f0f0f0);
      border-color: var(--color-border-disabled, #d9d9d9);
      color: var(--color-content-disabled, #8d8d8d);
      cursor: not-allowed;
    }

    .zone__label {
      color: var(--color-content-default, #202020);
    }
    .zone__hint {
      color: var(--color-content-default-muted, #838383);
    }
    .browse {
      color: var(--color-content-brand, #2a7e3b);
      text-decoration: underline;
    }
    .zone__limit {
      color: var(--color-content-default-muted, #838383);
    }

    .error {
      margin-top: var(--spacing-100, 4px);
      color: var(--color-content-utility-danger, #ce2c31);
    }

    .files {
      list-style: none;
      margin: var(--spacing-200, 8px) 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-100, 4px);
    }
    .file {
      display: flex;
      align-items: center;
      gap: var(--spacing-200, 8px);
      padding: var(--spacing-200, 8px) var(--spacing-300, 12px);
      background: var(--color-background-elevation-sunken, #f0f0f0);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-content-default-muted, #838383);
    }
    .file__name {
      flex: 1;
      color: var(--color-content-default, #202020);
      /* clip/visible, not "overflow: hidden" — the span carries
         .typography-microcopy-sm-subtle, whose line-height "none" (1) makes the line
         box 1em against DM Sans's 1.30em glyph box, so hiding the Y axis slices the
         descenders off every g/j/p/q/y in a filename. Same fix and same reasoning as
         esa-file-list's .file__name, where it is written out in full. */
      overflow-x: clip;
      overflow-y: visible;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file__size {
      color: var(--color-content-default-muted, #838383);
      white-space: nowrap;
    }
    .file__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-content-default-muted, #838383);
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
      transition: background var(--transition-fast, 150ms ease);
    }
    .file__remove:hover {
      background: var(--color-border-default, #cecece);
      color: var(--color-content-utility-danger, #ce2c31);
    }
    .file__remove:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: 1px;
    }

    /* FORCED COLORS. The dropzone keeps its 2px dashed border, so unlike the
       other overlays it does not vanish. Two smaller losses:

       DRAGGING differs from idle only by border-COLOUR, which is precisely what
       gets overridden — the "you may drop here" feedback disappears at the moment
       it matters. border-STYLE is not force-adjusted, so switching dashed to
       solid restores the distinction using a channel the mode cannot touch.

       DISABLED is 'aria-disabled' on a div carrying role=button, so there is no
       GrayText for free; it is named here. (Tag syntax is spelled out rather
       than written literally: check-a11y's markup scanner reads comments too,
       and a literal tag in prose reads to it as a keyboard-unreachable role.) */
    @media (forced-colors: active) {
      :host([dragging]) .zone { border-style: solid; }
      :host([disabled]) .zone {
        border-color: GrayText;
        color: GrayText;
      }
    }
  `,
  ];
}

if (!customElements.get('esa-file-upload')) {
  customElements.define('esa-file-upload', EsaFileUpload);
}
