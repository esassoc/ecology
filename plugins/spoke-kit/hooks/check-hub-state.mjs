#!/usr/bin/env node
// Hub-State Heads-Up (SessionStart).
//
// In a SPOKE session, inspects the sibling ecology HUB checkout that the
// spoke's `file:` symlinks serve from. If the hub is off `main`, has
// uncommitted changes, or sits behind origin/main, the session opens with a
// plain warning: everything this spoke renders right now includes that hub
// state, and unmerged hub work leaks straight into prototypes. Awareness
// only — it never blocks (enforcement lives in the /ship hub gate).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { classifyDir, readPayload } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable payload — fail open

const cwd = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (classifyDir(cwd) !== 'spoke') process.exit(0); // hub + other repos: inert

// --- Locate the spoke root, then the hub it symlinks to ----------------------
function findSpokeRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.dependencies?.['@esa/ecology'] || pkg.devDependencies?.['@esa/ecology']) return dir;
    } catch {
      // no package.json at this level — keep walking
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function findHub(spokeRoot) {
  // Preferred: resolve the actual symlink npm created (packages/ecology → hub root).
  try {
    const real = realpathSync(path.join(spokeRoot, 'node_modules', '@esa', 'ecology'));
    return path.dirname(path.dirname(real));
  } catch {
    const sibling = path.resolve(spokeRoot, '..', 'ecology');
    return existsSync(sibling) ? sibling : null;
  }
}

const spokeRoot = findSpokeRoot(cwd);
const hub = spokeRoot && findHub(spokeRoot);
if (!hub || !existsSync(path.join(hub, '.git'))) process.exit(0); // doctor's problem, not ours

// --- Read the hub's git state (no fetch — never hit the network at startup) --
const git = (...args) => {
  try {
    return execFileSync('git', ['-C', hub, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
};

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (!branch) process.exit(0); // git unavailable — fail open

const porcelain = git('status', '--porcelain');
const dirtyCount = porcelain ? porcelain.split('\n').length : 0;
const behind = git('rev-list', '--count', 'HEAD..origin/main'); // last-fetched state; null if no origin/main

const problems = [];
if (branch !== 'main') problems.push(`on branch "${branch}" (not main)`);
if (dirtyCount) problems.push(`${dirtyCount} uncommitted change${dirtyCount > 1 ? 's' : ''}`);
if (behind && behind !== '0') problems.push(`${behind} commit${behind === '1' ? '' : 's'} behind origin/main (as of last fetch)`);
if (!problems.length) process.exit(0);

// --- Warn: user-visible message + context for Claude --------------------------
const state = problems.join(', ');
console.log(
  JSON.stringify({
    systemMessage:
      `spoke-kit heads-up: the local ecology hub (${hub}) is not at a clean, current main — ${state}. ` +
      `This spoke's @esa/* packages symlink to that checkout, so everything rendered here ` +
      `includes that WIP. Fine for development — but /ship gates on it. ` +
      `To see the released standard: park the hub on a clean, pulled main.`,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        `The ecology hub checkout this spoke symlinks to (${hub}) is not at a clean, current main — ${state}. ` +
        `All @esa/* imports currently resolve to that WIP state, not merged main — screenshots, ` +
        `design-qa verdicts, and builds reflect it. If the user runs /ship, its hub gate MUST stop ` +
        `on this state unless the human explicitly approves shipping WIP in the conversation ` +
        `(recorded as \`ship-wip-approved: <reason>\` in the save commit). Do not silently deploy.`,
    },
  }),
);
process.exit(0);
