import type { Meta } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import * as states from './widget-story';

/**
 * Countries with their GDP per capita, life expectancy and internet use. A table only filters the
 * other widgets when its config sets `crossFilter.emit`; then each value of its first column is a
 * button that selects that country.
 */
const meta = {
  title: 'Widgets/Table',
  tags: ['autodocs'],
  args: { widgetId: 'countries', onFilterChange: fn() },
  argTypes: {
    ...states.widgetArgTypes,
    pageSize: {
      description: "Sets the table's `options.pageSize`: how many rows it shows at a time.",
      control: { type: 'number', min: 1, max: 1000 },
    },
  },
  render: states.renderWidget,
} satisfies Meta<states.WidgetStoryArgs>;

export default meta;

export const Default: states.WidgetStory = {};
export const Loading = states.loading;
export const Empty = states.empty;
export const Failed: states.WidgetStory = { ...states.failed, name: 'Error' };
const selectedIndia = states.selected(
  'countries',
  'country',
  ['Luxembourg'],
  'With `crossFilter.emit` set, Luxembourg is selected, as after a click on its name.',
);
export const Selected: states.WidgetStory = {
  ...selectedIndia,
  args: { ...selectedIndia.args, emit: true },
};
export const Dark = states.dark;

/**
 * With `options.pageSize` set to 8, the table shows eight countries at a time, with Previous and
 * Next buttons and the rows shown between them. A filter takes it back to the first page.
 */
export const Paged: states.WidgetStory = { args: { pageSize: 8 } };
