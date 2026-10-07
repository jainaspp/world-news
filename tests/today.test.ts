import { describe, expect, it } from 'vitest';
import type { StoryCluster } from '../shared/angles';
import { buildToday, parseTodayPath, renderToday, todayPaths } from '../shared/todayPage';
import type { NewsItem } from '../shared/types';

function item(id: string, title: string, source: string, category: string, regions: string[]): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions,
    pubDate: '2026-10-07T01:30:00.000Z',
    category,
  };
}

function cluster(items: NewsItem[]): StoryCluster {
  const lead = items[0]!;
  return {
    id: lead.id,
    lead,
    items,
    sources: [...new Set(items.map((row) => row.source))],
    count: new Set(items.map((row) => row.source)).size,
    latest: Date.parse(lead.pubDate),
  };
}

describe('today timeline', () => {
  const hk = cluster([
    item('a', '東涌公屋地盤工人墮斃', '香港電台', 'hk', ['HKG']),
    item('b', '東涌地盤工人墮斃 勞工處調查', 'Now 新聞', 'hk', ['HKG']),
    item('c', '東涌公屋地盤致命工業意外', '有線新聞', 'hk', ['HKG']),
  ]);
  const world = cluster([
    item('d', '諾貝爾化學獎公布', '路透', 'science', ['INT']),
    item('e', 'Nobel chemistry prize announced', 'Reuters', 'science', ['INT']),
  ]);

  it('parses the dated, region, and category paths', () => {
    expect(parseTodayPath('/today/')).toEqual({ ok: true });
    expect(parseTodayPath('/today/2026-10-07/')).toEqual({ ok: true, date: '2026-10-07' });
    expect(parseTodayPath('/today/2026-10-07/region/HKG/')).toEqual({ ok: true, date: '2026-10-07', region: 'HKG' });
    expect(parseTodayPath('/today/2026-10-07/category/hk/')).toEqual({ ok: true, date: '2026-10-07', category: 'hk' });
    expect(parseTodayPath('/today/2026-02-31/').ok).toBe(false);
    expect(parseTodayPath('/today/nope/').ok).toBe(false);
    expect(todayPaths('2026-10-07')).toContain('/today/2026-10-07/region/HKG/');
    expect(todayPaths('2026-10-07')).toContain('/today/2026-10-07/category/hk/');
  });

  it('lists the most-covered Hong Kong stories and links an explainer', () => {
    const model = buildToday({
      clusters: [world, hk],
      date: '2026-10-07',
      explainers: [{ key: '2026-10-07-site-death', title: '東涌公屋地盤工人墮斃' }],
      today: true,
    });
    expect(model.title).toBe('今日香港十大新聞時間線');
    expect(model.stories[0]?.title).toContain('東涌');
    expect(model.stories[0]?.explainerKey).toBe('2026-10-07-site-death');
    expect(model.stories[0]?.outlets).toBe(3);
    expect(model.index).toBe(true);
    const html = renderToday(model, 'https://world-news.xyz/today/2026-10-07/');
    expect(html).toContain('index,follow');
    expect(html).toContain('今日香港十大新聞時間線');
    expect(html).toContain('/explainer/2026-10-07-site-death/');
    expect(html).toContain('href="/today/2026-10-07/region/HKG/"');
    expect(html).toContain('不經模型生成');
    expect(html).not.toContain('ai-badge');
    const region = buildToday({ clusters: [world, hk], date: '2026-10-07', region: 'INT' });
    expect(region.stories).toHaveLength(1);
    expect(region.title).toContain('國際');
    const empty = buildToday({ clusters: [], date: '2026-10-06' });
    expect(renderToday(empty, 'https://world-news.xyz/today/2026-10-06/')).toContain('noindex,follow');
  });
});
