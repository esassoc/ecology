import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '@esa/ecology/esa-text-field';

const meta: Meta = {
  title: 'Forms/esa-text-field',
  component: 'esa-text-field',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    placeholder: { control: 'text' },
    helpText: { name: 'help-text', control: 'text' },
    errorText: { name: 'error-text', control: 'text' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    value: { control: 'text' },
  },
  args: {
    label: 'Project name',
    size: 'md',
    type: 'text',
    placeholder: 'e.g. Delta Smelt Survey',
    helpText: '',
    errorText: '',
    prefix: '',
    suffix: '',
    required: false,
    disabled: false,
    value: '',
  },
  render: (args) => html`
    <esa-text-field
      style="max-width: 22rem"
      label=${args.label}
      size=${args.size}
      type=${args.type}
      placeholder=${args.placeholder}
      help-text=${args.helpText}
      error-text=${args.errorText}
      prefix=${args.prefix}
      suffix=${args.suffix}
      ?required=${args.required}
      ?disabled=${args.disabled}
      .value=${args.value}
    ></esa-text-field>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithHelpText: Story = {
  args: { helpText: 'Shown in the project switcher and on exports.' },
};

export const WithError: Story = {
  args: { errorText: 'A project with this name already exists.', value: 'Delta Smelt Survey' },
};

export const Required: Story = {
  args: { required: true },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Locked value' },
};

/**
 * Affixes render as a segmented addon INSIDE the field box — the chrome (border,
 * height, focus ring) lives on the wrapper so the addon sits flush inside one border.
 */
export const Affixes: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 22rem;">
      <esa-text-field label="Budget" prefix="$" type="number" placeholder="0.00"></esa-text-field>
      <esa-text-field label="Completion" suffix="%" type="number" placeholder="0"></esa-text-field>
      <esa-text-field label="Site" prefix="https://" suffix=".gov" placeholder="esa"></esa-text-field>
    </div>
  `,
};

/**
 * The size ramp offset is real: size="sm" takes the `-xs` type rung, because the
 * control ramp walks 050·100·200·300 while the type families walk 050·100·150·200·300.
 */
export const Sizes: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 22rem;">
      ${(['xs', 'sm', 'md', 'lg'] as const).map(
        (size) =>
          html`<esa-text-field label=${`Size ${size}`} size=${size} placeholder="Type here"></esa-text-field>`,
      )}
    </div>
  `,
};
