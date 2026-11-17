import { useEffect } from 'react';

/**
 * Asks the browser to confirm before the page is closed or reloaded while there are unsaved
 * changes. Browsers show their own wording; a page cannot change it.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);
}
