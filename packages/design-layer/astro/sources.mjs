// Source stamps for the design layer, with Astro's dev toolbar off. Astro
// writes data-astro-source-file / -loc onto every element only while the
// toolbar is on (the compiler's annotateSourceFile follows devToolbar.enabled),
// and the panel needs them: they are how a click finds its component, and the
// file and line a comment records. So this plugin writes the same two
// attributes itself, from the compiler Astro already ships, before Astro
// compiles the file. Dev only; never registered when the toolbar is on.
//
// Two compilers are in use across the spokes: Astro 5's Go compiler
// (@astrojs/compiler, element nodes with byte offsets) and Astro 7's Rust one
// (@astrojs/compiler-rs, JSX nodes with character offsets). Each gives the
// opening tag's name end; the attribute goes in right after it, so nothing
// else in the file moves.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Elements Astro does not annotate either: document structure, raw text, and
// anything inside <head>.
const SKIP = new Set(['html', 'head', 'body', 'script', 'style', 'template', 'slot', 'textarea']);
const isElement = (name) => /^[a-z][a-z0-9-]*$/.test(name) && !SKIP.has(name);

/** Load whichever compiler the spoke's own Astro depends on. */
async function loadParser(root) {
  const fromRoot = createRequire(join(root, 'package.json'));
  const fromAstro = createRequire(fromRoot.resolve('astro/package.json'));
  for (const [id, kind] of [['@astrojs/compiler-rs', 'rs'], ['@astrojs/compiler', 'go']]) {
    try {
      const mod = await import(pathToFileURL(fromAstro.resolve(id)).href);
      return { kind, parse: mod.parse };
    } catch { /* not this one */ }
  }
  return null;
}

/** Insertion points, as character offsets: [index, line, column] per element. */
async function points(parser, code) {
  const out = [];
  if (parser.kind === 'rs') {
    const { ast } = parser.parse(code);
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { for (const c of n) walk(c); return; }
      if (n.type === 'JSXOpeningElement' && n.name?.type === 'JSXIdentifier' && isElement(n.name.name)) {
        if (!n.attributes?.some((a) => a.name?.name === 'data-astro-source-file')) out.push([n.name.end, n.start]);
      }
      if (n.type === 'JSXElement' && n.openingElement?.name?.name === 'head') return;
      for (const k in n) if (k !== 'frontmatter' && n[k] && typeof n[k] === 'object') walk(n[k]);
    };
    walk(ast.body ?? ast);
  } else {
    const { ast } = await parser.parse(code, { position: true });
    const bytes = Buffer.from(code);
    const toChar = (b) => bytes.subarray(0, b).toString().length;
    const walk = (n) => {
      if (n.type === 'element' && n.name === 'head') return;
      if ((n.type === 'element' || n.type === 'custom-element') && isElement(n.name) && n.position && !n.attributes?.some((a) => a.name === 'data-astro-source-file')) {
        const start = n.position.start.offset;
        out.push([toChar(start + 1 + Buffer.byteLength(n.name)), toChar(start)]);
      }
      for (const c of n.children ?? []) walk(c);
    };
    walk(ast);
  }
  return out;
}

const lineCol = (code, at) => {
  const before = code.slice(0, at);
  const line = before.split('\n').length;
  return `${line}:${at - before.lastIndexOf('\n')}`;
};

/** @returns {import('vite').Plugin} */
export function sourceStamps(root) {
  let parser;
  return {
    name: 'design-layer:source-stamps',
    enforce: 'pre',
    apply: 'serve',
    // On load, so Astro compiles the stamped text and its own recompiles
    // (which read through the plugin container) see the same.
    async load(id) {
      if (!id.endsWith('.astro') || id.includes('?') || id.includes('\0')) return null;
      parser ??= await loadParser(root);
      if (!parser) return null;
      const code = await readFile(id, 'utf8');
      let at;
      try { at = await points(parser, code); } catch { return null; }
      if (!at.length) return null;
      const file = JSON.stringify(id).slice(1, -1).replace(/"/g, '&quot;');
      let out = '';
      let last = 0;
      for (const [insert, start] of at.sort((a, b) => a[0] - b[0])) {
        out += code.slice(last, insert) + ` data-astro-source-file="${file}" data-astro-source-loc="${lineCol(code, start)}"`;
        last = insert;
      }
      return out + code.slice(last);
    },
  };
}
