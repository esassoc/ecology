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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allTokens, byTier } from './token-graph';
import { dynamicClassNames, stripComments } from './composite-classes';

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

/**
 * THE `--typography-` NAMESPACE HOLDS TWO SLOT ORDERS, and almost every predicate
 * in this file needs to know which one it is looking at:
 *
 *   INGREDIENT  property > variant             --typography-font-family-sans
 *   COMPOSITE   intention > variant > property --typography-label-md-strong-font-size
 *
 * Before 2026-08-15 the ingredients were `--font-*`, so `startsWith('--typography-')`
 * WAS "is a composite" and the two ideas never had to be separated. The
 * `font-ingredients-to-typography-namespace` rename folded them into one namespace,
 * and every one of those checks would now silently swallow the eight ingredients —
 * counting them as composites, decomposing them by an intention they do not have.
 * Hence one discriminator, used everywhere, rather than the prefix test inline.
 *
 * The test is mechanical and matches the rule the token file documents: if slot 2 is
 * a CSS property, it is an ingredient; otherwise it is an intention.
 */
const isTypeIngredient = (name: string) => /^--typography-font-(family|weight)-/.test(name);
const isTypeComposite = (name: string) =>
  name.startsWith('--typography-') && !isTypeIngredient(name);

/**
 * Everything in tier 2 that is not a colour, grouped into explicit families by
 * `nonColorGroups` below — never rendered as one undifferentiated list.
 *
 * The typography COMPOSITES are excluded. Those are the composites' individual
 * properties, and the typography section already renders every one of them
 * decomposed by intention. Listing them a second time as a flat group of 142 is
 * duplication, and it invites reading them as things to consume — a component names
 * the composite, not its parts. The INGREDIENTS stay in, because they genuinely are
 * a family a reader consumes directly; `nonColorGroups` matches them below.
 */
const allNonColor = semantic.filter(
  (t) => !t.name.startsWith('--color-') && !isTypeComposite(t.name),
);

/* ------------------------------------------------------ the name parser */

/** Rubric surface -> every word this system actually uses for it. */
// The vocabulary is now one word per property — that IS the fix this audit measured
// the need for. `surface`/`bg` and `text` are kept only so the deprecated aliases in
// dist/tokens.css still parse into a property rather than showing up as unclassified.
//
// `overlay` WAS here, as the system's one deliberate synonym for `background` —
// the washes sit OVER a background rather than being one, and `--color-background-hover`
// would have read as the hover state of the page canvas (the opaque gray-4 that
// already owns that meaning) instead of a wash painted on hover. That collision was
// real; a fourth property was not the way to resolve it. Since 2026-08-15 `overlay`
// is an INTENTION and the property slot is back to the rubric's three — see
// `overlay-property-to-intention` in migrations.json. `--color-background-overlay-hover`
// says the same thing in slots the grammar already had.
const SURFACE_VOCAB: Record<'background' | 'content' | 'border', string[]> = {
  background: ['background', 'surface', 'bg'],
  content: ['content', 'text'],
  border: ['border'],
};
const SURFACE_LOOKUP = new Map<string, 'background' | 'content' | 'border'>();
for (const [rubric, words] of Object.entries(SURFACE_VOCAB)) {
  for (const w of words) SURFACE_LOOKUP.set(w, rubric as 'background' | 'content' | 'border');
}

const STATE_WORDS = new Set(['hover', 'active', 'focus', 'pressed']);

/**
 * Washes and scrims. They ARE backgrounds, but they used to name themselves
 * after the effect rather than the surface, so the surface parser could not see
 * it — and any trailing `-strong` on one is an intensity, not a content colour.
 *
 * It fires on NOTHING live as of 2026-08-15: all six now lead with `background`
 * and state their property outright, so `parseColor` finds a surface word and
 * never reaches the paths this guards. Kept as a regression guard, like the
 * `-on-fill` check beside it — a new wash named after its effect would still be
 * caught rather than mis-parsed as a content colour.
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
  // guards keep it honest. surfaceIdx: in `--color-border-default-strong` the surface IS
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

  // The `overlay` carve-out that used to sit here is gone with the synonym itself
  // (see SURFACE_VOCAB). Every remaining divergence from the rubric word is a
  // spelling defect again, with no exceptions to remember.
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
    count: t2Count(/^--typography-/),
    how: `Two sets now, not three, and since 2026-08-15 ONE NAMESPACE with two slot orders. \`--typography-<intention>[-<size>]-<property>\` are the COMPOSITES (${semantic.filter((t) => isTypeComposite(t.name)).length} of them — derived, because this said 66 for long enough to outlive being true); \`--typography-font-family-{sans,mono,display}\` and \`--typography-font-weight-*\` are the faces and weights they are assembled from, and those lead with the PROPERTY because an ingredient has no intention slot to lead with. They were \`--font-*\` until \`font-ingredients-to-typography-namespace\`, a prefix that said neither the category nor the property, and whose weight half collided with the tier-1 \`--font-weight-*\` group it was merged into. The third set, \`--font-size-ui-{xs,sm,md,lg}\`, was deleted on 2026-08-14 (D1 of docs/typography-adoption-plan.md): a size-only ramp parallel to the composites is the shortcut that lets a component pick a size without adopting a composite. A tier-2 replacement was proposed and rejected the same day for being the same construct renamed — the size-step→composite mapping lives in the FORMS header of component-tokens.css instead, as documentation rather than as a token. Prose used to have no tokens at all — only the CSS classes in typography.css, which Figma cannot consume and a spoke cannot re-point. The classes still ship, but they now read the composites, so overriding a token moves the class.`,
  },
  {
    category: 'spacing',
    count: 0,
    how: 'No tier-2 layer, deliberately. Spacing is a MEASURE, not an intent — `--spacing-300` already says everything a `--space-inset-md` would, with a layer less indirection. Components read the primitives directly and that is correct.',
  },
  {
    category: 'border',
    count: colorRows.filter((r) => r.surface === 'border').length,
    how: 'Border COLOURS, plus two widths. `--border-width-default` is the hairline every edge reads; `--border-width-focus` is the focus ring\'s weight, added 2026-08-14 once it was clear the ring is read by more components than any other tier-3 token and had no tier-2 role behind it. No border-style at any tier.',
  },
  {
    category: 'width',
    count: t2Count(/width|height/),
    how: 'Resolved, and by subtraction — the category is now EMPTY. `--chip-height-*` was the last member and went on 2026-08-15 (migrations.json: chip-height-removed); nothing states a dimension as a tier-2 token any more. Before that it was the whole category — the layout.json set that led with a region rather than the category (`--sidebar-width`, `--header-height`) is gone: five deleted 2026-08-14 as zero-reader, the last two demoted to tier 3 as `--sidenav-width*` on 2026-08-15 once the "15 readers" on their $description turned out to be one component. Nothing here leads with a region any more. `height` still has no home in the rubric, which lists width but not height; with `width` now unrepresented at this tier that is a gap in the rubric rather than in the names.',
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
  { rubric: 'subtle', current: 'subtle', status: 'match', note: 'Exact match, and used consistently: background-brand-subtle, background-ai-subtle, background-utility-{info,success,warning,danger}-subtle.' },
  { rubric: 'utility-error', current: 'utility-danger', status: 'renamed', note: 'The `utility-` grouping prefix EXISTS as of 2026-08-15 — this row read "No `utility-` grouping prefix" until then, and the rubric was right. See `status-to-utility` in migrations.json. What is left of the rename is the last word: error is spelled danger, because the token also fills destructive buttons, which are an action rather than an error.' },
  { rubric: 'utility-success', current: 'utility-success', status: 'match', note: 'Now an exact match, prefix included. Tier 1 used to group these as `--color-status-*`, giving the family a third name one tier down; those aliases have been deleted and these roles now point straight at their ramp steps. Note the shape of that history — `status` at tier 1, nothing at tier 2, `utility` at tier 2 now: the grouping word kept being deleted from the tier that could not hold it before it landed on the one that could.' },
  { rubric: 'utility-warning', current: 'utility-warning', status: 'match', note: 'As above.' },
  { rubric: 'utility-information', current: 'utility-info', status: 'renamed', note: 'Prefix matches; the last word is abbreviated.' },
  { rubric: 'disabled (as a variant)', current: 'disabled', status: 'match', note: 'Concept exactly right — disabled is managed at the intention level, not as a state, which is the de-duplication the rubric recommends. The slot order used to be inverted (`--color-disabled-bg`); it now reads `--color-background-disabled` like everything else.' },
  { rubric: 'sizes lg / md / sm', current: '—', status: 'missing', note: 'NO ramp left at this tier, as of 2026-08-15. The size axis briefly had three: a text ramp (`--font-size-ui-*`, deleted 2026-08-14, then a proposed `--control-font-size-*` reverted the same day — both were size-only scales running parallel to the composites), and a height ramp for inputs and buttons (`--control-height-*`, deleted the same day). A px height cannot grow with rem text, so it clipped; those elements are now as tall as their padding plus their text. The padding hook that briefly inherited the density job (`--form-padding-{y,x}-*`) was deleted hours later for being a flat passthrough — sixteen names for four spacing rungs, identical on both axes — so there is no size lever left at any tier for inputs and buttons. `--chip-height-*` was the last survivor and it went too. It had FOUR readers, which is a real tier-2 intent by this system\'s own rule, and it was still wrong: the four wear three different type rungs at the same nominal size (label-sm-strong, label-sm, label-md-strong, and a fixed label-xs), so the shared height was compensating for a typography inconsistency one tier away from where it lives. Its four components are sized by padding + text now, and are NOT guaranteed to line up on a row until the type rungs are aligned — a separate pass. Padding is tier 1 by design: spacing is a measure, not an intent, and it is CORE, so components read it directly.' },
  { rubric: 'sm-mobile', current: '—', status: 'missing', note: 'No responsive variant at any tier.' },
  { rubric: '—', current: 'accent, ai', status: 'extra', note: 'Two extra intentions beyond the rubric list. Both are legitimate; the rubric explicitly expects teams to add their own. `ai` earns its place by never colliding with brand or status; `accent` has thin surface area and is worth watching.' },
  { rubric: '—', current: 'link, inverse, raised, floating, sunken, muted, subtle', status: 'extra', note: 'Variant words with no rubric equivalent, all describing prominence or elevation. `raised`, `floating` and `sunken` sat in the INTENTION slot until 2026-08-15, which is what kept three rungs of one axis reading as three unrelated roles; they are variants of `elevation` now. `strong` used to head this list and was the worst offender — it marked step-11 tokens that are TEXT on a surface, so it read like a bolder fill and got used as one. Those are now `--color-content-*` and the word is gone from colour entirely.' },
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
  { rubric: 'label', current: '.typography-label-2xs, -xs, -sm, -md, -lg (+ -strong at each)', status: 'match' as const },
  { rubric: 'body', current: '.typography-body-2xs, -xs, -sm, -md, -lg', status: 'match' as const },
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
 * The label for a name whose slot 2 is NOT an intention.
 *
 * It renders even when empty, and empty is the healthy state — it asserts that
 * every tier-2 colour name fills the intention slot. Three earlier versions of
 * this grouping had no such slot and so had to invent an umbrella word to absorb
 * the leftovers; a bucket defined by exclusion always looks full and correct,
 * which is exactly why it must be named for the question rather than for a
 * fabricated answer.
 */
const UNSLOTTED = 'no intention in slot 2';

/**
 * The INTENTION slot — slot 2 of four.
 *
 * A tier-2 colour name is `property > intention > variant > state`, and this
 * returns slot 2 alone. That distinction is the whole fix. Collapsing intention
 * and variant into one "family" is what forced every earlier version of this
 * grouping to invent an umbrella word — `neutral`, then `default`-as-a-bucket,
 * then `utility` — because a single axis cannot hold two slots and the extra word
 * was standing in for the one that had been deleted. Every label this returns is
 * now a word some token actually carries.
 *
 * `utility` came back on 2026-08-15, and it is worth being clear that the rule
 * did not bend. The objection was never to the grouping; it was that the word
 * appeared only on the heading, so a reader holding a token name could not find
 * its way up the tree. The tokens carry it now.
 *
 * `on-` comes off first: `--color-content-on-brand` is text placed ON a brand
 * fill, so its intention is `brand`. The prefix is relational and has no slot in
 * the grammar at all — see ON_PREFIX below.
 */
const INTENTIONS = new Set([
  // the surface roles — what the colour is FOR, not how prominent.
  //
  // `elevation` is ONE intention with three variants (`raised`, `floating`,
  // `sunken`), not three intentions. They are three points on one axis, and
  // spending the intention slot on the variant is what stopped anything from
  // saying they belonged together — renamed 2026-08-15, see the
  // `surface-to-elevation` row in migrations.json.
  //
  // `default` deliberately stays OUTSIDE that family: it is the reference plane
  // the other three are measured from (sunken is below IT, raised above IT), so
  // it sits at position 0 and takes no elevation word. `field` is transparent and
  // takes no step at all. Both are exactly the tokens an over-reaching regroup
  // would have swept in.
  //
  // `inverse` WAS here and is gone as of 2026-08-15. It never named an intention
  // — it named a RELATIONSHIP (this role against the reverse of the theme's
  // ground), which is why the dark scheme re-pointed it to a near-WHITE value.
  // A relationship that any role can stand in is a variant, not an intention, and
  // holding it here is what limited it to one background and one content role.
  // It is the `knockout` slot now; see `inverse-to-knockout` in migrations.json.
  'default', 'elevation', 'field',
  // brand and its neighbours
  'brand', 'accent', 'ai', 'link',
  //
  // `utility` is ONE intention with four variants (`info`, `success`,
  // `warning`, `danger`) — renamed 2026-08-15, see `status-to-utility` in
  // migrations.json. This line used to read the other way, and refused the
  // grouping in as many words: "NOT collapsed under an invented `utility`
  // heading: no token is named `utility`, and that is the same defect as
  // `neutral` was." That objection was right and it has been PAID rather than
  // overruled. The defect was never that the four do not belong together; it
  // was that a heading no token carries cannot be read back off a name. The
  // tokens carry the word now.
  //
  // What makes them one axis rather than four: all four take the SAME six
  // roles at the same Radix steps — fill (9), fill-hover (10), subtle surface
  // (2), border (6), coloured text (11), and an on-fill foreground chosen by
  // scale brightness. Nothing else in tier 2 is that regular. `brand` has no
  // subtle hover, `link` no border, `disabled` no fill-hover. Four names
  // moving in lockstep across six roles are variants of one thing.
  'utility',
  // a state raised to the intention level, deliberately — see SPEC.md
  'disabled',
  // `overlay` is ONE intention whose variants are the translucent washes —
  // `backdrop`, `scrim`, `strong`, `heavy` — renamed 2026-08-15, see
  // `overlay-property-to-intention` in migrations.json.
  //
  // It spent its whole life in the PROPERTY slot, as an invented fourth
  // alongside background/content/border. The justification was a real collision:
  // these are washes applied OVER a background, and `--color-background-hover`
  // would read as the hover state of the page canvas — the opaque gray-4 that
  // already owns that meaning — rather than a wash painted on hover. Putting
  // `overlay` in the intention slot resolves it inside the grammar: property
  // says it paints a fill, intention says it STACKS rather than replaces. The
  // fourth property retires instead of being entrenched.
  //
  // `backdrop` and `scrim` used to sit HERE, and this comment used to call them
  // the model — the two washes that named what they were for while their four
  // siblings named only a state and lived in UNSLOTTED. They still name what
  // they are for; they are one slot to the right, exactly as raised/floating/
  // sunken moved under `elevation` and the four status words under `utility`.
  // And the four siblings finally have the intention they were waiting for.
  'overlay',
]);

/**
 * The full four-slot split: property > intention > variant > state.
 *
 * `familyOf` returns slot 2 only, because that is what the grouping keys on.
 * This returns all four, because the TABLE needs to show them separately — and
 * showing them separately is the check on the whole scheme: a name whose slots
 * cannot be filled is a name that has to be recognised rather than read.
 *
 * `on-` has no slot. It is relational — `--color-content-on-brand` is text placed
 * ON a brand fill, not a variant of brand — so it is captured on its own and
 * rendered beside the intention rather than folded into it. Without that,
 * `--color-content-brand` and `--color-content-on-brand` parse identically.
 */
export interface Slots {
  property: string | null;
  on: boolean;
  intention: string | null;
  variant: string | null;
  /**
   * The knockout variant: this role rendered against the REVERSE of whatever
   * ground the theme sits on. Its own slot rather than part of `variant`,
   * because the variant slot is frequently already occupied —
   * `--color-background-elevation-raised-knockout` has `raised` there, and
   * joining them gives the fused `raised-knockout`, which is the same defect
   * that collapsing intention into variant produced before the four slots were
   * separated. It sits BETWEEN variant and state:
   *   property > intention > variant > knockout > state
   * so `--color-background-default-knockout-hover` parses cleanly.
   */
  knockout: boolean;
  state: string | null;
}

export const slotsOf = (name: string): Slots => {
  const parts = name.replace(/^--color-/, '').split('-');
  const property = SURFACE_LOOKUP.has(parts[0]) ? parts.shift()! : null;
  const on = parts[0] === 'on';
  if (on) parts.shift();
  // State comes off the end first, then knockout — that is the declared order.
  const state = STATE_WORDS.has(parts[parts.length - 1]) ? parts.pop()! : null;
  const knockout = parts[parts.length - 1] === 'knockout';
  if (knockout) parts.pop();
  const intention = INTENTIONS.has(parts[0]) ? parts.shift()! : null;
  return { property, on, intention, variant: parts.length ? parts.join('-') : null, knockout, state };
};

const familyOf = (name: string): string => {
  const words = name
    .replace(/^--color-/, '')
    .replace(/^(background|content|border)(-|$)/, '')
    .replace(/^on-/, '')
    .split('-')
    .filter(Boolean);
  if (!words.length) return UNSLOTTED;
  return INTENTIONS.has(words[0]) ? words[0] : UNSLOTTED;
};

/**
 * Does a token's VALUE agree with the family its NAME puts it in?
 *
 * `--color-border-default-focus` names no intention — it is the border, in the focus state —
 * and resolves to `--color-background-brand`, deliberately, so a spoke re-pointing
 * its brand moves the focus ring with it. That is correct and it is also worth
 * seeing: a brand swatch sitting in the `default` group otherwise reads as a bug in
 * the grouping. So the disagreement is flagged rather than resolved by moving the
 * token, because the name is not wrong — it is derived.
 */
const INTENTION_IN_VALUE = /--color-(?:background|content|border)-(?:on-)?(brand|accent|ai|utility)/;

const derivedFrom = (name: string): string | null => {
  const node = semantic.find((t) => t.name === name);
  if (!node) return null;
  for (const link of node.lineage) {
    const hit = INTENTION_IN_VALUE.exec(link.ref);
    if (hit) return hit[1];
  }
  return null;
};

/**
 * `unclassified` is last and renders EVEN WHEN EMPTY — the whole point of making
 * the `default` group an explicit match. An empty group here is the assertion that every
 * tier-2 colour name is accounted for; a populated one is a name nobody has
 * decided about yet.
 */
/**
 * Reading order: the default and its surface roles first (what a page is made
 * of), then brand, then feedback, then disabled. `UNSLOTTED` is last and renders
 * EVEN WHEN EMPTY — it holds any name whose slot 2 is not an intention, which is
 * the hole a fabricated umbrella used to fill silently.
 */
const FAMILY_ORDER = [
  'default', 'elevation', 'field',
  'brand', 'accent', 'ai', 'link',
  'utility',
  'disabled',
  'overlay',
  UNSLOTTED,
];

/**
 * FAMILY_ORDER is a hand-written list and `families` is built by mapping over it,
 * so an intention present in INTENTIONS but absent here produces NO GROUP and its
 * tokens disappear from the tree with every count on the page still adding up.
 * That happened the moment `backdrop` and `scrim` were added to INTENTIONS — two
 * tokens silently stopped rendering. The two lists have to agree, so say so.
 */
const ORDER_GAPS = [...INTENTIONS].filter((i) => !FAMILY_ORDER.includes(i));
if (ORDER_GAPS.length) {
  throw new Error(
    `tier2-naming: ${ORDER_GAPS.join(', ')} in INTENTIONS but missing from FAMILY_ORDER — ` +
      `those tokens would render nowhere. Add them to FAMILY_ORDER.`,
  );
}

/**
 * And the other direction, which the first guard cannot see. A word left in
 * FAMILY_ORDER after it stops being an intention renders an EMPTY group — less
 * destructive than a vanished token, but it puts a heading on the page that the
 * token set no longer supports, which is the exact defect (`neutral`, `utility`)
 * this whole grouping was rebuilt to remove. Live risk: `raised`/`floating`/
 * `sunken` moved from the intention slot to the variant slot on 2026-08-15 and
 * had to come out of BOTH lists.
 */
const ORDER_STALE = FAMILY_ORDER.filter((f) => f !== UNSLOTTED && !INTENTIONS.has(f));
if (ORDER_STALE.length) {
  throw new Error(
    `tier2-naming: ${ORDER_STALE.join(', ')} in FAMILY_ORDER but not an intention — ` +
      `that renders an empty group labelled with a word no token carries. Remove it.`,
  );
}

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
  /** Slot 2, split out for the table. Null means the name never fills it. */
  intention: string | null;
  /** The relational `on-` prefix, which the grammar has no slot for. */
  on: boolean;
  /** The knockout variant — this role against the reverse of the theme's ground. */
  knockout: boolean;
  /**
   * Set when the name carries NO intention but the value chains through one —
   * intention — `--color-border-default-focus` resolving to `--color-background-brand`.
   * Holds the intention it derives from.
   */
  derivedFrom: string | null;
}

export interface PropertyFamily {
  label: string;
  rows: PropertyRow[];
  /** Renders even when empty — the catch-all, so a new name cannot hide. */
  isUnclassified?: boolean;
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
        state: slotsOf(r.name).state,
        variant: slotsOf(r.name).variant,
        intention: slotsOf(r.name).intention,
        on: slotsOf(r.name).on,
        knockout: slotsOf(r.name).knockout,
        // Flag whenever the value chains through a DIFFERENT intention than the
        // name declares — not just for the unslotted. `--color-border-default-focus`
        // says `default` and resolves to brand; that is deliberate and worth seeing,
        // and it stopped being visible the moment the token got a real slot-2 word.
        derivedFrom: (() => {
          const via = derivedFrom(r.name);
          return via && via !== familyOf(r.name) ? via : null;
        })(),
      }));

    const families: PropertyFamily[] = FAMILY_ORDER.map((label) => ({
      label,
      rows: rows.filter((r) => r.family === label),
      isUnclassified: label === UNSLOTTED,
    })).filter((f) => f.rows.length > 0 || f.isUnclassified);

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
  'typography — faces & weights': 'the CSS property (font-family, font-weight)',
  'border-radius': 'the property, abbreviated (radius)',
  'border-width': 'the property',
  'box-shadow': 'a scale name (elevation), not the property',
  'transition / animation': 'the property',
  'z-index': 'the property, abbreviated (z)',
  /* 'width / height' was here until 2026-08-15. Its last member (--chip-height-*) was
     deleted, the family with it, and this lookup is `?? '—'` so a stale key would have
     sat here rendering nothing forever. */
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
    label: 'typography — faces & weights',
    match: /^--typography-font-(family|weight)-/,
    property: 'first',
    note: 'semantic/typography.json — the INGREDIENT layer the composites are assembled from, within the same tier and now within the same NAMESPACE. `--typography-display-font-family` resolves to `--typography-font-family-display`; `--typography-display-font-weight` to `--typography-font-weight-bold`. Listed separately rather than folded into the composites because they are not only ingredients: they are among the most directly-read tokens in the system (~70 reads each for the sans and mono faces, ~45 for `medium`, ~38 for `semibold`). Those direct reads are the very thing the component migration is closing — a component reaching for a weight without a composite is how the vocabulary stops meaning anything (D2), and the count above is the size of that job, not a justification for it. The display face is the exception that IS mostly an ingredient: 3 composites use it against 5 direct reads, and it defaults to the sans face so the slot exists for a spoke to swap in a distinct headline face.\n\nTHIS FAMILY IS WHY THE `property: first` COLUMN IS NOT A CONTRADICTION. These eight lead with the property (`font-family`, `font-weight`) exactly like `--color-background-*` does; the COMPOSITES next door lead with the intention and put the property last. One namespace, two orders, both deliberate — an ingredient has no intention slot to lead with. Renamed from `--font-*` on 2026-08-15 (`font-ingredients-to-typography-namespace`), which also broke a genuine tier collision: the old tier-2 `--font-weight-medium` and the tier-1 `--font-weight-500` came out of one merged Style Dictionary group with nothing in either name marking the tier a spoke is allowed to touch.',
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
  // THE `width / height` FAMILY IS GONE, not empty — removed 2026-08-15 when its last
  // member did. It ran /^--(sidebar|header|footer|content|chip-height)/, then narrowed
  // to /^--chip-height/ when the first four went, then had nothing left at all once
  // --chip-height-* was deleted (migrations.json: chip-height-removed). A NAMED family
  // matching zero tokens is worse than no entry: it renders a group asserting that a
  // tier-2 dimension category exists. `unclassified` is the one bucket that renders
  // empty on purpose, and a genuinely new dimension token would land there — visibly —
  // which is the behaviour this file wants. The reasoning it carried is preserved in
  // semantic/size.json's $description and in the chip-height-removed row.
  // Note the shape of the two deletions, because it is the same shape twice: both
  // families died of a reader count that was assumed rather than counted. --sidebar-*
  // claimed 15 readers and had one component. --chip-height-* genuinely had four, and
  // was still wrong, because what the four agreed on was a number papering over three
  // different type rungs.
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
 * Tier 2, grouped by CATEGORY first.
 *
 * The tree used to open on `background` / `content` / `border` — the PROPERTY —
 * with every non-colour family listed after them as a flat sibling list. That
 * made a property of one category a peer of whole categories: `background` sat
 * beside `z-index`, and `color` never appeared as a heading at all even though
 * it is the thing 100% of those three groups have in common.
 *
 * The rubric already had the right first cut and the page ignored it. Slot 3 of
 * the naming audit (`categoryRows`) asks WHICH CATEGORIES EXIST at tier 2 —
 * colour, typography, spacing, radius, box-shadow, animation — and a token's
 * name states its category first (`--color-…`, `--typography-…`, `--radius-…`).
 * So the tree now reads the way the names do: category, then property, then
 * variant family.
 *
 * The category IS the namespace, deliberately, rather than the rubric's
 * conceptual grouping. `categoryRows` files border colours and border widths
 * together under `border`, which is true as taxonomy and useless as a tree —
 * `--color-border-utility-danger` would have to live in two places at once. One token,
 * one node, keyed on what the name leads with.
 * ====================================================================== */

export type SemanticCategoryKind = 'color' | 'typography' | 'family';

export interface CategoryProperty {
  /** The CSS property these tokens land in, spelled as CSS spells it. */
  label: string;
  /** Does the NAME carry the property, or is it read off the family? */
  declared: boolean;
  /** Why it counts as declared, or what supplies it when it does not. */
  reason: string;
  tokens: typeof otherTokens;
}

export interface SemanticCategory {
  label: string;
  note: string;
  /** Every tier-2 token filed under this category, composites included. */
  count: number;
  /** Which body renderer the page uses — the three have different shapes. */
  kind: SemanticCategoryKind;
  /** Where the CSS property sits in the name. Not asked of `color`. */
  property?: PropertyPosition;
  /** Flat token list. On `typography` this is the faces/weights half only. */
  tokens?: typeof otherTokens;
  /**
   * The category split by CSS property — the same second level `color` gets from
   * `propertyGroups`. Most categories resolve to ONE property, and that is worth
   * rendering rather than hiding: a category with one property is a finished
   * category, and the page can say so instead of leaving the reader to count.
   */
  properties?: CategoryProperty[];
  isUnclassified?: boolean;
}

/**
 * Name pattern -> the CSS property it lands in.
 *
 * Ordered, first match wins, and every entry states whether the NAME carries the
 * property. That second field is the whole point: `--radius-card` says its
 * property (abbreviated), `--elevation-2` does not, and both facts are already
 * asserted elsewhere on this page as a per-FAMILY chip. Deriving them per token
 * means the chip and the tree cannot disagree.
 */
const PROPERTY_OF: { match: RegExp; label: string; declared: boolean; reason: string }[] = [
  { match: /^--radius-/, label: 'border-radius', declared: true, reason: 'the property, abbreviated to `radius` — the one abbreviation in the system, and unambiguous because no other CSS property shortens to it' },
  { match: /^--border-width-/, label: 'border-width', declared: true, reason: 'spelled in full' },
  { match: /^--elevation-/, label: 'box-shadow', declared: false, reason: 'named for the SCALE (elevation) rather than the property; the variant is a step number rather than an intention. Every component reads it, so the name is the debt, not the layer' },
  { match: /^--transition-/, label: 'transition', declared: true, reason: 'spelled in full — and separate from `animation` because they are not interchangeable: `infinite` cannot appear in a transition' },
  { match: /^--animation-/, label: 'animation', declared: true, reason: 'spelled in full' },
  { match: /^--z-/, label: 'z-index', declared: true, reason: 'the property, abbreviated to `z`' },
  { match: /^--typography-font-weight-/, label: 'font-weight', declared: true, reason: 'spelled in full' },
  { match: /^--typography-font-family-/, label: 'font-family', declared: true, reason: 'spelled in full — as of 2026-08-15. This row read `declared: false` for as long as the token was `--font-sans`, whose second slot is a CLASSIFICATION (sans) standing where the property belongs: it read as a family only because nothing else could plausibly consume it. `font-ingredients-to-typography-namespace` put the property in the name, so the audit no longer has to infer it' },
  { match: /height$|height-/, label: 'height', declared: true, reason: 'property last rather than first — the shape colour had before it was flipped' },
  { match: /width$|width-/, label: 'width', declared: true, reason: 'property last rather than first' },
  { match: /^--touch-target-/, label: 'min-width / min-height', declared: false, reason: 'a CONCEPT with no single property behind it — the WCAG 2.5.5 floor, which a component applies to whichever dimension it controls' },
];

/** Split a token list by the CSS property each lands in. */
const byProperty = (tokens: typeof otherTokens): CategoryProperty[] => {
  const out: CategoryProperty[] = [];
  for (const t of tokens) {
    const hit = PROPERTY_OF.find((p) => p.match.test(t.name));
    const label = hit?.label ?? 'unknown';
    let bucket = out.find((b) => b.label === label);
    if (!bucket) {
      bucket = {
        label,
        declared: hit?.declared ?? false,
        reason: hit?.reason ?? 'no rule matches this name — add one to PROPERTY_OF',
        tokens: [],
      };
      out.push(bucket);
    }
    bucket.tokens.push(t);
  }
  return out;
};

const CATEGORY_NOTES = {
  color:
    'Every `--color-*` role. Nested by the PROPERTY the colour lands on — background, content, border — then by variant family, because a colour role is only meaningful as a pair of the two: `danger` alone does not say whether it fills a box or writes a word. This is the one category where the property level earns its own tier of nesting; the rest name their property and stop.',
  typography:
    'Both halves of the type layer, which are one category and were rendered as two unrelated blocks. The COMPOSITES (`--typography-<intention>[-<size>]-<property>`) are what a component reads; the FACES AND WEIGHTS (`--typography-font-{family,weight}-*`) are the ingredients they are assembled from, and are also the most directly-read tokens in the system — which is the adoption debt the composites exist to retire, not a second way of doing the same thing. As of 2026-08-15 they are also one NAMESPACE: the ingredients were `--font-*`, which made "two unrelated blocks" true of the names as well as the rendering.',
} as const;

/**
 * The top level of the tier-2 tree. Order is deliberate: the two categories with
 * internal structure first, the flat families after, `unclassified` last so a
 * new family lands at the bottom where it reads as an unanswered question.
 */
export const semanticCategories: SemanticCategory[] = (() => {
  const FACES = 'typography — faces & weights';
  const faces = nonColorGroups.find((g) => g.label === FACES);
  const composites = semantic.filter((t) => isTypeComposite(t.name));

  const flat = nonColorGroups.filter((g) => g.label !== FACES && !g.isUnclassified);
  const unclassified = nonColorGroups.find((g) => g.isUnclassified);

  return [
    {
      kind: 'color',
      label: 'color',
      note: CATEGORY_NOTES.color,
      count: colorTokens.length,
    },
    {
      kind: 'typography',
      label: 'typography',
      note: CATEGORY_NOTES.typography,
      count: composites.length + (faces?.tokens.length ?? 0),
      property: faces?.property ?? 'first',
      tokens: faces?.tokens ?? [],
      properties: byProperty(faces?.tokens ?? []),
    },
    ...flat.map((g) => ({
      kind: 'family' as const,
      label: g.label,
      note: g.note,
      count: g.tokens.length,
      property: g.property,
      tokens: g.tokens,
      properties: byProperty(g.tokens),
    })),
    ...(unclassified
      ? [
          {
            kind: 'family' as const,
            label: unclassified.label,
            note: unclassified.note,
            count: unclassified.tokens.length,
            property: unclassified.property,
            tokens: unclassified.tokens,
            isUnclassified: true,
          },
        ]
      : []),
  ];
})();

/**
 * Does the tree account for every tier-2 token?
 *
 * A grouped view can only be trusted if it is a PARTITION, and this one is
 * assembled from two independently-built halves (`colorTokens` and
 * `nonColorGroups`). If they ever stop covering `semantic` between them the tree
 * would quietly render fewer tokens than the system ships, and every count on the
 * page would still add up — to the wrong total. So the page prints this.
 */
export const categoryCoverage = (() => {
  const seen = new Set<string>();
  for (const t of colorTokens) seen.add(t.name);
  for (const g of nonColorGroups) for (const t of g.tokens) seen.add(t.name);
  // The composites are deliberately absent from `allNonColor` (see its note) but
  // the typography category DOES render every one, decomposed by intention. They
  // are filed; they just arrive by a different renderer. The INGREDIENTS are not
  // added here — they arrive through `nonColorGroups` above like any other family,
  // and adding them twice would be harmless only because this is a Set.
  for (const t of semantic) if (isTypeComposite(t.name)) seen.add(t.name);
  const missing = semantic.filter((t) => !seen.has(t.name)).map((t) => t.name);
  return { grouped: seen.size, total: semantic.length, missing };
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

/* ======================================================================
 * Typography, decomposed into SLOTS — the exact analogue of `propertyGroups`
 * ==================================================================== */

/**
 * WHY THIS EXISTS BESIDE THE MATRIX BELOW.
 *
 * The matrix renders a composite as a ROW OF CSS CLASSES with the six properties
 * as fixed columns. That answers "is this composite complete?" — and it is the
 * only question it can answer, because its unit is the class, not the token. It
 * cannot show that `label-md-strong` and `label-2xs-strong` are one intention at
 * two variants, and it cannot show a name whose slots do not parse, because it
 * never parses them.
 *
 * Colour has been decomposed into slots for a while (`slotsOf` → `propertyGroups`)
 * and that decomposition is what makes its whole scheme checkable: a name whose
 * slots cannot be filled is a name that has to be RECOGNISED rather than read, and
 * the tree puts those in front of you instead of absorbing them. Typography had no
 * equivalent, so the same class of defect was invisible here.
 *
 * THE TREE ROOTS ON THE FIRST SLOT, in both categories. Colour is
 * `property > intention > variant > state`, so it roots on the property and its
 * three groups are background/content/border. Typography is
 * `intention > variant > property`, so it roots on the INTENTION and its groups
 * are display/heading/title/body/label/meta/eyebrow/code. Same rule, different
 * first slot — not two conventions.
 *
 * The INGREDIENTS are excluded and get their own group: their shape is
 * `property > variant`, which is colour's shape, not this one. Folding them in
 * would put `font-family` in a slot the composites use for an intention.
 */
const TYPE_INTENTIONS = new Set([
  'display', 'heading', 'title', 'body', 'label', 'meta', 'eyebrow', 'code',
]);

/** Longest-match first, so `font-family` never parses as `font` + `family`. */
const TYPE_PROP_SUFFIXES = [
  'letter-spacing', 'text-transform', 'font-family', 'font-weight', 'line-height', 'font-size',
];

export interface TypeSlots {
  intention: string | null;
  variant: string | null;
  property: string | null;
}

/**
 * `--typography-label-md-strong-font-size` → intention `label`, variant
 * `md-strong`, property `font-size`.
 *
 * Same three moves as `slotsOf`: take the property off the END (it is the last
 * slot here, not the first), take the intention off the FRONT, and whatever is
 * left in the middle is the variant. A null intention means slot 1 is not a word
 * this system uses as an intention — which is exactly what the unclassified group
 * is there to surface.
 */
export const typeSlotsOf = (name: string): TypeSlots => {
  const bare = name.replace(/^--typography-/, '');
  const property = TYPE_PROP_SUFFIXES.find((p) => bare.endsWith(`-${p}`)) ?? null;
  const rest = property ? bare.slice(0, -(property.length + 1)) : bare;
  const parts = rest.split('-').filter(Boolean);
  const intention = TYPE_INTENTIONS.has(parts[0]) ? parts.shift()! : null;
  return { intention, variant: parts.length ? parts.join('-') : null, property };
};

/** The size ramp, smallest first — the order variants render in. */
const SIZE_RUNGS = ['2xs', 'xs', 'sm', 'md', 'lg'];

const TYPE_UNSLOTTED = 'no intention in slot 1';

/**
 * Reading order: the prose ramp top-down, then the UI ramp, then the specialist
 * treatments. `TYPE_UNSLOTTED` is last and renders EVEN WHEN EMPTY, for the same
 * reason colour's does — an empty group is the assertion that every composite
 * name fills slot 1; a populated one is a name nobody has decided about yet.
 */
const TYPE_INTENTION_ORDER = [
  'display', 'heading', 'title', 'body', 'label', 'meta', 'eyebrow', 'code', TYPE_UNSLOTTED,
];

/* The same pair of guards colour carries, and for the same reason: the order list
 * is hand-written and the intention set is not, so a word in one and not the other
 * either deletes tokens from the tree silently or puts an empty heading on the
 * page. Colour learned this when `backdrop`/`scrim` were added to INTENTIONS and
 * two tokens stopped rendering with every count still adding up. */
const TYPE_ORDER_GAPS = [...TYPE_INTENTIONS].filter((i) => !TYPE_INTENTION_ORDER.includes(i));
if (TYPE_ORDER_GAPS.length) {
  throw new Error(
    `tier2-naming: ${TYPE_ORDER_GAPS.join(', ')} in TYPE_INTENTIONS but missing from ` +
      `TYPE_INTENTION_ORDER — those composites would render nowhere.`,
  );
}
const TYPE_ORDER_STALE = TYPE_INTENTION_ORDER.filter(
  (f) => f !== TYPE_UNSLOTTED && !TYPE_INTENTIONS.has(f),
);
if (TYPE_ORDER_STALE.length) {
  throw new Error(
    `tier2-naming: ${TYPE_ORDER_STALE.join(', ')} in TYPE_INTENTION_ORDER but not an intention — ` +
      `that renders an empty group labelled with a word no token carries.`,
  );
}

/**
 * The tier-1 token a chain lands on — the LAST link whose kind is `primitive`.
 *
 * Not `lineage.at(-1)`: the terminal link of any resolved chain has kind `raw` and
 * its `ref` is the literal value, so taking the last link renders the value in the
 * token column and prints it twice beside itself. The first version of this tree
 * did exactly that.
 */
const tier1Of = (t: { lineage?: { ref: string; kind: string }[] }): string | null => {
  const prims = (t.lineage ?? []).filter((l) => l.kind === 'primitive');
  return prims.length ? prims[prims.length - 1].ref : null;
};

/* ---------------------------------------- who APPLIES a composite class */

/**
 * WHY THIS SCAN EXISTS, when `usedByComponents` already ships on every token.
 *
 * Because at the composite layer that field is noise. Every one of the 142
 * composite property tokens has exactly ONE reader — `typography.css` — since
 * assembling them into a class is the entire job of that file. A "Used by" column
 * fed from the token graph therefore prints `1 file` on all 142 rows and answers
 * nothing.
 *
 * A COMPONENT DOES NOT READ THE TOKENS. It applies the CLASS. So the real
 * consumer edge for a composite is a markup one, and nothing was measuring it —
 * `token-graph.ts` scans for `var(--x)` and a class name is not a var().
 *
 * MATCHING IS WHOLE-CLASS AND LONGEST-FIRST, which is the whole difficulty. The
 * shipped names nest (`typography-label-md` is a prefix of
 * `typography-label-md-strong`) and they also appear inside TOKEN names
 * (`--typography-label-md-strong-font-size`). A naive `includes()` counts a
 * token declaration as a usage and credits `label-md` for every `label-md-strong`
 * on the page. Sorting the alternation longest-first and refusing a `-` or word
 * character on either side gets all three cases right: the long class wins, the
 * short one does not match inside it, and neither matches inside a token name
 * because a `-font-size` follows.
 */
const COMPOSITE_USE_ROOTS: { rel: string; kind: 'component' | 'file'; why: string }[] = [
  {
    rel: 'packages/ecology/src',
    kind: 'component',
    why: 'The component kit — the only usage that proves a composite is load-bearing for a spoke.',
  },
  {
    rel: 'packages/docs/src',
    kind: 'file',
    why: '@esa/docs, the shared doc chrome every spoke renders.',
  },
  {
    rel: 'packages/spoke-template/src',
    kind: 'file',
    why: 'Copied wholesale into every new spoke, so a class it applies ships everywhere.',
  },
  {
    rel: 'apps/site/src',
    kind: 'file',
    why: 'INCLUDED HERE, unlike in token-graph.ts, and the divergence is deliberate. That file exempts this tree because the manual is not a CONSUMER of tokens — it would de-orphan tokens by styling itself. A class is different: the site is where most real markup in this repo lives, and it is the only place several composites are exercised at all. Counted, but rendered as `file` rather than `component`, so a doc page is never mistaken for proof that the kit depends on a composite.',
  },
];

/**
 * The audit machinery itself, which must never count as a consumer.
 *
 * These files NAME the composite classes as data — this module builds the regex
 * out of them, and the debug page prints them as prose — so a scan that includes
 * them credits every composite with a usage it invented, and `.typography-display`
 * reads as adopted because the page describing it mentions it. token-graph.ts
 * exempts `apps/site/src` wholesale for exactly this failure ("this debug page
 * would de-orphan --color-background-ai-subtle by styling ITSELF"); the class scan
 * needs the site for its real markup, so it exempts the machinery instead of the
 * whole tree.
 */
const COMPOSITE_USE_EXEMPT = [
  'apps/site/src/data/tier2-naming.ts',
  'apps/site/src/data/token-graph.ts',
  'apps/site/src/pages/debug',
];

const COMPONENTS_DIR = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

const walkFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(abs));
    else if (/\.(astro|ts|tsx|css|html)$/.test(entry.name)) out.push(abs);
  }
  return out;
};

export interface CompositeUse {
  components: string[];
  files: string[];
  /**
   * Components that APPLY this class but never pull in the definitions, so the
   * class is an inert string wherever they render it.
   *
   * A composite is a CLASS, and a class needs its rule in scope. Lit components
   * render into a shadow root, which document stylesheets do not cross — they get
   * the rule from `static styles = [typography, …]`. Astro components render into
   * the page, but the hub's own BaseLayout does not import `typography.css`
   * globally, so they self-import it. Either way the import IS the delivery, and a
   * component that applies a class without one renders unstyled with no error
   * anywhere: CSS has no diagnostic for a class that matches nothing.
   */
  undelivered: string[];
}

/*
 * The dynamic-class resolver and the comment strip live in
 * ./composite-classes, because the doc-page theming table needs exactly the
 * same scan and a second copy is how the two counts drift apart. See that
 * file for why a literal-only scan under-reported adoption by an order of
 * magnitude.
 */

/** The import that puts the class definitions in scope, per component bucket. */
const DELIVERY = {
  ts: "from '../typography.js'",
  astro: '@esa/tokens/typography.css',
} as const;

/** className (without the dot) -> who applies it. */
export const compositeUsage: Map<string, CompositeUse> = (() => {
  const known = [...new Set(compositeClasses)].sort((a, b) => b.length - a.length);
  const map = new Map<string, CompositeUse>();
  for (const c of known) map.set(c, { components: [], files: [], undelivered: [] });
  if (!known.length) return map;

  const RE = new RegExp(`(?<![\\w-])(${known.join('|')})(?![\\w-])`, 'g');

  for (const root of COMPOSITE_USE_ROOTS) {
    for (const abs of walkFiles(path.join(ROOT, root.rel))) {
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      // typography.css DEFINES these classes; a definition is not a usage.
      if (rel === 'packages/tokens/src/typography.css') continue;
      if (COMPOSITE_USE_EXEMPT.some((e) => rel === e || rel.startsWith(`${e}/`))) continue;
      const raw = readFileSync(abs, 'utf8');
      const src = stripComments(raw);

      const inComponentDir = path.dirname(abs) === COMPONENTS_DIR;
      const isComponent = root.kind === 'component' && inComponentDir && /\.(astro|ts)$/.test(abs);
      const slug = isComponent ? path.basename(abs).replace(/\.(astro|ts)$/, '') : null;

      const applied = new Set<string>();
      for (const m of src.matchAll(RE)) applied.add(m[1]);
      for (const c of dynamicClassNames(src)) if (map.has(c)) applied.add(c);
      if (!applied.size) continue;

      // Delivery is only decidable for a component, which owns its own styles. A
      // page can legitimately inherit the import from the layout that wraps it.
      const delivered =
        !isComponent || raw.includes(abs.endsWith('.ts') ? DELIVERY.ts : DELIVERY.astro);

      for (const c of applied) {
        const hit = map.get(c)!;
        if (slug) {
          if (!hit.components.includes(slug)) hit.components.push(slug);
          if (!delivered && !hit.undelivered.includes(slug)) hit.undelivered.push(slug);
        } else if (!hit.files.includes(rel)) hit.files.push(rel);
      }
    }
  }
  for (const v of map.values()) { v.components.sort(); v.files.sort(); v.undelivered.sort(); }
  return map;
})();

export interface HandAssembled {
  component: string;
  line: number;
  decl: string;
}

/**
 * Typographic declarations in a component that still assemble type instead of
 * naming a role — the acceptance test for the composite layer.
 *
 * The goal this measures is "every rendered text names a type role", so the count
 * belongs on the page rather than in a migration note: a number nobody renders is a
 * number that goes stale the first time someone adds a component. Zero is the
 * target, and the list names its own exceptions rather than hiding them.
 *
 * ALLOWED, and therefore not counted:
 *  - `line-height` reading a `--line-height-*` rung. A composite sets one leading,
 *    but the same role appears both flowing and flush (an input value and a
 *    paragraph are both `body`), so the box states its own leading. Both halves are
 *    tokens; nothing is invented.
 *  - `font-family: inherit` on a native button/input — a UA reset, not a type role.
 *  - a read of a component's own tier-3 hook (public, or the `--_` private that
 *    wraps one). That hook is the spoke's override surface and deleting it would
 *    break a spoke theme silently — an alias rescues `var(--old)`, never
 *    `--old: value`.
 *  - `font-family` reading a `--typography-font-family-*` ingredient on an overlay
 *    root. This is the ONE ingredient read that is not assembly: a popover or
 *    dialog hosts SLOTTED content it does not own, so it cannot name a role for
 *    text it never sees. Establishing the face is all it can honestly do.
 */
export const handAssembledType: HandAssembled[] = (() => {
  const out: HandAssembled[] = [];
  const PROPS = /^\s*(font-size|font-weight|font-family|letter-spacing|text-transform)\s*:\s*([^;]+);/;
  // Reading one of these IS assembling: they are the raw scale and the ingredients,
  // one rung below the role a component should be naming.
  const RAW = /^--(font-size-|font-weight-|letter-spacing-|text-transform-|typography-font-)/;

  for (const abs of walkFiles(COMPONENTS_DIR)) {
    if (!/\.(astro|ts)$/.test(abs)) continue;
    const component = path.basename(abs).replace(/\.(astro|ts)$/, '');
    const lines = stripComments(readFileSync(abs, 'utf8')).split('\n');

    lines.forEach((line, i) => {
      const m = PROPS.exec(line);
      if (!m) return;
      const [, prop, value] = m;
      if (prop === 'font-family' && /^inherit\b/.test(value.trim())) return;
      // A declaration that DEFINES a hook is the hook's home, not a call site.
      if (/^\s*--/.test(line)) return;
      // The slot-root exemption. Only font-family, and only the face ingredient.
      if (prop === 'font-family' && /var\(\s*--typography-font-family-/.test(value)) return;

      // `_` matters: a component's private hook is `--_stat-value-size`, and it is
      // the wrapper the PUBLIC `--stat-value-size` is read through. Omitting it from
      // the class made every rule-6 hook look like raw assembly.
      const firstVar = /var\(\s*(--[a-z0-9_-]+)/.exec(value);
      if (firstVar && !RAW.test(firstVar[1])) return; // reads a component hook
      // Exact match, not a prefix: `/^0\b/` also accepts `0.02em`, because there is
      // a word boundary between the 0 and the dot. That one character silently
      // exempted every bare letter-spacing literal in the kit.
      if (!firstVar && /^(inherit|normal|0)$/.test(value.trim())) return;

      out.push({ component, line: i + 1, decl: `${prop}: ${value.trim()}` });
    });
  }
  return out.sort((a, b) => a.component.localeCompare(b.component) || a.line - b.line);
})();

export interface TypePropRow {
  name: string;
  property: string | null;
  /**
   * The token this one directly references — the FIRST hop, not the last.
   *
   * This is the column that makes the ingredient layer visible, and it is the one
   * worth reading first: `--typography-label-md-font-weight` references
   * `--typography-font-weight-medium`, NOT `--font-weight-500`. Showing only the
   * tier-1 terminal (as the first version of this tree did) collapses that hop and
   * makes every composite look like it reaches past the ingredients straight into
   * the primitives — which is the opposite of how the layer works, and would hide
   * the exact edge a spoke re-points when it swaps a typeface.
   *
   * NOT named for the "wired to" relation, which is what it was first called. In
   * this system that phrase means the REVERSE edge — who CONSUMES a token — so
   * using it for a forward reference pointed the arrow the wrong way. The consumer
   * edge keeps the name the rest of the repo gives it (`usedBy`); this direction
   * is `references`.
   */
  references: string | null;
  /** The tier-1 token it lands on, and the value there. */
  resolved: string | null;
  tier1: string | null;
}

/** One VARIANT of an intention — `label` + `md-strong`. The composite lives here. */
export interface TypeVariant {
  /** The variant word, or null for an intention with a single unmodified form. */
  label: string | null;
  /** The composite these properties assemble into, e.g. `.typography-label-md-strong`. */
  className: string;
  /** True when typography.css actually ships that class. */
  classShipped: boolean;
  /**
   * Who APPLIES the class — the composite's real consumer edge. Not derivable
   * from the token graph: a component applies the class, it does not read the
   * five tokens, so every one of those tokens reports `typography.css` and
   * nothing else. See `compositeUsage`.
   */
  usedBy: CompositeUse;
  /**
   * The INGREDIENTS this composite is built out of, deduped across its properties.
   * Excludes the primitives it goes to directly for size, leading and tracking,
   * because those are not a spoke's override surface.
   *
   * `assemblesFrom` corrects two things at once. It was called `wiredTo`, which in
   * this system means the CONSUMER edge — the opposite direction from this. And
   * the set is FILTERED (56 of 142 real edges), so it needed a name that reads as
   * a summary rather than the whole truth. `typography.css` already calls a class
   * "nothing but the assembly of" its tokens; this borrows that word.
   *
   * Split into property + variant rather than shipped as a bare token name. The
   * first version rendered these by stripping `--typography-font-` off the front,
   * which produced `family-sans` — a label that exists nowhere in the system, is
   * not greppable, and reads as one word when two chips sit side by side. The
   * ingredient names ARE `property > variant`, so the two slots are what a reader
   * needs; giving the template the parts means it never has to invent a name.
   */
  assemblesFrom: { name: string; property: string; variant: string }[];
  rows: TypePropRow[];
}

export interface TypeIntentionGroup {
  label: string;
  variants: TypeVariant[];
  total: number;
  /** Distinct properties covered across every variant. */
  properties: string[];
  isUnclassified?: boolean;
}

export const typographyGroups: TypeIntentionGroup[] = (() => {
  const composites = semantic.filter((t) => isTypeComposite(t.name));
  // `compositeClasses` only (declared above at parse time). NOT the deprecated
  // aliases: those are defined further down the file — a temporal dead zone at
  // module init — and they are the wrong set anyway, since an alias is by
  // definition not the composite's own class.
  const shipped = new Set(compositeClasses);

  return TYPE_INTENTION_ORDER.map((label) => {
    const mine = composites.filter(
      (t) => (typeSlotsOf(t.name).intention ?? TYPE_UNSLOTTED) === label,
    );

    // Order variants along the RAMP, not alphabetically. This has to be explicit:
    // `semantic` arrives already sorted by name, so taking first-seen order gives
    // `2xs, lg, md, sm, xs` — a size ramp shuffled into nonsense, which is worse
    // than useless because it still looks deliberate. Weight tier first (the base
    // ramp, then `-strong`), then the size rung within it, mirroring how the token
    // file itself groups `label`.
    const seen: string[] = [];
    for (const t of mine) {
      const v = typeSlotsOf(t.name).variant ?? '';
      if (!seen.includes(v)) seen.push(v);
    }
    seen.sort((a, b) => {
      const split = (v: string) => {
        const parts = v.split('-');
        const size = SIZE_RUNGS.indexOf(parts[0]);
        return size === -1
          ? { tier: v ? 1 : 0, size: -1, raw: v } // a non-size variant, e.g. `strong`
          : { tier: parts.length > 1 ? 1 : 0, size, raw: v };
      };
      const [x, y] = [split(a), split(b)];
      return x.tier - y.tier || x.size - y.size || x.raw.localeCompare(y.raw);
    });

    const variants: TypeVariant[] = seen.map((v) => {
      const rows = mine
        .filter((t) => (typeSlotsOf(t.name).variant ?? '') === v)
        .map((t) => ({
          name: t.name,
          property: typeSlotsOf(t.name).property,
          references: t.lineage?.length ? t.lineage[0].ref : null,
          resolved: t.resolved ?? null,
          tier1: tier1Of(t),
        }));
      const className = `typography-${[label, v].filter(Boolean).join('-')}`;
      return {
        label: v || null,
        className,
        classShipped: shipped.has(className),
        usedBy: compositeUsage.get(className) ?? { components: [], files: [] },
        assemblesFrom: [...new Set(rows.map((r) => r.references).filter((w): w is string =>
          !!w && w.startsWith('--typography-font-')))]
          .sort()
          .map((name) => {
            const m = /^--typography-(font-family|font-weight)-(.+)$/.exec(name)!;
            return { name, property: m[1], variant: m[2] };
          }),
        rows,
      };
    });

    return {
      label,
      variants,
      total: mine.length,
      properties: [...new Set(mine.map((t) => typeSlotsOf(t.name).property).filter(Boolean))] as string[],
      isUnclassified: label === TYPE_UNSLOTTED,
    };
  }).filter((g) => g.total > 0 || g.isUnclassified);
})();

/**
 * The INGREDIENTS as their own group, shaped `property > variant` — which is
 * colour's shape. Kept separate from the tree above rather than made a ninth
 * intention, because `font-family` is not a job text does.
 */
/**
 * How many composites anything in the KIT actually applies.
 *
 * Counted off `usedBy.components` alone. A `files` hit is almost always this
 * debug site or a foundations page rendering a specimen, and a specimen is not a
 * dependant — summing the two would report near-total adoption for a layer that
 * components have barely started using, which is the opposite of the truth.
 */
export const compositeAdoption = (() => {
  const all = typographyGroups.flatMap((g) => g.variants);
  const byComponent = all.filter((v) => v.usedBy.components.length > 0);
  return {
    total: all.length,
    usedByComponent: byComponent.length,
    byComponent: byComponent.map((v) => v.className),
    orphan: all.filter((v) => !v.usedBy.components.length && !v.usedBy.files.length).length,
  };
})();

export interface TypeIngredientGroup {
  label: string;
  rows: {
    name: string;
    variant: string;
    references: string | null;
    resolved: string | null;
    tier1: string | null;
  }[];
}

export const typographyIngredients: TypeIngredientGroup[] = (['font-family', 'font-weight'] as const).map(
  (prop) => ({
    label: prop,
    rows: semantic
      .filter((t) => t.name.startsWith(`--typography-${prop}-`))
      .map((t) => ({
        name: t.name,
        variant: t.name.replace(`--typography-${prop}-`, ''),
        references: t.lineage?.length ? t.lineage[0].ref : null,
        resolved: t.resolved ?? null,
        tier1: tier1Of(t),
      })),
  }),
);

/**
 * Every composite name parses into all three slots — the claim the tree makes.
 * Printed rather than assumed, exactly like colour's `categoryCoverage`.
 */
export const typeSlotCoverage = (() => {
  const composites = semantic.filter((t) => isTypeComposite(t.name));
  const unparsed = composites.filter((t) => {
    const s = typeSlotsOf(t.name);
    return !s.intention || !s.property;
  });
  return {
    total: composites.length,
    intentions: typographyGroups.filter((g) => !g.isUnclassified).length,
    variants: typographyGroups.reduce((n, g) => n + g.variants.length, 0),
    unparsed: unparsed.map((t) => t.name),
  };
})();

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
   * `--font-family-dm-sans` THROUGH `--typography-font-family-display`, and that is
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

      // `var(--typography-font-family-display, var(--typography-font-family-sans))`
      // — capture both so the fallback face is visible rather than collapsed
      // into the primary.
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
   *  the face token directly matches nothing.
   *
   *  The OLD name is matched too. `--font-display` is still a live deprecated
   *  alias in dist/tokens.css, so a spoke — or a hub file mid-migration — can
   *  legitimately still resolve through it; dropping it here would report
   *  "nothing uses the display face" rather than a stale name, which is the
   *  quiet-wrong-answer this whole audit exists to prevent. */
  displayFace: allRoles
    .filter((r) => {
      const ff = r.props['font-family'];
      const isDisplay = (ref: string | null | undefined) =>
        ref === '--typography-font-family-display' || ref === '--font-display';
      return isDisplay(ff?.ref) || !!ff?.chain.some((l) => isDisplay(l.ref));
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
