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
// .astro/.css/.scss  -> full check (markup + hand-rolled CSS + page layout/type)
// .js/.mjs/.ts/.tsx  -> MARKUP checks only. UI built at runtime (innerHTML, template
//   literals, DOM strings) is invisible to the .astro/.css gates but bypasses the
//   design system just as hard — cb-fish's map-sow.js emitted 92 raw <button>, 39
//   <input>, 8 <select> and 0 esa-* while every hook stayed green. The .astro legos
//   are compile-time and genuinely unusable here, but the Lit web components ARE
//   real custom elements and work from any HTML string.
const isMarkup = /\.(astro|css|scss)$/i.test(file);
const isScript = /\.(js|mjs|cjs|ts|tsx)$/i.test(file);
if (!isMarkup && !isScript) process.exit(0);

// --- Gate (a): only enforce inside a spoke ---
if (classifyDir(nearestExistingDir(file)) !== 'spoke') process.exit(0);

const content = proposedContent(payload.tool_input ?? {});
if (!content) process.exit(0);

// Scripts are only interesting if they actually BUILD markup. Config, data modules,
// and pure logic have no tags and must not be dragged into a UI review.
if (isScript && !/<\/?[a-z][a-z0-9-]*(\s|>|\/)/i.test(content)) process.exit(0);

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
// CSS-selector check is markup/stylesheet-only: in a script, `.modal` is far more
// likely a querySelector argument than a hand-rolled primitive being authored.
if (isMarkup && primSelector.test(content)) {
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
  (isMarkup && new RegExp(`\\.[a-z0-9_-]*${CHIP}\\s*[,{]`, 'i').test(content)) ||
  new RegExp(`class="[^"]*\\b[a-z0-9-]*${CHIP}(?![\\w-])`, 'i').test(content)
) {
  violations.push('bespoke card/badge/pill/chip/tag -> use esa-card / esa-badge / esa-pill / esa-chip-group');
}

// --- Bespoke page LAYOUT / TYPOGRAPHY (PAGES only) ---
// A spoke PAGE must read as a MANIFEST of layout primitives + type roles, not
// hand-rolled flex/grid + raw type. Authoring a reusable component (src/components,
// bcn-*, a Lit .ts) legitimately writes flex/grid + font rules — the layout
// primitives THEMSELVES are flex/grid — so this is scoped to src/pages/** only.
// The component-first skill has advertised this block; this is the teeth.
if (/[\\/]src[\\/]pages[\\/]/i.test(file)) {
  if (/display\s*:\s*(flex|grid)\b/i.test(content)) {
    violations.push('bespoke display:flex/grid in a page -> compose a layout primitive (@esa/tokens/layouts.css): .stack (vertical rhythm) / .cluster (wrapping row) / .repel (split) / .grid (cards, knob --grid-min) / .sidebar (rail+main) / .switcher / .frame');
  }
  if (/grid-template(?:-columns|-rows|-areas)?\s*:/i.test(content)) {
    violations.push('bespoke grid-template in a page -> use .grid (knob --grid-min) or .sidebar / .switcher, not a hand-rolled track list');
  }
  if (/var\(\s*--type-size-/i.test(content) || /font-family\s*:/i.test(content)) {
    violations.push('raw --type-size-*/font-family in a page -> apply a type role (@esa/tokens/type-roles.css): .type-page-title / .type-section-title / .type-card-title / .type-body / .type-label / .type-caption');
  }
}

// --- Verdict ---
if (violations.length) {
  const runtimeNote = isScript
    ? [
        '',
        'This is a SCRIPT building markup at runtime (innerHTML / template literal / DOM string).',
        'That does NOT exempt you from the legos — it only rules out the .astro half of the catalog:',
        '  - .astro legos are COMPILE-TIME. Astro renders them at build; they cannot be created from JS.',
        '  - Lit legos are REAL CUSTOM ELEMENTS. Import the module once, then the tag works in ANY',
        '    HTML string, in any stack:',
        '',
        "      import '@esa/ecology/esa-dialog';",
        '      panel.innerHTML = `<esa-dialog heading="Export" open>',
        '                           <esa-select label="Format"></esa-select>',
        '                         </esa-dialog>`;',
        '',
        '  Runtime-usable (Lit) legos: esa-dialog esa-side-dialog esa-confirm-dialog esa-select',
        '    esa-text-field esa-textarea esa-checkbox esa-radio-group esa-combobox esa-tab-layout',
        '    esa-file-upload esa-tooltip esa-popover esa-pagination esa-switch-toggle esa-button-group',
        '    esa-button-toggle esa-chip-group esa-date-picker esa-range-slider esa-dropdown-menu ...',
        '    (full list: ls node_modules/@esa/ecology/src/components/*.ts)',
      ]
    : [];
  console.error(
    [
      'BLOCKED by component-first: this content reinvents a UI primitive, layout, or type style that an esa-* lego, layout primitive, or type role already provides.',
      '',
      'Detected:',
      ...violations.map((v) => `  - ${v}`),
      ...runtimeNote,
      '',
      'Lookup order (do this, in order):',
      '  1. Ecology esa-* legos  -> ls node_modules/@esa/ecology/src/components/',
      '  2. Layout: @esa/tokens/layouts.css primitives (.stack/.cluster/.repel/.grid/.sidebar/.switcher/.frame).',
      '     Type:   @esa/tokens/type-roles.css roles (.type-page-title/.type-section-title/.type-body/.type-label/...).',
      '  3. Beacon prod patterns (optional, if cloned) -> ~/Dev/Beacon/Beacon.Web/src/app/shared/ui/components/ + src/scss/',
      '  4. ONLY then a documented bcn- component.',
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
