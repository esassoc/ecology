// The controls' shared machinery: the font list, the banned weight, and the
// stylesheet a set of tweaks writes. Which variables the rows edit comes from
// the spoke's config (defaults.mjs), not from here.
import type { Mode } from './surfaces';
import { choiceVars } from './palettes';
import type { FontOption, ResolvedConfig, ScopeMaps, Tweaks, VarMap } from './types';

export * from './types';

// Weights are numbers on the face's own axis: the panel reads the range from the
// @font-face rules the page has loaded (a Google face's css2 range), so every
// whole number renders. These lists are the fallback before a face is declared;
// IBM Plex is static and keeps its five. 350 is banned (regular is 400): the
// number field turns it into 400, the slider steps over it, and the panel flags
// it where a tuned value carries it.
const STEPS = [300, 400, 500, 600, 700, 800];
/** The banned weight: never offered, flagged where a tuned value carries it. */
export const BANNED_WEIGHT = 350;
export const FONT_OPTIONS: FontOption[] = [
  { id: 'dm-sans', label: 'DM Sans', css: "'DM Sans', sans-serif", weights: [300, 400, 500, 550, 600, 650, 700, 800] },
  { id: 'inter', label: 'Inter', css: "'Inter', sans-serif", google: 'Inter:wght@100..900', weights: STEPS },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', css: "'IBM Plex Sans', sans-serif", google: 'IBM+Plex+Sans:wght@300;400;500;600;700', weights: [300, 400, 500, 600, 700] },
  { id: 'source-sans-3', label: 'Source Sans 3', css: "'Source Sans 3', sans-serif", google: 'Source+Sans+3:wght@200..900', weights: STEPS },
  { id: 'work-sans', label: 'Work Sans', css: "'Work Sans', sans-serif", google: 'Work+Sans:wght@100..900', weights: STEPS },
  { id: 'manrope', label: 'Manrope', css: "'Manrope', sans-serif", google: 'Manrope:wght@200..800', weights: STEPS },
  { id: 'besley', label: 'Besley', css: "'Besley', serif", weights: [400, 500, 550, 600, 650, 700] },
  { id: 'source-serif-4', label: 'Source Serif 4', css: "'Source Serif 4', serif", google: 'Source+Serif+4:wght@200..900', weights: STEPS },
  { id: 'newsreader', label: 'Newsreader', css: "'Newsreader', serif", google: 'Newsreader:wght@200..800', weights: STEPS },
  { id: 'fraunces', label: 'Fraunces', css: "'Fraunces', serif", google: 'Fraunces:wght@100..900', weights: STEPS },
  { id: 'system-ui', label: 'System UI', css: "system-ui, -apple-system, 'Segoe UI', sans-serif", weights: STEPS },
];

/** Saved tweaks from an older panel, brought to today's shape as they load (the
    file itself is rewritten only by Save): a weight saved as a token reference
    becomes its number, and a variable the config lists under `legacy` becomes
    the variables that replaced it. */
export function migrateShared(shared: VarMap, cfg: ResolvedConfig): VarMap {
  const out: VarMap = { ...shared };
  for (const s of cfg.sizes) {
    const m = out[s.weightVar]?.match(/^var\(--font-weight-(\d+)\)$/);
    if (m) out[s.weightVar] = m[1];
  }
  for (const [old, next] of Object.entries(cfg.legacy)) {
    const v = out[old];
    if (v === undefined) continue;
    for (const n of next) out[n] ??= v;
    delete out[old];
  }
  return out;
}

export const fontById = (id: string) => FONT_OPTIONS.find((f) => f.id === id);

export function googleHref(specs: string[]): string | null {
  if (!specs.length) return null;
  return `https://fonts.googleapis.com/css2?${specs.map((s) => `family=${s}`).join('&')}&display=swap`;
}

/** A mode's variables: the palette's, then the overrides. */
export function modeVars(t: Tweaks, m: Mode, roles: ResolvedConfig['roles']): VarMap {
  const choice = t.palette?.[m];
  return { ...(choice ? choiceVars(choice, m, roles) : {}), ...t[m] };
}

/** Root variables that resolve through the given ones, with their declared
    values, so a scoped block can re-declare them and they re-resolve inside it
    (graph.ts). Without it a scoped primitive would move nothing. */
export type Expand = (vars: VarMap, mode: Mode) => VarMap;

const pageAttr = (page: string) => `[data-dl-page="${page.replace(/["\\]/g, '\\$&')}"]`;

/** A selector's blocks for one scope's maps: shared, then light, then dark. */
export function scopedBlocks(root: string, at: (sel: string) => string, maps: ScopeMaps, expand?: Expand): string {
  const vars = (v: VarMap, m: Mode) => (expand ? { ...expand(v, m), ...v } : v);
  return [
    block(at(root), vars(maps.shared, 'light')),
    block(at(`${root}:not([data-scheme="dark"])`), vars(maps.light, 'light')),
    block(at(`${root}[data-scheme="dark"]`), vars(maps.dark, 'dark')),
  ].join('');
}

function block(sel: string, vars: VarMap) {
  const keys = Object.keys(vars);
  return keys.length ? `${sel} {\n${keys.map((k) => `  ${k}: ${vars[k]};`).join('\n')}\n}\n` : '';
}

export const rootSelector = (boost: boolean) => (boost ? 'html:root:root[data-theme]' : 'html:root[data-theme]');

/** The stylesheet for a set of tweaks. `boost` raises specificity one step so the
    live preview outranks the saved file. */
export function buildCss(t: Tweaks, roles: ResolvedConfig['roles'], boost = false, expand?: Expand): string {
  const root = rootSelector(boost);
  const specs = Object.values(t.shared)
    .map((css) => FONT_OPTIONS.find((f) => f.css === css)?.google)
    .filter((g): g is string => !!g);
  const href = googleHref([...new Set(specs)]);
  return [
    '/* Generated by the design layer (@esa/design-layer). Dev only; not a token file. */\n',
    href ? `@import url('${href}');\n` : '',
    block(root, t.shared),
    block(`${root}:not([data-scheme="dark"])`, modeVars(t, 'light', roles)),
    block(`${root}[data-scheme="dark"]`, modeVars(t, 'dark', roles)),
    ...(t.overrides ?? []).map((o) => {
      const blocks = scopedBlocks(root, (sel) => `${sel}${o.page ? pageAttr(o.page) : ''} ${o.selector}`, o, expand);
      return blocks ? `/* ${o.scope}: ${o.name.replace(/\*\//g, '')} */\n${blocks}` : '';
    }),
  ].join('');
}
