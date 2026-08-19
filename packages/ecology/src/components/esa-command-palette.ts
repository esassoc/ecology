// `nothing` (not undefined) is what REMOVES an attribute — see esa-dialog's import.
import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';
import { announce } from '../announcer.js';
import { boolish } from '../boolish.js';

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
    hotkey: { type: Boolean, converter: boolish },
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

  private get dialogEl(): HTMLDialogElement | null {
    return (this.renderRoot as ShadowRoot).querySelector('dialog');
  }

  /**
   * FOCUS RETURN, which this component had none of until 2026-08-18. `close()` was
   * `this.open = false` and nothing else: render() then deleted the subtree focus
   * was sitting in, so focus fell to <body> on every exit — Esc, backdrop, running
   * a command, and the global Cmd/Ctrl+K toggle. Worst blast radius in the kit,
   * because the hotkey means it can be opened from anywhere on the page.
   *
   * showModal() fixes it for free, and fixes it BETTER than a saved
   * `document.activeElement` would: that retargets to the host when the trigger is
   * inside another shadow root, whereas the platform tracks the real node.
   */
  private syncDialog(): void {
    const el = this.dialogEl;
    if (!el) return;
    if (this.open) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }

  private onNativeClose = (): void => {
    this.open = false;
  };

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

  updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) this.syncDialog();
    this.announceEmptyResults();
  }

  render() {
    const groups = this.filteredGroups();
    return html`
      <dialog
        class="esa-command-palette"
        closedby="any"
        aria-label="Command palette"
        @close=${this.onNativeClose}
      >
        <div class="esa-command-palette__search">
          <svg class="esa-command-palette__search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <!-- The input had no accessible name — only a placeholder, which is not a
               name and vanishes as soon as you type. The cue below is what makes
               announcing the result list on every keystroke unnecessary; the visible
               footer tells sighted users the same thing. -->
          <!-- COMBOBOX semantics, absent until 2026-08-18. Arrow keys moved the
               highlight and a screen reader said NOTHING: focus never leaves the
               input (it has to — you are still typing), so without
               aria-activedescendant there is no announcement to make. Same fix and
               same reasoning as esa-combobox.renderAutocomplete; all three IDREFs
               resolve inside this shadow root, which is the only place they can. -->
          <input
            class="esa-command-palette__input typography-microcopy-lg-subtle"
            type="text"
            role="combobox"
            aria-label="Search commands"
            aria-describedby="cue"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="results"
            aria-activedescendant=${this.activeId ? `cmd-${this.activeId}` : nothing}
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
        <div class="esa-command-palette__results" id="results" role="listbox" aria-label="Commands">
          ${groups.map(
            (group) => html`
              <div class="esa-command-palette__group" role="group" aria-label=${group.label}>
                <div class="esa-command-palette__group-label typography-eyebrow-md" aria-hidden="true">${group.label}</div>
                ${group.commands.map(
                  (cmd) => html`
                    <!-- A <button role="option"> is invalid: an option may not be an
                         interactive widget, and it also made every command its own
                         tab stop. It is a <div> now — the keyboard route is the
                         input's arrow keys plus aria-activedescendant, which is the
                         listbox contract. Pointer users keep the click. -->
                    <div
                      class="esa-command-palette__item ${cmd.id === this.activeId
                        ? 'esa-command-palette__item--active'
                        : ''} ${cmd.disabled ? 'esa-command-palette__item--disabled' : ''}"
                      id=${`cmd-${cmd.id}`}
                      role="option"
                      aria-selected=${cmd.id === this.activeId}
                      aria-disabled=${cmd.disabled ? 'true' : nothing}
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
                    </div>
                  `,
                )}
              </div>
            `,
          )}
          ${groups.length === 0
            ? html`<div class="esa-command-palette__empty typography-body-md">No commands found for "${this.query}"</div>`
            : null}
        </div>
      </dialog>
    `;
  }

  static styles = [
    typography,
    a11y,
    css`
    :host { display: contents; }

    /* ::backdrop replaces the hand-rolled scrim div; the top layer replaces the
       z-index pair. Literal fallback is the real value where ::backdrop does not
       inherit custom properties — see esa-dialog. */
    dialog.esa-command-palette::backdrop {
      background: var(--color-background-overlay-backdrop, rgba(0, 0, 0, 0.5));
    }

    dialog.esa-command-palette {
      /* Docked 20% down rather than centered, so it keeps explicit insets and a
         zeroed margin instead of the UA's centering 'margin: auto'. */
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      margin: 0;
      padding: 0;
      width: var(--command-palette-width, 560px);
      max-width: calc(100vw - 2rem);
      max-height: var(--command-palette-max-height, 440px);
      background: var(--color-background-elevation-floating, #fcfcfc);
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-lg, 0.75rem);
      box-shadow: var(--elevation-6, 0 20px 60px rgba(0, 0, 0, 0.2));
      overflow: hidden;
      color: var(--color-content-default, #202020);
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
      animation: esa-cmdk-enter var(--animation-enter, 150ms ease-out);
    }
    dialog.esa-command-palette[open] { display: flex; flex-direction: column; }
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
      /* Same clip as esa-entity-search: the panel is --radius-lg with
         overflow: hidden, so a square row's inset ring loses ~4.7px off each end
         of its top edge. Match the panel's INNER curve (radius minus its border)
         and the outline follows it. See that component for the geometry. */
      border-radius: calc(var(--radius-lg, 0.75rem) - var(--border-width-default, 1px))
        calc(var(--radius-lg, 0.75rem) - var(--border-width-default, 1px)) 0 0;
    }
    /* The ring goes on the ROW, not the input. The input is chromeless by design,
       so a ring drawn on it would float around bare text; the row is the visible
       affordance. :focus-within rather than :focus-visible for the same reason
       esa-text-field uses it — this is text entry, where a ring on click is native
       behaviour and wanted.

       Inset because the row runs edge to edge inside an overflow:hidden panel, so
       an outline at positive offset would be clipped on both sides. */
    .esa-command-palette__search:focus-within {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: calc(var(--focus-ring-offset, 2px) * -1);
    }
    .esa-command-palette__search-icon {
      /* STAYS -muted, unlike the six text rules around it. An icon is non-text
         content: SC 1.4.11 asks 3:1, not 4.5:1, and gray-10 on the dialog surface
         measures 3.70:1. Raising it would be consistency for its own sake. */
      color: var(--color-content-default-secondary, #646464);
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
    /* -secondary: a placeholder is TEXT under SC 1.4.3, and axe cannot evaluate
       ::placeholder — so this one was invisible to the audit as well as to readers. */
    .esa-command-palette__input::placeholder { color: var(--color-content-default-secondary, #646464); }

    .esa-command-palette__kbd,
    .esa-command-palette__item-shortcut {
      padding: 2px 6px;
      border: var(--border-width-default, 1px) solid var(--color-border-default, #cecece);
      border-radius: var(--radius-sm, 0.25rem);
      /* -secondary, not -muted: muted is gray-10, which measures 3.33:1 on this
         sunken chip at 12px and misses AA (SC 1.4.3). gray-11 gives 5.19:1. */
      color: var(--color-content-default-secondary, #646464);
      background: var(--color-background-elevation-sunken, #f0f0f0);
    }

    .esa-command-palette__results {
      overflow-y: auto;
      padding: var(--spacing-200, 0.5rem);
    }
    .esa-command-palette__group-label {
      padding: var(--spacing-200, 0.5rem) var(--spacing-200, 0.5rem) var(--spacing-100, 0.25rem);
      /* -secondary, not -muted: 3.70:1 vs 5.77:1 on the dialog surface at 12px. */
      color: var(--color-content-default-secondary, #646464);
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
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3e9b4f);
      outline-offset: -2px;
    }

    .esa-command-palette__item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .esa-command-palette__item-desc {
      /* -secondary: same 3.70:1 as the group label; only renders once a result list
         is populated, which is why the audit never saw it. */
      color: var(--color-content-default-secondary, #646464);
    }

    .esa-command-palette__empty {
      padding: var(--spacing-600, 2rem);
      text-align: center;
      /* -secondary: only renders on a no-results state, so the audit never saw it. */
      color: var(--color-content-default-secondary, #646464);
    }
  `,
  ];
}

if (!customElements.get('esa-command-palette')) {
  customElements.define('esa-command-palette', EsaCommandPalette);
}
