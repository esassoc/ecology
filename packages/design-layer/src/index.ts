// @esa/design-layer core: the panel and its data, free of any framework. A dev
// adapter (astro/ today) mounts the panel into its own shadow root, implements
// PanelHost over its dev-server channel, and serves the store (store.mjs).
export { mountPanel } from './panel';
export { buildCss, migrateShared, BANNED_WEIGHT, FONT_OPTIONS } from './controls';
export { PALETTES, GROUPS } from './palettes';
export { RECIPE, grade } from './surfaces';
export { DEFAULTS, HUB_ROLES, resolveConfig, defineConfig } from './defaults.mjs';
export type * from './types';
