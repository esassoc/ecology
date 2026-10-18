// What the Review tab lists, as data: the changes, then this page's comments,
// open first and resolved after. One list, because a change and a comment are
// both "what happened to this page", and the tab's count is both.

/** @param {string} href @param {string} base */
const keyOf = (href, base) => { const u = new URL(href, base); return u.pathname + u.hash; };

/**
 * @param {{ notes?: Record<string, any>, feedback: Array<{ url: string, status: 'open' | 'resolved' }>, page: string, base: string }} o
 * `page` is the current page's key (pathname + hash); `base` resolves relative urls.
 */
export function reviewModel(o) {
  const changes = Object.entries(o.notes ?? {});
  // Failing changes first: they are what needs attention.
  changes.sort((a, b) => Number(!!b[1].check) - Number(!!a[1].check));
  const here = o.feedback.filter((r) => keyOf(r.url, o.base) === o.page);
  const open = here.filter((r) => r.status === 'open');
  const resolved = here.filter((r) => r.status === 'resolved');
  return { changes, open, resolved, count: changes.length + open.length };
}

/** "Every (11)" or "Only this one": where a change applies, in the switch's own words. */
export function scopeWords(where, count) {
  if (where.kind === 'component') return count && count > 1 ? `Every (${count})` : 'Every';
  if (where.kind === 'instance') return 'Only this one';
  return 'Page';
}

/**
 * The overrides a target's reading starts from: everything except the target's
 * own rule, and, for Every, except the one-element rules that would mask it.
 * @template {{ scope: string, selector?: string, page?: string }} T
 * @param {T[]} overrides
 * @param {{ kind: string, selector?: string, page?: string }} t
 * @returns {T[]}
 */
export function overridesWithout(overrides, t) {
  const same = (o) => o.scope === t.kind && o.selector === t.selector && (o.page ?? '') === (t.page ?? '');
  return overrides.filter((o) => !same(o) && !(t.kind === 'component' && o.scope === 'instance'));
}
