import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shouldRedirect } from '../functions/_middleware';
import { parseAqhi, parseHkoNow, parseHkoWarnings } from '../shared/hk';
import { relatedItems, renderStoryMissing, renderStoryPage } from '../shared/storyPage';
import { trendingTopics } from '../shared/topics';
import { clusterStories } from '../shared/trending';
import type { NewsItem } from '../shared/types';
import { newItems } from '../src/hooks/useNews';

const now = Date.parse('2026-10-07T00:00:00Z');
function item(id: string, title: string, source: string, category = 'world', minutes = 30): NewsItem {
  return {
    id, title, link: `https://example.com/${id}`, source, sourceUrl: 'https://example.com', regions: ['INT'],
    pubDate: new Date(now - minutes * 60000).toISOString(), category,
  };
}

describe('HK widget parsing', () => {
  it('reads HKO current weather, active warnings and the highest AQHI', () => {
    const current = parseHkoNow({
      temperature: { data: [{ place: '京士柏', value: 25 }, { place: '香港天文台', value: 26 }] },
      humidity: { data: [{ value: 55 }] }, icon: [76], rainfall: { data: [{ max: 0 }, { max: 3 }] }, updateTime: '2026-10-07T00:02:00+08:00',
    });
    expect(current).toEqual({ temperature: 26, humidity: 55, icon: 76, rainMax: 3, updated: '2026-10-07T00:02:00+08:00' });
    expect(parseHkoWarnings({})).toEqual([]);
    expect(parseHkoWarnings({ WTCSGNL: { name: '三號強風信號', code: 'TC3', actionCode: 'ISSUE' }, WRAIN: { name: '黃色暴雨警告信號', code: 'WRAINA', actionCode: 'CANCEL' } }))
      .toEqual([{ code: 'TC3', name: '三號強風信號' }]);
    const xml = '<item><description><![CDATA[中西區 - 一般監測站: 3 低 - 2026年10月06日]]></description></item><item><description><![CDATA[元朗 - 一般監測站: 5 中 - 2026年10月06日]]></description></item><item><description><![CDATA[旺角 - 路邊監測站: 9 甚高 - x]]></description></item>';
    expect(parseAqhi(xml)).toEqual({ value: 5, risk: '中', station: '元朗' });
  });
});

describe('trending topics', () => {
  it('only uses words several outlets put in their headlines', () => {
    const items = [
      item('1', 'Paramount completes Warner Bros deal', 'BBC News'),
      item('2', 'Warner Bros and Paramount close merger', 'CNBC'),
      item('3', 'Paramount layoffs coming', 'Variety'),
      item('4', '港鐵加價方案交立法會', '香港電台'),
      item('5', '港鐵加價方案惹關注', 'HK01'),
      item('6', 'Old story about Paramount', 'Old Outlet', 'world', 60 * 30),
    ];
    const topics = trendingTopics(items, now);
    expect(topics[0]).toEqual({ term: 'Paramount', outlets: 3 });
    expect(topics.map((t) => t.term).some((term) => term.startsWith('港鐵加價'))).toBe(true);
    expect(topics.map((t) => t.term)).not.toContain('港鐵');
  });
});

describe('story page', () => {
  it('shows every outlet in the cluster with a timeline, original link and noindex', () => {
    const items = [item('a1', 'Nobel prize goes to Halzen for neutrino work', 'BBC News', 'science', 50), item('a2', 'Halzen wins Nobel prize for neutrino work', 'Guardian', 'science', 40), item('a3', 'Neutrino work wins Halzen Nobel prize', 'Al Jazeera', 'science', 30), item('b', 'Other science story', 'Ars', 'science')];
    const cluster = clusterStories(items).find((c) => c.items.some((i) => i.id === 'a1')) ?? null;
    expect(cluster?.count).toBe(3);
    const html = renderStoryPage(items[0]!, cluster, relatedItems(items[0]!, cluster, items), 'https://world-news.xyz/story/a1/');
    expect(html).toContain('3 間媒體報道');
    expect(html).toContain('各媒體報道（香港時間）');
    expect(html).toContain('noindex, follow');
    expect(html).toContain('https://example.com/a1');
    expect(html).toContain('/story/b/');
    expect(html).toContain('/analysis/');
    expect(renderStoryMissing('https://world-news.xyz/story/x/')).toContain('返回首頁');
  });
});

describe('new headlines indicator', () => {
  it('counts only ids not already on the page', () => {
    expect(newItems([item('a', 'x', 's')], [item('b', 'y', 's'), item('a', 'x', 's')]).map((i) => i.id)).toEqual(['b']);
  });
});

describe('pages.dev and SEO', () => {
  it('redirects the production pages.dev alias but not previews or the API', () => {
    expect(shouldRedirect('world-news-b5e.pages.dev', '/', undefined)).toBe(true);
    expect(shouldRedirect('world-news-b5e.pages.dev', '/api/generate', undefined)).toBe(false);
    expect(shouldRedirect('features-v4.world-news-b5e.pages.dev', '/', undefined)).toBe(false);
    expect(shouldRedirect('world-news-b5e.pages.dev', '/', 'false')).toBe(false);
    expect(shouldRedirect('x.world-news-b5e.pages.dev', '/', 'true')).toBe(true);
  });

  it('has hreflang, a preloaded headline request, PWA icons and an analysis sitemap entry', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('hreflang="zh-HK"');
    expect(html).toContain('rel="preload" href="/api/news"');
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8')) as { icons: { src: string; purpose: string }[] };
    for (const icon of manifest.icons) expect(() => readFileSync(`public${icon.src}`)).not.toThrow();
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('https://world-news.xyz/analysis/');
  });
});
