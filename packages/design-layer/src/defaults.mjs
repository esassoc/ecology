// The design layer's default config: the controls a spoke gets with no
// design-layer.config.mjs, written against the hub's own tier-2 and tier-3
// names so a fresh spoke's panel moves real tokens. Plain JS (no TypeScript, no
// Astro) because both the dev server (Node) and the panel (the browser) read it.
//
// A spoke's config replaces any list it names (sizes, lengths, colors, fonts)
// and merges per key into `roles`, so it can rename one
// surface's variable without restating the other seventeen.

/** @typedef {import('./types').DesignLayerConfig} DesignLayerConfig */
/** @typedef {import('./types').ResolvedConfig} ResolvedConfig */

/** The palette roles onto the hub's tier-2 names. The chrome follows
    design-principles' "house chrome is neutral": canvas is
    --color-background-default, the top bar the raised elevation and the sidenav
    the sunken one, so the three move together as one value ramp. A palette's
    card fill goes to --card-bg, because the bar now owns the raised role. */
export const HUB_ROLES = {
  bar: ['--color-background-elevation-raised'],
  rail: ['--color-background-elevation-sunken'],
  canvas: ['--color-background-default'],
  raised: ['--card-bg', '--color-background-elevation-floating'],
  sunken: [],
  hover: ['--color-background-default-hover'],
  border: ['--color-border-default'],
  borderSubtle: ['--color-border-default-subtle'],
  borderStrong: ['--color-border-default-strong'],
  text: ['--color-content-default'],
  textSecondary: ['--color-content-default-secondary', '--color-content-default-tertiary'],
  primary: ['--color-background-brand'],
  primaryHover: ['--color-background-brand-hover', '--color-background-brand-active'],
  onPrimary: ['--color-content-on-brand'],
  accentMuted: ['--color-background-brand-muted', '--color-background-brand-subtle'],
  accentText: ['--color-content-brand', '--color-content-link', '--color-content-on-brand-muted'],
  focus: ['--color-border-default-focus'],
};

/** @type {ResolvedConfig} */
export const DEFAULTS = {
  dataDir: 'design',
  roles: HUB_ROLES,
  colors: [
    { id: 'text', label: 'Text', cssVar: '--color-content-default' },
    { id: 'secondary', label: 'Secondary Text', cssVar: '--color-content-default-secondary' },
    { id: 'accent', label: 'Accent', cssVar: '--color-background-brand' },
  ],
  inks: ['text', 'secondary'],
  fonts: [
    { id: 'base', label: 'Base', cssVar: '--typography-font-family-sans' },
    { id: 'headline', label: 'Headline', cssVar: '--typography-font-family-display' },
  ],
  // The type composites, by role. Each row sets a composite's size and weight;
  // the composite class (src/typography.css) carries them to every reader.
  sizes: [
    { id: 'nav', label: 'Nav Items', cssVar: '--typography-label-md-font-size', weightVar: '--typography-label-md-font-weight', min: 12, max: 22, font: 'base' },
    { id: 'h1', label: 'H1', cssVar: '--typography-heading-lg-font-size', weightVar: '--typography-heading-lg-font-weight', min: 18, max: 48, font: 'headline' },
    { id: 'h2', label: 'H2', cssVar: '--typography-heading-md-font-size', weightVar: '--typography-heading-md-font-weight', min: 14, max: 32, font: 'base' },
    { id: 'h3', label: 'H3', cssVar: '--typography-label-lg-strong-font-size', weightVar: '--typography-label-lg-strong-font-weight', min: 13, max: 28, font: 'base' },
    { id: 'body', label: 'Body', cssVar: '--typography-body-md-font-size', weightVar: '--typography-body-md-font-weight', min: 12, max: 20, font: 'base' },
    { id: 'meta', label: 'Meta', cssVar: '--typography-meta-font-size', weightVar: '--typography-meta-font-weight', min: 11, max: 16, font: 'base' },
  ],
  // The hub has no control-height or card-padding token (a control is as tall as
  // its padding plus its text), so these are the lengths it does expose.
  lengths: [
    { id: 'row', label: 'Row Padding Y', cssVar: '--grid-cell-padding-y', min: 0, max: 24, step: 0.5 },
    { id: 'nav-item', label: 'Nav Item Height', cssVar: '--sidenav-item-height', min: 24, max: 56, step: 0.5 },
    { id: 'radius', label: 'Radius', cssVar: '--radius-md', min: 0, max: 16, step: 1 },
    { id: 'icon-nav', label: 'Nav Icon', cssVar: '--sidenav-icon-size', min: 12, max: 32, step: 1, group: 'sizes' },
  ],
  legacy: {},
};

/** A spoke's config over the defaults. @param {DesignLayerConfig} [spoke] @returns {ResolvedConfig} */
export function resolveConfig(spoke = {}) {
  return {
    dataDir: spoke.dataDir ?? DEFAULTS.dataDir,
    roles: { ...DEFAULTS.roles, ...(spoke.roles ?? {}) },
    colors: spoke.colors ?? DEFAULTS.colors,
    inks: spoke.inks ?? DEFAULTS.inks,
    fonts: spoke.fonts ?? DEFAULTS.fonts,
    sizes: spoke.sizes ?? DEFAULTS.sizes,
    lengths: spoke.lengths ?? DEFAULTS.lengths,
    legacy: spoke.legacy ?? DEFAULTS.legacy,
    ...(spoke.sourceFiles ? { sourceFiles: spoke.sourceFiles } : {}),
  };
}

/** Identity, for editor types in a spoke's config file. @param {DesignLayerConfig} c */
export const defineConfig = (c) => c;
