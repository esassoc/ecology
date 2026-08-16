import type { Preview } from '@storybook/web-components-vite';

// Same three files apps/site/src/layouts/BaseLayout.astro loads, in the same order:
// primitives + default semantics, then the tier-3 component surface, then the
// per-theme semantic overrides. Load order matters — themes.css reassigns semantic
// tokens under [data-theme] and must come last.
import '@esa/tokens/tokens.css';
import '@esa/tokens/component-tokens.css';
import '../../site/src/styles/themes.css';

// Base body/font styles the site gets from BaseLayout.astro; the bare canvas iframe
// inherits none of them. Without this everything renders in default serif.
import './canvas.css';

const THEMES = ['default', 'beacon', 'qanat'] as const;

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Spoke theme — reassigns the semantic layer under [data-theme]',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: THEMES.map((t) => ({ value: t, title: t })),
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: 'default',
  },

  decorators: [
    (story, context) => {
      // Themes are scoped to [data-theme] on a root, and tokens inherit through
      // shadow DOM, so setting it on <html> reaches inside every custom element.
      document.documentElement.setAttribute('data-theme', context.globals.theme);
      return story();
    },
  ],

  parameters: {
    controls: { expanded: true },
    a11y: { test: 'todo' },
  },
};

export default preview;
