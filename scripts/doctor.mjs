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

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CWD = process.cwd();

const results = [];
const check = (name, ok, fix) => {
  results.push({ name, ok, fix });
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${ok || !fix ? '' : `\n      fix: ${fix}`}`);
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
  check('git identity set (user.name + user.email)', !!(name && email),
    'git config --global user.name "Your Name" && git config --global user.email "you@esassoc.com"');
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
  'cd ../ecology && npm install && npm run build:tokens');

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
  'claude plugin marketplace add esassoc/ecology && claude plugin install spoke-kit@ecology');

// --- Verdict -------------------------------------------------------------------
const failures = results.filter((r) => !r.ok);
console.log(failures.length
  ? `\n${failures.length} problem${failures.length > 1 ? 's' : ''} found — apply the fix lines above, then run this again.`
  : '\nAll clear — you are ready to prototype. In Claude Code, start with /new-prototype.');
process.exit(failures.length ? 1 : 0);
