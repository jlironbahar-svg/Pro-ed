import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

/** Loads data and reloads it every `intervalMs` while the page is visible (HTTP polling, no WebSockets). */
export function usePolling<T>(load: () => Promise<T>, intervalMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'error'));
    }
  }, []);

  useEffect(() => {
    void reload();
    if (!intervalMs) return;
    const id = window.setInterval(() => document.visibilityState === 'visible' && void reload(), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && void reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload, intervalMs]);

  return { data, error, reload, setData };
}
