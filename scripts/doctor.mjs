#!/usr/bin/env node
/**
 * doctor.mjs — environment check for the Ecology hub-and-spoke system.
 *
 * Run from a SPOKE (`npm run doctor`) or from the hub. Verifies everything a
 * teammate needs before prototyping, each check with a plain fix line.
 * Node-only, cross-platform (Windows + macOS).
 *
 * Bootstrap note (documented in ONBOARDING.md): if this script itself fails
 * to start from a spoke ("Cannot find module"), the ecology hub isn't cloned
 * NEXT TO the spoke folder — that's the fix.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Resolves against THIS script's path, not the spoke's cwd — spokes run the
// hub's copy directly as `../ecology/scripts/doctor.mjs`.
import { renameProp, renameComponent, declPattern, readPattern } from './lib/token-rename.mjs';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CWD = process.cwd();

const results = [];
const check = (name, ok, fix) => {
  results.push({ name, ok, fix });
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${ok || !fix ? '' : `\n      fix: ${fix}`}`);
};
// Non-fatal: same column style as check(), but never counts toward the exit code.
const warn = (name, ok, fix) => {
  console.log(`${ok ? '  ok ' : 'WARN '} ${name}${ok || !fix ? '' : `\n      fix: ${fix}`}`);
};
const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// --- Where are we? -----------------------------------------------------------
const pkg = readJson(path.join(CWD, 'package.json'));
const isSpoke = !!(pkg?.dependencies?.['@esa/ecology'] || pkg?.devDependencies?.['@esa/ecology']);
const isHub = pkg?.name === 'ecology-hub';
console.log(`ecology doctor — checking ${isSpoke ? `spoke "${pkg.name}"` : isHub ? 'the hub' : `"${CWD}" (not a spoke or the hub — some checks skipped)`}\n`);

// --- 1. Node -----------------------------------------------------------------
const major = Number(process.versions.node.split('.')[0]);
check(`node >= 20 (found ${process.versions.node})`, major >= 20, 'install Node LTS from nodejs.org (or via winget: winget install OpenJS.NodeJS.LTS)');

// --- 2. git + identity -------------------------------------------------------
const gitV = run('git', ['--version']);
check('git installed', !!gitV, 'install Git for Windows: winget install Git.Git (macOS: xcode-select --install)');
if (gitV) {
  const name = run('git', ['config', '--get', 'user.name']);
  const email = run('git', ['config', '--get', 'user.email']);
  // Fix lines use `;` not `&&`: Windows PowerShell 5.1 — what teammates get from
  // "Start -> PowerShell" — rejects `&&` ("not a valid statement separator").
  // `;` sequences statements in PowerShell AND bash, so one string serves both.
  check('git identity set (user.name + user.email)', !!(name && email),
    'git config --global user.name "Your Name" ; git config --global user.email "you@esassoc.com"');
}

// --- 3. gh CLI + auth --------------------------------------------------------
const ghV = run('gh', ['--version']);
check('gh CLI installed', !!ghV, 'winget install GitHub.cli (macOS: brew install gh)');
if (ghV) {
  const auth = run('gh', ['auth', 'status']);
  check('gh authenticated', auth !== null,
    'gh auth login   (then ALSO run: gh auth setup-git — without it, pushing/deploying over https has no credentials)');
}

// --- 4. hub sibling + tokens built --------------------------------------------
const hubDir = isHub ? CWD : path.resolve(CWD, '..', 'ecology');
check('ecology hub cloned as a sibling', existsSync(path.join(hubDir, 'packages', 'tokens')),
  `clone it NEXT TO this folder: git clone https://github.com/esassoc/ecology.git ${path.resolve(CWD, '..')}${path.sep}ecology`);
check('hub tokens built (packages/tokens/dist/tokens.css)',
  existsSync(path.join(hubDir, 'packages', 'tokens', 'dist', 'tokens.css')),
  'cd ../ecology ; npm install ; npm run build:tokens');

// --- 4b. hub git state (warn — file: symlinks serve the hub's LIVE working tree)
// A spoke's @esa/* deps point at whatever state ../ecology is in. Off-main or
// dirty means unmerged hub WIP is rendering in this spoke right now.
if (isSpoke && existsSync(path.join(hubDir, '.git'))) {
  const hubGit = (...args) => run('git', ['-C', hubDir, ...args]);
  const branch = hubGit('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch) {
    warn(`hub checkout is on main (found "${branch}")`, branch === 'main',
      `this spoke is rendering unmerged hub branch "${branch}" — park the hub on main: git -C ../ecology switch main`);
    const porcelain = hubGit('status', '--porcelain');
    warn('hub working tree is clean', porcelain === '',
      'uncommitted hub changes are live in this spoke right now — commit or stash them in ../ecology');
    const behind = hubGit('rev-list', '--count', 'HEAD..origin/main');
    if (behind !== null) {
      warn('hub is up to date with origin/main', behind === '0',
        `this machine is prototyping against a stale hub (${behind} commit(s) behind) — git -C ../ecology pull, then npm run build:tokens there`);
    }
  }
}

// --- 5. spoke install ----------------------------------------------------------
if (isSpoke) {
  check('spoke dependencies installed (node_modules/@esa/ecology resolves)',
    existsSync(path.join(CWD, 'node_modules', '@esa', 'ecology')),
    'npm install   (run it in this folder)');
}

// --- 6. Claude plugin ----------------------------------------------------------
const profile = process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), '.claude');
const hasMarketplace = [
  path.join(profile, 'settings.json'),
  path.join(profile, 'plugins', 'known_marketplaces.json'),
].some((p) => {
  try {
    return readFileSync(p, 'utf8').includes('"ecology"');
  } catch {
    return false;
  }
});
check('Claude ecology plugin marketplace installed', hasMarketplace,
  'claude plugin marketplace add esassoc/ecology ; claude plugin install spoke-kit@ecology');

// --- 7. spoke-kit plugin freshness (source vs installed cache) -----------------
// The cached-plugin republish gotcha: hub edits to hooks/skills stay inert until
// the plugin is republished. Warn (non-fatal) when SOURCE is ahead of what's
// actually installed in the Claude plugin cache.
const semverCmp = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  return 0;
};
const srcVersion = readJson(path.join(HUB_ROOT, 'plugins', 'spoke-kit', '.claude-plugin', 'plugin.json'))?.version;
const cacheDir = path.join(profile, 'plugins', 'cache', 'ecology', 'spoke-kit');
let cached = [];
try {
  cached = readdirSync(cacheDir).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
} catch {
  // cache dir absent — likely a fresh machine or plugin not yet installed; skip.
}
if (srcVersion && cached.length) {
  const highest = cached.sort(semverCmp).at(-1);
  warn(`spoke-kit plugin up to date (source ${srcVersion}, installed ${highest})`,
    semverCmp(srcVersion, highest) <= 0,
    `spoke-kit source (${srcVersion}) is ahead of the installed plugin (${highest}) — its hook/skill fixes are inert until you republish: push the hub, then run BOTH \`claude plugin marketplace update ecology\` AND \`claude plugin update spoke-kit@ecology\` (the first alone only refreshes the listing), then restart Claude Code.`);
}

// --- Accessibility assurance profile ------------------------------------------
// Reported, never failed. Opting in is a PROJECT decision — most spokes have no
// conformance obligation and a doctor that nags them about one is a doctor people
// stop reading. What this does is make the state visible, because the failure mode
// is silent in both directions: a project that believes it is assured and never set
// the attribute looks identical to one that did.
if (isSpoke) {
  const tokensCss = path.join(CWD, 'node_modules', '@esa', 'tokens', 'dist', 'tokens.css');
  const profiles = existsSync(tokensCss)
    ? [...new Set([...readFileSync(tokensCss, 'utf8').matchAll(/\[data-a11y-assurance="([^"]+)"\]/g)].map((m) => m[1]))]
    : [];

  // Look for the attribute in the spoke's own layouts — that is where a spoke sets
  // it, on <html>. Source text, not a render: doctor is a fast environment check and
  // must not need a browser or a build.
  let declared = null;
  const layoutDir = path.join(CWD, 'src', 'layouts');
  if (existsSync(layoutDir)) {
    for (const f of readdirSync(layoutDir)) {
      const m = readFileSync(path.join(layoutDir, f), 'utf8').match(/data-a11y-assurance=["']([^"']+)["']/);
      if (m) { declared = m[1]; break; }
    }
  }

  if (declared) {
    // A typo here is the expensive case: the attribute is present, the project
    // believes it is covered, and it matches no block so nothing at all applies.
    warn(
      `accessibility assurance profile: ${declared}`,
      profiles.includes(declared),
      `no [data-a11y-assurance="${declared}"] block exists in @esa/tokens${profiles.length ? ` — available: ${profiles.join(', ')}` : ''}. The attribute is set but matches nothing, so NO profile is applied and nothing says so.`,
    );
    if (profiles.includes(declared)) {
      console.log(
        `      verify it, do not assume it: \`node ../ecology/scripts/check-contrast.mjs src/styles/theme-*.css --assurance ${declared}\`\n` +
          `      A theme's [data-theme] block loads after the profile at equal specificity, so YOUR brand colours still win — the profile cannot fix a brand it does not know about.`,
      );
    }
  } else if (profiles.length) {
    warn(
      'accessibility assurance profile: not set (fine unless this project needs one)',
      true,
      null,
    );
    console.log(
      `      If this project has a conformance obligation, set data-a11y-assurance="${profiles[0]}" on <html>\n` +
        `      in your layouts, then verify with check-contrast.mjs --assurance. It is inert until set.`,
    );
  }
}

// --- Deprecated @esa/tokens names ---------------------------------------------
// A rename in the hub reaches this spoke through the `file:` symlink with no
// publish step to absorb it. Deprecated aliases keep the old names resolving, so
// nothing LOOKS wrong — which is exactly why this has to be reported rather than
// left to be noticed.
if (isSpoke) {
  const manifest = path.join(CWD, 'node_modules', '@esa', 'tokens', 'migrations.json');
  if (existsSync(manifest)) {
    const { migrations } = readJson(manifest) ?? { migrations: [] };
    // A `component` row carries no `pairs` — it is a whole-tag rename, not a
    // (from, to) swap — so it is collected separately. Reading `m.pairs` on one
    // would throw and take the entire doctor run down with it.
    const componentRows = migrations.filter((m) => m.kind === 'component');
    const deprecatedPropRows = migrations.filter((m) => Array.isArray(m.deprecatedProps));
    // `removed` is carried through because the two cases need OPPOSITE wording.
    // A renamed name still resolves — build.js emits `--old: var(--new)` — so a
    // read of it is "will break later". A REMOVED name has no alias by design
    // (build.js emits only a comment), so a read of it resolves to nothing
    // TODAY. Reporting both under the reassuring sentence below is how a fatal
    // condition gets described with the wording written for the safe one.
    const names = migrations
      .filter((m) => Array.isArray(m.pairs))
      .flatMap((m) =>
        m.pairs.map(([from]) => ({
          from, kind: m.kind, components: m.components ?? [], module: m.module, removed: !!m.removed,
        })),
      );
    /*
     * NAMES THE SHIPPED KIT STILL READS ARE NOT DEAD, whatever the token
     * baseline says, and this exclusion is the difference between a gate and a
     * gate that lies.
     *
     * `--sidebar-width` is the case that forced it. The semantic token was
     * demoted on 2026-08-15, so it carries a `removed: true` row — but the name
     * ALSO belongs to the `.sidebar` layout primitive, where `layouts.css`
     * declares it and reads it (`flex-basis: var(--sidebar-width)`). That file's
     * own comment says so: "Sole owner of this name since 2026-08-15 … if a
     * spoke declares --sidebar-width it now unambiguously means THIS knob."
     *
     * Without this, every spoke using the sidebar primitive gets a FAIL whose
     * fix line says to delete the override — which silently collapses the
     * layout. cb-fish-design was in exactly that state: five declarations, all
     * on elements carrying `class="… sidebar"`, all correct, all reported as
     * dead. A gate that tells you to break your app is worse than no gate.
     *
     * Read from the INSTALLED package, not this checkout, so the answer matches
     * the version the spoke actually resolves.
     */
    const liveKnobs = new Set();
    const tokensSrc = path.join(CWD, 'node_modules', '@esa', 'tokens', 'src');
    if (existsSync(tokensSrc)) {
      for (const f of readdirSync(tokensSrc)) {
        if (!f.endsWith('.css')) continue;
        const css = readFileSync(path.join(tokensSrc, f), 'utf8');
        for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) liveKnobs.add(m[1]);
      }
    }

    const srcDir = path.join(CWD, 'src');
    let hits = 0;
    const seen = new Set();
    // Declarations are counted apart from reads, because the reassuring sentence
    // below ("they still render, via compatibility aliases") is TRUE of a read and
    // FALSE of a declaration. An alias rescues `var(--old)`; it cannot rescue
    // `--old: value` — nothing reads that name any more, so the spoke keeps its
    // theme file and silently loses its theme. Reporting both under one number
    // describes the dangerous case with the wording written for the safe one.
    const declaredDeprecated = new Set();
    // Removed names are tracked apart from renamed ones on BOTH axes — read and
    // declared — because only the renamed half has an alias behind it.
    const removedRead = new Set();
    const declaredRemoved = new Set();
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, e.name);
        if (e.isDirectory()) { walk(fp); continue; }
        if (!/\.(astro|ts|tsx|js|mjs|css|scss|svelte|vue)$/.test(e.name)) continue;
        const src = readFileSync(fp, 'utf8');
        for (const { from, kind, components, module: moduleSpec, removed } of names) {
          if (kind === 'token' && liveKnobs.has(from)) continue;
          // A prop has to be counted INSIDE its component's tag. Counting `color`
          // as a bare word would flag every CSS `color:` declaration in the spoke
          // and bury the real finding under hundreds of false positives.
          const n = kind === 'prop'
            ? renameProp(src, { components, from, to: from, module: moduleSpec }).count
            : (src.match(kind === 'token'
                ? new RegExp(`${from}(?![\\w-])`, 'g')
                : new RegExp(`(?<![\\w-])${from}(?![\\w-])`, 'g')) ?? []).length;
          if (n) {
            // A REMOVED name is matched STRICTLY — `var(--name)` only, never a
            // bare mention. The loose match counted prose: a doc page writing
            // `<code>--container-gutter</code>` to explain why the hook is gone,
            // or a `name: "--app-bar-gap"` string in a data array, both scored as
            // reads. There is no rewrite for a removed name, so a false positive
            // here is a FAIL a spoke cannot clear except by deleting its own
            // documentation.
            //
            // Deprecated (renamed) names keep the loose match deliberately: an
            // alias exists, `migrate-tokens --write` rewrites bare mentions too,
            // and a doc page naming a superseded token SHOULD be updated. It is a
            // warning either way.
            if (removed) { if (readPattern(from).test(src)) removedRead.add(from); }
            else { hits += n; seen.add(kind === 'prop' ? `${from}=` : from); }
          }
          if (kind === 'token' && declPattern(from).test(src)) {
            (removed ? declaredRemoved : declaredDeprecated).add(from);
          }
        }
        // A removed component is reached the same way a prop is — through the
        // file's own imports, so an aliased `<IconButton>` counts too.
        for (const m of componentRows) {
          const { count } = renameComponent(src, m);
          if (count) { hits += count; seen.add(`<${m.from}>`); }
        }
        // DEPRECATED-BUT-NOT-RENAMED props. These rows carry no `pairs`, because
        // there is no mechanical rewrite — the replacement is a different component
        // and which call sites need it is a human judgement. They still have to be
        // FOUND, though, so scan them the same tag-scoped way (to === from, so the
        // rewrite is a no-op and only the count matters).
        for (const m of deprecatedPropRows) {
          for (const prop of m.deprecatedProps) {
            const n = renameProp(src, { components: m.components ?? [], from: prop, to: prop, module: m.module }).count;
            if (n) { hits += n; seen.add(`${prop}=`); }
          }
        }
      }
    };
    if (existsSync(srcDir)) walk(srcDir);
    // RENAMED names, read. The only genuinely non-fatal case in this block: an
    // alias in dist/tokens.css keeps them resolving until the hub drops it.
    warn(`no deprecated @esa/tokens names in src/`, hits === 0,
      `${hits} use(s) of ${seen.size} deprecated name(s) — reads still render, via compatibility aliases the hub will eventually drop. Preview the fix: \`node ../ecology/scripts/migrate-tokens.mjs\`, then re-run with --write.`);

    // REMOVED names, read. No alias exists by design, so `var(--gone)` does not
    // fall back — it drops the declaration outright. Broken NOW, not later.
    check(`no REMOVED @esa/tokens names read in src/`, removedRead.size === 0,
      `${removedRead.size} removed name(s) are read here: ${[...removedRead].slice(0, 6).join(', ')}${removedRead.size > 6 ? `, +${removedRead.size - 6} more` : ''}. These have NO compatibility alias — the hub deleted them deliberately, so \`var(--name)\` resolves to nothing and the property is dropped with no error. \`node ../ecology/scripts/migrate-tokens.mjs\` prints each call site and what to read instead; the fix is a human edit, not a rewrite.`);

    // DECLARED, either kind. Promoted from warn() to check() as part of the
    // tier-3 reduction: tier 3 is the surface a spoke DECLARES, so a bulk
    // removal there lands here and nowhere else. An inert override is not a
    // warning — it is this spoke silently rendering the hub default.
    const declaredAll = [...declaredDeprecated, ...declaredRemoved];
    check(`no deprecated names DECLARED in src/`, declaredAll.length === 0,
      `${declaredAll.length} deprecated name(s) are declared here, not just read: ${declaredAll.slice(0, 6).join(', ')}${declaredAll.length > 6 ? `, +${declaredAll.length - 6} more` : ''}. An alias rescues a READ; it cannot rescue a DECLARATION — nothing reads these names any more, so each override is ALREADY INERT and this spoke is rendering the hub default with no error to say so.${declaredDeprecated.size ? ` \`node ../ecology/scripts/migrate-tokens.mjs --write\` renames the ${declaredDeprecated.size} that have a destination.` : ''}${declaredRemoved.size ? ` The ${declaredRemoved.size} REMOVED one(s) have no destination — delete the override, or re-point the tier-2 role it aliased (which moves every component reading that role, so check that is what you want).` : ''}`);
  }
}

// --- Verdict -------------------------------------------------------------------
const failures = results.filter((r) => !r.ok);
console.log(failures.length
  ? `\n${failures.length} problem${failures.length > 1 ? 's' : ''} found — apply the fix lines above, then run this again.`
  : '\nAll clear — you are ready to prototype. In Claude Code, start with /new-prototype.');
process.exit(failures.length ? 1 : 0);
