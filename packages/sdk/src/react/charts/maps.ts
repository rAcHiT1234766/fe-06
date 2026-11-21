import { useSyncExternalStore } from 'react';

// Which maps have borders, shared by the map entry, which registers them, and the map widget, which
// waits for them. The build puts this file in a chunk of its own, so both entries see one copy.
const registered = new Set<string>();
const listeners = new Set<() => void>();

/** Records that `registerMap` has given ECharts the borders named `name`. */
export function markMapRegistered(name: string): void {
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
