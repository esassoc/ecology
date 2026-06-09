// Runtime value hydration for the foundation pages.
//
// WHY runtime, not build-time: the token NAMES are server-rendered from a
// theme-invariant manifest (tokens.ts), but the VALUES live in the spoke's theme
// CSS and only resolve in the browser. @esa/tokens (compiled at build time) carries
// only the hub's teal defaults — reading it here would mislabel a re-skinned spoke
// (cb-fish would show teal hex under a navy swatch). getComputedStyle reads the
// *live* cascade, so every printed label matches the swatch the theme is painting.
//
// Markup contract (set by the foundation components):
//   <span data-token-value="color-primary"></span>   → "#1e5386"
//   <span data-token-px="spacing-400"></span>         → "16px"
//   add data-token-font to a value cell to de-quote font-family lists

const rootStyle = () => getComputedStyle(document.documentElement);

/** The value of a custom property as the cascade computes it right now. */
function readToken(token: string): string {
  return rootStyle().getPropertyValue(`--${token}`).trim();
}

/**
 * Used pixel size of a CSS length — resolves rem, and the fluid clamp() type
 * tokens, to whatever they actually render at this viewport. A throwaway probe
 * element lets the browser do the math; reading the token string alone can't,
 * since "1rem" and "clamp(...)" aren't numbers until laid out.
 */
function toPx(length: string): string {
  if (!length) return '';
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  probe.style.width = length;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return Number.isFinite(px) ? `${Math.round(px * 100) / 100}px` : '';
}

/** Fill every [data-token-value] / [data-token-px] label from the live theme. */
export function hydrateFoundationValues(): void {
  document.querySelectorAll<HTMLElement>('[data-token-value]').forEach((el) => {
    const v = readToken(el.dataset.tokenValue!);
    if (v) el.textContent = el.hasAttribute('data-token-font') ? v.replace(/['"]/g, '') : v;
  });
  document.querySelectorAll<HTMLElement>('[data-token-px]').forEach((el) => {
    const px = toPx(readToken(el.dataset.tokenPx!));
    if (px) el.textContent = px;
  });
}

// Self-invoke so a foundation component only needs a bare import. Idempotent.
if (typeof document !== 'undefined') {
  if (document.readyState !== 'loading') hydrateFoundationValues();
  else document.addEventListener('DOMContentLoaded', hydrateFoundationValues);
}
