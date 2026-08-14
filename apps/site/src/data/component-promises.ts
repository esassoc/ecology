/**
 * DEBUG-ONLY audit of the tier-3 surface as a PROMISE, checked against delivery.
 *
 * The three existing views each see one half of this and none sees the join:
 *
 *   - token-graph.ts `orphans` knows a token is unread, but reports a flat list
 *     of names with no owner — so six tokens describing one component's missing
 *     user block read as six unrelated findings.
 *   - theming.ts (the shipped "Theming surface" table on every component page)
 *     is built from what a component READS. By construction it can only show
 *     hooks that are delivered; an over-promised token is invisible on the exact
 *     page where the promise is published.
 *   - tier3-naming.ts scores the NAMES, and is indifferent to whether anything
 *     reads them.
 *
 * The question none of them answers is "which components promise theming they
 * do not honour", which is what a spoke author actually hits: they override a
 * declared default, nothing moves, and there is no way to tell whether they
 * mistyped the token or the hook was always decorative.
 *
 * The classification below is the point of the module. "Unread" is one word for
 * two different defects with two different fixes:
 *
 *   no-component  the namespace names no component at all — the surface was
 *                 ported or staged ahead of code that never landed.
 *   missing-part  every token naming a given part is unread, so the part itself
 *                 has no markup. Building it is a feature, not a wiring fix.
 *   unwired       siblings naming the same part ARE read. The component has the
 *                 markup and simply doesn't consult this hook — a CSS edit.
 *
 * That split is derived, not authored: `missing-part` falls out of "are ALL of
 * this part's tokens unread", which is exactly the evidence a human uses.
 *
 * Consumed only by /debug/components, which is excluded from production builds.
 * Delete alongside token-graph.ts when the refinement work is done.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { byTier, CHROME_EXEMPT, type TokenNode } from './token-graph';
import { rows as tier3Rows } from './tier3-naming';
import { themingSurface, type ThemingHook } from './theming';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const COMPONENT_DIR = path.join(ROOT, 'packages', 'ecology', 'src', 'components');

const nodes = new Map(byTier('component').map((t) => [t.name, t]));

/** Every esa-* component file, by slug. The roster delivery is measured against. */
const roster = new Map<string, '.astro' | 'wc'>(
  existsSync(COMPONENT_DIR)
    ? readdirSync(COMPONENT_DIR)
        .filter((f) => /^esa-[a-z0-9-]+\.(astro|ts)$/.test(f))
        .map((f) => [
          f.replace(/\.(astro|ts)$/, ''),
          f.endsWith('.astro') ? ('.astro' as const) : ('wc' as const),
        ])
    : [],
);

export type GapKind = 'no-component' | 'missing-part' | 'unwired' | 'exempt';

export interface PromiseGap {
  token: string;
  kind: GapKind;
  /** First segment after the namespace — the component part the token names. */
  part: string | null;
  /** Tokens naming the same part, and how many of them are read. */
  partSize: number;
  partRead: number;
  resolved: string;
}

export interface NamespacePromise {
  ns: string;
  /** The component that owns this namespace, where one exists. */
  slug: string | null;
  type: '.astro' | 'wc' | null;
  declared: number;
  /** Declared tokens read by ANY component. */
  read: number;
  gaps: PromiseGap[];
  /** Declared here but read only by components outside this namespace. */
  readElsewhere: { token: string; by: string[] }[];
  /** 0–1. Declared tokens that something actually consults. */
  coverage: number;
}

/* ------------------------------------------------ part grouping within a ns */

/**
 * The part is the first segment after the namespace: `--sidenav-user-avatar-bg`
 * -> `user`, `--breadcrumbs-pill-bg` -> `pill`. Deliberately naive. A property
 * word lands here too (`--sidenav-bg` -> `bg`), which is harmless because a part
 * is only ever used to answer "are ALL of this group unread", and that question
 * is only asked of groups of two or more. A one-token group can't distinguish a
 * missing part from a forgotten wire, so it is never called `missing-part`.
 */
const partOf = (name: string, ns: string): string | null => {
  const rest = name.slice(2 + ns.length + 1);
  if (!rest) return null;
  const seg = rest.split('-')[0];
  return seg || null;
};

/** All three reader kinds. `readElsewhere` below deliberately stays on
 *  usedByComponents alone — that one slug-matches against the esa-* roster, so
 *  a file path would silently never be equal and every file read would report
 *  as "read elsewhere". */
const isRead = (t: TokenNode | undefined) =>
  !!t && (t.usedByComponents.length > 0 || t.usedByTokens.length > 0 || t.usedByFiles.length > 0);

/* ------------------------------------------------------------- the join */

export const namespaces: NamespacePromise[] = (() => {
  const byNs = new Map<string, string[]>();
  for (const r of tier3Rows) {
    if (!r.ns) continue;
    if (!byNs.has(r.ns)) byNs.set(r.ns, []);
    byNs.get(r.ns)!.push(r.name);
  }

  return [...byNs.entries()]
    .map(([ns, tokens]) => {
      // A namespace maps to a component by exact slug. `sidenav` deliberately
      // fails this and resolves via the alias below — the prefix and the tag
      // genuinely disagree, and pretending otherwise would hide a real finding.
      const slug = resolveSlug(ns);
      const type = slug ? (roster.get(slug) ?? null) : null;

      // Part census first: a gap's kind depends on its SIBLINGS, not on itself.
      const partStats = new Map<string, { size: number; read: number }>();
      for (const name of tokens) {
        const p = partOf(name, ns) ?? '(root)';
        const s = partStats.get(p) ?? { size: 0, read: 0 };
        s.size += 1;
        if (isRead(nodes.get(name))) s.read += 1;
        partStats.set(p, s);
      }

      const gaps: PromiseGap[] = [];
      const readElsewhere: { token: string; by: string[] }[] = [];
      let read = 0;

      for (const name of tokens) {
        const node = nodes.get(name);
        if (isRead(node)) {
          read += 1;
          const by = node?.usedByComponents ?? [];
          if (slug && by.length > 0 && !by.includes(slug)) readElsewhere.push({ token: name, by });
          continue;
        }
        const p = partOf(name, ns) ?? '(root)';
        const stat = partStats.get(p)!;
        // Exempt wins over every other kind: it is a decision ABOUT the gap, so
        // it must not be reported as one. It is still listed, never hidden.
        const kind: GapKind = chromeOf(ns)
          ? 'exempt'
          : !slug
            ? 'no-component'
            : stat.size > 1 && stat.read === 0
              ? 'missing-part'
              : 'unwired';
        gaps.push({
          token: name,
          kind,
          part: p === '(root)' ? null : p,
          partSize: stat.size,
          partRead: stat.read,
          resolved: node?.resolved ?? '—',
        });
      }

      return {
        ns,
        slug,
        type,
        declared: tokens.length,
        read,
        gaps: gaps.sort((a, b) => a.kind.localeCompare(b.kind) || a.token.localeCompare(b.token)),
        readElsewhere,
        coverage: tokens.length ? read / tokens.length : 1,
      };
    })
    .sort((a, b) => b.gaps.length - a.gaps.length || a.ns.localeCompare(b.ns));
})();

/**
 * Namespace -> component slug. Exact match first; the alias map carries the one
 * case where the token prefix and the element name were allowed to diverge.
 * `form`, `filter`, `focus-ring` and `grid` resolve to nothing ON PURPOSE —
 * they are category namespaces (or, for grid, a staged one), and forcing them
 * onto a component would launder a real "names nothing" result into a false
 * "wired" one.
 */
function resolveSlug(ns: string): string | null {
  const chrome = chromeOf(ns);
  if (chrome && roster.has(chrome.owner)) return chrome.owner;
  const ALIAS: Record<string, string> = { sidenav: 'esa-sidebar-nav' };
  if (ALIAS[ns] && roster.has(ALIAS[ns])) return ALIAS[ns];
  return roster.has(`esa-${ns}`) ? `esa-${ns}` : null;
}

/**
 * The exemption entry for a namespace, if it has one. Also the ONLY reason
 * `topbar` resolves to a component at all: nothing named `esa-topbar` exists,
 * and without an owner recorded somewhere the audit reports `no-component` —
 * the most severe kind — for a namespace whose component is simply spelled
 * differently. That misread is what nearly got these 12 tokens deleted.
 */
function chromeOf(ns: string) {
  return CHROME_EXEMPT.find((c) => c.prefix === `--${ns}-`) ?? null;
}

/** Exemptions, surfaced so the page can state them rather than just apply them. */
export const chromeExemptions = CHROME_EXEMPT;

/* --------------------------------------------- tokens naming a COMPONENT */

/**
 * `open`     — duplication, undecided. The working list.
 * `accepted` — duplication, looked at and kept, reason recorded.
 * `resolved` — NOT duplication any more: the parent composes the child, and
 *              these tokens are scoped aliases re-pointing the child's own.
 *              Indistinguishable from `open` by name alone, which is why the
 *              state has to be recorded rather than derived.
 */
export type NestingStatus = 'open' | 'accepted' | 'resolved';

export interface NestedGroup {
  /** The declaring namespace, e.g. `filter`. */
  ns: string;
  /** The component its tokens name inside that namespace, e.g. `pill`. */
  names: string;
  /** `esa-<names>`. */
  slug: string;
  tokens: { token: string; counterpart: string | null }[];
  status: NestingStatus;
  note: string | null;
}

/**
 * Duplication that has been looked at and kept, with the reason. Mirrors the
 * comment on the same block in component-tokens.css — recorded in both places so
 * neither the token file nor this page can quietly drift into re-litigating it.
 */
const NESTING_STATUS: Record<string, { status: NestingStatus; note: string }> = {
  'header-nav::avatar': {
    status: 'resolved',
    note: 'esa-header-nav composes esa-avatar. These three no longer style a second implementation — they are scoped aliases on .esa-header-nav__avatar-btn re-pointing --avatar-size-sm / --avatar-bg / --avatar-text-color. The spoke-facing names survive, the duplicate markup is gone, and the two value differences (a 32px face that is not a step on the 20/28/40/56 scale, a brand fill rather than the name-hash hue) arrive as scoped overrides instead of compromises. This is the pattern to copy for the rest.',
  },
  'filter::pill': {
    status: 'accepted',
    note: 'The filter chip is not an esa-pill: it renders a two-tone `label: value` where esa-pill takes one string in one colour, and its remove button emits { name, value } for a parent to update filter state where esa-pill removes itself from the DOM. Composing would mean adding a default slot and an opt-out of self-removal to esa-pill — which is stable and already read by esa-pillbox and esa-file-list — to serve one caller. Revisit only if esa-pill grows those for other reasons.',
  },
  'grid::pagination': {
    status: 'open',
    note: 'Rides on the staged --grid-* decision. If the AG Grid wrapper is built it should compose esa-pagination and scope --pagination-*, at which point these two are redundant; if grid is abandoned they go with it.',
  },
};

/**
 * A tier-3 token whose "part" is really ANOTHER COMPONENT.
 * `--sidenav-user-avatar-bg` was the first one found: esa-avatar already owns
 * `--avatar-bg`, so the token was a second avatar implementation living in the
 * token file. A tier-3 token is for a part the component draws ITSELF; when the
 * part is another component it gets composed, and it themes through its own
 * tokens.
 *
 * The whole difficulty is suppression. Matching component names against token
 * names alone produces mostly noise — 13 tokens name `icon`, and esa-icon has no
 * tier-3 surface at all, so a parent sizing a glyph inside its own layout is
 * correct and unremarkable. So a group is reported only when at least ONE of its
 * tokens has a DIRECT COUNTERPART in the child's namespace, which is the actual
 * evidence of duplication:
 *
 *   --filter-pill-bg          -> --pill-bg exists          -> group reported
 *   --pagination-button-color -> no --button-color, and    -> suppressed
 *                                esa-button declares only
 *                                --button-on-warning
 *   --empty-state-icon-color  -> esa-icon declares nothing -> suppressed
 *
 * Reported separately from gaps and never folded into that tally: it is a
 * different defect class, and mixing classes into one bucket is exactly what let
 * `--topbar-*` hide for months.
 */
export const nestedComponents: NestedGroup[] = (() => {
  const declared = new Set(tier3Rows.map((r) => r.name));
  /** Longest first so `icon-button` wins over `icon`. */
  const slugs = [...roster.keys()].map((s) => s.slice(4)).sort((a, b) => b.length - a.length);

  const groups = new Map<string, NestedGroup>();
  for (const row of tier3Rows) {
    if (!row.ns) continue;
    const rest = row.name.slice(2 + row.ns.length + 1);
    if (!rest) continue;
    const segs = rest.split('-');

    for (const comp of slugs) {
      if (comp === row.ns) continue;
      const cs = comp.split('-');
      const at = segs.findIndex(
        (_, i) => i + cs.length <= segs.length && cs.every((c, j) => segs[i + j] === c),
      );
      if (at < 0) continue;

      // The same token with the child's namespace substituted for the parent's
      // prefix-up-to-and-including the component name: the counterpart it would
      // have used had the part been composed instead of re-implemented.
      const tail = segs.slice(at + cs.length).join('-');
      const counterpart = tail ? `--${comp}-${tail}` : null;
      const key = `${row.ns}::${comp}`;
      if (!groups.has(key)) {
        groups.set(key, {
          ns: row.ns,
          names: comp,
          slug: `esa-${comp}`,
          tokens: [],
          status: 'open',
          note: null,
        });
      }
      groups.get(key)!.tokens.push({
        token: row.name,
        counterpart: counterpart && declared.has(counterpart) ? counterpart : null,
      });
      break; // one component per token is enough to make the point
    }
  }

  return [...groups.values()]
    .filter((g) => g.tokens.some((t) => t.counterpart))
    .map((g) => ({ ...g, ...(NESTING_STATUS[`${g.ns}::${g.names}`] ?? {}) }))
    .sort((a, b) => b.tokens.length - a.tokens.length);
})();

/* ------------------------------------------------------- the inverse gap */

export interface AdHocGroup {
  slug: string;
  type: '.astro' | 'wc' | null;
  tokens: { token: string; fallback: string | null }[];
}

/**
 * Hooks a component reads but no token file declares. These WORK — the inline
 * fallback carries them, and SPEC.md permits the pattern — but they are absent
 * from the declared surface, so nothing but the component's own source records
 * that they exist. The opposite failure to a gap: under-promised, not over.
 */
export const adHoc: AdHocGroup[] = Object.entries(themingSurface)
  .map(([slug, hooks]) => ({
    slug,
    type: roster.get(slug) ?? null,
    tokens: hooks
      .filter((h) => h.tier === 'ad-hoc')
      .map((h) => ({ token: h.token, fallback: h.fallback })),
  }))
  .filter((g) => g.tokens.length > 0)
  .sort((a, b) => b.tokens.length - a.tokens.length || a.slug.localeCompare(b.slug));

/**
 * Read with NO fallback and declared nowhere — the declaration drops entirely.
 * Unambiguous bugs, mirrored here so this page is self-contained rather than
 * making you cross-reference the token graph's Health section.
 */
export const undefinedReads: { slug: string; token: string }[] = Object.entries(themingSurface)
  .flatMap(([slug, hooks]) =>
    hooks.filter((h) => h.tier === 'undefined').map((h) => ({ slug, token: h.token })),
  )
  .sort((a, b) => a.slug.localeCompare(b.slug) || a.token.localeCompare(b.token));

/* ----------------------------------------------------- shared tier-3 surface */

export type SharingKind = 'group-surface' | 'borrowed' | 'unowned';

export interface SharedToken {
  token: string;
  kind: SharingKind;
  /** Group surface it belongs to (`forms`), when one declared it. */
  family: string | null;
  /** Owning component, when a single component's group declared it. */
  owner: string | null;
  readers: string[];
}

/**
 * Tier-3 tokens read by MORE THAN ONE component.
 *
 * The question this answers: a tier-3 token is meant to theme one component, so
 * why do several read it? Three different answers, and only one is a defect —
 * which is the whole reason this is a table and not a count:
 *
 * - `group-surface` — declared under a family header (`--form-*`). Working as
 *   designed: SPEC.md's "Shared group surfaces for things that must align
 *   across components... prefer extending a group surface over duplicating the
 *   same knob per component". NOT a tier-2 candidate — tier 2 is intent, and a
 *   group surface is coordination scoped to a family. Promoting `--form-height-md`
 *   would leak form sizing to badge, card and dialog.
 * - `borrowed` — one component's declared hook, read by another. Real coupling:
 *   re-skinning the owner silently moves the borrower.
 * - `unowned` — read by several, declared by nobody's group. No one owns the
 *   contract, so nothing stops it drifting. The genuine promotion candidates.
 *
 * Derived, never typed in: adding a component that reads `--dialog-bg` makes it
 * show up here on the next build.
 */
export const sharedTokens: SharedToken[] = (() => {
  const readers = new Map<string, Set<string>>();
  const meta = new Map<string, ThemingHook>();
  for (const [slug, hooks] of Object.entries(themingSurface)) {
    if (!slug.startsWith('esa-')) continue;
    for (const h of hooks) {
      if (h.tier !== 'component' && h.tier !== 'ad-hoc') continue;
      let set = readers.get(h.token);
      if (!set) readers.set(h.token, (set = new Set()));
      set.add(slug);
      // Any component's view carries the same declared owner/family for a
      // token; keep the first that names one so `ownedBy` isn't lost to
      // whichever page happens to be the owner itself (where it reads null).
      if (!meta.has(h.token) || (!meta.get(h.token)!.family && !meta.get(h.token)!.ownedBy)) {
        meta.set(h.token, h);
      }
    }
  }
  return [...readers.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([token, set]) => {
      const h = meta.get(token)!;
      const owner = h.ownedBy ?? ([...set].find((s) => token.startsWith(`--${s.slice(4)}-`)) ?? null);
      const kind: SharingKind =
        h.family ? 'group-surface'
        : owner ? 'borrowed'
        : 'unowned';
      return { token, kind, family: h.family, owner, readers: [...set].sort() };
    })
    .sort(
      (a, b) =>
        b.readers.length - a.readers.length || a.token.localeCompare(b.token),
    );
})();

export const SHARING_KIND_NOTE: Record<SharingKind, string> = {
  'group-surface': 'Declared under a family header so several components align on one scale — the pattern SPEC.md prefers over duplicating a knob per component. Working as designed, and NOT a tier-2 candidate: tier 2 holds intent, a group surface holds coordination scoped to a family.',
  borrowed: 'One component\'s declared hook, read by another. The borrower inherits the owner\'s theming: re-skin the owner and the borrower moves with it, silently. Either promote it to a group surface with a name that covers both, or give the borrower its own hook.',
  unowned: 'Read by several components and declared under nobody\'s group, so no component owns the contract and nothing stops the readers drifting apart. These are the real candidates to either adopt into a group surface or lift to a tier-2 role.',
};

/* ------------------------------------------------------------- headline */

const allGaps = namespaces.flatMap((n) => n.gaps);
/** Exempt tokens are unread BY DECISION, so they are not gaps and are counted
 *  separately — but they stay in `namespaces[].gaps` so the page still lists
 *  every one of them by name. An exemption that removed them from the render
 *  would be indistinguishable from having wired them. */
const realGaps = allGaps.filter((g) => g.kind !== 'exempt');

export const tally = {
  declared: namespaces.reduce((n, g) => n + g.declared, 0),
  read: namespaces.reduce((n, g) => n + g.read, 0),
  gaps: realGaps.length,
  noComponent: realGaps.filter((g) => g.kind === 'no-component').length,
  missingPart: realGaps.filter((g) => g.kind === 'missing-part').length,
  unwired: realGaps.filter((g) => g.kind === 'unwired').length,
  exempt: allGaps.filter((g) => g.kind === 'exempt').length,
  adHoc: adHoc.reduce((n, g) => n + g.tokens.length, 0),
  undefinedReads: undefinedReads.length,
  /** Deliberately NOT added to `gaps` — a different defect class. */
  nested: nestedComponents.reduce((n, g) => n + g.tokens.length, 0),
  nestedOpen: nestedComponents
    .filter((g) => g.status === 'open')
    .reduce((n, g) => n + g.tokens.length, 0),
  /** Namespaces with at least one REAL gap. */
  affected: namespaces.filter((n) => n.gaps.some((g) => g.kind !== 'exempt')).length,
  total: namespaces.length,
};

export const GAP_KIND_NOTE: Record<GapKind, string> = {
  'no-component': 'The namespace names no component. Either it is staged ahead of code that has not landed (legitimate, if documented in SPEC.md) or it is a ported surface superseded by a component under a different name.',
  'missing-part': 'Every token naming this part is unread, so the part has no markup behind it. Closing this is a FEATURE — build the part or delete the tokens. Wiring is not available as an option.',
  unwired: 'Sibling tokens naming the same part are read, so the markup exists and the component simply does not consult this hook. A CSS edit, and the only kind here that is purely a wiring fix.',
  exempt: 'Unread by DECISION, not by accident — the component exists and these map onto real elements in it. Held exempt from the wire-or-delete rule; see the exemptions table for the owner and for what a spoke gives up. Not counted as a gap, still listed by name.',
};
