/**
 * Which typography composite each component applies.
 *
 * A composite is a CLASS, not a token — CSS has no composite custom property —
 * and that one fact makes it invisible to every scanner in this repo, because
 * they all look for `var(--x)`. `theming.ts` builds a component's doc-page
 * surface from its `var()` reads; `tier2-naming.ts` builds the composite audit
 * the same way. Both were blind in the same direction, and the blindness got
 * worse the moment components stopped hand-assembling type: before the
 * migration `esa-dialog__title` read `--font-size-400` and
 * `--typography-font-weight-semibold`, so the theming table listed them. After
 * it, the title reads `class="typography-title"` and the page said nothing
 * about type at all. Adopting the layer correctly deleted the documentation for
 * it.
 *
 * So the class scan lives here, once, and both callers import it. A third copy
 * is how the counts drift apart.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const TYPOGRAPHY_CSS = path.join(ROOT, 'packages', 'tokens', 'src', 'typography.css');
const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

/**
 * Comments out, before anything is matched.
 *
 * A doc header that NAMES a composite in prose is not a call site.
 * `esa-icon-link.astro` explains in three comments which composites the button
 * it delegates to uses and applies none of them itself — counting those made it
 * look like a consumer. Whole-line `//` only: an inline strip eats the `//` in
 * every URL.
 */
export const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/**
 * Composite class names a file constructs at runtime rather than spelling out.
 *
 * `class="label typography-${LABEL_TYPE[this.size]}"` names a role as surely as
 * `class="typography-label-md"` does, but a literal scan cannot see it — and
 * this is the DOMINANT spelling in the kit, not an edge case. A literal-only
 * scan reported two adopted composites when the real figure was about
 * seventeen, which read as "nobody uses this layer" rather than "half the kit
 * does".
 *
 * Take every identifier inside a `typography-${…}` interpolation (which covers
 * `${cond ? A[x] : B[x]}` as well as the plain lookup) and collect the string
 * literals from that identifier's `const` declaration. Reading the whole
 * declaration rather than an object literal specifically is what makes it cover
 * BOTH idioms: the size ramps are maps, but `esa-page-header` picks between two
 * roles with a ternary, and a map-only reader reported `display` and
 * `heading-lg` as adopted by nothing while the component applied one on every
 * page.
 *
 * Module scope, no expression evaluation — this reads the two idioms the
 * components actually use and is honest about being a heuristic.
 */
export const dynamicClassNames = (src: string): string[] => {
  const interpolations = [...src.matchAll(/typography-\$\{([^}]*)\}/g)];
  if (!interpolations.length) return [];

  const ids = new Set<string>();
  for (const m of interpolations) {
    for (const id of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) ids.add(id[0]);
  }

  const out = new Set<string>();
  for (const id of ids) {
    const decl = new RegExp(`const\\s+${id}\\s*(?::[^=]+?)?=([^;]*);`).exec(src);
    if (!decl) continue;
    for (const lit of decl[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) out.add(`typography-${lit[1]}`);
  }
  return [...out];
};

/**
 * The composite classes that actually ship, read from the file that defines them.
 *
 * Only the live section: `build.js` truncates the shadow-DOM bundle at the
 * DEPRECATED banner, so a class below it exists for light DOM and does not
 * exist inside any Lit component. Treating those as shippable would document a
 * role half the kit cannot render.
 */
export const shippedCompositeClasses: string[] = (() => {
  if (!existsSync(TYPOGRAPHY_CSS)) return [];
  const live = readFileSync(TYPOGRAPHY_CSS, 'utf8').split(/\/\* -+\n \* DEPRECATED/)[0];
  return [...new Set([...live.matchAll(/^\.(typography-[a-z0-9-]+)\s*\{/gm)].map((m) => m[1]))];
})();

/** Every composite class applied in one file, literal and interpolated alike. */
export const compositeClassesIn = (src: string, known: string[] = shippedCompositeClasses): string[] => {
  if (!known.length) return [];
  const clean = stripComments(src);
  // Longest first so `label-md-strong` is not consumed as `label-md`.
  const ordered = [...known].sort((a, b) => b.length - a.length);
  const RE = new RegExp(`(?<![\\w-])(${ordered.join('|')})(?![\\w-])`, 'g');
  const hits = new Set([...clean.matchAll(RE)].map((m) => m[1]));
  for (const c of dynamicClassNames(clean)) if (known.includes(c)) hits.add(c);
  return [...hits].sort();
};

/**
 * The import that puts the definitions in scope, per bucket. A component that
 * applies a class without one renders unstyled and reports no error: a Lit
 * component's shadow root is not reached by a document stylesheet, and the
 * hub's own BaseLayout does not import `typography.css` globally.
 */
const DELIVERY = { ts: "from '../typography.js'", astro: '@esa/tokens/typography.css' } as const;

export interface TypeRoles {
  /** Composite classes this component applies, e.g. `typography-title`. */
  roles: string[];
  /** True when the class definitions are in scope where it renders. */
  delivered: boolean;
}

export interface UnwiredSlot {
  component: string;
  line: number;
  /** The slot's name, or `default`. */
  slot: string;
  /** The class list on the nearest enclosing element, for the fix. */
  container: string;
}

/**
 * Slots whose container names no type role — the last place text can render
 * without one.
 *
 * A component owns its own text and can name a role for it. A SLOT is text it
 * never sees, and for a long time that was treated as the end of the hub's
 * responsibility. It is not: a composite on the slot's container reaches
 * slotted light-DOM content through ordinary inheritance (the flattened tree
 * puts the `<slot>` between them), and anything slotted in that names its own
 * role overrides it. So the container can state a DEFAULT without dictating
 * anything, and a slot with no default is text with no role.
 *
 * Icon and logo slots are exempt by name: they receive an SVG or a mark, and
 * there is no text to wire.
 *
 * Checks the whole ANCESTOR CHAIN, not the nearest class. A role on the root
 * element reaches a slot six levels down by inheritance, so "nearest preceding
 * `class=`" reported `esa-alert-box`, `esa-button` and `esa-tooltip` as unwired
 * when all three set the role on their outermost element — five false positives
 * out of seventeen, which is the ratio at which a guard stops being read.
 *
 * Still a heuristic: it balances tags with a stack rather than parsing, so an
 * Astro conditional that opens an element inside an expression can skew the
 * depth. It is a candidate list, like the API-drift warning — not a proof.
 */
const SLOT_EXEMPT = /^(icon|logo|start-icon|end-icon|avatar)$/;
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/**
 * Does this `class` attribute put a composite on the element?
 *
 * Handles both spellings. A literal `class="x typography-body-sm"` matches
 * directly; a computed `class={cls}` is resolved by reading the identifier's
 * `const` declaration, which is how `esa-alert-box` and `esa-badge` assemble
 * their root class list in frontmatter. Without the second case every Astro
 * component that builds its class array up top reads as unwired.
 */
const attrNamesComposite = (attrs: string, src: string): boolean => {
  const value = /class(?:=|:list=)\s*(?:["'`]([^"'`]*)["'`]|\{([^}]*(?:\}[^{]*\{[^}]*)*)\})/.exec(attrs);
  if (!value) return false;
  const raw = value[1] ?? value[2] ?? '';
  if (/typography-/.test(raw)) return true;
  for (const id of raw.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const decl = new RegExp(`const\\s+${id[0]}\\s*(?::[^=]+?)?=([^;]*);`).exec(src);
    if (decl && /typography-/.test(decl[1])) return true;
  }
  return false;
};

export const unwiredSlots: UnwiredSlot[] = (() => {
  const out: UnwiredSlot[] = [];
  if (!existsSync(COMPONENTS)) return out;

  for (const file of readdirSync(COMPONENTS)) {
    if (!/\.(astro|ts)$/.test(file)) continue;
    const component = file.replace(/\.(astro|ts)$/, '');
    const lines = stripComments(readFileSync(path.join(COMPONENTS, file), 'utf8')).split('\n');

    const src = lines.join('\n');
    // Line number for an offset, so a finding points at something clickable.
    const lineAt = (offset: number) => src.slice(0, offset).split('\n').length;

    const stack: { tag: string; composite: boolean; cls: string }[] = [];
    const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|`[^`]*`|\{[^{}]*\}|[^>"'`])*?)(\/?)>/g;

    for (const m of src.matchAll(TAG)) {
      const [, closing, tag, attrs, selfClose] = m;

      if (closing) {
        // Pop to the matching open tag; tolerate the unbalanced markup an
        // Astro conditional can produce rather than losing the whole file.
        const at = stack.map((s) => s.tag).lastIndexOf(tag);
        if (at >= 0) stack.length = at;
        continue;
      }

      if (tag === 'slot') {
        const slot = /name=["']([^"']+)["']/.exec(attrs)?.[1] ?? 'default';
        const wired = stack.some((s) => s.composite);
        if (!SLOT_EXEMPT.test(slot) && !wired) {
          const nearest = [...stack].reverse().find((s) => s.cls);
          out.push({
            component,
            line: lineAt(m.index!),
            slot,
            container: nearest?.cls || '(no container)',
          });
        }
      }

      if (selfClose || VOID_TAGS.has(tag) || tag === 'slot') continue;
      const cls = /class(?:=|:list=)\s*(?:["'`]([^"'`]*)["'`]|\{([^}]*)\})/.exec(attrs);
      // A capitalised tag is an imported Astro component, and it names the role for
      // what it wraps — `esa-icon-link` is nothing but `<EsaButton><slot /></EsaButton>`,
      // so its slot is wired by the button, not by anything in this file.
      const delegated = /^[A-Z]/.test(tag);
      stack.push({
        tag,
        composite: delegated || attrNamesComposite(attrs, src),
        cls: (cls?.[1] ?? cls?.[2] ?? '').trim(),
      });
    }
  }
  return out.sort((a, b) => a.component.localeCompare(b.component) || a.line - b.line);
})();

/** component slug -> the type roles it names. */
export const typeRolesBySlug: Map<string, TypeRoles> = (() => {
  const map = new Map<string, TypeRoles>();
  if (!existsSync(COMPONENTS)) return map;

  for (const file of readdirSync(COMPONENTS)) {
    if (!/\.(astro|ts)$/.test(file)) continue;
    const raw = readFileSync(path.join(COMPONENTS, file), 'utf8');
    const roles = compositeClassesIn(raw);
    if (!roles.length) continue;

    const slug = file.replace(/\.(astro|ts)$/, '');
    const delivered = raw.includes(file.endsWith('.ts') ? DELIVERY.ts : DELIVERY.astro);

    // esa-foo.astro and esa-foo.ts both feed one slug — merge rather than clobber.
    const prior = map.get(slug);
    map.set(slug, {
      roles: [...new Set([...(prior?.roles ?? []), ...roles])].sort(),
      delivered: (prior?.delivered ?? true) && delivered,
    });
  }
  return map;
})();

export interface LeadingMismatch {
  component: string;
  selector: string;
  roles: string[];
  kind: 'microcopy-on-flowing' | 'flowing-in-a-box' | 'outside-the-system';
  detail: string;
}

/**
 * Elements whose leading and whose box disagree.
 *
 * `microcopy-*` is the one intention with no leading — it exists for text that sits
 * IN a box whose height comes from padding. Every other role leads for a column of
 * prose. The two are otherwise identical at the same rung: `body-md` and
 * `microcopy-md-subtle` differ ONLY in line-height, so picking the wrong one is
 * invisible in review and invisible at runtime. CSS has no diagnostic for it — the
 * same silent shape as a class that matches no rule.
 *
 * Two directions, and they fail differently:
 *
 *   microcopy-on-flowing   a no-leading role on text that can wrap. Real bug: the
 *                          lines touch on the second line. Nothing catches it until
 *                          someone writes a long label or a translation lands.
 *   flowing-in-a-box       a leading role on nowrap/input text in a padding-sized
 *                          box. Not a bug — the box is just taller than intended,
 *                          which is the condition this whole layer was built to
 *                          remove. Advisory.
 *
 * HEURISTIC, and it says so: it reads `white-space: nowrap` and `height` from the
 * element's own rules, so an element that inherits either from an ancestor reads
 * wrong. It also checks the styled element rather than the child holding the text —
 * `esa-button`'s nowrap sits on `.esa-button__label`, not `.esa-button__native`, and
 * that exact gap caused a wrong deletion during this migration. Treat it as a
 * candidate list, like the API-drift warning.
 */
export const leadingMismatches: LeadingMismatch[] = (() => {
  const out: LeadingMismatch[] = [];
  if (!existsSync(COMPONENTS)) return out;

  for (const file of readdirSync(COMPONENTS)) {
    if (!/\.(astro|ts)$/.test(file)) continue;
    const component = file.replace(/\.(astro|ts)$/, '');
    const src = stripComments(readFileSync(path.join(COMPONENTS, file), 'utf8'));

    const bundles = [
      ...src.matchAll(/class(?::list)?=\s*(?:["'`]([\s\S]*?)["'`]|\{([\s\S]*?)\})/g),
    ].map((m) => m[1] ?? m[2] ?? '');
    for (const m of src.matchAll(/const\s+[A-Za-z_$][\w$]*\s*(?::[^=]+?)?=([\s\S]*?);/g)) {
      if (/typography-/.test(m[1])) bundles.push(m[1]);
    }

    const regions = file.endsWith('.astro')
      ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
      : [...src.matchAll(/css`([\s\S]*?)`\s*[,;\]]/g)].map((m) => m[1]);

    for (const region of regions) {
      const clean = region.replace(/\/\*[\s\S]*?\*\//g, '');
      const rules = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((r) => ({
        sel: r[1].trim().replace(/\s+/g, ' '),
        body: r[2],
      }));

      for (const rule of rules) {
        const targets = [...rule.sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
        if (!targets.length) continue;

        const roles = new Set<string>();
        for (const t of targets) {
          const word = new RegExp(`(?<![\\w-])${t}(?![\\w-])`);
          for (const b of bundles) {
            if (!word.test(b)) continue;
            for (const r of compositeClassesIn(b)) roles.add(r.replace(/^typography-/, ''));
          }
        }

        // Text that names NO composite is invisible to a check that measures
        // agreement WITHIN the system — which is how `esa-app-shell__wordmark` sat
        // here unflagged, assembling its type from four tier-3 hooks. A rule that
        // sets leading AND its own face or size has opted out; say so, because
        // opting out should be a visible decision rather than a silent one.
        if (!roles.size) {
          const assembles = /(^|[;\s])(font-family|font-size|font-weight)\s*:/.test(rule.body);
          const setsLeading = /(^|[;\s])line-height\s*:/.test(rule.body);
          if (assembles && setsLeading) {
            out.push({
              component, selector: rule.sel, roles: [],
              kind: 'outside-the-system',
              detail: 'assembles its own type and leading — names no composite',
            });
          }
          continue;
        }

        // Everything the component says about this class OR its BEM neighbours.
        // `nowrap` is routinely declared somewhere other than the styled element:
        // `.link--child` inherits it from `.link`, and `.esa-app-shell__search` gets
        // it from the `__search-label` inside it. Matching only the exact class
        // reported 24 false positives out of 26 — the ratio at which a guard stops
        // being read. Block = the part before `__` or `--`.
        const blocks = new Set(targets.map((t) => t.split(/__|--/)[0]));
        const related = rules.filter((r) =>
          targets.some((t) => new RegExp(`\\.${t}(?![\\w-])`).test(r.sel)) ||
          [...blocks].some((b) => new RegExp(`\\.${b}(?:__|--)?[\\w-]*(?![\\w-])`).test(r.sel)));
        const all = related.map((r) => r.body).join(';');
        const nowrap = /white-space:\s*nowrap/.test(all);
        // A native input or select is single-line by construction. `textarea` is NOT
        // included — it is the one form control that is genuinely multi-line, and
        // treating it as single-line would hide the one place this check should fire.
        const nativeInput = targets.some((t) =>
          new RegExp(`<(?:input|select)\\b[\\s\\S]{0,200}?${t}(?![\\w-])`).test(src));
        const single = nowrap || nativeInput;
        const hasHeight = /(^|[;\s])height\s*:/.test(all);
        const padded = /(^|[;\s])padding(-block|-inline|-top|-bottom)?\s*:/.test(all);

        const micro = [...roles].filter((r) => r.startsWith('microcopy-'));
        const flowing = [...roles].filter((r) => !r.startsWith('microcopy-'));

        if (micro.length && !single) {
          out.push({
            component, selector: rule.sel, roles: micro, kind: 'microcopy-on-flowing',
            detail: 'no leading on text that can wrap — lines touch on the second line',
          });
        }
        if (flowing.length && single && padded && !hasHeight) {
          out.push({
            component, selector: rule.sel, roles: flowing, kind: 'flowing-in-a-box',
            detail: 'single-line text in a padding-sized box — its leading is setting the height',
          });
        }
      }
    }
  }
  // One finding per element, not per state. `.x`, `.x:hover` and `.x:disabled` are
  // the same element with the same role; reporting three made the list look four
  // times worse than it was.
  const seen = new Set<string>();
  return out
    .map((m) => ({ ...m, selector: m.selector.replace(/:{1,2}[a-z-]+(\([^)]*\))?/g, '') }))
    .filter((m) => {
      const k = `${m.component}|${m.selector}|${m.kind}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.component.localeCompare(b.component));
})();

/**
 * The property tokens a composite assembles, read from the compiled output.
 *
 * READ, not assumed. Every composite has five — except the two eyebrows, which add
 * `text-transform` for their caps treatment — so a hardcoded list of five would be
 * wrong about them and right about everything else, which is the worst kind of
 * wrong. It also means the doc page prints names a spoke can copy: the column used
 * to render `--typography-microcopy-xs-*`, which is a shorthand, not a token, and
 * cannot be pasted into a theme file.
 */
export const propertyTokensOf = (compositeClass: string): string[] => {
  const role = compositeClass.replace(/^\.?typography-/, '');
  const dist = path.join(ROOT, 'packages', 'tokens', 'dist', 'tokens.css');
  if (!existsSync(dist)) return [];
  const RE = new RegExp(`(--typography-${role}-(?:font-family|font-size|font-weight|line-height|letter-spacing|text-transform))\\s*:`, 'g');
  return [...new Set([...readFileSync(dist, 'utf8').matchAll(RE)].map((m) => m[1]))].sort();
};
