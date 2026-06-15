/*
 * component-inventory.mjs — read a component's identity (PURPOSE + PROPS) from source.
 *
 * The decomposition evaluator's #1 rubric — "did this change duplicate a component
 * that already exists?" — can only be judged well if the judge is HANDED the full
 * catalog of what exists, by purpose + props, not asked to re-derive it. That is the
 * repo's standing law (see check-adherence.mjs's header): tool-GROUNDED critique helps;
 * ungrounded critique degrades. This module is the grounding primitive — it turns a
 * component file into the small, comparable record a judge can scan:
 *
 *   { name, file, purpose, props }
 *
 * It reads the two house conventions documented in CLAUDE.md:
 *   - PURPOSE  — the doc comment every component opens with. For .astro that's the
 *                leading `//` block inside the frontmatter fence
 *                (`// esa-card — presentational (.astro).`); for a Lit `.ts` it's the
 *                leading comment, or the comment immediately above `class X extends`.
 *   - PROPS    — `interface Props { … }` for .astro; `static properties = { … }` for
 *                decorator-free Lit `.ts` (the house pattern — no @property decorators).
 *
 * Pure string parsing (no TS/Astro compiler) so it runs anywhere Node does, like the
 * sibling check-*.mjs scripts. It is deliberately lossy: a prop list and a one-line
 * purpose are signal for a judge, not a contract. Unit-tested in component-inventory.test.mjs.
 */
import { extname, basename } from 'node:path';

// ---- Purpose extraction --------------------------------------------------

/** Leading contiguous `//` line-comment block of `text` -> joined prose (or ''). */
function leadingLineComment(text) {
  const out = [];
  let started = false;
  for (const raw of text.split('\n')) {
    const t = raw.trim();
    if (!started && t === '') continue; // skip leading blank lines
    if (t.startsWith('//')) {
      started = true;
      out.push(t.replace(/^\/\/+\s?/, ''));
      continue;
    }
    break; // first non-comment line (or a blank after the block started) ends it
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/** Leading `/* … *\/` block comment of `text` -> joined prose (or ''). */
function leadingBlockComment(text) {
  const m = text.match(/^\s*\/\*+([\s\S]*?)\*\//);
  if (!m) return '';
  return cleanBlock(m[1]);
}

/** The comment immediately above the first `class X extends …` (Lit fallback). */
function commentBeforeClass(src) {
  const m = src.match(/(\/\*[\s\S]*?\*\/|(?:^[ \t]*\/\/.*\n)+)\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+\w+/m);
  if (!m) return '';
  const c = m[1].trim();
  if (c.startsWith('/*')) return cleanBlock(c.replace(/^\/\*+|\*+\/$/g, ''));
  return c
    .split('\n')
    .map((l) => l.replace(/^\s*\/\/+\s?/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const cleanBlock = (inner) =>
  inner
    .split('\n')
    .map((l) => l.replace(/^\s*\*+\s?/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Frontmatter inner (between the first `--- … ---` fence) or the whole src. */
function frontmatter(src) {
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return fm ? fm[1] : src;
}

/** A component's one-paragraph purpose, read from its doc comment. */
export function extractPurpose(src, ext) {
  const scope = ext === '.astro' ? frontmatter(src) : src;
  return (
    leadingLineComment(scope) ||
    leadingBlockComment(scope) ||
    (ext !== '.astro' ? commentBeforeClass(src) : '')
  );
}

// ---- Props extraction ----------------------------------------------------

/** Brace-matched body of the first construct matching `re` (e.g. `interface Props {`). */
function bracedBody(src, re) {
  const i = src.search(re);
  if (i === -1) return '';
  const open = src.indexOf('{', i);
  if (open === -1) return '';
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, j);
    }
  }
  return '';
}

/**
 * Top-level `key:` member names inside a `{ … }` body. Splits on `;`/`,`/newline at
 * brace/bracket/paren/angle depth 0, then reads the leading identifier of each segment.
 * Nested object types (`foo: { bar: … }`) contribute only `foo`, never `bar`.
 */
function topLevelKeys(body) {
  if (!body) return [];
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const keys = [];
  let depth = 0;
  let seg = '';
  const flush = () => {
    const m = seg.match(/^\s*(?:readonly\s+)?["'`]?([A-Za-z_$][\w$]*)["'`]?\s*\??\s*:/);
    if (m) keys.push(m[1]);
    seg = '';
  };
  for (const ch of clean) {
    if ('{[(<'.includes(ch)) {
      depth++;
      seg += ch;
    } else if ('}])>'.includes(ch)) {
      depth = Math.max(0, depth - 1);
      seg += ch;
    } else if (depth === 0 && (ch === ';' || ch === ',' || ch === '\n')) {
      flush();
    } else {
      seg += ch;
    }
  }
  flush();
  return [...new Set(keys)];
}

/** A component's prop names: `interface Props` for .astro, `static properties` for Lit. */
export function extractProps(src, ext) {
  if (ext === '.ts' || ext === '.js' || ext === '.mjs') {
    return topLevelKeys(bracedBody(src, /static\s+properties\s*=\s*\{/));
  }
  return topLevelKeys(bracedBody(src, /interface\s+Props\s*\{/));
}

// ---- Public record -------------------------------------------------------

/** The kebab component name from a path: esa-card.astro -> "esa-card". */
export function componentName(filePath) {
  return basename(filePath).replace(/\.(astro|ts|js|mjs)$/i, '');
}

/** Build the { name, file, purpose, props } record for one component source. */
export function inventoryEntry(filePath, src) {
  const ext = extname(filePath).toLowerCase();
  return {
    name: componentName(filePath),
    file: filePath,
    purpose: extractPurpose(src, ext),
    props: extractProps(src, ext),
  };
}

// ---- Reuse overlap (a GROUNDING HINT, never a verdict) -------------------

/**
 * Prop-set Jaccard overlap between two records, ignoring ubiquitous slot-ish keys
 * that say nothing about purpose (every card/section has a title). A high score is a
 * HINT to the judge to compare two components by purpose — it is not itself a finding.
 */
const GENERIC_PROPS = new Set(['class', 'className', 'id', 'style', 'children', 'slot']);

export function propOverlap(a, b) {
  const sa = new Set(a.props.filter((p) => !GENERIC_PROPS.has(p)));
  const sb = new Set(b.props.filter((p) => !GENERIC_PROPS.has(p)));
  if (sa.size === 0 || sb.size === 0) return { shared: [], jaccard: 0 };
  const shared = [...sa].filter((p) => sb.has(p));
  const union = new Set([...sa, ...sb]).size;
  return { shared, jaccard: union ? shared.length / union : 0 };
}
