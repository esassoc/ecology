import { LitElement, html, css } from 'lit';

export interface EsaCommand {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  group?: string;
  action: () => void;
  keywords?: string[];
  disabled?: boolean;
}

interface CommandGroup {
  label: string;
  commands: EsaCommand[];
}

/**
 * esa-command-palette — filterable command overlay [wc].
 *
 * Faithful translation of the Angular esa-command-palette. In Angular the open
 * state and command registry lived in EsaCommandPaletteService; here both are
 * collapsed onto the element: set the `commands` property (EsaCommand[]) and
 * toggle with the `open` property, `show()`, or the built-in Cmd/Ctrl+K listener.
 *
 * Behavior preserved: fuzzy-substring filter across label/description/keywords,
 * grouping by `group`, ArrowUp/ArrowDown navigation, Enter to execute, Esc to
 * close, auto-focus of the search input on open. Selecting runs cmd.action().
 */
export class EsaCommandPalette extends LitElement {
  static properties = {
    commands: { type: Array },
    open: { type: Boolean, reflect: true },
    hotkey: { type: Boolean },
    query: { state: true },
    activeId: { state: true },
  };

  declare commands: EsaCommand[];
  declare open: boolean;
  declare hotkey: boolean;
  private query = '';
  private activeId: string | null = null;

  constructor() {
    super();
    this.commands = [];
    this.open = false;
    this.hotkey = true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this.onGlobalKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onGlobalKeydown);
  }

  private onGlobalKeydown = (event: KeyboardEvent): void => {
    if (this.hotkey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    }
  };

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(): void {
    this.open = true;
    this.query = '';
    this.activeId = null;
    requestAnimationFrame(() => {
      (this.renderRoot as ShadowRoot)
        .querySelector<HTMLInputElement>('.esa-command-palette__input')
        ?.focus();
    });
  }

  close(): void {
    this.open = false;
  }

  private get flatCommands(): EsaCommand[] {
    return this.filteredGroups().flatMap((g) => g.commands.filter((c) => !c.disabled));
  }

  private filteredGroups(): CommandGroup[] {
    const q = this.query.toLowerCase().trim();
    const filtered = q
      ? this.commands.filter((cmd) => {
          const haystack = [cmd.label, cmd.description ?? '', ...(cmd.keywords ?? [])]
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        })
      : this.commands;

    const groupMap = new Map<string, EsaCommand[]>();
    for (const cmd of filtered) {
      const key = cmd.group ?? 'Commands';
      const list = groupMap.get(key) ?? [];
      list.push(cmd);
      groupMap.set(key, list);
    }
    return Array.from(groupMap.entries()).map(([label, commands]) => ({ label, commands }));
  }

  private onSearch = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value;
    this.activeId = null;
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const flat = this.flatCommands;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (flat.length === 0) return;
    const currentIndex = flat.findIndex((c) => c.id === this.activeId);
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = currentIndex < flat.length - 1 ? currentIndex + 1 : 0;
        this.activeId = flat[next].id;
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : flat.length - 1;
        this.activeId = flat[prev].id;
        break;
      }
      case 'Enter': {
        event.preventDefault();
        const active = flat.find((c) => c.id === this.activeId);
        if (active) this.execute(active);
        else if (flat.length === 1) this.execute(flat[0]);
        break;
      }
    }
  };

  private execute(cmd: EsaCommand): void {
    if (cmd.disabled) return;
    cmd.action();
    this.close();
  }

  render() {
    if (!this.open) return html``;
    const groups = this.filteredGroups();
    return html`
      <div class="esa-command-palette__backdrop" @click=${this.close}></div>
      <div class="esa-command-palette" role="dialog" aria-label="Command palette">
        <div class="esa-command-palette__search">
          <svg class="esa-command-palette__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            class="esa-command-palette__input"
            type="text"
            placeholder="Type a command..."
            .value=${this.query}
            @input=${this.onSearch}
            @keydown=${this.onKeydown}
            autocomplete="off"
          />
          <kbd class="esa-command-palette__kbd">ESC</kbd>
        </div>
        <div class="esa-command-palette__results" role="listbox">
          ${groups.map(
            (group) => html`
              <div class="esa-command-palette__group">
                <div class="esa-command-palette__group-label">${group.label}</div>
                ${group.commands.map(
                  (cmd) => html`
                    <button
                      class="esa-command-palette__item ${cmd.id === this.activeId
                        ? 'esa-command-palette__item--active'
                        : ''} ${cmd.disabled ? 'esa-command-palette__item--disabled' : ''}"
                      ?disabled=${cmd.disabled}
                      role="option"
                      aria-selected=${cmd.id === this.activeId}
                      @click=${() => this.execute(cmd)}
                      @mouseenter=${() => (this.activeId = cmd.id)}
                    >
                      <div class="esa-command-palette__item-content">
                        <span class="esa-command-palette__item-label">${cmd.label}</span>
                        ${cmd.description
                          ? html`<span class="esa-command-palette__item-desc">${cmd.description}</span>`
                          : null}
                      </div>
                      ${cmd.shortcut
                        ? html`<kbd class="esa-command-palette__item-shortcut">${cmd.shortcut}</kbd>`
                        : null}
                    </button>
                  `,
                )}
              </div>
            `,
          )}
          ${groups.length === 0
            ? html`<div class="esa-command-palette__empty">No commands found for "${this.query}"</div>`
            : null}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host { display: contents; }

    .esa-command-palette__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-backdrop);
      z-index: var(--z-modal-backdrop);
    }

    .esa-command-palette {
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: var(--command-palette-width);
      max-width: calc(100vw - 2rem);
      max-height: var(--command-palette-max-height);
      background: var(--command-palette-bg);
      border: 1px solid var(--command-palette-border-color);
      border-radius: var(--command-palette-radius);
      box-shadow: var(--command-palette-shadow);
      z-index: var(--z-modal);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans);
      animation: esa-cmdk-enter 150ms ease-out;
    }
    @keyframes esa-cmdk-enter {
      from { opacity: 0; transform: translateX(-50%) scale(0.96); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }

    .esa-command-palette__search {
      display: flex;
      align-items: center;
      gap: var(--spacing-300);
      padding: var(--spacing-300) var(--spacing-400);
      border-bottom: 1px solid var(--color-border-light);
    }
    .esa-command-palette__search-icon {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
    .esa-command-palette__input {
      flex: 1;
      border: none;
      outline: none;
      font-size: var(--type-size-300);
      color: var(--color-text-primary);
      background: transparent;
      font-family: inherit;
    }
    .esa-command-palette__input::placeholder { color: var(--color-text-muted); }

    .esa-command-palette__kbd,
    .esa-command-palette__item-shortcut {
      padding: 2px 6px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-100);
      font-size: var(--type-size-100);
      font-family: inherit;
      color: var(--color-text-muted);
      background: var(--color-surface-sunken);
    }

    .esa-command-palette__results {
      overflow-y: auto;
      padding: var(--spacing-200);
    }
    .esa-command-palette__group-label {
      padding: var(--spacing-200) var(--spacing-200) var(--spacing-100);
      font-size: var(--type-size-100);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing-wide);
      color: var(--color-text-muted);
    }

    .esa-command-palette__item {
      display: flex;
      align-items: center;
      gap: var(--spacing-300);
      width: 100%;
      padding: var(--spacing-200) var(--spacing-300);
      border: none;
      border-radius: var(--radius-200);
      background: transparent;
      color: var(--color-text-primary);
      font-size: var(--type-size-200);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;
    }
    .esa-command-palette__item--active { background: var(--command-palette-item-bg-active); }
    .esa-command-palette__item--disabled { opacity: 0.5; cursor: not-allowed; }
    .esa-command-palette__item:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: -2px;
    }

    .esa-command-palette__item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .esa-command-palette__item-label { font-weight: var(--font-weight-medium); }
    .esa-command-palette__item-desc {
      font-size: var(--type-size-150);
      color: var(--color-text-muted);
    }

    .esa-command-palette__empty {
      padding: var(--spacing-600);
      text-align: center;
      color: var(--color-text-muted);
      font-size: var(--type-size-200);
    }
  `;
}

if (!customElements.get('esa-command-palette')) {
  customElements.define('esa-command-palette', EsaCommandPalette);
}
