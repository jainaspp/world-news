import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { angleClusters, headlineIsMajor, majorTimeline, titlesMatch } from '../shared/angles';
import { REQUEST_CLUSTER_LIMIT, clusterRecent, newestItems } from '../shared/board';
import { mergeAlerts, parseMtrStatus, weatherAlerts } from '../shared/alerts';
import { parseHkoWarnings } from '../shared/hk';
import { renderHkInfo } from '../shared/hkInfo';
import { renderMajorBanner, renderMajorPage } from '../shared/majorPage';
import { tickFromQuote } from '../shared/markets';
import { buildPopular, emptyBook, hktDay, isBot, isStoryId, recordRead } from '../shared/reads';
import type { HsiQuote } from '../shared/hsi';
import type { NewsItem } from '../shared/types';

const NOW = Date.parse('2026-10-07T12:00:00.000Z');

function item(id: string, title: string, source: string, minutesAgo: number): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: new Date(NOW - minutesAgo * 60_000).toISOString(),
    category: 'world',
  };
}

describe('multi-angle clusters', () => {
  it('groups Traditional Chinese and English headlines for the same event', () => {
    const rows = [
      item('aaa111', '特朗普擬向中國加徵25%關稅', '明報', 20),
      item('bbb222', 'Trump plans 25% tariffs on China', 'Reuters', 40),
      item('ccc333', '天星小輪加班', 'RTHK', 15),
    ];
    expect(titlesMatch(rows[0]!.title, rows[1]!.title)).toBe(true);
    expect(titlesMatch(rows[0]!.title, rows[2]!.title)).toBe(false);
    const clusters = angleClusters(rows);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.sources.sort()).toEqual(['Reuters', '明報']);
  });

  it('does not merge lookalike stories that are half a day apart', () => {
    const clusters = angleClusters([
      item('aaa111', '特朗普擬向中國加徵25%關稅', '明報', 30),
      item('bbb222', 'Trump plans 25% tariffs on China', 'Reuters', 20 * 60),
    ]);
    expect(clusters).toHaveLength(0);
  });
});

describe('major updates', () => {
  it('flags four outlets inside three hours, and a 快訊 headline', () => {
    const burst = ['明報', 'RTHK', 'Now', 'Reuters'].map((source, index) => item(
      `a${index}1111`,
      '立法會通過財政預算案',
      source,
      30 + index * 10,
    ));
    const flash = item('fff111', '突發：大埔山火蔓延', '商報', 20);
    const old = item('eee111', '快訊：舊聞', '商報', 10 * 60);
    const spread = ['A', 'B', 'C', 'D'].map((source, index) => item(
      `d${index}1111`,
      'Assembly opens annual audit of government agencies',
      source,
      60 * (index + 1) * 4,
    ));
    const { banner, timeline } = majorTimeline([...burst, flash, old, ...spread], NOW);
    expect(banner?.title).toBe('突發：大埔山火蔓延');
    expect(timeline.map((entry) => entry.title)).toContain('立法會通過財政預算案');
    expect(timeline.find((entry) => entry.title === '立法會通過財政預算案')?.outlets).toBeGreaterThanOrEqual(4);
    expect(timeline.some((entry) => entry.id === 'eee111')).toBe(true);
    expect(timeline.some((entry) => entry.title.includes('annual audit'))).toBe(false);
    expect(headlineIsMajor('Breaking: ferry collision')).toBe(true);
    expect(renderMajorBanner(banner!)).toContain('重大更新');
    expect(renderMajorBanner(banner!)).not.toContain('sticky');
    const page = renderMajorPage(timeline, 'https://world-news.xyz/major/');
    expect(page).toContain('24小時重大更新');
    expect(page).toContain('4 間媒體');
    expect(page).toContain('/story/fff111/');
  });
});

describe('market ticks', () => {
  const quote = {
    price: 7.8478,
    change: 0.01,
    changePercent: 0.12,
    updated: '',
    currency: 'HKD',
    symbol: 'USDHKD=X',
  } satisfies HsiQuote;

  it('formats a quote and drops a failed one', () => {
    const tick = tickFromQuote(
      { id: 'usd', label: '美元', title: '美元/港元', symbol: 'USDHKD=X', href: 'https://example.com/usd', digits: 2 },
      quote,
    );
    expect(tick?.text).toBe('美元 7.85');
    expect(tick?.direction).toBe('up');
    expect(tickFromQuote(
      { id: 'gold', label: '金', title: '金價', symbol: 'GC=F', href: 'https://example.com/gold', digits: 0 },
      null,
    )).toBeNull();
    const html = renderHkInfo(null, null, tick ? [tick] : []);
    expect(html).toContain('美元 7.85');
    expect(html).toContain('hk-info');
    expect(renderHkInfo(null, null)).toBe('');
  });
});

describe('alerts', () => {
  it('keeps active HKO warnings and only non-green MTR lines', () => {
    const warnings = parseHkoWarnings({
      WFIRE: { name: '火災危險警告', code: 'WFIRER', actionCode: 'ISSUE' },
      WTCSGNL: { name: '三號強風信號', code: 'TC3', actionCode: 'CANCEL' },
    });
    const weather = weatherAlerts(warnings);
    expect(weather.map((row) => row.name)).toEqual(['火災危險警告']);
    const transport = parseMtrStatus(`<ryg_status><line><line_code>TWL</line_code><status>green</status><url_tc></url_tc></line><line><line_code>KTL</line_code><status>yellow</status><url_tc></url_tc></line></ryg_status>`);
    expect(transport).toHaveLength(1);
    expect(transport[0]?.name).toContain('觀塘綫');
    expect(transport[0]?.name).toContain('服務受阻');
    expect(mergeAlerts(weather, transport)).toHaveLength(2);
    expect(parseMtrStatus('<ryg_status></ryg_status>')).toEqual([]);
  });
});

describe('endpoints stay separate', () => {
  it('does not fold clusters into /api/news and lists /major/ in the sitemap', () => {
    expect(readFileSync('functions/api/news.ts', 'utf8')).not.toContain('clusterCards');
    expect(readFileSync('functions/api/clusters.ts', 'utf8')).not.toContain('clusterCards');
    expect(readFileSync('functions/api/board.ts', 'utf8')).toContain('computeBoard(');
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('https://world-news.xyz/major/');
    expect(readFileSync('functions/sitemap.xml.ts', 'utf8')).toContain('/major/');
  });
});

describe('most read', () => {
  it('counts one click per story per hash and falls back to clusters', () => {
    expect(isBot('curl/8.0')).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(false);
    expect(isStoryId('abc123')).toBe(true);
    expect(isStoryId('nope')).toBe(false);
    let book = emptyBook();
    const first = recordRead(book, 'ip', 'abc123');
    book = first.book;
    expect(first.counted).toBe(true);
    expect(recordRead(book, 'ip', 'abc123').counted).toBe(false);
    expect(hktDay(NOW)).toBe('2026-10-07');

    const lead = item('abc123', '港鐵加價', 'RTHK', 10);
    const other = item('bbb222', '特朗普擬向中國加徵25%關稅', '明報', 12);
    const twin = item('ccc333', 'Trump plans 25% tariffs on China', 'Reuters', 18);
    const clusters = angleClusters([other, twin]);
    const thin = buildPopular({}, [lead, other, twin], clusters, 10, 3);
    expect(thin[0]?.fallback).toBe(true);
    expect(thin[0]?.id).toBe(clusters[0]?.lead.id);
    const enough = buildPopular({ abc123: 4, bbb222: 9, ccc333: 2 }, [lead, other, twin], clusters, 10, 3);
    expect(enough.map((row) => row.id)).toEqual(['bbb222', 'abc123', 'ccc333']);
    expect(enough.every((row) => !row.fallback)).toBe(true);
  });
});

describe('request path stays inside the CPU budget', () => {
  const handlers = [
    'functions/api/news.ts',
    'functions/api/clusters.ts',
    'functions/api/major.ts',
    'functions/api/popular.ts',
    'functions/major/index.ts',
    'functions/index.ts',
    'functions/story/[id].ts',
    'functions/api/crawl.ts',
  ];

  it('does not cluster the full board while serving a page or the news list', () => {
    for (const file of handlers) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/angleClusters\s*\(/);
      expect(source).not.toMatch(/clusterStories\s*\(/);
      expect(source).not.toMatch(/majorTimeline\s*\(/);
      expect(source).not.toMatch(/clusterCards\s*\(/);
      expect(source).not.toMatch(/computeBoard\s*\(/);
    }
    expect(readFileSync('functions/board/fallback.ts', 'utf8')).toContain('computeBoard(newestItems(');
    expect(readFileSync('functions/api/board.ts', 'utf8')).toContain('computeBoard(items)');
    expect(readFileSync('functions/api/news.ts', 'utf8')).toContain('SHARD_COUNT');
    expect(readFileSync('functions/api/news.ts', 'utf8')).toContain('toListPayload');
  });

  it('clusters 600 headlines under a tight budget and caps a request fallback at 100', () => {
    expect(REQUEST_CLUSTER_LIMIT).toBeGreaterThanOrEqual(80);
    expect(REQUEST_CLUSTER_LIMIT).toBeLessThanOrEqual(120);
    const titles = ['港口停運', 'Senate vote fails', '颱風路徑更新', 'chip export rule', '加息預期升溫', 'metro signal delay'];
    const rows = Array.from({ length: 600 }, (_, index) => item(
      index.toString(16).padStart(6, 'a'),
      `${titles[index % titles.length]} ${index}`,
      `Outlet ${index % 50}`,
      index % 180,
    ));
    const start = performance.now();
    const clusters = angleClusters(rows);
    expect(performance.now() - start).toBeLessThan(25);
    expect(clusters.length).toBeGreaterThan(0);

    const allowed = new Set(newestItems(rows).map((row) => row.id));
    expect(allowed.size).toBe(100);
    for (const cluster of clusterRecent(rows)) {
      for (const member of cluster.items) expect(allowed.has(member.id)).toBe(true);
    }
  });
});
