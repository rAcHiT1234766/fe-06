import { describe, expectTypeOf, it } from 'vitest';
import type { DashboardConfig, Query, ThemeInput } from './types';

describe('public type contracts', () => {
  it('FR-2.5 accepts a partial theme', () => {
    expectTypeOf<{ mode: 'dark'; shape: { radius: 0 } }>().toExtend<ThemeInput>();
    expectTypeOf<{ light: { primary: string } }>().toExtend<ThemeInput>();
  });

  it('FR-2.5 replaces the chart palette as a whole', () => {
    type Palette = NonNullable<NonNullable<ThemeInput['light']>['chart']>;
    expectTypeOf<Palette>().toEqualTypeOf<string[]>();
  });

  it('FR-6.1 rejects measures and aggregations outside the schema', () => {
    expectTypeOf<{ dataset: 'wdi'; measures: [{ field: 'revenue' }] }>().not.toExtend<Query>();
    expectTypeOf<{
      dataset: 'wdi';
      measures: [{ field: 'gdp'; agg: 'median' }];
    }>().not.toExtend<Query>();
  });

  it('FR-6.1 requires an lg layout and the schema version', () => {
    type WithoutLg = Omit<DashboardConfig, 'layouts'> & { layouts: { md: [] } };
    expectTypeOf<WithoutLg>().not.toExtend<DashboardConfig>();
    expectTypeOf<DashboardConfig['schemaVersion']>().toEqualTypeOf<1>();
  });
});
