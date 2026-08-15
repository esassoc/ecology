// Build-time extraction of each component's PUBLIC theming surface — the
// tokens its CSS reads (its `--_*` privates and direct var() uses both pull
// from these). Rendered as the "Theming surface" section on every component
// page, so "what can my spoke re-point?" is answered by the source itself
// and can never drift.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
  /**
   * BLAST RADIUS — the question `tier` can't answer: if I re-point this, what
   * else moves? Tier says which file declares a token; scope says how many
   * components read it. They are NOT the same axis, and conflating them
   * misleads: nearly every tier-3 token `esa-text-field` reads is a `--form-*`
   * shared by a dozen other inputs and buttons, so a "component tier" badge
   * there reads as "your private hook" when it is nothing of the kind.
   *
   * The surface hooks left that family on 2026-08-14 — `--form-bg` became the
   * tier-2 `--color-background-field` — so those rows now correctly show
   * `system` instead. The badge was never wrong about them; the tier was.
   *
   * exclusive = this is the only component that reads it — turn it freely.
   * shared    = a tier-3 token a FAMILY of components reads (see `alsoReadBy`).
   * system    = tier-2/tier-1; re-pointing it moves the whole system.
   */
  scope: 'exclusive' | 'shared' | 'system';
  /** Other components reading this token — populated only when scope=shared. */
  alsoReadBy: string[];
  /** Group surface a shared token belongs to, e.g. `--form-border-color` → `forms`. */
  family: string | null;
  /**
   * The component that OWNS a shared token, when another one declared it —
   * `esa-loading-overlay` reading `--loading-spinner-color`. Distinct from
   * `family`: this is one component borrowing another's hook, which is worth
   * seeing, where a family surface is shared by design.
   */
  ownedBy: string | null;
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

// Which tier declared a token is decided by WHICH DIRECTORY its JSON lives in —
// never by a name pattern. A regex on the name cannot do this job: nothing in
// `--radius-200` (primitive) vs `--radius-surface` (semantic) marks the tier,
// so the old pattern read every `--radius-*` as a primitive and mislabelled the
// semantic shape roles as untouchable on every component doc page. Reading the
// source directories is the same source of truth the token graph uses.
const flattenDtcg = (obj: unknown, trail: string[] = [], out = new Set<string>()) => {
  if (!obj || typeof obj !== 'object') return out;
  const node = obj as Record<string, unknown>;
  if ('$value' in node) {
    out.add(`--${trail.join('-')}`);
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flattenDtcg(child, [...trail, key], out);
  }
  return out;
};

const readTier = (dir: string): Set<string> => {
  const out = new Set<string>();
  const full = path.join(ROOT, 'packages', 'tokens', 'tokens', dir);
  if (!existsSync(full)) return out;
  for (const file of readdirSync(full)) {
    if (!file.endsWith('.json')) continue;
    for (const name of flattenDtcg(JSON.parse(readFileSync(path.join(full, file), 'utf8')))) {
      out.add(name);
    }
  }
  return out;
};

const primitiveSrc = readTier('primitive');
const isPrimitive = (t: string) => primitiveSrc.has(t);

// --- Declared ownership ----------------------------------------------------
// WHICH COMPONENT IS A TIER-3 TOKEN FOR? Not inferable from the component's
// source — a source scan only sees what a component READS, and reading
// `--color-content-primary` is tier-2 working correctly, not a leak. Ownership
// is AUTHORED, in component-tokens.css: the HOOKIFY block groups declarations
// under `/* esa-badge */` comments, and the older top block groups them under
// `/* ===== FORMS ===== */` family headers. We read those markers rather than
// pattern-matching names, for the same reason the tier split reads directories.
export interface TokenOwner {
  /** `esa-badge`, or a family label like `forms`. */
  label: string;
  kind: 'component' | 'family';
}
const OWNER_COMMENT = /^\s*\/\*\s*(esa-[a-z0-9-]+)\s*\*\/\s*$/;
const SECTION_HEADER = /^\s*\/\*\s*=+\s*(.+?)\s*=+/;
const DECLARATION = /^\s*(--[a-zA-Z0-9-]+)\s*:/;

const owners = new Map<string, TokenOwner>();
{
  let owner: TokenOwner | null = null;
  for (const line of componentCss.split('\n')) {
    const byComponent = line.match(OWNER_COMMENT);
    if (byComponent) { owner = { label: byComponent[1], kind: 'component' }; continue; }
    const bySection = line.match(SECTION_HEADER);
    if (bySection) {
      // "NAVIGATION — SIDEBAR", "DATA GRID (STAGED)" → a readable family label.
      const label = bySection[1].replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
      owner = { label, kind: 'family' };
      continue;
    }
    const decl = line.match(DECLARATION);
    if (decl && owner && !owners.has(decl[1])) owners.set(decl[1], owner);
  }
}

const tier = (t: string, fallback: string | null): ThemingHook['tier'] =>
  componentTier.has(t) ? 'component'
  : baseTier.has(t) ? (isPrimitive(t) ? 'primitive' : 'semantic')
  : fallback ? 'ad-hoc' : 'undefined';

// --- Lineage resolution ----------------------------------------------------
// Map every declared token → its right-hand value, across the component partial
// (--dialog-bg: var(--color-background-floating, #fff)) and the compiled base
// (--color-background-floating: var(--color-gray-1); --color-gray-1: #fcfcfc).
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

// PASS 1 — scan every component for the tokens it reads. Kept separate from
// hook construction because `scope` needs the FULL reverse index (who else
// reads this token?), which isn't known until every file has been scanned.
const readsBySlug = new Map<string, Map<string, string | null>>();

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
  const prior = readsBySlug.get(slug);
  if (prior) for (const [token, fallback] of prior) {
    if (!hooks.has(token)) hooks.set(token, fallback);
  }
  readsBySlug.set(slug, hooks);
}

// PASS 2 — reverse index: token → the components that read it. Only `esa-*`
// slugs count as readers; internal helpers (`_inject-styles`, `icon-registry`)
// aren't components a spoke themes, so they must not inflate a blast radius.
const readersOf = new Map<string, Set<string>>();
for (const [slug, hooks] of readsBySlug) {
  if (!slug.startsWith('esa-')) continue;
  for (const token of hooks.keys()) {
    let set = readersOf.get(token);
    if (!set) readersOf.set(token, (set = new Set()));
    set.add(slug);
  }
}

// PASS 3 — build each component's surface, now that scope is knowable.
for (const [slug, hooks] of readsBySlug) {
  themingSurface[slug] = [...hooks.entries()]
    .map(([token, fallback]) => {
      const t = tier(token, fallback);
      const owner = owners.get(token) ?? null;
      const readers = [...(readersOf.get(token) ?? [])].filter((s) => s !== slug).sort();
      // A tier-2/tier-1 token is system-wide by definition. For tier-3 and
      // ad-hoc hooks the test is empirical, NOT the declaration: "wired to this
      // component" has to mean nothing else reads it, or the promise is false.
      // Declaration alone would lie in both directions — `--sidenav-*` is filed
      // under a `/* ===== NAVIGATION — SIDEBAR ===== */` family header yet only
      // esa-sidebar-nav reads it (exclusive in practice), while a token filed
      // under one component but read by a sibling is shared no matter whose
      // comment group it sits in. The declared owner survives as the family
      // LABEL on shared rows — provenance, not the classifier.
      const scope: ThemingHook['scope'] =
        t === 'semantic' || t === 'primitive' ? 'system'
        : readers.length === 0 ? 'exclusive'
        : 'shared';
      return {
        token,
        tier: t,
        scope,
        alsoReadBy: scope === 'shared' ? readers : [],
        family: scope === 'shared' && owner?.kind === 'family' ? owner.label : null,
        ownedBy:
          scope === 'shared' && owner?.kind === 'component' && owner.label !== slug
            ? owner.label
            : null,
        fallback,
        // Resolve from the token's own definition; ad-hoc tokens (defined nowhere)
        // fall back to walking their inline fallback literal.
        lineage: defs.has(token) ? lineageOf(defs.get(token)!) : lineageOf(fallback),
      };
    })
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
