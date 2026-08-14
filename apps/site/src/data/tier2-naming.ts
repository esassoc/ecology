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
/** Everything in tier 2 that is not a colour. Grouped into explicit families by
 *  `nonColorGroups` below — never rendered as one undifferentiated list. */
const allNonColor = semantic.filter((t) => !t.name.startsWith('--color-'));

/* ------------------------------------------------------ the name parser */

/** Rubric surface -> every word this system actually uses for it. */
// The vocabulary is now one word per property — that IS the fix this audit measured
// the need for. `surface`/`bg` and `text` are kept only so the deprecated aliases in
// dist/tokens.css still parse into a property rather than showing up as unclassified.
//
// `overlay` maps to background because that is the property it lands on. It is the
// system's one deliberate synonym: the translucent washes sit OVER a background
// rather than being one, and naming them `background-*` would collide with the
// opaque neutrals already holding those names. Documented in SPEC.md, so the parser
// should read them as DECLARED rather than counting them against the worklist.
const SURFACE_VOCAB: Record<'background' | 'content' | 'border', string[]> = {
  background: ['background', 'surface', 'bg', 'overlay'],
  content: ['content', 'text'],
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

  // `-strong` and `-on-fill` were surfaces wearing a variant costume: both marked a
  // CONTENT colour with no content word in the name. They are gone — `-strong`
  // became `--color-content-*` and `-on-fill` became `--color-content-on-*` — so
  // this fires on nothing in the current set and `variantAsSurface` reads 0.
  //
  // The check stays because it is a regression guard, not a historical note: a new
  // token that encodes its surface as a variant would be flagged the same way. Two
  // guards keep it honest. surfaceIdx: in `--color-border-strong` the surface IS
  // named and `strong` is a genuine variant (a heavier border). isOverlay: in a
  // wash, `strong` is an INTENSITY, not a content colour.
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

  // `overlay` is the one sanctioned synonym (see SURFACE_VOCAB), so it is not a
  // spelling defect. Everything else that diverges from the rubric word still is.
  if (surfaceWord && surfaceWord !== surface && surfaceWord !== 'overlay') {
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
    semantic: '--color-background-brand',
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
    how: 'Three sets. `--typography-<role>[-<size>]-<property>` are the composite PROSE roles (66 tokens); `--font-{sans,mono,display}` and `--font-weight-*` are the faces and weights they are assembled from; `--font-size-ui-{xs,sm,md,lg}` is chrome text, aligned step-for-step with `--control-height-*` and referenced by no composite. Prose used to have no tokens at all — only the CSS classes in typography.css, which Figma cannot consume and a spoke cannot re-point. The classes still ship, but they now read the composites, so overriding a token moves the class.',
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
    count: t2Count(/^--(transition|animation)-/),
    how: 'Two sets, because CSS has two motion properties: `--transition-{fast,base,slow}` for `transition:` and `--animation-{enter,exit,overlay-enter,overlay-exit,spin,indeterminate}` for `animation:`. Both compose tier-1 `--duration-*` and `--easing-*`, which is the composite pattern typography already follows. The transition set used to sit at tier 1 as fused strings ("150ms ease") — scale positions wearing intent names, in the raw-value tier, with neither axis addressable.',
  },
];

/* ------------------------------------------ the non-colour tier-2 tokens */

/**
 * One row per FAMILY for the summary table — what each family's names lead with,
 * and where the CSS property sits.
 *
 * Per-TOKEN rows are what this used to be, and the middle column hardcoded the
 * string "region, not a category" for every one of them. Since the row set was the
 * leftover bucket, that meant asserting `--typography-body-md-font-size` leads with
 * a region. The claim can only be made per family, so it is now made there.
 */
export const nonColorLeadRows = () =>
  nonColorGroups
    .filter((g) => g.tokens.length > 0)
    .map((g) => ({
      label: g.label,
      count: g.tokens.length,
      leads: FAMILY_LEADS[g.label] ?? '—',
      property: g.property,
    }));

/* ------------------------------------------------- slot 5: the vocabulary */

export interface VocabRow {
  rubric: string;
  current: string;
  status: 'match' | 'renamed' | 'missing' | 'extra';
  note: string;
}

export const variantVocab: VocabRow[] = [
  { rubric: 'brand', current: 'brand', status: 'match', note: 'Now an exact match. It was `primary`, which meant two different things at once — the brand hue, and the most prominent of a set (`--color-text-primary`). Property-first naming collapsed those into one slot, so the hue took `brand` and `primary` was left to mean prominence only. `secondary` survives as a brand VARIANT (`--color-background-brand-secondary`), a second fill rather than a separate intention.' },
  { rubric: 'subtle', current: 'subtle', status: 'match', note: 'Exact match, and used consistently: background-brand-subtle, background-ai-subtle, background-{info,success,warning,danger}-subtle.' },
  { rubric: 'utility-error', current: 'danger', status: 'renamed', note: 'No `utility-` grouping prefix, and error is spelled danger.' },
  { rubric: 'utility-success', current: 'success', status: 'renamed', note: 'Concept 1:1. Tier 1 used to group these as `--color-status-*`, giving the family a third name one tier down; those aliases have been deleted and these roles now point straight at their ramp steps.' },
  { rubric: 'utility-warning', current: 'warning', status: 'renamed', note: 'As above.' },
  { rubric: 'utility-information', current: 'info', status: 'renamed', note: 'Abbreviated.' },
  { rubric: 'disabled (as a variant)', current: 'disabled', status: 'match', note: 'Concept exactly right — disabled is managed at the intention level, not as a state, which is the de-duplication the rubric recommends. The slot order used to be inverted (`--color-disabled-bg`); it now reads `--color-background-disabled` like everything else.' },
  { rubric: 'sizes lg / md / sm', current: '--control-height-*, --chip-height-*, --font-size-ui-*', status: 'match', note: 'The size axis used to skip tier 2 entirely. It now has three ramps: control height, chip height, and the chrome text size that tracks them. Tier 3 narrows them per family (`--form-height-md` → `--control-height-md`). Padding is still tier 1 by design — spacing is a measure, not an intent.' },
  { rubric: 'sm-mobile', current: '—', status: 'missing', note: 'No responsive variant at any tier.' },
  { rubric: '—', current: 'accent, ai', status: 'extra', note: 'Two extra intentions beyond the rubric list. Both are legitimate; the rubric explicitly expects teams to add their own. `ai` earns its place by never colliding with brand or status; `accent` has thin surface area and is worth watching.' },
  { rubric: '—', current: 'link, inverse, raised, floating, sunken, muted, subtle', status: 'extra', note: 'Variant words with no rubric equivalent, all describing prominence or elevation. `strong` used to head this list and was the worst offender — it marked step-11 tokens that are TEXT on a surface, so it read like a bolder fill and got used as one. Those are now `--color-content-*` and the word is gone from colour entirely.' },
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
  // `-on-*` and the old `-on-fill` both mark a foreground FOR a fill.
  if (/(^|-)on-/.test(body) || body.endsWith('-on-fill')) return 'content';
  if (body.endsWith('-strong')) return 'content';
  return 'background';
};

const inferReason = (name: string): string => {
  const body = name.replace(/^--color-/, '');
  if (isOverlay(name)) return 'a wash or scrim — a background named after its effect, not its surface';
  if (/(^|-)on-/.test(body) || body.endsWith('-on-fill')) return 'foreground text sitting on that fill';
  if (body.endsWith('-strong')) return 'Radix step 11 — coloured text on a surface';
  if (body.endsWith('-subtle')) return 'Radix step 2 — subtle tinted surface';
  return 'Radix step 9/10 — the solid fill';
};

/**
 * Intention family, used to sub-group within a property.
 *
 * The property word has to come off first. Every tier-2 colour name now LEADS with
 * `background`/`content`/`border`/`overlay`, so matching the intention against the
 * raw name finds nothing and every token lands in the `neutral` default — which is
 * how this read "38 neutral backgrounds" after the property-first rename.
 *
 * `on-` comes off too: `--color-content-on-brand` belongs to brand, not to a family
 * of its own. It is the foreground FOR that intention.
 */
const familyOf = (name: string): string => {
  const b = name
    .replace(/^--color-/, '')
    .replace(/^(background|content|border|overlay)(-|$)/, '')
    .replace(/^on-/, '');
  // Nothing left means the name was just its property — `--color-background`,
  // `--color-border`. Those are the neutral defaults for their property.
  if (!b) return 'neutral';
  if (b.startsWith('disabled')) return 'disabled';
  if (b.startsWith('brand')) return 'brand';
  if (b.startsWith('accent')) return 'accent';
  if (b.startsWith('ai')) return 'ai';
  if (/^(info|success|warning|danger)(-|$)/.test(b)) return 'utility';
  if (b.startsWith('link')) return 'link';
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
    'Fills and surfaces. Still the largest property, and it used to be the worst named — every bare intent token (--color-primary, --color-danger, and every -subtle) was a background whose name never said so. All of them now lead with `background`.',
  content:
    'Text, icons and SVG strokes. Spelled `content`, not `text`: icons and strokes were already reading these tokens, so the narrower word described the members inaccurately.',
  border:
    'Strokes and dividers. Was already the best-named of the three — every member spelled `border` — and it stayed that way; the only change was `-light` to `-subtle`, since lightness does not invert sensibly in a dark theme but prominence does.',
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

/**
 * The non-colour half of tier 2, grouped by FAMILY.
 *
 * This used to be two groups: `--elevation-*`, and a second holding everything
 * else under the heading "width / height". Everything else was 107 tokens across
 * twelve unrelated families — 66 typography composites, 12 font tokens, 7
 * z-indexes, 5 radius roles — of which EIGHT were actually a width or a height.
 * All 107 also carried a hardcoded `no property slot` chip, which is false for
 * most of them (`--z-dropdown`, `--radius-card` and `--font-weight-medium` all
 * lead with their property).
 *
 * The failure is the bucket being defined by exclusion (`!startsWith('--color-')`)
 * and then labelled after one of its residents. A leftover bucket cannot report
 * that something new landed in it wearing the wrong name — it always looks full
 * and correct. So: families are matched EXPLICITLY, first match wins, and whatever
 * matches nothing lands in `unclassified`, which renders even when empty. A new
 * token family shows up there as a visible hole instead of being absorbed.
 */
type PropertyPosition = 'first' | 'last' | 'none';

/** What each family's names lead with — the claim the summary table makes. */
const FAMILY_LEADS: Record<string, string> = {
  'typography (composite roles)': 'a role (display, heading, body, label…)',
  'typography — faces & weights': 'the CSS property (font-family, font-weight)',
  'font-size-ui (chrome text)': 'the CSS property (font-size)',
  'border-radius': 'the property, abbreviated (radius)',
  'border-width': 'the property',
  'box-shadow': 'a scale name (elevation), not the property',
  'transition / animation': 'the property',
  'z-index': 'the property, abbreviated (z)',
  'width / height': 'a region or element (sidebar, header, control, chip)',
  'touch target': 'a concept with no CSS property behind it',
  unclassified: '—',
};

const NON_COLOR_FAMILIES: {
  label: string;
  match: RegExp;
  property: PropertyPosition;
  note: string;
}[] = [
  {
    label: 'typography (composite roles)',
    match: /^--typography-/,
    property: 'last',
    note: 'semantic/typography.json. `--typography-<role>[-<size>]-<property>` — role first, property last, one token per property so the composite is addressable piece by piece. These are the tokenised form of the `.type-*` classes; the section below decomposes each role across the six tier-1 properties.',
  },
  {
    label: 'typography — faces & weights',
    // Excludes --font-size-ui-* explicitly rather than relying on match order, so the
    // families can be listed ingredient-next-to-composite for reading.
    match: /^--font-(?!size-ui-)/,
    property: 'first',
    note: 'semantic/typography.json — the INGREDIENT layer the composite roles are assembled from, within the same tier. `--typography-display-font-family` resolves to `--font-display`; `--typography-display-font-weight` to `--font-weight-bold`. Listed separately rather than folded into the composites because they are not only ingredients: they are among the most directly-read tokens in the system (`--font-sans` 69 reads, `--font-mono` 60, `--font-weight-medium` 45, `--font-weight-semibold` 38). Chrome legitimately reaches for a weight without wanting a whole prose role — there is a `--font-size-ui-*` ramp but no matching weight role, which is why. `--font-display` is the exception that IS mostly an ingredient: 3 composites use it against 5 direct reads, and it defaults to `--font-sans` so the slot exists for a spoke to swap in a distinct headline face.',
  },
  {
    label: 'font-size-ui (chrome text)',
    match: /^--font-size-ui-/,
    property: 'first',
    note: 'semantic/typography.json. Text inside interface furniture — control labels, table headers, pills, pagination — aligned step-for-step with `--control-height-*`, so a component rendered at `md` reads `--font-size-ui-md`. NOT an ingredient of any composite: zero composites reference it, because prose sizing goes through the roles above. It sits apart from the faces and weights for that reason.',
  },
  {
    label: 'border-radius',
    match: /^--radius-/,
    property: 'first',
    note: 'semantic/radius.json. `--radius-{control,surface,card,overlay,pill}` — five intentions over the tier-1 ramp. This is what let both themes stop re-pointing `--radius-200`, a primitive, which used to be the SPEC violation flagged under Health.',
  },
  {
    label: 'border-width',
    match: /^--border-width-/,
    property: 'first',
    note: 'semantic/border.json. One role, not a t-shirt scale, because the audit found the system has one: 49 hairline borders across 25 components. Every other width in the kit is internal micro-geometry that SPEC excludes from the theming surface.',
  },
  {
    label: 'box-shadow',
    match: /^--elevation-/,
    property: 'none',
    note: 'semantic/effect.json. Named as an elevation scale rather than the box-shadow category, and the variant is a step number rather than an intention — but every component reads it instead of `--shadow-*`.',
  },
  {
    label: 'transition / animation',
    match: /^--(transition|animation)-/,
    property: 'first',
    note: 'semantic/motion.json. Named for the CSS property they land in — the same rule colour follows — so `--transition-*` belongs in a `transition:` declaration and `--animation-*` in an `animation:`. Two sets rather than one `--motion-*` set because they are not interchangeable: `infinite` cannot appear in a transition. Each composes tier-1 `--duration-*` and `--easing-*`; the animation set carries duration, easing and iteration but never the @keyframes name, which stays with the component.',
  },
  {
    label: 'z-index',
    match: /^--z-/,
    property: 'first',
    note: 'semantic/effect.json. A stacking ORDER named by what stacks — dropdown, sidebar, header, modal, toast, tooltip — so the layer relationships are readable without comparing numbers. The taxonomy notes it is a genuine judgement call whether to tokenise stacking at all.',
  },
  {
    label: 'width / height',
    match: /^--(sidebar|header|footer|content|control-height|chip-height)/,
    property: 'last',
    note: 'semantic/layout.json and size.json, and really two families. `--control-height-*` and `--chip-height-*` are proper size ROLES on a shared scale. The layout set (`--sidebar-width`, `--header-height`, `--content-max-width`) leads with a REGION and puts the property last — the same shape colour had before it was flipped, where `--color-danger-border` became `--color-border-danger`. Flipping these would scatter a region across the file for no gain: a sidebar has one dimension that matters, so there is no cross-product to group by. What is genuinely inconsistent is the content trio — `--content-max-width` names the CSS property, `--content-narrow-width` and `--content-wide-width` put a variant where the property word sits, so a reader cannot tell whether they are max-widths or fixed widths.',
  },
  {
    label: 'touch target',
    match: /^--touch-target-/,
    property: 'none',
    note: 'semantic/effect.json. `--touch-target-min` is the WCAG 2.5.5 floor — a role, not a ramp step, and never re-pointed smaller.',
  },
];

export const nonColorGroups: {
  label: string;
  note: string;
  tokens: typeof otherTokens;
  property: PropertyPosition;
  /** True for the catch-all, which renders even when empty. */
  isUnclassified?: boolean;
}[] = (() => {
  const claimed = new Set<string>();
  const groups = NON_COLOR_FAMILIES.map((f) => {
    const tokens = allNonColor.filter((t) => !claimed.has(t.name) && f.match.test(t.name));
    tokens.forEach((t) => claimed.add(t.name));
    return { label: f.label, note: f.note, property: f.property, tokens };
  });
  const rest = allNonColor.filter((t) => !claimed.has(t.name));
  groups.push({
    label: 'unclassified',
    property: 'none',
    note:
      'Nothing should be here. This group exists so a NEW tier-2 family announces itself instead of being swallowed by whichever group is defined as "the rest" — which is exactly how 107 tokens spent time filed under the heading "width / height". Anything appearing here needs a family added above.',
    tokens: rest,
    isUnclassified: true,
  } as (typeof groups)[number]);
  return groups;
})();

/* =========================================================================
 * Tier 2 TYPOGRAPHY, grouped by intention.
 *
 * Tier-2 typography is now tokenised: 66 `--typography-<role>[-<size>]-<property>`
 * composites, which the utility classes in typography.css read. (This note used to
 * say "there are zero tier-2 typography TOKENS" and kept saying it after they
 * landed — the layer moved, the audit describing it did not.) So this groups what
 * we actually ship, by intention, and decomposes each role into the
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
 *                    Since the composite refactor every role pins it anyway, via
 *                    its own --typography-*-font-family hook, so this is now a
 *                    rule nothing tests rather than a rule anything violates.
 *   text-transform — unset means `none`; writing it everywhere would be noise.
 * Measuring completeness against all six flagged every role, which is a check
 * that reports nothing. Measured against these four it reports the real defect.
 */
export const REQUIRED_TYPE_PROPS = [
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
] as const;

export interface RoleProp {
  property: string;
  /** The token the role reads, e.g. --typography-heading-md-font-size. Null when unset. */
  ref: string | null;
  /** Tier of `ref` — 'semantic' is the intended shape; 'primitive' means the
   *  composite skips the tier-2 hop and a spoke has nothing to re-point. */
  refTier: string | null;
  /**
   * What `ref` maps to, hop by hop, down to the tier-1 token — the typography
   * equivalent of the colour rows' tier-1 column: the value alone says WHAT
   * renders, the primitive says WHICH step of the scale it came from. Empty
   * when `ref` is already tier 1 or bottoms out in a literal.
   *
   * The whole chain rather than just the primitive, because the intermediate
   * hop is the interesting one: `--typography-display-font-family` reaches
   * `--font-family-dm-sans` THROUGH `--font-display`, and `--font-display` is
   * the token a spoke re-points. Collapsing to the primitive hides it.
   */
  chain: { ref: string; tier: string }[];
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
 * The token hops behind a tier-2 typography token, terminal raw value dropped
 * (the value already has its own column). A token that is itself tier 1 has
 * nothing behind it and returns empty.
 */
const chainBehind = (ref: string): { ref: string; tier: string }[] => {
  const node = nodeByName.get(ref);
  if (!node || node.tier === 'primitive') return [];
  return node.lineage
    .filter((l) => l.kind !== 'raw')
    .map((l) => ({ ref: l.ref, tier: l.kind }));
};

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
        props[property] = {
          property,
          ref: null,
          refTier: null,
          chain: [],
          fallbackRef: null,
          resolved: value,
          literal: true,
        };
        continue;
      }
      props[property] = {
        property,
        ref: refs[0],
        refTier: nodeByName.get(refs[0])?.tier ?? null,
        chain: chainBehind(refs[0]),
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
  /**
   * An OBSERVATION about this intention — context worth knowing, not a defect.
   * Deliberately separate from `inconsistency`: the badge used to fire on any
   * note at all, so `meta` was labelled inconsistent for a remark comparing it
   * to `label`. A single-composite group cannot be internally inconsistent.
   */
  note?: string;
  /** A real defect: the composites inside this intention disagree with each other. */
  inconsistency?: string;
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
const INTENTION_NOTES: Record<string, { definition: string; note?: string; inconsistency?: string }> = {
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
    inconsistency:
      '`body-lg` and `body-md` set line-height-relaxed; `body-sm` drops to normal. Under the rule that split `title` out of `heading` — a size variant may only change size — this is the same defect one step smaller: two properties move, not one. It is left flagged rather than quietly fixed because closing it is a rendering change (body-sm leading 1.6 -> 1.8), and the counter-argument is real: leading pairs with size, so it may belong to the size axis in a way that face and weight never do.',
  },
  label: {
    definition:
      'Form labels, button text, and other UI chrome that names a control rather than reading as prose.',
  },
  meta: {
    definition:
      'Secondary annotation beside the thing it describes — help text, captions, timestamps, counts.',
    note: '`meta` and `label` are the same size (--font-size-100) and differ only in weight — regular vs medium. An observation about the two intentions, not a defect inside this one: `meta` has a single composite, so there is nothing here to be inconsistent WITH.',
  },
  eyebrow: {
    definition:
      'The small caps marker above a heading or as a section marker. Its own intention rather than a variant of meta: it was `meta-caps`, which put a NON-size in the slot that carries lg/md/sm everywhere else.',
  },
  code: {
    definition:
      'Monospace — code, tokens, tabular figures. Three sizes matching body step for step, so inline code sits at the size of the prose around it: `code-md` inside `body-md`, `code-sm` inside `body-sm`.',
    note: 'Unlike body, the leading does NOT change at the small end — all three set line-height-normal, so this intention is a pure size axis.',
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
  /** Composites that opt into the display face — the surface a spoke re-points.
   *  Matched anywhere in the chain, not just at the hook: since the composite
   *  refactor a role reads `--typography-<role>-font-family`, so a test against
   *  `--font-display` directly matches nothing. */
  displayFace: allRoles
    .filter((r) => {
      const ff = r.props['font-family'];
      return ff?.ref === '--font-display' || !!ff?.chain.some((l) => l.ref === '--font-display');
    })
    .map((r) => r.className),
};

/** The de facto grammar, written as a rule, next to the rubric's. */
export const grammars = {
  current: [
    'color:      --color-<property>-<intention>[-<variant>][-<state>]',
    'typography: --typography-<intention>[-<size>]-<property>',
    'motion:     --<transition|animation>-<intention>',
    'radius:     --radius-<intention>',
    'layout:     --<region>-<dimension>[-<modifier>]',
    'effect:     --elevation-<step>',
  ],
  rubric: '--eco-<tier>-<category>-<property>-<variant>[-<state>]',
};
