import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewsItem, NewsPayload } from '../../shared/types';

const POLL_MS = 3 * 60 * 1000;
const QUIET_REFRESH_MS = 6_000;

/** Parse the full list after first paint, ideally in an idle slice so it doesn't add TBT. */
function onIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => run(), { timeout: 2_500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 0);
  return () => window.clearTimeout(id);
}

/** Headlines that are in `next` but not in `current` (by id). */
export function newItems(current: NewsItem[], next: NewsItem[]): NewsItem[] {
  const ids = new Set(current.map((item) => item.id));
  return next.filter((item) => !ids.has(item.id));
}

function readBootstrap(): NewsPayload | null {
  try {
    const node = document.getElementById('wn-bootstrap');
    if (!node?.textContent) return null;
    const parsed = JSON.parse(node.textContent) as NewsPayload;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useNews() {
  const boot = typeof document !== 'undefined' ? readBootstrap() : null;
  const [items, setItems] = useState<NewsItem[]>(() => boot?.items ?? []);
  const [loading, setLoading] = useState(() => !(boot?.items.length));
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);
  const [stale, setStale] = useState(() => Boolean(boot?.stale));
  const [pending, setPending] = useState<NewsItem[] | null>(null);
  const [freshCount, setFreshCount] = useState(0);
  const itemsRef = useRef<NewsItem[]>(boot?.items ?? []);
  const lastPayload = useRef<NewsPayload | null>(boot);
  const bootstrapped = useRef(Boolean(boot?.items.length));

  const apply = useCallback((payload: NewsPayload, next: NewsItem[]) => {
    itemsRef.current = next;
    setItems(next);
    setPartial((payload.feedErrors ?? 0) > 0 && next.length > 0);
    setStale(Boolean(payload.stale));
    setPending(null);
    setFreshCount(0);
  }, []);

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
      if (!itemsRef.current.length) {
        setItems([]);
        setError('暫時取不到新聞，請檢查網絡後再試');
      }
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    // SSR bootstrap already painted cards. Refresh after first paint, in an idle callback, so parsing the list stays off the interaction path.
    if (bootstrapped.current) {
      bootstrapped.current = false;
      let cancelIdle = () => {};
      const timer = window.setTimeout(() => {
        cancelIdle = onIdle(() => {
          void (async () => {
            try {
              const response = await fetch('/api/news');
              const payload = (await response.json()) as NewsPayload;
              const next = Array.isArray(payload.items) ? payload.items : [];
              if (next.length) {
                lastPayload.current = payload;
                apply(payload, next);
              }
            } catch {
              /* keep bootstrap */
            }
          })();
        });
      }, QUIET_REFRESH_MS);
      return () => {
        window.clearTimeout(timer);
        cancelIdle();
      };
    }
    void refresh();
  }, [apply, refresh]);

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
        /* offline */
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const showPending = useCallback(() => {
    if (pending && lastPayload.current) apply(lastPayload.current, pending);
  }, [apply, pending]);

  return { items, loading, error, partial, stale, refresh, freshCount, showPending, pending };
}
