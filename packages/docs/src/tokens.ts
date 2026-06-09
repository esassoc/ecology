// The canonical token VOCABULARY a foundation page documents — names + grouping
// only, never values. These names are the hub contract: every spoke shares them
// (that's the whole point of theming the semantic layer), so this manifest is
// theme-invariant and lives in @esa/docs. The displayed VALUES are read from the
// live cascade at runtime (see foundation-hydrate.ts) so each spoke's page shows
// whatever its theme CSS set — not the teal defaults compiled into @esa/tokens.
//
// Primitive ramps (--cbf-blue-*, --bcn-gray-*) are deliberately NOT here: they're
// per-brand, named by the spoke. Foundation components take those as a prop.

export interface TokenRole {
  token: string; // base-less custom-property name, e.g. "color-primary"
  note?: string;
}

export interface TokenGroup {
  label: string;
  note?: string;
  roles: TokenRole[];
}

/* ---------------------------------- COLOR --------------------------------- */
// The semantic roles components actually read. A theme re-points these; the
// component kit re-skins with no forks because it never reaches past this layer.
export const colorGroups: TokenGroup[] = [
  {
    label: 'Brand',
    note: 'The spoke identity. Everything interactive chains off --color-primary.',
    roles: [
      { token: 'color-primary', note: 'Brand anchor — buttons, links, focus rings, active states.' },
      { token: 'color-primary-hover' },
      { token: 'color-primary-active' },
      { token: 'color-primary-subtle', note: 'Brand-tinted surface — selected rows, callout tiles, pills.' },
      { token: 'color-primary-border', note: 'Soft brand border, pairs with primary-subtle.' },
      { token: 'color-secondary' },
      { token: 'color-secondary-hover' },
      { token: 'color-accent', note: 'Accent role — hub default is orange; a spoke may re-point.' },
      { token: 'color-accent-hover' },
    ],
  },
  {
    label: 'AI',
    note: 'Reserved tint for AI-authored surfaces and actions.',
    roles: [
      { token: 'color-ai' },
      { token: 'color-ai-hover' },
      { token: 'color-ai-subtle' },
    ],
  },
  {
    label: 'Surface',
    roles: [
      { token: 'color-background', note: 'Page background.' },
      { token: 'color-surface', note: 'Card / panel surface.' },
      { token: 'color-surface-elevated' },
      { token: 'color-surface-sunken' },
      { token: 'color-surface-inverse', note: 'Darkest chrome — top app bars, dark nav.' },
      { token: 'color-surface-inverse-hover' },
    ],
  },
  {
    label: 'Text',
    roles: [
      { token: 'color-text-primary' },
      { token: 'color-text-secondary' },
      { token: 'color-text-tertiary' },
      { token: 'color-text-muted' },
      { token: 'color-text-inverse' },
      { token: 'color-text-link' },
      { token: 'color-text-link-hover' },
    ],
  },
  {
    label: 'Border',
    roles: [
      { token: 'color-border' },
      { token: 'color-border-light' },
      { token: 'color-border-strong' },
      { token: 'color-border-focus', note: 'Focus ring — equals --color-primary.' },
    ],
  },
  {
    label: 'Feedback',
    note: 'Status palette. Each also has a -subtle (fill) and -border variant.',
    roles: [
      { token: 'color-info' },
      { token: 'color-success' },
      { token: 'color-warning' },
      { token: 'color-danger' },
    ],
  },
  {
    label: 'Disabled',
    roles: [
      { token: 'color-disabled-bg' },
      { token: 'color-disabled-text' },
      { token: 'color-disabled-border' },
    ],
  },
];

/* --------------------------------- SPACING -------------------------------- */
// One linear-then-modular scale. Inherited unchanged by spokes — re-skin color
// and type, not density.
export const spacingScale: string[] = [
  'spacing-050', 'spacing-100', 'spacing-150', 'spacing-200', 'spacing-250',
  'spacing-300', 'spacing-400', 'spacing-500', 'spacing-600', 'spacing-650',
  'spacing-700', 'spacing-800', 'spacing-900', 'spacing-950', 'spacing-1000',
];

/* --------------------------------- RADIUS --------------------------------- */
export const radiusScale: TokenRole[] = [
  { token: 'radius-050', note: 'Hairline rounding.' },
  { token: 'radius-100', note: 'Inputs, small controls.' },
  { token: 'radius-200', note: 'Buttons, chips.' },
  { token: 'radius-300', note: 'Cards, menus.' },
  { token: 'radius-400', note: 'Panels, dialogs.' },
  { token: 'radius-500', note: 'Large surfaces, sheets.' },
  { token: 'radius-full', note: 'Pills, avatars, toggles.' },
];

/* ------------------------------- TYPOGRAPHY ------------------------------- */
// Families + weights are brand-specific (a spoke swaps the face); the size scale
// is invariant. All three render from the live cascade.
export const typeFamilies: TokenRole[] = [
  { token: 'font-display', note: 'Headlines, page titles, big numbers.' },
  { token: 'font-sans', note: 'Body — the workhorse face.' },
  { token: 'font-mono', note: 'Code, IDs, token names.' },
];

export const typeWeights: TokenRole[] = [
  { token: 'font-weight-regular' },
  { token: 'font-weight-medium' },
  { token: 'font-weight-semibold' },
  { token: 'font-weight-bold' },
];

// Largest → smallest, the order a type scale reads best in.
export const typeSizes: string[] = [
  'type-size-900', 'type-size-800', 'type-size-700', 'type-size-600',
  'type-size-500', 'type-size-400', 'type-size-300', 'type-size-250',
  'type-size-200', 'type-size-150', 'type-size-100', 'type-size-050',
];
