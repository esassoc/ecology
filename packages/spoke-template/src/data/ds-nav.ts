// Single source of truth for the design-system sidebar + breadcrumbs.
// Types come from @esa/docs so this data is structurally compatible with DocsShell.
//
// The `foundations` group below is GENERIC — every spoke documents the same five
// token-driven foundation pages, so keep it as-is. `componentGroups` is the
// per-spoke catalog: /spoke-init populates it by mirroring the source app's
// catalog (e.g. an Angular ui-catalog) or by curating the esa-* components this
// spoke actually uses. The single scaffold entry below shows the shape.
import type { NavItem, NavGroup } from '@esa/docs/nav';
export type { NavItem, NavGroup };

export const foundations: NavGroup = {
  label: 'Foundations',
  items: [
    { label: 'Color', href: '/design-system/foundations/color' },
    { label: 'Typography', href: '/design-system/foundations/typography' },
    { label: 'Spacing', href: '/design-system/foundations/spacing' },
    { label: 'Radius', href: '/design-system/foundations/radius' },
    { label: 'Iconography', href: '/design-system/foundations/iconography' },
  ],
};

const c = (label: string, name: string): NavItem => ({
  label,
  href: `/design-system/components/${name}`,
});

// SCAFFOLD — one example group with the one example component page that ships
// with the template (esa-button). /spoke-init replaces this whole array with the
// spoke's real catalog: one NavGroup per section, each item mapping a display
// label to an @esa/ecology esa-* slug. Add a matching page under
// src/pages/design-system/components/<slug>.astro for every item.
export const componentGroups: NavGroup[] = [
  {
    label: 'Actions',
    items: [
      c('Button', 'esa-button'),
    ],
  },
];

export const allGroups: NavGroup[] = [foundations, ...componentGroups];
