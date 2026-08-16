#!/usr/bin/env node
// Prose-slot gate (PreToolUse: Write|Edit|MultiEdit) — genre tier only.
//
// A prop named for a kind of writing is where a sentence goes. `lede`, `tagline`,
// `blurb`, `subtext` have no datum reading at all, and the audit measured
// esa-page-header.lede at 100% flourish across its fills. Declaring one is
// cheap and invisible; the prose it invites arrives later, on pages this gate
// never sees. So the declaration is the thing worth stopping.
//
// ONLY the `genre` tier blocks. The `contested` tier — caption, summary,
// description, purpose — stays advisory in /design-qa and in the report CLI,
// because `caption` on a figure is correct and no parser can tell that from
// `caption` on a stat card. Blocking a judgment call would be the wrong kind of
// teeth (Andy, 2026-08-16: flag, don't hard-ban).
//
// Scope discipline, learned from this gate's sibling: only a NEWLY DECLARED
// genre prop blocks. Editing an unrelated line of a file that already has one
// passes — a gate that fires on the state of a file rather than on the change
// walls off every later edit to it.
//
// Escape hatch: `prose-prop-checked: <reason>` anywhere in the file.
import { existsSync, readFileSync } from 'node:fs';
import { analyze, hasEscapeHatch } from './prose-props.mjs';
import { classifyDir, nearestExistingDir, proposedContent, readPayload, targetPath } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable — fail open
const file = targetPath(payload);
if (!file) process.exit(0);
if (!/\.(astro|ts)$/i.test(file)) process.exit(0);
if (classifyDir(nearestExistingDir(file)) !== 'spoke') process.exit(0);

// Prop declarations live in components, layouts and data modules. A page may
// declare Props too, so the whole of src/ is in scope.
const norm = file.replace(/\\/g, '/');
if (!norm.includes('/src/')) process.exit(0);

const toolInput = payload.tool_input ?? {};

let before = '';
try {
  if (existsSync(file)) before = readFileSync(file, 'utf8');
} catch {
  /* unreadable — treat as new */
}

/** The file as it would be after this call, or null if we cannot reconstruct it. */
function afterContent() {
  if (typeof toolInput.content === 'string') return toolInput.content;
  const edits = toolInput.edits ?? [
    { old_string: toolInput.old_string, new_string: toolInput.new_string },
  ];
  let text = before;
  for (const e of edits) {
    if (typeof e?.new_string !== 'string') continue;
    if (typeof e.old_string !== 'string' || !e.old_string) return null;
    const at = text.indexOf(e.old_string);
    if (at === -1) return null;
    text = text.slice(0, at) + e.new_string + text.slice(at + e.old_string.length);
  }
  return text;
}

// Reconstruction can fail (a stale old_string, an unreadable file). Falling back
// to the fragment alone loses line numbers but still catches a whole interface
// pasted in one edit; it can never see a field added to an interface declared
// elsewhere, and a missed catch is the right way to be wrong here.
const after = afterContent() ?? proposedContent(toolInput);
if (hasEscapeHatch(after) || hasEscapeHatch(before)) process.exit(0);

const key = (f) => `${f.prop}:${f.declaredIn ?? ''}`;
const existing = new Set(analyze(before).map(key));
const added = analyze(after, file).filter((f) => f.rule === 'prose-prop-genre' && !existing.has(key(f)));

if (added.length) {
  console.error(
    [
      'BLOCKED by verbal restraint: this declares a slot named for a kind of PROSE.',
      '',
      ...added.map((f) => `  - \`${f.prop}\`${f.declaredIn ? ` on \`${f.declaredIn}\`` : ''} — ${f.message}`),
      '',
      'Name the prop for the datum it holds (`sub`, `role`, `status`, `count`), or drop it and',
      'let the structure carry the meaning. Measured: esa-stat.sub, documented as "muted meta",',
      'ran 5% flourish across 20 fills; esa-page-header.lede, documented by type size, ran 100%',
      'across 4. The name and its doc comment predict what gets typed in.',
      '',
      'If this one genuinely holds a datum, say so in the file and it will pass:',
      '  // prose-prop-checked: `overview` is the stored report abstract, not page copy',
      '',
      'Skill: design-principles (spoke-kit) § Verbal restraint.',
    ].join('\n'),
  );
  process.exit(2);
}
process.exit(0);
