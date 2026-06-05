/**
 * Prefix a root-relative path with the CONSUMING app's configured Astro `base`.
 *
 * `import.meta.env.BASE_URL` is replaced at build time by the app that imports
 * this package (Vite resolves it per-build), so the same helper yields `/` in the
 * hub site and `/cb-fish-design/` in the GitHub-Pages spoke — no configuration.
 * Always ends in `/`, so we strip a leading slash to avoid a doubled separator.
 */
export const withBase = (path: string): string =>
  import.meta.env.BASE_URL + path.replace(/^\//, '');
