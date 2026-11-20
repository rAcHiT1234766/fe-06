import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createDraftRegistry } from '../core/draft-registry';
import { createFilterStore } from '../core/filter-store';
import { QueryClient } from '../core/query-client';
import { RenderTiming } from '../core/render-timing';
import { findLowContrastPairs } from '../core/theme/contrast';
import { createTheme, resolveTheme } from '../core/theme/create-theme';
import type { ActiveFilter, DashKitError, DashKitOptions } from '../core/types';
import { DashKitContext } from './context';
import { isProduction } from './environment';

/** Props for {@link DashKitProvider}. Pass `token`, `getToken`, or both. */
export interface DashKitProviderProps extends Pick<
  DashKitOptions,
  'apiUrl' | 'token' | 'getToken' | 'theme' | 'allowExport' | 'onFilterChange' | 'onError'
> {
  /**
   * Replaces the active cross-filters whenever a new array is passed, for example from the host's
   * own controls. Clicks in the dashboard still change them and are reported to `onFilterChange`.
   */
  filters?: ActiveFilter[];
  /** The dashboards and builders that use this connection, theme and set of filters. */
  children: ReactNode;
}

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function subscribeToColorScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_MODE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const systemPrefersDark = () => window.matchMedia(DARK_MODE_QUERY).matches;

/**
 * Connects a dashboard to the data API and gives it a theme and its cross-filters. Nothing is
 * shared between providers, so give each dashboard on a page its own provider.
 * @example
 * <DashKitProvider apiUrl="https://api.example.com" getToken={fetchEmbedToken} theme={{ mode: 'auto' }}>
 *   <Dashboard dashboardId="overview" />
 * </DashKitProvider>
 */
export function DashKitProvider({
  apiUrl,
  token,
  getToken,
  theme,
  allowExport = false,
  filters,
  onFilterChange,
  onError,
  children,
}: DashKitProviderProps) {
  // A new token may belong to a different user, so it gets a new client with an empty cache.
  const client = useMemo(() => new QueryClient({ apiUrl, token }), [apiUrl, token]);
  // A layout effect, so getToken is in place before any widget's data effect sends a request.
  useLayoutEffect(() => client.setGetToken(getToken), [client, getToken]);

  // Like onFilterChange below, errors go to whichever onError the latest render passed.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const reportError = useCallback((error: DashKitError) => onErrorRef.current?.(error), []);
  useLayoutEffect(() => client.setOnError(reportError), [client, reportError]);

  // Starting from the host's filters means the first queries are already filtered.
  const [filterStore] = useState(() => createFilterStore(filters));
  // The store is subscribed once and calls whichever onFilterChange the latest render passed.
  // Resubscribing for each new callback would miss changes made while it was unsubscribed.
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  });
  useEffect(() => {
    if (filters) filterStore.set(filters);
  }, [filterStore, filters]);
  useEffect(
    () => filterStore.subscribe(() => onFilterChangeRef.current?.(filterStore.getFilters())),
    [filterStore],
  );
  const [timing] = useState(() => new RenderTiming());
  const [drafts] = useState(createDraftRegistry);
  useEffect(() => filterStore.subscribe(() => timing.filtersChanged()), [filterStore, timing]);

  const prefersDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  const resolvedTheme = useMemo(
    () => resolveTheme(createTheme(theme), prefersDark),
    [theme, prefersDark],
  );

  useEffect(() => {
    if (isProduction()) return;
    const lowContrastPairs = findLowContrastPairs(resolvedTheme.colors);
    if (lowContrastPairs.length > 0) {
      console.warn(
        `DashKit theme (${resolvedTheme.mode} mode): ${lowContrastPairs.join(', ')} below the WCAG AA contrast of 4.5:1.`,
      );
    }
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ client, filterStore, theme: resolvedTheme, reportError, timing, allowExport, drafts }),
    [client, filterStore, resolvedTheme, reportError, timing, allowExport, drafts],
  );
  return <DashKitContext.Provider value={value}>{children}</DashKitContext.Provider>;
}
