/**
 * DEBUG-ONLY build-time graph of the entire three-tier token system.
 *
 * Where `theming.ts` answers "what can I re-point on THIS component", this
 * answers the system-level questions:
 *   - what tokens exist, at which tier, and what do they actually resolve to?
 *   - forward lineage: component -> semantic -> primitive -> raw
 *   - REVERSE lineage: "if I move --color-grass-9, what breaks?"
 *   - health: undefined refs, orphans, tier skips, semantics that never touch a ramp
 *
 * Tier classification here is AUTHORITATIVE, not regex-guessed: primitive and
 * semantic come from which source JSON directory declares them, component from
 * the authored partial. (theming.ts uses a name regex, which drifts when a new
 * ramp is added — this module is the ground truth.)
 *
 * Values are the :root/light defaults compiled into @esa/tokens. Theme blocks
 * ([data-theme], [data-scheme="dark"]) deliberately do NOT feed this graph —
 * the point is to see the SHIPPED default chain, not one theme's overrides.
 *
 * Consumed only by /debug/tokens, which is excluded from production builds.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const TOKENS = path.join(ROOT, 'packages', 'tokens');
const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

export type Tier = 'primitive' | 'semantic' | 'component';

export interface LineageLink {
  ref: string;
  kind: Tier | 'raw' | 'unknown';
}

export interface TokenNode {
  name: string;
  tier: Tier;
  /** Authored right-hand side, e.g. `var(--color-grass-9)`. */
  value: string;
  /** Terminal raw value after walking the var() chain. */
  resolved: string;
  isColor: boolean;
  /** DTCG `$description`, where the source JSON carries one. */
  description?: string;
  /** Forward chain from this token's own value down to a raw literal. */
  lineage: LineageLink[];
  /** Tokens this one directly references (first-level). */
  refs: string[];
  /** Tokens that reference THIS one — the reverse edge. */
  usedByTokens: string[];
  /** Component slugs whose source reads this token via var(). */
  usedByComponents: string[];
}

/* ------------------------------------------------------------------ sources */

const readIf = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const tokensCss = readIf(path.join(TOKENS, 'dist', 'tokens.css'));
const componentCss = readIf(path.join(TOKENS, 'src', 'component-tokens.css'));

if (!tokensCss) {
  throw new Error(
    'token-graph: packages/tokens/dist/tokens.css is missing. Run `npm run build:tokens` first.',
  );
}

/** Every `--name: value;` in source order; first (=:root default) wins. */
const parseDefs = (css: string): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!m.has(name)) m.set(name, value.trim());
  }
  return m;
};

const defs = new Map([...parseDefs(tokensCss), ...parseDefs(componentCss)]);

/* ------------------------------------------------- tier: from the SOURCE of truth */

/** Flatten a DTCG file to `--kebab-path` -> $description. */
const flattenDtcg = (obj: unknown, trail: string[] = [], out = new Map<string, string | undefined>()) => {
  if (!obj || typeof obj !== 'object') return out;
  const node = obj as Record<string, unknown>;
  if ('$value' in node) {
    out.set(`--${trail.join('-')}`, node.$description as string | undefined);
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flattenDtcg(child, [...trail, key], out);
  }
  return out;
};

const readTier = (dir: string): Map<string, string | undefined> => {
  const out = new Map<string, string | undefined>();
  const full = path.join(TOKENS, 'tokens', dir);
  if (!existsSync(full)) return out;
  for (const file of readdirSync(full)) {
    if (!file.endsWith('.json')) continue;
    for (const [k, v] of flattenDtcg(JSON.parse(readFileSync(path.join(full, file), 'utf8')))) {
      out.set(k, v);
    }
  }
  return out;
};

const primitiveSrc = readTier('primitive');
const semanticSrc = readTier('semantic');
const componentSrc = new Set(parseDefs(componentCss).keys());

const tierOf = (name: string): Tier | null =>
  componentSrc.has(name) ? 'component'
  : semanticSrc.has(name) ? 'semantic'
  : primitiveSrc.has(name) ? 'primitive'
  : null;

/* ------------------------------------------------------------------ lineage */

const FIRST_VAR = /var\(\s*(--[a-zA-Z0-9-]+)/;

const kindOf = (ref: string): LineageLink['kind'] =>
  !ref.startsWith('--') ? 'raw' : (tierOf(ref) ?? 'unknown');

/** Walk a value down its var() references to the terminal raw literal. */
const lineageOf = (start: string | undefined): LineageLink[] => {
  const chain: LineageLink[] = [];
  const seen = new Set<string>();
  let value = start;
  for (let depth = 0; depth < 12 && value != null; depth++) {
    const ref = value.match(FIRST_VAR);
    if (!ref) {
      chain.push({ ref: value.trim(), kind: 'raw' });
      break;
    }
    const tok = ref[1];
    if (seen.has(tok)) break; // cycle guard
    seen.add(tok);
    chain.push({ ref: tok, kind: kindOf(tok) });
    if (!defs.has(tok)) break; // referenced but declared nowhere
    value = defs.get(tok);
  }
  return chain;
};

/** First-level references out of a value. */
const refsOf = (value: string): string[] => [
  ...new Set([...value.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1])),
];

/* ------------------------------------------------- component consumption map */

/** token -> component slugs that read it. Comments stripped so docs prose
 *  mentioning `var(--x)` doesn't register as real usage. */
const componentUse = new Map<string, Set<string>>();
/** A read site is "bare" when it supplies NO fallback: `var(--x)`. That
 *  distinction decides whether an undeclared token is a bug or legitimate
 *  ad-hoc surface (SPEC.md), so it has to be tracked, not just the name. */
const bareRead = new Map<string, Set<string>>();

if (existsSync(COMPONENTS)) {
  for (const file of readdirSync(COMPONENTS)) {
    if (!/\.(astro|ts)$/.test(file)) continue;
    const slug = file.replace(/\.(astro|ts)$/, '');
    const src = readFileSync(path.join(COMPONENTS, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');
    // Match the token name and only the ONE delimiter that follows it: `)` means
    // a bare read, `,` means a fallback was supplied. Deliberately does not try
    // to capture the fallback itself — a fallback can nest arbitrarily deep
    // (`var(--a, var(--b, 1rem) var(--c, 1rem))`), and a regex that tries to
    // bracket-match it fails on those and silently loses the usage record.
    for (const m of src.matchAll(/var\(\s*(--[a-zA-Z][a-zA-Z0-9-]*)\s*([,)])/g)) {
      const token = m[1];
      if (token.startsWith('--_')) continue; // privates are internals
      if (!componentUse.has(token)) componentUse.set(token, new Set());
      componentUse.get(token)!.add(slug);
      if (m[2] === ')') {
        if (!bareRead.has(token)) bareRead.set(token, new Set());
        bareRead.get(token)!.add(slug);
      }
    }
  }
}

/* -------------------------------------------------------------- build nodes */

const COLOR_RE = /^(#|rgb|hsl|oklch|color\()/i;

const nodes = new Map<string, TokenNode>();

for (const [name, value] of defs) {
  const tier = tierOf(name);
  if (!tier) continue; // e.g. a P3-only or theme-local declaration
  const lineage = lineageOf(value);
  const terminal = lineage.at(-1);
  nodes.set(name, {
    name,
    tier,
    value,
    resolved: terminal?.kind === 'raw' ? terminal.ref : value,
    isColor: COLOR_RE.test((terminal?.kind === 'raw' ? terminal.ref : value).trim()),
    description: tier === 'semantic' ? semanticSrc.get(name) : primitiveSrc.get(name),
    lineage,
    refs: refsOf(value),
    usedByTokens: [],
    usedByComponents: [...(componentUse.get(name) ?? [])].sort(),
  });
}

// Reverse edges — "who points at me". This is the question the forward-only
// per-component table can't answer, and the one that matters before moving a ramp.
for (const node of nodes.values()) {
  for (const ref of node.refs) {
    nodes.get(ref)?.usedByTokens.push(node.name);
  }
}
for (const node of nodes.values()) node.usedByTokens.sort();

export const allTokens: TokenNode[] = [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name));

export const byTier = (tier: Tier): TokenNode[] => allTokens.filter((t) => t.tier === tier);

export const tierCounts: Record<Tier, number> = {
  primitive: byTier('primitive').length,
  semantic: byTier('semantic').length,
  component: byTier('component').length,
};

/* ------------------------------------------------------------------ grouping */

export interface TokenGroup {
  label: string;
  tokens: TokenNode[];
}

/** Primitives group by ramp/scale: --color-grass-9 -> "color-grass". */
const primitiveGroupKey = (name: string) => {
  const body = name.slice(2);
  const parts = body.split('-');
  // trailing numeric step (grass-9) or alpha step (grass-a9) belongs to the ramp
  if (/^a?\d+$/.test(parts.at(-1) ?? '')) parts.pop();
  return parts.join('-') || body;
};

/** Semantics group by role family: --color-text-primary -> "color-text". */
const semanticGroupKey = (name: string) => {
  const parts = name.slice(2).split('-');
  if (parts[0] !== 'color') return parts[0];
  const FAMILIES = ['text', 'surface', 'border', 'primary', 'secondary', 'accent', 'ai', 'status', 'disabled'];
  return FAMILIES.includes(parts[1]) ? `color-${parts[1]}` : 'color-other';
};

/** Component tokens group by their component prefix: --card-bg -> "card". */
const componentGroupKey = (name: string) => name.slice(2).split('-')[0];

const group = (tokens: TokenNode[], key: (n: string) => string): TokenGroup[] => {
  const map = new Map<string, TokenNode[]>();
  for (const t of tokens) {
    const k = key(t.name);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.entries()]
    .map(([label, tokens]) => ({ label, tokens }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const primitiveGroups = group(byTier('primitive'), primitiveGroupKey);
export const semanticGroups = group(byTier('semantic'), semanticGroupKey);
export const componentGroups = group(byTier('component'), componentGroupKey);

/* ------------------------------------------------------------------- health */

export interface Finding {
  token: string;
  detail: string;
  where?: string;
}

const undeclared = [...componentUse.keys()].filter((t) => !defs.has(t)).sort();

/** Undeclared AND read somewhere with no fallback — the var() resolves to
 *  nothing and the property drops. These are unambiguous bugs. */
export const undefinedRefs: Finding[] = (() => {
  const out: Finding[] = undeclared
    .filter((t) => bareRead.has(t))
    .map((t) => ({
      token: t,
      detail: 'read with NO fallback and declared nowhere — the declaration drops',
      where: [...bareRead.get(t)!].sort().join(', '),
    }));
  // A token file pointing at something undeclared is always a bug (token
  // definitions don't get the benefit of an inline fallback the way call sites do).
  for (const node of nodes.values()) {
    for (const ref of node.refs) {
      if (!defs.has(ref)) {
        out.push({ token: ref, detail: 'referenced by a token definition but declared nowhere', where: node.name });
      }
    }
  }
  return out.sort((a, b) => a.token.localeCompare(b.token));
})();

/** Undeclared but ALWAYS read with a fallback. Legitimate per SPEC.md — the
 *  component offers the hook via its fallback only. The spec calls these the
 *  candidates to either promote into component-tokens.css or fold away, so
 *  they're the working list for tier-3 surface work, not a bug list. */
export const adHocHooks: Finding[] = undeclared
  .filter((t) => !bareRead.has(t))
  .map((t) => ({
    token: t,
    detail: 'offered via inline fallback only — promote into component-tokens.css or fold away',
    where: [...componentUse.get(t)!].sort().join(', '),
  }));

/** Declared at tier 2 or 3 but nothing reads it — dead surface, or a hook
 *  nobody wired up. Primitives are deliberately excluded: an unused ramp step
 *  is normal (a 12-step scale is a palette, not a checklist) and 290-odd of
 *  them would bury every other finding on this page. See `unusedRampSteps`. */
export const orphans: Finding[] = allTokens
  .filter((t) => t.tier !== 'primitive' && !t.usedByTokens.length && !t.usedByComponents.length)
  .map((t) => ({ token: t.name, detail: `tier-${t.tier === 'semantic' ? 2 : 3} ${t.tier}, resolves to ${t.resolved}` }));

/** Ramp steps nothing references. Informational — this is the palette headroom,
 *  not a defect. Useful for spotting a scale that's carried but never used. */
export const unusedRampSteps: Finding[] = allTokens
  .filter((t) => t.tier === 'primitive' && !t.usedByTokens.length && !t.usedByComponents.length)
  .map((t) => ({ token: t.name, detail: t.resolved }));

/** Tier-3 token wired straight to a primitive, skipping the semantic layer.
 *  Sometimes correct (geometry has no semantic peer) — but a color doing this
 *  means a spoke re-pointing the semantic layer will NOT re-skin it. */
export const tierSkips: Finding[] = byTier('component')
  .filter((t) => t.lineage[0]?.kind === 'primitive' && t.name.includes('color'))
  .map((t) => ({ token: t.name, detail: `-> ${t.lineage[0].ref} directly (no semantic hop)` }));

/** Semantic token that terminates in a raw literal without passing through a
 *  primitive — a hardcoded value hiding at tier 2. */
export const semanticHardcodes: Finding[] = byTier('semantic')
  .filter((t) => !t.lineage.some((l) => l.kind === 'primitive') && t.lineage.at(-1)?.kind === 'raw')
  .map((t) => ({ token: t.name, detail: `raw ${t.resolved} — never touches a ramp` }));

/** Only the actionable checks count toward the headline number. Ad-hoc hooks
 *  and unused ramp steps are inventory, not defects — folding them in would
 *  make the tally permanently alarming and therefore ignorable. */
export const healthTotal =
  undefinedRefs.length + orphans.length + tierSkips.length + semanticHardcodes.length;
