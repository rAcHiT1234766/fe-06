import { useState } from 'react';
import {
  addWidget,
  duplicateWidget,
  removeWidget,
  withYearRule,
} from '../core/config/edit-dashboard';
import type {
  DashboardConfig,
  DashKitOptions,
  LayoutItem,
  WidgetConfig,
  WidgetType,
} from '../core/types';
import { Palette } from './builder/Palette';
import { WidgetActions } from './builder/WidgetActions';
import {
  DashboardHeader,
  DashboardLoader,
  useDashboardWidgets,
  type DashboardProps,
} from './Dashboard';
import { DashboardGrid } from './DashboardGrid';
import { FilterBar } from './FilterBar';
import { useIsEditor } from './hooks/use-is-editor';
import { useLatestYear } from './hooks/use-latest-year';
import { widgetRegistry } from './widgets/registry';

/** Props for {@link DashboardBuilder}. With `mode: 'edit'` an editor starts in the builder. */
export type DashboardBuilderProps = DashboardProps & Pick<DashKitOptions, 'mode'>;

// Remembers which saved config the draft started from, so a draft never outlives a reload or a
// change of user.
interface Draft {
  base: DashboardConfig;
  config: DashboardConfig;
}

function Builder({
  savedConfig,
  isStartingInEdit,
}: {
  savedConfig: DashboardConfig;
  isStartingInEdit: boolean;
}) {
  const isEditor = useIsEditor();
  const [draft, setDraft] = useState<Draft | undefined>(
    isStartingInEdit ? { base: savedConfig, config: savedConfig } : undefined,
  );
  const draftConfig = isEditor && draft?.base === savedConfig ? draft.config : undefined;
  const isEditing = draftConfig !== undefined;
  const config = draftConfig ?? savedConfig;
  const widgets = useDashboardWidgets(config);
  const latestYear = useLatestYear(isEditing);

  const editDraft = (edit: (current: DashboardConfig) => DashboardConfig) =>
    setDraft((current) => current && { ...current, config: edit(current.config) });

  // Only the lg layout is authored; smaller ones are derived from it.
  const changeLayout = (lg: LayoutItem[]) =>
    editDraft((current) => ({ ...current, layouts: { lg } }));

  const addFromPalette = (type: WidgetType) => {
    const { defaultSize, starter } = widgetRegistry[type];
    const widget = { type, ...starter, query: withYearRule(starter.query, latestYear) };
    editDraft((current) => addWidget(current, widget, defaultSize));
  };

  const actionsFor = (widget: WidgetConfig) => (
    <WidgetActions
      widget={widget}
      onDuplicate={() => editDraft((current) => duplicateWidget(current, widget.id))}
      onRemove={() => editDraft((current) => removeWidget(current, widget.id))}
    />
  );

  return (
    <>
      <DashboardHeader config={config}>
        {isEditor && (
          <div className="dk-toolbar">
            {draftConfig ? (
              <button type="button" className="dk-button" onClick={() => setDraft(undefined)}>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="dk-button"
                onClick={() => setDraft({ base: savedConfig, config: savedConfig })}
              >
                Edit dashboard
              </button>
            )}
          </div>
        )}
      </DashboardHeader>
      {isEditing && <Palette onAdd={addFromPalette} />}
      <FilterBar />
      <DashboardGrid
        widgets={widgets}
        layout={config.layouts.lg}
        isEditing={isEditing}
        onLayoutChange={changeLayout}
        actionsFor={actionsFor}
      />
    </>
  );
}

/**
 * A {@link Dashboard} that editors can change: they open the builder, arrange and configure widgets,
 * and save. Viewers only see the dashboard, and the API refuses their changes in any case.
 * @example
 * <DashboardBuilder dashboardId="overview" />
 */
export function DashboardBuilder(props: DashboardBuilderProps) {
  return (
    <DashboardLoader {...props}>
      {(config) => <Builder savedConfig={config} isStartingInEdit={props.mode === 'edit'} />}
    </DashboardLoader>
  );
}
