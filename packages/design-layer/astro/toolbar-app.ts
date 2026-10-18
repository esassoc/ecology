// The Astro dev-toolbar half of the design layer: hands the panel its canvas
// and a PanelHost over the toolbar's server channel. Everything else is core.
import { defineToolbarApp } from 'astro/toolbar';
import { mountPanel } from '../src/panel';
import type { PanelHost, ResolvedConfig, ServerState } from '../src/types';

declare const __DESIGN_LAYER_CONFIG__: { config: ResolvedConfig; cssRoute: string; fontUrl: string };
const EVENT = 'design-layer';

export default defineToolbarApp({
  init(canvas, app, server) {
    const host: PanelHost = {
      cssRoute: __DESIGN_LAYER_CONFIG__.cssRoute,
      fontUrl: __DESIGN_LAYER_CONFIG__.fontUrl,
      send: (type, data) => server.send(`${EVENT}:${type}`, data),
      onState: (cb) => server.on<ServerState>(`${EVENT}:state`, cb),
      setOpen: (state) => app.toggleState({ state }),
      onToggled: (cb) => app.onToggled(({ state }) => cb(state)),
    };
    panel = mountPanel(canvas, host, __DESIGN_LAYER_CONFIG__.config);
  },
  beforeTogglingOff() {
    return panel?.allowClose() ?? true;
  },
});

let panel: { allowClose(): boolean } | null = null;
