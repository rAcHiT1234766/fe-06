import { createContext, useContext } from 'react';
import type { QueryClient } from '../core/query-client';
import type { ResolvedTheme } from '../core/theme/create-theme';

interface DashKitContextValue {
  client: QueryClient;
  theme: ResolvedTheme;
}

export const DashKitContext = createContext<DashKitContextValue | null>(null);

export function useDashKit(): DashKitContextValue {
  const value = useContext(DashKitContext);
  if (!value) throw new Error('DashKit components must be placed inside a <DashKitProvider>.');
  return value;
}
