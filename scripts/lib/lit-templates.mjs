/*
 * lit-templates.mjs — catch the comment that silently kills a Lit component.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT A GREP
 *
 * Component styles and markup live in tagged templates: css`…` and html`…`.
 * Inside one, there is no such thing as a comment — `/* … *\/` and `<!-- … -->`
 * are just text to the JS parser. So the reflex of quoting a name you just wrote
 * ("the `.sidebar` primitive") puts raw backticks into a template literal, and
 * the reflex of quoting an expression ("background:${o.color}") puts in a real
 * interpolation. This has landed NINE times in this repo.
 *
 * Only ONE of the three shapes fails the build:
 *
 *   ODD backticks     the template closes early, the CSS after it is parsed as
 *                     JS, esbuild shouts about a line that looks fine. Loud.
 *
 *   EVEN backticks    css`A`.sidebar`B` parses CLEANLY — tagged template, member
 *                     access, second tagged template. The build is GREEN and the
 *                     module throws `css(...).sidebar is not a function` at load.
 *
 *   ${…}              a valid interpolation of an identifier that does not exist
 *                     at module scope. Build GREEN, throws at load.
 *
 * The two green shapes are the dangerous ones: the custom element never upgrades,
 * every page using it renders NOTHING, and `npm run a11y` goes green too —
 * because axe cannot fail markup that does not exist. `esa-sidebar-nav` shipped
 * this way in HEAD, and it surfaced only as contrast violations APPEARING once
 * the component came back to life.
 *
 * A grep cannot see the even-backtick shape: the count comes out balanced, and
 * it comes out balanced anyway once html`…` nests inside ${…}. So this tokenises
 * — it tracks code/comment/template/interpolation state with a stack, which is
 * the only way to know whether a given backtick opens, closes, or is text.
 */

/**
 * A legitimate close of a tagged template is followed by punctuation that
 * continues the expression. An identifier or a `.` means the template ended
 * somewhere its author did not intend.
 */
const LEGIT_AFTER = /^[\s]*([;,)\]}:?]|$|\/\/|\/\*)/;

/*
 * Only css`` and html`` are judged. An untagged template used as a plain string
 * legitimately continues into a method call (`${x}`.trim()), and flagging those
 * would be the false positive that gets the whole gate switched off. These two
 * tags are also the only ones whose CONTENTS invite comment syntax, which is the
 * reflex this catches.
 */
const TAGS = new Set(['css', 'html', 'svg']);

/**
 * Scan one source file. Returns an array of findings:
 *   { line, tag, kind, detail }
 * kind is 'early-close' (stray backtick) or 'interpolation' (stray ${…}).
 */
export function findBrokenTemplates(src, file = '<source>') {
  const findings = [];
  const lineAt = (i) => src.slice(0, i).split('\n').length;

  // Stack of open contexts. 'tmpl' entries remember the tag they were opened
  // with; 'interp' entries remember brace depth so `${ {a:1} }` closes correctly.
  const stack = [];
  const top = () => stack[stack.length - 1];

  let i = 0;
  while (i < src.length) {
    const inTemplate = top()?.type === 'tmpl';
    const c = src[i];
    const c2 = src.slice(i, i + 2);

    if (inTemplate) {
      const t = top();
      if (c === '\\') { i += 2; continue; }

      // Track CSS/HTML comment regions WITHIN the template text, so a ${…} can be
      // attributed to a comment (a real bug) rather than to intended interpolation.
      if (!t.comment && c2 === '/*') { t.comment = '/*'; i += 2; continue; }
      if (t.comment === '/*' && c2 === '*/') { t.comment = null; i += 2; continue; }
      if (!t.comment && src.startsWith('<!--', i)) { t.comment = '<!--'; i += 4; continue; }
      if (t.comment === '<!--' && src.startsWith('-->', i)) { t.comment = null; i += 3; continue; }

      if (c2 === '${') {
        if (t.comment && TAGS.has(t.tag)) {
          const snippet = src.slice(i, i + 40).split('\n')[0];
          findings.push({
            file, line: lineAt(i), tag: t.tag, kind: 'interpolation',
            detail: `\${…} inside a ${t.comment} comment — interpolated, not commented out: ${snippet}`,
          });
        }
        stack.push({ type: 'interp', depth: 0 });
        i += 2; continue;
      }

      if (c === '`') {
        stack.pop();
        const after = src.slice(i + 1, i + 60);
        // Only judge templates that are still nested-free at the point they close;
        // a nested html`…` inside ${…} closes into an interpolation, which is fine.
        if (!LEGIT_AFTER.test(after) && stack.length === 0 && TAGS.has(t.tag)) {
          const next = after.replace(/\n[\s\S]*$/, '').trim().slice(0, 30);
          findings.push({
            file, line: lineAt(i), tag: t.tag, kind: 'early-close',
            detail: `${t.tag}\` opened at line ${t.openLine} closes here; what follows ("${next}") continues the expression instead of ending it`,
          });
        }
        i++; continue;
      }
      i++; continue;
    }

    // ---- code mode ----
    if (c2 === '//') { const nl = src.indexOf('\n', i); i = nl === -1 ? src.length : nl; continue; }
    if (c2 === '/*') { const end = src.indexOf('*/', i + 2); i = end === -1 ? src.length : end + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '`') {
      const tag = src.slice(Math.max(0, i - 60), i).match(/([A-Za-z_$][\w$]*)\s*$/);
      stack.push({ type: 'tmpl', tag: tag ? tag[1] : '(untagged)', openLine: lineAt(i), comment: null });
      i++; continue;
    }
    if (top()?.type === 'interp') {
      if (c === '{') { top().depth++; i++; continue; }
      if (c === '}') {
        if (top().depth === 0) { stack.pop(); i++; continue; }
        top().depth--; i++; continue;
      }
    }
    i++;
  }
  return findings;
}

/** Scan every .ts component in a directory. */
export function scanComponents(dir, readdirSync, readFileSync) {
  const files = readdirSync(dir).filter((n) => n.endsWith('.ts')).sort();
  const findings = [];
  for (const f of files) findings.push(...findBrokenTemplates(readFileSync(`${dir}/${f}`, 'utf8'), f));
  return { files, findings };
}
