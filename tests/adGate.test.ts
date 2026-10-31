import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADS_REVIEW_HOLD, homeAllowsAds } from '../shared/adPolicy';
import { adSlotMarkup } from '../shared/adSlot';
import { renderAnalysisIndex, renderContentPage } from '../shared/contentPage';
import type { ContentDoc } from '../shared/content';
import {
  renderChroniclePage,
  renderCityPage,
  renderCivilizationHub,
  renderCivilizationMiss,
  renderCosmosPage,
  renderEarthPage,
  renderGalaxyPage,
  renderOriginsPage,
  renderTechPage,
} from '../shared/civilizationPage';
import { focusFeedItems } from '../functions/focus/page';
import { gateHomeAds, injectHomeShell, renderHomeFeed } from '../shared/homePage';
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
    pubDate: new Date().toISOString(),
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
    expect(homeAllowsAds({ region: 'HKG', category: 'all', source: '', q: '', time: 'today' })).toBe(false);
    expect(homeAllowsAds({ region: 'ALL', category: 'hk', source: '', q: '', time: 'today' })).toBe(false);

    const many = Array.from({ length: 12 }, (_, index) => item({ id: `h${index}`, title: `香港標題${index}`, category: 'hk' }));
    const feed = renderHomeFeed(many, new Map(), null, '');
    expect(feed).toContain('香港標題0');
    expect(feed.match(/class="rank-row/g)?.length).toBe(12);
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

  it('keeps explainer, civilization and KV shells free of Auto ads before the 2026-10-22 rereview', () => {
    expect(ADS_REVIEW_HOLD).toBe(true);
    const line = '公司公布新功能，開發者可以即日核對文件，並按公開步驟試用。';
    const explainer: ContentDoc = {
      kind: 'compare',
      key: '2026-10-19-rereview',
      title: '新功能上線',
      description: '多方來源整理的科技新聞。',
      publishedAt: '2026-10-19T02:00:00.000Z',
      hkt: '2026-10-19 10:00',
      mode: 'ai',
      points: ['公司公布新功能。', '開發者可以即日試用。'],
      blocks: [
        {
          title: '事件經過',
          sentences: [line.repeat(20)],
          sources: [{ source: 'The Verge', title: '新功能上線', url: 'https://example.com/story', pubDate: '2026-10-19T01:00:00.000Z' }],
        },
        {
          title: '各方回應',
          sentences: ['開發者可以即日試用，並核對公開文件。'],
          sources: [{ source: 'Ars Technica', title: '公開文件', url: 'https://example.com/docs', pubDate: '2026-10-19T01:30:00.000Z' }],
        },
      ],
    };
    const slotted = renderContentPage(explainer, 'https://world-news.xyz/explainer/2026-10-19-rereview/', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' },
    });
    expect(slotted).toContain('data-kind="compare"');
    expect(slotted).toContain('src="/columns.js"');
    for (const marker of ['adsbygoogle', 'pagead2.googlesyndication.com', 'enable_page_level_ads', 'google_ad_client', 'data-ad-slot']) {
      expect(slotted).not.toContain(marker);
    }

    const pages = [
      renderCivilizationHub(),
      renderCivilizationMiss(),
      renderOriginsPage(),
      renderChroniclePage(),
      renderTechPage(),
      renderCityPage(),
      renderCosmosPage(),
      renderGalaxyPage(),
      renderEarthPage(),
    ];
    for (const page of pages) {
      expect(page.html).toContain('data-kind="civilization"');
      expect(page.html).not.toContain('adsbygoogle');
      expect(page.html).not.toContain('pagead2.googlesyndication.com');
      expect(page.html).not.toContain('enable_page_level_ads');
      expect(page.html).not.toContain('google_ad_client');
    }

    const poisoned = `<!doctype html><html><head>
<script>window.__shell = "keep";</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8392975944327076" crossorigin="anonymous"></script>
<script async src='//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8392975944327076'></script>
<script>(adsbygoogle = window.adsbygoogle || []).push({google_ad_client:"ca-pub-8392975944327076",enable_page_level_ads:true,overlays:{bottom:true}});</script>
</head><body><div id="root"></div></body></html>`;
    const rows = Array.from({ length: 12 }, (_, index) => item({ id: `s${index}`, title: `標題${index}`, category: 'hk' }));
    const shell = injectHomeShell(poisoned, rows, new Map(), null, '1234567890');
    expect(shell).toContain('window.__shell');
    expect(shell).toContain('civ-home');
    expect(shell).not.toContain('pagead2.googlesyndication.com');
    expect(shell).not.toContain('adsbygoogle');
    expect(shell).not.toContain('enable_page_level_ads');
    expect(shell).not.toContain('google_ad_client');
    expect(shell).not.toContain('ad-slot');

    for (const file of ['index.html', 'public/404.html', 'public/offline.html']) {
      const text = readFileSync(file, 'utf8');
      expect(text).not.toContain('pagead');
      expect(text).not.toContain('adsbygoogle');
      expect(text).not.toContain('enable_page_level_ads');
    }

    const columns = readFileSync('public/columns.js', 'utf8');
    const loaderAt = columns.indexOf('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
    const pushAt = columns.indexOf('ins.adsbygoogle');
    expect(loaderAt).toBeGreaterThan(-1);
    expect(pushAt).toBeGreaterThan(loaderAt);
    expect(columns).toContain('if (adLoader)');
    expect(columns).not.toMatch(/\.src\s*=\s*['"][^'"]*pagead2\.googlesyndication\.com/);
  });
});
