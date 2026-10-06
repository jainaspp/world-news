import { describe, expect, it } from 'vitest';
import { adSlotMarkup } from '../shared/adSlot';
import { breakingIds, isBreaking } from '../shared/breaking';
import { chrome } from '../shared/contentPage';
import { hkInfoParts, renderHkInfo } from '../shared/hkInfo';
import { renderHomeFeed } from '../shared/homePage';
import { titleLang } from '../shared/zh';
import type { NewsItem } from '../shared/types';
import type { HkNow } from '../shared/hk';
import type { HsiQuote } from '../shared/hsi';

function item(id: string, minutesAgo: number, extra: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `標題 ${id}`,
    link: `https://example.com/${id}`,
    source: 'RTHK',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    category: 'hk',
    ...extra,
  };
}

const hk = {
  temperature: 24,
  humidity: 70,
  icon: 51,
  warnings: [],
  rainMax: 0,
  aqhi: { value: 4, risk: '中', station: '中西區' },
  updated: '',
  source: '香港天文台、環境保護署',
} satisfies HkNow;

const quote = {
  price: 24280.56,
  change: 240.22,
  changePercent: 1,
  updated: '2026-10-06T08:00:00.000Z',
  currency: 'HKD',
  symbol: '^HSI',
} satisfies HsiQuote;

describe('快訊 cap', () => {
  const now = Date.parse('2026-10-06T12:00:00.000Z');

  it('marks only headlines under 30 minutes, or an explicit breaking flag', () => {
    const fresh = { ...item('a', 0), pubDate: new Date(now - 10 * 60_000).toISOString() };
    const stale = { ...item('b', 0), pubDate: new Date(now - 45 * 60_000).toISOString() };
    const flagged = { ...item('c', 0), pubDate: new Date(now - 5 * 60 * 60_000).toISOString(), breaking: true };
    expect(isBreaking(fresh, now)).toBe(true);
    expect(isBreaking(stale, now)).toBe(false);
    expect(isBreaking(flagged, now)).toBe(true);
  });

  it('keeps the newest three badges', () => {
    const rows = [12, 4, 20, 8].map((minutes, index) => ({
      ...item(String(index), 0),
      pubDate: new Date(now - minutes * 60_000).toISOString(),
    }));
    expect([...breakingIds(rows, now)]).toEqual(['1', '3', '0']);
  });
});

describe('merged HK strip', () => {
  it('joins weather and the Hang Seng on one line', () => {
    expect(hkInfoParts(hk, quote)).toEqual({
      weather: '24°C · AQHI 4',
      hsi: '恒生 24,280.56  +1.00%',
      direction: 'up',
    });
    const html = renderHkInfo(hk, quote);
    expect(html).toContain('hk-info');
    expect(html).toContain('hsi-up');
    expect(html).toContain('24°C · AQHI 4');
    expect(html).toContain('恒生 24,280.56  +1.00%');
  });

  it('omits a failed side and unmounts when both fail', () => {
    expect(hkInfoParts(null, quote)?.weather).toBe('');
    expect(hkInfoParts(hk, null)?.hsi).toBe('');
    expect(hkInfoParts(null, null)).toBeNull();
    expect(renderHkInfo(null, null)).toBe('');
    expect(renderHkInfo({ ...hk, temperature: null, aqhi: null }, null)).toBe('');
  });
});

describe('manual ad rhythm', () => {
  it('reserves a placeholder and does not collapse an empty slot', () => {
    const html = adSlotMarkup('feed', '');
    expect(html).toContain('ad-slot-feed');
    expect(html).toContain('支持世界頭條');
    expect(html).toContain('廣告');
    expect(html).not.toContain('adsbygoogle');
    expect(adSlotMarkup('sidebar', '1234567890')).toContain('ad-slot-sidebar');
  });

  it('inserts a feed slot after every 8 standard cards and never before the hero', () => {
    const items = Array.from({ length: 12 }, (_, index) => item(String(index).padStart(2, '0'), 90));
    const html = renderHomeFeed(items);
    const heroAt = html.indexOf('story-hero');
    const adAt = html.indexOf('ad-slot-feed');
    expect(heroAt).toBeGreaterThan(-1);
    expect(adAt).toBeGreaterThan(heroAt);
    expect(html.match(/ad-slot-feed/g)).toHaveLength(1);
    const beforeAd = html.slice(0, adAt);
    expect(beforeAd.match(/<article/g)).toHaveLength(9);
  });
});

describe('title language', () => {
  it('marks English and Japanese titles as non-Chinese', () => {
    expect(titleLang('港鐵加價')).toBe('zh');
    expect(titleLang('Paramount buys Warner')).toBe('en');
    expect(titleLang('東京で地震')).toBe('ja');
  });
});

describe('column navigation', () => {
  it('keeps section tabs and a link home, without the full category row', () => {
    const html = chrome('digest');
    expect(html).toContain('>頭條</a>');
    expect(html).toContain('>日報</a>');
    expect(html).toContain('>週報</a>');
    expect(html).toContain('>分析</a>');
    expect(html).toContain('id="hk-info"');
    expect(html).not.toContain('/category/');
    expect(html).not.toContain('id="hsi-strip"');
  });
});
