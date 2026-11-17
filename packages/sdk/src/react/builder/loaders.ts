import type { QueryClient } from '../../core/query-client';
import type { Query } from '../../core/types';

// Loaders for useClientValue, defined once so that they keep their identity between renders.

export const loadRole = (client: QueryClient) => client.loadRole();

export const loadFieldCatalog = (client: QueryClient, signal: AbortSignal) =>
  client.loadFieldCatalog(signal);

const latestYearQuery: Query = {
  dataset: 'wdi',
  measures: [{ field: 'population', agg: 'count' }],
  dimensions: ['year'],
  orderBy: [{ field: 'year', direction: 'desc' }],
  limit: 1,
};

/** The most recent year with data, which new widgets show by default. */
export async function loadLatestYear(client: QueryClient, signal: AbortSignal) {
  const { rows } = await client.run(latestYearQuery, signal);
  const year = rows[0]?.year;
  return typeof year === 'number' ? year : undefined;
}
