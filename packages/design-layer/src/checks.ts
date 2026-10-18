// What a lever measures: one line under it, never a lint wall. Each check is a
// number against the bar the method sets (WCAG for colour, the page's own
// scale for sizes), worded as the fact. A failing check turns its line red and
// travels with the change into the review and into changes.md.
import { contrast } from './color';

/** Large text, by WCAG: 24px, or 18.66px bold. */
export const isLarge = (px: number, weight: number) => px >= 24 || (px >= 18.66 && weight >= 700);

/** The contrast a foreground needs: 4.5 for text (3 for large), 3 for an icon or an edge. */
export const textBar = (px: number, weight: number) => (isLarge(px, weight) ? 3 : 4.5);
export const NON_TEXT = 3;

export interface SchemeRatio { light: number; dark: number }
/** The lower of a pair's two schemes, and which one it is. */
export const worst = (r: SchemeRatio) => (r.light <= r.dark ? { scheme: 'light' as const, ratio: r.light } : { scheme: 'dark' as const, ratio: r.dark });
export const ratioOf = (fg: { light: string; dark: string }, bg: { light: string; dark: string }): SchemeRatio =>
  ({ light: contrast(fg.light, bg.light), dark: contrast(fg.dark, bg.dark) });
export const fmt = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}:1`;

/** "4.8:1 light, 3.1:1 dark", with the failing scheme named first. */
export function contrastLine(r: SchemeRatio, bar: number): { text: string; fail: boolean } {
  const fails = (['light', 'dark'] as const).filter((s) => r[s] < bar);
  if (!fails.length) return { text: `${fmt(r.light)} light, ${fmt(r.dark)} dark`, fail: false };
  const s = fails[0];
  const other = s === 'light' ? 'dark' : 'light';
  return { text: `${fmt(r[s])} in ${s}, under ${bar}${fails.length > 1 ? `; ${fmt(r[other])} in ${other}` : ''}`, fail: true };
}

/** "2nd largest" among the text sizes on the page. */
export function rank(px: number, sizes: number[]) {
  const distinct = [...new Set(sizes.map((s) => Math.round(s)))].sort((a, b) => b - a);
  const i = distinct.indexOf(Math.round(px));
  if (i < 0) return null;
  if (i === 0) return 'Largest on the page';
  if (i === distinct.length - 1) return 'Smallest on the page';
  const n = i + 1;
  const suf = n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suf} largest of ${distinct.length}`;
}

/** The suggested line height for a size: tight for display text, normal for reading. */
export const suggestedLeading = (px: number) => (px >= 24 ? 'tight' : 'normal');

/** The icon size that pairs with a line of text: about 1.25 times its size. */
export const pairedIcon = (textPx: number) => textPx * 1.25;

/** The rung whose value is nearest, within a tolerance; -1 when none is close. */
export function nearest(values: number[], target: number, tol = 0.75) {
  let best = -1;
  let d = Infinity;
  values.forEach((v, i) => { const e = Math.abs(v - target); if (e < d) { d = e; best = i; } });
  return d <= tol ? best : -1;
}
