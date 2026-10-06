import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatIndex, formatSigned, hsiDirection, parseYahooHsi } from '../shared/hsi';
import { toListPayload } from '../shared/listPayload';
import { storySitemapEntries } from '../shared/sitemap';
import type { NewsItem, NewsPayload } from '../shared/types';

function item(id: string, pubDate: string, excerpt?: string): NewsItem {
  return {
    id,
    title: '港鐵加價',
    link: 'https://example.com/a',
    source: 'RTHK',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate,
    category: 'hk',
    ...(excerpt != null ? { excerpt } : {}),
  };
}

describe('list payload', () => {
  it('omits excerpts and leaves the stored item untouched', () => {
    const full = item('abc123def456', '2026-10-06T08:00:00.000Z', 'x'.repeat(180));
    const payload: NewsPayload = {
      items: [full],
      fetchedAt: '2026-10-06T08:00:00.000Z',
      source: 'cache',
      feedErrors: 0,
      stale: false,
    };
    const slim = toListPayload(payload);
    expect(full.excerpt).toHaveLength(180);
    expect(slim.items[0]?.excerpt).toBeUndefined();
    expect(JSON.stringify(slim)).not.toContain('excerpt');
    expect(slim.items[0]?.title).toBe('港鐵加價');
    expect(slim.items[0]?.link).toBe('https://example.com/a');
  });

  it('drops the excerpt bulk from a 600-item list', () => {
    const payload: NewsPayload = {
      items: Array.from({ length: 600 }, (_, index) => item(index.toString(16).padStart(12, 'a'), '2026-10-06T08:00:00.000Z', '港'.repeat(140))),
      fetchedAt: '2026-10-06T08:00:00.000Z',
      source: 'rss',
      feedErrors: 0,
      stale: false,
    };
    const before = Buffer.byteLength(JSON.stringify(payload));
    const after = Buffer.byteLength(JSON.stringify(toListPayload(payload)));
    expect(after).toBeLessThan(before - 200_000);
    expect(after).toBeLessThan(250_000);
  });
});

describe('Hang Seng quote', () => {
  const live = {
    chart: {
      result: [{
        meta: {
          currency: 'HKD',
          symbol: '^HSI',
          regularMarketPrice: 24280.56,
          regularMarketTime: 1791274106,
          fulldayChange: 240.221,
          fulldayChangePercent: 0.999,
          chartPreviousClose: 24642.51,
        },
        indicators: { quote: [{ close: [23972.29, 24040.34, null] }] },
      }],
    },
  };

  it('uses the last completed close, not chartPreviousClose from a multi-day range', () => {
    const quote = parseYahooHsi(live);
    expect(quote?.price).toBe(24280.56);
    expect(quote?.change).toBeCloseTo(240.22, 1);
    expect(quote?.changePercent).toBeCloseTo(0.999, 2);
    expect(quote?.currency).toBe('HKD');
    expect(quote?.updated).toBe('2026-10-06T08:08:26.000Z');
    expect(hsiDirection(quote!.change)).toBe('up');
    expect(formatIndex(quote!.price)).toBe('24,280.56');
    expect(formatSigned(quote!.change)).toBe('+240.22');
    expect(formatSigned(-12.5)).toBe('-12.50');
    expect(hsiDirection(-1)).toBe('down');
    expect(hsiDirection(0)).toBe('flat');
  });

  it('falls back to fulldayChange and hides a broken payload', () => {
    expect(parseYahooHsi({
      chart: { result: [{ meta: { regularMarketPrice: 100, fulldayChange: -2, fulldayChangePercent: -2 } }] },
    })).toMatchObject({ price: 100, change: -2, changePercent: -2 });
    expect(parseYahooHsi({ chart: { result: null } })).toBeNull();
    expect(parseYahooHsi(null)).toBeNull();
  });
});

describe('story sitemap', () => {
  it('lists recent story urls newest first and skips ids the story page would 404', () => {
    const xml = storySitemapEntries([
      item('abc123def456', '2026-10-06T01:00:00.000Z'),
      item('bbb222ccc333', '2026-10-07T01:00:00.000Z'),
      item('not an id', '2026-10-07T02:00:00.000Z'),
      item('bbb222ccc333', '2026-10-05T01:00:00.000Z'),
    ], 10);
    expect(xml).toContain('https://world-news.xyz/story/bbb222ccc333/');
    expect(xml).toContain('https://world-news.xyz/story/abc123def456/');
    expect(xml).toContain('<lastmod>2026-10-07</lastmod>');
    expect(xml).not.toContain('not an id');
    expect(xml.indexOf('bbb222ccc333')).toBeLessThan(xml.indexOf('abc123def456'));
    expect(xml.match(/<loc>/g)).toHaveLength(2);
  });

  it('keeps the existing column urls and wires story rows into the pages function', () => {
    const sitemap = readFileSync('functions/sitemap.xml.ts', 'utf8');
    expect(sitemap).toContain('storySitemapEntries');
    expect(sitemap).toContain('/analysis/');
    expect(sitemap).toContain('/digest/');
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('https://world-news.xyz/region/hkg');
    expect(readFileSync('functions/api/hsi.ts', 'utf8')).toContain('api/hsi-cache-v1');
    expect(readFileSync('functions/api/news.ts', 'utf8')).toContain('toListPayload');
    expect(readFileSync('server/responses.ts', 'utf8')).toContain('toListPayload');
    expect(readFileSync('public/columns.js', 'utf8')).toContain('/api/hsi');
    expect(readFileSync('shared/contentPage.ts', 'utf8')).toContain('id="hk-info"');
    expect(readFileSync('public/columns.js', 'utf8')).toContain('hk-info');
  });
});
