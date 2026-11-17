import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createFilterStore } from '../core/filter-store';
import { QueryClient } from '../core/query-client';
import { findLowContrastPairs } from '../core/theme/contrast';
import { createTheme, resolveTheme } from '../core/theme/create-theme';
import type { ActiveFilter, DashKitOptions } from '../core/types';
import { DashKitContext } from './context';

/** Props for {@link DashKitProvider}. Pass `token`, `getToken`, or both. */
export interface DashKitProviderProps extends Pick<
  DashKitOptions,
  'apiUrl' | 'token' | 'getToken' | 'theme' | 'onFilterChange'
> {
  /**
   * Replaces the active cross-filters whenever a new array is passed, for example from the host's
   * own controls. Clicks in the dashboard still change them and are reported to `onFilterChange`.
   */
  filters?: ActiveFilter[];
  children: ReactNode;
}

// The host's bundler replaces this at build time, the same convention React relies on. Declaring it
// here keeps the browser source independent of Node's types.
declare const process: { env: { NODE_ENV?: string } };

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
  filters,
  onFilterChange,
  children,
}: DashKitProviderProps) {
  // A new token may belong to a different user, so it gets a new client with an empty cache.
  const client = useMemo(() => new QueryClient({ apiUrl, token }), [apiUrl, token]);
  // A layout effect, so getToken is in place before any widget's data effect sends a request.
  useLayoutEffect(() => client.setGetToken(getToken), [client, getToken]);

  // Starting from the host's filters means the first queries are already filtered.
  const [filterStore] = useState(() => createFilterStore(filters));
  useEffect(() => {
    if (filters) filterStore.set(filters);
  }, [filterStore, filters]);
  useEffect(() => {
    if (!onFilterChange) return;
    return filterStore.subscribe(() => onFilterChange(filterStore.getFilters()));
  }, [filterStore, onFilterChange]);

  const prefersDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  const resolvedTheme = useMemo(
    () => resolveTheme(createTheme(theme), prefersDark),
    [theme, prefersDark],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const lowContrastPairs = findLowContrastPairs(resolvedTheme.colors);
    if (lowContrastPairs.length > 0) {
      console.warn(
        `DashKit theme (${resolvedTheme.mode} mode): ${lowContrastPairs.join(', ')} below the WCAG AA contrast of 4.5:1.`,
      );
    }
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ client, filterStore, theme: resolvedTheme }),
    [client, filterStore, resolvedTheme],
  );
  return <DashKitContext.Provider value={value}>{children}</DashKitContext.Provider>;
}
