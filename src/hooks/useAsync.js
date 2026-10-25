import { useCallback, useEffect, useRef, useState } from 'react';
import { useCatalogVersion } from '../services/catalog';

// Small data-loading hook with loading, refreshing and error state.
// Re-runs whenever `deps` change, and whenever the story catalog changes (a story was published,
// unpublished or deleted in the Create tab). Stale responses are ignored.
export default function useAsync(asyncFn, deps = []) {
  const fnRef = useRef(asyncFn);
  fnRef.current = asyncFn;
  const requestId = useRef(0);
  const catalogVersion = useCatalogVersion();

  const [state, setState] = useState({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const run = useCallback(async (mode) => {
    const id = ++requestId.current;
    setState((prev) => ({
      ...prev,
      loading: mode === 'load',
      refreshing: mode === 'refresh',
      error: null,
    }));
    try {
      const data = await fnRef.current();
      if (id !== requestId.current) return;
      setState({ data, loading: false, refreshing: false, error: null });
    } catch (error) {
      if (id !== requestId.current) return;
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error }));
    }
  }, []);

  useEffect(() => {
    run('load');
    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, catalogVersion]);

  const reload = useCallback(() => run('load'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { ...state, reload, refresh };
}
