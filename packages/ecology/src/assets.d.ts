/**
 * Ambient types for the bundler-transformed asset imports this kit uses.
 *
 * Vite (which Astro runs) resolves `?inline` on a stylesheet to its text rather
 * than injecting it into the page. `esa-map` needs that so a third-party
 * stylesheet can be adopted into a shadow root instead of `document.head`.
 *
 * This is declared here rather than pulled from `vite/client` so `@esa/ecology`
 * does not take a type dependency on the bundler — the package ships raw source
 * and is consumed by whatever the spoke uses.
 */
declare module '*.css?inline' {
  const css: string;
  export default css;
}

/**
 * `?worker&url` asks the bundler to bundle a worker entry — resolving its own
 * imports — and hand back the URL of the emitted asset rather than a
 * constructor. `esa-map` needs the URL, not the constructor, because MapLibre
 * creates its own worker and only accepts a location.
 */
declare module '*?worker&url' {
  const url: string;
  export default url;
}
