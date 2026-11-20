import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  addWidget,
  arrangeWidgets,
  duplicateWidget,
  nextWidgetId,
  removeWidget,
  toggleFilterControl,
  updateWidget,
  withYearRule,
} from '../core/config/edit-dashboard';
import { changedSetting, fitToCatalog } from '../core/config/edit-widget';
import {
  canRedo,
  canUndo,
  record,
  redo,
  startHistory,
  undo,
  type History,
} from '../core/config/history';
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
import { ChangedIcon, CheckIcon, RedoIcon, UndoIcon } from './builder/icons';
import { loadFieldCatalog, loadLatestYear, loadRole } from './builder/loaders';
import { Palette } from './builder/Palette';
import { useUnsavedChangesWarning } from './builder/use-unsaved-changes-warning';
import { WidgetActions } from './builder/WidgetActions';
import { BreakpointContext } from './breakpoint-context';
import { useDashKit } from './context';
import {
  DashboardHeader,
  DashboardLoader,
  useControlledFields,
  useDashboardWidgets,
  type DashboardProps,
} from './Dashboard';
import { DashboardGrid } from './DashboardGrid';
import { ControlledFieldsContext } from './controlled-fields-context';
import { FilterBar } from './FilterBar';
import { FilterControls } from './FilterControls';
import { ControlPicker } from './builder/ControlPicker';
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

// The builder's working copy of a dashboard, with every version since editing began.
interface Draft {
  base: DashboardConfig;
  history: History<DashboardConfig>;
}

const startDraft = (config: DashboardConfig): Draft => ({
  base: config,
  history: startHistory(config),
});

// Typing in a field undoes its own text, as everywhere else on the page.
const isTextField = (target: EventTarget) =>
  target instanceof Element && target.closest('input, textarea, [contenteditable="true"]') !== null;

interface BuilderProps {
  loadedConfig: DashboardConfig;
  isStartingInEdit: boolean;
  onSave: ((config: DashboardConfig) => void) | undefined;
}

function Builder({ loadedConfig, isStartingInEdit, onSave }: BuilderProps) {
  const { client, drafts } = useDashKit();
  const isEditor = useClientValue(loadRole).value === 'editor';
  const [saved, setSaved] = useState<Replacement>();
  const [draft, setDraft] = useState<Draft | undefined>(
    isStartingInEdit ? startDraft(loadedConfig) : undefined,
  );
  // Read by screen readers after an undo or redo, which otherwise changes the page silently.
  const [historyNote, setHistoryNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProblems, setSaveProblems] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [addedId, setAddedId] = useState<string>();
  // The button that opened the settings gets the focus back when they close.
  const openerRef = useRef<HTMLElement>(null);
  const panelId = useId();

  // The dashboard as the API holds it: as loaded, or as this builder last saved it.
  const savedConfig = saved?.base === loadedConfig ? saved.config : loadedConfig;
  const pendingHistory = isEditor && draft?.base === savedConfig ? draft.history : undefined;
  const pendingDraft = pendingHistory?.present;
  const hasUnsavedChanges = pendingDraft !== undefined && pendingDraft !== savedConfig;
  // In a narrow container the dashboard is only shown; a draft waits until there is room again.
  const isRoomy = canEditAt(useContext(BreakpointContext));
  const draftConfig = isRoomy ? pendingDraft : undefined;
  const isEditing = draftConfig !== undefined;
  const config = draftConfig ?? savedConfig;
  const widgets = useDashboardWidgets(config);
  const controlledFields = useControlledFields(config);
  const latestYear = useClientValue(loadLatestYear, isEditing).value;
  const fieldCatalog = useClientValue(loadFieldCatalog, isEditing);
  const selected = draftConfig?.widgets.find(({ id }) => id === selectedId);
  useUnsavedChangesWarning(hasUnsavedChanges);
  useEffect(() => (hasUnsavedChanges ? drafts.hold() : undefined), [drafts, hasUnsavedChanges]);

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
    setDraft(startDraft(savedConfig));
    setHistoryNote('');
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
        current && current.history.present !== draftConfig
          ? { base: stored, history: startHistory(current.history.present) }
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

  /** Applies an edit as one undo step, or as part of the last one when both share a `group`. */
  const editDraft = (edit: (current: DashboardConfig) => DashboardConfig, group?: string) => {
    setDraft(
      (current) =>
        current && {
          ...current,
          history: record(current.history, edit(current.history.present), group),
        },
    );
    // Any problems listed were about the dashboard before this change.
    setSaveProblems((current) => (current.length > 0 ? [] : current));
  };

  const travel = (step: 'undo' | 'redo') => {
    if (!pendingHistory) return;
    const moved = step === 'undo' ? undo(pendingHistory) : redo(pendingHistory);
    if (moved === pendingHistory) return;
    setDraft((current) => current && { ...current, history: moved });
    setSaveProblems([]);
    const left = step === 'undo' ? moved.past.length : moved.future.length;
    setHistoryNote(
      `${step === 'undo' ? 'Undid' : 'Redid'} a change. ${left === 0 ? 'No' : left} more to ${step}.`,
    );
  };

  // Ctrl or Cmd with Z undoes; with Shift+Z or Y it redoes. Only while the focus is inside the
  // dashboard, so the host page's own shortcuts are untouched.
  const handleShortcut = (event: KeyboardEvent) => {
    if (!isEditing || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if ((key !== 'z' && key !== 'y') || isTextField(event.target)) return;
    event.preventDefault();
    travel(key === 'y' || event.shiftKey ? 'redo' : 'undo');
  };

  // Only the lg layout is authored; smaller ones are derived from it.
  const changeLayout = (lg: LayoutItem[], group?: string) =>
    editDraft((current) => arrangeWidgets(current, lg), group);

  const addFromPalette = (type: WidgetType) => {
    const { defaultSize, starter } = widgetRegistry[type];
    const fromStarter: WidgetConfig = {
      id: nextWidgetId(config, type),
      type,
      ...starter,
      query: withYearRule(starter.query, latestYear),
    };
    const widget = fieldCatalog.value ? fitToCatalog(fromStarter, fieldCatalog.value) : fromStarter;
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
    <div className="dk-builder" onKeyDown={handleShortcut}>
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
                <p className="dk-visually-hidden" role="status">
                  {historyNote}
                </p>
                <button
                  type="button"
                  className="dk-button dk-button-icon"
                  aria-label="Undo"
                  title="Undo (Ctrl+Z)"
                  aria-keyshortcuts="Control+Z Meta+Z"
                  // Still focusable when there is nothing left, so the focus stays put.
                  aria-disabled={!pendingHistory || !canUndo(pendingHistory)}
                  onClick={() => travel('undo')}
                >
                  <UndoIcon />
                </button>
                <button
                  type="button"
                  className="dk-button dk-button-icon"
                  aria-label="Redo"
                  title="Redo (Ctrl+Y)"
                  aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
                  aria-disabled={!pendingHistory || !canRedo(pendingHistory)}
                  onClick={() => travel('redo')}
                >
                  <RedoIcon />
                </button>
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
      {isEditing && fieldCatalog.value && (
        <ControlPicker
          // A field with a default filter cannot have a control, so it is not offered.
          dimensions={fieldCatalog.value.dimensions.filter(
            ({ name }) => !config.defaultFilters?.some(({ field }) => field === name),
          )}
          controls={config.filterControls ?? []}
          onToggle={(field) => editDraft((current) => toggleFilterControl(current, field))}
        />
      )}
      {config.filterControls && <FilterControls controls={config.filterControls} />}
      <FilterBar />
      <div className="dk-builder-body">
        <ControlledFieldsContext.Provider value={controlledFields}>
          <DashboardGrid
            widgets={widgets}
            layouts={config.layouts}
            isEditing={isEditing}
            onLayoutChange={changeLayout}
            actionsFor={actionsFor}
          />
        </ControlledFieldsContext.Provider>
        {selected && (
          <ConfigPanel
            // A fresh panel for each widget, so focus starts at the title again.
            key={selected.id}
            id={panelId}
            widget={selected}
            catalog={fieldCatalog}
            latestYear={latestYear}
            onChange={(widget) => {
              const setting = changedSetting(selected, widget);
              editDraft(
                (current) => updateWidget(current, widget),
                setting && `${widget.id} ${setting}`,
              );
            }}
            onClose={closeSettings}
          />
        )}
      </div>
    </div>
  );
}

/**
 * A {@link Dashboard} that editors can change: they open the builder, arrange and configure widgets,
 * and save. Widgets move and resize by pointer or, from their handle, with the arrow keys. Nothing is stored until Save, and Cancel restores the saved dashboard. Undo and Redo,
 * in the toolbar or as Ctrl+Z and Ctrl+Y (Cmd on a Mac), step through the edits made since editing
 * began. Viewers only see the dashboard, and the API refuses their changes in any case.
 * @example
 * <DashboardBuilder dashboardId="overview" onSave={(config) => console.log(config.updatedAt)} />
 */
export function DashboardBuilder(props: DashboardBuilderProps) {
  return (
    <DashboardLoader {...props}>
      {(config) => (
        <Builder
          // Another dashboard starts with a fresh builder: no draft, history or open settings.
          key={config.id}
          loadedConfig={config}
          isStartingInEdit={props.mode === 'edit'}
          onSave={props.onSave}
        />
      )}
    </DashboardLoader>
  );
}
