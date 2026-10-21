// Recover the component identity the bundler erased: which hub (`esa-*`) and spoke
// components a section is built from, where each is defined, and, when the spoke
// declares a target map, what the receiving app already has in its place.
//
// A component is found by the block it DEFINES, not by its file name: Beacon's
// `bcn-acard` lives in `BcnActionCard.astro`, so a file-name match finds nothing.
// Each component file is scanned for the class selectors it styles; the first file
// styling a block root owns it.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

// `esa-icon-link__label` / `esa-app-bar--brand` → block root `esa-app-bar`.
export const blockRoot = (name) => name.split('__')[0].split('--')[0];

async function walk(dir, hits = []) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return hits;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, hits);
    else if (/\.(astro|ts)$/.test(e.name)) hits.push(full);
  }
  return hits;
}

/**
 * Index block root → defining file for every component under `roots`.
 * @param {{dir:string, rel:string}[]} roots  `rel` is what paths print relative to.
 * @param {string[]} prefixes
 */
export async function indexComponents(roots, prefixes) {
  const pattern = new RegExp(`\\.((?:${prefixes.join('|')})-[a-z0-9-]+?)(?:__|--|[\\s{,:.\\[>+~)])`, 'g');
  const index = new Map();
  const files = [];
  for (const { dir, rel } of roots) for (const file of (await walk(dir)).sort()) files.push({ file, path: relative(rel, file) });
  // A file named for its block (esa-badge.astro) owns it, whatever other files
  // style it: esa-collapsible styles `.esa-icon`, and sorts first.
  for (const { file, path } of files) {
    const name = file.split('/').pop().replace(/\.(astro|ts)$/, '');
    if (!index.has(name) && prefixes.some((p) => name.startsWith(`${p}-`))) index.set(name, path);
  }
  for (const { file, path } of files)
    for (const m of (await readFile(file, 'utf8')).matchAll(pattern)) if (!index.has(m[1])) index.set(m[1], path);
  return index;
}

/**
 * The components a section uses: blocks some component file under the index defines.
 * @param {{classes:string[], tags:string[]}} section
 * @returns {{name:string, origin:'hub'|'spoke', source:string|null, target:string|null}[]}
 */
export function componentsOf(section, { hubPrefix = 'esa', spokePrefix, index, target }) {
  const prefixes = [hubPrefix, spokePrefix].filter(Boolean);
  const own = new RegExp(`^(${prefixes.join('|')})-[a-z0-9-]+$`);
  const blocks = new Set();
  for (const c of section.classes) if (own.test(blockRoot(c))) blocks.add(blockRoot(c));
  // Lit components are custom elements; their tag is their name.
  for (const t of section.tags) if (own.test(t)) blocks.add(t);
  // Only blocks a component file defines: a page-local class is not a component.
  return [...blocks].filter((name) => index?.has(name)).sort().map((name) => ({
    name,
    origin: name.startsWith(`${hubPrefix}-`) ? 'hub' : 'spoke',
    source: index?.get(name) ?? null,
    target: target?.map?.[name] ?? null,
  }));
}
