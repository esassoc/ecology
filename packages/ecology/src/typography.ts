import { unsafeCSS, type CSSResult } from 'lit';
import { typographyCss } from '@esa/tokens/typography-styles.js';

/**
 * The composite typography classes, for use inside a shadow root.
 *
 * A component names a ROLE — `class="typography-label-md"` — it does not list a
 * family, a size, a weight, a line-height and a letter-spacing. Referencing the five
 * property tokens separately is the same assembling-at-the-call-site problem wearing
 * a better disguise: it still lets a component take four of the five and invent the
 * fifth, which is how the vocabulary stops meaning anything.
 *
 * Global classes do not cross a shadow boundary; custom properties do. So Lit
 * components pull the class definitions in here, and the Astro half uses the same
 * class names from `@esa/tokens/typography.css`. One vocabulary, two delivery
 * mechanisms, no duplicated definitions — the string is generated from
 * `packages/tokens/src/typography.css` at build time.
 *
 *   static styles = [typography, css`
 *     .row { display: flex; }
 *   `];
 *
 * Put `typography` FIRST so a component's own rules win on equal specificity.
 */
export const typography: CSSResult = unsafeCSS(typographyCss);
