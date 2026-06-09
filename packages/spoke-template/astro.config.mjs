import { defineConfig } from 'astro/config';

// Minimal, mirroring the ecology hub and the other spokes. The spoke ships
// static HTML/CSS; interactivity comes from the hub's Lit web components
// (self-registering) and any island scripts a prototype adds.
//
// Intended to publish to GitHub Pages as a project site, so production builds
// need the subpath as `base`. Dev stays at root for clean local URLs —
// withBase() (src/lib/base.ts) reads whichever base is active.
const base = process.env.NODE_ENV === 'production' ? '/__SPOKE_DIR__/' : '/';

export default defineConfig({
  site: 'https://esassoc.github.io',
  base,
  server: { port: 4330 },
});
