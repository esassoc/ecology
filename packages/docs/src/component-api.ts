// Build-time extraction of each component's PUBLIC API — the props it accepts
// and the events it emits, read from the component source itself.
//
// WHY: the API table used to be hand-authored on every doc page as a literal
// `const props = [...]` array. Nothing tied it to the component, so it drifted
// silently — `esa-button` grew `href`/`target`/`rel` and a `soft` appearance
// that the page never learned about. A docs page that lies is worse than no
// docs page, so the CONTRACT (name, type, default) now comes from source and
// can never drift. Only the PROSE is authored, keyed by prop name.
//
// THIS LIVES IN `@esa/docs`, NOT IN THE HUB SITE, AS OF 2026-08-19 — and that
// is the whole point of the move. It was `apps/site/src/data/`, which a SPOKE
// cannot reach: a spoke installs `@esa/docs` and `@esa/ecology`, not the hub's
// site app. So every spoke doc page fell back to a hand-written table, which is
// exactly the drift this module exists to end. The proof was sitting in
// `packages/spoke-template`: its example page documented a `color` prop on
// esa-button for five days after `button-color-to-variant` renamed it, and
// nothing anywhere objected.
//
// The PARSERS are `./component-api-parse.mjs` — pure, no `node:` imports, so
// the corpus test can run them against real component sources. This file is the
// filesystem half: locating the components, walking them, and the drift guard.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAstro, parseLit } from './component-api-parse.mjs';

/**
 * Locate `@esa/ecology`'s component sources. TWO strategies, because this module
 * now runs in two very different places.
 *
 * (1) WALK UP for `packages/ecology/src/components`. This is the hub, and it is
 * a SEARCH rather than a fixed count of `..` on purpose: vite decides whether to
 * inline this module into a page chunk or emit it separately, and that decision
 * moves it. The moment `angular-snippet.ts` imported it the pair landed one
 * directory shallower and the build died on `apps/packages/ecology/...`, a path
 * that has never existed. The walk also covers a spoke whose `@esa/docs` is a
 * `file:` symlink, because Node resolves that to its real path inside the hub
 * checkout before this ever runs.
 *
 * (2) RESOLVE `@esa/ecology` through Node. This is the spoke case where the
 * package was COPIED rather than symlinked — a published install, or npm
 * choosing to materialise it. The walk finds nothing then, because there is no
 * hub checkout above us at all.
 *
 * Throwing is correct if both miss: a silently empty component map renders every
 * API table as "this component takes no props", which reads like a fact.
 */
function findComponents(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    const hit = path.join(dir, 'packages', 'ecology', 'src', 'components');
    if (existsSync(hit)) return hit;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  try {
    const pkg = createRequire(import.meta.url).resolve('@esa/ecology/package.json');
    const hit = path.join(path.dirname(pkg), 'src', 'components');
    if (existsSync(hit)) return hit;
  } catch {
    // fall through to the throw — the error below names both strategies
  }
  throw new Error(
    'component-api: could not locate @esa/ecology component sources. Searched ' +
      `for packages/ecology/src/components above ${fileURLToPath(import.meta.url)}, ` +
      'then tried resolving @esa/ecology through Node. Is @esa/ecology installed?',
  );
}

/** Absolute path to the component sources. */
export const COMPONENTS = findComponents();

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

/**
 * Tags backed by a real `customElements.define` — the only ones Angular (or any
 * non-Astro consumer) can actually use. Collected in the SAME pass that parses
 * the API, because it is the same read of the same file: 35 of the 69 components
 * are Lit `.ts` and register an element; the rest are `.astro`, compile-time
 * only. The obvious names are in the wrong bucket — `esa-button`, `esa-badge`
 * and `esa-icon` are all `.astro`, and `<esa-badge>` in an Angular template
 * renders nothing with no error.
 */
export const ELEMENTS: ReadonlySet<string> = (() => {
  const set = new Set<string>();
  for (const file of readdirSync(COMPONENTS)) {
    const m = file.match(/^(esa-[a-z0-9-]+)\.(astro|ts)$/);
    if (!m) continue;
    const src = readFileSync(path.join(COMPONENTS, file), 'utf8');
    componentApi[m[1]] = m[2] === 'astro' ? parseAstro(src) : parseLit(src);
    if (m[2] === 'ts' && /customElements\.define\(/.test(src)) set.add(m[1]);
  }
  return set;
})();

/** True when `<slug>` is a real custom element rather than an `.astro` template. */
export function isCustomElement(slug: string): boolean {
  return ELEMENTS.has(slug);
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
