import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import type { QueryClient } from '../core/query-client';
import { slugify, unusedId } from '../core/slug';
import type { DashboardConfig, DashboardSummary, DashKitError } from '../core/types';
import { loadRole } from './builder/loaders';
import { useDashKit } from './context';
import { useClientValue } from './hooks/use-client-value';
import { ThemeRoot } from './ThemeRoot';

/** Props for {@link DashboardPicker}. The host keeps the id of the dashboard shown. */
export interface DashboardPickerProps {
  /** The id of the dashboard shown. */
  value: string;
  /** Called with the id of the dashboard chosen, created, or shown in place of one deleted. */
  onChange: (dashboardId: string) => void;
}

/** The tenant's dashboards, loaded again after each one saved or deleted through the client. */
function useDashboardList(): DashboardSummary[] | undefined {
  const { client } = useDashKit();
  const [changes, setChanges] = useState(0);
  useEffect(() => client.subscribeToDashboards(() => setChanges((count) => count + 1)), [client]);
  const [loaded, setLoaded] = useState<{ client: QueryClient; list: DashboardSummary[] }>();
  useEffect(() => {
    const controller = new AbortController();
    client.listDashboards(controller.signal).then(
      (list) => {
        if (!controller.signal.aborted) setLoaded({ client, list });
      },
      // The client has passed the error to the host's onError; the shown dashboard stays listed.
      () => undefined,
    );
    return () => controller.abort();
  }, [client, changes]);
  return loaded?.client === client ? loaded.list : undefined;
}

type Step = 'choosing' | 'naming' | 'confirming';
type FocusTarget = 'list' | 'new' | 'delete' | 'title' | 'keep';

/**
 * A list of the tenant's dashboards, to show another one, with **New dashboard** and **Delete
 * dashboard** for editors. While a builder under the same provider has unsaved changes the list
 * waits, so they are never lost to a switch. Switching clears the cross-filters, which belong to
 * the widgets of the dashboard they were made on.
 * @example
 * const [dashboardId, setDashboardId] = useState('overview');
 * <DashboardPicker value={dashboardId} onChange={setDashboardId} />
 * <DashboardBuilder dashboardId={dashboardId} />
 */
export function DashboardPicker({ value, onChange }: DashboardPickerProps) {
  const { client, filterStore, drafts } = useDashKit();
  const isEditor = useClientValue(loadRole).value === 'editor';
  const dashboards = useDashboardList();
  const hasUnsaved = useSyncExternalStore(drafts.subscribe, drafts.hasUnsaved, drafts.hasUnsaved);
  const [step, setStep] = useState<Step>('choosing');
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const listId = useId();
  const titleId = useId();
  const questionId = useId();

  // Each step change puts the focus where the next action is, or back where the last one began.
  const focusTarget = useRef<FocusTarget>(undefined);
  const listRef = useRef<HTMLSelectElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    const elements = {
      list: listRef,
      new: newRef,
      delete: deleteRef,
      title: titleRef,
      keep: keepRef,
    };
    elements[target].current?.focus();
    focusTarget.current = undefined;
  });
  const goTo = (next: Step, target: FocusTarget) => {
    setStep(next);
    setProblem(undefined);
    focusTarget.current = target;
  };

  // A dashboard that is not listed, such as one still loading, is shown under its id.
  const listed = dashboards ?? [];
  const options = listed.some(({ id }) => id === value)
    ? listed
    : [...listed, { id: value, title: value }];
  const current = options.find(({ id }) => id === value);

  const show = (id: string) => {
    filterStore.clearAll();
    onChange(id);
  };

  async function act(action: () => Promise<void>) {
    setIsBusy(true);
    setProblem(undefined);
    try {
      await action();
    } catch (error) {
      // The query client rejects only with a DashKitError.
      setProblem((error as DashKitError).message);
    } finally {
      setIsBusy(false);
    }
  }

  const create = (event: FormEvent) => {
    event.preventDefault();
    const name = title.trim();
    if (name === '') return;
    void act(async () => {
      // Read again just before choosing, so an id another editor took meanwhile is not replaced.
      const taken = (await client.listDashboards()).map(({ id }) => id);
      const created: DashboardConfig = {
        id: unusedId(slugify(name, 'dashboard'), taken),
        schemaVersion: 1,
        title: name,
        widgets: [],
        layouts: { lg: [] },
      };
      await client.saveDashboard(created);
      setTitle('');
      goTo('choosing', 'list');
      show(created.id);
    });
  };

  const remove = () =>
    void act(async () => {
      await client.deleteDashboard(value);
      const next = options.find(({ id }) => id !== value);
      goTo('choosing', 'list');
      if (next) show(next.id);
    });

  return (
    <ThemeRoot>
      <div className="dk-dashboard-picker">
        {step === 'naming' && (
          <form className="dk-dashboard-picker-row" onSubmit={create}>
            <label htmlFor={titleId} className="dk-field-label">
              Title of the new dashboard
            </label>
            <input
              id={titleId}
              ref={titleRef}
              className="dk-input"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <button
              type="submit"
              className="dk-button dk-button-primary"
              disabled={isBusy || hasUnsaved || title.trim() === ''}
            >
              Create
            </button>
            <button type="button" className="dk-button" onClick={() => goTo('choosing', 'new')}>
              Cancel
            </button>
          </form>
        )}
        {step === 'confirming' && current && (
          <div className="dk-dashboard-picker-row" role="group" aria-labelledby={questionId}>
            <p id={questionId} className="dk-dashboard-picker-question">
              Delete “{current.title}”? Its widgets cannot be restored.
            </p>
            <button
              type="button"
              className="dk-button dk-button-danger"
              disabled={isBusy || hasUnsaved}
              onClick={remove}
            >
              Delete
            </button>
            <button
              type="button"
              ref={keepRef}
              className="dk-button"
              onClick={() => goTo('choosing', 'delete')}
            >
              Keep
            </button>
          </div>
        )}
        {step === 'choosing' && (
          <div className="dk-dashboard-picker-row">
            <label htmlFor={listId} className="dk-field-label">
              Dashboard
            </label>
            <select
              id={listId}
              ref={listRef}
              className="dk-input"
              value={value}
              disabled={hasUnsaved}
              onChange={(event) => show(event.currentTarget.value)}
            >
              {options.map(({ id, title: optionTitle }) => (
                <option key={id} value={id}>
                  {optionTitle}
                </option>
              ))}
            </select>
            {isEditor && (
              <>
                <button
                  type="button"
                  ref={newRef}
                  className="dk-button"
                  disabled={hasUnsaved}
                  onClick={() => goTo('naming', 'title')}
                >
                  New dashboard
                </button>
                {/* The last dashboard stays, so there is always one to show. */}
                {options.length > 1 && (
                  <button
                    type="button"
                    ref={deleteRef}
                    className="dk-button"
                    disabled={hasUnsaved}
                    onClick={() => goTo('confirming', 'keep')}
                  >
                    Delete dashboard
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {hasUnsaved && (
          <p className="dk-dashboard-picker-note">
            Save or cancel the changes to this dashboard before you switch to another.
          </p>
        )}
        {problem && (
          <p className="dk-dashboard-picker-problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </ThemeRoot>
  );
}
