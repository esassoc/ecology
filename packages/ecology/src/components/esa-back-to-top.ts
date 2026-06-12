import { LitElement, html, css } from 'lit';

/**
 * esa-back-to-top — interactive (Lit Web Component).
 *
 * Why a Web Component (not .astro): it owns runtime behavior — a passive scroll
 * listener that shows/hides the button past a threshold, and click-to-scroll-to-top.
 * As a custom element it works in any stack.
 *
 * Faithful translation of the Angular esa-back-to-top:
 *   - signal inputs (threshold, smoothScroll, scrollTarget) → Lit reactive properties
 *   - runOutsideAngular scroll handler                     → plain passive listener
 *   - visible() host class                                 → reflected `visible` attr
 *   - scrollToTop()                                        → same logic
 *
 * Decorator-free on purpose (no per-consumer tsconfig decorator flags). Not a form
 * control, so no ElementInternals. Tokens reach inside shadow DOM via CSS inheritance.
 */
export class EsaBackToTop extends LitElement {
  static properties = {
    threshold: { type: Number },
    smoothScroll: { type: Boolean, attribute: 'smooth-scroll' },
    scrollTarget: { attribute: false },
    visible: { type: Boolean, reflect: true },
  };

  declare threshold: number;
  declare smoothScroll: boolean;
  declare scrollTarget: HTMLElement | null;
  declare visible: boolean;

  private scrollHandler: (() => void) | null = null;

  constructor() {
    super();
    this.threshold = 300;
    this.smoothScroll = true;
    this.scrollTarget = null;
    this.visible = false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.scrollHandler = () => {
      const target = this.scrollTarget;
      const scrollTop = target
        ? target.scrollTop
        : window.scrollY || document.documentElement.scrollTop;
      const shouldShow = scrollTop > this.threshold;
      if (shouldShow !== this.visible) {
        this.visible = shouldShow;
      }
    };
    const target: HTMLElement | Window = this.scrollTarget || window;
    target.addEventListener('scroll', this.scrollHandler, { passive: true });
    // Evaluate once on connect in case the page is already scrolled.
    this.scrollHandler();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.scrollHandler) {
      const target: HTMLElement | Window = this.scrollTarget || window;
      target.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }

  private scrollToTop = (): void => {
    const behavior: ScrollBehavior = this.smoothScroll ? 'smooth' : 'auto';
    const target = this.scrollTarget;
    if (target) {
      target.scrollTo({ top: 0, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  };

  render() {
    return html`
      <button
        class="button"
        part="button"
        type="button"
        aria-label="Back to top"
        @click=${this.scrollToTop}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 7-7 7 7"></path>
          <path d="M12 19V5"></path>
        </svg>
      </button>
    `;
  }

  static styles = css`
    :host {
      --_btt-size: var(--back-to-top-size, 44px);
      --_btt-bg: var(--back-to-top-bg, var(--color-primary, #43608a));
      --_btt-text: var(--back-to-top-text, var(--color-text-inverse, #fff));
      --_btt-shadow: var(--shadow-300, 0 6px 24px -6px rgba(0, 0, 0, 0.07));
      --_btt-radius: var(--back-to-top-radius, var(--radius-full, 9999px));
      --_btt-bottom: var(--back-to-top-bottom, var(--spacing-500, 1.5rem));
      --_btt-right: var(--back-to-top-right, var(--spacing-500, 1.5rem));

      position: fixed;
      bottom: var(--_btt-bottom);
      right: var(--_btt-right);
      z-index: var(--z-sidebar, 100);
      pointer-events: none;
      opacity: 0;
      transform: translateY(16px);
      transition: opacity var(--transition-base, 200ms ease),
                  transform var(--transition-base, 200ms ease);
    }

    :host([visible]) {
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0);
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_btt-size);
      height: var(--_btt-size);
      border: none;
      border-radius: var(--_btt-radius);
      background: var(--_btt-bg);
      color: var(--_btt-text);
      box-shadow: var(--_btt-shadow);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms ease),
                  box-shadow var(--transition-fast, 150ms ease),
                  transform var(--transition-fast, 150ms ease);
    }

    .button:hover {
      background: var(--color-primary-hover, #39506f);
      box-shadow: var(--shadow-400, 0 8px 32px -8px rgba(0, 0, 0, 0.08));
    }

    .button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #43608a);
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .button:active {
      transform: scale(0.95);
    }
  `;
}

if (!customElements.get('esa-back-to-top')) {
  customElements.define('esa-back-to-top', EsaBackToTop);
}
