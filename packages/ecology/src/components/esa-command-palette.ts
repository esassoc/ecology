import { LitElement, html, css } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { announce } from '../announcer.js';

export interface EsaCommand {
  id: string;
  /** The command's name, as it reads in the list. e.g. "New file", "Toggle theme". */
  label: string;
  /**
   * The action's effect, in 2-4 words — only when `label` alone leaves it
   * ambiguous what running the command does. e.g. "Create a blank file",
   * "Open an existing file". Omit it when the label is already self-explanatory;
   * most real commands do.
   */
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

  /**
   * Announce only the transition INTO no-results. See esa-combobox.announceEmptyResults
   * for the full reasoning: the cue sets the expectation, so a per-keystroke count
   * would be noise, but a query that has gone dry has no other signal for someone who
   * cannot see the list empty out.
   */
  private wasEmpty = false;
  private announceEmptyResults(): void {
    const isEmpty = this.open && !!this.query.trim() && this.filteredGroups().length === 0;
    if (isEmpty && !this.wasEmpty) announce('No commands found', { assertive: true });
    this.wasEmpty = isEmpty;
  }

  updated(): void {
    this.announceEmptyResults();
  }

  render() {
    if (!this.open) return html``;
    const groups = this.filteredGroups();
    return html`
      <div class="esa-command-palette__backdrop" @click=${this.close}></div>
      <div class="esa-command-palette" role="dialog" aria-label="Command palette">
        <div class="esa-command-palette__search">
          <svg class="esa-command-palette__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <!-- The input had no accessible name — only a placeholder, which is not a
               name and vanishes as soon as you type. The cue below is what makes
               announcing the result list on every keystroke unnecessary; the visible
               footer tells sighted users the same thing. -->
          <input
            class="esa-command-palette__input typography-microcopy-lg-subtle"
            type="text"
            aria-label="Search commands"
            aria-describedby="cue"
            placeholder="Type a command..."
            .value=${this.query}
            @input=${this.onSearch}
            @keydown=${this.onKeydown}
            autocomplete="off"
          />
          <span class="visually-hidden" id="cue"
            >Commands filter as you type. Use the up and down arrows to review them,
            Enter to run one, Escape to close.</span
          >
          <kbd class="esa-command-palette__kbd typography-body-xs">ESC</kbd>
        </div>
        <div class="esa-command-palette__results" role="listbox">
          ${groups.map(
            (group) => html`
              <div class="esa-command-palette__group">
                <div class="esa-command-palette__group-label typography-eyebrow-md">${group.label}</div>
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
                        <span class="esa-command-palette__item-label typography-label-md">${cmd.label}</span>
                        ${cmd.description
                          ? html`<span class="esa-command-palette__item-desc typography-body-sm">${cmd.description}</span>`
                          : null}
                      </div>
                      ${cmd.shortcut
                        ? html`<kbd class="esa-command-palette__item-shortcut typography-body-xs">${cmd.shortcut}</kbd>`
                        : null}
                    </button>
                  `,
                )}
              </div>
            `,
          )}
          ${groups.length === 0
            ? html`<div class="esa-command-palette__empty typography-body-md">No commands found for "${this.query}"</div>`
            : null}
        </div>
      </div>
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host { display: contents; }

    .esa-command-palette__backdrop {
      position: fixed;
      inset: 0;
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
      z-index: var(--z-modal-backdrop, 300);
    }

    .esa-command-palette {
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: var(--command-palette-width, 560px);
      max-width: calc(100vw - 2rem);
      max-height: var(--command-palette-max-height, 440px);
      background: var(--color-background-elevation-floating, #fcfcfc);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-lg, 0.75rem);
      box-shadow: var(--elevation-6, 0 20px 60px rgba(0, 0, 0, 0.2));
      z-index: var(--z-modal, 400);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
      animation: esa-cmdk-enter var(--animation-enter, 150ms ease-out);
    }
    @keyframes esa-cmdk-enter {
      from { opacity: 0; transform: translateX(-50%) scale(0.96); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }

    .esa-command-palette__search {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      padding: var(--spacing-300, 0.75rem) var(--spacing-400, 1rem);
      border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
    }
    /* The ring goes on the ROW, not the input. The input is chromeless by design,
       so a ring drawn on it would float around bare text; the row is the visible
       affordance. :focus-within rather than :focus-visible for the same reason
       esa-text-field uses it — this is text entry, where a ring on click is native
       behaviour and wanted.

       Inset because the row runs edge to edge inside an overflow:hidden panel, so
       an outline at positive offset would be clipped on both sides. */
    .esa-command-palette__search:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
    }
    .esa-command-palette__search-icon {
      color: var(--color-content-default-muted, #838383);
      flex-shrink: 0;
    }
    .esa-command-palette__input {
      flex: 1;
      border: none;
      /* Suppressed only because the row above paints the ring — never bare. */
      outline: none;
      color: var(--color-content-default, #202020);
      background: transparent;
      font-family: inherit;
    }
    .esa-command-palette__input::placeholder { color: var(--color-content-default-muted, #838383); }

    .esa-command-palette__kbd,
    .esa-command-palette__item-shortcut {
      padding: 2px 6px;
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-content-default-muted, #838383);
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .esa-command-palette__results {
      overflow-y: auto;
      padding: var(--spacing-200, 0.5rem);
    }
    .esa-command-palette__group-label {
      padding: var(--spacing-200, 0.5rem) var(--spacing-200, 0.5rem) var(--spacing-100, 0.25rem);
      color: var(--color-content-default-muted, #838383);
    }

    .esa-command-palette__item {
      display: flex;
      align-items: center;
      gap: var(--spacing-300, 0.75rem);
      width: 100%;
      padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      background: transparent;
      color: var(--color-content-default, #202020);
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;
    }
    .esa-command-palette__item--active { background: var(--color-background-elevation-sunken, #f0f0f0); }
    .esa-command-palette__item--disabled { opacity: 0.5; cursor: not-allowed; }
    .esa-command-palette__item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
      outline-offset: -2px;
    }

    .esa-command-palette__item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .esa-command-palette__item-desc {
      color: var(--color-content-default-muted, #838383);
    }

    .esa-command-palette__empty {
      padding: var(--spacing-600, 2rem);
      text-align: center;
      color: var(--color-content-default-muted, #838383);
    }
  `,
  ];
}

if (!customElements.get('esa-command-palette')) {
  customElements.define('esa-command-palette', EsaCommandPalette);
}
