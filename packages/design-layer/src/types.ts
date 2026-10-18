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
  /** Renamed variables in old tweaks files: old → the variables it now sets. */
  legacy?: Record<string, string[]>;
  /** Where Save to Source writes, from the spoke root. Every key is found on its own when absent. */
  sourceFiles?: SourceFiles;
}

/** Save to Source's files in a spoke. */
export interface SourceFiles {
  /** The folder searched for theme files. Default "src/styles". */
  dir?: string;
  /** The theme's slug, as in [data-theme="x"]. Default: the recipe's, else the commonest in the theme files. */
  theme?: string;
  /** The make-theme recipe. Default: the theme-*.json in `dir` with seeds. */
  recipe?: string;
  /** Hand-authored theme files whose declarations are edited in place. Default: every css in `dir` naming the theme, less generated ones. */
  themeFiles?: string[];
  /** Where new rules go (component scope, and values declared nowhere). Default: theme-app.css, else theme-<slug>.css. */
  components?: string;
}

export interface ResolvedConfig {
  dataDir: string;
  roles: Record<Role, string[]>;
  colors: ColorControl[];
  inks: string[];
  fonts: FontControl[];
  sizes: SizeControl[];
  lengths: LengthControl[];
  legacy: Record<string, string[]>;
  sourceFiles?: SourceFiles;
}

export interface Tweaks {
  light: VarMap;
  dark: VarMap;
  /** Type, fonts and lengths, the same in both modes. */
  shared: VarMap;
  /** The palette picked per mode and its surfaces' ramp as tweaked. */
  palette?: Partial<Record<Mode, PaletteChoice>>;
  /** Overrides scoped to one component (every instance) or one element on one page. */
  overrides?: ScopedOverride[];
  /** Variants tried side by side in isolation: their own overrides, never in tweaks.css. */
  variants?: Variant[];
  /** Named snapshots of everything above, applied whole. */
  states?: PageState[];
  /** What a variable pick meant, per edit: the concept, not just the token it resolved to. */
  intents?: Intent[];
  /** One per lever moved, keyed by where and what: the review's rows and changes.md's lines. */
  notes?: Record<string, ChangeNote>;
}

/**
 * A lever move as the review and Send to Claude describe it: "Stat Card ·
 * Padding 16 px → 24 px", where it landed, what it wrote, and the check it
 * fails (if any). Page levers carry the recipe seed that would make it real.
 */
export interface ChangeNote {
  /** What it was done to: the component, the element, or "Page". */
  who: string;
  where: { kind: 'root' | 'component' | 'instance'; selector: string; page?: string };
  field: string;
  what: string;
  from: string;
  to: string;
  fromToken: string | null;
  toToken: string | null;
  /** The variables or properties it wrote, and in which maps. */
  writes: { name: string; modes: ('shared' | 'light' | 'dark')[] }[];
  /** The failed check, as the lever worded it. */
  check?: string;
  /** How many elements an "All" move reached. */
  count?: number;
  file?: string | null;
  /** A page lever: the recipe seed and value that make it permanent, or why there is none yet. */
  seed?: { name: string; value: string; exists: boolean };
  /** Roles the spoke's own CSS re-declares over the ramp, so the seed alone will not reach them; the preview wrote them directly. */
  overridden?: string[];
  at: string;
}

/**
 * A pick from the variable picker, stored as intent. The picker lists concepts
 * (Body, Label Strong, Background Brand), each collapsing its size variants;
 * `chosen` is the variant it resolved to in this context and `candidates`
 * every token the concept could mean here. One candidate: Save to Source writes
 * it. More: the edit is listed under Needs a Coding Pass.
 */
export interface Intent {
  /** The edit it explains, as scope|selector|mode|var (the promote key). */
  key: string;
  /** The concept's name as the picker shows it: "Typography / Label Strong · font-size". */
  concept: string;
  /** The token the value is bound to. */
  chosen: string;
  /** What it resolved to when picked. */
  value: string;
  candidates: string[];
  context: { mode: Mode | 'shared'; size: string | null; scope: EditScope | 'variant'; selection: string | null };
}

/** Where an edit lands: every instance of a component, one element on one
    page, or (token scope) the token itself at the root, which is Tweaks' own maps. */
export type EditScope = 'component' | 'token' | 'instance';

/** Token values re-declared under one selector, so they hold only inside it. */
export interface ScopedOverride extends ScopeMaps {
  scope: 'component' | 'instance';
  /** `.esa-card`, `esa-select`, or (instance) a selector unique on its page. */
  selector: string;
  /** What the panel calls it: the component's name, or the element's. */
  name: string;
  /** Instance scope: the page's path; the rule holds only there. */
  page?: string;
}

/** Maps of token values, the shape every scope stores. */
export interface ScopeMaps { light: VarMap; dark: VarMap; shared: VarMap }

/** A copy of a component tried in isolation, with overrides of its own. */
export interface Variant extends ScopeMaps {
  id: string;
  name: string;
  /** What it is a variant of: the component's (or the element's) selector. */
  of: string;
}

/** A named page state: the tweaks at the moment it was saved, and the mode. */
export interface PageState {
  name: string;
  savedAt: string;
  mode: Mode;
  tweaks: Omit<Tweaks, 'states' | 'departures' | 'variants'>;
}


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

/** One value Save to Source would write: a component- or token-scope edit, or
    (expanded) a root value re-declared so the edit reaches it inside the component. */
export interface PromoteEntry {
  scope: 'component' | 'token';
  /** Component scope: the component's selector. */
  selector?: string;
  name: string;
  mode: 'light' | 'dark' | 'shared';
  cssVar: string;
  value: string;
  /** The value declared at the root now, for the preview. */
  base?: string | null;
  /** A light edit: the value declared for dark now, kept when the light value lands where both schemes read it. */
  darkBase?: string | null;
  /** Re-declared through the lineage, not edited by hand. */
  expanded?: boolean;
  /** The picked concept maps to more than one token here: listed and written as a todo, never as a guessed token. */
  todo?: { concept: string; chosen: string; candidates: string[] };
}

/** One "needs a coding pass" item: what the designer meant, and the tokens it could be. */
export interface PromoteTodo { name: string; cssVar: string; mode: PromoteEntry['mode']; concept: string; chosen: string; candidates: string[]; file: string | null }

export interface PromoteChange { name: string; cssVar: string; mode: PromoteEntry['mode']; from: string | null; to: string; note?: string }
export interface PromoteFile { path: string; label: string; changes: PromoteChange[] }

/** What Save to Source will write (or wrote), file by file. */
export interface PromotePlan {
  context: 'hub' | 'spoke';
  files: PromoteFile[];
  skipped: { name: string; cssVar: string; mode: PromoteEntry['mode']; reason: string }[];
  /** Picks whose concept is ambiguous here; written as design-layer:todo lines in the block. */
  todo: PromoteTodo[];
  instances: number;
  /** What runs after the write. */
  regenerate: string[];
  /** The entries this plan writes, as scope|selector|mode|var, removed from the tweaks once written. */
  keys: string[];
  written?: boolean;
  error?: string;
}

export interface ServerState { tweaks: Partial<Tweaks>; feedback: FeedbackRecord[]; promote?: PromotePlan }

/** The messages a panel sends, and the one it receives. */
export interface PanelMessages {
  load: Record<string, never>;
  'save-tweaks': { json: Tweaks; css: string };
  'add-comment': FeedbackRecord;
  'set-status': { id: string; status: FeedbackRecord['status'] };
  /** Plan Save to Source, or (write) apply it; the plan comes back on the state. */
  promote: { entries: PromoteEntry[]; instances: number; write: boolean };
  /** Send to Claude: written to <dataDir>/changes.md and changes.json. */
  'send-to-claude': { md: string; json: unknown };
}

/** What a dev adapter gives the panel: a channel to its dev server and the open/closed state. */
export interface PanelHost {
  send<K extends keyof PanelMessages>(type: K, data: PanelMessages[K]): void;
  onState(cb: (s: ServerState) => void): void;
  setOpen(state: boolean): void;
  onToggled(cb: (state: boolean) => void): void;
  /** The URL the saved tweaks.css is served from, re-fetched after a save. */
  cssRoute: string;
  /** Where the panel's face (assets/inter-variable.woff2) is served (the Astro adapter serves it itself); without it the panel falls back to system-ui. */
  fontUrl?: string;
}
