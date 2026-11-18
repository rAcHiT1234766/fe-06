import type { Meta } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import * as states from './widget-story';

/**
 * Average life expectancy per year since 2000. A line chart only filters the other widgets when
 * its config sets `crossFilter.emit`; then a click on a point selects that year.
 */
const meta = {
  title: 'Widgets/Line chart',
  tags: ['autodocs'],
  args: { widgetId: 'life-expectancy-trend', onFilterChange: fn() },
  argTypes: states.widgetArgTypes,
  render: states.renderWidget,
} satisfies Meta<states.WidgetStoryArgs>;

export default meta;

export const Default: states.WidgetStory = {};
export const Loading = states.loading;
export const Empty = states.empty;
export const Failed: states.WidgetStory = { ...states.failed, name: 'Error' };
const selected2020 = states.selected(
  'life-expectancy-trend',
  'year',
  [2020],
  'With `crossFilter.emit` set, 2020 is selected, as after a click on its point.',
);
export const Selected: states.WidgetStory = {
  ...selected2020,
  args: { ...selected2020.args, emit: true },
};
export const Dark = states.dark;
