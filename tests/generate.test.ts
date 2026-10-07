import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BoardSnapshot } from '../shared/board';
import { focusTarget } from '../shared/focusView';
import {
  MIN_AI_CHARS,
  blocksRewrite,
  columnDelivery,
  materialFromBoard,
  type WrittenStory,
} from '../shared/grok';

const NOW = Date.now();

function row(mode: WrittenStory['mode'], chars?: number): WrittenStory {
  return { key: 'k', signature: 's', links: [], mode, at: NOW, ...(chars == null ? {} : { chars }) };
}

describe('cache-only generation and fallback signalling', () => {
  it('reads a stored board and refuses a cold cache', () => {
    expect(materialFromBoard(null)).toBeNull();
    expect(materialFromBoard({
      savedAt: NOW,
      clusters: [],
      counts: {},
      banner: null,
      timeline: [],
      headlines: [],
    })).toBeNull();

    const snapshot: BoardSnapshot = {
      savedAt: NOW,
      clusters: [{
        id: 'c1',
        members: [
          { id: 'a', source: '香港電台', title: '立法會通過預算', link: 'https://example.com/a', pubDate: '2026-10-07T00:00:00Z' },
          { id: 'b', source: '明報', title: '立法會通過預算', link: 'https://example.com/b', pubDate: '2026-10-07T00:10:00Z' },
        ],
      }],
      counts: {},
      banner: null,
      timeline: [],
      headlines: [
        { id: 'a', title: '立法會通過預算', link: 'https://example.com/a', source: '香港電台', pubDate: '2026-10-07T00:00:00Z', category: 'hk' },
        { id: 'b', title: '歐中貿易談判', link: 'https://example.com/b', source: '路透社', pubDate: '2026-10-07T00:10:00Z', category: 'business' },
      ],
    };
    const material = materialFromBoard(snapshot);
    expect(material?.items).toHaveLength(2);
    expect(material?.items.find((item) => item.id === 'a')?.regions).toContain('HKG');
    expect(material?.clusters[0]?.items.find((item) => item.id === 'a')?.category).toBe('hk');
    expect(material?.clusters[0]?.items.find((item) => item.id === 'b')?.category).toBe('business');

    const source = readFileSync('functions/content/columns.ts', 'utf8');
    expect(source).not.toContain('getNews');
    expect(source).toContain('materialFromBoard');
    expect(readFileSync('.github/workflows/warm-content.yml', 'utf8')).toContain('"fallback":true');
  });

  it('returns 503 for a cold cache or a sources-only piece, and 200 when Grok was not available', () => {
    expect(columnDelivery({ cold: true })).toMatchObject({ status: 503, fallback: true, error: 'cache-cold' });
    expect(columnDelivery({ docs: [{ mode: 'sources', chars: 185 }] })).toMatchObject({ status: 503, fallback: true });
    expect(columnDelivery({ docs: [{ mode: 'ai', model: 'grok-4.3', chars: 180 }] })).toMatchObject({ status: 503, fallback: true });
    expect(columnDelivery({ docs: [{ mode: 'ai', model: '@cf/qwen', chars: 180 }] })).toMatchObject({ status: 503, fallback: true });
    expect(columnDelivery({ capped: true, docs: [{ mode: 'ai', model: '@cf/qwen', chars: 180 }] })).toMatchObject({ status: 200, fallback: false });
    expect(columnDelivery({ docs: [{ mode: 'ai', model: 'grok-4.3', chars: MIN_AI_CHARS }] })).toMatchObject({ status: 200, fallback: false });
    expect(columnDelivery({ skipped: 'exists' })).toMatchObject({ status: 200, fallback: false });
  });

  it('lets the same day replace a thin sources-only piece and keeps a full AI piece', () => {
    expect(blocksRewrite(undefined, NOW)).toBe(false);
    expect(blocksRewrite(row('sources', 185), NOW)).toBe(false);
    expect(blocksRewrite(row('ai', 185), NOW)).toBe(false);
    expect(blocksRewrite(row('ai', MIN_AI_CHARS), NOW)).toBe(true);
    expect(blocksRewrite(row('ai'), NOW)).toBe(true);
  });

  it('shows the weekly intro only on a pure region or category page', () => {
    const base = { region: 'ALL', category: 'all', source: '', q: '', time: 'all', bookmarks: false, following: false };
    expect(focusTarget(base)).toBeNull();
    expect(focusTarget({ ...base, region: 'HKG' })).toEqual({ scope: 'region', id: 'hkg' });
    expect(focusTarget({ ...base, category: 'tech' })).toEqual({ scope: 'category', id: 'tech' });
    expect(focusTarget({ ...base, region: 'EUR', q: '貿易' })).toBeNull();
    expect(focusTarget({ ...base, category: 'china', source: '路透' })).toBeNull();
  });
});
