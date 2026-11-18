import type { Meta } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import * as states from './widget-story';

/** Total population in the latest year, as one number. A KPI is filtered but never filters. */
const meta = {
  title: 'Widgets/KPI',
  tags: ['autodocs'],
  args: { widgetId: 'total-population', onFilterChange: fn() },
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
  'A KPI has nothing to click, so it cannot hold a selection. This is the KPI while South Asia is selected in "Population by region": it shows the population of South Asia alone.',
);
export const Dark = states.dark;
