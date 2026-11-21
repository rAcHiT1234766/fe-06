// The map entry, `@dashkit/sdk/map`. ECharts' map chart and its colour classes are a large part of
// the chart code, so they come with this entry: a host that shows no map never imports it, and its
// bundle leaves them out.
import { MapChart } from 'echarts/charts';
import { VisualMapPiecewiseComponent } from 'echarts/components';
import { registerMap as registerEChartsMap, use as registerChartModules } from 'echarts/core';
import { markMapRegistered } from './react/charts/maps';

/** Country borders as GeoJSON, as `registerMap` takes them. */
export interface MapGeoJson {
  /** Always `FeatureCollection`: borders come as one collection of countries. */
  type: 'FeatureCollection';
  /** One feature per country, whose `properties.name` is the country's name in the data. */
  features: object[];
}

/**
 * Makes country borders available to map widgets under `name`, which a widget's `options.map` names
 * and which is `world` unless it says otherwise. Each feature's `properties.name` must be the
 * country's name in the data. A map widget shows its figures as a table until its map is registered,
 * so the borders can load after the dashboard.
 * @example
 * import { registerMap } from '@dashkit/sdk/map';
 *
 * fetch('/maps/world.json').then((response) => response.json()).then((map) => registerMap('world', map));
 */
export function registerMap(name: string, geoJson: MapGeoJson): void {
  // Registered here rather than on import, so the import alone changes nothing; ECharts ignores a
  // module registered twice.
  registerChartModules([MapChart, VisualMapPiecewiseComponent]);
  registerEChartsMap(name, geoJson as Parameters<typeof registerEChartsMap>[1]);
  markMapRegistered(name);
}
