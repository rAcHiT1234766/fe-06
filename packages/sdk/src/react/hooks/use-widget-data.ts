import { useEffect, useMemo, useState } from 'react';
import { filtersFor } from '../../core/filter-store';
import { mergeQuery } from '../../core/merge-query';
import type { QueryClient } from '../../core/query-client';
import type { DashKitError, QueryResult, WidgetConfig } from '../../core/types';
import { useDashKit } from '../context';
import { useActiveFilters } from './use-cross-filter';

interface WidgetData {
  data?: QueryResult;
  error?: DashKitError;
}

// Until a new query's result arrives, the previous result stays on screen instead of a blank widget.
export function useWidgetData(widget: WidgetConfig): WidgetData {
  const { client } = useDashKit();
  const activeFilters = useActiveFilters();
  const query = useMemo(
    () => mergeQuery(widget.query, filtersFor(activeFilters, widget)),
    [widget, activeFilters],
  );
  const [loaded, setLoaded] = useState<WidgetData & { client: QueryClient }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    client.run(query, signal).then(
      (data) => {
        if (!signal.aborted) setLoaded({ client, data });
      },
      (error: unknown) => {
        // The query client rejects only with a DashKitError, or with the abort reason.
        if (!signal.aborted) setLoaded({ client, error: error as DashKitError });
      },
    );
    // A newer query, after a filter change, aborts this one, so its late answer is never shown.
    return () => controller.abort();
  }, [client, query]);

  // A result fetched by another client belongs to another session, possibly another user's.
  return loaded?.client === client ? loaded : {};
}
