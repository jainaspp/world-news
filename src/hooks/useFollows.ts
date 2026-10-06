import { useCallback, useMemo, useState } from 'react';

const KEY = 'wn_follows_v1';

export interface FollowState {
  categories: string[];
  sources: string[];
}

function read(): FollowState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<FollowState>;
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter((row) => typeof row === 'string').slice(0, 20) : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources.filter((row) => typeof row === 'string').slice(0, 40) : [],
    };
  } catch {
    return { categories: [], sources: [] };
  }
}

function write(next: FollowState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function useFollows() {
  const [state, setState] = useState<FollowState>(read);

  const categorySet = useMemo(() => new Set(state.categories), [state.categories]);
  const sourceSet = useMemo(() => new Set(state.sources), [state.sources]);
  const count = state.categories.length + state.sources.length;

  const toggleCategory = useCallback((id: string) => {
    setState((current) => {
      const has = current.categories.includes(id);
      const next = {
        ...current,
        categories: has ? current.categories.filter((row) => row !== id) : [...current.categories, id].slice(0, 20),
      };
      write(next);
      return next;
    });
  }, []);

  const toggleSource = useCallback((name: string) => {
    setState((current) => {
      const has = current.sources.includes(name);
      const next = {
        ...current,
        sources: has ? current.sources.filter((row) => row !== name) : [...current.sources, name].slice(0, 40),
      };
      write(next);
      return next;
    });
  }, []);

  const matches = useCallback(
    (item: { category?: string; source: string }) => {
      if (!count) return false;
      if (item.category && categorySet.has(item.category)) return true;
      return sourceSet.has(item.source);
    },
    [categorySet, sourceSet, count],
  );

  return { categories: state.categories, sources: state.sources, categorySet, sourceSet, count, toggleCategory, toggleSource, matches };
}
