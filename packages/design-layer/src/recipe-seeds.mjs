// The page levers' rungs, written against the theme recipe's seeds
// (scripts/lib/theme-recipe.mjs) so a lever moves what the recipe would. Plain
// JS so the hub's tests can hold CORNERS to the recipe's own table:
// scripts/lib/design-layer-seeds.test.mjs fails when the two drift.
//
// Density and Type Scale have no recipe seed yet. Their rungs preview a
// multiplier over the spacing and type scales; changes.md says the change needs
// a recipe seed rather than pretending one exists.

/** seeds.corners: the radius each rung points at (theme-recipe.mjs CORNERS). */
export const CORNERS = {
  flat: { xs: '0', sm: 'var(--radius-050)', md: 'var(--radius-100)', lg: 'var(--radius-200)', chip: 'var(--radius-050)' },
  soft: { xs: 'var(--radius-050)', sm: 'var(--radius-100)', md: 'var(--radius-200)', lg: 'var(--radius-400)', chip: 'var(--radius-100)' },
  round: { xs: 'var(--radius-100)', sm: 'var(--radius-200)', md: 'var(--radius-400)', lg: 'var(--radius-500)', chip: 'var(--radius-pill)' },
};

/** seeds.neutral: the recipe's temperature word for each Radix neutral. */
export const NEUTRAL_SEED = { gray: 'pure', slate: 'cool', sand: 'warm', mauve: 'mauve', sage: 'sage', olive: 'olive' };

/** The brand hues offered on the lever itself; the chevron opens every hue the hub ships. */
export const BRAND_HUES = ['grass', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'plum', 'crimson', 'orange', 'amber'];

/** Proposed seeds: a multiplier over the spacing scale, and one over the type scale. */
export const DENSITY = [{ value: '0.75', name: 'Compact' }, { value: '1', name: 'Default' }, { value: '1.25', name: 'Comfortable' }];
export const TYPE_SCALE = [{ value: '0.9', name: 'Smaller' }, { value: '1', name: 'Default' }, { value: '1.12', name: 'Larger' }];
