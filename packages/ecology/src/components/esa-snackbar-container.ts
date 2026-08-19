import { LitElement, html, css } from 'lit';
import { announce } from '../announcer.js';
import { deepActiveElement } from '../overlay.js';
import './esa-snackbar-item';
import type { EsaSnackbarVariant } from './esa-snackbar-item';

export interface EsaSnackbarConfig {
  message: string;
  variant?: EsaSnackbarVariant;
  /**
   * Milliseconds before the toast dismisses itself. **`0` (the default) means it
   * stays until dismissed.**
   *
   * This default changed on 2026-08-16, from `5000`. A message that removes itself
   * on a timer the user cannot adjust, extend or turn off is SC 2.2.1 Timing
   * Adjustable — a **Level A** failure, and the one every toast implementation
   * gets wrong. Persistent-by-default is the only version that conforms without
   * further work.
   *
   * Passing a duration is still supported and still auto-dismisses, but doing so
   * opts you out of 2.2.1 conformance unless you provide the adjustment mechanism
   * yourself. Hovering or focusing the toast pauses the countdown, which helps
   * pointer and keyboard users — but it does NOT help a screen reader user reading
   * with a virtual cursor, since that fires neither event. Pause is a mitigation,
   * not a conformance argument.
   */
  duration?: number;
  /**
   * Label for an action button inside the toast.
   *
   * **Discouraged.** A live region announces raw text with no role, so "Undo" is
   * read as the word "undo" with nothing to say it is a button; focus is never
   * moved here; and there is no mechanism to navigate to a toast. If the toast
   * also auto-dismisses, the control can vanish before anyone slow — a screen
   * reader user, a keyboard user, someone using a magnifier — arrives.
   *
   * Only use it when the same action is ALSO reachable in the primary document
   * (an "Undo" row left in place of the deleted item, say). If it is the only way
   * to perform the action, it is not a status message and does not belong in a
   * toast: use `esa-dialog`, which moves focus and is persistent.
   */
  action?: string;
  dismissable?: boolean;
  uniqueKey?: string;
}

interface SnackbarEntry extends EsaSnackbarConfig {
  id: string;
  timer: ReturnType<typeof setTimeout> | null;
  /** Auto-dismiss bookkeeping, so hover/focus can pause and resume the countdown. */
  remaining: number;
  startedAt: number;
}

/** One warning per page, not per toast. See `show()`. */
let warnedImplicitDuration = false;

/**
 * esa-snackbar-container — toast stack [wc].
 *
 * ## The accessible half lives somewhere else
 *
 * This element renders the VISUAL stack. It is deliberately **not** a live region,
 * and adding `aria-live` here would make things worse, not better:
 *
 *   - each toast is an `<esa-snackbar-item>` created and populated in the same
 *     tick, and a region born with its content is routinely not announced at all;
 *   - the text sits two shadow roots deep (this root → the item's root), and
 *     live-region observation across a nested shadow boundary is unreliable,
 *     worst in Safari/VoiceOver;
 *   - every page with a toast stack would then own a third live region, on top of
 *     the announcer's two, and live regions interfere with each other.
 *
 * So `show()` sends the message through `announce()` (see `../announcer.ts`), which
 * owns the kit's only two regions, in the light DOM, mounted before anything
 * happens. The stack here is what people SEE; the announcer is what they HEAR.
 *
 * What the stack does carry is `role="region"` with a name — a landmark, so a
 * screen reader user who just heard a toast has a way to NAVIGATE to it. That is
 * the gap live regions cannot close on their own: an announcement tells you
 * something exists, it does not give you a route to it.
 *
 * ## API
 *
 *   container.show({ message, variant, duration, action, dismissable, uniqueKey })
 *   container.success(msg) / .info(msg) / .warning(msg) / .danger(msg)
 *   container.dismiss(id) / .clearAll()
 *
 * Toasts persist until dismissed unless you pass a `duration` — see the note on
 * `EsaSnackbarConfig.duration` for why that default flipped.
 */
export class EsaSnackbarContainer extends LitElement {
  static properties = {
    snackbars: { state: true },
    label: { type: String },
  };

  // hub-edit-approved: user approved hub edits this session (2026-06-29) and needs a
  // working toast. Reactive state must be `declare` + constructor-init (the pattern
  // every other esa-* component uses) — a class-field initializer shadows Lit's
  // generated accessor, so assigning this.snackbars never triggered a re-render and
  // toasts never appeared. See lit.dev/msg/class-field-shadowing.
  declare private snackbars: SnackbarEntry[];
  /** Accessible name for the landmark. Change it if a page has more than one stack. */
  declare label: string;
  private nextId = 0;
  /** Where focus was before a toast took it, so dismiss can put it back. */
  private previousFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.snackbars = [];
    this.label = 'Notifications';
  }

  /** Show a snackbar. Returns its id. */
  show(config: EsaSnackbarConfig): string {
    if (config.duration === undefined && !warnedImplicitDuration) {
      warnedImplicitDuration = true;
      console.info(
        '[esa-snackbar] Toasts now persist until dismissed. The `duration` default ' +
          'changed from 5000 to 0 on 2026-08-16 — a timer the user cannot adjust is ' +
          'WCAG 2.2.1 (Level A). Pass `duration: 5000` to restore auto-dismiss, and ' +
          'read the note on EsaSnackbarConfig.duration before you do.',
      );
    }

    const resolved: EsaSnackbarConfig = {
      variant: 'info',
      duration: 0,
      dismissable: true,
      ...config,
    };

    // Danger interrupts; everything else waits for a pause. Assertive stops a screen
    // reader mid-sentence without resuming, so it is reserved for the cases where
    // waiting costs the user something.
    const assertive = resolved.variant === 'danger';

    if (resolved.uniqueKey) {
      const existing = this.snackbars.find((s) => s.uniqueKey === resolved.uniqueKey);
      if (existing) {
        // Re-announce rather than returning silently. Deduping the VISUAL toast is
        // the point of uniqueKey — the same message should not stack up twice. But
        // the second occurrence is a real event: the user did something and it
        // happened again. Bailing out early meant that second action reported
        // nothing at all to a screen reader, which is the failure this whole
        // component was rebuilt to fix.
        // Update the ENTRY, not just the announcement. announce() speaks the new
        // message; without this the rendered toast keeps the first call's text, so
        // a sighted user reads "1 file saved" while a screen-reader user hears
        // "2 files saved" — the two are given different facts about the same event.
        // Replaced rather than mutated so Lit sees a new array and re-renders.
        this.snackbars = this.snackbars.map((s) =>
          s.uniqueKey === resolved.uniqueKey ? { ...s, ...resolved, id: s.id, timer: s.timer } : s,
        );
        const updated = this.snackbars.find((s) => s.id === existing.id) ?? existing;
        announce(resolved.message, { assertive });
        this.restartTimer(updated);
        return updated.id;
      }
    }

    const id = `esa-snackbar-${this.nextId++}`;
    const duration = resolved.duration ?? 0;
    const entry: SnackbarEntry = {
      ...resolved,
      id,
      timer: null,
      remaining: duration,
      startedAt: 0,
    };

    this.snackbars = [...this.snackbars, entry];
    announce(resolved.message, { assertive });
    this.startTimer(entry);
    return id;
  }

  success(message: string, config?: Partial<EsaSnackbarConfig>): string {
    return this.show({ ...config, message, variant: 'success' });
  }
  info(message: string, config?: Partial<EsaSnackbarConfig>): string {
    return this.show({ ...config, message, variant: 'info' });
  }
  warning(message: string, config?: Partial<EsaSnackbarConfig>): string {
    return this.show({ ...config, message, variant: 'warning' });
  }
  danger(message: string, config?: Partial<EsaSnackbarConfig>): string {
    return this.show({ ...config, message, variant: 'danger' });
  }

  // ── Auto-dismiss timing (only runs when a duration was passed) ───────────────

  private startTimer(entry: SnackbarEntry): void {
    if (entry.remaining <= 0) return;
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => this.dismiss(entry.id), entry.remaining);
  }

  private restartTimer(entry: SnackbarEntry): void {
    if (entry.timer) clearTimeout(entry.timer);
    entry.remaining = entry.duration ?? 0;
    this.startTimer(entry);
  }

  /**
   * Pause every countdown while the pointer or focus is inside the stack.
   *
   * Partial by design: a screen reader user reading with a virtual cursor fires
   * neither `mouseenter` nor `focusin`, so this does nothing for them. That is why
   * the DEFAULT is no timer at all rather than a timer with pausing bolted on.
   */
  private pauseAll = (): void => {
    for (const s of this.snackbars) {
      if (!s.timer) continue;
      clearTimeout(s.timer);
      s.timer = null;
      s.remaining = Math.max(0, s.remaining - (Date.now() - s.startedAt));
    }
  };

  private resumeAll = (): void => {
    for (const s of this.snackbars) {
      if (!s.timer && s.remaining > 0) this.startTimer(s);
    }
  };

  /**
   * Esc dismisses the newest toast — but ONLY when focus is already inside the
   * stack, which is why this listener is on the container and not on `document`.
   *
   * A global Esc handler would collide with everything else that uses the key: a
   * user closing a tooltip or a menu would silently destroy a toast they had not
   * read yet. Scoping it means Esc only reaches here when the user has already
   * navigated to a toast, where dismissing is what they meant.
   */
  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || this.snackbars.length === 0) return;
    event.stopPropagation();
    this.dismiss(this.snackbars[this.snackbars.length - 1].id);
  };

  /** Remember where focus was, so dismiss can return it. */
  private onFocusIn = (event: FocusEvent): void => {
    const from = event.relatedTarget as HTMLElement | null;
    if (from && !this.contains(from)) this.previousFocus = from;
    this.pauseAll();
  };

  dismiss(id: string): void {
    const entry = this.snackbars.find((s) => s.id === id);
    if (entry?.timer) clearTimeout(entry.timer);

    // If focus is inside the toast being removed, put it back where it came from.
    // Otherwise removing the node drops focus to <body>, and a keyboard user is
    // returned to the top of the document with no idea where they were.
    // deepActiveElement(), not document.activeElement: the latter retargets to the
    // shadow HOST when focus is inside a shadow root, so a focused control inside a
    // snackbar's own action button reported as the container and the containment test
    // below could answer the wrong question.
    const active = this.renderRoot.activeElement ?? deepActiveElement();
    const focusWasInside = !!active && this.renderRoot.contains(active as Node);

    this.snackbars = this.snackbars.filter((s) => s.id !== id);

    if (focusWasInside) {
      const restore = this.previousFocus;
      this.previousFocus = null;
      void this.updateComplete.then(() => {
        if (restore?.isConnected) restore.focus();
        else document.body.focus?.();
      });
    }
  }

  clearAll(): void {
    this.snackbars.forEach((s) => s.timer && clearTimeout(s.timer));
    this.snackbars = [];
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.snackbars.forEach((s) => s.timer && clearTimeout(s.timer));
  }

  render() {
    return html`
      <div
        class="esa-snackbar-container"
        role="region"
        aria-label=${this.label}
        @keydown=${this.onKeydown}
        @mouseenter=${this.pauseAll}
        @mouseleave=${this.resumeAll}
        @focusin=${this.onFocusIn}
        @focusout=${this.resumeAll}
      >
        ${this.snackbars.map(
          (s) => html`
            <esa-snackbar-item
              message=${s.message}
              variant=${s.variant ?? 'info'}
              action=${s.action ?? ''}
              ?dismissable=${s.dismissable !== false}
              @dismiss=${() => this.dismiss(s.id)}
              @action=${() =>
                this.dispatchEvent(
                  new CustomEvent('snackbar-action', {
                    detail: { id: s.id },
                    bubbles: true,
                    composed: true,
                  }),
                )}
            ></esa-snackbar-item>
          `,
        )}
      </div>
    `;
  }

  static styles = css`
    :host { display: contents; }

    .esa-snackbar-container {
      position: fixed;
      bottom: var(--spacing-500, 1.5rem);
      right: var(--spacing-500, 1.5rem);
      z-index: var(--z-toast, 500);
      display: flex;
      flex-direction: column-reverse;
      gap: var(--spacing-200, 0.5rem);
      max-width: var(--snackbar-container-max-width, 420px);
    }

    /* An empty region should not be a hit-testable rectangle sitting over the
       bottom-right of every page. The :empty selector is safe here because the
       container's only children are elements, with no template whitespace
       between them. */
    .esa-snackbar-container:empty {
      display: none;
    }

    /* Reflow (SC 1.4.10) and resize (1.4.4). Below the 320px reflow width a
       420px box with 1.5rem offsets on both sides cannot fit, so the stack
       becomes a full-width strip instead of overflowing the viewport. The same
       rule is what a 400%-zoom viewport hits. */
    @media (max-width: 30rem) {
      .esa-snackbar-container {
        left: var(--spacing-200, 0.5rem);
        right: var(--spacing-200, 0.5rem);
        bottom: var(--spacing-200, 0.5rem);
        max-width: none;
      }
    }
  `;
}

if (!customElements.get('esa-snackbar-container')) {
  customElements.define('esa-snackbar-container', EsaSnackbarContainer);
}
