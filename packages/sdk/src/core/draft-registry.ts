/**
 * Knows whether any builder under one provider has unsaved changes, so that a dashboard picker
 * does not switch away from them.
 */
export function createDraftRegistry() {
  let held = 0;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    hasUnsaved: () => held > 0,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Marks unsaved changes until the returned function is called. Calling it twice is harmless. */
    hold: () => {
      held += 1;
      notify();
      let isReleased = false;
      return () => {
        if (isReleased) return;
        isReleased = true;
        held -= 1;
        notify();
      };
    },
  };
}

export type DraftRegistry = ReturnType<typeof createDraftRegistry>;
