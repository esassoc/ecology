/*
 * boolish — a Boolean attribute converter that honours `="false"`.
 *
 * WHY THIS EXISTS, AND WHY IT DEVIATES FROM LIT ON PURPOSE.
 *
 * Lit's default Boolean converter is presence-based: `value !== null`. That is
 * the correct reading of an HTML boolean attribute, and for a prop defaulting to
 * FALSE it is exactly right — `disabled` is off until you write `disabled`.
 *
 * It falls apart for a prop defaulting to TRUE. `collapsible` starts `true`, so
 * an absent attribute leaves it `true`, and `collapsible="false"` sets it to
 * `true` as well, because the attribute is present. There is then NO markup that
 * turns it off — the capability exists only from JavaScript, while the attribute
 * sits there looking like it works. Five doc pages documented markup that did
 * nothing for months, and nothing failed: not the build, not the tests, not axe.
 * A silent no-op is the worst shape a bug can take in a design system, because
 * every consumer copies it forward.
 *
 * So the six default-true props read `="false"` (and `="0"`) as false. This is a
 * deliberate, narrow deviation:
 *
 *   - Use it ONLY for a prop whose default is `true`. A default-false prop must
 *     keep Lit's presence semantics — `<esa-x disabled="false">` reading as
 *     "enabled" would be its own surprise, and the plain `disabled` form is the
 *     one everyone writes.
 *   - `toAttribute` removes the attribute for `false` rather than writing
 *     "false", so a reflected prop stays idiomatic HTML and round-trips: absent
 *     re-parses as false, which is what it now means for these props.
 *
 * The alternative was inverting all six names (`no-collapse`, `hide-input`, …),
 * which is more idiomatic HTML but costs six prop renames, six migrations.json
 * rows and six shims — to fix markup that is already written down and already
 * documented. Guarded by the `="false"` ratchet in
 * scripts/lib/angular-snippet.corpus.test.mjs.
 */
import type { ComplexAttributeConverter } from 'lit';

/** Strings an author means as "off". Everything else present is "on". */
const FALSEY = new Set(['false', '0', 'off', 'no']);

export const boolish: ComplexAttributeConverter<boolean> = {
  fromAttribute: (value: string | null): boolean =>
    value !== null && !FALSEY.has(value.trim().toLowerCase()),
  // `false` removes the attribute rather than writing `="false"`, so reflection
  // produces the same HTML a hand-author would write and re-parses to `false`.
  toAttribute: (value: boolean): string | null => (value ? '' : null),
};
