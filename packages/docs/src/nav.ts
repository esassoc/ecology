// Shared sidebar/nav shape. The TYPES live here so every consumer's nav data
// (hub nav.ts, spoke ds-nav.ts) is structurally compatible with DocsShell; the
// DATA stays per-consumer (each documents only what it ships).

export interface NavItem {
  label: string;
  href: string; // root-relative, base-less — DocsShell wraps it with withBase()
  status?: 'stable' | 'reference';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
