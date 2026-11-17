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
  field: DimensionField | MeasureField;
  op: FilterOperator;
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
  dataset: 'wdi';
  /** `agg` falls back to the measure's default aggregation; `alias` renames the result column. */
  measures: { field: MeasureField; agg?: Aggregation; alias?: string }[];
  dimensions?: DimensionField[];
  filters?: Filter[];
  /** `field` may be a dimension, a measure or a measure alias. */
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  /** The API returns at most 1000 rows when no limit is given. */
  limit?: number;
}

/** The answer to a {@link Query}. Rows only ever contain data inside the caller's scope. */
export interface QueryResult {
  columns: {
    name: string;
    role: 'dimension' | 'measure';
    label: string;
    format?: 'number' | 'currency' | 'percent' | 'year';
  }[];
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
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

/** One widget: the data it shows, how it is drawn, and whether it takes part in cross-filtering. */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  query: Query;
  options?: {
    orientation?: 'vertical' | 'horizontal';
    stacked?: boolean;
    showLegend?: boolean;
    donut?: boolean;
    pageSize?: number;
  };
  /** `emit` defaults to true for bar and pie widgets; `listen` defaults to true for all. */
  crossFilter?: {
    emit?: boolean;
    listen?: boolean;
  };
}

/**
 * Everything needed to show one dashboard, as plain JSON. The viewer renders it, the builder edits
 * a copy of it, and the API stores it unchanged.
 */
export interface DashboardConfig {
  id: string;
  schemaVersion: 1;
  title: string;
  description?: string;
  widgets: WidgetConfig[];
  /** Only `lg` is required; missing smaller layouts are derived from it. */
  layouts: { lg: LayoutItem[] } & Partial<Record<Exclude<Breakpoint, 'lg'>, LayoutItem[]>>;
  /** Applied to every widget and not shown as removable chips. */
  defaultFilters?: Filter[];
  updatedAt?: string;
  updatedBy?: string;
}

/** Colours for one mode. Any CSS colour value works. */
export interface ColorTokens {
  primary: string;
  /** Text colour used on top of `primary`. */
  primaryContrast: string;
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  /** Series colours for charts, 6 to 10 of them. */
  chart: string[];
}

/** A complete theme. Integrators pass a {@link ThemeInput}; missing values come from the defaults. */
export interface DashKitTheme {
  /** `auto` follows the operating system's light or dark setting. */
  mode: 'light' | 'dark' | 'auto';
  light: ColorTokens;
  dark: ColorTokens;
  /** `baseFontSize` is in px. The host page must load the fonts it names. */
  typography: { fontFamily: string; headingFontFamily: string; baseFontSize: number };
  /** Corner radius in px; `0` gives square corners. */
  shape: { radius: number };
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
  sub: string;
  tenantId: string;
  role: 'viewer' | 'editor';
  scopes: {
    /** Region codes the user may see, or `'*'` for all regions. */
    regions: string[] | '*';
    /** Measures the user may query. Omitted means all of them. */
    measures?: MeasureField[] | '*';
  };
  exp: number;
  iat: number;
}

/** A cross-filter selection. The widget that created it highlights it instead of being filtered by it. */
export interface ActiveFilter {
  field: DimensionField;
  values: Scalar[];
  sourceWidgetId: string;
}

/** The one error shape used by the API and the SDK. `UNAUTHENTICATED` covers missing, invalid and expired tokens. */
export interface DashKitError {
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_QUERY' | 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN';
  message: string;
}

/** Options for showing a dashboard. Pass `token` or `getToken`, and `dashboardId` or `config`. */
export interface DashKitOptions {
  apiUrl: string;
  /** An embed token minted by your backend. It is kept in memory only. */
  token?: string;
  /** Called on start and once after a 401 response to get a fresh token. */
  getToken?: () => Promise<string>;
  dashboardId?: string;
  config?: DashboardConfig;
  /** `edit` only takes effect when the token's role is `editor`. */
  mode?: 'view' | 'edit';
  theme?: ThemeInput;
  onFilterChange?: (filters: ActiveFilter[]) => void;
  onSave?: (config: DashboardConfig) => void;
  onError?: (error: DashKitError) => void;
}
