// Build-time extraction of each component's PUBLIC theming surface — the
// tokens its CSS reads (its `--_*` privates and direct var() uses both pull
// from these). Rendered as the "Theming surface" section on every component
// page, so "what can my spoke re-point?" is answered by the source itself
// and can never drift.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

/** One link in a token's resolution chain. `ref` is a `--token` name except
 *  at the terminus, where it's the raw value (`kind: 'raw'`). */
export interface LineageLink {
  ref: string;
  kind: 'component' | 'semantic' | 'primitive' | 'raw' | 'unknown';
}

export interface ThemingHook {
  token: string;
  /**
   * component/semantic/primitive = declared in the token files.
   * ad-hoc = a hook the component offers via its inline fallback only —
   * legitimate and settable, just not centrally declared.
   * undefined = referenced with NO fallback and declared nowhere — a bug.
   */
  tier: 'component' | 'semantic' | 'primitive' | 'ad-hoc' | 'undefined';
  fallback: string | null;
  /**
   * The token's real resolution chain, walked from its DEFINITION (not its
   * inline fallback): component → semantic → primitive → raw value. This is
   * the actual lineage — what the token points at — vs. `fallback`, which is
   * only the safety-net literal written at the point of use.
   */
  lineage: LineageLink[];
}

// Tier classification: which token file defines it.
const tokensCss = readFileSync(path.join(ROOT, 'packages', 'tokens', 'dist', 'tokens.css'), 'utf8');
const componentCss = readFileSync(path.join(ROOT, 'packages', 'tokens', 'src', 'component-tokens.css'), 'utf8');
const defined = (css: string) => new Set([...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]));
const componentTier = defined(componentCss);
const baseTier = defined(tokensCss);
// Primitives follow the ramp naming (e.g. --color-teal-900, --spacing-400, --radius-200).
const isPrimitive = (t: string) =>
  /^--(color-(gray|teal|blue|green|red|yellow|orange|copper|gold|status)-|spacing-\d|radius-|font-size-|font-weight-|shadow-|z-)/.test(t);

const tier = (t: string, fallback: string | null): ThemingHook['tier'] =>
  componentTier.has(t) ? 'component'
  : baseTier.has(t) ? (isPrimitive(t) ? 'primitive' : 'semantic')
  : fallback ? 'ad-hoc' : 'undefined';

// --- Lineage resolution ----------------------------------------------------
// Map every declared token → its right-hand value, across the component partial
// (--dialog-bg: var(--color-surface-elevated, #fff)) and the compiled base
// (--color-surface-elevated: var(--color-gray-0); --color-gray-0: #ffffff).
// With outputReferences on, the base CSS preserves the var() chain, so we can
// walk it to the raw value.
const parseDefs = (css: string): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!m.has(name)) m.set(name, value.trim()); // first (=:root default) wins
  }
  return m;
};
const defs = new Map([...parseDefs(tokensCss), ...parseDefs(componentCss)]);

const kindOf = (ref: string): LineageLink['kind'] =>
  !ref.startsWith('--') ? 'raw'
  : componentTier.has(ref) ? 'component'
  : isPrimitive(ref) ? 'primitive'
  : baseTier.has(ref) ? 'semantic'
  : 'unknown';

const FIRST_VAR = /var\(\s*(--[a-zA-Z0-9-]+)/;
// Walk a value down its var() references to the terminal raw value. Follows the
// real reference (defs), NOT the inline fallback — the fallback only matters
// when the referenced token is undefined, where the chain stops.
const lineageOf = (start: string | null): LineageLink[] => {
  const chain: LineageLink[] = [];
  const seen = new Set<string>();
  let value: string | undefined = start ?? undefined;
  for (let depth = 0; depth < 12 && value != null; depth++) {
    const ref = value.match(FIRST_VAR);
    if (!ref) { chain.push({ ref: value.trim(), kind: 'raw' }); break; }
    const tok = ref[1];
    if (seen.has(tok)) break; // cycle guard
    seen.add(tok);
    chain.push({ ref: tok, kind: kindOf(tok) });
    if (!defs.has(tok)) break; // referenced but defined nowhere → chain ends
    value = defs.get(tok);
  }
  return chain;
};

export const themingSurface: Record<string, ThemingHook[]> = {};

for (const file of readdirSync(COMPONENTS)) {
  if (!/\.(astro|ts)$/.test(file)) continue;
  const slug = file.replace(/\.(astro|ts)$/, '');
  // Strip comments before scanning — docs prose legitimately mentions
  // `var(--token)` (line comments only when preceded by whitespace, so
  // https:// URLs survive).
  const src = readFileSync(path.join(COMPONENTS, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
  const hooks = new Map<string, string | null>();
  // every var(--public-token[, fallback]) — privates (--_) are internals, skip
  for (const m of src.matchAll(/var\(\s*(--[a-zA-Z][a-zA-Z0-9-]*)\s*(?:,\s*([^();]+|[^()]*\([^()]*\)[^()]*))?\)/g)) {
    const token = m[1];
    if (token.startsWith('--_')) continue;
    let fallback = m[2]?.trim() ?? null;
    // A nested var() fallback is a chain — display the next token, not the
    // (possibly paren-truncated) raw capture.
    if (fallback?.includes('var(')) {
      const next = fallback.match(/--[a-zA-Z][a-zA-Z0-9-]*/)?.[0];
      fallback = next ? `var(${next}, …)` : fallback;
    }
    if (!hooks.has(token)) hooks.set(token, fallback);
  }
  if (!hooks.size) continue;
  // esa-foo.astro + esa-foo.ts both contribute to one slug — merge.
  for (const prior of themingSurface[slug] ?? []) {
    if (!hooks.has(prior.token)) hooks.set(prior.token, prior.fallback);
  }
  themingSurface[slug] = [...hooks.entries()]
    .map(([token, fallback]) => ({
      token,
      tier: tier(token, fallback),
      fallback,
      // Resolve from the token's own definition; ad-hoc tokens (defined nowhere)
      // fall back to walking their inline fallback literal.
      lineage: defs.has(token) ? lineageOf(defs.get(token)!) : lineageOf(fallback),
    }))
    .sort((a, b) => {
      const order = { component: 0, 'ad-hoc': 1, semantic: 2, primitive: 3, undefined: 4 };
      return order[a.tier] - order[b.tier] || a.token.localeCompare(b.token);
    });
}

/** Tokens referenced by components but defined nowhere — a build-time tripwire. */
export const undefinedTokens: { slug: string; token: string }[] = Object.entries(themingSurface)
  .flatMap(([slug, hooks]) =>
    hooks.filter((h) => h.tier === 'undefined' && !h.fallback).map((h) => ({ slug, token: h.token })),
  );
