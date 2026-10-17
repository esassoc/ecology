// The design layer's Astro adapter: registers the panel as a dev-toolbar app,
// serves the saved tweaks on every dev page, and wires the toolbar's channel to
// the store. Registers only under `astro dev`, so a build never sees it.
//
//   // astro.config.mjs
//   import designLayer from '@esa/design-layer/astro';
//   export default defineConfig({ integrations: [designLayer()] });
//
// The spoke's controls come from design-layer.config.mjs at its root (optional;
// the hub defaults apply without one). Editing that file restarts the dev server.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../src/defaults.mjs';
import { createStore } from '../src/store.mjs';

const EVENT = 'design-layer';
const CSS_ROUTE = '/__design-layer/tweaks.css';
const CONFIG_FILE = 'design-layer.config.mjs';
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-.5a2 2 0 0 1 2-2h1.5A4.5 4.5 0 0 0 22 13 10 10 0 0 0 12 2Z"/></svg>';

/** @param {import('../src/types').DesignLayerConfig} [inline] config given in astro.config, over the file's */
export default function designLayer(inline = {}) {
  /** @type {ReturnType<typeof createStore> | null} */
  let store = null;

  return {
    name: '@esa/design-layer',
    hooks: {
      'astro:config:setup': async ({ command, config, addDevToolbarApp, addWatchFile, injectScript, updateConfig, logger }) => {
        if (command !== 'dev') return;
        const configUrl = new URL(CONFIG_FILE, config.root);
        let spoke = {};
        if (existsSync(configUrl)) {
          addWatchFile(configUrl);
          try {
            spoke = (await import(`${configUrl.href}?t=${Date.now()}`)).default ?? {};
          } catch (err) {
            logger.error(`${CONFIG_FILE} failed to load, using the hub defaults: ${err.message}`);
          }
        }
        const resolved = resolveConfig({ ...spoke, ...inline });
        store = createStore(fileURLToPath(new URL(`${resolved.dataDir.replace(/\/?$/, '/')}`, config.root)));
        updateConfig({
          vite: { define: { __DESIGN_LAYER_CONFIG__: JSON.stringify({ config: resolved, cssRoute: CSS_ROUTE }) } },
        });
        addDevToolbarApp({
          id: 'design-layer',
          name: 'Design Layer',
          icon: ICON,
          entrypoint: fileURLToPath(new URL('./toolbar-app.ts', import.meta.url)),
        });
        // The saved tweaks, on every page, after the theme (the selectors in
        // tweaks.css outrank the theme's, so load order does not matter).
        injectScript('head-inline', `{const l=document.createElement('link');l.rel='stylesheet';l.id='design-layer-tweaks';l.href='${CSS_ROUTE}?'+Date.now();document.head.append(l);}`);
        // Comment mode records each element's Astro source. The toolbar's audit
        // app removes data-astro-source-* once it starts (after DOMContentLoaded),
        // so keep a copy.
        injectScript('head-inline', `document.addEventListener('DOMContentLoaded',()=>{const m=new WeakMap();for(const e of document.querySelectorAll('[data-astro-source-file]'))m.set(e,[e.getAttribute('data-astro-source-file'),e.getAttribute('data-astro-source-loc')]);window.__designLayerSources=m;});`);
      },
      'astro:server:setup': ({ server, toolbar }) => {
        if (!store) return;
        const s = store;
        server.middlewares.use(CSS_ROUTE, (_req, res) => {
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-store');
          res.end(s.css());
        });
        const sendState = () => toolbar.send(`${EVENT}:state`, s.state());
        toolbar.on(`${EVENT}:load`, sendState);
        toolbar.on(`${EVENT}:save-tweaks`, (data) => { s.saveTweaks(data); sendState(); });
        toolbar.on(`${EVENT}:add-comment`, (record) => { s.addComment(record); sendState(); });
        toolbar.on(`${EVENT}:set-status`, (data) => { s.setStatus(data); sendState(); });
      },
    },
  };
}

