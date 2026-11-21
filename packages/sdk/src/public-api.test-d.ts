import type { JSX } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import type { DashKitGlobal } from './element-types';
import type {
  ActiveFilter,
  DashboardBuilderProps,
  DashboardConfig,
  DashboardProps,
  DashKitElement,
  DashKitError,
  DashKitHandle,
  DashKitProviderProps,
  ThemeInput,
} from './index';
import * as main from './index';
import { registerMap, type MapGeoJson } from './map';

declare const config: DashboardConfig;

describe('component props', () => {
  it('a dashboard comes from an id or a config, never both and never neither', () => {
    expectTypeOf<{ dashboardId: 'overview' }>().toExtend<DashboardProps>();
    expectTypeOf<{ config: DashboardConfig }>().toExtend<DashboardProps>();
    expectTypeOf<{
      dashboardId: 'overview';
      config: DashboardConfig;
    }>().not.toExtend<DashboardProps>();
    expectTypeOf<Record<never, never>>().not.toExtend<DashboardProps>();
  });

  it('the builder opens in view or edit mode', () => {
    expectTypeOf<DashboardBuilderProps['mode']>().toEqualTypeOf<'view' | 'edit' | undefined>();
    expectTypeOf<{
      dashboardId: 'overview';
      mode: 'print';
    }>().not.toExtend<DashboardBuilderProps>();
    expectTypeOf<DashboardBuilderProps['onSave']>().toEqualTypeOf<
      ((config: DashboardConfig) => void) | undefined
    >();
  });

  it('the provider needs an API URL and children, and gets tokens asynchronously', () => {
    expectTypeOf<{ apiUrl: string; children: null }>().toExtend<DashKitProviderProps>();
    expectTypeOf<{ children: null }>().not.toExtend<DashKitProviderProps>();
    expectTypeOf<DashKitProviderProps['getToken']>().toEqualTypeOf<
      (() => Promise<string>) | undefined
    >();
    expectTypeOf<{
      apiUrl: string;
      children: null;
      getToken: () => string;
    }>().not.toExtend<DashKitProviderProps>();
  });

  it('errors carry a code from a closed list', () => {
    expectTypeOf<string>().not.toExtend<DashKitError['code']>();
    expectTypeOf<'UNAUTHENTICATED'>().toExtend<DashKitError['code']>();
  });
});

describe('FR-6.3 <dashkit-dashboard>', () => {
  it('is known to the DOM types by its tag name', () => {
    expectTypeOf(document.createElement('dashkit-dashboard')).toEqualTypeOf<DashKitElement>();
    expectTypeOf(
      document.querySelector('dashkit-dashboard'),
    ).toEqualTypeOf<DashKitElement | null>();
  });

  it('gives each dashkit:* event its own detail type', () => {
    const element = document.createElement('dashkit-dashboard');
    element.addEventListener('dashkit:filterchange', (event) => {
      expectTypeOf(event.detail).toEqualTypeOf<ActiveFilter[]>();
    });
    element.addEventListener('dashkit:save', (event) => {
      expectTypeOf(event.detail).toEqualTypeOf<DashboardConfig>();
    });
    element.addEventListener('dashkit:error', (event) => {
      expectTypeOf(event.detail).toEqualTypeOf<DashKitError>();
    });
    element.addEventListener('click', (event) => {
      expectTypeOf(event).toEqualTypeOf<HTMLElementEventMap['click']>();
    });
  });

  it('takes objects and functions as properties, and has methods for the host', () => {
    const element = document.createElement('dashkit-dashboard');
    expectTypeOf(element.theme).toEqualTypeOf<ThemeInput | undefined>();
    expectTypeOf(element.getToken).toEqualTypeOf<(() => Promise<string>) | undefined>();
    expectTypeOf<DashKitElement['setFilters']>().parameter(0).toEqualTypeOf<ActiveFilter[]>();
    expectTypeOf<DashKitElement['refresh']>().returns.toBeVoid();
    element.config = config;
  });

  it('takes its attributes in JSX, and only those values', () => {
    type Props = JSX.IntrinsicElements['dashkit-dashboard'];
    expectTypeOf<{ 'api-url': string; 'dashboard-id': string; mode: 'edit' }>().toExtend<Props>();
    expectTypeOf<{ 'color-scheme': 'dark'; className: string }>().toExtend<Props>();
    expectTypeOf<{ mode: 'print' }>().not.toExtend<Props>();
  });

  it('mount() and registerMap() are on the global that the script tag adds', () => {
    expectTypeOf(window.DashKit).toEqualTypeOf<DashKitGlobal | undefined>();
    expectTypeOf<DashKitGlobal['mount']>().returns.toEqualTypeOf<DashKitHandle>();
    expectTypeOf<DashKitGlobal['registerMap']>().toEqualTypeOf(registerMap);
  });
});

describe('the map entry', () => {
  it('takes borders as a GeoJSON FeatureCollection', () => {
    expectTypeOf(registerMap).parameters.toEqualTypeOf<[string, MapGeoJson]>();
    expectTypeOf<{ type: 'FeatureCollection'; features: [] }>().toExtend<MapGeoJson>();
    expectTypeOf<{ type: 'Feature'; features: [] }>().not.toExtend<MapGeoJson>();
  });

  it('is the only way in, so a host that shows no map never loads its chart code', () => {
    expectTypeOf(main).not.toHaveProperty('registerMap');
  });
});
