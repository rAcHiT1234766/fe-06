import { useMemo } from 'react';
import { applyDefaultFilters } from '../core/merge-query';
import type { DashboardConfig } from '../core/types';
import { useDashKit } from './context';
import { FilterBar } from './FilterBar';
import { useDashboardConfig } from './hooks/use-dashboard-config';
import { ThemeRoot } from './ThemeRoot';
import { ErrorState } from './ui/ErrorState';
import { Skeleton } from './ui/Skeleton';
import { WidgetFrame } from './widgets/WidgetFrame';

/** Props for {@link Dashboard}: the id of a saved dashboard, or a config to show directly. */
export type DashboardProps =
  | { dashboardId: string; config?: undefined }
  | { config: DashboardConfig; dashboardId?: undefined };

function DashboardContent({ config }: { config: DashboardConfig }) {
  const { brand } = useDashKit().theme;
  // Each widget's data effect depends on its query, so the widgets must keep their identity.
  const widgets = useMemo(() => applyDefaultFilters(config), [config]);
  // Widgets follow the layout's reading order, so keyboard and screen reader order match the screen.
  const layout = config.layouts.lg.toSorted((a, b) => a.y - b.y || a.x - b.x);
  return (
    <>
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
      </header>
      <FilterBar />
      <div className="dk-grid">
        {layout.map(({ i, x, y, w, h }) => {
          const widget = widgets.find((candidate) => candidate.id === i);
          if (!widget) return null;
          const placement = { gridColumn: `${x + 1} / span ${w}`, gridRow: `${y + 1} / span ${h}` };
          return (
            <div key={i} className="dk-grid-cell" style={placement}>
              <WidgetFrame widget={widget} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Shows one dashboard using the data API and theme of the surrounding {@link DashKitProvider}.
 * @example
 * <Dashboard dashboardId="overview" />
 */
export function Dashboard({ dashboardId, config }: DashboardProps) {
  const loaded = useDashboardConfig(dashboardId, config);
  return (
    <ThemeRoot>
      <div className="dk-dashboard">
        {loaded.error && <ErrorState error={loaded.error} />}
        {!loaded.error && !loaded.config && <Skeleton />}
        {loaded.config && <DashboardContent config={loaded.config} />}
      </div>
    </ThemeRoot>
  );
}
