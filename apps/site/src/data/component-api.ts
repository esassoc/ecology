/**
 * Re-export shim. THE MODULE MOVED INTO `@esa/docs` (2026-08-19).
 *
 * It had to move so that SPOKES can render the generated API table: a spoke
 * installs `@esa/docs` and `@esa/ecology`, never this site app, so anything
 * living here was unreachable and every spoke page fell back to a hand-written
 * table — the exact drift the generated table exists to end.
 *
 * This file stays because three modules here import it by relative path, and
 * because the path is named in several comments. One implementation.
 */
export type { ApiProp, ComponentApi } from '@esa/docs/component-api';
export { componentApi, COMPONENTS, ELEMENTS, isCustomElement, reportApiDrift } from '@esa/docs/component-api';
