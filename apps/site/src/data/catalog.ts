// Build-time catalog of the @esa/ecology component library. Reads the component
// sources (packages/ecology/src/components/esa-*.{astro,ts}) directly at BUILD
// time, so the catalog — and the site nav derived from it (see nav.ts) — can
// never drift from what the package actually ships. The component LIST, each
// one-line summary, and (.astro) prop tables come from source; only the
// editorial layer (which group a component belongs to, its display name, and the
// reference entries that have no source file) is curated below.
//
// Drift guard: every esa-* source file MUST be placed in CATEGORIES. Any that is
// not is surfaced LOUDLY — collected into an "Uncategorized" group AND a
// build-time console.warn — so a newly-added component can never silently fall
// out of the sidebar (which is exactly how 6 components went missing before).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // apps/site/src/data
const ROOT = path.resolve(HERE, '..', '..', '..', '..');   // repo root
const COMPONENTS = path.join(ROOT, 'packages', 'ecology', 'src', 'components');
const DOC_PAGES = path.join(ROOT, 'apps', 'site', 'src', 'pages', 'components');

export type CatalogKind = '.astro' | 'wc' | 'reference';

export interface CatalogProp {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}
export interface CatalogEntry {
  slug: string; // esa-button
  name: string; // Button (display)
  kind: CatalogKind; // .astro | wc (Lit) | reference (wraps an external lib, no source)
  status: 'stable' | 'reference';
  summary: string; // one-liner, from the source header (or the doc page for reference)
  props: CatalogProp[]; // .astro only — Lit props live in `static properties`, not an interface
  hasDocPage: boolean; // a deep-dive page exists at /components/<slug>
  wraps?: string; // reference only, e.g. "AG Grid"
  /** Where the nav/catalog should link: the doc page if one exists, else the catalog anchor. */
  href: string;
}
export interface CatalogGroup {
  label: string;
  entries: CatalogEntry[];
}

const read = (p: string) => readFileSync(p, 'utf8');

// ── Curated editorial layer ────────────────────────────────────────────────
// Grouping + display-name overrides. The component LIST is validated against the
// filesystem (drift guard) — this is presentation order + human-readable names.
interface CategorySpec {
  label: string;
  items: Array<[slug: string, name: string]>;
}
const CATEGORIES: CategorySpec[] = [
  { label: 'Core', items: [
    ['esa-button', 'Button'], ['esa-button-group', 'Button Group'], ['esa-button-toggle', 'Button Toggle'],
    ['esa-icon', 'Icon'], ['esa-icon-link', 'Icon Link'], ['esa-icon-button', 'Icon Button'],
  ] },
  { label: 'Layout & Sections', items: [
    ['esa-app-shell', 'App Shell'], ['esa-page-header', 'Page Header'], ['esa-stat', 'Stat'],
    ['esa-container', 'Container'],
  ] },
  { label: 'Forms', items: [
    ['esa-text-field', 'Text Field'], ['esa-textarea', 'Textarea'], ['esa-select', 'Select'],
    ['esa-combobox', 'Combobox'], ['esa-input-tag', 'Input Tag'], ['esa-checkbox', 'Checkbox'], ['esa-checkbox-group', 'Checkbox Group'],
    ['esa-radio-group', 'Radio Group'], ['esa-switch-toggle', 'Switch Toggle'], ['esa-form-field', 'Form Field'], ['esa-field-error', 'Field Error'],
    ['esa-date-picker', 'Date Picker'], ['esa-color-picker', 'Color Picker'], ['esa-range-slider', 'Range Slider'],
    ['esa-file-upload', 'File Upload'], ['esa-file-list', 'File List'],
  ] },
  { label: 'Display', items: [
    ['esa-avatar', 'Avatar'], ['esa-badge', 'Badge'], ['esa-card', 'Card'], ['esa-chip-group', 'Chip Group'], ['esa-alert-box', 'Alert Box'],
    ['esa-danger-zone', 'Danger Zone'], ['esa-pill', 'Pill'], ['esa-pillbox', 'Pillbox'], ['esa-progress-bar', 'Progress Bar'],
    ['esa-loading-spinner', 'Loading Spinner'], ['esa-loading-overlay', 'Loading Overlay'],
    ['esa-empty-state', 'Empty State'], ['esa-back-to-top', 'Back To Top'],
    ['esa-collapsible', 'Collapsible'], ['esa-kbd', 'Keycap'],
  ] },
  { label: 'Overlays', items: [
    ['esa-dialog', 'Dialog'], ['esa-confirm-dialog', 'Confirm Dialog'], ['esa-side-dialog', 'Side Dialog'], ['esa-popover', 'Popover'],
    ['esa-tooltip', 'Tooltip'], ['esa-dropdown-menu', 'Dropdown Menu'], ['esa-command-palette', 'Command Palette'],
    ['esa-entity-search', 'Entity Search'], ['esa-snackbar-container', 'Snackbar'], ['esa-snackbar-item', 'Snackbar Item'], ['esa-search-panel', 'Search Panel'],
  ] },
  { label: 'Navigation', items: [
    ['esa-app-bar', 'App Bar'], ['esa-nav-dropdown', 'Nav Dropdown'], ['esa-link-column', 'Link Column'],
    ['esa-header-nav', 'Header Nav'], ['esa-sidebar-nav', 'Sidebar Nav'], ['esa-breadcrumbs', 'Breadcrumbs'],
    ['esa-pagination', 'Pagination'], ['esa-tab-layout', 'Tab Layout'],
  ] },
  { label: 'Filters', items: [
    ['esa-filter-container', 'Filter Container'], ['esa-filter-dropdown', 'Filter Dropdown'],
    ['esa-filter-pills', 'Filter Pills'], ['esa-filter-clear-button', 'Filter Clear Button'],
  ] },
  { label: 'Data & Editors', items: [
    ['esa-grid', 'Data Grid'], ['esa-map', 'Map'], ['esa-rich-text-editor', 'Rich Text Editor'],
  ] },
];

// Non-component files in the components dir, excluded from the catalog.
const EXCLUDE = new Set(['icon-registry']);

// ── Source parsing ─────────────────────────────────────────────────────────

/** Markdown-strip + clamp to the first N sentences. */
function summarize(text: string, maxSentences = 2, maxChars = 200): string {
  const plain = text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = plain.split(/(?<=[.!?])\s+/).slice(0, maxSentences).join(' ');
  return sentences.length > maxChars ? `${sentences.slice(0, maxChars - 1).trimEnd()}…` : sentences;
}

/** The leading doc-comment text of a component: `//` lines (.astro frontmatter) or the first `/** *\/` block (.ts). */
function headerText(src: string, ext: string): string {
  if (ext === '.astro') {
    const fm = src.indexOf('---');
    const lines = src.slice(fm + 3).split('\n');
    const out: string[] = [];
    for (const raw of lines) {
      const t = raw.trim();
      if (t === '') { if (out.length) break; else continue; } // blank line ends the header block
      if (t.startsWith('//')) out.push(t.replace(/^\/\/\s?/, ''));
      else break; // first non-comment line (the interface / imports)
    }
    return out.join(' ');
  }
  const block = src.match(/\/\*\*?([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*\s?/gm, '').replace(/\s+/g, ' ').trim() : '';
}

// Boilerplate type-descriptor leads to drop so the summary is the real elaboration.
const TYPE_LABEL = /\b(presentational|lit web component|web component|reference)\b/i;

/** Turn a raw header into a clean one-liner: strip the `esa-x —` prefix, the `(.scope)` marker, and a generic type-label lead. */
function cleanSummary(header: string, slug: string): string {
  let s = header
    .replace(new RegExp(`^${slug}\\s*[—-]\\s*`), '')
    .replace(/\(\.(astro|ts)\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  let parts = s.split(/(?<=[.!?])\s+/);
  if (parts.length > 1 && parts[0].length < 70 && TYPE_LABEL.test(parts[0])) parts = parts.slice(1);
  return summarize(parts.join(' '));
}

/** Parse the `interface Props { … }` block of an .astro component into typed props with per-prop JSDoc. */
function parseProps(src: string): CatalogProp[] {
  const block = src.match(/interface Props\s*\{([\s\S]*?)\n\}/);
  if (!block) return [];
  const lines = block[1].split('\n');
  const props: CatalogProp[] = [];
  let pendingDoc = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('/**') || line.startsWith('/*')) {
      const buf = [lines[i]];
      while (!lines[i].includes('*/')) { i++; buf.push(lines[i]); }
      pendingDoc = buf
        .map((l) => l.replace(/\/\*\*?/, '').replace(/\*\//, '').replace(/^\s*\*\s?/, '').trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      continue;
    }
    if (line.startsWith('//')) { pendingDoc = line.replace(/^\/\/\s?/, ''); continue; }
    const mem = line.match(/^([a-zA-Z0-9_]+)(\?)?\s*:\s*(.+?);?\s*$/);
    if (mem) {
      props.push({ name: mem[1], optional: !!mem[2], type: mem[3].trim().replace(/;$/, ''), description: pendingDoc || undefined });
    }
    pendingDoc = '';
  }
  return props;
}

/** "AG Grid" from a reference doc page's `wraps="…"`, plus its `summary="…"` first sentence. */
function referenceDoc(slug: string): { wraps?: string; summary: string } {
  const file = path.join(DOC_PAGES, `${slug}.astro`);
  if (!existsSync(file)) return { summary: '' };
  const src = read(file);
  const wraps = src.match(/wraps="([^"]+)"/)?.[1];
  const summaryRaw = src.match(/summary="([\s\S]*?)"\s*>/)?.[1] ?? '';
  const summary = summarize(summaryRaw.replace(/<[^>]+>/g, ''), 1, 200);
  return { wraps, summary };
}

// ── Build the catalog ──────────────────────────────────────────────────────

// Every esa-* source file on disk (the authoritative list for the drift guard).
const sourceSlugs = new Map<string, string>(); // slug → ext (.astro | .ts)
for (const file of readdirSync(COMPONENTS)) {
  const m = file.match(/^(esa-[a-z0-9-]+)\.(astro|ts)$/);
  if (!m) continue;
  if (EXCLUDE.has(m[1])) continue;
  // Prefer .astro if both exist (none do today, but be deterministic).
  if (!sourceSlugs.has(m[1]) || m[2] === 'astro') sourceSlugs.set(m[1], `.${m[2]}`);
}

const placed = new Set<string>();

function buildEntry(slug: string, name: string): CatalogEntry {
  const docFile = path.join(DOC_PAGES, `${slug}.astro`);
  const hasDocPage = existsSync(docFile);
  const href = hasDocPage ? `/components/${slug}` : `/components#${slug}`;
  const ext = sourceSlugs.get(slug);

  if (!ext) {
    // No source file → a reference entry (wraps an external library).
    const { wraps, summary } = referenceDoc(slug);
    return { slug, name, kind: 'reference', status: 'reference', summary, props: [], hasDocPage, wraps, href };
  }

  placed.add(slug);
  const src = read(path.join(COMPONENTS, `${slug}${ext}`));
  const summary = cleanSummary(headerText(src, ext), slug);
  const isAstro = ext === '.astro';
  return {
    slug,
    name,
    kind: isAstro ? '.astro' : 'wc',
    status: 'stable',
    summary,
    props: isAstro ? parseProps(src) : [],
    hasDocPage,
    href,
  };
}

export const catalog: CatalogGroup[] = CATEGORIES.map((cat) => ({
  label: cat.label,
  entries: cat.items.map(([slug, name]) => buildEntry(slug, name)),
}));

// Drift guard: any source component not placed above is surfaced loudly so the
// nav and catalog can never silently lose it.
const orphans = [...sourceSlugs.keys()].filter((s) => !placed.has(s)).sort();
if (orphans.length) {
  console.warn(
    `\n⚠️  catalog.ts drift guard: ${orphans.length} esa-* component(s) are not assigned to a ` +
      `category and will appear under "Uncategorized": ${orphans.join(', ')}.\n` +
      `   Add them to CATEGORIES in apps/site/src/data/catalog.ts.\n`,
  );
  catalog.push({
    label: 'Uncategorized',
    entries: orphans.map((slug) => buildEntry(slug, slug.replace(/^esa-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))),
  });
}

/** Total component count (excludes reference entries, which have no source). */
export const componentCount: number = [...sourceSlugs.keys()].length;
/** Reference-entry count (grid/map/editor — documented wrappers, no source). */
export const referenceCount: number = catalog.reduce(
  (n, g) => n + g.entries.filter((e) => e.kind === 'reference').length,
  0,
);
