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

/**
 * Where this module looks for token READS — explicit and exported, so an
 * unscanned surface shows up on the page instead of silently inflating the
 * orphan count.
 *
 * Two kinds, because reader identity differs. Under a `component` root a file's
 * basename IS a component slug (`esa-card`); a `file` root has no component
 * identity, so its readers are recorded as repo-relative paths.
 *
 * This roster exists because "the reader was real, the scanner never looked"
 * has now happened three times:
 *   1. --duration-0, whose only reader is the prefers-reduced-motion block —
 *      fixed by `conditionalEdges` below;
 *   2. --topbar-*, mislabelled "staged" for months (SPEC.md, Staged surfaces);
 *   3. every --typography-* token, 102 of them, reported orphan while
 *      packages/tokens/src/typography.css read them 169 times.
 *
 * Note what (1)'s fix did and did not do: it taught the module about at-rules
 * inside the two files it already opened. It never asked whether there were
 * files it wasn't opening at all — which is the whole of (3). The generalised
 * rule is in the conditionalEdges comment: usage is a different question from
 * value, and it has to be asked of EVERY surface that ships, not of the
 * surfaces this module happened to read for some other reason.
 */
export const SCAN_ROOTS: { rel: string; kind: 'component' | 'file'; why: string }[] = [
  {
    rel: 'packages/ecology/src',
    kind: 'component',
    why: 'The component kit. Files directly under components/ carry slug identity; anything else in the package is recorded by path.',
  },
  {
    rel: 'packages/tokens/src',
    kind: 'file',
    why: 'The authored partials @esa/tokens ships alongside the compiled output — typography.css assembles the composites into classes, layouts.css the layout primitives.',
  },
  {
    rel: 'packages/docs/src',
    kind: 'file',
    why: '@esa/docs — the shared doc-site chrome, consumed by this site and by every spoke.',
  },
  {
    rel: 'packages/spoke-template/src',
    kind: 'file',
    why: 'The seed scripts/create-spoke.mjs copies wholesale, so a token it reads is load-bearing for every spoke that will ever exist.',
  },
];

/**
 * Surfaces deliberately NOT read-scanned, with the reason on the record. An
 * exemption has to be as visible as a root — an undisclosed one is
 * indistinguishable from the oversight this roster exists to prevent.
 */
export const READ_SCAN_EXEMPT: { rel: string; why: string }[] = [
  {
    rel: 'packages/tokens/src/component-tokens.css',
    why: 'Already covered twice over. Every var() in the file sits on the right-hand side of a custom-property declaration — the only exceptions are three mentions inside comments — so refsOf() -> usedByTokens carries the :root ones and conditionalEdges the at-rule ones. Read-scanning would double-count every edge and push tier-3 right-hand refs into `undeclared`, inventing bugs.',
  },
  {
    rel: 'packages/tokens/dist/tokens.css',
    why: 'The compiled output — declarations, not reads. parseDefs() already takes every one of them, and every var() in the file sits on a declaration right-hand side, which refsOf() carries. Same reasoning as component-tokens.css above.',
  },
  {
    rel: 'apps/site/src',
    why: 'A documentation surface, not a consumer of the packages — the question orphan answers is "is this load-bearing for anyone consuming @esa/tokens", and the manual is not a consumer. Two concrete hazards if it were included: this debug page would de-orphan --color-background-ai-subtle by styling ITSELF, and styles/themes.css would re-enter through the back door as reader edges when its `--x: var(--y)` lines are writes, which the header rule above excludes on purpose. It would rescue exactly three tokens (--color-background-accent, --color-background-ai-subtle, --transition-slow); those want a component reader or folding away, not an exemption.',
  },
];

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
  /**
   * Non-component readers, as repo-relative paths — the shipped CSS partials,
   * @esa/docs, the spoke template.
   *
   * Kept SEPARATE from usedByComponents rather than folded in, because two
   * downstream consumers treat that array as a set of component slugs and
   * would break silently: tier3-naming.ts counts its length as `reach` to tell
   * a genuine category namespace from a component that happens to be named
   * oddly, and component-promises.ts matches slugs by equality. A path in
   * either place corrupts both answers while still type-checking.
   */
  usedByFiles: string[];
}

/* ------------------------------------------------------------------ sources */

const readIf = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

/** Every source file under `dir`, recursively. Build output and deps excluded. */
const walk = (dir: string, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(astro|ts|tsx|css)$/.test(entry.name)) out.push(p);
  }
  return out;
};

const tokensCss = readIf(path.join(TOKENS, 'dist', 'tokens.css'));
const componentCss = readIf(path.join(TOKENS, 'src', 'component-tokens.css'));

if (!tokensCss) {
  throw new Error(
    'token-graph: packages/tokens/dist/tokens.css is missing. Run `npm run build:tokens` first.',
  );
}

/**
 * Every `--name: value;` in source order; first (=:root default) wins.
 *
 * Comments are stripped FIRST, and that is not tidiness. The value pattern is
 * `[^;]+`, which spans newlines, so a comment merely MENTIONING a token with a
 * colon — `/* Was `--filter-dropdown-border: 1px solid …` *\/` — matched from
 * inside the comment through to the next real semicolon and registered a
 * declaration that does not exist. The token then showed up as a fully-fledged
 * orphan: declared, unread, "safe to delete". Prose about a token is not a
 * declaration of it.
 */
const parseDefs = (css: string): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [, name, value] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
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

/* ------------------------------------------------------- consumption map */

/** token -> component slugs that read it. Comments stripped so docs prose
 *  mentioning `var(--x)` doesn't register as real usage. */
const componentUse = new Map<string, Set<string>>();
/** token -> repo-relative paths of NON-component shipped files that read it. */
const fileUse = new Map<string, Set<string>>();
/** A read site is "bare" when it supplies NO fallback: `var(--x)`. That
 *  distinction decides whether an undeclared token is a bug or legitimate
 *  ad-hoc surface (SPEC.md), so it has to be tracked, not just the name.
 *
 *  Fed from COMPONENTS ONLY, on purpose — see `undeclared` below. */
const bareRead = new Map<string, Set<string>>();

/** Per-root file tallies, for the rendered scan-coverage disclosure. */
const scanStats = new Map<string, { files: number; tokens: Set<string> }>();

// Match the token name and only the ONE delimiter that follows it: `)` means
// a bare read, `,` means a fallback was supplied. Deliberately does not try
// to capture the fallback itself — a fallback can nest arbitrarily deep
// (`var(--a, var(--b, 1rem) var(--c, 1rem))`), and a regex that tries to
// bracket-match it fails on those and silently loses the usage record.
const READ_RE = /var\(\s*(--[a-zA-Z][a-zA-Z0-9-]*)\s*([,)])/g;
const LOCAL_DECL_RE = /(--[a-zA-Z][a-zA-Z0-9-]*)\s*:/g;

const exemptFromReadScan = (rel: string) =>
  READ_SCAN_EXEMPT.some((e) => rel === e.rel || rel.startsWith(`${e.rel}/`));

for (const root of SCAN_ROOTS) {
  const stats = { files: 0, tokens: new Set<string>() };
  scanStats.set(root.rel, stats);

  for (const abs of walk(path.join(ROOT, root.rel))) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (exemptFromReadScan(rel)) continue;

    const src = readFileSync(abs, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');

    // A file under a `component` root only earns slug identity if it sits
    // directly in components/ — packages/ecology/src/typography.ts is in the
    // package but is not a component, and giving it a slug would invent one.
    const inComponentDir = path.dirname(abs) === COMPONENTS;
    const slug =
      root.kind === 'component' && inComponentDir && /\.(astro|ts)$/.test(abs)
        ? path.basename(abs).replace(/\.(astro|ts)$/, '')
        : null;

    // Tokens a FILE-kind surface declares itself are not tokens it reads from
    // the system. layouts.css forces this: it bare-reads --gap, --align,
    // --grid-min and six more that it declares on the element a line above, so
    // without the filter they land in `undefinedRefs` as "declared nowhere —
    // the declaration drops", which is the opposite of true. It also stops the
    // file being credited with reading --sidebar-width, where its own 18rem
    // shadows a differently-valued semantic token of the same name.
    //
    // NOT applied to components, and that asymmetry is load-bearing. A
    // component declaring a public tier-3 token and then reading it is the
    // documented pattern, not a local knob: esa-range-slider sets
    // `style="--fill-percent: …"` on the input and reads it back in the track
    // gradient. Filtering there invented a fresh orphan out of a token with two
    // live readers — the exact failure this whole roster exists to stop.
    const localDecls =
      root.kind === 'file' ? new Set([...src.matchAll(LOCAL_DECL_RE)].map((m) => m[1])) : new Set<string>();

    let counted = false;
    for (const m of src.matchAll(READ_RE)) {
      const token = m[1];
      if (token.startsWith('--_')) continue; // privates are internals
      if (localDecls.has(token)) continue;
      counted = true;
      stats.tokens.add(token);

      if (slug) {
        if (!componentUse.has(token)) componentUse.set(token, new Set());
        componentUse.get(token)!.add(slug);
        if (m[2] === ')') {
          if (!bareRead.has(token)) bareRead.set(token, new Set());
          bareRead.get(token)!.add(slug);
        }
      } else {
        if (!fileUse.has(token)) fileUse.set(token, new Set());
        fileUse.get(token)!.add(rel);
      }
    }
    if (counted) stats.files += 1;
  }
}

/** Per-root coverage, for the disclosure table on /debug/tokens. */
export const scanCoverage = SCAN_ROOTS.map((r) => ({
  ...r,
  files: scanStats.get(r.rel)?.files ?? 0,
  tokens: scanStats.get(r.rel)?.tokens.size ?? 0,
}));

/* -------------------------------------------------------------- build nodes */

const COLOR_RE = /^(#|rgb|hsl|oklch|color\(|color-mix\()/i;

/**
 * A value that is nothing but a var() reference. `lineageOf` resolves these by
 * walking to the terminal literal, which is right — the token IS its referent.
 */
const PURE_VAR = /^var\(\s*--[a-zA-Z][a-zA-Z0-9-]*\s*(,[\s\S]*)?\)$/;

/**
 * A value that WRAPS a reference — `color-mix(in srgb, var(--color-background-brand) 8%,
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
    usedByFiles: [...(fileUse.get(name) ?? [])].sort(),
  });
}

// Reverse edges — "who points at me". This is the question the forward-only
// per-component table can't answer, and the one that matters before moving a ramp.
for (const node of nodes.values()) {
  for (const ref of node.refs) {
    nodes.get(ref)?.usedByTokens.push(node.name);
  }
}

/**
 * Reverse edges from declarations inside AT-RULES, which `defs` cannot see: it is
 * first-wins, so a token redeclared under `@media` contributes only its :root value.
 *
 * That is the right rule for VALUES — this graph reports the chain that ships by
 * default, not what one condition does to it. Usage is a different question, and
 * answering it from the default chain alone made `--duration-0` an ORPHAN: its only
 * reader is the `prefers-reduced-motion` block, which is the entire reason it exists.
 * `orphan` on this page reads as "nothing needs this, delete it", so the audit was
 * pointing at a load-bearing token and saying it was safe to remove.
 *
 * Deliberately edges only — the conditional VALUE is still not merged into `defs`,
 * so `--transition-fast` continues to resolve as 150ms rather than 0ms.
 */
const conditionalEdges: [string, string][] = [];
for (const css of [tokensCss, componentCss]) {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, ''); // prose mentioning var() is not usage
  for (const [, name, value] of bare.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (defs.get(name) === value.trim()) continue; // the default declaration, already counted
    for (const ref of refsOf(value)) conditionalEdges.push([ref, name]);
  }
}
for (const [ref, by] of conditionalEdges) {
  const node = nodes.get(ref);
  if (node && ref !== by && !node.usedByTokens.includes(by)) node.usedByTokens.push(by);
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
  /** Where the STRUCTURE this repo ships departs from the note's model — a wrong
   *  or missing axis. Drives the "diverges" chip, so it must not be used for work
   *  that is merely outstanding, or the chip degrades into "someone wrote prose". */
  gap?: string;
  /** Where the structure is right but the codebase has not moved onto it. Kept
   *  separate from `gap` because they call for opposite responses: a divergence
   *  means rethink the tier, adoption debt means go and edit call sites. */
  adoption?: string;
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
 * the overlay washes are single tokens, and keying them the same way as a ramp
 * produced 13 groups of one, which is noise rather than structure.
 *
 * There was also a `status-` branch here, for the `--color-status-*` tier-1
 * aliases. Those were deleted (see the Core note below) — tier 1 holds only ramps
 * and washes now, so the branch had nothing left to match.
 */
const primitiveGroupKey = (name: string) => {
  const body = name.replace(/^--color-/, '');
  const parts = body.split('-');
  const step = parts.at(-1) ?? '';
  if (!/^a?\d+$/.test(step)) return 'overlays + washes';
  parts.pop();
  // An alpha ramp is written --color-gray-a3: the `a` rides on the step, so put
  // it back on the ramp name to keep alpha and solid variants distinct.
  return parts.join('-') + (step.startsWith('a') ? '-a' : '');
};

/**
 * Semantic colours group by PROPERTY: --color-content-default -> "color-content".
 *
 * This used to list intentions (`text`, `surface`, `primary`, `secondary`, `status`)
 * and match them at parts[1]. Once tier-2 colour went property-first every one of
 * those words moved out of that slot, so 60 of 70 tokens fell through to
 * `color-other` and the grouping quietly stopped grouping. Matching the property is
 * both correct now and stable: the property slot is the one part of a tier-2 colour
 * name that is guaranteed present.
 *
 * `color-other` should now always be empty — every tier-2 colour name carries its
 * property. A group appearing there means a token was added without one, which is
 * exactly the thing worth seeing on this page.
 */
const semanticGroupKey = (name: string) => {
  const parts = name.slice(2).split('-');
  if (parts[0] !== 'color') return parts[0];
  const PROPERTIES = ['background', 'content', 'border', 'overlay'];
  return PROPERTIES.includes(parts[1]) ? `color-${parts[1]}` : 'color-other';
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

/* ------------------------------------------------------- motion adoption */

/**
 * How many `transition:` declarations in the component kit still hold literal
 * timings rather than reading a token.
 *
 * DERIVED, and it has to be. This number lived in the Animation category's
 * `adoption` prose as a hardcoded "42 of 73", and by the time anyone checked,
 * four different counts were in circulation — because the answer depends
 * entirely on how you count, and prose cannot carry a definition. The one used
 * here, stated once: every `transition:` declaration in a component source with
 * comments stripped, tokenised if its value reads a `--transition-*`,
 * `--duration-*` or `--easing-*` token anywhere. The companion `animation:`
 * count uses the same rule.
 *
 * The animation half counts `animation:` CALL SITES, not `@keyframes` bodies —
 * the declaration is where a duration and an easing get chosen, so it is the
 * thing that can be on a token or not. (A first pass here counted the
 * `@keyframes` blocks instead and reported 16 of them untokenised, which was
 * both the wrong denominator and the wrong question.)
 *
 * A hardcoded ratio in an `adoption` string is the same defect as a hardcoded
 * orphan count — a claim about the codebase that the codebase cannot contradict.
 */
export const motionAdoption = (() => {
  const count = (re: RegExp, tokenRe: RegExp) => {
    let total = 0;
    let literal = 0;
    for (const abs of walk(COMPONENTS)) {
      const src = readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of src.matchAll(re)) {
        total += 1;
        if (!tokenRe.test(m[1])) literal += 1;
      }
    }
    return { total, literal, tokenised: total - literal };
  };
  return {
    transition: count(/transition:\s*([^;}]+)[;}]/g, /var\(\s*--(transition|duration|easing)-/),
    animation: count(/animation:\s*([^;}]+)[;}]/g, /var\(\s*--(animation|duration|easing)-/),
  };
})();

/* --------------------------------------------------- tier-1 categorisation */

/**
 * Tier 1 by CONCEPT rather than by source file — the ramps live in color.json
 * but shadows and icon sizes are still crammed into effect.json, so
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
  adoption?: string;
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
      'The individual values available for font-family, font-size, font-weight, font-style, line-height, letter-spacing, and text-transform. Every one is named `--<css-property>-<value>` — the property it sets plus the value it holds — so the name reads as the declaration it ends up in. They are combined into COMPOSITE tokens at tier 2 (`--typography-<intention>[-<size>]-<property>`), which src/typography.css assembles into the `.typography-*` classes (the `.type-*` spellings beside them are the deprecated aliases, kept resolving via migrations.json). Components and spokes reference a role; nothing outside this tier assembles primitives at the call site.',
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
      'border-radius defines the available radius values, border-width the available widths, and border-style the available styles (the rarest of the three). Tier 2 maps those into themeable roles — the model names them with t-shirt sizing, e.g. theme-border-radius-large. Most components wire to the tier-2 roles, but radius and the other border properties can also be controlled per component at tier 3. Two of the three axes ship here: seven --radius-* steps and four --border-width-* steps (100–400 = 1–4px), each with a tier-2 role above it and tier-3 hooks below. border-style is deliberately absent — 56 of the 57 borders in the kit are solid and the one dashed border is the file-upload dropzone affordance, so a --border-style-solid token would alias a keyword nobody would re-point. Two departures from the model, both on purpose. The roles are named by INTENTION rather than t-shirt size — control / surface / card / overlay / pill for radius — because naming WHERE a corner belongs lets a theme round its cards without rounding every menu, which radius-lg cannot express. And width gets exactly ONE role, --border-width-default, because it turned out to have exactly one: the hairline, read by the 49 real borders in the kit. Every other width here (2px, 3px, 4px) is internal micro-geometry — spinner rings, the kbd keycap lip, a chevron built from two borders — which SPEC.md excludes from the theming surface by name, so those stay literals rather than becoming a role nobody can point at.',
    gap: undefined,
    match: (n) => /^--(radius-|border-width|border-style)/.test(n),
    // Grouped by CSS PROPERTY, the way Typography is — one sub-table per axis
    // instead of one flat list, now that the category holds more than radius.
    // The labels are the properties, not the token prefixes, which is why the
    // radius group reads `border-radius` while its tokens read `--radius-*`:
    // Typography's own rule is that a primitive is named for the property it
    // sets, and radius is the one tier-1 set that predates it.
    subGroupKey: (n) =>
      n.startsWith('--border-width-') ? 'border-width'
      : n.startsWith('--border-style-') ? 'border-style'
      : 'border-radius',
    // border-style is listed but ships nothing, so it renders as an empty group.
    // That is the point of `expect` — the absence is a documented decision (see
    // the note), and a visible hole states it better than prose alone.
    expect: ['border-radius', 'border-width', 'border-style'],
  },
  {
    label: 'Shadow',
    note:
      'Shadow is a composite token in the same way typography is: color, x offset, y offset, blur and spread work together to produce one stylistic result. Technically you define each of those axes and cluster them into a composite. In practice it is the weird one — you often do not need x / y / blur / spread to be addressable, so a lot of the time the shadow is just described at tier 2 directly. Component-specific shadow values can be created at tier 3 as well.\n\nBoth halves of that ship here, which is why this category no longer diverges. Tier 1 holds the axes as raw material; tier 2 does the clustering, as --elevation-1…6 — the model\'s "just describe them at the tier two level", taken literally. --elevation-4 compiles to var(--shadow-offset-x) var(--shadow-offset-y-300) var(--shadow-blur-300) var(--shadow-spread-300) var(--shadow-color-300), and tier 3 adds the component-specific values the model mentions last (--grid-shadow, --command-palette-shadow, --nav-dropdown-panel-shadow).\n\nThree calls worth recording. The composite belongs at tier 2, not tier 1: choosing which combination of axes is a resting card and which is a modal is an intent, so the old ordinal --shadow-050…500 were intent wearing a tier-1 name — the same misfiling as --transition-fast — and formed a 1:1 passthrough with elevation besides. They are gone; migrations.json keeps them resolving. Doing the axes at all was optional by the model, but the color axis was not optional in practice: every shadow used to terminate in a hardcoded rgba(0,0,0,α) referencing nothing, so a theme could not tint its shadows. offset-x is a single shared token rather than a ramp because every shadow casts straight down — same call as --border-width-default — and the colors deliberately do NOT alias black-a, which starts at 0.05 and steps by 0.05, since five of these six alphas (0.03–0.08) fall between its steps.',
    gap: undefined,
    // Tier 1 is now axes ONLY — the composites moved to tier 2 (--elevation-*), so
    // there is no `composite` sub-group here any more. Grouped by axis the way
    // Typography and Border are grouped by CSS property.
    match: (n) => n.startsWith('--shadow-'),
    subGroupKey: (n) =>
      n.startsWith('--shadow-offset-x') ? 'offset-x'
      : n.startsWith('--shadow-offset-y-') ? 'offset-y'
      : n.startsWith('--shadow-blur-') ? 'blur'
      : n.startsWith('--shadow-spread-') ? 'spread'
      : 'color',
    expect: ['offset-x', 'offset-y', 'blur', 'spread', 'color'],
  },
  {
    label: 'Animation',
    note:
      'Animation is a COMPOSITE family, so tier 1 holds the ingredients and tier 2 assembles them. The ingredients are two: duration (how long) and ease (how it progresses through that duration). The animated property — opacity, color — is deliberately NOT tokenised at tier 1; the model is explicit that properties "are more just applied" at the call site. Tier 2 is where the named animations live. Tier 3 (component-specific animations) is sanctioned but the model notes it has never been needed in production. These work in code but Figma cannot consume animation tokens.',
    adoption:
      `All ${motionAdoption.animation.total} \`animation:\` call sites are on tokens; ${motionAdoption.transition.literal} of the ${motionAdoption.transition.total} \`transition:\` declarations still hold literals. The animation pass settled three disagreements nothing had chosen: four components were spinning at three different speeds (600ms, 750ms, 1000ms) because there was no token to spin at, and several entrances and exits shared one \`ease\` curve where the system now distinguishes decelerate from accelerate. The remaining transition literals still ignore the \`prefers-reduced-motion\` override, which can only reach tokenised call sites. Both figures are derived at build time — this sentence used to hardcode "42 of the 73", and by the time anyone re-checked, four different counts were in circulation because the prose could not carry the counting rule. See motionAdoption above for the rule.`,
    match: (n) => /^--(duration-|easing-|ease-)/.test(n),
    subGroupKey: (n) => (n.startsWith('--duration-') ? 'duration' : 'easing'),
    expect: ['duration', 'easing'],
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
      adoption: cat.adoption,
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

/**
 * Deliberately `componentUse` ONLY, not the file readers.
 *
 * `undefinedRefs` and `adHocHooks` below are both statements about the
 * @esa/ecology COMPONENT contract — SPEC.md's ad-hoc-hook rule is about tier-3
 * theming surfaces a component offers through a fallback, and the promote-or-
 * fold worklist it feeds is a list of component hooks. A layout primitive's
 * element-scoped knob (`--gap` on `.cluster`) is a different construct that
 * happens to share the syntax, and folding it in here would file it as a
 * missing tier-3 hook, which it is not.
 *
 * This looks like an omission. It is not — do not "complete" it.
 */
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

/**
 * Does ANY shipped surface read this token?
 *
 * The three arms stay separate everywhere else, because they answer different
 * questions — blast radius, component reach, shipped-surface reach. They are
 * OR-ed here and nowhere else. Every "is this dead?" test must go through this
 * helper: the reason 102 typography tokens once reported as orphans is that
 * this predicate was written inline against the two arms that existed, so
 * adding a third reader kind would otherwise have to be remembered at each site.
 */
const hasReader = (t: TokenNode) =>
  t.usedByTokens.length > 0 || t.usedByComponents.length > 0 || t.usedByFiles.length > 0;

const unread = allTokens.filter((t) => t.tier !== 'primitive' && !hasReader(t));

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
  .filter((t) => t.tier === 'primitive' && !hasReader(t))
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
 *  `--snackbar-item-danger-bg` is plainly a colour and matches no name pattern. */
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

/**
 * A `.css` file @esa/tokens SHIPS that no scan root covers and no exemption
 * names — so every token it reads will report as an orphan, and orphan on this
 * page reads as "nothing needs this, delete it".
 *
 * Derived from the package's own `exports` map, which is the authoritative
 * declaration of what ships, rather than from a list someone maintains here.
 * That is what makes this a guard rather than a note: shipping a partial from a
 * location no root covers turns the health tally red on the next build and
 * names the file. Had it existed, typography.css would have surfaced the day it
 * was exported, instead of after 102 tokens had been mislabelled.
 *
 * What it catches is a new LOCATION, not a new file. Roots are directories, so
 * dropping another partial into packages/tokens/src is picked up automatically
 * — which is the desired behaviour, not a hole. The failure mode this exists
 * for is a surface that ships from somewhere nobody thought to look.
 */
export const scanCoverageGaps: Finding[] = (() => {
  const pkg = JSON.parse(readIf(path.join(TOKENS, 'package.json')) || '{}');
  const shipped = [
    ...new Set(Object.values((pkg.exports ?? {}) as Record<string, string>).filter((v) => v.endsWith('.css'))),
  ].map((v) => `packages/tokens/${v.replace(/^\.\//, '')}`);

  return shipped
    .filter((rel) => !SCAN_ROOTS.some((r) => rel === r.rel || rel.startsWith(`${r.rel}/`)))
    .filter((rel) => !READ_SCAN_EXEMPT.some((e) => rel === e.rel || rel.startsWith(`${e.rel}/`)))
    .sort()
    .map((rel) => ({
      token: rel,
      detail:
        '@esa/tokens ships this file but nothing read-scans it — every token it reads will report as an orphan',
      where: 'SCAN_ROOTS / READ_SCAN_EXEMPT in token-graph.ts',
    }));
})();

/** Only the actionable checks count toward the headline number. Ad-hoc hooks
 *  and unused ramp steps are inventory, not defects — folding them in would
 *  make the tally permanently alarming and therefore ignorable. */
export const healthTotal =
  undefinedRefs.length +
  duplicateDeclarations.length +
  themePrimitiveOverrides.length +
  scanCoverageGaps.length +
  orphans.length +
  tierSkips.length +
  semanticHardcodes.length;
