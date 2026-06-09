/**
 * Prefix a root-relative path with Astro's configured `base`.
 *
 * Use for anything Astro WON'T rewrite for us: `public/` asset references
 * (`<img src>`, CSS `url()`) and hand-written internal links/redirects.
 * Assets imported through the build pipeline already get the base — don't
 * wrap those.
 *
 * `import.meta.env.BASE_URL` always ends in `/` (e.g. `/__SPOKE_DIR__/` in a
 * production build, `/` in dev), so we strip any leading slash from `path`
 * to avoid a doubled separator.
 */
export const withBase = (path: string): string =>
  import.meta.env.BASE_URL + path.replace(/^\//, '');
