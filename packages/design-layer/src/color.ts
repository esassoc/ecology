// Colour math for the panel's readouts: any CSS colour to hex (via a 1px
// canvas, so oklch and color-mix resolve too), WCAG contrast, OKLCH lightness.
const ctx = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c.getContext('2d', { willReadFrequently: true })!; })();
export function toHex(css: string): string {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex: string) {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export function oklchL(hex: string) {
  const [r, g, b] = channels(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}
export const firstFamily = (css: string) => css.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();

export interface Rgba { r: number; g: number; b: number; a: number }
/** Any CSS colour as 0–255 channels and a 0–1 alpha (the canvas resolves oklch and color-mix). */
export function toRgba(css: string): Rgba {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: Math.round((a / 255) * 100) / 100 };
}
const hx = (n: number) => Math.round(n).toString(16).padStart(2, '0');
/** #rrggbb, or #rrggbbaa below full opacity. */
export const rgbaToHex = (c: Rgba) => `#${hx(c.r)}${hx(c.g)}${hx(c.b)}${c.a < 1 ? hx(c.a * 255) : ''}`;
export function rgbToHsl({ r, g, b }: Rgba) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: Math.round(((h * 60) + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
export function rgbToHsv({ r, g, b }: Rgba) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  const h = d === 0 ? 0 : max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}
export function hsvToRgb(h: number, s: number, v: number): Omit<Rgba, 'a'> {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
}
export type ColorFormat = 'hex' | 'rgb' | 'hsl';
/** A colour written the way a format writes it; alpha only when it is below 1. */
export function formatColor(c: Rgba, f: ColorFormat): string {
  if (f === 'rgb') return c.a < 1 ? `rgb(${c.r} ${c.g} ${c.b} / ${c.a})` : `rgb(${c.r}, ${c.g}, ${c.b})`;
  if (f === 'hsl') { const { h, s, l } = rgbToHsl(c); return c.a < 1 ? `hsl(${h} ${s}% ${l}% / ${c.a})` : `hsl(${h}, ${s}%, ${l}%)`; }
  return rgbaToHex(c);
}
/** The format a declared value is written in: a value bound to a variable, or anything else, counts as hex. */
export const formatOf = (v: string | null | undefined): ColorFormat => (/^\s*rgba?\(/i.test(v ?? '') ? 'rgb' : /^\s*hsla?\(/i.test(v ?? '') ? 'hsl' : 'hex');
