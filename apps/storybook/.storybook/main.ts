import type { StorybookConfig } from '@storybook/web-components-vite';

/**
 * Storybook covers the LIT half of @esa/ecology only.
 *
 * The 31 .astro components have no official Storybook renderer — Astro compiles to
 * server-rendered HTML and cannot mount in Storybook's client-side canvas. They are
 * documented by apps/site, which generates their API tables from source
 * (apps/site/src/data/component-api.ts) and cannot drift. Do not add a community
 * Astro framework here without deciding that question deliberately.
 *
 * NOTE on @storybook/addon-mcp: it is React-only as of Storybook 10.5 — Storybook's
 * own docs say the manifests and MCP server support React first, with Web Components
 * on the roadmap. Installing it here would resolve but expose nothing. Revisit when
 * web-components support ships.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],

  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],

  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },

  /**
   * COMPOSITION — the .astro half appears in this sidebar under "Astro (.astro)".
   *
   * It is a genuinely separate Storybook (apps/storybook-astro, port 6007) running
   * @storybook-astro/framework, because `framework` above is singular: one framework
   * per instance. `refs` embeds its index here so the two read as one UI.
   *
   * Both servers must be up: `npm run storybook` runs them together.
   */
  refs: {
    astro: {
      title: 'Astro (.astro)',
      url: 'http://localhost:6007',
      expanded: true,
      // Storybook v10 fetches a ref's /index.json WITH credentials, and the dev
      // server answers `Access-Control-Allow-Origin: *`, which a browser rejects
      // outright in credentials mode. Symptom: the section header renders, no
      // components appear beneath it, and NOTHING is reported in the Storybook UI
      // — the failure is console-only. See storybookjs/storybook#33724.
      // Never verify this with curl: curl does not enforce CORS, so the wildcard
      // looks perfectly fine there while every browser rejects it.
      credentials: 'omit',
    },
  },

  async viteFinal(config) {
    // themes.css and the token CSS live outside apps/storybook (in apps/site and
    // packages/tokens). Vite blocks reads above the project root unless told
    // otherwise — allow the workspace root so the real files are served, rather
    // than copying them here and inviting drift.
    config.server ??= {};
    config.server.fs ??= {};
    config.server.fs.allow = [...(config.server.fs.allow ?? []), '../..'];
    return config;
  },
};

export default config;
