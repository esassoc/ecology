import { defineConfig } from "astro/config";

// Minimal config so @storybook-astro/framework can boot Astro's Container API.
// No integrations — the .astro half of @esa/ecology is presentational, no islands.
export default defineConfig({});
