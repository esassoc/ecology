// Runtime Handoff inspector — the deployable inspector for Ecology spokes.
// (Originated in cb-fish-design; promoted to @esa/handoff 2026-06.)
// The dev tool is bound to Astro's dev-only toolbar (defineToolbarApp/canvas) and
// is stripped from production builds; this version brings its own shadow host and
// its own toggle, so it works on the deployed site AND in `astro dev`.
//
// It is route-aware: the manifest is resolved from location.pathname
// (/handoff/<slug>/manifest.json, slug derived exactly like the handoff CLI's
// --name), so each prototype shows ITS sections, not the homepage's. If no bundle
// exists for the current route, the inspector stays dormant — no launcher, no UI.
//
// The rendering logic (tree, HTML/CSS/token tabs, page-pick highlight, copy +
// copy-for-Claude) is a faithful port of toolbar-app.js; the export engine remains
// the source of truth and this only reads the manifest it produced.

interface Token { name: string; value: string; tier: string }
interface Guide { intent?: string; decisions?: string[]; gotchas?: string[]; acceptance?: string[] }
interface ApplyOp {
  click?: string; fill?: [string, string]; clear?: string; clickText?: [string, string]; key?: string;
}
interface Section {
  index?: number; label: string; tag?: string; selector?: string; apply?: ApplyOp[];
  html: string; css: string; tokens: Token[]; js?: string; guide?: Guide;
  claudePath?: string; repoPath?: string;
}

// Set a field's value the way a user would, so the page's input handlers fire.
function setInput(sel: string, val: string) {
  const el = document.querySelector<HTMLInputElement>(sel);
  if (!el) return;
  el.value = val;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
// Replay a state recipe on the LIVE page — the DOM twin of the capture's runApply,
// so clicking a chip drives the real app into that section's state.
function runApplyDom(ops?: ApplyOp[]) {
  for (const op of ops || []) {
    if (op.click) document.querySelector<HTMLElement>(op.click)?.click();
    else if (op.fill) setInput(op.fill[0], op.fill[1]);
    else if (op.clear) setInput(op.clear, '');
    else if (op.clickText) {
      const c = document.querySelector(op.clickText[0]);
      [...(c?.querySelectorAll('button') ?? [])]
        .find((b) => b.textContent?.trim().includes(op.clickText![1]))
        ?.click();
    } else if (op.key) document.dispatchEvent(new KeyboardEvent('keydown', { key: op.key, bubbles: true }));
  }
}
interface Manifest {
  name: string; sections: Section[];
  full?: { label: string; html: string; css: string; tokens: Token[]; claudePath?: string; repoPath?: string };
}

const esc = (s: unknown) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const isColor = (v: unknown) =>
  /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%/]+\)|hsla?\([\d.,\s%/]+\))$/i.test(String(v).trim());

// --- syntax highlighters (operate on prettier-formatted, then-escaped code) ---
function hlVal(v: string) {
  return v
    .replace(/("[^"]*"|'[^']*')/g, '<span class="s">$1</span>')
    .replace(/(var\()(--[\w-]+)/g, '$1<span class="t">$2</span>')
    .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="n">$1</span>');
}
function hlCss(src: string) {
  return esc(src)
    .split('\n')
    .map((line) => {
      if (/\{\s*$/.test(line))
        return line.replace(/^(\s*)(.+?)(\s*\{)\s*$/, '$1<span class="sel">$2</span>$3');
      const m = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.+?)(;?)\s*$/);
      if (m) return `${m[1]}<span class="p">${m[2]}</span>${m[3]}${hlVal(m[4])}${m[5]}`;
      return line;
    })
    .join('\n');
}
function hlHtml(src: string) {
  return esc(src)
    .replace(/("[^"]*")/g, '<span class="s">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tag">$2</span>');
}

function renderTokens(tokens: Token[]) {
  if (!tokens || !tokens.length) return '<p class="hint">No design tokens in this section.</p>';
  const groups: Record<string, Token[]> = {};
  for (const t of tokens) (groups[t.tier] = groups[t.tier] || []).push(t);
  const order = ['brand', 'semantic', 'component', 'primitive'];
  return order
    .filter((k) => groups[k])
    .map(
      (tier) => `
      <div class="tgroup">
        <div class="tgroup__h">${tier} <span>${groups[tier].length}</span></div>
        ${groups[tier]
          .map(
            (t) => `<div class="tok">
              <span class="tok__name">${isColor(t.value) ? `<i style="background:${esc(t.value)}"></i>` : ''}<code>${esc(t.name)}</code></span>
              <span class="tok__val">${esc(t.value)}</span>
            </div>`
          )
          .join('')}
      </div>`
    )
    .join('');
}

// Light JS/TS highlight — comments + strings only; enough to read, not a full lexer.
function hlJs(src: string) {
  return esc(src)
    .replace(/(\/\/[^\n]*)/g, '<span class="c">$1</span>')
    .replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, '<span class="s">$1</span>');
}

function renderGuide(g?: Guide) {
  if (!g || !Object.keys(g).length)
    return '<p class="hint">No design guidance authored for this section.</p>';
  const list = (title: string, arr?: string[]) =>
    arr?.length
      ? `<div class="g"><div class="g__h">${title}</div><ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
      : '';
  return [
    g.intent ? `<p class="g__intent">${esc(g.intent)}</p>` : '',
    list('Key decisions', g.decisions),
    list('Gotchas', g.gotchas),
    list('Done when', g.acceptance),
  ].join('');
}

const STYLE = `
  :host { all: initial; }
  /* The hidden attribute must win over the explicit display on .launch/.panel,
     otherwise the toggle is defeated by specificity. */
  [hidden] { display: none !important; }
  .host-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000;
    font-family: system-ui, sans-serif; }
  .host-root > * { pointer-events: auto; }
  .launch { position: fixed; bottom: 22px; left: 22px; display: inline-flex; align-items: center; gap: 9px;
    padding: 13px 19px; border-radius: 999px; color: #fff; cursor: pointer; font-size: 15px; font-weight: 600;
    letter-spacing: .01em; border: 1px solid #3d6fd6;
    background: linear-gradient(180deg, #1f6feb, #1551c4);
    box-shadow: 0 10px 28px -8px rgba(31,111,235,.65), inset 0 1px 0 rgba(255,255,255,.18);
    transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
  .launch:hover { transform: translateY(-2px); filter: brightness(1.07);
    box-shadow: 0 16px 36px -8px rgba(31,111,235,.75), inset 0 1px 0 rgba(255,255,255,.25); }
  .launch:active { transform: translateY(0); }
  .launch svg { flex: none; }
  /* Full-height glass panel, inset from the edges. */
  .panel { position: fixed; top: 18px; right: 18px; bottom: 18px; width: min(720px, 94vw);
    display: flex; flex-direction: column; color: #ffffff; border-radius: 16px;
    background: linear-gradient(155deg, rgba(26,31,40,.74), rgba(11,15,21,.86));
    backdrop-filter: blur(26px) saturate(150%); -webkit-backdrop-filter: blur(26px) saturate(150%);
    border: 1px solid rgba(255,255,255,.15);
    box-shadow: 0 28px 70px -18px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.10);
    font-size: 12.5px; overflow: hidden;
    /* slide in from the right */
    transform: translateX(calc(100% + 32px)); opacity: 0; visibility: hidden;
    transition: transform .3s cubic-bezier(.4,0,.2,1), opacity .22s ease, visibility 0s linear .3s; }
  .panel.is-open { transform: none; opacity: 1; visibility: visible;
    transition: transform .3s cubic-bezier(.4,0,.2,1), opacity .22s ease; }
  .head { display: flex; align-items: center; gap: 8px; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,.09); }
  .head strong { font-size: 14px; }
  .head .sub { flex: 1; color: #ccd5e0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.09); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04);
    color: #eef2f6; font: inherit; font-size: 12.5px; cursor: pointer; white-space: nowrap;
    transition: border-color .12s ease, background .12s ease, color .12s ease; }
  .chip:hover { color: #fff; border-color: rgba(255,255,255,.3); }
  .chip.on { background: rgba(31,111,235,.28); border-color: #4493f8; color: #fff; font-weight: 600; }
  .tabs { display: flex; gap: 4px; padding: 9px 14px; border-bottom: 1px solid rgba(255,255,255,.09); }
  .tabs button { padding: 5px 12px; border: 0; border-radius: 6px; background: none; color: #ccd5e0;
    font: inherit; font-size: 12.5px; cursor: pointer; }
  .tabs button.on { background: rgba(255,255,255,.12); color: #fff; }
  .body { overflow: auto; padding: 13px 16px; flex: 1; }
  /* Prominent action footer. */
  .footer { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 11px 16px;
    border-top: 1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.18); }
  .footer button { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 8px 14px; border-radius: 8px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .copy { color: #eef2f6; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); }
  .copy:hover { color: #fff; border-color: rgba(255,255,255,.34); }
  .copy.done { color: #7ee787; border-color: #2ea043; }
  .claude { color: #fff; border: 1px solid #d97757;
    background: linear-gradient(180deg, #e0805f, #c25e3c);
    box-shadow: 0 6px 18px -6px rgba(217,119,87,.6), inset 0 1px 0 rgba(255,255,255,.2); }
  .claude svg { flex: none; }
  .claude:hover { filter: brightness(1.06); }
  .claude.done { background: linear-gradient(180deg, #2ea043, #238636); border-color: #2ea043; }
  /* Claude payload preview popover (anchored above the footer). */
  .cpreview { position: absolute; left: 16px; right: 16px; bottom: calc(100% + 8px);
    background: rgba(13,17,23,.96); border: 1px solid rgba(255,255,255,.16); border-radius: 12px;
    box-shadow: 0 18px 50px -14px rgba(0,0,0,.7); padding: 12px 14px; max-height: 50vh; overflow: auto; }
  .cpreview__h { display: flex; align-items: center; margin-bottom: 8px; color: #ccd5e0; font-size: 11px;
    letter-spacing: .04em; text-transform: uppercase; }
  .cpreview__copy { margin-left: auto; color: #e9a589; border: 1px solid #d9775766; border-radius: 6px;
    background: none; font: inherit; font-size: 11.5px; padding: 3px 9px; cursor: pointer; text-transform: none; letter-spacing: 0; }
  .cpreview__copy:hover { color: #fff; border-color: #d97757; }
  .cpreview pre { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.55;
    color: #eef2f6; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; }
  .hint { margin: 0; color: #c4cdd8; line-height: 1.6; }
  pre.code { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.55; tab-size: 2; color: #e3e9ef;
    font-family: ui-monospace, "SF Mono", Menlo, monospace; }
  pre.code .tag { color: #7ee787; }
  pre.code .s   { color: #a5d6ff; }
  pre.code .sel { color: #d2a8ff; }
  pre.code .p   { color: #79c0ff; }
  pre.code .t   { color: #ffa657; }
  pre.code .n   { color: #f0883e; }
  pre.code .c   { color: #8d97a3; font-style: italic; }
  .g { margin-bottom: 14px; }
  .g__intent { margin: 0 0 14px; color: #ffffff; line-height: 1.6; font-size: 13px; }
  .g__h { color: #c4cdd8; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 6px; }
  .g ul { margin: 0 0 2px; padding-left: 18px; }
  .g li { color: #e3e9ef; line-height: 1.55; margin-bottom: 5px; }
  .tgroup { margin-bottom: 14px; }
  .tgroup__h { text-transform: capitalize; color: #c4cdd8; font-size: 11px; letter-spacing: .04em; margin-bottom: 6px; }
  .tgroup__h span { color: #7a8492; }
  .tok { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; border-bottom: 1px solid #161b22; }
  .tok__name { display: flex; align-items: center; gap: 8px; }
  .tok__name i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ffffff22; flex: none; }
  .tok__name code { color: #ffffff; font-family: ui-monospace, monospace; }
  .tok__val { color: #c4cdd8; padding-left: 22px; word-break: break-all; font-family: ui-monospace, monospace; }
  .x { border: 0; background: none; color: #c4cdd8; font-size: 20px; line-height: 1; cursor: pointer; }
  .x:hover { color: #fff; }
`;

const HOST_ID = 'handoff-inspector';

/** Derive the bundle slug from the path, exactly like the handoff CLI's --name. */
function routeSlug(): string {
  const base = import.meta.env.BASE_URL;
  let p = location.pathname;
  if (p.startsWith(base)) p = p.slice(base.length);
  p = p.replace(/^\/|\/$/g, '');
  return p.replace(/\//g, '-') || 'index';
}
const manifestUrl = (slug: string) => `${import.meta.env.BASE_URL}handoff/${slug}/manifest.json`;

export function initInspector(): void {
  if (document.getElementById(HOST_ID)) return; // idempotent
  const url = manifestUrl(routeSlug());
  fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((manifest: Manifest) => mount(manifest, url))
    .catch(() => {
      /* No bundle for this route — stay dormant. */
    });
}

function mount(manifest: Manifest, manifestUrl: string): void {
  const host = document.createElement('div');
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: 'open' });
  // Mount on <html>, not <body>: the handoff capture engine treats body children
  // as page sections, so keeping our host out of <body> means re-capturing a route
  // never picks up the inspector itself as a junk section. Fixed positioning inside
  // the shadow root anchors to the viewport regardless.
  document.documentElement.appendChild(host);

  // Page-level outline for the on-hover / selected section (the page is outside
  // this app's shadow root, so these rules must live in document.head).
  const pageStyle = document.createElement('style');
  pageStyle.textContent = `
    [data-handoff-on] { outline: 2px solid #4493f8 !important; outline-offset: -2px;
      scroll-margin: 80px; }`;

  const base = manifestUrl.replace(/manifest\.json.*$/, '');

  const style = document.createElement('style');
  style.textContent = STYLE;
  const wrap = document.createElement('div');
  wrap.className = 'host-root';
  wrap.innerHTML = `
    <button class="launch" title="Inspect this prototype (⌥⇧I)">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 9 3 3-3 3"/><path d="M14 15h3"/><rect width="18" height="16" x="3" y="4" rx="2"/></svg>
      Inspect
    </button>
    <div class="panel">
      <div class="head"><strong>Inspector</strong><span class="sub"></span><button class="x" title="Close (Esc)">×</button></div>
      <div class="picker"></div>
      <div class="tabs">
        <button data-tab="guide" class="on">Guide</button>
        <button data-tab="html">HTML</button>
        <button data-tab="css">CSS</button>
        <button data-tab="js">JS</button>
        <button data-tab="tokens">Tokens</button>
      </div>
      <div class="body"></div>
      <div class="footer">
        <div class="cpreview" hidden>
          <div class="cpreview__h">Prompt handed to Claude<button class="cpreview__copy">Copy prompt</button></div>
          <pre></pre>
        </div>
        <button class="copy" title="Copy the active tab's raw content">Copy</button>
        <button class="claude" title="Preview the prompt for Claude">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>
          for Claude
        </button>
      </div>
    </div>`;
  root.append(style, wrap);

  const launch = wrap.querySelector<HTMLButtonElement>('.launch')!;
  const panel = wrap.querySelector<HTMLElement>('.panel')!;
  const sub = wrap.querySelector<HTMLElement>('.sub')!;
  const picker = wrap.querySelector<HTMLElement>('.picker')!;
  const body = wrap.querySelector<HTMLElement>('.body')!;
  const tabBtns = [...wrap.querySelectorAll<HTMLButtonElement>('.tabs button[data-tab]')];
  const copyBtn = wrap.querySelector<HTMLButtonElement>('.copy')!;
  const claudeBtn = wrap.querySelector<HTMLButtonElement>('.claude')!;
  const cpreview = wrap.querySelector<HTMLElement>('.cpreview')!;
  const cpreviewPre = wrap.querySelector<HTMLElement>('.cpreview pre')!;
  const cpreviewCopy = wrap.querySelector<HTMLButtonElement>('.cpreview__copy')!;

  // Outline the live region a section maps to (by its authored selector).
  const clearHighlight = () =>
    document.querySelectorAll('[data-handoff-on]').forEach((el) => el.removeAttribute('data-handoff-on'));
  const highlight = (selector?: string) => {
    clearHighlight();
    if (selector) document.querySelector(selector)?.setAttribute('data-handoff-on', '');
  };

  let current: (Section & { tag?: string }) | null = null;
  let tab: 'html' | 'css' | 'js' | 'tokens' | 'guide' = 'guide';
  let open = false;
  let applying = false; // true while a recipe drives the page (its clicks aren't "outside")

  function render() {
    copyBtn.textContent = `Copy ${tab}`; // Copy button names what it'll copy
    if (!current) {
      sub.textContent = `${manifest.name} · ${manifest.sections.length} sections`;
      body.innerHTML = `<p class="hint">Pick a section above to inspect its markup, styles, behavior, tokens, and design intent.</p>`;
      return;
    }
    sub.textContent =
      current.tag && current.tag !== 'page' ? `${current.label} · <${current.tag}>` : current.label;
    if (tab === 'html') body.innerHTML = `<pre class="code">${hlHtml(current.html)}</pre>`;
    else if (tab === 'css')
      body.innerHTML = current.css
        ? `<pre class="code">${hlCss(current.css)}</pre>`
        : `<p class="hint">No section-local CSS (inherited utilities only).</p>`;
    else if (tab === 'js')
      body.innerHTML = current.js
        ? `<pre class="code">${hlJs(current.js)}</pre>`
        : `<p class="hint">No interactivity — this section is static markup.</p>`;
    else if (tab === 'tokens') body.innerHTML = renderTokens(current.tokens);
    else body.innerHTML = renderGuide(current.guide);
  }

  const chipNodes = () => [...picker.querySelectorAll<HTMLElement>('.chips .chip')];

  // doApply: drive the LIVE app into this section's state (only on a real click,
  // and only while open — never on the silent initial selection).
  function select(i: number, doApply = false) {
    current = manifest.sections[i] || null;
    chipNodes().forEach((c, j) => c.classList.toggle('on', j === i));
    hideClaudePreview();
    if (doApply && open && current?.apply) {
      // Recipe clicks land on the PAGE — flag them so the click-outside-to-close
      // handler doesn't treat the app being driven as a click off the panel.
      applying = true;
      // Reset: close the palette if it's open — via its own close control, NOT a
      // global Escape (which the inspector itself listens for and would close us).
      const omni = document.querySelector('[data-omni]');
      if (omni && !omni.hasAttribute('hidden'))
        document.querySelector<HTMLElement>('[data-omni-close]')?.click();
      runApplyDom(current.apply);
      applying = false;
    }
    if (open) highlight(current?.selector);
    render();
  }

  function buildChips() {
    picker.innerHTML = '<div class="chips"></div>';
    const chips = picker.querySelector('.chips')!;
    manifest.sections.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.title = s.apply ? `${s.label} — click to drive the app into this state` : s.label;
      b.textContent = s.label;
      b.onclick = () => select(i, true);
      chips.appendChild(b);
    });
  }

  // Close when a click lands outside the panel — but not on a recipe-driven page
  // click, and not on the very click that opened it (composedPath sees into the
  // shadow DOM, so panel clicks are correctly "inside").
  const onDocClick = (e: MouseEvent) => {
    if (!open || applying) return;
    if (!e.composedPath().includes(panel)) setOpen(false);
  };

  function setOpen(on: boolean) {
    open = on;
    panel.classList.toggle('is-open', on); // class drives the slide-in transition
    launch.hidden = on;
    if (on) {
      document.head.append(pageStyle);
      highlight(current?.selector); // re-outline the current section, if any
      // Defer arming a tick so the opening click itself doesn't immediately close it.
      setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
    } else {
      pageStyle.remove();
      clearHighlight();
      document.removeEventListener('click', onDocClick, true);
    }
  }

  // Copy the active tab's raw content: HTML / CSS verbatim, tokens as CSS
  // custom-property declarations ready to paste into a :root block.
  function copyText() {
    if (!current) return '';
    if (tab === 'html') return current.html || '';
    if (tab === 'css') return current.css || '';
    if (tab === 'js') return current.js || '';
    if (tab === 'tokens') return (current.tokens || []).map((t) => `${t.name}: ${t.value};`).join('\n');
    const g = current.guide || {};
    return [
      g.intent,
      g.decisions?.length && `Key decisions:\n${g.decisions.map((x) => `- ${x}`).join('\n')}`,
      g.gotchas?.length && `Gotchas:\n${g.gotchas.map((x) => `- ${x}`).join('\n')}`,
      g.acceptance?.length && `Done when:\n${g.acceptance.map((x) => `- ${x}`).join('\n')}`,
    ].filter(Boolean).join('\n\n');
  }
  const flash = (btn: HTMLButtonElement, restore: string, ok = true) => {
    const orig = btn.innerHTML;
    btn.classList.toggle('done', ok);
    btn.textContent = restore;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('done');
    }, 1300);
  };

  copyBtn.onclick = async () => {
    const text = copyText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flash(copyBtn, 'Copied');
    } catch {
      flash(copyBtn, 'Failed', false);
    }
  };

  // The exact prompt handed to Claude: an instruction + a fetchable link to this
  // section's self-contained spec (markup + styles + behavior + tokens + guidance).
  function claudePayload(): string {
    if (!current?.claudePath) return '';
    const url = new URL(base + current.claudePath, location.origin).href;
    const lines = [
      `Here's a new UI section to build — "${current.label}".`,
      '',
      'The linked spec has the design guidance (intent, key decisions, gotchas) plus sample',
      'HTML, CSS, and JS. The finished UI should look and behave exactly like this — match it',
      "faithfully. The sample code shows how it's built; you don't need to mirror it",
      'line-for-line — translate it to your own stack and design system, mapping the',
      "sample's values onto your established tokens.",
      '',
      'Spec — use whichever you can reach:',
      `• hosted: ${url}`,
    ];
    if (current.repoPath) lines.push(`• in this repo: ${current.repoPath}`);
    return lines.join('\n');
  }
  const hideClaudePreview = () => (cpreview.hidden = true);

  // Claude button PREVIEWS the prompt (toggles a popover) rather than copying blind.
  claudeBtn.onclick = () => {
    if (!current?.claudePath) return;
    if (!cpreview.hidden) return hideClaudePreview();
    cpreviewPre.textContent = claudePayload();
    cpreview.hidden = false;
  };
  cpreviewCopy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(claudePayload());
      flash(cpreviewCopy, 'Copied ✓');
    } catch {
      flash(cpreviewCopy, 'Failed', false);
    }
  };

  launch.onclick = () => setOpen(true);
  wrap.querySelector<HTMLButtonElement>('.x')!.onclick = () => setOpen(false);
  tabBtns.forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab as typeof tab;
        tabBtns.forEach((x) => x.classList.toggle('on', x === b));
        hideClaudePreview();
        render();
      })
  );

  // Keys: ⌥⇧I toggles anywhere; Esc closes when open.
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      setOpen(!open);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  });

  buildChips();
  select(0); // first chip selected by default (no apply until a real click)
  // ?inspect in the URL opens immediately — shareable inspect links.
  if (new URLSearchParams(location.search).has('inspect')) setOpen(true);
}
