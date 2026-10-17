// The design layer's shapes: the spoke config, the saved tweaks, and the
// host a panel talks to. No DOM and no framework, so an adapter other than
// Astro's dev toolbar can implement PanelHost.
import type { Mode } from './surfaces';
import type { PaletteChoice, Role } from './palettes';

export type { Mode, Role };

/** Overrides only: a property absent here reads the theme's own value. */
export type VarMap = Record<string, string>;

export interface ColorControl { id: string; label: string; cssVar: string }
export interface FontControl { id: string; label: string; cssVar: string }

/** One type role: its size and paired weight, set together on one row. */
export interface SizeControl {
  id: string;
  label: string;
  cssVar: string;
  weightVar: string;
  min: number;
  max: number;
  /** Which font control's face the row is set in, so its weight slider spans that face's axis. */
  font: string;
}

/** A length row: one value, in px. Shows under Components unless `group: 'sizes'`. */
export interface LengthControl {
  id: string;
  label: string;
  cssVar: string;
  min: number;
  max: number;
  step: number;
  group?: 'sizes';
}

/** A reference spoke's values, by control id: a size row takes { size, weight }, a length a number. */
export type ReferenceValues = Record<string, number | { size: number; weight: number }>;

export interface Reference { name: string; values: ReferenceValues }

/** What a spoke's design-layer.config.mjs exports. Every key is optional. */
export interface DesignLayerConfig {
  /** Where tweaks.json, tweaks.css and feedback.jsonl land, from the spoke root. Default "design". */
  dataDir?: string;
  /** Palette role → custom properties, merged per role over the hub's. */
  roles?: Partial<Record<Role, string[]>>;
  colors?: ColorControl[];
  /** The colour ids graded for contrast against each surface. */
  inks?: string[];
  fonts?: FontControl[];
  sizes?: SizeControl[];
  lengths?: LengthControl[];
  /** The reference shown as ticks and applied by its preset button. null: none.
      Values merge over Beacon's unless `replace` is set. */
  reference?: (Partial<Reference> & { replace?: boolean }) | null;
  /** Renamed variables in old tweaks files: old → the variables it now sets. */
  legacy?: Record<string, string[]>;
}

export interface ResolvedConfig {
  dataDir: string;
  roles: Record<Role, string[]>;
  colors: ColorControl[];
  inks: string[];
  fonts: FontControl[];
  sizes: SizeControl[];
  lengths: LengthControl[];
  reference: Reference | null;
  legacy: Record<string, string[]>;
}

export interface Tweaks {
  light: VarMap;
  dark: VarMap;
  /** Type, fonts and lengths, the same in both modes. */
  shared: VarMap;
  /** The palette picked per mode and its surfaces' ramp as tweaked. */
  palette?: Partial<Record<Mode, PaletteChoice>>;
  /** Written on Save, never read back: every value that differs from the reference's. */
  departures?: Departure[];
}

export interface Departure { id: string; label: string; cssVar: string; value: number; reference: number }

/** A face's weights as loaded: a variable axis (any whole number in range) or a static face's weights. */
export type WeightAxis = { min: number; max: number; stops: number[] | null };

export interface FontOption {
  id: string;
  label: string;
  css: string;
  /** Google Fonts css2 family spec, e.g. "Inter:wght@100..900". Absent: a local face. */
  google?: string;
  weights: number[];
}

/** One line of feedback.jsonl. */
export interface FeedbackRecord {
  id: string;
  url: string;
  selector: string;
  text: string;
  sourceFile: string | null;
  sourceLine: number | null;
  computed: { color: string; background: string; fontFamily: string; fontSize: string };
  comment: string;
  timestamp: string;
  status: 'open' | 'resolved';
}

export interface ServerState { tweaks: Partial<Tweaks>; feedback: FeedbackRecord[] }

/** The messages a panel sends, and the one it receives. */
export interface PanelMessages {
  load: Record<string, never>;
  'save-tweaks': { json: Tweaks; css: string };
  'add-comment': FeedbackRecord;
  'set-status': { id: string; status: FeedbackRecord['status'] };
}

/** What a dev adapter gives the panel: a channel to its dev server and the open/closed state. */
export interface PanelHost {
  send<K extends keyof PanelMessages>(type: K, data: PanelMessages[K]): void;
  onState(cb: (s: ServerState) => void): void;
  setOpen(state: boolean): void;
  onToggled(cb: (state: boolean) => void): void;
  /** The URL the saved tweaks.css is served from, re-fetched after a save. */
  cssRoute: string;
}
