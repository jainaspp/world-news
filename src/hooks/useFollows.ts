import { useCallback, useMemo, useState } from 'react';
import { FOLLOW_KEY, followCount, followMatches, parseFollows, type FollowPrefs } from '../../shared/readerStore';

function write(next: FollowPrefs) {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function useFollows() {
  const [state, setState] = useState<FollowPrefs>(() => parseFollows(localStorage.getItem(FOLLOW_KEY)));

  const categorySet = useMemo(() => new Set(state.categories), [state.categories]);
  const sourceSet = useMemo(() => new Set(state.sources), [state.sources]);
  const regionSet = useMemo(() => new Set(state.regions), [state.regions]);
  const count = followCount(state);

  const toggleList = useCallback((field: keyof FollowPrefs, id: string, limit: number) => {
    setState((current) => {
      const has = current[field].includes(id);
      const next = {
        ...current,
        [field]: has ? current[field].filter((row) => row !== id) : [...current[field], id].slice(0, limit),
      };
      write(next);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((id: string) => toggleList('categories', id, 20), [toggleList]);
  const toggleSource = useCallback((name: string) => toggleList('sources', name, 40), [toggleList]);
  const toggleRegion = useCallback((code: string) => toggleList('regions', code, 12), [toggleList]);

  const matches = useCallback(
    (item: { category?: string; source: string; regions?: string[] }) => followMatches(state, item),
    [state],
  );

  return {
    categories: state.categories,
    sources: state.sources,
    regions: state.regions,
    categorySet,
    sourceSet,
    regionSet,
    count,
    toggleCategory,
    toggleSource,
    toggleRegion,
    matches,
  };
}
