export type * from './core/types';
export { Dashboard, type DashboardProps } from './react/Dashboard';
export { DashboardBuilder, type DashboardBuilderProps } from './react/DashboardBuilder';
export { DashboardPicker, type DashboardPickerProps } from './react/DashboardPicker';
export { registerMap, type MapGeoJson } from './react/charts/maps';
export { DashKitProvider, type DashKitProviderProps } from './react/DashKitProvider';
// The element itself ships in the script build; these describe it for TypeScript users.
export type {
  DashKitElement,
  DashKitElementAttributes,
  DashKitElementEventMap,
} from './element/dashkit-element';
export type { DashKitHandle } from './element/mount';
