import { defineConfig } from 'astro/config';

// Intentionally minimal. The site ships zero client JS except the small inline
// theme-switcher script — everything else is static HTML/CSS, which is the point:
// the rendered output is the legible, framework-agnostic handoff artifact.
export default defineConfig({});
