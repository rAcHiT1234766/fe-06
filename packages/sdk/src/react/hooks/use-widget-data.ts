import { useEffect, useState } from 'react';
import type { QueryClient } from '../../core/query-client';
import type { DashKitError, QueryResult, WidgetConfig } from '../../core/types';
import { useDashKit } from '../context';

interface WidgetData {
  data?: QueryResult;
  error?: DashKitError;
}

// Until a new query's result arrives, the previous result stays on screen instead of a blank widget.
export function useWidgetData({ query }: WidgetConfig): WidgetData {
  const { client } = useDashKit();
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
    return () => controller.abort();
  }, [client, query]);

  // A result fetched by another client belongs to another session, possibly another user's.
  return loaded?.client === client ? loaded : {};
}
