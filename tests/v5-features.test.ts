import { describe, expect, it } from 'vitest';
import { digestHasEnglishHeadlines, type ContentDoc } from '../shared/content';
import { injectHomeShell, renderHomeFeed } from '../shared/homePage';
import { categoryLabelI18n, t } from '../shared/i18n';
import { displayTitle, normalizeLang, toCN, toHK } from '../shared/zh';
import type { NewsItem } from '../shared/types';
import { readView, viewHref } from '../src/routing';

const sample: NewsItem = {
  id: 'abc123def456',
  title: '港鐵宣布加價方案',
  link: 'https://example.com/a',
  source: 'RTHK',
  sourceUrl: 'https://news.rthk.hk',
  regions: ['HKG'],
  pubDate: new Date().toISOString(),
  image: 'https://example.com/a.jpg',
  category: 'hk',
};

describe('language toggle', () => {
  it('normalises stored language codes', () => {
    expect(normalizeLang('zh-TW')).toBe('zh-HK');
    expect(normalizeLang('zh-CN')).toBe('zh-CN');
    expect(normalizeLang('en')).toBe('en');
  });

  it('converts Traditional to Simplified without AI', () => {
    expect(toCN('港鐵宣布加價方案')).toContain('价');
    expect(toHK(toCN('發展'))).toMatch(/發|发/);
    expect(displayTitle('港鐵宣布加價方案', 'zh-CN')).not.toEqual(displayTitle('港鐵宣布加價方案', 'zh-HK'));
    expect(displayTitle('Paramount buys Warner', 'en')).toBe('Paramount buys Warner');
  });

  it('exposes English UI labels', () => {
    expect(t('following', 'en')).toBe('Following');
    expect(categoryLabelI18n('tech', 'en')).toBe('Tech');
  });
});

describe('follow routing', () => {
  it('round-trips the following view', () => {
    const href = viewHref({
      region: 'ALL',
      category: 'all',
      source: '',
      q: '',
      time: 'all',
      bookmarks: false,
      following: true,
    });
    expect(href).toContain('view=following');
    const loc = { pathname: '/', search: '?view=following', hash: '' } as Location;
    expect(readView(loc).following).toBe(true);
  });
});

describe('SSR homepage feed', () => {
  it('renders hero markup and bootstrap JSON', () => {
    const html = renderHomeFeed([sample, { ...sample, id: 'bbb', title: 'Second' }]);
    expect(html).toContain('story-hero');
    expect(html).toContain('港鐵宣布加價方案');
    expect(html).toContain('/story/abc123def456/');
    const shell = '<html><head></head><body><div id="root"></div></body></html>';
    const injected = injectHomeShell(shell, [sample]);
    expect(injected).toContain('id="wn-bootstrap"');
    expect(injected).toContain('rel="preload"');
    expect(injected).toContain('story-hero');
  });
});

describe('digest English-headline guard', () => {
  it('flags digests that kept English titles', () => {
    const doc = {
      kind: 'digest',
      key: '2026-10-07',
      title: '精選',
      description: '',
      publishedAt: new Date().toISOString(),
      hkt: '',
      mode: 'ai',
      blocks: [
        { title: 'Paramount buys Warner Bros', sentences: ['幾間媒體報道收購消息。', '詳情以來源為準。'], sources: [] },
        { title: 'South Africa Olympics bid', sentences: ['南非爭取主辦奧運。', '英國傳媒有報道。'], sources: [] },
      ],
    } as ContentDoc;
    expect(digestHasEnglishHeadlines(doc)).toBe(true);
    const zh = {
      ...doc,
      blocks: doc.blocks.map((block) => ({ ...block, title: '中文標題' })),
    };
    expect(digestHasEnglishHeadlines(zh)).toBe(false);
  });
});
