import { useSyncExternalStore } from 'react';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function subscribeToColorScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_MODE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const systemPrefersDark = () => window.matchMedia(DARK_MODE_QUERY).matches;

/** The mode the dashboard is shown in, so that the product around it can match: `auto` follows the system. */
export function useShownMode(mode: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  const prefersDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  if (mode !== 'auto') return mode;
  return prefersDark ? 'dark' : 'light';
}

export const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'orders', label: 'Orders' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
] as const;

export type PageId = (typeof PAGES)[number]['id'];

function subscribeToAddress(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

// Analytics, where the dashboard is embedded, is the page the demo opens on.
const pageInAddress = (): PageId =>
  PAGES.find(({ id }) => window.location.hash === `#${id}`)?.id ?? 'analytics';

/** The host product's current page. It lives in the address, so the browser's Back button works. */
export const useCurrentPage = () => useSyncExternalStore(subscribeToAddress, pageInAddress);
