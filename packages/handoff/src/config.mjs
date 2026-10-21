// Spoke config for the handoff pipeline. A spoke drops `handoff.config.mjs` at its
// root; everything the pipeline used to hardcode per spoke (Beacon's PORT, BASE and
// registry path were constants in its own copy of the generator) comes from here.
//
//   // handoff.config.mjs
//   export default {
//     name: 'Beacon',                         // shown at the top of handoff/index.md
//     site: 'https://esassoc.github.io',      // astro.config `site`
//     base: '/beacon-design/',                // production `base`
//     registry: 'src/data/prototypes.ts',     // slug / title / description / route rows
//     spokePrefix: 'bcn',                     // spoke component class prefix
//     target: { name: 'the Beacon app', map: { 'esa-badge': 'ui-badge' } },
//   };
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {Object} Viewport
 * @property {number} width
 * @property {number} height
 *
 * @typedef {Object} TargetMap
 * @property {string} name                 The app a spec is translated INTO ("the Beacon app").
 * @property {Record<string,string>} map   Hub or spoke component → the target app's own component.
 *
 * @typedef {Object} HandoffConfig
 * @property {string} root          Spoke root (absolute).
 * @property {string} name          Display name of the spoke.
 * @property {string} site          Deployed origin.
 * @property {string} base          Deployed base path, with leading and trailing slash.
 * @property {string} registry      Prototype registry, relative to root.
 * @property {string} specs         Authored spec directory, relative to root.
 * @property {string} out           Bundle output directory, relative to root (served at <base>handoff/).
 * @property {string} components    Spoke component source, relative to root.
 * @property {string|null} baseline Module exporting slugs excused from the guidance gate.
 * @property {number} port          Local preview port for capture.
 * @property {string} spokePrefix   Class prefix of the spoke's own components (no dash).
 * @property {{desktop: Viewport, phone: Viewport}} viewports
 * @property {number} budget        Bytes a single spec file may reach before it is split.
 * @property {string[]} libraryClasses Class prefixes whose rules never reach a spec.
 * @property {TargetMap|null} target
 */

export const DEFAULTS = {
  name: '',
  site: '',
  base: '/',
  registry: 'src/data/prototypes.ts',
  specs: 'src/data/handoff',
  out: 'public/handoff',
  components: 'src/components',
  baseline: null,
  port: 4399,
  spokePrefix: '',
  // The widths the hub's own browser checks use (check-target-size, check-chart-a11y)
  // and a current phone.
  viewports: { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } },
  // A web fetch truncates long before 100 KB; a spec past this splits into parts.
  budget: 48_000,
  // Class prefixes of libraries the hub wraps (esa-grid → AG Grid, esa-map →
  // Leaflet). Their theme CSS is the library's, so it stays out of section styles.
  libraryClasses: ['ag-', 'leaflet-'],
  target: null,
};

/** @returns {Promise<HandoffConfig>} */
export async function loadConfig(root = process.cwd()) {
  const file = join(root, 'handoff.config.mjs');
  const own = existsSync(file) ? (await import(pathToFileURL(file).href)).default : {};
  const cfg = { ...DEFAULTS, ...own, viewports: { ...DEFAULTS.viewports, ...own.viewports }, root };
  if (!cfg.base.startsWith('/')) cfg.base = '/' + cfg.base;
  if (!cfg.base.endsWith('/')) cfg.base += '/';
  cfg.site = cfg.site.replace(/\/+$/, '');
  return cfg;
}

/** The deployed URL of a path under the spoke's base. Never localhost. */
export function deployedUrl(cfg, path = '') {
  const rel = String(path).replace(/^\/+/, '');
  return `${cfg.site}${cfg.base}${rel}`;
}
