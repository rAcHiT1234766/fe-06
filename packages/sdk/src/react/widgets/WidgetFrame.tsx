import { useId } from 'react';
import type { DashKitError, QueryResult, WidgetConfig } from '../../core/types';
import { useWidgetData } from '../hooks/use-widget-data';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { widgetViews } from './views';

interface WidgetBodyProps {
  widget: WidgetConfig;
  data: QueryResult | undefined;
  error: DashKitError | undefined;
}

function WidgetBody({ widget, data, error }: WidgetBodyProps) {
  if (error) return <ErrorState error={error} />;
  if (!data) return <Skeleton />;
  if (data.rows.length === 0) return <p className="dk-state">No data for this selection</p>;
  const View = widgetViews[widget.type];
  return <View widget={widget} result={data} />;
}

export function WidgetFrame({ widget }: { widget: WidgetConfig }) {
  const titleId = useId();
  const { data, error } = useWidgetData(widget);
  return (
    <section className="dk-widget" aria-labelledby={titleId}>
      <header className="dk-widget-header">
        <h3 id={titleId} className="dk-widget-title">
          {widget.title}
        </h3>
      </header>
      <div className="dk-widget-body">
        <WidgetBody widget={widget} data={data} error={error} />
      </div>
    </section>
  );
}
