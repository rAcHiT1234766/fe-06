// The script-tag entry: React, ECharts and the grid are bundled in, and the element is defined as
// soon as the script runs. Its exports become the `DashKit` global.
import { DashKitElement } from './element/dashkit-element';

// A page that loads the script twice must not get an error, so the element is defined only once.
if (!customElements.get('dashkit-dashboard')) {
  customElements.define('dashkit-dashboard', DashKitElement);
}

export { mount, type DashKitHandle } from './element/mount';
