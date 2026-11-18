import { createContext } from 'react';
import type { Breakpoint } from '../core/types';

/** The breakpoint of the dashboard's container, measured by the dashboard itself. */
export const BreakpointContext = createContext<Breakpoint>('lg');
