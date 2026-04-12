import { useState, useCallback } from 'react';

const KEY = 'wn_bookmarks';

export function useBookmarks() {
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
    catch { return new Set(); }
  });

  const toggle = useCallback((id: string) => {
    setBookmarkIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => bookmarkIds.has(id), [bookmarkIds]);

  return { bookmarkIds, toggle, isBookmarked };
}
