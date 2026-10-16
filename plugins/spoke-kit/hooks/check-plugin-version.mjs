#!/usr/bin/env node
// Plugin-Version Heads-Up (SessionStart).
//
// In a SPOKE session, compares the spoke-kit version this session is running
// against the one in the local `ecology` marketplace checkout. When the running
// copy is older, the session opens with one plain line saying so: the
// marketplace has been refreshed but the plugin was never updated, so every
// hook, skill and command fix since then is inert here. That state is silent
// otherwise — `claude plugin marketplace update` reports success and leaves the
// installed version where it was. Awareness only; never blocks. Fails silent
// when either plugin.json is missing or unreadable.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDir, readPayload } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable payload — fail open

const cwd = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (classifyDir(cwd) !== 'spoke') process.exit(0); // hub + other repos: inert

const readVersion = (file) => {
  try {
    const v = JSON.parse(readFileSync(file, 'utf8')).version;
    return /^\d+\.\d+\.\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
};

const pluginRoot =
  process.env.CLAUDE_PLUGIN_ROOT || path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), '.claude');

const running = readVersion(path.join(pluginRoot, '.claude-plugin', 'plugin.json'));
const available = readVersion(
  path.join(configDir, 'plugins', 'marketplaces', 'ecology', 'plugins', 'spoke-kit', '.claude-plugin', 'plugin.json'),
);
if (!running || !available) process.exit(0);

const older = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i];
  return false;
};
if (!older(running, available)) process.exit(0);

const fix =
  'claude plugin marketplace update ecology, then claude plugin update spoke-kit@ecology, then restart Claude Code';
console.log(
  JSON.stringify({
    systemMessage: `spoke-kit ${running} is running but ${available} is available. To update: ${fix}.`,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        `This session is running spoke-kit ${running}; the ecology marketplace checkout has ${available}. ` +
        `Hook, skill and command changes since ${running} are not active here. If the user asks why a ` +
        `spoke-kit behaviour is missing, or before relying on one added recently, tell them to run: ${fix}. ` +
        `The first command alone only refreshes the listing.`,
    },
  }),
);
process.exit(0);
