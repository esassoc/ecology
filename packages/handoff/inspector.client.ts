// The Handoff panel on a deployed prototype: the Handoff pill, bottom right,
// opening the design layer's Handoff pane on its own, in the design layer's
// chrome. The pane lives in @esa/design-layer (src/handoff.ts) so the dev panel's
// Handoff tab and this are one surface. Imported by path: spokes link the hub's
// packages side by side (file:../ecology/packages/*), so a spoke that never
// installed @esa/design-layer still resolves it.
//
// Dormant when the route has no bundle, and under `astro dev` when the design
// layer is running (its panel already has the tab).
import { mountHandoff } from '../design-layer/src/handoff';

export function initInspector(): void {
  if ((window as Window & { __designLayer?: boolean }).__designLayer) return;
  void mountHandoff();
}
