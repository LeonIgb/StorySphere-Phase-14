import { useCallback, useEffect, useState } from 'react';
import { isMediaRef } from '../utils/mediaRefs';
import { resolveMediaUri } from '../services/media/delivery';

// The address a player should open for a stored uri.
// status: 'ready' | 'loading' | 'locked' (not allowed to see it) | 'error' (try again may help)
// Ordinary uris are 'ready' immediately, so existing screens behave exactly as before.
export default function useMediaUri(uri, { width } = {}) {
  const plain = !uri || !isMediaRef(uri);
  const [state, setState] = useState(plain ? { status: uri ? 'ready' : 'error', uri: uri || '' } : { status: 'loading', uri: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (plain) {
      setState({ status: uri ? 'ready' : 'error', uri: uri || '' });
      return undefined;
    }
    let alive = true;
    setState({ status: 'loading', uri: '' });
    resolveMediaUri(uri, { width }).then((res) => {
      if (!alive) return;
      if (res.ok) setState({ status: 'ready', uri: res.uri });
      else setState({ status: res.kind === 'permission' ? 'locked' : 'error', uri: '', error: res.error });
    });
    return () => {
      alive = false;
    };
  }, [uri, width, tick, plain]);

  const retry = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, retry };
}
