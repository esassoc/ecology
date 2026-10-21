// Handoff: the route's handoff bundle (written by @esa/handoff), read section
// by section, for whoever is moving the prototype into another codebase. One
// pane, two mounts: a tab in the design layer's panel under `astro dev`, and
// the whole of a standalone panel on a deployed prototype (mountHandoff).
//
// The page stays the subject: picking a section outlines it in place, and a
// click inside a section on the page picks it without stopping the page's own
// click. The pane holds the guidance and the facts; the code and the pictures
// stay in the bundle's files, linked. Copy for Claude copies two links, the
// prototype's README and the section's spec, which is all an agent in another
// repo needs to start.
import { h } from './ui/dom';
import { section, tabs, iconButton } from './ui/controls';
import { UI_CSS } from './ui/styles';
import { registerPanelFont } from './ui/fonts';
import { DOCK_CSS, WIDTH, isToggleKey, mountPill } from './ui/chrome';

// ── the manifest bundle.mjs writes ─────────────────────────────────────────
interface Token { name: string; value: string; tier: string }
interface Guide { intent?: string; decisions?: string[]; gotchas?: string[]; acceptance?: string[] }
interface ApplyOp { click?: string; fill?: [string, string]; clear?: string; clickText?: [string, string]; key?: string }
interface Component { name: string; origin: string; source?: string | null; target?: string | null }
type Data = string | { fixture?: string | string[]; store?: string | string[]; fields?: string[] | Record<string, string>; enums?: Record<string, string[] | string>; notes?: string | string[] };
export interface HandoffSection {
  label: string; selector?: string; apply?: ApplyOp[]; guide?: Guide; tokens?: Token[]; components?: Component[]; data?: Data;
  claudePath: string; parts?: string[]; shots?: { desktop?: string; phone?: string };
}
export interface HandoffManifest {
  title: string; url?: string; baseUrl?: string; generatedFrom?: 'spec' | 'derived'; data?: Data; sections: HandoffSection[];
}
interface Loaded { manifest: HandoffManifest; /** Where the bundle sits on this host, for the links. */ local: string; /** Where an agent elsewhere reads it: the deployed bundle. */ remote: string }

const BASE = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/** The bundle slug for this route, exactly like the handoff CLI's: /prototypes/actions/ → prototypes-actions. */
function routeSlug(): string {
  let p = location.pathname;
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/^\/|\/$/g, '');
  return p.replace(/\//g, '-') || 'index';
}

/** This route's bundle, or null when it has none. */
export async function loadManifest(): Promise<Loaded | null> {
  const url = new URL(`${BASE}handoff/${routeSlug()}/manifest.json`, location.href);
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const manifest = (await r.json()) as HandoffManifest;
    if (!Array.isArray(manifest.sections)) return null;
    const local = new URL('.', url).href;
    return { manifest, local, remote: manifest.baseUrl ?? local };
  } catch {
    return null;
  }
}

// ── the page ───────────────────────────────────────────────────────────────
// Set a field's value the way a user would, so the page's input handlers fire.
function setInput(sel: string, val: string) {
  const el = document.querySelector<HTMLInputElement>(sel);
  if (!el) return;
  el.value = val;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
/** Replay a section's state recipe on the live page: the DOM twin of the capture's. */
function runApply(ops?: ApplyOp[]) {
  // Start from a closed palette, through its own close control (a global
  // Escape would reach the panel too).
  const omni = document.querySelector('[data-omni]');
  if (omni && !omni.hasAttribute('hidden')) document.querySelector<HTMLElement>('[data-omni-close]')?.click();
  for (const op of ops ?? []) {
    if (op.click) document.querySelector<HTMLElement>(op.click)?.click();
    else if (op.fill) setInput(op.fill[0], op.fill[1]);
    else if (op.clear) setInput(op.clear, '');
    else if (op.clickText) {
      const c = document.querySelector(op.clickText[0]);
      [...(c?.querySelectorAll('button') ?? [])].find((b) => b.textContent?.trim().includes(op.clickText![1]))?.click();
    } else if (op.key) document.dispatchEvent(new KeyboardEvent('keydown', { key: op.key, bubbles: true }));
  }
}
const elementOf = (s: HandoffSection): Element | null => {
  if (!s.selector) return null;
  try { return document.querySelector(s.selector); } catch { return null; }
};
const OWN = 'design-layer-host, design-layer-pill, design-layer-stage';

export const HANDOFF_CSS = `
  .ho-list { display: grid; grid-column: 1 / -1; margin: 0 0 0 -8px; padding: 0; list-style: none; }
  .ho-row { display: block; width: 100%; height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink); text-align: left;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ho-row:hover { background: var(--hover); }
  .ho-row[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .ho-text { grid-column: 1 / -1; margin: 0; overflow-wrap: anywhere; }
  .ho-ul { grid-column: 1 / -1; display: grid; gap: 4px; margin: 0; padding: 0 0 0 16px; }
  .ho-ul li { overflow-wrap: anywhere; }
  .ho-sub { grid-column: 1 / -1; margin: 4px 0 -4px; font-weight: 550; }
  .ho-kv { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; align-items: center; min-height: 24px; }
  .ho-kv > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ho-kv > span + span { color: var(--ink-2); text-align: right; }
  .ho-kv code, .ho-text code { font: 450 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ho-sw { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; vertical-align: -1px; box-shadow: inset 0 0 0 1px rgba(128,128,128,.35); }
  .ho-links { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .ui .ho-links a { color: var(--ink); text-decoration: underline; text-decoration-color: var(--ink-3); text-underline-offset: 3px; }
  .ui .ho-links a:hover { text-decoration-color: var(--ink); }
  .ho-empty { padding: 16px; color: var(--ink-2); }
`;

export interface HandoffPaneHandle {
  el: HTMLElement;
  /** The page outlines, appended beside the panel in the same shadow root. */
  overlay: HTMLElement;
  /** On while the pane is showing: it outlines and listens to the page only then. */
  setActive(on: boolean): void;
}

/** The Handoff pane. `preloaded` skips the fetch when the mount already has the bundle. */
export function handoffPane(o: { root: ShadowRoot; preloaded?: Loaded }): HandoffPaneHandle {
  const el = h('div', { class: 'p-body', role: 'tabpanel', hidden: true });
  const hoverBox = h('div', { class: 'box', hidden: true });
  const selName = h('span', { class: 'box__name' });
  const selBox = h('div', { class: 'box box--sel', hidden: true }, selName);
  const overlay = h('div', {}, hoverBox, selBox);
  let loaded: Loaded | null = o.preloaded ?? null;
  let fetched = !!o.preloaded;
  let active = false;
  let current: HandoffSection | null = null;
  let hovered: HandoffSection | null = null;
  let applying = false;
  let rows: HTMLButtonElement[] = [];

  const sections = () => loaded?.manifest.sections ?? [];
  const at = (base: string, rel: string) => new URL(rel, base).href;

  function place(box: HTMLElement, s: HandoffSection | null) {
    const target = s && active ? elementOf(s) : null;
    const r = target?.getBoundingClientRect();
    if (!r || !r.width || !r.height) { box.hidden = true; return; }
    box.hidden = false;
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  const placeAll = () => { place(selBox, current); place(hoverBox, hovered && hovered !== current ? hovered : null); };

  /** The innermost section the element sits in. */
  function sectionAt(t: Element): HandoffSection | null {
    let best: HandoffSection | null = null;
    let bestEl: Element | null = null;
    for (const s of sections()) {
      const e = elementOf(s);
      if (e && e.contains(t) && (!bestEl || bestEl.contains(e))) { best = s; bestEl = e; }
    }
    return best;
  }

  function pick(s: HandoffSection, from: 'list' | 'page') {
    current = s;
    if (from === 'list') {
      // Drive the live page into the section's state, then bring it into view.
      if (s.apply?.length) { applying = true; try { runApply(s.apply); } finally { setTimeout(() => { applying = false; }, 0); } }
      requestAnimationFrame(() => { elementOf(s)?.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior }); placeAll(); });
    }
    selName.textContent = s.label;
    for (const [i, r] of rows.entries()) r.setAttribute('aria-pressed', String(sections()[i] === s));
    renderDetail();
    placeAll();
  }

  // ── the pane ─────────────────────────────────────────────────────────────
  const detail = h('div', {});
  function render() {
    if (!loaded) { el.replaceChildren(h('div', { class: 'ho-empty' }, 'No handoff bundle for this page.')); return; }
    const m = loaded.manifest;
    rows = m.sections.map((s) => {
      const b = h('button', { type: 'button', class: 'ho-row', 'aria-pressed': String(s === current), title: s.apply?.length ? `${s.label}: shows this state on the page` : s.label }, s.label);
      b.addEventListener('click', () => pick(s, 'list'));
      return b;
    });
    const readme = h('a', { href: at(loaded.local, 'README.md'), target: '_blank', rel: 'noopener' }, 'README');
    const list = section({ id: 'handoff-sections', title: m.title, body: [h('div', { class: 'ho-links' }, readme), h('ul', { class: 'ho-list' }, ...rows.map((r) => h('li', {}, r)))] });
    el.replaceChildren(list.el, detail);
    renderDetail();
  }

  function renderDetail() {
    const s = current;
    if (!s || !loaded) { detail.replaceChildren(); return; }
    const L = loaded;
    const g = s.guide ?? {};
    const copyBtn = h('button', { type: 'button', class: 'btn btn--primary' }, 'Copy for Claude');
    copyBtn.addEventListener('click', async () => {
      const text = `Prototype handoff: ${at(L.remote, 'README.md')}\nSection (${s.label}): ${at(L.remote, s.claudePath)}`;
      try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'Copied'; }
      catch { copyBtn.textContent = 'Copy Failed'; }
      setTimeout(() => { copyBtn.textContent = 'Copy for Claude'; }, 1600);
    });

    const bullets = (title: string, items?: string[]) => (items?.length ? [h('div', { class: 'ho-sub' }, title), h('ul', { class: 'ho-ul' }, ...items.map((x) => h('li', {}, x)))] : []);
    const guide = [
      ...(g.intent ? [h('p', { class: 'ho-text' }, g.intent)] : []),
      ...bullets('Key Decisions', g.decisions),
      ...bullets('Gotchas', g.gotchas),
      ...bullets('Done When', g.acceptance),
    ];
    const secs: HTMLElement[] = [
      section({ id: 'handoff-guide', title: s.label, actions: [copyBtn], body: guide.length ? guide : [h('p', { class: 'ho-text' }, 'No guidance written for this section.')] }).el,
    ];

    if (s.components?.length) {
      secs.push(section({ id: 'handoff-components', title: 'Components', body: s.components.map((c) =>
        h('div', { class: 'ho-kv', title: c.source ?? '' }, h('span', {}, h('code', {}, c.name)), h('span', {}, c.target ? `→ ${c.target}` : c.origin === 'hub' ? 'Ecology' : 'Prototype'))) }).el);
    }

    const data = dataRows(s.data ?? loaded.manifest.data);
    if (data.length) secs.push(section({ id: 'handoff-data', title: 'Data', body: data }).el);

    if (s.tokens?.length) {
      secs.push(section({ id: 'handoff-tokens', title: 'Tokens', body: s.tokens.map((t) =>
        h('div', { class: 'ho-kv', title: `${t.name}: ${t.value} (${t.tier})` },
          h('span', {}, h('code', {}, t.name)),
          h('span', {}, isColor(t.value) ? h('i', { class: 'ho-sw', style: `background:${t.value}` }) : null, t.value))) }).el);
    }

    const link = (href: string, label: string) => h('a', { href: at(L.local, href), target: '_blank', rel: 'noopener' }, label);
    const files = [
      link(s.claudePath, 'Spec'),
      ...(s.shots?.desktop ? [link(s.shots.desktop, 'Desktop')] : []),
      ...(s.shots?.phone ? [link(s.shots.phone, 'Phone')] : []),
      ...(s.parts ?? []).map((p) => link(p, partLabel(p))),
    ];
    secs.push(section({ id: 'handoff-files', title: 'Files', body: [h('div', { class: 'ho-links' }, ...files)] }).el);
    detail.replaceChildren(...secs);
  }

  // ── the page's events, while the pane shows ──────────────────────────────
  const onPage = (t: EventTarget | null): t is Element => t instanceof Element && !t.closest(OWN);
  document.addEventListener('mousemove', (e) => {
    if (!active || !loaded) return;
    const next = onPage(e.target) ? sectionAt(e.target) : null;
    if (next !== hovered) { hovered = next; placeAll(); }
  }, true);
  // A click inside a section picks it, and the page still gets the click.
  document.addEventListener('click', (e) => {
    if (!active || applying || !onPage(e.target)) return;
    const s = sectionAt(e.target);
    if (s && s !== current) pick(s, 'page');
  }, true);
  let frame = 0;
  const replace = () => { if (active && !frame) frame = requestAnimationFrame(() => { frame = 0; placeAll(); }); };
  addEventListener('scroll', replace, true);
  addEventListener('resize', replace);
  setInterval(replace, 600);

  render();
  return {
    el,
    overlay,
    setActive(on: boolean) {
      active = on;
      el.hidden = !on;
      if (!on) hovered = null;
      if (on && !fetched) {
        fetched = true;
        void loadManifest().then((l) => { loaded = l; render(); placeAll(); });
      }
      placeAll();
    },
  };
}

const isColor = (v: string) => /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%/]+\)|hsla?\([\d.,\s%/]+\))$/i.test(v.trim());
/** claude/board.markup-2.md → Markup 2 */
function partLabel(p: string) {
  const m = p.match(/\.(markup|styles|tokens)(?:-(\d+))?\.md$/);
  if (!m) return p.split('/').pop()!;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)}${m[2] ? ` ${m[2]}` : ''}`;
}
function dataRows(raw?: Data): HTMLElement[] {
  if (!raw) return [];
  const d = typeof raw === 'string' ? { fixture: raw } : raw;
  const list = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const out: HTMLElement[] = [];
  for (const f of list(d.fixture)) out.push(h('div', { class: 'ho-kv', title: f }, h('span', {}, 'Fixture'), h('span', {}, h('code', {}, f))));
  for (const f of list(d.store)) out.push(h('div', { class: 'ho-kv', title: f }, h('span', {}, 'Client Store'), h('span', {}, h('code', {}, f))));
  for (const n of list(d.notes)) out.push(h('p', { class: 'ho-text' }, n));
  const fields = Array.isArray(d.fields) ? d.fields.map((n) => [n, ''] as const) : Object.entries(d.fields ?? {});
  for (const [name, what] of fields) out.push(h('div', { class: 'ho-kv', title: what }, h('span', {}, h('code', {}, name)), h('span', {}, what)));
  for (const [name, values] of Object.entries(d.enums ?? {}))
    out.push(h('div', { class: 'ho-sub' }, h('code', {}, name)), h('p', { class: 'ho-text' }, (Array.isArray(values) ? values : [values]).join(' · ')));
  return out;
}

// ── the standalone panel, for a deployed prototype ─────────────────────────
const FONT_URL = new URL('../assets/inter-variable.woff2', import.meta.url).href;

/** Mount the Handoff panel and its pill when this route has a bundle; otherwise nothing. */
export async function mountHandoff(): Promise<void> {
  if (document.querySelector('design-layer-host')) return;
  const loaded = await loadManifest();
  if (!loaded || document.querySelector('design-layer-host')) return;
  registerPanelFont(FONT_URL);

  const host = document.createElement('design-layer-host');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${UI_CSS}${DOCK_CSS}${HANDOFF_CSS}</style>`;
  const ui = h('div', { class: 'ui', 'data-theme': 'dark', style: `--w:${WIDTH.default}px` });
  root.append(ui);

  const pane = handoffPane({ root, preloaded: loaded });
  const tabBar = tabs<'handoff'>({ label: 'Panel', options: [{ value: 'handoff', label: 'Handoff' }], onChange: () => {} });
  tabBar.set('handoff');
  let open = false;
  const close = iconButton('close', 'Close (⌃⌥D)', () => setOpen(false));
  const top = h('div', { class: 'p-top' }, tabBar.el, h('span', { class: 'grow' }), close);
  const panel = h('aside', { class: 'p', 'aria-label': 'Handoff' }, top, pane.el);
  const dock = h('div', { class: 'dock', 'data-state': 'closed' }, panel);
  ui.append(dock, pane.overlay);
  // On <html>, not <body>, like the pill: a re-capture never takes it for a section.
  document.documentElement.append(host);

  const pill = mountPill('Handoff', () => setOpen(true));
  function setOpen(state: boolean) {
    open = state;
    pill.hidden = state;
    pane.setActive(state);
    if (state) requestAnimationFrame(() => requestAnimationFrame(() => { dock.dataset.state = 'open'; }));
    else dock.dataset.state = 'closed';
  }
  // Keys typed in the panel stay in the panel, as in the design layer's.
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    ui.addEventListener(type, (e) => {
      if (type === 'keydown' && isToggleKey(e as KeyboardEvent)) { e.preventDefault(); setOpen(!open); }
      e.stopPropagation();
    });
  }
  document.addEventListener('keydown', (e) => { if (isToggleKey(e)) { e.preventDefault(); setOpen(!open); } });
}
