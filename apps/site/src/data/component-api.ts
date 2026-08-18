// Build-time extraction of each component's PUBLIC API — the props it accepts
// and the events it emits, read from the component source itself.
//
// WHY: the API table used to be hand-authored on every doc page as a literal
// `const props = [...]` array. Nothing tied it to the component, so it drifted
// silently — `esa-button` grew `href`/`target`/`rel` and a `soft` appearance
// that the page never learned about, and the page kept claiming
// `appearance: 'fill' | 'outline' | 'dashed'` long after a fourth value shipped.
// A docs page that lies is worse than no docs page, so the CONTRACT (name,
// type, default) now comes from source and can never drift. Only the PROSE is
// authored, keyed by prop name — see `_ApiTable.astro`.
//
// Sibling of `theming.ts`, which does the same for the theming surface.
//
// THE PARSERS THEMSELVES LIVE IN `scripts/lib/component-api.mjs`. This file is
// the filesystem half: the directory walk, the repo-root arithmetic, and the
// drift guard. The split exists so the Angular snippet transform and its corpus
// test can run against the real parse of the real components — a test cannot
// import an Astro data module, and a fixture would drift from the thing it
// stands for. Imported relatively rather than through the `@theme` alias: that
// alias exists so theme-maker's CLIENT script can be bundled, and nothing here
// ever reaches a browser.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAstro, parseLit } from '../../../../scripts/lib/component-api.mjs';

/**
 * Find the repo root by SEARCHING for it, not by counting directories up.
 *
 * Counting is what every other data module here does, and it is a trap this repo
 * has already sprung twice. The module's own location is not stable: vite decides
 * whether to inline it into a page chunk or emit it separately, and that decision
 * changes with who imports it. The moment `angular-snippet.ts` imported this file,
 * the pair landed one directory shallower and the build died looking for
 * `apps/packages/ecology/src/components` — a path that has never existed.
 *
 * Walking up until the components directory actually appears cannot be wrong
 * about that, wherever the module ends up.
 */
function findRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    if (existsSync(path.join(dir, 'packages', 'ecology', 'src', 'components'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(
    'component-api: could not find packages/ecology/src/components above ' +
      fileURLToPath(import.meta.url),
  );
}

const ROOT = findRoot();
/** Absolute path to the component sources. Shared with `angular-snippet.ts`. */
export const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

export interface ApiProp {
  /** What the consumer writes: a prop name (.astro) or an attribute name (wc). */
  name: string;
  /** The property name, when a web component's attribute differs from it. */
  propertyName?: string;
  /**
   * Set through JS only — either `attribute: false` in `static properties`, or a
   * public get/set accessor pair. Rendering these as if they were attributes
   * would send a reader to write HTML that silently does nothing.
   */
  propertyOnly?: boolean;
  type: string;
  /** Literal default expression from the source, or undefined if there is none. */
  default?: string;
  /** JSDoc / `//` comment attached to the declaration in source, if any. */
  description?: string;
  required: boolean;
  /**
   * The declared Lit converter type (`String` | `Boolean` | `Number` | `Array` |
   * `Object`), for web components only. Shown in no table — it is what tells the
   * Angular transform that `options` is an Array and therefore wants a property
   * binding rather than an attribute.
   */
  litType?: string;
  /**
   * The prop declares its own `converter`, so it does NOT use Lit's presence-based
   * Boolean parsing. For the six default-true props that carry `boolish`, this is
   * what lets the table tell a reader that `="false"` genuinely works — it is not
   * true of a boolean attribute in general, so it has to be said.
   */
  hasConverter?: boolean;
}

export interface ComponentApi {
  props: ApiProp[];
  /** Event names the component actually dispatches — the spine for the events guard. */
  eventNames: string[];
  /** True when the component forwards unknown attributes to its native element. */
  passthrough: boolean;
}

// ── Build the map ──────────────────────────────────────────────────────────

export const componentApi: Record<string, ComponentApi> = {};

for (const file of readdirSync(COMPONENTS)) {
  const m = file.match(/^(esa-[a-z0-9-]+)\.(astro|ts)$/);
  if (!m) continue;
  const src = readFileSync(path.join(COMPONENTS, file), 'utf8');
  componentApi[m[1]] = m[2] === 'astro' ? parseAstro(src) : parseLit(src);
}

/**
 * Drift guard. Called by `_ApiTable.astro` for every page that documents a
 * component. Authored prose is keyed by prop name, so a rename in the component
 * would silently orphan the prose — this turns that into a build-time warning
 * instead of a table row that quietly loses its description.
 */
export function reportApiDrift(
  slug: string,
  documentedProps: string[],
  documentedEvents: string[],
): void {
  const api = componentApi[slug];
  if (!api) {
    // Reference components (AG Grid & friends) have no source file here.
    if (existsSync(path.join(COMPONENTS, `${slug}.astro`))) {
      console.warn(`⚠️  component-api: no API extracted for ${slug}`);
    }
    return;
  }
  const known = new Set(api.props.map((p) => p.name));
  const orphanProps = documentedProps.filter((n) => !known.has(n));
  if (orphanProps.length) {
    console.warn(
      `⚠️  API drift: ${slug} documents prop(s) that no longer exist in source: ` +
        `${orphanProps.join(', ')}. Remove them or rename the prose key.`,
    );
  }
  // Only guard events for components that dispatch at all — a component whose
  // events come from a nested native element has none to match against.
  if (api.eventNames.length) {
    const orphanEvents = documentedEvents.filter((n) => !api.eventNames.includes(n));
    if (orphanEvents.length) {
      console.warn(
        `⚠️  API drift: ${slug} documents event(s) never dispatched in source: ` +
          `${orphanEvents.join(', ')}. Dispatched: ${api.eventNames.join(', ')}.`,
      );
    }
  }
}
