/**
 * Re-export shim. THE PARSERS MOVED INTO `@esa/docs` (2026-08-19).
 *
 * They had to: the generated API table is now a package component
 * (`@esa/docs/ApiTable.astro`) so SPOKES can render it, and a package cannot
 * reach up into the hub's `scripts/` for half its implementation. The parsers
 * are pure — no `node:` imports, no filesystem — so moving them costs nothing.
 *
 * This file stays because three test files import it by relative path
 * (`./component-api.mjs`), and because `angular-snippet.mjs`'s JSDoc types
 * reference it. One implementation, two names; there is no second copy.
 */
export * from '../../packages/docs/src/component-api-parse.mjs';
