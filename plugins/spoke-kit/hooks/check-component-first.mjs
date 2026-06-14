#!/usr/bin/env node
// Component-First Guard (PreToolUse: Write|Edit|MultiEdit) — Node port of the
// original bash hook so it runs identically on macOS and Windows (no jq).
// BLOCKS bespoke UI primitives in an @esa/ecology spoke: exit 2 + reason on
// stderr denies the tool call BEFORE the write lands.
//
// Discipline enforced: Ecology (esa-*) -> Beacon (ui-*/scss) -> bcn-.
// Escape hatch: a `bcn-lego-checked: <reason>` comment in the content.
// The ecology hub is excluded (its specimen pages legitimately contain raw
// <input> markup) — see classifyDir in lib.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { classifyDir, nearestExistingDir, proposedContent, readPayload, targetPath } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable payload — fail open

const file = targetPath(payload);
if (!file) process.exit(0);

// --- Gate (b): file extension ---
if (!/\.(astro|css|scss)$/i.test(file)) process.exit(0);

// --- Gate (a): only enforce inside a spoke ---
if (classifyDir(nearestExistingDir(file)) !== 'spoke') process.exit(0);

const content = proposedContent(payload.tool_input ?? {});
if (!content) process.exit(0);

// --- Escape hatch: author asserted they walked the lookup order ---
// Check the proposed content AND the existing file (token may already live there).
if (/bcn-lego-checked:/i.test(content)) process.exit(0);
try {
  if (existsSync(file) && /bcn-lego-checked:/i.test(readFileSync(file, 'utf8'))) process.exit(0);
} catch {
  /* unreadable existing file — fall through to the checks */
}

const violations = [];

// --- Raw styled form controls (not esa-*) ---
if (/<input(\s|>|\/)/i.test(content)) {
  violations.push('raw <input> -> use esa-text-field (or esa-checkbox / esa-radio-group / esa-file-upload as appropriate)');
}
if (/<select(\s|>)/i.test(content)) {
  violations.push('raw <select> -> use esa-select');
}
if (/<textarea(\s|>)/i.test(content)) {
  violations.push('raw <textarea> -> use esa-textarea');
}
// <button class="..."> is a styled button; plain <button> with no class is allowed.
if (/<button[^>]*\sclass=/i.test(content)) {
  violations.push('styled <button class=...> -> use esa-button (text/CTA) or esa-icon-button (icon-only)');
}

// --- Hand-rolled component CSS: selectors/markup implying an esa- primitive ---
const PRIM =
  '(side-?dialog|side-?drawer|sidedrawer|drawer|modal|dialog|dropzone|drop-zone|file-?(row|item|list|upload)|empty-?state|empty|icon-?btn|iconbutton|tooltip|popover|breadcrumb|avatar)';
const primSelector = new RegExp(`\\.[a-z0-9_-]*${PRIM}[a-z0-9_:-]*\\s*[,{]`, 'i');
const primClassAttr = new RegExp(`class="[^"]*${PRIM}`, 'i');
if (primSelector.test(content)) {
  const hit = content.match(new RegExp(`\\.[a-z0-9_-]*${PRIM}[a-z0-9_:-]*`, 'i'))?.[0] ?? '';
  violations.push(`hand-rolled component CSS '${hit}' -> compose the matching esa-* lego instead of styling a primitive`);
}
if (primClassAttr.test(content)) {
  const hit = content.match(new RegExp(`class="[^"]*${PRIM}[^"]*"`, 'i'))?.[0] ?? '';
  violations.push(`bespoke markup ${hit} -> use the matching esa-* lego (esa-side-dialog/esa-dialog/esa-file-upload/esa-empty-state/esa-icon-button/esa-tooltip/esa-avatar/esa-breadcrumbs)`);
}

// --- card / badge / pill / chip / tag primitives (class tokens only) ---
// The primitive token must be the SUFFIX of a class name (followed by end-of-name,
// not a hyphen continuation) so legit compound roles like `type-card-title` or a
// `--card-*` token don't false-positive. `.user-card`/`class="status-badge"` still hit.
const CHIP = '(eoc|count-?badge|status-?badge|[a-z]+-badge|[a-z]+-pill|[a-z]+-chip|[a-z]+-tag|[a-z]+-card)';
if (
  new RegExp(`\\.[a-z0-9_-]*${CHIP}\\s*[,{]`, 'i').test(content) ||
  new RegExp(`class="[^"]*\\b[a-z0-9-]*${CHIP}(?![\\w-])`, 'i').test(content)
) {
  violations.push('bespoke card/badge/pill/chip/tag -> use esa-card / esa-badge / esa-pill / esa-chip-group');
}

// --- Verdict ---
if (violations.length) {
  console.error(
    [
      'BLOCKED by component-first: this content reinvents a UI primitive that an esa-* lego already provides.',
      '',
      'Detected:',
      ...violations.map((v) => `  - ${v}`),
      '',
      'Lookup order (do this, in order):',
      '  1. Ecology esa-* legos  -> ls node_modules/@esa/ecology/src/components/',
      '  2. Beacon prod patterns (optional, if cloned) -> ~/Dev/Beacon/Beacon.Web/src/app/shared/ui/components/ + src/scss/',
      '  3. ONLY then a documented bcn- component.',
      '',
      'To proceed: use the lego, OR add a justification comment to the content:',
      '  <!-- bcn-lego-checked: no esa- X fits because Y; checked Beacon (Z); bcn-foo is the reusable home -->',
      '  (CSS file: /* bcn-lego-checked: ... */)',
      '',
      'Skill: component-first (from the spoke-kit plugin)  ->  lego-lookup.md / bcn-authoring.md',
    ].join('\n'),
  );
  process.exit(2);
}

process.exit(0);
