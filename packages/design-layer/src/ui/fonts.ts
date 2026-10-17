// Registers the panel's face, DM Sans (the hub's own), under a family name of
// its own so the panel never moves when the spoke's fonts are tuned. Declared on
// the document: an @font-face inside a shadow root does not load in every engine.
const FAMILY = 'Design Layer Sans';

export function registerPanelFont(url: string) {
  if (document.getElementById('design-layer-font')) return;
  const style = document.createElement('style');
  style.id = 'design-layer-font';
  style.textContent = `@font-face { font-family: '${FAMILY}'; src: url('${url}') format('woff2'); font-weight: 300 700; font-style: normal; font-display: swap; }`;
  document.head.append(style);
}
