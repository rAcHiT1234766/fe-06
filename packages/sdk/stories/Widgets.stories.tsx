import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DashboardConfig, Filter } from '../src';
import { ThemeRoot } from '../src/react/ThemeRoot';
import { WidgetFrame } from '../src/react/widgets/WidgetFrame';
import { LOADING_API_URL, OFFLINE_API_URL } from './mock-api';

interface WidgetStoryArgs {
  /** One of the widgets on the saved "World development overview" dashboard. */
  widgetId: string;
  /** Shows only this year instead of applying the widget's own filters. */
  year?: number;
}

const meta = {
  title: 'Widgets',
  args: { widgetId: 'population-by-region' },
  argTypes: {
    widgetId: {
      control: 'select',
      options: [
        'total-population',
        'population-by-region',
        'gdp-by-income',
        'life-expectancy-trend',
        'countries',
      ],
    },
  },
  render: ({ widgetId, year }, { loaded }) => {
    const { widgets } = loaded.dashboard as DashboardConfig;
    const widget = widgets.find((candidate) => candidate.id === widgetId)!;
    const query =
      year === undefined
        ? widget.query
        : { ...widget.query, filters: [{ field: 'year', op: 'eq', value: year } satisfies Filter] };
    return (
      <ThemeRoot>
        <div style={{ height: 360, padding: 16 }}>
          <WidgetFrame widget={{ ...widget, query }} />
        </div>
      </ThemeRoot>
    );
  },
} satisfies Meta<WidgetStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KPI: Story = { args: { widgetId: 'total-population' } };

export const BarChart: Story = {};

export const PieChart: Story = { args: { widgetId: 'gdp-by-income' } };

export const LineChart: Story = { args: { widgetId: 'life-expectancy-trend' } };

export const Table: Story = { args: { widgetId: 'countries' } };

/** Any widget, while its data is on the way. Pick another widget under Controls. */
export const Loading: Story = { parameters: { apiUrl: LOADING_API_URL } };

/** The data snapshot starts in 2000, so 1999 has no rows. */
export const Empty: Story = { args: { year: 1999 } };

/** The data service cannot be reached. */
export const ServiceUnreachable: Story = { parameters: { apiUrl: OFFLINE_API_URL } };
