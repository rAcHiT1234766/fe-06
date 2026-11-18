import type { Meta } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import * as states from './widget-story';

/**
 * GDP by World Bank income level. A click on a slice filters the other widgets to that income
 * level; the pie keeps every slice, dims the others and outlines the selection.
 */
const meta = {
  title: 'Widgets/Pie chart',
  tags: ['autodocs'],
  args: { widgetId: 'gdp-by-income', onFilterChange: fn() },
  argTypes: states.widgetArgTypes,
  render: states.renderWidget,
} satisfies Meta<states.WidgetStoryArgs>;

export default meta;

export const Default: states.WidgetStory = {};
export const Loading = states.loading;
export const Empty = states.empty;
export const Failed: states.WidgetStory = { ...states.failed, name: 'Error' };
export const Selected = states.selected(
  'gdp-by-income',
  'incomeLevel',
  ['High income'],
  'High income is selected, as after a click on its slice.',
);
export const Dark = states.dark;
