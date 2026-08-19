/**
 * The two regexes that drive `scripts/migrate-tokens.mjs`.
 *
 * They live here, apart from the script, for one reason: they are the part that
 * can silently destroy a repo, so they need tests. Everything else in the codemod
 * fails loudly if it is wrong.
 */

const esc = (name) => name.replace(/[-]/g, '\\-');

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
/**
 * Comments are stripped before matching. A commented-out declaration is not a
 * declaration — counting it blocks the whole migration on a line that emits
 * nothing, and the error tells the author to "delete the other declaration"
 * while pointing at prose.
 */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');

export function findCollapseCollisions(src, pairs) {
  const clean = stripComments(src);
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
      // The trailing `;` is OPTIONAL — CSS routinely omits it on the last
      // declaration in a block, and a guard that cannot see that declaration
      // lets the codemod emit the same property twice and drop a value.
      const m = clean.match(
        new RegExp(`(?<![\\w-])${esc(name)}\\s*:\\s*([^;}]+?)\\s*(?:;|(?=\\})|$)`),
      );
      if (m) declared.push({ name, value: m[1].trim().replace(/\s+/g, ' ') });
    }
    if (declared.length < 2) continue;
    if (new Set(declared.map((d) => d.value)).size < 2) continue; // same value — lossless
    collisions.push({ to, froms: declared });
  }
  return collisions;
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
