// Single source of truth for the docs sidebar + breadcrumbs.
// Components grouped by their original entry-point category.

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

const c = (label: string, name: string, status?: 'reference'): NavItem => ({
  label,
  href: `/components/${name}`,
  status,
});

export const componentGroups: NavGroup[] = [
  { label: 'Core', items: [c('Button', 'esa-button'), c('Button Group', 'esa-button-group'), c('Button Toggle', 'esa-button-toggle'), c('Icon', 'esa-icon'), c('Icon Link', 'esa-icon-link'), c('Icon Button', 'esa-icon-button')] },
  {
    label: 'Forms',
    items: [
      c('Text Field', 'esa-text-field'), c('Textarea', 'esa-textarea'), c('Select', 'esa-select'),
      c('Combobox', 'esa-combobox'), c('Input Tag', 'esa-input-tag'), c('Checkbox', 'esa-checkbox'), c('Checkbox Group', 'esa-checkbox-group'),
      c('Radio Group', 'esa-radio-group'), c('Switch Toggle', 'esa-switch-toggle'), c('Form Field', 'esa-form-field'), c('Field Error', 'esa-field-error'),
      c('Date Picker', 'esa-date-picker'), c('Color Picker', 'esa-color-picker'), c('Range Slider', 'esa-range-slider'),
      c('File Upload', 'esa-file-upload'),
    ],
  },
  {
    label: 'Display',
    items: [
      c('Avatar', 'esa-avatar'), c('Badge', 'esa-badge'), c('Card', 'esa-card'), c('Chip Group', 'esa-chip-group'), c('Alert Box', 'esa-alert-box'),
      c('Danger Zone', 'esa-danger-zone'),
      c('Pill', 'esa-pill'), c('Pillbox', 'esa-pillbox'), c('Progress Bar', 'esa-progress-bar'),
      c('Loading Spinner', 'esa-loading-spinner'), c('Loading Overlay', 'esa-loading-overlay'),
      c('Empty State', 'esa-empty-state'), c('Back To Top', 'esa-back-to-top'),
    ],
  },
  {
    label: 'Overlays',
    items: [
      c('Dialog', 'esa-dialog'), c('Confirm Dialog', 'esa-confirm-dialog'), c('Side Dialog', 'esa-side-dialog'), c('Popover', 'esa-popover'),
      c('Tooltip', 'esa-tooltip'), c('Dropdown Menu', 'esa-dropdown-menu'), c('Command Palette', 'esa-command-palette'),
      c('Entity Search', 'esa-entity-search'),
      c('Snackbar', 'esa-snackbar-container'), c('Snackbar Item', 'esa-snackbar-item'), c('Search Panel', 'esa-search-panel'),
    ],
  },
  {
    label: 'Navigation',
    items: [
      c('App Bar', 'esa-app-bar'), c('Nav Dropdown', 'esa-nav-dropdown'), c('Link Column', 'esa-link-column'),
      c('Header Nav', 'esa-header-nav'), c('Sidebar Nav', 'esa-sidebar-nav'), c('Breadcrumbs', 'esa-breadcrumbs'),
      c('Pagination', 'esa-pagination'), c('Tab Layout', 'esa-tab-layout'),
    ],
  },
  {
    label: 'Filters',
    items: [
      c('Filter Container', 'esa-filter-container'), c('Filter Dropdown', 'esa-filter-dropdown'),
      c('Filter Pills', 'esa-filter-pills'), c('Filter Clear Button', 'esa-filter-clear-button'),
    ],
  },
  {
    label: 'Data & Editors',
    items: [c('Data Grid', 'esa-grid', 'reference'), c('Map', 'esa-map', 'reference'), c('Rich Text Editor', 'esa-rich-text-editor', 'reference')],
  },
];

export const allGroups: NavGroup[] = [guide, patterns, foundations, ...componentGroups];
