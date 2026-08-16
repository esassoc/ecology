/**
 * The .astro half of @esa/ecology.
 *
 * WHY THIS IS A SEPARATE APP: Storybook's `framework` field is singular — one
 * framework per Storybook instance. @storybook-astro/framework ships integrations
 * for alpinejs, preact, react, solid, svelte and vue; there is NO web-components /
 * Lit integration, so it cannot host the 35 Lit components in apps/storybook.
 * The two are stitched into one sidebar with composition (`refs`) — see
 * apps/storybook/.storybook/main.ts.
 *
 * HOW .astro RENDERS AT ALL: an .astro file has no browser runtime — it compiles to
 * a server function returning an HTML string. This framework uses Astro's Container
 * API to render server-side and pipes the HTML into the canvas over Vite's HMR
 * channel. Consequence, from the framework's own docs: changing args via the
 * Controls panel has NO EFFECT in a static build, because there is no server to
 * re-render. Controls work in `npm run storybook`, not in deployed output.
 */
/** The composing Storybook that embeds this one. Must match apps/storybook's dev port. */
const HOST_STORYBOOK = 'http://localhost:6006';

/**
 * Transpile the client-side `<script>` blocks of `.astro` components.
 *
 * Astro compiles TypeScript in `<script>` tags — that is documented, supported,
 * and what `npm run build` does (the site emits a bundled .js with the types
 * stripped). This framework does not: `preset.js` filters Astro's own Vite
 * plugins out via a list named, verbatim,
 * `ASTRO_PLUGINS_THAT_ARE_SUPPOSEDLY_NOT_NEEDED_IN_STORYBOOK`, which includes
 * the script handling. The Container API then emits
 *
 *   <script type="module" src="/…/esa-pill.astro?astro&type=script&index=0&lang.ts">
 *
 * and nothing transforms that URL, so Vite serves the raw TypeScript and the
 * browser dies on `Unexpected identifier 'as'`. It took out esa-app-shell,
 * esa-alert-box, esa-pill, esa-filter-pills and esa-filter-clear-button.
 *
 * The components are CORRECT — do not rewrite them to dodge this. This plugin
 * restores the missing step by running esbuild over those requests, and should
 * be deleted if the framework ever stops filtering the plugin out.
 */
function compileAstroClientScripts() {
  return {
    name: 'esa:compile-astro-client-scripts',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      if (!id.includes('?astro') || !id.includes('type=script') || !id.includes('lang.ts')) return null;
      const { transformWithEsbuild } = await import('vite');
      const out = await transformWithEsbuild(code, id.split('?')[0].replace(/\.astro$/, '.ts'), {
        loader: 'ts',
        target: 'es2022',
      });
      return { code: out.code, map: out.map };
    },
  };
}

const config = {
  stories: ['../src/**/*.stories.ts'],

  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],

  framework: {
    name: '@storybook-astro/framework',
    options: {},
  },

  async viteFinal(config: any) {
    // themes.css and the token CSS live outside this app (apps/site, packages/tokens).
    // Allow the workspace root so the real files are served rather than copied.
    config.server ??= {};
    config.server.fs ??= {};
    config.server.fs.allow = [...(config.server.fs.allow ?? []), '../..'];

    // CORS for composition. The host Storybook (6006) fetches this server's
    // /index.json to build its sidebar, and it sends credentials — which makes
    // the default `Access-Control-Allow-Origin: *` ILLEGAL: with credentials the
    // header must echo the exact origin. Without this the ref silently renders
    // an empty "Astro (.astro)" section: the header appears, no components under
    // it, and no error anywhere in the Storybook UI.
    //
    // Do not verify this with curl — curl does not enforce CORS, so the wildcard
    // header looks fine there while every browser rejects it.
    config.server.cors = { origin: HOST_STORYBOOK, credentials: true };

    config.plugins = [...(config.plugins ?? []), compileAstroClientScripts()];
    return config;
  },
};

export default config;
