// Same three stylesheets, same order, as apps/site/src/layouts/BaseLayout.astro
// and apps/storybook/.storybook/preview.ts. themes.css must come last — it
// reassigns semantic tokens under [data-theme].
import '@esa/tokens/tokens.css';
import '@esa/tokens/component-tokens.css';
import '../../site/src/styles/themes.css';

// Base body/font styles the site gets from BaseLayout.astro; the bare canvas iframe
// inherits none of them. Without this everything renders in default serif.
import '../../storybook/.storybook/canvas.css';

const THEMES = ['default', 'beacon', 'qanat'] as const;

const preview = {
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
    (story: any, context: any) => {
      // MUST be guarded. Astro stories are rendered through the Container API,
      // which runs in Node during `storybook build` — there is no `document` there.
      // Without this guard every story is DROPPED from the static build and the
      // build still exits 0, reporting success. Check the log for
      // "Dropped story … (document is not defined)" if previews go missing.
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', context.globals.theme);
      }
      return story();
    },
  ],

  parameters: {
    controls: { expanded: true },
    a11y: { test: 'todo' },
  },
};

export default preview;
