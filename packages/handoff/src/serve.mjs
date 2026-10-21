// Serve a built dist/ under the spoke's base for capture. Not `astro preview`:
// since Astro 7 it backgrounds itself when run without a terminal, moves to another
// port when its own is taken, and refuses to start while any other preview runs, so
// a capture could load another checkout's build or leave a daemon behind.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.md': 'text/markdown; charset=utf-8',
  '.geojson': 'application/geo+json', '.pdf': 'application/pdf', '.wasm': 'application/wasm',
  '.mjs.map': 'application/json', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

/** @returns {Promise<{close:() => Promise<void>}>} */
export function serveDist(distDir, base, port) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(base) && path !== base.slice(0, -1)) {
      res.writeHead(404).end();
      return;
    }
    const rel = normalize(path.slice(base.length)).replace(/^(\.\.[/\\])+/, '');
    let file = join(distDir, rel);
    if (!isFile(file)) file = isFile(join(file, 'index.html')) ? join(file, 'index.html') : `${file}.html`;
    if (!isFile(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () =>
      resolve({ close: () => new Promise((r) => server.close(() => r())) })
    );
  });
}
