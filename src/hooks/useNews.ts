import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewsItem, NewsPayload } from '../../shared/types';

const POLL_MS = 3 * 60 * 1000;

/** Headlines that are in `next` but not in `current` (by id). */
export function newItems(current: NewsItem[], next: NewsItem[]): NewsItem[] {
  const ids = new Set(current.map((item) => item.id));
  return next.filter((item) => !ids.has(item.id));
}

export function useNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState<NewsItem[] | null>(null);
  const [freshCount, setFreshCount] = useState(0);
  const itemsRef = useRef<NewsItem[]>([]);

  const apply = useCallback((payload: NewsPayload, next: NewsItem[]) => {
    itemsRef.current = next;
    setItems(next);
    setPartial((payload.feedErrors ?? 0) > 0 && next.length > 0);
    setStale(Boolean(payload.stale));
    setPending(null);
    setFreshCount(0);
  }, []);

  const lastPayload = useRef<NewsPayload | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/news');
      const payload = (await response.json()) as NewsPayload;
      const next = Array.isArray(payload.items) ? payload.items : [];
      lastPayload.current = payload;
      apply(payload, next);
      if (next.length === 0) setError(payload.error || '暫時沒有頭條');
    } catch {
      setItems([]);
      setError('暫時取不到新聞，請檢查網絡後再試');
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll quietly while the tab is visible; new headlines wait behind a "有 N 則新頭條" button
  // instead of reshuffling the page under the reader.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible' || itemsRef.current.length === 0) return;
      try {
        const response = await fetch('/api/news', { cache: 'no-store' });
        const payload = (await response.json()) as NewsPayload;
        const next = Array.isArray(payload.items) ? payload.items : [];
        const fresh = newItems(itemsRef.current, next);
        if (next.length && fresh.length) {
          lastPayload.current = payload;
          setPending(next);
          setFreshCount(fresh.length);
        }
      } catch {
        /* offline: keep what we have */
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const showPending = useCallback(() => {
    if (pending && lastPayload.current) apply(lastPayload.current, pending);
  }, [apply, pending]);

  return { items, loading, error, partial, stale, refresh, freshCount, showPending };
}
