// The palettes: whole themes, not just the chrome. Each sets, per mode, the
// shell's three surfaces (as a Ramp the Surfaces controls tune), the card and
// sunken fills, hover, three border strengths, two inks and the brand roles,
// onto the variables the config maps each role to (RoleVars). Pure: no
// DOM, so the set can be checked from Node.
//
// A brand color is not automatically a button color: Ink and Geist button in
// near-black. `primary` is the fill primary actions take (esa-button primary,
// the active nav item); `accentText` and `accentMuted` are brand-tinted text
// and fills (links, secondary buttons, badges).
import PRESETS from './presets.json';
import {
  RECIPE, generate, hexToHsl, hslToHex, rampFromHexes, surfaceHex,
  type Mode, type Ramp, type SurfaceId,
} from './surfaces';

export type Role =
  | SurfaceId | 'raised' | 'sunken' | 'hover'
  | 'border' | 'borderSubtle' | 'borderStrong'
  | 'text' | 'textSecondary'
  | 'primary' | 'primaryHover' | 'onPrimary' | 'accentMuted' | 'accentText' | 'focus';

/** One mode of a palette, as hexes. */
export type Theme = Record<Role, string>;

export type PaletteGroup = 'directions' | 'references' | 'tech';
export const GROUPS: { id: PaletteGroup; label: string }[] = [
  { id: 'directions', label: 'Ecology Directions' },
  { id: 'references', label: 'References' },
  { id: 'tech', label: 'Tech-Forward' },
];

export interface Palette {
  id: string;
  name: string;
  /** The system it reads like ("Vercel"), shown as a quiet "-like" line. */
  like?: string;
  group: PaletteGroup;
  light: Theme;
  dark: Theme;
}

/** What the panel saves per mode: the palette picked (null: the theme's own
    surfaces, tuned) and its surfaces' ramp as tweaked. */
export interface PaletteChoice { palette: string | null; ramp: Ramp }

/** Each role's custom properties come from the spoke config (`roles`, merged
    over HUB_ROLES in defaults.mjs): the hub's semantic tier, which the esa-*
    legos read, plus any shell hooks a spoke adds. */
export type RoleVars = Record<Role, string[]>;
/** Derived for every palette: the secondary button's hover, a tenth of the way
    from the muted fill to the brand text. */
const MUTED_HOVER = '--color-background-brand-muted-hover';

// ── colour helpers ─────────────────────────────────────────────────────────
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
export const mix = (a: string, b: string, t: number) => { const x = rgb(a); const y = rgb(b); return toHex(x.map((n, i) => n + (y[i] - n) * t)); };
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((n) => { const c = n / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastRatio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const better = (on: string, ...inks: string[]) => inks.reduce((p, q) => (contrastRatio(q, on) > contrastRatio(p, on) ? q : p));
/** The brand text as the ring when it clears 3:1 on every fill, else the brand fill. */
const ringFor = (t: Omit<Theme, 'focus'>) =>
  [t.canvas, t.raised, t.sunken].every((s) => contrastRatio(t.accentText, s) >= 3) ? t.accentText : t.primary;

// ── Ecology directions (Andy's values) ─────────────────────────────────────
/** A direction as Andy specifies it: one default surface for the sidenav and
    canvas, the sunken fill for the top bar, and the brand roles. */
interface Direction {
  default: string; raised: string; sunken: string; hover: string;
  border: string; borderSubtle: string; borderStrong: string;
  text: string; textSecondary: string;
  brand: string; brandHover: string; muted: string; brandText: string;
  onPrimary?: string; focus?: string;
}
/** The shell maps top bar = sunken. Where sunken sits outside the recipe's bar
    band against the default, the top bar takes the recipe's bar offset at the
    default's hue and saturation instead. */
function fromDirection(m: Mode, d: Direction): Theme {
  const c = hexToHsl(d.default);
  const off = hexToHsl(d.sunken).l - c.l;
  const band = RECIPE[m].bar;
  const inBand = off >= band.min - 0.05 && off <= band.max + 0.05;
  const bar = inBand ? d.sunken : hslToHex(c.h, c.s, c.l + RECIPE[m].target.bar);
  const t = {
    bar, rail: d.default, canvas: d.default, raised: d.raised, sunken: d.sunken, hover: d.hover,
    border: d.border, borderSubtle: d.borderSubtle, borderStrong: d.borderStrong,
    text: d.text, textSecondary: d.textSecondary,
    primary: d.brand, primaryHover: d.brandHover,
    onPrimary: d.onPrimary ?? better(d.brand, '#ffffff', d.text, d.default),
    accentMuted: d.muted, accentText: d.brandText,
  };
  return { ...t, focus: d.focus ?? ringFor(t) };
}
const direction = (id: string, name: string, light: Direction, dark: Direction): Palette =>
  ({ id, name, group: 'directions', light: fromDirection('light', light), dark: fromDirection('dark', dark) });

// ── presets.json (Ecology Today and the tech-forward set) ──────────────────
interface Preset { name: string; like?: string; light: Record<string, string>; dark: Record<string, string> }
const presets = (PRESETS as { presets: Preset[] }).presets;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** In the data the sidenav equals the canvas; the tuning controls move it. */
const fromPreset = (v: Record<string, string>): Theme => ({
  bar: v.bar, rail: v.canvas, canvas: v.canvas, raised: v.raised, sunken: v.sunken, hover: v.hover,
  border: v.border, borderSubtle: v.borderSubtle, borderStrong: v.borderStrong,
  text: v.text, textSecondary: v.textSecondary,
  primary: v.primary, primaryHover: v.primaryHover, onPrimary: v.onPrimary,
  accentMuted: v.accentMuted, accentText: v.accentText, focus: v.focus,
});
/** A preset as a direction: its default is the canvas. */
const asDirection = (v: Record<string, string>): Direction => ({
  default: v.canvas, raised: v.raised, sunken: v.sunken, hover: v.hover,
  border: v.border, borderSubtle: v.borderSubtle, borderStrong: v.borderStrong,
  text: v.text, textSecondary: v.textSecondary,
  brand: v.primary, brandHover: v.primaryHover, muted: v.accentMuted, brandText: v.accentText,
  onPrimary: v.onPrimary, focus: v.focus,
});
const ecologyToday = presets.find((p) => p.name === 'Ecology Today')!;

// ── references (measured light, generated dark) ────────────────────────────
/** The light theme measured; dark surfaces from the generator at the light
    ramp's hue and saturation (neither reference ships a dark scheme), and the
    rest of dark at fixed lightness steps on that hue, with the brand's own hue
    for the brand roles at no more than S 65 (a step-9 teal at S 100 reads cyan
    on near-black). */
function reference(id: string, name: string, light: Theme): Palette {
  const lr = rampFromHexes({ bar: light.bar, rail: light.rail, canvas: light.canvas });
  const dr = generate(lr.h, lr.s).dark;
  const at = (l: number) => hslToHex(dr.h, dr.s, l);
  const b = hexToHsl(light.primary);
  const bs = Math.min(b.s, 65);
  const brand = (l: number, s = bs) => hslToHex(b.h, s, l);
  const canvas = surfaceHex(dr, 'canvas');
  const t = {
    bar: surfaceHex(dr, 'bar'), rail: surfaceHex(dr, 'rail'), canvas,
    raised: at(dr.l + 2.5), sunken: surfaceHex(dr, 'bar'), hover: at(dr.l + 8),
    border: at(24), borderSubtle: at(20), borderStrong: at(30),
    text: at(93), textSecondary: at(71),
    primary: brand(40), primaryHover: brand(46),
    onPrimary: better(brand(40), '#ffffff', canvas),
    accentMuted: brand(15, bs * 0.5), accentText: brand(72),
  };
  return { id, name, group: 'references', light, dark: { ...t, focus: ringFor(t) } };
}

// ── the set ────────────────────────────────────────────────────────────────
export const PALETTES: Palette[] = [
  // Brand text from Andy's Palette Options page, not presets.json's.
  direction('ecology-today', 'Ecology Today',
    { ...asDirection(ecologyToday.light), brandText: '#2a7e3b' },
    { ...asDirection(ecologyToday.dark), brandText: '#71d083' }),
  direction('ink', 'Ink', {
    default: '#fbfaf8', raised: '#ffffff', sunken: '#f2f0ec', hover: '#ece9e4',
    border: '#d6d2cb', borderSubtle: '#e4e0da', borderStrong: '#bdb8b0', text: '#1d1b18', textSecondary: '#6b665e',
    brand: '#1d1b18', brandHover: '#3a3631', muted: '#efece6', brandText: '#1d1b18',
  }, {
    default: '#151413', raised: '#1c1b19', sunken: '#100f0e', hover: '#2a2826',
    border: '#3a3734', borderSubtle: '#2e2c29', borderStrong: '#4a4642', text: '#eeebe6', textSecondary: '#aaa49b',
    brand: '#eeebe6', brandHover: '#d6d2cb', muted: '#2a2826', brandText: '#eeebe6',
  }),
  direction('slate', 'Slate', {
    default: '#f8fafc', raised: '#ffffff', sunken: '#eef2f6', hover: '#e7ecf2',
    border: '#cfd7e1', borderSubtle: '#dfe5ec', borderStrong: '#b4bfcc', text: '#16202b', textSecondary: '#5b6878',
    brand: '#2f5bd3', brandHover: '#284fb8', muted: '#e8eefc', brandText: '#2648a8',
  }, {
    default: '#0f141a', raised: '#161c24', sunken: '#0b0f14', hover: '#222a35',
    border: '#334050', borderSubtle: '#28323f', borderStrong: '#435264', text: '#e7edf4', textSecondary: '#a3b0bf',
    brand: '#5b84f0', brandHover: '#7397f3', muted: '#18264a', brandText: '#8eacf5',
  }),
  direction('forest', 'Forest', {
    default: '#faf9f6', raised: '#ffffff', sunken: '#f1efe9', hover: '#eae7df',
    border: '#d5d1c6', borderSubtle: '#e3e0d7', borderStrong: '#bcb7aa', text: '#1c1f1a', textSecondary: '#666a5f',
    brand: '#2f5d46', brandHover: '#264d3a', muted: '#e6eee8', brandText: '#2f5d46',
  }, {
    default: '#131512', raised: '#1a1d19', sunken: '#0e100d', hover: '#272b25',
    border: '#383d35', borderSubtle: '#2c3029', borderStrong: '#474d43', text: '#ebede6', textSecondary: '#a7ab9f',
    brand: '#5f9c7c', brandHover: '#74ad8f', muted: '#1c3328', brandText: '#8cc2a4',
  }),
  // beacon-design: theme-beacon.css (--bcn-gray-*, --bcn-teal-*) and AppShell.astro
  // (bar gray-100, rail and main gray-50, cards the hub's raised gray-1). Beacon
  // leaves hover, on-brand and the ring to the hub: gray-4, white, the brand fill.
  reference('beacon', 'Beacon', {
    bar: '#efefef', rail: '#fafafa', canvas: '#fafafa', raised: '#fcfcfc', sunken: '#efefef', hover: '#e8e8e8',
    border: '#dcdcdc', borderSubtle: '#efefef', borderStrong: '#bdbdbd', text: '#3d3d3d', textSecondary: '#525252',
    primary: '#005862', primaryHover: '#00474f', onPrimary: '#ffffff', accentMuted: '#eef5f4', accentText: '#005862', focus: '#005862',
  }),
  // ps-info-design: theme-ps-info.css (--ps-info-*). Hover is PsInfoAppShell's
  // 7% primary wash, flattened on the rail; the ring is its orange-600.
  reference('ps-info', 'PS Info', {
    bar: '#eaeef3', rail: '#f1f4f7', canvas: '#f8fafc', raised: '#ffffff', sunken: '#eff2f5', hover: mix('#f1f4f7', '#0a3b5c', 0.07),
    border: '#dfe4e9', borderSubtle: '#eff2f5', borderStrong: '#c4ccd4', text: '#202932', textSecondary: '#46515b',
    primary: '#0a3b5c', primaryHover: '#072c46', onPrimary: '#ffffff', accentMuted: '#eef4f8', accentText: '#0a3b5c', focus: '#d97316',
  }),
  ...presets.filter((p) => p !== ecologyToday).map((p): Palette => ({
    id: slug(p.name), name: p.name, like: p.like, group: 'tech', light: fromPreset(p.light), dark: fromPreset(p.dark),
  })),
];
export const paletteById = (id: string | null) => PALETTES.find((p) => p.id === id);
/** A palette's surfaces as the ramp that reproduces them exactly. */
export const paletteRamp = (p: Palette, m: Mode): Ramp => rampFromHexes({ bar: p[m].bar, rail: p[m].rail, canvas: p[m].canvas });

/** The custom properties a choice writes: every role for a palette, with the
    surfaces (and the canvas's hub default) from the ramp as tuned; only the
    three surfaces for the theme's own ramp. */
export function choiceVars(choice: PaletteChoice, m: Mode, roles: RoleVars): Record<string, string> {
  const out: Record<string, string> = {};
  const p = paletteById(choice.palette);
  const surf: Record<SurfaceId, string> = {
    bar: surfaceHex(choice.ramp, 'bar'), rail: surfaceHex(choice.ramp, 'rail'), canvas: surfaceHex(choice.ramp, 'canvas'),
  };
  if (!p) {
    for (const id of ['bar', 'rail', 'canvas'] as SurfaceId[]) for (const v of roles[id] ?? []) out[v] = surf[id];
    return out;
  }
  const t: Theme = { ...p[m], ...surf };
  for (const role of Object.keys(roles) as Role[]) for (const v of roles[role] ?? []) out[v] = t[role];
  out[MUTED_HOVER] = mix(t.accentMuted, t.accentText, 0.1);
  return out;
}
