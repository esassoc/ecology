/**
 * DEBUG-ONLY audit of tier-3 token NAMES against the 6-slot naming rubric.
 *
 * Sibling of tier2-naming.ts, same contract: everything countable is DERIVED
 * from the real token names at build time, never typed in. The vocabularies and
 * the prose are authored, because that part is judgment a parser can't make.
 *
 *   rubric:  --eco-<tier>-<component|category|special>-<variant>-<property>[-<state>]
 *
 * Tier 3 has one structural difference from tier 2 that shapes this whole file:
 * a component token frequently names an internal PART of the component
 * (--grid-row-bg, --switch-toggle-thumb-bg, --card-header-color). The rubric has
 * no slot for a part. It is not an error in our names — it is a seventh concept
 * our names carry and the rubric doesn't model, so it gets its own section
 * rather than being scored as a variant.
 *
 * The second half of the file audits the same tokens against the narrower
 * COLOUR rubric, which fixes the property to three values and moves `disabled`
 * into the state slot:
 *
 *   colour:  --<component|category|special>-<variant>-color-<background|content|border>[-<state>]
 *
 * Scoped to colour-valued tokens so the dialect counts aren't diluted by
 * padding and width hooks, and so the variant slot can be measured against the
 * rubric's own worked example — a component with a real variant axis.
 *
 * Consumed only by /debug/tokens, which is excluded from production builds.
 * Delete alongside token-graph.ts when the refinement work is done.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { byTier, type TokenNode } from './token-graph';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const COMPONENT_CSS = path.join(ROOT, 'packages', 'tokens', 'src', 'component-tokens.css');
const COMPONENT_DIR = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

const nodes = new Map(byTier('component').map((t) => [t.name, t]));

/* ------------------------------------------------------------- the source */

interface RawDecl {
  name: string;
  value: string;
  /** The `/* esa-x *\/` comment the declaration sits under, where there is one. */
  owner: string | null;
}

/**
 * Parsed from the CSS rather than from the token graph because we need two
 * things the graph drops: source order, and the declaring block's comment. That
 * comment is the only record of which component ASKED for the hook, which is
 * what makes "the name disagrees with its block" checkable at all.
 */
const raw: RawDecl[] = (() => {
  if (!existsSync(COMPONENT_CSS)) return [];
  const out: RawDecl[] = [];
  let owner: string | null = null;
  for (const line of readFileSync(COMPONENT_CSS, 'utf8').split('\n')) {
    const own = line.match(/^\s*\/\* (esa-[a-z-]+) \*\/\s*$/);
    if (own) {
      owner = own[1];
      continue;
    }
    // A `===== BUTTON =====` banner: a section, not a component attribution.
    if (/^\s*\/\* =+/.test(line)) {
      owner = null;
      continue;
    }
    const decl = line.match(/^\s{2}(--[a-z0-9-]+)\s*:\s*(.+?);/);
    if (decl) out.push({ name: decl[1], value: decl[2], owner });
  }
  return out;
})();

/* --------------------------------------------------- slot 3: the namespace */

export type NsKind = 'component' | 'category' | 'special' | 'none';

/** Every `esa-*` file in the library, minus the prefix. The authoritative roster. */
const componentRoster: string[] = existsSync(COMPONENT_DIR)
  ? [
      ...new Set(
        readdirSync(COMPONENT_DIR)
          .map((f) => f.replace(/\.[a-z]+$/, ''))
          .filter((f) => f.startsWith('esa-'))
          .map((f) => f.slice(4)),
      ),
    ]
  : [];

/**
 * Namespaces that are NOT a component — the rubric's other two cases. Authored,
 * because "is this a category or a component nobody built" is a judgment; the
 * evidence for each (how many components read it) is derived below.
 */
const NON_COMPONENT_NS: { ns: string; kind: NsKind; note: string }[] = [
  { ns: 'form', kind: 'category', note: 'The rubric’s own example of a component category. Read by every form control, so it earns the category name.' },
  { ns: 'filter', kind: 'category', note: 'The family name for the filter surfaces that have no component of their own — the pill and the clear button. esa-filter-dropdown and esa-filter-container take their own namespaces, so this is what is left over.' },
  { ns: 'focus-ring', kind: 'special', note: 'The rubric’s own example of a special case — and the widest-read namespace in the file.' },
  { ns: 'grid', kind: 'category', note: 'Ported from the Angular data grid. No esa-grid-* component exists, so this names a surface with nothing behind it.' },
  { ns: 'topbar', kind: 'category', note: 'Same: a ported surface. The components that would read it are named esa-app-bar and esa-header-nav.' },
  { ns: 'sidenav', kind: 'component', note: 'A component namespace whose component is spelled differently: esa-sidebar-nav. The token prefix and the tag disagree.' },
];

const NS_LIST = [...new Set([...componentRoster, ...NON_COMPONENT_NS.map((n) => n.ns)])];
const NS_KIND = new Map<string, NsKind>(NON_COMPONENT_NS.map((n) => [n.ns, n.kind]));

/**
 * Longest match wins, and it has to: `pill` and `pillbox` are both real, as are
 * `icon`, `icon-button` and `icon-link`. Nothing in the NAME marks where the
 * component ends — the roster is what makes these parseable, which is itself a
 * finding (see `nsAmbiguity`).
 */
const nsOf = (name: string): string | null => {
  const body = name.slice(2);
  let best: string | null = null;
  for (const p of NS_LIST) {
    if ((body === p || body.startsWith(`${p}-`)) && (!best || p.length > best.length)) best = p;
  }
  return best;
};

/* ------------------------------------------------------- the vocabularies */

export type RubricProp =
  | 'color-content'
  | 'color-background'
  | 'color-border'
  | 'other'
  | null;

/** Property word -> the rubric property it fills. Longest match applied first. */
const PROPERTY_VOCAB: { word: string; rubric: RubricProp }[] = [
  { word: 'text-color', rubric: 'color-content' },
  { word: 'text', rubric: 'color-content' },
  { word: 'color', rubric: 'color-content' },
  { word: 'bg', rubric: 'color-background' },
  { word: 'background', rubric: 'color-background' },
  { word: 'border-color', rubric: 'color-border' },
  { word: 'border', rubric: 'color-border' }, // re-classified below when the value is a shorthand
  { word: 'border-width', rubric: 'other' },
  { word: 'radius', rubric: 'other' },
  { word: 'padding-x', rubric: 'other' },
  { word: 'padding-y', rubric: 'other' },
  { word: 'padding', rubric: 'other' },
  { word: 'pad-x', rubric: 'other' },
  { word: 'pad-y', rubric: 'other' },
  { word: 'gap', rubric: 'other' },
  { word: 'min-width', rubric: 'other' },
  { word: 'max-width', rubric: 'other' },
  { word: 'width', rubric: 'other' },
  { word: 'min-height', rubric: 'other' },
  { word: 'max-height', rubric: 'other' },
  { word: 'height', rubric: 'other' },
  { word: 'icon-size', rubric: 'other' },
  { word: 'size', rubric: 'other' },
  { word: 'shadow', rubric: 'other' },
  { word: 'font-size', rubric: 'other' },
  { word: 'font-weight', rubric: 'other' },
  { word: 'weight', rubric: 'other' },
  { word: 'line-height', rubric: 'other' },
  { word: 'inset', rubric: 'other' },
  { word: 'spacing', rubric: 'other' },
  { word: 'margin-top', rubric: 'other' },
  { word: 'indent', rubric: 'other' },
  { word: 'top', rubric: 'other' },
  { word: 'right', rubric: 'other' },
  { word: 'bottom', rubric: 'other' },
  { word: 'left', rubric: 'other' },
  { word: 'filter', rubric: 'other' },
  { word: 'percent', rubric: 'other' },
].sort((a, b) => b.word.length - a.word.length);

/** Rubric states, plus the two this system adds. */
const STATE_WORDS = new Set(['hover', 'active', 'focus', 'pressed', 'visited', 'disabled', 'checked', 'selected', 'collapsed']);
/** Words in a state position that are not states. Kept separate so they surface. */
const PSEUDO_STATE: Record<string, string> = {
  error: 'a validation status — a variant under the rubric, not a state',
  transparent: 'a component variant (the see-through overlay), not a state',
  collapsed: 'a genuine component state the rubric’s list doesn’t cover',
};
const SIZE_SHORT = ['xs', 'sm', 'md', 'lg', 'xl'];
const SIZE_LONG = ['small', 'medium', 'large'];
const SIZE_WORDS = new Set([...SIZE_SHORT, ...SIZE_LONG]);
/** Semantic variants that trail the property, e.g. --snackbar-item-bg-danger. */
const VARIANT_WORDS = new Set(['danger', 'info', 'success', 'warning', 'primary', 'secondary', 'strong', 'inverse']);

/* -------------------------------------------------------------- the parse */

export interface Tier3Row {
  name: string;
  value: string;
  /** Declaring block comment, where there is one. */
  owner: string | null;
  ns: string | null;
  nsKind: NsKind;
  /** Slot 4 — size and/or semantic variant. */
  size: string | null;
  variant: string | null;
  /** Slot 5 — the literal word, and the rubric property it fills. */
  propWord: string | null;
  prop: RubricProp;
  /** Slot 6. */
  state: string | null;
  /** The seventh concept: the internal part, which the rubric has no slot for. */
  part: string | null;
  isColor: boolean;
  /** How many components read this token — evidence for component vs category. */
  reach: number;
  flags: string[];
}

const isShorthand = (value: string) => /^\d|\bsolid\b|\bdashed\b/.test(value);

const parse = (d: RawDecl): Tier3Row => {
  const flags: string[] = [];
  const node: TokenNode | undefined = nodes.get(d.name);

  const ns = nsOf(d.name);
  const nsKind: NsKind = ns === null ? 'none' : (NS_KIND.get(ns) ?? 'component');
  if (!ns) flags.push('no component, category or special case in the name — this reads as a tier-1 or tier-2 token');

  let rest = ns ? d.name.slice(2 + ns.length).replace(/^-/, '') : d.name.slice(2);

  // Peel trailing modifiers. Order-independent on purpose: --dialog-width-lg
  // and --pillbox-gap-small put the size last, --app-bar-brand-strong-bg puts
  // the variant first, and neither ordering is enforced anywhere.
  let state: string | null = null;
  let size: string | null = null;
  let variant: string | null = null;
  for (;;) {
    const seg = rest.split('-');
    const last = seg[seg.length - 1];
    if (!state && (STATE_WORDS.has(last) || last in PSEUDO_STATE)) {
      state = last;
      rest = seg.slice(0, -1).join('-');
      continue;
    }
    if (!size && SIZE_WORDS.has(last)) {
      size = last;
      rest = seg.slice(0, -1).join('-');
      continue;
    }
    if (!variant && VARIANT_WORDS.has(last)) {
      variant = last;
      rest = seg.slice(0, -1).join('-');
      continue;
    }
    break;
  }

  let propWord: string | null = null;
  let prop: RubricProp = null;
  for (const p of PROPERTY_VOCAB) {
    if (rest === p.word || rest.endsWith(`-${p.word}`)) {
      propWord = p.word;
      prop = p.rubric;
      rest = rest.slice(0, rest.length - p.word.length).replace(/-$/, '');
      break;
    }
  }

  // `-border` means two different things depending on what it holds.
  if (propWord === 'border' && isShorthand(d.value)) {
    prop = 'other';
    flags.push('`border` here is a shorthand (width + style + colour in one value), not a colour — a theme cannot re-point just the colour');
  }

  if (!propWord) {
    flags.push('no property in the name — you have to read the value to know what it controls');
  }

  // An unplaced token has no component, so whatever is left is not a part of
  // anything — it is the whole name. Counting it as a part would inflate the
  // part tally with four tokens whose problem is the opposite one.
  const part = ns && rest ? rest : null;

  if (state && size) flags.push('carries both a size and a state, with nothing marking which slot is which');
  if (state && PSEUDO_STATE[state]) flags.push(`\`${state}\` sits in the state slot but is ${PSEUDO_STATE[state]}`);
  if (state === 'active' && !/pressed/.test(d.name)) {
    flags.push('`active` here means current/selected, not the rubric’s pressed state');
  }
  if (size && SIZE_LONG.includes(size)) {
    flags.push(`size spelled \`${size}\` where the rest of the system uses \`${SIZE_SHORT.join(' | ')}\``);
  }
  if (propWord && size && d.name.indexOf(propWord) < d.name.lastIndexOf(size)) {
    flags.push('variant after property — inverted vs rubric');
  }
  if (d.owner && ns && ns !== d.owner.slice(4)) {
    flags.push(`declared under \`${d.owner}\` but named for \`${ns}\``);
  }

  return {
    name: d.name,
    value: d.value,
    owner: d.owner,
    ns,
    nsKind,
    size,
    variant,
    propWord,
    prop,
    state,
    part,
    isColor: node?.isColor ?? false,
    reach: node?.usedByComponents.length ?? 0,
    flags,
  };
};

export const rows: Tier3Row[] = raw.map(parse);

/* --------------------------------------------------------- derived counts */

const count = (fn: (r: Tier3Row) => boolean) => rows.filter(fn).length;

export const total = rows.length;
export const unnamespaced = rows.filter((r) => !r.ns);
export const withPart = count((r) => r.part !== null);
export const withProperty = count((r) => r.propWord !== null);
export const withoutProperty = rows.filter((r) => !r.propWord);
export const withSize = count((r) => r.size !== null);
export const withVariant = count((r) => r.variant !== null);
export const stateRows = rows.filter((r) => r.state);
export const ownerMismatch = rows.filter((r) => r.owner && r.ns && r.ns !== r.owner.slice(4));

/* ------------------------------------- slots 1-2: the prefix collision, again */

/**
 * Tier 2's audit found 268 tier-1 and 60 tier-2 tokens sharing `--color-`. At
 * tier 3 the collision stops being theoretical and starts naming real pairs:
 * the same prefix declared at two different tiers, with only the dialect (or
 * nothing at all) to tell them apart.
 */
export const tierCollisions = (() => {
  const t1 = byTier('primitive').map((t) => t.name);
  const t2 = byTier('semantic').map((t) => t.name);
  const at = (list: string[], p: string) => list.filter((n) => n.startsWith(p));
  const t3at = (p: string) => rows.filter((r) => r.name.startsWith(p)).map((r) => r.name);

  // `live` is DERIVED: a collision only exists while the prefix really does name
  // tokens at two tiers. Resolved ones are kept rather than deleted — the point
  // of this table is why the tier identifier matters, and a fixed case argues
  // that better than a missing row.
  const raw = [
    {
      prefix: '--icon-size-*',
      tier1: at(t1, '--icon-size-'),
      tier3: t3at('--icon-size-'),
      cost:
        'Carried a size scale at tier 1 and three more sizes at tier 3, in a different dialect (sm/md/lg vs small/medium/large) at identical values. Nothing in either name said which tier you were editing.',
      fix: 'The three tier-3 duplicates were deleted and their five consumers repointed at the tier-1 ramp.',
    },
    {
      prefix: '--focus-ring-*',
      tier1: at(t1, '--focus-ring-'),
      tier3: t3at('--focus-ring-'),
      cost:
        'One conceptual surface split across two tiers, with `--focus-ring-color` declared in BOTH — tier 3 loaded last and won, so the tier-1 declaration was dead while still reading as authoritative. The tier-1 copy also referenced a tier-2 token, which is backwards.',
      fix: 'The tier-1 block was removed and `--focus-ring-offset` joined its siblings at tier 3, so the special case now has one home.',
    },
    {
      prefix: '--color-*',
      tier1: [`${at(t1, '--color-').length} tier-1 tokens`],
      tier3: t3at('--color-'),
      cost:
        `A tier-3 hook sitting inside the colour namespace that ${at(t2, '--color-').length} tier-2 tokens occupy. Read on its own, \`--color-link\` is indistinguishable from a semantic role — but it is a per-component hook, so re-pointing it only re-skins the one component that reads it.`,
      fix: null,
    },
  ];

  return raw.map((c) => ({
    ...c,
    live: c.tier1.length > 0 && c.tier3.length > 0,
  }));
})();

/** Collisions where the prefix still names tokens at two tiers. */
export const liveCollisions = tierCollisions.filter((c) => c.live).length;

/* --------------------------------------------- slot 3: the namespace roster */

export interface NsGroup {
  ns: string;
  kind: NsKind;
  note: string | null;
  tokens: Tier3Row[];
  /** Distinct components that read any token in this namespace. */
  reach: number;
  /** True when an esa-<ns> component actually exists. */
  hasComponent: boolean;
}

const NON_COMPONENT_NOTE = new Map(NON_COMPONENT_NS.map((n) => [n.ns, n.note]));
const componentSet = new Set(componentRoster);

export const nsGroups: NsGroup[] = (() => {
  const map = new Map<string, Tier3Row[]>();
  for (const r of rows) {
    const key = r.ns ?? '(none)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()]
    .map(([ns, tokens]) => {
      const reach = new Set<string>();
      for (const t of tokens) nodes.get(t.name)?.usedByComponents.forEach((c) => reach.add(c));
      return {
        ns,
        kind: ns === '(none)' ? ('none' as NsKind) : (NS_KIND.get(ns) ?? ('component' as NsKind)),
        note: NON_COMPONENT_NOTE.get(ns) ?? null,
        tokens,
        reach: reach.size,
        hasComponent: componentSet.has(ns),
      };
    })
    .sort((a, b) => b.tokens.length - a.tokens.length);
})();

/** Real namespaces, excluding the `(none)` bucket. */
export const namespaceCount = nsGroups.filter((g) => g.ns !== '(none)').length;

export const nsKindTally = (['component', 'category', 'special', 'none'] as NsKind[]).map((kind) => ({
  kind,
  namespaces: nsGroups.filter((g) => g.kind === kind).length,
  tokens: nsGroups.filter((g) => g.kind === kind).reduce((n, g) => n + g.tokens.length, 0),
}));

/**
 * Namespace pairs where one name is a prefix of another. These parse correctly
 * ONLY because the roster is consulted longest-first — a name alone can't tell
 * you where the component ends and the property begins.
 */
export const nsAmbiguity = (() => {
  const present = nsGroups.map((g) => g.ns).filter((n) => n !== '(none)');
  const pairs: { shorter: string; longer: string[]; example: string }[] = [];
  for (const s of present) {
    const longer = present.filter((l) => l !== s && l.startsWith(`${s}-`));
    if (longer.length) {
      const ex = rows.find((r) => r.ns === longer[0])?.name ?? '';
      pairs.push({ shorter: s, longer, example: ex });
    }
  }
  return pairs;
})();

/* --------------------------------- the seventh concept: the internal part */

export type PartKind = 'part' | 'variant' | 'state' | 'artefact';

export interface PartRow {
  part: string;
  count: number;
  examples: string[];
  /** Authored: is this word naming a sub-element, or something else in disguise? */
  kind: PartKind;
}

/**
 * Words in the part position that are NOT parts. Keyed by `<namespace>:<word>`
 * rather than by the word alone, because the same word means different things
 * in different components — `brand` is a TONE VARIANT of esa-app-bar
 * (tone="brand") and a BEM ELEMENT of esa-app-shell (.esa-app-shell__brand).
 * One position, one spelling, two concepts, and nothing in the name to separate
 * them. Anything not listed here is a genuine part.
 */
const PART_KIND: Record<string, Exclude<PartKind, 'part'>> = {
  'app-bar:brand': 'variant',
  'app-bar:brand-strong': 'variant',
  'grid:row-stripe': 'variant',
  'sidenav:active': 'state',
  'sidenav:nested': 'variant',
  'button:on': 'artefact',
  'loading-overlay:message': 'part',
} as Record<string, Exclude<PartKind, 'part'>>;

const partKindOf = (r: Tier3Row): PartKind => PART_KIND[`${r.ns}:${r.part}`] ?? 'part';

export const partRows: PartRow[] = (() => {
  const map = new Map<string, { names: string[]; kinds: Set<PartKind> }>();
  for (const r of rows) {
    if (!r.part) continue;
    if (!map.has(r.part)) map.set(r.part, { names: [], kinds: new Set() });
    const e = map.get(r.part)!;
    e.names.push(r.name);
    e.kinds.add(partKindOf(r));
  }
  return [...map.entries()]
    .map(([part, e]) => ({
      part,
      count: e.names.length,
      examples: e.names.slice(0, 3),
      // A word used both ways reports as the non-part reading, because that is
      // the case the name fails to signal.
      kind: ([...e.kinds].find((k) => k !== 'part') ?? 'part') as PartKind,
    }))
    .sort((a, b) => b.count - a.count || a.part.localeCompare(b.part));
})();

const partKindCount = (kind: PartKind) => rows.filter((r) => r.part && partKindOf(r) === kind).length;

export const partTally = {
  tokens: withPart,
  distinct: partRows.length,
  asPart: partKindCount('part'),
  asVariant: partKindCount('variant'),
  asState: partKindCount('state'),
  asArtefact: partKindCount('artefact'),
};

/** Words that mean a part in one component and something else in another. */
export const partWordClash = partRows
  .filter((p) => {
    const kinds = new Set(rows.filter((r) => r.part === p.part).map(partKindOf));
    return kinds.size > 1;
  })
  .map((p) => ({
    word: p.part,
    readings: [...new Set(rows.filter((r) => r.part === p.part).map((r) => `${partKindOf(r)} in ${r.ns}`))],
    tokens: rows.filter((r) => r.part === p.part).map((r) => r.name),
  }));

/* ----------------------------------------------------- slot 4: the variant */

export const sizeRows = {
  short: rows.filter((r) => r.size && SIZE_SHORT.includes(r.size)),
  long: rows.filter((r) => r.size && SIZE_LONG.includes(r.size)),
  /** Sizes that trail the property, which is the rubric's order reversed. */
  afterProperty: rows.filter(
    (r) => r.size && r.propWord && r.name.indexOf(r.propWord) < r.name.lastIndexOf(r.size),
  ),
  scales: [...new Set(rows.filter((r) => r.size && r.propWord).map((r) => `${r.ns}-${r.propWord}`))].sort(),
};

export const variantRows = rows.filter((r) => r.variant);

/* ---------------------------------------------------- slot 5: the property */

export interface PropVocabRow {
  rubric: string;
  words: { word: string; count: number }[];
  total: number;
  note: string;
}

const wordsFor = (test: (r: Tier3Row) => boolean) => {
  const map = new Map<string, number>();
  for (const r of rows) if (test(r) && r.propWord) map.set(r.propWord, (map.get(r.propWord) ?? 0) + 1);
  return [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
};

export const propVocab: PropVocabRow[] = [
  {
    rubric: 'color-content',
    words: wordsFor((r) => r.prop === 'color-content'),
    total: count((r) => r.prop === 'color-content'),
    note: 'Three spellings for one property, and the bare `color` reading (39 tokens) is the ambiguous one — `--dialog-color` is text, `--tab-layout-color` is text, but nothing in the word says so. No `icon` split anywhere, so icon colour has no hook independent of text.',
  },
  {
    rubric: 'color-background',
    words: wordsFor((r) => r.prop === 'color-background'),
    total: count((r) => r.prop === 'color-background'),
    note: 'The one property with a single consistent word. Abbreviated to `bg` rather than the rubric’s `background`, but never spelled two ways.',
  },
  {
    rubric: 'color-border',
    words: wordsFor((r) => r.prop === 'color-border'),
    total: count((r) => r.prop === 'color-border'),
    note: 'Split between `border-color` (an actual colour) and a bare `border` that sometimes holds a colour and sometimes a whole shorthand. The shorthands are counted under `other`.',
  },
  {
    rubric: 'other CSS properties',
    words: wordsFor((r) => r.prop === 'other'),
    total: count((r) => r.prop === 'other'),
    note: 'The rubric explicitly allows any CSS property here. The dialect drifts anyway — `padding` / `padding-x` / `pad-x` are the same property under three names, and `weight` / `font-weight` under two.',
  },
];

export const colorQualified = count((r) => /(^|-)color-(content|background|border)(-|$)/.test(r.name));

export const borderSplit = {
  shorthand: rows.filter((r) => r.propWord === 'border' && isShorthand(r.value)),
  colour: rows.filter((r) => r.propWord === 'border' && !isShorthand(r.value)),
};

/* ------------------------------------------------------- slot 6: the state */

export const stateVocab = (() => {
  const map = new Map<string, string[]>();
  for (const r of stateRows) {
    if (!map.has(r.state!)) map.set(r.state!, []);
    map.get(r.state!)!.push(r.name);
  }
  const RUBRIC_STATES = ['hover', 'focus', 'pressed', 'active', 'disabled', 'visited'];
  const seen = [...map.keys()];
  const out = RUBRIC_STATES.filter((s) => s !== 'active').map((s) => ({
    state: s,
    inRubric: true,
    tokens: map.get(s) ?? [],
    note:
      s === 'pressed'
        ? 'Nothing. No token anywhere describes the pressed/clicked state — and the word `active`, which would be the CSS spelling of it, is in use for something else.'
        : s === 'visited'
          ? 'Nothing. No link component exposes a visited hook.'
          : s === 'disabled'
            ? 'Exactly one, and it is the rubric’s own model: tier 2 manages disabled at the intention level (--color-background-disabled, --color-content-disabled, --color-border-disabled), tier 3 reaches for it only where a component needs its own.'
            : s === 'focus'
              ? 'One, and that is the right number: the rubric says a focus token should hold only what differs from the global ring, and the global ring is --focus-ring-color / -width. This one is the input’s border, which genuinely does differ.'
              : '',
  }));
  const extras = seen
    .filter((s) => !RUBRIC_STATES.includes(s))
    .map((s) => ({ state: s, inRubric: false, tokens: map.get(s)!, note: PSEUDO_STATE[s] ?? 'A component state the rubric’s list doesn’t cover.' }));
  const activeRow = {
    state: 'active',
    inRubric: true,
    tokens: map.get('active') ?? [],
    note: 'Present, but meaning "current / selected" — the nav item you are on, the open tab, the highlighted row. Under the rubric `active` is the pressed state. Same word, different concept, and the pressed state is the one that goes unnamed.',
  };
  return [...out.slice(0, 2), activeRow, ...out.slice(2), ...extras];
})();

/**
 * "State is exclusive to colour, usually." Checkable: every stateful token
 * should be controlling a colour property. The exceptions are the interesting
 * part — they are the cases where a state changes something other than colour.
 */
export const stateColorCheck = (() => {
  const colorProps: RubricProp[] = ['color-content', 'color-background', 'color-border'];
  const named = stateRows.filter((r) => colorProps.includes(r.prop));
  const rest = stateRows.filter((r) => !colorProps.includes(r.prop));
  return {
    total: stateRows.length,
    onColor: named.length,
    // Split so the two failure modes don't get conflated: a state that really
    // does move something other than colour, versus a colour whose property the
    // name simply never says.
    exceptions: rest.map((r) => ({
      row: r,
      kind: r.isColor ? ('unnamed-colour' as const) : ('non-colour' as const),
    })),
    nonColour: rest.filter((r) => !r.isColor).length,
    unnamedColour: rest.filter((r) => r.isColor).length,
  };
})();

/**
 * State words appearing anywhere other than the final slot. Tested against the
 * name MINUS its namespace, so `--focus-ring-color` — where `focus` is the
 * special-case component name, not a state — doesn't register.
 */
export const stateNotTrailing = rows.filter(
  (r) =>
    !r.state &&
    /(^|-)(hover|active|focus|pressed|disabled|checked|selected)(-|$)/.test(
      r.name.slice(2 + (r.ns?.length ?? 0)),
    ),
);

/* ======================================================================
 * The COLOUR rubric — a narrower shape than the six-slot one above.
 * ======================================================================
 *
 *   --<component|category|special>-<variant>-<color-{background|content|border}>[-<state>]
 *
 * Same slots, but the model is explicit about two things the general rubric
 * leaves open, and both are checkable:
 *
 *   - the property is one of THREE, spelled `color-background` /
 *     `color-content` / `color-border` — not any CSS property;
 *   - `disabled` belongs in the STATE slot here, alongside hover / focus /
 *     active / pressed, rather than being a variant.
 *
 * Everything below is scoped to the tokens that actually hold a colour, which
 * is `isColor` from the graph — anchored at the start of the RESOLVED value, so
 * a `1px solid var(--color-border)` shorthand and an `--elevation-*` shadow are
 * both correctly excluded. That exclusion is the point: this section is about
 * names for colours, and a token whose value is a shorthand is a different
 * finding (see `borderSplit`).
 */

export const colourRows: Tier3Row[] = rows.filter((r) => r.isColor);

const RUBRIC_COLOUR_PROPS: RubricProp[] = ['color-background', 'color-content', 'color-border'];

/** Names that qualify their property the rubric's way. Derived, not asserted. */
export const colourQualified = colourRows.filter((r) =>
  /(^|-)color-(content|background|border)(-|$)/.test(r.name),
);

/**
 * Per rubric property: the words we use instead, with counts. This is the same
 * shape as `propVocab` above but scoped to colour-valued tokens, so the dialect
 * count is not diluted by `--card-padding` and friends.
 */
export const colourPropVocab: PropVocabRow[] = [
  {
    rubric: 'color-background',
    words: (() => {
      const m = new Map<string, number>();
      for (const r of colourRows) if (r.prop === 'color-background' && r.propWord) m.set(r.propWord, (m.get(r.propWord) ?? 0) + 1);
      return [...m.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
    })(),
    total: colourRows.filter((r) => r.prop === 'color-background').length,
    note: 'One word, used consistently — the healthiest of the three. It is an abbreviation of the rubric’s word rather than a different concept, so this is a spelling difference and nothing more.',
  },
  {
    rubric: 'color-content',
    words: (() => {
      const m = new Map<string, number>();
      for (const r of colourRows) if (r.prop === 'color-content' && r.propWord) m.set(r.propWord, (m.get(r.propWord) ?? 0) + 1);
      return [...m.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
    })(),
    total: colourRows.filter((r) => r.prop === 'color-content').length,
    note: 'Three spellings for one property, and the bare `color` reading is the one that costs something: `--dialog-color`, `--kbd-color` and `--tab-layout-color` are all text, but the name never says so — you have to open the component to find out. Tier 2 settled this exact argument in favour of `content` (over `text`) because icons read these too; tier 3 never followed.',
  },
  {
    rubric: 'color-border',
    words: (() => {
      const m = new Map<string, number>();
      for (const r of colourRows) if (r.prop === 'color-border' && r.propWord) m.set(r.propWord, (m.get(r.propWord) ?? 0) + 1);
      return [...m.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
    })(),
    total: colourRows.filter((r) => r.prop === 'color-border').length,
    note: 'Two spellings, and unlike the other two this one is not merely cosmetic. A bare `border` holds a colour in --sidenav-border and --topbar-border, and a whole `1px solid …` shorthand in --filter-dropdown-border — which is why that third token is missing from this count: it holds no colour, so a theme cannot re-point its colour at all without restating width and style. Same word, two value types, and only the name says they are the same thing.',
  },
];

/** Colour tokens whose name states no property at all — the value is the only clue. */
export const colourUnnamedProp = colourRows.filter((r) => !RUBRIC_COLOUR_PROPS.includes(r.prop));

/* ------------------------------------------- the variant slot, for colour */

/**
 * The rubric's worked example is a button: primary / secondary / tertiary, each
 * with its own `color-background` and its own states. So the honest test of our
 * variant slot is not "do any tokens carry a variant word" — it is: where a
 * component HAS a colour-variant axis, does the tier-3 surface expose it?
 *
 * Both halves are derived. The axis comes from the component source: which
 * tier-2 intentions the file reads. The surface comes from the token names.
 * Where the two disagree, the component is expressing variants by reaching
 * straight past tier 3 into tier 2 — which works, and costs exactly one thing:
 * the variant cannot be re-skinned independently of every other use of that
 * intention in the kit.
 */
const INTENTIONS = ['brand', 'danger', 'success', 'warning', 'info', 'ai', 'accent'] as const;

/**
 * The four STATUS intentions, and the threshold is measured against these rather
 * than against the full list. Reading two intentions is not an axis — nine
 * components read exactly `brand` and `danger`, which is a brand accent plus an
 * error message, not a variant they choose between. Requiring three of the four
 * statuses is what separates a component with a `tone` prop from one that merely
 * styles its own validation state.
 */
const STATUS_INTENTIONS = ['danger', 'success', 'warning', 'info'];
const STATUS_THRESHOLD = 3;

export interface IntentionAxisRow {
  /** Component file name, minus `esa-`. */
  component: string;
  /** The tier-3 namespace, where the token prefix differs from the tag. */
  ns: string;
  /** Distinct tier-2 intentions the component reads directly. */
  intentions: string[];
  /** Tier-3 colour tokens in this namespace. */
  hooks: number;
  /** …of which carry a variant word. */
  varianted: number;
}

export const intentionAxis: IntentionAxisRow[] = (() => {
  if (!existsSync(COMPONENT_DIR)) return [];
  const nsHooks = new Map<string, Tier3Row[]>();
  for (const r of colourRows) {
    if (!r.ns) continue;
    if (!nsHooks.has(r.ns)) nsHooks.set(r.ns, []);
    nsHooks.get(r.ns)!.push(r);
  }
  const out: IntentionAxisRow[] = [];
  for (const file of readdirSync(COMPONENT_DIR)) {
    if (!file.startsWith('esa-')) continue;
    const component = file.replace(/\.[a-z]+$/, '').slice(4);
    const src = readFileSync(path.join(COMPONENT_DIR, file), 'utf8');
    const found = new Set<string>();
    for (const i of INTENTIONS) {
      if (new RegExp(`--color-(background|content|border)-${i}(?![a-z])`).test(src)) found.add(i);
    }
    if (STATUS_INTENTIONS.filter((i) => found.has(i)).length < STATUS_THRESHOLD) continue;
    // `sidenav` is the one namespace spelled unlike its tag; nothing with an
    // intention axis is affected today, but resolve through the roster anyway
    // so this doesn't silently under-report if that changes.
    const ns = nsHooks.has(component) ? component : (nsOf(`--${component}`) ?? component);
    const hooks = nsHooks.get(ns) ?? [];
    out.push({
      component,
      ns,
      intentions: [...found],
      hooks: hooks.length,
      // `--button-on-warning` parses as variant `warning`, but it is the
      // FOREGROUND painted on a warning fill, not a warning surface to theme —
      // PART_KIND already classes `button:on` as an artefact. Counting it would
      // report the rubric's own worked example as exposed when the axis it names
      // has no hook at all.
      varianted: hooks.filter((h) => h.variant && partKindOf(h) !== 'artefact').length,
    });
  }
  return out.sort((a, b) => b.intentions.length - a.intentions.length || a.component.localeCompare(b.component));
})();

/** Components with a colour-variant axis and no varianted hook to theme it through. */
export const axisUnexposed = intentionAxis.filter((a) => a.varianted === 0);

/**
 * Variant words that trail the property instead of preceding it. The rubric puts
 * the variant FIRST (`button-primary-color-background`); every one of ours puts
 * it last (`--snackbar-item-bg-danger`). Derived by position in the string.
 */
export const colourVariantRows = colourRows.filter((r) => r.variant);
export const colourVariantInverted = colourVariantRows.filter(
  (r) => r.propWord && r.name.indexOf(r.propWord) < r.name.lastIndexOf(r.variant!),
);

/* -------------------------------------------------- the state slot, for colour */

export const colourStateRows = colourRows.filter((r) => r.state);

/**
 * The rubric's state list, measured against colour tokens only. `disabled` is in
 * this list deliberately — the model puts it at the state layer rather than
 * treating it as a variant, which is the one place our tier 2 and this rubric
 * disagree about where a concept lives.
 */
export const colourStateVocab = (() => {
  const RUBRIC = ['hover', 'focus', 'active', 'pressed', 'disabled'];
  const m = new Map<string, string[]>();
  for (const r of colourStateRows) {
    if (!m.has(r.state!)) m.set(r.state!, []);
    m.get(r.state!)!.push(r.name);
  }
  const inRubric = RUBRIC.map((state) => ({
    state,
    inRubric: true,
    tokens: m.get(state) ?? [],
    note:
      state === 'pressed'
        ? 'No colour token names it. `active` — the CSS spelling of pressed — is in use for "currently selected", so the pressed state is unreachable at tier 3 by any name.'
        : state === 'active'
          ? 'Present, but meaning current/selected: the open tab, the nav row you are on, the highlighted result. Not the rubric’s pressed.'
          : state === 'disabled'
            ? 'The rubric puts disabled here, at the state layer. We mostly put it one tier up, as an intention (--color-background-disabled, --color-content-disabled), and reach for a tier-3 hook only where a component genuinely differs. That is a real disagreement about where the concept lives, and ours de-duplicates better — one disabled treatment instead of one per component.'
            : state === 'focus'
              ? 'One, and that is the right number: the global ring is --focus-ring-color / -width, so a component only needs its own where something else changes. Here it is the input border.'
              : '',
  }));
  const extras = [...m.keys()]
    .filter((s) => !RUBRIC.includes(s))
    .map((state) => ({
      state,
      inRubric: false,
      tokens: m.get(state)!,
      note:
        PSEUDO_STATE[state] ??
        'A component state the rubric’s list doesn’t cover. Genuine states, not misfilings — but worth knowing the list is not exhaustive.',
    }));
  return [...inRubric, ...extras];
})();

/* ------------------------------------------------------- the colour verdict */

export const colourTally = {
  total: colourRows.length,
  qualified: colourQualified.length,
  background: colourRows.filter((r) => r.prop === 'color-background').length,
  content: colourRows.filter((r) => r.prop === 'color-content').length,
  border: colourRows.filter((r) => r.prop === 'color-border').length,
  unnamed: colourUnnamedProp.length,
  varianted: colourVariantRows.length,
  stateful: colourStateRows.length,
};

export const colourSlots: RubricSlot[] = [
  {
    n: 1,
    name: 'Component / category / use case',
    spec: 'button, link, table, header, form, focus-ring',
    verdict: `${colourRows.filter((r) => r.ns).length} of ${colourRows.length} lead with one, and the rubric’s own six examples include two we ship as-named — form and focus-ring. Unchanged from the general audit: this slot is the system’s strongest.`,
    status: 'match',
  },
  {
    n: 2,
    name: 'Component variant',
    spec: 'primary, secondary, tertiary, link, knockout',
    verdict: `${colourTally.varianted} of ${colourTally.total} carry one, and ${colourVariantInverted.length} of those put it AFTER the property — the rubric’s order reversed. The deeper gap is the rubric’s own worked example: ${intentionAxis.length} components have a colour-variant axis, ${axisUnexposed.length} of them expose none of it at tier 3. They express variants by reading tier-2 intentions directly, so a spoke cannot diverge one component’s danger from every other danger in the kit.`,
    status: 'partial',
  },
  {
    n: 3,
    name: 'Property',
    spec: 'color-background, color-content, color-border',
    verdict: `${colourTally.qualified} of ${colourTally.total} qualify the property with color-. The three concepts are all present and nearly always named — ${colourTally.background} background, ${colourTally.content} content, ${colourTally.border} border, ${colourTally.unnamed} unstated — but in ${colourPropVocab.reduce((n, p) => n + p.words.length, 0)} words rather than 3. Tier 2 qualifies (--color-background-brand); tier 3 never adopted it.`,
    status: 'partial',
  },
  {
    n: 4,
    name: 'State',
    spec: 'hover, focus, active, pressed, disabled — default omitted',
    verdict: `${colourTally.stateful} stateful colour tokens, every one trailing, default omitted. Two gaps: pressed has no name available (active is spoken for), and one token puts a variant — error — in the state slot. Disabled is a deliberate disagreement, not a gap: we manage it at tier 2 as an intention.`,
    status: 'partial',
  },
];

export const colourGrammars = {
  rubric: '--<component|category|special>-<variant>-color-<background|content|border>[-<state>]',
  current: '--<component>[-<part>]-<bg|color|text|border-color>[-<state>][-<variant>]',
};

/* ------------------------------------------------------------ the verdict */

export interface RubricSlot {
  n: number;
  name: string;
  spec: string;
  verdict: string;
  status: 'absent' | 'partial' | 'match';
}

export const slots: RubricSlot[] = [
  {
    n: 1,
    name: 'Global prefix',
    spec: 'eco-',
    verdict: `0 of ${total}. Same as tier 2 — no token at any tier carries a namespace.`,
    status: 'absent',
  },
  {
    n: 2,
    name: 'Tier identifier',
    spec: 'theme / semantic / component',
    verdict: `0 of ${total}. This is where the cost showed up: three prefixes named tokens at more than one tier at once, ${liveCollisions} of which ${liveCollisions === 1 ? 'is' : 'are'} still live. The two that were closed had to be closed by deleting or moving tokens, because no name could tell the tiers apart.`,
    status: 'absent',
  },
  {
    n: 3,
    name: 'Component / category / special case',
    spec: 'button, link, form, focus-ring…',
    verdict: `${total - unnamespaced.length} of ${total} lead with one, across ${nsGroups.length - (unnamespaced.length ? 1 : 0)} namespaces — including the rubric’s own examples, form (a category) and focus-ring (a special case). Multi-word names use dashes as prescribed. This is the strongest slot in the system.`,
    status: 'match',
  },
  {
    n: 4,
    name: 'Component variant',
    spec: 'default, primary, inverted…',
    verdict: `${withSize} carry a size and ${withVariant} a semantic variant, with default correctly omitted. But every one of the ${sizeRows.afterProperty.length} sized tokens puts the size AFTER the property, which is the rubric’s order reversed, and the dialect splits ${sizeRows.short.length}/${sizeRows.long.length} between xs|sm|md|lg and small|medium|large.`,
    status: 'partial',
  },
  {
    n: 5,
    name: 'Property',
    spec: 'color-content, color-background, color-border, or any CSS property',
    verdict: `${withProperty} of ${total} name a property, so the slot is nearly universal. None qualify it with color- : content is spelled three ways, background one, border two — and a bare \`border\` sometimes holds a whole shorthand instead of a colour.`,
    status: 'partial',
  },
  {
    n: 6,
    name: 'State',
    spec: 'default (omitted), hover, focus, pressed/active, disabled, visited',
    verdict: `${stateRows.length} stateful tokens, all trailing, default omitted, and disabled used exactly as the rubric describes. The gap is \`active\`: it is in use for "currently selected", so the pressed state has no name — and there is no visited hook.`,
    status: 'partial',
  },
];

export const grammars = {
  rubric: '--eco-<tier>-<component|category|special>-<variant>-<property>[-<state>]',
  current: [
    'component:  --<component>[-<part>][-<variant>]-<property>[-<state>]',
    'category:   --<category>-<property>-<size>            (--form-padding-x-md)',
    'special:    --focus-ring-<property>                    (rubric-shaped, tier-ambiguous)',
    'unplaced:   --<property>                               (--backdrop-filter, --fill-percent)',
  ],
};

/** Node lookup so the page can render values and reverse deps for a parsed row. */
export const componentNodes = nodes;
