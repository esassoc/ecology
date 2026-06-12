import { LitElement, html, css } from 'lit';
import './esa-snackbar-item';
import type { EsaSnackbarVariant } from './esa-snackbar-item';

export interface EsaSnackbarConfig {
  message: string;
  variant?: EsaSnackbarVariant;
  duration?: number;
  action?: string;
  dismissable?: boolean;
  uniqueKey?: string;
}

interface SnackbarEntry extends EsaSnackbarConfig {
  id: string;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * esa-snackbar-container — toast stack with auto-dismiss [wc].
 *
 * Faithful translation of the Angular esa-snackbar-container + EsaSnackbarService.
 * In Angular the service held a signal of active snackbars and the container
 * rendered esa-snackbar-item for each; here that state lives on the element and
 * is driven through an imperative API that mirrors the service:
 *
 *   container.show({ message, variant, duration, action, dismissable, uniqueKey })
 *   container.success(msg) / .info(msg) / .warning(msg) / .danger(msg)
 *   container.dismiss(id) / .clearAll()
 *
 * Preserved behavior: defaults (info / 5000ms / dismissable), uniqueKey dedupe,
 * auto-dismiss when duration > 0, bottom-right fixed stack (column-reverse so the
 * newest appears at the bottom). Renders <esa-snackbar-item> children and listens
 * for their `action` / `dismiss` events.
 */
export class EsaSnackbarContainer extends LitElement {
  static properties = {
    snackbars: { state: true },
  };

  private snackbars: SnackbarEntry[] = [];
  private nextId = 0;

  /** Show a snackbar. Returns its id. Mirrors EsaSnackbarService.show(). */
  show(config: EsaSnackbarConfig): string {
    const resolved: EsaSnackbarConfig = {
      variant: 'info',
      duration: 5000,
      dismissable: true,
      ...config,
    };

    if (resolved.uniqueKey) {
      const existing = this.snackbars.find((s) => s.uniqueKey === resolved.uniqueKey);
      if (existing) return existing.id;
    }

    const id = `esa-snackbar-${this.nextId++}`;
    const entry: SnackbarEntry = { ...resolved, id, timer: null };

    if (resolved.duration && resolved.duration > 0) {
      entry.timer = setTimeout(() => this.dismiss(id), resolved.duration);
    }

    this.snackbars = [...this.snackbars, entry];
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

  dismiss(id: string): void {
    const entry = this.snackbars.find((s) => s.id === id);
    if (entry?.timer) clearTimeout(entry.timer);
    this.snackbars = this.snackbars.filter((s) => s.id !== id);
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
      <div class="esa-snackbar-container">
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
  `;
}

if (!customElements.get('esa-snackbar-container')) {
  customElements.define('esa-snackbar-container', EsaSnackbarContainer);
}
