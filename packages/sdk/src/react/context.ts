import { createContext, useContext } from 'react';
import type { DraftRegistry } from '../core/draft-registry';
import type { FilterStore } from '../core/filter-store';
import type { QueryClient } from '../core/query-client';
import type { RenderTiming } from '../core/render-timing';
import type { ResolvedTheme } from '../core/theme/create-theme';
import type { DashKitError } from '../core/types';

interface DashKitContextValue {
  client: QueryClient;
  filterStore: FilterStore;
  theme: ResolvedTheme;
  /** Passes an error to the host's `onError`. Failed requests are passed on by the client itself. */
  reportError: (error: DashKitError) => void;
  timing: RenderTiming;
  /** Whether widgets offer their data as a CSV download. */
  allowExport: boolean;
  /** Whether a builder has unsaved changes, which a dashboard picker waits for. */
  drafts: DraftRegistry;
}

export const DashKitContext = createContext<DashKitContextValue | null>(null);

export function useDashKit(): DashKitContextValue {
  const value = useContext(DashKitContext);
  if (!value) throw new Error('DashKit components must be placed inside a <DashKitProvider>.');
  return value;
}
