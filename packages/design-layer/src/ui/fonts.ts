// Registers the panel's face, Inter, under a family name no page uses, so it
// never reaches the page and the panel never moves when the spoke's fonts are
// tuned. Declared on the document because Chromium ignores an @font-face inside
// a shadow root; the private name is what keeps it out of the page.
const FAMILY = 'Design Layer UI';

export function registerPanelFont(url: string) {
  if (document.getElementById('design-layer-font')) return;
  const style = document.createElement('style');
  style.id = 'design-layer-font';
  style.textContent = `@font-face { font-family: '${FAMILY}'; src: url('${url}') format('woff2'); font-weight: 100 900; font-style: normal; font-display: swap; }`;
  document.head.append(style);
}
