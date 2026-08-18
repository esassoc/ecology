/**
 * token-bridge — hand design tokens to a library that cannot read CSS.
 *
 * WHY THIS EXISTS. Most of this kit themes itself: a component reads
 * `var(--color-content-default)`, a spoke re-points the role under
 * `[data-theme="x"]`, and the cascade does the rest. Two surfaces cannot
 * participate in that, because they are not DOM:
 *
 *   - a `<canvas>` bitmap (esa-chart, over AG Charts)
 *   - a WebGL map style (esa-map, over MapLibre GL)
 *
 * Both are painted from a JS config object. No custom property, no `@media`
 * block and no assurance profile reaches inside one. So every value that
 * matters is resolved in JS with `getComputedStyle`, handed over as a literal,
 * and RE-resolved whenever the theme moves — because neither surface recomputes
 * on a cascade change.
 *
 * This module is the shared half of that bridge. `esa-chart.ts` proved each
 * piece against a real library in a real browser; the comments below preserve
 * the failure each one prevents, because every one of them is invisible in a
 * build and only shows up at runtime, often on one engine.
 *
 * WHAT THIS IS NOT. It is not a licence to invent component-scoped tokens. The
 * bridge reads TIER-2 ROLES directly — `--color-content-default`,
 * `--color-background-elevation-raised` — exactly as `esa-chart` does. A
 * component-scoped name would add a name and no capability; see
 * `packages/tokens/SPEC.md` "The test: WOULD this component diverge, not COULD
 * it".
 */

/** Read a custom property off an element. Empty string when undeclared. */
export function readToken(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * One shared 2D context, created on first use. It is only ever used to parse
 * and rasterise a single pixel, so one per document is plenty.
 */
let colorCtx: CanvasRenderingContext2D | null | undefined;

/**
 * Normalise ANY CSS colour to an sRGB hex string a third-party library will accept.
 *
 * EVERY COLOUR CROSSING THE BOUNDARY GOES THROUGH HERE, and skipping it broke
 * Safari completely for esa-chart. Libraries ship their own colour parsers that
 * understand a narrow set of notations, and a browser is free to serialise a
 * computed colour in any equivalent form. On a wide-gamut display **Safari
 * returns `color(display-p3 0.125 0.125 0.125)`** where Chrome and Firefox
 * return `rgb(32, 32, 32)`. The parser rejects it, the surface never finishes
 * painting, and you get an empty box in Safari while it looks perfect
 * everywhere else. Nothing in the build catches that: it is a runtime failure
 * on one engine, on one class of monitor.
 *
 * A canvas 2D context is the browser's own parser, and it answers in sRGB. That
 * makes `color-mix()`, `oklch()`, named colours and the forced-colors system
 * keywords all safe by construction rather than one fix at a time — and it
 * matches this system's "emit hex only" rule for auditable colour.
 *
 * MapLibre note: its style spec accepts CSS colour strings, but its parser is
 * its own, not the browser's — the display-p3 hazard is identical.
 */
export function normalizeColor(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return fallback;

  colorCtx ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!colorCtx) return raw;
  const ctx = colorCtx;

  // Validity first: an unparseable value leaves fillStyle at whatever it was, so
  // probe from two different sentinels and require agreement.
  ctx.fillStyle = '#000000';
  const fromBlack = ((ctx.fillStyle = raw), String(ctx.fillStyle));
  ctx.fillStyle = '#ffffff';
  const fromWhite = ((ctx.fillStyle = raw), String(ctx.fillStyle));
  if (fromBlack !== fromWhite) return fallback;

  /*
   * PAINT IT, do not just re-serialise it. Reading `fillStyle` back is not a
   * conversion — WebKit happily accepts `color(display-p3 ...)` and returns the
   * same string, so a round-trip "normalisation" is a no-op on the one engine
   * that needed it. A 2d context is `colorSpace: 'srgb'` by default, so
   * rasterising one pixel and reading it back is what actually forces the gamut
   * conversion.
   */
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return a === 255
    ? `#${hex(r)}${hex(g)}${hex(b)}`
    : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

/**
 * Read a token and normalise it in one step — the common case.
 *
 * `fallback` is a LITERAL, matching the `var(--token, #literal)` discipline the
 * CSS half of the kit uses. A bridge with no fallback fails silently to
 * whatever the library's default happens to be.
 */
export function readColor(el: Element, name: string, fallback: string): string {
  return normalizeColor(readToken(el, name), fallback);
}

/**
 * Resolve a CSS system colour keyword to a concrete colour a library can parse.
 *
 * LIBRARIES DO NOT ACCEPT SYSTEM KEYWORDS. Handing one `CanvasText` throws out
 * of its colour parser, the surface never finishes painting, and it renders as
 * an EMPTY BOX — which is how a forced-colors "fix" ends up strictly worse than
 * doing nothing. Nothing catches this: axe has no forced-colors rule at all, so
 * the page audits clean while being blank for exactly the users the mode exists
 * to serve.
 *
 * The browser will do the resolution for us: a keyword assigned to a real
 * element comes back from `getComputedStyle` already resolved to the user's
 * actual chosen colour. `mount` is where the probe is attached — pass a node
 * inside the same root as the surface being themed, so it inherits the same
 * cascade.
 */
export function systemColor(mount: ParentNode, keyword: string, fallback: string): string {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;width:0;height:0;opacity:0;color:${keyword}`;
  mount.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return normalizeColor(resolved, fallback);
}

/** Whether the user has asked for reduced motion right now. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Whether a forced-colors mode is active right now. */
export function forcedColorsActive(): boolean {
  return window.matchMedia('(forced-colors: active)').matches;
}

/** The document's current colour scheme, as this kit records it. */
export function currentScheme(): 'light' | 'dark' {
  return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
}

/**
 * The document attributes that mean "the resolved token values just changed".
 *
 * `data-theme` is the spoke's brand, `data-scheme` is light/dark, and
 * `data-assurance` is the contrast profile — all three re-point roles, and a
 * JS-painted surface has to be told about all three.
 */
const THEME_ATTRS = ['data-theme', 'data-scheme', 'data-assurance'];

/**
 * Call `cb` whenever anything that changes resolved token values changes.
 *
 * Covers the three document attributes above plus the two media queries the
 * libraries never ask about themselves. Returns a dispose function; call it
 * from `disconnectedCallback`.
 *
 * WHY A DISPOSE FUNCTION rather than a class field. The listener has to be the
 * SAME reference at add and remove time or `removeEventListener` silently does
 * nothing and the observer outlives the element — a leak that only shows up
 * under repeated navigation. Closing over the reference here makes that
 * impossible to get wrong at the call site.
 */
export function onThemeChange(cb: () => void): () => void {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: THEME_ATTRS,
  });

  // The libraries never ask for either of these, so we ask and re-ask: a
  // preference toggled mid-session has to land without a reload.
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forced = window.matchMedia('(forced-colors: active)');
  motion.addEventListener('change', cb);
  forced.addEventListener('change', cb);

  return () => {
    observer.disconnect();
    motion.removeEventListener('change', cb);
    forced.removeEventListener('change', cb);
  };
}
