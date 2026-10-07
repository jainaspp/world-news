import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderHomeFeed } from '../shared/homePage';
import { HOME_INTRO, HOME_INTRO_LINE } from '../shared/homeCopy';
import { renderAboutPage } from '../shared/sitePages';
import { renderDataHub, renderDataPage } from '../shared/dataPage';
import {
  DATA_PAGES,
  dayFromAqhi,
  dayFromQuotes,
  dayFromWeather,
  emptySeries,
  ensureMany,
  formatReading,
  mergeDay,
  needsSnapshot,
  pageById,
  parseSeries,
  seriesKey,
  summarise,
  trendSvg,
  type DataDay,
  type DataPageId,
  type KvLike,
} from '../shared/dataSeries';
import type { HkNow } from '../shared/hk';
import type { NewsItem } from '../shared/types';

function memoryKv(): KvLike & { rows: Map<string, string> } {
  const rows = new Map<string, string>();
  return {
    rows,
    get: async (key) => rows.get(key) ?? null,
    put: async (key, value) => {
      rows.set(key, value);
    },
  };
}

function day(date: string, values: Record<string, number>, label?: string): DataDay {
  return { date, updated: `${date}T01:00:00.000Z`, values, ...(label ? { label } : {}) };
}

function addDays(start: string, offset: number): string {
  const [year, month, dayOfMonth] = start.split('-').map(Number);
  const time = new Date(Date.UTC(year!, (month ?? 1) - 1, dayOfMonth! + offset));
  return time.toISOString().slice(0, 10);
}

function headline(id: string): NewsItem {
  return {
    id,
    title: `標題${id}`,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-07T01:00:00Z',
    category: 'hk',
  };
}

describe('daily snapshot storage', () => {
  it('writes one KV row per day and does not fetch again the same day', async () => {
    const kv = memoryKv();
    let calls = 0;
    const today = day('2026-10-07', { temp: 28, humidity: 75, rain: 0 });
    const first = await ensureMany(kv, '2026-10-07', ['weather'], async () => {
      calls += 1;
      return { weather: today };
    });
    expect(calls).toBe(1);
    expect(first[0]?.days).toEqual([today]);
    expect(kv.rows.get(seriesKey('weather'))).toContain('"temp":28');
    expect(needsSnapshot(first[0]!, '2026-10-07')).toBe(false);

    const second = await ensureMany(kv, '2026-10-07', ['weather'], async () => {
      calls += 1;
      return { weather: day('2026-10-07', { temp: 99 }) };
    });
    expect(calls).toBe(1);
    expect(second[0]?.days[0]?.values.temp).toBe(28);
  });

  it('replaces the same date, keeps 30 days, and ignores a broken payload', () => {
    let series = emptySeries('gold');
    series = mergeDay(series, day('2026-10-07', { price: 2640 }));
    series = mergeDay(series, day('2026-10-07', { price: 2650 }));
    expect(series.days).toHaveLength(1);
    expect(series.days[0]?.values.price).toBe(2650);

    series = emptySeries('gold');
    for (let offset = 0; offset < 35; offset += 1) {
      series = mergeDay(series, day(addDays('2026-08-01', offset), { price: 2000 + offset }));
    }
    expect(series.days).toHaveLength(30);
    expect(series.days[0]?.date).toBe(addDays('2026-08-01', 5));
    expect(series.days[29]?.values.price).toBe(2034);

    const raw = JSON.stringify(series);
    expect(parseSeries('gold', raw).days).toHaveLength(30);
    expect(parseSeries('gold', '{')).toEqual(emptySeries('gold'));
    expect(parseSeries('oil', raw).days).toHaveLength(0);
    expect(parseSeries('gold', JSON.stringify({ id: 'gold', days: [{ date: 'bad', values: { price: 1 } }] })).days).toHaveLength(0);
  });

  it('builds weather, AQHI and price days from the sources the site already parses', () => {
    const hk = {
      temperature: 28,
      humidity: 75,
      icon: 62,
      warnings: [{ code: 'WRAIN', name: '黃色暴雨警告信號' }],
      rainMax: 3,
      aqhi: { value: 5.5, risk: '中', station: '中西區' },
      updated: '2026-10-07T06:00:00+08:00',
      source: '香港天文台、環境保護署',
    } satisfies HkNow;
    expect(dayFromWeather(hk, '2026-10-07')).toMatchObject({
      values: { temp: 28, humidity: 75, rain: 3 },
      label: '黃色暴雨警告信號',
    });
    expect(dayFromAqhi(hk, '2026-10-07')?.values.aqhi).toBe(5.5);
    expect(dayFromWeather({ ...hk, temperature: null }, '2026-10-07')).toBeNull();
    expect(dayFromQuotes('fx', [
      { id: 'usd', price: 7.7821, updated: '2026-10-07T01:00:00Z' },
      { id: 'cny', price: 1.0942, updated: '2026-10-07T01:00:00Z' },
    ], '2026-10-07')?.values).toEqual({ usd: 7.7821, cny: 1.0942 });
    expect(dayFromQuotes('gold', [{ id: 'gold', price: 2650, updated: '' }], '2026-10-07')?.values.price).toBe(2650);
    expect(dayFromQuotes('oil', [], '2026-10-07')).toBeNull();
  });
});

describe('trend chart and HK summary', () => {
  it('draws a dot for one day and a line after that', () => {
    const one = trendSvg([{ date: '2026-10-07', value: 28 }], '氣溫', '度', 0);
    expect(one).toContain('<svg');
    expect(one).toContain('<circle');
    expect(one).not.toContain('<polyline');
    expect(one).toContain('28');
    expect(one).toContain('1 日');

    const two = trendSvg([
      { date: '2026-10-06', value: 27 },
      { date: '2026-10-07', value: 29 },
    ], '氣溫', '度', 0);
    expect(two).toContain('<polyline');
    expect(two).toContain('10/6');
    expect(two).toContain('10/7');

    const flat = trendSvg([
      { date: '2026-10-06', value: 7.8 },
      { date: '2026-10-07', value: 7.8 },
    ], '美元/港元', '', 4);
    expect(flat).toContain('<polyline');
    expect(flat).not.toContain('NaN');
    expect(formatReading(2650, 0)).toBe('2,650');
    expect(formatReading(78.5, 2)).toBe('78.50');
  });

  it('writes Traditional Chinese summaries with digits', () => {
    const weather = pageById('weather');
    const alone = summarise(weather, [day('2026-10-07', { temp: 28, humidity: 75, rain: 0 })]);
    expect(alone).toContain('28 度');
    expect(alone).toContain('75%');
    expect(alone).toContain('尚無昨日數據可供比較');
    expect(alone).not.toMatch(/[零一二三四五六七八九十]度/);

    const compared = summarise(weather, [
      day('2026-10-06', { temp: 27, humidity: 70, rain: 0 }),
      day('2026-10-07', { temp: 29, humidity: 75, rain: 2 }, '黃色暴雨警告信號'),
    ]);
    expect(compared).toContain('較昨日 27 度高 2 度');
    expect(compared).toContain('黃色暴雨警告信號');
    expect(compared).not.toContain('尚無昨日');

    const aqhi = summarise(pageById('aqhi'), [
      day('2026-10-06', { aqhi: 4 }, '中西區 · 低'),
      day('2026-10-07', { aqhi: 5.5 }, '中西區 · 中'),
    ]);
    expect(aqhi).toContain('5.5');
    expect(aqhi).toContain('中西區');
    expect(aqhi).toContain('高 1.5');

    const fx = summarise(pageById('fx'), [
      day('2026-10-06', { usd: 7.8, cny: 1.1 }),
      day('2026-10-07', { usd: 7.78, cny: 1.09 }),
    ]);
    expect(fx).toContain('7.7800');
    expect(fx).toContain('低 0.0200');
    expect(fx).toContain('人民幣兌港元報 1.0900');

    const gold = summarise(pageById('gold'), [day('2026-10-07', { price: 2650 })]);
    expect(gold).toContain('2,650 美元');
    expect(gold).toContain('尚無昨日數據可供比較');
    const oil = summarise(pageById('oil'), [
      day('2026-10-06', { price: 79.2 }),
      day('2026-10-07', { price: 78.5 }),
    ]);
    expect(oil).toContain('78.50 美元');
    expect(oil).toContain('低 0.70 美元');
  });

  it('renders the summary, chart, table, source and an indexable title', () => {
    const spec = pageById('weather');
    const series = {
      id: 'weather' as const,
      days: [day('2026-10-07', { temp: 28, humidity: 75, rain: 0 })],
    };
    const html = renderDataPage(spec, series, { client: 'ca-pub-8392975944327076' });
    expect(html).toContain('<title>香港天氣 — 世界頭條</title>');
    expect(html).toContain('name="description"');
    expect(html).toContain(spec.description);
    expect(html).toContain('rel="canonical" href="https://world-news.xyz/data/weather/"');
    expect(html).toContain('index,follow');
    expect(html).toContain('adsbygoogle.js');
    expect(html).toContain(summarise(spec, series.days));
    expect(html).toContain('<table');
    expect(html).toContain('<svg');
    expect(html).toContain('香港天文台');
    expect(html).toContain('2026年10月7日');
    expect(html).toContain('href="/data/gold/"');

    const titles = new Set(DATA_PAGES.map((page) => page.title));
    const descriptions = new Set(DATA_PAGES.map((page) => page.description));
    expect(titles.size).toBe(DATA_PAGES.length);
    expect(descriptions.size).toBe(DATA_PAGES.length);

    const hub = renderDataHub([series], { client: 'ca-pub-8392975944327076' });
    for (const page of DATA_PAGES) expect(hub).toContain(`href="${page.path}"`);
    expect(hub).toContain('adsbygoogle.js');
    expect(hub).toContain('28 度');
    expect(hub).not.toContain('/story/');
  });
});

describe('homepage intro stays in the HTML without leading the screen', () => {
  it('puts a short line and toggle above the news, and the full text above the footer', () => {
    const html = renderHomeFeed([headline('a'), headline('b')]);
    const top = html.indexOf('home-intro-top');
    const news = html.indexOf('top-stories');
    const foot = html.indexOf('home-intro-foot');
    const footer = html.indexOf('app-footer');
    expect(top).toBeGreaterThan(-1);
    expect(top).toBeLessThan(news);
    expect(news).toBeLessThan(foot);
    expect(foot).toBeLessThan(footer);
    expect(html).toContain('了解更多');
    expect(html).toContain(HOME_INTRO_LINE);
    expect(html.split(HOME_INTRO).length - 1).toBe(2);
    expect(html).toContain('href="/briefing/"');
    expect(html).toContain('href="/explainer/"');
    expect(html).toContain('每日香港導讀');
    expect(html).toContain('新聞懶人包');
    expect(html).toContain('href="/data/"');
    const lazy = html.match(/<strong>新聞懶人包<\/strong>[^<]*<\/li>/g) || [];
    expect(lazy.length).toBeGreaterThan(0);
    for (const item of lazy) {
      expect(item).toContain('整合多方報道、配時間線');
      expect(item).not.toContain('href=');
    }
    const about = renderAboutPage();
    expect(about).toContain(HOME_INTRO);
    expect(about).toContain('href="/briefing/"');
    const aboutLazy = about.match(/<strong>新聞懶人包<\/strong>[^<]*<\/li>/g) || [];
    expect(aboutLazy).toHaveLength(1);
    expect(aboutLazy[0]).toContain('整合多方報道、配時間線');
    expect(aboutLazy[0]).not.toContain('href=');
    expect(about).not.toContain('adsbygoogle');
    const sitemap = readFileSync('functions/sitemap.xml.ts', 'utf8');
    expect(sitemap).toContain('DATA_PAGES');
    expect(sitemap).not.toContain('/story/');
    for (const id of ['weather', 'aqhi', 'fx', 'gold', 'oil'] satisfies DataPageId[]) {
      expect(readFileSync('public/sitemap.xml', 'utf8')).toContain(`https://world-news.xyz/data/${id}/`);
    }
  });
});
