// `nothing` (not undefined) is what REMOVES an attribute — see esa-dialog's import.
import { LitElement, html, css, nothing } from 'lit';
import { typography } from '../typography.js';
// The focusable selector and focus restore come from the ONE module that owns them.
// The local copy that lived here until 2026-08-18 had dropped every :not([disabled])
// clause, so a DISABLED slotted button resolved as the trigger.
import { FOCUSABLE_SELECTOR, deepActiveElement, restoreFocus } from '../overlay.js';
import { boolish } from '../boolish.js';

type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * esa-popover — click/hover anchored popover [wc].
 *
 * Faithful translation of the Angular esaPopover directive + popover content
 * component (which used @angular/cdk/overlay). Reimplemented with plain CSS/JS:
 * the trigger goes in the default slot, the floating content in slot="content".
 * Positioning is done by measuring the trigger and the host (both share a
 * relatively-positioned wrapper) — no CDK, no floating-ui.
 *
 * Inputs preserved: position (top|bottom|left|right), trigger (click|hover),
 * has-arrow, offset. Click mode closes on outside-click + Esc; hover mode opens
 * after a 200ms delay (matching the Angular directive).
 */
export class EsaPopover extends LitElement {
  static properties = {
    position: { type: String, reflect: true },
    trigger: { type: String },
    hasArrow: { type: Boolean, attribute: 'has-arrow', converter: boolish },
    offset: { type: Number },
    open: { type: Boolean, reflect: true },
    appearance: { type: String, reflect: true },
    label: { type: String },
  };

  declare position: PopoverPosition;
  declare trigger: 'click' | 'hover';
  declare hasArrow: boolean;
  declare offset: number;
  declare open: boolean;
  /**
   * Accessible name for the popover. When set, the panel is exposed as a `dialog`;
   * when not, it carries NO role and is announced as the plain content it is.
   *
   * It used to be an unconditional `role="dialog"` with no name at all, which is
   * worse than no role: a screen reader announces "dialog" and then has nothing to
   * say about it, and the role promises focus management this non-modal popover
   * does not implement. A role you cannot name is a role you should not claim.
   */
  declare label: string;
  /** Aligned to Beacon's PopoverAppearance: light surface vs dark inverse. */
  declare appearance: 'default' | 'inverse';

  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.position = 'bottom';
    this.trigger = 'click';
    this.hasArrow = true;
    this.offset = 8;
    this.open = false;
    this.appearance = 'default';
    this.label = '';
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.onDocumentClick, true);
    // BOTH document listeners, not just the click one. show() binds a capture-phase
    // keydown on `document` and only hide() unbinds it — so a popover removed while
    // OPEN (a route change, a conditional render, a list re-key) left a listener on the
    // document holding a reference to a detached element, still swallowing Escape with
    // preventDefault() for the rest of the session. Unbinding is cheap and unbinding
    // something that was never bound is a no-op, so neither needs an `if (this.open)`.
    document.removeEventListener('keydown', this.onDocumentKeydown, true);
    if (this.showTimeout) clearTimeout(this.showTimeout);
  }

  private show(): void {
    if (this.open) return;
    this.open = true;
    if (this.trigger === 'click') {
      document.addEventListener('click', this.onDocumentClick, true);
    }
    // SC 1.4.13 requires hoverable/persistent content to be dismissible without
    // moving the pointer. The old Escape handler sat on the anchor wrapper, so it
    // only fired if focus happened to be in there — which for trigger="hover" it
    // never was. A document-level listener is the only thing that covers both.
    document.addEventListener('keydown', this.onDocumentKeydown, true);
  }

  private hide(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('click', this.onDocumentClick, true);
    document.removeEventListener('keydown', this.onDocumentKeydown, true);
    // Focus return, but ONLY if focus is currently inside — this is a non-modal
    // popover, so yanking focus back from wherever the user has since moved to
    // would be the bug, not the fix.
    const active = deepActiveElement();
    if (active && (this.contains(active) || (this.renderRoot as ShadowRoot).contains(active))) {
      restoreFocus(this.triggerEl);
    }
  }

  /**
   * The slotted trigger — this component renders only a wrapper around <slot>.
   * Resolves THROUGH a wrapper to the control that actually takes focus: esa-button
   * renders <span class="esa-button"><button class="esa-button__native">, and
   * putting aria-expanded on the span would announce from an element no screen
   * reader reads it from.
   */
  private get triggerEl(): HTMLElement | null {
    const slot = (this.renderRoot as ShadowRoot).querySelector('slot:not([name])');
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    const outer = assigned.find((el) => el instanceof HTMLElement) as HTMLElement | undefined;
    if (!outer) return null;
    if (outer.matches(FOCUSABLE_SELECTOR)) return outer;
    return outer.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? outer;
  }

  /**
   * The trigger had no popup semantics: no aria-expanded, no aria-controls, no
   * aria-haspopup. Open and closed sounded identical. Applied to the slotted node
   * on every update, since `open` is part of what is being announced.
   */
  private syncTrigger(): void {
    const el = this.triggerEl;
    if (!el) return;
    el.setAttribute('aria-expanded', String(this.open));
    if (this.label) el.setAttribute('aria-haspopup', 'dialog');
    // NO aria-controls, and it cannot be added. The trigger is slotted LIGHT DOM and
    // the panel is in this component's SHADOW ROOT, and an IDREF never crosses a
    // shadow boundary in any engine — measured 2026-08-18: `aria-controls="popover"`
    // shipped here and resolved to nothing at all, in both states. Closed, the panel
    // is not rendered; open, it is in a tree scope the attribute cannot see. A
    // dangling IDREF is not merely inert, it is worse than the omission: it reads in
    // source review as a relationship that exists.
    //
    // aria-expanded and aria-haspopup carry no IDREF, so they do work, and between
    // them the trigger announces that it opens something and whether it is open. The
    // relationship itself is what this architecture cannot express.
  }

  updated(): void {
    this.syncTrigger();
  }

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.hide();
    }
  };

  private onTriggerClick = (): void => {
    if (this.trigger !== 'click') return;
    this.open ? this.hide() : this.show();
  };

  private onMouseEnter = (): void => {
    if (this.trigger !== 'hover') return;
    this.showTimeout = setTimeout(() => this.show(), 200);
  };

  private onMouseLeave = (): void => {
    if (this.trigger !== 'hover') return;
    this.cancelPending();
    this.hide();
  };

  /**
   * KEYBOARD PARITY FOR trigger="hover" — SC 2.1.1 (Level A), which this failed
   * outright until 2026-08-18: the hover mode wired mouseenter/mouseleave and
   * nothing else, so the content was unreachable without a pointer. focusin/
   * focusout are the keyboard's mouseenter/mouseleave, and they fire for the
   * panel's own contents too (they bubble), which is what keeps the popover open
   * while you Tab through a link inside it.
   *
   * No 200ms delay on the focus path: the delay exists to stop a pointer sweeping
   * across a trigger from flashing it open, and focus does not sweep.
   */
  private onFocusIn = (): void => {
    if (this.trigger !== 'hover') return;
    this.cancelPending();
    this.show();
  };

  private onFocusOut = (event: FocusEvent): void => {
    if (this.trigger !== 'hover') return;
    // Ignore focus moving BETWEEN the trigger and the panel content.
    const next = event.relatedTarget as Node | null;
    if (next && this.contains(next)) return;
    this.cancelPending();
    this.hide();
  };

  private cancelPending(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  private onDocumentClick = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node) && event.target !== this) {
      this.hide();
    }
  };

  // The anchor-scoped Escape handler that used to live here is now
  // onDocumentKeydown, bound only while open — see show(). It only ever fired when
  // focus was inside the anchor, which for trigger="hover" was never.

  render() {
    return html`
      <div
        class="esa-popover-anchor typography-label-md"
        @click=${this.onTriggerClick}
        @mouseenter=${this.onMouseEnter}
        @mouseleave=${this.onMouseLeave}
        @focusin=${this.onFocusIn}
        @focusout=${this.onFocusOut}
      >
        <slot></slot>
        ${this.open
          ? html`
              <div
                class="esa-popover esa-popover--${this.position}"
                id="popover"
                role=${this.label ? 'dialog' : nothing}
                aria-label=${this.label || nothing}
                style="--_offset: ${this.offset}px"
              >
                ${this.hasArrow
                  ? html`<div class="esa-popover__arrow esa-popover__arrow--${this.position}"></div>`
                  : null}
                <div class="esa-popover__body typography-body-md"><slot name="content"></slot></div>
              </div>
            `
          : null}
      </div>
    `;
  }

  /* `typography` FIRST so this component's own rules win on equal specificity — it
     carries the .typography-* composite classes across the shadow boundary. */
  static styles = [
    typography,
    css`
    :host {
      --_popover-bg: var(--color-background-elevation-raised, #fcfcfc);
      --_popover-border: var(--color-border-default, #cecece);
      --_popover-shadow: var(--elevation-4, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      --_popover-radius: var(--radius-md, 0.5rem);
      --_popover-padding: var(--spacing-300, 0.75rem);
      --_popover-arrow-size: 8px;
      --_popover-color: var(--color-content-default, #202020);
      display: inline-block;
    }

    /* Knocked-out appearance (Beacon PopoverAppearance='inverse'): dark panel,
       light text — for documentation/help content. Overriding the private
       bg/border tokens re-skins both the panel and the arrow, which carries the
       same border and kills one side per position.

       THE BORDER USED TO BE THE BACKGROUND — a workaround, not a choice. There
       was no knocked-out border token, and the only alternative was
       --color-border-default, which is a hairline built for a light ground and
       vanishes into a near-black panel. Setting border = bg made it invisible on
       purpose. --color-border-default-knockout is the real answer and it flips
       with the theme, so this panel keeps a visible edge in both schemes. */
    :host([appearance='inverse']) {
      --_popover-bg: var(--color-background-default-knockout);
      --_popover-border: var(--color-border-default-knockout, #484848);
      --_popover-color: var(--color-content-default-knockout, #fcfcfc);
    }

    /* label-md is the trigger's default type role — it inherits through the slot
       to whatever is slotted in, and the panel below re-declares its own. */
    .esa-popover-anchor {
      position: relative;
      display: inline-block;
    }

    .esa-popover {
      position: absolute;
      z-index: var(--z-dropdown, 50);
      min-width: max-content;
      max-width: var(--popover-max-width, none);
      background: var(--_popover-bg);
      border: var(--border-width-default, 1px) solid var(--_popover-border);
      border-radius: var(--_popover-radius);
      box-shadow: var(--_popover-shadow);
      animation: esa-popover-fade-in var(--animation-enter, 150ms ease-out);
      font-family: var(--typography-font-family-sans, 'DM Sans', sans-serif);
      color: var(--_popover-color);
    }

    .esa-popover--bottom {
      top: calc(100% + var(--_offset, 8px));
      left: 50%;
      transform: translateX(-50%);
    }
    .esa-popover--top {
      bottom: calc(100% + var(--_offset, 8px));
      left: 50%;
      transform: translateX(-50%);
    }
    .esa-popover--right {
      left: calc(100% + var(--_offset, 8px));
      top: 50%;
      transform: translateY(-50%);
    }
    .esa-popover--left {
      right: calc(100% + var(--_offset, 8px));
      top: 50%;
      transform: translateY(-50%);
    }

    @keyframes esa-popover-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .esa-popover__body {
      padding: var(--_popover-padding);
    }

    .esa-popover__arrow {
      position: absolute;
      width: var(--_popover-arrow-size);
      height: var(--_popover-arrow-size);
      background: var(--_popover-bg);
      border: var(--border-width-default, 1px) solid var(--_popover-border);
      transform: rotate(45deg);
    }
    .esa-popover__arrow--bottom {
      top: calc(var(--_popover-arrow-size) / -2);
      left: 50%;
      margin-left: calc(var(--_popover-arrow-size) / -2);
      border-bottom: none;
      border-right: none;
    }
    .esa-popover__arrow--top {
      bottom: calc(var(--_popover-arrow-size) / -2);
      left: 50%;
      margin-left: calc(var(--_popover-arrow-size) / -2);
      border-top: none;
      border-left: none;
    }
    .esa-popover__arrow--right {
      left: calc(var(--_popover-arrow-size) / -2);
      top: 50%;
      margin-top: calc(var(--_popover-arrow-size) / -2);
      border-top: none;
      border-right: none;
    }
    .esa-popover__arrow--left {
      right: calc(var(--_popover-arrow-size) / -2);
      top: 50%;
      margin-top: calc(var(--_popover-arrow-size) / -2);
      border-bottom: none;
      border-left: none;
    }
  `,
  ];
}

if (!customElements.get('esa-popover')) {
  customElements.define('esa-popover', EsaPopover);
}
