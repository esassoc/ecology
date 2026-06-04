// Astro scopes component styles by appending a `[data-astro-cid-xxx]` attribute
// to both the selector and the element. That round-trips perfectly inside the
// app but makes the handed-off CSS unreadable and silently brittle (copy the
// markup without the attribute and the styles stop matching). De-scoping strips
// the artifact from BOTH sides so the author's original intent (`.cbf-hero`) is
// restored and the HTML/CSS match on plain class selectors alone.

// Strip Astro scoping from a chunk of CSS (selector text). Handles the plain
// attribute form `.foo[data-astro-cid-x]` and the `:where([data-astro-cid-x])`
// wrapper Astro emits for `:global`/low-specificity cases. The matching DOM-side
// strip (removing the attributes themselves) runs inline in capture.mjs's
// in-page pass, so both halves of de-scoping happen against the live document.
export function descopeCss(css) {
  return css
    .replace(/:where\(\[data-astro-cid-[\w-]+\]\)/g, '')
    .replace(/\[data-astro-cid-[\w-]+\]/g, '');
}
