import type {
  Aggregation,
  DimensionField,
  FilterOperator,
  MeasureField,
  QueryResult,
} from '@dashkit/sdk';

type ColumnFormat = NonNullable<QueryResult['columns'][number]['format']>;

/** One country in one year. `regionCode` is used for row-level security and is never queryable. */
export interface DataRow extends Record<MeasureField, number | null> {
  country: string;
  region: string;
  regionCode: string;
  incomeLevel: string;
  year: number;
}

export const dimensions: Record<DimensionField, { label: string; format?: ColumnFormat }> = {
  country: { label: 'Country' },
  region: { label: 'Region' },
  incomeLevel: { label: 'Income level' },
  year: { label: 'Year', format: 'year' },
};

// Percentages are stored on the 0–100 scale the World Bank publishes, not as fractions.
export const measures: Record<
  MeasureField,
  { label: string; format: ColumnFormat; defaultAgg: Aggregation; indicator: string }
> = {
  gdp: { label: 'GDP (US$)', format: 'currency', defaultAgg: 'sum', indicator: 'NY.GDP.MKTP.CD' },
  gdpPerCapita: {
    label: 'GDP per capita (US$)',
    format: 'currency',
    defaultAgg: 'avg',
    indicator: 'NY.GDP.PCAP.CD',
  },
  population: {
    label: 'Population',
    format: 'number',
    defaultAgg: 'sum',
    indicator: 'SP.POP.TOTL',
  },
  lifeExpectancy: {
    label: 'Life expectancy (years)',
    format: 'number',
    defaultAgg: 'avg',
    indicator: 'SP.DYN.LE00.IN',
  },
  internetUsers: {
    label: 'Internet users (%)',
    format: 'percent',
    defaultAgg: 'avg',
    indicator: 'IT.NET.USER.ZS',
  },
  unemployment: {
    label: 'Unemployment (%)',
    format: 'percent',
    defaultAgg: 'avg',
    indicator: 'SL.UEM.TOTL.ZS',
  },
  electricityAccess: {
    label: 'Electricity access (%)',
    format: 'percent',
    defaultAgg: 'avg',
    indicator: 'EG.ELC.ACCS.ZS',
  },
};

export const aggregations: Aggregation[] = ['sum', 'avg', 'min', 'max', 'count'];

export const filterOperators: FilterOperator[] = [
  'eq',
  'neq',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
];

export const isDimensionField = (value: unknown): value is DimensionField =>
  typeof value === 'string' && Object.hasOwn(dimensions, value);

export const isMeasureField = (value: unknown): value is MeasureField =>
  typeof value === 'string' && Object.hasOwn(measures, value);
