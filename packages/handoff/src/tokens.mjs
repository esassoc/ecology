// Classify each referenced token into its 3-tier provenance (plus brand/private)
// by reading the AUTHORITATIVE source: the @esa/tokens DTCG JSON and the authored
// component-tokens.css. This is why handoff lives in the hub — it can name a
// token's tier with certainty rather than guessing from the name.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// DTCG nesting → CSS var name: { color: { gray: { 0: {...} } } } → --color-gray-0
function flattenToVarNames(obj, path = []) {
  const names = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (val && typeof val === 'object' && '$value' in val) {
      names.push('--' + [...path, key].join('-'));
    } else if (val && typeof val === 'object') {
      names.push(...flattenToVarNames(val, [...path, key]));
    }
  }
  return names;
}

async function namesFromJsonDir(dir) {
  const names = new Set();
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return names; // tier source absent — degrade to heuristic
  }
  for (const f of files) {
    const json = JSON.parse(await readFile(join(dir, f), 'utf8'));
    for (const n of flattenToVarNames(json)) names.add(n);
  }
  return names;
}

// Build name→tier lookups from the hub's token packages.
export async function buildTierIndex(tokensPkgDir) {
  const primitive = await namesFromJsonDir(join(tokensPkgDir, 'tokens', 'primitive'));
  const semantic = await namesFromJsonDir(join(tokensPkgDir, 'tokens', 'semantic'));
  const component = new Set();
  try {
    const css = await readFile(join(tokensPkgDir, 'src', 'component-tokens.css'), 'utf8');
    for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) component.add(m[1]);
  } catch {
    /* component-tokens.css absent — fine */
  }
  return { primitive, semantic, component };
}

// Classify all referenced tokens; split into the dev-facing contract (resolved
// at :root) and the private/scoped ones (defined per-component, no root value).
export function classifyTokens(tokenNames, tokenValues, index) {
  const classified = tokenNames.map((name) => ({
    name,
    value: tokenValues[name] || '',
    tier: name.startsWith('--cbf-')
      ? 'brand'
      : name.startsWith('--_')
        ? 'private'
        : index.semantic.has(name)
          ? 'semantic'
          : index.primitive.has(name)
            ? 'primitive'
            : index.component.has(name)
              ? 'component'
              : 'component',
  }));
  // Dev contract = tokens that resolve to a value at :root, minus private impl.
  const contract = classified.filter((t) => t.value && t.tier !== 'private');
  const scoped = classified.filter((t) => !t.value && t.tier !== 'private');
  return { classified, contract, scoped };
}

// Synthesize the minimal, flattened :root block — every referenced token defined
// ONCE at its resolved value. Replaces the original primitive→semantic ramps.
export function synthesizeRootCss(contract, themeAttr) {
  const lines = contract.map((t) => `  ${t.name}: ${t.value};`).join('\n');
  const scope = themeAttr ? `:root,\n[data-theme="${themeAttr}"]` : ':root';
  return `${scope} {\n${lines}\n}`;
}
