import { unsafeCSS, type CSSResult } from 'lit';
import { a11yCss } from '@esa/tokens/a11y-styles.js';

/**
 * The accessibility utilities, for use inside a shadow root.
 *
 * Same mechanism as `./typography.ts` and for the same reason: global classes do not
 * cross a shadow boundary, so a Lit component pulls the definitions in rather than
 * hoping the host page imported them.
 *
 * The one that matters here is `.visually-hidden` — text that must reach a screen
 * reader but not the screen. In this kit that is mostly the "Error:" prefix on a
 * field message: without it, an error line and a help line differ only by COLOUR,
 * which is SC 1.4.1 (Use of Color, Level A). The icon covers sighted users; this
 * covers everyone else.
 *
 *   static styles = [typography, a11y, css`
 *     .error { color: var(--form-error-color); }
 *   `];
 *
 * Order it with `typography` at the front; both are prelude, and a component's own
 * rules should win on equal specificity.
 */
export const a11y: CSSResult = unsafeCSS(a11yCss);
