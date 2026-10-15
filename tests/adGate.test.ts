import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { homeAllowsAds } from '../shared/adPolicy';
import { adSlotMarkup } from '../shared/adSlot';
import { renderAnalysisIndex, renderContentPage } from '../shared/contentPage';
import { focusFeedItems } from '../functions/focus/page';
import { gateHomeAds, renderHomeFeed } from '../shared/homePage';
import { heritagePublicPaths, renderLandmarkHub, renderOnThisDayPage } from '../shared/heritagePage';
import { renderTopicIndex, topicIndexCards } from '../shared/topicPage';
import { omitSitemapLocs } from '../shared/sitemap';
import type { NewsItem } from '../shared/types';
import { weeklyFromHeadlines } from '../shared/content';

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title' | 'category'>): NewsItem {
  return {
    link: `https://example.com/${partial.id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: partial.category === 'hk' ? ['HKG'] : partial.category === 'china' ? ['ASI'] : ['INT'],
    pubDate: '2026-10-11T01:00:00Z',
    ...partial,
  };
}

describe('AdSense gates', () => {
  it('filters a region or category list the way the homepage does, and never marks those views as ad pages', () => {
    const rows = [
      item({ id: 'hk', title: '港鐵服務正常', category: 'hk' }),
      item({ id: 'cn', title: '北京召開經貿會議', category: 'china', regions: ['ASI'] }),
      item({ id: 'tw', title: '台灣半導體供應鏈', category: 'hk', regions: ['HKG', 'TWN'] }),
      item({ id: 'world', title: '歐洲氣候峰會', category: 'world', regions: ['EUR'] }),
    ];
    expect(focusFeedItems(rows, { scope: 'region', id: 'hkg', label: '香港' }).map((row) => row.id)).toEqual(['hk']);
    expect(focusFeedItems(rows, { scope: 'category', id: 'china', label: '中國' }).map((row) => row.id)).toEqual(['cn']);
    expect(focusFeedItems(rows, { scope: 'region', id: 'twn', label: '台灣' }).map((row) => row.id)).toEqual(['tw']);
    expect(homeAllowsAds({ region: 'HKG', category: 'all', source: '', q: '', time: 'all' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'hk', source: '', q: '', time: 'all' })).toBe(false);

    const many = Array.from({ length: 12 }, (_, index) => item({ id: `h${index}`, title: `香港標題${index}`, category: 'hk' }));
    const feed = renderHomeFeed(many, new Map(), null, '');
    expect(feed).toContain('香港標題0');
    expect(feed.match(/<article/g)?.length).toBeGreaterThanOrEqual(8);
    expect(feed).not.toContain('adsbygoogle');
    expect(feed).not.toContain('ad-slot');
    expect(feed).not.toContain('ad-placeholder');
    expect(adSlotMarkup('feed', '')).toBe('');
    const focus = readFileSync('functions/focus/page.ts', 'utf8');
    expect(focus).toContain('focusFeedItems');
    expect(focus).toContain('adsRuntimeEnabled() ? envSlot(context.env) : \'\'');
  });

  it('keeps the pagead script off the shell unless a real unit was rendered', () => {
    const shell = readFileSync('index.html', 'utf8');
    expect(shell).not.toContain('adsbygoogle');
    expect(shell).not.toContain('ad-placeholder');
    const items = Array.from({ length: 12 }, (_, index) => item({ id: `n${index}`, title: `標題${index}`, category: 'hk' }));
    const bare = gateHomeAds(`<html><head></head><body>${renderHomeFeed(items)}</body></html>`);
    expect(bare).not.toContain('adsbygoogle');
    const slotted = gateHomeAds(`<html><head></head><body>${renderHomeFeed(items, new Map(), null, '1234567890')}</body></html>`);
    expect(slotted).not.toContain('adsbygoogle');
    expect(slotted).not.toContain('pagead2.googlesyndication.com');
    expect(slotted).not.toContain('ad-placeholder');
    expect(slotted).not.toContain('支持世界頭條');
  });

  it('never puts ads on analysis or topic indexes, and drops thin or failed shells from the sitemap', () => {
    const analysis = renderAnalysisIndex(
      [{ key: 'demo-0123456789ab', title: '示範', description: '多個來源', publishedAt: '2026-10-11T00:00:00Z', sources: 4, category: 'hk' }],
      'https://world-news.xyz/analysis/',
      { ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' } },
    );
    expect(analysis).not.toContain('adsbygoogle');
    expect(analysis).not.toContain('ad-placeholder');
    const topics = renderTopicIndex(topicIndexCards(new Map()), 'https://world-news.xyz/topic/', {
      client: 'ca-pub-8392975944327076',
      top: '1111111111',
    });
    expect(topics).not.toContain('adsbygoogle');
    expect(topics).toContain('noindex,follow');

    const thin = weeklyFromHeadlines(
      [{ title: '晶片出口新規', url: 'https://example.com/t', source: 'BBC 科技' }],
      [],
      '2026-10-04',
    );
    const failed = renderContentPage(thin, 'https://world-news.xyz/weekly/2026-10-04', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' },
    });
    expect(failed).toContain('noindex,follow');
    expect(failed).not.toContain('adsbygoogle');
    expect(failed).not.toContain('ad-placeholder');

    const xml = omitSitemapLocs(
      `<urlset><url><loc>https://world-news.xyz/region/twn</loc><changefreq>hourly</changefreq></url><url><loc>https://world-news.xyz/digest/2026-10-01-am</loc></url><url><loc>https://world-news.xyz/</loc></url></urlset>`,
      ['https://world-news.xyz/region/twn', 'https://world-news.xyz/digest/2026-10-01-am'],
    );
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('/digest/2026-10-01-am');
    expect(xml).toContain('https://world-news.xyz/');
    expect(readFileSync('shared/sitemap.ts', 'utf8')).toContain('omitSitemapLocs');
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toContain('/region/twn');
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toContain('https://world-news.xyz/digest/');
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toContain('https://world-news.xyz/weekly/');
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toContain('https://world-news.xyz/analysis/');
  });

  it('withholds ads and indexing from a thin on-this-day page and from an empty landmark slot', () => {
    const day = renderOnThisDayPage('01-01', { client: 'ca-pub-8392975944327076', slot: '1234567890' });
    expect(day.indexable).toBe(false);
    expect(day.html).toContain('noindex,follow');
    expect(day.html).not.toContain('adsbygoogle');
    expect(day.html).not.toContain('ad-placeholder');
    expect(day.html).not.toContain('支持世界頭條');
    expect(heritagePublicPaths()).not.toContain('/on-this-day/01-01/');
    const hub = renderLandmarkHub('', { client: 'ca-pub-8392975944327076', slot: '' });
    expect(hub.html).not.toContain('adsbygoogle');
    expect(hub.html).not.toContain('ad-placeholder');
    const thick = renderOnThisDayPage('10-09', { client: 'ca-pub-8392975944327076', slot: '1234567890' });
    expect(thick.indexable).toBe(true);
    expect(thick.html).toContain('index,follow');
    expect(thick.html).not.toContain('adsbygoogle');
    expect(thick.html).not.toContain('pagead2.googlesyndication.com');
  });
});
