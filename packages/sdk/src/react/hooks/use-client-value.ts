import { useEffect, useState } from 'react';
import type { QueryClient } from '../../core/query-client';
import type { DashKitError } from '../../core/types';
import { useDashKit } from '../context';

interface ClientValue<T> {
  value?: T;
  error?: DashKitError;
}

/**
 * Loads one value through the dashboard's query client, only while it is needed. `load` must keep
 * its identity between renders, so define it outside the component.
 */
export function useClientValue<T>(
  load: (client: QueryClient, signal: AbortSignal) => Promise<T>,
  isNeeded = true,
): ClientValue<T> {
  const { client } = useDashKit();
  const [loaded, setLoaded] = useState<ClientValue<T> & { client: QueryClient }>();

  useEffect(() => {
    if (!isNeeded) return;
    const controller = new AbortController();
    const { signal } = controller;
    load(client, signal).then(
      (value) => {
        if (!signal.aborted) setLoaded({ client, value });
      },
      (error: unknown) => {
        // The query client rejects only with a DashKitError, or with the abort reason.
        if (!signal.aborted) setLoaded({ client, error: error as DashKitError });
      },
    );
    return () => controller.abort();
  }, [client, isNeeded, load]);

  // A value loaded through another client belongs to another token, possibly another user's.
  return loaded?.client === client ? loaded : {};
}
