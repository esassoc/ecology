#!/usr/bin/env node
/*
 * check-adherence.mjs — design-system adherence checker (the design-QA "Gate 1").
 *
 * A spoke re-skins @esa/ecology and hand-authors prototype pages; this is where
 * drift enters — undefined tokens, banned CSS patterns, sub-floor type, hand-rolled
 * primitives, pages that re-implement instead of composing legos. This script
 * grounds critique in real artifacts rather than taste: it is the DETERMINISTIC
 * gate the /design-qa loop runs BEFORE any LLM visual judgment. Per the research,
 * ungrounded self-critique can make output worse; tool-grounded critique reliably
 * helps.
 *
 * Sibling to check-contrast.mjs — same hub-resolved layout, same spoke
 * auto-detection (src/styles/theme-*.css), same JSON-then-exit contract.
 *
 * Usage (from a spoke repo, sibling of the `ecology` checkout):
 *   node ../ecology/scripts/check-adherence.mjs            # scans src/pages, src/layouts, src/components
 *   node ../ecology/scripts/check-adherence.mjs [file ...] # checks the named files only
 * Output: a JSON report to stdout. Exit 1 if any ERROR, else 0.
 *
 * Severity is load-bearing: hard rules (undefined token w/o fallback, banned
 * border-left, sub-floor type, hand-rolled primitive) are ERRORS; fuzzy rules
 * (hardcoded color, private --_ fallback, unloaded weight, tailwind suffix,
 * composition heft) are WARNINGS and NEVER block. Warnings inform the human;
 * they don't gate the spoke.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
// Resolve the hub from THIS script's location (it lives in <hub>/scripts/), so the
// checker works invoked as `node ../ecology/scripts/check-adherence.mjs` from any spoke.
const HUB = join(dirname(fileURLToPath(import.meta.url)), '..');

// Scaffold/template chrome shipped by /spoke-init — not workflow-authored, so out
// of scope for the gate. These layout/section paths are identical across spokes.
const EXCLUDE = [
  'src/layouts/BaseLayout.astro',
  'src/layouts/DocsLayout.astro',
  'src/layouts/ComponentDoc.astro',
  'src/layouts/AppShell.astro',
  'src/pages/design-system',
  // Landing + patterns are /spoke-init scaffold chrome, identical across spokes —
  // same rationale as design-system above (not workflow-authored, out of the gate).
  'src/pages/index.astro',
  'src/pages/patterns',
];

// ---- 1. Collect the valid token vocabulary -------------------------------
// Hub token tiers + the spoke's own theme file(s), auto-detected via glob so no
// spoke name is hardcoded (matches check-contrast.mjs).
const stylesDir = join(ROOT, 'src/styles');
const spokeThemes = existsSync(stylesDir)
  ? readdirSync(stylesDir)
      .filter((f) => f.startsWith('theme-') && f.endsWith('.css'))
      .map((f) => join(stylesDir, f))
  : [];
const TOKEN_SOURCES = [
  join(HUB, 'packages/tokens/dist/tokens.css'),
  join(HUB, 'packages/tokens/src/component-tokens.css'),
  join(HUB, 'packages/tokens/src/type-roles.css'),
  ...spokeThemes,
];
const defined = new Set();
for (const f of TOKEN_SOURCES) {
  if (!existsSync(f)) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
}

// ---- Loaded font weights (from the BaseLayout Google Fonts <link>) --------
const loadedWeights = new Set();
const baseLayout = join(ROOT, 'src/layouts/BaseLayout.astro');
if (existsSync(baseLayout)) {
  for (const wm of readFileSync(baseLayout, 'utf8').matchAll(/wght@([0-9;]+)/g))
    wm[1].split(';').forEach((w) => loadedWeights.add(Number(w)));
}

// ---- Resolve the set of files to scan ------------------------------------
function walk(p, acc) {
  if (!existsSync(p)) return acc;
  if (statSync(p).isDirectory()) for (const e of readdirSync(p)) walk(join(p, e), acc);
  else if (['.astro', '.css', '.ts'].includes(extname(p))) acc.push(p);
  return acc;
}
let targets = process.argv.slice(2);
if (targets.length === 0) {
  targets = [];
  for (const d of ['src/pages', 'src/layouts', 'src/components']) walk(join(ROOT, d), targets);
}
const isExcluded = (f) => {
  const r = relative(ROOT, f);
  return EXCLUDE.some((x) => r === x || r.startsWith(x + '/'));
};
targets = targets.filter((f) => existsSync(f) && !isExcluded(f));

// ---- Run the checks ------------------------------------------------------
const errors = [], warnings = [];
const add = (level, rule, file, line, detail) =>
  (level === 'error' ? errors : warnings).push({ rule, file: relative(ROOT, file), line, detail });

// Composition thresholds: a page over either is hand-rolling its own UI instead
// of composing legos/utilities. Fuzzy by nature -> WARNING only.
const STYLE_LINE_THRESHOLD = 120;
const LOCAL_CLASS_THRESHOLD = 25;

for (const file of targets) {
  const src = readFileSync(file, 'utf8');
  const local = new Set([...src.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
  const isAstro = extname(file) === '.astro';
  const lines = src.split('\n');
  const rel = relative(ROOT, file);
  const isPage = rel.startsWith('src/pages/');
  const escaped = /bcn-lego-checked:/i.test(src);

  lines.forEach((text, i) => {
    const ln = i + 1;

    // (a) Token references must resolve to a real name (or carry a literal fallback).
    for (const um of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,)?/gi)) {
      const name = um[1], hasFallback = !!um[2];
      if (defined.has(name) || local.has(name)) continue;
      if (hasFallback) add('warning', 'token-unknown-with-fallback', file, ln, `${name} not in the token vocab (has a fallback)`);
      else add('error', 'token-undefined', file, ln, `${name} is not defined in @esa/tokens or the theme, and has no literal fallback`);
    }

    // (b) Banned: colored left-border as a status/category indicator.
    if (/border-left\s*:\s*\d+(\.\d+)?px\s+solid/i.test(text))
      add('error', 'banned-border-left', file, ln, 'colored left-border indicator is banned — use a badge/pill/dot/tint');

    // (c) Font-size floor: 13px hard floor; 13–15px allowed only for dense/meta text.
    const fm = text.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem)/i);
    if (fm) {
      const px = fm[2].toLowerCase() === 'rem' ? parseFloat(fm[1]) * 16 : parseFloat(fm[1]);
      if (px < 13) add('error', 'font-too-small', file, ln, `font-size ${fm[0]} (~${px}px) below the 13px hard floor`);
      else if (px < 16) add('warning', 'font-below-base', file, ln, `font-size ${fm[0]} (~${px}px) — OK only for dense/meta text`);
    }

    // (d) Component-first: no hand-rolled form primitives in .astro.
    const pm = text.match(/<(input|select|textarea)\b/i);
    if (pm && isAstro)
      add('error', 'hand-rolled-primitive', file, ln, `<${pm[1]}> — use the esa-* lego (esa-text-field / esa-select / esa-textarea)`);

    // (e) Hardcoded color where a token belongs (warning). A literal fallback
    //     inside var(--token, #hex) is the REQUIRED convention, so strip those
    //     before looking for a bare hardcoded hex.
    const noFallback = text.replace(/var\(\s*--[a-z0-9-]+\s*,[^)]*\)/gi, 'var()');
    if (/(color|background|background-color|border-color|fill|stroke)\s*:\s*[^;]*#[0-9a-fA-F]{3,8}\b/i.test(noFallback))
      add('warning', 'hardcoded-color', file, ln, 'bare hardcoded color (not a var() fallback) — prefer a --color-* token or the spoke theme token');

    // (f) Private --_ token should carry a literal fallback.
    if (/--_[a-z0-9-]+\s*:\s*var\([^,)]+\)\s*;/i.test(text))
      add('warning', 'private-no-fallback', file, ln, '--_ private token should carry a literal fallback');

    // (g) Font-weight must be in the loaded set.
    const wm = text.match(/font-weight\s*:\s*(\d{3})\b/i);
    if (wm && loadedWeights.size && !loadedWeights.has(Number(wm[1])))
      add('warning', 'font-weight-unloaded', file, ln, `font-weight ${wm[1]} not in loaded set {${[...loadedWeights].sort((a, b) => a - b).join(',')}}`);

    // (h) Tailwind-style utility soup. Match only unambiguous utilities (with a
    //     numeric/keyword suffix) so hyphenated semantic names like "stat-grid"
    //     or "icon-grid" don't false-positive.
    if (/class\s*=\s*"[^"]*\b(?:gap-\d|p[xytblr]?-\d|m[xytblr]?-\d|text-(?:xs|sm|base|lg|xl|\dxl)|bg-[a-z]+-\d|rounded-(?:sm|md|lg|xl|full)|flex-(?:row|col)|grid-cols-\d)\b/i.test(text))
      add('warning', 'tailwind-utility', file, ln, 'looks like a Tailwind utility class — this project uses token-driven CSS');

    // (i) Bespoke page layout/type — a PAGE composes layout primitives + type roles;
    //     it does NOT hand-roll flex/grid or raw type. Scoped to src/pages/** (components
    //     and layouts legitimately author flex/grid); bcn-lego-checked: exempts a page.
    if (isPage && !escaped) {
      if (/display\s*:\s*(flex|grid)\b/i.test(text))
        add('error', 'bespoke-page-layout', file, ln, 'display:flex/grid in a page — compose a layout primitive (.stack/.cluster/.repel/.grid/.sidebar/.switcher/.frame) from @esa/tokens/layouts.css');
      else if (/grid-template(?:-columns|-rows|-areas)?\s*:/i.test(text))
        add('error', 'bespoke-page-layout', file, ln, 'grid-template in a page — use .grid (--grid-min) or .sidebar/.switcher');
      if (/var\(\s*--type-size-/i.test(text) || /font-family\s*:/i.test(text))
        add('error', 'bespoke-page-type', file, ln, 'raw --type-size-*/font-family in a page — apply a type role (.type-page-title/.type-section-title/.type-card-title/.type-body/.type-label/.type-caption)');
    }
  });

  // (i) Composition heft: a page carrying a heavy bespoke <style> block or a large
  //     set of unique local class selectors is re-implementing UI instead of
  //     composing legos/utilities. Per-authored-page, .astro only. WARNING.
  if (isAstro) {
    let styleLineCount = 0;
    let inStyle = false;
    const localClasses = new Set();
    let styleStartLn = 0;
    lines.forEach((text, i) => {
      // Match the real opening tag at line-start only, so a "<style>" mention in
      // a comment (e.g. "the <style> block is glue") doesn't open the counter.
      const open = /^\s*<style[\s>]/i.test(text);
      const close = /^\s*<\/style>/i.test(text);
      if (open && !inStyle) { inStyle = true; styleStartLn = i + 1; }
      if (inStyle) {
        styleLineCount++;
        // class selectors authored in this page's <style> block: `.name {`, `.a.b`, `.a .b`
        for (const cm of text.matchAll(/\.([a-z_][a-z0-9_-]*)/gi)) localClasses.add(cm[1]);
      }
      if (close) inStyle = false;
    });
    if (styleLineCount > STYLE_LINE_THRESHOLD)
      add('warning', 'composition-heavy-style', file, styleStartLn || 1,
        `page has ~${styleLineCount} <style> lines (> ${STYLE_LINE_THRESHOLD}) — page is hand-rolling; compose legos/utilities instead`);
    if (localClasses.size > LOCAL_CLASS_THRESHOLD)
      add('warning', 'composition-many-classes', file, styleStartLn || 1,
        `page defines ${localClasses.size} unique local classes (> ${LOCAL_CLASS_THRESHOLD}) — page is hand-rolling; compose legos/utilities instead`);
  }
}

const report = {
  ok: errors.length === 0,
  filesScanned: targets.length,
  tokenVocabSize: defined.size,
  spokeThemes: spokeThemes.map((f) => relative(ROOT, f)),
  loadedFontWeights: [...loadedWeights].sort((a, b) => a - b),
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings,
};
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);
