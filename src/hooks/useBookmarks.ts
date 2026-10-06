import { useCallback, useMemo, useState } from 'react';
import type { NewsItem } from '../../shared/types';

const KEY = 'wn_bookmarks_v2';

function read(): NewsItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is NewsItem => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Partial<NewsItem>;
      return typeof row.id === 'string' && typeof row.title === 'string' && typeof row.link === 'string';
    });
  } catch {
    return [];
  }
}

export function useBookmarks() {
  const [items, setItems] = useState<NewsItem[]>(read);

  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  const toggle = useCallback((item: NewsItem) => {
    setItems((current) => {
      const next = current.some((row) => row.id === item.id)
        ? current.filter((row) => row.id !== item.id)
        : [item, ...current].slice(0, 50);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, []);

  return { items, ids, toggle };
}
