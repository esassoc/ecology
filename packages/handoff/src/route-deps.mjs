// Which source files does a route's bundle depend on? Two uses:
//   - `handoff all --changed` skips a route whose inputs are byte-identical to the
//     last capture (captures are deterministic, which is what makes that safe);
//   - `handoff check --changed` gates only the routes a change touched.
//
// The import walk follows RELATIVE and src/-rooted specifiers only. Package imports
// (@esa/ecology, @esa/tokens) are not walked; the global fingerprint covers them,
// so a hub bump or a token edit invalidates every route, the safe direction to err.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, relative } from 'node:path';

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const read = (f) => {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return '';
  }
};

/** Astro resolves a route to <path>.astro or <path>/index.astro. */
export function pageFileFor(root, route) {
  const rel = route.split('?')[0].replace(/^\/+|\/+$/g, '');
  for (const candidate of [join(root, 'src/pages', `${rel}.astro`), join(root, 'src/pages', rel, 'index.astro')])
    if (existsSync(candidate)) return candidate;
  return null;
}

const EXTS = ['', '.astro', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.astro'];

function resolveSpecifier(root, spec, fromFile) {
  let base;
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else if (spec.startsWith('@/')) base = join(root, 'src', spec.slice(2)); // the TS path alias
  else if (spec.startsWith('src/')) base = join(root, spec);
  else return null; // a package: covered by the global fingerprint
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const IMPORT_RE = /(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Transitive local imports reachable from `entry`, entry included. */
export function depsOf(root, entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    for (const m of read(file).matchAll(IMPORT_RE)) {
      const next = resolveSpecifier(root, m[1] || m[2], file);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return [...seen].sort();
}

/** The files behind one route: its page, its spec, and their local imports. */
export function routeFiles(root, { route, specPath }) {
  const page = pageFileFor(root, route);
  const files = new Set(page ? depsOf(root, page) : []);
  if (specPath && existsSync(specPath)) for (const f of depsOf(root, specPath)) files.add(f);
  return [...files].sort();
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out.sort();
}

/**
 * Anything that changes how EVERY page renders: global styles and layouts, the
 * dependency list, the built token sheet (hub packages are file: links, so their
 * version string says nothing), and this package's own source.
 */
export function globalFingerprint(root, pkgDir) {
  const parts = [];
  for (const rel of ['src/styles', 'src/layouts', 'handoff.config.mjs'])
    for (const f of existsSync(join(root, rel)) && statSync(join(root, rel)).isFile() ? [join(root, rel)] : walk(join(root, rel)))
      parts.push(`${relative(root, f)}:${sha(read(f))}`);
  try {
    parts.push(`deps:${sha(JSON.stringify(JSON.parse(read(join(root, 'package.json'))).dependencies ?? {}))}`);
  } catch {
    parts.push('deps:unreadable');
  }
  parts.push(`tokens:${sha(read(join(root, 'node_modules/@esa/tokens/dist/tokens.css')))}`);
  for (const f of walk(join(pkgDir, 'src'))) parts.push(`handoff:${sha(read(f))}`);
  return sha(parts.join('|'));
}

/** Identical key ⇒ identical inputs ⇒ the capture can be skipped. */
export function routeKey(root, target, fingerprint) {
  const parts = routeFiles(root, target).map((f) => `${relative(root, f)}:${sha(read(f))}`);
  return sha(`${fingerprint}|${target.route}|${parts.join('|')}`);
}
