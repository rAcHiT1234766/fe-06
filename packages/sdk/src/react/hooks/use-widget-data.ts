import { useContext, useEffect, useMemo, useState } from 'react';
import { ownQuery } from '../../core/drill-down';
import { filtersFor } from '../../core/filter-store';
import { mergeQuery } from '../../core/merge-query';
import { queryKey, type QueryClient } from '../../core/query-client';
import type { DashKitError, QueryResult, WidgetConfig } from '../../core/types';
import { useDashKit } from '../context';
import { ControlledFieldsContext } from '../controlled-fields-context';
import { useActiveFilters } from './use-cross-filter';

interface WidgetData {
  data?: QueryResult | undefined;
  error?: DashKitError | undefined;
  /** True while the widget waits for its current query, showing an older result or nothing. */
  isFetching: boolean;
}

interface Loaded {
  client: QueryClient;
  key: string;
  data?: QueryResult;
  error?: DashKitError;
}

// Until a new query's result arrives, the previous result stays on screen instead of a blank widget.
export function useWidgetData(widget: WidgetConfig): WidgetData {
  const { client } = useDashKit();
  const activeFilters = useActiveFilters();
  const controlledFields = useContext(ControlledFieldsContext);
  const query = useMemo(
    () =>
      mergeQuery(
        ownQuery(widget, activeFilters),
        filtersFor(activeFilters, widget),
        controlledFields,
      ),
    [widget, activeFilters, controlledFields],
  );
  const key = queryKey(query);
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const settle = (result: Pick<Loaded, 'data' | 'error'>) => {
      if (!signal.aborted) setLoaded({ client, key, ...result });
    };
    client.run(query, signal).then(
      (data) => settle({ data }),
      // The query client rejects only with a DashKitError, or with the abort reason.
      (error: unknown) => settle({ error: error as DashKitError }),
    );
    // A newer query, after a filter change, aborts this one, so its late answer is never shown.
    return () => controller.abort();
  }, [client, query, key]);

  // A result fetched by another client belongs to another session, possibly another user's.
  if (loaded?.client !== client) return { isFetching: true };
  return { data: loaded.data, error: loaded.error, isFetching: loaded.key !== key };
}
