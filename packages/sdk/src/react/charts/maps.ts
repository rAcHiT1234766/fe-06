import { registerMap as registerEChartsMap } from 'echarts/core';
import { useSyncExternalStore } from 'react';

/** Country borders as GeoJSON, as `registerMap` takes them. */
export interface MapGeoJson {
  /** Always `FeatureCollection`: borders come as one collection of countries. */
  type: 'FeatureCollection';
  /** One feature per country, whose `properties.name` is the country's name in the data. */
  features: object[];
}

const registered = new Set<string>();
const listeners = new Set<() => void>();

/**
 * Makes country borders available to map widgets under `name`, which a widget's `options.map` names
 * and which is `world` unless it says otherwise. Each feature's `properties.name` must be the
 * country's name in the data. A map widget shows its figures as a table until its map is registered,
 * so the borders can load after the dashboard.
 * @example
 * fetch('/maps/world.json').then((response) => response.json()).then((map) => registerMap('world', map));
 */
export function registerMap(name: string, geoJson: MapGeoJson): void {
  registerEChartsMap(name, geoJson as Parameters<typeof registerEChartsMap>[1]);
  registered.add(name);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether `registerMap` has been called for `name`; a component using it renders again when it is. */
export function useIsMapRegistered(name: string): boolean {
  const isRegistered = () => registered.has(name);
  return useSyncExternalStore(subscribe, isRegistered, isRegistered);
}
