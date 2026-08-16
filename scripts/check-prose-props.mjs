#!/usr/bin/env node
/*
 * check-prose-props.mjs — the AUTHOR-TIME half of verbal restraint.
 *
 * check-verbal-restraint.mjs greps strings that reached a page. It structurally
 * cannot see the thing upstream of them: a component DECLARING somewhere to put
 * a sentence. `lede?: string` is an invitation, and the flourish arrives later,
 * on a page that check never sees until it is written.
 *
 * The mechanism is remy's, from docs/2026-08-16-flourish-slot-audit.md, and the
 * evidence is unusually clean. Two slots of the same shape, one field apart in
 * the same library:
 *
 *   esa-stat.sub          — doc says "muted meta"          — 20 fills,  5% flourish
 *   esa-page-header.lede  — doc says "body-large, secondary" — 4 fills, 100% flourish
 *
 * `sub` names a DATUM. `lede` names a GENRE OF WRITING, and its doc describes
 * typography rather than register. That gap is the whole mechanism: the prop's
 * name and its doc comment predict what gets typed into it, so rewriting a doc
 * comment is a real intervention with zero blast radius.
 *
 * Everything here is a WARNING. A prop name is a judgment call about a
 * component's API — `caption` on a figure is correct, `caption` on a stat card
 * is a flourish slot — and this script cannot tell those apart. It flags; a
 * person decides. Nothing it emits ever blocks a build.
 *
 * Usage (from a spoke repo, sibling of the `ecology` checkout):
 *   node ../ecology/scripts/check-prose-props.mjs            # scans src/components
 *   node ../ecology/scripts/check-prose-props.mjs [file ...] # checks the named files only
 * Output: a JSON report to stdout. Always exits 0 — warnings never gate.
 *
 * Escape hatch, same shape as bcn-lego-checked: a `prose-prop-checked: <reason>`
 * comment anywhere in the file suppresses its findings.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src/components'];
const EXTS = /\.(astro|ts)$/i;

// Names that name a GENRE OF WRITING. There is no reading of these that is a
// datum — they describe a kind of prose, so a sentence is what arrives.
const GENRE = new Set([
  'lede', 'tagline', 'strapline', 'standfirst', 'blurb', 'intro', 'introduction',
  'preamble', 'byline', 'narrative', 'commentary', 'prose', 'overview', 'subtext',
  'story', 'pitch',
]);

// Names with a real datum reading AND a measured flourish rate. Worth a look,
// never an assumption: esa-empty-state.description runs 29%, esa-form-field
// .helpText 50%, esa-card.subtitle 11% clear / 71% contested.
const CONTESTED = new Set([
  'caption', 'subtitle', 'description', 'summary', 'note', 'notes', 'hint',
  'helptext', 'detail', 'details', 'body', 'copy', 'lead', 'purpose', 'subheading',
]);

// Measured at 0% flourish in the audit and deliberately NOT flagged — do not add
// them later without fills to justify it: title, heading, label, name, message,
// text, meta, eyebrow, sub, value, status, count, date, term.

const LOOKS_TYPOGRAPHIC = /(--type-size|--color-text|body-large|body-small|font-size|\d+\s*px|muted|secondary text|display size|type-role|italic|smaller)/i;
const CONSTRAINS_CONTENT = /(never|only|must|do not|don't|avoid|not a |no more than|one line|at most|max |format|limit|constraint|source)/i;

const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.test(name)) out.push(full);
  }
  return out;
}

/** The contiguous comment block immediately above `line` (1-based). */
function docAbove(lines, line) {
  const doc = [];
  for (let i = line - 2; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t) break;
    if (t.startsWith('*') || t.startsWith('/**') || t.startsWith('//') || t.startsWith('*/')) {
      doc.unshift(t.replace(/^\/?\*+\/?|^\/\//, '').trim());
      continue;
    }
    break;
  }
  return doc.join(' ').trim();
}

/**
 * Prop declarations in an Astro `interface Props` / `type Props` block, or a
 * Lit `@property()` field. Deliberately shallow: a nested object type's inner
 * fields are that type's business, not the component's public surface.
 */
function findProps(source) {
  const lines = source.split('\n');
  const props = [];

  let depth = 0;
  let inProps = false;
  let inStatic = false;
  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (!inProps && /^(export\s+)?(interface\s+Props\b|type\s+Props\s*=)/.test(line)) {
      inProps = true;
      depth = 0;
    }
    if (inProps) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      // Only the top level of Props declares the component's own props.
      if (depth === 1) {
        const m = line.match(/^(?:readonly\s+)?["']?([A-Za-z_$][\w$-]*)["']?\s*\??\s*:/);
        if (m) props.push({ name: m[1], line: i + 1, doc: docAbove(lines, i + 1) });
      }
      depth += opens - closes;
      if (depth <= 0 && (opens || closes)) inProps = false;
    }

    // Lit, decorator style: @property(...) above the field.
    if (/@property\s*\(/.test(line)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const f = lines[j].trim();
        const m = f.match(/^(?:declare\s+|accessor\s+|readonly\s+)*([A-Za-z_$][\w$]*)\s*[?!]?\s*[:=]/);
        if (m) {
          props.push({ name: m[1], line: j + 1, doc: docAbove(lines, i + 1) });
          break;
        }
      }
    }

    // Lit, static-map style — the dominant style in @esa/ecology:
    //   static properties = { label: { type: String }, ... };
    if (/^static\s+properties\s*=\s*\{/.test(line)) inStatic = true;
    else if (inStatic) {
      if (/^\}/.test(line)) inStatic = false;
      else {
        const m = line.match(/^["']?([A-Za-z_$][\w$-]*)["']?\s*:/);
        if (m) props.push({ name: m[1], line: i + 1, doc: docAbove(lines, i + 1) });
      }
    }
  });

  // One finding per prop name per file.
  const seen = new Set();
  return props.filter((p) => {
    const k = `${p.name}:${p.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function diagnoseDoc(doc) {
  if (!doc) {
    return 'It carries no doc comment, so nothing constrains what goes in it. Say what the prop may hold.';
  }
  if (LOOKS_TYPOGRAPHIC.test(doc) && !CONSTRAINS_CONTENT.test(doc)) {
    return 'Its doc describes how the text LOOKS, not what it may CONTAIN — the exact pattern that ran 100% flourish on esa-page-header.lede. Re-document it by register ("muted meta", "a format constraint"), not by type size.';
  }
  return null;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = args.length
  ? args.map((a) => path.resolve(ROOT, a)).filter((f) => existsSync(f) && EXTS.test(f))
  : SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

const warnings = [];
for (const file of targets) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (/prose-prop-checked:/i.test(source)) continue;

  for (const prop of findProps(source)) {
    const key = normalize(prop.name);
    const genre = GENRE.has(key);
    if (!genre && !CONTESTED.has(key)) continue;

    const docNote = diagnoseDoc(prop.doc);
    const message = genre
      ? `\`${prop.name}\` names a genre of writing, not a datum — a prop named for a kind of prose is where a sentence goes. Rename it for what it holds, or drop it and let the structure carry the meaning.`
      : `\`${prop.name}\` has legitimate uses, but the audit measured a real flourish rate on this name. Confirm it holds a datum on THIS component, not a sentence about the page.`;

    warnings.push({
      level: 'warning',
      rule: genre ? 'prose-prop-genre' : 'prose-prop-contested',
      file: path.relative(ROOT, file),
      line: prop.line,
      prop: prop.name,
      message: docNote ? `${message} ${docNote}` : message,
    });
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      filesScanned: targets.length,
      errorCount: 0,
      warningCount: warnings.length,
      errors: [],
      warnings,
      note: 'All findings are advisory and never block. The cheapest fix is usually the doc comment, not the prop: a slot documented by register gets data, a slot documented by type size gets prose.',
    },
    null,
    2
  )
);
process.exit(0);
