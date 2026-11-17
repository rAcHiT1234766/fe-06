import { useEffect, useMemo, useState } from 'react';
import { migrate } from '../../core/config/schema';
import type { QueryClient } from '../../core/query-client';
import type { DashboardConfig, DashKitError } from '../../core/types';
import { useDashKit } from '../context';

interface DashboardConfigState {
  config?: DashboardConfig;
  error?: DashKitError;
}

function migrated(config: DashboardConfig): DashboardConfigState {
  try {
    return { config: migrate(config) };
  } catch (error) {
    // migrate throws only a DashKitError.
    return { error: error as DashKitError };
  }
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
        if (!signal.aborted) setLoaded({ client, id: dashboardId, ...migrated(loadedConfig) });
      },
      (error: unknown) => {
        // The query client rejects only with a DashKitError, or with the abort reason.
        if (!signal.aborted) setLoaded({ client, id: dashboardId, error: error as DashKitError });
      },
    );
    return () => controller.abort();
  }, [client, dashboardId, config]);

  const given = useMemo(() => config && migrated(config), [config]);
  if (given) return given;
  // A dashboard loaded by another client may belong to another tenant.
  return loaded?.client === client && loaded.id === dashboardId ? loaded : {};
}
