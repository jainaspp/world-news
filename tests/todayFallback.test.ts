import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOARD_KV_KEY, computeBoard } from '../shared/board';
import type { NewsItem } from '../shared/types';
import { onRequest } from '../functions/today/[[path]]';
import type { PagesContext } from '../functions/env';

const STORIES = [
  ['東涌公屋地盤工人墮斃', '東涌公屋地盤工人墮斃 勞工處調查'],
  ['觀塘火警男童獲救', '觀塘火警男童獲救 母親被捕'],
  ['新皇崗口岸開通在即', '新皇崗口岸開通在即 跨境巴士減價'],
  ['天文台發出強烈季候風信號', '天文台發出強烈季候風信號 氣溫下降'],
  ['港股半日升三百點', '港股半日升三百點 科技股造好'],
  ['立法會辯論施政報告第二日', '立法會辯論施政報告第二日 議員發言'],
];

function items(): NewsItem[] {
  const rows: NewsItem[] = [];
  STORIES.forEach(([a, b], index) => {
    for (const [n, title, source] of [[0, a, '香港電台'], [1, b, '明報']] as const) {
      rows.push({
        id: `y${index}${n}`, title, link: `https://example.com/y${index}${n}`, source, sourceUrl: 'https://example.com',
        regions: ['HKG'], category: 'hk', pubDate: `2026-10-07T0${index}:1${n}:00.000Z`,
      });
    }
  });
  rows.push(
    { id: 't0', title: '世衛關注俄羅斯實驗室員工死亡', link: 'https://example.com/t0', source: '香港電台', sourceUrl: '', regions: ['INT'], category: 'world', pubDate: '2026-10-07T22:00:00.000Z' },
    { id: 't1', title: '世衛關注俄羅斯實驗室員工死亡事件', link: 'https://example.com/t1', source: '明報', sourceUrl: '', regions: ['INT'], category: 'world', pubDate: '2026-10-07T22:05:00.000Z' },
  );
  return rows;
}

function context(): PagesContext {
  const rows = new Map([[BOARD_KV_KEY, JSON.stringify(computeBoard(items()))]]);
  return {
    request: new Request('https://world-news.xyz/today/'),
    env: { CONTENT: { async get(key: string) { return rows.get(key) ?? null; }, async put() {}, async list() { return { keys: [], list_complete: true }; } } },
  } as unknown as PagesContext;
}

afterEach(() => vi.useRealTimers());

describe('/today/ on a thin morning', () => {
  it('shows the previous day overnight with a link to today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T20:00:00.000Z')); // 04:00 HKT 10/8
    const html = await (await onRequest(context())).text();
    expect(html).toContain('2026年10月7日');
    expect(html).toContain('href="/today/2026-10-08/"');
  });

  it('shows today from 07:00 HKT even when thin, linking yesterday', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T00:37:00.000Z')); // 08:37 HKT 10/8
    const html = await (await onRequest(context())).text();
    expect(html).toMatch(/<title>今日[^<]*時間線/);
    expect(html).not.toContain('<title>2026年10月7日');
    expect(html).toContain('href="/today/2026-10-07/"');
    expect(html).toContain('rel="canonical" href="https://world-news.xyz/today/2026-10-08/"');
  });
});
