// Astro integration that registers the Dev Handoff inspector as a first-class app
// in Astro's own dev toolbar — no `?dev` query, no injected <script>. The icon
// appears alongside Astro's built-in tools; clicking it toggles the inspector.
//
//   // astro.config.mjs
//   import handoff from '@esa/handoff/integration';
//   export default defineConfig({ integrations: [handoff({ manifest: '/handoff/home/manifest.json' })] });
import { fileURLToPath } from 'node:url';

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m8 9 3 3-3 3"/><path d="M14 15h3"/>
  <rect width="18" height="16" x="3" y="4" rx="2"/></svg>`;

export default function handoff(options = {}) {
  const manifest = options.manifest || '/handoff/home/manifest.json';
  return {
    name: '@esa/handoff',
    hooks: {
      'astro:config:setup': ({ addDevToolbarApp, updateConfig }) => {
        // Expose the manifest path to the (Vite-bundled) toolbar app.
        updateConfig({
          vite: { define: { __HANDOFF_MANIFEST__: JSON.stringify(manifest) } },
        });
        addDevToolbarApp({
          id: 'esa-handoff',
          name: 'Dev Handoff',
          icon: ICON,
          entrypoint: fileURLToPath(new URL('./toolbar-app.js', import.meta.url)),
        });
      },
    },
  };
}
