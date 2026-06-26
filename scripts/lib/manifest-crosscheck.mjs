/*
 * manifest-crosscheck.mjs — does the page actually COMPOSE what its manifest declares?
 *
 * check-manifest.mjs (the PreToolUse gate) proves a manifest EXISTS and that every
 * section resolves to a component (the FORM). It cannot prove the page lives up to it:
 * a page can declare `- hero -> demo-page-header`, never import or render it, and
 * ship; or it can grow undeclared top-level section markup. The manifest can lie or
 * drift. This module reconciles three views of the same page — deterministically, from
 * the whole file on disk (which the hook never has) — and is consumed by
 * check-adherence.mjs (the /design-qa + /ship backstop).
 *
 * Three views, per composed page:
 *   1. DECLARED  — the manifest `sections:` resolver set (kebab: demo-page-header).
 *   2. IMPORTED  — frontmatter component imports, mapped to kebab by file BASENAME
 *                  (basename-matching sidesteps import-alias drift). Only component
 *                  sources count: `@esa/ecology/<name>.astro` and any
 *                  `…/components/<name>.{astro,ts}`; layouts/, lib/, data/ imports
 *                  are NOT components and are ignored.
 *   3. USED      — component tags in the page BODY, by nesting depth. A SECTION-level
 *                  usage is a trackable component at component-depth 0 (direct child of
 *                  the spine). A component nested inside another component (depth >= 1)
 *                  is SLOTTED content / a sub-component (e.g. a <DemoButtonLink>
 *                  passed as children of <DemoPageHeader>) — legitimate, NOT drift.
 *
 * Findings (both ERRORS):
 *   - declared-but-absent: a declared resolver with no matching import OR no body usage.
 *       "manifest declares X but the page doesn't compose it."
 *   - used-but-undeclared: a SECTION-level (depth-0) esa-* / <spoke>-* component whose
 *       kebab name isn't a manifest section. "page composes X; manifest doesn't list it."
 *
 * Scope/skip: if the page has no `sections:` manifest at all, this returns no findings
 * (manifest *existence* is gate-1's job — check-manifest; flooding undeclared errors on
 * a manifest-less page, e.g. a hub specimen, would be noise).
 */

const blankNonNewline = (s) => s.replace(/[^\n]/g, ' ');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** PascalCase tag name -> kebab. DemoPageHeader -> demo-page-header; EsaBreadcrumbs -> esa-breadcrumbs. */
function pascalToKebab(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // acronym boundary: ESALink -> ESA-Link
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camel boundary
    .toLowerCase();
}

/** Frontmatter import sources that point at a COMPONENT -> its kebab basename; else null. */
function importToKebab(src) {
  const isComponent = /(?:^|\/)@esa\/ecology\//.test(src) || /\/components\//.test(src);
  if (!isComponent) return null;
  const base = src.split('/').pop().replace(/\.(astro|ts|js|mjs)$/i, '');
  return base.toLowerCase();
}

/** Parse the `manifest: … sections:` block -> { found, declared:Set<kebab>, line }. */
function parseManifest(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\s*sections\s*:/i.test(l));
  if (start === -1) return { found: false, declared: new Set(), line: 0 };
  const declared = new Set();
  for (let i = start + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*(?:-->|---)/.test(raw)) break; // end of the manifest comment block
    if (/^\s*-\s+\S/.test(raw)) {
      const arrow = raw.match(/(?:->|→)\s*([^\s(#[]+)/);
      if (arrow) {
        const resolver = arrow[1].toLowerCase().replace(/[(),.[\]]/g, '');
        if (resolver.includes('-')) declared.add(resolver); // a section is a hyphenated component
      }
      continue;
    }
    if (/^\s*$/.test(raw)) continue; // tolerate blank lines within the list
    break; // a non-list line (e.g. a `note:`) ends the section list
  }
  return { found: true, declared, line: start + 1 };
}

/**
 * Reconcile manifest <-> imports <-> body for one .astro page source.
 * @param {string} src  full page file contents
 * @returns {{ manifest: boolean, errors: Array<{rule:string,line:number,detail:string}> }}
 */
export function crossCheckManifest(src) {
  const manifest = parseManifest(src);
  if (!manifest.found) return { manifest: false, errors: [] };

  // --- IMPORTED: component imports, kebab'd by basename. -------------------
  // Frontmatter only (the first --- … --- fence). Side-effect imports counted too.
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const frontmatter = fm ? fm[1] : '';
  const imported = new Set();
  for (const m of frontmatter.matchAll(/import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g)) {
    const kebab = importToKebab(m[1]);
    if (kebab) imported.add(kebab);
  }

  // A tag is "trackable" — a real component we reconcile — if it's a per-page
  // component import OR in the esa-* hub namespace. This makes the AppLayout
  // wrapper and the .center/.stack spine (non-component, non-esa) TRANSPARENT:
  // they don't push depth, so the page's true sections sit at depth 0.
  const trackable = (kebab) => imported.has(kebab) || kebab.startsWith('esa-');

  // --- USED: walk body tags, tracking component-nesting depth. -------------
  // Blank the frontmatter fence and every HTML comment (the manifest lives in one)
  // in place — preserving length + newlines so match offsets still map to real
  // line numbers — then scan what remains for component tags.
  let body = src;
  if (fm) body = blankNonNewline(src.slice(0, fm[0].length)) + src.slice(fm[0].length);
  body = body.replace(/<!--[\s\S]*?-->/g, blankNonNewline);

  const sectionUsed = new Set(); // trackable components at depth 0 (the page's sections)
  const allUsed = new Set(); // trackable components anywhere (section + slotted)
  const usageLine = new Map(); // kebab -> first body line, for actionable findings
  let depth = 0;
  const tagRe = /<(\/?)([A-Za-z][\w-]*)([^>]*?)(\/?)>/g;
  for (const m of body.matchAll(tagRe)) {
    const closing = m[1] === '/';
    const tag = m[2];
    const selfClosing = m[4] === '/';
    const componentShaped = /^[A-Z]/.test(tag) || tag.includes('-');
    if (!componentShaped) continue; // plain HTML (div, article, a, svg/path…) — ignore
    const kebab = /^[A-Z]/.test(tag) ? pascalToKebab(tag) : tag.toLowerCase();
    if (!trackable(kebab)) continue; // transparent wrapper (AppLayout) / non-component hyphen tag
    if (closing) {
      if (depth > 0) depth--;
      continue;
    }
    allUsed.add(kebab);
    if (!usageLine.has(kebab)) usageLine.set(kebab, lineAt(body, m.index));
    if (depth === 0) sectionUsed.add(kebab);
    if (!selfClosing) depth++; // descend into this component's slotted children
  }

  // --- Findings ------------------------------------------------------------
  const errors = [];
  for (const r of manifest.declared) {
    const hasImport = imported.has(r);
    const hasUsage = allUsed.has(r);
    if (hasImport && hasUsage) continue;
    const why = !hasImport && !hasUsage ? 'no matching import, no body usage'
      : !hasImport ? 'no matching import'
        : 'no body usage';
    errors.push({
      rule: 'manifest-declared-absent',
      line: manifest.line,
      detail: `manifest declares "${r}" but the page doesn't compose it (${why})`,
    });
  }
  for (const u of sectionUsed) {
    if (manifest.declared.has(u)) continue;
    errors.push({
      rule: 'manifest-undeclared-section',
      line: usageLine.get(u) ?? manifest.line,
      detail: `page composes "${u}" at the section level but the manifest doesn't list it (drift) — add it to \`sections:\` or nest it inside a declared section`,
    });
  }
  return { manifest: true, errors };
}
