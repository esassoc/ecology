/**
 * DEBUG-ONLY audit of tier-1 token NAMES against the 6-slot naming rubric.
 *
 * The third of the three naming audits, and the one with the most at stake: a
 * tier-1 name is the only description a raw value ever gets. There is no layer
 * below it to explain what `--color-yellow-9` or `--shadow-50` means, so if the
 * name is wrong the value is unfindable.
 *
 *   --eco-<tier>-<category>-<property>-<variant|scale>
 *
 * Same contract as tier2-naming.ts and tier3-naming.ts: everything countable is
 * DERIVED from the real token names and the real files, so the numbers stay
 * honest when tokens move. The rubric text, the vocabulary mapping and the
 * "what this means" prose are authored — that part is judgment a parser can't
 * make.
 *
 * Two checks here reach outside the token package, which the other two audits
 * do not. Tier 1 was renamed once already (a `-50…900` lightness scale became
 * the Radix `-1…12` step scale) and the rename stopped at the package boundary,
 * so the interesting evidence is in the files that still cite the old names.
 * Those scans are scoped to a fixed directory list, not the whole tree.
 *
 * Consumed only by /debug/tokens, which is excluded from production builds.
 * Delete alongside token-graph.ts when the refinement work is done.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allTokens, byTier, type TokenNode } from './token-graph';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const primitives = byTier('primitive');
const semantic = byTier('semantic');

export const total = primitives.length;

/* ------------------------------------------------------------- the rubric */

export interface RubricSlot {
  n: number;
  name: string;
  spec: string;
  /** Authored verdict, shown next to the derived count. */
  verdict: string;
  status: 'absent' | 'partial' | 'match';
}

export const grammars = {
  current: [
    'ramp:    --color-<hue>[-<mode>|-<channel>]-<step>',
    'measure: --<category|property>-<step>',
    'type:    --<css-property>-<value>   (adopted; see slot 3)',
  ],
  rubric: '--eco-<tier>-<category>-<property>-<variant|scale>',
};

/* ======================================================================
 * Slot 1–2 · namespace and tier
 * ================================================================== */

/**
 * A prefix that declares tokens at more than one tier. At tier 2 this was an
 * argument about readability; here it is the mechanism by which SPEC.md's one
 * hard rule gets broken silently, so it is measured rather than asserted.
 */
export interface StraddleRow {
  prefix: string;
  tier1: string[];
  tier2: string[];
  tier3: string[];
  /** Authored: what the shared prefix actually costs. */
  cost: string;
}

const firstSegment = (name: string) => name.replace(/^--/, '').split('-')[0];

const STRADDLE_COST: Record<string, string> = {
  color:
    'The big one. A raw ramp step and a semantic role are spelled the same way, so `--color-gray-3` and `--color-background-sunken` are indistinguishable in a diff. SPEC.md calls reaching past tier 2 “the bug”; nothing in the name announces that you just did it.',
  radius:
    '`--radius-200` (a ramp step) and `--radius-surface` (a role) differ only by whether the last segment is a number. This is the exact violation SPEC.md uses as its worked example — `border-radius: var(--radius-200)` — and the name gives a reviewer nothing to catch it with.',
  font:
    'Reduced but not closed, and honestly it was partly self-inflicted. Moving `--font-sans`/`--font-mono`/`--font-weight-<role>` to tier 2 took the roles out of tier 1; renaming `--type-size-*` to `--font-size-*` then put a NEW pair in collision — `--font-size-200` (tier 1) beside `--font-size-ui-md` (tier 2). That trade was made deliberately: the old name carried a homonym the rubric names explicitly, and a prefix straddle is a legibility problem where a role at tier 1 was a correctness one. It closes with the namespace decision, uniformly, along with `--color-` and `--radius-`.',
  icon:
    'Weaker than the three above, and worth stating as such: the collision is only in the first segment. `--icon-size-*` is a tier-1 ramp, while `--icon-button-*` and `--icon-link-*` are tier-3 surfaces belonging to esa-icon-button and esa-icon-link. Nothing resolves wrongly — but a prefix search for “icon tokens” returns two unrelated sets.',
};

export const straddleRows: StraddleRow[] = (() => {
  const byPrefix = new Map<string, { 1: string[]; 2: string[]; 3: string[] }>();
  for (const t of allTokens) {
    const p = firstSegment(t.name);
    if (!byPrefix.has(p)) byPrefix.set(p, { 1: [], 2: [], 3: [] });
    byPrefix.get(p)![t.tier === 'primitive' ? 1 : t.tier === 'semantic' ? 2 : 3].push(t.name);
  }
  return [...byPrefix.entries()]
    // Tier 1 has to be one of the parties, or it belongs in the tier-3 audit.
    .filter(([, t]) => t[1].length && (t[2].length || t[3].length))
    .map(([prefix, t]) => ({
      prefix,
      tier1: t[1],
      tier2: t[2],
      tier3: t[3],
      cost: STRADDLE_COST[prefix] ?? 'Shared prefix across tiers; no authored note yet.',
    }))
    .sort((a, b) => b.tier1.length - a.tier1.length);
})();

/* ======================================================================
 * Not a primitive at all · tier-1 tokens whose value is a reference
 * ================================================================== */

/**
 * A primitive holds a value. A token that holds a *reference* is an alias, and
 * an alias is by definition an intent expressed in terms of something else —
 * tier 2's job. These are found structurally (the compiled value is a bare
 * `var()`), not by recognising names, so a new one cannot slip in unnoticed.
 */
export interface AliasRow {
  name: string;
  value: string;
  resolved: string;
  /** The rubric levels this name actually uses. */
  levels: string;
  /** Authored: where it belongs and why. */
  verdict: string;
}

const ALIAS_VERDICT = (name: string): { levels: string; verdict: string } => {
  if (name.startsWith('--color-status-')) {
    return {
      levels: 'concept (status) + variant (info|success|warning) + property (subtle|border|strong)',
      verdict: 'Belongs in tokens/semantic/color.json — see the note under this table.',
    };
  }
  if (name === '--font-display') {
    return {
      levels: 'category (font) + concept (display)',
      verdict:
        '“Display” is an intention, not a face. Its own $description says the slot exists so a spoke can override it — which is the definition of a tier-2 role, declared one tier too low.',
    };
  }
  if (name === '--font-family-primary') {
    return {
      levels: 'category (font) + property (family) + variant (primary)',
      verdict:
        '`primary` is the rubric’s brand variant. This is the best-formed name in the tier-1 set and it is in the wrong file.',
    };
  }
  return { levels: '—', verdict: 'An alias at tier 1; no authored note yet.' };
};

export const aliasRows: AliasRow[] = primitives
  .filter((t) => /^var\(\s*--/.test(t.value.trim()))
  .map((t) => ({ name: t.name, value: t.value, resolved: t.resolved, ...ALIAS_VERDICT(t.name) }));

/**
 * The status family is the sharpest evidence that this is a split rather than a
 * style choice: one member already migrated and the rest did not. Derived by
 * asking, for each concept word, which tiers declare a token carrying it.
 */
export interface ConceptSplitRow {
  concept: string;
  tier1: string[];
  tier2: string[];
}

export const conceptSplit: ConceptSplitRow[] = ['info', 'success', 'warning', 'danger'].map((c) => ({
  concept: c,
  tier1: primitives.filter((t) => t.name.includes(`-${c}`)).map((t) => t.name),
  tier2: semantic.filter((t) => new RegExp(`^--color-${c}\\b`).test(t.name)).map((t) => t.name),
}));

/* ======================================================================
 * Slot 3–4 · the ramp name, which carries three different things
 * ================================================================== */

const RAMP = /^--color-(.+)-(\d{1,2})$/;

/**
 * Ramp-level `$description`s, read straight from the DTCG source. token-graph.ts
 * only carries descriptions attached to a `$value`, and the two admissions that
 * a ramp is misnamed sit on the ramp GROUP, one level above every step — so the
 * evidence for the rename check is only reachable from here.
 */
const colorSource: { color?: Record<string, Record<string, unknown>> } = (() => {
  const p = path.join(ROOT, 'packages', 'tokens', 'tokens', 'primitive', 'color.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
})();

const rampDescriptions: Map<string, string> = (() => {
  const out = new Map<string, string>();
  for (const [base, group] of Object.entries(colorSource.color ?? {})) {
    const desc = (group as { $description?: unknown })?.$description;
    if (typeof desc === 'string') out.set(base, desc);
  }
  return out;
})();

/**
 * Authored `$value`s keyed `<ramp>-<step>`. Needed because Style Dictionary
 * normalises 8-digit hex to rgba() on the way out, so a notation difference
 * between two source files is invisible in the compiled CSS.
 */
const sourceValues: Map<string, string> = (() => {
  const out = new Map<string, string>();
  for (const [base, group] of Object.entries(colorSource.color ?? {})) {
    for (const [step, leaf] of Object.entries(group ?? {})) {
      if (step.startsWith('$')) continue;
      const v = (leaf as { $value?: unknown })?.$value;
      if (typeof v === 'string') out.set(`${base}-${step}`, v);
    }
  }
  return out;
})();

/** Numeric steps ascending, then any named escape hatches. */
const sortSteps = (steps: string[]): string[] => {
  const num = steps.filter((s) => /^\d+$/.test(s)).sort((a, b) => Number(a) - Number(b));
  const named = steps.filter((s) => !/^\d+$/.test(s)).sort();
  return [...num, ...named];
};

export type RampKind = 'hue' | 'mode' | 'channel';

export interface RampRow {
  base: string;
  /** What the slot after `--color-` actually encodes. */
  kind: RampKind;
  /** The hue part, once any mode/channel suffix is removed. */
  hue: string;
  /** `dark`, `a`, or null. */
  modifier: string | null;
  steps: number;
  /** Steps referenced by another token or by an @esa/ecology component. */
  used: number;
  /** Non-null when the source $description admits the name doesn't match the value. */
  renamedFrom: string | null;
}

const isUsed = (t: TokenNode) => t.usedByTokens.length > 0 || t.usedByComponents.length > 0;

export const rampRows: RampRow[] = (() => {
  const bases = new Map<string, TokenNode[]>();
  for (const t of primitives) {
    const m = t.name.match(RAMP);
    if (!m) continue;
    if (!bases.has(m[1])) bases.set(m[1], []);
    bases.get(m[1])!.push(t);
  }
  return [...bases.entries()]
    .map(([base, toks]) => {
      const modifier = base.endsWith('-dark') ? 'dark' : base.endsWith('-a') ? 'a' : null;
      const hue = modifier ? base.slice(0, -(modifier.length + 1)) : base;
      // The source $description is where a rename is already confessed; read it
      // rather than hard-coding a list, so a third one can't be added quietly.
      const desc = rampDescriptions.get(base) ?? toks.find((t) => t.description)?.description ?? '';
      const claim = desc.match(/\(Radix (\w+)\)/);
      const renamed = /backward compat/i.test(desc) && claim ? claim[1] : null;
      return {
        base,
        kind: (modifier === 'dark' ? 'mode' : modifier === 'a' ? 'channel' : 'hue') as RampKind,
        hue,
        modifier,
        steps: toks.length,
        used: toks.filter(isUsed).length,
        renamedFrom: renamed,
      };
    })
    .sort((a, b) => a.base.localeCompare(b.base));
})();

export const rampTally = {
  ramps: rampRows.length,
  steps: rampRows.reduce((n, r) => n + r.steps, 0),
  used: rampRows.reduce((n, r) => n + r.used, 0),
  hue: rampRows.filter((r) => r.kind === 'hue').length,
  mode: rampRows.filter((r) => r.kind === 'mode').length,
  channel: rampRows.filter((r) => r.kind === 'channel').length,
  renamed: rampRows.filter((r) => r.renamedFrom).length,
};

/**
 * The mode ramps have a reader, but not one this graph can see: the site's own
 * `[data-scheme="dark"]` block. That is the finding, not an oversight — the
 * naming forces it. Verified against the file rather than asserted.
 */
export const darkModeConsumer = (() => {
  const p = path.join(ROOT, 'apps', 'site', 'src', 'styles', 'docs-dark.css');
  if (!existsSync(p)) return { file: null as string | null, refs: 0 };
  const css = readFileSync(p, 'utf8');
  const refs = new Set(
    [...css.matchAll(/var\(\s*(--color-[a-z]+-dark-\d{1,2})/g)].map((m) => m[1]),
  );
  return { file: 'apps/site/src/styles/docs-dark.css', refs: refs.size };
})();

/* ======================================================================
 * Slot 3–5 · typography, measured against the adopted convention
 *
 * The convention this system settled on is `--<css-property>-<value>`: the
 * token name IS a real CSS property plus the value it holds. It needs no
 * invented category word, and it optimises for the one audience tier-1
 * typography actually has — the person mapping these into tier-2 roles.
 *
 * Two rules follow from it, and each token is judged on both:
 *   1. the name leads with a real CSS property;
 *   2. the value segment describes the VALUE, not a job. `--font-family-dm-sans`
 *      names the face; `--font-sans` names a role and belongs at tier 2.
 * ================================================================== */

/** Every CSS property a type composite can set, in the order a designer reads them. */
const TYPE_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-transform',
] as const;

/**
 * How the value segment of a name is chosen.
 *  - `descriptive`         the segment IS the value: --font-weight-350
 *  - `platform convention` the segment is the CSS keyword: --font-style-italic
 *  - `scale position`      the segment names a RUNG, and the ramp is ours:
 *                          --line-height-normal is 1.6 by definition, not a
 *                          reference to the CSS `normal` keyword (SPEC.md)
 *  - `role`                the segment names a job — wrong at tier 1
 */
export type ValueStyle =
  | 'descriptive'
  | 'platform convention'
  | 'scale position'
  | 'role'
  | '—';

export interface TypeRow {
  property: string;
  members: string[];
  /** Just the value segment of each name. */
  values: string[];
  valueStyle: ValueStyle;
  status: 'match' | 'partial' | 'absent';
  note: string;
}

const TYPE_NOTE: Record<string, { style: ValueStyle; status: TypeRow['status']; note: string }> = {
  'font-family': {
    style: 'descriptive',
    status: 'match',
    note: 'Names the FACE. This is the “Helvetica 64” rule: uncomfortably literal on purpose, because nothing consumes tier 1 directly and a name that says what the value IS makes the tier-2 mapping legible. `--font-sans` used to live here — a classification, not a face — which is why type-roles.css could document re-pointing a primitive as the spoke contract.',
  },
  'font-size': {
    style: 'descriptive',
    status: 'match',
    note: 'Padded numeric, same scale system as spacing so the two read as one family of measures. Was `--type-size-*`; `type` is on the homonym list (typography? or a variable’s type?) and it made the tier-2 line `--font-size-ui-md: var(--type-size-200)` read as a mapping between two categories when it is one category mapped to itself.',
  },
  'font-weight': {
    style: 'descriptive',
    status: 'match',
    note: 'The raw numbers. These are DM Sans’s optical weights, not universal values, so the role names (light/regular/medium/semibold/bold) live at tier 2 — a spoke swapping the face re-points the roles and leaves the numbers alone. The ramp used to carry only the five steps DM Sans uses, which left cb-fish’s IBM Plex remap (400/500/600) with no 400 or 600 to point at; it now carries the full standard 100–900 plus the three half-steps.',
  },
  'font-style': {
    style: 'platform convention',
    status: 'match',
    note: 'The finite option set, named by the CSS keyword. Was deferred once on the grounds that an unconsumed token is orphan surface — that was a category error: SPEC.md’s “don’t hook everything” rule governs tier-3 THEMING surfaces, where a hook is a promise a spoke can re-skin it. Tier 1 is a vocabulary for the person mapping tier 2, and it had 4 literal readers waiting.',
  },
  'line-height': {
    style: 'scale position',
    status: 'match',
    note: 'Unitless, which is correct — it inherits as a ratio rather than a computed length — and `$type: number` rather than `other`, so the set exports as line-height instead of an opaque string. Four rungs: none (1), tight (1.3), normal (1.6), relaxed (1.8). Getting here took a correction. The scale originally missed its own most common values — `1` appeared 16 times as a literal and `1.4` six times, so more than half of every line-height declaration in the kit was bypassing the scale — and the first fix added a rung for each. That was one rung too many: `snug` (1.4) sat 0.1 from `tight` with no job `tight` could not do, so it was folded in and its six sites moved. The general rule this settles: a literal that keeps appearing is evidence the scale has a GAP, not that it needs a new rung at that exact number. Not one literal line-height remains in the kit. `normal` is 1.6 by DEFINITION — it is the default rung of this ramp, not a reference to the CSS `normal` keyword (~1.2). That distinction is settled and should not be re-raised: see the note on scale-position names in SPEC.md.',
  },
  'letter-spacing': {
    style: 'scale position',
    status: 'match',
    note: 'Named steps, so this system never hits the negative-value naming problem — no `minus-2` convention needed, `tight` carries the sign. `normal` is 0.01em: the DEFINED default tracking, not a reference to the CSS keyword. Checked rather than assumed — nothing in the kit asks for zero tracking, every literal is a positive value, so 0.01em is genuinely the baseline this system sets.',
  },
  'text-transform': {
    style: 'platform convention',
    status: 'match',
    note: 'The finite option set. `uppercase` had 5 literal readers (4 components plus the `.typography-eyebrow` composite), all now wired. `lowercase` and `capitalize` ship unread — a tier-1 ramp is a palette, not a checklist, and the orphan check excludes primitives for exactly this reason.',
  },
};

const TYPE_TOKENS = primitives.filter((t) =>
  TYPE_PROPERTIES.some((p) => t.name.startsWith(`--${p}-`)),
);

export const typeProperties: TypeRow[] = (() => {
  const claimed = new Set<string>();
  // Longest property first: every one of these is a prefix of `--font-`, so a
  // shorter key placed first swallows the longer one's tokens.
  const ordered = [...TYPE_PROPERTIES].sort((a, b) => b.length - a.length);
  const byProp = new Map<string, string[]>();
  for (const p of ordered) {
    const members = TYPE_TOKENS.filter(
      (t) => !claimed.has(t.name) && t.name.startsWith(`--${p}-`),
    ).map((t) => t.name);
    members.forEach((n) => claimed.add(n));
    byProp.set(p, members);
  }

  const rows: TypeRow[] = TYPE_PROPERTIES.map((p) => {
    const members = byProp.get(p) ?? [];
    const meta = TYPE_NOTE[p];
    return {
      property: p,
      members,
      values: sortSteps(members.map((n) => n.slice(`--${p}-`.length))),
      valueStyle: members.length ? meta.style : '—',
      status: meta.status,
      note: meta.note,
    };
  });

  const rest = TYPE_TOKENS.filter((t) => !claimed.has(t.name)).map((t) => t.name);
  if (rest.length) {
    rows.push({
      property: 'unclassified',
      members: rest,
      values: rest,
      valueStyle: '—',
      status: 'absent',
      note: 'Led with none of the seven CSS properties above. A non-empty row here means a tier-1 type token is not named for the property it sets.',
    });
  }
  return rows;
})();

export const typeTally = {
  properties: TYPE_PROPERTIES.length,
  covered: typeProperties.filter((r) => r.members.length).length,
  tokens: TYPE_TOKENS.length,
  /** Tokens leading with a real CSS property — the whole point of the convention. */
  conformant: typeProperties
    .filter((r) => r.property !== 'unclassified')
    .reduce((n, r) => n + r.members.length, 0),
};

/* ======================================================================
 * Fallback drift
 *
 * CLAUDE.md requires every private token to carry a literal fallback:
 * `var(--font-size-200, 0.875rem)`. Nothing checks that the literal agrees with
 * the token, and for a scale whose steps are named for a RUNG rather than a
 * value there is nothing for an author to check it against — so they guess, and
 * they guess differently. This is the concrete cost of ordinal naming, measured.
 * ================================================================== */

/** A length in px, or null when the string isn't a single length. */
const toPx = (v: string): number | null => {
  const s = v.trim();
  const rem = s.match(/^(-?[\d.]+)rem$/);
  if (rem) return Number(rem[1]) * 16;
  const px = s.match(/^(-?[\d.]+)px$/);
  if (px) return Number(px[1]);
  const em = s.match(/^(-?[\d.]+)em$/);
  if (em) return Number(em[1]) * 16;
  const bare = s.match(/^-?[\d.]+$/);
  if (bare) return Number(s);
  return null;
};

/** Equal as measurements, not as strings. Falls back to exact text. */
const sameLength = (a: string, b: string): boolean => {
  const pa = toPx(a);
  const pb = toPx(b);
  if (pa !== null && pb !== null) return Math.abs(pa - pb) < 0.01;
  return a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
};

export interface FallbackRow {
  token: string;
  /** Every distinct literal any read site supplies for this token. */
  fallbacks: string[];
  actual: string;
  files: string[];
  /** True when the token holds a single value, so a fallback CAN be exactly right. */
  exact: boolean;
}

export const fallbackDrift: FallbackRow[] = (() => {
  const values = new Map(allTokens.map((t) => [t.name, t]));
  const found = new Map<string, { fbs: Set<string>; files: Set<string> }>();
  const dirs = ['packages/ecology/src', 'packages/tokens/src', 'apps/site/src'];

  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(astro|ts|css)$/.test(e.name)) continue;
      const src = readFileSync(p, 'utf8');
      // Only single-literal fallbacks — a nested var() fallback is a different
      // construct and comparing it to a raw value would be meaningless.
      for (const m of src.matchAll(
        /var\(\s*(--(?:font-size|font-weight|font-family|line-height|letter-spacing|spacing)-[\w-]+)\s*,\s*([^(),]+?)\s*\)/g,
      )) {
        const [, token, fb] = m;
        const node = values.get(token);
        if (!node) continue;
        // `8px` and `0.5rem` are the SAME value — comparing the strings would
        // report every correctly-written px fallback as drift, which is the
        // opposite of useful. Normalise to px at the 16px root first.
        if (sameLength(node.resolved, fb)) continue;
        if (!found.has(token)) found.set(token, { fbs: new Set(), files: new Set() });
        found.get(token)!.fbs.add(fb);
        found.get(token)!.files.add(path.relative(ROOT, p));
      }
    }
  };
  dirs.forEach((d) => walk(path.join(ROOT, d)));

  return [...found.entries()]
    .map(([token, { fbs, files }]) => ({
      token,
      fallbacks: [...fbs].sort(),
      actual: values.get(token)!.resolved,
      files: [...files].sort(),
      // A clamp() has no single value, so no literal can match it exactly. Every
      // other token could have been written correctly and wasn't.
      exact: !values.get(token)!.resolved.includes('clamp('),
    }))
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.fallbacks.length - a.fallbacks.length);
})();

export const fallbackTally = {
  tokens: fallbackDrift.length,
  /** Tokens whose value is a single literal — these are simply wrong. */
  wrong: fallbackDrift.filter((r) => r.exact).length,
  /** Tokens with more than one distinct fallback across the kit. */
  contradictory: fallbackDrift.filter((r) => r.fallbacks.length > 1).length,
};

/** The roles that moved to tier 2, so the split is visible as a split. */
export const composites = semantic
  .filter((t) => /^--(font-sans|font-mono|font-display|font-weight-[a-z]|font-size-ui-)/.test(t.name))
  .map((t) => ({ name: t.name, value: t.value }));

/* ======================================================================
 * Slot 5 · the scale systems, and the one that is ragged
 * ================================================================== */

export type ScaleKind = 'radix 1–12' | 'padded numeric' | 'ragged numeric' | 't-shirt' | 'named';

export interface ScaleRow {
  family: string;
  kind: ScaleKind;
  steps: string[];
  /** Named steps sitting off a numeric ramp, e.g. `full`. Not a defect. */
  escapes: string[];
  /** True when this family breaks the convention its own class uses. */
  ragged: boolean;
  note: string;
}

const TSHIRT = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);

/**
 * Classify from the members, so a family that changes shape reclassifies itself.
 * A numeric ramp keeps its classification when it also carries a named escape
 * hatch — `--radius-full` is one deliberate exception, not evidence that radius
 * is a named scale.
 */
const classify = (steps: string[]): { kind: ScaleKind; ragged: boolean; escapes: string[] } => {
  const numeric = steps.filter((s) => /^\d+$/.test(s));
  const escapes = steps.filter((s) => !/^\d+$/.test(s));
  if (numeric.length >= 2) {
    // Ragged = a sub-100 step written without the leading zeros the family's
    // own three-digit steps establish. `--shadow-50` beside `--shadow-500`.
    const wide = numeric.some((s) => s.length >= 3);
    const ragged = wide && numeric.some((s) => Number(s) < 100 && s.length < 3);
    return { kind: ragged ? 'ragged numeric' : 'padded numeric', ragged, escapes };
  }
  if (steps.every((s) => TSHIRT.has(s))) return { kind: 't-shirt', ragged: false, escapes: [] };
  return { kind: 'named', ragged: false, escapes: [] };
};

const SCALE_FAMILIES: { family: string; re: RegExp; note: string }[] = [
  { family: '--color-<ramp>-*', re: /^--color-.+-\d{1,2}$/, note: 'Radix’s 12-step scale, where each step has a fixed job (2 = subtle surface, 9 = solid fill, 11 = text on a surface). A bounded, meaning-carrying scale — the strongest naming in the tier.' },
  { family: '--spacing-*', re: /^--spacing-/, note: 'Padded ordinal, consistent with itself, extending to a four-digit top end. Briefly converted to value-names (`--spacing-16`) and converted back: spacing is a scale you pick a RUNG from, and the ordinal keeps those rungs evenly spaced in the name even though the values behind them are not — 400 to 500 is one step, 1rem to 1.5rem is not. It also leaves room to insert a step without renumbering the rest.' },
  { family: '--font-size-*', re: /^--font-size-/, note: 'Still a padded ordinal, and now the odd one out — spacing converted to value-names and these could not follow. Every step is a `clamp()` with a min and a max, so there is no single number to put in the name. That is also why the fallback check below finds so many disagreeing literals: nothing tells an author which number this step "is".' },
  { family: '--radius-*', re: /^--radius-/, note: 'Padded numeric plus one named escape hatch (`full`), which is the right way to name a value that is not on the ramp.' },
  { family: '--shadow-*', re: /^--shadow-/, note: 'The one ragged member. `--shadow-50` is the only sub-100 step in the whole system written without padding, so shadows sort wrong in every alphabetical listing while spacing, radius and type sort right.' },
  { family: '--font-weight-*', re: /^--font-weight-/, note: 'Named scale. Correct — weights have established names, and 350/550/650 would be worse.' },
  { family: '--line-height-*', re: /^--line-height-/, note: 'Named scale, three steps. Fine as a scale; the missing category is the slot-3 finding above.' },
  { family: '--letter-spacing-*', re: /^--letter-spacing-/, note: 'Named scale, four steps, and the only one using a comparative (`wide` → `wider`) rather than an absolute. Harmless, but it means the scale has no obvious next step.' },
  { family: '--icon-size-*', re: /^--icon-size-/, note: 'The only tier-1 dimension on a t-shirt scale, matching the shared component size scale from CLAUDE.md. Deliberate and defensible — it is sized to line up with controls, not with the spacing ramp.' },
  { family: '--transition-*', re: /^--transition-/, note: 'Named scale over a fused value (duration and easing welded into one string). The scale naming is fine; the composite is the defect token-graph.ts already flags.' },
];

export const scaleRows: ScaleRow[] = SCALE_FAMILIES.map(({ family, re, note }) => {
  const members = primitives.filter((t) => re.test(t.name)).map((t) => t.name);
  const steps = [...new Set(members.map((n) => n.split('-').pop()!))];
  const { kind, ragged, escapes } =
    family === '--color-<ramp>-*'
      ? { kind: 'radix 1–12' as ScaleKind, ragged: false, escapes: [] as string[] }
      : classify(steps);
  return { family, kind, steps: sortSteps(steps), escapes, ragged, note };
});

export const raggedFamilies = scaleRows.filter((r) => r.ragged).map((r) => r.family);

/* ======================================================================
 * Two names, one value
 * ================================================================== */

/** Normalise so `#00000072` and `rgba(0,0,0,0.45)` compare equal. */
const normalise = (v: string): string => {
  const s = v.trim().toLowerCase();
  const hex8 = s.match(/^#([0-9a-f]{8})$/);
  if (hex8) {
    const [r, g, b, a] = hex8[1].match(/../g)!.map((x) => parseInt(x, 16));
    return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
  }
  const hex6 = s.match(/^#([0-9a-f]{6})$/);
  if (hex6) {
    const [r, g, b] = hex6[1].match(/../g)!.map((x) => parseInt(x, 16));
    return `rgba(${r},${g},${b},1.00)`;
  }
  const fn = s.match(/^rgba?\(([^)]+)\)$/);
  if (fn) {
    const p = fn[1].split(',').map((x) => x.trim());
    return `rgba(${p[0]},${p[1]},${p[2]},${Number(p[3] ?? 1).toFixed(2)})`;
  }
  return s;
};

export type DupeKind = 'defect' | 'mode pair' | 'sibling ramp' | 'cross-category';

export interface DupeRow {
  value: string;
  names: string[];
  kind: DupeKind;
  note: string;
}

const familyOf = (n: string) => {
  const m = n.match(RAMP);
  return m ? `--color-${m[1]}` : n.replace(/-[^-]+$/, '');
};

const DUPE_NOTE: Record<DupeKind, string> = {
  defect:
    'Two steps of the SAME family holding one value. The scale claims a resolution it does not have, and any tier-2 role that distinguishes them is distinguishing nothing.',
  'mode pair':
    'A hue and its dark-mode counterpart. Radix keeps the solid-fill steps identical across modes on purpose, so this is the scale working, not a collision.',
  'sibling ramp':
    'Two colour ramps landing on the same value at different steps. Not a defect, but it is the only signal that these ramps overlap — nothing in either name says so.',
  'cross-category':
    'Different categories agreeing on a measure. Expected — a 0.5rem radius and a 0.5rem gap are unrelated decisions that happen to coincide.',
};

/**
 * Grouped by value, then classified by what the colliding names have in common.
 * The defect case has to be detected WITHIN a bucket rather than by the bucket
 * being homogeneous: `--radius-200` and `--radius-300` share 0.5rem with
 * `--spacing-200`, and reading the bucket as a whole would file the real
 * same-family collision under the harmless cross-category one.
 */
export const dupeRows: DupeRow[] = (() => {
  const byValue = new Map<string, TokenNode[]>();
  for (const t of primitives) {
    if (/^var\(/.test(t.value.trim())) continue;
    const key = normalise(t.resolved);
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key)!.push(t);
  }

  const rows: DupeRow[] = [];
  for (const [value, toks] of byValue) {
    if (toks.length < 2) continue;
    const names = toks.map((t) => t.name).sort();

    // Same family twice in one bucket is the defect, whatever else shares it.
    const perFamily = new Map<string, string[]>();
    for (const n of names) {
      const f = familyOf(n);
      if (!perFamily.has(f)) perFamily.set(f, []);
      perFamily.get(f)!.push(n);
    }
    const collided = [...perFamily.values()].filter((ns) => ns.length > 1);
    for (const ns of collided) rows.push({ value, names: ns, kind: 'defect', note: DUPE_NOTE.defect });

    // Whatever is left over, classified by how the families relate.
    const rest = names.filter((n) => !collided.some((ns) => ns.includes(n)));
    if (rest.length < 2) continue;
    const fams = [...new Set(rest.map(familyOf))];
    const hues = new Set(fams.map((f) => f.replace(/-dark$/, '')));
    const allRamps = rest.every((n) => RAMP.test(n));
    const kind: DupeKind = hues.size === 1 ? 'mode pair' : allRamps ? 'sibling ramp' : 'cross-category';
    rows.push({ value, names: rest, kind, note: DUPE_NOTE[kind] });
  }

  const order: Record<DupeKind, number> = {
    defect: 0,
    'sibling ramp': 1,
    'mode pair': 2,
    'cross-category': 3,
  };
  return rows.sort((a, b) => order[a.kind] - order[b.kind] || a.names[0].localeCompare(b.names[0]));
})();

export const dupeDefects = dupeRows.filter((r) => r.kind === 'defect');

/**
 * The two black-alpha ramps. Not duplicates step-for-step — they are two
 * DIFFERENT alpha progressions of the same colour, which is the harder problem:
 * nothing in either name says which progression you are getting.
 */
export const alphaRamps = (() => {
  const read = (base: string) =>
    primitives
      .filter((t) => t.name.startsWith(`--color-${base}-`))
      .sort((a, b) => Number(a.name.split('-').pop()) - Number(b.name.split('-').pop()));
  const grayA = read('gray-a');
  const blackA = read('black-a');
  const alphaOf = (t: TokenNode) => normalise(t.resolved).match(/,([\d.]+)\)$/)?.[1] ?? '?';
  return {
    rows: grayA.map((t, i) => ({
      step: t.name.split('-').pop()!,
      grayA: t.name,
      grayAlpha: alphaOf(t),
      blackA: blackA[i]?.name ?? '—',
      blackAlpha: blackA[i] ? alphaOf(blackA[i]) : '—',
      same: blackA[i] ? alphaOf(t) === alphaOf(blackA[i]) : false,
    })),
    grayAUsed: grayA.filter(isUsed).length,
    blackAUsed: blackA.filter(isUsed).length,
    // The AUTHORED notation, not the compiled one. Style Dictionary normalises
    // 8-digit hex to rgba() on the way out, so the two source files disagree in
    // a way the shipped CSS hides — which is why this reads the JSON.
    notation: {
      grayA: sourceValues.get('gray-a-1') ?? '',
      blackA: sourceValues.get('black-a-1') ?? '',
    },
  };
})();

/* ======================================================================
 * The rename that stopped at the package boundary
 * ================================================================== */

const SCAN_DIRS = ['packages', 'apps', 'plugins'];
const SCAN_FILES = ['CLAUDE.md', 'README.md'];
const SCAN_EXT = /\.(astro|ts|js|mjs|css|md|json)$/;
// Two deliberate exclusions.
//   1. The stray package-root CSS files: reported in full by `strayFiles` below,
//      and letting them in would bury the LIVE citations under forty names from
//      a file nothing loads.
//   2. This audit's own source. It quotes retired names while explaining them,
//      so without this the page reports itself as a finding — which it did,
//      exactly once, the moment the real citations were fixed.
const SCAN_SKIP =
  /node_modules|[\\/]dist[\\/]|[\\/]\.git[\\/]|packages[\\/]tokens[\\/][^\\/]+\.css$|src[\\/]data[\\/]tier\d-naming\.ts$|src[\\/]pages[\\/]debug[\\/]/;

const scanTargets = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (SCAN_SKIP.test(p)) continue;
      if (entry.isDirectory()) walk(p);
      else if (SCAN_EXT.test(entry.name)) out.push(p);
    }
  };
  SCAN_DIRS.forEach((d) => walk(path.join(ROOT, d)));
  SCAN_FILES.forEach((f) => {
    const p = path.join(ROOT, f);
    if (existsSync(p)) out.push(p);
  });
  return out;
};

const declared = new Set(allTokens.map((t) => t.name));

export interface GhostRow {
  name: string;
  files: string[];
  /** Authored: what breaks where this name is cited. */
  impact: string;
}

const GHOST_IMPACT = (files: string[]): string => {
  if (files.some((f) => f.includes('spoke-template'))) {
    return 'Live: this is a var() read in the spoke template, so every new spoke starts with the property dropped.';
  }
  if (files.some((f) => f.includes('plugins/'))) {
    return 'Live: the plugin skill teaches this name to Claude in every spoke session.';
  }
  if (files.some((f) => /SPEC\.md|CLAUDE\.md|README\.md/.test(f))) {
    return 'Documentation: a checked-in doc teaches a token that no longer exists. SPEC.md is the one that matters — it is the contract every new component is written against.';
  }
  return 'Cited in a dead file — see the stray files below.';
};

/**
 * Names matching the retired `-50…900` shape that are still cited somewhere,
 * with the citation sites. This is the cost of a tier-1 rename measured
 * directly rather than assumed.
 */
export const ghostRows: GhostRow[] = (() => {
  const hits = new Map<string, Set<string>>();
  for (const file of scanTargets()) {
    let src: string;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(/(--color-[a-z]+-\d{2,4})\b/g)) {
      if (declared.has(m[1])) continue;
      if (!hits.has(m[1])) hits.set(m[1], new Set());
      hits.get(m[1])!.add(path.relative(ROOT, file));
    }
  }
  return [...hits.entries()]
    .map(([name, files]) => ({ name, files: [...files].sort(), impact: GHOST_IMPACT([...files]) }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

export interface StrayFile {
  file: string;
  names: number;
  /** Names in this file that do not exist in the shipped output. */
  ghosts: number;
  exported: boolean;
  packed: boolean;
  note: string;
}

/**
 * Token files sitting at the package root, superseded by `src/` and `dist/`.
 * They are the source the ghost names above were copied from, and because they
 * are neither in `exports` nor in `files` nothing loads them — which is exactly
 * why nobody noticed they still describe a different system.
 */
export const strayFiles: StrayFile[] = (() => {
  const pkgPath = path.join(ROOT, 'packages', 'tokens', 'package.json');
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {};
  // Compare whole export TARGETS, not filename suffixes: `./dist/tokens.css`
  // ends with `tokens.css` while pointing at an entirely different file, which
  // is exactly the confusion this table exists to settle.
  const exported = new Set<string>(Object.values(pkg.exports ?? {}) as string[]);
  const packed: string[] = pkg.files ?? [];
  const dir = path.join(ROOT, 'packages', 'tokens');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.css') && statSync(path.join(dir, f)).isFile())
    .map((f) => {
      const src = readFileSync(path.join(dir, f), 'utf8');
      const names = [...new Set([...src.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]))];
      return {
        file: `packages/tokens/${f}`,
        names: names.length,
        ghosts: names.filter((n) => !declared.has(n)).length,
        exported: exported.has(`./${f}`),
        packed: packed.includes(f),
        note:
          f === 'tokens.css'
            ? 'The pre-Radix palette: a `-0…900` lightness scale under the same `--color-<hue>-` prefix the current ramps use. Every ghost name above traces here.'
            : 'A superseded copy of the tier-3 surface, kept beside the live one in src/.',
      };
    })
    .sort((a, b) => b.ghosts - a.ghosts);
})();

/* ------------------------------------------------------------ the verdict */

const straddleNames = straddleRows.map((r) => r.prefix).join(', ');
const typeGaps = typeProperties.filter((r) => !r.members.length).map((r) => r.property);

export const slots: RubricSlot[] = [
  {
    n: 1,
    name: 'Global prefix',
    spec: 'eco-',
    verdict: `0 of ${total}. Same as tiers 2 and 3 — no token in the system carries a namespace.`,
    status: 'absent',
  },
  {
    n: 2,
    name: 'Tier identifier',
    spec: 'primitive / ramp',
    verdict: `0 of ${total}, and ${straddleRows.length} prefixes (${straddleNames}) declare tokens at more than one tier. At tier 2 this cost readability; here it hides the one violation SPEC.md says must never happen.`,
    status: 'absent',
  },
  {
    n: 3,
    name: 'Category',
    spec: 'color, typography, spacing, border, radius, box-shadow, animation',
    verdict: `Colour and spacing lead with their category. Typography no longer needs one: all ${typeTally.conformant} of its tokens lead with the CSS PROPERTY they set, covering ${typeTally.covered} of ${typeTally.properties} properties (missing: ${typeGaps.join(', ') || 'none'}). Radius and shadow lead with a property too — which is the same convention, just never stated as one.`,
    status: 'partial',
  },
  {
    n: 4,
    name: 'Property',
    spec: 'the attribute within the category',
    verdict: `Absent from the ramp names by design — a ramp step is a value, not a property, and that is correct. Where it does apply it is inconsistent: --font-weight-* names it, --font-sans omits it, --line-height-* leads with it.`,
    status: 'partial',
  },
  {
    n: 5,
    name: 'Scale',
    spec: 'enumerated, ordered, bounded, t-shirt',
    verdict: `${scaleRows.length} families across ${new Set(scaleRows.map((r) => r.kind)).size} scale systems. Mixed systems ACROSS classes is what the rubric asks for; ${raggedFamilies.length || 'no'} family breaks the convention inside its own class (${raggedFamilies.join(', ') || 'none'}).`,
    status: raggedFamilies.length ? 'partial' : 'match',
  },
  {
    n: 6,
    name: 'Mode',
    spec: 'appended last: on-light / on-dark',
    verdict: `Present for ${rampTally.mode} ramps but placed in the hue slot (--color-gray-dark-11, where the rubric writes --color-gray-11-dark), so mode, hue and alpha channel all share one position.`,
    status: 'partial',
  },
];

/* --------------------------------------------------- the ordered worklist */

export interface Fix {
  rank: number;
  title: string;
  effort: 'mechanical' | 'small' | 'design work';
  /** Derived scope, so the size of the job can't go stale. */
  scope: string;
  detail: string;
  /**
   * Derived from the same counts the finding tables use, NOT authored. A fix
   * marked done because someone edited this list would be worth nothing; marked
   * done because the check that found it now returns zero is worth something.
   */
  done: boolean;
  /** Authored: what was actually done, shown once `done` flips. */
  outcome?: string;
}

export const worklist: Fix[] = [
  {
    rank: 1,
    title: 'Retire the stray package-root CSS files and the names they teach',
    effort: 'mechanical',
    scope: `${strayFiles.length} files, ${ghostRows.length} ghost names in ${new Set(ghostRows.flatMap((g) => g.files)).size} places`,
    detail:
      'Nothing loads the stray files, but they are the source every retired name was copied from — including the ones in the spoke template, where they are live var() reads that resolve to nothing. Delete the files, fix the citations.',
    done: strayFiles.length === 0 && ghostRows.length === 0,
    outcome:
      'Both files deleted. The spoke template and the spoke-init skill now cite real ramp steps (9 = solid fill, 10 = hover), and SPEC.md / CLAUDE.md / README.md no longer document --color-teal-900.',
  },
  {
    rank: 2,
    title: 'Get the aliases out of the primitive files',
    effort: 'small',
    scope: `${aliasRows.length} tokens`,
    detail:
      'Re-declare the status family in tokens/semantic/color.json, matching the shape danger already uses, and move the font aliases with them.',
    done: aliasRows.length === 0,
    outcome:
      'Resolved as a deletion rather than a move: the tier-2 roles already existed and merely detoured through the tier-1 status block, so the 12 were repointed straight at their ramp steps and the block deleted. --font-family-primary went with them (zero readers); --font-display moved to semantic/typography.json under the same name. Verified value-neutral — 0 of 421 remaining tokens changed value.',
  },
  {
    rank: 3,
    title: 'Pad the one ragged scale step',
    effort: 'mechanical',
    scope: `${raggedFamilies.length} ragged family`,
    detail:
      '--shadow-50 was the only sub-100 step in the system written without padding, so shadows sorted wrong wherever tokens are listed alphabetically.',
    done: raggedFamilies.length === 0,
    outcome: '--shadow-50 → --shadow-050. Two readers updated; the value is untouched.',
  },
  {
    rank: 4,
    title: 'Split the duplicated radius step',
    effort: 'design work',
    scope: `${dupeDefects.length} same-family duplicate`,
    detail:
      'A decision, not a rename: --radius-200 and --radius-300 are both 0.5rem, while tier 2 points --radius-surface at one and --radius-card at the other. Either the ramp gains a real step between them, or one of the two roles is redundant and should be folded away.',
    done: dupeDefects.length === 0,
  },
  {
    rank: 5,
    title: 'Converge typography on --font-<property>-<scale>',
    effort: 'mechanical',
    scope: `${typeGaps.length} properties unnamed, ${typeProperties.filter((r) => r.members.length && r.status !== 'match').length} with a value-name wrinkle`,
    detail:
      'Adopted `--<css-property>-<value>`. Done: the family and weight ROLES moved to tier 2 (so the spoke contract stopped instructing a primitive re-point); faces are named for the face and weights for the number; `--type-size-*` became `--font-size-*` across 72 files; font-style and text-transform gained the finite option sets and their 9 literal readers were wired; line-height gained a `none` rung and normalised to four (none/tight/normal/relaxed), covering the 22 declarations that were bypassing the scale, and is now `$type: number`; the weight ramp was completed to 100–900 so a spoke on another face has steps to point at; and line-height normalised to four rungs after a fifth (`snug`) proved to be a value looking for a reason. The `normal` rungs were raised twice as a naming conflict with the CSS keywords and are now settled as a DECISION, not a defect: a scale-position name belongs to this system (SPEC.md). All seven properties conform.',
    done: typeGaps.length === 0 && typeProperties.every((r) => r.status === 'match'),
  },
  {
    rank: 7,
    title: 'Reconcile var() fallbacks with the tokens they back',
    effort: 'mechanical',
    scope: `${fallbackTally.wrong} exact mismatches in scope, ~1,250 system-wide`,
    detail:
      'CLAUDE.md mandates a literal fallback on every private token and nothing verifies it matches. The typography ones are fixed (55 sites: weights written as 400/600/700 — the conventional meanings rather than DM Sans’s optical values — plus two line-heights and a letter-spacing). What remains in scope is spacing, and behind it a much larger population the check deliberately does not cover: ~1,250 disagreeing read sites across the whole system, mostly tier-2 colour. That needs its own pass and its own judgment — `var(--font-sans, sans-serif)` is a correct degradation, not drift.',
    done: fallbackTally.wrong === 0,
  },
  {
    rank: 6,
    title: 'Decide the namespace question once, for all three tiers',
    effort: 'design work',
    scope: `${straddleRows.length} straddling prefixes`,
    detail:
      'Full --eco-<tier>-*, or the cheaper option the tier-3 audit already argues for: a tier marker only where a prefix straddles. Either way it is one decision, and it is the only one on this list that touches every token in the system.',
    done: straddleRows.length === 0,
  },
];

export const worklistDone = worklist.filter((f) => f.done).length;
