/*
 * site-harness.mjs — serve the built specimen site and drive it in a real browser.
 *
 * EXTRACTED, NOT COPIED. This was inline in a11y-audit.mjs until check-target-size.mjs
 * needed the same four things: discover the build's routes, detect its base path,
 * serve it, and WAIT FOR CUSTOM ELEMENTS TO UPGRADE. Copying it would have been the
 * cheaper edit and the wrong one — the hydration guard below is the piece that stops
 * an audit reporting a confident all-clear on a page that never rendered, and a kit
 * that is half web components cannot afford two copies of that where only one gets
 * fixed. The same argument that keeps typography.css single-sourced into shadow DOM.
 *
 * Everything here is dependency-free except playwright, which the callers import.
 */

import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

/** Every route in the build, derived from the index.html files it emitted. */
export function discoverRoutes(dir, prefix = '') {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) routes.push(...discoverRoutes(full, `${prefix}/${entry}`));
    else if (entry === 'index.html') routes.push(prefix === '' ? '/' : `${prefix}/`);
  }
  return routes.sort();
}

/**
 * The production build sets `base: '/ecology/'`, so emitted HTML references
 * `/ecology/_astro/…` while the files sit at `dist/_astro/…`. Serving dist at
 * root therefore 404s every script and NOTHING HYDRATES — which does not fail,
 * it just quietly audits the pre-hydration shell and reports a clean bill of
 * health for components that never rendered. Detect the base from the build's
 * own markup and strip it. (This is not hypothetical; it shipped that way for
 * one afternoon and produced a confidently wrong result.)
 */
export function detectBase(root) {
  try {
    const html = readFileSync(path.join(root, 'index.html'), 'utf8');
    const m = html.match(/(?:src|href)="(\/[^/"]+\/)_astro\//);
    return m ? m[1] : '/';
  } catch {
    return '/';
  }
}

/** Minimal static server for dist — no dependency, and it dies with the process. */
export function serve(root, base = '/') {
  const server = createServer((req, res) => {
    let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (base !== '/' && url.startsWith(base)) url = '/' + url.slice(base.length);
    let file = path.join(root, url);
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/**
 * Wait for every custom element on the page to upgrade. Without this we audit
 * the pre-hydration HTML — which for a kit that is half web components means
 * auditing empty tags and getting a meaningless all-clear.
 */
export const AWAIT_UPGRADE = `(async () => {
  const tags = [...new Set([...document.querySelectorAll('*')]
    .map((el) => el.tagName.toLowerCase()).filter((t) => t.includes('-')))];
  await Promise.race([
    Promise.all(tags.map((t) => customElements.whenDefined(t))),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // Report back so a page that never hydrated cannot pass as clean.
  return { tags, notUpgraded: tags.filter((t) => !customElements.get(t)) };
})()`;

/**
 * Boot the whole thing: resolve routes, start the server if needed, return an
 * origin to point a browser at. Callers close `server` themselves.
 */
export async function bootSite({ dist, url = null, filter = null, log = console.log }) {
  if (url) return { origin: url, routes: ['/'], server: null };
  if (!existsSync(dist)) {
    throw new Error(`No build at ${dist}. Run \`npm run build\` first, or pass --url.`);
  }
  const base = detectBase(dist);
  const { server, port } = await serve(dist, base);
  if (base !== '/') log(`Build base is ${base} — stripping it when serving.`);
  let routes = discoverRoutes(dist);
  if (filter) routes = routes.filter((r) => r.includes(filter));
  return { origin: `http://127.0.0.1:${port}`, routes, server };
}
