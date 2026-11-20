/** A single cell value. Missing indicator values are `null`, never `0`. */
export type Scalar = string | number | boolean | null;

/** Fields a query can group and filter by. */
export type DimensionField = 'country' | 'region' | 'incomeLevel' | 'year';

/** World Bank indicators a query can aggregate. The API's `/meta` route lists their labels and formats. */
export type MeasureField =
  | 'gdp'
  | 'gdpPerCapita'
  | 'population'
  | 'lifeExpectancy'
  | 'internetUsers'
  | 'unemployment'
  | 'electricityAccess';

/** How measure values are combined within a group. `null` values are skipped, not counted as zero. */
export type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Comparison operators the query API accepts. `in`, `notIn` and `between` take an array value. */
export type FilterOperator =
  'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';

/** A condition on one field. Filters can only narrow the rows a user is already allowed to see. */
export interface Filter {
  /** The field to compare. Measure filters compare each row's raw value, before aggregation. */
  field: DimensionField | MeasureField;
  /** How to compare. */
  op: FilterOperator;
  /** One value, or an array for `in`, `notIn` and `between` (`[low, high]`, both included). */
  value: Scalar | Scalar[];
}

/**
 * A request for aggregated data. The API applies the user's row scope before any of these filters.
 * @example
 * const query: Query = {
 *   dataset: 'wdi',
 *   measures: [{ field: 'population', agg: 'sum' }],
 *   dimensions: ['region'],
 *   filters: [{ field: 'year', op: 'eq', value: 2020 }],
 * };
 */
export interface Query {
  /** The dataset to query. The demo has one: World Development Indicators. */
  dataset: 'wdi';
  /** `agg` falls back to the measure's default aggregation; `alias` renames the result column. */
  measures: { field: MeasureField; agg?: Aggregation; alias?: string }[];
  /** Fields to group by, giving one row per combination. Without them, all matching rows make one. */
  dimensions?: DimensionField[];
  /** Conditions every row must meet. All of them apply. */
  filters?: Filter[];
  /** `field` may be a dimension, a measure or a measure alias. */
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  /** The API returns at most 1000 rows when no limit is given. */
  limit?: number;
}

/** The answer to a {@link Query}. Rows only ever contain data inside the caller's scope. */
export interface QueryResult {
  /**
   * One entry per column, dimensions first: `name` is the key in each row, `label` the heading to
   * show, and `format` how to show a measure's values.
   */
  columns: {
    name: string;
    role: 'dimension' | 'measure';
    label: string;
    format?: 'number' | 'currency' | 'percent' | 'year';
  }[];
  /** The rows, keyed by column name. */
  rows: Record<string, Scalar>[];
  /** `truncated` is true when the row limit cut off further rows. */
  meta: { rowCount: number; truncated: boolean; durationMs: number };
}

/** The widget kinds a dashboard can contain. */
export type WidgetType = 'bar' | 'line' | 'pie' | 'table' | 'kpi';

/** Container-width breakpoints: `lg` from 1200 px, `md` from 900 px, `sm` from 600 px, `xs` below. */
export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs';

/** Position and size of one widget, in grid columns and rows. `i` is the widget id. */
export interface LayoutItem {
  /** The id of the widget placed here. */
  i: string;
  /** Column of the left edge, from 0. */
  x: number;
  /** Row of the top edge, from 0. */
  y: number;
  /** Width in columns: 12 at `lg`, 8 at `md`, 4 at `sm`, 1 at `xs`. */
  w: number;
  /** Height in rows. A row is 72 px tall, with the theme's spacing between rows. */
  h: number;
  /**
   * The narrowest the builder lets an editor make this widget, in columns of the twelve-column grid.
   * It can raise the widget type's own minimum, such as 4 for a chart, but not lower it.
   */
  minW?: number;
  /**
   * The shortest the builder lets an editor make this widget, in rows. It can raise the widget
   * type's own minimum, such as 3 for a chart, but not lower it.
   */
  minH?: number;
}

/** One widget: the data it shows, how it is drawn, and whether it takes part in cross-filtering. */
export interface WidgetConfig {
  /** Unique within the dashboard; layout items refer to it. */
  id: string;
  /** How the widget draws its data. */
  type: WidgetType;
  /** Shown in the widget's header, and the accessible name of its chart or table. */
  title: string;
  /** A longer explanation of the widget. Stored with the config. */
  description?: string;
  /** The data the widget shows, before cross-filters and the dashboard's default filters. */
  query: Query;
  /**
   * Drawing options. `orientation` and `stacked` apply to bar charts, `showLegend` to charts with
   * several series and pies, and `donut` to pies. `pageSize` splits a table's rows into pages of
   * that many, with Previous and Next buttons; without it, a table shows every row in a scrolling
   * body. The query's `limit` still caps how many rows there are to page through.
   */
  options?: {
    orientation?: 'vertical' | 'horizontal';
    stacked?: boolean;
    showLegend?: boolean;
    donut?: boolean;
    pageSize?: number;
  };
  /**
   * A field to show within a selection made in this widget, such as `country` for a chart of
   * regions. Clicking a region then shows that region's countries here, while the other widgets
   * filter by the region as usual, and a link above the chart leads back. Only a widget that emits
   * cross-filters drills down, and only to a field other than the one it is clicked on.
   */
  drillDown?: DimensionField;
  /** `emit` defaults to true for bar and pie widgets; `listen` defaults to true for all. */
  crossFilter?: {
    emit?: boolean;
    listen?: boolean;
  };
}

/** A saved dashboard as the API lists it. */
export interface DashboardSummary {
  /** What `dashboardId` and the `dashboard-id` attribute refer to. */
  id: string;
  /** The dashboard's title, as the picker lists it. */
  title: string;
}

/**
 * A list above the grid that filters the whole dashboard by one field, as a click on a chart does.
 * It offers the field's values within the user's scope, and "All". The field becomes a setting of
 * the dashboard: a selection on it, from the list, a click or the host, replaces each listening
 * widget's own filters on that field, so a Year list moves widgets that show 2024 to the year
 * chosen. A widget with `crossFilter.listen: false` keeps its own.
 */
export interface FilterControl {
  /** The field the control filters by. */
  field: DimensionField;
  /** The control's label. Without one, the field's name, such as "Region". */
  label?: string;
}

/**
 * Everything needed to show one dashboard, as plain JSON. The viewer renders it, the builder edits
 * a copy of it, and the API stores it unchanged.
 */
export interface DashboardConfig {
  /** The id that `dashboardId` and the `dashboard-id` attribute refer to. */
  id: string;
  /** The version of this format. A newer version is refused rather than misread. */
  schemaVersion: 1;
  /** Shown as the dashboard's heading. */
  title: string;
  /** Shown under the title. */
  description?: string;
  /** The widgets, in no particular order; the layouts place them. */
  widgets: WidgetConfig[];
  /** Only `lg` is required; missing smaller layouts are derived from it. */
  layouts: { lg: LayoutItem[] } & Partial<Record<Exclude<Breakpoint, 'lg'>, LayoutItem[]>>;
  /** Applied to every widget and not shown as removable chips. */
  defaultFilters?: Filter[];
  /**
   * Lists above the grid, one per field, that set the dashboard's filters. A choice replaces any
   * selection on that field, a click on a chart shows in the list, and "All" removes the filter.
   * A field cannot have both a filter control and a default filter.
   */
  filterControls?: FilterControl[];
  /** When the dashboard was last saved, as an ISO 8601 time. Set by the API. */
  updatedAt?: string;
  /** Who last saved it: the `sub` of their token. Set by the API. */
  updatedBy?: string;
}

/** Colours for one mode. Any CSS colour value works. */
export interface ColorTokens {
  /** The brand colour: primary buttons and focus outlines. */
  primary: string;
  /** Text colour used on top of `primary`. */
  primaryContrast: string;
  /** Behind the whole dashboard. */
  background: string;
  /** Widget cards, buttons and inputs. */
  surface: string;
  /** Filter chips and hovered buttons, which sit above the surface. */
  surfaceRaised: string;
  /** Body text. */
  text: string;
  /** Secondary text, such as descriptions and labels. */
  textMuted: string;
  /** Lines around cards, inputs and table cells. */
  border: string;
  /** Text for a good outcome, such as the builder's "Saved", on the background. */
  success: string;
  /** Text for something that needs attention, such as the builder's "Unsaved changes". */
  warning: string;
  /** Error messages on a widget, and the problems that stop a dashboard from being saved. */
  danger: string;
  /** Series colours for charts, 6 to 10 of them. */
  chart: string[];
}

/** A complete theme. Integrators pass a {@link ThemeInput}; missing values come from the defaults. */
export interface DashKitTheme {
  /** `auto` follows the operating system's light or dark setting. */
  mode: 'light' | 'dark' | 'auto';
  /** Colours in light mode. */
  light: ColorTokens;
  /** Colours in dark mode. */
  dark: ColorTokens;
  /** `baseFontSize` is in px. The host page must load the fonts it names. */
  typography: { fontFamily: string; headingFontFamily: string; baseFontSize: number };
  /** Corner radius in px; `0` gives square corners. */
  shape: { radius: number };
  /** Shown in the dashboard's header. `logoAlt` describes the logo and falls back to `name`. */
  brand: { name?: string; logoUrl?: string; logoAlt?: string };
}

/**
 * Makes every property optional at every depth. Arrays count as single values, so a partial theme
 * replaces the chart palette as a whole instead of mixing it with the default one.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/**
 * The theme integrators pass in. Every field is optional.
 * @example
 * const theme: ThemeInput = { mode: 'auto', light: { primary: 'rebeccapurple' }, shape: { radius: 12 } };
 */
export type ThemeInput = DeepPartial<DashKitTheme>;

/**
 * The claims inside a verified embed token. Only the API relies on them; the SDK reads `role` just
 * to decide whether to show edit controls.
 */
export interface TokenClaims {
  /** The signed-in user's id in the host product. */
  sub: string;
  /** The customer the user belongs to. Every dashboard and saved config is kept per tenant. */
  tenantId: string;
  /** Editors may change and save dashboards; viewers may only look. */
  role: 'viewer' | 'editor';
  /** The rows and measures the user may see. The API applies them to every query. */
  scopes: {
    /** Region codes the user may see, or `'*'` for all regions. */
    regions: string[] | '*';
    /**
     * Measures the user may query, or `'*'` or omitted for all of them. The API refuses a query
     * that shows or filters on any other measure, and its `/meta` route lists only these, so the
     * builder never offers the rest.
     */
    measures?: MeasureField[] | '*';
  };
  /** When the token expires, in seconds since 1970. */
  exp: number;
  /** When the token was issued, in seconds since 1970. */
  iat: number;
}

/** A cross-filter selection. The widget that created it highlights it instead of being filtered by it. */
export interface ActiveFilter {
  /** The dimension the selection is on. */
  field: DimensionField;
  /** The selected values. A row matches when its value is any of them. */
  values: Scalar[];
  /** The widget the selection was made in, or any other id for a filter the host sets. */
  sourceWidgetId: string;
}

/** The one error shape used by the API and the SDK. `UNAUTHENTICATED` covers missing, invalid and expired tokens. */
export interface DashKitError {
  /** What went wrong, for code to act on. `NETWORK` means the API could not be reached. */
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_QUERY' | 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN';
  /** A description for developers and logs. */
  message: string;
}

/** Options for showing a dashboard. Pass `token` or `getToken`, and `dashboardId` or `config`. */
export interface DashKitOptions {
  /** Base URL of the data API, such as `https://analytics.example.com`. */
  apiUrl: string;
  /** An embed token minted by your backend. It is kept in memory only. */
  token?: string;
  /** Called on start and once after a 401 response to get a fresh token. */
  getToken?: () => Promise<string>;
  /** The saved dashboard to load from the API. */
  dashboardId?: string;
  /** A dashboard to show directly, without loading one. */
  config?: DashboardConfig;
  /** `edit` only takes effect when the token's role is `editor`. */
  mode?: 'view' | 'edit';
  /** The host's brand. Anything left out comes from the default theme. */
  theme?: ThemeInput;
  /**
   * Shows a button on each widget that downloads its data as a CSV file: every row the widget
   * holds, including the other pages of a paged table, after the cross-filters and only ever inside
   * the user's scope. Off unless set, since some products must not let data leave them.
   */
  allowExport?: boolean;
  /**
   * Shows a list of the tenant's dashboards above the dashboard to switch between them, with
   * **New dashboard** and **Delete dashboard** for editors. Off unless set.
   */
  dashboardPicker?: boolean;
  /** Called with the id of the dashboard chosen, created or shown instead in the picker. */
  onDashboardChange?: (dashboardId: string) => void;
  /** Called with the new filters after every change, whether from a click or from the host. */
  onFilterChange?: (filters: ActiveFilter[]) => void;
  /** Called with the config as stored after an editor saves. */
  onSave?: (config: DashboardConfig) => void;
  /** Called when a request fails for good or a dashboard cannot be read. */
  onError?: (error: DashKitError) => void;
}
