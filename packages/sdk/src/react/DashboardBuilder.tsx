import { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  addWidget,
  arrangeWidgets,
  duplicateWidget,
  nextWidgetId,
  removeWidget,
  updateWidget,
  withYearRule,
} from '../core/config/edit-dashboard';
import { canEditAt } from '../core/config/layout';
import { validateDashboard } from '../core/config/schema';
import type {
  DashboardConfig,
  DashKitError,
  DashKitOptions,
  LayoutItem,
  WidgetConfig,
  WidgetType,
} from '../core/types';
import { ConfigPanel } from './builder/ConfigPanel';
import { ChangedIcon, CheckIcon } from './builder/icons';
import { loadFieldCatalog, loadLatestYear, loadRole } from './builder/loaders';
import { Palette } from './builder/Palette';
import { useUnsavedChangesWarning } from './builder/use-unsaved-changes-warning';
import { WidgetActions } from './builder/WidgetActions';
import { BreakpointContext } from './breakpoint-context';
import { useDashKit } from './context';
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

/**
 * Props for {@link DashboardBuilder}. With `mode: 'edit'` an editor starts in the builder.
 * `onSave` receives the dashboard as the API stored it.
 */
export type DashboardBuilderProps = DashboardProps & Pick<DashKitOptions, 'mode' | 'onSave'>;

// A config that replaces `base` for as long as `base` is current. Remembering the base means a
// draft or a saved copy never outlives a reload or a change of user.
interface Replacement {
  base: DashboardConfig;
  config: DashboardConfig;
}

interface BuilderProps {
  loadedConfig: DashboardConfig;
  isStartingInEdit: boolean;
  onSave: ((config: DashboardConfig) => void) | undefined;
}

function Builder({ loadedConfig, isStartingInEdit, onSave }: BuilderProps) {
  const { client } = useDashKit();
  const isEditor = useClientValue(loadRole).value === 'editor';
  const [saved, setSaved] = useState<Replacement>();
  const [draft, setDraft] = useState<Replacement | undefined>(
    isStartingInEdit ? { base: loadedConfig, config: loadedConfig } : undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveProblems, setSaveProblems] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [addedId, setAddedId] = useState<string>();
  // The button that opened the settings gets the focus back when they close.
  const openerRef = useRef<HTMLElement>(null);
  const panelId = useId();

  // The dashboard as the API holds it: as loaded, or as this builder last saved it.
  const savedConfig = saved?.base === loadedConfig ? saved.config : loadedConfig;
  const pendingDraft = isEditor && draft?.base === savedConfig ? draft.config : undefined;
  const hasUnsavedChanges = pendingDraft !== undefined && pendingDraft !== savedConfig;
  // In a narrow container the dashboard is only shown; a draft waits until there is room again.
  const isRoomy = canEditAt(useContext(BreakpointContext));
  const draftConfig = isRoomy ? pendingDraft : undefined;
  const isEditing = draftConfig !== undefined;
  const config = draftConfig ?? savedConfig;
  const widgets = useDashboardWidgets(config);
  const latestYear = useClientValue(loadLatestYear, isEditing).value;
  const fieldCatalog = useClientValue(loadFieldCatalog, isEditing);
  const selected = draftConfig?.widgets.find(({ id }) => id === selectedId);
  useUnsavedChangesWarning(hasUnsavedChanges);

  // Cancel and Save disappear with the builder, so the focus moves to Edit dashboard. A layout
  // effect moves it in the same update that removes them, so it never rests on the page body.
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const isLeavingRef = useRef(false);
  useLayoutEffect(() => {
    if (!isLeavingRef.current || isEditing) return;
    isLeavingRef.current = false;
    editButtonRef.current?.focus();
  });

  const startEditing = () => {
    setDraft({ base: savedConfig, config: savedConfig });
    setSaveProblems([]);
    setSelectedId(undefined);
    setAddedId(undefined);
  };

  const cancel = () => {
    isLeavingRef.current = true;
    setDraft(undefined);
  };

  const save = async () => {
    if (!draftConfig) return;
    const problems = validateDashboard(draftConfig);
    setSaveProblems(problems);
    if (problems.length > 0) return;
    setIsSaving(true);
    try {
      const stored = await client.saveDashboard(draftConfig);
      isLeavingRef.current = true;
      setSaved({ base: loadedConfig, config: stored });
      // Changes made while the save was on its way stay in the builder, on top of what was saved.
      setDraft((current) =>
        current && current.config !== draftConfig
          ? { base: stored, config: current.config }
          : undefined,
      );
      onSave?.(stored);
    } catch (error) {
      // The query client rejects only with a DashKitError.
      setSaveProblems([(error as DashKitError).message]);
    } finally {
      setIsSaving(false);
    }
  };

  const editDraft = (edit: (current: DashboardConfig) => DashboardConfig) => {
    setDraft((current) => current && { ...current, config: edit(current.config) });
    // Any problems listed were about the dashboard before this change.
    setSaveProblems((current) => (current.length > 0 ? [] : current));
  };

  // Only the lg layout is authored; smaller ones are derived from it.
  const changeLayout = (lg: LayoutItem[]) => editDraft((current) => arrangeWidgets(current, lg));

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

  // In the theme's success and warning colours, each with an icon and words, so that the colour
  // is never the only signal.
  const saveStatus =
    !isEditing && saved?.base === loadedConfig
      ? 'saved'
      : isEditing && hasUnsavedChanges
        ? 'unsaved'
        : undefined;

  return (
    <>
      <DashboardHeader config={config}>
        {isEditor && !isRoomy && (
          <p className="dk-toolbar-note">
            {hasUnsavedChanges
              ? 'Your unsaved changes are kept until there is room to edit again.'
              : 'Editing needs a wider screen.'}
          </p>
        )}
        {isEditor && isRoomy && (
          <div className="dk-toolbar">
            <p className="dk-toolbar-status" role="status" data-dk-status={saveStatus}>
              {saveStatus === 'saved' && (
                <>
                  <CheckIcon />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <ChangedIcon />
                  <span>Unsaved changes</span>
                </>
              )}
            </p>
            {isEditing ? (
              <>
                <button type="button" className="dk-button" disabled={isSaving} onClick={cancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="dk-button dk-button-primary"
                  disabled={isSaving}
                  onClick={() => void save()}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button
                ref={editButtonRef}
                type="button"
                className="dk-button"
                onClick={startEditing}
              >
                Edit dashboard
              </button>
            )}
          </div>
        )}
      </DashboardHeader>
      {isEditing && saveProblems.length > 0 && (
        <div className="dk-save-problems" role="alert">
          <p>The dashboard was not saved.</p>
          <ul>
            {saveProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      {isEditing && <Palette onAdd={addFromPalette} />}
      <FilterBar />
      <div className="dk-builder-body">
        <DashboardGrid
          widgets={widgets}
          layouts={config.layouts}
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
 * and save. Nothing is stored until Save, and Cancel restores the saved dashboard. Viewers only
 * see the dashboard, and the API refuses their changes in any case.
 * @example
 * <DashboardBuilder dashboardId="overview" onSave={(config) => console.log(config.updatedAt)} />
 */
export function DashboardBuilder(props: DashboardBuilderProps) {
  return (
    <DashboardLoader {...props}>
      {(config) => (
        <Builder
          loadedConfig={config}
          isStartingInEdit={props.mode === 'edit'}
          onSave={props.onSave}
        />
      )}
    </DashboardLoader>
  );
}
