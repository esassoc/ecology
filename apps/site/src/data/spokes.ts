// The live spoke directory rendered on /guide. Small and hand-maintained —
// add a row when a spoke ships (everything else on the guide pages is
// build-time generated; this is the one deliberate manual list).
export interface Spoke {
  name: string;
  slug: string;
  purpose: string;
  repo: string;
  site: string;
}

export const spokes: Spoke[] = [
  {
    name: 'Beacon',
    slug: 'beacon',
    purpose: 'Environmental-compliance platform — prototypes mirroring the production app.',
    repo: 'https://github.com/esassoc/beacon-design',
    site: 'https://esassoc.github.io/beacon-design/',
  },
  {
    name: 'CB Fish',
    slug: 'cb-fish',
    purpose: 'Columbia Basin Fish & Wildlife Program — client-alignment prototypes.',
    repo: 'https://github.com/esassoc/cb-fish-design',
    site: 'https://esassoc.github.io/cb-fish-design/',
  },
  {
    name: 'Biochar Atlas',
    slug: 'biochar',
    purpose: 'ABI Biochar Suitability Tool — business-development demo.',
    repo: 'https://github.com/esassoc/biochar-design',
    site: 'https://esassoc.github.io/biochar-design/',
  },
  {
    name: 'Noria',
    slug: 'noria',
    purpose: 'Design system and prototypes for Noria — the Deschutes basin water-banking platform',
    repo: 'https://github.com/esassoc/noria-design',
    site: 'https://esassoc.github.io/noria-design/',
  },
  {
    name: 'SMAQMD',
    slug: 'smaqmd',
    purpose: 'Design system and prototypes for SMAQMD',
    repo: 'https://github.com/esassoc/air-exchange-tool',
    site: 'https://esassoc.github.io/air-exchange-tool/',
  },
];
