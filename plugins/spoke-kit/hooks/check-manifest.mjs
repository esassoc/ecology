#!/usr/bin/env node
// Manifest Gate (PreToolUse: Write|Edit|MultiEdit) — the FRONT-of-process teeth.
//
// A composed page must DECLARE its manifest BEFORE it is written: a header comment
// enumerating every section and resolving each to a COMPONENT — an esa-* hub lego or
// a <spoke>-* component. Primitives (stack/grid/repel/…) are the page SPINE and live
// inside components; they are NOT valid section resolvers, and `inline`/bare words are
// rejected outright. This materializes the "outline first" planning ritual as a
// tool-observable artifact — the only way to enforce it in AUTO mode: PreToolUse
// hooks fire regardless of permission mode, but a hook only sees TOOL I/O, never
// chat-only reasoning, so the plan has to live in the file.
//
// What this gate CAN enforce: the ritual + the form (a manifest exists; every section
// resolves to a component; nothing is a primitive/inline blob). What it CANNOT judge:
// whether the chosen cuts are GOOD — that's an LLM-evaluator / human pass (/design-qa),
// same boundary as the layout/type rules in check-component-first.
//
// Scope: authored composed pages only — src/pages/** minus scaffold/doc chrome
// (design-system/, the landing index.astro, patterns/). Hub excluded via classifyDir.
//
// Schema (a comment anywhere in the page; `->` or `→`):
//   <!-- manifest:
//     layout: stack(2xl)                         # the page SPINE — a primitive, fine here
//     sections:
//       - page header -> demo-page-header    # every section is a COMPONENT
//       - stats       -> demo-stat-group     #   (esa-* lego or <spoke>-* component)
//       - cards       -> demo-card-grid
//   -->
//   A section resolver must contain a hyphen (esa-card, demo-foo). A bare word —
//   a primitive (stack/grid) or `inline`/`div`/`none` — is REJECTED: a section is a
//   component, not page-level bespoke markup.
import { existsSync, readFileSync } from 'node:fs';
import { classifyDir, nearestExistingDir, proposedContent, readPayload, targetPath } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable — fail open
const file = targetPath(payload);
if (!file) process.exit(0);
if (!/\.astro$/i.test(file)) process.exit(0); // composed pages are .astro
if (classifyDir(nearestExistingDir(file)) !== 'spoke') process.exit(0);

// Scope to authored composed pages; exempt /spoke-init scaffold + design-system docs.
const norm = file.replace(/\\/g, '/');
if (!norm.includes('/src/pages/')) process.exit(0);
if (norm.includes('/src/pages/design-system/')) process.exit(0);
if (norm.includes('/src/pages/patterns/')) process.exit(0);
if (/\/src\/pages\/index\.astro$/.test(norm)) process.exit(0);

// The manifest may live in the proposed content OR already in the file (an edit
// often doesn't re-send the header). Same dual-read as the escape-token check.
let haystack = proposedContent(payload.tool_input ?? {});
try {
  if (existsSync(file)) haystack += '\n' + readFileSync(file, 'utf8');
} catch {
  /* unreadable existing file — lint what was proposed */
}

function lint(text) {
  // Anchor on `sections:` (the load-bearing part), not the word "manifest" — a doc
  // comment that merely mentions "manifest" must neither trip nor satisfy the gate.
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\s*sections\s*:/i.test(l));
  if (start === -1) return ['no `manifest: … sections:` block found — declare the page outline first'];
  const sectionLines = [];
  for (const raw of lines.slice(start + 1)) {
    if (/^\s*(?:-->|---)/.test(raw)) break; // end of the manifest comment block
    if (/^\s*-\s+\S/.test(raw)) { sectionLines.push(raw); continue; }
    if (/^\s*$/.test(raw)) continue; // tolerate blank lines within the list
    break; // a non-list line (e.g. a `note:`) ends the section list
  }
  if (!sectionLines.length) return ['manifest `sections:` is empty — list every section'];

  const errs = [];
  for (const line of sectionLines) {
    const arrow = line.match(/(?:->|→)\s*([^\s(#[]+)/);
    if (!arrow) {
      errs.push(`section has no resolver (need "-> esa-x | <spoke>-x"): "${line.trim()}"`);
      continue;
    }
    const resolver = arrow[1].toLowerCase().replace(/[(),.[\]]/g, '');
    // A section is a COMPONENT (hyphenated: esa-card / demo-foo). A bare word —
    // a primitive (stack/grid) or inline/div/none — means the section is page-level
    // bespoke markup, which is exactly what the manifest exists to stamp out.
    if (!resolver.includes('-')) {
      errs.push(
        `section resolver "${resolver}" is not a component — every SECTION resolves to an esa-* lego or a <spoke>-* component; a primitive like "${resolver}" is the page spine (layout:) or lives inside a component, never as a section: "${line.trim()}"`
      );
    }
  }
  return errs;
}

const problems = lint(haystack);
if (problems.length) {
  console.error(
    [
      'BLOCKED by manifest-first: a composed page must DECLARE its manifest before it is written,',
      'and every section must resolve to a COMPONENT (not a primitive, not inline).',
      '',
      ...problems.map((p) => `  - ${p}`),
      '',
      'Declare the outline — primitive spine, component sections:',
      '  <!-- manifest:',
      '    layout: stack(2xl)                        # page spine — a primitive is fine here',
      '    sections:',
      '      - page header -> demo-page-header   # build/compose a component, do not inline',
      '      - stats       -> demo-stat-group',
      '      - cards       -> demo-card-grid',
      '  -->',
      '',
      'Per-section lookup: esa-* hub lego -> existing spoke component -> build a new <spoke>-* component',
      '(compose primitives + legos INSIDE it). Never an inline blob, never a bare primitive as a section.',
      'Skill: component-first (spoke-kit).',
    ].join('\n'),
  );
  process.exit(2);
}
process.exit(0);
