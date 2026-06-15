// Single source of truth for the docs sidebar + breadcrumbs.
// The component groups are DERIVED from the build-time catalog (catalog.ts),
// which reads the package source directly — so the sidebar can never again drop
// a component the package actually ships (it previously omitted 6).

import { catalog } from './catalog';

export interface NavItem {
  label: string;
  href: string;
  status?: 'stable' | 'reference';
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const guide: NavGroup = {
  label: 'Guide',
  items: [
    { label: 'How it works', href: '/guide' },
    { label: 'Setup', href: '/guide/setup' },
    { label: 'Claude toolkit', href: '/guide/toolkit' },
  ],
};

export const patterns: NavGroup = {
  label: 'Patterns',
  items: [
    { label: 'Overview', href: '/patterns' },
    { label: 'App shell', href: '/patterns/app-shell' },
    { label: 'List + filters', href: '/patterns/list-filters' },
    { label: 'Record detail', href: '/patterns/record-detail' },
    { label: 'Form section', href: '/patterns/form-section' },
  ],
};

export const foundations: NavGroup = {
  label: 'Foundations',
  items: [
    { label: 'Color', href: '/foundations/color' },
    { label: 'Typography', href: '/foundations/typography' },
    { label: 'Spacing', href: '/foundations/spacing' },
    { label: 'Radius', href: '/foundations/radius' },
    { label: 'Elevation', href: '/foundations/elevation' },
    { label: 'Motion', href: '/foundations/motion' },
  ],
};

// Component groups are derived from the catalog — never hand-listed here. A
// doc-less component links to its anchor on the catalog index, so the sidebar
// lists every component the package ships with a valid destination.
export const componentGroups: NavGroup[] = catalog.map((group) => ({
  label: group.label,
  items: group.entries.map((e) => ({
    label: e.name,
    href: e.href,
    status: e.status === 'reference' ? 'reference' : undefined,
  })),
}));

export const components: NavGroup = {
  label: 'Components',
  items: [{ label: 'Catalog', href: '/components' }],
};

export const allGroups: NavGroup[] = [guide, patterns, foundations, components, ...componentGroups];
