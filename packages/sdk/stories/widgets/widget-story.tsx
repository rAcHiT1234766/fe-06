import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DashboardConfig, DimensionField, Filter, Scalar } from '../../src';
import { ThemeRoot } from '../../src/react/ThemeRoot';
import { WidgetFrame } from '../../src/react/widgets/WidgetFrame';
import { hostArgTypes, LOADING_API_URL, OFFLINE_API_URL, type HostArgs } from '../support';

export interface WidgetStoryArgs extends HostArgs {
  widgetId: string;
  year?: number;
  emit?: boolean;
  /** Tables only: sets the widget's `options.pageSize`. */
  pageSize?: number;
}

export const widgetArgTypes = {
  widgetId: {
    description: 'The widget, as saved on the "World development overview" dashboard.',
    control: false,
  },
  year: {
    description: "Shows only this year, in place of the widget's own filters.",
    control: { type: 'number', min: 1999, max: 2024 },
  },
  emit: {
    description:
      "Sets the widget's `crossFilter.emit`, so a click on it filters the others. Bar and pie widgets do so already.",
    control: 'boolean',
  },
  ...hostArgTypes,
} satisfies Meta<WidgetStoryArgs>['argTypes'];

export type WidgetStory = StoryObj<WidgetStoryArgs>;

/** Draws one widget of the signed-in user's saved dashboard on its own. */
export const renderWidget: NonNullable<Meta<WidgetStoryArgs>['render']> = (
  { widgetId, year, emit, pageSize },
  { loaded },
) => {
  const { widgets } = loaded.dashboard as DashboardConfig;
  const saved = widgets.find((candidate) => candidate.id === widgetId)!;
  const widget = {
    ...saved,
    ...(year !== undefined && {
      query: {
        ...saved.query,
        filters: [{ field: 'year', op: 'eq', value: year } satisfies Filter],
      },
    }),
    ...(emit !== undefined && { crossFilter: { ...saved.crossFilter, emit } }),
    ...(pageSize !== undefined && { options: { ...saved.options, pageSize } }),
  };
  return (
    <ThemeRoot>
      <div style={{ height: 360, padding: 16 }}>
        <WidgetFrame widget={widget} />
      </div>
    </ThemeRoot>
  );
};

const described = (story: string) => ({ docs: { description: { story } } });

// The states every widget has, shared so that each widget's stories show them the same way.

export const loading: WidgetStory = {
  parameters: { apiUrl: LOADING_API_URL, ...described('While the data is on its way.') },
};

export const empty: WidgetStory = {
  args: { year: 1999 },
  parameters: described('The data starts in 2000, so a query for 1999 returns no rows.'),
};

// Exported as `Failed`, named "Error" in each file, so that no export hides the global `Error`.
export const failed: WidgetStory = {
  parameters: {
    apiUrl: OFFLINE_API_URL,
    ...described(
      'The data API cannot be reached, so the widget shows an error in place of its data.',
    ),
  },
};

export const dark: WidgetStory = {
  globals: { mode: 'dark' },
  parameters: described('Dark mode, in whichever brand the toolbar shows.'),
};

/** A selection the host passes in, as if the user had clicked these values in `widgetId`. */
export function selected(
  widgetId: string,
  field: DimensionField,
  values: Scalar[],
  description: string,
): WidgetStory {
  return {
    args: { filters: [{ field, values, sourceWidgetId: widgetId }] },
    parameters: described(description),
  };
}
