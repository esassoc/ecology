// Read a spoke's prototype registry without importing it (it is TypeScript, and the
// pipeline stays dep-free). Registries are GROUPED: a group carries a slug but no
// route, and only its nested pages carry both. So rows are not paired positionally;
// fields are walked in document order and every `route:` closes a row with the most
// recent `slug:` before it. Inside a page object `slug:` precedes `route:`, and a
// group's own slug is overwritten by its first page's slug before any route reads it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A single- or double-quoted string literal, escapes allowed ('Andy\'s').
const STR = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const FIELD = new RegExp(String.raw`\b(slug|title|description|route):\s*(?:${STR})`, 'g');
const unescape = (s) => s.replace(/\\(.)/g, '$1');

/**
 * @typedef {{slug:string, title:string, description:string, route:string}} Prototype
 * @param {string} source Registry source text.
 * @returns {Prototype[]}
 */
export function parseRegistry(source) {
  const rows = [];
  let pending = {};
  for (const m of source.matchAll(FIELD)) {
    const value = unescape(m[2] ?? m[3] ?? '');
    if (m[1] === 'slug') pending = { slug: value };
    else if (m[1] !== 'route') pending[m[1]] = value;
    else if (pending.slug) {
      rows.push({ slug: pending.slug, title: pending.title || pending.slug, description: pending.description || '', route: value });
      pending = {}; // each route consumes its slug, so nothing pairs twice
    }
  }
  return rows;
}

export function readRegistry(cfg) {
  return parseRegistry(readFileSync(join(cfg.root, cfg.registry), 'utf8'));
}

// The runtime inspector finds a route's bundle by deriving the slug FROM THE URL
// PATH (base stripped, slashes trimmed, remaining slashes to dashes; see
// inspector.client.ts routeSlug()). The bundle directory must equal that string or
// the inspector 404s. A query (`?aldo`) is not part of it.
export const bundleSlug = (route) => route.split('?')[0].replace(/^\/+|\/+$/g, '').replace(/\//g, '-');

/** The route as a path under the base, query kept: `prototypes/actions/`. */
export const routePath = (route) => {
  const [path, query] = route.split('?');
  return `${path.replace(/^\/+|\/+$/g, '')}/${query !== undefined ? `?${query}` : ''}`;
};
