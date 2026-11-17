import { useEffect, useState } from 'react';
import type { QueryClient } from '../../core/query-client';
import type { DashboardConfig, DashKitError } from '../../core/types';
import { useDashKit } from '../context';

interface DashboardConfigState {
  config?: DashboardConfig;
  error?: DashKitError;
}

export function useDashboardConfig(
  dashboardId: string | undefined,
  config: DashboardConfig | undefined,
): DashboardConfigState {
  const { client } = useDashKit();
  const [loaded, setLoaded] = useState<
    DashboardConfigState & { client: QueryClient; id: string }
  >();

  useEffect(() => {
    if (config || dashboardId === undefined) return;
    const controller = new AbortController();
    const { signal } = controller;
    client.loadDashboard(dashboardId, signal).then(
      (loadedConfig) => {
        if (!signal.aborted) setLoaded({ client, id: dashboardId, config: loadedConfig });
      },
      (error: unknown) => {
        // The query client rejects only with a DashKitError, or with the abort reason.
        if (!signal.aborted) setLoaded({ client, id: dashboardId, error: error as DashKitError });
      },
    );
    return () => controller.abort();
  }, [client, dashboardId, config]);

  if (config) return { config };
  // A dashboard loaded by another client may belong to another tenant.
  return loaded?.client === client && loaded.id === dashboardId ? loaded : {};
}
