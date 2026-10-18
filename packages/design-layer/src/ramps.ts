// The ramps a lever moves along, read from the page's own tokens (ui/tokens.ts),
// never a fixed list: the spacing scale, the type scale, the radius roles, the
// colour roles, the spoke's brand and neutral ramps. A family the page does not
// declare yields no rungs, and the lever for it does not appear.
//
// A rung's value is var(--token), so an edit stays bound to the system; a
// literal appears only for a rung the system has no token for (0, None).
import { readTokens } from './ui/tokens';
import { BRAND_HUES, NEUTRAL_SEED } from './recipe-seeds.mjs';
import type { Rung } from './ui/levers';

const has = () => new Set(readTokens().map((t) => t.name));
const v = (name: string): Rung => ({ value: `var(${name})`, token: name });
const title = (s: string) => s.split('-').map((w) => (/^(xs|sm|md|lg|xl|2xl|2xs)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');

/** Every --<family>-<n> token, in numeric order. */
function numbered(family: string, skip: (n: number) => boolean = () => false): Rung[] {
  const re = new RegExp(`^--${family}-(\\d+)$`);
  return [...has()].map((n) => [n, n.match(re)?.[1]] as const).filter((x): x is readonly [string, string] => !!x[1] && !skip(Number(x[1])))
    .sort((a, b) => Number(a[1]) - Number(b[1])).map(([n]) => v(n));
}
/** The named tokens of a family that exist, in the order given. */
function named(family: string, names: string[], label = title): Rung[] {
  const all = has();
  return names.filter((n) => all.has(`--${family}-${n}`)).map((n) => ({ ...v(`--${family}-${n}`), name: label(n) }));
}

export const ZERO: Rung = { value: '0px', name: 'None' };

export const spacing = () => [{ value: '0px', name: '0' }, ...numbered('spacing')];
export const fontSizes = () => numbered('font-size');
/** The weight scale, 350 refused (regular is 400), only what `ok` says the face has. */
export const weights = (ok: (n: number) => boolean) => numbered('font-weight', (n) => n === 350 || !ok(n));
export const lineHeights = () => named('line-height', ['none', 'tight', 'normal', 'relaxed', 'loose']);
export const radii = () => [ZERO, ...named('radius', ['xs', 'sm', 'md', 'lg', 'pill'])];
export const borderWidths = () => [ZERO, ...numbered('border-width')];
export const iconSizes = () => named('icon-size', ['xs', 'sm', 'md', 'lg', 'xl']);
export function shadows(): Rung[] {
  const el = numbered('elevation');
  return [{ value: 'none', name: 'None' }, ...(el.length ? el : numbered('shadow'))].map((r, i) => (i ? { ...r, name: String(i) } : r));
}

// ── colour roles ────────────────────────────────────────────────────────────
// A role is one name for both schemes, so a swatch is a decision that holds in
// dark too. Listed by intent; a role the page does not declare is left out.
type Role = [token: string, name: string];
const TEXT: Role[] = [
  ['content-default', 'Default'], ['content-default-muted', 'Muted'], ['content-disabled', 'Disabled'], ['content-brand', 'Brand'],
  ['content-link', 'Link'], ['content-utility-info', 'Info'], ['content-utility-success', 'Success'], ['content-utility-warning', 'Warning'],
  ['content-utility-danger', 'Danger'],
];
const FILL: Role[] = [
  ['background-default', 'Page'], ['background-elevation-sunken', 'Sunken'], ['background-elevation-raised', 'Raised'],
  ['background-elevation-floating', 'Floating'], ['background-brand-muted', 'Brand Muted'], ['background-brand', 'Brand'],
  ['background-utility-info-muted', 'Info'], ['background-utility-success-muted', 'Success'], ['background-utility-warning-muted', 'Warning'],
  ['background-utility-danger-muted', 'Danger'], ['background-inverse', 'Inverse'],
];
const BORDER: Role[] = [
  ['border-default-subtle', 'Subtle'], ['border-default', 'Default'], ['border-default-strong', 'Strong'], ['border-brand', 'Brand'],
  ['border-utility-info', 'Info'], ['border-utility-success', 'Success'], ['border-utility-warning', 'Warning'], ['border-utility-danger', 'Danger'],
];
const roles = (list: Role[]) => { const all = has(); return list.filter(([t]) => all.has(`--color-${t}`)).map(([t, name]) => ({ ...v(`--color-${t}`), name })); };
export const textRoles = () => roles(TEXT);
export const fillRoles = () => [{ value: 'transparent', name: 'None' }, ...roles(FILL)];
export const borderRoles = () => roles(BORDER);

// ── the spoke's own ramps ───────────────────────────────────────────────────
/** A generated theme's scoped ramps (--radial-brand-1…12), else the hub's: grass and gray. */
export function themeRamps(): { scope: string | null; brand: Rung[]; neutral: Rung[] } {
  const all = has();
  const steps = (prefix: string) => Array.from({ length: 12 }, (_, i) => `${prefix}-${i + 1}`);
  const scope = [...all].map((n) => n.match(/^--([a-z0-9]+)-brand-12$/)?.[1]).find((s) => s && steps(`--${s}-brand`).every((n) => all.has(n))) ?? null;
  const ramp = (prefix: string, label: string) => steps(prefix).filter((n) => all.has(n)).map((n, i) => ({ ...v(n), name: `${label} ${i + 1}` }));
  return scope
    ? { scope, brand: ramp(`--${scope}-brand`, 'Brand'), neutral: ramp(`--${scope}-neutral`, 'Neutral') }
    : { scope: null, brand: ramp('--color-grass', 'Grass'), neutral: ramp('--color-gray', 'Gray') };
}

/** The Radix hues the hub ships at step 9: the lever's ten, and every one behind its chevron. */
export function hues(): { lever: Rung[]; all: Rung[] } {
  const all = has();
  const NEUTRALS = new Set(Object.keys(NEUTRAL_SEED));
  const found = [...all].map((n) => n.match(/^--color-([a-z]+)-9$/)?.[1]).filter((h): h is string => !!h && !NEUTRALS.has(h) && all.has(`--color-${h}-dark-9`) && all.has(`--color-${h}-1`))
    .sort();
  const rung = (hue: string) => ({ ...v(`--color-${hue}-9`), name: title(hue) });
  return { lever: BRAND_HUES.filter((h) => found.includes(h)).map(rung), all: found.map(rung) };
}
/** The six Radix neutrals, at step 9, where the hub ships them. */
export function neutrals(): Rung[] {
  const all = has();
  return Object.keys(NEUTRAL_SEED).filter((n) => all.has(`--color-${n}-9`) && all.has(`--color-${n}-dark-9`)).map((n) => ({ ...v(`--color-${n}-9`), name: title(n) }));
}
/** The hue a step-9 rung names: var(--color-teal-9) → teal. */
export const hueOf = (r: Rung) => r.token?.match(/^--color-([a-z]+)-9$/)?.[1] ?? null;
