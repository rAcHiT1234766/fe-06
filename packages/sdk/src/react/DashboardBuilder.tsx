import { useId, useRef, useState } from 'react';
import {
  addWidget,
  duplicateWidget,
  nextWidgetId,
  removeWidget,
  updateWidget,
  withYearRule,
} from '../core/config/edit-dashboard';
import type {
  DashboardConfig,
  DashKitOptions,
  LayoutItem,
  WidgetConfig,
  WidgetType,
} from '../core/types';
import { ConfigPanel } from './builder/ConfigPanel';
import { loadFieldCatalog, loadLatestYear, loadRole } from './builder/loaders';
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
import { useClientValue } from './hooks/use-client-value';
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
  const isEditor = useClientValue(loadRole).value === 'editor';
  const [draft, setDraft] = useState<Draft | undefined>(
    isStartingInEdit ? { base: savedConfig, config: savedConfig } : undefined,
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [addedId, setAddedId] = useState<string>();
  // The button that opened the settings gets the focus back when they close.
  const openerRef = useRef<HTMLElement>(null);
  const panelId = useId();

  const draftConfig = isEditor && draft?.base === savedConfig ? draft.config : undefined;
  const isEditing = draftConfig !== undefined;
  const config = draftConfig ?? savedConfig;
  const widgets = useDashboardWidgets(config);
  const latestYear = useClientValue(loadLatestYear, isEditing).value;
  const fieldCatalog = useClientValue(loadFieldCatalog, isEditing);
  const selected = draftConfig?.widgets.find(({ id }) => id === selectedId);

  const startEditing = () => {
    setDraft({ base: savedConfig, config: savedConfig });
    setSelectedId(undefined);
    setAddedId(undefined);
  };

  const editDraft = (edit: (current: DashboardConfig) => DashboardConfig) =>
    setDraft((current) => current && { ...current, config: edit(current.config) });

  // Only the lg layout is authored; smaller ones are derived from it.
  const changeLayout = (lg: LayoutItem[]) =>
    editDraft((current) => ({ ...current, layouts: { lg } }));

  const addFromPalette = (type: WidgetType) => {
    const { defaultSize, starter } = widgetRegistry[type];
    const widget: WidgetConfig = {
      id: nextWidgetId(config, type),
      type,
      ...starter,
      query: withYearRule(starter.query, latestYear),
    };
    editDraft((current) => addWidget(current, widget, defaultSize));
    setAddedId(widget.id);
  };

  const closeSettings = () => {
    setSelectedId(undefined);
    if (openerRef.current?.isConnected) openerRef.current.focus();
  };

  const toggleSettings = (widgetId: string, opener: HTMLElement) => {
    if (widgetId === selected?.id) {
      closeSettings();
    } else {
      openerRef.current = opener;
      setSelectedId(widgetId);
    }
  };

  const actionsFor = (widget: WidgetConfig) => (
    <WidgetActions
      widget={widget}
      panelId={panelId}
      isConfiguring={widget.id === selected?.id}
      isNew={widget.id === addedId}
      onConfigure={(button) => toggleSettings(widget.id, button)}
      onDuplicate={() => editDraft((current) => duplicateWidget(current, widget.id))}
      onRemove={() => editDraft((current) => removeWidget(current, widget.id))}
    />
  );

  return (
    <>
      <DashboardHeader config={config}>
        {isEditor && (
          <div className="dk-toolbar">
            {isEditing ? (
              <button type="button" className="dk-button" onClick={() => setDraft(undefined)}>
                Cancel
              </button>
            ) : (
              <button type="button" className="dk-button" onClick={startEditing}>
                Edit dashboard
              </button>
            )}
          </div>
        )}
      </DashboardHeader>
      {isEditing && <Palette onAdd={addFromPalette} />}
      <FilterBar />
      <div className="dk-builder-body">
        <DashboardGrid
          widgets={widgets}
          layout={config.layouts.lg}
          isEditing={isEditing}
          onLayoutChange={changeLayout}
          actionsFor={actionsFor}
        />
        {selected && (
          <ConfigPanel
            // A fresh panel for each widget, so focus starts at the title again.
            key={selected.id}
            id={panelId}
            widget={selected}
            catalog={fieldCatalog}
            latestYear={latestYear}
            onChange={(widget) => editDraft((current) => updateWidget(current, widget))}
            onClose={closeSettings}
          />
        )}
      </div>
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
