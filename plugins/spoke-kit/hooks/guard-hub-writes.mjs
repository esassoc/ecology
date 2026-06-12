#!/usr/bin/env node
// Hub-Write Guard (PreToolUse: Write|Edit|MultiEdit).
//
// In a SPOKE session, blocks writes that land inside the ecology HUB checkout
// — including through the node_modules/@esa/ecology symlink (targets are
// realpath'd before classification). The hub is the shared design standard:
// changing it is a hub-session decision with review, not a side effect of
// prototyping. The right move from a spoke is /request-lego.
//
// Applies to ALL file types (hub edits include .ts components, tokens JSON,
// docs). Escape hatch — ONLY with explicit human approval in the conversation:
// include `hub-edit-approved: <reason>` in the written content.
import { classifyDir, nearestExistingDir, proposedContent, readPayload, targetPath } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable payload — fail open

const file = targetPath(payload);
if (!file) process.exit(0);

// Only guard SPOKE sessions: classify where the session lives.
const sessionDir = payload.cwd || process.env.CLAUDE_PROJECT_DIR;
if (!sessionDir) process.exit(0);
if (classifyDir(sessionDir) !== 'spoke') process.exit(0);

// Only block HUB targets (realpath'd inside classifyDir — closes the
// node_modules symlink hole).
if (classifyDir(nearestExistingDir(file)) !== 'hub') process.exit(0);

// Escape hatch — requires explicit human approval, asserted in the content.
const content = proposedContent(payload.tool_input ?? {});
if (/hub-edit-approved:/i.test(content)) process.exit(0);

console.error(
  [
    'BLOCKED by guard-hub-writes: this write targets the ecology HUB from a spoke session.',
    '',
    'The hub (tokens, esa-* components, docs) is the shared standard for every spoke —',
    'it does not get edited as a side effect of prototyping here.',
    '',
    'Instead:',
    '  - Missing or insufficient lego/token? Run /request-lego to file the gap on the hub.',
    '  - Genuinely need the hub change now? Open a Claude session in ../ecology and do it there.',
    '',
    'Escape hatch (ONLY if the human explicitly approved a hub edit in this conversation):',
    '  include `hub-edit-approved: <who approved and why>` in the written content.',
  ].join('\n'),
);
process.exit(2);
