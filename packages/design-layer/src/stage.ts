// Isolation: the selection rendered alone on a neutral canvas, with each
// variant beside it. The stage lives in the page's light DOM, not the panel's
// shadow root, so the page's own stylesheets (scoped Astro styles, the theme,
// tweaks.css and the live preview) style the copies exactly as they style the
// original, and an edit to a token moves the copies with it.
//
// What a copy loses is its context: variables and inherited properties set on
// its ancestors. Each frame takes those from the original's parent, but only
// the ones that differ from the root's; a root token is left to resolve
// live, which is the token-graph rule: re-declare only what does not already
// follow (graph.ts).
export interface StageItem { id: string; label: string }

const INHERITED = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-feature-settings', 'font-variation-settings'];

const STAGE_CSS = `
  design-layer-stage { position: fixed; top: 0; left: 0; bottom: 0; z-index: 2147482990; display: flex; flex-wrap: wrap; align-items: flex-start;
    align-content: center; justify-content: center; gap: 48px 40px; padding: 64px 48px; overflow: auto; background: var(--dl-canvas, #f5f5f5); }
  design-layer-stage[data-dark] { --dl-canvas: #1e1e1e; --dl-label: rgba(255,255,255,.5); --dl-label-on: #fff; }
  design-layer-stage[hidden] { display: none; }
  .dl-stage__frame { display: grid; gap: 8px; justify-items: start; }
  .dl-stage__label { all: initial; height: 16px; font: 450 11px/16px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: .055px;
    color: var(--dl-label, rgba(0,0,0,.5)); cursor: default; white-space: nowrap; }
  .dl-stage__frame[data-active] .dl-stage__label { color: #0d99ff; font-weight: 550; }
  .dl-stage__body { outline: 1px solid transparent; outline-offset: 0; }
  .dl-stage__frame[data-active] .dl-stage__body { outline-color: #0d99ff; }
`;

export function createStage(onPick: (id: string) => void) {
  const style = document.createElement('style');
  style.id = 'design-layer-stage-css';
  style.textContent = STAGE_CSS;
  const el = document.createElement('design-layer-stage');
  el.hidden = true;
  el.setAttribute('aria-label', 'Isolated selection');
  // Copies are for looking at: a click picks the frame, never follows a link or submits.
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const frame = (e.target as Element).closest<HTMLElement>('.dl-stage__frame');
    if (frame?.dataset.id) onPick(frame.dataset.id);
  }, true);
  el.addEventListener('submit', (e) => e.preventDefault(), true);

  /** The context a copy needs from the original's parent. */
  function context(src: Element): string {
    const parent = src.parentElement;
    if (!parent) return '';
    const cs = getComputedStyle(parent);
    const rootCs = getComputedStyle(document.documentElement);
    const decl: string[] = [];
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (!p.startsWith('--')) continue;
      const v = cs.getPropertyValue(p);
      if (v !== rootCs.getPropertyValue(p)) decl.push(`${p}:${v}`);
    }
    for (const p of INHERITED) decl.push(`${p}:${cs.getPropertyValue(p)}`);
    return decl.join(';');
  }

  function copy(src: Element, variant: string | null): Element {
    const c = src.cloneNode(true) as Element;
    for (const n of [c, ...c.querySelectorAll('[id]')]) n.removeAttribute('id');
    c.removeAttribute('data-dl-variant');
    if (variant) c.setAttribute('data-dl-variant', variant);
    if (c instanceof HTMLElement) {
      const r = src.getBoundingClientRect();
      c.style.width = `${Math.round(r.width)}px`;
      c.style.maxWidth = 'none';
      c.style.margin = '0';
    }
    return c;
  }

  return {
    el,
    get open() { return !el.hidden; },
    /** Shows `items` (the original as id "original", then variants), `active` outlined. */
    render(src: Element, items: StageItem[], o: { active: string; left: number; right: number; dark: boolean }) {
      if (!style.isConnected) document.head.append(style);
      if (!el.isConnected) document.body.append(el);
      el.hidden = false;
      el.style.left = `${o.left}px`;
      el.style.right = `${o.right}px`;
      el.toggleAttribute('data-dark', o.dark);
      const ctx = context(src);
      el.replaceChildren(...items.map((it) => {
        const frame = document.createElement('div');
        frame.className = 'dl-stage__frame';
        frame.dataset.id = it.id;
        frame.toggleAttribute('data-active', it.id === o.active);
        const label = document.createElement('span');
        label.className = 'dl-stage__label';
        label.textContent = it.label;
        const body = document.createElement('div');
        body.className = 'dl-stage__body';
        body.setAttribute('style', ctx);
        body.append(copy(src, it.id === 'original' ? null : it.id));
        frame.append(label, body);
        return frame;
      }));
    },
    /** The copy shown for an item, for reading values where it renders. */
    copyOf(id: string): Element | null { return el.querySelector(`.dl-stage__frame[data-id="${CSS.escape(id)}"] .dl-stage__body > *`); },
    setActive(id: string) { for (const f of el.querySelectorAll<HTMLElement>('.dl-stage__frame')) f.toggleAttribute('data-active', f.dataset.id === id); },
    close() { el.hidden = true; el.replaceChildren(); },
  };
}
