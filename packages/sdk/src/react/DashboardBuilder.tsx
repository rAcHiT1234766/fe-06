import { useState } from 'react';
import type { DashboardConfig, DashKitOptions, LayoutItem } from '../core/types';
import {
  DashboardHeader,
  DashboardLoader,
  useDashboardWidgets,
  type DashboardProps,
} from './Dashboard';
import { DashboardGrid } from './DashboardGrid';
import { FilterBar } from './FilterBar';
import { useIsEditor } from './hooks/use-is-editor';

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
  const config = draftConfig ?? savedConfig;
  const widgets = useDashboardWidgets(config);

  // Only the lg layout is authored; smaller ones are derived from it.
  const changeLayout = (lg: LayoutItem[]) =>
    setDraft(
      (current) => current && { ...current, config: { ...current.config, layouts: { lg } } },
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
      <FilterBar />
      <DashboardGrid
        widgets={widgets}
        layout={config.layouts.lg}
        isEditing={draftConfig !== undefined}
        onLayoutChange={changeLayout}
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
