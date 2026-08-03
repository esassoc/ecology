#!/usr/bin/env node
// Accessibility Gate (PreToolUse: Write|Edit|MultiEdit) — the deterministic
// half of the Ecology a11y posture: hooks enforce PRACTICES without being
// prescriptive about PATTERNS. This gate
// blocks only the accessibility failures that can be proven from the source
// text alone, with near-zero false positives. Everything that needs judgment
// (does a role="button" actually handle Enter/Space, is a modal's focus-trap
// escapable, does an overridden Radix color still clear 4.5:1) lives in the
// `accessibility` SKILL, not here — that split is the whole design.
//
// Why a11y runs EVERYWHERE the plugin is installed (unlike component-first,
// which is spoke-only): compliance != accessibility. The hub's own
// esa-* components and specimen pages must be accessible too — they are the
// source of truth teams copy. So this gate is NOT scoped by classifyDir; it
// fires in hub, spoke, and any non-Astro clone that installs spoke-kit. That
// reach is also the honest LIMIT: a clone that never installs the plugin gets
// zero enforcement — the cross-stack-porting.md checklist is the manual backstop.
//
// What this gate BLOCKS (deterministic, low false-positive):
//   1. positive tabindex (>=1)                    — breaks natural focus order
//   2. <img> with no alt attribute at all         — presence, not quality
//   3. focus ring suppressed with no alternative   — :focus-visible{outline:none},
//        or global :focus{outline:none} and no :focus-visible / box-shadow ring
//   4. interactive role on a non-native element w/o tabindex — unreachable by keyboard
//
// What it deliberately does NOT block (moved to the SKILL — see the header of
// each check for the reason): keyboard traps (a real trap is statically
// indistinguishable from a legit modal focus-trap), whether a custom control
// actually wires Enter/Space, ARIA correctness, contrast, semantic structure.
//
// Escape hatch — an `a11y-checked: <reason>` comment anywhere in the content
// (or already in the file) allows the write, for the rare true false positive
// (alt supplied via a spread prop, a deliberate managed tabindex, etc). Mirrors
// component-first's `bcn-lego-checked:` exactly. Use it honestly.
import { existsSync, readFileSync } from 'node:fs';
import { proposedContent, readPayload, targetPath } from './lib.mjs';

const payload = readPayload();
if (!payload) process.exit(0); // unparseable payload — fail open

const file = targetPath(payload);
if (!file) process.exit(0);

// --- Which check families apply to this file ---
// Markup checks (tabindex/img/role) run on templated markup AND on scripts that
// build markup at runtime (innerHTML / template literals / JSX). The CSS focus
// check runs wherever a :focus selector can appear — .css/.scss, .astro/.vue/
// .svelte <style>, and CSS-in-JS in .ts/.tsx — so it is gated on content, below.
const isMarkup = /\.(astro|html?|vue|svelte)$/i.test(file);
const isScript = /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(file);
const isStyle = /\.(css|scss|sass|less|astro|vue|svelte)$/i.test(file);
if (!isMarkup && !isScript && !isStyle) process.exit(0);

const content = proposedContent(payload.tool_input ?? {});
if (!content) process.exit(0);

// Existing file text — read once, used for the escape hatch and the focus
// fallback (the :focus-visible ring may already live in the file on an edit
// that only adds the reset). Never used to flag PRE-EXISTING issues: the
// per-element checks below run against the PROPOSED content only.
let fileText = '';
try {
  if (existsSync(file)) fileText = readFileSync(file, 'utf8');
} catch {
  /* unreadable — treat as empty */
}

// --- Escape hatch: author asserted a reviewed exception ---
if (/a11y-checked:/i.test(content) || /a11y-checked:/i.test(fileText)) process.exit(0);

// A script is only a markup source if it actually contains tags; config/logic
// modules have none and must not be dragged into a markup review.
const hasTags = /<\/?[a-z][a-z0-9-]*(\s|>|\/)/i.test(content);
const runMarkup = (isMarkup || isScript) && hasTags;
const runStyle = isStyle || /:focus\b/i.test(content);

const violations = [];

// --- Check 1: positive tabindex (deterministic) -----------------------------
// tabindex="0" (focusable, natural order) and tabindex="-1" (focusable only
// programmatically) are fine. tabindex="1"+ hijacks the tab order for the whole
// page and is the classic anti-pattern. Non-prescriptive: we don't say what the
// order should be, only that you don't get to hard-code a positive one.
if (runMarkup) {
  const re = /tabindex\s*=\s*["']?\s*(\d+)/gi;
  const seen = new Set();
  for (let m; (m = re.exec(content)); ) {
    if (parseInt(m[1], 10) >= 1) seen.add(m[0].replace(/\s+/g, ' ').trim());
  }
  for (const hit of seen) {
    violations.push(`positive \`${hit}\` — a positive tabindex re-sequences the whole page's tab order. Use tabindex="0" (natural order) or fix the DOM order instead.`);
  }
}

// --- Check 2: <img> with no alt attribute (presence, not quality) -----------
// The QUALITY of alt text (decorative -> alt=""; informative -> describe it) is
// a judgment call and lives in the SKILL. Here we only require the attribute to
// EXIST — a bare <img> is never correct. Spread/framework-bound alt is allowed.
if (runMarkup) {
  const re = /<img\b[^>]*>/gi;
  for (let m; (m = re.exec(content)); ) {
    const tag = m[0];
    if (/\balt\s*=/i.test(tag)) continue; // any alt, including alt="" (decorative)
    if (/\{\s*\.\.\./.test(tag)) continue; // JSX/Astro spread props {...rest}
    if (/\[alt\]|:alt\b|v-bind|\balt\s*:/i.test(tag)) continue; // Angular/Vue/obj bindings
    const shown = tag.length > 90 ? tag.slice(0, 87) + '…' : tag;
    violations.push(`\`${shown}\` has no alt attribute — add one (alt="" if purely decorative, otherwise describe the image's meaning).`);
  }
}

// --- Check 3: interactive role on a non-native element w/o tabindex ---------
// A role="button" (etc.) on a <div>/<span> that has no tabindex cannot be
// reached by keyboard at all — an unambiguous, static failure. Whether it then
// wires Enter/Space correctly is judgment (SKILL). Native interactive tags and
// spread-prop tags are exempt. The fix we suggest is a PRACTICE ("make it
// focusable, or use the native element"), never a specific implementation.
if (runMarkup) {
  const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'checkbox', 'switch', 'tab', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'option', 'radio', 'treeitem', 'slider', 'spinbutton',
  ]);
  // <a> is treated as native — a role="button" anchor almost always has href.
  const NATIVE = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary', 'details']);
  const re = /<([a-z][a-z0-9-]*)\b[^>]*\brole\s*=\s*["']([a-z]+)["'][^>]*>/gi;
  const seen = new Set();
  for (let m; (m = re.exec(content)); ) {
    const tag = m[0];
    const tagName = m[1].toLowerCase();
    const role = m[2].toLowerCase();
    if (!INTERACTIVE_ROLES.has(role)) continue;
    if (NATIVE.has(tagName)) continue;
    if (/\btabindex\s*=/i.test(tag)) continue;
    if (/\{\s*\.\.\./.test(tag)) continue; // spread props may carry tabindex
    seen.add(`<${tagName} role="${role}">`);
  }
  for (const hit of seen) {
    violations.push(`${hit} is not keyboard-reachable — a non-native element with an interactive role needs tabindex="0" AND an Enter/Space handler. Prefer the native <button>/<a>, or add tabindex + key handling (see the skill).`);
  }
}

// --- Check 4: focus ring suppressed with no visible alternative -------------
// The bad pattern is removing the focus indicator with nothing in its place.
// The GOOD, common pattern — `:focus{outline:none}` paired with a
// `:focus-visible` ring or a box-shadow ring — must pass, so we only flag:
//   (a) :focus-visible itself set to outline:none/0 (kills the KEYBOARD ring), or
//   (b) a :focus (not :focus-visible/:focus-within) outline reset with NO ring
//       alternative anywhere in the proposed content OR the existing file.
if (runStyle) {
  const suppressesFocusVisible = /:focus-visible\b[^{]*\{[^}]*outline\s*:\s*(?:none|0)\b/i.test(content);
  if (suppressesFocusVisible) {
    violations.push(':focus-visible { outline: none } removes the KEYBOARD focus ring specifically — this is the one you must keep. Style it, don\'t suppress it.');
  }
  // :focus (but not :focus-visible / :focus-within) with the outline killed.
  const suppressesFocus = /:focus(?![-\w])[^{]*\{[^}]*outline\s*:\s*(?:none|0)\b/i.test(content);
  const haystack = content + '\n' + fileText;
  const hasRingAlternative =
    /:focus-visible\b[^{]*\{[^}]*outline\s*:\s*(?!none|0)[^};]+/i.test(haystack) ||
    /:focus(?:-visible|-within)?\b[^{]*\{[^}]*box-shadow\s*:/i.test(haystack) ||
    /:focus(?:-visible|-within)?\b[^{]*\{[^}]*border\s*:/i.test(haystack);
  if (suppressesFocus && !hasRingAlternative) {
    violations.push(':focus { outline: none } with no visible focus alternative — pair it with a :focus-visible ring (or a box-shadow/border focus indicator). Removing the ring outright strands keyboard users.');
  }
}

// --- Verdict ----------------------------------------------------------------
if (violations.length) {
  console.error(
    [
      'BLOCKED by check-a11y: this content introduces an accessibility failure that can be proven from the source alone.',
      '',
      'Detected:',
      ...violations.map((v) => `  - ${v}`),
      '',
      'These are PRACTICES, not patterns — the fix is yours to choose, but the practice is non-negotiable.',
      'Judgment-level a11y (keyboard traps, Enter/Space wiring, ARIA correctness, contrast when you',
      'override Radix, semantic structure, cross-stack porting) lives in the accessibility skill.',
      '',
      'To proceed on a genuine false positive (alt via a spread prop, a deliberately managed tabindex,',
      'a focus ring the regex cannot see), assert the review in the content:',
      '  <!-- a11y-checked: <what you verified and why the flag is wrong> -->',
      '  (CSS file: /* a11y-checked: ... */)',
      '',
      'Skill: accessibility (from the spoke-kit plugin)  ->  cross-stack-porting.md',
    ].join('\n'),
  );
  process.exit(2);
}

process.exit(0);
