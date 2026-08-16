import Badge from '@esa/ecology/esa-badge.astro';

/**
 * esa-badge — the golden presentational pattern (.astro).
 *
 * The component is imported and passed as `component`; the framework renders it
 * through Astro's Container API server-side and injects the HTML. Args map to
 * Astro.props. Remember: args changes need the dev server — they are inert in a
 * static build.
 */
export default {
  title: 'Display/esa-badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    dot: { control: 'boolean' },
  },
  args: {
    value: 'New',
    variant: 'primary',
    size: 'md',
    dot: false,
  },
};

export const Default = {};

export const Secondary = { args: { value: 'Draft', variant: 'secondary' } };

export const Success = { args: { value: 'Approved', variant: 'success' } };

export const Danger = { args: { value: 'Overdue', variant: 'danger' } };

/** Dot mode collapses to an 8px circle — pair it with adjacent visible text. */
export const Dot = { args: { dot: true, variant: 'success' } };

export const Count = { args: { value: 42, size: 'sm' } };

export const Large = { args: { value: 'Priority', size: 'lg', variant: 'warning' } };
