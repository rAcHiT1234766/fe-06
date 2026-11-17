import { createContext } from 'react';

/**
 * Called when a dashboard first shows its content or its error in place of the loading skeleton.
 * The custom element listens here to announce that it is ready; React hosts see it for themselves.
 */
export const DashboardReadyContext = createContext<(() => void) | undefined>(undefined);
