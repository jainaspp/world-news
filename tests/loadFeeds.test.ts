import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feed } from '../shared/feeds';
import { loadFeeds, selectHeadlines } from '../server/loadFeeds';
import type { NewsItem } from '../shared/types';

const feeds: Feed[] = [
  { id: 'a', label: 'A', homepage: 'https://a.example', url: 'https://a.example/rss', regions: ['HKG'], terms: 'uncertain' },
  { id: 'b', label: 'B', homepage: 'https://b.example', url: 'https://b.example/rss', regions: ['EUR'], terms: 'uncertain' },
];

const item = (title: string, link: string) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>Tue, 06 Oct 2026 02:00:00 GMT</pubDate><description>BODY ${'字'.repeat(220)}TAIL</description></item>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadFeeds', () => {
  it('fetches feeds, drops bodies, and dedupes overlapping links', async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) => {
      if (String(url).includes('a.example')) {
        return new Response(`<rss><channel>${item('One', 'https://a.example/one')} ${item('Shared', 'https://shared.example/x?utm_source=a')}</channel></rss>`);
      }
      if (String(url).includes('b.example')) {
        return new Response(`<rss><channel>${item('Shared copy', 'https://shared.example/x')}</channel></rss>`, { status: 200 });
      }
      return new Response('nope', { status: 500 });
    });

    const { items, errors, errorSources } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(errors).toBe(0);
    expect(errorSources).toEqual([]);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(String((init?.headers as Record<string, string>)?.['User-Agent'])).toContain('Mozilla');
    expect(init?.redirect).toBe('manual');
    expect(items.map((row) => row.link).sort()).toEqual(['https://a.example/one', 'https://shared.example/x']);
    expect(JSON.stringify(items)).not.toContain('TAIL');
    expect(items[0]?.excerpt?.startsWith('BODY')).toBe(true);
    expect(items[0]?.excerpt?.length).toBeLessThanOrEqual(180);
    expect(items.find((row) => row.link === 'https://shared.example/x')?.source).toBe('A');
  });

  it('counts a feed that fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 404 }));
    const { items, errors, errorSources } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(items).toEqual([]);
    expect(errors).toBe(2);
    expect(errorSources.map((row) => row.reason)).toEqual(['HTTP 404', 'HTTP 404']);
  });

  it('follows one redirect and records a network failure', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === 'https://a.example/rss') {
        return new Response(null, { status: 302, headers: { location: 'https://a.example/final' } });
      }
      if (url === 'https://a.example/final') {
        return new Response(`<rss><channel>${item('Moved', 'https://a.example/moved')}</channel></rss>`);
      }
      throw new Error('Too many subrequests');
    });
    const { items, errorSources } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(items.map((row) => row.title)).toEqual(['Moved']);
    expect(errorSources).toEqual([{ source: 'B', reason: 'subrequests' }]);
  });

  it('reads a 香港01 JSON feed', async () => {
    const hk01: Feed = { ...feeds[0]!, format: 'hk01' };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      items: [{ data: { title: '港聞一則', canonicalUrl: 'https://www.hk01.com/a', publishTime: Date.parse('2026-10-06T02:00:00Z') / 1000, description: '摘要' } }],
    })));
    const { items, errors } = await loadFeeds([hk01], fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(errors).toBe(0);
    expect(items[0]?.link).toBe('https://www.hk01.com/a');
    expect(items[0]?.title).toBe('港聞一則');
  });

  it('reads a Now 新聞 JSON feed', async () => {
    const nowFeed: Feed = { ...feeds[0]!, format: 'now' };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{
      newsId: '1',
      title: '港聞一則',
      summary: '摘要',
      publishDate: Date.parse('2026-10-06T02:00:00Z'),
    }])));
    const { items, errors } = await loadFeeds([nowFeed], fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(errors).toBe(0);
    expect(items[0]?.link).toBe('https://news.now.com/home/local/player?newsId=1');
  });

  it('drops items older than 48 hours', async () => {
    const fetchImpl = vi.fn(async () => new Response(`<rss><channel>${item('Fresh', 'https://a.example/new')}<item><title>Old</title><link>https://a.example/old</link><pubDate>Mon, 28 Sep 2026 01:00:00 GMT</pubDate></item></channel></rss>`));
    const { items } = await loadFeeds(feeds.slice(0, 1), fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(items.map((row) => row.title)).toEqual(['Fresh']);
  });
});

describe('selectHeadlines', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');

  function row(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title' | 'source'>): NewsItem {
    return {
      link: `https://example.com/${partial.id}`,
      sourceUrl: 'https://example.com',
      regions: ['HKG'],
      pubDate: '2026-10-06T08:00:00Z',
      category: 'world',
      ...partial,
    };
  }

  it('collapses the same headline and caps one china outlet', () => {
    const picked = selectHeadlines([
      row({ id: 'a', title: '北京公布新措施', source: '中新網', category: 'china', pubDate: '2026-10-06T10:00:00Z' }),
      row({ id: 'b', title: '北京公布新措施。', source: '港台大中華', category: 'china', pubDate: '2026-10-06T09:00:00Z' }),
      ...Array.from({ length: 30 }, (_, index) => row({
        id: `c${index}`,
        title: `中新網標題 ${index}`,
        source: '中新網',
        category: 'china',
        pubDate: new Date(now - (index + 1) * 60_000).toISOString(),
      })),
      ...Array.from({ length: 20 }, (_, index) => row({
        id: `p${index}`,
        title: `公報 ${index} 的安排說明`,
        source: '新聞公報',
        category: 'hk',
      })),
    ], now);
    expect(picked.filter((item) => item.title.replace(/[^\p{L}\p{N}]+/gu, '') === '北京公布新措施')).toHaveLength(1);
    expect(picked.filter((item) => item.source === '中新網')).toHaveLength(24);
    expect(picked.filter((item) => item.source === '新聞公報')).toHaveLength(16);
  });

  it('keeps hong kong and china floors when the list is over the target', () => {
    const items: NewsItem[] = [];
    for (let source = 0; source < 20; source += 1) {
      for (let index = 0; index < 40; index += 1) {
        items.push(row({
          id: `w${source}-${index}`,
          title: `World story ${source} ${index}`,
          source: `World ${source}`,
          category: 'world',
          pubDate: new Date(now - index * 60_000).toISOString(),
        }));
      }
    }
    for (const source of ['甲', '乙', '丙', '丁']) {
      for (let index = 0; index < 40; index += 1) {
        items.push(row({
          id: `h${source}-${index}`,
          title: `香港標題 ${source} ${index}`,
          source,
          category: 'hk',
          pubDate: new Date(now - (30 + index) * 60_000).toISOString(),
        }));
      }
    }
    for (const source of ['子', '丑', '寅', '卯']) {
      for (let index = 0; index < 30; index += 1) {
        items.push(row({
          id: `c${source}-${index}`,
          title: `中國標題 ${source} ${index}`,
          source,
          category: 'china',
          pubDate: new Date(now - (30 + index) * 60_000).toISOString(),
        }));
      }
    }
    const picked = selectHeadlines(items, now);
    const count = (category: string) => picked.filter((item) => item.category === category).length;
    expect(picked.length).toBeLessThanOrEqual(840);
    expect(count('hk')).toBeGreaterThanOrEqual(120);
    expect(count('china')).toBeGreaterThanOrEqual(80);
    expect(count('world')).toBeGreaterThanOrEqual(24);
  });
});
