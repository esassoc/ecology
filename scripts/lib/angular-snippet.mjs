/*
 * angular-snippet.mjs — turn a doc page's Astro/HTML code sample into the
 * equivalent Angular component, so a reader on a component page can see how to
 * bind the same element from the stack ESA actually ships on.
 *
 * WHY GENERATE RATHER THAN AUTHOR: the Angular sample sits directly beside the
 * HTML one. If the two are written independently they drift, and a snippet that
 * drifts is worse than none — this repo already paid that bill once, when
 * hand-authored API tables let `esa-button` ship an undocumented fourth
 * `appearance`. Deriving one from the other makes disagreement impossible by
 * construction.
 *
 * WHAT THE ANGULAR TAB IS FOR. The markup is already visible in the tab next to
 * it; nobody needs it twice. What is NOT visible anywhere else, and what an
 * Angular developer gets wrong on the first try, is:
 *
 *   - `CUSTOM_ELEMENTS_SCHEMA`, without which the template will not compile;
 *   - which props are attributes and which need `[property]` binding;
 *   - that `change` here is a CUSTOM event carrying `detail.value`, so
 *     `$event.target.value` is empty — silently;
 *   - that event names are lowercase and passed to `addEventListener` verbatim,
 *     so `(pageChange)` never fires. It is `(pagechange)`.
 *
 * TWO RULES THAT LOOK LIKE BUGS AND ARE NOT:
 *
 *   1. NEVER "FIX" AN ATTRIBUTE. `center="[-122.35, 37.78]"` is `type: Array`
 *      WITH an attribute, so Lit's default JSON converter parses it. Rewriting
 *      it to `[center]` would make the Angular tab disagree with the HTML tab
 *      beside it, which is the one thing this file exists to prevent. Property
 *      binding is reserved for props that genuinely have no attribute
 *      (`attribute: false`, accessors) and for props a `<script>` sidecar
 *      assigns.
 *   2. NEVER INVENT AN EVENT BINDING. A component that dispatches `change` does
 *      not get `(change)` unless the source sample shows a listener. The general
 *      "how do I bind this event" question is answered once, in the generated
 *      events table, not guessed at in every sample.
 *
 * `ok: false` IS A NORMAL RESULT, NOT AN ERROR. Anything this cannot do with
 * certainty produces no Angular tab plus one line in the build's coverage
 * report. Half a translation, confidently rendered, is the failure mode worth
 * engineering against.
 *
 * ISOMORPHIC BY CONTRACT — no `node:` imports, no filesystem. Unit-tested in
 * angular-snippet.test.mjs; run against all ~213 real samples in
 * angular-snippet.corpus.test.mjs.
 */

/** Elements that never have a closing tag. */
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

// ── Parsing ────────────────────────────────────────────────────────────────

/**
 * A tolerant fragment parser. Deliberately hand-rolled and small: the inputs are
 * short, hand-written and well-closed, so this needs to handle elements, text,
 * comments and a raw `<script>` body — and nothing else. It does NOT need error
 * recovery, because a parse failure is a legitimate answer here.
 *
 * Regex was not an option: 162 of the ~213 real samples nest, and a regex cannot
 * see nesting.
 *
 * @param {string} code
 * @returns {Array<object>} nodes
 * @throws {Error} on malformed input — callers turn this into `ok:false`.
 */
export function parseFragment(code) {
  let i = 0;
  const src = code;

  function parseNodes(stopTag) {
    const out = [];
    while (i < src.length) {
      if (src.startsWith('</', i)) {
        const close = src.indexOf('>', i);
        if (close === -1) throw new Error('unterminated closing tag');
        const tag = src.slice(i + 2, close).trim().toLowerCase();
        if (stopTag && tag !== stopTag) {
          throw new Error(`mismatched closing tag </${tag}>, expected </${stopTag}>`);
        }
        if (!stopTag) throw new Error(`stray closing tag </${tag}>`);
        i = close + 1;
        return out;
      }
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i);
        if (end === -1) throw new Error('unterminated comment');
        out.push({ kind: 'comment', text: src.slice(i + 4, end) });
        i = end + 3;
        continue;
      }
      if (src[i] === '<' && /[a-zA-Z]/.test(src[i + 1] ?? '')) {
        out.push(parseElement());
        continue;
      }
      // Text runs to the next `<` that opens something.
      const next = findNextTag(src, i);
      const text = src.slice(i, next === -1 ? src.length : next);
      if (text) out.push({ kind: 'text', text });
      i = next === -1 ? src.length : next;
      if (next === -1) break;
    }
    if (stopTag) throw new Error(`unclosed <${stopTag}>`);
    return out;
  }

  function parseElement() {
    const start = i;
    i++; // '<'
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9:_.-]*/.exec(src.slice(i));
    if (!nameMatch) throw new Error('bad tag name');
    const tag = nameMatch[0];
    i += tag.length;

    const attrs = [];
    for (;;) {
      skipWhitespace();
      if (i >= src.length) throw new Error(`unterminated <${tag}>`);
      if (src.startsWith('/>', i)) { i += 2; return { kind: 'element', tag, attrs, children: [], selfClosing: true }; }
      if (src[i] === '>') { i++; break; }
      attrs.push(parseAttr(tag));
    }

    if (VOID.has(tag.toLowerCase())) {
      return { kind: 'element', tag, attrs, children: [], selfClosing: true };
    }

    if (tag.toLowerCase() === 'script') {
      const end = src.indexOf('</script>', i);
      if (end === -1) throw new Error('unterminated <script>');
      const text = src.slice(i, end);
      i = end + '</script>'.length;
      return { kind: 'script', tag, attrs, text };
    }

    const children = parseNodes(tag.toLowerCase());
    return { kind: 'element', tag, attrs, children, selfClosing: false, start };
  }

  function parseAttr(tag) {
    const nameMatch = /^[^\s=/>]+/.exec(src.slice(i));
    if (!nameMatch) throw new Error(`bad attribute in <${tag}>`);
    const name = nameMatch[0];
    i += name.length;
    const save = i;
    skipWhitespace();
    if (src[i] !== '=') { i = save; return { name, value: null, quote: null }; }
    i++;
    skipWhitespace();
    const q = src[i];
    if (q === '"' || q === "'") {
      const end = src.indexOf(q, i + 1);
      if (end === -1) throw new Error(`unterminated attribute value for ${name}`);
      const value = src.slice(i + 1, end);
      i = end + 1;
      return { name, value, quote: q };
    }
    const bare = /^[^\s>]*/.exec(src.slice(i))[0];
    i += bare.length;
    return { name, value: bare, quote: null };
  }

  function skipWhitespace() { while (i < src.length && /\s/.test(src[i])) i++; }

  return parseNodes(null);
}

/** Index of the next character that begins a tag, comment or closing tag. */
function findNextTag(src, from) {
  for (let k = from; k < src.length; k++) {
    if (src[k] !== '<') continue;
    if (src.startsWith('<!--', k)) return k;
    if (src.startsWith('</', k)) return k;
    if (/[a-zA-Z]/.test(src[k + 1] ?? '')) return k;
  }
  return -1;
}

// ── Attribute classification ───────────────────────────────────────────────

/**
 * How a source attribute should be written in an Angular template.
 *
 * `attribute`   — copy it through verbatim.
 * `property`    — needs `[prop]="…"`; there is no attribute to write.
 * `event`       — an inline `on*` handler. We bail on these rather than guess.
 * `passthrough` — not part of the component's API (`id`, `class`, `aria-*`, …),
 *                 so it is plain HTML and copies through verbatim.
 *
 * @param {string} tag
 * @param {string} attr
 * @param {import('./component-api.mjs').ComponentApi | undefined} api
 * @returns {'attribute'|'property'|'event'|'passthrough'}
 */
export function classifyAttr(tag, attr, api) {
  if (/^on[a-z]/i.test(attr)) return 'event';
  const prop = api?.props?.find((p) => p.name === attr);
  if (!prop) return 'passthrough';
  return prop.propertyOnly ? 'property' : 'attribute';
}

// ── `<script>` sidecars ────────────────────────────────────────────────────

/**
 * Translate the narrow slice of imperative demo JS that HAS a faithful Angular
 * form, and refuse everything else.
 *
 * General JS→Angular translation is not a thing that can be done correctly, and
 * the real corpus proves it: `customElements.whenDefined().then()`, a
 * `checkValidity()` loop over form fields, `intake.submit()`. Those become
 * hand-written overrides or stay HTML-only. What IS mechanical:
 *
 *   const p = document.querySelector('esa-pagination');   // an alias
 *   p.pageSizeOptions = [10, 25, 50, 100];                // → a field + binding
 *   p.addEventListener('pagechange', (e) => …);           // → a method + binding
 *
 * THE HANDLE MAY ALSO BE IMPLICIT, and refusing those cost a third of the corpus.
 * Real samples write `el.options = […]`, `chart.data = […]`, `summary.errors = […]`
 * and `document.querySelector('esa-chip-group').options = […]`. `el` and `chart`
 * are stand-ins that resolve to nothing, and `summary` only works because the
 * browser exposes ids as globals. All four mean the same thing: *the element in
 * this sample*. So an unresolved identifier binds to the sample's SOLE custom
 * element — and if there is more than one, that is ambiguous and refused, which
 * is the same guard an explicit selector already gets.
 *
 * @param {string} src           the script body
 * @param {(selector: string|null) => object|null} resolve  selector → element node;
 *        `null` asks for the sample's sole custom element.
 * @returns {{fields: object[], methods: object[]} | null}  null = cannot translate
 */
export function scriptToMembers(src, resolve) {
  const aliases = new Map(); // local name → element node
  const fields = [];
  const methods = [];

  /** The target of a statement: an alias, a `document.querySelector(…)` chain, or an implicit handle. */
  function readTarget(s) {
    const chain = /^document\.(querySelector|getElementById)\(\s*(['"])(.*?)\2\s*\)/.exec(s);
    if (chain) {
      const selector = chain[1] === 'getElementById' ? `#${chain[3]}` : chain[3];
      return { node: resolve(selector), length: chain[0].length };
    }
    const ident = /^([A-Za-z0-9_$]+)/.exec(s);
    if (!ident) return null;
    // An unresolved name is the sample's stand-in for "your element".
    return { node: aliases.get(ident[1]) ?? resolve(null), length: ident[0].length };
  }

  let rest = src.trim();
  let guard = 0;
  while (rest.length) {
    if (guard++ > 200) return null;

    // Comments and blank lines pass through untouched.
    const lineComment = /^\/\/[^\n]*\n?/.exec(rest);
    if (lineComment) { rest = rest.slice(lineComment[0].length).trimStart(); continue; }
    const blockComment = /^\/\*[\s\S]*?\*\/\s*/.exec(rest);
    if (blockComment) { rest = rest.slice(blockComment[0].length).trimStart(); continue; }

    // const x = document.querySelector('sel') | document.getElementById('id')
    const alias = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*document\.(querySelector|getElementById)\(\s*(['"])(.*?)\3\s*\)\s*;?\s*/.exec(rest);
    if (alias) {
      const selector = alias[2] === 'getElementById' ? `#${alias[4]}` : alias[4];
      const node = resolve(selector);
      if (!node) return null;
      aliases.set(alias[1], node);
      rest = rest.slice(alias[0].length);
      continue;
    }

    const target = readTarget(rest);
    if (!target?.node) return null;
    const after = rest.slice(target.length);

    // <target>.addEventListener('name', (e) => …)
    const listen = /^\.addEventListener\(\s*(['"])(.*?)\1\s*,\s*\(\s*([A-Za-z0-9_$]*)\s*\)\s*=>\s*/.exec(after);
    if (listen) {
      const body = after.slice(listen[0].length);
      const handler = readArrowBody(body);
      if (!handler) return null;
      methods.push({
        node: target.node,
        event: listen[2],           // BYTE-FOR-BYTE. Camel-casing this is the classic bug.
        param: listen[3] || 'event',
        body: handler.body,
      });
      rest = body.slice(handler.length).replace(/^\s*\)\s*;?\s*/, '');
      continue;
    }

    // <target>.prop = <literal>;
    const assign = /^\.([A-Za-z0-9_$]+)\s*=\s*/.exec(after);
    if (assign) {
      const body = after.slice(assign[0].length);
      const lit = readLiteral(body);
      if (!lit) return null;
      fields.push({ node: target.node, prop: assign[1], value: lit.text });
      rest = body.slice(lit.length).replace(/^\s*;?\s*/, '');
      continue;
    }

    return null; // anything else — a hard stop, on purpose
  }

  return { fields, methods };
}

/** Read an arrow function body — either `{ … }` or a single expression. */
function readArrowBody(s) {
  if (s[0] === '{') {
    const end = matchBracket(s, 0, '{', '}');
    if (end === -1) return null;
    return { body: s.slice(1, end).trim(), length: end + 1 };
  }
  // Expression body: runs to the `)` that closes addEventListener.
  let depth = 0;
  let quote = null;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (quote) { if (c === quote && s[k - 1] !== '\\') quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (c === ')' && depth === 0) {
        const expr = s.slice(0, k).trim();
        return expr ? { body: `${expr};`, length: k } : null;
      }
      depth--;
    }
  }
  return null;
}

/** Read a JSON-ish literal (array, object, string, number, boolean, null). */
function readLiteral(s) {
  const c = s[0];
  if (c === '[' || c === '{') {
    const end = matchBracket(s, 0, c, c === '[' ? ']' : '}');
    if (end === -1) return null;
    return { text: s.slice(0, end + 1), length: end + 1 };
  }
  const scalar = /^(?:'[^']*'|"[^"]*"|-?\d+(?:\.\d+)?|true|false|null)/.exec(s);
  return scalar ? { text: scalar[0], length: scalar[0].length } : null;
}

function matchBracket(s, from, open, close) {
  let depth = 0;
  let quote = null;
  for (let k = from; k < s.length; k++) {
    const c = s[k];
    if (quote) { if (c === quote && s[k - 1] !== '\\') quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return k; }
  }
  return -1;
}

// ── Emission ───────────────────────────────────────────────────────────────

// Two spaces per level, starting at two levels in — so the template body sits at
// four, aligned under `template:`, and nesting reads like ordinary HTML.
const INDENT = '  ';

/** `esa-switch-toggle` → `SwitchToggle`. */
/**
 * Wrap an attribute value in quotes that its own contents cannot break.
 *
 * Emission hardcoded `"` with no escaping, so a value the tokenizer had CORRECTLY read
 * out of a single-quoted attribute came back out as label="he said "hi"" — markup that
 * does not parse, in a generator whose whole job is to not hand an Angular developer
 * something wrong. Prefer double quotes (every existing snippet keeps its shape); fall
 * back to single when the value contains one, and to &quot; only if it contains both.
 */
function quoted(value) {
  const v = String(value);
  if (!v.includes('"')) return `"${v}"`;
  if (!v.includes("'")) return `'${v}'`;
  return `"${v.replace(/"/g, '&quot;')}"`;
}

function pascal(slug) {
  return slug.replace(/^esa-/, '').split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

/** `pagechange` → `onPagechange`. The event name is NOT re-cased on the way in. */
function handlerName(event) {
  const cleaned = event.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return `on${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

/**
 * Assemble the final component. Kept separate from the walk so the emitted shape
 * is one readable function rather than string-building smeared across a
 * recursion.
 */
export function emitComponent({ slug, template, imports, fields, methods }) {
  const name = `${pascal(slug)}Demo`;
  const lines = [];
  lines.push("import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';");
  for (const tag of imports) lines.push(`import '@esa/ecology/${tag}';`);
  lines.push('');
  lines.push('@Component({');
  lines.push(`  selector: 'app-${slug.replace(/^esa-/, '')}-demo',`);
  lines.push('  standalone: true,');
  lines.push('  schemas: [CUSTOM_ELEMENTS_SCHEMA],');
  lines.push('  template: `');
  lines.push(template);
  lines.push('  `,');
  lines.push('})');

  const body = [];
  for (const f of fields) body.push(`  ${f.name} = ${f.value};`);
  for (const m of methods) {
    if (body.length) body.push('');
    body.push(`  ${m.name}(event: Event) {`);
    // The cast IS the lesson: these are CustomEvents, so the payload is on
    // `.detail`. `$event.target.value` reads empty on every one of them.
    body.push(`    const ${m.param} = event as CustomEvent;`);
    for (const l of m.body.split('\n')) body.push(`    ${l.trim()}`);
    body.push('  }');
  }
  lines.push(body.length ? `export class ${name} {\n${body.join('\n')}\n}` : `export class ${name} {}`);
  return lines.join('\n');
}

// ── The walk ───────────────────────────────────────────────────────────────

/**
 * @param {string} code  the exact string the HTML tab already shows
 * @param {object} ctx
 * @param {Record<string, import('./component-api.mjs').ComponentApi>} ctx.api
 * @param {Set<string>} ctx.elements  tags that are REAL custom elements (Lit `.ts`)
 * @param {string} ctx.slug           the page's component slug
 * @returns {{ok: true, code: string, uses: string[]} | {ok: false, reason: string}}
 */
export function toAngular(code, ctx) {
  const { api = {}, elements = new Set(), slug = 'esa-component' } = ctx ?? {};

  let nodes;
  try {
    nodes = parseFragment(code);
  } catch (err) {
    return { ok: false, reason: `parse-failed: ${err.message}` };
  }

  const elementNodes = [];
  const scripts = [];
  collect(nodes);
  function collect(list) {
    for (const n of list) {
      if (n.kind === 'script') { scripts.push(n); continue; }
      if (n.kind !== 'element') continue;
      elementNodes.push(n);
      collect(n.children);
    }
  }

  // A Pascal-cased tag is an Astro component — compile-time only, with no custom
  // element behind it. There is nothing for Angular to instantiate.
  const pascalTag = elementNodes.find((n) => /^[A-Z]/.test(n.tag));
  if (pascalTag) return { ok: false, reason: `astro-component-tag: <${pascalTag.tag}>` };

  const esaTags = [...new Set(elementNodes.filter((n) => n.tag.startsWith('esa-')).map((n) => n.tag))];
  if (!esaTags.length) return { ok: false, reason: 'no-custom-element' };

  for (const tag of esaTags) {
    // `esa-badge` and friends are `.astro`: writing the tag in HTML renders
    // nothing at all. Showing it in an Angular template would be a lie.
    if (!elements.has(tag)) return { ok: false, reason: `not-a-custom-element: <${tag}>` };
    if (!api[tag]) return { ok: false, reason: `unknown-tag: <${tag}>` };
  }

  // Scripts: resolve aliases against the parsed markup, then translate.
  const fields = [];
  const methods = [];
  const takenNames = new Set();
  for (const script of scripts) {
    const members = scriptToMembers(script.text, (selector) => resolveNode(elementNodes, selector));
    if (!members) return { ok: false, reason: 'script-grammar' };

    for (const f of members.fields) {
      const prop = api[f.node.tag]?.props?.find((p) => (p.propertyName ?? p.name) === f.prop);
      // Assigning something the component does not declare is a demo detail we
      // cannot express as a binding.
      if (!prop) return { ok: false, reason: `unknown-property: ${f.node.tag}.${f.prop}` };
      const name = unique(f.prop, takenNames);
      fields.push({ name, value: f.value });
      f.node.bindings ??= [];
      f.node.bindings.push(`[${f.prop}]="${name}"`);
    }
    for (const m of members.methods) {
      const name = unique(handlerName(m.event), takenNames);
      methods.push({ name, param: m.param, body: m.body });
      m.node.bindings ??= [];
      // The event name is copied through exactly as written. Angular hands it to
      // addEventListener unchanged, so `(pageChange)` would never fire.
      m.node.bindings.push(`(${m.event})="${name}($event)"`);
    }
  }

  // Render the template from the parsed tree.
  let bail = null;
  const template = nodes.map((n) => render(n, 2)).filter((s) => s !== null).join('\n');
  if (bail) return { ok: false, reason: bail };
  if (!template.trim()) return { ok: false, reason: 'empty-template' };

  function render(node, depth) {
    const pad = INDENT.repeat(depth);
    if (node.kind === 'script') return null; // consumed into the class body
    if (node.kind === 'comment') return `${pad}<!--${node.text}-->`;
    if (node.kind === 'text') {
      const t = node.text.trim();
      return t ? `${pad}${t}` : null;
    }

    const nodeApi = api[node.tag];
    const parts = [];
    for (const a of node.attrs) {
      const how = classifyAttr(node.tag, a.name, nodeApi);
      if (how === 'event') { bail ??= `inline-handler: ${a.name}`; return null; }
      if (how === 'property') {
        const prop = nodeApi.props.find((p) => p.name === a.name);
        const propName = prop?.propertyName ?? a.name;
        parts.push(`[${propName}]=${quoted(a.value ?? '')}`);
        continue;
      }
      // VERBATIM — including bare booleans and JSON-in-an-attribute.
      parts.push(a.value === null ? a.name : `${a.name}=${quoted(a.value)}`);
    }
    for (const b of node.bindings ?? []) parts.push(b);

    // A binding turns a short tag into a long one fast — `[pageSizeOptions]` plus
    // `(pagechange)` runs past 100 columns on its own. Past the threshold each
    // attribute takes its own line, which is also how the HTML tab writes them.
    const oneLine = parts.length ? `<${node.tag} ${parts.join(' ')}>` : `<${node.tag}>`;
    const wrap = oneLine.length + pad.length > 88;
    const open = wrap
      ? `<${node.tag}\n${parts.map((p) => `${pad}  ${p}`).join('\n')}\n${pad}>`
      : oneLine;
    if (node.selfClosing) {
      if (!parts.length) return `${pad}<${node.tag} />`;
      return wrap
        ? `${pad}<${node.tag}\n${parts.map((p) => `${pad}  ${p}`).join('\n')}\n${pad}/>`
        : `${pad}<${node.tag} ${parts.join(' ')} />`;
    }
    const kids = node.children.map((c) => render(c, depth + 1)).filter((s) => s !== null);
    if (!kids.length) return `${pad}${open}</${node.tag}>`;
    // A lone text child stays on one line — `<button>Submit</button>`, not three
    // lines. Only when the open tag itself did not have to wrap.
    if (!wrap && kids.length === 1 && node.children.length === 1 && node.children[0].kind === 'text') {
      return `${pad}${open}${node.children[0].text.trim()}</${node.tag}>`;
    }
    return `${pad}${open}\n${kids.join('\n')}\n${pad}</${node.tag}>`;
  }

  // A stray backtick would close the `template:` literal, and a `${` would
  // interpolate instead of printing — the same class of mistake that once took a
  // whole doc page down from inside a Lit `css` comment, and the `${` half is the
  // one that still PARSES. Refuse rather than emit something that does not compile.
  if (/`/.test(template)) return { ok: false, reason: 'backtick-in-template' };
  if (/\$\{/.test(template)) return { ok: false, reason: 'interpolation-in-template' };

  return {
    ok: true,
    code: emitComponent({ slug, template, imports: esaTags, fields, methods }),
    uses: esaTags,
  };
}

/**
 * Find the single element a script statement refers to. A `null` selector asks
 * for the sample's sole custom element — what `el`, `chart` and `summary` mean.
 * Ambiguity is a refusal in every case, not a coin flip.
 */
function resolveNode(elementNodes, selector) {
  if (selector === null) {
    const custom = elementNodes.filter((n) => n.tag.startsWith('esa-'));
    return custom.length === 1 ? custom[0] : null;
  }
  const hits = selector.startsWith('#')
    ? elementNodes.filter((n) => n.attrs.some((a) => a.name === 'id' && a.value === selector.slice(1)))
    : elementNodes.filter((n) => n.tag === selector);
  return hits.length === 1 ? hits[0] : null;
}

function unique(base, taken) {
  let name = base;
  let n = 2;
  while (taken.has(name)) name = `${base}${n++}`;
  taken.add(name);
  return name;
}
