// Recover the component identity the bundler erased: which cbf-* / esa-*
// components compose this page, and where their source lives. We derive the set
// of BEM block roots from the rendered class names, then resolve each to a
// `<block>.astro` (or `.ts`) file in the provided source roots.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// `esa-icon-link__label` / `esa-app-bar--brand` → block root `esa-app-bar`.
function blockRoot(className) {
  return className.split('__')[0].split('--')[0];
}

async function walkAstro(dir, hits = []) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return hits;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walkAstro(full, hits);
    else if (/\.(astro|ts)$/.test(e.name) && /^(esa|cbf)-/.test(e.name)) hits.push(full);
  }
  return hits;
}

export async function mapComponents(html, sourceRoots) {
  // Index every component source file by its basename block (esa-badge, cbf-hero).
  const fileIndex = new Map();
  for (const root of sourceRoots) {
    for (const file of await walkAstro(root)) {
      const block = file.split('/').pop().replace(/\.(astro|ts)$/, '');
      if (!fileIndex.has(block)) fileIndex.set(block, file);
    }
  }

  // Distinct block roots present in the rendered markup, esa-/cbf- only.
  const blocks = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (/^(esa|cbf)-/.test(cls)) blocks.add(blockRoot(cls));
    }
  }

  return [...blocks].sort().map((block) => ({
    component: block,
    source: fileIndex.get(block) || null,
    origin: block.startsWith('cbf-') ? 'spoke' : 'hub',
  }));
}
