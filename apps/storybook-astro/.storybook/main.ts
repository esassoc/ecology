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
    return config;
  },
};

export default config;
