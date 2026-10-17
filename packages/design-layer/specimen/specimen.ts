// The control kit's specimen: every control in its states, then the panel
// composed from them. Real components and the hub's real tokens, sample values.
import {
  UI_CSS, h, section, numberField, colorField, selectField, segmented, tabs, switchRow, palettePicker, iconButton,
  type PaletteOption,
} from '../src/ui';
import { PALETTES, GROUPS } from '../src/palettes';
import { FONT_OPTIONS } from '../src/controls';

const host = document.getElementById('panel-host')!;
const root = host.attachShadow({ mode: 'open' });
root.innerHTML = `<style>${UI_CSS}${SPECIMEN_CSS()}</style>`;
const ui = h('div', { class: 'ui' });
root.append(ui);
const noop = () => {};

const palettes: PaletteOption[] = PALETTES.map((p) => ({
  id: p.id, name: p.name, group: GROUPS.find((g) => g.id === p.group)!.label,
  colors: [p.light.bar, p.light.canvas, p.light.primary],
  off: ['geist', 'supabase', 'stripe', 'primer', 'notion', 'zinc', 'clerk', 'atlassian'].includes(p.id) ? 'bar offset outside the band' : undefined,
}));

// ── gallery ──────────────────────────────────────────────────────────────
const cell = (title: string, ...nodes: Node[]) => h('div', { class: 'cell' }, h('div', { class: 'cell__t' }, title), ...nodes);

const n1 = numberField({ root, label: 'H1 size', lead: 'size', min: 10, max: 48, step: 0.5, unit: 'px', tokens: { kind: 'length', prefer: /font-size/ }, onChange: noop });
n1.set(24);
const n2 = numberField({ root, label: 'H1 size', lead: 'size', min: 10, max: 48, step: 0.5, unit: 'px', tokens: { kind: 'length' }, onChange: noop, onReference: noop });
n2.set(22, { reference: { name: 'Beacon', value: 24 }, setByUser: true });
const n3 = numberField({ root, label: 'Body size', lead: 'size', min: 10, max: 48, step: 0.5, unit: 'px', tokens: { kind: 'length' }, onChange: noop });
n3.set('var(--font-size-200)');
const n4 = numberField({ root, label: 'Weight', lead: { text: 'W' }, min: 100, max: 900, step: 1, tokens: { kind: 'weight' }, onChange: noop, refuse: [350] });
n4.set(550);
const n5 = numberField({ root, label: 'Radius', lead: 'radius', min: 0, max: 16, step: 1, unit: 'px', tokens: { kind: 'length', prefer: /radius/ }, onChange: noop });
n5.set(4);
n5.el.classList.add('demo-focus');

const c1 = colorField({ root, label: 'Top Bar', onChange: noop });
c1.set('#efefef', { meta: '−4.3' });
const c2 = colorField({ root, label: 'Accent', onChange: noop });
c2.set('var(--color-background-brand)', { resolved: '#46a758', setByUser: true });
const c3 = colorField({ root, label: 'Text', onChange: noop });
c3.set('#202020', { meta: 'L 0.24' });

const s1 = selectField({ root, label: 'Base font', options: FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label })), onChange: noop });
s1.set('dm-sans');
const seg1 = segmented({ label: 'Mode', options: [{ value: 'light', icon: 'sun', label: 'Light' }, { value: 'dark', icon: 'moon', label: 'Dark' }], onChange: noop, fit: true });
seg1.set('light');
const seg2 = segmented({ label: 'Scope', options: [{ value: 'page', label: 'Page' }, { value: 'component', label: 'Component' }], onChange: noop });
seg2.set('component');
const t1 = tabs({ label: 'Panel', options: [{ value: 'tune', label: 'Tune' }, { value: 'comments', label: 'Comments' }], onChange: noop });
t1.set('tune'); t1.count('comments', 2);
const sw1 = switchRow({ label: 'Comment Mode', onChange: noop });
sw1.set(true);
const pp1 = palettePicker({ root, label: 'Palette', palettes: () => palettes, onPick: noop, emptyLabel: 'Theme' });
const beacon = PALETTES.find((p) => p.id === 'beacon')!;
pp1.set('beacon', [beacon.light.bar, beacon.light.canvas, beacon.light.primary]);

const gallery = h('div', { class: 'gallery' },
  cell('Number Field', n1.el),
  cell('Departs From Reference', n2.el),
  cell('Bound To Token', n3.el),
  cell('Letter Lead', n4.el),
  cell('Focused', n5.el),
  cell('Colour Field', c1.el),
  cell('Colour Bound To Token', c2.el),
  cell('Colour With Readout', c3.el),
  cell('Select', s1.el),
  cell('Palette Picker', pp1.el),
  cell('Segmented, Icons', seg1.el),
  cell('Segmented, Text', seg2.el),
  cell('Tabs', t1.el),
  cell('Switch', sw1.el),
  cell('Icon Buttons', h('div', { style: 'display:flex;gap:2px' },
    iconButton('link', 'Move Together', noop, true), iconButton('reset', 'Reset', noop), iconButton('token', 'Apply Token', noop), iconButton('comment', 'Comment', noop))),
  cell('Buttons', h('div', { style: 'display:flex;gap:8px' }, h('button', { type: 'button', class: 'btn btn--primary' }, 'Save'), h('button', { type: 'button', class: 'btn' }, 'Cancel'), h('button', { type: 'button', class: 'tb' }, 'Reset All'))),
);

// ── the panel, composed ──────────────────────────────────────────────────
const lbl = (t: string) => h('span', { class: 'lbl' }, t);
const num = (label: string, lead: Parameters<typeof numberField>[0]['lead'], v: number | string, min: number, max: number, step: number, unit?: string, ref?: number) => {
  const f = numberField({ root, label, lead, min, max, step, unit, tokens: typeof lead === 'object' && lead.text === 'W' ? { kind: 'weight' } : typeof lead === 'object' ? undefined : { kind: 'length' }, onChange: noop, onReference: noop, refuse: [350] });
  f.set(v, { reference: ref === undefined ? null : { name: 'Beacon', value: ref }, setByUser: ref !== undefined && v !== ref });
  return f.el;
};
const color = (label: string, v: string, meta?: string, resolved?: string) => {
  const f = colorField({ root, label, onChange: noop });
  f.set(v, { meta, resolved });
  return f.el;
};
const font = (label: string, id: string) => { const s = selectField({ root, label, options: FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label })), onChange: noop }); s.set(id); return s.el; };

const head = h('div', { class: 'p-head' });
const pt = tabs({ label: 'Panel', options: [{ value: 'tune', label: 'Tune' }, { value: 'comments', label: 'Comments' }], onChange: noop });
pt.set('tune'); pt.count('comments', 2);
const pm = segmented({ label: 'Mode', options: [{ value: 'light', icon: 'sun', label: 'Light' }, { value: 'dark', icon: 'moon', label: 'Dark' }], onChange: noop, fit: true });
pm.set('light');
head.append(pt.el, h('span', { class: 'grow' }), pm.el, iconButton('collapse', 'Collapse Panel', noop));

const ppick = palettePicker({ root, label: 'Palette', palettes: () => palettes, onPick: noop, emptyLabel: 'Theme' });
ppick.set('beacon', [beacon.light.bar, beacon.light.canvas, beacon.light.primary]);

const panel = h('aside', { class: 'p', 'aria-label': 'Design Layer' },
  head,
  h('div', { class: 'p-body' },
    section({ id: 'palette', title: 'Palette', actions: [iconButton('link', 'Move Together', noop, true), iconButton('reset', 'Reset Palette', noop)], body: [
      ppick.el,
      h('div', { class: 'row2' }, num('Hue', { text: 'H' }, 0, 0, 360, 1), num('Saturation', { text: 'S' }, 0, 0, 100, 0.5)),
      h('div', { class: 'rowl rowl--srf' }, lbl('Top Bar'), color('Top Bar', '#efefef'), num('Top Bar lightness offset', { text: 'L' }, -4.5, -8, 4, 0.5)),
      h('div', { class: 'rowl rowl--srf' }, lbl('Sidenav'), color('Sidenav', '#fafafa'), num('Sidenav lightness offset', { text: 'L' }, 0, -8, 4, 0.5)),
      h('div', { class: 'rowl rowl--srf' }, lbl('Canvas'), color('Canvas', '#fafafa'), num('Canvas lightness', { text: 'L' }, 98, 85, 100, 0.5)),
      h('div', { class: 'readout' }, h('span', {}, 'Bar −4.5'), h('span', {}, 'Rail 0'), h('span', {}, 'Canvas 0')),
      h('div', { class: 'readout' }, h('span', {}, 'Same Hue and Saturation')),
    ] }),
    section({ id: 'colors', title: 'Colors', actions: [iconButton('reset', 'Reset Colors', noop)], body: [
      h('div', { class: 'rowl' }, lbl('Text'), color('Text', '#202020', 'L 0.24')),
      h('div', { class: 'rowl' }, lbl('Secondary'), color('Secondary Text', '#646464', 'L 0.53')),
      h('div', { class: 'rowl' }, lbl('Accent'), color('Accent', 'var(--color-background-brand)', undefined, '#46a758')),
      h('div', { class: 'grid-table' },
        h('span', { class: 'h' }, 'Contrast'), h('span', { class: 'h' }, 'Text'), h('span', { class: 'h' }, 'Secondary'),
        h('span', {}, 'Top Bar'), h('span', {}, '14.1 AA'), h('span', {}, '5.1 AA'),
        h('span', {}, 'Sidenav'), h('span', {}, '15.6 AA'), h('span', {}, '5.7 AA'),
        h('span', {}, 'Canvas'), h('span', {}, '15.6 AA'), h('span', { class: 'fail' }, '4.4 Fail')),
    ] }),
    section({ id: 'fonts', title: 'Fonts', actions: [iconButton('reset', 'Reset Fonts', noop)], body: [
      h('div', { class: 'rowl' }, lbl('Base'), font('Base font', 'inter')),
      h('div', { class: 'rowl' }, lbl('Headline'), font('Headline font', 'dm-sans')),
    ] }),
    section({ id: 'sizes', title: 'Sizes', actions: [h('button', { type: 'button', class: 'tb', 'aria-pressed': 'false' }, 'Use Beacon'), iconButton('reset', 'Reset Sizes', noop)], body: [
      h('div', { class: 'rowl rowl--2' }, lbl('H1'), num('H1 size', 'size', 22, 18, 48, 0.5, undefined, 24), num('H1 weight', { text: 'W' }, 600, 100, 900, 1, undefined, 650)),
      h('div', { class: 'rowl rowl--2' }, lbl('H2'), num('H2 size', 'size', 15, 14, 32, 0.5, undefined, 15), num('H2 weight', { text: 'W' }, 550, 100, 900, 1, undefined, 550)),
      h('div', { class: 'rowl rowl--2' }, lbl('H3'), num('H3 size', 'size', 17, 13, 28, 0.5, undefined, 17), num('H3 weight', { text: 'W' }, 500, 100, 900, 1, undefined, 550)),
      h('div', { class: 'rowl rowl--2' }, lbl('Body'), num('Body size', 'size', 'var(--font-size-200)', 12, 20, 0.5, undefined), num('Body weight', { text: 'W' }, 400, 100, 900, 1, undefined, 400)),
      h('div', { class: 'rowl rowl--2' }, lbl('Meta'), num('Meta size', 'size', 12, 11, 16, 0.5, undefined, 12), num('Meta weight', { text: 'W' }, 400, 100, 900, 1, undefined, 400)),
      h('div', { class: 'rowl rowl--2' }, lbl('Nav'), num('Nav size', 'size', 13, 12, 22, 0.5, undefined, 15), num('Nav weight', { text: 'W' }, 500, 100, 900, 1, undefined, 550)),
    ] }),
    section({ id: 'components', title: 'Components', actions: [iconButton('reset', 'Reset Components', noop)], body: [
      h('div', { class: 'rowl' }, lbl('Control'), num('Control height', 'height', 32, 24, 56, 0.5, 'px', 37.5)),
      h('div', { class: 'rowl' }, lbl('Row'), num('Row padding', 'padY', 10, 0, 24, 0.5, 'px', 10)),
      h('div', { class: 'rowl rowl--2' }, lbl('Card'), num('Card padding Y', 'padY', 12, 0, 32, 1, undefined, 12), num('Card padding X', 'padX', 12, 0, 32, 1, undefined, 12)),
      h('div', { class: 'rowl' }, lbl('Radius'), num('Radius', 'radius', 4, 0, 16, 1, 'px', 4)),
    ] }),
  ),
  h('div', { class: 'p-foot' }, h('button', { type: 'button', class: 'tb' }, 'Reset All'), h('span', { class: 'grow' }), h('button', { type: 'button', class: 'btn btn--primary' }, 'Save')),
);

ui.append(h('div', { class: 'stage' }, gallery, panel));

function SPECIMEN_CSS() {
  return `
    .stage { display: flex; gap: 0; min-height: 100vh; }
    .gallery { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); align-content: start; gap: 24px 32px; padding: 32px; background: var(--color-gray-dark-1, #111111); }
    .cell { display: grid; gap: 8px; align-content: start; }
    .cell__t { color: var(--ui-ink-3); }
    .demo-focus { border-color: var(--ui-accent) !important; }
    .p { position: sticky; top: 0; height: 100vh; }
  `;
}
