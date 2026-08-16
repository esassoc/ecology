/*
 * prose-props — which declarations invite a sentence.
 *
 * Shared by the author-time hook (check-prose-props.mjs, genre tier only) and
 * the report CLI (scripts/check-prose-props.mjs, both tiers). One list, one
 * parser: a name that blocks a write and a name that earns a warning must never
 * drift apart.
 *
 * The mechanism is remy's, from docs/2026-08-16-flourish-slot-audit.md, and the
 * evidence is unusually clean. Two slots of the same shape, one field apart in
 * the same library:
 *
 *   esa-stat.sub          — doc says "muted meta"           — 20 fills,   5% flourish
 *   esa-page-header.lede  — doc says "body-large, secondary" —  4 fills, 100% flourish
 *
 * `sub` names a DATUM. `lede` names a GENRE OF WRITING, and its doc describes
 * typography rather than register. That gap is the whole mechanism: the prop's
 * name and its doc comment predict what gets typed into it, so rewriting a doc
 * comment is a real intervention with zero blast radius.
 */

// Names that name a GENRE OF WRITING. There is no reading of these that is a
// datum — they describe a kind of prose, so a sentence is what arrives. This is
// the only tier with teeth at write time.
export const GENRE = new Set([
  'lede', 'tagline', 'strapline', 'standfirst', 'blurb', 'intro', 'introduction',
  'preamble', 'byline', 'narrative', 'commentary', 'prose', 'overview', 'subtext',
  'story', 'pitch',
]);

// Names with a real datum reading AND a measured flourish rate. Worth a look,
// never an assumption: esa-empty-state.description runs 29%, esa-form-field
// .helpText 50%, esa-card.subtitle 11% clear / 71% contested. Advisory
// everywhere — `caption` on a figure is correct, and no parser can tell that
// from `caption` on a stat card.
export const CONTESTED = new Set([
  'caption', 'subtitle', 'description', 'summary', 'note', 'notes', 'hint',
  'helptext', 'detail', 'details', 'body', 'copy', 'lead', 'purpose', 'subheading',
]);

// Measured at 0% flourish in the audit and deliberately NOT flagged — do not add
// them later without fills to justify it: title, heading, label, name, message,
// text, meta, eyebrow, sub, value, status, count, date, term.

const LOOKS_TYPOGRAPHIC = /(--type-size|--color-text|body-large|body-small|font-size|\d+\s*px|muted|secondary text|display size|type-role|italic|smaller)/i;
const CONSTRAINS_CONTENT = /(never|only|must|do not|don't|avoid|not a |no more than|one line|at most|max |format|limit|constraint|source)/i;

const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A `prose-prop-checked: <reason>` comment anywhere in a file exempts it. */
export function hasEscapeHatch(source) {
  return /prose-prop-checked:/i.test(source);
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
 * Prop declarations in ANY interface or object type alias in the file, plus Lit
 * `@property()` fields and `static properties` maps.
 *
 * Scanning `Props` alone was the first parser's worst hole. The prose slot is
 * usually one level down, on the collection-item type a Props field is an array
 * of — `Props { items: RelatedItem[] }` where `RelatedItem.overview` is where
 * the sentence goes. That inverts the volume: an invisible declaration fills
 * once per row, and `Archetype.purpose` alone carries 13 fills across two pages
 * and a data module.
 *
 * Still shallow WITHIN a declaration: fields of an inline nested object literal
 * belong to that shape, not to the surface being declared here.
 */
export function findProps(source) {
  const lines = source.split('\n');
  const props = [];

  let depth = 0;
  let owner = null;
  let sawBrace = false;
  let inStatic = false;
  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (!owner) {
      const m = line.match(
        /^(?:export\s+)?(?:declare\s+)?(?:interface\s+([A-Za-z_$][\w$]*)|type\s+([A-Za-z_$][\w$]*)\s*=)/
      );
      if (m) {
        owner = m[1] || m[2];
        depth = 0;
        sawBrace = false;
      }
    }
    if (owner) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      if (opens) sawBrace = true;
      if (depth === 1) {
        const m = line.match(/^(?:readonly\s+)?["']?([A-Za-z_$][\w$-]*)["']?\s*\??\s*:/);
        if (m) props.push({ name: m[1], line: i + 1, doc: docAbove(lines, i + 1), owner });
      }
      depth += opens - closes;
      // `type X = 'a' | 'b';` never opens a body — abandon it rather than
      // swallowing every field of the next declaration.
      if (!sawBrace && line.includes(';')) owner = null;
      else if (sawBrace && depth <= 0) owner = null;
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

/** Every prose-shaped declaration in one file's source. `file` is display-only. */
export function analyze(source, file = '<source>') {
  if (hasEscapeHatch(source)) return [];
  const findings = [];

  for (const prop of findProps(source)) {
    const key = normalize(prop.name);
    const genre = GENRE.has(key);
    if (!genre && !CONTESTED.has(key)) continue;

    const docNote = diagnoseDoc(prop.doc);
    const message = genre
      ? `\`${prop.name}\` names a genre of writing, not a datum — a prop named for a kind of prose is where a sentence goes. Rename it for what it holds, or drop it and let the structure carry the meaning.`
      : `\`${prop.name}\` has legitimate uses, but the audit measured a real flourish rate on this name. Confirm it holds a datum on THIS component, not a sentence about the page.`;
    // A slot on a collection-item type is filled once per row, so it costs more
    // than its single line of declaration suggests.
    const nested =
      prop.owner && prop.owner !== 'Props'
        ? ` Declared on \`${prop.owner}\`, not on Props — it is filled once per item, so one line here is many sentences on the page.`
        : '';

    findings.push({
      level: 'warning',
      rule: genre ? 'prose-prop-genre' : 'prose-prop-contested',
      file,
      line: prop.line,
      prop: prop.name,
      declaredIn: prop.owner ?? null,
      message: `${message}${nested}${docNote ? ` ${docNote}` : ''}`,
    });
  }
  return findings;
}
