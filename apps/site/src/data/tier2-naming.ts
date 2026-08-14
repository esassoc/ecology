/**
 * DEBUG-ONLY audit of tier-2 token NAMES against the 6-slot naming rubric.
 *
 * Where `token-graph.ts` asks "what does this token resolve to and who reads
 * it", this asks a narrower question: does the NAME carry the information the
 * rubric says a tier-2 name must carry?
 *
 *   --eco-<tier>-<category>-<property>-<variant>[-<state>]
 *
 * Everything countable here is DERIVED from the real token names, not typed in,
 * so the numbers stay honest when tokens move. The rubric text, the vocabulary
 * mapping, and the "what this means" prose are authored — they encode judgment
 * the parser can't make.
 *
 * Consumed only by /debug/tokens, which is excluded from production builds.
 * Delete alongside token-graph.ts when the refinement work is done.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allTokens, byTier } from './token-graph';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const TYPOGRAPHY_CSS = path.join(ROOT, 'packages', 'tokens', 'src', 'typography.css');

/* ------------------------------------------------------------- the rubric */

export interface RubricSlot {
  n: number;
  name: string;
  spec: string;
  /** Authored verdict, shown next to the derived count. */
  verdict: string;
  status: 'absent' | 'partial' | 'match';
}

const semantic = byTier('semantic');
const colorTokens = semantic.filter((t) => t.name.startsWith('--color-'));
const otherTokens = semantic.filter((t) => !t.name.startsWith('--color-'));

/* ------------------------------------------------------ the name parser */

/** Rubric surface -> every word this system actually uses for it. */
const SURFACE_VOCAB: Record<'background' | 'content' | 'border', string[]> = {
  background: ['background', 'surface', 'bg'],
  content: ['text'],
  border: ['border'],
};
const SURFACE_LOOKUP = new Map<string, 'background' | 'content' | 'border'>();
for (const [rubric, words] of Object.entries(SURFACE_VOCAB)) {
  for (const w of words) SURFACE_LOOKUP.set(w, rubric as 'background' | 'content' | 'border');
}

const STATE_WORDS = new Set(['hover', 'active', 'focus', 'pressed']);

/**
 * Washes and scrims. They ARE backgrounds, but they name themselves after the
 * effect rather than the surface, so the surface parser can't see it — and any
 * trailing `-strong` on one is an intensity, not a content colour.
 * `hover`/`active` lead these names, so match on the overlay word itself.
 */
const isOverlay = (name: string) => /(^|-)(overlay|scrim|backdrop)(-|$)/.test(name);

export type SlotOrder = 'rubric' | 'inverted' | 'surface-only' | 'none';

export interface Tier2Row {
  name: string;
  /** Slot 4 — the literal word used, e.g. `bg`. Null when the surface is implied. */
  surfaceWord: string | null;
  /** Slot 4 normalised to the rubric's three surfaces. */
  surface: 'background' | 'content' | 'border' | null;
  /** Slot 5 — whatever is left once category, surface and state are removed. */
  variant: string | null;
  /** Slot 6. */
  state: string | null;
  order: SlotOrder;
  flags: string[];
}

const parseColor = (name: string): Tier2Row => {
  const parts = name.replace(/^--color-/, '').split('-');
  const flags: string[] = [];

  let state: string | null = null;
  if (STATE_WORDS.has(parts[parts.length - 1])) state = parts.pop()!;

  const surfaceIdx = parts.findIndex((p) => SURFACE_LOOKUP.has(p));

  // `-strong` and `-on-fill` are surfaces wearing a variant costume — but ONLY
  // where no surface word is present. In `--color-border-strong` the surface is
  // named and `strong` is a genuine variant (a heavier border), so the guard on
  // surfaceIdx is what keeps this from over-counting.
  //
  // Overlays are the second exception: in `--color-hover-overlay-strong`,
  // `strong` is an INTENSITY (a heavier wash), not a content colour. `overlay`,
  // `scrim` and `backdrop` all name a background outright — they just don't use
  // one of the rubric's three words for it.
  if (surfaceIdx === -1 && !isOverlay(name)) {
    const rest = parts.join('-');
    if (rest.endsWith('-on-fill')) {
      flags.push('surface encoded as a variant: -on-fill = content on that background');
    } else if (rest.endsWith('-strong')) {
      flags.push('surface encoded as a variant: -strong = content colour');
    }
  }

  const surfaceWord = surfaceIdx === -1 ? null : parts[surfaceIdx];
  const surface = surfaceWord ? SURFACE_LOOKUP.get(surfaceWord)! : null;

  const variantParts = surfaceIdx === -1 ? parts : parts.filter((_, i) => i !== surfaceIdx);
  const variant = variantParts.length ? variantParts.join('-') : null;

  let order: SlotOrder;
  if (!surfaceWord) {
    order = 'none';
    flags.push('surface implied — you have to know the convention to read it');
  } else if (!variant) {
    order = 'surface-only';
  } else {
    // Rubric order is category > property > variant, so the surface leads.
    order = surfaceIdx === 0 ? 'rubric' : 'inverted';
    if (order === 'inverted') flags.push('variant before surface — inverted vs rubric');
  }

  if (surfaceWord && surfaceWord !== surface) {
    flags.push(`surface spelled "${surfaceWord}" where the rubric says "${surface}"`);
  }

  return { name, surfaceWord, surface, variant, state, order, flags };
};

export const colorRows: Tier2Row[] = colorTokens.map((t) => parseColor(t.name));

/* --------------------------------------------------------- derived counts */

const count = (fn: (r: Tier2Row) => boolean) => colorRows.filter(fn).length;

export const colorTotal = colorRows.length;
export const surfaceNamed = count((r) => r.surfaceWord !== null);
export const surfaceImplied = count((r) => r.surfaceWord === null);
export const orderRubric = count((r) => r.order === 'rubric');
export const orderInverted = count((r) => r.order === 'inverted');
export const orderSurfaceOnly = count((r) => r.order === 'surface-only');
export const variantAsSurface = count((r) => r.flags.some((f) => f.startsWith('surface encoded')));

export const stateRows = colorRows.filter((r) => r.state);
export const stateBreakdown = ['hover', 'active', 'focus'].map((s) => ({
  state: s,
  tokens: colorRows.filter((r) => r.state === s).map((r) => r.name),
}));

/** How many distinct words this system uses per rubric surface. */
export const surfaceVocabRows = (['background', 'content', 'border'] as const).map((rubric) => {
  const used = [...new Set(colorRows.filter((r) => r.surface === rubric).map((r) => r.surfaceWord!))];
  return {
    rubric,
    words: used.sort(),
    count: count((r) => r.surface === rubric),
  };
});

/* -------------------------------------- slot 1 + 2: the prefix collision */

/** Tier-1 tokens that share tier 2's `--color-` prefix. The name cannot tell them apart. */
export const prefixCollision = {
  primitive: byTier('primitive').filter((t) => t.name.startsWith('--color-')).length,
  semantic: colorTokens.length,
  example: {
    primitive: byTier('primitive').find((t) => /^--color-grass-\d+$/.test(t.name))?.name ?? '--color-grass-9',
    semantic: '--color-primary',
  },
};

/* --------------------------------------- slot 3: which categories exist */

export interface CategoryRow {
  category: string;
  count: number;
  how: string;
}

/** Count tier-2 tokens matching a pattern, so these rows can't go stale. */
const t2Count = (re: RegExp) => semantic.filter((t) => re.test(t.name)).length;

export const categoryRows: CategoryRow[] = [
  {
    category: 'color',
    count: colorTokens.length,
    how: 'The only category actually named in the token. `--color-…` leads every one.',
  },
  {
    category: 'typography',
    count: t2Count(/^--font-size-ui-/),
    how: '`--font-size-ui-{xs,sm,md,lg}` — chrome text only, aligned step-for-step with `--control-height-*`. PROSE has no tier-2 tokens: that role is still filled by the CSS classes in typography.css, so Figma can’t consume it and a spoke can’t re-point it. See the typography section below.',
  },
  {
    category: 'spacing',
    count: 0,
    how: 'No tier-2 layer, deliberately. Spacing is a MEASURE, not an intent — `--spacing-300` already says everything a `--space-inset-md` would, with a layer less indirection. Components read the primitives directly and that is correct.',
  },
  {
    category: 'border',
    count: colorRows.filter((r) => r.surface === 'border').length,
    how: 'Border COLOURS only. No border-width and no border-style at any tier.',
  },
  {
    category: 'width',
    count: t2Count(/width|height/),
    how: 'Splits in two. `--control-height-*` and `--chip-height-*` are proper roles. The layout.json set (`--sidebar-width`, `--header-height`) still leads with a region rather than the category — and `height` has no home in the rubric, which lists width but not height.',
  },
  {
    category: 'radius',
    count: t2Count(/^--radius-/),
    how: '`--radius-{control,surface,card,overlay,pill}` — five intentions over the ramp. This is what let both themes stop re-pointing `--radius-200`, a primitive, which used to be the SPEC violation flagged under Health.',
  },
  {
    category: 'box-shadow',
    count: t2Count(/^--elevation-/),
    how: '`--elevation-1…6`. Named as an elevation scale rather than the category, and the variant is a number rather than an intention — but every component now reads it instead of `--shadow-*`.',
  },
  {
    category: 'animation',
    count: 0,
    how: 'Nothing at tier 2. `--transition-{fast,base,slow}` sits at tier 1 and is read directly by 27 components. Those are scale positions, not intents — an intent would be `--motion-hover` — so a semantic layer here is unbuilt design work rather than a mechanical move.',
  },
];

/* ------------------------------------------ the non-colour tier-2 tokens */

export const layoutRows = otherTokens
  .filter((t) => !t.name.startsWith('--elevation-'))
  .map((t) => {
    const parts = t.name.replace(/^--/, '').split('-');
    return { name: t.name, region: parts[0], rest: parts.slice(1).join('-') };
  });

export const elevationRows = otherTokens
  .filter((t) => t.name.startsWith('--elevation-'))
  .map((t) => ({ name: t.name, description: t.description ?? '' }));

/* ------------------------------------------------- slot 5: the vocabulary */

export interface VocabRow {
  rubric: string;
  current: string;
  status: 'match' | 'renamed' | 'missing' | 'extra';
  note: string;
}

export const variantVocab: VocabRow[] = [
  { rubric: 'brand', current: 'primary, secondary', status: 'renamed', note: 'Same concept, different word. `secondary` is a second brand ramp rather than a separate intention.' },
  { rubric: 'subtle', current: 'subtle', status: 'match', note: 'Exact match, and used consistently: primary-subtle, ai-subtle, info/success/warning/danger-subtle.' },
  { rubric: 'utility-error', current: 'danger', status: 'renamed', note: 'No `utility-` grouping prefix, and error is spelled danger.' },
  { rubric: 'utility-success', current: 'success', status: 'renamed', note: 'Concept 1:1. Tier 1 used to group these as `--color-status-*`, giving the family a third name one tier down; those aliases have been deleted and these roles now point straight at their ramp steps.' },
  { rubric: 'utility-warning', current: 'warning', status: 'renamed', note: 'As above.' },
  { rubric: 'utility-information', current: 'info', status: 'renamed', note: 'Abbreviated.' },
  { rubric: 'disabled (as a variant)', current: 'disabled', status: 'match', note: 'Concept exactly right — disabled is managed as a variant, not a state, which is the de-duplication the rubric recommends. Only the slot order is inverted (`--color-disabled-bg`).' },
  { rubric: 'sizes lg / md / sm', current: '--control-height-*, --chip-height-*, --font-size-ui-*', status: 'match', note: 'The size axis used to skip tier 2 entirely. It now has three ramps: control height, chip height, and the chrome text size that tracks them. Tier 3 narrows them per family (`--form-height-md` → `--control-height-md`). Padding is still tier 1 by design — spacing is a measure, not an intent.' },
  { rubric: 'sm-mobile', current: '—', status: 'missing', note: 'No responsive variant at any tier.' },
  { rubric: '—', current: 'accent, ai', status: 'extra', note: 'Two extra intentions beyond the rubric list. Both are legitimate; they just need a home in the variant vocabulary.' },
  { rubric: '—', current: 'link, inverse, elevated, sunken, muted, light, strong', status: 'extra', note: 'Ad-hoc variant words with no rubric equivalent. `strong` is the notable one — it is really a surface (content), not a variant.' },
];

/* --------------------------------- typography: the vocabulary that exists */

export const compositeClasses: string[] = (() => {
  if (!existsSync(TYPOGRAPHY_CSS)) return [];
  const css = readFileSync(TYPOGRAPHY_CSS, 'utf8');
  return [...new Set([...css.matchAll(/^\.([a-z0-9-]+)/gm)].map((m) => m[1]))].sort();
})();

export const compositeMapping = [
  { rubric: 'display', current: '.typography-display', status: 'match' as const },
  { rubric: 'heading', current: '.typography-heading-lg, .typography-heading-md', status: 'renamed' as const },
  { rubric: 'title', current: '.typography-title', status: 'match' as const },
  { rubric: 'label', current: '.typography-label', status: 'match' as const },
  { rubric: 'body', current: '.typography-body-lg, -md, -sm', status: 'match' as const },
  { rubric: 'accent', current: '—', status: 'missing' as const },
  { rubric: '—', current: '.typography-meta, .typography-eyebrow, .typography-code', status: 'extra' as const },
];

/* ------------------------------------------------------------ the verdict */

export const slots: RubricSlot[] = [
  {
    n: 1,
    name: 'Global prefix',
    spec: 'eco-',
    verdict: `0 of ${semantic.length}. No token at any tier carries a namespace.`,
    status: 'absent',
  },
  {
    n: 2,
    name: 'Tier identifier',
    spec: 'theme / semantic',
    verdict: `0 of ${semantic.length}. Tier 1 and tier 2 share the --color- prefix, so the name carries no tier signal at all.`,
    status: 'absent',
  },
  {
    n: 3,
    name: 'Category',
    spec: 'color, typography, spacing, border, width, radius, box-shadow, animation',
    verdict: `${colorTokens.length} of ${semantic.length} lead with a category — and only because they are colours. Layout leads with a region, effect with a scale name.`,
    status: 'partial',
  },
  {
    n: 4,
    name: 'Property (surface)',
    spec: 'content | background | border',
    verdict: `${surfaceNamed} of ${colorTotal} colour tokens name a surface, using ${SURFACE_LOOKUP.size} different words for the rubric's 3. Of those, ${orderRubric} put it in rubric order and ${orderInverted} invert it.`,
    status: 'partial',
  },
  {
    n: 5,
    name: 'Variant',
    spec: 'default, brand, subtle, utility-*, sizes, disabled',
    verdict: 'Present on nearly every token and conceptually close — disabled-as-a-variant is exactly right. The vocabulary differs word for word, and the size axis is missing.',
    status: 'partial',
  },
  {
    n: 6,
    name: 'State',
    spec: 'default (omitted), hover, focus, pressed/active',
    verdict: `${stateRows.length} stateful tokens, all with the state trailing, and default correctly omitted. The global focus ring lives at tier 3 exactly as the rubric prescribes.`,
    status: 'match',
  },
];

/* =========================================================================
 * Tier 2 grouped BY PROPERTY (the rubric's slot 4).
 *
 * "Tier 2 semantic color tokens map Tier 1 tokens to specific color roles in
 * the Vanilla theme. These tokens are categorized by property: background,
 * content, and border."
 *
 * The catch the audit above already found: only 27 of 60 NAME their property.
 * Grouping by property therefore means assigning the other 33 by convention.
 * Those are placed, not hidden — every row carries whether its property is
 * declared in the name or inferred, so the grouping doubles as the worklist for
 * making the names say what the grouping knows.
 * ====================================================================== */

/**
 * Where the name doesn't say, convention does. Derived from the Radix step each
 * token resolves to, which is why these are safe to assert rather than guess:
 *   step 2/3   subtle surface        -> background
 *   step 9/10  solid fill            -> background
 *   step 11    text on a surface     -> content
 *   -on-fill   text ON that fill     -> content
 */
const inferSurface = (name: string): 'background' | 'content' => {
  const body = name.replace(/^--color-/, '');
  // Washes and scrims are backgrounds regardless of any `-strong` intensity.
  if (isOverlay(name)) return 'background';
  if (body.endsWith('-on-fill')) return 'content';
  if (body.endsWith('-strong')) return 'content';
  return 'background';
};

const inferReason = (name: string): string => {
  const body = name.replace(/^--color-/, '');
  if (isOverlay(name)) return 'a wash or scrim — a background named after its effect, not its surface';
  if (body.endsWith('-on-fill')) return 'foreground text sitting on that fill (step 12)';
  if (body.endsWith('-strong')) return 'Radix step 11 — coloured text on a surface';
  if (body.endsWith('-subtle')) return 'Radix step 2 — subtle tinted surface';
  return 'Radix step 9/10 — the solid fill';
};

/** Variant family, used to sub-group within a property. */
const familyOf = (name: string): string => {
  const b = name.replace(/^--color-/, '');
  if (b.startsWith('disabled')) return 'disabled';
  if (b.startsWith('primary') || b.startsWith('secondary')) return 'brand';
  if (b.startsWith('accent')) return 'accent';
  if (b.startsWith('ai')) return 'ai';
  if (/^(info|success|warning|danger)\b/.test(b)) return 'utility';
  if (b.startsWith('text-link')) return 'link';
  return 'neutral';
};

const FAMILY_ORDER = ['neutral', 'brand', 'accent', 'ai', 'utility', 'link', 'disabled'];

export interface PropertyRow {
  name: string;
  family: string;
  /** True when the property is spelled in the name; false when inferred. */
  declared: boolean;
  /** The word the name uses, e.g. `bg`, when declared. */
  word: string | null;
  /** Why it lands here, when inferred. */
  reason: string | null;
  state: string | null;
  variant: string | null;
}

export interface PropertyFamily {
  label: string;
  rows: PropertyRow[];
}

export interface PropertyGroup {
  label: 'background' | 'content' | 'border';
  note: string;
  families: PropertyFamily[];
  total: number;
  declared: number;
  inferred: number;
  /** Distinct words the names use for this one property. */
  words: string[];
}

const PROPERTY_NOTES: Record<'background' | 'content' | 'border', string> = {
  background:
    'Used exclusively for background colour. The largest property and the least well named — every bare intent token (--color-primary, --color-danger, every -subtle) is a background whose name never says so.',
  content:
    'Used exclusively for text and icon colours. Spelled `text` here, which the rubric allows as a split of content — but there is no `icon` counterpart, so icon colour has no independent hook at tier 2.',
  border:
    'Used exclusively for border and outline colours. The best-named of the three: every member spells `border`, and it is the only property with no inferred members.',
};

export const propertyGroups: PropertyGroup[] = (['background', 'content', 'border'] as const).map(
  (prop) => {
    const rows: PropertyRow[] = colorRows
      .filter((r) => (r.surface ?? inferSurface(r.name)) === prop)
      .map((r) => ({
        name: r.name,
        family: familyOf(r.name),
        declared: r.surfaceWord !== null,
        word: r.surfaceWord,
        reason: r.surfaceWord ? null : inferReason(r.name),
        state: r.state,
        variant: r.variant,
      }));

    const families: PropertyFamily[] = FAMILY_ORDER.map((label) => ({
      label,
      rows: rows.filter((r) => r.family === label),
    })).filter((f) => f.rows.length > 0);

    return {
      label: prop,
      note: PROPERTY_NOTES[prop],
      families,
      total: rows.length,
      declared: rows.filter((r) => r.declared).length,
      inferred: rows.filter((r) => !r.declared).length,
      words: [...new Set(rows.filter((r) => r.word).map((r) => r.word!))].sort(),
    };
  },
);

/** Node lookup so the page can render the full chain for a grouped row. */
export const semanticNodes = new Map(semantic.map((t) => [t.name, t]));

/** Tier-2 tokens that are not colours, so have no property slot at all. */
export const nonColorGroups = [
  {
    label: 'width / height',
    note: 'layout.json. No category and no property slot — these lead with a region (sidebar, header, footer, content). Under the rubric a width token has no `property` at all, so slots 3 and 5 carry the whole name.',
    tokens: otherTokens.filter((t) => !t.name.startsWith('--elevation-')),
  },
  {
    label: 'box-shadow',
    note: 'effect.json. Named as an elevation scale rather than the box-shadow category, and the variant is a step number rather than an intention.',
    tokens: otherTokens.filter((t) => t.name.startsWith('--elevation-')),
  },
];

/* =========================================================================
 * Tier 2 TYPOGRAPHY, grouped by intention.
 *
 * There are zero tier-2 typography TOKENS. The layer exists — as the composable
 * utility classes in typography.css, which are composites of the tier-1
 * typography primitives in exactly the shape the rubric describes. So this
 * groups what we actually ship, by intention, and decomposes each role into the
 * six tier-1 properties so the composite is visible as a composite.
 *
 * The six columns are fixed on purpose: a role that leaves one unset shows a
 * hole, and an unset property is inherited from whatever the element sits in
 * rather than defined by the role.
 * ====================================================================== */

/** The tier-1 typography properties, in rubric order. Fixed columns. */
export const TYPE_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
] as const;

/**
 * Of the six, these are the four a role MUST pin to be a complete composite.
 * The other two are opt-in by design and their absence is not a defect:
 *   font-family    — unset means "the body face", which is what most roles want.
 *                    Only the display/title roles opt into --font-display.
 *   text-transform — unset means `none`; writing it everywhere would be noise.
 * Measuring completeness against all six flagged 11 of 11 roles, which is a
 * check that reports nothing. Measured against these four it finds one.
 */
export const REQUIRED_TYPE_PROPS = [
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
] as const;

export interface RoleProp {
  property: string;
  /** The token the role reads, e.g. --font-size-800. Null when unset. */
  ref: string | null;
  /** Second token in a `var(a, var(b))` chain — the fallback face. */
  fallbackRef: string | null;
  /** Terminal value, or the literal where the role writes one directly. */
  resolved: string | null;
  /** True when the role writes a raw value rather than reading a token. */
  literal: boolean;
}

export interface Composite {
  className: string;
  props: Record<string, RoleProp>;
  /** Required properties this role leaves to inheritance — the real defect. */
  missing: string[];
}

const nodeByName = new Map(allTokens.map((t) => [t.name, t]));

/**
 * The stylesheet carries the CURRENT roles and, below a DEPRECATED banner, the
 * pre-composite names kept as aliases for spokes. Splitting on that banner
 * matters: parsing the whole file counted 19 roles while only 11 were placeable
 * into an intention, which reads as 8 unaccounted-for roles rather than as
 * 8 aliases doing exactly what they are meant to.
 */
const splitRoleCss = (): { current: string; deprecated: string } => {
  if (!existsSync(TYPOGRAPHY_CSS)) return { current: '', deprecated: '' };
  const css = readFileSync(TYPOGRAPHY_CSS, 'utf8');
  const marker = css.indexOf('DEPRECATED');
  return marker === -1
    ? { current: css, deprecated: '' }
    : { current: css.slice(0, marker), deprecated: css.slice(marker) };
};

const parseTypeRoles = (css: string): Composite[] => {
  const roles: Composite[] = [];

  // Matches BOTH prefixes on purpose. `.typography-*` is the current composite;
  // `.type-*` is the deprecated alias block. Note `type-` is NOT a prefix of
  // `typography-` (typ-E- vs typ-O-), so a pattern written for one silently
  // matches none of the other — which is exactly what happened when the classes
  // were renamed and this section quietly reported zero composites.
  for (const block of css.matchAll(/^\.((?:typography|type)-[a-z0-9-]+)\s*\{([^}]*)\}/gm)) {
    const className = block[1];
    const props: Record<string, RoleProp> = {};

    for (const decl of block[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
      const [, property, rawValue] = decl;
      if (!(TYPE_PROPS as readonly string[]).includes(property)) continue;
      const value = rawValue.trim();

      // `var(--font-display, var(--font-sans))` — capture both so the fallback
      // face is visible rather than collapsed into the primary.
      const refs = [...value.matchAll(/var\(\s*(--[a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1]);
      if (refs.length === 0) {
        props[property] = { property, ref: null, fallbackRef: null, resolved: value, literal: true };
        continue;
      }
      props[property] = {
        property,
        ref: refs[0],
        fallbackRef: refs[1] ?? null,
        resolved: nodeByName.get(refs[0])?.resolved ?? null,
        literal: false,
      };
    }

    roles.push({
      className,
      props,
      missing: REQUIRED_TYPE_PROPS.filter((p) => !props[p]),
    });
  }
  return roles;
};

const roleCss = splitRoleCss();
const allRoles = parseTypeRoles(roleCss.current);
/** The pre-composite names, kept as aliases so spoke markup keeps rendering. */
export const deprecatedAliases = parseTypeRoles(roleCss.deprecated).map((r) => r.className);
const roleByName = new Map(allRoles.map((r) => [r.className, r]));
const pick = (...names: string[]) => names.map((n) => roleByName.get(n)).filter(Boolean) as Composite[];

export interface TypeIntention {
  label: string;
  /** What this intention is for. */
  definition: string;
  roles: Composite[];
  /** Where the roles inside this intention are inconsistent with each other. */
  note?: string;
}

/**
 * DERIVED from the composite names, not authored. The grouping used to be the
 * REFERENCE model's six intentions (Display / Headline / Title / Body / Label /
 * Meta), which stopped describing our tokens the moment `page-title`,
 * `section-title` and `card-title` were regularised into one `heading`
 * intention with three sizes: the page then filed `heading-lg` under "Headline"
 * and `heading-md/sm` under "Title", splitting one intention across two
 * headings that exist nowhere in our names. Deriving the intention from the
 * token means the grouping cannot disagree with the tokens again.
 */
const INTENTION_NOTES: Record<string, { definition: string; note?: string }> = {
  display: {
    definition:
      'The largest type in the system — hero numbers, landing statements, logotype-adjacent text. One size, one use.',
  },
  heading: {
    definition:
      'Page and section headings. Both read the display face, both set tight leading and tracking, and ONLY the size differs between them — which is what makes this a genuine size axis rather than two things sharing a prefix.',
  },
  title: {
    definition:
      'The heading inside a card or panel. Its own intention, not `heading-sm`: it reads the BODY face at normal leading and normal tracking, so every one of its five properties differs from `heading-md`. A size variant that also changes the typeface is not a size variant. The reference model draws this line one step higher (headline vs title); ours follows where the values actually break.',
  },
  body: {
    definition: 'Running prose and the default text of the interface, in three sizes.',
    note: '`body-lg` and `body-md` use line-height-relaxed; `body-sm` drops to normal. Deliberate at small sizes, but it means the three are not one composite scaled.',
  },
  label: {
    definition:
      'Form labels, button text, and other UI chrome that names a control rather than reading as prose.',
  },
  meta: {
    definition:
      'Secondary annotation beside the thing it describes — help text, captions, timestamps, counts.',
    note: '`meta` and `label` are the same size (--font-size-100) and differ only in weight — regular vs medium. The size scale does not separate them; only the weight does.',
  },
  eyebrow: {
    definition:
      'The small caps marker above a heading or as a section marker. Its own intention rather than a variant of meta: it was `meta-caps`, which put a NON-size in the slot that carries lg/md/sm everywhere else.',
  },
  code: {
    definition:
      'Monospace — code, tokens, tabular figures. Arguably a face swap rather than an intention, since it cuts across the others rather than naming a place in the hierarchy.',
  },
};

/** Intention = the composite name with any trailing t-shirt size removed. */
const intentionOf = (className: string) =>
  className.replace(/^typography-/, '').replace(/-(lg|md|sm)$/, '');

export const typeIntentions: TypeIntention[] = (() => {
  const groups = new Map<string, Composite[]>();
  for (const r of allRoles) {
    const key = intentionOf(r.className);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.entries()].map(([key, roles]) => ({
    label: key,
    definition: INTENTION_NOTES[key]?.definition ?? 'No authored definition yet for this intention.',
    roles,
    note: INTENTION_NOTES[key]?.note,
  }));
})();

export const typeCoverage = {
  roles: allRoles.length,
  placed: typeIntentions.reduce((n, i) => n + i.roles.length, 0),
  /** Composites leaving a REQUIRED property to inheritance. */
  incomplete: allRoles
    .filter((r) => r.missing.length > 0)
    .map((r) => ({ className: r.className, missing: r.missing })),
  /** Composites that opt into the display face — the surface a spoke re-points. */
  displayFace: allRoles
    .filter((r) => r.props['font-family']?.ref === '--font-display')
    .map((r) => r.className),
};

/* =========================================================================
 * Distance to the reference tier-2 typography model.
 *
 * A worked example of the target SHAPE, supplied for calibration — NOT to be
 * built, and its px values are not targets. 22 composites named
 * <intention>-<size>[-mobile], each declaring all six properties, every value a
 * reference (no literals anywhere), and each -mobile variant aliasing its
 * desktop sibling for the properties that don't change.
 *
 * Everything here compares STRUCTURE: which roles exist, which slots the names
 * carry, whether a composite is complete, whether a mobile/desktop pair is
 * expressible. The reference's numbers are carried only to show the shape of a
 * role (that it pins a size, that a -mobile sibling changes some properties and
 * inherits others) — never to measure our scale against.
 * ====================================================================== */

export interface ReferenceRole {
  name: string;
  intention: string;
  size: string;
  mobile: boolean;
  fontSize: string;
  lineHeight: string;
  weight: string;
  letterSpacing: string;
  transform: string;
  /** Properties this role aliases from its desktop sibling rather than a primitive. */
  aliases: string[];
}

const R = (
  name: string, intention: string, size: string, mobile: boolean,
  fontSize: string, lineHeight: string, weight: string, letterSpacing: string,
  transform: string, aliases: string[] = [],
): ReferenceRole => ({ name, intention, size, mobile, fontSize, lineHeight, weight, letterSpacing, transform, aliases });

export const REFERENCE_ROLES: ReferenceRole[] = [
  R('display-default', 'Display', 'default', false, '100', '110', '700', 'minus-2', 'none'),
  R('display-default-mobile', 'Display', 'default', true, '48', '56', '700', 'minus-1-half', 'none', ['font-family', 'font-weight', 'text-transform']),
  R('display-sm', 'Display', 'sm', false, '40', '48', '400', 'minus-1-half', 'none'),
  R('display-sm-mobile', 'Display', 'sm', true, '32', '40', '400', 'minus-1', 'none', ['font-family', 'font-weight']),
  R('headline-lg', 'Headline', 'lg', false, '48', '56', '700', 'half', 'none'),
  R('headline-lg-mobile', 'Headline', 'lg', true, '40', '48', '700', 'half', 'none', ['font-family', 'font-weight']),
  R('headline-default', 'Headline', 'default', false, '40', '48', '700', 'half', 'none'),
  R('headline-default-mobile', 'Headline', 'default', true, '32', '40', '700', 'half', 'none', ['font-family', 'font-weight', 'text-transform']),
  R('headline-sm', 'Headline', 'sm', false, '32', '40', '700', 'half', 'none'),
  R('headline-sm-mobile', 'Headline', 'sm', true, '28', '36', '700', 'half', 'none', ['font-family', 'font-weight']),
  R('title-lg', 'Title', 'lg', false, '32', '40', '700', 'minus-1', 'none'),
  R('title-lg-mobile', 'Title', 'lg', true, '28', '36', '700', 'minus-half', 'none', ['font-family', 'font-weight']),
  R('title-default', 'Title', 'default', false, '28', '36', '700', 'minus-half', 'none'),
  R('title-sm', 'Title', 'sm', false, '24', '32', '700', 'minus-half', 'none'),
  R('label-lg', 'Label', 'lg', false, '20', '28', '700', '0', 'none'),
  R('label-default', 'Label', 'default', false, '16', '24', '700', '0', 'none'),
  R('label-sm', 'Label', 'sm', false, '14', '20', '700', '0', 'none'),
  R('body-lg', 'Body', 'lg', false, '20', '28', '400', '0', 'none'),
  R('body-default', 'Body', 'default', false, '16', '24', '400', '0', 'none'),
  R('body-sm', 'Body', 'sm', false, '14', '20', '400', '0', 'none'),
  R('meta-default', 'Meta', 'default', false, '14', '20', '700', '2', 'uppercase'),
  R('meta-sm', 'Meta', 'sm', false, '12', '16', '700', '2', 'uppercase'),
];

/**
 * Our nearest equivalent for each DESKTOP reference role. Judgment, matched on
 * intention + relative size within the intention, not on px — our sizes are
 * fluid ranges, so an exact match doesn't exist to claim.
 */
const EQUIVALENT: Record<string, string | null> = {
  'display-default': 'typography-display',
  'display-sm': null,
  'headline-lg': null,
  'headline-default': 'typography-heading-lg',
  'headline-sm': null,
  'title-lg': 'typography-heading-md',
  'title-default': 'typography-title',
  'title-sm': null,
  'label-lg': null,
  'label-default': 'typography-label',
  'label-sm': null,
  'body-lg': 'typography-body-lg',
  'body-default': 'typography-body-md',
  'body-sm': 'typography-body-sm',
  'meta-default': 'typography-eyebrow',
  'meta-sm': null,
};

/**
 * A clamp() already carries the two discrete values the reference model names
 * explicitly: the min IS the mobile size and the max IS the desktop size. So the
 * -mobile pair is not missing from our system, it is unextracted — a build-time
 * transform away, not a re-authoring.
 *
 * Returns px at a 16px root. `null` for a non-clamp value.
 */
export const clampBounds = (value: string | null | undefined): { min: number; max: number } | null => {
  if (!value) return null;
  const m = value.match(/clamp\(\s*([\d.]+)rem\s*,[^,]*,\s*([\d.]+)rem\s*\)/);
  if (!m) return null;
  return { min: Number(m[1]) * 16, max: Number(m[2]) * 16 };
};

export interface CoverageCell {
  reference: ReferenceRole;
  ours: string | null;
  /** Our role's font-size token, where we have one. */
  oursToken: string | null;
  /** The px pair the clamp already encodes: min = mobile, max = desktop. */
  oursBounds: { min: number; max: number } | null;
  mobile: ReferenceRole | null;
}

export const coverageByIntention = ['Display', 'Headline', 'Title', 'Label', 'Body', 'Meta'].map(
  (intention) => {
    const desktop = REFERENCE_ROLES.filter((r) => r.intention === intention && !r.mobile);
    return {
      intention,
      cells: desktop.map((reference): CoverageCell => {
        const ours = EQUIVALENT[reference.name] ?? null;
        const role = ours ? roleByName.get(ours) : undefined;
        const ref = role?.props['font-size']?.ref ?? null;
        return {
          reference,
          ours,
          oursToken: ref,
          oursBounds: clampBounds(ref ? nodeByName.get(ref)?.resolved : null),
          mobile: REFERENCE_ROLES.find((r) => r.mobile && r.name === `${reference.name}-mobile`) ?? null,
        };
      }),
    };
  },
);

const desktopRefs = REFERENCE_ROLES.filter((r) => !r.mobile);
const mobileRefs = REFERENCE_ROLES.filter((r) => r.mobile);

export const referenceGap = {
  refTotal: REFERENCE_ROLES.length,
  refDesktop: desktopRefs.length,
  refMobile: mobileRefs.length,
  covered: desktopRefs.filter((r) => EQUIVALENT[r.name]).length,
  missing: desktopRefs.filter((r) => !EQUIVALENT[r.name]).map((r) => r.name),
  /** Ours with no slot in the reference model. */
  extra: allRoles
    .map((r) => r.className)
    .filter((c) => !Object.values(EQUIVALENT).includes(c)),
};

export interface StructuralGap {
  dimension: string;
  reference: string;
  ours: string;
  verdict: 'gap' | 'divergence' | 'match';
  detail: string;
}

/**
 * `divergence` is not a softer word for `gap`. A gap is something the reference
 * has and we lack. A divergence is a different decision with its own rationale
 * already written down in this repo — closing it would be a trade, not a fix.
 */
export const structuralGaps: StructuralGap[] = [
  {
    dimension: 'Expressed as',
    reference: '22 tokens in JSON',
    ours: '56 tokens + 11 classes',
    verdict: 'match',
    detail:
      'CLOSED. This was the largest single gap and the one everything else sat on: the composite structure was right but expressed only as CSS classes, which Figma cannot consume, a spoke cannot re-point through the token layer, and no other platform compiles. The 56 tier-2 `--typography-*` tokens now hold the values; the classes are the assembly layer on top, because CSS has no composite custom property. A class contains no size and no weight — only var()s.',
  },
  {
    dimension: 'Naming',
    reference: '<intention>-<size>[-mobile]',
    ours: '<intention>[-<size>]',
    verdict: 'match',
    detail:
      'CLOSED. Names used to describe the PLACE (`page-title`, `card-title`, `caption`); they now name the intention, with a t-shirt size where an intention has more than one. The one deliberate difference: the size slot is omitted rather than defaulted for single-size intentions, so it is `--typography-label-font-size`, not `-label-default-`. The old names survive as deprecated class aliases only.',
  },
  {
    dimension: 'Size axis',
    reference: 'lg / default / sm per intention',
    ours: 'three sizes for 2 of 6 intentions',
    verdict: 'gap',
    detail:
      'Narrowed, not closed. Heading joined Body at a full three-step range when `page-title`/`section-title`/`card-title` were regularised into `heading-lg/md/sm` — so the "no smaller headline to reach for" complaint is answered. Display, Label and Meta still ship a single size each. Whether that is a gap or a correct reading of demand is a design question, not a naming one: nothing in the kit has asked for a `label-sm`.',
  },
  {
    dimension: 'Responsive',
    reference: '6 explicit -mobile roles',
    ours: 'fluid clamp() in the primitive',
    verdict: 'divergence',
    detail:
      'We ship zero -mobile roles because every --font-size-* is a clamp() that interpolates continuously with the viewport. Their model steps at a breakpoint; ours never steps. Critically, the discrete pair is NOT lost: clamp(min, fluid, max) already encodes the mobile floor and the desktop ceiling as real values — --font-size-800 is 32px…44px, which is exactly a display-default-mobile / display-default pair. Exporting to Figma is a build-time extraction of the two bounds, not a re-authoring. The one thing genuinely absent is the ability to set a mobile value INDEPENDENTLY of the desktop one; ours are tied together by the interpolation.',
  },
  {
    dimension: 'line-height',
    reference: 'absolute px, one per role',
    ours: 'unitless ratio, 4 shared values',
    verdict: 'divergence',
    detail:
      'Forced by the choice above: a fixed px line-height cannot pair with a fluid font-size. Theirs pins an exact line-height per role, so every role owns its own value; ours composes a ratio that holds at any interpolated size, so a handful of values serve every role. Theirs gives per-role control, ours gives automatic consistency. Four rungs (none/tight/normal/relaxed) serve all eleven roles.',
  },
  {
    dimension: 'font-weight',
    reference: 'named by value — 400, 700',
    ours: 'named by role — regular … bold',
    verdict: 'divergence',
    detail:
      'Deliberate, and documented in typography.css: weights are typeface-bound, so the hub ships DM Sans optical weights (350/450/550/650) behind stable role names. A spoke swapping the face remaps the numbers and every role follows. Value-named weights would break at exactly that point.',
  },
  {
    dimension: 'font-family',
    reference: 'one face — helvetica',
    ours: '--font-sans / --font-display / --font-mono',
    verdict: 'divergence',
    detail:
      'We are ahead here: --font-display exists as a re-point seam so a spoke gets distinct headlines by setting one token. The reference model has no such seam — every role hardcodes the same face reference.',
  },
  {
    dimension: 'text-transform',
    reference: 'a referenced primitive, set on all 22',
    ours: 'no primitive exists',
    verdict: 'gap',
    detail:
      'There is no --text-transform-* token at any tier, so `.typography-eyebrow` writes `uppercase` as a literal — the only raw value in any of our roles. Their model has text-transform.none/uppercase as real primitives, which is what lets all 22 roles declare the property rather than inherit it.',
  },
  {
    dimension: 'Completeness',
    reference: 'all 6 properties on all 22',
    ours: '4 required on 10 of 11',
    verdict: 'match',
    detail:
      'Closer than it looks. Every role but .typography-code pins size, weight, line-height and letter-spacing. font-family and text-transform are left unset by design in ours where the reference declares them explicitly — a stylistic difference, except that it is what makes ours non-exportable as a complete composite.',
  },
  {
    dimension: 'Sibling aliasing',
    reference: '-mobile aliases its desktop sibling',
    ours: 'n/a — no variants to alias',
    verdict: 'gap',
    detail:
      'The reference re-declares only what changes and references the sibling for the rest ({typography.display-default.font-family}), so a weight change propagates to the mobile variant automatically. This is a tier-2 → tier-2 reference, which nothing in our token layer does today. Worth noting the reference applies it unevenly: display-default-mobile aliases text-transform, display-sm-mobile re-declares it.',
  },
];

/** The de facto grammar, written as a rule, next to the rubric's. */
export const grammars = {
  current: [
    'color:   --color-<variant|surface>[-<surface|variant>][-<state>]',
    'layout:  --<region>-<dimension>[-<modifier>]',
    'effect:  --elevation-<step>',
  ],
  rubric: '--eco-<tier>-<category>-<property>-<variant>[-<state>]',
};
