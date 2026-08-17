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
//   5. <label> that names nothing — no for=, no id= (for aria-labelledby), and
//        no labelable control inside it. See forms.md.
//   6. a live region that is permanently EMPTY — a region announces CHANGES to its
//        contents, so one that can never have content announces nothing, ever.
//   7. a role/aria-live politeness CONTRADICTION — role="alert" already implies
//        assertive; a polite aria-live beside it silently downgrades it.
//   8. an interactive control INSIDE a live region — announced as bare text with no
//        role and no way to navigate to it. That message is a dialog.
//        (6–8 see status-messages.md.)
//   9. a focus ring painted ONLY with box-shadow — box-shadow is forced to `none`
//        in forced colors mode, so the ring disappears. See forced-colors.md.
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
// `:focus` is NOT the only way in. An `outline: none` on a plain class suppresses
// the ring in every state and contains no `:focus` at all — gating on `:focus`
// alone is exactly why Check 4 missed all three of the hub's real removals.
const runStyle = isStyle || /:focus\b/i.test(content) || /outline\s*:\s*(?:none|0)\b/i.test(content);

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
  // The aria-activedescendant model is the documented exception, not a loophole. In a
  // combobox/listbox the options are DELIBERATELY not focusable: focus stays on the
  // input (it has to — the user is still typing) and `aria-activedescendant` points at
  // the active option. Giving those options tabindex="0" would be the bug, forcing the
  // user to tab through every result. So when the file wires activedescendant, option
  // and treeitem roles are exempt — the other interactive roles still are not.
  const managesActiveDescendant = /\baria-activedescendant\b/i.test(content);
  const MANAGED_ROLES = new Set(['option', 'treeitem']);
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
    if (managesActiveDescendant && MANAGED_ROLES.has(role)) continue;
    seen.add(`<${tagName} role="${role}">`);
  }
  for (const hit of seen) {
    violations.push(`${hit} is not keyboard-reachable — a non-native element with an interactive role needs tabindex="0" AND an Enter/Space handler. Prefer the native <button>/<a>, or add tabindex + key handling (see the skill).`);
  }
}

// --- Check 5: <label> that names nothing ------------------------------------
// A <label> names a control three ways: for= pointing at its id, wrapping a
// labelable element, or carrying an id that the control's aria-labelledby
// references. A label with NONE of the three is decoration — it looks like a
// label in the diff, reads like one on screen, and the control announces blank.
// This is the single defect behind most of the forms audit, and unlike "is the
// name meaningful" it is provable from the source text.
//
// Why this is safe to block: every exemption below is a mechanism that COULD
// supply the association, so we only flag labels where no mechanism is present
// at all. Form-associated custom elements ARE labelable (ElementInternals), so
// any hyphenated tag inside exempts. Dynamic markup we cannot see through
// (a call expression or a nested template in an interpolation) exempts too.
//
// NOT prescriptive: we don't say which of the three mechanisms to use. Around a
// shadow-DOM control only one of them can work, and that judgment is forms.md's.
if (runMarkup) {
  const re = /<label\b([^>]*)>([\s\S]*?)<\/label>/gi;
  const seen = new Set();
  for (let m; (m = re.exec(content)); ) {
    const attrs = m[1];
    const inner = m[2];
    if (/\bfor\s*=/i.test(attrs)) continue; // for="x" / for={x} / for=${x}
    if (/\bid\s*=/i.test(attrs)) continue; // may be an aria-labelledby target
    if (/\[for\]|:for\b|v-bind|\bhtmlFor\b/i.test(attrs)) continue; // framework bindings
    if (/\{\s*\.\.\./.test(attrs)) continue; // spread props may carry for/id
    // An element carrying an interactive ARIA role is NOT labelable — <label>
    // associates only with form controls, and a role does not make a <span> into
    // one. So this is PROVABLE regardless of what else is in the label, and it
    // takes priority over every content exemption below.
    //
    // It has to, because those exemptions were letting the real thing through. The
    // shape that shipped in esa-checkbox, esa-checkbox-group and esa-radio-group
    // was a <label> wrapping <span role="checkbox">, and it was exempted by the
    // "a CALL in an interpolation may return a control" rule — not because any
    // call returned a control, but because `aria-checked=${String(this.checked)}`
    // put a `(` inside an interpolation somewhere in the blob. Measured against
    // Chrome's accessibility tree on 2026-08-16, all three options had NO
    // accessible name; the synthetic test case was caught and the real files were
    // not. Fix the association (aria-labelledby to the option's own text) rather
    // than the role.
    // ...unless that element names ITSELF. aria-labelledby pointing at the option's
    // own text is the fix this rule is asking for, so it has to be the thing that
    // clears it — otherwise the check fires forever on correct code, which is how a
    // guard gets ignored.
    const roleTag =
      /<[a-z][a-z0-9-]*\b[^>]*\brole\s*=\s*["'](?:checkbox|radio|switch|slider|spinbutton|combobox|textbox|listbox|menuitemcheckbox|menuitemradio)["'][^>]*>/i.exec(inner);
    const wrapsRealControl = /<(input|textarea|select)\b/i.test(inner);
    if (roleTag && !wrapsRealControl) {
      // A named role element is the fixed state — exempt, and skip the rest.
      if (/\baria-label(?:ledby)?\s*=/i.test(roleTag[0])) continue;
      // An unnamed one is the defect, and no content exemption below can excuse it.
      seen.add(inner.replace(/\s+/g, ' ').trim().slice(0, 40));
      continue;
    }
    {
    if (/<(input|textarea|select)\b/i.test(inner)) continue; // wraps a labelable element
    if (/<slot\b/i.test(inner)) continue; // control is projected in by the caller
    if (/<[a-z][a-z0-9]*-[a-z0-9-]*\b/i.test(inner)) continue; // form-associated custom element
    // A CALL in an interpolation may return a control we cannot see. A nested
    // template literal is NOT exempt — the tag scans above already read straight
    // through it, so `${html`<input>`}` is caught and `${html`<span>`}` is not.
    if (/\$?\{[^}]*\(/.test(inner)) continue;
    }
    const shown = inner.replace(/\s+/g, ' ').trim().slice(0, 40);
    seen.add(shown);
  }
  for (const hit of seen) {
    violations.push(`\`<label>${hit}…</label>\` names nothing — it has no for=, no id= for an aria-labelledby reference, and wraps no labelable control. Associate it, or give the control its own name (a label outside a shadow root can never reach an input inside one — see forms.md).`);
  }
}

// --- Check 6: a live region that can never announce -------------------------
// A live region announces CHANGES to its contents. An element that is empty in the
// source and has no interpolation in it can never have a change, so the role is a
// no-op — it reads like an accessibility feature in review and does nothing at all
// at runtime. This is provable from the text: no children, no ${…}/{…} inside.
//
// This is the exact defect that shipped in esa-loading-spinner and
// esa-loading-overlay: `<span role="status" aria-label="Loading"></span>`, on every
// page, announcing nothing, for months. An aria-label does not rescue it — the name
// is only read when the CONTENT changes.
//
// The fix is a practice, not a pattern: either put the changing text inside the
// region, or stop pretending it is one (a permanent indicator is role="img" with a
// name; a real status message goes through a shared announcer).
if (runMarkup) {
  const re = /<([a-z][a-z0-9-]*)\b([^>]*?)(\/?)>(?:([\s\S]*?)<\/\1>)?/gi;
  const seen = new Set();
  for (let m; (m = re.exec(content)); ) {
    const [, tagName, attrs, selfClosed, inner] = m;
    const isLive =
      /\brole\s*=\s*["'](?:status|alert|log)["']/i.test(attrs) ||
      /\baria-live\s*=\s*["'](?:polite|assertive)["']/i.test(attrs);
    if (!isLive) continue;
    if (/\{\s*\.\.\./.test(attrs)) continue; // spread props may carry children/content
    // Self-closing, or an element whose body is whitespace only.
    //
    // `inner` is undefined when the closing tag is not in this text at all, which
    // is the normal shape of an Edit fragment: `old_string` / `new_string` carry
    // the opening tag and nothing else. Reading that as an empty body blocked
    // routine attribute edits on regions that are populated in the file — and the
    // only escape, `a11y-checked:`, disables all nine checks on that file forever.
    // An unclosed tag is unknown, not empty, so it is skipped.
    if (!selfClosed && inner === undefined) continue;
    const body = selfClosed ? '' : inner;
    if (body.trim() !== '') continue; // has children or an interpolation — fine
    seen.add(`<${tagName}${attrs.trim() ? ' ' + attrs.trim().slice(0, 60) : ''}>`);
  }
  for (const hit of seen) {
    violations.push(`\`${hit}\` is a live region that is permanently EMPTY — a live region only ever announces a CHANGE to its contents, so this announces nothing, ever. An aria-label does not help (the name is read only when the content changes). Put the changing text inside it, or stop declaring it a region: a permanent indicator wants role="img" with a name, and a real status message wants one shared announcer.`);
  }
}

// --- Check 7: contradictory politeness on one element -----------------------
// `role="alert"` already implies aria-live="assertive"; `role="status"` and
// `role="log"` imply polite. Declaring the opposite beside the role is a
// contradiction the author cannot have meant, and the explicit attribute wins — so
// a `role="alert" aria-live="polite"` is an alert that does not interrupt, which is
// nobody's intent. Shipped in esa-field-error until 2026-08-16.
if (runMarkup) {
  const IMPLIED = { alert: 'assertive', status: 'polite', log: 'polite' };
  const re = /<[a-z][a-z0-9-]*\b[^>]*>/gi;
  const seen = new Set();
  for (let m; (m = re.exec(content)); ) {
    const tag = m[0];
    const role = /\brole\s*=\s*["'](alert|status|log)["']/i.exec(tag);
    const live = /\baria-live\s*=\s*["'](polite|assertive|off)["']/i.exec(tag);
    if (!role || !live) continue;
    const implied = IMPLIED[role[1].toLowerCase()];
    if (implied === live[1].toLowerCase()) continue; // redundant but harmless
    seen.add(`role="${role[1]}" aria-live="${live[1]}"`);
  }
  for (const hit of seen) {
    violations.push(`\`${hit}\` contradicts itself — that role already implies the opposite politeness, and the explicit aria-live wins. Drop one. (Pick the role for its semantics, or the attribute for its politeness, but do not state both in disagreement.)`);
  }
}

// --- Check 8: an interactive control inside a live region -------------------
// Live regions announce raw text with NO roles, and they do not take focus or
// provide any way to navigate to them. So a button or link inside one is announced
// as a bare word with nothing to say it is actionable and no route to reach it —
// and if the region also auto-dismisses, it is gone before a slower user arrives.
// A message with a control in it is a dialog, not a status message.
if (runMarkup) {
  const re = /<([a-z][a-z0-9-]*)\b([^>]*?)>([\s\S]*?)<\/\1>/gi;
  const seen = new Set();
  for (let m; (m = re.exec(content)); ) {
    const [, , attrs, inner] = m;
    const isLive =
      /\brole\s*=\s*["'](?:status|alert|log)["']/i.test(attrs) ||
      /\baria-live\s*=\s*["'](?:polite|assertive)["']/i.test(attrs);
    if (!isLive) continue;
    const control = /<(button|a\b[^>]*\bhref|select|textarea|input)\b/i.exec(inner);
    if (!control) continue;
    seen.add(control[1].toLowerCase().split(/\s/)[0]);
  }
  for (const hit of seen) {
    violations.push(`a <${hit}> inside a live region — live regions announce raw text with no roles and cannot be focused or navigated to, so the user is told a control exists and given no way to reach it. If the action matters, this is a dialog (esa-dialog), not a status message. If it does not, drop the control.`);
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
  // Two things are normalised away before the selector regexes run, because both
  // produced false positives on @esa/tokens/focus.css — the one file in the repo
  // whose entire job is to get focus right:
  //
  //   1. COMMENTS. `[^{]*` happily runs from a `:focus-visible` mentioned in prose
  //      to the next real rule, so a comment ABOUT focus, sitting above an
  //      `outline: none`, reads as a suppression of it. These checks should see
  //      code, never prose.
  //   2. `:not(:focus-visible)`. `:focus:not(:focus-visible) { outline: none }` is
  //      the OPPOSITE of a suppression — it is the standard backwards-compatible
  //      pairing, undoing the UA ring only where a :focus-visible rule replaces it.
  const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const styleContent = decomment(content).replace(/:not\(\s*:focus-visible\s*\)/gi, '');
  // One exemption: the ring moved to a PSEUDO-ELEMENT of the same class. A range
  // slider rings its thumb, not its track — `.input:focus-visible { outline: none }`
  // paired with `.input:focus-visible::-webkit-slider-thumb { outline: … }` is the
  // native behaviour, not a suppression. Provable from the text, so it belongs here
  // rather than costing the file a blanket a11y-checked: that would blind every
  // other check on it.
  const ringOnPseudo = /:focus[-\w]*::[-\w]+[^{]*\{[^}]*outline\s*:\s*(?!none\b|0\b)[^;}]+/i.test(styleContent);
  const suppressesFocusVisible =
    !ringOnPseudo &&
    /:focus-visible\b[^{]*\{[^}]*outline\s*:\s*(?:none|0)\b/i.test(styleContent);
  if (suppressesFocusVisible) {
    violations.push(':focus-visible { outline: none } removes the KEYBOARD focus ring specifically — this is the one you must keep. Style it, don\'t suppress it.');
  }
  // :focus (but not :focus-visible / :focus-within) with the outline killed.
  const suppressesFocus = /:focus(?![-\w])[^{]*\{[^}]*outline\s*:\s*(?:none|0)\b/i.test(styleContent);
  const haystack = decomment(content) + '\n' + decomment(fileText);
  const hasRingAlternative =
    /:focus-visible\b[^{]*\{[^}]*outline\s*:\s*(?!none|0)[^};]+/i.test(haystack) ||
    /:focus(?:-visible|-within)?\b[^{]*\{[^}]*box-shadow\s*:/i.test(haystack) ||
    /:focus(?:-visible|-within)?\b[^{]*\{[^}]*border\s*:/i.test(haystack);
  if (suppressesFocus && !hasRingAlternative) {
    violations.push(':focus { outline: none } with no visible focus alternative — pair it with a :focus-visible ring (or a box-shadow/border focus indicator). Removing the ring outright strands keyboard users.');
  }

  // (c) An UNCONDITIONAL outline reset — `outline: none` in a rule whose selector
  //     mentions no :focus state at all. This is strictly worse than (b), because
  //     the ring is gone in every state rather than the one the author had in mind,
  //     and it is the shape that actually ships: all three removals found in the
  //     hub on 2026-08-16 (esa-entity-search, esa-search-panel, esa-command-palette)
  //     were written this way, and (a) and (b) matched none of them — both require
  //     :focus in the SELECTOR. The query decided the answer.
  //
  //     Deliberately conservative. We flag only when the reset provably lands on
  //     something focusable:
  //       - a universal / bare interactive tag selector (`*`, `input`, `button`…), or
  //       - a class the SAME file puts on an interactive tag or a [tabindex].
  //     A standalone .css file we cannot pair with markup, and `.card {outline:none}`
  //     on a div, are both left alone.
  //
  //     TWO exemptions, both measured against the kit rather than guessed. Sweeping
  //     an early version over all 66 components flagged six files; five were false
  //     positives, and each exemption below is one of those five made into a rule:
  //
  //     1. A `:focus-within` ring anywhere in the file. Moving the ring to a wrapper
  //        is the ONLY reason to write :focus-within, so it is evidence the reset is
  //        deliberate — and without this the rule blocks its own recommended fix.
  //     2. A ring on the SAME class in a :focus state. `.input { outline: none }`
  //        beside `.input:focus { box-shadow: … }` is the ordinary substitution, and
  //        it is what esa-text-field, esa-textarea, esa-date-picker, esa-combobox and
  //        esa-color-picker all do.
  //
  //     Neither exemption covers a ring on a DIFFERENT class, which is exactly
  //     esa-command-palette: it ringed its menu items and left its search input bare.
  const wrapperRing = /:focus-within\b[^{]*\{[^}]*(?:outline|box-shadow|border)\s*:/i.test(
    content + '\n' + fileText,
  );
  const FOCUSABLE_TAGS = 'button|a|input|select|textarea|summary|details';
  const bareTagReset = new RegExp(`(?:^|[\\s,>+~])(?:\\*|(?:${FOCUSABLE_TAGS}))(?=[\\s,{:.\\[]|$)`, 'i');
  const markup = content + '\n' + fileText;
  const unconditional = new Set();

  for (const [, selector, body] of wrapperRing ? [] : content.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/outline\s*:\s*(?:none|0)\b/i.test(body)) continue;
    if (/:focus/i.test(selector)) continue; // (a)/(b) own those
    if (/::/.test(selector)) continue; // a pseudo-element is not the focusable box
    const sel = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!sel || sel.startsWith('@')) continue; // at-rule preludes are not selectors

    if (bareTagReset.test(sel)) {
      unconditional.add(sel.replace(/\s+/g, ' ').slice(0, 60));
      continue;
    }
    const classes = (sel.match(/\.[-\w]+/g) ?? []).map((c) => c.slice(1));
    // Exemption 2: the same class carries a ring in a :focus state.
    const sameClassRing = classes.some((name) =>
      new RegExp(`\\.${name}\\b[^{,]*:focus[-\\w]*\\b[^{]*\\{[^}]*(?:outline|box-shadow|border)\\s*:`, 'i')
        .test(markup),
    );
    if (sameClassRing) continue;

    for (const name of classes) {
      // Does this file put that class on something that can take focus?
      for (const [, tag, attrs] of markup.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
        if (!new RegExp(`\\b${name}\\b`).test(attrs)) continue;
        // tabindex="-1" is NOT enough. Such an element is unreachable by Tab, so it
        // has no place in the keyboard-navigation ring at all — whether a ring should
        // appear when it is focused PROGRAMMATICALLY is a change-of-context judgment
        // (esa-error-summary argues yes and paints one; esa-side-dialog argues no),
        // and judgment is what this hook explicitly does not adjudicate. Only a
        // non-negative tabindex puts an element in the tab order.
        const focusable =
          new RegExp(`^(?:${FOCUSABLE_TAGS})$`, 'i').test(tag) ||
          /\btabindex\s*=\s*["'{$]*\s*[0-9]/i.test(attrs);
        if (focusable) {
          unconditional.add(sel.replace(/\s+/g, ' ').slice(0, 60));
          break;
        }
      }
    }
  }
  for (const sel of unconditional) {
    violations.push(
      `\`${sel} { outline: none }\` removes the focus ring in EVERY state — there is no :focus in that selector, so no state ever restores it. If the ring belongs on a wrapper instead (a chromeless input inside a bordered row), put a :focus-within ring on the wrapper; otherwise style :focus-visible on this element.`,
    );
  }

  // --- Check 9: a focus ring that DISAPPEARS in forced colors mode -----------
  // Under `@media (forced-colors: active)` (Windows Contrast Themes — ~4% of
  // Windows machines, the most-used inbox AT on the platform) `box-shadow` is
  // force-adjusted to `none`. A ring painted only with box-shadow therefore
  // leaves the user with NO focus indicator. `outline` survives: its COLOR is
  // force-adjusted to a system color, the ring itself is not removed. It has
  // also followed `border-radius` in every engine since 2021, so the rounded
  // ring that motivated box-shadow in the first place is no longer a reason.
  //
  // ORTHOGONAL to (a)/(b)/(c) above, deliberately. Those ask "is there ANY
  // ring?" and correctly accept a box-shadow as the alternative (the three
  // exemptions at hasRingAlternative / wrapperRing / sameClassRing). A
  // box-shadow ring IS a real keyboard ring in normal mode, and narrowing
  // those would break check 4's own question. This asks the second question:
  // does the ring survive the one display mode that deletes it? Both must pass.
  //
  // Pairing is by CLASS, reusing the shape of exemption 2 above: a box-shadow
  // ring on `.input:focus` is satisfied by an `outline` ring on any :focus
  // state of `.input`. FILE-wide pairing was the other candidate and is wrong —
  // it clears a whole file the moment one control gets an outline, which is
  // exactly the shape of esa-select, esa-combobox, esa-input-tag,
  // esa-file-upload and esa-filter-dropdown, where the chip-remove or trigger
  // button rings correctly and the text input the user actually types into
  // does not. Class-pairing catches all 15 of the hub's cases; file-pairing
  // catches 10.
  //
  // Three exits, in increasing order of asserted intent:
  //   1. the SAME rule already carries an outline — a layered ring, common and
  //      correct: the outline is the floor, the box-shadow is the soft glow.
  //   2. a :focus state of the same class carries one elsewhere in the file.
  //   3. the file has a forced-colors block at all — the author engaged with
  //      the mode, and HOW they engaged is judgment this hook does not
  //      adjudicate. That is forced-colors.md's job.
  // Values are read as DECLARATIONS, never sniffed with a `(?!none)` lookahead.
  // `/outline\s*:\s*(?!none\b)/` looks right and is not: `\s*` backtracks to
  // zero width, the lookahead then sits on " none" rather than "none", and
  // `outline: none` reports as a real ring. Anchoring each declaration to `^`
  // or `;` also keeps `outline-offset` — which is not a ring — from matching.
  const declValues = (body, prop) =>
    [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;}]+)`, 'gi'))].map((m) =>
      m[1].trim().toLowerCase(),
    );
  const hasRealOutline = (body) =>
    declValues(body, 'outline').some((v) => v && !/^(?:none|0)\b/.test(v));
  const hasRealShadow = (body) =>
    declValues(body, 'box-shadow').some((v) => v && !/^none\b/.test(v));

  const handlesForcedColors = /forced-colors|forced-color-adjust/i.test(content + '\n' + fileText);
  const ringHaystack = content + '\n' + fileText;

  // Every class that carries a real outline in SOME :focus state, anywhere in
  // the file. Built once rather than as a per-class regex, which is both faster
  // and avoids interpolating a class name into a pattern. Deliberately loose:
  // `.field--error .input:focus { outline: … }` credits BOTH classes. Looseness
  // here costs a missed report; tightness would cost a false block, and this
  // gate's contract is near-zero false positives.
  const outlineRingClasses = new Set();
  let anyOutlineRing = false;
  for (const [, s, b] of ringHaystack.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/:focus/i.test(s) || !hasRealOutline(b)) continue;
    anyOutlineRing = true;
    for (const c of s.match(/\.[-\w]+/g) ?? []) outlineRingClasses.add(c.slice(1));
  }

  const shadowOnlyRings = new Set();
  for (const [, selector, body] of handlesForcedColors
    ? []
    : content.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/:focus/i.test(selector)) continue;
    if (!hasRealShadow(body)) continue;
    if (hasRealOutline(body)) continue; // exit 1 — layered ring on the same rule
    const sel = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!sel || sel.startsWith('@')) continue;

    const classes = (sel.match(/\.[-\w]+/g) ?? []).map((c) => c.slice(1));
    if (classes.some((c) => outlineRingClasses.has(c))) continue; // exit 2
    // A selector carrying no class at all (`:host(:focus-visible)`,
    // `button:focus`) cannot be paired that way. Fall back to any real outline
    // ring in the file rather than guess — same conservatism as check 4(c).
    if (!classes.length && anyOutlineRing) continue;

    shadowOnlyRings.add(sel.replace(/\s+/g, ' ').slice(0, 60));
  }
  for (const sel of shadowOnlyRings) {
    violations.push(
      `\`${sel}\` paints its focus ring with box-shadow and nothing else — box-shadow is forced to \`none\` under \`forced-colors: active\` (Windows Contrast Themes), so this ring DISAPPEARS for the users most likely to depend on it. Add an \`outline\` alongside it: the mode force-adjusts an outline's COLOUR rather than removing the ring, and outline has followed border-radius in every modern engine since 2021. Or handle the case explicitly in a \`@media (forced-colors: active)\` block.`,
    );
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
      'Skill: accessibility (from the spoke-kit plugin)  ->  forms.md, status-messages.md, forced-colors.md, cross-stack-porting.md',
    ].join('\n'),
  );
  process.exit(2);
}

process.exit(0);
