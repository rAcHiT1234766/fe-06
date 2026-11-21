import type { Meta } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import world from '../../../../apps/demo/public/maps/world.json';
import { registerMap, type MapGeoJson } from '../../src/map';
import * as states from './widget-story';

// The demo's borders: Natural Earth's 1:110m countries, named as the World Bank names them.
registerMap('world', world as MapGeoJson);

/**
 * Population by country in the latest year, from the "Population explorer" dashboard. Five classes
 * of one colour, from pale to full, each hold about a fifth of the countries, so a few very large
 * countries do not leave the rest in the palest shade. Countries without a value stay grey. Click a
 * country to filter the other widgets; keyboard users press Tab to reach the map's data table. A
 * 1:110m map leaves out the smallest countries, such as Singapore and the Maldives, which only the
 * data table lists.
 */
const meta = {
  title: 'Widgets/Map',
  tags: ['autodocs'],
  args: { widgetId: 'population-map', onFilterChange: fn() },
  argTypes: states.widgetArgTypes,
  render: states.renderWidget,
} satisfies Meta<states.WidgetStoryArgs>;

export default meta;

export const Default: states.WidgetStory = {};
export const Loading = states.loading;
export const Empty = states.empty;
export const Failed: states.WidgetStory = { ...states.failed, name: 'Error' };
export const Selected = states.selected(
  'population-map',
  'country',
  ['India', 'Brazil'],
  'India and Brazil selected on the map, as a Ctrl-click would select them: they are outlined and every other country is dimmed.',
);
export const Dark = states.dark;
