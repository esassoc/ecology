// What every floating panel the kit draws shares: the dock it floats in, the
// page outlines, and the pill that opens it. The design layer's panel (dev) and
// the Handoff panel (a deployed prototype) both mount through these, so the two
// are one chrome rather than two that drift.
import { h } from './dom';

/** The panel's width: a setting, dragged on its inner edge. Figma's own panel is 240; 320 gives the fields and the top row's undo and redo room. */
export const WIDTH = { default: 320, min: 260, max: 480 };
/** The overlay's distance from the viewport's edges: Figma's floating-panel gap, spacing-300. */
export const INSET = 12;
/** Open, close and the side swap: one ease-out curve. */
export const MOTION = 220;

export const DOCK_CSS = `
  .dock { position: fixed; top: ${INSET}px; bottom: ${INSET}px; right: ${INSET}px; z-index: 2147483000;
    transition: transform ${MOTION}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${MOTION}ms cubic-bezier(0.16, 1, 0.3, 1); }
  .dock[data-side="left"] { right: auto; left: ${INSET}px; }
  .dock[data-state="closed"] { opacity: 0; transform: translateX(24px) scale(0.985); pointer-events: none; }
  .dock[data-side="left"][data-state="closed"] { transform: translateX(-24px) scale(0.985); }
  .dock[data-side="left"] .p-resize { left: auto; right: 0; }
  @media (prefers-reduced-motion: reduce) { .dock { transition: none; } }
  /* outlines only: nothing fills over the design */
  .box { position: fixed; z-index: 2147482998; pointer-events: none; border: 1px solid #0d99ff; background: none; }
  .box--picked { border-width: 2px; background: rgba(13, 153, 255, 0.12); }
  .box--sel { border-color: #0d99ff; background: none; }
  .box__name, .box__size { position: absolute; height: 16px; padding: 0 4px; border-radius: 2px; background: #0d99ff; color: #fff;
    font: 550 11px/16px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: .055px; white-space: nowrap; }
  .box__name { left: -1px; bottom: calc(100% + 4px); }
  .box__size { left: 50%; top: calc(100% + 4px); transform: translateX(-50%); font-variant-numeric: tabular-nums; }
`;

/** Control+Option+D: Option+Shift+D is taken by a global Figma shortcut on Andy's Mac. */
export const isToggleKey = (e: KeyboardEvent) => e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.code === 'KeyD';

/** The always-visible way in, bottom right, in its own host so the page's
    styles never reach it. Hidden while its panel is open. */
export function mountPill(label: string, onClick: () => void): HTMLButtonElement {
  const host = document.createElement('design-layer-pill');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    button { position: fixed; right: 16px; bottom: 16px; z-index: 2000000000; font: 500 11px/1 'Design Layer UI', Inter, system-ui, sans-serif;
      color: #eeeeee; background: #222222; border: 1px solid #484848; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
    button:hover { background: #2a2a2a; }
    button:focus-visible { outline: 2px solid #0d99ff; outline-offset: 2px; }
    button[hidden] { display: none; }
  </style>`;
  const pill = h('button', { type: 'button', title: `${label} (Control+Option+D)` }, label);
  pill.addEventListener('click', onClick);
  root.append(pill);
  // On <html>, not <body>: the handoff capture treats body children as page
  // sections, so a re-capture never picks the pill up as one.
  document.documentElement.append(host);
  return pill;
}
