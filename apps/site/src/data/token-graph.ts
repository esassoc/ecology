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

const COLOR_RE = /^(#|rgb|hsl|oklch|color\(|color-mix\()/i;

/**
 * A value that is nothing but a var() reference. `lineageOf` resolves these by
 * walking to the terminal literal, which is right — the token IS its referent.
 */
const PURE_VAR = /^var\(\s*--[a-zA-Z][a-zA-Z0-9-]*\s*(,[\s\S]*)?\)$/;

/**
 * A value that WRAPS a reference — `color-mix(in srgb, var(--color-primary) 8%,
 * transparent)`. Walking to the terminal here throws the wrapper away and
 * reports the solid brand colour, so a 8% wash rendered as a swatch came out as
 * a solid block. Substitute into the expression instead, which is both accurate
 * and still valid CSS for the swatch to paint.
 */
const resolveEmbedded = (value: string): string =>
  value.replace(/var\(\s*(--[a-zA-Z][a-zA-Z0-9-]*)\s*(?:,[^()]*)?\)/g, (whole, ref: string) => {
    const end = lineageOf(`var(${ref})`).at(-1);
    return end?.kind === 'raw' ? end.ref : whole;
  });

const resolveValue = (value: string, terminal: LineageLink | undefined): string =>
  PURE_VAR.test(value.trim())
    ? terminal?.kind === 'raw'
      ? terminal.ref
      : value
    : resolveEmbedded(value);

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
    resolved: resolveValue(value, terminal),
    isColor: COLOR_RE.test(resolveValue(value, terminal).trim()),
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
  /** Part of the universal/core set — shared by every theme. */
  core?: boolean;
}

/** A tier-1 category holding one or more sub-groups (color has one per ramp;
 *  the rest are a single flat list). */
export interface TokenCategory {
  label: string;
  note: string;
  /** Where what this repo actually ships diverges from the note's model.
   *  Stated per category so the taxonomy doubles as the refinement worklist. */
  gap?: string;
  groups: TokenGroup[];
  count: number;
}

/** Scales must sort by magnitude, not lexically — otherwise a 12-step ramp
 *  reads 1, 10, 11, 12, 2, 3 and the spacing scale puts 1000 between 100
 *  and 150, which makes a scale unreadable as a scale. */
const naturalCompare = (a: string, b: string) => {
  const chunk = (s: string) => s.match(/\d+|\D+/g) ?? [];
  const [ca, cb] = [chunk(a), chunk(b)];
  for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
    const x = ca[i], y = cb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const [nx, ny] = [Number(x), Number(y)];
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

/**
 * Colors sub-group by ramp: --color-grass-9 -> "grass", --color-gray-a3 ->
 * "gray-a". Everything that is NOT a stepped ramp collapses into one bucket —
 * status and the overlay washes are single tokens, and keying them the same way
 * as a ramp produced 13 groups of one, which is noise rather than structure.
 */
const primitiveGroupKey = (name: string) => {
  const body = name.replace(/^--color-/, '');
  if (body.startsWith('status-')) return 'status (fixed, not a ramp)';
  const parts = body.split('-');
  const step = parts.at(-1) ?? '';
  if (!/^a?\d+$/.test(step)) return 'overlays + washes';
  parts.pop();
  // An alpha ramp is written --color-gray-a3: the `a` rides on the step, so put
  // it back on the ramp name to keep alpha and solid variants distinct.
  return parts.join('-') + (step.startsWith('a') ? '-a' : '');
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
    .map(([label, tokens]) => ({ label, tokens: tokens.sort((a, b) => naturalCompare(a.name, b.name)) }))
    .sort((a, b) => naturalCompare(a.label, b.label));
};

export const semanticGroups = group(byTier('semantic'), semanticGroupKey);
export const componentGroups = group(byTier('component'), componentGroupKey);

/* --------------------------------------------------- tier-1 categorisation */

/**
 * Tier 1 by CONCEPT rather than by source file — the ramps live in color.json
 * but shadows, transitions, and z-indexes are all crammed into effect.json, so
 * the file layout is not the taxonomy anyone reasons in.
 *
 * Matchers run in order, first hit wins. The trailing `Other` bucket is
 * deliberate: an unmatched primitive must SHOW UP rather than vanish, so adding
 * a new kind of primitive surfaces here instead of being silently dropped.
 */
const PRIMITIVE_CATEGORIES: {
  label: string;
  note: string;
  gap?: string;
  match: (n: string) => boolean;
  /** Sub-group within the category. Omit to render one flat list. */
  subGroupKey?: (n: string) => string;
  /**
   * The sub-groups this category is EXPECTED to have, in display order. Any
   * expected group with no tokens still renders, empty — so a missing property
   * is visible in the taxonomy itself rather than only in the gap prose.
   */
  expect?: string[];
}[] = [
  {
    label: 'Color',
    subGroupKey: (n) => primitiveGroupKey(n),
    note:
      'The primitive ramp VALUES for each available color — one row per step. This hub names its ramps UNCATEGORISED (grass-9, gray-3) rather than categorised (brand-grass-9): the brand/neutral/utility distinction is made at tier 2, where a semantic role points at a step. Ramps are Radix-derived, 12 steps each, with separate -dark and -a (alpha) variants. The neutral (gray) ramp is shared by every theme rather than redefined per theme, which is why themes re-point semantics instead of shipping their own neutrals.',
    match: (n) => n.startsWith('--color-'),
  },
  {
    label: 'Typography',
    note:
      'The individual values available for font-family, font-size, font-weight, font-style, line-height, letter-spacing, and text-transform. Every one is named `--<css-property>-<value>` — the property it sets plus the value it holds — so the name reads as the declaration it ends up in. They are combined into COMPOSITE tokens at tier 2 (`--typography-<intention>[-<size>]-<property>`), which src/typography.css assembles into the `.type-*` classes. Components and spokes reference a role; nothing outside this tier assembles primitives at the call site.',
    gap: undefined,
    match: (n) => /^--(font-|line-height-|letter-spacing-|text-transform-|font-style-)/.test(n),
    // Order matters and is fragile: every key here is a prefix of `--font-`, so
    // the most specific has to be claimed first. `--font-family-dm-sans` and
    // `--font-size-200` both start with `--font-`, so a bare `--font-` test
    // placed above them silently swallows both — which is exactly what happened
    // when --type-size-* was renamed to --font-size-*.
    subGroupKey: (n) =>
      n.startsWith('--font-weight-') ? 'font-weight'
      : n.startsWith('--font-size-') ? 'font-size'
      : n.startsWith('--font-family-') ? 'font-family'
      : n.startsWith('--font-style-') ? 'font-style'
      : n.startsWith('--line-height-') ? 'line-height'
      : n.startsWith('--letter-spacing-') ? 'letter-spacing'
      : 'text-transform',
    expect: ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform'],
  },
  {
    label: 'Spacing',
    note: 'The one linear-then-modular scale. Spokes inherit this unchanged — re-skin color and type, not density.',
    match: (n) => n.startsWith('--spacing-'),
  },
  {
    label: 'Border',
    note:
      'border-radius defines the available radius values; border-width the available widths (less common); border-style the available styles (rarely used). The focus ring sits here too — including --focus-ring-color, which is kept with the ring rather than filed under Color so the ring reads as one set.',
    gap:
      'Only border-radius exists. There are no border-width and no border-style primitives, so every border in the kit writes its width literally (1px) at the call site. Both are named as less common / rarely used, so this may be the right call — but it is currently an absence by default rather than by decision. Separately, --focus-ring-color and --focus-ring-width are declared at BOTH tier 1 and tier 3 (see Health), which is why only --focus-ring-offset lists here.',
    match: (n) => /^--(radius-|border-width|border-style|focus-ring-)/.test(n),
  },
  {
    label: 'Shadow',
    note:
      'Shadow tokens are composite: x offset, y offset, blur radius, and spread, plus a color. The shadow color usually references a transparent color managed in the Color category, though it can be managed separately.',
    gap:
      'These are NOT composite here. Each shadow is a single opaque string typed "other" in the DTCG source (e.g. "0 4px 20px -4px rgba(0, 0, 0, 0.06)"), so x / y / blur / spread are not addressable and cannot be re-pointed independently. The color is a hardcoded rgba(0,0,0,α) literal that references nothing in the Color category — which means a theme cannot tint its shadows, and the alpha ramp already shipped (gray-a, black-a) goes unused by them.',
    match: (n) => n.startsWith('--shadow-'),
  },
  {
    label: 'Animation',
    note:
      'duration defines how long an animation takes to complete; ease sets how it progresses through that duration; property names the style property being animated (opacity, color, …). These work in code but Figma cannot consume animation tokens.',
    gap:
      'Fused, not separated. The three tokens are single strings ("150ms ease") that weld duration and ease together, so neither axis is addressable on its own and no property axis exists at all. A component wanting the standard duration with a different easing has to re-declare the whole value.',
    match: (n) => /^--(transition-|duration-|easing-|ease-)/.test(n),
  },
  {
    label: 'Z-index',
    note:
      'z-index defines the stacking order. It cannot be applied in Figma, and it is a genuine judgement call whether to manage stacking as tokens at all — they are a known source of confusion. Where they are kept, the recommendation is to manage them as core/shared tokens rather than per-theme.',
    match: (n) => n.startsWith('--z-'),
  },
];

/* ------------------------------------------------------- core / universal */

/**
 * The universal/core set: tier-1 tokens shared by EVERY theme, as opposed to the
 * brand ramps a theme re-points. Two sets qualify —
 *   - the neutral (gray) palette: the greyscale the UI is built on
 *   - spacing: explicit values every theme follows, so there is nothing to re-skin
 *
 * There was a third, the utility palette (error / warning / success / info). It
 * matched `--color-status-*`, a block of tier-1 ALIASES that existed mainly to
 * give the utility palette a tier-1 home — see the tier-1 naming audit. Those
 * are gone: the tier-2 roles they fed now point straight at their ramp steps.
 * The concept did not disappear, it moved tiers, and since Core is by definition
 * a view over tier 1 it no longer has members here. Whether those roles are
 * theme-invariant is now a tier-2 question.
 *
 * This is an ORTHOGONAL axis, not an eighth property category. A gray step is
 * both "Color -> gray ramp" and "core"; filing it under Core INSTEAD of Color
 * would empty the neutral palette out of the color taxonomy. So Core is rendered
 * as a second view over the same tokens — the exportable set, the one handed to
 * design and code — and the property categories stay complete, with their core
 * sub-groups badged.
 */
const CORE_SETS: { label: string; note: string; match: (n: string) => boolean }[] = [
  {
    label: 'neutral color palette',
    note: 'The greyscale values the UI is built on — surfaces, text, borders. Defined once here rather than per theme because every theme shares them.',
    match: (n) => /^--color-(gray|black-a|white-a)/.test(n),
  },
  {
    label: 'spacing',
    note: 'Explicit values on one scale. Core because every theme follows the same grid — density is not a branding axis.',
    match: (n) => n.startsWith('--spacing-'),
  },
];

const isCore = (name: string) => CORE_SETS.some((s) => s.match(name));

export const coreCategory: TokenCategory = (() => {
  const primitives = byTier('primitive');
  const groups = CORE_SETS.map((set) => ({
    label: set.label,
    core: true,
    tokens: primitives.filter((t) => set.match(t.name)).sort((a, b) => naturalCompare(a.name, b.name)),
  }));
  return {
    label: 'Core / universal',
    note:
      'Tokens shared across ALL themes, exportable, and meant to be consumed directly by components in both design and code. A theme re-points brand ramps; it never re-points these. This is a second VIEW over the tier-1 tokens below, not an eighth category — a gray step is both “Color → gray ramp” and “core”, so it appears in both places rather than being moved out of the colour taxonomy.',
    groups,
    count: groups.reduce((n, g) => n + g.tokens.length, 0),
  };
})();

/** Per-set notes, keyed by label, for rendering under each core sub-group. */
export const coreSetNotes: Record<string, string> = Object.fromEntries(
  CORE_SETS.map((s) => [s.label, s.note]),
);

export const primitiveCategories: TokenCategory[] = (() => {
  const primitives = byTier('primitive');
  const claimed = new Set<string>();
  const out: TokenCategory[] = [];

  for (const cat of PRIMITIVE_CATEGORIES) {
    const tokens = primitives.filter((t) => !claimed.has(t.name) && cat.match(t.name));
    tokens.forEach((t) => claimed.add(t.name));
    let groups: TokenGroup[];
    if (cat.subGroupKey) {
      const found = group(tokens, cat.subGroupKey);
      if (cat.expect) {
        // Render in the declared order, and keep expected-but-empty groups so a
        // missing property reads as a hole in the set rather than as absence.
        const byLabel = new Map(found.map((g) => [g.label, g]));
        groups = cat.expect.map((label) => byLabel.get(label) ?? { label, tokens: [] });
        // Anything real but unexpected still has to appear.
        groups.push(...found.filter((g) => !cat.expect!.includes(g.label)));
      } else {
        groups = found;
      }
    } else {
      // Flat: small enough that a second level would be noise.
      groups = [{ label: cat.label.toLowerCase(), tokens: tokens.sort((a, b) => naturalCompare(a.name, b.name)) }];
    }

    // Badge any sub-group that is entirely core, so the two views reconcile
    // without the reader having to cross-reference by hand.
    for (const g of groups) {
      if (g.tokens.length && g.tokens.every((t) => isCore(t.name))) g.core = true;
    }

    out.push({
      label: cat.label,
      note: cat.note,
      gap: cat.gap,
      groups,
      count: tokens.length,
    });
  }

  const rest = primitives.filter((t) => !claimed.has(t.name));
  if (rest.length) {
    out.push({
      label: 'Other',
      note: 'Primitives that fit none of the categories above — currently icon sizing and the minimum touch target. Not a defect, but if this grows it wants its own category.',
      groups: [{ label: 'other', tokens: rest.sort((a, b) => naturalCompare(a.name, b.name)) }],
      count: rest.length,
    });
  }
  return out;
})();

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

/**
 * Namespaces declared AHEAD of the component that will read them, so the
 * theming contract is reviewable before code depends on it. Unread by
 * definition — they are not orphans, and counting them as such buries the
 * hooks that really are dead. Each entry must be documented in SPEC.md
 * ("Staged surfaces") and have a component doc page describing the contract.
 *
 * Removing a name from here should mean the component landed, not that the
 * finding got annoying.
 */
export const STAGED_PREFIXES = ['--grid-'] as const;
const isStaged = (name: string) => STAGED_PREFIXES.some((p) => name.startsWith(p));

/**
 * Chrome namespaces held EXEMPT by decision: the component exists and could
 * read these, and we are choosing not to wire it. Distinct from staged, which
 * means the component does not exist yet — `--topbar-*` sat under STAGED for
 * months on that false premise, and because "staged" reads as "arriving soon"
 * nobody re-checked it. The two must not share a bucket.
 *
 * `owner` is required and is the whole point: it records which component the
 * surface belongs to, so the exemption can never again imply "nothing owns
 * this". `cost` states plainly what a spoke loses, because an exemption that
 * only says "ignore me" is how the last one went quiet.
 */
export const CHROME_EXEMPT: { prefix: string; owner: string; why: string; cost: string }[] = [
  {
    prefix: '--topbar-',
    owner: 'esa-app-shell',
    why: 'App chrome. esa-app-shell renders the bar, the sidebar toggle and the omnibox, and these 12 map onto them exactly — but chrome is held exempt from the wire-or-delete rule by decision.',
    cost: 'A spoke overriding --topbar-bg, --topbar-icon-bg-hover or --topbar-search-* gets nothing. The chrome re-skins only through the semantic layer the component reads directly.',
  },
];
const CHROME_PREFIXES = CHROME_EXEMPT.map((c) => c.prefix);
const isChrome = (name: string) => CHROME_PREFIXES.some((p) => name.startsWith(p));

const unread = allTokens.filter(
  (t) => t.tier !== 'primitive' && !t.usedByTokens.length && !t.usedByComponents.length,
);

/** Declared at tier 2 or 3 but nothing reads it — dead surface, or a hook
 *  nobody wired up. Primitives are deliberately excluded: an unused ramp step
 *  is normal (a 12-step scale is a palette, not a checklist) and 290-odd of
 *  them would bury every other finding on this page. See `unusedRampSteps`.
 *  Staged and chrome-exempt surfaces are excluded too — see below. */
export const orphans: Finding[] = unread
  .filter((t) => !isStaged(t.name) && !isChrome(t.name))
  .map((t) => ({ token: t.name, detail: `tier-${t.tier === 'semantic' ? 2 : 3} ${t.tier}, resolves to ${t.resolved}` }));

/** Unread because the component hasn't been built yet. Inventory, not a defect. */
export const stagedSurfaces: Finding[] = unread
  .filter((t) => isStaged(t.name))
  .map((t) => ({ token: t.name, detail: `staged — resolves to ${t.resolved}` }));

/** Unread by DECISION, not by accident. The component exists; see CHROME_EXEMPT. */
export const chromeSurfaces: Finding[] = unread
  .filter((t) => isChrome(t.name))
  .map((t) => ({
    token: t.name,
    detail: `exempt — resolves to ${t.resolved}`,
    where: CHROME_EXEMPT.find((c) => t.name.startsWith(c.prefix))?.owner,
  }));

/** Ramp steps nothing references. Informational — this is the palette headroom,
 *  not a defect. Useful for spotting a scale that's carried but never used. */
export const unusedRampSteps: Finding[] = allTokens
  .filter((t) => t.tier === 'primitive' && !t.usedByTokens.length && !t.usedByComponents.length)
  .map((t) => ({ token: t.name, detail: t.resolved }));

/**
 * The same name declared at two tiers. component-tokens.css is loaded AFTER
 * tokens.css, so the tier-3 copy always wins and the compiled tier-1/2
 * declaration is dead weight that reads as authoritative in the JSON. It also
 * breaks the tier model: the token is simultaneously "never moves" and "a
 * per-component theming hook". Whichever tier is right, only one should declare it.
 */
export const duplicateDeclarations: Finding[] = [...componentSrc]
  .filter((n) => primitiveSrc.has(n) || semanticSrc.has(n))
  .sort()
  .map((n) => ({
    token: n,
    detail: `declared in tokens/${primitiveSrc.has(n) ? 'primitive' : 'semantic'}/*.json AND in component-tokens.css — the tier-3 copy wins, the compiled one is dead`,
    where: [...(componentUse.get(n) ?? [])].sort().join(', ') || undefined,
  }));

/**
 * A theme re-pointing a tier-1 primitive. SPEC.md is unambiguous — "Primitives
 * never move — not in the hub, not in a theme" — and themes.css says the same in
 * its own header. A theme that moves a primitive moves it for every token
 * downstream of it, which is precisely the blast radius the tier model exists to
 * prevent. Re-point the semantic (or component) token instead.
 */
export const themePrimitiveOverrides: Finding[] = (() => {
  const themeCss = readIf(path.join(ROOT, 'apps', 'site', 'src', 'styles', 'themes.css'));
  const out: Finding[] = [];
  // Split on theme scopes so each override is attributed to the theme making it.
  for (const m of themeCss.matchAll(/\[data-theme=["']([^"']+)["']\]\s*\{([^}]*)\}/g)) {
    const [, theme, body] = m;
    for (const [, name] of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
      if (primitiveSrc.has(name)) {
        out.push({
          token: name,
          detail: 'a theme re-points a tier-1 primitive — SPEC.md says primitives never move, in the hub or in a theme',
          where: `[data-theme="${theme}"]`,
        });
      }
    }
  }
  return out.sort((a, b) => a.token.localeCompare(b.token) || (a.where ?? '').localeCompare(b.where ?? ''));
})();

/** Tier-3 token wired straight to a primitive, skipping the semantic layer.
 *  Sometimes correct (geometry has no semantic peer) — but a color doing this
 *  means a spoke re-pointing the semantic layer will NOT re-skin it.
 *
 *  Tested on what the token IS (`isColor`), not on whether its NAME contains
 *  "color". The name test missed 19 of 22, because this system spells content
 *  colour `bg` / `text` / `color` depending on the component —
 *  `--snackbar-item-bg-danger` is plainly a colour and matches no name pattern. */
export const tierSkips: Finding[] = byTier('component')
  .filter((t) => t.lineage[0]?.kind === 'primitive' && t.isColor)
  .map((t) => ({ token: t.name, detail: `-> ${t.lineage[0].ref} directly (no semantic hop)` }));

const semanticRaw = byTier('semantic').filter(
  (t) => !t.lineage.some((l) => l.kind === 'primitive') && t.lineage.at(-1)?.kind === 'raw',
);

/** Semantic COLOR terminating in a raw literal without passing through a ramp —
 *  a magic value hiding at the intent layer, and a real defect: it is off the
 *  palette, so nothing about the ramp constrains it. */
export const semanticHardcodes: Finding[] = semanticRaw
  .filter((t) => t.isColor)
  .map((t) => ({ token: t.name, detail: `raw ${t.resolved} — never touches a ramp` }));

/** Semantic DIMENSION holding a literal. Not a defect: there is no tier-1 ramp
 *  behind control heights, chip heights, or layout widths, so tier 2 is where
 *  the definition legitimately lives. Listed as inventory so the set stays
 *  visible — if one of these ever grows a tier-1 ramp, it should move onto it. */
export const dimensionRoles: Finding[] = semanticRaw
  .filter((t) => !t.isColor)
  .map((t) => ({ token: t.name, detail: `defines ${t.resolved} — no tier-1 ramp behind it` }));

/** Only the actionable checks count toward the headline number. Ad-hoc hooks
 *  and unused ramp steps are inventory, not defects — folding them in would
 *  make the tally permanently alarming and therefore ignorable. */
export const healthTotal =
  undefinedRefs.length +
  duplicateDeclarations.length +
  themePrimitiveOverrides.length +
  orphans.length +
  tierSkips.length +
  semanticHardcodes.length;
