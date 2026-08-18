/*
 * component-api.mjs — parse a component's PUBLIC API out of its source text.
 *
 * Two pure functions, `parseAstro(src)` and `parseLit(src)`, each returning a
 * `ComponentApi`. Everything filesystem-shaped — walking the components
 * directory, the repo-root arithmetic, the drift guard — stays in
 * `apps/site/src/data/component-api.ts`, which imports these.
 *
 * WHY THIS IS A SEPARATE FILE, and not just tidiness:
 *
 *   1. The Angular snippet transform (`angular-snippet.mjs`) needs the same
 *      answers this gives — is `options` an attribute or a property? is
 *      `labelPosition` written `label-position`? — and its corpus test has to
 *      run against the REAL parse of the REAL components, not a fixture that
 *      can drift from them. A test cannot import an Astro data module.
 *   2. These two ~100-line parsers back every API table on the site and had no
 *      unit test for their entire life. Here they get one.
 *
 * ISOMORPHIC BY CONTRACT — no `node:` imports, no filesystem, no module-scope
 * side effects. Same rule as lib/{color,ramp,theme-recipe,contrast}.mjs, and for
 * the same reason: it has to run in a bundle as well as in node.
 *
 * NOT to be confused with `component-inventory.mjs`, which reads the same files
 * and is deliberately LOSSY — a name-only prop list and a one-line purpose, sized
 * for a judge to scan. This one is the contract: types, defaults, attribute vs
 * property, and the events actually dispatched.
 *
 * @typedef {object} ApiProp
 * @property {string}  name          What the consumer writes: a prop name (.astro) or an attribute name (wc).
 * @property {string} [propertyName] The property name, when a web component's attribute differs from it.
 * @property {boolean} [propertyOnly] Set through JS only — `attribute: false`, or a public get/set pair.
 * @property {string}  type
 * @property {string} [default]      Literal default expression from source, if any.
 * @property {string} [description]  JSDoc / `//` comment attached to the declaration.
 * @property {boolean} required
 *
 * @typedef {object} ComponentApi
 * @property {ApiProp[]} props
 * @property {string[]}  eventNames  Event names the component actually dispatches.
 * @property {boolean}   passthrough True when unknown attributes forward to a native element.
 */

// ── Small helpers ──────────────────────────────────────────────────────────

/** Strip a `/** … *\/` or `// …` comment block down to one line of prose. */
export function cleanComment(raw) {
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
export function commentAbove(lines, i) {
  const buf = [];
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
export function balancedBlock(src, from) {
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
export function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
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
export function aliasExpander(src) {
  const aliases = new Map();
  for (const m of src.matchAll(/^\s*(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=\s*([^;{]+);/gm)) {
    aliases.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  }
  return function expand(type, depth = 0) {
    if (depth > 4) return type;
    const bare = type.replace(/\[\]$/, '');
    const suffix = type.endsWith('[]') ? '[]' : '';
    const hit = aliases.get(bare);
    if (!hit) return type;
    return expand(hit, depth + 1) + suffix;
  };
}

/** Every event name the component dispatches, deduped and sorted. */
export function dispatchedEvents(src) {
  const names = new Set();
  for (const m of src.matchAll(/new (?:Custom)?Event\(\s*['"`]([^'"`]+)['"`]/g)) names.add(m[1]);
  return [...names].sort();
}

// ── .astro components ──────────────────────────────────────────────────────

/**
 * `interface Props { … }` is the declared surface; `const { x = 1 } = Astro.props`
 * supplies the defaults. Both live in the frontmatter of the same file, so the
 * two halves of every row come from the same source of truth.
 *
 * @param {string} src
 * @returns {ComponentApi}
 */
export function parseAstro(src) {
  const events = dispatchedEvents(src);
  const ifaceAt = src.search(/interface Props\s*\{/);
  if (ifaceAt === -1) return { props: [], eventNames: events, passthrough: false };
  const block = balancedBlock(src, ifaceAt);
  if (block === null) return { props: [], eventNames: events, passthrough: false };

  // An index signature (`[attr: string]: unknown`) means unknown attributes are
  // forwarded to the native element — a real part of the contract, surfaced as
  // a note rather than a row.
  const passthrough = /\[\s*\w+\s*:\s*string\s*\]\s*:/.test(block);

  const defaults = new Map();
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
  const props = [];
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
  return { props, eventNames: events, passthrough };
}

// ── Lit web components ─────────────────────────────────────────────────────

const LIT_FALLBACK = {
  String: 'string', Boolean: 'boolean', Number: 'number', Array: 'unknown[]', Object: 'object',
};

/**
 * `static properties` is the public reactive surface (entries flagged
 * `state: true` are internal and excluded); `declare x: T` carries the precise
 * TS type and its JSDoc; the constructor carries the defaults. Docs show the
 * ATTRIBUTE name, since that is what a consumer writes in HTML.
 *
 * @param {string} src
 * @returns {ComponentApi}
 */
export function parseLit(src) {
  const events = dispatchedEvents(src);
  const propsAt = src.search(/static\s+properties\s*=\s*\{/);
  if (propsAt === -1) return { props: [], eventNames: events, passthrough: false };
  const block = balancedBlock(src, propsAt);
  if (block === null) return { props: [], eventNames: events, passthrough: false };

  // name → attribute name, in declaration order, skipping internal state.
  const declared = [];
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
    // A declared `converter` means the prop does NOT use Lit's default parsing.
    // Nothing renders this, but it is what stops the `="false"` ratchet from
    // flagging the six props that now read "false" on purpose (src/boolish.ts).
    const hasConverter = /\bconverter\s*:/.test(opts);
    declared.push({ prop: m[1], attr, litType, propertyOnly, hasConverter });
  }

  // `declare` gives the real TS type + JSDoc.
  const srcLines = src.split('\n');
  const declTypes = new Map();
  for (let i = 0; i < srcLines.length; i++) {
    const m = srcLines[i].match(/^\s*declare\s+([a-zA-Z0-9_$]+)\s*:\s*([\s\S]+?);\s*$/);
    if (!m) continue;
    declTypes.set(m[1], { type: m[2].trim(), description: commentAbove(srcLines, i) });
  }

  // Constructor assignments are the defaults.
  const defaults = new Map();
  const ctorAt = src.search(/\bconstructor\s*\([^)]*\)\s*\{/);
  if (ctorAt !== -1) {
    const body = balancedBlock(src, ctorAt) ?? '';
    for (const line of body.split('\n')) {
      const m = line.trim().match(/^this\.([a-zA-Z0-9_$]+)\s*=\s*([\s\S]+?);\s*$/);
      if (m && !defaults.has(m[1])) defaults.set(m[1], m[2].trim());
    }
  }

  const expand = aliasExpander(src);
  const props = declared.map(({ prop, attr, litType, propertyOnly, hasConverter }) => {
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
      // The declared Lit converter type. Not shown in any table — it is what
      // tells the Angular transform that `options` is an Array and therefore
      // needs a property binding rather than an attribute.
      litType,
      hasConverter: hasConverter || undefined,
    };
  });

  // Public get/set accessors are API too. Form controls expose their value this
  // way (`set value(v) { … }`) rather than as a reactive property, so a
  // properties-only reading of the class would drop the single most important
  // member of every form component.
  const seen = new Set(props.map((p) => p.propertyName ?? p.name));
  const accessors = new Map();
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
