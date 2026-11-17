import { useEffect, useState } from 'react';
import type { QueryClient } from '../../core/query-client';
import { useDashKit } from '../context';

export function useIsEditor(): boolean {
  const { client } = useDashKit();
  const [loaded, setLoaded] = useState<{ client: QueryClient; isEditor: boolean }>();

  useEffect(() => {
    let isCurrent = true;
    void client.loadRole().then((role) => {
      if (isCurrent) setLoaded({ client, isEditor: role === 'editor' });
    });
    return () => {
      isCurrent = false;
    };
  }, [client]);

  // A role read through another client belongs to another token, possibly another user's.
  return loaded?.client === client && loaded.isEditor;
}
