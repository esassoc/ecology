// Dev Handoff inspector — an Astro dev-toolbar app. Toggle it from the Astro bar;
// pick a section (chip or click the page) to inspect its de-scoped HTML, applied
// CSS, and resolved tokens, all from the manifest the export engine generated.
// The engine is the source of truth; this app only reads and renders.
import { defineToolbarApp } from 'astro/toolbar';

const MANIFEST_URL =
  typeof __HANDOFF_MANIFEST__ !== 'undefined' ? __HANDOFF_MANIFEST__ : '/handoff/home/manifest.json';

const esc = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const isColor = (v) =>
  /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%/]+\)|hsla?\([\d.,\s%/]+\))$/i.test(String(v).trim());

// --- tiny syntax highlighters (operate on prettier-formatted, then-escaped code) ---
function hlVal(v) {
  return v
    .replace(/("[^"]*"|'[^']*')/g, '<span class="s">$1</span>')
    .replace(/(var\()(--[\w-]+)/g, '$1<span class="t">$2</span>')
    .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="n">$1</span>');
}
function hlCss(src) {
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
function hlHtml(src) {
  return esc(src)
    .replace(/("[^"]*")/g, '<span class="s">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tag">$2</span>');
}

function renderTokens(tokens) {
  if (!tokens || !tokens.length) return '<p class="hint">No design tokens in this section.</p>';
  const groups = {};
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

const STYLE = `
  :host { all: initial; }
  .panel { position: fixed; top: 12px; right: 12px; width: min(460px, 94vw);
    max-height: calc(100vh - 24px); display: flex; flex-direction: column;
    background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 12px;
    box-shadow: 0 16px 50px -12px rgba(0,0,0,.6);
    font-family: "Anthropic Sans", system-ui, sans-serif;
    font-size: 12.5px; overflow: hidden; pointer-events: auto; }
  .head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #21262d; }
  .head strong { font-size: 14px; }
  .head .sub { flex: 1; color: #7d8590; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker { padding: 10px 14px; border-bottom: 1px solid #21262d; }
  .picker__label { color: #7d8590; font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
    font-family: system-ui, sans-serif; margin-bottom: 6px; }
  .tree { position: relative; }
  .node { position: relative; display: block; width: 100%; text-align: left; padding: 4px 0 4px 26px;
    border: 0; background: none; color: #adbac7; font: inherit; font-size: 12.5px; cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* tree guides: a continuous vertical line (stacked per-node) + a tick into each node */
  .tree .node::before { content: ''; position: absolute; left: 8px; top: 0; height: 100%; border-left: 1px solid #30363d; }
  .tree .node:last-child::before { height: 50%; }
  .tree .node::after { content: ''; position: absolute; left: 8px; top: 50%; width: 12px; border-top: 1px solid #30363d; }
  .node:hover { color: #fff; }
  .node.on { color: #fff; font-weight: 600; }
  .tree .node.on::after { border-color: #4493f8; }
  .node--full { margin-top: 8px; padding-top: 9px; border-top: 1px solid #21262d; }
  .node--full::before { content: '⤓'; position: absolute; left: 7px; top: 9px; color: #7d8590; }
  .node--full.on::before { color: #4493f8; }
  .tabs { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid #21262d; }
  .tabs button { padding: 5px 12px; border: 0; border-radius: 6px; background: none; color: #7d8590;
    font: inherit; font-size: 12.5px; cursor: pointer; }
  .tabs button.on { background: #21262d; color: #fff; }
  .tabs .actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  .tabs .copy { color: #adbac7; border: 1px solid #30363d; }
  .tabs .copy:hover { border-color: #4493f8; color: #fff; }
  .tabs .copy.done { color: #7ee787; border-color: #238636; }
  /* the Claude grab — coral spark + Anthropic Sans, the primary "for Claude" action */
  .claude { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px;
    border: 1px solid #d97757; border-radius: 6px; background: #d977571a; color: #e9a589;
    font-family: "Anthropic Sans", system-ui, sans-serif; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
  .claude svg { color: #d97757; flex: none; }
  .claude:hover { background: #d9775733; color: #f0b89e; }
  .claude.done { border-color: #238636; color: #7ee787; }
  .claude.done svg { color: #7ee787; }
  .body { overflow: auto; padding: 12px 14px; }
  .hint { margin: 0; color: #7d8590; line-height: 1.6; }
  pre.code { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.55; tab-size: 2; color: #adbac7;
    font-family: "Anthropic Mono", ui-monospace, "SF Mono", Menlo, monospace; }
  pre.code .tag { color: #7ee787; }
  pre.code .s   { color: #a5d6ff; }
  pre.code .sel { color: #d2a8ff; }
  pre.code .p   { color: #79c0ff; }
  pre.code .t   { color: #ffa657; }
  pre.code .n   { color: #f0883e; }
  .tgroup { margin-bottom: 14px; }
  .tgroup__h { text-transform: capitalize; color: #7d8590; font-size: 11px; letter-spacing: .04em;
    margin-bottom: 6px; font-family: system-ui, sans-serif; }
  .tgroup__h span { color: #4d5560; }
  .tok { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; border-bottom: 1px solid #161b22; }
  .tok__name { display: flex; align-items: center; gap: 8px; }
  .tok__name i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #ffffff22; flex: none; }
  .tok__name code { color: #e6edf3; font-family: "Anthropic Mono", ui-monospace, monospace; }
  .tok__val { color: #7d8590; padding-left: 22px; word-break: break-all; font-family: "Anthropic Mono", ui-monospace, monospace; }
  .x { border: 0; background: none; color: #7d8590; font-size: 20px; line-height: 1; cursor: pointer; }
  .x:hover { color: #fff; }
`;

export default defineToolbarApp({
  init(canvas, app) {
    // Page-level style for the on-hover / selected outline (the page is outside
    // this app's shadow root, so these rules must live in document.head).
    const pageStyle = document.createElement('style');
    pageStyle.textContent = `
      [data-handoff-pick]:hover { outline: 2px dashed #1f6feb; outline-offset: -2px; cursor: pointer; }
      [data-handoff-on] { outline: 2px solid #4493f8 !important; outline-offset: -2px; }`;

    // The bundle base (…/handoff/home/) hosts the manifest, specs, and fonts.
    const base = MANIFEST_URL.replace(/manifest\.json.*$/, '');
    const fontFace = `
      @font-face { font-family: "Anthropic Sans"; src: url("${base}fonts/AnthropicSans-Variable.woff2") format("woff2-variations"); font-weight: 300 800; font-display: swap; }
      @font-face { font-family: "Anthropic Mono"; src: url("${base}fonts/AnthropicMono-Variable.woff2") format("woff2-variations"); font-weight: 300 800; font-display: swap; }`;

    const wrap = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = fontFace + STYLE;
    wrap.innerHTML = `
      <div class="panel">
        <div class="head"><strong>Dev Handoff</strong><span class="sub"></span><button class="x" title="Close">×</button></div>
        <div class="picker"></div>
        <div class="tabs">
          <button data-tab="html" class="on">HTML</button>
          <button data-tab="css">CSS</button>
          <button data-tab="tokens">Tokens</button>
          <span class="actions">
            <button class="copy" title="Copy this tab's raw content">Copy</button>
            <button class="claude" title="Copy a fetchable spec link for Claude">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>
              for Claude
            </button>
          </span>
        </div>
        <div class="body"></div>
      </div>`;
    canvas.append(style, wrap);

    const panel = wrap.querySelector('.panel');
    const sub = wrap.querySelector('.sub');
    const picker = wrap.querySelector('.picker');
    const body = wrap.querySelector('.body');
    const tabBtns = [...wrap.querySelectorAll('.tabs button[data-tab]')];
    const copyBtn = wrap.querySelector('.copy');
    const claudeBtn = wrap.querySelector('.claude');

    const IGNORE = /^(SCRIPT|STYLE|LINK|ASTRO-DEV-TOOLBAR|ASTRO-ISLAND)$/;
    const liveSections = () =>
      [...document.body.children].filter((el) => !IGNORE.test(el.tagName));

    let manifest = null;
    let current = null;
    let tab = 'html';
    let active = false;

    function render() {
      if (!manifest) {
        body.innerHTML = `<p class="hint">No manifest found at <code>${esc(MANIFEST_URL)}</code>.<br>Run <code>npm run handoff</code> to generate it.</p>`;
        return;
      }
      if (!current) {
        sub.textContent = `${manifest.name} · ${manifest.sections.length} sections`;
        body.innerHTML = `<p class="hint">Pick a section above, or click any region of the page.</p>`;
        return;
      }
      sub.textContent =
        current.tag && current.tag !== 'page' ? `${current.label} · <${current.tag}>` : current.label;
      if (tab === 'html') body.innerHTML = `<pre class="code">${hlHtml(current.html)}</pre>`;
      else if (tab === 'css')
        body.innerHTML = current.css
          ? `<pre class="code">${hlCss(current.css)}</pre>`
          : `<p class="hint">No section-local CSS (inherited utilities only).</p>`;
      else body.innerHTML = renderTokens(current.tokens);
    }

    const treeNodes = () => [...picker.querySelectorAll('.tree .node')];

    function select(i) {
      current = manifest?.sections[i] || null;
      treeNodes().forEach((c, j) => c.classList.toggle('on', j === i));
      picker.querySelector('.node--full')?.classList.remove('on');
      liveSections().forEach((el, j) => el.toggleAttribute('data-handoff-on', j === i));
      render();
    }

    function selectFull() {
      current = { tag: 'page', ...manifest.full };
      treeNodes().forEach((c) => c.classList.remove('on'));
      picker.querySelector('.node--full')?.classList.add('on');
      liveSections().forEach((el) => el.removeAttribute('data-handoff-on'));
      render();
    }

    function buildTree() {
      picker.innerHTML = '<div class="picker__label">Sections</div><div class="tree"></div>';
      const tree = picker.querySelector('.tree');
      manifest.sections.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'node';
        b.title = s.label;
        b.textContent = s.label;
        b.onclick = () => select(i);
        tree.appendChild(b);
      });
      if (manifest.full) {
        const f = document.createElement('button');
        f.className = 'node node--full';
        f.textContent = manifest.full.label || 'Full page';
        f.onclick = selectFull;
        picker.appendChild(f);
      }
    }

    const onPageClick = (e) => {
      if (!active) return;
      const top = liveSections().find((el) => el.contains(e.target));
      if (!top) return;
      e.preventDefault();
      e.stopPropagation();
      select(liveSections().indexOf(top));
    };

    function setActive(on) {
      active = on;
      panel.style.display = on ? '' : 'none';
      if (on) {
        document.head.append(pageStyle);
        liveSections().forEach((el) => el.setAttribute('data-handoff-pick', ''));
        document.addEventListener('click', onPageClick, true);
      } else {
        pageStyle.remove();
        liveSections().forEach((el) => {
          el.removeAttribute('data-handoff-pick');
          el.removeAttribute('data-handoff-on');
        });
        document.removeEventListener('click', onPageClick, true);
      }
    }

    // Copy the active tab's raw content: HTML / CSS verbatim, tokens as CSS
    // custom-property declarations ready to paste into a :root block.
    function copyText() {
      if (!current) return '';
      if (tab === 'html') return current.html || '';
      if (tab === 'css') return current.css || '';
      return (current.tokens || []).map((t) => `${t.name}: ${t.value};`).join('\n');
    }
    const flash = (btn, restore, ok = true) => {
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

    // "Copy for Claude": a fetchable link to this section's self-contained spec,
    // plus a one-line instruction — paste into Claude, which web-fetches it.
    claudeBtn.onclick = async () => {
      if (!current?.claudePath) return;
      const url = new URL(base + current.claudePath, location.origin).href;
      // Hand Claude both targets — a hosted URL (deployed) and the repo-relative
      // path (a dev working in a checkout) — and let it use whichever it can reach.
      const lines = [
        'Re-implement this UI section on my stack, faithfully, keeping the CSS custom-property names.',
        'Spec (markup + styles + tokens) — use whichever you can reach:',
        `• hosted URL: ${url}`,
      ];
      if (current.repoPath) lines.push(`• in this repo: ${current.repoPath}`);
      const text = lines.join('\n');
      try {
        await navigator.clipboard.writeText(text);
        flash(claudeBtn, 'Copied link');
      } catch {
        flash(claudeBtn, 'Failed', false);
      }
    };

    wrap.querySelector('.x').onclick = () => app.toggleState({ state: false });
    tabBtns.forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.tab;
          tabBtns.forEach((x) => x.classList.toggle('on', x === b));
          render();
        })
    );

    app.onToggled(({ state }) => setActive(state));
    setActive(false);

    fetch(MANIFEST_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m) => {
        manifest = m;
        buildTree();
        render();
      })
      .catch(() => render());
  },
});
