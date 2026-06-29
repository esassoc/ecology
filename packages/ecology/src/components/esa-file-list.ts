import { LitElement, html, css } from 'lit';

export interface EsaFile {
  /** File name shown in the row. */
  name: string;
  /** When present, the name renders as a link to this URL. */
  href?: string;
}

/**
 * esa-file-list — presentational list of EXISTING files (server records), the
 * read/manage counterpart to esa-file-upload (which collects new File objects).
 *
 * Faithful port of Beacon's simple-file-display: a bordered `icon | name |
 * actions` row, one per file. Set `files` as a property (an array). Each row can
 * show a download action and/or a remove action:
 *   - downloadable (default true) → a download button; emits `download`.
 *   - removable (default false)   → a remove button; drops the row and emits `remove`.
 * Both events are composed/bubbling with detail `{ file, index }`. Removal mutates
 * the local `files` copy (same self-managing pattern as esa-file-upload / esa-pill).
 *
 * Icons are inlined static SVGs — safe to author directly in the Lit template
 * (only *injected* markup needs unsafeSVG to keep the SVG namespace).
 *
 * Decorator-free; self-register guard at the bottom.
 */
export class EsaFileList extends LitElement {
  static properties = {
    files: { type: Array },
    removable: { type: Boolean, reflect: true },
    downloadable: { type: Boolean, reflect: true },
  };

  declare files: EsaFile[];
  declare removable: boolean;
  declare downloadable: boolean;

  constructor() {
    super();
    this.files = [];
    this.removable = false;
    this.downloadable = true;
  }

  private emit(type: 'download' | 'remove', file: EsaFile, index: number): void {
    this.dispatchEvent(
      new CustomEvent(type, { detail: { file, index }, bubbles: true, composed: true })
    );
  }

  private onRemove(index: number): void {
    const file = this.files[index];
    this.files = this.files.filter((_, i) => i !== index);
    this.emit('remove', file, index);
  }

  render() {
    if (!this.files.length) return html``;
    return html`
      <ul class="list">
        ${this.files.map(
          (file, i) => html`<li class="file">
            <span class="file__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
              </svg>
            </span>
            ${file.href
              ? html`<a class="file__name" href=${file.href} title=${file.name}>${file.name}</a>`
              : html`<span class="file__name" title=${file.name}>${file.name}</span>`}
            <span class="file__actions">
              ${this.downloadable
                ? html`<button
                    class="file__btn"
                    type="button"
                    aria-label=${'Download ' + file.name}
                    @click=${() => this.emit('download', file, i)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  </button>`
                : null}
              ${this.removable
                ? html`<button
                    class="file__btn file__btn--remove"
                    type="button"
                    aria-label=${'Remove ' + file.name}
                    @click=${() => this.onRemove(i)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                  </button>`
                : null}
            </span>
          </li>`
        )}
      </ul>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-150);
    }
    .file {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--spacing-200);
      padding: 2px var(--spacing-300);
      border: var(--form-border-width) solid var(--color-border);
      border-radius: var(--radius-100);
      background: var(--color-surface);
      font-family: var(--font-sans);
      font-size: var(--type-size-150);
    }
    .file__icon {
      display: inline-flex;
      color: var(--color-text-muted);
    }
    .file__icon svg {
      width: 16px;
      height: 16px;
    }
    .file__name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text-primary);
      text-decoration: none;
    }
    a.file__name {
      color: var(--color-link);
    }
    a.file__name:hover {
      text-decoration: underline;
    }
    .file__actions {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-050);
    }
    .file__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-text-muted);
      border-radius: var(--radius-100);
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }
    .file__btn svg {
      width: 15px;
      height: 15px;
    }
    .file__btn:hover {
      background: var(--color-surface-sunken);
      color: var(--color-text-primary);
    }
    .file__btn--remove:hover {
      color: var(--color-danger);
    }
    .file__btn:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 1px;
    }
  `;
}

if (!customElements.get('esa-file-list')) {
  customElements.define('esa-file-list', EsaFileList);
}
