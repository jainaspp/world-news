import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOARD_PREFS_KEY, readBoardPrefs, writeBoardPrefs, type BoardPrefs } from '../src/hooks/useBoardPrefs';

function memory(initial: string | null = null) {
  let value = initial;
  let key = '';
  return {
    getItem: () => value,
    setItem: (nextKey: string, next: string) => {
      key = nextKey;
      value = next;
    },
    snapshot: () => value,
    key: () => key,
  };
}

describe('board prefs', () => {
  it('shows every block when nothing is stored', () => {
    expect(readBoardPrefs(memory())).toEqual({ mostRead: true, keywords: true, coverage: true });
    expect(readBoardPrefs(memory(''))).toEqual({ mostRead: true, keywords: true, coverage: true });
    expect(readBoardPrefs(memory('not-json'))).toEqual({ mostRead: true, keywords: true, coverage: true });
    expect(readBoardPrefs(memory('[]'))).toEqual({ mostRead: true, keywords: true, coverage: true });
    expect(readBoardPrefs(memory('null'))).toEqual({ mostRead: true, keywords: true, coverage: true });
  });

  it('keeps an explicit hide and leaves the other blocks on', () => {
    const store = memory();
    writeBoardPrefs({ mostRead: false, keywords: true, coverage: true }, store);
    expect(store.key()).toBe(BOARD_PREFS_KEY);
    expect(JSON.parse(store.snapshot() || '')).toEqual({ mostRead: false, keywords: true, coverage: true });
    expect(readBoardPrefs(store)).toEqual({ mostRead: false, keywords: true, coverage: true });
    expect(readBoardPrefs(memory('{"coverage":false}'))).toEqual({ mostRead: true, keywords: true, coverage: false });
  });

  it('round-trips a full preference set', () => {
    const store = memory();
    const next: BoardPrefs = { mostRead: false, keywords: false, coverage: true };
    writeBoardPrefs(next, store);
    expect(readBoardPrefs(store)).toEqual(next);
    writeBoardPrefs({ ...next, keywords: true }, store);
    expect(readBoardPrefs(store).keywords).toBe(true);
  });

  it('ignores a storage write that throws', () => {
    const store = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => writeBoardPrefs({ mostRead: false, keywords: true, coverage: true }, store)).not.toThrow();
  });

  it('does not bring back the old colliding labels', () => {
    for (const file of ['shared/i18n.ts', 'src/App.tsx', 'src/components/TrendingTopics.tsx', 'src/components/MostRead.tsx', 'README.md']) {
      const text = readFileSync(file, 'utf8');
      expect(text).not.toContain('熱搜');
      expect(text).not.toContain('熱門排行');
    }
    expect(readFileSync('src/components/TrendingTopics.tsx', 'utf8')).toContain('id="hot-search"');
    expect(readFileSync('src/App.tsx', 'utf8')).toContain("t('multiCoverage'");
    expect(readFileSync('src/hooks/useBoard.ts', 'utf8')).toContain('if (!enabled) return');
  });
});
