import { useMemo, type ReactNode } from 'react';
import { applyDefaultFilters } from '../core/merge-query';
import type { DashboardConfig } from '../core/types';
import { useDashKit } from './context';
import { DashboardGrid } from './DashboardGrid';
import { FilterBar } from './FilterBar';
import { useDashboardConfig } from './hooks/use-dashboard-config';
import { ThemeRoot } from './ThemeRoot';
import { ErrorState } from './ui/ErrorState';
import { Skeleton } from './ui/Skeleton';

/** Props for {@link Dashboard}: the id of a saved dashboard, or a config to show directly. */
export type DashboardProps =
  | { dashboardId: string; config?: undefined }
  | { config: DashboardConfig; dashboardId?: undefined };

export function DashboardHeader({
  config,
  children,
}: {
  config: DashboardConfig;
  children?: ReactNode;
}) {
  const { brand } = useDashKit().theme;
  return (
    <header className="dk-dashboard-header">
      {brand.logoUrl && (
        <img
          className="dk-dashboard-logo"
          src={brand.logoUrl}
          alt={brand.logoAlt ?? brand.name ?? ''}
        />
      )}
      <div>
        <h2 className="dk-dashboard-title">{config.title}</h2>
        {config.description && <p className="dk-dashboard-description">{config.description}</p>}
      </div>
      {children}
    </header>
  );
}

/** Each widget's data effect depends on its query, so the widgets must keep their identity. */
export const useDashboardWidgets = (config: DashboardConfig) =>
  useMemo(() => applyDefaultFilters(config), [config]);

/** Loads the config, shows the loading and error states, and renders `children` once it is there. */
export function DashboardLoader({
  dashboardId,
  config,
  children,
}: DashboardProps & { children: (config: DashboardConfig) => ReactNode }) {
  const loaded = useDashboardConfig(dashboardId, config);
  return (
    <ThemeRoot>
      <div className="dk-dashboard">
        {loaded.error && <ErrorState error={loaded.error} />}
        {!loaded.error && !loaded.config && <Skeleton />}
        {loaded.config && children(loaded.config)}
      </div>
    </ThemeRoot>
  );
}

function DashboardContent({ config }: { config: DashboardConfig }) {
  const widgets = useDashboardWidgets(config);
  return (
    <>
      <DashboardHeader config={config} />
      <FilterBar />
      <DashboardGrid widgets={widgets} layout={config.layouts.lg} />
    </>
  );
}

/**
 * Shows one dashboard using the data API and theme of the surrounding {@link DashKitProvider}.
 * @example
 * <Dashboard dashboardId="overview" />
 */
export function Dashboard(props: DashboardProps) {
  return (
    <DashboardLoader {...props}>{(config) => <DashboardContent config={config} />}</DashboardLoader>
  );
}
