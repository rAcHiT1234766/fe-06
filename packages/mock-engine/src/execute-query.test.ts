import type { MeasureField, TokenClaims } from '@dashkit/sdk';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.ts';
import { executeQuery } from './execute-query.ts';
import type { DataRow } from './schema.ts';

const regionNames: Record<string, string> = {
  SAS: 'South Asia',
  EAS: 'East Asia & Pacific',
  ECS: 'Europe & Central Asia',
};

function makeRow(
  country: string,
  regionCode: string,
  year: number,
  values: Partial<Record<MeasureField, number | null>>,
): DataRow {
  return {
    country,
    region: regionNames[regionCode] ?? regionCode,
    regionCode,
    incomeLevel: country === 'India' ? 'Lower middle income' : 'High income',
    year,
    gdp: null,
    gdpPerCapita: null,
    population: null,
    lifeExpectancy: null,
    internetUsers: null,
    unemployment: null,
    electricityAccess: null,
    ...values,
  };
}

const rows = [
  makeRow('India', 'SAS', 2020, { population: 100, gdp: 50, unemployment: 7 }),
  makeRow('India', 'SAS', 2021, { population: 110, gdp: 60, unemployment: null }),
  makeRow('Japan', 'EAS', 2020, { population: 30, gdp: 80, unemployment: 3 }),
  makeRow('France', 'ECS', 2020, { population: 20, gdp: 70, unemployment: 8 }),
  makeRow('France', 'ECS', 2021, { population: 21, gdp: null, unemployment: 7 }),
];

const claimsFor = (regions: TokenClaims['scopes']['regions']): TokenClaims => ({
  sub: 'test-user',
  tenantId: 'test-tenant',
  role: 'viewer',
  scopes: { regions },
  iat: 0,
  exp: 0,
});

const everyone = claimsFor('*');

const run = (query: object, claims = everyone) =>
  executeQuery(rows, { dataset: 'wdi', ...query }, claims).rows;

describe('executeQuery', () => {
  it('FR-3.4 returns only rows inside the user region scope', () => {
    const result = run(
      { measures: [{ field: 'population' }], dimensions: ['country'] },
      claimsFor(['SAS', 'EAS']),
    );
    expect(result.map((row) => row.country)).toEqual(['India', 'Japan']);
  });

  it('FR-3.4 computes totals from in-scope rows only', () => {
    expect(run({ measures: [{ field: 'population' }] }, claimsFor(['ECS']))).toEqual([
      { population: 41 },
    ]);
  });

  it('FR-3.9 returns no rows when a filter asks for a region outside the scope', () => {
    const result = run(
      {
        measures: [{ field: 'population' }],
        dimensions: ['region'],
        filters: [{ field: 'region', op: 'in', value: ['Europe & Central Asia', 'South Asia'] }],
      },
      claimsFor(['EAS']),
    );
    expect(result).toEqual([]);
  });

  it('groups by several dimensions and sums each group', () => {
    const result = run({
      measures: [{ field: 'population', agg: 'sum' }],
      dimensions: ['incomeLevel', 'year'],
    });
    expect(result).toEqual([
      { incomeLevel: 'Lower middle income', year: 2020, population: 100 },
      { incomeLevel: 'Lower middle income', year: 2021, population: 110 },
      { incomeLevel: 'High income', year: 2020, population: 50 },
      { incomeLevel: 'High income', year: 2021, population: 21 },
    ]);
  });

  it('skips missing values and returns null when a group has none', () => {
    const result = run({
      measures: [
        { field: 'unemployment', agg: 'avg' },
        { field: 'gdp', agg: 'sum' },
        { field: 'gdp', agg: 'count', alias: 'gdpReported' },
      ],
      dimensions: ['country', 'year'],
      filters: [{ field: 'year', op: 'eq', value: 2021 }],
    });
    expect(result).toEqual([
      { country: 'India', year: 2021, unemployment: null, gdp: 60, gdpReported: 1 },
      { country: 'France', year: 2021, unemployment: 7, gdp: null, gdpReported: 0 },
    ]);
  });

  it('applies the default aggregation and supports min and max', () => {
    const result = run({
      measures: [
        { field: 'unemployment' },
        { field: 'gdp', agg: 'min', alias: 'lowestGdp' },
        { field: 'gdp', agg: 'max', alias: 'highestGdp' },
      ],
    });
    expect(result).toEqual([{ unemployment: 6.25, lowestGdp: 50, highestGdp: 80 }]);
  });

  it.each([
    ['neq', 'country', 'France', ['India', 'Japan']],
    ['notIn', 'country', ['India', 'Japan'], ['France']],
    ['gt', 'gdp', 70, ['Japan']],
    ['gte', 'gdp', 70, ['Japan', 'France']],
    ['lt', 'gdp', 60, ['India']],
    ['lte', 'gdp', 60, ['India']],
    ['between', 'gdp', [55, 75], ['India', 'France']],
  ])('applies the %s filter operator', (op, field, value, expected) => {
    const result = run({
      measures: [{ field: 'population' }],
      dimensions: ['country'],
      filters: [{ field, op, value }],
    });
    expect(result.map((row) => row.country)).toEqual(expected);
  });

  it('sorts with missing values last, then limits and reports truncation', () => {
    const { rows: sorted, meta } = executeQuery(
      rows,
      {
        dataset: 'wdi',
        measures: [{ field: 'unemployment', agg: 'max' }],
        dimensions: ['country', 'year'],
        orderBy: [{ field: 'unemployment', direction: 'desc' }],
        limit: 4,
      },
      everyone,
    );
    expect(sorted.map((row) => row.unemployment)).toEqual([8, 7, 7, 3]);
    expect(meta).toMatchObject({ rowCount: 4, truncated: true });

    const ascending = run({
      measures: [{ field: 'unemployment', agg: 'max' }],
      dimensions: ['country', 'year'],
      orderBy: [{ field: 'unemployment', direction: 'asc' }],
    });
    expect(ascending.at(-1)?.unemployment).toBeNull();
  });

  it('describes result columns with labels and formats', () => {
    const { columns } = executeQuery(
      rows,
      {
        dataset: 'wdi',
        measures: [{ field: 'gdp' }, { field: 'gdp', agg: 'count', alias: 'reporting' }],
        dimensions: ['year'],
      },
      everyone,
    );
    expect(columns).toEqual([
      { name: 'year', role: 'dimension', label: 'Year', format: 'year' },
      { name: 'gdp', role: 'measure', label: 'GDP (US$)', format: 'currency' },
      { name: 'reporting', role: 'measure', label: 'GDP (US$), count', format: 'number' },
    ]);
  });

  it('ignores unknown keys such as a tenantId in the body', () => {
    expect(
      run({ measures: [{ field: 'population' }], tenantId: 'someone-else' }, claimsFor(['SAS'])),
    ).toEqual([{ population: 210 }]);
  });

  it.each([
    ['an unknown dataset', { dataset: 'sales', measures: [{ field: 'gdp' }] }],
    ['no measures', { dataset: 'wdi', measures: [] }],
    ['an unknown measure', { dataset: 'wdi', measures: [{ field: 'revenue' }] }],
    [
      'the hidden regionCode column',
      { dataset: 'wdi', measures: [{ field: 'gdp' }], dimensions: ['regionCode'] },
    ],
    ['an unknown aggregation', { dataset: 'wdi', measures: [{ field: 'gdp', agg: 'median' }] }],
    [
      'an unknown operator',
      {
        dataset: 'wdi',
        measures: [{ field: 'gdp' }],
        filters: [{ field: 'year', op: 'like', value: 2 }],
      },
    ],
    [
      'a filter on regionCode',
      {
        dataset: 'wdi',
        measures: [{ field: 'gdp' }],
        filters: [{ field: 'regionCode', op: 'eq', value: 'ECS' }],
      },
    ],
    [
      'a wrong filter value type',
      {
        dataset: 'wdi',
        measures: [{ field: 'gdp' }],
        filters: [{ field: 'year', op: 'gt', value: '2000' }],
      },
    ],
    [
      'an alias that is not an identifier',
      { dataset: 'wdi', measures: [{ field: 'gdp', alias: '__proto__' }] },
    ],
    ['duplicate column names', { dataset: 'wdi', measures: [{ field: 'gdp' }, { field: 'gdp' }] }],
    [
      'ordering by a column not in the result',
      {
        dataset: 'wdi',
        measures: [{ field: 'gdp' }],
        orderBy: [{ field: 'population', direction: 'asc' }],
      },
    ],
    ['a limit above the maximum', { dataset: 'wdi', measures: [{ field: 'gdp' }], limit: 5000 }],
  ])('NFR-S3 rejects %s', (_case, query) => {
    expect(() => executeQuery(rows, query, everyone)).toThrow(
      expect.objectContaining({ status: 400, code: 'INVALID_QUERY' }) as ApiError,
    );
  });
});
