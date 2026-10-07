import { useCallback, useState } from 'react';

export const BOARD_PREFS_KEY = 'wn_board_v1';

export type BoardBlock = 'mostRead' | 'keywords' | 'coverage';

export interface BoardPrefs {
  mostRead: boolean;
  keywords: boolean;
  coverage: boolean;
}

export const DEFAULT_BOARD_PREFS: BoardPrefs = {
  mostRead: true,
  keywords: true,
  coverage: true,
};

type PrefsStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isShown(value: unknown): boolean {
  return value !== false;
}

/** Missing or unreadable storage keeps every block visible. */
export function readBoardPrefs(storage: PrefsStorage = localStorage): BoardPrefs {
  try {
    const parsed = JSON.parse(storage.getItem(BOARD_PREFS_KEY) || '') as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_BOARD_PREFS };
    const record = parsed as Partial<Record<BoardBlock, unknown>>;
    return {
      mostRead: isShown(record.mostRead),
      keywords: isShown(record.keywords),
      coverage: isShown(record.coverage),
    };
  } catch {
    return { ...DEFAULT_BOARD_PREFS };
  }
}

export function writeBoardPrefs(prefs: BoardPrefs, storage: PrefsStorage = localStorage) {
  try {
    storage.setItem(BOARD_PREFS_KEY, JSON.stringify({
      mostRead: prefs.mostRead,
      keywords: prefs.keywords,
      coverage: prefs.coverage,
    }));
  } catch {
    /* quota */
  }
}

export function useBoardPrefs() {
  const [prefs, setPrefs] = useState<BoardPrefs>(readBoardPrefs);

  const toggle = useCallback((block: BoardBlock) => {
    setPrefs((current) => {
      const next = { ...current, [block]: !current[block] };
      writeBoardPrefs(next);
      return next;
    });
  }, []);

  return { prefs, toggle };
}
