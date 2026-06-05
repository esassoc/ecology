import { defineConfig } from 'astro/config';

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
});
