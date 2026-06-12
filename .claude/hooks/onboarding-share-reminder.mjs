#!/usr/bin/env node
// PostToolUse(Bash) reminder for the ONE guide-freshness step that cannot be
// automated: the claude.ai onboarding share link is a SNAPSHOT of
// ONBOARDING.md, refreshable only by a Claude session (ShareOnboardingGuide).
// When a commit touches ONBOARDING.md, surface the reminder.
// (The /guide/setup page itself needs no reminder — CI rebuilds it on push.)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const cmd = payload?.tool_input?.command ?? '';
if (!/git\s+commit/.test(cmd)) process.exit(0);

const cwd = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
let files = '';
try {
  files = execFileSync('git', ['show', '--name-only', '--format='], { cwd, encoding: 'utf8' });
} catch {
  process.exit(0);
}

if (/^ONBOARDING\.md$/m.test(files)) {
  console.log(
    'Reminder: this commit changed ONBOARDING.md. The claude.ai onboarding share link is a snapshot — refresh it NOW via the ShareOnboardingGuide tool (mode "check") so teammates open the current version. The /guide/setup page needs nothing: CI rebuilds it on push.',
  );
}
process.exit(0);
