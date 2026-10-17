// The control kit's specimen: every control in its states, then the panel
// composed from them, once per theme (Figma UI3 light and dark). Real controls,
// the hub's real tokens, sample values.
import {
  UI_CSS, h, section, numberField, colorField, selectField, segmented, tabs, checkbox, dropdown, iconButton,
} from '../src/ui';
import { FONT_OPTIONS } from '../src/controls';

const noop = () => {};
const fonts = FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }));

function stage(theme: 'light' | 'dark', host: HTMLElement) {
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${UI_CSS}${SPECIMEN_CSS}</style>`;
  const ui = h('div', { class: 'ui', 'data-theme': theme });
  root.append(ui);

  const num = (label: string, prefix: Parameters<typeof numberField>[0]['prefix'], v: number | string, o: { suffix?: string; ref?: number; tokens?: 'length' | 'weight'; min?: number; max?: number } = {}) => {
    const f = numberField({ root, label, prefix, suffix: o.suffix, min: o.min ?? 0, max: o.max ?? 999, step: 0.5, tokens: o.tokens ? { kind: o.tokens } : undefined, onChange: noop, onReference: noop, refuse: [350] });
    f.set(v, { resolved: 14, reference: o.ref === undefined ? null : { name: 'Beacon', value: o.ref } });
    return f.el;
  };
  const color = (label: string, v: string, resolved?: string) => {
    const f = colorField({ root, label, suffix: label, onChange: noop });
    f.set(v, { resolved });
    return f.el;
  };
  const font = (label: string, id: string) => { const s = selectField({ root, label: `${label} font`, suffix: label, options: fonts, onChange: noop }); s.set(id); return s.el; };
  const span2 = (el: HTMLElement) => { el.classList.add('span2'); return el; };
  const x = (label: string, on = false) => { const b = iconButton('minus', `Reset ${label}`, noop); b.classList.add('c3'); b.style.visibility = on ? 'visible' : 'hidden'; return b; };
  const cell = (title: string, ...nodes: Node[]) => h('div', { class: 'cell' }, h('div', { class: 'cell__t' }, title), ...nodes);

  // ── gallery ──
  const focused = num('Radius', 'radius', 4, { tokens: 'length' });
  focused.classList.add('demo-focus');
  const hovered = num('Body size', 'size', 14, { suffix: 'Body', tokens: 'length' });
  hovered.classList.add('demo-hover');
  const seg1 = segmented({ label: 'Align', icons: true, options: [{ value: 'l', icon: 'padX', label: 'Left' }, { value: 'c', icon: 'icon', label: 'Centre' }, { value: 'r', icon: 'padY', label: 'Right' }], onChange: noop });
  seg1.set('l');
  const seg2 = segmented({ label: 'Mode', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], onChange: noop });
  seg2.set('light');
  const cb1 = checkbox({ label: 'Comment Mode', onChange: noop }); cb1.set(true);
  const cb2 = checkbox({ label: 'Clip Content', onChange: noop }); cb2.set(false);
  const dd = dropdown({ label: 'Mode', onOpen: noop }); dd.set('Light');
  const tb = tabs({ label: 'Panel', options: [{ value: 'tune', label: 'Tune' }, { value: 'comments', label: 'Comments' }], onChange: noop });
  tb.set('tune'); tb.count('comments', 2);
  const g = (...n: Node[]) => h('div', { class: 'g' }, ...n);
  const gallery = h('div', { class: 'gallery' },
    cell('Number', g(num('Body size', 'size', 14, { suffix: 'Body' }), num('Body weight', { text: 'W' }, 450))),
    cell('Departs From Beacon', g(num('H1 size', 'size', 22, { suffix: 'H1', ref: 24 }), num('H1 weight', { text: 'W' }, 600, { ref: 650 }))),
    cell('Hover, Focus', g(hovered, focused)),
    cell('Bound To Variable', g(span2(num('Body size', 'size', 'var(--font-size-200)')))),
    cell('Fill', g(span2(color('Text', '#202020')), x('Text', true))),
    cell('Fill Bound To Variable', g(span2(color('Accent', 'var(--color-background-brand)', '#46a758')))),
    cell('Dropdown', g(span2(font('Base', 'inter')))),
    cell('Segmented', g(seg2.el, seg1.el)),
    cell('Checkbox', h('div', { style: 'display:grid;gap:8px' }, cb1.el, cb2.el)),
    cell('Tabs, Ghost Dropdown', h('div', { style: 'display:flex;gap:8px;align-items:center' }, tb.el, dd.el)),
    cell('Icon Buttons', h('div', { style: 'display:flex;gap:4px' },
      iconButton('link', 'Move Together', noop, true), iconButton('adjust', 'Settings', noop), iconButton('contrast', 'Contrast', noop), iconButton('reference', 'Use Beacon', noop),
      iconButton('plus', 'Add', noop), iconButton('minus', 'Remove', noop), iconButton('kebab', 'More', noop), iconButton('token', 'Variable', noop))),
    cell('Buttons', h('div', { style: 'display:flex;gap:8px' }, h('button', { type: 'button', class: 'btn btn--primary' }, 'Save'), h('button', { type: 'button', class: 'btn' }, 'Cancel'), h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, 'Saved'))),
  );

  // ── the panel, composed as panel.ts composes it ──
  const pt = tabs({ label: 'Panel', options: [{ value: 'tune', label: 'Tune' }, { value: 'comments', label: 'Comments' }], onChange: noop });
  pt.set('tune'); pt.count('comments', 2);
  const md = dropdown({ label: 'Page mode', onOpen: noop }); md.set('Light');
  const pal = dropdown({ label: 'Palette', onOpen: noop }); pal.set('Beacon');
  const contrastBtn = iconButton('contrast', 'Contrast: 1 below 4.5', noop);
  contrastBtn.setAttribute('data-warn', '');
  const layout = section({ id: 'layout', title: 'Layout', actions: [iconButton('plus', 'Show Layout', noop)], body: [], empty: true });
  const panel = h('aside', { class: 'p', 'aria-label': 'Design Layer' },
    h('div', { class: 'p-resize' }),
    h('div', { class: 'p-top' }, pt.el, h('span', { class: 'grow' }), md.el, h('button', { type: 'button', class: 'btn btn--primary' }, 'Save')),
    h('div', { class: 'p-body' },
      h('div', { class: 'sel' }, pal.el, h('span', { class: 'grow' }), iconButton('reference', 'Use Beacon sizes', noop, false), iconButton('kebab', 'More', noop)),
      section({ id: 'surfaces', title: 'Surfaces', actions: [iconButton('link', 'Move Together', noop, true), iconButton('adjust', 'Surface Settings', noop)], body: [
        span2(color('Top Bar', '#efefef')), span2(color('Sidenav', '#fafafa')), span2(color('Canvas', '#fafafa')),
      ] }).el,
      section({ id: 'colors', title: 'Colors', actions: [contrastBtn], body: [
        span2(color('Text', '#202020')), x('Text'),
        span2(color('Secondary', '#646464')), x('Secondary', true),
        span2(color('Accent', 'var(--color-background-brand)', '#46a758')), x('Accent', true),
      ] }).el,
      section({ id: 'type', title: 'Typography', body: [
        span2(font('Base', 'inter')), x('Base'),
        span2(font('Headline', 'dm-sans')), x('Headline', true),
        num('H1 size', 'size', 22, { suffix: 'H1', ref: 24 }), num('H1 weight', { text: 'W' }, 600, { ref: 650 }), x('H1', true),
        num('H2 size', 'size', 15, { suffix: 'H2' }), num('H2 weight', { text: 'W' }, 550), x('H2'),
        num('Body size', 'size', 'var(--font-size-200)', { suffix: 'Body' }), num('Body weight', { text: 'W' }, 400), x('Body', true),
        num('Meta size', 'size', 12, { suffix: 'Meta' }), num('Meta weight', { text: 'W' }, 400), x('Meta'),
      ] }).el,
      layout.el,
    ),
  );
  ui.append(h('div', { class: 'stage' }, gallery, panel));
}

const SPECIMEN_CSS = `
  .stage { display: flex; height: 760px; background: var(--canvas); }
  .ui[data-theme="light"] { --canvas: #f5f5f5; }
  .ui[data-theme="dark"] { --canvas: #1e1e1e; }
  .gallery { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); align-content: start; gap: 24px 32px; padding: 32px; }
  .cell { display: grid; gap: 8px; align-content: start; padding: 8px 8px 16px 16px; border-radius: 5px; background: var(--bg); }
  .cell__t { height: 32px; line-height: 32px; font-weight: 550; }
  .cell .g { grid-template-columns: 88px 88px 24px; }
  .demo-focus { border-color: var(--focus) !important; background: var(--bg) !important; }
  .demo-hover { border-color: var(--line) !important; }
  .demo-hover .f__tok { opacity: 1; }
  .p { height: 100%; }
`;

for (const theme of ['light', 'dark'] as const) {
  const host = h('div', { id: `stage-${theme}` });
  document.body.append(host);
  stage(theme, host);
}
