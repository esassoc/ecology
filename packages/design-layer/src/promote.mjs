// Save to Source: the design layer's one write path into real token sources,
// on the dev server's side. Node only, no framework, like store.mjs.
//
// The panel sends what it would promote (every component- and token-scope
// value, already expanded through the page's lineage, with the value each
// replaces); this module decides where each one lives and returns the plan, and
// on `write` applies it. Instance scope never comes here: it stays an override.
//
// Where a value lands:
//   - Declared already in a hand-authored theme file, in the block for its mode:
//     edited in place, so the source reads as if a person had changed it.
//   - A spoke's token-scope colour with a recipe (theme-<slug>.json): the recipe's
//     `pinned` / `pinnedDark`, then make-theme.mjs regenerates the css. The
//     generated file is never edited (its header says why).
//   - The hub's token scope: the DTCG json, then the Style Dictionary build.
//   - The hub's component scope: component-tokens.css, for declared tier-3
//     names only. A tier-2 value differing for one component is a hook the hub
//     has not got, which is a SPEC.md decision, not a save.
//   - Anything else in a spoke: one managed block at the end of its theme file,
//     between design-layer:start and design-layer:end, merged on each save.
// A spoke's save never writes outside the spoke (guard-hub-writes).
import { existsSync, readFileSync, writeFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve, sep, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

/** @typedef {import('./types').PromoteEntry} PromoteEntry */
/** @typedef {import('./types').PromotePlan} PromotePlan */
/** @typedef {import('./types').ResolvedConfig} ResolvedConfig */

const START = '/* design-layer:start';
const END = '/* design-layer:end */';
const HEADER = `${START} — written by the design layer's Save to Source. Edit freely: a later save merges into these rules and rewrites only this block. */`;
const DARK = /\[data-scheme=["']?dark["']?\]/;
const LIGHT_ONLY = /:not\(\[data-scheme=["']?dark["']?\]\)|\[data-scheme=["']?light["']?\]/;
const ASSURED = /data-a11y-assurance/;

// --- where we are ------------------------------------------------------------

/** The hub repo containing `dir`, or null. */
function hubAbove(dir) {
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, '.claude-plugin/marketplace.json')) && existsSync(join(d, 'packages/tokens/tokens'))) return d;
    if (dirname(d) === d) return null;
  }
}

/** Hub or spoke, and every file this save may read or write. */
function context(root, cfg) {
  const hub = hubAbove(root);
  if (hub) {
    return {
      kind: 'hub',
      root: hub,
      tokens: join(hub, 'packages/tokens'),
      slug: null,
      recipe: null,
      // Read in this order; the DTCG json comes before all of them.
      themeFiles: [join(hub, 'packages/tokens/src/component-tokens.css'), join(hub, 'apps/site/src/styles/docs-dark.css')].filter((f) => existsSync(f)),
      blockFile: null,
    };
  }
  const link = join(root, 'node_modules/@esa/tokens');
  const tokens = existsSync(link) ? realpathSync(link) : null;
  const styles = join(root, cfg.sourceFiles?.dir ?? 'src/styles');
  const css = existsSync(styles) ? readdirSync(styles).filter((f) => f.endsWith('.css')).map((f) => join(styles, f)) : [];
  const recipes = existsSync(styles)
    ? readdirSync(styles).filter((f) => /^theme-.+\.json$/.test(f)).map((f) => join(styles, f)).filter((f) => {
        try { return !!JSON.parse(readFileSync(f, 'utf8')).seeds; } catch { return false; }
      })
    : [];
  const recipe = cfg.sourceFiles?.recipe ? join(root, cfg.sourceFiles.recipe) : recipes[0] ?? null;
  const generated = (f) => recipes.some((r) => r.replace(/\.json$/, '.css') === f) || /GENERATED from a recipe|Do not hand-edit/.test(readFileSync(f, 'utf8').slice(0, 600));
  let slug = cfg.sourceFiles?.theme ?? null;
  if (!slug && recipe) slug = JSON.parse(readFileSync(recipe, 'utf8')).slug ?? null;
  if (!slug) {
    const counts = new Map();
    for (const f of css) for (const m of readFileSync(f, 'utf8').matchAll(/\[data-theme=["']([\w-]+)["']\]/g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    slug = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  const mentions = (f) => slug && readFileSync(f, 'utf8').includes(`[data-theme="${slug}"]`);
  const hand = (cfg.sourceFiles?.themeFiles ? cfg.sourceFiles.themeFiles.map((f) => join(root, f)) : css.filter((f) => !generated(f) && mentions(f)));
  const pick = cfg.sourceFiles?.components
    ? join(root, cfg.sourceFiles.components)
    : hand.find((f) => basename(f) === 'theme-app.css') ?? hand.find((f) => basename(f) === `theme-${slug}.css`) ?? hand[0] ?? null;
  return { kind: 'spoke', root, tokens, slug, recipe, themeFiles: hand, blockFile: pick };
}

// --- the hub's DTCG names ----------------------------------------------------

/** Every token the hub's json declares, by CSS name: { file, path, tier, value }. */
function dtcgIndex(tokensDir) {
  const out = new Map();
  if (!tokensDir) return out;
  const dir = join(tokensDir, 'tokens');
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.json')) {
        const tier = p.includes(`${sep}primitive${sep}`) ? 1 : 2;
        const visit = (node, path) => {
          if (!node || typeof node !== 'object') return;
          if ('$value' in node) { out.set(`--${path.join('-')}`, { file: p, path, tier, value: node.$value }); return; }
          for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) visit(v, [...path, k]);
        };
        visit(JSON.parse(readFileSync(p, 'utf8')), []);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** A css value as DTCG: var(--known) becomes its {reference}, anything else stays literal. */
function toDtcg(value, index) {
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  const hit = m && index.get(m[1]);
  return hit ? `{${hit.path.join('.')}}` : value.trim();
}

// --- css: just enough parsing to edit a declaration in place -------------------

/** Rules with their selector, brace positions and enclosing at-rules. Comments and strings are skipped. */
function parseRules(css) {
  const out = [];
  const stack = [];
  let selStart = 0;
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith('/*', i)) { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 1; continue; }
    const c = css[i];
    if (c === '"' || c === "'") { const e = css.indexOf(c, i + 1); i = e < 0 ? css.length : e; continue; }
    if (c === '{') { stack.push({ sel: css.slice(selStart, i).replace(/\/\*[\s\S]*?\*\//g, '').trim(), open: i }); selStart = i + 1; }
    else if (c === '}') { const r = stack.pop(); if (r) out.push({ sel: r.sel, open: r.open, close: i, nested: stack.length > 0 }); selStart = i + 1; }
    else if (c === ';') selStart = i + 1;
  }
  return out;
}

/** The body of a rule with comments and nested rules blanked to spaces (same length). */
function flatBody(css, rule, all) {
  let body = css.slice(rule.open + 1, rule.close).replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  for (const r of all) {
    if (r === rule || r.open < rule.open || r.close > rule.close) continue;
    const a = r.open - rule.open - 1;
    const b = r.close - rule.open;
    body = body.slice(0, a) + ' '.repeat(b - a) + body.slice(b);
  }
  return body;
}

/** A declaration of `name` directly in `rule`: its value's absolute range and text. */
function findDecl(css, rule, all, name) {
  const body = flatBody(css, rule, all);
  const re = new RegExp(`(^|[;{\\s])${name.replace(/[-]/g, '\\-')}\\s*:`, 'g');
  let m, last = null;
  while ((m = re.exec(body))) last = m;
  if (!last) return null;
  const vStart = last.index + last[0].length;
  let vEnd = body.indexOf(';', vStart);
  if (vEnd < 0) vEnd = body.length;
  const raw = body.slice(vStart, vEnd);
  const lead = raw.length - raw.trimStart().length;
  const text = raw.trim();
  const start = rule.open + 1 + vStart + lead;
  return { start, end: start + text.length, value: text };
}

/** A selector naming the theme's root, for a mode: a compound selector, no descendant. */
function rootFor(sel, ctx, mode) {
  return sel.split(',').some((part) => {
    const p = part.trim();
    if (/[\s>+~]/.test(p.replace(/\[[^\]]*\]|\([^)]*\)/g, ''))) return false;
    if (ASSURED.test(p)) return false;
    const names = ctx.kind === 'hub' ? /^(:root|html)\b/.test(p) : p.includes(`[data-theme="${ctx.slug}"]`) || p.includes(`[data-theme='${ctx.slug}']`);
    if (!names) return false;
    if (mode === 'dark') return DARK.test(p);
    if (DARK.test(p)) return false;
    return mode === 'light' || !LIGHT_ONLY.test(p);
  });
}

/** Where `name` is declared at the root for a mode, across the theme files. */
function locate(files, ctx, name, mode, { lightOnly } = {}) {
  for (const f of files) {
    const css = read(f);
    const all = parseRules(css);
    for (const r of all) {
      if (r.nested || !rootFor(r.sel, ctx, mode)) continue;
      if (lightOnly !== undefined && LIGHT_ONLY.test(r.sel) !== lightOnly) continue;
      const d = findDecl(css, r, all, name);
      if (d) return { file: f, rule: r, ...d };
    }
  }
  return null;
}

/** The first root block for a mode, to append a declaration into. */
function firstRoot(files, ctx, mode) {
  for (const f of files) {
    const css = read(f);
    const r = parseRules(css).find((x) => !x.nested && rootFor(x.sel, ctx, mode));
    if (r) return { file: f, rule: r };
  }
  return null;
}

// Reads go through one cache per plan so positions stay valid while edits queue.
let files = new Map();
const read = (f) => {
  if (!files.has(f)) files.set(f, existsSync(f) ? readFileSync(f, 'utf8') : '');
  return files.get(f);
};

// --- the managed block --------------------------------------------------------

function blockRules(css) {
  const s = css.indexOf(START);
  const e = css.indexOf(END);
  const map = new Map();
  if (s < 0 || e < s) return { map, s: -1, e: -1 };
  const inner = css.slice(css.indexOf('*/', s) + 2, e);
  for (const r of parseRules(inner)) {
    if (r.nested) continue;
    const vars = new Map();
    for (const m of flatBody(inner, r, []).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) vars.set(m[1], m[2].trim());
    map.set(r.sel, vars);
  }
  return { map, s, e: e + END.length };
}

function writeBlock(css, map) {
  const { s, e } = blockRules(css);
  const body = [...map].filter(([, v]) => v.size).map(([sel, v]) => `${sel} {\n${[...v].map(([k, x]) => `  ${k}: ${x};`).join('\n')}\n}`).join('\n');
  const block = `${HEADER}\n${body}\n${END}`;
  if (s >= 0) return css.slice(0, s) + block + css.slice(e);
  return `${css.replace(/\s*$/, '')}\n\n${block}\n`;
}

const rootSel = (slug, mode) =>
  mode === 'dark' ? `html[data-scheme="dark"][data-theme="${slug}"]`
    : mode === 'light' ? `html:not([data-scheme="dark"])[data-theme="${slug}"]`
      : `[data-theme="${slug}"]`;

// --- the plan -----------------------------------------------------------------

const keyOf = (e) => `${e.scope}|${e.selector ?? ''}|${e.mode}|${e.cssVar}`;

/**
 * @param {string} root the dev server's root
 * @param {ResolvedConfig} cfg
 * @param {{ entries: PromoteEntry[]; instances: number }} req
 * @returns {{ plan: PromotePlan; apply: () => string[] }}
 */
export function planPromotion(root, cfg, req) {
  files = new Map();
  const ctx = context(root, cfg);
  const index = dtcgIndex(ctx.tokens);
  const rel = (f) => relative(ctx.root, f) || f;

  /** Edits per file: in-place ranges, inserts, the managed block, json changes. */
  const edits = new Map();
  const at = (f) => {
    if (!edits.has(f)) edits.set(f, { ranges: [], inserts: [], block: null, json: [] });
    return edits.get(f);
  };
  /** @type {Map<string, import('./types').PromoteFile>} */
  const out = new Map();
  const change = (f, label, c) => {
    if (!out.has(f)) out.set(f, { path: rel(f), label, changes: [] });
    out.get(f).changes.push(c);
  };
  const skipped = [];
  const keys = [];
  const darkEdited = new Set(req.entries.filter((e) => e.mode === 'dark').map((e) => `${e.scope}|${e.selector ?? ''}|${e.cssVar}`));
  const restated = new Set();

  /** Keep the dark scheme where it was when a light value lands in a block both schemes read. */
  function restateDark(e) {
    const id = `${e.scope}|${e.selector ?? ''}|${e.cssVar}`;
    if (darkEdited.has(id) || restated.has(id)) return;
    restated.add(id);
    if (locate(ctx.themeFiles, ctx, e.cssVar, 'dark')) return;
    if (e.darkBase == null) return;
    const host = firstRoot(ctx.themeFiles, ctx, 'dark');
    if (host) {
      at(host.file).inserts.push({ at: host.rule.close, text: `  ${e.cssVar}: ${e.darkBase};\n` });
      change(host.file, 'Edit', { name: 'Dark', cssVar: e.cssVar, mode: 'dark', from: null, to: e.darkBase, note: 'Keeps dark where it was' });
    } else if (ctx.blockFile && ctx.slug) {
      putBlock(rootSel(ctx.slug, 'dark'), e.cssVar, e.darkBase, { name: 'Dark', mode: 'dark', note: 'Keeps dark where it was' });
    }
  }

  function putBlock(sel, cssVar, value, c) {
    const f = ctx.blockFile;
    const ed = at(f);
    if (!ed.block) ed.block = blockRules(read(f)).map;
    if (!ed.block.has(sel)) ed.block.set(sel, new Map());
    const from = ed.block.get(sel).get(cssVar) ?? null;
    ed.block.get(sel).set(cssVar, value);
    change(f, 'Design Layer Block', { ...c, cssVar, from, to: value });
  }

  function inPlace(e, hit, name) {
    at(hit.file).ranges.push({ start: hit.start, end: hit.end, text: e.value });
    change(hit.file, 'Edit', { name, cssVar: e.cssVar, mode: e.mode, from: hit.value, to: e.value });
    if (e.mode === 'light' && !LIGHT_ONLY.test(hit.rule.sel)) restateDark(e);
  }

  for (const e of req.entries) {
    const name = e.scope === 'token' ? 'Root' : e.name;
    const skip = (reason) => { if (!e.expanded) skipped.push({ name, cssVar: e.cssVar, mode: e.mode, reason }); };
    const tok = index.get(e.cssVar);

    if (tok?.tier === 1 && e.scope === 'token') { skip('Primitives never move; re-point the role that reads it.'); continue; }

    if (e.scope === 'token' || (ctx.kind === 'hub' && e.scope === 'component')) {
      if (ctx.kind === 'hub' && e.expanded) continue;
      // The hub: DTCG first (light and both-scheme values), then its css sources.
      if (ctx.kind === 'hub' && e.scope === 'token' && e.mode !== 'dark' && tok && typeof tok.value === 'string') {
        const to = toDtcg(e.value, index);
        at(tok.file).json.push({ kind: 'dtcg', path: tok.path, value: to });
        change(tok.file, 'Token Json', { name: tok.path.join('.'), cssVar: e.cssVar, mode: e.mode, from: tok.value, to });
        if (e.mode === 'light') restateDark(e);
        keys.push(keyOf(e));
        continue;
      }
      const hit = (e.mode === 'light' && locate(ctx.themeFiles, ctx, e.cssVar, 'light', { lightOnly: true }))
        || locate(ctx.themeFiles, ctx, e.cssVar, e.mode);
      if (hit) {
        if (ctx.kind === 'hub' && e.scope === 'component' && !hit.file.endsWith('component-tokens.css') && e.mode !== 'dark') { skip('The hub has no hook for this on one component; declare a tier-3 token first (SPEC.md).'); continue; }
        inPlace(e, hit, name);
        keys.push(keyOf(e));
        continue;
      }
      if (ctx.kind === 'hub') {
        skip(e.scope === 'component'
          ? 'The hub has no hook for this on one component; declare a tier-3 token first (SPEC.md).'
          : e.mode === 'dark' ? 'No hub source declares this for dark.' : 'No hub source declares this name.');
        continue;
      }
      // A spoke: a colour goes to the recipe when there is one; everything else to the block.
      if (ctx.recipe && e.mode !== 'shared') {
        const recipe = at(ctx.recipe);
        const map = e.mode === 'dark' ? 'pinnedDark' : 'pinned';
        recipe.json.push({ kind: 'recipe', path: [map, e.cssVar], value: e.value });
        change(ctx.recipe, 'Recipe', { name: map === 'pinned' ? 'Pinned' : 'Pinned Dark', cssVar: e.cssVar, mode: e.mode, from: e.base ?? null, to: e.value });
        if (e.mode === 'light' && !darkEdited.has(`${e.scope}||${e.cssVar}`) && e.darkBase != null) {
          const pins = JSON.parse(read(ctx.recipe)).pinnedDark ?? {};
          if (!(e.cssVar in pins)) {
            recipe.json.push({ kind: 'recipe', path: ['pinnedDark', e.cssVar], value: e.darkBase });
            change(ctx.recipe, 'Recipe', { name: 'Pinned Dark', cssVar: e.cssVar, mode: 'dark', from: null, to: e.darkBase, note: 'Keeps dark where it was' });
          }
        }
        keys.push(keyOf(e));
        continue;
      }
      if (!ctx.blockFile || !ctx.slug) { skip('No theme file in this spoke to write to.'); continue; }
      putBlock(rootSel(ctx.slug, e.mode), e.cssVar, e.value, { name, mode: e.mode });
      keys.push(keyOf(e));
      continue;
    }

    // Component scope in a spoke: the managed block, under the theme.
    if (/data-dl-/.test(e.selector ?? '')) { skip('This component\'s root has no class to target outside the dev server.'); continue; }
    if (!ctx.blockFile || !ctx.slug) { skip('No theme file in this spoke to write to.'); continue; }
    putBlock(`${rootSel(ctx.slug, e.mode)} ${e.selector}`, e.cssVar, e.value, { name, mode: e.mode, note: e.expanded ? 'Follows the edit inside this component' : undefined });
    if (!e.expanded) keys.push(keyOf(e));
  }

  // Never write outside the spoke from a spoke.
  if (ctx.kind === 'spoke') {
    const inside = realpathSync(ctx.root) + sep;
    for (const f of edits.keys()) {
      const real = existsSync(f) ? realpathSync(f) : resolve(f);
      if (!real.startsWith(inside)) throw new Error(`Refusing to write ${f}: it is outside the spoke.`);
    }
  }

  const regenerate = [];
  if (edits.has(ctx.recipe)) regenerate.push('theme');
  if (ctx.kind === 'hub' && [...edits.keys()].some((f) => f.endsWith('.json'))) regenerate.push('tokens');

  const plan = {
    context: ctx.kind,
    files: [...out.values()],
    skipped,
    instances: req.instances,
    regenerate: regenerate.map((r) => (r === 'theme' ? `${rel(ctx.recipe).replace(/\.json$/, '.css')} regenerates from the recipe` : 'The token build runs (packages/tokens)')),
    keys,
  };

  function apply() {
    for (const [f, ed] of edits) {
      let text = read(f);
      if (ed.json.length) {
        const obj = JSON.parse(text);
        for (const j of ed.json) {
          let node = obj;
          const path = j.kind === 'dtcg' ? j.path : j.path.slice(0, -1);
          for (const k of path) node = node[k] ??= {};
          if (j.kind === 'dtcg') node.$value = j.value;
          else node[j.path[j.path.length - 1]] = j.value;
        }
        text = `${JSON.stringify(obj, null, 2)}\n`;
      } else {
        const ops = [...ed.ranges.map((r) => ({ ...r, kind: 0 })), ...ed.inserts.map((r) => ({ start: r.at, end: r.at, text: r.text, kind: 1 }))]
          .sort((a, b) => b.start - a.start);
        for (const o of ops) text = text.slice(0, o.start) + o.text + text.slice(o.end);
        if (ed.block) text = writeBlock(text, ed.block);
      }
      writeFileSync(f, text);
    }
    const ran = [];
    if (regenerate.includes('theme')) {
      const script = join(ctx.tokens ?? '', '../../scripts/make-theme.mjs');
      execFileSync(process.execPath, [script, '--recipe', ctx.recipe, '--out', dirname(ctx.recipe), '--force'], { cwd: ctx.root, stdio: 'pipe' });
      ran.push(rel(ctx.recipe).replace(/\.json$/, '.css'));
    }
    if (regenerate.includes('tokens')) {
      execFileSync(process.execPath, ['build.js'], { cwd: ctx.tokens, stdio: 'pipe' });
      ran.push('packages/tokens/dist');
    }
    return ran;
  }

  return { plan, apply };
}
