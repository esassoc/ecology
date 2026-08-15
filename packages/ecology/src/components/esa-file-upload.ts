import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';

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
    this._files = this._files.filter((_, i) => i !== index);
    this.syncFormValue();
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
      files = files.filter((f) => f.size <= maxBytes);
    }

    if (files.length === 0) return;

    this._files = this.multiple ? [...this._files, ...files] : [files[0]];
    this.syncFormValue();
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
                <span class="file__name typography-body-sm">${file.name}</span>
                <span class="file__size typography-body-sm">${this.formatFileSize(file.size)}</span>
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
      border: 2px dashed var(--form-border-color, #d4d4d4);
      border-radius: var(--form-radius-md, 8px);
      background: var(--color-background-field, transparent);
      cursor: pointer;
      text-align: center;
      color: var(--color-content-default-muted, #737373);
      transition:
        border-color var(--transition-fast, 150ms ease),
        background var(--transition-fast, 150ms ease),
        box-shadow var(--transition-fast, 150ms ease);
    }
    .zone:hover {
      border-color: var(--form-border-color-focus, #43608a);
    }
    .zone:focus-visible {
      outline: none;
      border-color: var(--form-border-color-focus, #43608a);
      box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
    }

    :host([dragging]) .zone {
      border-color: var(--color-background-brand, #43608a);
      background: var(--color-overlay-active, rgba(0, 88, 98, 0.08));
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
      color: var(--color-content-default, #171717);
    }
    .zone__hint {
      color: var(--color-content-default-muted, #737373);
    }
    .browse {
      color: var(--color-content-brand, #2a7e3b);
      text-decoration: underline;
    }
    .zone__limit {
      color: var(--color-content-default-muted, #737373);
    }

    .error {
      margin-top: var(--spacing-100, 4px);
      color: var(--color-content-danger, #ce2c31);
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
      background: var(--color-background-elevation-sunken, #efefef);
      border-radius: var(--form-radius-sm, 6px);
      color: var(--color-content-default-muted, #737373);
    }
    .file__name {
      flex: 1;
      color: var(--color-content-default, #171717);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file__size {
      color: var(--color-content-default-muted, #737373);
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
      color: var(--color-content-default-muted, #737373);
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
      transition: background var(--transition-fast, 150ms ease);
    }
    .file__remove:hover {
      background: var(--color-border-default, #e5e5e5);
      color: var(--color-content-danger, #ce2c31);
    }
    .file__remove:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }
  `,
  ];
}

if (!customElements.get('esa-file-upload')) {
  customElements.define('esa-file-upload', EsaFileUpload);
}
