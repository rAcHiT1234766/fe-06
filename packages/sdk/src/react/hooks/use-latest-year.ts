import { useEffect, useState } from 'react';
import type { QueryClient } from '../../core/query-client';
import type { Query } from '../../core/types';
import { useDashKit } from '../context';

const latestYearQuery: Query = {
  dataset: 'wdi',
  measures: [{ field: 'population', agg: 'count' }],
  dimensions: ['year'],
  orderBy: [{ field: 'year', direction: 'desc' }],
  limit: 1,
};

/** The most recent year with data, which new widgets show by default. Asked only when needed. */
export function useLatestYear(isNeeded: boolean): number | undefined {
  const { client } = useDashKit();
  const [loaded, setLoaded] = useState<{ client: QueryClient; year: number }>();

  useEffect(() => {
    if (!isNeeded) return;
    const controller = new AbortController();
    client.run(latestYearQuery, controller.signal).then(
      ({ rows }) => {
        const year = rows[0]?.year;
        if (typeof year === 'number') setLoaded({ client, year });
      },
      // Without it new widgets start without a year filter. A failing API already shows in
      // every widget.
      () => undefined,
    );
    return () => controller.abort();
  }, [client, isNeeded]);

  return loaded?.client === client ? loaded.year : undefined;
}
