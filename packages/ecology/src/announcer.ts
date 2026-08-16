/**
 * The announcer — the kit's ONLY ARIA live regions.
 *
 * Two of them, in the light DOM, appended to <body> the first time anything calls
 * `announce()`. Every status message in the kit goes through here.
 *
 * ## Why a singleton, and why light DOM
 *
 * Three separate problems collapse into one solution.
 *
 * 1. **A live region has to pre-exist its content.** A region created in the same
 *    tick as the text it holds is routinely not announced at all — the browser has
 *    to have the element in the accessibility tree and under observation BEFORE the
 *    mutation happens. A singleton that mounts once and is then only ever mutated
 *    is the shape that satisfies this without every caller having to think about it.
 *
 * 2. **Live regions interfere with each other.** Assertive updates may clear the
 *    queue of polite ones; several regions on a page routinely means some messages
 *    are announced twice and others not at all. The accepted ceiling is about two —
 *    one polite, one assertive — which is exactly what this file owns. A component
 *    that mints its own region is not adding a feature, it is degrading everyone
 *    else's.
 *
 * 3. **Shadow boundaries.** This is a web-component kit, so the naive version puts
 *    a region inside each component's shadow root, and live-region observation
 *    across a shadow boundary is unreliable (worst in Safari/VoiceOver, and worse
 *    again when the text is two roots deep, which is exactly the toast's shape:
 *    container root → item root → text).
 *
 * Light DOM sidesteps (3) completely, and it does so WITHOUT needing a cross-root
 * reference — which matters, because measured behaviour is that IDREFs never cross
 * a shadow boundary in any engine. A Lit component does not point at this region;
 * it imports the function and the function sets `.textContent`. Mutating a
 * light-DOM node's text is the one mechanism with no boundary problem at all.
 *
 * ## Why this is a last resort, not the default tool
 *
 * Live region announcements are transient: they cannot be replayed, reviewed, or
 * revealed later. If the user misses one, it is gone. They also convey no structure
 * — a button inside a live region announces as bare text with no hint that it is a
 * button, and there is no mechanism for the user to navigate to it.
 *
 * So before reaching for this, in order:
 *
 *   1. **An instructional cue.** "Results filter as you type" as an
 *      `aria-describedby` on the input sets the expectation once and needs no
 *      announcement at all. This is what the six filtering components use.
 *   2. **Moving focus.** A change of context is already surfaced by assistive tech
 *      and is out of scope for SC 4.1.3 entirely. An error summary that takes focus
 *      beats five fields announcing at once; a heading that takes focus beats
 *      announcing a result count.
 *   3. **An ARIA state attribute.** `aria-expanded`, `aria-pressed`, `aria-checked`,
 *      `aria-valuenow` — if a state property says it, do not also announce it.
 *   4. **Then, and only then, this.**
 *
 * If a message contains a control the user may need to act on, it is not a status
 * message and does not belong here — it is a dialog. Use `esa-dialog`.
 *
 * ## Usage
 *
 *   import { announce } from '@esa/ecology/announcer';
 *
 *   announce('3 files uploaded');                          // polite
 *   announce('No results found', { assertive: true });     // interrupts
 *
 * @see plugins/spoke-kit/skills/accessibility/status-messages.md
 */

/** How long a message stays in the region before it is cleared. */
const CLEAR_AFTER_MS = 350;

/**
 * Gap between clearing and writing when the SAME text is announced twice in a row.
 *
 * Setting `textContent` to a string it already holds is not a mutation, so nothing
 * is announced — which is how "5 files rejected" twice in a row reports once. The
 * fix is to clear, yield, then write. One frame is not enough on every engine;
 * ~100ms is the interval that survives testing.
 */
const REPEAT_GAP_MS = 100;

interface AnnouncerRegions {
  polite: HTMLElement;
  assertive: HTMLElement;
}

let regions: AnnouncerRegions | null = null;

/** Pending clear/write timers, per politeness, so rapid calls don't interleave. */
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * The clip-rect, inline.
 *
 * `.visually-hidden` from `@esa/tokens/a11y.css` is the canonical definition and a
 * component inside a shadow root pulls it in via `../a11y.js`. This node is in the
 * LIGHT DOM of a host page that may not have imported that stylesheet — and a live
 * region that is `display: none` is not announced at all, so failing open here is
 * not an option. These are the same declarations; the comment on the source file
 * explains why each one is load-bearing.
 */
function hide(el: HTMLElement): void {
  el.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;' +
    'overflow:hidden;white-space:nowrap;clip:rect(0 0 0 0);clip-path:inset(50%);';
}

function ensureRegions(): AnnouncerRegions | null {
  // SSR / prerender: Astro renders these components on the server, where there is
  // no document. Returning null makes announce() a no-op rather than a build error.
  if (typeof document === 'undefined') return null;
  if (regions && regions.polite.isConnected && regions.assertive.isConnected) {
    return regions;
  }

  const make = (live: 'polite' | 'assertive', role: 'status' | 'alert') => {
    const el = document.createElement('div');
    el.setAttribute('aria-live', live);
    // The role is redundant with aria-live on paper — status implies polite, alert
    // implies assertive — but some AT paths key off the role and others off the
    // attribute, and stating both costs nothing. aria-atomic is explicit for the
    // same reason: it is status's implicit value, but log's is false, and relying
    // on an implicit value nobody can see in the DOM is how this drifts.
    el.setAttribute('role', role);
    el.setAttribute('aria-atomic', 'true');
    el.dataset.esaAnnouncer = live;
    hide(el);
    document.body.appendChild(el);
    return el;
  };

  regions = { polite: make('polite', 'status'), assertive: make('assertive', 'alert') };
  return regions;
}

/**
 * Mount the live regions without announcing anything.
 *
 * Optional — `announce()` mounts them itself. Worth calling once at app start if
 * the first announcement happens very early, since a region that mounts and mutates
 * in the same tick is the case that does not announce. Idempotent.
 */
export function initAnnouncer(): void {
  ensureRegions();
}

export interface AnnounceOptions {
  /**
   * Interrupt the user instead of waiting for a pause.
   *
   * Assertive stops a screen reader mid-sentence and does NOT resume where it left
   * off, which can strand the user. Reserve it for the cases where waiting costs
   * them something: a query that returned nothing, a rejected file, a failed save.
   * Success and progress are polite.
   */
  assertive?: boolean;
}

/**
 * Announce a status message.
 *
 * The message is composed by the caller and written in ONE mutation — do not build
 * it up across several calls, or a screen reader may announce each fragment
 * separately. Keep it short: it cannot be replayed, so it has to land the first
 * time. Text only; markup here conveys nothing.
 *
 * Empty/whitespace messages are ignored rather than clearing the region, so a
 * caller can pass a possibly-empty error string without special-casing it.
 */
export function announce(message: string, options: AnnounceOptions = {}): void {
  const text = String(message ?? '').trim();
  if (!text) return;

  const mounted = ensureRegions();
  if (!mounted) return;

  const region = options.assertive ? mounted.assertive : mounted.polite;

  const pending = timers.get(region);
  if (pending) clearTimeout(pending);

  // Clear first, always. Two reasons: an identical repeat is not a mutation and
  // would be silent (see REPEAT_GAP_MS), and leaving stale text in the region lets
  // a screen reader user navigate to a message that is no longer on screen.
  region.textContent = '';

  timers.set(
    region,
    setTimeout(() => {
      region.textContent = text;
      timers.set(
        region,
        setTimeout(() => {
          region.textContent = '';
        }, CLEAR_AFTER_MS),
      );
    }, REPEAT_GAP_MS),
  );
}

/**
 * Tear down the live regions. Test helper — nothing in the kit calls this.
 */
export function resetAnnouncer(): void {
  regions?.polite.remove();
  regions?.assertive.remove();
  regions = null;
}
