// Write one prototype's bundle: a spec (and parts) plus two screenshots per section,
// manifest.json for the inspector, and README.md as the prototype's front door.
// And, across bundles, the spoke's handoff/index.md.
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deployedUrl } from './config.mjs';
import { renderSpec, renderReadme, renderIndex, slugify } from './spec.mjs';

/** Where `cfg.out` is served from: `public/handoff` → `handoff`. */
export const servedPath = (cfg) => cfg.out.replace(/^\.?\/?(public|static)\//, '').replace(/\/+$/, '');

const guideOf = (spec) => {
  const g = {};
  for (const k of ['intent', 'decisions', 'gotchas', 'acceptance']) if (spec?.[k]) g[k] = spec[k];
  return Object.keys(g).length ? g : undefined;
};
export { guideOf };

/**
 * @param {import('./config.mjs').HandoffConfig} cfg
 * @param {{dir:string, title:string, description?:string, url:string, theme:string|null,
 *   generatedFrom:'spec'|'derived', data?:object, sections:object[]}} b
 */
export function writeBundle(cfg, b) {
  const outDir = join(cfg.root, cfg.out, b.dir);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'claude'), { recursive: true });
  const served = servedPath(cfg);
  const urlIn = (rel) => deployedUrl(cfg, `${served}/${b.dir}/${rel}`);

  const used = new Set();
  const sections = b.sections.map((s) => {
    let fileSlug = slugify(s.label);
    while (used.has(fileSlug)) fileSlug += '-2';
    used.add(fileSlug);

    const shots = {};
    for (const kind of ['desktop', 'phone'])
      if (s.shots?.[kind]) {
        const name = `${fileSlug}.${kind}.png`;
        writeFileSync(join(outDir, 'claude', name), s.shots[kind]);
        shots[kind] = name;
      }
    const files = renderSpec(
      { ...s, shots },
      {
        fileSlug,
        budget: cfg.budget,
        urlFor: (name) => urlIn(`claude/${name}`),
        prototype: b.title,
        sourceUrl: b.url,
        target: cfg.target,
      }
    );
    for (const f of files) writeFileSync(join(outDir, 'claude', f.name), f.text);

    return {
      label: s.label,
      tag: s.tag,
      selector: s.selector,
      apply: s.apply,
      html: s.html,
      css: s.css,
      guide: s.guide,
      tokens: s.tokens,
      components: s.components,
      data: s.data,
      claudePath: `claude/${files[0].name}`,
      repoPath: relative(cfg.root, join(outDir, 'claude', files[0].name)),
      parts: files.slice(1).map((f) => `claude/${f.name}`),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, `claude/${v}`])),
      bytes: files.reduce((n, f) => n + Buffer.byteLength(f.text), 0),
      files: files.length,
      collapsed: s.stats?.collapsed ?? 0,
    };
  });

  const manifest = {
    name: b.slug,
    title: b.title,
    description: b.description,
    dir: b.dir,
    url: b.url,
    // The deployed bundle, so a link copied from a dev page still points an agent somewhere it can read.
    baseUrl: urlIn(''),
    theme: b.theme,
    generatedFrom: b.generatedFrom,
    data: b.data,
    sections,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(outDir, 'README.md'), renderReadme(manifest, { urlFor: urlIn }));
  return manifest;
}

/** Rebuild handoff/index.md from every manifest on disk, in registry order. */
export function writeIndex(cfg, targets, bundleSlug) {
  const served = servedPath(cfg);
  const bundles = [];
  const seen = new Set();
  for (const t of targets) {
    const dir = bundleSlug(t.route);
    const file = join(cfg.root, cfg.out, dir, 'manifest.json');
    if (seen.has(dir) || !existsSync(file)) continue;
    seen.add(dir);
    try {
      const m = JSON.parse(readFileSync(file, 'utf8'));
      if (Array.isArray(m.sections)) bundles.push({ ...m, dir, title: m.title || t.title });
    } catch {
      /* unreadable manifest: leave it out rather than fail the run */
    }
  }
  const text = renderIndex(cfg.name, bundles, { baseUrl: deployedUrl(cfg, `${served}/`), budget: cfg.budget });
  writeFileSync(join(cfg.root, cfg.out, 'index.md'), text);
  return { count: bundles.length, bytes: Buffer.byteLength(text) };
}
