import { useId, useLayoutEffect, type ReactNode } from 'react';
import type { DashKitError, QueryResult, WidgetConfig } from '../../core/types';
import { useDashKit } from '../context';
import { useWidgetData } from '../hooks/use-widget-data';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { ExportButton } from './ExportButton';
import { widgetRegistry } from './registry';

interface WidgetBodyProps {
  widget: WidgetConfig;
  data: QueryResult | undefined;
  error: DashKitError | undefined;
}

function WidgetBody({ widget, data, error }: WidgetBodyProps) {
  if (error) return <ErrorState error={error} />;
  if (!data) return <Skeleton />;
  if (data.rows.length === 0) return <p className="dk-state">No data for this selection</p>;
  const View = widgetRegistry[widget.type].view;
  return <View widget={widget} result={data} />;
}

interface WidgetFrameProps {
  widget: WidgetConfig;
  /** Controls shown next to the title, such as the builder's widget actions. */
  actions?: ReactNode;
  /** Offers the widget's data as a CSV download once there is some. */
  canExport?: boolean;
}

export function WidgetFrame({ widget, actions, canExport = false }: WidgetFrameProps) {
  const titleId = useId();
  const { data, error, isFetching } = useWidgetData(widget);
  // A first load shows a skeleton; later loads keep the old result and show a bar instead.
  const isUpdating = isFetching && Boolean(data ?? error);

  // The views report when they have drawn a result; the frame reports waiting, and the states that
  // have no view.
  const { timing } = useDashKit();
  const hasView = !error && data !== undefined && data.rows.length > 0;
  useLayoutEffect(() => {
    timing.fetching(widget.id, isFetching);
    if (!isFetching && !hasView) timing.finished(widget.id, 'other');
  }, [timing, widget.id, isFetching, hasView, data, error]);
  useLayoutEffect(() => () => timing.removed(widget.id), [timing, widget.id]);
  return (
    <section className="dk-widget" aria-labelledby={titleId} aria-busy={isUpdating}>
      {isUpdating && <div className="dk-progress" aria-hidden="true" />}
      <header className="dk-widget-header">
        <h3 id={titleId} className="dk-widget-title">
          {widget.title}
        </h3>
        {canExport && hasView && data && (
          <div className="dk-widget-actions">
            <ExportButton title={widget.title} result={data} />
          </div>
        )}
        {actions}
      </header>
      <div className="dk-widget-body">
        <WidgetBody widget={widget} data={data} error={error} />
      </div>
    </section>
  );
}
