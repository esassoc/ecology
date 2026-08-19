/*
 * Ecology — shared focus helpers for overlays.
 *
 * ## WHAT THIS IS AND IS NOT
 *
 * This file was written on 2026-08-18 to hold a hand-rolled modal implementation —
 * `inert` on background content, a focus trap, capture-and-restore — because the kit's
 * six modal overlays were `position: fixed` divs that simulated modality and got it
 * wrong. **In the same window they were all migrated onto native `<dialog>` +
 * `showModal()`, which does every one of those things properly**, so that machinery was
 * deleted before it ever shipped. What survives is the part `showModal()` does not give
 * you and the NON-modal overlays still need: menus, popovers, tooltips and anchored
 * dropdowns, which must never inert the page behind them.
 *
 * If you are building a MODAL, do not import from here. Use `<dialog>` and
 * `showModal()`, and read `esa-dialog.ts` — it is the reference, including the Safari
 * `closedby` fallback and the accessible-name strategy.
 *
 * ## WHY THESE FOUR
 *
 * The focusable-element selector was copy-pasted FOUR times and had already drifted:
 * one copy dropped `:not([disabled])` from `select` and `textarea`, so a disabled
 * control in a drawer was a tab stop that the identical control in a dialog was not.
 * Nobody noticed for months, and the reason is worth keeping: **a focus trap that is
 * slightly wrong is invisible.** Focus still moves. It just moves somewhere you did not
 * mean, and no build, no type and no axe run has an opinion about that.
 *
 * `deepActiveElement()` exists because `document.activeElement` RETARGETS to the shadow
 * host when focus is inside a shadow root. Capturing it and restoring to it puts focus
 * on the wrapper rather than the control the user was in — which is silent, because the
 * wrapper usually is focusable enough to look like it worked.
 *
 * ## USAGE — a non-modal overlay
 *
 *   import { deepActiveElement, restoreFocus } from '../overlay.js';
 *
 *   private opener: HTMLElement | null = null;
 *   private openMenu(): void { this.opener = deepActiveElement(); ... }
 *   private closeMenu(): void { ...; restoreFocus(this.opener); this.opener = null; }
 */

/**
 * The one focusable-element selector in the kit.
 *
 * `[tabindex]:not([tabindex="-1"])` covers custom widgets that opted into the tab order;
 * `-1` is deliberately excluded, because a programmatic focus target is not a tab stop.
 */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isVisible = (el: HTMLElement): boolean =>
  el.offsetParent !== null || getComputedStyle(el).position === 'fixed';

/**
 * Focusable elements inside `root`, in tab order.
 *
 * Crosses BOTH boundaries the naive version misses. `<slot>` elements are resolved to
 * their assigned light-DOM content, and a host element that is not itself focusable is
 * descended into — so a dialog whose only controls are `esa-text-field`s finds their
 * inner `<input>`s instead of finding nothing at all. The per-component versions this
 * replaced queried the shadow root and the host's children separately, concatenated the
 * two, and therefore reported them out of document order.
 *
 * A host that IS focusable (it declared a `tabindex`) is taken as its own tab stop and
 * not descended into, which approximates `delegatesFocus`. A closed shadow root is
 * invisible to any script and is skipped.
 */
export function focusableWithin(root: Element | ShadowRoot): HTMLElement[] {
  const out: HTMLElement[] = [];

  const collect = (scope: Element | ShadowRoot): void => {
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>('*'))) {
      if (el.localName === 'slot') {
        for (const assigned of (el as unknown as HTMLSlotElement).assignedElements({ flatten: true })) {
          if (assigned.matches(FOCUSABLE_SELECTOR)) out.push(assigned as HTMLElement);
          else collect(assigned);
        }
        continue;
      }
      if (el.matches(FOCUSABLE_SELECTOR)) out.push(el);
      else if (el.shadowRoot) collect(el.shadowRoot);
    }
  };

  collect(root);
  return out.filter(isVisible);
}

/**
 * The element that really has focus.
 *
 * `document.activeElement` returns the shadow HOST when focus is inside a shadow root, so
 * capturing it and restoring to it puts focus on the wrapper rather than the control the
 * user was actually in. The three hand-rolled dialogs all did exactly that, which is one
 * of the four things `showModal()` fixed by tracking the real node itself.
 */
export function deepActiveElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.activeElement as HTMLElement | null;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement as HTMLElement;
  }
  return el;
}

/**
 * Focus `el` and report whether it took.
 *
 * It VERIFIES rather than assumes, because the commonest way this fails is silent:
 * `.focus()` on a detached, `inert`, or modal-blocked element does nothing at all and
 * focus falls to `<body>`. Note that a modal `<dialog>` blocks everything outside itself
 * WITHOUT setting the `inert` IDL attribute — measured false in Chromium, Firefox and
 * WebKit — so there is no property to test first. A boolean lets a caller fall back
 * deliberately instead of stranding the user.
 */
export function restoreFocus(el: HTMLElement | null): boolean {
  if (!el?.isConnected) return false;
  el.focus?.();
  return deepActiveElement() === el;
}

/** Focus `initial` if given, else the first focusable in `root`, else `fallback`. */
export function focusFirstWithin(
  root: Element | ShadowRoot,
  opts: { initial?: HTMLElement | null; fallback?: HTMLElement | null } = {},
): boolean {
  if (opts.initial && restoreFocus(opts.initial)) return true;
  const items = focusableWithin(root);
  if (items.length && restoreFocus(items[0])) return true;
  return restoreFocus(opts.fallback ?? null);
}

