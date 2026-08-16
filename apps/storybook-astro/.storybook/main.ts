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
    return config;
  },
};

export default config;
