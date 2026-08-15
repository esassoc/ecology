/**
 * The two regexes that drive `scripts/migrate-tokens.mjs`.
 *
 * They live here, apart from the script, for one reason: they are the part that
 * can silently destroy a repo, so they need tests. Everything else in the codemod
 * fails loudly if it is wrong.
 */

const esc = (name) => name.replace(/[-]/g, '\\-');

/** Full regex escape — module specifiers carry `.` and `/`, which `esc` leaves live. */
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/**
 * Matches a CSS custom-property name (`--color-primary`) where it is genuinely a
 * token reference — inside `var()`, in a declaration, in a quoted string.
 *
 * BOTH boundaries matter, and the leading one is the subtle half. A BEM modifier
 * class ENDS with the token name verbatim:
 *
 *     .esa-button--color-primary   contains   --color-primary
 *
 * Without the lookbehind, renaming the token rewrites that SELECTOR too, while the
 * component keeps emitting `esa-button--color-${color}`. The rule stops matching
 * and every coloured variant loses its colour, with no error anywhere. A real token
 * reference is always preceded by `(`, whitespace, a quote, or nothing at all.
 *
 * The trailing boundary stops `--type-size-100` matching inside `--type-size-1000`.
 */
export const tokenPattern = (name) => new RegExp(`(?<![\\w-])${esc(name)}(?![\\w-])`, 'g');

/**
 * Matches a bare class name in `class="..."`, `class:list`, or clsx. Same boundary
 * rule, for the same reason in reverse: `type-body` must not match inside
 * `type-body-small` or inside a spoke's own `cbf-type-body`.
 */
export const classPattern = (name) => new RegExp(`(?<![\\w-])${esc(name)}(?![\\w-])`, 'g');

/**
 * Local names a file binds to `moduleSpec` via a default import.
 *
 * Matched by SUFFIX, so `@esa/ecology/esa-button.astro` also resolves a relative
 * path to the same file. Only default imports are read — that is the whole of
 * how an .astro component can be imported.
 */
export function importedAs(src, moduleSpec) {
  // The basename is the identifying part; any directory prefix is allowed, but it
  // must be a WHOLE path segment so `foo/my-esa-button.astro` does not match.
  const basename = escRe(moduleSpec.split('/').pop());
  const re = new RegExp(
    `import\\s+([A-Za-z_$][\\w$]*)\\s+from\\s*['"](?:[^'"]*/)?${basename}['"]`,
    'g',
  );
  return [...src.matchAll(re)].map((m) => m[1]);
}

/**
 * Rename a COMPONENT PROP, scoped to that component's own tags.
 *
 * Unlike a token or a class, a prop name is not globally unique — it only means
 * anything relative to the component it sits on. `color` is the case in point:
 * it is the prop being renamed on `esa-button`, AND a genuine CSS-colour prop on
 * `esa-loading-spinner`, AND the most common declaration in any stylesheet.
 * A global find-and-replace would rewrite all three and break two of them.
 *
 * So the rewrite runs INSIDE the opening tag and nowhere else: find
 * `<EsaButton …>` / `<esa-button …>`, then swap the attribute within that span.
 * Both spellings are needed — spokes write the Astro wrapper in `.astro` files
 * and the custom element in plain markup, and doc pages print both inside
 * template-literal code samples, which are rewritten too because they are the
 * copy-paste source a reader actually uses.
 *
 * The component boundary `(?![\w-])` stops `<esa-button` matching
 * `<esa-button-group`; the attribute boundary `(?<![\w-])` stops `color` matching
 * `data-color` or `text-color`.
 *
 * Under-application is the designed failure mode: an attribute value containing
 * a literal `>` truncates the tag match, so a prop after it is left alone rather
 * than mangled.
 *
 * ALIASED IMPORTS are resolved per file, via `module`. `import Button from
 * '@esa/ecology/esa-button.astro'` renders `<Button …>`, which a fixed tag list
 * cannot match — and hard-coding `Button` into that list would rewrite any
 * component in any spoke that happens to share the name. Reading the local
 * binding out of the FILE'S OWN imports gets both: the alias is rewritten here,
 * and a spoke's unrelated `<Button>` (imported from somewhere else, or not
 * imported at all) is untouched, because this file never bound that name to the
 * component being renamed. The hub's own esa-page-header page was this case.
 *
 * What still escapes it: a binding no import statement reveals — re-exported
 * through a barrel file, or chosen at runtime. The component keeping the old
 * prop and warning at build time is what covers that remainder, which is why a
 * prop rename always needs both halves.
 *
 * @returns { text, count }
 */
export function renameProp(src, { components, from, to, module: moduleSpec }) {
  const tags = [...new Set([...components, ...(moduleSpec ? importedAs(src, moduleSpec) : [])])]
    .map(esc)
    .join('|');
  const openingTag = new RegExp(`<(?:${tags})(?![\\w-])[^>]*>`, 'g');
  const attr = new RegExp(`(?<![\\w-])${esc(from)}(?=\\s*=)`, 'g');
  let count = 0;
  const text = src.replace(openingTag, (tag) =>
    tag.replace(attr, () => {
      count++;
      return to;
    }),
  );
  return { text, count };
}

/**
 * Rename a whole COMPONENT — the shape a prop rename cannot express.
 *
 * `esa-icon-button` did not lose a prop, it stopped existing: it is now
 * `<esa-button variant="chrome" iconOnly>`. That needs four things a `prop` row
 * has no room for — a new tag name, added props, renamed props, and a rewritten
 * import specifier.
 *
 * TAG vs BINDING. Two spellings reach the same component and they are rewritten
 * differently:
 *
 *   <esa-icon-button>   the custom element — renamed outright to <esa-button>.
 *   <IconButton>        a default import — the NAME IS LEFT ALONE and the import
 *                       specifier is repointed instead. Renaming the binding would
 *                       mean rewriting every reference to it in the file, and the
 *                       binding is the spoke's own word, not ours. Repointing the
 *                       import is the minimal correct edit.
 *
 * This is also why `fromModule` is not optional here, unlike on `renameProp`.
 * Without it an aliased import is invisible and the spoke gets a false all-clear
 * from both /update-tokens and doctor — the failure CLAUDE.md records having
 * already happened once.
 *
 * DROPPED PROPS ARE NOT REWRITTEN, only reported. A prop with nowhere to go is a
 * judgement call about that call site (`weight` on esa-icon-link had no
 * destination — button takes its weight from the type composite). Deleting it
 * silently would change rendering with no trace; the caller surfaces the list.
 *
 * Under-application is the designed failure mode, as in renameProp: an attribute
 * value containing a literal `>` truncates the tag match, leaving that tag alone
 * rather than half-rewritten.
 *
 * @returns { text, count, dropped: [{ tag, prop }] }
 */
export function renameComponent(
  src,
  { from, to, fromModule, toModule, addProps = {}, renameProps = {}, dropProps = [] },
) {
  const bindings = fromModule ? importedAs(src, fromModule) : [];
  const tagNames = [...new Set([from, ...bindings])];
  if (!tagNames.length) return { text: src, count: 0, dropped: [] };

  const added = Object.entries(addProps)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${v}"`))
    .join('');

  const openingTag = new RegExp(`<(${tagNames.map(esc).join('|')})(?![\\w-])([^>]*)(/?)>`, 'g');
  let count = 0;
  const dropped = [];

  let text = src.replace(openingTag, (_m, tagName, attrs, selfClose) => {
    count++;
    // Custom element → new element name. A local binding keeps its name; its
    // import is repointed below.
    const newTag = tagName === from ? to : tagName;
    let a = attrs;
    for (const [oldProp, newProp] of Object.entries(renameProps)) {
      a = a.replace(new RegExp(`(?<![\\w-])${esc(oldProp)}(?=[\\s=/]|$)`, 'g'), newProp);
    }
    for (const prop of dropProps) {
      if (new RegExp(`(?<![\\w-])${esc(prop)}(?=[\\s=/]|$)`).test(a)) dropped.push({ tag: tagName, prop });
    }
    // Only add a prop the call site has not already set itself.
    const toAdd = Object.entries(addProps)
      .filter(([k]) => !new RegExp(`(?<![\\w-])${esc(k)}(?=[\\s=/]|$)`).test(a))
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${v}"`))
      .join('');
    return `<${newTag}${toAdd}${a}${selfClose}>`;
  });

  // Closing tags — only the custom-element spelling moves.
  text = text.replace(new RegExp(`</${esc(from)}(?![\\w-])\\s*>`, 'g'), `</${to}>`);

  // Repoint the import specifier, which is what makes an aliased binding correct.
  if (fromModule && toModule) {
    const base = escRe(fromModule.split('/').pop());
    text = text.replace(
      new RegExp(`(import\\s+[A-Za-z_$][\\w$]*\\s+from\\s*['"])((?:[^'"]*/)?)${base}(['"])`, 'g'),
      (_m, head, dir, tail) => `${head}${dir}${toModule.split('/').pop()}${tail}`,
    );
  }
  return { text, count, dropped };
}

/**
 * Find MANY-TO-ONE renames that would collide inside a single file.
 *
 * Some renames collapse two old names into one — `--color-text-secondary` and
 * `--color-text-tertiary` both became `--color-content-secondary`, because in the
 * hub they held the identical value and the third level was a distinction the ramp
 * did not actually have.
 *
 * That reasoning holds for the HUB. A spoke may have re-pointed them to genuinely
 * different values (cb-fish did: gray-700 and gray-600). Rewriting both then emits
 * the same property twice in one block, the later declaration wins, and the earlier
 * value is gone — no error, no warning, just a colour that quietly changed.
 *
 * Only DECLARATIONS collide (`--name:`). Two reads rewriting to the same name are
 * fine, which is the whole point of the alias.
 *
 * And only DIFFERING values collide. A spoke that declares both sides with the same
 * value has kept the hub's own reasoning intact — merging them loses nothing, so
 * blocking on it would be friction with no payoff. Comparison is textual after
 * whitespace normalisation, which errs toward reporting: two spellings of one colour
 * are flagged rather than missed.
 *
 * @returns Array of { to, froms: [{name, value}] } — empty when the file is safe.
 */
export function findCollapseCollisions(src, pairs) {
  const byTo = new Map();
  for (const { from, to } of pairs) {
    if (!byTo.has(to)) byTo.set(to, []);
    byTo.get(to).push(from);
  }
  const collisions = [];
  for (const [to, froms] of byTo) {
    if (froms.length < 2) continue;
    const declared = [];
    for (const name of froms) {
      const m = src.match(new RegExp(`(?<![\\w-])${esc(name)}\\s*:\\s*([^;]+);`));
      if (m) declared.push({ name, value: m[1].trim().replace(/\s+/g, ' ') });
    }
    if (declared.length < 2) continue;
    if (new Set(declared.map((d) => d.value)).size < 2) continue; // same value — lossless
    collisions.push({ to, froms: declared });
  }
  return collisions;
}

/**
 * Matches a spoke DECLARING a token (`--foo: value`), not reading one.
 *
 * The distinction is the whole of SPEC.md's alias asymmetry, and it is the
 * difference between "safe for now" and "already silently broken":
 *
 *   var(--old-name)     a READ    — the deprecated alias rescues it; it renders.
 *   --old-name: <value> a DECLARE — nothing reads that name any more, so the
 *                                   override is INERT. No error, no warning, and
 *                                   the component quietly uses the hub default.
 *
 * Reporting both under one count (which is what `doctor` did until 2026-08-14)
 * describes the dangerous case with the sentence written for the safe one.
 *
 * The lookbehind is the same BEM guard `tokenPattern` needs — `.btn--color-primary`
 * followed by a `:` pseudo-class must not read as a declaration.
 */
export const declPattern = (name) => new RegExp(`(?<![\\w-])${esc(name)}(?![\\w-])\\s*:`, 'g');

/** Matches a spoke READING a token — `var(--foo)` or `var(--foo, fallback)`. */
export const readPattern = (name) => new RegExp(`var\\(\\s*${esc(name)}(?![\\w-])`, 'g');

/**
 * Parse `--name: value;` declarations out of CSS into a Map, first-wins.
 *
 * COMMENTS ARE STRIPPED FIRST, and that is the whole reason this is a function
 * rather than one inline regex. `component-tokens.css` documents itself heavily,
 * and its prose quotes token names with colons after them:
 *
 *     Was `--filter-dropdown-border: 1px solid …` — a whole shorthand behind a
 *
 * A naive `(--[\w-]+)\s*:\s*([^;]+);` matches that, and because `[^;]+` happily
 * spans newlines it then eats the REAL declaration that follows. Two ways to be
 * wrong at once: a token gets a value made of prose, and a genuinely declared
 * token reads as undeclared. Both were live before this was factored out.
 */
export function parseDeclarations(css, into = new Map()) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (!into.has(m[1])) into.set(m[1], m[2].trim());
  }
  return into;
}

/**
 * Follow a token to a terminal literal through the hub's own declarations.
 *
 * Returns `null` when it resolves, or the CHAIN that dead-ends when it does not:
 * `['--form-height-md', '--control-height-md']` means the first is declared, points
 * at the second, and the second is declared nowhere — so the property drops.
 *
 * This exists because a rename's DESTINATION can be deleted by a later change on the
 * same day. `--form-height-md` → `--control-height-md` is a legitimate row; the
 * destination was then removed with `removed: true`, which emits no alias. Renaming a
 * spoke onto it "succeeds" and leaves the spoke reading a name that resolves to
 * nothing. Checking that `to` is *declared* is not enough — `--form-height-md` IS
 * declared, as an alias pointing at the dead name. The chain has to be walked.
 *
 * A `var()` with a fallback still renders, so it counts as resolved: the fallback is
 * a value, even if it is a stale one.
 *
 * @param name  token to resolve
 * @param decls Map of name -> raw declared value
 */
export function unresolvedChain(name, decls, seen = []) {
  const chain = [...seen, name];
  if (seen.length > 12) return chain;              // cycle or absurd depth
  const value = decls.get(name);
  if (value === undefined) return chain;           // declared nowhere — dead end
  const refs = [...value.matchAll(/var\(\s*(--[\w-]+)\s*(,?)/g)];
  if (!refs.length) return null;                   // terminal literal
  for (const [, ref, comma] of refs) {
    if (comma) continue;                           // has a fallback — still renders
    const bad = unresolvedChain(ref, decls, chain);
    if (bad) return bad;
  }
  return null;
}

/**
 * Apply rename pairs to a source string, longest `from` first.
 *
 * Order is load-bearing: `type-body-small` must be rewritten before `type-body`,
 * or the shorter rule eats its prefix and yields `typography-body-md-small`.
 * Returns the new text plus a per-pair hit count, so callers can report what fired.
 */
export function applyRenames(src, pairs, patternFor = tokenPattern) {
  const ordered = [...pairs].sort((a, b) => b.from.length - a.from.length);
  const counts = new Map();
  let out = src;
  for (const pair of ordered) {
    out = out.replace(patternFor(pair.from), () => {
      counts.set(pair.id ?? pair.from, (counts.get(pair.id ?? pair.from) ?? 0) + 1);
      return pair.to;
    });
  }
  return { text: out, counts };
}
