// Try 3: three directions for a selection (or the page), each a bundle of
// lever moves along the system's own ramps with one line saying why. Never
// random: the same selection gets the same three. A direction is offered only
// where its moves apply, and its moves go through the levers themselves, so a
// previewed option is ordinary changes (notes, checks, review rows) and Keep
// is one undo step.

export interface Move { id: string; d?: number; pick?: string }
export interface Direction { name: string; why: string; moves: Move[] }
interface Steerable { id: string; move?(d: number): boolean; pick?(name: string): boolean }

// In the order they are offered; the first three that apply win.
const TEXT: Direction[] = [
  { name: 'Larger', why: 'Two steps up the type scale and one heavier, so it leads.', moves: [{ id: 'font-size', d: 2 }, { id: 'font-weight', d: 1 }] },
  { name: 'Quieter', why: 'One step down and muted, so it reads as secondary.', moves: [{ id: 'font-size', d: -1 }, { id: 'color', pick: 'Muted' }] },
  { name: 'Brand', why: 'The brand colour and one step heavier, to mark it.', moves: [{ id: 'color', pick: 'Brand' }, { id: 'font-weight', d: 1 }] },
];
const ICON: Direction[] = [
  { name: 'Larger', why: 'One step up the icon scale, to pair with larger text.', moves: [{ id: 'icon-size', d: 1 }] },
  { name: 'Brand', why: 'The brand colour, so the icon carries the accent.', moves: [{ id: 'icon-color', pick: 'Brand' }] },
  { name: 'Quieter', why: 'One step smaller and muted, so the label leads.', moves: [{ id: 'icon-size', d: -1 }, { id: 'icon-color', pick: 'Muted' }] },
];
const BOX: Direction[] = [
  { name: 'Roomier', why: 'Padding and gap up two steps and corners one softer: more air.', moves: [{ id: 'padding', d: 2 }, { id: 'gap', d: 2 }, { id: 'radius', d: 1 }] },
  { name: 'Compact', why: 'Padding and gap down two steps and corners one tighter: denser.', moves: [{ id: 'padding', d: -2 }, { id: 'gap', d: -2 }, { id: 'radius', d: -1 }] },
  { name: 'Quieter', why: 'No border, no shadow, sunk into the page: less chrome.', moves: [{ id: 'border-width', pick: 'None' }, { id: 'shadow', d: -9 }, { id: 'fill', pick: 'Sunken' }] },
  { name: 'Tinted', why: 'A brand-muted fill with a brand edge, to set it apart.', moves: [{ id: 'fill', pick: 'Brand Muted' }, { id: 'border-color', pick: 'Brand' }] },
];
const PAGE: Direction[] = [
  { name: 'Dense', why: 'Compact spacing, smaller type and square corners: built for data.', moves: [{ id: 'density', pick: 'Compact' }, { id: 'type-scale', pick: 'Smaller' }, { id: 'corners', pick: 'Flat' }] },
  { name: 'Calm', why: 'Comfortable spacing and soft corners: the page breathes.', moves: [{ id: 'density', pick: 'Comfortable' }, { id: 'corners', pick: 'Soft' }] },
  { name: 'Bold', why: 'Larger type, round corners and heavier borders: louder and friendlier.', moves: [{ id: 'type-scale', pick: 'Larger' }, { id: 'corners', pick: 'Round' }, { id: 'borders', d: 1 }] },
];

/** Every direction a set of levers could take, in the order offered: text first, then icon, then box. */
export function directionsFor(rows: Steerable[], page: boolean): Direction[] {
  const ids = new Set(rows.map((r) => r.id));
  const applies = (d: Direction) => d.moves.some((m) => ids.has(m.id));
  const pool = page ? PAGE : ids.has('font-size') || ids.has('color') ? [...TEXT, ...BOX] : ids.has('icon-size') || ids.has('icon-color') ? [...ICON, ...BOX] : [...BOX, ...TEXT];
  const out: Direction[] = [];
  for (const d of pool) if (applies(d) && !out.some((o) => o.name === d.name)) out.push(d);
  return out;
}

/**
 * The three to show: the directions that changed the most, measured by
 * trying each. A direction that moved one lever loses to one that moved
 * three; a tie keeps the offered order, so the same selection always gets
 * the same three.
 */
export function bestThree(dirs: Direction[], moved: number[]): number[] {
  return dirs.map((_, i) => i).filter((i) => moved[i] > 0).sort((a, b) => moved[b] - moved[a] || a - b).slice(0, 3).sort((a, b) => a - b);
}

/** Makes a direction's moves through the levers; how many actually moved. */
export function applyDirection(d: Direction, rows: Steerable[]) {
  let moved = 0;
  for (const m of d.moves) {
    const r = rows.find((x) => x.id === m.id);
    if (!r) continue;
    if (m.pick !== undefined ? r.pick?.(m.pick) : m.d !== undefined && r.move?.(m.d)) moved++;
  }
  return moved;
}
