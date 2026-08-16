import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '@esa/ecology/esa-switch-toggle';

/**
 * esa-switch-toggle — the golden interactive pattern. Importing the module is enough
 * to register the element; every Lit component here ends in a self-register guard.
 */
const meta: Meta = {
  title: 'Forms/esa-switch-toggle',
  component: 'esa-switch-toggle',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    labelPosition: {
      name: 'label-position',
      control: 'inline-radio',
      options: ['before', 'after'],
    },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    name: { control: 'text' },
  },
  args: {
    label: 'Enable notifications',
    size: 'md',
    labelPosition: 'after',
    checked: false,
    disabled: false,
  },
  render: (args) => html`
    <esa-switch-toggle
      label=${args.label}
      size=${args.size}
      label-position=${args.labelPosition}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      name=${args.name ?? ''}
    ></esa-switch-toggle>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true, checked: true },
};

export const LabelBefore: Story = {
  args: { labelPosition: 'before', label: 'Notifications' },
};

/** The shared size ramp: xs · sm · md · lg, aligned to Beacon's UiSize. */
export const Sizes: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; justify-items: start;">
      ${(['xs', 'sm', 'md', 'lg'] as const).map(
        (size) => html`<esa-switch-toggle label=${size} size=${size} checked></esa-switch-toggle>`,
      )}
    </div>
  `,
};

/**
 * Form participation — the element is form-associated (static formAssociated +
 * attachInternals + setFormValue), so it submits under `name` like a native input.
 * Toggle it and submit to see the FormData value.
 */
export const InAForm: Story = {
  render: () => html`
    <form
      style="display: grid; gap: 1rem; justify-items: start;"
      @submit=${(e: SubmitEvent) => {
        e.preventDefault();
        const data = new FormData(e.target as HTMLFormElement);
        const out = (e.target as HTMLFormElement).querySelector('output');
        if (out) out.textContent = JSON.stringify(Object.fromEntries(data)) || '{}';
      }}
    >
      <esa-switch-toggle name="notify" label="Email me" checked></esa-switch-toggle>
      <button type="submit">Submit</button>
      <output style="font-family: var(--typography-font-family-mono, monospace)"></output>
    </form>
  `,
};
