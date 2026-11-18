import { useContext, useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { breakpointFor } from '../core/config/layout';
import { applyDefaultFilters } from '../core/merge-query';
import type { DashboardConfig } from '../core/types';
import { useDashKit } from './context';
import { BreakpointContext } from './breakpoint-context';
import { DashboardGrid } from './DashboardGrid';
import { ControlledFieldsContext } from './controlled-fields-context';
import { FilterBar } from './FilterBar';
import { FilterControls } from './FilterControls';
import { useDashboardConfig } from './hooks/use-dashboard-config';
import { useMeasuredWidth } from './hooks/use-measured-width';
import { DashboardReadyContext } from './ready-context';
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
  const { timing } = useDashKit();
  useLayoutEffect(() => timing.mounted(), [timing]);
  const onReady = useContext(DashboardReadyContext);
  const isSettled = loaded.config !== undefined || loaded.error !== undefined;
  useEffect(() => {
    if (isSettled) onReady?.();
  }, [isSettled, onReady]);
  // The layout follows the width of the dashboard's container, not of the window.
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const breakpoint = breakpointFor(width);

  return (
    <ThemeRoot>
      <div ref={ref} className="dk-dashboard" data-dk-breakpoint={breakpoint}>
        <BreakpointContext.Provider value={breakpoint}>
          {loaded.error && <ErrorState error={loaded.error} />}
          {!loaded.error && !loaded.config && <Skeleton />}
          {loaded.config && children(loaded.config)}
        </BreakpointContext.Provider>
      </div>
    </ThemeRoot>
  );
}

/** The fields of the dashboard's filter controls, the same list while the controls stay. */
export const useControlledFields = ({ filterControls }: DashboardConfig) =>
  useMemo(() => filterControls?.map(({ field }) => field) ?? [], [filterControls]);

function DashboardContent({ config }: { config: DashboardConfig }) {
  const widgets = useDashboardWidgets(config);
  return (
    <>
      <DashboardHeader config={config} />
      {config.filterControls && <FilterControls controls={config.filterControls} />}
      <FilterBar />
      <ControlledFieldsContext.Provider value={useControlledFields(config)}>
        <DashboardGrid widgets={widgets} layouts={config.layouts} />
      </ControlledFieldsContext.Provider>
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
