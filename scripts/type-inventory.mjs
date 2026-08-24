/**
 * P0 of docs/typography-adoption-plan.md — the typography inventory.
 *
 * For every CSS rule in the component kit that sets a typography property, resolve
 * what it ACTUALLY renders (following component privates -> tier-3 hooks -> tier-2
 * -> tier-1) and compare that against every composite role. Output: which role each
 * rule is nearest to, and exactly which properties would change on adoption.
 *
 * Read-only. Prints a table; writes nothing.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const COMPONENTS = path.join(ROOT, 'packages/ecology/src/components');
const TOKENS = path.join(ROOT, 'packages/tokens');

const PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform'];

/* ------------------------------------------------------------- token layer */

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripAtRules = (css) => {
  let out = '';
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith('@media', i) || css.startsWith('@supports', i)) {
      const open = css.indexOf('{', i);
      if (open === -1) break;
      let depth = 0, j = open;
      for (; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}' && --depth === 0) break;
      }
      i = j;
      continue;
    }
    out += css[i];
  }
  return out;
};

/** name -> value, first declaration wins (the :root default). */
const parseDefs = (css, into = new Map()) => {
  for (const [, n, v] of stripAtRules(stripComments(css)).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (!into.has(n)) into.set(n, v.trim());
  }
  return into;
};

const globalDefs = parseDefs(readFileSync(path.join(TOKENS, 'dist/tokens.css'), 'utf8'));
parseDefs(readFileSync(path.join(TOKENS, 'src/component-tokens.css'), 'utf8'), globalDefs);

/** Resolve a value to its terminal literal. `locals` are the file's own --_* tokens. */
const resolve = (value, locals, depth = 0) => {
  if (depth > 12 || value == null) return value;
  const m = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (!m) return value.trim();
  const [, name, fallback] = m;
  const next = locals.get(name) ?? globalDefs.get(name);
  if (next !== undefined) return resolve(next, locals, depth + 1);
  return fallback !== undefined ? resolve(fallback.trim(), locals, depth + 1) : `UNDECLARED(${name})`;
};

/* ------------------------------------------------------------------- roles */

const ROLE_NAMES = [...new Set(
  [...globalDefs.keys()]
    .filter((n) => n.startsWith('--typography-'))
    .map((n) => n.replace(/^--typography-/, '').replace(/-(font-family|font-size|font-weight|line-height|letter-spacing|text-transform)$/, '')),
)];

const roles = ROLE_NAMES.map((role) => {
  const props = {};
  for (const p of PROPS) {
    const raw = globalDefs.get(`--typography-${role}-${p}`);
    if (raw !== undefined) props[p] = resolve(raw, new Map());
  }
  return { role, props };
});

/* ------------------------------------------------------- component CSS text */

/** Pull the CSS out of a component: <style> blocks for .astro, css`` for Lit. */
const cssOf = (src, file) =>
  file.endsWith('.astro')
    ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    : [...src.matchAll(/css`([\s\S]*?)`;/g)].map((m) => m[1]).join('\n');

/** Flat list of {selector, decls} — nested at-rules are flattened away first. */
const rulesOf = (css) => {
  const out = [];
  const flat = stripAtRules(stripComments(css));
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const decls = new Map();
    for (const d of m[2].matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) decls.set(d[1].trim(), d[2].trim());
    if (selector) out.push({ selector, decls });
  }
  return out;
};

/* -------------------------------------------------------------- the sweep */

const rows = [];
for (const file of readdirSync(COMPONENTS).sort()) {
  if (!/\.(astro|ts)$/.test(file) || file.startsWith('_')) continue;
  const src = readFileSync(path.join(COMPONENTS, file), 'utf8');
  const css = cssOf(src, file);
  if (!css.trim()) continue;

  const all = rulesOf(css);
  // The file's own --_* tokens, so a rule reading --_badge-font-size resolves.
  const locals = new Map();
  for (const r of all) for (const [k, v] of r.decls) if (k.startsWith('--')) if (!locals.has(k)) locals.set(k, v);

  for (const { selector, decls } of all) {
    const set = PROPS.filter((p) => decls.has(p));
    if (!set.length) continue;
    const resolved = {};
    for (const p of set) resolved[p] = resolve(decls.get(p), locals);
    rows.push({ file, selector, declared: Object.fromEntries(set.map((p) => [p, decls.get(p)])), resolved });
  }
}

/* ------------------------------------------------- nearest role + the delta */

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Tie-break order. Prose roles beat code roles at the same size; the big display
 *  roles sit last because a component landing there is nearly always a mis-match. */
const PREFERENCE = [
  'body-md', 'body-sm', 'body-lg', 'meta',
  'label-md', 'label-sm', 'label-xs',
  'label-md-strong', 'label-sm-strong', 'label-xs-strong',
  'title', 'title-strong',
  'code-sm', 'code-md', 'code-lg',
  'heading-md', 'heading-lg', 'eyebrow-md', 'eyebrow-sm', 'display',
];
/** Unlisted roles must sort LAST, not first — `indexOf` returning -1 made every new
 *  role beat every established one and swallowed body-md's 25 rules whole. */
const prefOf = (role) => (PREFERENCE.indexOf(role) === -1 ? 999 : PREFERENCE.indexOf(role));

/**
 * font-size is the DISCRIMINATOR. Without gating on it, a rule that sets only
 * `font-family: var(--typography-font-family-sans)` matches all 13 roles equally and gets filed under
 * whichever happens to be first — which put 73 rules under `display` and `title`,
 * two roles no component should ever want.
 *
 * A rule with no font-size is not adopting a role, it is adjusting one property.
 * Those are reported separately: they are the call sites that need a role added
 * rather than swapped.
 */
for (const row of rows) {
  if (!('font-size' in row.resolved)) { row.partial = true; continue; }

  const sized = roles.filter((r) => norm(r.props['font-size']) === norm(row.resolved['font-size']));
  // No role holds this size — almost always a hardcoded px/rem literal. Assigning a
  // "nearest" role here is noise: it would report a 13px badge as wanting `display`.
  if (!sized.length) { row.noRoleAtSize = true; continue; }

  let best = null;
  for (const r of sized) {
    let match = 0, differ = 0;
    const delta = {};
    for (const p of Object.keys(row.resolved)) {
      if (r.props[p] === undefined) continue;
      if (norm(r.props[p]) === norm(row.resolved[p])) match++;
      else { differ++; delta[p] = { now: row.resolved[p], role: r.props[p] }; }
    }
    const score = match - differ;
    // Ties are common: body-md and code-md are the same size, so a rule setting only
    // size + weight scores identically against both. Break toward the prose role —
    // code-* is only right when the rule actually asks for the mono face.
    const pref = prefOf(r.role);
    if (!best || score > best.score || (score === best.score && pref < best.pref)) {
      best = { role: r.role, score, pref, match, differ, delta };
    }
  }
  row.best = best;
}

/* ------------------------------------------------------------------ report */

const sized = rows.filter((r) => r.best);
const partial = rows.filter((r) => r.partial);
const offScale = rows.filter((r) => r.noRoleAtSize);
const exact = sized.filter((r) => r.best.differ === 0);
const near = sized.filter((r) => r.best.differ > 0);

console.log(`\nTYPOGRAPHY INVENTORY — ${rows.length} rules across ${new Set(rows.map((r) => r.file)).size} components`);
console.log(`  ${sized.length} sit at a size a role holds`);
console.log(`     ${exact.length} match that role on EVERY property — adoption is value-neutral`);
console.log(`     ${near.length} differ on at least one`);
console.log(`  ${offScale.length} sit at a size NO role holds — off the type scale entirely`);
console.log(`  ${partial.length} set typography without a size — adjusting one property, not claiming a role\n`);

if (offScale.length) {
  console.log('OFF THE SCALE — these sizes exist nowhere in the system');
  const bySize = new Map();
  for (const r of offScale) {
    const s = norm(r.resolved['font-size']);
    if (!bySize.has(s)) bySize.set(s, []);
    bySize.get(s).push(`${r.file} ${r.selector}`);
  }
  for (const [s, who] of [...bySize].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${s.padEnd(46)} ${who.length}`);
  }
  console.log('');
}

console.log('BY NEAREST ROLE');
const byRole = new Map();
for (const r of sized) {
  if (!byRole.has(r.best.role)) byRole.set(r.best.role, []);
  byRole.get(r.best.role).push(r);
}
for (const [role, rs] of [...byRole].sort((a, b) => b[1].length - a[1].length)) {
  const clean = rs.filter((r) => r.best.differ === 0).length;
  console.log(`  ${role.padEnd(12)} ${String(rs.length).padStart(3)} rules   ${clean} exact   ${rs.length - clean} need a decision`);
}

console.log('\nPROPERTIES THAT WOULD CHANGE');
const deltaCount = new Map();
for (const r of near) for (const p of Object.keys(r.best.delta)) deltaCount.set(p, (deltaCount.get(p) ?? 0) + 1);
for (const [p, n] of [...deltaCount].sort((a, b) => b[1] - a[1])) console.log(`  ${p.padEnd(16)} ${n}`);

if (process.argv.includes('--detail')) {
  console.log('\nDETAIL');
  for (const [role, rs] of [...byRole].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n=== ${role} ===`);
    for (const r of rs) {
      const flag = r.best.differ === 0 ? 'exact' : Object.keys(r.best.delta).join(',');
      console.log(`  ${r.file.padEnd(26)} ${r.selector.slice(0, 44).padEnd(46)} ${flag}`);
      if (r.best.differ) for (const [p, d] of Object.entries(r.best.delta)) console.log(`      ${p}: ${d.now}  ->  ${d.role}`);
    }
  }
}

/**
 * `--json <path>` snapshots what every rule RENDERS today. Taken before the
 * migration and again after, it is the proof of value-neutrality: the claim is that
 * components change which token they name, not what they draw, and this is the only
 * thing that can check that claim rather than assert it.
 */
const jsonAt = process.argv.indexOf('--json');
if (jsonAt !== -1 && process.argv[jsonAt + 1]) {
  const snapshot = {};
  for (const r of rows) {
    snapshot[`${r.file} :: ${r.selector}`] = Object.fromEntries(
      Object.entries(r.resolved).map(([p, v]) => [p, norm(v)]),
    );
  }
  writeFileSync(process.argv[jsonAt + 1], JSON.stringify(snapshot, null, 2));
  console.log(`\n→ snapshot written: ${Object.keys(snapshot).length} rules → ${process.argv[jsonAt + 1]}`);
}

const undeclared = rows.flatMap((r) => Object.values(r.resolved)).filter((v) => String(v).startsWith('UNDECLARED'));
if (undeclared.length) console.log(`\n⚠ ${undeclared.length} reads resolved to an undeclared token: ${[...new Set(undeclared)].join(', ')}`);
