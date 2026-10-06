import { useCallback, useEffect, useState } from 'react';
import type { NewsItem, NewsPayload } from '../../shared/types';

export function useNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);
  const [stale, setStale] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/news');
      const payload = (await response.json()) as NewsPayload;
      const next = Array.isArray(payload.items) ? payload.items : [];
      setItems(next);
      setPartial((payload.feedErrors ?? 0) > 0 && next.length > 0);
      setStale(Boolean(payload.stale));
      if (next.length === 0) setError(payload.error || '暫時沒有頭條');
    } catch {
      setItems([]);
      setError('暫時取不到新聞，請檢查網絡後再試');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, partial, stale, refresh };
}
