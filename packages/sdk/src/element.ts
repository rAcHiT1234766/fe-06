// The script-tag entry: React, ECharts and the grid are bundled in, and the element is defined as
// soon as the script runs. Its exports become the `DashKit` global.
import { DashKitElement, TAG_NAME } from './element/dashkit-element';

// A page that loads the script twice must not get an error, so the element is defined only once.
if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, DashKitElement);
}

export { mount, type DashKitHandle } from './element/mount';
export { registerMap, type MapGeoJson } from './react/charts/maps';
