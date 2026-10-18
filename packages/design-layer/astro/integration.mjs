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
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../src/defaults.mjs';
import { createStore } from '../src/store.mjs';
import { planPromotion } from '../src/promote.mjs';

const EVENT = 'design-layer';
const CSS_ROUTE = '/__design-layer/tweaks.css';
// The panel's face, served by the integration: the package sits outside the
// spoke's root (a file: link resolves to the hub), where Vite refuses to serve.
const FONT_ROUTE = '/__design-layer/inter-variable.woff2';
const FONT_FILE = fileURLToPath(new URL('../assets/inter-variable.woff2', import.meta.url));
const CONFIG_FILE = 'design-layer.config.mjs';
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-.5a2 2 0 0 1 2-2h1.5A4.5 4.5 0 0 0 22 13 10 10 0 0 0 12 2Z"/></svg>';

/** @param {import('../src/types').DesignLayerConfig} [inline] config given in astro.config, over the file's */
export default function designLayer(inline = {}) {
  /** @type {ReturnType<typeof createStore> | null} */
  let store = null;
  /** @type {import('../src/types').ResolvedConfig | null} */
  let cfg = null;
  let root = '';

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
        cfg = resolved;
        root = fileURLToPath(config.root);
        store = createStore(fileURLToPath(new URL(`${resolved.dataDir.replace(/\/?$/, '/')}`, config.root)));
        updateConfig({
          vite: { define: { __DESIGN_LAYER_CONFIG__: JSON.stringify({ config: resolved, cssRoute: CSS_ROUTE, fontUrl: FONT_ROUTE }) } },
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
        // The same pass stamps each Astro component's root with its name
        // (data-dl-component), the selector a component-scoped edit falls back
        // to when the root carries no class named for it. And the page's path
        // goes on <html> (data-dl-page), which instance-scoped edits key on.
        injectScript('head-inline', `document.documentElement.setAttribute('data-dl-page',location.pathname);document.addEventListener('DOMContentLoaded',()=>{const m=new WeakMap(),A='data-astro-source-file';for(const e of document.querySelectorAll('['+A+']')){const f=e.getAttribute(A);m.set(e,[f,e.getAttribute('data-astro-source-loc')]);const p=e.parentElement;if(!/\\/(pages|layouts)\\//.test(f)&&(!p||p.getAttribute(A)!==f))e.setAttribute('data-dl-component',f.split('/').pop().replace(/\\.astro$/,''));}window.__designLayerSources=m;});`);
      },
      'astro:server:setup': ({ server, toolbar }) => {
        server.middlewares.use(FONT_ROUTE, (_req, res) => {
          res.setHeader('Content-Type', 'font/woff2');
          res.setHeader('Cache-Control', 'max-age=86400');
          res.end(readFileSync(FONT_FILE));
        });
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
        toolbar.on(`${EVENT}:send-to-claude`, (data) => { s.sendToClaude(data); });
        toolbar.on(`${EVENT}:set-status`, (data) => { s.setStatus(data); sendState(); });
        // Save to Source: the plan first, then (write) the files themselves.
        toolbar.on(`${EVENT}:promote`, ({ entries, instances, write }) => {
          let promote;
          try {
            const { plan, apply } = planPromotion(root, cfg, { entries, instances });
            promote = plan;
            if (write) { apply(); promote = { ...plan, written: true }; }
          } catch (err) {
            promote = { context: 'spoke', files: [], skipped: [], instances, regenerate: [], keys: [], error: String(err?.stderr || err?.message || err).slice(0, 400) };
          }
          toolbar.send(`${EVENT}:state`, { ...s.state(), promote });
        });
      },
    },
  };
}

