import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The build-time data modules (token-graph, theming, tier2/tier3-naming,
 * component-promises) read the token files and component sources with
 * `readFileSync` at module scope. Vite sees no IMPORT edge to those files, so
 * editing a token or a component leaves the cached module in place and the dev
 * server keeps serving the PREVIOUS analysis — silently, with no reload and no
 * warning. That is worse than a stale page: the debug views exist to be trusted,
 * and a wrong health count reads exactly like a right one.
 *
 * This watches the real inputs and invalidates the readers when they change.
 */
function watchTokenSources() {
  const WATCH = [
    path.join(ROOT, 'packages', 'tokens', 'dist'),
    path.join(ROOT, 'packages', 'tokens', 'src'),
    path.join(ROOT, 'packages', 'tokens', 'tokens'),
    path.join(ROOT, 'packages', 'ecology', 'src', 'components'),
  ];
  const READERS = [
    'token-graph.ts',
    'theming.ts',
    'tier2-naming.ts',
    'tier3-naming.ts',
    'component-promises.ts',
  ].map((f) => path.join(ROOT, 'apps', 'site', 'src', 'data', f));

  return {
    name: 'ecology:watch-token-sources',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(WATCH);
      server.watcher.on('all', (_event, file) => {
        if (!WATCH.some((dir) => file.startsWith(dir))) return;
        let hit = false;
        for (const reader of READERS) {
          const mod = server.moduleGraph.getModuleById(reader);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            hit = true;
          }
        }
        // Only reload when a debug reader was actually loaded this session —
        // otherwise every component edit would trigger a full-page reload and
        // stomp HMR for ordinary work.
        if (hit) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

// The site ships zero client JS except the small inline theme-switcher script —
// everything else is static HTML/CSS, which is the point: the rendered output is
// the legible, framework-agnostic handoff artifact.
//
// Published to GitHub Pages as a project site at https://esassoc.github.io/ecology/,
// so production builds need that subpath as `base`. Dev stays at root for clean
// local URLs — DocsShell + page links go through withBase() (@esa/docs/base), which
// reads whichever base is active, so paths resolve in both. Fonts live in src/ so
// Vite rewrites their url()s with the base automatically.
const base = process.env.NODE_ENV === 'production' ? '/ecology/' : '/';

export default defineConfig({
  site: 'https://esassoc.github.io',
  base,
  vite: { plugins: [watchTokenSources()] },
});
