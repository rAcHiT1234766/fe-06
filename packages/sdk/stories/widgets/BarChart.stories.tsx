import type { Meta } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import * as states from './widget-story';

/**
 * Population per region, as horizontal bars. A click on a bar filters the other widgets to that
 * region; the bar chart itself keeps every bar, dims the others and outlines the selection.
 */
const meta = {
  title: 'Widgets/Bar chart',
  tags: ['autodocs'],
  args: { widgetId: 'population-by-region', onFilterChange: fn() },
  argTypes: states.widgetArgTypes,
  render: states.renderWidget,
} satisfies Meta<states.WidgetStoryArgs>;

export default meta;

export const Default: states.WidgetStory = {};
export const Loading = states.loading;
export const Empty = states.empty;
export const Failed: states.WidgetStory = { ...states.failed, name: 'Error' };
export const Selected = states.selected(
  'population-by-region',
  'region',
  ['South Asia'],
  'South Asia is selected, as after a click on its bar.',
);
export const Dark = states.dark;
