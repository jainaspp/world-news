import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BoardSnapshot } from '../shared/board';
import { explainerCurrent, type ContentDoc } from '../shared/content';
import { focusTarget } from '../shared/focusView';
import {
  MIN_AI_CHARS,
  blocksRewrite,
  bodyChars,
  columnDelivery,
  compareKey,
  materialFromBoard,
  pieceReady,
  slotInstant,
  storySignature,
  upsertWritten,
  type WrittenStory,
} from '../shared/grok';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

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
    const workflow = readFileSync('.github/workflows/warm-content.yml', 'utf8');
    expect(workflow).toContain('"fallback":true');
    expect(workflow).toContain('prev_keys');
    expect(source).toContain("searchParams.get('force') === '1'");
  });

  it('returns 503 for a cold cache or a sources-only piece, and 200 when Grok was not available', () => {
    expect(columnDelivery({ cold: true })).toMatchObject({ status: 503, fallback: true, error: 'cache-cold' });
    expect(columnDelivery({ docs: [{ mode: 'sources', chars: 185 }] })).toMatchObject({ status: 503, fallback: true });
    expect(columnDelivery({ docs: [{ mode: 'ai', model: 'grok-4.3', chars: 180, key: 'thin' }] })).toMatchObject({ status: 200, fallback: false, thin: ['thin'] });
    expect(columnDelivery({
      docs: [
        { mode: 'ai', model: 'grok-4.3', chars: MIN_AI_CHARS, key: 'good' },
        { mode: 'ai', model: 'grok-4.3', chars: 180, key: 'thin' },
      ],
    })).toMatchObject({ status: 200, fallback: false, thin: ['thin'] });
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
    expect(blocksRewrite({ ...row('ai', 180), attempts: 2 }, NOW)).toBe(true);
    expect(blocksRewrite({ ...row('sources', 185), attempts: 2 }, NOW)).toBe(true);
    expect(blocksRewrite({ ...row('ai', 450), ready: true }, NOW)).toBe(true);
  });

  it('stores chars on rewrite and locks a thin piece after two attempts', () => {
    const item: NewsItem = {
      id: 'a',
      title: '立法會通過預算',
      link: 'https://example.com/a',
      source: '香港電台',
      sourceUrl: 'https://news.rthk.hk',
      pubDate: '2026-10-07T00:00:00Z',
      category: 'hk',
      regions: ['HKG'],
    };
    const cluster: StoryCluster = { id: 'c', lead: item, items: [item], sources: ['香港電台'], count: 1, latest: NOW };
    const when = new Date(NOW);
    const base: WrittenStory = {
      key: compareKey(cluster, when),
      signature: storySignature(cluster),
      links: [item.link],
      mode: 'ai',
      at: NOW,
      chars: 180,
      ready: false,
    };
    const first = upsertWritten([], base, cluster, when);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ chars: 180, attempts: 1, ready: false });
    const second = upsertWritten(first, { ...base, chars: 460, ready: true }, cluster, when);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ chars: 460, attempts: 2, ready: true });
    expect(blocksRewrite(second[0], NOW)).toBe(true);
  });

  it('keeps an explainer unpublished under 500 characters and accepts a complete one', () => {
    const filler = (count: number) => '測'.repeat(count);
    const doc: ContentDoc = {
      kind: 'compare',
      key: 'k',
      title: '標題',
      description: '說明',
      publishedAt: '2026-10-07T10:30:00.000Z',
      hkt: '',
      mode: 'ai',
      points: ['一', '二', '三'],
      blocks: [
        { title: '事件經過', sentences: [filler(220)], sources: [] },
        { title: '後續關注', sentences: [filler(230)], sources: [] },
        { title: '事件時間線', sentences: [filler(400)], sources: [] },
      ],
    };
    expect(bodyChars(doc)).toBe(453);
    expect(pieceReady(doc)).toBe(false);
    expect(explainerCurrent(doc)).toBe(false);
    const published: ContentDoc = {
      ...doc,
      blocks: [
        { title: '事件經過', sentences: [filler(510)], sources: [] },
        { title: '事件時間線', sentences: [filler(20)], sources: [] },
      ],
    };
    expect(pieceReady(published)).toBe(true);
    expect(explainerCurrent(published)).toBe(true);
    expect(explainerCurrent({ ...published, blocks: published.blocks.filter((block) => block.title !== '事件時間線') })).toBe(false);
    expect(pieceReady({ ...published, points: ['一'] })).toBe(false);
    expect(slotInstant('2026-10-07-pm')?.toISOString()).toBe('2026-10-07T10:30:00.000Z');
    expect(slotInstant('2026-10-07-am')?.toISOString()).toBe('2026-10-07T00:30:00.000Z');
    expect(slotInstant('2026-10-07')).toBeNull();
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
