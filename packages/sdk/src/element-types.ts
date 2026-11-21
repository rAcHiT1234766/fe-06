// The types of `import '@dashkit/sdk/element'`. That import only defines <dashkit-dashboard>, so
// this file holds declarations alone, and the element build publishes it unchanged as
// dist/element.d.ts. Its imports name ./index.js and ./map.js, which are src/index.ts and
// src/map.ts here and the published index.d.ts and map.d.ts there.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DashKitElement,
  DashKitElementAttributes,
  DashKitHandle,
  DashKitOptions,
} from './index.js';
import type { MapGeoJson } from './map.js';

export type {
  DashKitElement,
  DashKitElementAttributes,
  DashKitElementEventMap,
  DashKitHandle,
} from './index.js';

/** The `DashKit` global that `<script src="dashkit.js">` adds. A bundler import does not add it. */
export interface DashKitGlobal {
  /** Shows a dashboard inside `container` by adding a `<dashkit-dashboard>` element to it. */
  mount(container: Element, options: DashKitOptions): DashKitHandle;
  /**
   * Makes country borders available to map widgets under `name`, as `registerMap` from
   * `@dashkit/sdk/map` does. The script carries the map's chart code, since one file cannot leave
   * it out.
   */
  registerMap(name: string, geoJson: MapGeoJson): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'dashkit-dashboard': DashKitElement;
  }

  interface Window {
    /** Present when the page loaded dashkit.js with a script tag. */
    DashKit?: DashKitGlobal;
  }
}

/**
 * The props of `<dashkit-dashboard>` in JSX: its attributes and the usual HTML ones. Objects and
 * functions (`theme`, `config`, `getToken`) and the `dashkit:*` events go through a ref, which
 * works the same way in React 18 and 19. In React, the `Dashboard` component is usually the better
 * fit.
 */
export type DashKitElementJSXProps = DetailedHTMLProps<
  HTMLAttributes<DashKitElement>,
  DashKitElement
> &
  DashKitElementAttributes;

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- React declares JSX as a namespace, and only the same shape can extend it.
  namespace JSX {
    interface IntrinsicElements {
      'dashkit-dashboard': DashKitElementJSXProps;
    }
  }
}
