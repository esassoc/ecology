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
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

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
}

export interface ComponentApi {
  props: ApiProp[];
  /** Event names the component actually dispatches — the spine for the events guard. */
  eventNames: string[];
  /** True when the component forwards unknown attributes to its native element. */
  passthrough: boolean;
}

// ── Small helpers ──────────────────────────────────────────────────────────

/** Strip a `/** … *\/` or `// …` comment block down to one line of prose. */
function cleanComment(raw: string): string {
  return raw
    .replace(/\/\*\*?/g, '')
    .replace(/\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').replace(/^\s*\/\/\s?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read the comment (JSDoc block or `//` run) immediately above `lines[i]`.
 * Returns '' when the preceding line is code or blank.
 */
function commentAbove(lines: string[], i: number): string {
  const buf: string[] = [];
  let j = i - 1;
  // A closing `*/` means walk back to the matching `/**`.
  if (j >= 0 && lines[j].trim().endsWith('*/')) {
    while (j >= 0) {
      buf.unshift(lines[j]);
      if (lines[j].trim().startsWith('/*')) break;
      j--;
    }
    return cleanComment(buf.join('\n'));
  }
  while (j >= 0 && lines[j].trim().startsWith('//')) {
    buf.unshift(lines[j]);
    j--;
  }
  return buf.length ? cleanComment(buf.join('\n')) : '';
}

/** Extract `{ … }` starting at `from`, balancing braces so nested types survive. */
function balancedBlock(src: string, from: number): string | null {
  const open = src.indexOf('{', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * Split a destructuring / object body on top-level commas only, so defaults
 * like `options = []` or `cols = { sm: 1 }` are not cut in half.
 */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let buf = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      buf += c;
      if (c === quote && body[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; buf += c; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    if (c === '}' || c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}

/**
 * Expand local `type X = 'a' | 'b'` aliases in place.
 *
 * This matters more than it looks: `esa-button` declares `appearance?:
 * EsaButtonAppearance`, and the whole point of generating the table is that the
 * reader sees the FOUR values that alias actually holds. Printing the alias
 * name would reintroduce exactly the drift we are removing. Only unions of
 * literals/primitives are expanded — an alias pointing at an interface stays a
 * name, since a whole object shape does not belong in a table cell.
 */
function aliasExpander(src: string): (type: string) => string {
  const aliases = new Map<string, string>();
  for (const m of src.matchAll(/^\s*(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=\s*([^;{]+);/gm)) {
    aliases.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  }
  return function expand(type: string, depth = 0): string {
    if (depth > 4) return type;
    const bare = type.replace(/\[\]$/, '');
    const suffix = type.endsWith('[]') ? '[]' : '';
    const hit = aliases.get(bare);
    if (!hit) return type;
    return expand(hit, depth + 1) + suffix;
  };
}

/** Every event name the component dispatches, deduped and sorted. */
function dispatchedEvents(src: string): string[] {
  const names = new Set<string>();
  for (const m of src.matchAll(/new (?:Custom)?Event\(\s*['"`]([^'"`]+)['"`]/g)) names.add(m[1]);
  return [...names].sort();
}

// ── .astro components ──────────────────────────────────────────────────────

/**
 * `interface Props { … }` is the declared surface; `const { x = 1 } = Astro.props`
 * supplies the defaults. Both live in the frontmatter of the same file, so the
 * two halves of every row come from the same source of truth.
 */
function parseAstro(src: string): ComponentApi {
  const events = dispatchedEvents(src);
  const ifaceAt = src.search(/interface Props\s*\{/);
  if (ifaceAt === -1) return { props: [], eventNames: events, passthrough: false };
  const block = balancedBlock(src, ifaceAt);
  if (block === null) return { props: [], eventNames: events, passthrough: false };

  // An index signature (`[attr: string]: unknown`) means unknown attributes are
  // forwarded to the native element — a real part of the contract, surfaced as
  // a note rather than a row.
  const passthrough = /\[\s*\w+\s*:\s*string\s*\]\s*:/.test(block);

  const defaults = new Map<string, string>();
  const destructureAt = src.search(/const\s*\{[\s\S]*?\}\s*=\s*Astro\.props/);
  if (destructureAt !== -1) {
    const d = balancedBlock(src, destructureAt);
    if (d) {
      for (const part of splitTopLevel(d)) {
        // `class: className = ''` → key is the source-side name (`class`).
        const m = part.trim().match(/^([a-zA-Z0-9_$]+)\s*(?::\s*[a-zA-Z0-9_$]+\s*)?=\s*([\s\S]+)$/);
        if (m) defaults.set(m[1], m[2].trim());
      }
    }
  }

  const expand = aliasExpander(src);
  const lines = block.split('\n');
  const props: ApiProp[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('*') || line.startsWith('/') || line.startsWith('[')) continue;
    const m = line.match(/^([a-zA-Z0-9_$]+)(\?)?\s*:\s*([\s\S]+?);?$/);
    if (!m) continue;
    props.push({
      name: m[1],
      type: expand(m[3].trim().replace(/;$/, '')),
      default: defaults.get(m[1]),
      description: commentAbove(lines, i) || undefined,
      required: !m[2],
    });
  }
  return { props, eventNames: events, passthrough: false || passthrough };
}

// ── Lit web components ─────────────────────────────────────────────────────

/**
 * `static properties` is the public reactive surface (entries flagged
 * `state: true` are internal and excluded); `declare x: T` carries the precise
 * TS type and its JSDoc; the constructor carries the defaults. Docs show the
 * ATTRIBUTE name, since that is what a consumer writes in HTML.
 */
function parseLit(src: string): ComponentApi {
  const events = dispatchedEvents(src);
  const propsAt = src.search(/static\s+properties\s*=\s*\{/);
  if (propsAt === -1) return { props: [], eventNames: events, passthrough: false };
  const block = balancedBlock(src, propsAt);
  if (block === null) return { props: [], eventNames: events, passthrough: false };

  // name → attribute name, in declaration order, skipping internal state.
  const declared: Array<{ prop: string; attr: string; litType: string; propertyOnly: boolean }> = [];
  for (const part of splitTopLevel(block)) {
    const m = part.trim().match(/^([a-zA-Z0-9_$]+)\s*:\s*\{([\s\S]*)\}$/);
    if (!m) continue;
    const opts = m[2];
    if (/\bstate\s*:\s*true\b/.test(opts)) continue;
    if (m[1].startsWith('_')) continue;
    // `attribute: false` means there is NO attribute — the prop is assignable
    // from JS only, so the docs must show the property name, not a lowercased
    // pseudo-attribute a reader would try (and fail) to write in HTML.
    const propertyOnly = /\battribute\s*:\s*false\b/.test(opts);
    const attr = propertyOnly
      ? m[1]
      : opts.match(/attribute\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? m[1].toLowerCase();
    const litType = opts.match(/type\s*:\s*([A-Za-z]+)/)?.[1] ?? 'String';
    declared.push({ prop: m[1], attr, litType, propertyOnly });
  }

  // `declare` gives the real TS type + JSDoc.
  const srcLines = src.split('\n');
  const declTypes = new Map<string, { type: string; description: string }>();
  for (let i = 0; i < srcLines.length; i++) {
    const m = srcLines[i].match(/^\s*declare\s+([a-zA-Z0-9_$]+)\s*:\s*([\s\S]+?);\s*$/);
    if (!m) continue;
    declTypes.set(m[1], { type: m[2].trim(), description: commentAbove(srcLines, i) });
  }

  // Constructor assignments are the defaults.
  const defaults = new Map<string, string>();
  const ctorAt = src.search(/\bconstructor\s*\([^)]*\)\s*\{/);
  if (ctorAt !== -1) {
    const body = balancedBlock(src, ctorAt) ?? '';
    for (const line of body.split('\n')) {
      const m = line.trim().match(/^this\.([a-zA-Z0-9_$]+)\s*=\s*([\s\S]+?);\s*$/);
      if (m && !defaults.has(m[1])) defaults.set(m[1], m[2].trim());
    }
  }

  const LIT_FALLBACK: Record<string, string> = {
    String: 'string', Boolean: 'boolean', Number: 'number', Array: 'unknown[]', Object: 'object',
  };

  const expand = aliasExpander(src);
  const props: ApiProp[] = declared.map(({ prop, attr, litType, propertyOnly }) => {
    const d = declTypes.get(prop);
    return {
      name: attr,
      propertyName: attr === prop ? undefined : prop,
      propertyOnly: propertyOnly || undefined,
      type: expand(d?.type ?? LIT_FALLBACK[litType] ?? 'unknown'),
      default: defaults.get(prop),
      description: d?.description || undefined,
      // Lit props are all optional — a constructor default always exists in
      // practice, and an attribute is never "required" at the HTML level.
      required: false,
    };
  });

  // Public get/set accessors are API too. Form controls expose their value this
  // way (`set value(v) { … }`) rather than as a reactive property, so a
  // properties-only reading of the class would drop the single most important
  // member of every form component.
  const seen = new Set(props.map((p) => p.propertyName ?? p.name));
  const accessors = new Map<string, { type?: string; description: string; i: number }>();
  for (let i = 0; i < srcLines.length; i++) {
    const m = srcLines[i].match(
      /^  (?!private|protected|static)(get|set)\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*([^{]+?)\s*)?\{/,
    );
    if (!m) continue;
    const [, kind, name, param, returnType] = m;
    if (name.startsWith('_') || seen.has(name)) continue;
    const prev = accessors.get(name);
    // The setter's parameter type is what a consumer may ASSIGN — prefer it
    // over the getter's return type, which can be narrower.
    const type = kind === 'set' ? param.split(':').slice(1).join(':').trim() : returnType?.trim();
    accessors.set(name, {
      type: (kind === 'set' ? type : prev?.type ?? type) || prev?.type,
      description: prev?.description || commentAbove(srcLines, i),
      i: prev?.i ?? i,
    });
  }
  for (const [name, a] of accessors) {
    props.push({
      name,
      propertyOnly: true,
      type: expand(a.type || 'unknown'),
      description: a.description || undefined,
      required: false,
    });
  }

  return { props, eventNames: events, passthrough: false };
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
