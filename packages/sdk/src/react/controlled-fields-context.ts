import { createContext } from 'react';
import type { DimensionField } from '../core/types';

/** The fields the dashboard has filter controls on, whose selections replace widgets' own filters. */
export const ControlledFieldsContext = createContext<readonly DimensionField[]>([]);
