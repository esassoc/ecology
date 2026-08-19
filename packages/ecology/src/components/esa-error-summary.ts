import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
import { a11y } from '../a11y.js';

export interface EsaFieldError {
  /**
   * `id` of the field to send the user to — the HOST element
   * (`<esa-text-field id="email">`), not anything inside its shadow root.
   *
   * IDREFs do not cross a shadow boundary in any engine, so the summary cannot
   * point at the inner `<input>` and must not try. It resolves the host by id and
   * calls `.focus()` on it; the form components each override `focus()` to forward
   * to their own inner control. Native controls work unchanged.
   *
   * Optional: an error with no `field` renders as plain text rather than a link,
   * which is the right output for a form-level error ("Your session expired").
   */
  field?: string;
  /** What is wrong, in the user's words. Shown as the link text. */
  message: string;
}

/**
 * esa-error-summary — the form-level validation summary [wc].
 *
 * ## Why this exists
 *
 * Five components — `esa-text-field`, `esa-textarea`, `esa-select`, `esa-combobox`
 * and `esa-date-picker` — ship `liveError: false` and justify that default by
 * pointing at "an `<esa-error-summary>` that takes focus". The reasoning was right
 * and the component was never built, so until now the shipped default announced
 * validation errors to NOBODY: no live region on the field, and no summary to take
 * focus. This is the missing half.
 *
 * ## Why it takes focus instead of announcing
 *
 * This is deliberately **not** a live region, and adding `role="alert"` to it would
 * be a regression, not an improvement.
 *
 * Moving focus is a change of context. Assistive technology already surfaces it, so
 * SC 4.1.3 does not apply — the criterion exists for updates that happen *without*
 * taking focus. Focus is also the more robust mechanism: a live region announcement
 * is transient and unreplayable, whereas a focused summary is still sitting there
 * when the user wants to re-read it.
 *
 * It matters more here than usual because the alternative scales badly. Turn on
 * `live-error` for every field and a six-error form fires six assertive
 * announcements at once; assertive updates may clear each other's queue, so the
 * user hears some subset, in no guaranteed order, while their focus is somewhere
 * else entirely. One summary, one focus move, one reading order.
 *
 * A summary also carries what a per-field announcement cannot: **how many** errors
 * there are, and a route to each one.
 *
 * ## Usage
 *
 *   <esa-error-summary id="summary"></esa-error-summary>
 *
 *   const summary = document.getElementById('summary');
 *   summary.errors = [
 *     { field: 'email', message: 'Enter an email address' },
 *     { field: 'age',   message: 'Age must be a number' },
 *   ];
 *   summary.focus();   // ← the announcement. Call it on failed submit.
 *
 * Renders nothing when `errors` is empty, so it is safe to leave in the DOM.
 * Unlike a live region it does not need to pre-exist its content — nothing is
 * being observed for mutations.
 */
export class EsaErrorSummary extends LitElement {
  static properties = {
    errors: { type: Array },
    heading: { type: String },
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  declare errors: EsaFieldError[];
  /** Heading text. The error count is appended for you — do not put it here. */
  declare heading: string;
  /**
   * Which heading element to render (2–6).
   *
   * A summary sits inside a form, under whatever heading introduces that form, so
   * `h2` is right far more often than not — but heading order is a document-level
   * concern the component cannot see, and skipping a level is its own failure
   * (SC 1.3.1). Set it to match the page.
   */
  declare headingLevel: number;

  constructor() {
    super();
    this.errors = [];
    this.heading = 'There is a problem';
    this.headingLevel = 2;
  }

  private get valid(): EsaFieldError[] {
    return (this.errors ?? []).filter((e) => e && String(e.message ?? '').trim());
  }

  /**
   * Move focus to the summary. This IS the announcement — call it after a failed
   * submit, once, as an immediate response to the user's action.
   *
   * No-op when there are no errors, so a submit handler can call it unconditionally
   * without stranding focus on an empty box.
   */
  focus(options?: FocusOptions): void {
    if (this.valid.length === 0) return;
    // updateComplete, because on the first failed submit the errors are set and
    // focus() called in the same tick — the root does not exist yet.
    void this.updateComplete.then(() => {
      const root = this.renderRoot.querySelector<HTMLElement>('.root');
      root?.focus(options);
    });
  }

  private onLinkClick = (event: Event, field: string): void => {
    event.preventDefault();
    // getRootNode(), not `document` — the summary may itself be inside a shadow
    // root (a spoke's own form component), and the fields would be in that same
    // root, not the main document.
    const root = this.getRootNode() as Document | ShadowRoot;
    const target = root.getElementById?.(field) ?? document.getElementById(field);
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // The form components override focus() to forward into their shadow root; a
    // native control focuses itself. Neither needs a cross-root reference.
    (target as HTMLElement).focus?.({ preventScroll: true });
  };

  render() {
    const errors = this.valid;
    if (errors.length === 0) return nothing;

    const count = errors.length;
    // The count is inside the heading so it is announced when focus lands here —
    // it is the single most useful thing the user can be told at this moment, and
    // a separate paragraph below the heading would not be read on focus.
    const headingText = `${this.heading} — ${count} error${count === 1 ? '' : 's'}`;
    const level = Math.min(6, Math.max(2, Number(this.headingLevel) || 2));

    return html`
      <div
        class="root"
        tabindex="-1"
        role="group"
        aria-labelledby="heading"
      >
        ${this.alertIcon()}
        <div class="body">
          ${this.renderHeading(level, headingText)}
          <ul class="list">
            ${errors.map(
              (e) => html`<li class="item">
                ${e.field
                  ? html`<a
                      class="link"
                      href="#${e.field}"
                      @click=${(ev: Event) => this.onLinkClick(ev, e.field as string)}
                      >${e.message}</a
                    >`
                  : html`<span class="text">${e.message}</span>`}
              </li>`,
            )}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Lit cannot interpolate a TAG NAME, so the levels are written out. Six static
   * templates beats `unsafeStatic`, which would pull in another directive and open
   * an injection surface for a value that only ever comes from this component.
   */
  private renderHeading(level: number, text: string) {
    const cls = 'heading typography-label-md-strong';
    switch (level) {
      case 3: return html`<h3 id="heading" class=${cls}>${text}</h3>`;
      case 4: return html`<h4 id="heading" class=${cls}>${text}</h4>`;
      case 5: return html`<h5 id="heading" class=${cls}>${text}</h5>`;
      case 6: return html`<h6 id="heading" class=${cls}>${text}</h6>`;
      default: return html`<h2 id="heading" class=${cls}>${text}</h2>`;
    }
  }

  private alertIcon() {
    return html`<span class="icon" aria-hidden="true"
      ><svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg></span
    >`;
  }

  static styles = [
    typography,
    a11y,
    css`
      :host {
        display: block;
      }

      .root {
        display: flex;
        gap: var(--spacing-300, 0.75rem);
        padding: var(--spacing-400, 1rem);
        border: var(--error-summary-border-width, var(--border-width-200, 2px)) solid
          var(--error-summary-border-color, var(--color-border-utility-danger, #fdbdbe));
        border-radius: var(--error-summary-radius, var(--radius-md, 0.5rem));
        background: var(--error-summary-bg, var(--color-background-utility-danger-subtle, #fff7f7));
        color: var(--color-content-default, #202020);
      }

      /* It takes focus programmatically, so the ring has to be visible when it does
         — this is one of the few places where :focus (not :focus-visible) is right.
         A user sent here by a failed submit did not "click" anything, and
         :focus-visible heuristics can decide not to paint. Losing the ring here
         means the user is moved somewhere with no indication of where. */
      .root:focus {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
        outline-offset: var(--focus-ring-offset, 2px);
      }

      .icon {
        flex: none;
        display: inline-flex;
        color: var(--error-summary-icon-color, var(--color-content-utility-danger, #ce2c31));
      }

      .body {
        min-width: 0;
      }

      .heading {
        margin: 0;
        color: var(--error-summary-heading-color, var(--color-content-utility-danger, #ce2c31));
      }

      .list {
        margin: var(--spacing-200, 0.5rem) 0 0;
        padding-inline-start: var(--spacing-400, 1rem);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-100, 0.25rem);
      }

      .link {
        color: inherit;
        /* Underlined, not colour-only: these sit on a tinted danger ground where a
           colour shift alone would be the SC 1.4.1 failure. */
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .link:hover {
        text-decoration-thickness: 2px;
      }
      .link:focus-visible {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #46a758);
        outline-offset: var(--focus-ring-offset, 2px);
      }
    `,
  ];
}

if (!customElements.get('esa-error-summary')) {
  customElements.define('esa-error-summary', EsaErrorSummary);
}
