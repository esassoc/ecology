// The design layer's dev client: injected on every page by the integration
// (dev only), it mounts the panel in its own host and talks to the dev server
// over Vite's HMR socket. Astro's dev toolbar plays no part, so a spoke can
// turn the toolbar off and keep the panel.
import { mountPanel } from '../src/panel';
import type { PanelHost, ResolvedConfig, ServerState } from '../src/types';

declare const __DESIGN_LAYER_CONFIG__: { config: ResolvedConfig; cssRoute: string; fontUrl: string };

const EVENT = 'design-layer';
const OPEN_KEY = 'design-layer:open';
const hot = import.meta.hot;

if (hot && !document.querySelector('design-layer-host')) {
  const el = document.createElement('design-layer-host');
  const canvas = el.attachShadow({ mode: 'open' });
  // On <html>, not <body>: the handoff capture treats body children as page sections.
  document.documentElement.append(el);

  const toggled: ((state: boolean) => void)[] = [];
  let open = false;
  let panel: { allowClose(): boolean } | null = null;
  const host: PanelHost = {
    cssRoute: __DESIGN_LAYER_CONFIG__.cssRoute,
    fontUrl: __DESIGN_LAYER_CONFIG__.fontUrl,
    // Custom events: Vite types their payloads only through its own augmentation.
    send: (type, data) => (hot as unknown as { send(event: string, payload: unknown): void }).send(`${EVENT}:${type}`, data),
    onState: (cb) => hot.on(`${EVENT}:state`, (s: ServerState) => cb(s)),
    setOpen: (state) => {
      if (state === open) return;
      // Closing plays the panel's own motion first; it calls back when done.
      if (!state && panel && !panel.allowClose()) return;
      open = state;
      try { sessionStorage.setItem(OPEN_KEY, state ? '1' : '0'); } catch { /* storage blocked */ }
      for (const cb of toggled) cb(state);
    },
    onToggled: (cb) => { toggled.push(cb); },
  };
  panel = mountPanel(canvas, host, __DESIGN_LAYER_CONFIG__.config);
  // A reload keeps the panel where it was, as the toolbar app did.
  let reopen = false;
  try { reopen = sessionStorage.getItem(OPEN_KEY) === '1'; } catch { /* storage blocked */ }
  if (reopen) host.setOpen(true);
}
